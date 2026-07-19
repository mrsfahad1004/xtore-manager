const tokenStore = require('../lib/token-store');

function authMiddleware(req, res, next) {
  let shop = req.query.shop || req.session?.shop;

  if (shop) {
    let token = tokenStore.get(shop);
    if (token) {
      req.shop = shop;
      req.accessToken = token;
      req.session.shop = shop;
      return next();
    }
  }

  if (req.session?.shop) {
    let token = tokenStore.get(req.session.shop);
    if (token) {
      req.shop = req.session.shop;
      req.accessToken = token;
      return next();
    }
  }

  // Fallback: env variable (Render deployment)
  if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_STORE_URL) {
    req.shop = process.env.SHOPIFY_STORE_URL;
    req.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    req.session.shop = process.env.SHOPIFY_STORE_URL;
    return next();
  }

  // No token found - redirect to login
  if (req.path === '/auth/callback') return next();
  return res.redirect(`/auth/login?shop=${shop || ''}`);
}

module.exports = authMiddleware;
