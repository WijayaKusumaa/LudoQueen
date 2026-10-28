# Spesifikasi Koordinat Papan dan Laporan Fase 3

> Dokumen desain Fase 2 belum pernah disetujui. Dokumen ini hanya mencatat spesifikasi koordinat yang dipakai Fase 3.

## Cara menjalankan
```
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # tsc --noEmit + vite build
npm test           # vitest
```

## Model koordinat (sumber tunggal: `src/game/board/boardLayout.ts`)
- Grid 15x15, sel `(col,row)`, row 0 di atas, pusat `(7,7)`.
- Dunia 3D: `x = col - 7`, `z = row - 7`, 1 sel = 1 unit, +z menuju kamera. Konversi hanya lewat `gridToWorld` di `boardCoordinates.ts`.
- Jalur utama: 52 sel searah jarum jam, dimulai dari start Kuning `(1,6)`. Ada 4 tikungan diagonal di sudut blok pusat 3x3 (seperti papan Ludo standar).
- Start: Kuning 0, Biru 13, Merah 26, Hijau 39. Kotak aman: 4 start + 4 bintang (start + 8).
- Lane rumah: 5 sel per warna dari mulut lane menuju pusat.
- Kuadran base: Kuning kiri-atas, Biru kanan-atas, Merah kanan-bawah, Hijau kiri-bawah. Slot pion di pusat base dengan offset (±1, ±1).
- Pusat: empat segitiga, Kuning kiri, Biru atas, Merah kanan, Hijau bawah.

## Token visual
Palet 3D di `src/game/palette.ts`; token UI di `:root` pada `src/styles/index.css`. Font: Baloo 2 (judul), Nunito (isi).

## Fase 3: yang selesai
- Laut shader toska (gerak halus, buih mengikuti bentuk pulau, beku bila reduced-motion).
- Pulau salib dan 4 pulau base (rumput bertekstur prosedural, bibir tanah), 72 ubin dalam satu InstancedMesh.
- Bintang aman, segitiga pusat, 4 jembatan kayu, 4 batu kecil.
- 16 pion dengan satu siluet bersama (lathe + kepala bulat), cat berbeda per warna, bayangan kontak.
- Cahaya hangat terarah + hemisphere + environment Lightformer; tone mapping Neutral.
- Kamera perspektif yang menyesuaikan jarak ke rasio layar, orbit terbatas, tombol atur ulang.
- HUD: judul, legenda warna, tombol atur ulang kamera; layar loading; fallback WebGL.

## Pengujian yang dijalankan
- `tsc --noEmit` dan `npm run build`: lulus.
- `vitest run`: 5 tes lulus (52 sel unik, adjacency, simetri rotasi, lane tanpa tabrakan, origin).
- Browser: desktop 1366x768, portrait 390x844, landscape 844x390; orbit dan atur ulang kamera berfungsi.
- Konsol: belum diverifikasi. Laporan konsol dari subagent browser belum saya terima, jadi cek manual di DevTools.

## Masalah yang diketahui
- Bundel `GameCanvas` ~1 MB (272 kB gzip); belum dipecah.
- Pion belum punya state/logika; semuanya di base (hanya tampilan).
- Belum dites di perangkat sentuh sungguhan dan belum ada uji regresi visual otomatis.

## Berikutnya: Fase 4
Engine Ludo deterministik dan unit test, terpisah dari renderer.
