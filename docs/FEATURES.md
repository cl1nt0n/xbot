# Funzionalità di X.bot

Questo documento elenca e descrive tutte le funzionalità principali implementate in X.bot.

## 1. Automazione del Browser

L'automazione del browser è una delle funzionalità centrali di X.bot, che consente di interagire con i siti web dei rivenditori in modo automatizzato ma naturale.

- **Utilizzo di Puppeteer**: Automazione completa basata su Chrome/Chromium
- **Gestione Sessioni**: Mantenimento di sessioni persistenti tra le esecuzioni
- **Fingerprinting**: Simulazione di dispositivi reali per evitare il rilevamento anti-bot
- **Gestione Proxy**: Supporto per proxy SOCKS5, HTTP/HTTPS, e residenziali
- **Bypass Anti-Bot**: Elusione intelligente dei sistemi di protezione come Akamai, PerimeterX, e Cloudflare

## 2. Gestione delle Attività

Il Task Manager coordina tutte le attività di monitoraggio e acquisto.

- **Gestione Multi-Task**: Esecuzione simultanea di più attività
- **Monitoraggio Real-Time**: Verifica continua della disponibilità dei prodotti
- **Prioritizzazione**: Gestione delle code basata sulla priorità
- **Pianificazione**: Scheduling delle attività per date e orari specifici
- **Riprova Automatica**: Tentativi ripetuti in caso di errore o indisponibilità

## 3. Integrazione con i Rivenditori

X.bot supporta numerosi rivenditori attraverso adapter specializzati.

### Rivenditori Implementati:

- **Amazon**: Supporto completo per Amazon.com e siti internazionali
- **Walmart**: Supporto per Walmart.com e Walmart+
- **Target**: Supporto per Target.com e Circle
- **Best Buy**: Supporto per acquisti regolari e Totaltech
- **Nike**: Supporto per SNKRS e Nike.com
- **Shopify**: Supporto generico per siti basati su Shopify
- **Footlocker**: Supporto per Footlocker e sottomarchi
- **JD Sports**: Supporto completo per acquisti JD Sports
- **NVIDIA**: Supporto per acquisti su NVIDIA Store
- **LEGO**: Supporto per acquisti su LEGO.com
- **Nintendo**: Supporto per Nintendo Store
- **PlayStation**: Supporto per PlayStation Direct
- **Pokémon Center**: Supporto completo

## 4. Gestione Proxy

Il sistema di gestione proxy permette di utilizzare servizi proxy di terze parti.

- **Rotazione Automatica**: Cambio automatico di proxy in caso di ban o rallentamenti
- **Testing Latenza**: Verifica automatica della velocità e affidabilità
- **Testing ISP**: Identificazione automatica del provider
- **Gruppi di Proxy**: Organizzazione dei proxy in gruppi per diversi scopi
- **Importazione/Esportazione**: Supporto per formati standard di lista proxy

## 5. Interfaccia Utente

L'interfaccia utente è costruita per essere intuitiva e fornire informazioni dettagliate.

- **Dashboard**: Panoramica delle attività in corso e statistiche
- **Task Manager UI**: Interfaccia per la creazione e gestione delle attività
- **Proxy Manager UI**: Interfaccia per la gestione e il testing dei proxy
- **Profile Manager**: Gestione dei profili di pagamento e spedizione
- **Monitor**: Visualizzazione in tempo reale dello stato delle attività
- **Success/Failure Log**: Registro dettagliato dei successi e fallimenti
- **Statistiche**: Statistiche dettagliate su tassi di successo e performance

## 6. Sicurezza

X.bot implementa diverse misure di sicurezza per proteggere i dati degli utenti.

- **Crittografia Dati**: Crittografia AES-256 per tutti i dati sensibili
- **Autenticazione Locale**: Nessun dato sensibile viene inviato ai server
- **Protezione Informazioni di Pagamento**: Dati delle carte crittografati in locale
- **Sicurezza delle Sessioni**: Gestione sicura delle sessioni e dei cookie

## 7. Utilità e Strumenti Aggiuntivi

- **Test di Velocità Checkout**: Simulazione del processo di checkout per misurare la velocità
- **Check di Affiliazione**: Verifica automatica dell'affiliazione per determinate release
- **Esportazione CSV**: Esportazione dei dati in formato CSV per analisi esterne
- **Notifiche**: Sistema di notifiche via Webhook, Telegram, Discord e email
- **Modalità Test**: Simulazione completa senza effettuare acquisti reali

## 8. Sistema IPC

Gestione della comunicazione tra processo main e renderer in Electron.

- **Gestione Eventi**: Sistema di eventi bidirezionale tra main e renderer
- **Buffer Comandi**: Coda di comandi per garantire l'esecuzione anche in caso di disconnessioni
- **Sincronizzazione Stato**: Mantenimento della sincronizzazione dello stato tra UI e logica
- **Gestione Errori**: Recupero intelligente da errori di comunicazione