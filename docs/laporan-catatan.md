dokumentasi game engine & aturan permainan - olivia little island

dokumen ini menjelaskan arsitektur engine ludo pada src/game/engin/
engine beroprasi sepenuhnya independen dari react dan three.js (tanpa manipulasi dom)

__
Sistem indeks jalur dan kordinat

engine menggunakan model matematis tunggal berbasis langkah prograsif relatif terbaru pemain (pemain relative step)

setiap pemain memiliki model jalur unik (jalur utama, jalur masuk, jalur home)

```
Posisi titik srart & rotasi
titik start tiap warna berrjarak 13 langkah (rotasi simetris 90 derajat serah jarum jam):

kuning:
BIRU
MERAH
HIJAU

Pion melangkah 51 petak di jalur utama bersama, lalu masuk ke jalurnya sendiri (step ) dan berakhir tepat di `HOME` (step 56) Total jarak dari kelua base sampai home adalah 57

```

***

@Posisi titik start dan arah putaran warna (13 langkah antar start)

```
BIRU -> MERAH -> HIJAU -> KUNING
    ^               |
    |_______________|

HOME (Biru)
```

@Skema jalur: 51 petak di jalur utama + 5 petak jalur masuk + 1 HOME

```
PATH_OUT (51 petak)
  |
  V
PATH_IN (5 petak)
  |
  V
HOME (1 petak)
```

***

@Penamaan petak berbasis indeks berbasis 0

```
KUNING: OUT 0-50, IN 51-55, HOME 56
BIRU:   OUT 0-50, IN 51-55, HOME 56  (relatif terhadap start Biru)
MERAH:  OUT 0-50, IN 51-55, HOME 56  (relatif terhadap start Merah)
HIJAU:  OUT 0-50, IN 51-55, HOME 56  (relatif terhadap start Hijau)

 HOME[COLOR] = 56
```

#mekanisme khusus
1.masuk home tepat enrty Jikas sisa jarak plan ke Home lebih kecil daripada angka daru
2.tidak ada langkah bergerak secara tida