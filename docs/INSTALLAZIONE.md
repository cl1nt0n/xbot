# Guida all'Installazione di X.bot

Questa guida ti accompagnerà attraverso il processo di installazione e configurazione di X.bot sul tuo sistema.

## Requisiti di Sistema

Prima di iniziare, assicurati che il tuo sistema soddisfi i seguenti requisiti:

- **Sistema Operativo**: Windows 10/11 o macOS 11+
- **Node.js**: Versione 16.x o superiore
- **NPM**: Versione 8.x o superiore (incluso con Node.js)
- **Memoria**: Minimo 4GB di RAM (consigliati 8GB)
- **Google Chrome**: Versione recente installata nel percorso predefinito
- **Connessione Internet**: Stabile, per il monitoraggio e l'automazione

## Installazione da Sorgente

Se preferisci installare X.bot dal codice sorgente, segui questi passaggi:

1. **Clona il repository**:

```bash
git clone https://github.com/cl1nt0n/xbot.git
cd xbot
```

2. **Installa le dipendenze**:

```bash
# Usando NPM
npm install

# Usando Yarn (consigliato)
yarn install
```

3. **Avvia l'applicazione in modalità sviluppo**:

```bash
# Usando NPM
npm run dev

# Usando Yarn
yarn dev
```

4. **Compila l'applicazione per la distribuzione**:

```bash
# Per Windows
npm run build:win
# oppure
yarn build:win

# Per macOS
npm run build:mac
# oppure
yarn build:mac
```

I file compilati saranno disponibili nella cartella `dist/`.

## Configurazione Iniziale

Al primo avvio, X.bot ti guiderà attraverso un processo di configurazione iniziale:

1. **Accettazione Termini di Servizio**: Leggi e accetta i termini di servizio.
2. **Configurazione Proxy**: Aggiungi almeno un proxy per iniziare (opzionale ma consigliato).
3. **Profilo di Pagamento**: Configura almeno un profilo di pagamento.
4. **Impostazioni del Sistema**: Personalizza le impostazioni in base alle tue preferenze.

## Integrazione con Google Cloud Platform (Opzionale)

Per abilitare funzionalità avanzate come l'orchestrazione cloud-native:

1. Crea un account di servizio GCP con le autorizzazioni necessarie.
2. Scarica il file di chiavi JSON dell'account di servizio.
3. Rinomina il file in `gcp-key.json` e posizionalo nella cartella principale di X.bot.
4. Crea un file `.env` nella cartella principale con le seguenti variabili:

```
USE_REAL_GCP=true
GCP_PROJECT_ID=il-tuo-project-id
GCP_BUCKET_NAME=il-tuo-bucket
```

## Risoluzione dei Problemi

### L'app non si avvia

- Verifica che Node.js sia installato correttamente: `node --version`
- Assicurati che tutte le dipendenze siano state installate: `yarn install`
- Controlla i log dell'applicazione in `%APPDATA%\X.bot\logs` (Windows) o `~/Library/Application Support/X.bot/logs` (macOS)

### Errori di Connessione Proxy

- Verifica che il formato del proxy sia corretto: `ip:porta` o `ip:porta:username:password`
- Controlla che il proxy sia attivo e funzionante
- Assicurati che il proxy supporti HTTPS

### Problemi di Automazione del Browser

- Verifica che Google Chrome sia installato nel percorso predefinito
- Assicurati che il tuo antivirus non stia bloccando l'automazione del browser
- Controlla i log per errori specifici dell'automazione

## Supporto

Per ulteriore assistenza:

- Consulta la documentazione completa nella cartella `docs/`
- Apri un issue su GitHub per problemi tecnici
- Contatta il supporto tramite l'applicazione per problemi specifici dell'account