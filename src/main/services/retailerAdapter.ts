import { Page } from 'puppeteer-core';
import { getLogger } from '../utils/logger';
import { AmazonAdapter } from './adapters/amazonAdapter';
import { WalmartAdapter } from './adapters/walmartAdapter';
import { TargetAdapter } from './adapters/targetAdapter';
import { BestBuyAdapter } from './adapters/bestBuyAdapter';
import { ShopifyAdapter } from './adapters/shopifyAdapter';
import { NikeAdapter } from './adapters/nikeAdapter';

// Logger
const logger = getLogger();

// Opzioni per la creazione di un adapter
interface RetailerAdapterOptions {
  retailer: string;
  page: Page;
  task: any;
}

// Interfaccia per gli adapter specializzati
export interface RetailerSpecificAdapter {
  checkAvailability(): Promise<boolean>;
  addToCart(): Promise<void>;
  checkout(): Promise<any>;
  selectOptions?(): Promise<void>;
  login?(): Promise<void>;
  submitCaptcha?(): Promise<boolean>;
}

/**
 * Factory class per creare l'adapter appropriato per un retailer specifico
 */
export class RetailerAdapter implements RetailerSpecificAdapter {
  private adapter: RetailerSpecificAdapter;
  private retailer: string;
  private page: Page;
  private task: any;
  
  /**
   * Crea un nuovo adapter per un retailer specifico
   * @param options Opzioni di configurazione
   */
  constructor(options: RetailerAdapterOptions) {
    this.retailer = options.retailer;
    this.page = options.page;
    this.task = options.task;
    
    // Crea l'adapter appropriato in base al retailer
    this.adapter = this.createAdapter();
    
    logger.info(`Adapter creato per retailer: ${this.retailer}`);
  }
  
  /**
   * Crea l'adapter appropriato in base al retailer
   * @returns L'adapter specializzato
   */
  private createAdapter(): RetailerSpecificAdapter {
    // Normalizza il nome del retailer per il confronto case-insensitive
    const retailerNormalized = this.retailer.toLowerCase().trim();
    
    switch (retailerNormalized) {
      case 'amazon':
        return new AmazonAdapter(this.page, this.task);
      case 'walmart':
        return new WalmartAdapter(this.page, this.task);
      case 'target':
        return new TargetAdapter(this.page, this.task);
      case 'bestbuy':
      case 'best buy':
        return new BestBuyAdapter(this.page, this.task);
      case 'shopify':
        return new ShopifyAdapter(this.page, this.task);
      case 'nike':
        return new NikeAdapter(this.page, this.task);
      default:
        // Fallback: l'adapter generico basato su Shopify
        logger.warn(`Nessun adapter specifico per il retailer: ${this.retailer}, utilizzo Shopify adapter`);
        return new ShopifyAdapter(this.page, this.task);
    }
  }
  
  /**
   * Controlla la disponibilità del prodotto
   * @returns true se il prodotto è disponibile, false altrimenti
   */
  async checkAvailability(): Promise<boolean> {
    try {
      logger.info(`Controllo disponibilità prodotto per task: ${this.task.id}`);
      return await this.adapter.checkAvailability();
    } catch (error) {
      logger.error(`Errore durante il controllo disponibilità prodotto per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Aggiunge il prodotto al carrello
   */
  async addToCart(): Promise<void> {
    try {
      logger.info(`Aggiunta prodotto al carrello per task: ${this.task.id}`);
      
      // Seleziona le opzioni del prodotto se necessario
      if (this.adapter.selectOptions) {
        await this.adapter.selectOptions();
      }
      
      // Aggiungi al carrello
      await this.adapter.addToCart();
      
      logger.info(`Prodotto aggiunto al carrello con successo per task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante l'aggiunta del prodotto al carrello per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Esegue il processo di checkout
   * @returns Risultato del checkout
   */
  async checkout(): Promise<any> {
    try {
      logger.info(`Avvio checkout per task: ${this.task.id}`);
      
      // Esegui login se necessario
      if (this.adapter.login) {
        await this.adapter.login();
      }
      
      // Gestisci CAPTCHA se necessario
      if (this.adapter.submitCaptcha) {
        const captchaResolved = await this.adapter.submitCaptcha();
        if (!captchaResolved) {
          throw new Error('Impossibile risolvere il CAPTCHA');
        }
      }
      
      // Esegui il checkout
      const result = await this.adapter.checkout();
      
      logger.info(`Checkout completato con successo per task: ${this.task.id}`, { result });
      
      return result;
    } catch (error) {
      logger.error(`Errore durante il checkout per task: ${this.task.id}`, error);
      throw error;
    }
  }
}