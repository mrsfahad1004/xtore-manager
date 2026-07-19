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
      createdAt: new Date().toISOString()
    };
    this._save();
  }

  get(shop) {
    const entry = this.tokens[shop];
    return entry ? entry.accessToken : null;
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
