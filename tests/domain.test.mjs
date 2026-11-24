import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function loadTypeScriptModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
}

const paludarium = await loadTypeScriptModule('../lib/paludarium.ts')
const history = await loadTypeScriptModule('../lib/history-core.ts')
const { getDeviceHealth, firmwareSupportsCloudCommands, normalizeStatus } = paludarium
const { getJakartaDateKeys, normalizeDhtHistoryPoint } = history

const sampleTimestamp = Date.UTC(2026, 10, 24, 9)

test('device freshness uses the 90-second and five-minute thresholds', () => {
  const status = normalizeStatus({
    clock: { date_key: 20261124, text: '24/11 16:00:00 WIB' },
  })
  assert.equal(getDeviceHealth(status, sampleTimestamp + 90_000), 'fresh')
  assert.equal(getDeviceHealth(status, sampleTimestamp + 91_000), 'stale')
  assert.equal(getDeviceHealth(status, sampleTimestamp + 300_000), 'stale')
  assert.equal(getDeviceHealth(status, sampleTimestamp + 301_000), 'offline')
  assert.equal(getDeviceHealth(status, sampleTimestamp - 91_000), 'unknown')
  assert.equal(getDeviceHealth(normalizeStatus({ clock: { date_key: 20260230, text: '30/02 16:00:00 WIB' } })), 'unknown')
})

test('V6.1 remains compatible when optional capabilities are absent', () => {
  const status = normalizeStatus({ firmware: '6.1', weather: { fresh: true, http: 0 } })
  assert.equal(status?.capabilities, undefined)
  assert.equal(status?.weather?.fresh, true)
  assert.equal(status?.weather?.http, 0)
  assert.equal(firmwareSupportsCloudCommands(status?.firmware), false)
  assert.equal(firmwareSupportsCloudCommands('V6.2'), true)
  assert.equal(firmwareSupportsCloudCommands('7.0'), true)
  assert.equal(firmwareSupportsCloudCommands('unknown'), false)
})

test('history path date and hour define Jakarta timestamps', () => {
  const point = normalizeDhtHistoryPoint('2026-11-24', '16', {
    temperature_c: 29.4,
    humidity_percent: 74.2,
    epoch_local_basis: 0,
  })
  assert.equal(point?.timestamp.toISOString(), '2026-11-24T09:00:00.000Z')
  assert.equal(point?.hourKey, '16')
  assert.equal(point?.temperatureC, 29.4)
  assert.equal(point?.humidityPercent, 74.2)
})

test('invalid history samples are ignored and missing hours are not synthesized', () => {
  assert.equal(normalizeDhtHistoryPoint('2026-02-30', '12', { temperature_c: 0, humidity_percent: 50 }), null)
  assert.equal(normalizeDhtHistoryPoint('2026-11-24', '24', { temperature_c: 28, humidity_percent: 50 }), null)
  assert.equal(normalizeDhtHistoryPoint('2026-11-24', '12', { temperature_c: null, humidity_percent: 50 }), null)
  assert.equal(normalizeDhtHistoryPoint('2026-11-24', '12', { temperature_c: 28, humidity_percent: 101 }), null)
  assert.deepEqual(getJakartaDateKeys(Date.UTC(2026, 10, 23, 16), Date.UTC(2026, 10, 24, 3)), ['2026-11-23', '2026-11-24'])
})
