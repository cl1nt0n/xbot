import { Page } from 'puppeteer-core';
import { getLogger } from '../../utils/logger';
import { RetailerSpecificAdapter } from '../retailerAdapter';
import { Task } from '../taskManager';

const logger = getLogger('NikeAdapter');

// Selettori per elementi nelle pagine Nike
const SELECTORS = {
  // Selettori pagina prodotto
  PRODUCT_TITLE: '.product-info h1, .product-title, .headline-5',
  SIZE_CONTAINER: '.mt2-sm .css-viwop1, .css-1j113vv, .css-1g204fi',
  SIZE_BUTTONS: '[data-qa="size-dropdown"] button, .css-1j113vv button, button[data-test="size-dropdown-option"]',
  ADD_TO_CART_BUTTON: '.add-to-cart-btn, button.ncss-btn-primary-dark, button[data-qa="add-to-cart"], button.css-b8rwz6, button.css-4ktcwg',
  OUT_OF_STOCK: '.available-status-container message-negative, button.add-to-cart-btn:disabled, .out-of-stock, .product-status.disabled span',
  PRICE: '.product-price, .css-b9fpep, .css-2lzdkg',
  
  // Selettori popup
  MODAL_CLOSE: '.modal-dialog button.icon-btn-close, .ncss-btn-secondary-icon, button[data-qa="modal-close-btn"]',
  
  // Selettori carrello
  CART_ICON: '.nav-cart, a[data-path="/cart"], a.css-z8k8u1',
  MEMBER_CHECKOUT_BUTTON: '.css-1h4ieoz, .fulfillment-btn',
  GUEST_CHECKOUT_BUTTON: '.guest-checkout, button[data-automation="guest-checkout-button"]',
  
  // Selettori login
  EMAIL_INPUT: 'input[type="email"], input[data-componentname="emailAddress"]',
  PASSWORD_INPUT: 'input[type="password"], input[data-componentname="password"]',
  SIGN_IN_BUTTON: '.nike-unite-submit-button button, button[data-automation="continue-button"]',
  
  // Selettori pagina checkout
  CHECKOUT_CONTINUE_BUTTON: '.css-1q7s7ga, button[data-automation="checkout-payment-continue-button"]',
  
  // Selettori informazioni di spedizione
  SHIPPING_FIRST_NAME: '#firstName, input[name="firstName"], input[data-componentname="firstName"]',
  SHIPPING_LAST_NAME: '#lastName, input[name="lastName"], input[data-componentname="lastName"]',
  SHIPPING_ADDRESS: '#address1, input[name="address1"], input[data-componentname="address1"]',
  SHIPPING_CITY: '#city, input[name="city"], input[data-componentname="city"]',
  SHIPPING_POSTAL_CODE: '#postalCode, input[name="postalCode"], input[data-componentname="postalCode"]',
  SHIPPING_STATE: '#state, select[name="state"], select[data-componentname="state"]',
  SHIPPING_PHONE: '#phoneNumber, input[name="phoneNumber"], input[data-componentname="phoneNumber"]',
  SHIPPING_EMAIL: '#email, input[name="email"], input[data-componentname="email"]',
  
  // Selettori pagamento
  CREDIT_CARD_NUMBER: '#creditCardNumber, input[name="creditCardNumber"], input[data-componentname="cardNumber"]',
  CREDIT_CARD_NAME: '#creditCardName, input[name="creditCardName"], input[data-componentname="nameOnCard"]',
  CREDIT_CARD_EXP_MONTH: '#expirationMonth, select[name="expirationMonth"], select[data-componentname="expirationMonth"]', 
  CREDIT_CARD_EXP_YEAR: '#expirationYear, select[name="expirationYear"], select[data-componentname="expirationYear"]',
  CREDIT_CARD_CVV: '#cvNumber, input[name="cvNumber"], input[data-componentname="securityCode"]',
  
  // Selettori pulsante ordine
  PLACE_ORDER_BUTTON: '.button-continue, button[data-automation="review-and-pay-place-order-button"]',
  
  // Conferma ordine
  ORDER_CONFIRMATION: '.thank-you-title, .css-1qg8djn, h3[data-automation="order-confirmation-title"]',
  ORDER_NUMBER: '.order-number, [data-automation="order-confirmation-number"]',
  
  // Selettori CAPTCHA
  CAPTCHA_IFRAME: 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"]',
};

export class NikeAdapter implements RetailerSpecificAdapter {
  private page: Page;
  private task: Task;
  
