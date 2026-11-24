import type { EngineInterface, Register } from 'claude-code'

// Soglia e finestra di utilizzo sorvegliata.
// Claude espone due finestre: `five_hour` (limite di sessione, quello che si
// azzera durante la giornata) e `seven_day` (settimanale). Non esiste una
// finestra "giornaliera": la più vicina è `five_hour`.
const SOGLIA = 40
const FINESTRA = 'five_hour'
const CARTELLA = '.claude/punti-ripristino'

const PROMPT_RIPRISTINO = `Crea un PUNTO DI RIPRISTINO di questa sessione, in italiano, in Markdown.
Servirà a una sessione NUOVA che non vedrà nulla di questa conversazione, quindi deve bastare da solo.
Usa esattamente queste sezioni:

# Punto di ripristino
## Obiettivo dell'utente
## Stato attuale (cosa è fatto, cosa no)
## File e percorsi coinvolti (percorsi completi)
## Decisioni prese e vincoli da rispettare
## Problemi aperti
## Prossimi passi (in ordine)

Sii concreto e completo ma senza ripetizioni. Rispondi solo con il Markdown.`

let inCorso = false

const due = (n: number) => String(n).padStart(2, '0')

async function ripristina($: EngineInterface, motivo: string): Promise<void> {
  if (inCorso) return
  inCorso = true
  try {
    $.ui.toast(`${motivo}: creo il punto di ripristino…`)
    $.ui.status('punto di ripristino in corso…')

    const risposta = await $.model.fork({ prompt: PROMPT_RIPRISTINO })
    if (!risposta.isAnswered) {
      $.ui.toast(`Punto di ripristino non creato (${risposta.reason}): sessione lasciata aperta.`)
      return
    }

    const d = new Date(await $.clock.now())
    const nome = `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}_punto-ripristino.md`
    const cwd = await $.session.cwd()
    const percorso = `${cwd.replace(/[\\/]+$/, '')}/${CARTELLA}/${nome}`
    const vecchiaSessione = await $.session.id()
    const testo = `${risposta.text.trim()}\n\n---\nSessione di origine: ${vecchiaSessione} · ${motivo}\n`
    await $.fs.write(percorso, testo)

    // Chiude la sessione corrente e ne apre una nuova (come /clear).
    await $.command.run({ command: 'clear', args: '' })

    // La nuova sessione riparte dal punto di ripristino.
    await $.prompt.submit({
      text:
        `Questa è una nuova sessione aperta automaticamente dal punto di ripristino ` +
        `salvato in ${percorso} (${motivo}). Leggi il riepilogo qui sotto, ` +
        `conferma in due righe dove eravamo e prosegui dal primo dei prossimi passi.\n\n${testo}`,
    })
    $.ui.toast(`Nuova sessione avviata dal punto di ripristino: ${nome}`)
  } catch (err) {
    $.ui.toast(`Ripristino automatico fallito: ${String(err)}`)
  } finally {
    $.ui.status(undefined)
    inCorso = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'punto-ripristino',
      description: 'Crea ora un punto di ripristino e riparte da una nuova sessione',
    })
    return next(e)
  })

  on('command.run', { command: 'punto-ripristino' }, $ => {
    // Fuori dall'hook: /clear non si può lanciare dall'interno di un comando.
    $.clock.after(300, () => void ripristina($, 'richiesta manuale'))
    return { text: 'Creo il punto di ripristino e riapro la sessione…' }
  })

  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    if (inCorso) return r
    const finestra = e.rateLimits.find(l => l.kind === FINESTRA)
    if (!finestra || finestra.percentUsed < SOGLIA) return r

    // Una sola volta per finestra: dopo il reset si riarma da sola.
    const chiave = `fatto:${FINESTRA}:${SOGLIA}:${finestra.resetsAt ?? 'senza-reset'}`
    if (await $.store.get(chiave)) return r
    await $.store.set(chiave, true)

    const motivo = `utilizzo ${finestra.percentUsed}% (soglia ${SOGLIA}%)`
    $.clock.after(500, () => void ripristina($, motivo))
    return r
  })
}
