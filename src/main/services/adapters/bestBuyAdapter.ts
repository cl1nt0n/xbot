import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('BestBuyAdapter');

// Selettori CSS per elementi BestBuy
const SELECTORS = {
  PRODUCT_TITLE: '.sku-title h1',
  ADD_TO_CART_BUTTON: '.add-to-cart-button',
  SOLD_OUT_BUTTON: '.btn-disabled',
  SIZE_OPTIONS: '.variation-option-selector',
  COLOR_OPTIONS: '.color-swatches-list button',
  PICKUP_BUTTON: '.fulfillment-add-to-cart-button',
  PRICE: '.priceView-customer-price span',
  GO_TO_CART_BUTTON: '.go-to-cart-button',
  CHECKOUT_BUTTON: '.checkout-buttons__checkout',
  CAPTCHA: 'iframe[src*="recaptcha"]',
  EMAIL_INPUT: '#fld-e',
  PASSWORD_INPUT: '#fld-p1',
  SIGN_IN_BUTTON: '.cia-form__controls__submit',
  CONTINUE_AS_GUEST: '.checkout-guest',
  PLACE_ORDER_BUTTON: '.button__fast-track',
  CREDIT_CARD_NUMBER: '#optimized-cc-card-number',
  CREDIT_CARD_EXPIRY_MONTH: '#expiration-month',
  CREDIT_CARD_EXPIRY_YEAR: '#expiration-year',
  CREDIT_CARD_CVV: '#credit-card-cvv',
  ADDRESS_FORM: '.address-form',
  SHIPPING_METHOD: '.shipping-option input',
  ORDER_CONFIRMATION: '.order-number'
};

