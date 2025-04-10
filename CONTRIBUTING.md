# Linee Guida per Contribuire

Grazie per il tuo interesse a contribuire a X.bot! Questo documento fornisce linee guida e istruzioni per partecipare al progetto.

## Come Posso Contribuire?

### Segnalare Bug

I bug sono tracciati come [issues su GitHub](https://github.com/cl1nt0n/xbot/issues). Prima di creare una segnalazione di bug, verifica se il problema è già stato segnalato. Quando crei una segnalazione di bug, segui il modello fornito e includi:

- Un titolo chiaro e descrittivo
- Passaggi dettagliati per riprodurre il problema
- Comportamento atteso vs. comportamento osservato
- Screenshot se applicabili
- Informazioni di sistema (OS, browser, versione di X.bot)

### Suggerire Miglioramenti

I miglioramenti vengono tracciati come [issues su GitHub](https://github.com/cl1nt0n/xbot/issues). Prima di creare un suggerimento, verifica se il miglioramento è già stato proposto. Quando suggerisci un miglioramento, includi:

- Un titolo chiaro e descrittivo
- Una descrizione dettagliata del miglioramento proposto
- Spiegazione dei benefici
- Possibile implementazione se ne hai una in mente

### Pull Request

1. Forka il repository
2. Crea un branch dal `main`
3. Implementa i tuoi cambiamenti
4. Assicurati che il codice segua le linee guida di stile
5. Aggiungi test che verificano il tuo codice
6. Aggiorna la documentazione se necessario
7. Crea la pull request

## Setup dell'Ambiente di Sviluppo

1. Clona il repository
   ```
   git clone https://github.com/your-username/xbot.git
   cd xbot
   ```

2. Installa le dipendenze
   ```
   npm install
   ```

3. Configura l'ambiente di sviluppo
   ```
   npm run setup-dev
   ```

4. Esegui i test
   ```
   npm test
   ```

## Linee Guida per lo Stile del Codice

### JavaScript/TypeScript

- Usa TypeScript dove possibile
- Segui le regole ESLint configurate nel progetto
- Usa camelCase per variabili e funzioni, PascalCase per classi e interfacce
- Scrivi commenti per codice complesso o non intuitivo

### CSS/SCSS

- Segui la metodologia BEM per la nomenclatura delle classi
- Organizza il CSS in componenti modulari
- Evita selettori ID per lo styling

### Test

- Scrivi test unitari per la logica di business
- Scrivi test d'integrazione per le interazioni tra componenti
- Mantieni una copertura di test alta

## Processo di Revisione del Codice

Ogni pull request verrà revisionata da almeno un maintainer del progetto. Durante la revisione:

- Controlla la qualità del codice
- Verifica che i test passino
- Assicura che la documentazione sia aggiornata
- Valuta se il cambiamento è allineato con gli obiettivi del progetto

## Community

Seguiamo il [Codice di Condotta](CODE_OF_CONDUCT.md). Partecipando, ti aspettiamo che lo rispetti.

## Domande?

Se hai domande sul come contribuire, sentiti libero di aprire un'issue con la tua domanda o contattare direttamente i maintainer.

Grazie per contribuire a X.bot!