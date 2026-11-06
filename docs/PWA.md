# PWA MakanMana

PWA memakai aplikasi React dan autentikasi yang sama untuk pengguna dan OB. Tidak ada backend atau mekanisme pesanan baru khusus PWA.

## Pemasangan

- Manifest: `public/manifest.webmanifest`, identitas `/`, start URL `/`, scope `/`, standalone.
- Ikon PNG 192/512, ikon maskable 512 dengan ruang aman, dan Apple touch icon 180 berasal dari logo SVG MakanMana.
- Tombol pemasangan ada di halaman masuk dan Pengaturan. Browser Chromium yang menyediakan `beforeinstallprompt` membuka dialog pemasangan setelah pengguna menekan tombol. Jika tidak tersedia, aplikasi memberi petunjuk menu browser, termasuk Safari/iPhone.
- Tidak meminta izin notifikasi. Web Push belum termasuk tahap ini.

## Offline dan data

`scripts/pwa-build.ts` membuat `sw.js` dari aset build produksi. Nama cache berubah berdasarkan isi service worker dan seluruh aset build.

Hanya HTML aplikasi, JS/CSS yang dihasilkan, manifest, ikon, dan ilustrasi publik yang diprecache. CSS Leaflet dibundel lokal. Peta tetap memerlukan jaringan.

Service worker tidak menangani POST/PUT/PATCH/DELETE, API, respons Supabase, sesi/token, profil, harga/menu backend, pesanan, foto bukti transfer, URL bertanda tangan, atau permintaan lintas origin. Tidak ada antrean checkout atau background sync. Cache sebelumnya dipertahankan satu generasi untuk aset tab lama; cache milik aplikasi lain tidak dihapus.

- Offline: tampilkan indikator, keranjang/catatan yang sudah disimpan tetap berada di localStorage per akun. Data pesanan dalam memori dapat tampil tetapi tidak dianggap data terbaru.
- Membuka kembali aplikasi saat offline: shell dapat dimuat setelah kunjungan online pertama. Jika profil belum tersedia, layar meminta pengguna menyambungkan internet. Role tidak disalin ke cache offline untuk melewati pemeriksaan akun.
- Checkout offline langsung ditolak tanpa mengubah keranjang atau mengirim upload.
- Mutasi React Query menggunakan `networkMode: always`, tanpa retry, dengan pemeriksaan koneksi sebelum menjalankan mutasi. Ini mencegah mutasi berhenti sementara lalu terkirim diam-diam setelah koneksi pulih.
- Operasi OB langsung juga memeriksa koneksi. Jika koneksi hilang sesudah permintaan dimulai, mekanisme kegagalan parsial/retry ID yang sudah ada tetap berlaku.

Indikator mengikuti sinyal `navigator.onLine`, bukan pemeriksaan kesehatan server. Jika sinyal online tetapi backend gagal, penanganan error permintaan tetap berlaku.

## Pembaruan

- Registrasi hanya pada build produksi dan secure context (HTTPS atau localhost).
- Worker baru menunggu; tidak ada aktivasi atau reload paksa otomatis.
- Aplikasi mengecek pembaruan saat registrasi, kembali online, kembali terlihat, dan tiap jam saat terlihat.
- Tombol Perbarui sekarang menolak reload jika ada modal/panel terbuka, transaksi berjalan, fokus pada input, atau form login terisi.
- Setelah pengguna memilih pembaruan, worker menerima `ACTIVATE_UPDATE` dan tab tersebut reload setelah pergantian controller. Tab lain diberi pemberitahuan pembaruan tanpa reload paksa.
- Konfigurasi Vercel mempertahankan fallback SPA dan memberi header no-cache pada service worker/manifest.

## Validasi

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5187
node --test tests/*.cjs
```

Pakai preview produksi untuk menguji service worker; mode dev tidak mendaftarkannya. Gunakan port khusus agar service worker preview tidak menutupi server pengembangan lain.

Untuk memverifikasi precache build sekaligus pengujian otomatis:

```sh
MAKANMANA_PWA_BUILD_DIR=/absolute/path/to/build node --test tests/*.cjs
```

Pengujian mencakup ukuran ikon, navigasi offline, pengecualian data privat dari cache, aktivasi manual, aset tab lama, mutasi offline tanpa antrean, perlindungan reload form/transaksi, serta checkout offline tanpa upload.

QA lokal pada 6 November 2026: build produksi dimuat di Chrome, dialog pemasangan tersedia, pembaruan menunggu lalu aktif setelah tombol dipilih, dan halaman masuk beserta aset tetap dimuat ulang setelah server preview dihentikan. Ini membuktikan fallback cache pada origin preview, bukan hasil uji airplane mode atau pemasangan di perangkat fisik.

Sebelum rilis: uji pemasangan Android/Chrome dan iPhone/Safari di URL HTTPS, buka ikon standalone, login pengguna/OB, airplane mode, pulihkan koneksi, periksa checkout/catatan, unggah bukti, dan pembaruan ketika keranjang/panel masih terbuka. Jangan memakai transaksi produksi untuk uji tanpa data uji yang disepakati.
