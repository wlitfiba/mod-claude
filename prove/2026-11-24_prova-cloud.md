# Prova cloud – caricamento delle mod (2026-11-24)

Sessione cloud Claude Code (CLI `2.1.331`), repository `wlitfiba/mod-claude` clonato in `/home/user/mod-claude`, ramo di partenza `claude/zen-euler-46vr0u` (commit `893f44a`).
`.claude/settings.json` del repository è presente e contiene `extraKnownMarketplaces.mod-claude` (sorgente github `wlitfiba/mod-claude`) ed `enabledPlugins` per le tre mod.

## Esito in breve

**Nessuna delle tre mod è caricata in questa sessione cloud.** Il marketplace `mod-claude` non risulta neppure registrato.

| Mod | Caricata | Prova |
|---|---|---|
| `modello-leggero` | **No** | Nessuno strumento `delega` / `mcp__modello-leggero__delega`; nessun comando `/delega`, `/haiku`, `/auto`; assente da `claude plugin list` |
| `ripristino-automatico` | **No** | Nessun comando `/punto-ripristino`; assente da `claude plugin list` |
| `auto-compatta` | **No** | Nessun comando `/autocompatta`; assente da `claude plugin list` |

## 1. Strumento `delega`

Non presente tra gli strumenti della sessione (né `delega` né `mcp__modello-leggero__delega`, nemmeno tra gli strumenti differiti o tra i server MCP "in connessione").

## 2. Comandi / skill

Nell'elenco skill/comandi del prompt di sistema **non** compaiono `/punto-ripristino`, `/autocompatta`, `/delega`, `/haiku`, `/auto`.
Compaiono solo skill integrate e quelle dei plugin sincronizzati da claude.ai (`animatedwebs`, `marketing`, `canva`, ...).

## 3. Output dei comandi

`claude plugin list`:

```
Synced from claude.ai:

  > animatedwebs@synced
    Version: 1.5.0
    Status: √ loaded

  > marketing@synced
    Version: 1.2.0
    Status: √ loaded

  > canva@synced
    Version: 1.0.0
    Status: √ loaded

  > clipwave-video-image-maker@synced
    Version: 1.0.3
    Status: √ loaded
```

(percorsi omessi: tutti sotto `/root/.claude/plugins/synced/...`)

`claude plugin marketplace list`:

```
Configured marketplaces:

  > anthropic-plugin-directory
    Source: Built in (Anthropic Directory)
```

Altri riscontri:

- `~/.claude/plugins/installed_plugins.json` → `{"version": 2, "plugins": {}}` (nessun plugin installato da marketplace).
- `~/.claude/plugins/known_marketplaces.json` e `~/.claude/plugins/marketplaces/` **non esistono**: il marketplace `mod-claude` dichiarato in `extraKnownMarketplaces` non è stato aggiunto/clonato.
- Non esiste `~/.claude/settings.json` utente.

## 4. Errori di caricamento

Nessun messaggio di errore specifico per `mod-claude` o per le tre mod: semplicemente non vengono considerate (né marketplace né plugin compaiono, nemmeno come "failed").
Gli unici errori di plugin visibili riguardano altri plugin sincronizzati: i loro server MCP (`animatedwebs`, `clipwave-video-image-maker`, `marketing:*`) falliscono con `ERR_PROXY_TUNNEL – 403 Forbidden (agent proxy: no rule or network setting allows this host)`, cioè host non consentiti dalla rete dell'ambiente. Non c'entrano con le mod.

## Ipotesi e prossimi passi

- In questa sessione cloud `extraKnownMarketplaces` / `enabledPlugins` del `.claude/settings.json` di progetto non hanno prodotto un'installazione automatica: l'installazione del marketplace di progetto avviene di norma dopo una conferma interattiva ("trust" della cartella / prompt di installazione), che in una sessione cloud non si presenta.
- Da provare: aggiungere il marketplace e installare le mod nello **script di setup dell'ambiente cloud**, ad es.
  `claude plugin marketplace add wlitfiba/mod-claude` e `claude plugin install modello-leggero@mod-claude` (idem per le altre due), oppure fare lo stesso a inizio sessione e riavviare.
- Nota: le mod sono hook module TypeScript (`hooks/register.ts[x]`); anche una volta installate andrà verificato che il runtime cloud le esegua.
