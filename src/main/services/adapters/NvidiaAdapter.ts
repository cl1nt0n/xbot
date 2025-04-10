import { RetailerAdapter, RetailerAdapterFactory } from './RetailerAdapter';

/**
 * NVIDIA-specific adapter implementation
 * Utilizzato per il sito ufficiale di NVIDIA
 */
export class NvidiaAdapter extends RetailerAdapter {
  /**
   * Product information type for NVIDIA
   */
  interface ProductInfo {
    title: string;
    price: string;
    imageUrl: string;
    available: boolean;
    model: string;
    url: string;
  }

  /**
   * Constructor for NVIDIA adapter
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   */
  constructor(browser: any, options: any = {}) {
    super(browser, {
      baseUrl: options.baseUrl || 'https://store.nvidia.com',
      name: options.name || 'NVIDIA'
    });
    
    // Override selectors with NVIDIA-specific selectors
    this.selectors = {
      productTitle: '.product-title, .gc-title-t1',
      productPrice: '.product-price, .gc-price',
      productImage: '.product-image img, .gc-featured-product-image img',
      productOptions: '.product-options, .gc-select-options',
      addToCartButton: '.gc-buy-button, #btnAddToCart, button[data-digital-river-id="addToCart"]',
      checkoutButton: '#dr_checkoutButton, .gc-checkout-button',
      sizeSelector: '',  // NVIDIA doesn't typically have size options
      colorSelector: '',  // NVIDIA doesn't typically have color options
      quantityInput: '#qty, input[name="quantity"]',
      loginForm: {
        emailField: '#loginEmail, #email',
        passwordField: '#loginPassword, #password',
        submitButton: '#btnSignIn, #sign-in'
      },
      checkoutForm: {
        nameField: '#billingName, #first-name',
        addressField: '#billingAddress1, #address-line1',
        cityField: '#billingCity, #city',
        stateField: '#billingState, #state',
        zipField: '#billingPostalCode, #zip',
        countryField: '#billingCountry, #country',
        phoneField: '#billingPhone, #phone',
        cardNumberField: '#accountNumber, #card-number',
        cardExpiryField: '#expirationDate, #expiry',
        cardCvvField: '#securityCode, #cvc',
        submitButton: '#btnPlaceOrder, .gc-place-order-button'
      }
    };
  }

  /**
   * Set up page with NVIDIA-specific configurations
   */
  protected async setupPage(): Promise<void> {
    await super.setupPage();
    
    // Additional setup for NVIDIA store
    this.page.on('dialog', async (dialog: any) => {
      // Handle any popups or alerts (common in NVIDIA store)
      await dialog.dismiss();
    });
    
    // Set extra headers to avoid bot detection
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    // Set cookies for region - NVIDIA often redirects based on region
    await this.page.setCookie({
      name: 'NV_COUNTRY',
      value: 'US',
      domain: '.nvidia.com'
    });
    
    // NVIDIA store has anti-bot measures - set up request interception more specifically
    this.page.on('request', (request: any) => {
      // Change user-agent on the fly for certain requests to appear more legitimate
      if (request.resourceType() === 'document' || request.resourceType() === 'xhr') {
        const headers = request.headers();
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        request.continue({ headers });
      } else {
        request.continue();
      }
    });
  }

