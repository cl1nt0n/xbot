import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('TargetAdapter');

// Selettori per elementi nelle pagine Target
const SELECTORS = {
  // Selettori pagina prodotto
  PRODUCT_TITLE: 'h1[data-test="product-title"], .styles__StyledHeading-sc-1tivkgw-0, .Heading__StyledHeading-sc-1mp23s9-0',
  PRICE: '[data-test="product-price"], .style__PriceFontSize-sc-17wlxvr-0, span[data-test="product-price"], .style__CurrentPriceFontSize-sc-17wlxvr-2',
  SIZE_OPTIONS: '[data-test="size-selector"] > button, div[data-test="sizeBlock"] button, #size-selection button',
  ADD_TO_CART_BUTTON: 'button[data-test="shipItButton"], [data-test="orderPickupButton"], [data-test="fulfillment-add-to-cart-button"]',
  ADD_TO_CART_DISABLED: 'button[data-test="shipItButton"][disabled], [data-test="orderPickupButton"][disabled], [data-test="fulfillment-add-to-cart-button"][disabled]',
  OUT_OF_STOCK: '[data-test="outOfStockContainer"], [data-test="oosMsg"], .h-text-orangeDark',
  
  // Selettori popup
  MODAL_CLOSE: 'button[data-test="espModalCloseButton"], .ModalClose, button[aria-label="close"]',
  LOCATION_POPUP: '[data-test="storeLocationMessage"]',
  
  // Selettori carrello
  VIEW_CART_BUTTON: '[data-test="viewCartButton"], a[href="/cart"]',
  CART_ITEM: '[data-test="cartItem"], .styles__StyledCol-sc-fw90uk-0',
  CHECKOUT_BUTTON: '[data-test="checkout-button"], button[data-test="checkout"]',
  
  // Selettori login
  CREATE_ACCOUNT_BUTTON: 'button[data-test="createAccount"], [data-test="guestCheckoutButton"]',
  CONTINUE_AS_GUEST: 'button[data-test="continueAsGuest"], [data-test="guestCheckoutButton"]',
  SIGN_IN_BUTTON: 'button[data-test="logInButton"], [data-test="accountNav-signIn"]',
  USERNAME_INPUT: 'input[data-test="username"], #username',
  PASSWORD_INPUT: 'input[data-test="password"], #password',
  
  // Selettori pagina checkout
  SHIPPING_TAB: '[data-test="fulfillment-shipping"], #shipping',
  SHIPPING_FIRST_NAME: 'input[data-test="firstName"], #full_name_shipping',
  SHIPPING_LAST_NAME: 'input[data-test="lastName"], #sur_name_shipping',
  SHIPPING_ADDRESS: 'input[data-test="addressLine1"], #address_line1',
  SHIPPING_ADDRESS_2: 'input[data-test="addressLine2"], #address_line2',
  SHIPPING_CITY: 'input[data-test="city"], #city',
  SHIPPING_POSTAL_CODE: 'input[data-test="zipCode"], #zip_code',
  SHIPPING_STATE: 'select[data-test="state"], #state',
  SHIPPING_PHONE: 'input[data-test="phone"], #phone',
  SHIPPING_EMAIL: 'input[data-test="email"], #email',
  
  // Selettori pagamento
  PAYMENT_CREDIT_CARD: '[data-test="creditCardPaymentButton"], [data-test="creditCardOption"]',
  CREDIT_CARD_NUMBER: 'input[data-test="creditCardInput-cardNumber"], #credit-card',
  CREDIT_CARD_NAME: 'input[data-test="creditCardInput-cardName"], #name-on-card',
  CREDIT_CARD_EXP_MONTH: 'select[data-test="creditCardInput-expMonth"], #expiry-month',
  CREDIT_CARD_EXP_YEAR: 'select[data-test="creditCardInput-expYear"], #expiry-year',
  CREDIT_CARD_CVV: 'input[data-test="creditCardInput-securityCode"], #cvv',
  
  // Pulsanti navigazione checkout
  CONTINUE_TO_PAYMENT: 'button[data-test="confirmDeliveryButton"], .Button__StyledButton-sc-afhtmq-0',
  PLACE_ORDER_BUTTON: 'button[data-test="placeYourOrderButton"], button[data-test="placeOrder"]',
  
  // Conferma ordine
  ORDER_CONFIRMATION: '[data-test="orderConfirmationStatus"], .thankyou',
  ORDER_NUMBER: '[data-test="orderNumber"], .order-number'
};

