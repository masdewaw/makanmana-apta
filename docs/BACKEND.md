# Backend MakanMana

**Status hardening: sudah diterapkan pada 6 November 2026 melalui MCP setelah persetujuan pemilik.** Pengujian role database lulus dan di-rollback. Snapshot `backend-metadata.json` tetap merupakan arsip kondisi sebelum hardening, bukan konfigurasi aktif. Rincian aktif dan batas validasi ada di [SECURITY_CHANGE.md](SECURITY_CHANGE.md). Frontend terbaru belum dirilis.

Diperiksa melalui MCP Supabase pada 6 November 2026. Project `MakanMana-App`, ref `bcosrhpjzlzqhgmbjkmf`. Dokumen ini menggambarkan snapshot konfigurasi, bukan jaminan kondisi di masa depan atau migration untuk membuat ulang database.

## Akses data

- `src/api/orders.ts`: pesanan, histori, rekomendasi, ranking, dan inspirasi komunitas.
- `src/api/catalog.ts`: menu, kategori, favorit.
- `src/api/profiles.ts`: profil, role, dan koordinat OB.
- `src/api/paymentProofs.ts`: upload serta URL bukti pembayaran.
- `src/api/tardut.ts`, `temanMakan.ts`, `splitBill.ts`: fitur terkait.
- Operasi Auth tetap melalui client Supabase. Query database dan Storage ditempatkan di service, bukan JSX.
- Service katalog/profil/storage meneruskan response Supabase `{ data, error }`. Service fitur melempar error pada kegagalan. Pemanggil wajib mengikuti kontrak tersebut. Penyatuan error handling UI masuk P1 keandalan.
- `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` adalah konfigurasi frontend. Jangan menaruh service-role key di client.

## Tabel dan kontrak status

| Tabel | Fungsi | Status/default penting |
| --- | --- | --- |
| profiles | Nama, role, lokasi | role default `user`; UI OB menggunakan `OB` |
| menus | Nama, harga integer, kategori | kategori default `Lainnya` |
| categories | Nama kategori | UUID dibuat database |
| favorites | Relasi user dan menu | akses per pemilik |
| orders | Satu baris per unit makanan | order `waiting` atau `done`; payment `pending` atau `paid`; method `cash` atau `transfer` |
| tardut_requests | Pengajuan tarik tunai | `waiting`, `done`, `cancelled`; default `waiting` |
| teman_makan_groups | Room makan bersama | frontend menulis `open`, lalu `finished` |
| teman_makan_orders | Item pesanan dalam room | nominal numeric |
| split_bills | Room patungan | frontend menulis `open`, lalu `finished`; default database masih `pending` |
| split_bill_items | Item pribadi atau bersama | frontend memakai `food` dan `shared`; diskon bersama boleh negatif |

CHECK constraint database memvalidasi status orders, metode pembayaran, dan status Tardut. `assigned_to_ob` pada orders dibatasi `OB 1`, `OB 2`, atau NULL. Room status dan item type adalah kontrak frontend, belum dijamin CHECK constraint yang sama.

Beberapa kolom database nullable walaupun DTO aplikasi memakai nilai yang diharapkan oleh alur normal. Tipe frontend bukan pengganti schema database. Kolom, default, nullability, policy, publication, dan bucket tersedia di [backend-metadata.json](backend-metadata.json). Snapshot tidak berisi isi pesanan atau profil pengguna.

## Penyelesaian otomatis 8 jam

Aturan dipertahankan atas instruksi pemilik aplikasi. Sebelum membaca daftar, kode baru memanggil RPC `complete_expired_orders`. Fungsi terbatas di schema private akan menandai order belum selesai dengan `created_at < now - 8 jam` menjadi `done`. RPC tersebut sudah tersedia setelah migration. Ini lazy cleanup saat aplikasi memuat data, bukan cron atau jaminan tepat di jam kedelapan. Cleanup bersamaan berbagi satu promise; pemuatan berikutnya tetap mengecek ulang. Kegagalan cleanup dicatat dan tidak menghentikan pembacaan daftar. Status pembayaran tidak diubah.

Filter status diterapkan sebelum pagination. Daftar aktif memakai `waiting`; riwayat memakai `done`. Pagination menggunakan range inklusif, ukuran halaman 10 di dashboard.

## Sinkronisasi

`useTableSync` dan `subscribeQueryTable` berbagi satu channel per tabel/QueryClient, dengan reference count. Channel dilepas setelah konsumen terakhir unmount. Setiap perubahan menginvalidasi prefix cache terkait sekali; status `SUBSCRIBED` juga memicu refresh untuk mengejar perubahan selama reconnect.

