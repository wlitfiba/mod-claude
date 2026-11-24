import type { EngineInterface, Register } from 'claude-code'

type Modello = 'haiku' | 'sonnet' | 'opus'

const MODELLI: readonly Modello[] = ['haiku', 'sonnet', 'opus']
const NOMI: Record<Modello, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' }
const MAX_TOKEN: Record<Modello, number> = { haiku: 8000, sonnet: 16000, opus: 16000 }
const SUBAGENTI_HAIKU = new Set(['assistente-leggero', 'ricercatore-rapido'])
const RIFIUTO = 'COMPITO TROPPO COMPLESSO PER QUESTO MODELLO'

const BASE = [
  'Svolgi il compito che ti viene affidato. Rispondi solo con il risultato richiesto,',
  'senza premesse. Rispondi in italiano salvo diversa richiesta.',
].join(' ')

const SISTEMA: Record<Modello, string> = {
  haiku: [
    BASE,
    'Sei adatto a compiti semplici e ben delimitati. Se il compito richiede ragionamento',
    'complesso, calcoli, scelte di progetto o informazioni che non hai, rispondi soltanto:',
    `"${RIFIUTO}" e il motivo in una riga.`,
  ].join('\n'),
  sonnet: [
    BASE,
    'Lavora con cura e precisione. Se il compito richiede un ragionamento molto profondo',
    'o decisioni con conseguenze importanti che non puoi valutare bene, rispondi soltanto:',
    `"${RIFIUTO}" e il motivo in una riga.`,
  ].join('\n'),
  opus: BASE,
}

const DESCRIZIONE = [
  'Delega un compito autosufficiente a un altro modello, scelto da te secondo la tipologia,',
  'per risparmiare. Il modello riceve solo "compito" e "testo" (niente conversazione, niente',
  'strumenti, niente file): metti nel campo "testo" tutto il materiale necessario.',
  'COME SCEGLIERE "modello":',
  '- haiku (economicissimo): tradurre, riassumere, riformulare, correggere refusi,',
  'riformattare, convertire formati (CSV/JSON/Markdown), estrarre dati da un testo,',
  'classificazioni semplici, commit message.',
  '- sonnet (medio): scrivere o rivedere lettere, email, relazioni e testi di media',
  'lunghezza; analizzare un documento con criteri chiari; controlli di coerenza.',
  '- opus (il più potente e costoso): solo per compiti lunghi e impegnativi ma isolati,',
  'quando conviene non appesantire la conversazione; altrimenti svolgili tu direttamente.',
  'Progettazione, debug difficili, calcoli e statistica, decisioni con conseguenze e il',
  'controllo qualità finale, la scrittura di codice e audio, video e immagini restano a te. Nel dubbio scegli il livello superiore.',
  `Se un modello risponde "${RIFIUTO}", la mod riprova da sola col livello successivo`,
  '(haiku → sonnet → opus) e il risultato dice quale modello ha risposto.',
  'Se il compito richiede di leggere o modificare file, usa invece lo strumento Agent:',
  'assistente-leggero o ricercatore-rapido per Haiku, oppure general-purpose con',
  'model "sonnet" per i compiti medi.',
].join(' ')

const CLASSIFICA = [
  'Classifica il compito qui sotto secondo il modello adatto a svolgerlo.',
  'haiku: compiti semplici e meccanici (tradurre, riassumere, correggere refusi,',
  'riformattare, convertire formati, estrarre dati, commit message).',
  'sonnet: scrittura o revisione di testi, spiegazioni, analisi con criteri chiari.',
  'opus: scrittura di codice, audio, video e immagini, progettazione, ragionamento profondo,',
  'calcoli o statistica, decisioni importanti.',
  'Rispondi con una sola parola: haiku, sonnet oppure opus.',
].join('\n')

