const express = require('express');
const router = express.Router();
const shopify = require('../lib/shopify');

// List orders
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'any';
    const data = await shopify.getOrders(50, status);
    res.render('orders/index', { orders: data.orders, status });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Show order
router.get('/:id', async (req, res) => {
  try {
    const data = await shopify.getOrder(req.params.id);
    res.render('orders/show', { order: data.order });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    await shopify.updateOrder(req.params.id, req.body);
    res.redirect(`/orders/${req.params.id}`);
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Cancel order
router.post('/:id/cancel', async (req, res) => {
  try {
    await shopify.cancelOrder(req.params.id);
    res.redirect(`/orders/${req.params.id}`);
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;