# Guida al Contributo per X.bot

Grazie per il tuo interesse a contribuire a X.bot! Questo documento fornisce le linee guida per contribuire al progetto.

## Come posso contribuire?

### Segnalando Bug

I bug sono una realtà inevitabile nello sviluppo software. Ti ringraziamo per averli segnalati! Ecco come procedere:

1. **Verifica che il bug non sia già stato segnalato** controllando le [Issues](https://github.com/cl1nt0n/xbot/issues) esistenti.
2. **Utilizza il template per i bug** quando apri una nuova issue.
3. **Fornisci informazioni dettagliate** come:
   - Passaggi per riprodurre il problema
   - Comportamento atteso vs. comportamento osservato
   - Screenshot o registrazioni quando possibile
   - Ambiente (sistema operativo, versione di X.bot, ecc.)

### Suggerendo Miglioramenti

Hai un'idea per migliorare X.bot? Siamo tutto orecchi!

1. **Verifica che il miglioramento non sia già stato suggerito** controllando le issue esistenti.
2. **Descrivi in dettaglio la tua proposta**, specificando:
   - Problema che risolve
   - Come funzionerebbe la feature
   - Perché sarebbe utile per la maggior parte degli utenti

### Pull Requests

Vuoi contribuire direttamente al codice? Ecco come procedere:

1. **Forka il repository e crea un branch** dal branch `main`.
2. **Implementa le tue modifiche** seguendo le linee guida di stile del codice.
3. **Scrivi o aggiorna i test** necessari.
4. **Verifica che tutti i test passino**.
5. **Aggiorna la documentazione** se necessario.
6. **Crea la pull request** utilizzando il template fornito.

## Processo di sviluppo

### Branching Strategy

Utilizziamo un modello di branching basato su feature:

- `main`: Versione stabile e rilasciata
- `develop`: Branch di sviluppo principale
- `feature/*`: Per nuove funzionalità
- `bugfix/*`: Per correzioni di bug
- `hotfix/*`: Per correzioni urgenti su produzione

### Stile del Codice

- **TypeScript**: Segui le best practice di TypeScript e utilizza i tipi appropriati.
- **ESLint**: Assicurati che il tuo codice passi le verifiche di ESLint.
- **Prettier**: Formatta il codice con Prettier per mantenere uno stile coerente.
- **Documentazione**: Documenta tutte le funzioni pubbliche e le classi.

### Test

- **Unit Test**: Scrivi test unitari per tutte le nuove funzionalità.
- **Integration Test**: Aggiungi test di integrazione quando necessario.
- **Coverage**: Mantieni una copertura dei test adeguata.

## Linee guida per i commit

- Utilizza messaggi di commit descrittivi che seguono il formato: `tipo(scope): descrizione`
- Tipi comuni: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Mantieni i commit atomici (un commit per ogni cambiamento logico)

## Configurazione dell'ambiente di sviluppo

1. Clona il repository
2. Installa le dipendenze: `npm install`
3. Configura le variabili d'ambiente secondo `.env.example`
4. Avvia l'applicazione in modalità sviluppo: `npm run dev`

## Risorse aggiuntive

- [Documentazione API](./docs/api.md)
- [Architettura del progetto](./docs/architecture.md)
- [Piano di implementazione](./docs/implementation-plan.md)

---

Grazie per dedicare il tuo tempo a X.bot. Ogni contributo, grande o piccolo, è molto apprezzato!