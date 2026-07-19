const express = require('express');
const router = express.Router();
const shopify = require('../lib/shopify');

// Dashboard
router.get('/', async (req, res) => {
  try {
    const stats = await shopify.getDashboardStats();
    res.render('dashboard', { stats });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;