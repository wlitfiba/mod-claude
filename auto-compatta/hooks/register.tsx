import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import type { Stato } from '../types'

const INIZIALE: Stato = {
  base: 0,
  passo: 20,
  attiva: true,
  // La prima misura della sessione diventa la base ("ultima partenza").
  daRibasare: true,
  inAttesa: false,
  ultimo: 0,
}
const stato = atom({ plugin: 'auto-compatta', key: 'stato' } as const, INIZIALE, {
  shape: 'stato-1',
})

const ISTRUZIONI =
  'Conserva decisioni prese, file toccati, compiti aperti e prossimi passi.'

async function mostra($: Engine) {
  const s = await read($, stato)
  $.ui.status(
    s.attiva
      ? `auto-compatta: ${s.ultimo}% · scatta a ${s.base + s.passo}%`
      : 'auto-compatta: spenta',
  )
}

// Prova a compattare; se un turno è in corso la chiamata viene rifiutata:
// allora resta "in attesa" e si riprova al prossimo invio.
async function compatta($: Engine) {
  try {
    const r = await $.session.compact({ instructions: ISTRUZIONI })
    await update($, stato, s => ({ ...s, inAttesa: false }))
    if ('skip' in r && r.skip) $.ui.toast(`auto-compatta: saltata (${r.skip})`)
    else $.ui.toast('auto-compatta: sessione compattata')
  } catch {
    await update($, stato, s => ({ ...s, inAttesa: true }))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'autocompatta',
      description:
        'Auto-compattazione: senza argomenti compatta ora; "stato", "on", "off" o un numero (passo %)',
    })
    await mostra($)
    return next(e)
  })

  // Ogni compattazione (automatica, /compact, di questa mod) fa ripartire il
  // conteggio: la prossima misura del contesto diventa la nuova base.
  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId && e.trigger !== 'precompute' && !('skip' in r && r.skip)) {
      await update($, stato, s => ({ ...s, daRibasare: true, inAttesa: false }))
    }
    return r
  })

  // Convivenza con ripristino-automatico: un /clear (anche il suo) apre una
  // sessione nuova; si riparte da capo senza compattazioni in sospeso.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, stato, s => ({ ...s, daRibasare: true, inAttesa: false }))
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    const pct = e.context.percent
    if (pct === undefined) return r
    const s = await update($, stato, s =>
      s.daRibasare
        ? { ...s, base: pct, daRibasare: false, ultimo: pct }
        : { ...s, ultimo: pct },
    )
    await mostra($)
    if (s.attiva && pct >= s.base + s.passo) await compatta($)
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    const s = await read($, stato)
    if (s.attiva && s.inAttesa) await compatta($)
    return next(e)
  })

  on('command.run', { command: 'autocompatta' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await update($, stato, s => ({ ...s, attiva: arg === 'on' }))
      await mostra($)
      return { text: `Auto-compattazione ${arg === 'on' ? 'attivata' : 'disattivata'}.` }
    }
    const n = Number(arg)
    if (arg && Number.isFinite(n) && n >= 5 && n <= 90) {
      await update($, stato, s => ({ ...s, passo: Math.round(n) }))
      await mostra($)
      return { text: `Passo impostato a ${Math.round(n)}%.` }
    }
    if (arg === 'stato') {
      const s = await read($, stato)
      return {
        text: `Auto-compattazione ${s.attiva ? 'attiva' : 'spenta'}: contesto ${s.ultimo}%, base ${s.base}%, scatta a ${s.base + s.passo}% (passo ${s.passo}%).`,
      }
    }
    if (arg) return { text: 'Uso: /autocompatta [stato | on | off | 5-90]' }
    await compatta($)
    const s = await read($, stato)
    return {
      text: s.inAttesa
        ? 'Turno in corso: compatterò al prossimo invio.'
        : 'Compattazione eseguita; il conteggio riparte da qui.',
    }
  })
}
