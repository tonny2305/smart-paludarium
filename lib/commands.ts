import { onValue, ref, set, type Database } from 'firebase/database'
import { cloudControlRequested } from '@/lib/firebase'

export type CommandAckStatus = 'APPLIED' | 'REJECTED' | 'EXPIRED' | 'DUPLICATE' | 'ERROR'
export type CommandResultStatus = 'applied' | 'rejected' | 'timeout' | 'error'

export interface CommandAck {
  command_id: string
  status: CommandAckStatus
  message?: string
  device_time?: string
  ack_at_ms?: number
  firmware?: string
}

export interface CommandResult {
  commandId: string
  status: CommandResultStatus
  message: string
  ack?: CommandAck
}

export interface CommandInput {
  target: 'fan' | 'pump'
  action: string
  params?: Record<string, string | number | boolean>
}

function validCommand(command: CommandInput): boolean {
  const params = command.params ?? {}
  if (command.target === 'fan') {
    if (command.action === 'SET_MODE') return ['AUTO', 'MANUAL_ON', 'MANUAL_OFF'].includes(String(params.mode))
    if (command.action === 'SET_SCHEDULE') {
      return typeof params.start_hour === 'number' && Number.isInteger(params.start_hour) && params.start_hour >= 0 && params.start_hour <= 23
        && typeof params.end_hour === 'number' && Number.isInteger(params.end_hour) && params.end_hour >= 0 && params.end_hour <= 23
        && params.activate_auto === true
    }
    return false
  }
  if (command.action === 'OFF' || command.action === 'DIRECT_ON' || command.action === 'DISABLE_AUTO') return true
  if (command.action === 'RUN_TIMER') {
    return typeof params.seconds === 'number' && Number.isInteger(params.seconds) && params.seconds >= 1 && params.seconds <= 300
  }
  if (command.action === 'SET_AUTO') {
    return typeof params.hour === 'number' && Number.isInteger(params.hour) && params.hour >= 0 && params.hour <= 23
      && typeof params.minute === 'number' && Number.isInteger(params.minute) && params.minute >= 0 && params.minute <= 59
      && typeof params.seconds === 'number' && Number.isInteger(params.seconds) && params.seconds >= 1 && params.seconds <= 60
  }
  return false
}

function parseAck(value: unknown, commandId: string): CommandAck | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const ack = value as Record<string, unknown>
  const statuses: CommandAckStatus[] = ['APPLIED', 'REJECTED', 'EXPIRED', 'DUPLICATE', 'ERROR']
  if (ack.command_id !== commandId || typeof ack.status !== 'string' || !statuses.includes(ack.status as CommandAckStatus)) return null
  return {
    command_id: commandId,
    status: ack.status as CommandAckStatus,
    message: typeof ack.message === 'string' ? ack.message : undefined,
    device_time: typeof ack.device_time === 'string' ? ack.device_time : undefined,
    ack_at_ms: typeof ack.ack_at_ms === 'number' && Number.isFinite(ack.ack_at_ms) ? ack.ack_at_ms : undefined,
    firmware: typeof ack.firmware === 'string' ? ack.firmware : undefined,
  }
}

export function sendCommand(
  database: Database,
  basePath: string,
  issuedBy: string,
  command: CommandInput,
  deviceSupportsCloudCommands: boolean,
): Promise<CommandResult> {
  if (!cloudControlRequested || !deviceSupportsCloudCommands) {
    return Promise.reject(new Error('Kontrol cloud belum diaktifkan atau perangkat belum mendukungnya'))
  }
  if (!issuedBy) return Promise.reject(new Error('Sesi pengguna tidak valid'))
  if (!validCommand(command)) return Promise.reject(new Error('Format perintah tidak valid'))

  const commandId = crypto.randomUUID()
  const issuedAt = Date.now()
  const payload = {
    command_id: commandId,
    target: command.target,
    action: command.action,
    params: command.params ?? {},
    issued_by: issuedBy,
    issued_at_ms: issuedAt,
    expires_at_ms: issuedAt + 60_000,
    schema_version: 1,
  }

  return new Promise(resolve => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout>
    const ackReference = ref(database, `${basePath}/commands/acks/${commandId}`)
    const cleanup = onValue(ackReference, snapshot => {
      if (!snapshot.exists()) return
      const ack = parseAck(snapshot.val(), commandId)
      if (!ack) {
        finish('error', 'ACK perangkat tidak valid')
        return
      }
      finish(ack.status === 'APPLIED' ? 'applied' : 'rejected', ack.message || ack.status, ack)
    }, error => finish('error', error.message))

    function finish(status: CommandResultStatus, message: string, ack?: CommandAck) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      cleanup()
      resolve({ commandId, status, message, ack })
    }

    timeout = setTimeout(() => finish('timeout', 'Perangkat belum mengirim konfirmasi dalam 15 detik'), 15_000)
    set(ref(database, `${basePath}/commands/pending/${commandId}`), payload)
      .catch(error => finish('error', error instanceof Error ? error.message : 'Gagal mengirim perintah'))
  })
}
