# X.bot

X.bot è uno strumento di automazione avanzato per semplificare gli acquisti al dettaglio su più piattaforme. Combina un'architettura cloud-native con una gestione intelligente delle attività, garantendo elevati tassi di successo e un'operazione user-friendly.

## Funzionalità principali

- Automazione dei processi di pagamento su oltre 50 siti web di e-commerce
- Monitoraggio in tempo reale dell'inventario
- Automazione del browser con bypass della protezione Shape
- Infrastruttura di rotazione proxy
- Conformità alle misure anti-bot dei rivenditori

## Architettura

X.bot adotta un'architettura ibrida suddivisa in tre livelli principali:
- **Livello Cliente**: Applicazione desktop multipiattaforma (Windows/macOS) con React/ElectronJS
- **Livello Logico**: Coordinamento delle attività tramite Redux e comunicazione IPC
- **Livello Dati**: Archiviazione crittografata dei profili utente e sincronizzazione cloud

## Requisiti

- Node.js >= 16.x
- Windows 10/11 o macOS 11+ 
- 4GB RAM minimo (8GB consigliati)
- Connessione internet stabile

## Installazione

```bash
# Clona il repository
git clone https://github.com/cl1nt0n/xbot.git
cd xbot

# Installa le dipendenze
yarn install

# Avvia l'applicazione in modalità sviluppo
yarn dev
```

## Struttura del Progetto

```
/
├── docs/                     # Documentazione
│   ├── INSTALLAZIONE.md      # Guida all'installazione
│   └── ARCHITTETTURA.md      # Documentazione dell'architettura
│
├── src/                      # Codice sorgente
│   ├── main/                 # Processo main di Electron
│   │   ├── index.ts          # Entry point del processo main
│   │   ├── preload.ts        # Script preload per Electron
│   │   ├── database/         # Moduli per il database
│   │   ├── handlers/         # Gestori IPC
│   │   ├── services/         # Servizi e logica di business
│   │   │   ├── adapters/     # Adapter specifici per retailer
│   │   │   ├── browserAutomation.ts  # Automazione del browser
│   │   │   ├── taskManager.ts        # Gestione delle attività
│   │   │   ├── proxyManager.ts       # Gestione dei proxy
│   │   │   └── retailerAdapter.ts    # Factory per gli adapter
│   │   └── utils/            # Utilità
│   │       ├── logger.ts     # Logging
│   │       └── crypto.ts     # Crittografia
│   │
│   └── renderer/             # Processo renderer (UI)
│       ├── index.html        # HTML template
│       ├── index.tsx         # Entry point React
│       ├── App.tsx           # Componente App principale
│       ├── components/       # Componenti React
│       │   ├── Dashboard/    # Dashboard principale
│       │   ├── Sidebar/      # Sidebar di navigazione
│       │   ├── TasksView/    # Vista per la gestione attività
│       │   └── ProxiesView/  # Vista per la gestione proxy
│       ├── store/            # Store Redux
│       │   ├── index.ts      # Configurazione store
│       │   └── slices/       # Reducer e azioni
│       └── styles/           # Fogli di stile
│           └── global.scss   # Stili globali
│
├── .gitignore                # File ignorati da Git
├── package.json              # Dipendenze e script
├── tsconfig.json             # Configurazione TypeScript
├── webpack.main.config.js    # Configurazione webpack processo main
├── webpack.renderer.config.js# Configurazione webpack renderer
├── .prettierrc               # Configurazione Prettier
└── .eslintrc.json           # Configurazione ESLint
```

## Componenti Principali

1. **Browser Automation**: Gestisce l'automazione del browser per il monitoraggio e l'acquisto dei prodotti
2. **Task Manager**: Coordina l'esecuzione delle attività di monitoraggio e checkout
3. **Proxy Manager**: Gestisce i proxy, i test di latenza e la rotazione
4. **Retailer Adapters**: Implementazioni specifiche per ogni retailer supportato
5. **Dashboard**: Interfaccia utente per monitorare e gestire le attività

## Documentazione

Per ulteriori informazioni sull'architettura e l'implementazione, consulta i documenti nella cartella `docs/`.

## Licenza

MIT