  constructor(page: Page, task: Task) {
    this.page = page;
    this.task = task;
    logger.info('Nike adapter inizializzato');
  }
  
  /**
   * Carica la pagina del prodotto
   */
  async loadProductPage(): Promise<boolean> {
    try {
      logger.info(`Caricamento pagina prodotto: ${this.task.productUrl}`);
      
      if (!this.task.productUrl) {
        logger.error('URL del prodotto non fornito');
        return false;
      }
      
      // Imposta header user-agent per navigazione su Nike
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
      );
      
      // Carica la pagina
      await this.page.goto(this.task.productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
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
      // Controlla se ci sono popup da chiudere
      const closeButton = await this.page.$(SELECTORS.MODAL_CLOSE);
      if (closeButton) {
        logger.info('Chiusura popup');
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Controlla se c'è un popup di "Rimani nel paese"
      // Nike spesso chiede di confermare la regione
      const stayButtons = await this.page.$$('button');
      for (const button of stayButtons) {
        const buttonText = await this.page.evaluate(el => el.textContent.toLowerCase().trim(), button);
        if (buttonText.includes('stay') || buttonText.includes('rimani')) {
          logger.info('Cliccando su pulsante "rimani in questo paese"');
          await button.click();
          await this.page.waitForTimeout(1000);
          break;
        }
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
      
      // Verifica presenza indicatori di esaurimento
      const outOfStockElement = await this.page.$(SELECTORS.OUT_OF_STOCK);
      if (outOfStockElement) {
        const statusText = await this.page.evaluate(el => el.textContent.trim().toLowerCase(), outOfStockElement);
        if (statusText.includes('out of stock') || statusText.includes('sold out') || 
            statusText.includes('esaurito') || statusText.includes('non disponibile')) {
          logger.info('Prodotto esaurito');
          return false;
        }
      }
      
      // Verifica disponibilità del pulsante "Aggiungi al carrello"
      const addToCartButton = await this.page.$(SELECTORS.ADD_TO_CART_BUTTON);
      if (!addToCartButton) {
        logger.info('Pulsante "Aggiungi al carrello" non trovato');
        return false;
      }
      
      // Verifica se il pulsante è disabilitato
      const isDisabled = await this.page.evaluate(button => {
        return button.disabled || 
               button.classList.contains('disabled') || 
               button.getAttribute('aria-disabled') === 'true';
      }, addToCartButton);
      
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
      logger.info('Selezione opzioni prodotto');
      
      // Se è specificata una taglia, selezionala
      if (this.task.options?.size) {
        const targetSize = this.task.options.size;
        logger.info(`Tentativo di selezionare taglia: ${targetSize}`);
        
        // Trova i pulsanti delle taglie
        const sizeButtons = await this.page.$$(SELECTORS.SIZE_BUTTONS);
        
        if (sizeButtons.length > 0) {
          let selectedSizeButton = null;
          let firstAvailableButton = null;
          
          // Scansiona tutti i pulsanti delle taglie
          for (const button of sizeButtons) {
            // Verifica se il pulsante è disabilitato (esaurito)
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
                selectedSizeButton = button;
                break;
              }
            }
          }
          
          // Se abbiamo trovato la taglia richiesta, selezionala
          if (selectedSizeButton) {
            logger.info(`Selezionando taglia richiesta: ${targetSize}`);
            await selectedSizeButton.click();
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
          logger.warn('Nessun pulsante per la taglia trovato');
        }
      } else {
        logger.info('Nessuna taglia specificata. Procedendo senza selezionare una taglia');
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
      
      // Nike potrebbe mostrare una finestra modale o reindirizzare al carrello
      // Controlliamo se c'è un popup di "Aggiunto al carrello"
      const closeButton = await this.page.$(SELECTORS.MODAL_CLOSE);
      if (closeButton) {
        // Naviga al carrello cliccando sull'icona del carrello
        const cartIcon = await this.page.$(SELECTORS.CART_ICON);
        if (cartIcon) {
          logger.info('Navigando al carrello');
          await cartIcon.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
            logger.warn('Timeout durante la navigazione al carrello');
          });
        } else {
          // Se non troviamo l'icona del carrello, naviga manualmente
          logger.info('Navigando manualmente al carrello');
          await this.page.goto('https://www.nike.com/cart', { waitUntil: 'networkidle0', timeout: 10000 });
        }
      }
      
      // Verifica che siamo nella pagina del carrello e che ci sia un pulsante di checkout
      const memberCheckoutButton = await this.page.$(SELECTORS.MEMBER_CHECKOUT_BUTTON);
      const guestCheckoutButton = await this.page.$(SELECTORS.GUEST_CHECKOUT_BUTTON);
      
      if (memberCheckoutButton || guestCheckoutButton) {
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
      
      // Cerca il pulsante di checkout per membri (che richiederà il login)
      const memberCheckoutButton = await this.page.$(SELECTORS.MEMBER_CHECKOUT_BUTTON);
      if (memberCheckoutButton) {
        await memberCheckoutButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      } else {
        logger.warn('Pulsante checkout per membri non trovato');
        return false;
      }
      
      // Compila form di login
      // Campo email
      const emailInput = await this.page.$(SELECTORS.EMAIL_INPUT);
      if (emailInput) {
        await this.page.type(SELECTORS.EMAIL_INPUT, this.task.loginDetails.username);
      } else {
        logger.error('Campo email non trovato');
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
      
      // Pulsante accedi
      const signInButton = await this.page.$(SELECTORS.SIGN_IN_BUTTON);
      if (signInButton) {
        await signInButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      } else {
        logger.error('Pulsante accedi non trovato');
        return false;
      }
      
      // Verifica se il login è riuscito
      // Controlla se siamo nella pagina di checkout o se c'è un messaggio di errore
      const checkoutContinueButton = await this.page.$(SELECTORS.CHECKOUT_CONTINUE_BUTTON);
      if (checkoutContinueButton) {
        logger.info('Login effettuato con successo');
        return true;
      } else {
        // Cerca messaggi di errore
        const errorMessages = await this.page.$$eval('.error-message, .nike-unite-error-message', elements => 
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
      
      // Cerca il pulsante di checkout
      // Prima cerca il pulsante per membri, poi quello per ospiti
      let checkoutButton = await this.page.$(SELECTORS.MEMBER_CHECKOUT_BUTTON);
      
      if (!checkoutButton) {
        checkoutButton = await this.page.$(SELECTORS.GUEST_CHECKOUT_BUTTON);
      }
      
      if (!checkoutButton) {
        logger.error('Pulsante checkout non trovato');
        return { success: false };
      }
      
      // Clicca sul pulsante checkout
      await checkoutButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
      
      // Se non siamo ancora loggati, potremmo avere bisogno di un login
      // o procedere come ospiti
      const emailInput = await this.page.$(SELECTORS.EMAIL_INPUT);
      if (emailInput) {
        if (this.task.loginDetails?.username && this.task.loginDetails?.password) {
          // Prova a fare login
          const loginSuccess = await this.login();
          if (!loginSuccess) {
            logger.warn('Login fallito, tentativo di proseguire come ospite');
          }
        } else {
          // Procedi come ospite
          logger.info('Procedendo come ospite');
          
          // Compila info di spedizione
          await this.fillShippingDetails();
        }
      } else {
        // Siamo già nella pagina di checkout come utente loggato
        // o nella pagina di spedizione
        // Compila info di spedizione se necessario
        const nameInput = await this.page.$(SELECTORS.SHIPPING_FIRST_NAME);
        if (nameInput) {
          await this.fillShippingDetails();
        }
      }
      
      // Continua alla pagina di pagamento
      const continueButton = await this.page.$(SELECTORS.CHECKOUT_CONTINUE_BUTTON);
      if (continueButton) {
        await continueButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
      
      // Compila i dettagli di pagamento
      await this.fillPaymentDetails();
      
      // Continua all'ultima fase di checkout
      const finalContinueButton = await this.page.$(SELECTORS.CHECKOUT_CONTINUE_BUTTON);
      if (finalContinueButton) {
        await finalContinueButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      }
      
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
      
      logger.info('Compilazione dettagli di spedizione');
      
      // Nome
      if (this.task.shippingDetails.firstName) {
        await this.page.type(SELECTORS.SHIPPING_FIRST_NAME, this.task.shippingDetails.firstName);
      }
      
      // Cognome
      if (this.task.shippingDetails.lastName) {
        await this.page.type(SELECTORS.SHIPPING_LAST_NAME, this.task.shippingDetails.lastName);
      }
      
      // Indirizzo
      if (this.task.shippingDetails.address1) {
        await this.page.type(SELECTORS.SHIPPING_ADDRESS, this.task.shippingDetails.address1);
      }
      
      // Città
      if (this.task.shippingDetails.city) {
        await this.page.type(SELECTORS.SHIPPING_CITY, this.task.shippingDetails.city);
      }
      
      // CAP
      if (this.task.shippingDetails.zip) {
        await this.page.type(SELECTORS.SHIPPING_POSTAL_CODE, this.task.shippingDetails.zip);
      }
      
      // Stato/Provincia (dropdown)
      if (this.task.shippingDetails.state) {
        await this.page.select(SELECTORS.SHIPPING_STATE, this.task.shippingDetails.state);
      }
      
      // Telefono
      if (this.task.shippingDetails.phone) {
        await this.page.type(SELECTORS.SHIPPING_PHONE, this.task.shippingDetails.phone);
      }
      
      // Email (se non già compilata)
      if (this.task.shippingDetails.email) {
        const emailInput = await this.page.$(SELECTORS.SHIPPING_EMAIL);
        if (emailInput) {
          await this.page.type(SELECTORS.SHIPPING_EMAIL, this.task.shippingDetails.email);
        }
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
      const cardNumberInput = await this.page.$(SELECTORS.CREDIT_CARD_NUMBER);
      if (cardNumberInput) {
        await this.page.type(SELECTORS.CREDIT_CARD_NUMBER, this.task.paymentDetails.cardNumber);
      }
      
      // Nome sulla carta
      const cardNameInput = await this.page.$(SELECTORS.CREDIT_CARD_NAME);
      if (cardNameInput && this.task.paymentDetails.cardName) {
        await this.page.type(SELECTORS.CREDIT_CARD_NAME, this.task.paymentDetails.cardName);
      }
      
      // Mese di scadenza
      const expMonthSelect = await this.page.$(SELECTORS.CREDIT_CARD_EXP_MONTH);
      if (expMonthSelect) {
        await this.page.select(SELECTORS.CREDIT_CARD_EXP_MONTH, this.task.paymentDetails.expiryMonth);
      }
      
      // Anno di scadenza
      const expYearSelect = await this.page.$(SELECTORS.CREDIT_CARD_EXP_YEAR);
      if (expYearSelect) {
        await this.page.select(SELECTORS.CREDIT_CARD_EXP_YEAR, this.task.paymentDetails.expiryYear);
      }
      
      // CVV
      const cvvInput = await this.page.$(SELECTORS.CREDIT_CARD_CVV);
      if (cvvInput) {
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
    try {
      logger.info('Controllo per CAPTCHA');
      
      // Cerca iframe del CAPTCHA
      const captchaFrame = await this.page.$(SELECTORS.CAPTCHA_IFRAME);
      if (!captchaFrame) {
        logger.info('Nessun CAPTCHA rilevato');
        return true;
      }
      
      logger.warn('CAPTCHA rilevato. È necessaria la risoluzione manuale o tramite servizio esterno');
      
      // Se è configurato un servizio di risoluzione automatica
      if (this.task.captchaSettings?.enabled && this.task.captchaSettings?.apiKey) {
        logger.info('Tentativo di risoluzione CAPTCHA tramite servizio esterno');
        
        // Qui andrebbe implementata l'integrazione con un servizio anti-CAPTCHA
        // come 2Captcha, Anti-Captcha, ecc.
        // L'implementazione dipende dal servizio specifico usato
        
        // Per questo esempio, simuliamo un ritardo e assumiamo successo
        await this.page.waitForTimeout(3000);
        
        logger.info('CAPTCHA risolto (simulazione)');
        return true;
      } else {
        logger.info('Nessun servizio CAPTCHA configurato. Risoluzione manuale richiesta');
        
        // In un'implementazione reale, qui potresti:
        // 1. Notificare l'utente via UI
        // 2. Attendere un timeout lungo per permettere la risoluzione manuale
        // 3. Verificare periodicamente se il CAPTCHA è ancora presente
        
        // Per questo esempio, attendiamo un timeout per simulare risoluzione manuale
        await this.page.waitForTimeout(5000);
        
        // Verifica se il CAPTCHA è ancora presente
        const captchaStillPresent = await this.page.$(SELECTORS.CAPTCHA_IFRAME);
        if (captchaStillPresent) {
          logger.warn('CAPTCHA ancora presente dopo il tempo di attesa');
          return false;
        }
        
        logger.info('CAPTCHA risolto (assumendo risoluzione manuale)');
        return true;
      }
    } catch (error) {
      logger.error(`Errore durante la gestione del CAPTCHA: ${error.message}`);
      return false;
    }
  }
}