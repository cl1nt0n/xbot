/**
 * Abstract class that defines the interface for all retailer adapters
 * This class serves as a template for creating adapters for different retailers
 * (Amazon, Shopify, Pokemoncenter, Nike, NVIDIA, LEGO, store.nintendo, playstation, etc.)
 */
export abstract class RetailerAdapter {
  protected browser: any;
  protected page: any;
  protected initialized: boolean = false;
  protected baseUrl: string;
  protected name: string;
  
  /**
   * Base selectors that can be overridden by specific adapters
   */
  protected selectors = {
    productTitle: '',
    productPrice: '',
    productImage: '',
    productOptions: '',
    addToCartButton: '',
    checkoutButton: '',
    sizeSelector: '',
    colorSelector: '',
    quantityInput: '',
    loginForm: {
      emailField: '',
      passwordField: '',
      submitButton: ''
    },
    checkoutForm: {
      nameField: '',
      addressField: '',
      cityField: '',
      stateField: '',
      zipField: '',
      countryField: '',
      phoneField: '',
      cardNumberField: '',
      cardExpiryField: '',
      cardCvvField: '',
      submitButton: ''
    }
  };

  /**
   * Constructor for retailer adapter
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   */
  constructor(browser: any, options: { baseUrl?: string, name?: string } = {}) {
    this.browser = browser;
    this.baseUrl = options.baseUrl || '';
    this.name = options.name || this.constructor.name.replace('Adapter', '');
  }

  /**
   * Initialize the adapter
   * This should be called before using any other methods
   * @returns Promise<boolean> - True if initialized successfully
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      this.page = await this.browser.newPage();
      await this.setupPage();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error(`Failed to initialize ${this.name} adapter:`, error);
      return false;
    }
  }

  /**
   * Set up page with necessary configurations
   * This can be overridden by specific adapters
   */
  protected async setupPage(): Promise<void> {
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set up request interception for CAPTCHA avoidance
    await this.page.setRequestInterception(true);
    this.page.on('request', (request: any) => {
      if (request.resourceType() === 'image' || request.resourceType() === 'font') {
        request.continue();
      } else if (request.url().includes('captcha') || request.url().includes('recaptcha')) {
        // Handle CAPTCHA detection
        this.handleCaptcha(request);
      } else {
        request.continue();
      }
    });
  }

  /**
   * Handle CAPTCHA detection
   * This can be overridden by specific adapters
   * @param request - Request object
   */
  protected async handleCaptcha(request: any): Promise<void> {
    // Default implementation - continue the request
    request.continue();
  }

