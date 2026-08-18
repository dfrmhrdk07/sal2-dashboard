# SAWIT — SAL Web-based Integrated Tracking

Dashboard operasional Pabrik Kelapa Sawit **PT Sari Aditya Loka 2** (kapasitas 60 ton TBS/jam).
Aplikasi web statis, tanpa proses build, siap di-deploy ke Vercel.

---

## ⚠️ BACA DULU SEBELUM DEPLOY

Aplikasi ini adalah **prototipe front-end**. Setelah di-publish ke Vercel, alamatnya
dapat diakses siapa pun di internet. Perhatikan tiga batasan berikut:

| Hal | Keadaan sebenarnya |
|---|---|
| **Autentikasi** | Diperiksa di dalam browser. Siapa pun yang membuka *View Source* dapat membaca daftar akun. **Bukan keamanan.** |
| **Penyimpanan data** | `localStorage` — tersimpan **per-browser, per-perangkat**. Data yang diinput di komputer Krani **tidak akan terlihat** di HP Manajer. |
| **Kapasitas** | Batas browser ±5 MB. Aplikasi memperingatkan bila penuh, tetapi tidak dapat melampauinya. |

**Jangan memasukkan data produksi asli atau password karyawan** sebelum backend
(mis. Supabase Auth + PostgreSQL) dipasang. Untuk pemakaian internal terbatas,
aktifkan **Vercel Deployment Protection** agar situs tidak terbuka untuk publik.

---

## Cara Deploy ke Vercel via GitHub

### 1. Unggah ke GitHub
Buat repository baru (disarankan **Private**), lalu unggah seluruh isi folder ini.

Lewat web: buka repo → **Add file** → **Upload files** → seret semua berkas → **Commit changes**.

Lewat terminal:
```bash
git init
git add .
git commit -m "SAWIT dashboard SAL 2"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

### 2. Hubungkan ke Vercel
1. Masuk ke [vercel.com](https://vercel.com) menggunakan akun GitHub.
2. **Add New…** → **Project** → pilih repository ini → **Import**.
3. Biarkan seluruh pengaturan default:
   - Framework Preset: **Other**
   - Build Command: *(kosongkan)*
   - Output Directory: *(kosongkan)*
   - Install Command: *(kosongkan)*
4. Klik **Deploy**, tunggu ±30 detik.

Setiap `git push` berikutnya akan otomatis men-deploy ulang.

### 3. (Disarankan) Batasi akses
**Project Settings** → **Deployment Protection** → aktifkan **Vercel Authentication**
atau **Password Protection**. Tanpa ini, dashboard terbuka bagi siapa pun yang tahu alamatnya.

---

## Struktur Berkas

```
├── index.html          Kerangka halaman
├── css/styles.css      Seluruh gaya tampilan (28 KB)
├── js/app.js           Seluruh logika aplikasi (100 KB)
├── assets/logo-aal.png Logo Astra Agro Lestari
├── vercel.json         Header keamanan & cache
├── robots.txt          Cegah pengindeksan mesin pencari
└── .gitignore
```

Tidak ada `package.json` — situs ini murni statis dan tidak memerlukan proses build.

---

## Akun Demo

| Peran | Username | Password | Hak akses |
|---|---|---|---|
| Administrator | `krani.admin` | `krani2026` | Input, edit, hapus, unggah, kelola user, threshold & faktor |
| Staff | `asisten.proses` | `proses2026` | Input, edit, unggah, lihat, ekspor (tanpa hapus & pengaturan) |
| Management | `mill.manager` | `manager2026` | Lihat, analisis, ekspor (hanya baca) |

Untuk mengubah akun, sunting konstanta `USERS` di `js/app.js`.

---

## Fitur

**23 indikator** dalam 5 kelompok:
- **Operasional** — Throughput, TBS Olah, OER, Produksi CPO, Utility, Restan TBS
- **Mutu CPO** — FFA (maks 3,5%), Moisture (maks 0,20%), Dirt (maks 0,025%)
- **Mutu Kernel** — Moisture (pita 5–6%), Dirt (maks 6%), Broken Nut (maks 15%)
- **Losses CPO (OWB)** — Sludge Centrifuge, Fibre in Press Cake, EFB, EFB (TBM,SAM), Wet Nut, USB
- **Losses Kernel** — Fibre Cyclone, Destoner, LTDS 1, LTDS 2, Shell ex Hydrocyclone

**Lainnya:** periode SHI (tanggal 1 s/d hari ini), historis hingga 5 tahun, grafik tren
dengan garis standar, grafik batang % terhadap standar, threshold 3 tingkat yang dapat
disetel, unggah/unduh Excel, ekspor CSV & PDF, audit log, mode gelap/terang, TV Mode,
sidebar yang dapat diciutkan, dan tampilan responsif dari 360 px hingga layar TV.

---

## Catatan Penting

### Total Losses
Nilai losses tiap item diukur terhadap **penyebut yang berbeda**, sehingga
**tidak boleh dijumlahkan langsung**. Total Losses akan menampilkan
"belum dikonfigurasi" sampai faktor konversi ke %TBS diisi pada
**Settings → Faktor Losses**. Rumus: `Total = Σ (nilai item × faktor item)`.

### Format Angka
Kolom angka menerima koma maupun titik: `22,85` dan `22.85` sama-sama benar,
begitu pula pemisah ribuan `1.234,5`.

### Format Excel
Template dapat diunduh dari halaman **Data Input**. Kolom `Tanggal` menerima
format `YYYY-MM-DD`, `DD/MM/YYYY`, maupun tanggal asli Excel.

### Data Contoh
Saat pertama dibuka, aplikasi membangkitkan **5 tahun data contoh** untuk keperluan
peragaan. Hapus melalui **Settings → Data & Sistem → Reset** sebelum memasukkan data nyata.

---

## Ketergantungan Eksternal

| Pustaka | Kegunaan | Bila gagal dimuat |
|---|---|---|
| SheetJS (cdnjs) | Baca/tulis Excel | Aplikasi tetap jalan; gunakan **Ekspor CSV** |
| Google Fonts | Huruf Sora, Plus Jakarta Sans, JetBrains Mono | Beralih ke huruf sistem |

Ikon (43 buah) dan seluruh grafik digambar sebagai SVG di dalam berkas — **tidak**
bergantung pada CDN, sehingga tetap tampil walau jaringan terbatas.

---

## Langkah Menuju Produksi

1. Pasang **Supabase** (PostgreSQL + Auth + Row Level Security).
2. Ganti `buildDataset()`, `addRow()`, `updateRow()`, `deleteRow()` pada `js/app.js`
   dengan panggilan query ke database.
3. Ganti `submitLogin()` dengan Supabase Auth (password ter-hash di sisi server).
4. Terapkan matriks hak akses sebagai kebijakan RLS, bukan pemeriksaan di browser.
5. Aktifkan backup harian otomatis.
