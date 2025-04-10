import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { v4 as uuidv4 } from 'uuid';

// Logger
const logger = getLogger();

// Selettori CSS per Amazon
const SELECTORS = {
  PRODUCT_TITLE: '#productTitle',
  AVAILABILITY: '#availability',
  ADD_TO_CART_BUTTON: '#add-to-cart-button',
  BUY_NOW_BUTTON: '#buy-now-button',
  SIZE_OPTIONS: '#native_dropdown_selected_size_name',
  COLOR_OPTIONS: '#variation_color_name .a-declarative',
  PROCEED_TO_CHECKOUT: '#sc-buy-box-ptc-button',
  PLACE_ORDER: '#submitOrderButtonId',
  CAPTCHA: '#captchacharacters',
  CAPTCHA_IMAGE: 'img[src*="captcha"]',
  EMAIL_INPUT: '#ap_email',
  PASSWORD_INPUT: '#ap_password',
  SIGN_IN_SUBMIT: '#signInSubmit',
  PAYMENT_METHOD: 'input[name="ppw-instrumentRowSelection"]',
  DELIVERY_OPTION: 'input[name="shipOptionSelector"]',
};

/**
 * Adapter specifico per Amazon
 */
export class AmazonAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: any;
  
  /**
   * Crea un nuovo adapter per Amazon
   * @param page Pagina Puppeteer
   * @param task Dati del task
   */
  constructor(page: Page, task: any) {
    this.page = page;
    this.task = task;
    logger.info(`Creato adapter Amazon per task: ${this.task.id}`);
  }
  
  /**
   * Carica la pagina del prodotto
   */
  private async loadProductPage(): Promise<void> {
    try {
      let url: string;
      
      // Determina l'URL del prodotto
      if (this.task.productUrl) {
        // Usa l'URL diretto se disponibile
        url = this.task.productUrl;
      } else if (this.task.productId) {
        // Costruisci l'URL dal product ID (ASIN)
        url = `https://www.amazon.com/dp/${this.task.productId}`;
      } else {
        throw new Error('Nessun URL o product ID specificato');
      }
      
      logger.info(`Caricamento pagina prodotto Amazon: ${url}`);
      
      // Carica la pagina
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Verifica che la pagina sia caricata correttamente
      const title = await this.page.title();
      logger.info(`Pagina caricata: ${title}`);
      
      // Controlla se siamo reindirizzati a una pagina CAPTCHA
      if (await this.isCaptchaPresent()) {
        throw new Error('CAPTCHA rilevato durante il caricamento della pagina');
      }
    } catch (error) {
      logger.error(`Errore durante il caricamento della pagina Amazon per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Controlla se è presente un CAPTCHA nella pagina
   */
  private async isCaptchaPresent(): Promise<boolean> {
    try {
      return await this.page.evaluate((captchaSelector) => {
        return !!document.querySelector(captchaSelector);
      }, SELECTORS.CAPTCHA_IMAGE);
    } catch (error) {
      logger.error(`Errore durante il controllo CAPTCHA per task: ${this.task.id}`, error);
      return false;
    }
  }
  
  /**
   * Controlla la disponibilità del prodotto
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Carica la pagina del prodotto
      await this.loadProductPage();
      
      // Controlla se il prodotto è disponibile
      const isAvailable = await this.page.evaluate((selectors) => {
        // Cerca il pulsante "Aggiungi al carrello"
        const addToCartButton = document.querySelector(selectors.ADD_TO_CART_BUTTON);
        if (addToCartButton) {
          return true;
        }
        
        // Cerca il pulsante "Acquista ora"
        const buyNowButton = document.querySelector(selectors.BUY_NOW_BUTTON);
        if (buyNowButton) {
          return true;
        }
        
        // Controlla il messaggio di disponibilità
        const availabilityElement = document.querySelector(selectors.AVAILABILITY);
        if (availabilityElement) {
          const text = availabilityElement.textContent?.toLowerCase() || '';
          return !text.includes('non disponibile') && 
                 !text.includes('currently unavailable') &&
                 !text.includes('out of stock');
        }
        
        return false;
      }, SELECTORS);
      
      if (isAvailable) {
        logger.info(`Prodotto disponibile per task: ${this.task.id}`);
      } else {
        logger.info(`Prodotto non disponibile per task: ${this.task.id}`);
      }
      
      return isAvailable;
    } catch (error) {
      logger.error(`Errore durante il controllo disponibilità per task: ${this.task.id}`, error);
      return false;
    }
  }
  
  /**
   * Seleziona le opzioni del prodotto (taglia, colore, ecc.)
   */
  async selectOptions(): Promise<void> {
    try {
      logger.info(`Selezione opzioni prodotto per task: ${this.task.id}`);
      
      // Seleziona la taglia se specificata nel task
      if (this.task.size) {
        const sizeSelector = SELECTORS.SIZE_OPTIONS;
        const hasSize = await this.page.evaluate((selector) => {
          return !!document.querySelector(selector);
        }, sizeSelector);
        
        if (hasSize) {
          logger.info(`Selezione taglia: ${this.task.size}`);
          await this.page.select(sizeSelector, this.task.size);
          // Attendi il caricamento della pagina dopo la selezione
          await this.page.waitForTimeout(1000);
        }
      }
      
      // Seleziona il colore se specificato nel task
      if (this.task.color) {
        const colorOptions = await this.page.$$(SELECTORS.COLOR_OPTIONS);
        if (colorOptions.length > 0) {
          logger.info(`Selezione colore: ${this.task.color}`);
          
          const colorSelected = await this.page.evaluate((options, targetColor) => {
            for (const option of options) {
              const colorName = option.getAttribute('title') || 
                               option.textContent || '';
              if (colorName.toLowerCase().includes(targetColor.toLowerCase())) {
                (option as HTMLElement).click();
                return true;
              }
            }
            return false;
          }, colorOptions, this.task.color);
          
          if (colorSelected) {
            // Attendi il caricamento della pagina dopo la selezione
            await this.page.waitForTimeout(1000);
          } else {
            logger.warn(`Colore non trovato: ${this.task.color}`);
          }
        }
      }
      
      logger.info(`Opzioni prodotto selezionate per task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante la selezione delle opzioni per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Aggiunge il prodotto al carrello
   */
  async addToCart(): Promise<void> {
    try {
      logger.info(`Aggiunta prodotto al carrello per task: ${this.task.id}`);
      
      // Cerca il pulsante "Aggiungi al carrello"
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        throw new Error('Pulsante "Aggiungi al carrello" non trovato');
      }
      
      // Clicca il pulsante
      await addToCartButton.click();
      
      // Attendi il completamento dell'aggiunta al carrello
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => logger.warn('Timeout durante l\'attesa della navigazione'));
      
      logger.info(`Prodotto aggiunto al carrello con successo per task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante l'aggiunta al carrello per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Esegue il login su Amazon
   */
  async login(): Promise<void> {
    try {
      // Verifica se è necessario il login
      const isLoginRequired = await this.page.evaluate(() => {
        return !!document.querySelector('#nav-link-accountList') || 
               !!document.querySelector('#ap_email');
      });
      
      if (!isLoginRequired) {
        logger.info(`Login non necessario per task: ${this.task.id}`);
        return;
      }
      
      logger.info(`Esecuzione login per task: ${this.task.id}`);
      
      // Ottieni le credenziali dal database
      // Nota: In un'implementazione reale, queste dovrebbero essere recuperate dal database
      const email = 'example@email.com';
      const password = 'password123';
      
      // Inserisci email
      await this.page.type(SELECTORS.EMAIL_INPUT, email);
      await this.page.click(SELECTORS.SIGN_IN_SUBMIT);
      
      // Attendi il caricamento della pagina password
      await this.page.waitForSelector(SELECTORS.PASSWORD_INPUT, { timeout: 5000 });
      
      // Inserisci password
      await this.page.type(SELECTORS.PASSWORD_INPUT, password);
      await this.page.click(SELECTORS.SIGN_IN_SUBMIT);
      
      // Attendi il completamento del login
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => logger.warn('Timeout durante l\'attesa del login'));
      
      logger.info(`Login completato con successo per task: ${this.task.id}`);
    } catch (error) {
      logger.error(`Errore durante il login per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Esegue il checkout
   */
  async checkout(): Promise<any> {
    try {
      logger.info(`Avvio checkout per task: ${this.task.id}`);
      
      // Vai alla pagina del carrello
      await this.page.goto('https://www.amazon.com/gp/cart/view.html', 
        { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Clicca su "Procedi al checkout"
      await this.page.click(SELECTORS.PROCEED_TO_CHECKOUT);
      
      // Attendi il caricamento della pagina di checkout
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      
      // Seleziona il metodo di pagamento (se necessario)
      const hasPaymentMethod = await this.page.$(SELECTORS.PAYMENT_METHOD);
      if (hasPaymentMethod) {
        await this.page.click(SELECTORS.PAYMENT_METHOD);
      }
      
      // Seleziona l'opzione di consegna (se necessario)
      const hasDeliveryOption = await this.page.$(SELECTORS.DELIVERY_OPTION);
      if (hasDeliveryOption) {
        await this.page.click(SELECTORS.DELIVERY_OPTION);
      }
      
      // Clicca su "Effettua l'ordine"
      await this.page.click(SELECTORS.PLACE_ORDER);
      
      // Attendi il completamento dell'ordine
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      
      // Estrai le informazioni sull'ordine
      const orderInfo = await this.page.evaluate(() => {
        // Cerca il numero d'ordine nella pagina di conferma
        const orderNumberElement = document.querySelector('.order-thank-you-message');
        const orderNumber = orderNumberElement 
          ? orderNumberElement.textContent?.match(/\d+-\d+-\d+/) || null 
          : null;
        
        // Cerca il prezzo totale
        const totalElement = document.querySelector('.grand-total-price');
        const total = totalElement 
          ? parseFloat((totalElement.textContent || '').replace(/[^0-9.]/g, '')) 
          : null;
        
        return { orderNumber, total };
      });
      
      logger.info(`Checkout completato con successo per task: ${this.task.id}`, { orderInfo });
      
      return {
        id: uuidv4(),
        orderNumber: orderInfo.orderNumber,
        price: orderInfo.total,
        retailer: 'Amazon',
        checkoutTime: Date.now(),
      };
    } catch (error) {
      logger.error(`Errore durante il checkout per task: ${this.task.id}`, error);
      throw error;
    }
  }
  
  /**
   * Risolve un CAPTCHA
   */
  async submitCaptcha(): Promise<boolean> {
    try {
      const isCaptchaPresent = await this.isCaptchaPresent();
      
      if (!isCaptchaPresent) {
        return true;
      }
      
      logger.warn(`CAPTCHA rilevato per task: ${this.task.id}`);
      
      // In un'implementazione reale, qui si integrerebbe un servizio di risoluzione CAPTCHA
      // Come 2Captcha, Anti-Captcha, ecc.
      
      // Per questo esempio, simula un fallimento
      return false;
    } catch (error) {
      logger.error(`Errore durante la risoluzione del CAPTCHA per task: ${this.task.id}`, error);
      return false;
    }
  }
}