  /**
   * Load a product page
   * @param url - URL of the product
   * @returns Promise<boolean> - True if loaded successfully
   */
  async loadProductPage(url: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      return true;
    } catch (error) {
      console.error(`Failed to load product page for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Check if a product is available
   * This should be implemented by specific adapters
   * @param url - URL of the product
   * @returns Promise<boolean> - True if product is available
   */
  abstract checkAvailability(url?: string): Promise<boolean>;

  /**
   * Get product information
   * This should be implemented by specific adapters
   * @param url - URL of the product
   * @returns Promise<ProductInfo> - Product information
   */
  abstract getProductInfo(url?: string): Promise<any>;

  /**
   * Select product options (size, color, etc.)
   * @param options - Options to select
   * @returns Promise<boolean> - True if options selected successfully
   */
  async selectProductOptions(options: { 
    size?: string, 
    color?: string, 
    quantity?: number 
  }): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      // Select size if provided
      if (options.size && this.selectors.sizeSelector) {
        await this.page.waitForSelector(this.selectors.sizeSelector);
        await this.page.select(this.selectors.sizeSelector, options.size);
      }
      
      // Select color if provided
      if (options.color && this.selectors.colorSelector) {
        await this.page.waitForSelector(this.selectors.colorSelector);
        await this.page.select(this.selectors.colorSelector, options.color);
      }
      
      // Set quantity if provided
      if (options.quantity && this.selectors.quantityInput) {
        await this.page.waitForSelector(this.selectors.quantityInput);
        await this.page.type(this.selectors.quantityInput, options.quantity.toString(), { delay: 100 });
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to select product options for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Add product to cart
   * This method can be overridden by specific adapters
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
      // Select product options
      await this.selectProductOptions(options);
      
      // Click the add to cart button
      await this.page.waitForSelector(this.selectors.addToCartButton);
      await this.page.click(this.selectors.addToCartButton);
      
      // Wait for confirmation that product was added to cart
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error(`Failed to add product to cart for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Log in to the retailer website
   * This method can be overridden by specific adapters
   * @param credentials - Login credentials
   * @returns Promise<boolean> - True if logged in successfully
   */
  async login(credentials: { email: string, password: string }): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      await this.page.waitForSelector(this.selectors.loginForm.emailField);
      await this.page.type(this.selectors.loginForm.emailField, credentials.email, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.loginForm.passwordField);
      await this.page.type(this.selectors.loginForm.passwordField, credentials.password, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.loginForm.submitButton);
      await this.page.click(this.selectors.loginForm.submitButton);
      
      // Wait for login completion
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error(`Failed to log in to ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Complete checkout process
   * This method can be overridden by specific adapters
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
    if (!this.initialized) await this.initialize();
    
    try {
      // Navigate to checkout page if not already there
      await this.page.waitForSelector(this.selectors.checkoutButton);
      await this.page.click(this.selectors.checkoutButton);
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Fill in shipping information
      await this.page.waitForSelector(this.selectors.checkoutForm.nameField);
      await this.page.type(this.selectors.checkoutForm.nameField, paymentInfo.name, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.addressField);
      await this.page.type(this.selectors.checkoutForm.addressField, paymentInfo.address, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.cityField);
      await this.page.type(this.selectors.checkoutForm.cityField, paymentInfo.city, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.stateField);
      await this.page.type(this.selectors.checkoutForm.stateField, paymentInfo.state, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.zipField);
      await this.page.type(this.selectors.checkoutForm.zipField, paymentInfo.zip, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.countryField);
      await this.page.type(this.selectors.checkoutForm.countryField, paymentInfo.country, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.phoneField);
      await this.page.type(this.selectors.checkoutForm.phoneField, paymentInfo.phone, { delay: 100 });
      
      // Fill in payment information
      await this.page.waitForSelector(this.selectors.checkoutForm.cardNumberField);
      await this.page.type(this.selectors.checkoutForm.cardNumberField, paymentInfo.cardNumber, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.cardExpiryField);
      await this.page.type(this.selectors.checkoutForm.cardExpiryField, paymentInfo.cardExpiry, { delay: 100 });
      
      await this.page.waitForSelector(this.selectors.checkoutForm.cardCvvField);
      await this.page.type(this.selectors.checkoutForm.cardCvvField, paymentInfo.cardCvv, { delay: 100 });
      
      // Submit checkout form
      await this.page.waitForSelector(this.selectors.checkoutForm.submitButton);
      await this.page.click(this.selectors.checkoutForm.submitButton);
      
      // Wait for checkout completion
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      return true;
    } catch (error) {
      console.error(`Failed to complete checkout for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Close the adapter and release resources
   * @returns Promise<void>
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    this.initialized = false;
  }
}

/**
 * Factory class for creating retailer adapters
 */
export class RetailerAdapterFactory {
  private static adapters: Map<string, typeof RetailerAdapter> = new Map();

  /**
   * Register a retailer adapter
   * @param retailerName - Name of the retailer
   * @param adapterClass - Adapter class
   */
  static registerAdapter(retailerName: string, adapterClass: typeof RetailerAdapter): void {
    this.adapters.set(retailerName.toLowerCase(), adapterClass);
  }

  /**
   * Create a retailer adapter
   * @param retailerName - Name of the retailer
   * @param browser - Browser instance
   * @param options - Additional options for the adapter
   * @returns RetailerAdapter - Instance of the retailer adapter
   */
  static createAdapter(retailerName: string, browser: any, options: any = {}): RetailerAdapter {
    const adapterClass = this.adapters.get(retailerName.toLowerCase());
    
    if (!adapterClass) {
      throw new Error(`No adapter registered for retailer: ${retailerName}`);
    }
    
    return new adapterClass(browser, options);
  }

  /**
   * Get adapter class for a retailer
   * @param retailerName - Name of the retailer
   * @returns typeof RetailerAdapter - Adapter class
   */
  static getAdapterClass(retailerName: string): typeof RetailerAdapter {
    const adapterClass = this.adapters.get(retailerName.toLowerCase());
    
    if (!adapterClass) {
      throw new Error(`No adapter registered for retailer: ${retailerName}`);
    }
    
    return adapterClass;
  }

  /**
   * Check if an adapter exists for a retailer
   * @param retailerName - Name of the retailer
   * @returns boolean - True if adapter exists
   */
  static hasAdapter(retailerName: string): boolean {
    return this.adapters.has(retailerName.toLowerCase());
  }

  /**
   * Get all registered adapters
   * @returns string[] - Names of all registered adapters
   */
  static getRegisteredAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}