import { expect, mock, test } from 'claude-code/testing'

const misura = (percentUsed: number) => ({
  context: { window: 200000 },
  rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: '2026-11-24T15:00:00Z' }],
  changed: ['rateLimits'],
})

function motore(on: Parameters<Parameters<typeof test>[1]>[1]) {
  const registro = { scritti: [] as string[], comandi: [] as string[], prompt: [] as string[] }
  on('session.measure', (_, e) => ({ changed: e.changed }) as never)
  on('model.fork', () => ({ value: { isAnswered: true, text: '# Punto di ripristino\nprova', usage: {} } }) as never)
  on('session.cwd', () => ({ value: 'D:/Archivio' }))
  on('session.id', () => ({ value: 'vecchia' }))
  on('fs.write', (_, e) => (registro.scritti.push((e as { path: string }).path), { value: undefined }) as never)
  on('command.run', (_, e) => (registro.comandi.push(e.command), { text: '' }) as never)
  on('prompt.submit', (_, e) => (registro.prompt.push(e.text), { text: e.text }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('ui.status', () => ({ value: undefined }) as never)
  return registro
}

test('sotto soglia non fa nulla', async ($, on) => {
  const clock = mock.clock(on, { now: Date.UTC(2026, 10, 24, 9, 30) })
  mock.store(on)
  const r = motore(on)
  await $.session.measure(misura(39.9) as never)
  await clock.advance(1000)
  expect(r.comandi).toEqual([])
})

test('al 40% salva, chiude e riapre una sola volta per finestra', async ($, on) => {
  const clock = mock.clock(on, { now: Date.UTC(2026, 10, 24, 9, 30) })
  mock.store(on)
  const r = motore(on)
  await $.session.measure(misura(40) as never)
  await clock.advance(1000)
  expect(r.scritti.length).toBe(1)
  expect(r.scritti[0]).toMatch(/punti-ripristino[\\/]2026-11-24_\d{4}_punto-ripristino\.md$/)
  expect(r.comandi).toEqual(['clear'])
  expect(r.prompt.length).toBe(1)
  expect(r.prompt[0]).toContain('prova')

  await $.session.measure(misura(45) as never)
  await clock.advance(1000)
  expect(r.comandi).toEqual(['clear'])
})