const CLASSIFICA_TURNO = [
  'Sei lo smistatore di un assistente con accesso a file e strumenti. Ricevi la nuova',
  'richiesta dell\'utente e, come contesto, l\'ultima risposta dell\'assistente.',
  'Scegli il modello che deve svolgere la richiesta:',
  'haiku: solo compiti semplici e meccanici (tradurre, riassumere, correggere refusi,',
  'riformattare, convertire formati, rinominare o spostare file su indicazioni precise,',
  'domande fattuali brevi).',
  'sonnet: scrittura o revisione di testi, spiegazioni, ricerche nei file,',
  'analisi con criteri chiari.',
  'opus: elaborazione di audio, video o immagini e uso di servizi esterni (Gemini,',
  'Higgsfield e simili), qualsiasi scrittura o modifica di codice, progettazione, debug, calcoli o statistica,',
  'decisioni con conseguenze, controllo qualità, richieste ambigue, e le risposte brevi',
  '("sì", "procedi", "ok") che proseguono un lavoro impegnativo.',
  'Nel dubbio scegli opus. Rispondi con una sola parola: haiku, sonnet oppure opus.',
].join('\n')

// Richieste che vanno sempre a Opus, senza chiedere allo smistatore: audio, video, immagini,
// i servizi esterni che li elaborano e la programmazione. Aggiungi qui altre parole o servizi.
const SOLO_OPUS_MEDIA =
  /(audio|video|immagin|image|foto|clip\b|filmat|musica|canzon|voce|doppiagg|sottotitol|render|animazion|logo|banner|miniatur|thumbnail|gemini|higgsfield|veo\b|seedance|ffmpeg|blender|canva|figma|remotion|\bwan\b|\.(mp3|mp4|wav|mov|m4a|png|jpe?g|webp|gif)\b)/i
