const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ShopifyAPI {
  constructor() {
    this.storeUrl = process.env.SHOPIFY_STORE_URL;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.clientId = process.env.SHOPIFY_CLIENT_ID;
    this.clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    this.baseUrl = `https://${this.storeUrl}/admin/api/2024-01`;
    this.headers = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    };
  }

  // Auto-refresh token if expired
  async refreshToken(code) {
    try {
      const response = await axios.post(`https://${this.storeUrl}/admin/oauth/access_token.json`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code
      });

      const newToken = response.data.access_token;
      
      // Update .env file
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /SHOPIFY_ACCESS_TOKEN=.*/,
        `SHOPIFY_ACCESS_TOKEN=${newToken}`
      );
      fs.writeFileSync(envPath, envContent);
      
      // Update current instance
      this.accessToken = newToken;
      this.headers['X-Shopify-Access-Token'] = newToken;
      
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get OAuth URL for authorization
  getOAuthUrl(redirectUri = 'http://localhost') {
    return `http://${this.storeUrl}/admin/oauth/authorize?client_id=${this.clientId}&redirect_uri=${redirectUri}`;
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: this.headers
      };
      if (data) config.data = data;
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // If 401/403, token might be expired
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Token expired! Run: node regenerate-token.js <CODE>');
        console.error('Get code from:', this.getOAuthUrl());
      }
      console.error('Shopify API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Products
  async getProducts(limit = 50) {
    return this.makeRequest('GET', `/products.json?limit=${limit}`);
  }

  async getProduct(id) {
    return this.makeRequest('GET', `/products/${id}.json`);
  }

  async createProduct(productData) {
    return this.makeRequest('POST', '/products.json', { product: productData });
  }

  async updateProduct(id, productData) {
    return this.makeRequest('PUT', `/products/${id}.json`, { product: productData });
  }

  async deleteProduct(id) {
    return this.makeRequest('DELETE', `/products/${id}.json`);
  }

  // Orders
  async getOrders(limit = 50, status = 'any') {
    return this.makeRequest('GET', `/orders.json?limit=${limit}&status=${status}`);
  }

  async getOrder(id) {
    return this.makeRequest('GET', `/orders/${id}.json`);
  }

  async updateOrder(id, orderData) {
    return this.makeRequest('PUT', `/orders/${id}.json`, { order: orderData });
  }

  async cancelOrder(id) {
    return this.makeRequest('POST', `/orders/${id}/cancel.json`);
  }

  // Customers
  async getCustomers(limit = 50) {
    return this.makeRequest('GET', `/customers.json?limit=${limit}`);
  }

  async getCustomer(id) {
    return this.makeRequest('GET', `/customers/${id}.json`);
  }

  async createCustomer(customerData) {
    return this.makeRequest('POST', '/customers.json', { customer: customerData });
  }

  async updateCustomer(id, customerData) {
    return this.makeRequest('PUT', `/customers/${id}.json`, { customer: customerData });
  }

  // Inventory
  async getInventoryLevels(locationId, limit = 50) {
    return this.makeRequest('GET', `/inventory_levels.json?location_ids=${locationId}&limit=${limit}`);
  }

  async getLocations() {
    return this.makeRequest('GET', '/locations.json');
  }

  async adjustInventory(inventoryItemId, locationId, available) {
    return this.makeRequest('POST', '/inventory_levels/adjust.json', {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available
    });
  }

  // Shop Info
  async getShopInfo() {
    return this.makeRequest('GET', '/shop.json');
  }

  // Dashboard Stats
  async getDashboardStats() {
    try {
      const [shop, products, orders, customers] = await Promise.all([
        this.getShopInfo(),
        this.makeRequest('GET', '/products/count.json'),
        this.makeRequest('GET', '/orders/count.json'),
        this.makeRequest('GET', '/customers/count.json')
      ]);

      return {
        shop: shop.shop,
        productsCount: products.count || 0,
        ordersCount: orders.count || 0,
        customersCount: customers.count || 0
      };
    } catch (error) {
      console.error('Dashboard stats error:', error.message);
      return {
        shop: { name: 'Store', domain: 'N/A', email: 'N/A', currency: 'N/A', plan_name: 'N/A' },
        productsCount: 0,
        ordersCount: 0,
        customersCount: 0
      };
    }
  }
}

module.exports = new ShopifyAPI();