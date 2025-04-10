import { app } from 'electron';
import puppeteer from 'puppeteer-core';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../utils/logger';
import { RetailerAdapter } from './retailerAdapter';

// Logger
const logger = getLogger();

// Opzioni di configurazione per l'automazione
interface BrowserAutomationOptions {
  task: any;
  proxy?: any;
  onUpdate?: (status: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: any) => void;
}

/**
 * Classe per l'automazione del browser
 */
export class BrowserAutomation {
  private task: any;
  private proxy?: any;
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private retailerAdapter: RetailerAdapter | null = null;
  private running: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private onUpdate?: (status: string) => void;
  private onComplete?: (result: any) => void;
  private onError?: (error: any) => void;
  
  /**
   * Crea una nuova istanza di automazione del browser
   * @param options Opzioni di configurazione
   */
  constructor(options: BrowserAutomationOptions) {
    this.task = options.task;
    this.proxy = options.proxy;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }
  
  /**
   * Avvia l'automazione del browser
   */
  async start() {
    try {
      if (this.running) {
        logger.warn(`Automazione già in esecuzione per il task: ${this.task.id}`);
        return;
      }
      
      this.running = true;
      
      // Aggiorna lo stato
      this.updateStatus('monitoring');
      
      // Avvia il browser
      await this.launchBrowser();
      
      // Inizializza l'adapter per il retailer specifico
      this.retailerAdapter = new RetailerAdapter({
        retailer: this.task.retailer,
        page: this.page!,
        task: this.task
      });
      
      // Avvia il monitoraggio
      this.startMonitoring();
      
      logger.info(`Automazione avviata per il task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante l'avvio dell'automazione per il task: ${this.task.id}`, error);
      this.running = false;
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Ferma l'automazione del browser
   */
  async stop() {
    try {
      logger.info(`Arresto automazione per il task: ${this.task.id}`);
      
      // Interrompi il monitoraggio
      this.stopMonitoring();
      
      // Chiudi il browser
      await this.closeBrowser();
      
      this.running = false;
      
      logger.info(`Automazione arrestata per il task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante l'arresto dell'automazione per il task: ${this.task.id}`, error);
      this.running = false;
      throw error;
    }
  }
  
  /**
   * Avvia il browser Puppeteer
   */
  private async launchBrowser() {
    try {
      logger.info(`Avvio browser per il task: ${this.task.id}`);
      
      // Configurazione per il browser
      const launchOptions: puppeteer.LaunchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        ignoreHTTPSErrors: true,
        defaultViewport: { width: 1920, height: 1080 }
      };
      
      // Aggiungi proxy se disponibile
      if (this.proxy) {
        const proxyUrl = `${this.proxy.address}:${this.proxy.port}`;
        const proxyArgs = [`--proxy-server=${proxyUrl}`];
        
        if (this.proxy.username && this.proxy.password) {
          // Usiamo l'estensione proxy-auth per l'autenticazione
          const extensionPath = path.join(app.getPath('userData'), 'extensions', 'proxy-auth');
          proxyArgs.push(`--load-extension=${extensionPath}`);
        }
        
        launchOptions.args = [...launchOptions.args, ...proxyArgs];
      }
      
      // Configura il percorso dell'eseguibile Chrome
      if (process.platform === 'win32') {
        launchOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (process.platform === 'darwin') {
        launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else {
        launchOptions.executablePath = '/usr/bin/google-chrome';
      }
      
      // Avvia il browser
      this.browser = await puppeteer.launch(launchOptions);
      
      // Crea una nuova pagina
      this.page = await this.browser.newPage();
      
      // Configura autenticazione proxy se necessario
      if (this.proxy && this.proxy.username && this.proxy.password) {
        await this.page.authenticate({
          username: this.proxy.username,
          password: this.proxy.password
        });
      }
      
      // Configura user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
      
      // Gestisci gli errori della pagina
      this.page.on('error', this.handleError.bind(this));
      
      logger.info(`Browser avviato per il task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante l'avvio del browser per il task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Chiude il browser
   */
  private async closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        logger.info(`Browser chiuso per il task: ${this.task.id}`);
      } catch (error) {
        logger.error(`Errore durante la chiusura del browser per il task: ${this.task.id}`, error);
      }
    }
  }
  
  /**
   * Avvia il monitoraggio del prodotto
   */
  private startMonitoring() {
    logger.info(`Avvio monitoraggio per il task: ${this.task.id}`);
    
    // Imposta l'intervallo di monitoraggio
    this.monitorInterval = setInterval(async () => {
      try {
        if (!this.running || !this.page || !this.retailerAdapter) {
          this.stopMonitoring();
          return;
        }
        
        // Esegui il monitoraggio usando l'adapter
        const isAvailable = await this.retailerAdapter.checkAvailability();
        
        if (isAvailable) {
          // Prodotto disponibile, interrompi il monitoraggio e procedi con il checkout
          this.stopMonitoring();
          await this.proceedToCheckout();
        }
      } catch (error) {
        logger.error(`Errore durante il monitoraggio per il task: ${this.task.id}`, error);
        
        // Tenta di ricaricare la pagina in caso di errore
        try {
          if (this.page) {
            await this.page.reload({ waitUntil: 'networkidle2' });
          }
        } catch (reloadError) {
          logger.error(`Errore durante il ricaricamento della pagina per il task: ${this.task.id}`, reloadError);
        }
      }
    }, this.task.monitorDelay);
  }
  
  /**
   * Interrompe il monitoraggio
   */
  private stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info(`Monitoraggio interrotto per il task: ${this.task.id}`);
    }
  }
  
  /**
   * Procede con il checkout
   */
  private async proceedToCheckout() {
    try {
      if (!this.page || !this.retailerAdapter) {
        throw new Error('Browser o adapter non inizializzati');
      }
      
      // Aggiorna lo stato
      this.updateStatus('carting');
      
      // Aggiungi al carrello
      await this.retailerAdapter.addToCart();
      
      // Aggiorna lo stato
      this.updateStatus('checkout');
      
      // Procedi al checkout
      const result = await this.retailerAdapter.checkout();
      
      // Completa l'attività
      this.completeTask(result);
    } catch (error) {
      logger.error(`Errore durante il checkout per il task: ${this.task.id}`, error);
      this.handleError(error);
    }
  }
  
  /**
   * Aggiorna lo stato dell'automazione
   * @param status Nuovo stato
   */
  private updateStatus(status: string) {
    logger.info(`Aggiornamento stato automazione per il task: ${this.task.id} a: ${status}`);
    
    if (this.onUpdate) {
      this.onUpdate(status);
    }
  }
  
  /**
   * Completa l'attività con successo
   * @param result Risultato del checkout
   */
  private completeTask(result: any) {
    logger.info(`Completamento task: ${this.task.id}`, { result });
    
    const checkoutResult = {
      id: uuidv4(),
      taskId: this.task.id,
      checkoutTime: Date.now(),
      ...result
    };
    
    // Interrompi il monitoraggio e chiudi il browser
    this.stopMonitoring();
    this.closeBrowser();
    
    this.running = false;
    
    // Chiama il callback di completamento
    if (this.onComplete) {
      this.onComplete(checkoutResult);
    }
  }
  
  /**
   * Gestisce gli errori durante l'automazione
   * @param error Errore occorso
   */
  private handleError(error: any) {
    logger.error(`Errore nell'automazione per il task: ${this.task.id}`, error);
    
    // Interrompi il monitoraggio e chiudi il browser
    this.stopMonitoring();
    this.closeBrowser();
    
    this.running = false;
    
    // Chiama il callback di errore
    if (this.onError) {
      this.onError(error);
    }
  }
}