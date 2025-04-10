import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initLogger } from './utils/logger';
import { initDatabase } from './database';
import { registerTaskHandlers } from './handlers/taskHandler';
import { registerProxyHandlers } from './handlers/proxyHandler';
import { registerProfileHandlers } from './handlers/profileHandler';

// Inizializza il logger
const logger = initLogger();

// Mantieni un riferimento globale all'oggetto window per evitare
// che venga eliminato automaticamente quando l'oggetto JavaScript è garbage collected
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Crea la finestra del browser
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
  });

  // Carica l'URL principale dell'app
  if (process.env.NODE_ENV === 'development') {
    // In sviluppo, usa il webpack-dev-server
    mainWindow.loadURL('http://localhost:9000');
    // Apri gli strumenti di sviluppo
    mainWindow.webContents.openDevTools();
  } else {
    // In produzione, carica l'HTML compilato
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // Mostra la finestra quando è pronta per evitare flash bianco
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Gestisci la chiusura della finestra
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Inizializza il database
  await initDatabase();

  // Registra gli handler IPC
  registerTaskHandlers();
  registerProxyHandlers();
  registerProfileHandlers();

  logger.info('Applicazione avviata con successo');
}

// Questo metodo viene chiamato quando Electron ha finito
// di inizializzarsi ed è pronto a creare le finestre del browser.
// Alcune API possono essere utilizzate solo dopo questo evento.
app.whenReady().then(createWindow);

// Esci quando tutte le finestre sono chiuse, tranne su macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Su macOS è comune ricreare una finestra quando
  // l'icona nel dock viene cliccata e non ci sono altre finestre aperte
  if (mainWindow === null) {
    createWindow();
  }
});

// Gestione degli errori non catturati
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

// Gestione delle promesse rifiutate non gestite
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});