const tokenStore = require('../lib/token-store');

function authMiddleware(req, res, next) {
  const shop = req.query.shop || req.session?.shop;

  if (shop) {
    const token = tokenStore.get(shop);
    if (token) {
      req.shop = shop;
      req.accessToken = token;
      req.session.shop = shop;
      return next();
    }
  }

  if (req.session?.shop) {
    const token = tokenStore.get(req.session.shop);
    if (token) {
      req.shop = req.session.shop;
      req.accessToken = token;
      return next();
    }
  }

  const loginUrl = `/auth/login?shop=${shop || ''}`;
  if (req.path === '/auth/callback') return next();

  return res.redirect(loginUrl);
}

module.exports = authMiddleware;
