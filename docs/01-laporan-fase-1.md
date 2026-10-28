# Olivia's Little Island — Laporan Fase 1 (Inspeksi)

Tanggal: 2026-10-21

## Kondisi proyek
- Workspace masih kosong: tidak ada kode, `package.json`, atau repo git. Satu-satunya isi adalah folder `references/`.
- Tidak ada pekerjaan yang tertimpa di fase ini.
- Toolchain: Node v24.11.0, npm 11.6.1, git 2.39.1.

## Referensi (sudah dibuka dan dilihat)
Folder `references/` berisi 3 gambar:

| File | Isi | Yang diambil |
|---|---|---|
| `REFRENSI 2.jpg` (B) | Papan Ludo pulau berwarna cerah di laut biru | Pulau rumput dengan sisi tanah, jembatan kayu kecil, pad base 2x2 berwarna, jalur berwarna, kotak bintang aman, pusat empat segitiga, pion berkepala bulat |
| `REFRENSI GAMBER.jpg` (C) | Papan batu berlumut di air toska dengan pantai berpasir | Tekstur batu, cincin warna di bawah pion, kotak aman bintang gelap, pusat mosaik empat warna, kartu pemain di sudut |
| `gautham-krishna-store.jpg` (A) | UI toko dengan panel biru membulat, tombol hijau mengilap, koin emas | Hanya bahasa visual UI (panel membulat, satu warna aksi yang kuat). Tidak membuat toko atau penghitung koin |

Arah seni yang disimpulkan:
- Palet pasir, toska, dan rumput.
- Tata letak papan tetap: salib dengan lengan 3 kotak lebar pada grid 15x15.
- Detail kecil: jembatan, buih pantai, bintang laut.
- UI lembut dan membulat dengan satu warna aksi yang jelas.

## Versi dependensi (npm latest, 2026-10-21)

| Paket | Versi |
|---|---|
| react | 19.3.1 |
| three | 0.186.1 |
| @react-three/fiber | 9.8.2 |
| @react-three/drei | 10.7.9 |
| vite | 8.3.5 |
| vitest | 5.0.5 |

Kompatibilitas antar paket belum diverifikasi. Akan dicek saat instalasi dengan `npm ls` dan peringatan peer dependency. Jika Vite 8 dan Vitest 5 konflik, akan dipakai pasangan versi yang cocok.

## Risiko
1. **Model papan**: 52 sel jalur dan 4x5 sel jalur rumah. Rendering, gerak pion, dan engine harus membaca satu `boardLayout.ts` yang diuji unit lebih dulu.
2. **Kamera mobile**: papan berbentuk persegi, jadi jarak kamera harus menyesuaikan rasio viewport portrait/landscape.
3. **Animasi vs logika**: hasil dadu dan gerakan ditentukan reducer. Animasi hanya memutar ulang, dan input diblokir selama animasi.
4. **WebGL gagal / loading**: perlu error boundary, pengecekan WebGL, dan layar loading.
5. **Performa**: tile memakai instancing atau geometri bersama. Animasi pion memakai ref di `useFrame`, bukan state React.
6. **Aset dan lisensi**: semua geometri prosedural dan tekstur dari canvas. Tanpa aset pihak ketiga. Audio disintesis dengan WebAudio.
7. **Varian aturan**: lihat default di bawah.

## Aturan default yang diusulkan
- Butuh angka 6 untuk keluar dari base.
- Angka 6 memberi giliran tambahan, begitu juga menangkap pion dan pion masuk home.
- Tiga angka 6 berturut-turut: giliran hangus.
- Butuh angka pas untuk masuk home akhir.
- Kotak aman: 4 kotak start + 4 kotak bintang.
- Tanpa blokade atau penumpukan.
- Semua bisa diubah lewat konfigurasi aturan.

## Pertanyaan yang menunggu jawaban
1. Default 4 pemain dengan sebagian bot? Direkomendasikan menyertakan bot sederhana agar bisa main sendiri.
2. Bahasa UI: hanya Indonesia, atau Indonesia + English?
3. Pesan untuk Olivia: pakai default "Pulau kecil ini dibuat untuk Olivia Putri Wardhani." atau teks lain? Dapat diatur di pengaturan.

## Berikutnya: Fase 2
Dokumen desain game, spesifikasi koordinat papan, design token, dan rencana implementasi di `docs/`.
