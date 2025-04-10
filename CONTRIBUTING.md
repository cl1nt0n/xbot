# Guida alla Contribuzione

Grazie per il tuo interesse a contribuire a X.bot! Questo documento fornisce le linee guida per partecipare al progetto.

## Come Contribuire

### Segnalazione di Bug

I bug rappresentano una parte importante del miglioramento di X.bot. Per segnalare un bug:

1. Verifica che il bug non sia già stato segnalato cercando tra le issue esistenti
2. Utilizza il template di segnalazione bug fornito
3. Descrivi in modo chiaro il problema, includendo passaggi per riprodurlo
4. Fornisci dettagli sul tuo ambiente (sistema operativo, versione di X.bot, ecc.)
5. Se possibile, includi screenshot o registrazioni che dimostrino il bug

### Suggerimenti per Nuove Funzionalità

I suggerimenti per nuove funzionalità sono sempre benvenuti. Per proporre una nuova funzionalità:

1. Descrivi chiaramente la funzionalità proposta
2. Spiega perché questa funzionalità sarebbe utile per gli utenti di X.bot
3. Considera se la funzionalità può essere implementata come estensione esterna
4. Specifica se sei disposto a contribuire all'implementazione

### Pull Request

Per contribuire con codice al progetto:

1. Forka il repository
2. Crea un branch per la tua modifica (`git checkout -b feature/amazing-feature`)
3. Committi i tuoi cambiamenti (`git commit -m 'Aggiunta una funzionalità incredibile'`)
4. Pusha il branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

## Processo di Sviluppo

### Setup dell'Ambiente di Sviluppo

```bash
# Clona il repository
git clone https://github.com/cl1nt0n/xbot.git
cd xbot

# Installa le dipendenze
npm install

# Esegui in modalità sviluppo
npm run dev
```

### Standard di Codice

X.bot segue standard di codice specifici per garantire coerenza e qualità:

- Utilizziamo ESLint e Prettier per la formattazione del codice
- Seguiamo le pratiche di programmazione funzionale quando possibile
- Manteniamo una copertura di test adeguata (minimo 80%)
- Documentiamo il codice utilizzando JSDoc

### Test

Prima di inviare una pull request, assicurati che tutti i test passino:

```bash
# Esegui i test unitari
npm run test

# Esegui i test end-to-end
npm run test:e2e
```

## Revisione del Codice

Ogni contributo verrà rivisto dai maintainer del progetto. Durante la revisione:

- I revisori potrebbero richiedere modifiche
- La copertura dei test verrà valutata
- La conformità agli standard di codice verrà verificata
- La documentazione sarà controllata

## Community

### Canali di Comunicazione

- **GitHub Issues**: Per bug e richieste di funzionalità
- **Discord**: Per discussioni generali e supporto
- **Twitter**: Per annunci e aggiornamenti

### Comportamento Atteso

Tutti i contributori devono seguire il nostro [Codice di Condotta](CODE_OF_CONDUCT.md).

## Licenza

Contribuendo a X.bot, accetti che il tuo contributo sarà concesso in licenza secondo i termini del [documento di licenza](LICENSE) del progetto.