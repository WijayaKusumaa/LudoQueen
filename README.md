# 🏝️ Olivia's Little Island

> Permainan papan Ludo 3D yang hangat dan interaktif di atas pulau kecil tropis, dipersembahkan untuk **Olivia Putri Wardhani**.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![React 19](https://img.shields.io/badge/React-19-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r186-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)

---

## ✨ Fitur Utama

- **Papan Ludo 3D Asli**: Di-render secara efisien menggunakan WebGL, Three.js, dan React Three Fiber.
- **Engine Aturan Otoritatif & Deterministik**: Logika aturan Ludo klasik (lemparan 6, tangkapan lawan, safe zones, jalur rumah) terisolasi murni dan bebas bug.
- **Animasi Langkah Demi Langkah**: Gerakan pion berpindah mengikuti koordinat papan asli tanpa akumulasi offset.
- **Dadu 3D Fisik**: Berguling interaktif dengan hasil akhir yang otoritatif dari engine.
- **Dukungan Sentuh & Mouse**: Deteksi tap yang presisi tanpa bentrok dengan kontrol rotasi/zoom kamera OrbitControls.
- **Setup Pemain Kustom**: Mainkan dengan 2 hingga 4 pemain (Kuning, Biru, Merah, Hijau).
- **Efek Suara & Musik Sintetis**: Menggunakan WebAudio synthesizer langsung (tanpa file audio berat).
- **Aksesibilitas & Reduced Motion**: Mendukung `prefers-reduced-motion` dan toggle manual (pion berpindah instan saat animasi dimatikan).
- **Desain Responsif**: Tampilan tetap proporsional dan nyaman dimainkan di ponsel (portrait & landscape) maupun layar desktop.

---

## 🛠️ Tech Stack

- **Core**: React 19, TypeScript
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Build Tool**: Vite
- **Testing**: Vitest (43 unit & integration tests)
- **Styling**: Vanilla CSS dengan modern design tokens

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18 ke atas)
- npm

### Langkah Instalasi
```bash
# 1. Kloning repositori
git clone https://github.com/<username>/olivias-little-island.git
cd olivias-little-island

# 2. Pasang dependensi
npm install

# 3. Jalankan server pengembangan
npm run dev
```
Buka browser pada alamat yang ditampilkan di terminal (default: `http://localhost:5173/`).

---

## 🧪 Pengujian & Typecheck

```bash
# Verifikasi tipe TypeScript
npm run typecheck

# Menjalankan seluruh unit & integration test
npm test

# Build bundle produksi
npm run build
```

---

## 🌐 Deploy Online dengan GitHub Actions (GitHub Pages)

Proyek ini telah dilengkapi workflow CI/CD otomatis di `.github/workflows/deploy.yml`.

### Cara Mengaktifkan di Repositori GitHub Anda:

1. Buat repositori baru di GitHub (misal: `olivias-little-island`).
2. Push seluruh kode ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Olivia's Little Island"
   git branch -M main
   git remote add origin https://github.com/<username>/olivias-little-island.git
   git push -u origin main
   ```
3. Buka repositori Anda di GitHub:
   - Masuk ke tab **Settings** > **Pages** (di menu bilah samping kiri).
   - Pada bagian **Build and deployment** > **Source**, pilih **GitHub Actions**.
4. GitHub Actions akan otomatis memvalidasi tipe, menjalankan seluruh pengujian, membuat build produksi, dan mempublikasikan game ke GitHub Pages.
5. Game Anda dapat diakses di: `https://<username>.github.io/olivias-little-island/`.

---

## 💌 Personalisasi

Pesan selamat datang dan teks judul dapat disunting kapan saja melalui file [src/config/personal.ts](src/config/personal.ts).

---

## 📄 Lisensi

Didistribusikan di bawah lisensi MIT.