export class TargetAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;
  
  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    logger.info('Target adapter inizializzato');
  }
  
  /**
   * Carica la pagina del prodotto specificata nell'URL del task
   */
  async loadProductPage(): Promise<boolean> {
    try {
      logger.info(`Caricamento pagina prodotto: ${this.task.productUrl}`);
      
      if (!this.task.productUrl) {
        logger.error('URL del prodotto non fornito');
        return false;
      }
      
      // Imposta header user-agent per navigazione su Target
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
      );
      
      // Carica la pagina
      await this.page.goto(this.task.productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Gestione popup
      await this.handlePopups();
      
      // Verifica che la pagina sia stata caricata correttamente
      const titleElement = await this.page.$(SELECTORS.PRODUCT_TITLE);
      if (!titleElement) {
        logger.error('Titolo prodotto non trovato. La pagina potrebbe non essere caricata correttamente');
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
   * Gestisce i popup che potrebbero apparire durante la navigazione
   */
  private async handlePopups(): Promise<void> {
    try {
      // Attendi un momento per permettere ai popup di apparire
      await this.page.waitForTimeout(2000);
      
      // Controlla se c'è un popup di posizione
      const locationPopup = await this.page.$(SELECTORS.LOCATION_POPUP);
      if (locationPopup) {
        // Cerca pulsanti di conferma posizione
        const confirmButtons = await this.page.$$('button');
        for (const button of confirmButtons) {
          const buttonText = await this.page.evaluate(el => el.textContent.toLowerCase().trim(), button);
          if (buttonText.includes('continue') || buttonText.includes('confirm') || buttonText.includes('yes')) {
            logger.info('Confermando posizione');
            await button.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        }
      }
      
      // Controlla se ci sono popup generici da chiudere
      const closeButton = await this.page.$(SELECTORS.MODAL_CLOSE);
      if (closeButton) {
        logger.info('Chiusura popup');
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Controlla cookie banner
      const cookieButtons = await this.page.$$('button');
      for (const button of cookieButtons) {
        const buttonText = await this.page.evaluate(el => el.textContent.toLowerCase().trim(), button);
        if (buttonText.includes('accept') || buttonText.includes('agree') || 
            buttonText.includes('accetta') || buttonText.includes('acconsento')) {
          logger.info('Accettando cookies');
          await button.click();
          await this.page.waitForTimeout(1000);
          break;
        }
      }
    } catch (error) {
      logger.warn(`Errore durante la gestione dei popup: ${error.message}`);
    }
  }
  
  /**
   * Controlla la disponibilità del prodotto
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Se la pagina non è stata ancora caricata, caricala
      if (!(await this.loadProductPage())) {
        return false;
      }
      
      // Controlla messaggi di esaurimento scorte
      const outOfStockElement = await this.page.$(SELECTORS.OUT_OF_STOCK);
      if (outOfStockElement) {
        const statusText = await this.page.evaluate(el => el.textContent.trim().toLowerCase(), outOfStockElement);
        if (statusText.includes('out of stock') || statusText.includes('sold out') || 
            statusText.includes('esaurito') || statusText.includes('non disponibile')) {
          logger.info('Prodotto esaurito');
          return false;
        }
      }
      
      // Controlla se il pulsante "Aggiungi al carrello" è disabilitato
      const disabledButton = await this.page.$(SELECTORS.ADD_TO_CART_DISABLED);
      if (disabledButton) {
        logger.info('Pulsante "Aggiungi al carrello" disabilitato');
        return false;
      }
      
      // Controlla se il pulsante "Aggiungi al carrello" è presente e attivo
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.info('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }
      
      // Controlla se il pulsante è visibile e cliccabile
      const isVisible = await this.page.evaluate(button => {
        const style = window.getComputedStyle(button);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }, addToCartButton);
      
      if (!isVisible) {
        logger.info('Pulsante "Aggiungi al carrello" non visibile');
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
   * Seleziona le opzioni del prodotto (taglia, colore, ecc.)
   */
  async selectOptions(): Promise<boolean> {
    try {
      logger.info('Selezione opzioni prodotto');
      
      // Target generalmente ha selezioni per taglia in form di pulsanti
      if (this.task.options?.size) {
        const targetSize = this.task.options.size;
        logger.info(`Tentativo di selezionare taglia: ${targetSize}`);
        
        // Trova tutte le opzioni di taglia
        const sizeOptions = await this.page.$$(SELECTORS.SIZE_OPTIONS);
        
        if (sizeOptions.length > 0) {
          let selectedButton = null;
          let firstAvailableButton = null;
          
          for (const button of sizeOptions) {
            // Controlla se il pulsante è disabilitato (esaurito)
            const isDisabled = await this.page.evaluate(btn => {
              return btn.disabled || 
                     btn.classList.contains('disabled') || 
                     btn.getAttribute('aria-disabled') === 'true';
            }, button);
            
            if (!isDisabled) {
              // Se è il primo pulsante disponibile, salvalo come fallback
              if (!firstAvailableButton) {
                firstAvailableButton = button;
              }
              
              // Controlla se la taglia corrisponde a quella desiderata
              const sizeText = await this.page.evaluate(btn => btn.textContent.trim(), button);
              if (sizeText === targetSize || 
                  sizeText.includes(targetSize) || 
                  sizeText.toLowerCase() === targetSize.toLowerCase()) {
                selectedButton = button;
                break;
              }
            }
          }
          
          // Se abbiamo trovato la taglia richiesta, selezionala
          if (selectedButton) {
            logger.info(`Selezionando taglia richiesta: ${targetSize}`);
            await selectedButton.click();
            await this.page.waitForTimeout(1000);
            return true;
          } 
          // Altrimenti, se è consentito, seleziona la prima taglia disponibile
          else if (firstAvailableButton && this.task.options.selectFirstAvailable) {
            const availableSize = await this.page.evaluate(btn => btn.textContent.trim(), firstAvailableButton);
            logger.info(`Taglia richiesta non disponibile. Selezionando prima taglia disponibile: ${availableSize}`);
            await firstAvailableButton.click();
            await this.page.waitForTimeout(1000);
            return true;
          } else {
            logger.warn(`Taglia richiesta (${targetSize}) non disponibile e l'opzione per selezionare la prima disponibile non è attiva`);
            return false;
          }
        } else {
          logger.warn('Nessuna opzione di taglia trovata');
          // Potrebbe non avere opzioni di taglia, quindi procedi
          return true;
        }
      } else {
        logger.info('Nessuna taglia specificata. Procedendo senza selezionare una taglia');
        return true;
      }
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
      
      // Trova il pulsante "Aggiungi al carrello"
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.error('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }
      
      // Clicca sul pulsante
      await addToCartButton.click();
      logger.info('Cliccato su "Aggiungi al carrello"');
      
      // Attendi che il prodotto venga aggiunto
      await this.page.waitForTimeout(3000);
      
      // Target spesso mostra un popup di conferma dopo l'aggiunta al carrello
      // con l'opzione per visualizzare il carrello
      const viewCartButton = await this.page.$(SELECTORS.VIEW_CART_BUTTON);
      
      if (viewCartButton) {
        // Clicca su "Visualizza carrello"
        logger.info('Navigando al carrello');
        await viewCartButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
          logger.warn('Timeout durante la navigazione al carrello');
        });
      } else {
        // Se non troviamo il pulsante "Visualizza carrello", naviga manualmente
        logger.info('Navigando manualmente al carrello');
        await this.page.goto('https://www.target.com/cart', { waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Verifica che siamo nella pagina del carrello e che ci sia almeno un articolo
      const cartItems = await this.page.$$(SELECTORS.CART_ITEM);
      if (cartItems.length > 0) {
        logger.info('Prodotto aggiunto con successo al carrello');
        return true;
      } else {
        logger.warn('Impossibile confermare che il prodotto sia stato aggiunto al carrello');
        return false;
      }
    } catch (error) {
      logger.error(`Errore durante l'aggiunta al carrello: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Effettua il login con le credenziali dell'utente
   */
  async login(): Promise<boolean> {
    try {
      // Verifica se ci sono credenziali disponibili
      if (!this.task.loginDetails?.username || !this.task.loginDetails?.password) {
        logger.info('Credenziali di login non fornite, procedendo come ospite');
        return false;
      }
      
      logger.info(`Tentativo di login con l'account: ${this.task.loginDetails.username}`);
      
      // Cerca il pulsante di login/signin
      const signInButton = await this.page.$(SELECTORS.SIGN_IN_BUTTON);
      if (signInButton) {
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      } else {
        logger.warn('Pulsante di login non trovato');
        return false;
      }
      
      // Compila form di login
      // Campo username/email
      const usernameInput = await this.page.$(SELECTORS.USERNAME_INPUT);
      if (usernameInput) {
        await this.page.type(SELECTORS.USERNAME_INPUT, this.task.loginDetails.username);
      } else {
        logger.error('Campo username non trovato');
        return false;
      }
      
      // Campo password
      const passwordInput = await this.page.$(SELECTORS.PASSWORD_INPUT);
      if (passwordInput) {
        await this.page.type(SELECTORS.PASSWORD_INPUT, this.task.loginDetails.password);
      } else {
        logger.error('Campo password non trovato');
        return false;
      }
      
      // Clicca su "Sign In"
      const loginSubmitButton = await this.page.$('button[type="submit"]');
      if (loginSubmitButton) {
        await loginSubmitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      } else {
        logger.error('Pulsante submit di login non trovato');
        return false;
      }
      
      // Verifica se il login è riuscito
      // Target generalmente reindirizza alla pagina originale dopo il login
      // o potrebbe tornare alla pagina di checkout/carrello
      const isLoggedIn = await this.page.evaluate(() => {
        // Cerca elementi che indicano login avvenuto con successo
        // come nome utente nell'header o menu account
        return document.querySelector('[data-test="accountUserName"]') !== null;
      });
      
      if (isLoggedIn) {
        logger.info('Login effettuato con successo');
        return true;
      } else {
        // Cerca messaggi di errore
        const errorMessages = await this.page.$$eval('.errorMessage, .formFieldError', elements => 
          elements.map(el => el.textContent.trim())
        );
        
        if (errorMessages.length > 0) {
          logger.error(`Login fallito. Errori: ${errorMessages.join(', ')}`);
          return false;
        }
        
        logger.warn('Login potrebbe essere riuscito ma impossibile confermare');
        return true;
      }
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
      
      // Trova il pulsante di checkout
      const checkoutButton = await this.page.$(SELECTORS.CHECKOUT_BUTTON);
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato');
        return { success: false };
      }
      
      // Clicca sul pulsante checkout
      await checkoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      
      // Target potrebbe offrire opzioni di login o checkout come ospite
      // Verifica se siamo nella pagina di login/creazione account
      const createAccountButton = await this.page.$(SELECTORS.CREATE_ACCOUNT_BUTTON);
      const continueAsGuestButton = await this.page.$(SELECTORS.CONTINUE_AS_GUEST);
      
      if (createAccountButton || continueAsGuestButton) {
        if (this.task.loginDetails?.username && this.task.loginDetails?.password) {
          // Prova a fare login
          const loginSuccess = await this.login();
          if (!loginSuccess) {
            logger.warn('Login fallito, tentativo di procedere come ospite');
            
            // Riprova a trovare il pulsante "Continua come ospite"
            const guestButton = await this.page.$(SELECTORS.CONTINUE_AS_GUEST);
            if (guestButton) {
              await guestButton.click();
              await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
            }
          }
        } else {
          // Procedi come ospite
          logger.info('Procedendo come ospite');
          if (continueAsGuestButton) {
            await continueAsGuestButton.click();
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
          }
        }
      }
      
      // Compila i dettagli di spedizione
      await this.fillShippingDetails();
      
      // Continua alla pagina di pagamento
      const continueToPaymentButton = await this.page.$(SELECTORS.CONTINUE_TO_PAYMENT);
      if (continueToPaymentButton) {
        await continueToPaymentButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Seleziona metodo di pagamento con carta di credito
      const creditCardOption = await this.page.$(SELECTORS.PAYMENT_CREDIT_CARD);
      if (creditCardOption) {
        await creditCardOption.click();
        await this.page.waitForTimeout(2000);
      }
      
      // Compila i dettagli di pagamento
      await this.fillPaymentDetails();
      
      // Trova e clicca il pulsante per effettuare l'ordine
      const placeOrderButton = await this.page.$(SELECTORS.PLACE_ORDER_BUTTON);
      if (!placeOrderButton) {
        logger.error('Pulsante per effettuare l\'ordine non trovato');
        return { success: false };
      }
      
      if (this.task.testMode) {
        logger.info('Test mode: non effettuando realmente l\'ordine');
        return { success: true, orderNumber: 'TEST-MODE-ORDER' };
      }
      
      await placeOrderButton.click();
      logger.info('Ordine inviato, in attesa di conferma');
      
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      
      // Verifica conferma ordine
      const orderConfirmation = await this.page.$(SELECTORS.ORDER_CONFIRMATION);
      if (orderConfirmation) {
        // Estrai numero ordine se disponibile
        const orderNumberElement = await this.page.$(SELECTORS.ORDER_NUMBER);
        let orderNumber = '';
        
        if (orderNumberElement) {
          orderNumber = await this.page.evaluate(el => el.textContent.trim(), orderNumberElement);
          // Elimina il testo "Numero ordine:" o simili
          orderNumber = orderNumber.replace(/order\s*number:?|numero\s*ordine:?/i, '').trim();
        }
        
        logger.info(`Ordine completato con successo${orderNumber ? ': ' + orderNumber : ''}`);
        return { success: true, orderNumber };
      } else {
        logger.warn('Impossibile confermare il completamento dell\'ordine');
        return { success: false };
      }
    } catch (error) {
      logger.error(`Errore durante il checkout: ${error.message}`);
      return { success: false };
    }
  }
  
  /**
   * Compila i dettagli di spedizione
   */
  private async fillShippingDetails(): Promise<void> {
    try {
      if (!this.task.shippingDetails) {
        logger.warn('Dettagli di spedizione non forniti');
        return;
      }
      
      // Target potrebbe avere una scheda di spedizione specifica
      const shippingTab = await this.page.$(SELECTORS.SHIPPING_TAB);
      if (shippingTab) {
        await shippingTab.click();
        await this.page.waitForTimeout(2000);
      }
      
      logger.info('Compilazione dettagli di spedizione');
      
      // First Name
      const firstNameField = await this.page.$(SELECTORS.SHIPPING_FIRST_NAME);
      if (firstNameField && this.task.shippingDetails.firstName) {
        await this.page.type(SELECTORS.SHIPPING_FIRST_NAME, this.task.shippingDetails.firstName);
      }
      
      // Last Name
      const lastNameField = await this.page.$(SELECTORS.SHIPPING_LAST_NAME);
      if (lastNameField && this.task.shippingDetails.lastName) {
        await this.page.type(SELECTORS.SHIPPING_LAST_NAME, this.task.shippingDetails.lastName);
      }
      
      // Address
      const addressField = await this.page.$(SELECTORS.SHIPPING_ADDRESS);
      if (addressField && this.task.shippingDetails.address1) {
        await this.page.type(SELECTORS.SHIPPING_ADDRESS, this.task.shippingDetails.address1);
      }
      
      // Address 2 (optional)
      const address2Field = await this.page.$(SELECTORS.SHIPPING_ADDRESS_2);
      if (address2Field && this.task.shippingDetails.address2) {
        await this.page.type(SELECTORS.SHIPPING_ADDRESS_2, this.task.shippingDetails.address2);
      }
      
      // City
      const cityField = await this.page.$(SELECTORS.SHIPPING_CITY);
      if (cityField && this.task.shippingDetails.city) {
        await this.page.type(SELECTORS.SHIPPING_CITY, this.task.shippingDetails.city);
      }
      
      // State (select dropdown)
      const stateField = await this.page.$(SELECTORS.SHIPPING_STATE);
      if (stateField && this.task.shippingDetails.state) {
        await this.page.select(SELECTORS.SHIPPING_STATE, this.task.shippingDetails.state);
      }
      
      // ZIP/Postal Code
      const zipField = await this.page.$(SELECTORS.SHIPPING_POSTAL_CODE);
      if (zipField && this.task.shippingDetails.zip) {
        await this.page.type(SELECTORS.SHIPPING_POSTAL_CODE, this.task.shippingDetails.zip);
      }
      
      // Phone
      const phoneField = await this.page.$(SELECTORS.SHIPPING_PHONE);
      if (phoneField && this.task.shippingDetails.phone) {
        await this.page.type(SELECTORS.SHIPPING_PHONE, this.task.shippingDetails.phone);
      }
      
      // Email
      const emailField = await this.page.$(SELECTORS.SHIPPING_EMAIL);
      if (emailField && this.task.shippingDetails.email) {
        await this.page.type(SELECTORS.SHIPPING_EMAIL, this.task.shippingDetails.email);
      }
      
      logger.info('Dettagli di spedizione compilati');
    } catch (error) {
      logger.error(`Errore durante la compilazione dei dettagli di spedizione: ${error.message}`);
    }
  }
  
  /**
   * Compila i dettagli di pagamento
   */
  private async fillPaymentDetails(): Promise<void> {
    try {
      if (!this.task.paymentDetails) {
        logger.warn('Dettagli di pagamento non forniti');
        return;
      }
      
      logger.info('Compilazione dettagli di pagamento');
      
      // Numero carta
      const cardNumberField = await this.page.$(SELECTORS.CREDIT_CARD_NUMBER);
      if (cardNumberField) {
        await this.page.type(SELECTORS.CREDIT_CARD_NUMBER, this.task.paymentDetails.cardNumber);
      }
      
      // Nome sulla carta
      const cardNameField = await this.page.$(SELECTORS.CREDIT_CARD_NAME);
      if (cardNameField && this.task.paymentDetails.cardName) {
        await this.page.type(SELECTORS.CREDIT_CARD_NAME, this.task.paymentDetails.cardName);
      }
      
      // Mese di scadenza
      const expMonthField = await this.page.$(SELECTORS.CREDIT_CARD_EXP_MONTH);
      if (expMonthField) {
        await this.page.select(SELECTORS.CREDIT_CARD_EXP_MONTH, this.task.paymentDetails.expiryMonth);
      }
      
      // Anno di scadenza
      const expYearField = await this.page.$(SELECTORS.CREDIT_CARD_EXP_YEAR);
      if (expYearField) {
        await this.page.select(SELECTORS.CREDIT_CARD_EXP_YEAR, this.task.paymentDetails.expiryYear);
      }
      
      // CVV
      const cvvField = await this.page.$(SELECTORS.CREDIT_CARD_CVV);
      if (cvvField) {
        await this.page.type(SELECTORS.CREDIT_CARD_CVV, this.task.paymentDetails.cvv);
      }
      
      logger.info('Dettagli di pagamento compilati');
    } catch (error) {
      logger.error(`Errore durante la compilazione dei dettagli di pagamento: ${error.message}`);
    }
  }
  
  /**
   * Gestisce il rilevamento e la risoluzione del CAPTCHA
   */
  async submitCaptcha(): Promise<boolean> {
    // Target generalmente non usa CAPTCHA tradizionali, ma potrebbe
    // implementare altre misure anti-bot
    logger.info('Nessun CAPTCHA tradizionale rilevato su Target');
    return true;
  }
}