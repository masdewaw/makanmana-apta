# Perubahan keamanan dan P1 keandalan

## Status

Migration `supabase/migrations/20261106061723_harden_access_and_reliability.sql` **berhasil diterapkan ke produksi pada 6 November 2026 melalui MCP**, setelah pemilik memberikan persetujuan eksplisit. Penerapan awal sebelumnya ditolak pemeriksaan otomatis; persetujuan terbaru mengizinkan penerapan migration yang ditinjau.

Pengujian `supabase/tests/access_control.sql` lulus pada database produksi dalam transaksi yang seluruhnya di-rollback. Advisor keamanan sesudah migration hanya menyisakan `auth_leaked_password_protection` (konfigurasi Auth terpisah). Frontend lokal belum di-commit, push, atau deploy; versi frontend terbaru perlu dirilis agar mendukung bucket private dan alur baru.

## Cakupan migration yang diterapkan

- Tutup grants tabel untuk anon/public, termasuk TRUNCATE dan TRIGGER yang sebelumnya tersedia.
- Ganti policy permisif pada 10 tabel aplikasi dengan policy authenticated sesuai pemilik/role.
- Lindungi perubahan `profiles.role` dan `profiles.ob_code` melalui column grants. Pengguna hanya dapat mengubah nama sendiri; koordinat hanya dapat diperbarui OB.
- Tambahkan kode unik OB 1/OB 2 pada dua profil legacy yang telah diverifikasi. Pemetaan nama hanya dipakai satu kali dalam migration, lalu identitas tidak bergantung nama.
- Pesanan dan Tardut pribadi hanya terlihat oleh pemilik dan OB. Pembayaran/status hanya boleh diubah OB. Nominal, identitas pemilik, dan data pesanan tidak dapat diubah melalui operasi status.
- Menu/kategori hanya dapat dikelola OB. Favorit tetap per pemilik. Perubahan room dan assignment item dibatasi pada pemilik room atau peserta yang berhak.
- Buat fungsi terbatas untuk komunitas/ranking tanpa catatan atau bukti transfer. Fungsi SECURITY DEFINER berada di schema private dengan search_path tetap, sedangkan wrapper API memakai SECURITY INVOKER.
- Aturan 8 jam dipertahankan melalui RPC yang hanya boleh menyelesaikan order lebih tua dari 8 jam. Tidak dapat dipakai menentukan order ID atau batas waktu arbitrer.
- Ubah bucket `payment-proofs` menjadi private, batasi gambar 10 MB, batasi upload pada folder pemilik, serta baca bukti untuk pemilik/OB. Dukungan baca file lama tetap disiapkan.
- Kunci fungsi maintenance yang sebelumnya dapat dieksekusi anon/authenticated dan tetapkan search_path.
- Tambahkan trigger profil untuk pendaftaran, sehingga tidak bergantung pada insert profil oleh browser tanpa sesi.
- Tambahkan RPC invoker untuk menyimpan bill dan item sekaligus dalam satu transaksi.

Tidak ada penghapusan pesanan, profil, atau file. Perubahan bucket mematikan tautan public lama; frontend baru membaca file yang sama melalui signed URL berumur 5 menit.

## P1 keandalan di frontend lokal

- Bootstrap sesi dan role dengan batas tunggu 12 detik, tampilan error, retry, serta kembali ke login.
- Query profil tidak dijalankan secara synchronous di callback Auth.
- Query yang terlambat selesai diabaikan setelah sesi berganti. Cache dibersihkan saat user ID berganti dan dashboard diberi key user ID.
- Keranjang dan UUID per unit disimpan di key `makanmana:cart:v1:<user_id>`. File bukti/password/token tidak disalin ke penyimpanan keranjang.
- Checkout menyimpan ID sebelum kirim dan checkpoint setelah tiap keberhasilan, sehingga refresh di tengah batch tidak membuat ulang unit yang sudah tersimpan.
- Input JSON rusak diabaikan; kegagalan localStorage diberi pesan. Penyimpanan bergantung browser dan tidak menyinkronkan keranjang antarperangkat.
- Error query ditampilkan dengan retry; error mutasi dikembalikan ke pengguna. Favorit dipulihkan bila gagal, input kategori dipertahankan, operasi OB memakai lock dan finally.
- UPDATE penting meminta representasi row sehingga penolakan RLS yang menghasilkan nol row tidak dianggap berhasil.
- Tracking menggunakan kode OB, menerima koordinat 0, dan menyediakan retry kegagalan pemuatan.
- Penyimpanan split bill menggunakan RPC atomik; form dipertahankan saat gagal.

## Rilis dan kompatibilitas

Frontend terbaru dan migration bergantung satu sama lain. **Jangan merilis salah satunya sendirian.** Backend kini menyediakan ob_code dan RPC komunitas/ranking/cleanup/bill baru. Bucket sudah private sehingga frontend lama tidak dapat membuka tautan bukti public. Frontend lama juga belum mengenal trigger profil signup yang baru.

Urutan rilis terkoordinasi: build frontend siap terlebih dahulu, terapkan migration dalam transaction yang ditangani MCP, jalankan pengujian role dengan rollback, rilis frontend terbaru, kemudian smoke test login karyawan/OB, upload/baca bukti, checkout retry, Teman Makan, dan patungan. Hindari signup saat jendela pergantian versi. Jangan membuka kembali policy Allow all sebagai solusi kompatibilitas.

Kode belum di-commit, push, atau deploy. Dokumen ini tidak memberikan bukti bahwa konfigurasi produksi sudah aman.

## Pengujian

`node --test tests/*.cjs` menjalankan regresi checkout, validasi input, keranjang per akun, retry ID, korupsi/quota storage, timeout profil, normalisasi referensi bukti, dan deduplikasi Realtime. Build memeriksa TypeScript.

`supabase/tests/access_control.sql` menyiapkan uji transaksi role anon/karyawan/OB menggunakan akun yang ada serta fixture order/bill. Seluruh perubahan, termasuk cleanup 8 jam yang diuji, di-rollback. **Uji ini sudah dijalankan dan lulus, seluruh fixture dan cleanup di-rollback.** Jangan menafsirkan tes mock sebagai validasi policy live.

Advisor sudah diperiksa ulang setelah penerapan. Advisory kebocoran password terdeteksi nonaktif sebelum perubahan dan memerlukan konfigurasi Supabase Auth terpisah; migration SQL ini tidak mengaktifkannya. Referensi: [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
