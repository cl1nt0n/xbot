# Architettura di X.bot

Questo documento descrive l'architettura e i componenti principali di X.bot, un'applicazione desktop per l'automazione degli acquisti online.

## Panoramica

X.bot è strutturato secondo un'architettura ibrida multi-livello che comprende:

1. **Livello Cliente**: Interfaccia utente desktop basata su Electron e React
2. **Livello Logico**: Gestione dello stato e della logica dell'applicazione
3. **Livello Dati**: Persistenza locale e sincronizzazione cloud

Questa architettura supporta sia le operazioni offline che quelle cloud-native, garantendo prestazioni e flessibilità.

## Componenti Principali

### Processo Main (Electron)

Il processo principale di Electron gestisce:

- Ciclo di vita dell'applicazione
- Comunicazione IPC con il renderer
- Interazione con il sistema operativo
- Gestione del database SQLite
- Servizi di background come l'automazione del browser

Le classi e i moduli principali includono:
- `BrowserAutomation`: Gestisce l'automazione del browser con Puppeteer
- `TaskManager`: Coordina l'esecuzione delle attività
- `ProxyManager`: Gestisce i proxy e la loro rotazione
- `Database`: Interfaccia per la persistenza dei dati

### Processo Renderer (React)

Il processo renderer implementa l'interfaccia utente con:

- Componenti React per la visualizzazione modulare
- Redux per la gestione centralizzata dello stato
- WebSockets per gli aggiornamenti in tempo reale
- Canvas/WebGL per visualizzazioni ad alte prestazioni

I componenti principali includono:
- `Dashboard`: Visualizza metriche e statistiche
- `TasksView`: Gestisce la creazione e il monitoraggio delle attività
- `ProxiesView`: Gestisce i proxy e il loro stato
- `ProfilesView`: Gestisce i profili utente e le informazioni di pagamento

### Comunicazione Inter-Process

La comunicazione tra il processo main e renderer avviene attraverso:

- IPC (Inter-Process Communication) di Electron
- Canali di eventi predefiniti
- Modello request/response asincrono

### Persistenza Dati

La persistenza dei dati è gestita da:

- SQLite locale per dati dell'utente, attività e risultati
- Crittografia AES-256 per i dati sensibili
- Opzionalmente, sincronizzazione cloud tramite GraphQL

## Flussi di Esecuzione

### Creazione e Avvio di un'Attività

1. L'utente crea un'attività tramite l'interfaccia
2. I dati dell'attività vengono salvati nel database locale
3. L'utente avvia l'attività dalla dashboard
4. Il `TaskManager` istanzia un oggetto `BrowserAutomation`
5. `BrowserAutomation` inizia il monitoraggio dell'inventario
6. Quando un prodotto diventa disponibile, `BrowserAutomation` procede con il checkout
7. L'interfaccia utente riceve aggiornamenti in tempo reale sullo stato

### Rotazione Proxy

1. L'utente configura un pool di proxy nell'interfaccia
2. Quando si avvia un'attività, `ProxyManager` assegna un proxy ottimale
3. Se durante l'esecuzione un proxy fallisce, viene sostituito automaticamente
4. Le metriche sulla salute dei proxy vengono aggiornate nel database

## Moduli Specifici per Retailer

X.bot supporta diversi retailer attraverso un sistema di adapter:

- Ogni retailer ha un adapter specializzato che estende la classe base `RetailerAdapter`
- Gli adapter implementano metodi come `checkAvailability()`, `addToCart()` e `checkout()`
- Le configurazioni specifiche del retailer sono memorizzate in file JSON separati
- I selettori CSS e le API endpoint vengono aggiornati automaticamente

## Sicurezza e Conformità

L'architettura implementa diverse misure di sicurezza:

- Crittografia dei dati sensibili a riposo
- Isolamento dei contesti nel renderer
- Validazione degli input
- Politiche di sicurezza dei contenuti
- Autenticazione proxy sicura

## Modularità e Estensibilità

L'architettura è progettata per essere estensibile:

- Pattern di plugin per i retailer
- Interfacce standardizzate per i servizi
- Dependency injection per facilitare i test
- Configurazioni esternalizzate

## Diagramma dell'Architettura

```
+------------------------+       +------------------------+
|                        |       |                        |
|     Processo Main      |       |    Processo Renderer   |
|                        |       |                        |
+------------------------+       +------------------------+
|                        |       |                        |
| - BrowserAutomation    |<----->| - React Components     |
| - TaskManager          |  IPC  | - Redux Store          |
| - ProxyManager         |       | - WebSocket Client     |
| - Database             |       | - Canvas/WebGL         |
|                        |       |                        |
+------------------------+       +------------------------+
         |                                 |
         |                                 |
         v                                 v
+------------------------+       +------------------------+
|                        |       |                        |
|   Storage & Network    |       |      User Input       |
|                        |       |                        |
+------------------------+       +------------------------+
|                        |       |                        |
| - SQLite Database      |       | - Dashboard Inputs     |
| - File System          |       | - Task Configuration   |
| - HTTP/WebSocket       |       | - Profile Management   |
| - Proxy Connections    |       | - Settings             |
|                        |       |                        |
+------------------------+       +------------------------+
```

## Considerazioni Tecniche

- **Prestazioni**: Operazioni pesanti come l'automazione del browser vengono eseguite in processi separati
- **Memoria**: Gestione della memoria ottimizzata per consentire l'esecuzione di multiple attività simultanee
- **Rete**: Gestione delle connessioni resiliente con retry e backoff
- **Portabilità**: Supporto cross-platform per Windows e macOS