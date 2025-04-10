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

## Documentazione

Per ulteriori informazioni sull'architettura e l'implementazione, consulta i documenti nella cartella `docs/`.

## Licenza

MIT