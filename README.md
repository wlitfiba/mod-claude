# mod-claude

Mod personali per Claude Code, raccolte in un unico marketplace.

| Mod | Cosa fa |
|---|---|
| `modello-leggero` | Smista i compiti al modello adatto (Haiku, Sonnet, Opus): strumento `delega`, comandi `/delega`, `/haiku`, `/auto`, scelta automatica del modello e contatore nella barra di stato. |
| `ripristino-automatico` | Al 40% della finestra di utilizzo di 5 ore salva un punto di ripristino in `.claude/punti-ripristino/`, chiude la sessione e ne apre una nuova che riparte da lì. Comando manuale `/punto-ripristino`. |
| `auto-compatta` | Compatta la conversazione ogni volta che il contesto cresce di 20 punti rispetto all'inizio della sessione. Comando `/autocompatta [stato \| on \| off \| 5-90]`. Riparte da zero dopo ogni `/clear` (anche quello del ripristino). |

## Installazione

Al prompt di una sessione nel terminale:

```
/plugin install modello-leggero --marketplace wlitfiba/mod-claude
/plugin install ripristino-automatico --marketplace wlitfiba/mod-claude
/plugin install auto-compatta --marketplace wlitfiba/mod-claude
```

Da una shell:

```
claude plugin install modello-leggero --marketplace wlitfiba/mod-claude
claude plugin install ripristino-automatico --marketplace wlitfiba/mod-claude
claude plugin install auto-compatta --marketplace wlitfiba/mod-claude
```

Nell'app desktop: clic su **+** accanto alla casella del prompt → **Plugins** → **Add marketplace** con `wlitfiba/mod-claude` → **Add plugin**.

Il repository è privato: l'installazione funziona solo per chi può leggerlo su GitHub e ha già una credenziale git per github.com sul proprio computer (chiave SSH, oppure `gh auth login` e poi `gh auth setup-git`).

## Sessioni cloud (claude.ai/code)

Per caricare le mod nelle sessioni cloud, aggiungi al file `.claude/settings.json` del repository su cui lavori:

```json
{
  "extraKnownMarketplaces": {
    "mod-claude": { "source": { "source": "github", "repo": "wlitfiba/mod-claude" } }
  },
  "enabledPlugins": {
    "modello-leggero@mod-claude": true,
    "ripristino-automatico@mod-claude": true,
    "auto-compatta@mod-claude": true
  }
}
```