| Tabel | Prefix cache |
| --- | --- |
| orders | orders |
| tardut_requests | tardut-requests |
| split_bills | splitBills |
| split_bill_items | splitBillItems |
| teman_makan_groups | tmRooms |
| teman_makan_orders | tmOrders |

Semua query fitur tersebut memakai polling cadangan 30 detik, tanpa polling di background secara eksplisit. Polling tetap diperlukan jika subscription atau publication tidak tersedia. React Query melakukan deduplikasi untuk query key yang sama; pagination berbeda tetap query berbeda. Publication yang diverifikasi mencakup keenam tabel tersebut dan profiles.

Tracking lokasi tetap memakai subscription profiles tersendiri karena memperbarui state peta, bukan cache query. Nama channel unik agar tidak berbenturan. Query katalog/profil di dashboard masih imperative dan dimuat ulang oleh handler terkait, belum menjadi cache Realtime. Kode baru memakai `profiles.ob_code` untuk identitas OB, membuang cache saat pergantian akun, dan menyediakan retry pemuatan. Kolom ob_code sudah tersedia.

## Bukti pembayaran

Bucket `payment-proofs` saat pemeriksaan bersifat public. Tidak ada batas ukuran atau MIME pada konfigurasi bucket. Validasi frontend 10 MB dan gambar tidak menggantikan validasi server. Policy upload mencakup authenticated, sedangkan SELECT public. Kode baru menyimpan keranjang dan UUID retry per akun di localStorage, termasuk checkpoint setelah setiap unit tersimpan. Kegagalan localStorage diberi pesan. URL signed yang berlaku 5 menit dibuat saat bukti dibuka; referensi URL public lama dinormalisasi ke path. Bucket produksi sudah private setelah migration yang disetujui.

## Temuan akses yang belum diperbaiki

RLS aktif bukan berarti policy membatasi akses sesuai role. Snapshot menunjukkan:

- `profiles`, `menus`, dan `orders` memiliki policy `Allow all` dengan `USING true` dan `WITH CHECK true` untuk public.
- `split_bill_items` memiliki policy ALL public dengan `USING true`.
- Tardut memiliki policy SELECT dan UPDATE public dengan `USING true`.
- Beberapa policy SELECT duplikat saling menambah akses, bukan memperketatnya.

Efektivitas akses juga bergantung pada grants; grants belum diaudit. Policy profil saat ini perlu perhatian khusus karena role disimpan pada profil. Sebelum memperketatnya, rancang akses karyawan, OB, komunitas, ranking, dan lazy cleanup 8 jam secara bersamaan. Mengunci order hanya ke pemilik dapat merusak fitur tersebut. Temuan policy ini sudah ditangani oleh migration yang kemudian disetujui dan diterapkan. Daftar di atas adalah temuan sebelum hardening. Pengujian grants dan role sesudah perubahan sudah lulus.

Referensi: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Validasi

Jalankan `node --test tests/*.cjs` dan `npm run build`. Tes memakai mock, tanpa menulis transaksi produksi. Verifikasi lintas perangkat, role, dan reconnect jaringan tetap diperlukan sebelum rilis. Migrasi schema yang dapat direproduksi belum tersedia; snapshot JSON bukan penggantinya.

## Catatan per menu, 6 November 2026

Migration `20261106074017_per_menu_order_notes.sql` sudah diterapkan. Kolom `orders.catatan` digunakan kembali karena satu row orders mewakili satu porsi; tidak ada kolom/tabel duplikat. Setiap baris keranjang memiliki `note` opsional dan checkout mengirim `item.note` ke `orders.catatan`. Jika jumlah menu 2, kedua row porsi menerima catatan menu yang sama. Catatan global di checkout sudah dihapus.

Draft catatan berada di keranjang per akun, sehingga tetap tersedia setelah refresh, menutup drawer, atau kegagalan sebagian. API menormalkan catatan kosong menjadi NULL dan memangkas whitespace pinggir. UI/API membatasi 500 karakter; database memakai CHECK `char_length(catatan) <= 500`. Catatan historis tidak diubah. Akses INSERT catatan tetap sesuai RLS; pengeditan sesudah checkout tidak dibuka.

Tes regresi checkout mencakup catatan berbeda antar-menu, catatan pada semua porsi, catatan kosong, dan retensi pada item gagal. Tes database `supabase/tests/per_menu_notes.sql` sudah lulus dan seluruh insert di-rollback, termasuk verifikasi pembacaan catatan oleh OB dan penolakan catatan 501 karakter. Frontend belum di-deploy.
