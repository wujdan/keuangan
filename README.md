# Buku Kas — Catatan Keuangan (HTML + Google Sheets)

Website statis (HTML/CSS/JS saja) dengan 2 halaman:
- `index.html` — **Lihat**: saldo, ringkasan, dan daftar transaksi (read-only)
- `edit.html` — **Edit**: tambah, ubah, hapus transaksi

Data disimpan di Google Sheets lewat Google Apps Script yang bertindak sebagai API sederhana.

## 1. Siapkan Google Sheet

1. Buat Google Sheet baru, beri nama bebas (misal "Data Buku Kas").
2. Tidak perlu bikin sheet/kolom manual — kode di langkah 2 akan membuat sheet bernama **Transaksi** otomatis dengan kolom: `id, tanggal, kategori, keterangan, jenis, jumlah`.

## 2. Pasang Apps Script

1. Di Google Sheet tadi, buka menu **Extensions > Apps Script**.
2. Hapus kode default, lalu salin-tempel seluruh isi file `Code.gs` dari folder ini.
3. Klik **Save** (ikon disket).

## 3. Deploy sebagai Web App

1. Klik tombol **Deploy > New deployment**.
2. Pilih tipe **Web app**.
3. Isi:
   - **Execute as**: Me (akun kamu)
   - **Who has access**: Anyone
4. Klik **Deploy**, lalu izinkan akses (Authorize access) ke akun Google kamu.
5. Setelah selesai, salin **Web app URL** yang muncul (formatnya seperti `https://script.google.com/macros/s/xxxxx/exec`).

> Setiap kali kamu mengubah isi `Code.gs`, kamu perlu **Deploy > Manage deployments > Edit (ikon pensil) > New version > Deploy** supaya perubahan aktif di URL yang sama.

## 4. Hubungkan ke website

1. Buka file `config.js`.
2. Ganti nilai `API_URL` dengan Web App URL dari langkah 3:
   ```js
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/xxxxx/exec"
   };
   ```
3. Simpan.

## 5. Deploy ke GitHub Pages

1. Buat repository baru di GitHub, upload semua file di folder ini **kecuali `Code.gs`** (file itu cuma untuk ditempel ke Apps Script, bukan bagian dari website).
2. Buka **Settings > Pages** di repo tersebut.
3. Pilih source: branch `main`, folder `/root` (atau `/docs` sesuai kebutuhanmu).
4. Tunggu beberapa menit, situs akan aktif di `https://username.github.io/nama-repo/`.

## Catatan penting soal keamanan

Karena situs ini murni statis (tanpa login), siapa pun yang tahu URL Apps Script kamu bisa memanggil API-nya langsung dan menambah/mengubah/menghapus data — halaman "Edit" di website ini **bukan** proteksi keamanan sungguhan, hanya pemisah tampilan. Untuk kebutuhan personal ini biasanya cukup aman selama URL Apps Script tidak disebar. Kalau ingin sedikit lebih aman, kamu bisa menambahkan token rahasia sederhana (misal parameter `?key=...` yang dicek di `doGet`/`doPost` sebelum memproses), tapi ini tetap bukan pengganti autentikasi asli.

## Struktur file

```
index.html   -> halaman Lihat
edit.html    -> halaman Edit
style.css    -> tampilan (tema buku kas/ledger)
app.js       -> logika ambil & simpan data
config.js    -> tempat isi URL Apps Script kamu
Code.gs      -> tempel ke Apps Script (Google Sheets)
```
