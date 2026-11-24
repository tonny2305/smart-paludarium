# Smart Paludarium

Dashboard iseng-iseng buat mantau kondisi paludarium lewat ESP32 dan Firebase. Biar bisa cek dari layar.

## Status firmware

- **V6.1:** monitoring cloud satu arah. Kontrol kipas dan pompa tetap lokal di ESP32.
- **V6.2:** dukungan command cloud direncanakan. Web menyiapkan alur command/ACK, tetapi tetap terkunci sampai feature flag aktif dan perangkat menyatakan dukungan.

Kontrol pompa memerlukan perangkat segar, status pompa OFF, STOP lock tidak aktif, dan konfirmasi eksplisit. Status hanya dianggap berhasil setelah ESP32 mengirim ACK `APPLIED`.

## Arsitektur

```text
ESP32 → Firebase Realtime Database → Next.js dashboard
```

Firebase Authentication mengelola login email/password. Satu provider memasang listener terbatas ke status, settings, dan 50 event terakhir. Data per jam untuk DHT22 diambil hanya untuk tanggal yang diperlukan; timestamp mengikuti path tanggal/jam `Asia/Jakarta`, bukan `epoch_local_basis`.

| Data | Realtime Database path |
| --- | --- |
| Status | `/paludarium/status` |
| Pengaturan | `/paludarium/settings` |
| Event | `/paludarium/events` |
| Riwayat DHT22 | `/paludarium/history/dht22/YYYY-MM-DD/HH` |
| Perintah V6.2 (rencana) | `/paludarium/commands/pending/{commandId}` |
| ACK V6.2 (rencana) | `/paludarium/commands/acks/{commandId}` |

Riwayat menampilkan sampel valid saja. Jam tanpa pembacaan tetap menjadi celah, bukan angka nol atau data buatan.

## Tech stack

Next.js 16, React 19, TypeScript, Firebase JS SDK, Firebase Authentication, Realtime Database, Recharts, dan pnpm.

## Jalankan lokal

Butuh Node.js dan pnpm.

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Isi konfigurasi Firebase di `.env.local`, lalu:

```powershell
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000). Pemeriksaan sebelum deploy:

```powershell
pnpm typecheck
pnpm build
```

## Environment variables

Nilai Firebase tersedia di Firebase Console → Project settings → General → Your apps → Web app.

| Variable | Kegunaan |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key aplikasi Firebase (wajib) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domain Authentication (wajib) |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | URL Realtime Database (wajib) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID proyek (wajib) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ID aplikasi web (wajib) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket (opsional) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID (opsional) |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Measurement ID (opsional) |
| `NEXT_PUBLIC_DEVICE_BASE_PATH` | Root data perangkat; default `paludarium` |
| `NEXT_PUBLIC_ENABLE_CLOUD_CONTROL` | Aktifkan kontrol cloud; default `false` |

Variabel `NEXT_PUBLIC_` tersedia di browser. Jangan masukkan service-account key atau rahasia server. `.env.local` tidak boleh di-commit; `.env.example` hanya berisi nama variabel dan nilai contoh.

## Firebase setup

1. Buat Firebase Web App dan Realtime Database.
2. Aktifkan **Authentication → Sign-in method → Email/Password**.
3. Buat akun pemilik melalui **Authentication → Users**; tidak ada pendaftaran publik.
4. Isi `.env.local` dengan konfigurasi Web App dan URL database yang benar.
5. Batasi Realtime Database Rules ke pemilik terautentikasi. Jangan aktifkan public read/write.

`firebase.database.rules.example.json` adalah template, bukan rules yang otomatis diterapkan. Ganti `OWNER_UID` sebelum menggunakannya. Autentikasi identitas ESP32 dengan custom claim adalah pekerjaan firmware V6.2; jangan anggap template langsung kompatibel dengan firmware V6.1.

## Riwayat DHT22

Firmware menyimpan sampel per jam di `/paludarium/history/dht22/YYYY-MM-DD/HH`. Dashboard menyediakan rentang 24 jam, 7 hari, dan 30 hari, dengan ringkasan terbaru/minimum/maksimum/rata-rata. Nilai invalid diabaikan dan sampel hilang tidak diisi.

## Kontrol cloud dan kontrak V6.2

`NEXT_PUBLIC_ENABLE_CLOUD_CONTROL` harus bernilai `true`, dan status perangkat harus menyatakan `capabilities.cloud_commands: true` atau firmware minimal 6.2. Dengan V6.1, kontrol tetap nonaktif meskipun aplikasi dikonfigurasi.

Perintah ditulis ke `commands/pending/{commandId}` dan ditunggu hingga 15 detik untuk ACK di `commands/acks/{commandId}`. Command kedaluwarsa setelah sekitar 60 detik. Status ACK yang dikenal: `APPLIED`, `REJECTED`, `EXPIRED`, `DUPLICATE`, dan `ERROR`. Perintah pompa ON tidak diulang otomatis.

## Deploy ke Netlify

Hubungkan repo GitHub ke Netlify dan isi environment variables yang sama di pengaturan site. `netlify.toml` menggunakan `pnpm build` dan integrasi Next.js Netlify; jangan set publish directory ke folder statis seperti `dist`.

## Keamanan

- Jangan commit `.env.local` atau kredensial service account.
- Aturan database harus menolak akses publik dan memberi izin seperlunya saja.
- Frontend tidak mengubah Firebase Rules production.
- STOP lock hanya dapat dilepas secara lokal oleh ESP32, bukan dari web.
