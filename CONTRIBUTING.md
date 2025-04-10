# Guida alla Contribuzione

Grazie per il tuo interesse a contribuire a X.bot! Questo documento fornisce linee guida per contribuire al progetto.

## Processo di Contribuzione

### 1. Issue

Prima di iniziare a lavorare su una nuova funzionalità o correzione:

1. Verifica che non esista già un'issue relativa al problema o alla funzionalità su cui vuoi lavorare
2. Se non esiste, apri una nuova issue che descriva:
   - Cosa vuoi realizzare
   - Perché è necessario
   - Come pensi di implementarlo

### 2. Forking e Branching

1. Fai un fork del repository sul tuo account GitHub
2. Clona il tuo fork in locale: `git clone https://github.com/TUO-USERNAME/xbot.git`
3. Aggiungi il repository upstream: `git remote add upstream https://github.com/cl1nt0n/xbot.git`
4. Crea un branch per la tua modifica:
   - Per nuove funzionalità: `git checkout -b feature/nome-funzionalita`
   - Per bugfix: `git checkout -b fix/nome-bug`
   - Per miglioramenti documentazione: `git checkout -b docs/descrizione`

### 3. Sviluppo

1. Scrivi il codice seguendo le convenzioni di stile del progetto
2. Assicurati di includere test adeguati
3. Verifica che tutti i test passino
4. Aggiungi o aggiorna la documentazione secondo necessità

### 4. Commit

1. Commit frequenti e di piccole dimensioni con messaggi chiari
2. Formatta i messaggi di commit come segue:
   ```
   tipo(ambito): descrizione breve
   
   Descrizione dettagliata se necessaria
   ```
   
   Dove `tipo` può essere:
   - `feat`: nuova funzionalità
   - `fix`: correzione bug
   - `docs`: modifiche alla documentazione
   - `style`: modifiche di formattazione
   - `refactor`: rifactoring del codice
   - `test`: aggiunta o correzione di test
   - `chore`: aggiornamenti di build, configurazioni, ecc.

### 5. Pull Request

1. Assicurati che il tuo branch sia aggiornato: `git pull upstream main`
2. Risolvi eventuali conflitti di merge
3. Invia il tuo branch: `git push origin nome-branch`
4. Vai su GitHub e crea una Pull Request verso il branch `main` del repository principale
5. Descrivi dettagliatamente le modifiche apportate
6. Collega la PR all'issue correlata usando le parole chiave (es. "Risolve #123")

## Standard di Codice

### Stile del Codice

- Rispetta il file `.eslintrc.json` e `.prettierrc` del progetto
- Esegui `npm run lint` prima di inviare il codice

### Test

- Tutti i nuovi moduli dovrebbero includere test unitari
- Mantieni la copertura dei test almeno al 70%
- Esegui `npm test` per verificare che tutti i test passino

### Documentazione

- Documenta le nuove funzionalità nel codice con commenti JSDoc
- Aggiorna la documentazione utente quando necessario
- Tieni aggiornato il README con nuove funzionalità

## Processo di Revisione

1. I maintainer del progetto rivedranno la tua PR
2. Potrebbero richiedere modifiche o chiarimenti
3. Una volta che la PR soddisfa tutti i criteri, verrà unita al branch principale

## Comportamento

Tutti i contributori devono rispettare il nostro [Codice di Condotta](CODE_OF_CONDUCT.md).

## Domande?

Se hai domande sul processo di contribuzione, puoi:
- Aprire un'issue con l'etichetta "domanda"
- Contattare i maintainer direttamente

Grazie per contribuire a X.bot!