# ⚠️ AGENT INSTRUCTIONS / PETUNJUK PENGEMBANGAN AGENTIC ⚠️

> [!IMPORTANT]
> **DOKUMEN INI WAJIB DIBACA OLEH AI AGENT / ASSISTANT SEBELUM MELAKUKAN PERUBAHAN APAPUN DI REPOSITORI INI!**
> 
> **THIS DOCUMENT MUST BE READ BY ANY AI AGENT / ASSISTANT BEFORE MAKING ANY CHANGES TO THIS REPOSITORY!**

---

## 🚫 ATURAN UTAMA INSTALASI PAKET / CRITICAL PACKAGE INSTALLATION RULES

### 1. DILARANG KERAS Menjalankan `npm install` Tanpa Parameter / DO NOT RUN BARE `npm install`
*   **ID**: `DILARANG_NPM_INSTALL_POLOS`
*   **Aturan**: Jangan pernah menjalankan perintah `npm install`, `npm i`, `yarn install`, atau `pnpm install` secara langsung tanpa parameter nama paket spesifik di proyek ini.
*   **Rule**: Never execute `npm install`, `npm i`, `yarn install`, or `pnpm install` blindly without target package names.

### 2. DILARANG KERAS Memperbarui Paket TanStack / DO NOT UPDATE TANSTACK PACKAGES
*   **ID**: `DILARANG_UPDATE_TANSTACK`
*   **Aturan**: Jangan pernah melakukan pembaruan (upgrade/update) pada paket TanStack apa pun (seperti `@tanstack/react-query`, `@tanstack/react-virtual`, dll.).
*   **Alasan Keamanan**: Ekosistem TanStack terindikasi terkena serangan malware berbahaya pada **11 Mei 2026**. Versi yang terinstal saat ini di `node_modules` adalah versi bersih yang aman karena dipasang sebelum tanggal serangan. Pembaruan akan memicu unduhan versi berbahaya yang dapat merusak lingkungan kerja atau mencuri data.
*   **Rule**: Never update or upgrade any TanStack ecosystem packages. The installed versions are locked to pre-malware states (pre-May 11, 2026) and must remain untouched.

### 3. Prosedur Instalasi Paket Baru / Proper Package Installation Protocol
*   **Aturan**: Jika Anda perlu menginstal paket baru, instal secara spesifik menggunakan nama paketnya saja.
*   **Contoh Perintah**:
    ```bash
    npm install <nama_paket>
    # Contoh: npm install axios
    ```
*   **Rule**: If a new package must be added, install it specifically by name (e.g. `npm install <package_name>`).

---

> [!CAUTION]
> Pelanggaran terhadap aturan ini dapat menyebabkan masalah keamanan serius pada lingkungan kerja pengguna. Patuhi instruksi ini sepenuhnya tanpa pengecualian!
>
> Violating these instructions can compromise developer environment security. Adhere strictly to these rules!
