const express = require('express');
const router = express.Router();
const shopify = require('../lib/shopify');

// Inventory levels
router.get('/', async (req, res) => {
  try {
    const locations = await shopify.getLocations();
    const locationId = req.query.location || locations.locations[0]?.id;
    
    if (!locationId) {
      return res.render('inventory/index', { inventory: [], locations: locations.locations });
    }
    
    const data = await shopify.getInventoryLevels(locationId);
    res.render('inventory/index', { 
      inventory: data.inventory_levels, 
      locations: locations.locations,
      selectedLocation: locationId
    });
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

// Adjust inventory
router.post('/adjust', async (req, res) => {
  try {
    const { inventory_item_id, location_id, available } = req.body;
    await shopify.adjustInventory(
      parseInt(inventory_item_id),
      parseInt(location_id),
      parseInt(available)
    );
    res.redirect(`/inventory?location=${location_id}`);
  } catch (error) {
    res.render('error', { error: error.message });
  }
});

module.exports = router;