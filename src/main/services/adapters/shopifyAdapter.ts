import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('ShopifyAdapter');

// Selettori CSS per elementi Shopify (pattern comuni trovati in molti negozi Shopify)
const SELECTORS = {
  // Selettori della pagina prodotto
  PRODUCT_TITLE: '.product__title, .product-single__title, h1.title',
  SIZE_OPTIONS: 'select[name="options[Size]"], .single-option-selector__radio[name="Size"]',
  COLOR_OPTIONS: '.swatch-element, .color-option, select[name="options[Color]"]',
  ADD_TO_CART_BUTTON: 'button[name="add"], .add-to-cart, #AddToCart',
  SOLD_OUT_BUTTON: '.sold-out, .disabled',
  PRICE: '.product__price, .product-single__price, .price--sale',
  VARIANT_SELECTOR: '.product-single__variants',
  
  // Selettori del carrello
  CART_CHECKOUT_BUTTON: '.cart__checkout, .checkout-button, button[name="checkout"]',
  VIEW_CART_BUTTON: '.view-cart, .cart__toggle-button, a[href="/cart"]',
  
  // Selettori di checkout
  CHECKOUT_EMAIL: '#checkout_email, #email',
  CHECKOUT_SHIPPING_ADDRESS_FIRST_NAME: '#checkout_shipping_address_first_name',
  CHECKOUT_SHIPPING_ADDRESS_LAST_NAME: '#checkout_shipping_address_last_name',
  CHECKOUT_SHIPPING_ADDRESS_ADDRESS1: '#checkout_shipping_address_address1',
  CHECKOUT_SHIPPING_ADDRESS_CITY: '#checkout_shipping_address_city',
  CHECKOUT_SHIPPING_ADDRESS_ZIP: '#checkout_shipping_address_zip',
  CHECKOUT_SHIPPING_ADDRESS_PHONE: '#checkout_shipping_address_phone',
  CHECKOUT_SHIPPING_ADDRESS_COUNTRY: '#checkout_shipping_address_country',
  CHECKOUT_SHIPPING_ADDRESS_PROVINCE: '#checkout_shipping_address_province',
  
  // Bottoni di navigazione checkout
  CONTINUE_TO_SHIPPING_BUTTON: '#continue_button, .step__footer__continue-btn',
  CONTINUE_TO_PAYMENT_BUTTON: '.step__footer__continue-btn, button[data-trekkie-id="continue_to_payment_method_button"]',
  
  // Selettori pagamento
  CREDIT_CARD_NUMBER: '#number, [aria-label="Credit card number"], .card-fields-iframe, [data-card-field="number"] iframe',
  CREDIT_CARD_NAME: '#name, [aria-label="Name on card"], [data-card-field="name"] iframe',
  CREDIT_CARD_EXPIRY: '#expiry, [aria-label="Expiration date (MM / YY)"], [data-card-field="expiry"] iframe',
  CREDIT_CARD_CVV: '#verification_value, [aria-label="Security code"], [data-card-field="verification_value"] iframe',
  COMPLETE_ORDER_BUTTON: '#continue_button, .step__footer__continue-btn, [data-trekkie-id="complete_order_button"]',
  
  // Conferma ordine
  ORDER_CONFIRMATION: '.os-order-number'
};

