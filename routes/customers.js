const express = require('express');
const router = express.Router();
const shopify = require('../lib/shopify');

// List customers
router.get('/', async (req, res) => {
  try {
    const data = await shopify.getCustomers();
    res.render('customers/index', { customers: data.customers });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Show customer
router.get('/:id', async (req, res) => {
  try {
    const data = await shopify.getCustomer(req.params.id);
    res.render('customers/show', { customer: data.customer });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Create customer form
router.get('/new', (req, res) => {
  res.render('customers/new');
});

// Create customer
router.post('/', async (req, res) => {
  try {
    await shopify.createCustomer(req.body);
    res.redirect('/customers');
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Edit customer form
router.get('/:id/edit', async (req, res) => {
  try {
    const data = await shopify.getCustomer(req.params.id);
    res.render('customers/edit', { customer: data.customer });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    await shopify.updateCustomer(req.params.id, req.body);
    res.redirect(`/customers/${req.params.id}`);
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;