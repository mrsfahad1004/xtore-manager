require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'xtore-manager-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' }
}));

// Auth routes (no auth required)
app.use('/auth', require('./routes/auth'));

// API chat (uses session token)
app.use('/api/chat', require('./routes/chat'));

// Protected routes - need Shopify auth
const authMiddleware = require('./middleware/auth');
app.use('/', authMiddleware, require('./routes/index'));
app.use('/products', authMiddleware, require('./routes/products'));
app.use('/orders', authMiddleware, require('./routes/orders'));
app.use('/customers', authMiddleware, require('./routes/customers'));
app.use('/inventory', authMiddleware, require('./routes/inventory'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  try {
    res.status(500).render('error', { error: err.message || 'Something went wrong' });
  } catch (e) {
    res.status(500).send('Something went wrong. <a href="/">Go Home</a>');
  }
});

// Prevent server crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err?.message || err);
});

// Start server
app.listen(PORT, () => {
  console.log(`Xtore Manager running on http://localhost:${PORT}`);
});
