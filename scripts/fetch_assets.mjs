#!/usr/bin/env node
// Downloads all Dota 2 assets + scraped portfolio photos into the repo.
// Run once at build time: `node scripts/fetch_assets.mjs`. Commit the results.
// Every file is validated as a non-empty, real image (PNG/JPEG magic bytes)
// so the live site never ships a broken image.

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CDN = 'https://cdn.cloudflare.steamstatic.com';

// Hero splash art still used (refleksi card icons). Storm Spirit also fuels the hero header theme.
const HEROES = ['storm_spirit', 'crystal_maiden', 'lina'];

// Chibi Dota chat emoticons (animated transparent GIFs) — scattered as reactive accents.
const EMOTE_RAW = 'https://raw.githubusercontent.com/bontscho/dota2-chat-emoticons/master/assets/images';
const EMOTES = [
  'monkey_king_ti6_charm', 'charm_smile', 'charm_wink', 'charm_highfive', 'charm_cheeky',
  'charm_cool', 'charm_onlooker', 'charm_happytears', 'luna_love', 'arcane_rune', 'blink',
  'gem', 'stars', 'highfive', 'thumbs_up', 'goodjob', 'donkey', 'gg', 'ggradiant',
  'thinking', 'nerd', 'aegis_2017', 'heart',
];

// internal item names (from dotaconstants build/items.json keys) — blink is the favicon
const ITEMS = ['blink'];

const PHOTOS = [
  ['https://e-portofolio-psi.vercel.app/assets/images/foto-anda.png', 'assets/img/foto-rifqi.png'],
  ['https://e-portofolio-psi.vercel.app/assets/images/logo-sman6.png', 'assets/img/logo-sman6.png'],
  ['https://e-portofolio-psi.vercel.app/assets/images/dokumentasi1.jpeg', 'assets/img/dokumentasi1.jpeg'],
  ['https://e-portofolio-psi.vercel.app/assets/images/dokumentasi2.jpeg', 'assets/img/dokumentasi2.jpeg'],
];

function isValidImage(buf) {
  if (!buf || buf.length < 100) return false;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  return false;
}

async function fetchBuf(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 portfolio-build' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function save(url, rel) {
  const dest = path.join(ROOT, rel);
  if (existsSync(dest) && statSync(dest).size > 100) {
    console.log('skip (exists)', rel);
    return true;
  }
  try {
    const buf = await fetchBuf(url);
    if (!isValidImage(buf)) { console.error('INVALID IMAGE', url); return false; }
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buf);
    console.log('ok', rel, buf.length, 'bytes');
    return true;
  } catch (e) {
    console.error('FAIL', url, e.message);
    return false;
  }
}

async function main() {
  let ok = 0, fail = 0;
  const failures = [];

  // 1. Scraped photos
  for (const [url, rel] of PHOTOS) {
    (await save(url, rel)) ? ok++ : (fail++, failures.push(rel));
  }

  // 2. Hero art (transparent PNG) — resolve internal name -> img via OpenDota
  console.log('fetching heroStats...');
  const heroStats = await (await fetch('https://api.opendota.com/api/heroStats')).json();
  const heroByName = new Map(heroStats.map(h => [h.name.replace('npc_dota_hero_', ''), h]));
  for (const name of HEROES) {
    const h = heroByName.get(name);
    if (!h) { console.error('hero not found', name); fail++; failures.push('hero:' + name); continue; }
    (await save(CDN + h.img, `assets/dota/heroes/${name}.png`)) ? ok++ : (fail++, failures.push('hero:' + name));
  }

  // 3. Chibi emotes (animated transparent GIFs)
  for (const name of EMOTES) {
    (await save(`${EMOTE_RAW}/${name}.gif`, `assets/dota/emotes/${name}.gif`)) ? ok++ : (fail++, failures.push('emote:' + name));
  }

  // 4. Item icons — resolve img via dotaconstants items.json
  console.log('fetching items.json...');
  const items = await (await fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json')).json();
  for (const key of ITEMS) {
    const it = items[key];
    if (!it || !it.img) { console.error('item not found', key); fail++; failures.push('item:' + key); continue; }
    // img like "/apps/dota2/images/dota_react/items/blink.png?t=..."
    const imgPath = it.img.split('?')[0];
    (await save(CDN + imgPath, `assets/dota/items/${key}.png`)) ? ok++ : (fail++, failures.push('item:' + key));
  }

  console.log(`\nDONE: ${ok} ok, ${fail} failed`);
  if (failures.length) { console.error('FAILURES:', failures.join(', ')); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
