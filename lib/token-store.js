const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'tokens.json');

class TokenStore {
  constructor() {
    this.tokens = {};
    this._load();
  }

  _load() {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(STORE_PATH)) {
        this.tokens = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      }
    } catch { this.tokens = {}; }

    // Fallback: environment token
    if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_STORE_URL) {
      const shop = process.env.SHOPIFY_STORE_URL;
      if (!this.tokens[shop]) {
        this.tokens[shop] = {
          accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
          createdAt: 'env-fallback',
          source: 'environment'
        };
      }
    }
  }

  _save() {
    try {
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.tokens, null, 2));
    } catch (e) { console.error('Token save error:', e.message); }
  }

  set(shop, accessToken) {
    this.tokens[shop] = {
      accessToken,
      createdAt: new Date().toISOString(),
      source: 'oauth'
    };
    this._save();
  }

  get(shop) {
    // Direct match
    if (this.tokens[shop]) return this.tokens[shop].accessToken;
    // Try with .myshopify.com suffix
    if (!shop.includes('.myshopify.com')) {
      const fullShop = `${shop}.myshopify.com`;
      if (this.tokens[fullShop]) return this.tokens[fullShop].accessToken;
    }
    // Try without suffix
    const shortShop = shop.replace('.myshopify.com', '');
    if (this.tokens[shortShop]) return this.tokens[shortShop].accessToken;
    return null;
  }

  remove(shop) {
    delete this.tokens[shop];
    this._save();
  }

  getAll() {
    return Object.keys(this.tokens);
  }
}

module.exports = new TokenStore();
