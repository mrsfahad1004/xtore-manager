const express = require('express');
const router = express.Router();
const shopify = require('../lib/shopify');

// List products
router.get('/', async (req, res) => {
  try {
    const data = await shopify.getProducts();
    res.render('products/index', { products: data.products });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Show product
router.get('/:id', async (req, res) => {
  try {
    const data = await shopify.getProduct(req.params.id);
    res.render('products/show', { product: data.product });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Create product form
router.get('/new', (req, res) => {
  res.render('products/new');
});

// Create product
router.post('/', async (req, res) => {
  try {
    await shopify.createProduct(req.body);
    res.redirect('/products');
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Edit product form
router.get('/:id/edit', async (req, res) => {
  try {
    const data = await shopify.getProduct(req.params.id);
    res.render('products/edit', { product: data.product });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    await shopify.updateProduct(req.params.id, req.body);
    res.redirect(`/products/${req.params.id}`);
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await shopify.deleteProduct(req.params.id);
    res.redirect('/products');
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;