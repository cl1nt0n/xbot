import { RetailerAdapter, RetailerAdapterFactory } from './RetailerAdapter';

/**
 * PokemonCenter-specific adapter implementation
 * Utilizzato per il sito ufficiale Pokemon Center
 */
export class PokemonCenterAdapter extends RetailerAdapter {
  /**
   * Product information type for Pokemon Center
   */
  interface ProductInfo {
    title: string;
    price: string;
    imageUrl: string;
    available: boolean;
    productId: string;
    category: string;
    options: {
      sizes?: string[];
      styles?: string[];
    };
    url: string;
  }

  /**
   * Constructor for Pokemon Center adapter
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   */
  constructor(browser: any, options: any = {}) {
    super(browser, {
      baseUrl: options.baseUrl || 'https://www.pokemoncenter.com',
      name: options.name || 'Pokemon Center'
    });
    
    // Override selectors with Pokemon Center-specific selectors
    this.selectors = {
      productTitle: '.product-name, h1[itemprop="name"], .product-detail-title',
      productPrice: '.price, .product-price, .price-value',
      productImage: '.primary-image img, .product-detail-carousel__image',
      productOptions: '.attribute-wrapper, .swatch-attribute, .product-options',
      addToCartButton: '.add-to-cart, #add-to-cart, [data-test="add-to-cart"]',
      checkoutButton: '#checkout, [data-test="checkout-now"]',
      sizeSelector: 'select[id*="size"], .size-select, .size-options select',
      colorSelector: 'select[id*="color"], .color-select, .color-options select',
      quantityInput: '.quantity-select, [data-test="quantity-selector"] select, input.qty',
      loginForm: {
        emailField: '#email',
        passwordField: '#password',
        submitButton: '#sign-in-submit, [data-test="sign-in-button"]'
      },
      checkoutForm: {
        nameField: '#name-input, #fullName, [data-test="full-name"]',
        addressField: '#address-1-input, #shipping-address, [data-test="street-address"]',
        cityField: '#city-input, #shipping-city, [data-test="city"]',
        stateField: '#state-input, #shipping-state, [data-test="state"]',
        zipField: '#zip-code-input, #shipping-zipcode, [data-test="postal-code"]',
        countryField: '#country-input, #shipping-country, [data-test="country"]',
        phoneField: '#phone-input, #shipping-phone, [data-test="phone-number"]',
        cardNumberField: '#card-number, [data-test="card-number"]',
        cardExpiryField: '#expiration-date, [data-test="card-expiry"]',
        cardCvvField: '#security-code, [data-test="card-cvv"]',
        submitButton: '#checkout-payment-submit, [data-test="payment-submit"]'
      }
    };
  }

  /**
   * Set up page with Pokemon Center-specific configurations
   */
  protected async setupPage(): Promise<void> {
    await super.setupPage();
    
    // Additional setup for Pokemon Center
    this.page.on('dialog', async (dialog: any) => {
      // Handle any popups or alerts
      await dialog.dismiss();
    });
    
    // Set extra headers to avoid bot detection
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    // Pokemon Center has region-based content - set cookies for US
    await this.page.setCookie({
      name: 'userRegion',
      value: 'US',
      domain: '.pokemoncenter.com'
    });
    
    // Handle cookie consent popup if present
    this.page.on('load', async () => {
      try {
        // Check for cookie consent dialog
        const cookieConsentButton = await this.page.$('.cookie-banner button, #onetrust-accept-btn-handler');
        if (cookieConsentButton) {
          await cookieConsentButton.click();
        }
        
        // Check for newsletter signup popup
        const newsletterCloseButton = await this.page.$('.newsletter-signup-modal__close, .modal-close');
        if (newsletterCloseButton) {
          await newsletterCloseButton.click();
        }
      } catch (error) {
        console.log('Error handling popups:', error);
      }
    });
  }

