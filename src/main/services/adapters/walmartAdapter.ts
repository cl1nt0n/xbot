import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('WalmartAdapter');

// Selettori CSS per elementi Walmart
const SELECTORS = {
  PRODUCT_TITLE: '[data-automation-id="product-title"]',
  ADD_TO_CART_BUTTON: '[data-automation-id="add-to-cart-button"]',
  OUT_OF_STOCK: '[data-automation-id="out-of-stock-message"]',
  CAPTCHA: '[data-automation-id="captcha-container"]',
  SIZE_OPTIONS: '[data-automation-id="variant-attribute-selector-group-size"] button',
  COLOR_OPTIONS: '[data-automation-id="variant-attribute-selector-group-color"] button',
  CHECKOUT_BUTTON: '[data-automation-id="proceed-to-checkout-button"]',
  CONTINUE_WITHOUT_ACCOUNT: '[data-automation-id="guest-checkout-button"]',
  SHIPPING_ADDRESS_FORM: '[data-automation-id="shipping-address-form"]',
  DELIVERY_OPTION: '[data-automation-id="delivery-type-option"]',
  CONTINUE_TO_PAYMENT: '[data-automation-id="continue-to-payment-button"]',
  PAYMENT_SECTION: '[data-automation-id="payment-section"]',
  CREDIT_CARD_NUMBER: '[data-automation-id="cc-number-input"]',
  CREDIT_CARD_EXPIRY: '[data-automation-id="cc-expiry-input"]',
  CREDIT_CARD_CVV: '[data-automation-id="cc-cvv-input"]',
  PLACE_ORDER_BUTTON: '[data-automation-id="place-order-button"]',
  ORDER_CONFIRMATION: '[data-automation-id="order-confirmation-number"]'
};

export class WalmartAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;

  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    logger.info(`Walmart adapter initialized for ${task.productUrl || task.productId}`);
  }

  /**
   * Carica la pagina del prodotto
   */
  async loadProductPage(): Promise<boolean> {
    try {
      // Determina l'URL da caricare
      let productUrl = this.task.productUrl;
      if (!productUrl && this.task.productId) {
        productUrl = `https://www.walmart.com/ip/${this.task.productId}`;
      }

      if (!productUrl) {
        logger.error('Nessun URL o ID prodotto fornito');
        return false;
      }

      logger.info(`Caricamento pagina prodotto: ${productUrl}`);
      await this.page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Verifica CAPTCHA
      const hasCaptcha = await this.page.$(SELECTORS.CAPTCHA) !== null;
      if (hasCaptcha) {
        logger.warn('Rilevato CAPTCHA nella pagina del prodotto');
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
   * Controlla se il prodotto è disponibile
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Verifica se il prodotto è esaurito
      const outOfStockElement = await this.page.$(SELECTORS.OUT_OF_STOCK);
      if (outOfStockElement) {
        const message = await this.page.evaluate(el => el.textContent, outOfStockElement);
        logger.info(`Prodotto non disponibile: ${message}`);
        return false;
      }

      // Verifica se il pulsante "Aggiungi al carrello" è presente
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.info('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }

      const isDisabled = await this.page.evaluate(
        button => button.disabled || button.classList.contains('disabled'),
        addToCartButton
      );

      if (isDisabled) {
        logger.info('Pulsante "Aggiungi al carrello" disabilitato');
        return false;
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
            // Se richiesto di scegliere la prima disponibile
            if (this.task.options.selectFirstAvailable) {
              logger.info('Selezionando la prima taglia disponibile');
              for (const option of sizeOptions) {
                const isDisabled = await this.page.evaluate(
                  el => el.disabled || el.classList.contains('disabled'),
                  option
                );
                if (!isDisabled) {
                  const optionText = await this.page.evaluate(el => el.textContent.trim(), option);
                  logger.info(`Selezionando taglia disponibile: ${optionText}`);
                  await option.click();
                  await this.page.waitForTimeout(1000);
                  sizeSelected = true;
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
            const optionText = await this.page.evaluate(el => el.textContent.trim(), option);
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
                const optionText = await this.page.evaluate(el => el.textContent.trim(), option);
                logger.info(`Selezionando colore disponibile: ${optionText}`);
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
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.error('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }

      // Clicca sul pulsante "Aggiungi al carrello"
      await addToCartButton.click();
      
      // Attendi che il prodotto venga aggiunto al carrello (potrebbe mostrare una sovrapposizione o reindirizzare)
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        logger.info('Nessuna navigazione dopo aver aggiunto al carrello');
      });

      // Verifica che il prodotto sia stato aggiunto al carrello
      const checkoutButton = await this.page.$(SELECTORS.CHECKOUT_BUTTON);
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato dopo aver aggiunto al carrello');
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
      // Implementazione del login Walmart
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
      
      // Vai al carrello e procedi al checkout
      const checkoutButton = await this.page.$(SELECTORS.CHECKOUT_BUTTON);
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato');
        return { success: false };
      }

      await checkoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

      // Continua come ospite se non è stato effettuato il login
      const continueWithoutAccountButton = await this.page.$(SELECTORS.CONTINUE_WITHOUT_ACCOUNT);
      if (continueWithoutAccountButton) {
        logger.info('Continuando come ospite');
        await continueWithoutAccountButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      // Inserisci indirizzo di spedizione se necessario
      const shippingAddressForm = await this.page.$(SELECTORS.SHIPPING_ADDRESS_FORM);
      if (shippingAddressForm) {
        logger.info('Inserimento indirizzo di spedizione');
        // Implementazione inserimento indirizzo
      }

      // Seleziona opzione di consegna
      const deliveryOption = await this.page.$(SELECTORS.DELIVERY_OPTION);
      if (deliveryOption) {
        await deliveryOption.click();
        await this.page.waitForTimeout(1000);
      }

      // Continua alla schermata di pagamento
      const continueToPaymentButton = await this.page.$(SELECTORS.CONTINUE_TO_PAYMENT);
      if (continueToPaymentButton) {
        await continueToPaymentButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      // Inserisci dati di pagamento
      const paymentSection = await this.page.$(SELECTORS.PAYMENT_SECTION);
      if (paymentSection && this.task.paymentDetails) {
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
            `${this.task.paymentDetails.expiryMonth}${this.task.paymentDetails.expiryYear.slice(-2)}`
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
          logger.info('Test mode: non sto effettivamente completando l\'ordine');
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
      const captchaDetected = await this.page.$(SELECTORS.CAPTCHA) !== null;
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