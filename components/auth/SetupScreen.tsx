'use client'

import { useState } from 'react'
import { ArrowRight, Check, Leaf, LockKeyhole, ShieldCheck } from 'lucide-react'

export function SetupScreen() {
  const [open, setOpen] = useState(false)
  return (
    <main className="setup-screen">
      <div className="setup-top">
        <div className="brand-lockup"><span className="brand-mark"><Leaf size={20} /></span><span><strong>paludarium</strong><small>CONTROL CENTER</small></span></div>
        <span className="setup-private"><LockKeyhole size={13} /> PRIVATE ACCESS</span>
      </div>
      <div className="setup-main">
        <div className="setup-visual" aria-hidden="true"><div className="setup-water" /><div className="setup-land" /><div className="setup-leaves"><i /><i /><i /><i /><i /><b /></div></div>
        <div className="setup-content">
          <div className="eyebrow">PERSIAPAN PERTAMA</div>
          <h1>Ekosistem Anda,<br /><span>terpantau dengan tenang.</span></h1>
          <p>Hubungkan Firebase untuk mulai menerima telemetri ESP32 secara real-time.</p>
          <div className="setup-checklist">
            <div><span className="check-icon"><Check size={13} /></span> Monitoring tanpa data simulasi</div>
            <div><span className="check-icon"><Check size={13} /></span> Sensor indoor dan cuaca terpisah</div>
            <div><span className="check-icon"><Check size={13} /></span> Kontrol cloud terkunci hingga firmware V6.2</div>
          </div>
          <button className="setup-primary" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Tutup panduan' : 'Konfigurasi Firebase'}<ArrowRight size={16} />
          </button>
          {open && <div className="setup-env">
            <strong>Tambahkan variabel di `.env.local`</strong>
            <p>Salin dari `.env.example`, lalu isi nilainya dari Firebase Console → Project settings → General → Your apps.</p>
            <p className="setup-env-note">Aktifkan Email/Password dan batasi Realtime Database ke akun pemilik. Jangan gunakan public read/write.</p>
          </div>}
          <div className="setup-note"><ShieldCheck size={15} /><span>Data hanya dapat diakses setelah autentikasi Firebase berhasil.</span></div>
        </div>
      </div>
      <div className="setup-footer"><span>SMART PALUDARIUM <b>·</b> V1.0</span><span>LOCAL AUTOMATION REMAINS INDEPENDENT</span></div>
    </main>
  )
}