  /**
   * Check if a product is available on Pokemon Center
   * @param url - URL of the product
   * @returns Promise<boolean> - True if product is available
   */
  async checkAvailability(url?: string): Promise<boolean> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // Check for product availability on Pokemon Center
      return await this.page.evaluate(() => {
        // Check for add to cart button
        const addToCartButton = document.querySelector('.add-to-cart, #add-to-cart, [data-test="add-to-cart"]') as HTMLButtonElement;
        if (addToCartButton && !addToCartButton.disabled) {
          return true;
        }
        
        // Check for out of stock indicators
        const outOfStockIndicators = [
          document.querySelector('.out-of-stock, .product-unavailable, [data-test="out-of-stock"]'),
          document.querySelector('.stock-status:not(.in-stock)'),
          document.querySelector('.notify-me-btn, .email-when-available')
        ];
        
        if (outOfStockIndicators.some(indicator => indicator !== null)) {
          return false;
        }
        
        // Check for stock status text
        const stockStatusElement = document.querySelector('.stock-status, .availability, [data-test="availability"]');
        if (stockStatusElement) {
          const statusText = stockStatusElement.textContent.toLowerCase();
          return !statusText.includes('out of stock') && 
                 !statusText.includes('unavailable') && 
                 !statusText.includes('sold out');
        }
        
        // If no explicit indicators, check if the add to cart section exists
        return document.querySelector('.product-add-to-cart, .add-to-cart-container') !== null;
      });
    } catch (error) {
      console.error('Failed to check availability on Pokemon Center:', error);
      return false;
    }
  }

  /**
   * Get product information from Pokemon Center
   * @param url - URL of the product
   * @returns Promise<ProductInfo> - Product information
   */
  async getProductInfo(url?: string): Promise<ProductInfo> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // Extract product information
      const productInfo = await this.page.evaluate((selectors: any) => {
        // Extract title
        const titleElement = document.querySelector(selectors.productTitle);
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        // Extract price
        const priceElement = document.querySelector(selectors.productPrice);
        const price = priceElement ? priceElement.textContent.trim() : '';
        
        // Extract image URL
        const imageElement = document.querySelector(selectors.productImage) as HTMLImageElement;
        const imageUrl = imageElement ? (imageElement.dataset.src || imageElement.src) : '';
        
        // Check availability
        const addToCartButton = document.querySelector('.add-to-cart, #add-to-cart, [data-test="add-to-cart"]') as HTMLButtonElement;
        const available = addToCartButton && !addToCartButton.disabled;
        
        // Extract product ID
        let productId = '';
        // Try from URL
        const urlMatch = window.location.pathname.match(/\/(\d+)\/?/);
        if (urlMatch) {
          productId = urlMatch[1];
        }
        
        // Try from data attributes
        if (!productId) {
          const productIdElement = document.querySelector('[data-product-id], [data-pid]');
          if (productIdElement) {
            productId = productIdElement.getAttribute('data-product-id') || 
                        productIdElement.getAttribute('data-pid') || '';
          }
        }
        
        // Try from JSON data
        if (!productId && window.digitalData && window.digitalData.product) {
          productId = window.digitalData.product.productInfo.productID;
        }
        
        // Extract category
        let category = '';
        // Try from breadcrumbs
        const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a');
        if (breadcrumbs.length > 1) {
          category = breadcrumbs[1].textContent.trim();
        }
        
        // Try from metadata
        if (!category) {
          const categoryElement = document.querySelector('meta[property="product:category"], meta[name="category"]');
          if (categoryElement) {
            category = categoryElement.getAttribute('content') || '';
          }
        }
        
        // Try from URL
        if (!category) {
          const pathParts = window.location.pathname.split('/');
          if (pathParts.length > 2) {
            category = pathParts[1].replace(/-/g, ' ');
            // Capitalize first letter of each word
            category = category.replace(/\b\w/g, c => c.toUpperCase());
          }
        }
        
        // Extract available sizes
        const sizes: string[] = [];
        const sizeOptions = document.querySelectorAll('select[id*="size"] option, .size-select option');
        sizeOptions.forEach((option: Element) => {
          const value = (option as HTMLOptionElement).value;
          const disabled = (option as HTMLOptionElement).disabled;
          if (value && value !== '' && !disabled) {
            sizes.push((option as HTMLOptionElement).text.trim());
          }
        });
        
        // Extract available styles/variants
        const styles: string[] = [];
        const styleOptions = document.querySelectorAll('select[id*="style"] option, .style-select option, select[id*="color"] option');
        styleOptions.forEach((option: Element) => {
          const value = (option as HTMLOptionElement).value;
          const disabled = (option as HTMLOptionElement).disabled;
          if (value && value !== '' && !disabled) {
            styles.push((option as HTMLOptionElement).text.trim());
          }
        });
        
        return {
          title,
          price,
          imageUrl,
          available,
          productId,
          category,
          options: {
            sizes: sizes.length > 0 ? sizes : undefined,
            styles: styles.length > 0 ? styles : undefined
          },
          url: window.location.href
        };
      }, this.selectors);
      
      return productInfo;
    } catch (error) {
      console.error('Failed to get product info from Pokemon Center:', error);
      return {
        title: '',
        price: '',
        imageUrl: '',
        available: false,
        productId: '',
        category: '',
        options: {
          sizes: [],
          styles: []
        },
        url: url || ''
      };
    }
  }

  /**
   * Override add to cart method with Pokemon Center-specific implementation
   * @param url - URL of the product
   * @param options - Options for adding to cart
   * @returns Promise<boolean> - True if added to cart successfully
   */
  async addToCart(url?: string, options: { 
    size?: string, 
    style?: string, 
    quantity?: number 
  } = {}): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // If URL is provided, load the product page
    if (url) {
      const pageLoaded = await this.loadProductPage(url);
      if (!pageLoaded) return false;
    }
    
    try {
      // Select size if provided
      if (options.size) {
        await this.page.waitForSelector(this.selectors.sizeSelector, { timeout: 5000 })
          .then(async () => {
            // Try select element first
            try {
              await this.page.select(this.selectors.sizeSelector, options.size);
            } catch (e) {
              // If select fails, try clicking on the size option
              const sizeSelector = `.size-option[data-value="${options.size}"], .size-option:contains("${options.size}")`;
              await this.page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) (element as HTMLElement).click();
              }, sizeSelector);
            }
          })
          .catch(() => {
            console.log('Size selector not found on Pokemon Center product');
          });
      }
      
      // Select style/color if provided
      if (options.style) {
        await this.page.waitForSelector(this.selectors.colorSelector, { timeout: 5000 })
          .then(async () => {
            // Try select element first
            try {
              await this.page.select(this.selectors.colorSelector, options.style);
            } catch (e) {
              // If select fails, try clicking on the style option
              const styleSelector = `.style-option[data-value="${options.style}"], .color-swatch[data-value="${options.style}"]`;
              await this.page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) (element as HTMLElement).click();
              }, styleSelector);
            }
          })
          .catch(() => {
            console.log('Style/color selector not found on Pokemon Center product');
          });
      }
      
      // Set quantity if provided
      if (options.quantity && options.quantity > 1) {
        await this.page.waitForSelector(this.selectors.quantityInput, { timeout: 5000 })
          .then(async () => {
            // Check if it's a select element
            const isSelect = await this.page.evaluate((selector) => {
              return document.querySelector(selector)?.tagName === 'SELECT';
            }, this.selectors.quantityInput);
            
            if (isSelect) {
              // Use select for dropdown
              await this.page.select(this.selectors.quantityInput, options.quantity.toString());
            } else {
              // Use type for input field
              await this.page.evaluate((selector, quantity) => {
                const input = document.querySelector(selector) as HTMLInputElement;
                if (input) {
                  input.value = quantity.toString();
                  // Trigger change event
                  const event = new Event('change', { bubbles: true });
                  input.dispatchEvent(event);
                }
              }, this.selectors.quantityInput, options.quantity);
            }
          })
          .catch(() => {
            console.log('Quantity input not found on Pokemon Center product');
          });
      }
      
      // Click the add to cart button
      await this.page.waitForSelector(this.selectors.addToCartButton);
      await this.page.click(this.selectors.addToCartButton);
      
      // Pokemon Center typically shows a confirmation message or redirects to the cart
      try {
        await Promise.race([
          // Wait for cart page navigation
          this.page.waitForNavigation({ timeout: 5000 }),
          
          // Wait for modal/overlay confirmation
          this.page.waitForSelector('.cart-modal, .minicart, [data-test="mini-cart"]', { 
            visible: true, 
            timeout: 5000 
          }),
          
          // Wait for toast notification
          this.page.waitForSelector('.toast-notification, .success-message', { 
            visible: true, 
            timeout: 5000 
          })
        ]);
      } catch (e) {
        console.warn('No clear indication of add to cart success on Pokemon Center');
      }
      
      // Verify if product was added to cart
      const success = await this.page.evaluate(() => {
        // Check if we're on the cart page
        if (window.location.pathname.includes('/cart')) {
          return document.querySelectorAll('.cart-item, .line-item').length > 0;
        }
        
        // Check for cart modal/overlay
        const cartModal = document.querySelector('.cart-modal, .minicart, [data-test="mini-cart"]');
        if (cartModal && window.getComputedStyle(cartModal).display !== 'none') {
          return true;
        }
        
        // Check for success message
        const successMessage = document.querySelector('.toast-notification, .success-message');
        if (successMessage && window.getComputedStyle(successMessage).display !== 'none') {
          return true;
        }
        
        // Check cart count
        const cartCount = document.querySelector('.minicart-quantity, .cart-count');
        return cartCount && parseInt(cartCount.textContent, 10) > 0;
      });
      
      return success;
    } catch (error) {
      console.error('Failed to add product to cart on Pokemon Center:', error);
      return false;
    }
  }

  /**
   * Override the checkout method with Pokemon Center-specific implementation
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
      // Go to the cart page first
      await this.page.goto(`${this.baseUrl}/cart`, { waitUntil: 'networkidle2' });
      
      // Click the checkout button
      await this.page.waitForSelector(this.selectors.checkoutButton);
      await this.page.click(this.selectors.checkoutButton);
      
      // Wait for checkout page to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check if we need to sign in or continue as guest
      const guestCheckoutButton = await this.page.$('[data-test="guest-checkout"], .guest-checkout');
      if (guestCheckoutButton) {
        await guestCheckoutButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Fill in shipping information
      const shippingFormVisible = await this.page.$(this.selectors.checkoutForm.nameField) !== null;
      
      if (shippingFormVisible) {
        // For full name field
        await this.page.type(this.selectors.checkoutForm.nameField, paymentInfo.name, { delay: 100 });
        
        // Check if we need an email
        const emailField = await this.page.$('#email, [data-test="email"]');
        if (emailField) {
          // Generate a plausible email from the name
          const nameParts = paymentInfo.name.split(' ');
          const firstName = nameParts[0].toLowerCase();
          const lastName = nameParts.length > 1 ? nameParts[1].toLowerCase() : '';
          const email = `${firstName}.${lastName}@example.com`;
          await this.page.type('#email, [data-test="email"]', email, { delay: 100 });
        }
        
        await this.page.type(this.selectors.checkoutForm.addressField, paymentInfo.address, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cityField, paymentInfo.city, { delay: 100 });
        
        // Pokemon Center typically uses select dropdowns for country and state
        await this.page.select(this.selectors.checkoutForm.countryField, paymentInfo.country)
          .catch(() => console.log('Country field might not be a select element'));
        
        await this.page.select(this.selectors.checkoutForm.stateField, paymentInfo.state)
          .catch(() => console.log('State field might not be a select element'));
        
        await this.page.type(this.selectors.checkoutForm.zipField, paymentInfo.zip, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.phoneField, paymentInfo.phone, { delay: 100 });
        
        // Continue to shipping method
        const continueButton = await this.page.$('.btn-primary, [data-test="continue-to-shipping"], .submit-shipping');
        if (continueButton) {
          await continueButton.click();
          await this.page.waitForTimeout(2000);
        }
      }
      
      // Shipping method selection
      const shippingMethodSelector = await this.page.$('.shipping-method-list, [data-test="shipping-method"]');
      if (shippingMethodSelector) {
        // Select the first shipping method if none is selected
        await this.page.evaluate(() => {
          const shippingOptions = document.querySelectorAll('input[name="shipping_method"]');
          if (shippingOptions.length > 0 && !(shippingOptions[0] as HTMLInputElement).checked) {
            (shippingOptions[0] as HTMLInputElement).click();
          }
        });
        
        // Continue to payment
        const continueToPaymentButton = await this.page.$('.btn-primary, [data-test="continue-to-payment"]');
        if (continueToPaymentButton) {
          await continueToPaymentButton.click();
          await this.page.waitForTimeout(2000);
        }
      }
      
      // Payment information
      const paymentFormVisible = await this.page.$(this.selectors.checkoutForm.cardNumberField) !== null;
      
      if (paymentFormVisible) {
        // Pokemon Center may use iframes for payment fields
        const cardNumberFrame = await this.page.$('iframe[id*="card-number"], iframe[name*="creditCardNumber"]');
        
        if (cardNumberFrame) {
          // Handle iframe-based payment form
          // Card number iframe
          const numberFrame = await cardNumberFrame.contentFrame();
          await numberFrame.type('input', paymentInfo.cardNumber, { delay: 100 });
          
          // Expiry date iframe
          const expiryFrame = await this.page.$('iframe[id*="expiration"], iframe[name*="expirationDate"]')
            .then(frame => frame.contentFrame());
          await expiryFrame.type('input', paymentInfo.cardExpiry, { delay: 100 });
          
          // Security code iframe
          const cvvFrame = await this.page.$('iframe[id*="security-code"], iframe[name*="cvv"]')
            .then(frame => frame.contentFrame());
          await cvvFrame.type('input', paymentInfo.cardCvv, { delay: 100 });
        } else {
          // Direct input fields
          await this.page.type(this.selectors.checkoutForm.cardNumberField, paymentInfo.cardNumber, { delay: 100 });
          await this.page.type(this.selectors.checkoutForm.cardExpiryField, paymentInfo.cardExpiry, { delay: 100 });
          await this.page.type(this.selectors.checkoutForm.cardCvvField, paymentInfo.cardCvv, { delay: 100 });
        }
        
        // Billing address is same as shipping
        await this.page.evaluate(() => {
          const sameAsShippingCheckbox = document.querySelector('#billing-same-as-shipping, [data-test="billing-same-as-shipping"]') as HTMLInputElement;
          if (sameAsShippingCheckbox && !sameAsShippingCheckbox.checked) {
            sameAsShippingCheckbox.click();
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
          return document.body.textContent.includes('Thank you for your order') || 
                 document.body.textContent.includes('Your order has been placed') ||
                 document.body.textContent.includes('Order confirmation') ||
                 window.location.pathname.includes('/confirmation') ||
                 window.location.pathname.includes('/thank-you');
        });
        
        return orderConfirmed;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to complete checkout on Pokemon Center:', error);
      return false;
    }
  }
}

// Register the Pokemon Center adapter with the factory
RetailerAdapterFactory.registerAdapter('pokemoncenter', PokemonCenterAdapter);