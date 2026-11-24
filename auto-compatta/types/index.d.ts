export type Stato = {
  /** Riempimento del contesto (%) da cui si misura la crescita. */
  base: number
  /** Crescita (punti %) che fa scattare la compattazione. */
  passo: number
  attiva: boolean
  /** Dopo una compattazione: la prossima misura diventa la nuova base. */
  daRibasare: boolean
  /** Soglia superata durante un turno: compattare al prossimo invio. */
  inAttesa: boolean
  ultimo: number
}

declare module 'claude-code' {
  interface PluginState {
    'auto-compatta': { stato: Shaped<Stato> }
  }
}
