import { RetailerAdapter, RetailerAdapterFactory } from './RetailerAdapter';

/**
 * Shopify-specific adapter implementation
 * Utilizzato per siti e-commerce basati sulla piattaforma Shopify
 */
export class ShopifyAdapter extends RetailerAdapter {
  /**
   * Product information type for Shopify
   */
  interface ProductInfo {
    title: string;
    price: string;
    imageUrl: string;
    available: boolean;
    options: {
      sizes?: string[];
      colors?: string[];
    };
    variants: any[];
    url: string;
  }

  /**
   * Constructor for Shopify adapter
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   */
  constructor(browser: any, options: any = {}) {
    super(browser, {
      baseUrl: options.baseUrl || '',
      name: options.name || 'Shopify'
    });
    
    // Override selectors with Shopify-specific selectors
    this.selectors = {
      productTitle: '.product__title, .product-single__title, h1.title',
      productPrice: '.product__price, .product-single__price, .price',
      productImage: '.product__media img, .product-single__media img, .featured-image',
      productOptions: '.product-form__input, .selector-wrapper, .single-option-selector',
      addToCartButton: '[name="add"], .add-to-cart, .product-form__cart-submit',
      checkoutButton: '.cart__checkout, a[href="/checkout"], [name="checkout"]',
      sizeSelector: '.single-option-selector[data-option="Size"], select[data-option-index="0"]',
      colorSelector: '.single-option-selector[data-option="Color"], select[data-option-index="1"]',
      quantityInput: '[name="quantity"]',
      loginForm: {
        emailField: '#CustomerEmail',
        passwordField: '#CustomerPassword',
        submitButton: 'input[type="submit"]'
      },
      checkoutForm: {
        nameField: '#checkout_shipping_address_first_name',
        addressField: '#checkout_shipping_address_address1',
        cityField: '#checkout_shipping_address_city',
        stateField: '#checkout_shipping_address_province',
        zipField: '#checkout_shipping_address_zip',
        countryField: '#checkout_shipping_address_country',
        phoneField: '#checkout_shipping_address_phone',
        cardNumberField: '[data-card-field="number"]',
        cardExpiryField: '[data-card-field="expiry"]',
        cardCvvField: '[data-card-field="verification_value"]',
        submitButton: '#continue_button'
      }
    };
  }

  /**
   * Set up page with Shopify-specific configurations
   */
  protected async setupPage(): Promise<void> {
    await super.setupPage();
    
    // Additional setup for Shopify
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
  }

