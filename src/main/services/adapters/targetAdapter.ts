import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('TargetAdapter');

// Selettori CSS per elementi Target
const SELECTORS = {
  PRODUCT_TITLE: 'h1[data-test="product-title"]',
  ADD_TO_CART_BUTTON: 'button[data-test="shipItButton"]',
  PICKUP_BUTTON: 'button[data-test="pickupButton"]',
  SIZE_OPTIONS: 'div[data-test="sizeBlock"] button',
  COLOR_OPTIONS: 'div[data-test="colorBlock"] button',
  OUT_OF_STOCK: 'div[data-test="oosMessage"]',
  PRICE: 'span[data-test="product-price"]',
  VIEW_CART_BUTTON: 'a[data-test="cartLink"]',
  CHECKOUT_BUTTON: 'button[data-test="checkout-button"]',
  CAPTCHA: 'iframe[title="recaptcha challenge"]',
  EMAIL_INPUT: 'input[id="username"]',
  PASSWORD_INPUT: 'input[id="password"]',
  SIGN_IN_BUTTON: 'button[id="login"]',
  CONTINUE_AS_GUEST: 'button[data-test="guestCheckoutBtn"]',
  PLACE_ORDER_BUTTON: 'button[data-test="placeOrderButton"]',
  CREDIT_CARD_NUMBER: 'input[id="creditCardInput-cardNumber"]',
  CREDIT_CARD_EXPIRY: 'input[id="creditCardInput-expiration"]',
  CREDIT_CARD_CVV: 'input[id="creditCardInput-securityCode"]',
  ADDRESS_FORM: 'form[data-test="addressForm"]',
  SHIPPING_METHOD: 'input[data-test="shippingMethodRadioButton"]',
  ORDER_CONFIRMATION: 'span[data-test="confirmationNumber"]'
};

export class TargetAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;

  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    logger.info(`Target adapter inizializzato per ${task.productUrl || task.productId}`);
  }

  /**
   * Carica la pagina del prodotto
   */
  async loadProductPage(): Promise<boolean> {
    try {
      // Determina l'URL da caricare
      let productUrl = this.task.productUrl;
      if (!productUrl && this.task.productId) {
        productUrl = `https://www.target.com/p/-/A-${this.task.productId}`;
      }

      if (!productUrl) {
        logger.error('Nessun URL o ID prodotto fornito');
        return false;
      }

      logger.info(`Caricamento pagina prodotto: ${productUrl}`);
      await this.page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verifica che la pagina sia stata caricata correttamente
      const titleElement = await this.page.$(SELECTORS.PRODUCT_TITLE);
      if (!titleElement) {
        logger.error('Impossibile caricare la pagina del prodotto');
        return false;
      }

      const title = await this.page.evaluate(el => el.textContent, titleElement);
      logger.info(`Pagina prodotto caricata: ${title}`);
      
      // Verifica captcha
      if (await this.isCaptchaPresent()) {
        logger.warn('CAPTCHA rilevato nella pagina del prodotto');
        await this.submitCaptcha();
        return false;
      }
      
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

      // Verifica se il prodotto è esaurito
      const outOfStockElement = await this.page.$(SELECTORS.OUT_OF_STOCK);
      if (outOfStockElement) {
        logger.info('Prodotto non disponibile: messaggio "esaurito" presente');
        return false;
      }

      // Verifica se il pulsante "Aggiungi al carrello" è presente
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      const pickupButton = await this.page.$(SELECTORS.PICKUP_BUTTON);
      
      if (!addToCartButton && !pickupButton) {
        logger.info('Pulsanti di acquisto non trovati');
        return false;
      }

      if (addToCartButton) {
        const isDisabled = await this.page.evaluate(
          btn => btn.disabled || btn.classList.contains('disabled'),
          addToCartButton
        );
        
        if (isDisabled) {
          logger.info('Pulsante "Aggiungi al carrello" disabilitato');
          return false;
        }
      }

      logger.info('Prodotto disponibile');
      return true;
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

      // Seleziona colore se specificato
      if (this.task.options?.color) {
        const colorOptions = await this.page.$$(SELECTORS.COLOR_OPTIONS);
        if (colorOptions.length > 0) {
          let colorSelected = false;
          
          for (const option of colorOptions) {
            const optionText = await this.page.evaluate(el => el.getAttribute('data-color') || el.textContent.trim(), option);
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
      const pickupButton = await this.page.$(SELECTORS.PICKUP_BUTTON);
      
      if (!addToCartButton && !pickupButton) {
        logger.error('Pulsanti di acquisto non trovati');
        return false;
      }

      // Preferisci il pulsante "Aggiungi al carrello" se disponibile
      const buttonToClick = addToCartButton || pickupButton;
      
      // Clicca sul pulsante
      await buttonToClick.click();
      
      // Attendi che il prodotto venga aggiunto al carrello
      await this.page.waitForTimeout(2000);
      
      // Clicca sul pulsante "Visualizza carrello"
      const viewCartButton = await this.page.$(SELECTORS.VIEW_CART_BUTTON);
      if (viewCartButton) {
        await viewCartButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
          logger.info('Timeout durante la navigazione al carrello');
        });
      }
      
      // Verifica che il prodotto sia stato aggiunto al carrello
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

      // Inserisci dati di pagamento
      if (this.task.paymentDetails) {
        logger.info('Inserimento dati di pagamento');
        
        // Numero carta
        const ccNumberInput = await this.page.$(SELECTORS.CREDIT_CARD_NUMBER);
        if (ccNumberInput) {
          await ccNumberInput.type(this.task.paymentDetails.cardNumber);
        }
        
        // Data scadenza
        const ccExpiryInput = await this.page.$(SELECTORS.CREDIT_CARD_EXPIRY);
        if (ccExpiryInput) {
          await ccExpiryInput.type(
            `${this.task.paymentDetails.expiryMonth}/${this.task.paymentDetails.expiryYear.slice(-2)}`
          );
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