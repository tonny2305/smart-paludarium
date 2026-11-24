'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Droplets, Fan, LockKeyhole, Wifi } from 'lucide-react'
import { ConnectionError, PageHeading } from '@/components/dashboard/Primitives'
import { useAuth } from '@/providers/AuthProvider'
import { usePaludarium } from '@/providers/PaludariumProvider'
import { cloudControlRequested, deviceBasePath, firebaseDatabase } from '@/lib/firebase'
import { sendCommand, type CommandInput, type CommandResult } from '@/lib/commands'
import { firmwareSupportsCloudCommands, getDeviceHealth } from '@/lib/paludarium'

type StartAction = { action: 'DIRECT_ON' } | { action: 'RUN_TIMER'; seconds: number } | { action: 'SET_AUTO'; hour: number; minute: number; seconds: number }

export function ControlDashboard() {
  const { user } = useAuth()
  const { status, browserOnline, dataState, error, now } = usePaludarium()
  const [pendingFan, setPendingFan] = useState(0)
  const [pendingPump, setPendingPump] = useState(0)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [message, setMessage] = useState('')
  const [startAction, setStartAction] = useState<StartAction | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(10)
  const [autoHour, setAutoHour] = useState<number | ''>('')
  const [autoMinute, setAutoMinute] = useState<number | ''>('')
  const [autoSeconds, setAutoSeconds] = useState<number | ''>('')
  const [fanStart, setFanStart] = useState<number | ''>('')
  const [fanEnd, setFanEnd] = useState<number | ''>('')
  const health = getDeviceHealth(status, now)
  const firmwareSupported = status?.capabilities?.cloud_commands === true || firmwareSupportsCloudCommands(status?.firmware)
  const cloudControlAvailable = cloudControlRequested && firmwareSupported
  const canConnect = cloudControlAvailable && browserOnline && dataState === 'ready' && Boolean(firebaseDatabase && user)
  const stopLocked = status?.pump?.stop_lock === true
  const stopLockClear = status?.pump?.stop_lock === false
  const pumpIsOff = status?.pump?.on === false
  const anyPending = pendingFan > 0 || pendingPump > 0
  const canStartPump = canConnect && health === 'fresh' && stopLockClear && pumpIsOff && pendingPump === 0 && !anyPending
  const pumpIsRunning = status?.pump?.on === true
  const validFanSchedule = typeof fanStart === 'number' && Number.isInteger(fanStart) && fanStart >= 0 && fanStart <= 23
    && typeof fanEnd === 'number' && Number.isInteger(fanEnd) && fanEnd >= 0 && fanEnd <= 23
  const validPumpSchedule = typeof autoHour === 'number' && Number.isInteger(autoHour) && autoHour >= 0 && autoHour <= 23
    && typeof autoMinute === 'number' && Number.isInteger(autoMinute) && autoMinute >= 0 && autoMinute <= 59
    && typeof autoSeconds === 'number' && Number.isInteger(autoSeconds) && autoSeconds >= 1 && autoSeconds <= 60

  useEffect(() => {
    if (!startAction) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStartAction(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [startAction])

  async function run(command: CommandInput) {
    const startsOutput = command.target === 'pump'
      ? command.action === 'DIRECT_ON' || command.action === 'RUN_TIMER' || command.action === 'SET_AUTO'
      : command.action === 'SET_SCHEDULE' || command.action === 'SET_MODE' && ['AUTO', 'MANUAL_ON'].includes(String(command.params?.mode))

    if (!cloudControlAvailable || !firmwareSupported) {
      setMessage('Kontrol cloud belum tersedia untuk firmware perangkat ini.')
      return
    }
    if (!browserOnline || !firebaseDatabase || !user) {
      setMessage('Koneksi cloud tidak tersedia. Tidak ada perintah yang dikirim.')
      return
    }
    if (startsOutput && !stopLockClear) {
      setMessage(stopLocked
        ? 'STOP LOCK aktif. Perintah yang menyalakan output dinonaktifkan.'
        : 'Status STOP LOCK belum diketahui. Perintah yang menyalakan output dinonaktifkan.')
      return
    }
    if (startsOutput && command.target === 'pump' && (!canStartPump || health !== 'fresh')) {
      setMessage('Pompa hanya dapat dinyalakan saat perangkat segar, terhubung, dan pompa sedang mati.')
      return
    }
    if (anyPending && !(command.target === 'pump' && command.action === 'OFF')) {
      setMessage('Tunggu sampai perintah sebelumnya selesai.')
      return
    }

    if (command.target === 'pump') setPendingPump(value => value + 1)
    else setPendingFan(value => value + 1)
    setResult(null)
    setMessage('Mengirim perintah; menunggu konfirmasi ESP32…')
    try {
      const commandResult = await sendCommand(firebaseDatabase, deviceBasePath, user.uid, command, firmwareSupported)
      setResult(commandResult)
      setMessage(commandResult.status === 'applied'
        ? `Perangkat mengonfirmasi: ${commandResult.message}`
        : commandResult.status === 'timeout'
          ? 'Perangkat belum mengonfirmasi perintah. Status belum dianggap berubah.'
          : commandResult.message)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Gagal mengirim perintah.')
    } finally {
      if (command.target === 'pump') setPendingPump(value => Math.max(0, value - 1))
      else setPendingFan(value => Math.max(0, value - 1))
    }
  }

  async function confirmPumpStart() {
    if (!startAction) return
    const action = startAction
    setStartAction(null)
    if (action.action === 'DIRECT_ON') await run({ target: 'pump', action: 'DIRECT_ON' })
    if (action.action === 'RUN_TIMER') await run({ target: 'pump', action: 'RUN_TIMER', params: { seconds: action.seconds } })
    if (action.action === 'SET_AUTO') {
      await run({ target: 'pump', action: 'SET_AUTO', params: { hour: action.hour, minute: action.minute, seconds: action.seconds } })
    }
  }

  function requestPumpStart(action: StartAction) {
    if (!canStartPump) {
      setMessage('Pompa hanya dapat dinyalakan saat perangkat segar, terhubung, STOP LOCK tidak aktif, dan pompa sedang mati.')
      return
    }
    setStartAction(action)
  }

  function submitFanSchedule() {
    if (!validFanSchedule) return
    void run({ target: 'fan', action: 'SET_SCHEDULE', params: { start_hour: fanStart, end_hour: fanEnd, activate_auto: true } })
  }

  function submitPumpSchedule() {
    if (!validPumpSchedule) return
    requestPumpStart({ action: 'SET_AUTO', hour: autoHour, minute: autoMinute, seconds: autoSeconds })
  }

  const fanMode = status?.fan?.mode?.toUpperCase()
  const pumpMode = status?.pump?.mode?.toUpperCase()

  return (
    <>
      {dataState === 'error' && <ConnectionError>{error || 'Periksa koneksi dan aturan Firebase.'}</ConnectionError>}
      <PageHeading eyebrow="PERANGKAT · OTOMASI" title="Kontrol perangkat" detail="Otomasi lokal tetap menjadi kendali utama." />
      {stopLocked && <div className="stop-banner" role="alert"><span className="stop-icon"><AlertTriangle size={17} /></span><div><strong>STOP LOCK AKTIF</strong><p>Output perangkat dikunci oleh ESP32. Web tidak dapat melepas kunci ini.</p></div></div>}
      {!cloudControlAvailable && <div className="control-disabled-banner" role="status">
        <span className="control-lock"><LockKeyhole size={17} /></span>
        <div><strong>{firmwareSupported ? 'Kontrol cloud dinonaktifkan' : 'Kontrol cloud belum tersedia'}</strong>
          <p>{firmwareSupported
            ? 'Perangkat mendukung kontrol cloud, tetapi fitur belum diaktifkan pada konfigurasi web.'
            : `Firmware ESP32 V${status?.firmware || '6.1'} masih menggunakan telemetri satu arah. Monitoring cloud aktif, tetapi perintah jarak jauh memerlukan firmware V6.2.`}</p>
        </div><span className="version-tag">FIRMWARE {status?.firmware || '6.1'}</span>
      </div>}
      <div className="control-grid">
        <article className="panel control-card">
          <div className="control-card-top"><span className="icon-tile"><Fan size={18} /></span><span className="mode-tag">{fanMode || '—'}</span></div>
          <span className="eyebrow">SIRKULASI UDARA</span><h2>Fan Control</h2>
          <div className="control-current"><span>Status saat ini</span><strong className={status?.fan?.on ? 'state-on' : ''}><span className="status-dot" />{status?.fan?.on === undefined ? 'Belum diketahui' : status.fan.on ? 'ON' : 'OFF'}</strong></div>
          <div className="schedule-display"><span>Jadwal otomatis</span><strong>{status?.fan?.start_hour != null && status.fan.end_hour != null ? `${String(status.fan.start_hour).padStart(2, '0')}:00 → ${String(status.fan.end_hour).padStart(2, '0')}:00` : 'Belum tersedia'}</strong></div>
          {cloudControlAvailable
            ? <div className="control-actions">
              <div className="button-row">
                <button type="button" disabled={!canConnect || anyPending || !stopLockClear} onClick={() => void run({ target: 'fan', action: 'SET_MODE', params: { mode: 'AUTO' } })}>AUTO</button>
                <button type="button" disabled={!canConnect || anyPending || !stopLockClear} onClick={() => void run({ target: 'fan', action: 'SET_MODE', params: { mode: 'MANUAL_ON' } })}>MANUAL ON</button>
                <button type="button" disabled={!canConnect || anyPending} onClick={() => void run({ target: 'fan', action: 'SET_MODE', params: { mode: 'MANUAL_OFF' } })}>MANUAL OFF</button>
              </div>
              <div className="control-form-row"><label>Mulai <input type="number" min="0" max="23" value={fanStart} onChange={event => setFanStart(event.target.value === '' ? '' : Number(event.target.value))} /></label><label>Selesai <input type="number" min="0" max="23" value={fanEnd} onChange={event => setFanEnd(event.target.value === '' ? '' : Number(event.target.value))} /></label><button type="button" disabled={!canConnect || anyPending || !stopLockClear || !validFanSchedule} onClick={submitFanSchedule}>Simpan jadwal</button></div>
            </div>
            : <button className="disabled-control" disabled><LockKeyhole size={14} /> Kontrol tersedia setelah firmware V6.2</button>}
        </article>
        <article className={`panel control-card pump-control-card${pumpIsRunning ? ' active-pump' : ''}`}>
          <div className="control-card-top"><span className="icon-tile blue-tile"><Droplets size={18} /></span><span className="mode-tag">{pumpMode || '—'}</span></div>
          <span className="eyebrow">PENGISIAN AIR</span><h2>Refill Pump</h2>
          <div className="control-current"><span>Status saat ini</span><strong className={pumpIsRunning ? 'state-on' : ''}><span className="status-dot" />{status?.pump?.on === undefined ? 'Belum diketahui' : pumpIsRunning ? 'POMPA BERJALAN' : 'OFF · SIAGA'}</strong></div>
          <div className="schedule-display"><span>Jadwal AUTO</span><strong>{status?.pump?.auto_hour != null ? `${String(status.pump.auto_hour).padStart(2, '0')}:${String(status.pump.auto_minute ?? 0).padStart(2, '0')} WIB · ${status.pump.auto_seconds ?? '—'} dtk` : 'Belum tersedia'}</strong></div>
          {cloudControlAvailable
            ? <div className="control-actions">
              <button className={`pump-off-button${pumpIsRunning ? ' active' : ' standby'}`} type="button" disabled={!canConnect} onClick={() => void run({ target: 'pump', action: 'OFF' })}>MATIKAN POMPA</button>
              {!pumpIsRunning && <button className="pump-on-button" type="button" disabled={!canStartPump} onClick={() => requestPumpStart({ action: 'DIRECT_ON' })}>NYALAKAN POMPA</button>}
              <div className="control-form-row"><label>Timer (1–300 dtk) <input type="number" min="1" max="300" value={timerSeconds} onChange={event => setTimerSeconds(Number(event.target.value))} /></label><button type="button" disabled={!canStartPump || timerSeconds < 1 || timerSeconds > 300} onClick={() => requestPumpStart({ action: 'RUN_TIMER', seconds: timerSeconds })}>Jalankan timer</button></div>
              <div className="control-form-row auto-schedule"><label>Jam <input type="number" min="0" max="23" value={autoHour} onChange={event => setAutoHour(event.target.value === '' ? '' : Number(event.target.value))} /></label><label>Menit <input type="number" min="0" max="59" value={autoMinute} onChange={event => setAutoMinute(event.target.value === '' ? '' : Number(event.target.value))} /></label><label>Durasi dtk <input type="number" min="1" max="60" value={autoSeconds} onChange={event => setAutoSeconds(event.target.value === '' ? '' : Number(event.target.value))} /></label><button type="button" disabled={!canStartPump || !validPumpSchedule} onClick={submitPumpSchedule}>Aktifkan AUTO</button></div>
              <button className="secondary-control" type="button" disabled={!canConnect || pendingPump > 0 && !pumpIsRunning} onClick={() => void run({ target: 'pump', action: 'DISABLE_AUTO' })}>Matikan jadwal AUTO</button>
            </div>
            : <button className="disabled-control" disabled><LockKeyhole size={14} /> Kontrol tersedia setelah firmware V6.2</button>}
        </article>
      </div>
      <div className="safety-note"><span className="safety-icon"><AlertTriangle size={15} /></span><p><strong>Pengisian air perlu diawasi.</strong> Sensor ketinggian air belum terpasang. Perintah ON memerlukan perangkat segar, status pompa OFF, STOP LOCK tidak aktif, dan konfirmasi.</p></div>
      <div className="local-control-card"><span className="local-icon"><Wifi size={17} /></span><div><strong>Perlu mengubah perangkat?</strong><span>Gunakan dashboard lokal ESP32 di jaringan Wi-Fi yang sama.</span></div></div>
      {message && <p className={`command-result${result?.status === 'applied' ? ' success' : result?.status === 'error' || result?.status === 'timeout' || result?.status === 'rejected' ? ' error' : ''}`} role="status" aria-live="polite">{anyPending && <span className="spin-dot" />}{message}</p>}
      {startAction && <div className="modal-backdrop" role="presentation">
        <section className="pump-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="pump-confirm-title" aria-describedby="pump-confirm-description">
          <div className="safety-icon"><AlertTriangle size={18} /></div>
          <h2 id="pump-confirm-title">Mulai pompa refill?</h2>
          <p id="pump-confirm-description">Paludarium saat ini belum memiliki sensor ketinggian air. Gunakan pompa manual langsung hanya saat pengisian diawasi.</p>
          <div className="modal-actions"><button type="button" className="secondary-control" autoFocus onClick={() => setStartAction(null)}>Batal</button><button type="button" className="pump-on-button" onClick={() => void confirmPumpStart()}>Mulai pompa</button></div>
        </section>
      </div>}
    </>
  )
}