  /**
   * Detect if a site is a Shopify store
   * @param url - URL to check
   * @returns Promise<boolean> - True if the site is a Shopify store
   */
  async isShopifySite(url?: string): Promise<boolean> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      return await this.page.evaluate(() => {
        // Check for Shopify global variable
        return typeof window.Shopify !== 'undefined' || 
               document.querySelector('link[href*="shopify"]') !== null ||
               document.querySelector('script[src*="shopify"]') !== null;
      });
    } catch (error) {
      console.error('Failed to detect if site is Shopify:', error);
      return false;
    }
  }

  /**
   * Check if a product is available on a Shopify store
   * @param url - URL of the product
   * @returns Promise<boolean> - True if product is available
   */
  async checkAvailability(url?: string): Promise<boolean> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // Check for product availability on Shopify
      return await this.page.evaluate(() => {
        // Look for common availability indicators
        const availabilityIndicators = [
          document.querySelector('.product-form__submit:not([disabled]), .product-form__cart-submit:not([disabled])'),
          document.querySelector('[name="add"]:not([disabled])'),
        ];
        
        // Check text elements
        const availabilityText = document.querySelector('.product__availability, .product-single__availability');
        const availableText = availabilityText ? availabilityText.textContent.trim().toLowerCase() : '';
        const soldOut = availableText.includes('sold out') || availableText.includes('esaurito');
        
        // Check meta tag (often used by Shopify)
        const metaAvailability = document.querySelector('meta[property="product:availability"]');
        const metaAvailabilityContent = metaAvailability ? metaAvailability.getAttribute('content') : '';
        
        // Check for add to cart button
        const addToCartEnabled = availabilityIndicators.some(element => element !== null);
        
        return addToCartEnabled && 
               !soldOut && 
               metaAvailabilityContent !== 'oos';
      });
    } catch (error) {
      console.error('Failed to check availability on Shopify store:', error);
      return false;
    }
  }

  /**
   * Get product information from a Shopify store
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
        const imageUrl = imageElement ? (imageElement.dataset.src || imageElement.src) : '';
        
        // Check availability
        const available = document.querySelector('button[name="add"]:not([disabled])') !== null;
        
        // Extract variants from Shopify JavaScript
        let variants: any[] = [];
        if (typeof window.ShopifyAnalytics !== 'undefined' && 
            window.ShopifyAnalytics.meta && 
            window.ShopifyAnalytics.meta.product) {
          variants = window.ShopifyAnalytics.meta.product.variants || [];
        } else {
          // Try to extract from product JSON
          const productJson = document.querySelector('#ProductJson-product-template');
          if (productJson && productJson.textContent) {
            try {
              const productData = JSON.parse(productJson.textContent);
              variants = productData.variants || [];
            } catch (e) {
              console.error('Failed to parse product JSON:', e);
            }
          }
        }
        
        // Extract options
        const sizes: string[] = [];
        const colors: string[] = [];
        
        // Extract from variants
        if (variants.length > 0) {
          variants.forEach((variant: any) => {
            if (variant.option1 && !sizes.includes(variant.option1)) {
              sizes.push(variant.option1);
            }
            if (variant.option2 && !colors.includes(variant.option2)) {
              colors.push(variant.option2);
            }
          });
        } else {
          // Extract from DOM if variants not available
          document.querySelectorAll('.single-option-selector[data-option="Size"] option, select[data-option-index="0"] option').forEach((option: Element) => {
            const value = (option as HTMLOptionElement).value;
            if (value && value !== '' && !sizes.includes(value)) {
              sizes.push(value);
            }
          });
          
          document.querySelectorAll('.single-option-selector[data-option="Color"] option, select[data-option-index="1"] option').forEach((option: Element) => {
            const value = (option as HTMLOptionElement).value;
            if (value && value !== '' && !colors.includes(value)) {
              colors.push(value);
            }
          });
        }
        
        return {
          title,
          price,
          imageUrl,
          available,
          options: {
            sizes: sizes.length > 0 ? sizes : undefined,
            colors: colors.length > 0 ? colors : undefined
          },
          variants,
          url: window.location.href
        };
      }, this.selectors);
      
      return productInfo;
    } catch (error) {
      console.error('Failed to get product info from Shopify store:', error);
      return {
        title: '',
        price: '',
        imageUrl: '',
        available: false,
        options: {
          sizes: [],
          colors: []
        },
        variants: [],
        url: url || ''
      };
    }
  }

  /**
   * Override add to cart method with Shopify-specific implementation
   * @param url - URL of the product
   * @param options - Options for adding to cart
   * @returns Promise<boolean> - True if added to cart successfully
   */
  async addToCart(url?: string, options: { 
    size?: string, 
    color?: string, 
    quantity?: number 
  } = {}): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    // If URL is provided, load the product page
    if (url) {
      const pageLoaded = await this.loadProductPage(url);
      if (!pageLoaded) return false;
    }
    
    try {
      // Select options before adding to cart
      if (options.size || options.color) {
        // Wait for variant selectors to be available
        await this.page.waitForSelector(options.size ? this.selectors.sizeSelector : this.selectors.colorSelector, { timeout: 5000 })
          .catch(() => console.log('Variant selectors not found, proceeding anyway'));
          
        // Select options using JavaScript in the page context
        await this.page.evaluate((options, selectors) => {
          // Handle size selection
          if (options.size) {
            const sizeSelectors = document.querySelectorAll(selectors.sizeSelector);
            sizeSelectors.forEach((select: Element) => {
              const sizeSelect = select as HTMLSelectElement;
              for (let i = 0; i < sizeSelect.options.length; i++) {
                if (sizeSelect.options[i].text.trim() === options.size || 
                    sizeSelect.options[i].value === options.size) {
                  sizeSelect.selectedIndex = i;
                  // Trigger change event
                  const event = new Event('change', { bubbles: true });
                  sizeSelect.dispatchEvent(event);
                  break;
                }
              }
            });
          }
          
          // Handle color selection
          if (options.color) {
            const colorSelectors = document.querySelectorAll(selectors.colorSelector);
            colorSelectors.forEach((select: Element) => {
              const colorSelect = select as HTMLSelectElement;
              for (let i = 0; i < colorSelect.options.length; i++) {
                if (colorSelect.options[i].text.trim() === options.color || 
                    colorSelect.options[i].value === options.color) {
                  colorSelect.selectedIndex = i;
                  // Trigger change event
                  const event = new Event('change', { bubbles: true });
                  colorSelect.dispatchEvent(event);
                  break;
                }
              }
            });
          }
        }, options, this.selectors);
        
        // Wait for variant to be selected
        await this.page.waitForTimeout(1000);
      }
      
      // Set quantity if provided
      if (options.quantity && options.quantity > 1) {
        await this.page.waitForSelector(this.selectors.quantityInput, { timeout: 5000 })
          .then(async () => {
            await this.page.evaluate((selector, quantity) => {
              const input = document.querySelector(selector) as HTMLInputElement;
              if (input) {
                input.value = quantity.toString();
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
              }
            }, this.selectors.quantityInput, options.quantity);
          })
          .catch(() => console.log('Quantity input not found'));
      }
      
      // Click the add to cart button
      await this.page.waitForSelector(this.selectors.addToCartButton);
      await this.page.click(this.selectors.addToCartButton);
      
      // Shopify stores handle adding to cart differently:
      // 1. Some redirect to the cart page
      // 2. Some show an AJAX cart modal
      // 3. Some update the cart indicator without leaving the page
      
      // Wait for potential navigation or cart update
      try {
        await Promise.race([
          this.page.waitForNavigation({ timeout: 5000 }),
          this.page.waitForSelector('.cart-notification.active, #cart-notification.is-active, .cart-drawer--active', { timeout: 5000 }),
          this.page.waitForFunction(() => {
            const cartCount = document.querySelector('.cart-count, .cart-count-bubble');
            return cartCount && cartCount.textContent && parseInt(cartCount.textContent, 10) > 0;
          }, { timeout: 5000 })
        ]);
      } catch (e) {
        // If no visible sign of success, check if the add to cart button is in loading state
        const buttonState = await this.page.evaluate((selector) => {
          const button = document.querySelector(selector);
          return button ? {
            disabled: button.hasAttribute('disabled'),
            text: button.textContent || ''
          } : null;
        }, this.selectors.addToCartButton);
        
        if (buttonState && buttonState.disabled && 
            (buttonState.text.includes('Adding') || buttonState.text.includes('Added'))) {
          // Button is in loading state, likely successful
          return true;
        }
        
        console.warn('No clear indication of add to cart success');
      }
      
      // Check if product was added to cart
      const success = await this.page.evaluate(() => {
        // Check cart count
        const cartCount = document.querySelector('.cart-count, .cart-count-bubble');
        if (cartCount && cartCount.textContent && parseInt(cartCount.textContent, 10) > 0) {
          return true;
        }
        
        // Check for cart notification
        const notification = document.querySelector('.cart-notification, #cart-notification, .cart-drawer');
        if (notification && window.getComputedStyle(notification).display !== 'none') {
          return true;
        }
        
        // Check for success message
        const messages = document.querySelectorAll('.cart-popup, .ajax-cart__content, .cart__note');
        for (const message of Array.from(messages)) {
          if (message.textContent.includes('added to cart') || 
              message.textContent.includes('added to your cart')) {
            return true;
          }
        }
        
        // Check if we're on the cart page
        return window.location.pathname.includes('/cart');
      });
      
      return success;
    } catch (error) {
      console.error('Failed to add product to cart on Shopify store:', error);
      return false;
    }
  }

  /**
   * Override the checkout method with Shopify-specific implementation
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
      const cartUrl = new URL('/cart', this.page.url()).href;
      await this.page.goto(cartUrl, { waitUntil: 'networkidle2' });
      
      // Click the checkout button
      await this.page.waitForSelector(this.selectors.checkoutButton);
      await this.page.click(this.selectors.checkoutButton);
      
      // Wait for checkout page to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Fill in customer information (step 1)
      const customerFormVisible = await this.page.$(this.selectors.checkoutForm.nameField) !== null;
      
      if (customerFormVisible) {
        // Split name into first and last
        const nameParts = paymentInfo.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        // Fill in shipping information
        await this.page.type('#checkout_shipping_address_first_name', firstName, { delay: 100 });
        await this.page.type('#checkout_shipping_address_last_name', lastName, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.addressField, paymentInfo.address, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cityField, paymentInfo.city, { delay: 100 });
        
        // Country dropdown might be a select
        await this.page.select(this.selectors.checkoutForm.countryField, paymentInfo.country).catch(() => {
          console.log('Country field might not be a select element');
        });
        
        // State/province dropdown might be a select
        await this.page.select(this.selectors.checkoutForm.stateField, paymentInfo.state).catch(() => {
          console.log('State field might not be a select element');
        });
        
        await this.page.type(this.selectors.checkoutForm.zipField, paymentInfo.zip, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.phoneField, paymentInfo.phone, { delay: 100 });
        
        // Continue to shipping method
        await this.page.click(this.selectors.checkoutForm.submitButton);
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Shipping method selection (step 2)
      const shippingMethodVisible = await this.page.$('#continue_button') !== null;
      
      if (shippingMethodVisible) {
        // Shopify usually selects the first shipping method by default
        // Just click continue if a shipping method is already selected
        
        // Check if any shipping method is selected
        const shippingMethodSelected = await this.page.evaluate(() => {
          const shippingMethods = document.querySelectorAll('input[name="checkout[shipping_rate][id]"]');
          for (const method of Array.from(shippingMethods)) {
            if ((method as HTMLInputElement).checked) {
              return true;
            }
          }
          return false;
        });
        
        // If no shipping method is selected, select the first one
        if (!shippingMethodSelected) {
          await this.page.evaluate(() => {
            const shippingMethods = document.querySelectorAll('input[name="checkout[shipping_rate][id]"]');
            if (shippingMethods.length > 0) {
              (shippingMethods[0] as HTMLInputElement).click();
            }
          });
        }
        
        // Continue to payment
        await this.page.click('#continue_button');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Payment information (step 3)
      const paymentFormVisible = await this.page.$(this.selectors.checkoutForm.cardNumberField) !== null;
      
      if (paymentFormVisible) {
        // For iframes, we need to handle them specifically
        // Shopify often uses iframes for payment fields
        
        // Credit card number iframe
        const cardNumberFrame = await this.page.waitForSelector('iframe[id^="card-fields-number"]');
        const cardNumberFrameContent = await cardNumberFrame.contentFrame();
        await cardNumberFrameContent.type('input', paymentInfo.cardNumber, { delay: 100 });
        
        // Name on card
        await this.page.type('#checkout_payment_gateway_payment_method_name', paymentInfo.name, { delay: 100 }).catch(() => {
          console.log('Name on card field not found');
        });
        
        // Credit card expiry iframe
        const cardExpiryFrame = await this.page.waitForSelector('iframe[id^="card-fields-expiry"]');
        const cardExpiryFrameContent = await cardExpiryFrame.contentFrame();
        await cardExpiryFrameContent.type('input', paymentInfo.cardExpiry, { delay: 100 });
        
        // Credit card CVV iframe
        const cardCvvFrame = await this.page.waitForSelector('iframe[id^="card-fields-verification"]');
        const cardCvvFrameContent = await cardCvvFrame.contentFrame();
        await cardCvvFrameContent.type('input', paymentInfo.cardCvv, { delay: 100 });
        
        // Complete order
        await this.page.click('#continue_button');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check for order confirmation
        const orderConfirmed = await this.page.evaluate(() => {
          return document.body.textContent.includes('Thank you') || 
                 document.body.textContent.includes('Order #') ||
                 document.body.textContent.includes('Your order is confirmed') ||
                 window.location.pathname.includes('/thank_you');
        });
        
        return orderConfirmed;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to complete checkout on Shopify store:', error);
      return false;
    }
  }
}

// Register the Shopify adapter with the factory
RetailerAdapterFactory.registerAdapter('shopify', ShopifyAdapter);