# E-Portofolio — Rifqi Fausta Dianta

Situs e-portofolio statis bertema **Dota 2** untuk **Rifqi Fausta Dianta**
(PPG Prajabatan, calon guru Matematika). Tiga halaman:

- `index.html` — Beranda & Profil (hero + profil + SMAN 6 Yogyakarta)
- `artefak.html` — Artefak Pembelajaran (3 siklus, analisis lengkap, embed video/dokumen)
- `refleksi.html` — Refleksi (filosofi, refleksi per siklus, evaluasi akhir)

## Teknologi
- HTML + CSS + JavaScript murni (tanpa bundler, tanpa backend).
- Semua aset (hero & item Dota, foto, font) **di-host sendiri** di `assets/` — tidak ada hotlink CDN saat runtime.
- Efek kanvas "Ball Lightning" Storm Spirit, galeri hero 8-bit (`image-rendering: pixelated`), aksen ikon item.
- Mobile-first, responsif 360px → 1920px, menghormati `prefers-reduced-motion`.

## Struktur
```
index.html, artefak.html, refleksi.html   # halaman
.nojekyll                                  # nonaktifkan Jekyll di GitHub Pages
assets/css/   assets/js/   assets/img/   assets/dota/   assets/fonts/
scripts/fetch_assets.mjs                   # unduh ulang semua aset
tests/portfolio.spec.ts                    # gate Playwright
```

## Pengembangan
```bash
npm install
node scripts/fetch_assets.mjs          # (sekali) unduh & validasi semua aset
npm run serve                          # http://localhost:3000
npx playwright test                    # jalankan semua pengecekan secara lokal
BASE_URL="https://<owner>.github.io/<repo>/" npx playwright test   # uji situs live
```

## Deploy (GitHub Pages)
- Sumber: branch `main`, folder `/` (root). Semua path **relatif**; `.nojekyll` ada di root.
- Alternatif: workflow `.github/workflows/pages.yml` (GitHub Actions).

Aset Dota 2 © Valve Corporation — penggunaan non-komersial untuk portofolio mahasiswa.
