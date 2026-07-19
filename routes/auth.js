const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const tokenStore = require('../lib/token-store');

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_URL;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders,read_customers,write_customers,read_inventory,read_content';
const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

// GET /auth/login - Start OAuth
router.get('/login', (req, res) => {
  let shop = req.query.shop;
  if (!shop) {
    return res.send(`
      <form method="GET" action="/auth/login" style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f4f6f8;font-family:sans-serif;">
        <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px;width:100%;">
          <h2 style="margin-bottom:10px;">Xtore Manager</h2>
          <p style="color:#666;margin-bottom:20px;">Shopify store se connect karein</p>
          <input name="shop" placeholder="your-store.myshopify.com" required
            style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:15px;">
          <button type="submit" style="width:100%;padding:12px;background:#5c6ac4;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:bold;">
            Connect Store
          </button>
        </div>
      </form>
    `);
  }

  shop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!shop.includes('.myshopify.com')) shop = `${shop}.myshopify.com`;

  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  req.session.oauthShop = shop;

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(APP_URL + '/auth/callback')}&state=${state}`;

  res.redirect(authUrl);
});

// GET /auth/callback - OAuth callback
router.get('/callback', async (req, res) => {
  const { shop, hmac, code, state } = req.query;

  if (!shop || !hmac || !code) {
    return res.status(400).send('Missing required parameters.');
  }

  if (state !== req.session.oauthState) {
    return res.status(403).send('Invalid state parameter. Session expired.');
  }

  const map = Object.assign({}, req.query);
  delete map['hmac'];
  delete map['signature'];
  const message = new URLSearchParams(map).toString();
  const generatedHmac = crypto.createHmac('sha256', CLIENT_SECRET).update(message).digest('hex');

  if (generatedHmac !== hmac) {
    return res.status(403).send('HMAC validation failed. Request tampered.');
  }

  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token.json`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    });

    const accessToken = response.data.access_token;
    const scopes = response.data.scope;

    tokenStore.set(shop, accessToken);
    req.session.shop = shop;
    req.session.accessToken = accessToken;

    delete req.session.oauthState;
    delete req.session.oauthShop;

    res.redirect(`/?shop=${shop}`);
  } catch (error) {
    console.error('OAuth token exchange failed:', error.response?.data || error.message);
    res.status(500).send('Token exchange failed. Please try again.');
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  const shop = req.session?.shop;
  if (shop) tokenStore.remove(shop);
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