const SOLO_OPUS_CODICE =
  /(codice|programm|script|funzione|\bbug|debug|compil|refactor|\bapi\b|python|javascript|typescript|\bhtml|\bcss\b|\bsql\b|\bjava\b|c\+\+|c#|powershell|\bbash\b|\bmod\b|plugin|hook|\.(py|js|ts|tsx|jsx|ps1|sh|bat|cs|cpp|java|sql|html|css)\b)/i
const SOLO_OPUS_TESTO = new RegExp(`${SOLO_OPUS_MEDIA.source}|${SOLO_OPUS_CODICE.source}`, 'i')
const FILE_CODICE = /\.(py|js|mjs|cjs|ts|tsx|jsx|ps1|psm1|sh|bat|cmd|cs|cpp|c|h|java|go|rs|rb|php|sql|html|css|ipynb)$/i
const SOLO_OPUS_STRUMENTI = /gemini|higgsfield|blender|canva|figma|clipwave|animatedwebs|__wan__/i
const SOLO_OPUS_SKILL = /higgsfield|remotion|wan-cli|image-gen|canva|banner|design/i
const SOLO_OPUS_BASH = /higgsfield|ffmpeg|gemini|\bwan\b/i

type Risposta = { testo: string; modello: Modello; rifiutatoDa: Modello[] } | { errore: string }

let nomeStrumento = ''
const compiti: Record<Modello, number> = { haiku: 0, sonnet: 0, opus: 0 }
let token = 0
let auto = true
let ultimaScelta: Modello | undefined
let turnoCorrente: string | undefined
const sceltaTurno = new Map<string, Promise<Modello>>()

function richiedeOpus(e: { tool: string }): boolean {
  if (SOLO_OPUS_STRUMENTI.test(e.tool)) return true
  const input = e as unknown as { skill?: string; command?: string; file_path?: string; notebook_path?: string }
  if (e.tool === 'Edit' || e.tool === 'Write' || e.tool === 'NotebookEdit') {
    return FILE_CODICE.test(input.file_path ?? input.notebook_path ?? '')
  }
  if (e.tool === 'Skill') return SOLO_OPUS_SKILL.test(input.skill ?? '')
  if (e.tool === 'Bash' || e.tool === 'PowerShell') return SOLO_OPUS_BASH.test(input.command ?? '')
  return false
}

function aggiornaStato($: EngineInterface) {
  const parti = MODELLI.filter(m => compiti[m] > 0).map(m => `${NOMI[m]} ${compiti[m]}`)
  if (auto && ultimaScelta) parti.unshift(`auto: ${NOMI[ultimaScelta]}`)
  $.ui.status(
    parti.length === 0
      ? undefined
      : `🧭 ${parti.join(' · ')}` + (token > 0 ? ` · ${token.toLocaleString('it-IT')} token` : ''),
  )
}

async function scegliTurno($: EngineInterface, richiesta: string): Promise<Modello> {
  const messaggi = await $.session.messages()
  const precedente = Array.isArray(messaggi)
    ? [...messaggi].reverse().find(m => m.role === 'assistant' && m.text.trim())?.text ?? ''
    : ''
  // Una risposta breve ("sì, procedi") eredita il tema dell'ultima risposta.
  if (SOLO_OPUS_TESTO.test(richiesta) || (richiesta.length < 80 && SOLO_OPUS_TESTO.test(precedente))) {
    ultimaScelta = 'opus'
    aggiornaStato($)
    return 'opus'
  }
  const prompt =
    (precedente ? `<ultima_risposta>\n${precedente.slice(-1500)}\n</ultima_risposta>\n\n` : '') +
    `<richiesta>\n${richiesta.slice(0, 4000)}\n</richiesta>`
  const r = await $.model.complete({ model: 'haiku', system: CLASSIFICA_TURNO, prompt, maxTokens: 10 })
  token += r.usage.input_tokens + r.usage.output_tokens
  const scelta = (r.isAnswered && comeModello(r.text)) || 'opus'
  ultimaScelta = scelta
  aggiornaStato($)
  return scelta
}

function comeModello(valore: unknown): Modello | undefined {
  const v = String(valore ?? '').trim().toLowerCase()
  return MODELLI.find(m => v.startsWith(m))
}

async function chiedi($: EngineInterface, modello: Modello, compito: string, testo?: string): Promise<Risposta> {
  const prompt = testo ? `${compito}\n\n<testo>\n${testo}\n</testo>` : compito
  const rifiutatoDa: Modello[] = []
  for (const m of MODELLI.slice(MODELLI.indexOf(modello))) {
    const r = await $.model.complete({ model: m, system: SISTEMA[m], prompt, maxTokens: MAX_TOKEN[m] })
    compiti[m] += 1
    token += r.usage.input_tokens + r.usage.output_tokens
    aggiornaStato($)
    if (!r.isAnswered) {
      const dettaglio = r.reason === 'api-error' ? ` (${r.error}, HTTP ${r.status})` : ''
      return { errore: `${NOMI[m]} non ha risposto: ${r.reason}${dettaglio}.` }
    }
    if (m !== 'opus' && r.text.trim().startsWith(RIFIUTO)) {
      rifiutatoDa.push(m)
      continue
    }
    return { testo: r.text, modello: m, rifiutatoDa }
  }
  return { errore: 'Nessun modello ha accettato il compito.' }
}

async function scegli($: EngineInterface, compito: string): Promise<Modello> {
  const r = await $.model.complete({ model: 'haiku', system: CLASSIFICA, prompt: compito, maxTokens: 10 })
  compiti.haiku += 1
  token += r.usage.input_tokens + r.usage.output_tokens
  return (r.isAnswered && comeModello(r.text)) || 'sonnet'
}

function intestazione(r: { modello: Modello; rifiutatoDa: Modello[] }): string {
  const rifiuti = r.rifiutatoDa.map(m => NOMI[m]).join(' e ')
  return `[Risposto da ${NOMI[r.modello]}${rifiuti ? `, dopo il rifiuto di ${rifiuti}` : ''}]`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const { tool } = await $.tool.register({
      name: 'delega',
      description: DESCRIZIONE,
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          modello: { type: 'string', enum: MODELLI, description: 'Il modello scelto per la tipologia del compito.' },
          compito: { type: 'string', description: 'Cosa fare, in modo preciso (es. "Traduci in inglese").' },
          testo: { type: 'string', description: 'Il materiale su cui lavorare, incollato per intero.' },
        },
        required: ['modello', 'compito'],
      },
    })
    nomeStrumento = tool
    await $.command.register({
      name: 'delega',
      description: 'Sceglie da sé il modello adatto e gli fa svolgere il compito: /delega <compito e testo>',
    })
    await $.command.register({
      name: 'haiku',
      description: 'Fa svolgere a Haiku un compito leggero: /haiku <compito e testo>',
    })
    await $.command.register({
      name: 'auto',
      description: 'Attiva o disattiva la scelta automatica del modello a ogni richiesta: /auto [on|off]',
    })
    auto = (await $.store.get('auto')) !== false
    aggiornaStato($)
    return next(e)
  })

  // Scelta automatica: a ogni richiesta dell'utente Haiku decide il modello del turno.
  on('turn.start', ($, e, next) => {
    const testo = e.text.trim()
    if (e.agentId === undefined) turnoCorrente = e.turnId
    if (auto && e.agentId === undefined && testo && !testo.startsWith('/')) {
      sceltaTurno.set(e.turnId, scegliTurno($, testo).catch(() => 'opus' as const))
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const scelta = e.agentId === undefined ? await sceltaTurno.get(e.turnId) : undefined
    return yield* next(scelta && scelta !== 'opus' ? { ...e, model: scelta } : e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) sceltaTurno.delete(e.turnId)
    return next(e)
  })

  on('command.run', { command: 'auto' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    auto = arg === 'on' ? true : arg === 'off' ? false : !auto
    await $.store.set('auto', auto)
    if (!auto) ultimaScelta = undefined
    aggiornaStato($)
    return {
      text: auto
        ? 'Scelta automatica del modello attiva: Haiku valuta ogni richiesta e la assegna a Haiku, Sonnet o Opus.'
        : 'Scelta automatica disattivata: ogni richiesta usa il modello della sessione.',
    }
  })

  on('tool.call', async ($, e, next) => {
    // Se un turno affidato a Haiku o Sonnet arriva a un servizio media o scrive codice, il resto del turno passa a Opus.
    if (turnoCorrente && sceltaTurno.has(turnoCorrente) && richiedeOpus(e)) {
      sceltaTurno.set(turnoCorrente, Promise.resolve('opus'))
      ultimaScelta = 'opus'
      aggiornaStato($)
    }
    // `chiedi_haiku` è il nome della prima versione, ancora registrato nelle sessioni già aperte.
    const vecchio = e.tool.endsWith('__chiedi_haiku')
    if (e.tool === nomeStrumento || vecchio) {
      const input = e as unknown as { modello?: string; compito?: string; testo?: string }
      if (!input.compito) return { deny: 'Manca il campo "compito".' }
      const modello = vecchio ? 'haiku' : comeModello(input.modello)
      if (!modello) return { deny: `"modello" deve essere ${MODELLI.join(', ')}.` }
      const r = await chiedi($, modello, input.compito, input.testo)
      return 'testo' in r
        ? { result: `${intestazione(r)}\n${r.testo}` }
        : { deny: `${r.errore} Svolgi tu il compito.` }
    }
    if (e.tool === 'Agent') {
      const input = e as unknown as { subagent_type?: string; model?: string }
      const risultato = await next(e)
      const modello =
        comeModello(input.model) ??
        (input.subagent_type && SUBAGENTI_HAIKU.has(input.subagent_type) ? 'haiku' : undefined)
      if (modello && risultato.deny === undefined) {
        compiti[modello] += 1
        aggiornaStato($)
      }
      return risultato
    }
    return next(e)
  }).catch(($, e, next) =>
    (e.tool === nomeStrumento || e.tool.endsWith('__chiedi_haiku')) && !next.called
      ? { deny: 'La delega non ha funzionato. Svolgi tu il compito.' }
      : next(e),
  )

  on('command.run', { command: 'delega' }, async ($, e) => {
    const compito = e.args.trim()
    if (!compito) return { text: 'Uso: /delega <compito e testo>, es. /delega scrivi una mail di sollecito gentile' }
    const r = await chiedi($, await scegli($, compito), compito)
    return { text: 'testo' in r ? `${intestazione(r)}\n${r.testo}` : r.errore }
  })

  on('command.run', { command: 'haiku' }, async ($, e) => {
    const compito = e.args.trim()
    if (!compito) return { text: 'Uso: /haiku <compito e testo>, es. /haiku traduci in inglese: Buongiorno a tutti' }
    const r = await chiedi($, 'haiku', compito)
    return { text: 'testo' in r ? `${intestazione(r)}\n${r.testo}` : r.errore }
  })
}