  /**
   * Check if a product is available on NVIDIA store
   * @param url - URL of the product
   * @returns Promise<boolean> - True if product is available
   */
  async checkAvailability(url?: string): Promise<boolean> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // NVIDIA has multiple indicators for availability across different store versions
      return await this.page.evaluate(() => {
        // Check for common availability indicators on NVIDIA store
        
        // Check if add to cart button exists and is not disabled
        const buyButton = document.querySelector('.gc-buy-button, #btnAddToCart, button[data-digital-river-id="addToCart"]') as HTMLButtonElement;
        if (buyButton && !buyButton.disabled) {
          return true;
        }
        
        // Check for out of stock text
        const outOfStockElements = document.querySelectorAll('.out-of-stock, .soldout, .notify-me-btn');
        if (outOfStockElements.length > 0) {
          return false;
        }
        
        // Check for product availability text
        const availabilityText = document.querySelector('.product-availability, .gc-availability');
        if (availabilityText) {
          const text = availabilityText.textContent.toLowerCase();
          return !text.includes('out of stock') && 
                 !text.includes('sold out') && 
                 !text.includes('currently unavailable');
        }
        
        // Check for alert banner often used for 30-series cards
        const alertBanner = document.querySelector('.gc-alert-banner');
        if (alertBanner && alertBanner.textContent.includes('Out of Stock')) {
          return false;
        }
        
        // If no clear indicators found, check if the add to cart functionality exists
        return document.querySelector('form[action*="add-to-cart"], [data-add-to-cart]') !== null;
      });
    } catch (error) {
      console.error('Failed to check availability on NVIDIA store:', error);
      return false;
    }
  }

  /**
   * Get product information from NVIDIA store
   * @param url - URL of the product
   * @returns Promise<ProductInfo> - Product information
   */
  async getProductInfo(url?: string): Promise<ProductInfo> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // Extract product information using page.evaluate
      const productInfo = await this.page.evaluate((selectors: any) => {
        // Extract title
        const titleElement = document.querySelector(selectors.productTitle);
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Extract price
        const priceElement = document.querySelector(selectors.productPrice);
        const price = priceElement ? priceElement.textContent.trim() : '';
        
        // Extract image URL
        const imageElement = document.querySelector(selectors.productImage) as HTMLImageElement;
        const imageUrl = imageElement ? imageElement.src : '';
        
        // Check availability
        const buyButton = document.querySelector('.gc-buy-button, #btnAddToCart, button[data-digital-river-id="addToCart"]') as HTMLButtonElement;
        const available = buyButton && !buyButton.disabled;
        
        // Extract product model (often in URL or data attributes)
        let model = '';
        
        // Try to get model from URL
        const urlPath = window.location.pathname;
        const urlParts = urlPath.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart !== '') {
          model = lastPart.replace('.html', '').replace('-', ' ').toUpperCase();
        }
        
        // If no model found in URL, try to extract from product title
        if (!model && title) {
          // Common NVIDIA product naming patterns: GeForce RTX 3080, NVIDIA RTX 4090, etc.
          const modelMatch = title.match(/(GeForce|NVIDIA)\s(RTX|GTX)\s(\d{4}\s?(?:Ti|SUPER)?)/i);
          if (modelMatch) {
            model = modelMatch[2] + ' ' + modelMatch[3]; // e.g., "RTX 3080"
          }
        }
        
        return {
          title,
          price,
          imageUrl,
          available,
          model,
          url: window.location.href
        };
      }, this.selectors);
      
      return productInfo;
    } catch (error) {
      console.error('Failed to get product info from NVIDIA store:', error);
      return {
        title: '',
        price: '',
        imageUrl: '',
        available: false,
        model: '',
        url: url || ''
      };
    }
  }

  /**
   * Override add to cart method with NVIDIA-specific implementation
   * @param url - URL of the product
   * @param options - Options for adding to cart
   * @returns Promise<boolean> - True if added to cart successfully
   */
  async addToCart(url?: string, options: { 
    quantity?: number 
  } = {}): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // If URL is provided, load the product page
    if (url) {
      const pageLoaded = await this.loadProductPage(url);
      if (!pageLoaded) return false;
    }
    
    try {
      // NVIDIA store can use different cart systems based on region/product
      
      // Set quantity if provided and supported
      if (options.quantity && options.quantity > 1) {
        await this.page.waitForSelector(this.selectors.quantityInput, { timeout: 5000 })
          .then(async () => {
            await this.page.type(this.selectors.quantityInput, options.quantity.toString(), { delay: 100 });
          })
          .catch(() => {
            console.log('Quantity input not found for NVIDIA product');
          });
      }
      
      // Look for any "Accept Terms" checkbox that might need to be checked first
      await this.page.evaluate(() => {
        const termsCheckbox = document.querySelector('input[type="checkbox"][id*="terms"], input[type="checkbox"][id*="Terms"]') as HTMLInputElement;
        if (termsCheckbox && !termsCheckbox.checked) {
          termsCheckbox.click();
        }
      });
      
      // Wait a moment for any dynamic content to load
      await this.page.waitForTimeout(500);
      
      // Click the add to cart button
      await this.page.waitForSelector(this.selectors.addToCartButton, { timeout: 10000 });
      
      // Some NVIDIA buttons have multiple layers or are hidden by overlays
      const addToCartSuccess = await this.page.evaluate((selector) => {
        const button = document.querySelector(selector) as HTMLButtonElement;
        if (button && !button.disabled) {
          button.click();
          return true;
        }
        return false;
      }, this.selectors.addToCartButton);
      
      if (!addToCartSuccess) {
        console.error('Failed to click add to cart button on NVIDIA store');
        return false;
      }
      
      // NVIDIA store can either:
      // 1. Navigate to cart page
      // 2. Show a modal/overlay with cart contents
      // 3. Update the mini-cart indicator
      
      // Wait for any of these outcomes
      try {
        await Promise.race([
          // Wait for navigation to cart page
          this.page.waitForNavigation({ timeout: 10000 }),
          
          // Wait for cart modal/overlay
          this.page.waitForSelector('.cart-modal, .mini-cart-open, .gc-cart-overlay', { 
            visible: true, 
            timeout: 10000 
          }),
          
          // Wait for cart count to update
          this.page.waitForFunction(() => {
            const cartCount = document.querySelector('.cart-count, .gc-cart-count');
            return cartCount && parseInt(cartCount.textContent, 10) > 0;
          }, { timeout: 10000 })
        ]);
      } catch (e) {
        console.warn('No clear indication of add to cart success on NVIDIA store');
      }
      
      // Verify if product was added to cart
      const success = await this.page.evaluate(() => {
        // Check if we're on the cart page
        if (window.location.href.includes('/cart') || window.location.href.includes('/checkout')) {
          return true;
        }
        
        // Check cart count
        const cartCountElement = document.querySelector('.cart-count, .gc-cart-count');
        if (cartCountElement && parseInt(cartCountElement.textContent, 10) > 0) {
          return true;
        }
        
        // Check for cart modal/overlay
        const cartModal = document.querySelector('.cart-modal, .mini-cart-open, .gc-cart-overlay');
        if (cartModal && window.getComputedStyle(cartModal).display !== 'none') {
          return true;
        }
        
        // Check for success message
        const successMessage = document.querySelector('.success-message, .gc-add-to-cart-success');
        if (successMessage) {
          return true;
        }
        
        return false;
      });
      
      return success;
    } catch (error) {
      console.error('Failed to add product to cart on NVIDIA store:', error);
      return false;
    }
  }

  /**
   * Override the checkout method with NVIDIA-specific implementation
   * @param paymentInfo - Payment information
   * @returns Promise<boolean> - True if checkout completed successfully
   */
  async checkout(paymentInfo: {
    name: string,
    address: string,
    city: string,
    state: string,
    zip: string,
    country: string,
    phone: string,
    cardNumber: string,
    cardExpiry: string,
    cardCvv: string
  }): Promise<boolean> {
    try {
      // Navigate to cart page first
      const cartUrl = new URL('/cart', this.baseUrl).href;
      await this.page.goto(cartUrl, { waitUntil: 'networkidle2' });
      
      // Click proceed to checkout button
      await this.page.waitForSelector(this.selectors.checkoutButton, { timeout: 10000 });
      await this.page.click(this.selectors.checkoutButton);
      
      // NVIDIA uses Digital River for checkout in many regions, which has a specific flow
      
      // Wait for checkout page to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check if we need to sign in or continue as guest
      const continueAsGuestButton = await this.page.$('#drCheckoutButton-1, .checkout-as-guest');
      if (continueAsGuestButton) {
        await continueAsGuestButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Fill in shipping information
      const shippingFormVisible = await this.page.$(this.selectors.checkoutForm.nameField) !== null;
      
      if (shippingFormVisible) {
        // Split name into first and last if needed
        const nameParts = paymentInfo.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        // Check if we need to fill first and last name separately
        const firstNameField = await this.page.$('#first-name, #billingFirstName');
        const lastNameField = await this.page.$('#last-name, #billingLastName');
        
        if (firstNameField && lastNameField) {
          await this.page.type('#first-name, #billingFirstName', firstName, { delay: 100 });
          await this.page.type('#last-name, #billingLastName', lastName, { delay: 100 });
        } else {
          // Use full name field
          await this.page.type(this.selectors.checkoutForm.nameField, paymentInfo.name, { delay: 100 });
        }
        
        // Address information
        await this.page.type(this.selectors.checkoutForm.addressField, paymentInfo.address, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cityField, paymentInfo.city, { delay: 100 });
        
        // Country selection (usually a dropdown)
        await this.page.select(this.selectors.checkoutForm.countryField, paymentInfo.country)
          .catch(() => console.log('Country field may not be a dropdown'));
        
        // State selection (usually a dropdown for US addresses)
        await this.page.select(this.selectors.checkoutForm.stateField, paymentInfo.state)
          .catch(() => console.log('State field may not be a dropdown'));
        
        await this.page.type(this.selectors.checkoutForm.zipField, paymentInfo.zip, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.phoneField, paymentInfo.phone, { delay: 100 });
        
        // Sometimes there's a separate email field
        const emailField = await this.page.$('#email, #billingEmail');
        if (emailField) {
          // Generate a plausible email from the name
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
          await this.page.type('#email, #billingEmail', email, { delay: 100 });
        }
        
        // Continue to payment section
        const continueButton = await this.page.$('#drCheckoutButton-1, .dr-next-step, [data-testid="contact-information-save-button"]');
        if (continueButton) {
          await continueButton.click();
          await this.page.waitForTimeout(2000); // Wait for form validation and next section to appear
        }
      }
      
      // Digital River checkout often has multiple steps - check for shipping method selection
      const shippingMethodSelector = await this.page.$('.dr-shipping-options, [data-testid="shipping-method-option"]');
      if (shippingMethodSelector) {
        // Select the first shipping method if none is selected
        await this.page.evaluate(() => {
          const shippingOption = document.querySelector('input[name="shipping-option"]:not(:checked), [data-testid="shipping-method-option"] input:not(:checked)') as HTMLInputElement;
          if (shippingOption) {
            shippingOption.click();
          }
        });
        
        // Continue to payment
        const continueToPaymentButton = await this.page.$('#drCheckoutButton-2, .dr-next-step, [data-testid="shipping-method-save-button"]');
        if (continueToPaymentButton) {
          await continueToPaymentButton.click();
          await this.page.waitForTimeout(2000);
        }
      }
      
      // Handle payment information section
      const paymentFormVisible = await this.page.$(this.selectors.checkoutForm.cardNumberField) !== null;
      
      if (paymentFormVisible) {
        // NVIDIA/Digital River often uses iframes for payment fields
        try {
          // Check if payment fields are in iframes
          const cardNumberFrame = await this.page.$('iframe[id*="card"], iframe[name*="card"], iframe[title*="card"]');
          
          if (cardNumberFrame) {
            // Payment fields are in iframes
            const frames = await this.page.$$('iframe[id*="card"], iframe[name*="card"], iframe[title*="card"]');
            
            // Card number frame (usually the first payment iframe)
            const numberFrame = await frames[0].contentFrame();
            await numberFrame.type('input', paymentInfo.cardNumber, { delay: 100 });
            
            // Expiration date frame (usually the second payment iframe)
            if (frames.length > 1) {
              const expiryFrame = await frames[1].contentFrame();
              await expiryFrame.type('input', paymentInfo.cardExpiry, { delay: 100 });
            }
            
            // Security code frame (usually the third payment iframe)
            if (frames.length > 2) {
              const cvvFrame = await frames[2].contentFrame();
              await cvvFrame.type('input', paymentInfo.cardCvv, { delay: 100 });
            }
          } else {
            // Direct input fields (less common)
            await this.page.type(this.selectors.checkoutForm.cardNumberField, paymentInfo.cardNumber, { delay: 100 });
            await this.page.type(this.selectors.checkoutForm.cardExpiryField, paymentInfo.cardExpiry, { delay: 100 });
            await this.page.type(this.selectors.checkoutForm.cardCvvField, paymentInfo.cardCvv, { delay: 100 });
          }
          
          // Check terms and conditions box if present
          await this.page.evaluate(() => {
            const termsCheckbox = document.querySelector('input[type="checkbox"][id*="terms"], input[type="checkbox"][name*="terms"]') as HTMLInputElement;
            if (termsCheckbox && !termsCheckbox.checked) {
              termsCheckbox.click();
            }
          });
          
          // Complete order
          const placeOrderButton = await this.page.$(this.selectors.checkoutForm.submitButton);
          if (placeOrderButton) {
            await placeOrderButton.click();
            await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          }
          
          // Check for order confirmation
          const orderConfirmed = await this.page.evaluate(() => {
            const confirmationIndicators = [
              document.body.textContent.includes('Thank you for your order'),
              document.body.textContent.includes('Order confirmed'),
              document.body.textContent.includes('Order complete'),
              document.body.textContent.includes('Order number'),
              window.location.pathname.includes('/confirmation') || 
              window.location.pathname.includes('/thank-you')
            ];
            
            return confirmationIndicators.some(indicator => indicator === true);
          });
          
          return orderConfirmed;
        } catch (error) {
          console.error('Error during payment information entry:', error);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to complete checkout on NVIDIA store:', error);
      return false;
    }
  }

  /**
   * Handle CAPTCHA on NVIDIA store
   * @param request - Request object
   */
  protected async handleCaptcha(request: any): Promise<void> {
    const url = request.url();
    
    // NVIDIA often uses reCAPTCHA
    if (url.includes('captcha') || url.includes('recaptcha')) {
      console.warn('CAPTCHA detected on NVIDIA store');
      
      // Take a screenshot for manual review
      await this.page.screenshot({ path: 'nvidia-captcha.png' });
      
      // Pause for potential manual intervention
      await this.page.waitForTimeout(30000);
      
      request.continue();
    } else {
      request.continue();
    }
  }
}

// Register the NVIDIA adapter with the factory
RetailerAdapterFactory.registerAdapter('nvidia', NvidiaAdapter);