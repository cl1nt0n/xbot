import { RetailerAdapter, RetailerAdapterFactory } from './RetailerAdapter';

/**
 * Amazon-specific adapter implementation
 */
export class AmazonAdapter extends RetailerAdapter {
  /**
   * Product information type for Amazon
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
    url: string;
  }

  /**
   * Constructor for Amazon adapter
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   */
  constructor(browser: any, options: any = {}) {
    super(browser, {
      baseUrl: options.baseUrl || 'https://www.amazon.com',
      name: options.name || 'Amazon'
    });
    
    // Override selectors with Amazon-specific selectors
    this.selectors = {
      productTitle: '#productTitle',
      productPrice: '#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen',
      productImage: '#landingImage',
      productOptions: '#variation_',
      addToCartButton: '#add-to-cart-button',
      checkoutButton: '#sc-buy-box-ptc-button',
      sizeSelector: '#native_dropdown_selected_size_name',
      colorSelector: '#variation_color_name ul li',
      quantityInput: '#quantity',
      loginForm: {
        emailField: '#ap_email',
        passwordField: '#ap_password',
        submitButton: '#signInSubmit'
      },
      checkoutForm: {
        nameField: '#enterAddressFullName',
        addressField: '#enterAddressAddressLine1',
        cityField: '#enterAddressCity',
        stateField: '#enterAddressStateOrRegion',
        zipField: '#enterAddressPostalCode',
        countryField: '#enterAddressCountryCode',
        phoneField: '#enterAddressPhoneNumber',
        cardNumberField: '#addCreditCardNumber',
        cardExpiryField: '#addCreditCardExpiration',
        cardCvvField: '#addCreditCardVerificationNumber',
        submitButton: '.a-button-input[type="submit"]'
      }
    };
  }

  /**
   * Set up page with Amazon-specific configurations
   */
  protected async setupPage(): Promise<void> {
    await super.setupPage();
    
    // Additional setup for Amazon
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
    
    // Enable cookies for persistent sessions
    await this.page.setCookie({
      name: 'session-id',
      value: 'session-id-value',
      domain: '.amazon.com'
    });
  }

  /**
   * Check if a product is available on Amazon
   * @param url - URL of the product
   * @returns Promise<boolean> - True if product is available
   */
  async checkAvailability(url?: string): Promise<boolean> {
    if (url) {
      await this.loadProductPage(url);
    }
    
    try {
      // Check for common availability indicators on Amazon
      const availabilityText = await this.page.evaluate(() => {
        const availabilityElement = document.querySelector('#availability, #outOfStock');
        return availabilityElement ? availabilityElement.textContent.trim() : '';
      });
      
      // Check add to cart button
      const addToCartButton = await this.page.$(this.selectors.addToCartButton);
      
      // Check if the product is available based on text and button
      return addToCartButton !== null && 
        !availabilityText.includes('Currently unavailable') && 
        !availabilityText.includes('Out of Stock');
    } catch (error) {
      console.error('Failed to check availability on Amazon:', error);
      return false;
    }
  }

