# Dokumentasi Game Engine & Aturan Permainan — Olivia's Little Island

Dokumen ini menjelaskan arsitektur engine Ludo deterministik pada `src/game/engine/`. Engine beroperasi sepenuhnya independen dari React dan Three.js (tanpa manipulasi DOM atau render loop).

---

## 1. Sistem Indeks Jalur dan Koordinat

Engine menggunakan model matematis tunggal berbasis langkah progresif relatif terhadap pemain (*relative step*):

```
-1        : BASE (pion di markas/pulau pemain)
0 .. 50   : Jalur Bersama (51 petak melingkar searah jarum jam)
            Indeks absolut petak bersama dihitung dengan:
            trackIndex = (START_INDEX[warna] + step) % 52
51 .. 55  : Jalur Rumah / Lane (5 petak khusus menuju pusat)
            Indeks lane dihitung dengan: laneIndex = step - 51
56        : HOME (tujuan akhir di pusat papan, empat segitiga)
```

### Posisi Titik Start & Rotasi
Titik start tiap warna berjarak 13 langkah (rotasi simetris 90° searah jarum jam):
- **Kuning**: `START_INDEX = 0` (koordinat grid `(1, 6)`)
- **Biru**: `START_INDEX = 13` (koordinat grid `(8, 1)`)
- **Merah**: `START_INDEX = 26` (koordinat grid `(13, 8)`)
- **Hijau**: `START_INDEX = 39` (koordinat grid `(6, 13)`)

Pion melangkah 51 petak di jalur bersama, lalu masuk ke jalurnya sendiri (step 51..55), dan berakhir tepat di `HOME` (step 56). Total jarak dari keluar base sampai home adalah 57 langkah.

---

## 2. Asumsi dan Variasi Aturan (RulesConfig)

Semua aturan permainan didefinisikan secara eksplisit dan bertipe pada `src/game/engine/config.ts`:

| Parameter | Tipe | Default | Deskripsi |
|---|---|---|---|
| `entryRolls` | `readonly DieValue[]` | `[6]` | Angka dadu yang mengizinkan pion keluar dari base |
| `extraTurnOnSix` | `boolean` | `true` | Melempar angka 6 memberikan giliran tambahan |
| `extraTurnOnCapture` | `boolean` | `true` | Berhasil menangkap pion lawan memberikan giliran tambahan |
| `extraTurnOnHome` | `boolean` | `true` | Pion berhasil masuk HOME memberikan giliran tambahan |
| `maxConsecutiveSixes` | `number` | `3` | Batas lemparan 6 berturut-turut sebelum giliran hangus (0 = tanpa batas) |
| `safeCells` | `'startAndStar' \| 'startOnly' \| 'none'` | `'startAndStar'` | Aturan petak aman (4 titik start + 4 bintang emas) |
| `friendlyStacking` | `boolean` | `true` | Mengizinkan pion sewarna bertumpuk di petak yang sama |
| `blockades` | `boolean` | `false` | Dua atau lebih pion sewarna di satu petak membentuk rintangan tak terlewati bagi lawan |
| `endCondition` | `'firstFinisher' \| 'allButOne'` | `'firstFinisher'` | Kondisi selesai permainan (pemain pertama atau hingga sisa 1) |

### Mekanisme Khusus:
1. **Masuk Home Tepat (Exact Entry)**: Jika sisa jarak pion ke HOME lebih kecil daripada angka dadu (overshoot), langkah tersebut tidak valid (`to > 56` tidak diizinkan).
2. **Tidak Ada Langkah Legal (No Legal Moves)**: Jika pemain melempar dadu dan tidak ada pion yang dapat bergerak secara legal (misalnya semua pion di base dan dadu bukan 6, atau semua pion di lane terhalang overshoot), giliran otomatis beralih ke pemain aktif berikutnya.
3. **Hangus Tiga Kali Enam**: Lemparan angka 6 ketiga secara berturut-turut memancarkan event `turnForfeited` dan mengalihkan giliran ke pemain berikutnya.

---

## 3. Immutability dan Pencegahan Mutasi Eksternal

1. **Deep Freeze**: Setiap state yang dihasilkan oleh `createInitialGameState` maupun `dispatchAction` dibekukan secara rekursif menggunakan `deepFreeze()`. Modifikasi langsung seperti `state.pawns.yellow[0] = 5` akan melempar `TypeError` pada JavaScript strict mode.
2. **Optimistic Locking / Anti-Stale**: Setiap aksi yang dieksekusi menaikkan `state.version`. Client/UI dapat menyertakan `expectedVersion` untuk mencegah eksekusi aksi ganda akibat klik cepat (*double click/tap*).
3. **Turn Guard**: Aksi yang menyertakan identifier `player` akan diverifikasi dengan `state.current`; jika tidak cocok, aksi ditolak dengan error `NOT_YOUR_TURN`.

---

## 4. Struktur Event untuk Animasi UI (GameEvent)

Engine mengembalikan event terstruktur murni sehingga lapisan UI/3D hanya perlu memutar animasi dan tidak memegang logika negara:

- `diceRolled`: `{ player, value }`
- `pawnEntered`: `{ player, pawn, to }`
- `pawnMoved`: `{ player, pawn, from, to, path: readonly PawnLocation[] }` — `path` menyediakan setiap koordinat petak yang dilalui satu per satu untuk animasi lompatan pion.
- `pawnCaptured`: `{ victim, by, at }`
- `pawnHome`: `{ player, pawn }`
- `extraTurn`: `{ player, reasons }`
- `turnChanged`: `{ from, to }`
- `noLegalMove`: `{ player, value }`
- `turnForfeited`: `{ player, reason }`
- `playerFinished`: `{ player, place }`
- `gameOver`: `{ winner, ranking }`

---

## 5. Hasil Verifikasi Pengujian Unit

Seluruh pengujian unit dijalankan secara riil menggunakan `vitest run` dan `tsc --noEmit`.

Hasil:
- `src/tests/boardLayout.test.ts`: **5 tes lulus** (52 sel unik, adjacency terarah, simetri rotasi 90°, jalur bebas tabrakan, origin pusat).
- `src/tests/ludoEngine.test.ts`: **23 tes lulus**:
  1. *Starting positions & movement directions* (titik start 0, 13, 26, 39 dan lane step 51..55)
  2. *Entering track from base* (syarat angka 6, penolakan angka non-entry, konfigurasi custom)
  3. *Circular wrapping & lane transition* (pembungkusan siklis petak 51->0 dan transisi ke lane rumah)
  4. *Safe squares behavior* (koeksistensi pion di petak bintang/start tanpa tangkapan, variasi konfigurasi)
  5. *Capturing opponent pawn* (pengembalian ke base, pemancaran event, hak giliran ekstra)
  6. *Stacking & blockades* (pengujian `friendlyStacking` on/off dan `blockades: true`)
  7. *Extra turn behavior* (bonus roll pada 6, capture, home, dan pembatalan setelah 3x 6 berturut-turut)
  8. *No legal move handling* (pengalihan otomatis saat terblokir)
  9. *Exact home entry* (larangan overshoot, validitas langkah pas ke 56)
  10. *Winning & game over* (transisi ke status `finished`, penolakan aksi setelah game over)
  11. *Validation & Immutability* (penolakan `NOT_AWAITING_ROLL`, `NOT_AWAITING_MOVE`, `NOT_YOUR_TURN`, `STALE_ACTION`, `INVALID_PAWN`, dan uji error `deepFreeze`).

Total: **28 tes lulus tanpa kegagalan (100% pass)**.