export class BestBuyAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;

  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    logger.info(`BestBuy adapter inizializzato per ${task.productUrl || task.productId}`);
  }

  /**
   * Carica la pagina del prodotto
   */
  async loadProductPage(): Promise<boolean> {
    try {
      // Determina l'URL da caricare
      let productUrl = this.task.productUrl;
      if (!productUrl && this.task.productId) {
        productUrl = `https://www.bestbuy.com/site/-/${this.task.productId}.p`;
      }

      if (!productUrl) {
        logger.error('Nessun URL o ID prodotto fornito');
        return false;
      }

      logger.info(`Caricamento pagina prodotto: ${productUrl}`);
      await this.page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verifica captcha
      if (await this.isCaptchaPresent()) {
        logger.warn('CAPTCHA rilevato nella pagina del prodotto');
        await this.submitCaptcha();
        return false;
      }

      // Verifica che la pagina sia stata caricata correttamente
      const titleElement = await this.page.$(SELECTORS.PRODUCT_TITLE);
      if (!titleElement) {
        logger.error('Impossibile caricare la pagina del prodotto');
        return false;
      }

      const title = await this.page.evaluate(el => el.textContent, titleElement);
      logger.info(`Pagina prodotto caricata: ${title}`);
      return true;
    } catch (error) {
      logger.error(`Errore durante il caricamento della pagina prodotto: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se è presente un CAPTCHA
   */
  private async isCaptchaPresent(): Promise<boolean> {
    try {
      const captchaFrame = await this.page.$(SELECTORS.CAPTCHA);
      return captchaFrame !== null;
    } catch (error) {
      logger.error(`Errore durante il controllo del CAPTCHA: ${error.message}`);
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

      // Cerca il pulsante "Aggiungi al carrello"
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      const pickupButton = await this.page.$(SELECTORS.PICKUP_BUTTON);
      
      // Verifica se il pulsante è presente e non è disabilitato
      if (addToCartButton) {
        const buttonText = await this.page.evaluate(el => el.textContent.trim(), addToCartButton);
        const isDisabled = await this.page.evaluate(
          btn => btn.disabled || btn.classList.contains('btn-disabled'),
          addToCartButton
        );
        
        if (!isDisabled && !buttonText.toLowerCase().includes('sold out')) {
          logger.info('Prodotto disponibile: pulsante "Aggiungi al carrello" attivo');
          return true;
        }
      }

      // Verifica se il pulsante pickup è disponibile
      if (pickupButton) {
        const buttonText = await this.page.evaluate(el => el.textContent.trim(), pickupButton);
        const isDisabled = await this.page.evaluate(
          btn => btn.disabled || btn.classList.contains('btn-disabled'),
          pickupButton
        );
        
        if (!isDisabled && !buttonText.toLowerCase().includes('sold out')) {
          logger.info('Prodotto disponibile per il ritiro in negozio');
          return true;
        }
      }

      // Verifica se è presente il pulsante disabilitato "Sold Out"
      const soldOutButton = await this.page.$(SELECTORS.SOLD_OUT_BUTTON);
      if (soldOutButton) {
        logger.info('Prodotto non disponibile: pulsante "Sold Out" presente');
        return false;
      }

      logger.info('Prodotto non disponibile');
      return false;
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
      
      // Seleziona taglia se specificata e disponibile
      if (this.task.options?.size) {
        const sizeOptions = await this.page.$$(SELECTORS.SIZE_OPTIONS);
        if (sizeOptions.length > 0) {
          let sizeSelected = false;
          
          for (const option of sizeOptions) {
            const optionText = await this.page.evaluate(el => el.textContent.trim(), option);
            if (optionText.toLowerCase().includes(this.task.options.size.toLowerCase())) {
              logger.info(`Selezionando taglia: ${optionText}`);
              await option.click();
              await this.page.waitForTimeout(1000);
              sizeSelected = true;
              break;
            }
          }

          if (!sizeSelected) {
            logger.warn(`Taglia ${this.task.options.size} non trovata`);
            if (this.task.options.selectFirstAvailable) {
              logger.info('Selezionando la prima taglia disponibile');
              for (const option of sizeOptions) {
                const isDisabled = await this.page.evaluate(
                  el => el.disabled || el.classList.contains('disabled'),
                  option
                );
                
                if (!isDisabled) {
                  await option.click();
                  await this.page.waitForTimeout(1000);
                  break;
                }
              }
            }
          }
        }
      }

      // Seleziona colore se specificato e disponibile
      if (this.task.options?.color) {
        const colorOptions = await this.page.$$(SELECTORS.COLOR_OPTIONS);
        if (colorOptions.length > 0) {
          let colorSelected = false;
          
          for (const option of colorOptions) {
            const optionText = await this.page.evaluate(el => {
              // Tenta di ottenere il colore dall'attributo aria-label o dal contenuto
              return el.getAttribute('aria-label') || el.textContent.trim();
            }, option);
            
            if (optionText.toLowerCase().includes(this.task.options.color.toLowerCase())) {
              logger.info(`Selezionando colore: ${optionText}`);
              await option.click();
              await this.page.waitForTimeout(1000);
              colorSelected = true;
              break;
            }
          }

          if (!colorSelected && this.task.options.selectFirstAvailable) {
            logger.info('Selezionando il primo colore disponibile');
            for (const option of colorOptions) {
              const isDisabled = await this.page.evaluate(
                el => el.disabled || el.classList.contains('disabled'),
                option
              );
              
              if (!isDisabled) {
                await option.click();
                await this.page.waitForTimeout(1000);
                break;
              }
            }
          }
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
        
        // Prova con il pulsante di pickup come alternativa
        const pickupButton = await this.page.$(SELECTORS.PICKUP_BUTTON);
        if (pickupButton) {
          logger.info('Utilizzando il pulsante di pickup come alternativa');
          await pickupButton.click();
        } else {
          return false;
        }
      } else {
        // Clicca sul pulsante "Aggiungi al carrello"
        await addToCartButton.click();
      }
      
      // Attendi che il prodotto venga aggiunto al carrello
      await this.page.waitForTimeout(2000);
      
      // Gestisci eventuali popup dopo l'aggiunta al carrello
      const goToCartButton = await this.page.$(SELECTORS.GO_TO_CART_BUTTON);
      if (goToCartButton) {
        await goToCartButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
          logger.info('Timeout durante la navigazione al carrello');
        });
      }
      
      // Verifica che il prodotto sia stato aggiunto al carrello
      await this.page.goto('https://www.bestbuy.com/cart', { waitUntil: 'networkidle0', timeout: 10000 });
      
      const checkoutButton = await this.page.$(SELECTORS.CHECKOUT_BUTTON);
      if (!checkoutButton) {
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
   * Effettua il login
   */
  async login(): Promise<boolean> {
    if (!this.task.loginDetails?.username || !this.task.loginDetails?.password) {
      logger.info('Credenziali non fornite, continuando come ospite');
      return false;
    }

    try {
      logger.info(`Tentativo di login con username: ${this.task.loginDetails.username}`);
      
      // Verifica se siamo nella pagina di login
      const emailInput = await this.page.$(SELECTORS.EMAIL_INPUT);
      if (!emailInput) {
        logger.warn('Campo email non trovato, possibile che siamo già loggati o in una pagina diversa');
        return true;
      }
      
      // Inserisci email
      await this.page.type(SELECTORS.EMAIL_INPUT, this.task.loginDetails.username);
      
      // Inserisci password
      await this.page.type(SELECTORS.PASSWORD_INPUT, this.task.loginDetails.password);
      
      // Clicca su "Accedi"
      await this.page.click(SELECTORS.SIGN_IN_BUTTON);
      
      // Attendi il completamento del login
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        logger.warn('Timeout durante l\'attesa del login');
      });
      
      logger.info('Login completato con successo');
      return true;
    } catch (error) {
      logger.error(`Errore durante il login: ${error.message}`);
      return false;
    }
  }

  /**
   * Completa il processo di checkout
   */
  async checkout(): Promise<{ success: boolean; orderNumber?: string }> {
    try {
      logger.info('Avvio processo di checkout');
      
      // Clicca sul pulsante di checkout
      const checkoutButton = await this.page.$(SELECTORS.CHECKOUT_BUTTON);
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato');
        return { success: false };
      }

      await checkoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Verifica se è necessario il login o se possiamo continuare come ospite
      const continueAsGuestButton = await this.page.$(SELECTORS.CONTINUE_AS_GUEST);
      if (continueAsGuestButton) {
        if (!this.task.loginDetails?.username) {
          logger.info('Continuando come ospite');
          await continueAsGuestButton.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
        } else {
          // Se abbiamo le credenziali, proviamo a fare il login
          const success = await this.login();
          if (!success) {
            logger.warn('Login fallito, continuando come ospite');
            await continueAsGuestButton.click();
            await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
          }
        }
      }

      // Compila form indirizzo se necessario
      const addressForm = await this.page.$(SELECTORS.ADDRESS_FORM);
      if (addressForm && this.task.shippingDetails) {
        logger.info('Compilazione indirizzo di spedizione');
        // Implementazione della compilazione del form
      }

      // Seleziona metodo di spedizione
      const shippingMethod = await this.page.$(SELECTORS.SHIPPING_METHOD);
      if (shippingMethod) {
        await shippingMethod.click();
        await this.page.waitForTimeout(1000);
      }

      // Continua alla pagina di pagamento
      const continueButtons = await this.page.$$('button[data-track="Checkout_Shipping_ShippingContinue_Button"]');
      if (continueButtons.length > 0) {
        await continueButtons[0].click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      // Inserisci dati di pagamento
      if (this.task.paymentDetails) {
        logger.info('Inserimento dati di pagamento');
        
        // Numero carta
        const ccNumberInput = await this.page.$(SELECTORS.CREDIT_CARD_NUMBER);
        if (ccNumberInput) {
          await ccNumberInput.type(this.task.paymentDetails.cardNumber);
        }
        
        // Data scadenza - mese
        const ccExpiryMonthInput = await this.page.$(SELECTORS.CREDIT_CARD_EXPIRY_MONTH);
        if (ccExpiryMonthInput) {
          await this.page.select(SELECTORS.CREDIT_CARD_EXPIRY_MONTH, this.task.paymentDetails.expiryMonth);
        }
        
        // Data scadenza - anno
        const ccExpiryYearInput = await this.page.$(SELECTORS.CREDIT_CARD_EXPIRY_YEAR);
        if (ccExpiryYearInput) {
          await this.page.select(SELECTORS.CREDIT_CARD_EXPIRY_YEAR, this.task.paymentDetails.expiryYear);
        }
        
        // CVV
        const cvvInput = await this.page.$(SELECTORS.CREDIT_CARD_CVV);
        if (cvvInput) {
          await cvvInput.type(this.task.paymentDetails.cvv);
        }
      }

      // Completa l'ordine
      const placeOrderButton = await this.page.$(SELECTORS.PLACE_ORDER_BUTTON);
      if (placeOrderButton) {
        logger.info('Completamento ordine');
        
        if (this.task.testMode) {
          logger.info('Test mode: non completando effettivamente l\'ordine');
          return { success: true, orderNumber: 'TEST-MODE-ORDER' };
        }
        
        await placeOrderButton.click();
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
   * Gestisce il rilevamento e la risoluzione del CAPTCHA
   */
  async submitCaptcha(): Promise<boolean> {
    try {
      const captchaDetected = await this.isCaptchaPresent();
      if (!captchaDetected) {
        return true;
      }

      logger.warn('CAPTCHA rilevato, tentativo di risoluzione');
      
      // In una implementazione reale, qui si utilizzerebbe un servizio di risoluzione CAPTCHA
      // Per questa implementazione di esempio, simuliamo un fallimento
      
      logger.error('Impossibile risolvere il CAPTCHA');
      return false;
    } catch (error) {
      logger.error(`Errore durante la gestione del CAPTCHA: ${error.message}`);
      return false;
    }
  }
}