  /**
   * Get product information from Amazon
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
        
        // Extract availability
        const availabilityElement = document.querySelector('#availability, #outOfStock');
        const availabilityText = availabilityElement ? availabilityElement.textContent.trim() : '';
        const available = !availabilityText.includes('Currently unavailable') && 
                          !availabilityText.includes('Out of Stock');
        
        // Extract size options
        const sizeOptions: string[] = [];
        const sizeSelector = document.querySelector(selectors.sizeSelector) as HTMLSelectElement;
        if (sizeSelector) {
          Array.from(sizeSelector.options).forEach((option: HTMLOptionElement) => {
            if (option.value && !option.disabled) {
              sizeOptions.push(option.textContent?.trim() || '');
            }
          });
        }
        
        // Extract color options
        const colorOptions: string[] = [];
        const colorSelector = document.querySelectorAll(selectors.colorSelector);
        colorSelector.forEach((color: Element) => {
          const colorName = color.getAttribute('title')?.replace('Click to select ', '');
          if (colorName) {
            colorOptions.push(colorName);
          }
        });
        
        return {
          title,
          price,
          imageUrl,
          available,
          options: {
            sizes: sizeOptions,
            colors: colorOptions
          },
          url: window.location.href
        };
      }, this.selectors);
      
      return productInfo;
    } catch (error) {
      console.error('Failed to get product info from Amazon:', error);
      return {
        title: '',
        price: '',
        imageUrl: '',
        available: false,
        options: {
          sizes: [],
          colors: []
        },
        url: url || ''
      };
    }
  }

  /**
   * Select color option on Amazon
   * @param color - Color to select
   * @returns Promise<boolean> - True if color selected successfully
   */
  async selectColor(color: string): Promise<boolean> {
    try {
      const colorSelected = await this.page.evaluate((colorToSelect: string, selector: string) => {
        const colorElements = document.querySelectorAll(selector);
        for (const colorElement of Array.from(colorElements)) {
          const colorName = colorElement.getAttribute('title')?.replace('Click to select ', '');
          if (colorName?.toLowerCase() === colorToSelect.toLowerCase()) {
            (colorElement as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, color, this.selectors.colorSelector);
      
      if (colorSelected) {
        // Wait for page to update after color selection
        await this.page.waitForTimeout(1000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select color on Amazon:', error);
      return false;
    }
  }

  /**
   * Override add to cart method with Amazon-specific implementation
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
      // Select size if provided
      if (options.size && this.selectors.sizeSelector) {
        await this.page.waitForSelector(this.selectors.sizeSelector, { timeout: 5000 })
          .then(async () => {
            await this.page.select(this.selectors.sizeSelector, options.size || '');
          })
          .catch(() => {
            console.log('Size selector not found on this product');
          });
      }
      
      // Select color if provided
      if (options.color) {
        await this.selectColor(options.color);
      }
      
      // Set quantity if provided
      if (options.quantity && this.selectors.quantityInput) {
        await this.page.waitForSelector(this.selectors.quantityInput, { timeout: 5000 })
          .then(async () => {
            await this.page.select(this.selectors.quantityInput, options.quantity?.toString() || '1');
          })
          .catch(() => {
            console.log('Quantity selector not found on this product');
          });
      }
      
      // Click the add to cart button
      await this.page.waitForSelector(this.selectors.addToCartButton);
      await this.page.click(this.selectors.addToCartButton);
      
      // Wait for confirmation that product was added to cart
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        .catch(() => {
          console.log('No navigation after adding to cart, checking for confirmation');
        });
      
      // Check for success message or cart icon update
      const success = await this.page.evaluate(() => {
        // Check for success message
        const successMsg = document.querySelector('#huc-v2-order-row-confirm-text');
        if (successMsg && successMsg.textContent.includes('Added to Cart')) {
          return true;
        }
        
        // Check cart count
        const cartCount = document.querySelector('#nav-cart-count');
        return cartCount && parseInt(cartCount.textContent, 10) > 0;
      });
      
      return success;
    } catch (error) {
      console.error('Failed to add product to cart on Amazon:', error);
      return false;
    }
  }

  /**
   * Override the checkout method with Amazon-specific implementation
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
      await this.page.goto(`${this.baseUrl}/gp/cart/view.html`, { waitUntil: 'networkidle2' });
      
      // Click the proceed to checkout button
      await this.page.waitForSelector(this.selectors.checkoutButton);
      await this.page.click(this.selectors.checkoutButton);
      
      // Wait for checkout page to load
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Fill in shipping information if present
      const shippingFormPresent = await this.page.$(this.selectors.checkoutForm.nameField) !== null;
      
      if (shippingFormPresent) {
        await this.page.type(this.selectors.checkoutForm.nameField, paymentInfo.name, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.addressField, paymentInfo.address, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cityField, paymentInfo.city, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.stateField, paymentInfo.state, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.zipField, paymentInfo.zip, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.phoneField, paymentInfo.phone, { delay: 100 });
        
        // Continue to payment
        await this.page.click('input[type="submit"]');
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Fill in payment information
      const paymentFormPresent = await this.page.$(this.selectors.checkoutForm.cardNumberField) !== null;
      
      if (paymentFormPresent) {
        await this.page.type(this.selectors.checkoutForm.cardNumberField, paymentInfo.cardNumber, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cardExpiryField, paymentInfo.cardExpiry, { delay: 100 });
        await this.page.type(this.selectors.checkoutForm.cardCvvField, paymentInfo.cardCvv, { delay: 100 });
        
        // Complete order
        await this.page.click(this.selectors.checkoutForm.submitButton);
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Check for order confirmation
        const orderConfirmed = await this.page.evaluate(() => {
          return document.body.textContent.includes('Thank you for your order') || 
                 document.body.textContent.includes('Order placed') ||
                 window.location.href.includes('thankyou');
        });
        
        return orderConfirmed;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to complete checkout on Amazon:', error);
      return false;
    }
  }

  /**
   * Handle CAPTCHA on Amazon
   * @param request - Request object
   */
  protected async handleCaptcha(request: any): Promise<void> {
    const url = request.url();
    
    if (url.includes('captcha') || url.includes('recaptcha')) {
      console.warn('CAPTCHA detected on Amazon');
      
      // Log the event for manual handling
      await this.page.screenshot({ path: 'amazon-captcha.png' });
      
      // Pause for manual intervention if needed
      // This could be replaced with an actual CAPTCHA solving service
      await this.page.waitForTimeout(30000);
      
      request.continue();
    } else {
      request.continue();
    }
  }
}

// Register the Amazon adapter with the factory
RetailerAdapterFactory.registerAdapter('amazon', AmazonAdapter);