export class ShopifyAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;
  private domain: string;

  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    // Estrai il dominio dall'URL del prodotto
    this.domain = this.extractDomain();
    logger.info(`Shopify adapter inizializzato per dominio: ${this.domain}`);
  }

  /**
   * Estrae il dominio dall'URL del prodotto
   */
  private extractDomain(): string {
    if (!this.task.productUrl) {
      return 'unknown';
    }
    
    try {
      const url = new URL(this.task.productUrl);
      return url.hostname;
    } catch (error) {
      logger.error(`Errore durante l'estrazione del dominio: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Controlla se il sito è basato su Shopify
   */
  async isShopifySite(): Promise<boolean> {
    try {
      const isShopify = await this.page.evaluate(() => {
        // Verifica la presenza di indicatori Shopify
        return (
          typeof window.Shopify !== 'undefined' ||
          document.querySelector('script[src*="shopify"]') !== null ||
          document.querySelector('link[href*="shopify"]') !== null
        );
      });
      
      logger.info(`Sito identificato come ${isShopify ? 'Shopify' : 'non Shopify'}`);
      return isShopify;
    } catch (error) {
      logger.error(`Errore durante il controllo del sito Shopify: ${error.message}`);
      return false;
    }
  }

  /**
   * Carica la pagina del prodotto
   */
  async loadProductPage(): Promise<boolean> {
    try {
      if (!this.task.productUrl) {
        logger.error('URL del prodotto non fornito');
        return false;
      }

      logger.info(`Caricamento pagina prodotto: ${this.task.productUrl}`);
      await this.page.goto(this.task.productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verifica che sia un sito Shopify
      const isShopify = await this.isShopifySite();
      if (!isShopify) {
        logger.warn('Il sito non sembra essere basato su Shopify');
      }

      // Verifica che la pagina sia stata caricata correttamente
      const titleSelector = SELECTORS.PRODUCT_TITLE;
      const titleElement = await this.page.$(titleSelector);
      
      if (!titleElement) {
        logger.error(`Impossibile trovare il titolo del prodotto con il selettore: ${titleSelector}`);
        return false;
      }

      const title = await this.page.evaluate(el => el.textContent.trim(), titleElement);
      logger.info(`Pagina prodotto caricata: ${title}`);
      return true;
    } catch (error) {
      logger.error(`Errore durante il caricamento della pagina prodotto: ${error.message}`);
      return false;
    }
  }

  /**
   * Controlla se il prodotto è disponibile
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Carica la pagina del prodotto se necessario
      if (!(await this.loadProductPage())) {
        return false;
      }

      // Controlla la disponibilità
      const isAvailable = await this.page.evaluate((selectors) => {
        // Cerca il pulsante "Aggiungi al carrello"
        const addToCartButton = document.querySelector(selectors.ADD_TO_CART_BUTTON);
        if (!addToCartButton) {
          return false;
        }
        
        // Verifica che non sia disabilitato o con testo "Sold Out"
        const buttonText = addToCartButton.textContent.trim().toLowerCase();
        const isDisabled = 
          addToCartButton.disabled || 
          addToCartButton.classList.contains('disabled') ||
          addToCartButton.classList.contains('sold-out') ||
          buttonText.includes('sold out') ||
          buttonText.includes('esaurito');
        
        return !isDisabled;
      }, SELECTORS);
      
      if (isAvailable) {
        logger.info('Prodotto disponibile');
      } else {
        logger.info('Prodotto non disponibile');
      }
      
      return isAvailable;
    } catch (error) {
      logger.error(`Errore durante il controllo della disponibilità: ${error.message}`);
      return false;
    }
  }

  /**
   * Seleziona le opzioni del prodotto (taglia, colore)
   */
  async selectOptions(): Promise<boolean> {
    try {
      logger.info('Selezione opzioni prodotto');
      
      // Seleziona taglia se specificata
      if (this.task.options?.size) {
        logger.info(`Tentativo di selezionare taglia: ${this.task.options.size}`);
        
        // Prima prova con il selettore dropdown standard
        const sizeSelect = await this.page.$(SELECTORS.SIZE_OPTIONS);
        if (sizeSelect) {
          // Se è un dropdown, seleziona l'opzione
          const tag = await this.page.evaluate(el => el.tagName, sizeSelect);
          
          if (tag === 'SELECT') {
            // Ottieni tutte le opzioni
            const options = await this.page.evaluate((select, targetSize) => {
              const selectEl = select as HTMLSelectElement;
              const results = [];
              
              for (let i = 0; i < selectEl.options.length; i++) {
                const option = selectEl.options[i];
                const text = option.text.trim().toLowerCase();
                const value = option.value;
                const isTargetSize = text.includes(targetSize.toLowerCase());
                const isAvailable = !option.disabled && !text.includes('sold out');
                
                results.push({ value, text, isTargetSize, isAvailable });
              }
              
              return results;
            }, sizeSelect, this.task.options.size);
            
            // Trova l'opzione corrispondente alla taglia
            let selectedOption = options.find(o => o.isTargetSize && o.isAvailable);
            
            // Se non è stata trovata e dobbiamo selezionare la prima disponibile
            if (!selectedOption && this.task.options.selectFirstAvailable) {
              selectedOption = options.find(o => o.isAvailable);
            }
            
            if (selectedOption) {
              logger.info(`Selezionando taglia: ${selectedOption.text}`);
              await this.page.select(SELECTORS.SIZE_OPTIONS, selectedOption.value);
              await this.page.waitForTimeout(1000);
            } else {
              logger.warn('Nessuna opzione di taglia disponibile trovata');
            }
          } else {
            // Se sono radio button o altri elementi, cerca il corrispondente
            const sizeButtons = await this.page.$$('.swatch-element, .single-option-selector__radio');
            for (const button of sizeButtons) {
              const buttonText = await this.page.evaluate(el => {
                return el.getAttribute('data-value') || 
                       el.textContent.trim() || 
                       '';
              }, button);
              
              if (buttonText.toLowerCase().includes(this.task.options.size.toLowerCase())) {
                logger.info(`Selezionando taglia: ${buttonText}`);
                await button.click();
                await this.page.waitForTimeout(1000);
                break;
              }
            }
          }
        } else {
          logger.warn('Selettore taglia non trovato');
        }
      }
      
      // Seleziona colore se specificato
      if (this.task.options?.color) {
        logger.info(`Tentativo di selezionare colore: ${this.task.options.color}`);
        
        // Verifica se c'è un selettore di colore
        const colorSelect = await this.page.$(SELECTORS.COLOR_OPTIONS);
        if (colorSelect) {
          const tag = await this.page.evaluate(el => el.tagName, colorSelect);
          
          if (tag === 'SELECT') {
            // Se è un dropdown, seleziona l'opzione
            const options = await this.page.evaluate((select, targetColor) => {
              const selectEl = select as HTMLSelectElement;
              const results = [];
              
              for (let i = 0; i < selectEl.options.length; i++) {
                const option = selectEl.options[i];
                const text = option.text.trim().toLowerCase();
                const value = option.value;
                const isTargetColor = text.includes(targetColor.toLowerCase());
                const isAvailable = !option.disabled && !text.includes('sold out');
                
                results.push({ value, text, isTargetColor, isAvailable });
              }
              
              return results;
            }, colorSelect, this.task.options.color);
            
            // Trova l'opzione corrispondente al colore
            let selectedOption = options.find(o => o.isTargetColor && o.isAvailable);
            
            // Se non è stata trovata e dobbiamo selezionare la prima disponibile
            if (!selectedOption && this.task.options.selectFirstAvailable) {
              selectedOption = options.find(o => o.isAvailable);
            }
            
            if (selectedOption) {
              logger.info(`Selezionando colore: ${selectedOption.text}`);
              await this.page.select(SELECTORS.COLOR_OPTIONS, selectedOption.value);
              await this.page.waitForTimeout(1000);
            }
          } else {
            // Se sono elementi di tipo swatch, cerca il corrispondente
            const colorButtons = await this.page.$$('.swatch-element, .color-swatch');
            
            for (const button of colorButtons) {
              const buttonColor = await this.page.evaluate(el => {
                return el.getAttribute('data-value') || 
                       el.getAttribute('title') || 
                       el.textContent.trim() || 
                       '';
              }, button);
              
              if (buttonColor.toLowerCase().includes(this.task.options.color.toLowerCase())) {
                logger.info(`Selezionando colore: ${buttonColor}`);
                await button.click();
                await this.page.waitForTimeout(1000);
                break;
              }
            }
          }
        } else {
          logger.warn('Selettore colore non trovato');
        }
      }

      return true;
    } catch (error) {
      logger.error(`Errore durante la selezione delle opzioni: ${error.message}`);
      return false;
    }
  }

  /**
   * Aggiunge il prodotto al carrello
   */
  async addToCart(): Promise<boolean> {
    try {
      logger.info('Tentativo di aggiungere al carrello');
      
      // Cerca il pulsante "Aggiungi al carrello"
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.error('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }

      // Clicca sul pulsante
      await addToCartButton.click();
      logger.info('Cliccato su "Aggiungi al carrello"');
      
      // Attendi che il prodotto venga aggiunto al carrello
      // Nota: Shopify può gestire l'aggiunta al carrello in diversi modi:
      // 1. Ricaricando la pagina
      // 2. Mostrando un popup/drawer
      // 3. Rimanendo sulla stessa pagina con un messaggio di conferma
      await this.page.waitForTimeout(2000);
      
      // Prova a verificare se c'è un pulsante "Visualizza carrello" o "Checkout"
      const viewCartButton = await this.page.$(SELECTORS.VIEW_CART_BUTTON);
      const checkoutButton = await this.page.$(SELECTORS.CART_CHECKOUT_BUTTON);
      
      if (viewCartButton) {
        logger.info('Cliccando su "Visualizza carrello"');
        await viewCartButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
          logger.warn('Timeout durante la navigazione al carrello');
        });
      } else if (checkoutButton) {
        logger.info('Pulsante checkout trovato, il prodotto è stato aggiunto al carrello');
      } else {
        // Se non troviamo né un pulsante "Visualizza carrello" né un pulsante "Checkout",
        // proviamo a navigare manualmente al carrello
        logger.info('Navigazione manuale al carrello');
        await this.page.goto(`https://${this.domain}/cart`, { waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Verifica che il prodotto sia stato aggiunto al carrello
      const checkoutButtonInCart = await this.page.$(SELECTORS.CART_CHECKOUT_BUTTON);
      if (!checkoutButtonInCart) {
        logger.error('Pulsante di checkout non trovato dopo l\'aggiunta al carrello');
        return false;
      }

      logger.info('Prodotto aggiunto con successo al carrello');
      return true;
    } catch (error) {
      logger.error(`Errore durante l'aggiunta al carrello: ${error.message}`);
      return false;
    }
  }

  /**
   * Effettua il login (non sempre necessario in Shopify)
   */
  async login(): Promise<boolean> {
    // Molti negozi Shopify permettono il checkout come ospite, quindi il login non è sempre necessario
    logger.info('Login non necessario per la maggior parte dei negozi Shopify');
    return true;
  }

  /**
   * Completa il processo di checkout
   */
  async checkout(): Promise<{ success: boolean; orderNumber?: string }> {
    try {
      logger.info('Avvio processo di checkout');
      
      // Clicca sul pulsante di checkout
      const checkoutButton = await this.page.$(SELECTORS.CART_CHECKOUT_BUTTON);
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato');
        return { success: false };
      }

      await checkoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      
      // Compila il modulo email se necessario
      const emailInput = await this.page.$(SELECTORS.CHECKOUT_EMAIL);
      if (emailInput && this.task.shippingDetails?.email) {
        logger.info('Compilazione campo email');
        await this.page.type(SELECTORS.CHECKOUT_EMAIL, this.task.shippingDetails.email);
      }
      
      // Compila form indirizzo se necessario
      if (this.task.shippingDetails) {
        const firstNameInput = await this.page.$(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_FIRST_NAME);
        if (firstNameInput) {
          logger.info('Compilazione indirizzo di spedizione');
          
          // Nome
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_FIRST_NAME, this.task.shippingDetails.firstName || '');
          
          // Cognome
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_LAST_NAME, this.task.shippingDetails.lastName || '');
          
          // Indirizzo
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_ADDRESS1, this.task.shippingDetails.address1 || '');
          
          // Città
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_CITY, this.task.shippingDetails.city || '');
          
          // CAP
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_ZIP, this.task.shippingDetails.zip || '');
          
          // Telefono
          await this.page.type(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_PHONE, this.task.shippingDetails.phone || '');
          
          // Paese (dropdown)
          if (this.task.shippingDetails.country) {
            await this.page.select(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_COUNTRY, this.task.shippingDetails.country);
            // Attendi il caricamento delle provincie/stati
            await this.page.waitForTimeout(1000);
          }
          
          // Provincia/Stato (dropdown)
          if (this.task.shippingDetails.province) {
            const provinceSelect = await this.page.$(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_PROVINCE);
            if (provinceSelect) {
              await this.page.select(SELECTORS.CHECKOUT_SHIPPING_ADDRESS_PROVINCE, this.task.shippingDetails.province);
            }
          }
        }
      }
      
      // Continua alla spedizione
      const continueToShippingButton = await this.page.$(SELECTORS.CONTINUE_TO_SHIPPING_BUTTON);
      if (continueToShippingButton) {
        await continueToShippingButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Continua al pagamento
      const continueToPaymentButton = await this.page.$(SELECTORS.CONTINUE_TO_PAYMENT_BUTTON);
      if (continueToPaymentButton) {
        await continueToPaymentButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Shopify spesso usa iframes per i campi delle carte di credito
      // Questo rende più complesso l'inserimento dei dati
      if (this.task.paymentDetails) {
        logger.info('Tentativo di inserire dati di pagamento');
        
        // Shopify spesso utilizza iframes per i campi di pagamento
        // Dobbiamo gestire questo caso speciale
        try {
          // Numero carta (in iframe)
          const cardNumberFrameSelector = '[data-card-field="number"] iframe';
          const cardNumberFrame = await this.page.$(cardNumberFrameSelector);
          
          if (cardNumberFrame) {
            logger.info('Inserimento dati carta in iframes');
            
            // Ottieni tutti gli iframes della carta
            const frames = await this.page.frames();
            
            // Funzione di supporto per inserire dati in un iframe
            const fillCardField = async (frameNameContains, value) => {
              for (const frame of frames) {
                const url = frame.url().toLowerCase();
                if (url.includes('shopify') && url.includes('card-fields')) {
                  const name = await frame.evaluate(() => {
                    const input = document.querySelector('input');
                    return input ? input.getAttribute('data-card-field') || input.getAttribute('aria-label') : null;
                  });
                  
                  if (name && name.toLowerCase().includes(frameNameContains.toLowerCase())) {
                    await frame.evaluate((val) => {
                      const input = document.querySelector('input');
                      input.value = val;
                      // Simula eventi per attivare la validazione
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                    }, value);
                    return true;
                  }
                }
              }
              return false;
            };
            
            // Inserisci i dati della carta nei rispettivi iframes
            await fillCardField('number', this.task.paymentDetails.cardNumber);
            await fillCardField('name', this.task.paymentDetails.cardName);
            await fillCardField('expiry', `${this.task.paymentDetails.expiryMonth}/${this.task.paymentDetails.expiryYear.slice(-2)}`);
            await fillCardField('verification', this.task.paymentDetails.cvv);
          } else {
            // Fallback per i campi diretti (rari nei negozi Shopify recenti)
            logger.info('Tentativo di inserimento dati carta in campi diretti');
            
            const cardNumberInput = await this.page.$(SELECTORS.CREDIT_CARD_NUMBER);
            if (cardNumberInput) {
              await this.page.type(SELECTORS.CREDIT_CARD_NUMBER, this.task.paymentDetails.cardNumber);
              
              if (this.task.paymentDetails.cardName) {
                await this.page.type(SELECTORS.CREDIT_CARD_NAME, this.task.paymentDetails.cardName);
              }
              
              await this.page.type(
                SELECTORS.CREDIT_CARD_EXPIRY,
                `${this.task.paymentDetails.expiryMonth}/${this.task.paymentDetails.expiryYear.slice(-2)}`
              );
              
              await this.page.type(SELECTORS.CREDIT_CARD_CVV, this.task.paymentDetails.cvv);
            }
          }
        } catch (error) {
          logger.error(`Errore durante l'inserimento dei dati di pagamento: ${error.message}`);
        }
      }
      
      // Completa l'ordine
      const completeOrderButton = await this.page.$(SELECTORS.COMPLETE_ORDER_BUTTON);
      if (completeOrderButton) {
        logger.info('Completamento ordine');
        
        if (this.task.testMode) {
          logger.info('Test mode: non completando effettivamente l\'ordine');
          return { success: true, orderNumber: 'TEST-MODE-ORDER' };
        }
        
        await completeOrderButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
        
        // Estrai numero ordine
        const orderConfirmation = await this.page.$(SELECTORS.ORDER_CONFIRMATION);
        if (orderConfirmation) {
          const orderNumber = await this.page.evaluate(el => el.textContent.trim(), orderConfirmation);
          logger.info(`Ordine completato con successo: ${orderNumber}`);
          return { success: true, orderNumber };
        }
      }

      logger.warn('Checkout completato ma nessun numero d\'ordine trovato');
      return { success: true };
    } catch (error) {
      logger.error(`Errore durante il checkout: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Gestisce il rilevamento e la risoluzione del CAPTCHA (non comune in Shopify)
   */
  async submitCaptcha(): Promise<boolean> {
    logger.info('Shopify raramente utilizza CAPTCHA');
    return true;
  }
}