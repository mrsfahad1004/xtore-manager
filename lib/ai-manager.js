const shopify = require('./shopify');

class AIManager {
  constructor() {
    this.commands = [
      { patterns: ['dashboard', 'stats', 'statistics', 'summary', 'overview', 'kitna', 'kitne'], handler: 'dashboard' },
      { patterns: ['product', 'products', 'items', 'saman', 'mal'], handler: 'listProducts' },
      { patterns: ['order', 'orders', 'order list', 'orders list', 'orders dikha', 'orders dikhao'], handler: 'listOrders' },
      { patterns: ['customer', 'customers', 'clients', 'log', 'customers list'], handler: 'listCustomers' },
      { patterns: ['inventory', 'stock', 'inventory list', 'stock list', 'bacha hua'], handler: 'listInventory' },
      { patterns: ['search product', 'product dhundh', 'product find', 'khoj product'], handler: 'searchProduct' },
      { patterns: ['search order', 'order dhundh', 'order find', 'khoj order'], handler: 'searchOrder' },
      { patterns: ['search customer', 'customer dhundh', 'customer find', 'khoj customer', 'khoj log'], handler: 'searchCustomer' },
      { patterns: ['new product', 'add product', 'product add', 'naya product', 'product bana'], handler: 'addProduct' },
      { patterns: ['new customer', 'add customer', 'customer add', 'naya customer', 'customer bana', 'naya customer ban'], handler: 'addCustomer' },
      { patterns: ['cancel order', 'order cancel'], handler: 'cancelOrder' },
      { patterns: ['shop info', 'store info', 'shop details', 'store name', 'dukan'], handler: 'shopInfo' },
      { patterns: ['help', 'commands', 'kya kar', 'kya kar sakta', 'kya kya hai', 'batao'], handler: 'help' },
      { patterns: ['hello', 'hi', 'hey', 'salam', 'assalam', 'aoa'], handler: 'greet' },
      { patterns: ['thanks', 'shukriya', 'thank you', 'meherbani'], handler: 'thanks' },
      { patterns: ['delete product', 'product delete', 'remove product', 'product hatao'], handler: 'deleteProduct' },
      { patterns: ['fulfilled', 'shipped', 'delivered', 'pending', 'cancelled'], handler: 'filterOrders' },
      { patterns: ['low stock', 'kam stock', 'out of stock', 'khatam'], handler: 'lowStock' },
      { patterns: ['expensive', 'mehnga', 'price', 'costly'], handler: 'expensiveProducts' },
      { patterns: ['cheap', 'sasta', 'affordable', 'kam price'], handler: 'cheapProducts' },
    ];
  }

  async processMessage(input) {
    const lower = input.toLowerCase().trim();
    const shopData = await this.getShopData();

    // Check for delete product with name/ID
    if (lower.match(/delete|remove|hatao|hatado/) && lower.match(/product/)) {
      const term = lower.replace(/delete|remove|hatao|hatado/g, '').replace(/product/g, '').trim();
      if (term) return await this.deleteProductByName(term);
      return { text: 'Batao kaunsa product delete karna hai? Product ka naam bhejo.\n\nExample: `delete product Blue T-Shirt`' };
    }

    // Check for cancel order with number
    if (lower.match(/cancel/) && lower.match(/order/)) {
      const num = lower.match(/#?(\d+)/);
      if (num) return await this.cancelOrderByNumber(num[1]);
      return { text: 'Batao kaunsa order cancel karna hai? Order number bhejo.\n\nExample: `cancel order #1001`' };
    }

    // Check for order status filters
    const statusMap = {
      'fulfilled': 'fulfilled', 'shipped': 'fulfilled', 'delivered': 'fulfilled',
      'pending': 'pending', 'open': 'open',
      'cancelled': 'cancelled', 'canceled': 'cancelled', 'refund': 'refunded'
    };
    for (const [key, status] of Object.entries(statusMap)) {
      if (lower.includes(key)) return await this.filterOrdersByStatus(status);
    }

    // Search for specific items
    if (lower.match(/search|dhundh|find|khoj/)) {
      if (lower.match(/product|item|saman/)) {
        const q = lower.replace(/search|dhundh|find|khoj/g, '').replace(/product|item|saman/g, '').trim();
        if (q) return await this.searchProduct(q);
        return { text: 'Kya dhundhna hai? Product ka naam batao.\n\nExample: `search product t-shirt`' };
      }
      if (lower.match(/order/)) {
        const q = lower.replace(/search|dhundh|find|khoj/g, '').replace(/order/g, '').trim();
        if (q) return await this.searchOrder(q);
        return { text: 'Order number batao.\n\nExample: `search order 1001`' };
      }
      if (lower.match(/customer|client|log/)) {
        const q = lower.replace(/search|dhundh|find|khoj/g, '').replace(/customer|client|log/g, '').trim();
        if (q) return await this.searchCustomer(q);
        return { text: 'Customer ka naam ya email batao.\n\nExample: `search customer john`' };
      }
    }

    // Low stock
    if (lower.match(/low stock|kam stock|out of stock|khatam/)) {
      return await this.lowStock();
    }

    // Expensive products
    if (lower.match(/expensive|mehnga|high price/)) {
      return await this.expensiveProducts();
    }

    // Cheap products
    if (lower.match(/cheap|sasta|affordable|kam price/)) {
      return await this.cheapProducts();
    }

    // Match against command patterns
    for (const cmd of this.commands) {
      for (const pattern of cmd.patterns) {
        if (lower.includes(pattern)) {
          return await this[cmd.handler](lower, shopData);
        }
      }
    }

    return this.smartResponse(lower, shopData);
  }

  async getShopData() {
    try {
      const shop = await shopify.getShopInfo();
      return shop.shop;
    } catch { return null; }
  }

  async dashboard() {
    try {
      const stats = await shopify.getDashboardStats();
      const shop = stats.shop;
      return {
        text: `**Store Dashboard**\n\n` +
          `**Shop:** ${shop.name}\n` +
          `**Domain:** ${shop.domain}\n` +
          `**Currency:** ${shop.currency}\n\n` +
          `**Products:** ${stats.productsCount}\n` +
          `**Orders:** ${stats.ordersCount}\n` +
          `**Customers:** ${stats.customersCount}\n\n` +
          `_Updated: ${new Date().toLocaleString()}_`
      };
    } catch (e) {
      return { text: `Dashboard load nahi ho paya: ${e.message}` };
    }
  }

  async listProducts() {
    try {
      const data = await shopify.getProducts(50);
      const products = data.products || [];
      if (!products.length) return { text: 'Koi product nahi mila store mein.' };

      let msg = `**Products (${products.length})**\n\n`;
      products.slice(0, 15).forEach((p, i) => {
        const price = p.variants?.[0]?.price || 'N/A';
        const inv = p.variants?.[0]?.inventory_quantity ?? 'N/A';
        msg += `**${i + 1}.** ${p.title} - **$${price}** | Stock: ${inv}\n`;
      });
      if (products.length > 15) msg += `\n_...aur ${products.length - 15} products hain. Sirf 15 dikha raha hoon._`;

      return { text: msg };
    } catch (e) {
      return { text: `Products load nahi ho paye: ${e.message}` };
    }
  }

  async listOrders() {
    try {
      const data = await shopify.getOrders(50);
      const orders = data.orders || [];
      if (!orders.length) return { text: 'Koi order nahi mila.' };

      let msg = `**Orders (${orders.length})**\n\n`;
      orders.slice(0, 15).forEach((o, i) => {
        const total = o.total_price || '0';
        const status = o.financial_status || 'unknown';
        msg += `**#${o.order_number}** | ${o.customer?.first_name || 'Guest'} ${o.customer?.last_name || ''} | $${total} | ${status}\n`;
      });
      if (orders.length > 15) msg += `\n_...aur ${orders.length - 15} orders hain._`;

      return { text: msg };
    } catch (e) {
      return { text: `Orders load nahi ho paye: ${e.message}` };
    }
  }

  async listCustomers() {
    try {
      const data = await shopify.getCustomers(50);
      const customers = data.customers || [];
      if (!customers.length) return { text: 'Koi customer nahi mila.' };

      let msg = `**Customers (${customers.length})**\n\n`;
      customers.slice(0, 15).forEach((c, i) => {
        msg += `**${i + 1}.** ${c.first_name} ${c.last_name} | ${c.email || 'No email'}\n`;
      });
      if (customers.length > 15) msg += `\n_...aur ${customers.length - 15} customers hain._`;

      return { text: msg };
    } catch (e) {
      return { text: `Customers load nahi ho paye: ${e.message}` };
    }
  }

  async listInventory() {
    try {
      const locations = await shopify.getLocations();
      const loc = locations.locations?.[0];
      if (!loc) return { text: 'Koi location nahi mili.' };

      const inv = await shopify.getInventoryLevels(loc.id, 50);
      const levels = inv.inventory_levels || [];
      if (!levels.length) return { text: 'Inventory data nahi mila.' };

      let msg = `**Inventory** (${loc.name})\n\n`;
      levels.slice(0, 15).forEach((l, i) => {
        const available = l.available ?? 0;
        const icon = available === 0 ? 'Out of Stock' : available < 5 ? 'Low Stock' : 'OK';
        msg += `**${i + 1}.** Item #${l.inventory_item_id} | Available: **${available}** | ${icon}\n`;
      });
      if (levels.length > 15) msg += `\n_...aur ${levels.length - 15} items hain._`;

      return { text: msg };
    } catch (e) {
      return { text: `Inventory load nahi ho payi: ${e.message}` };
    }
  }

  async searchProduct(query) {
    try {
      const data = await shopify.getProducts(250);
      const products = (data.products || []).filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.product_type?.toLowerCase().includes(query) ||
        p.vendor?.toLowerCase().includes(query) ||
        p.tags?.toLowerCase().includes(query)
      );
      if (!products.length) return { text: `"${query}" se koi product nahi mila.` };

      let msg = `**Search Results - Products**\n\n`;
      products.slice(0, 10).forEach((p, i) => {
        const price = p.variants?.[0]?.price || 'N/A';
        msg += `**${i + 1}.** ${p.title} | $${price} | ${p.product_type || 'N/A'}\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Search fail: ${e.message}` };
    }
  }

  async searchOrder(query) {
    try {
      const num = parseInt(query.replace('#', ''));
      if (num) {
        const data = await shopify.getOrder(num);
        if (data.order) {
          const o = data.order;
          return {
            text: `**Order #${o.order_number}**\n\n` +
              `**Customer:** ${o.customer?.first_name || 'Guest'} ${o.customer?.last_name || ''}\n` +
              `**Email:** ${o.email || 'N/A'}\n` +
              `**Total:** $${o.total_price}\n` +
              `**Status:** ${o.financial_status}\n` +
              `**Fulfillment:** ${o.fulfillment_status || 'unfulfilled'}\n` +
              `**Items:** ${o.line_items?.length || 0}\n` +
              `**Date:** ${o.created_at}`
          };
        }
      }
      return { text: `Order #${query} nahi mila.` };
    } catch (e) {
      return { text: `Order search fail: ${e.message}` };
    }
  }

  async searchCustomer(query) {
    try {
      const data = await shopify.getCustomers(250);
      const customers = (data.customers || []).filter(c =>
        c.first_name?.toLowerCase().includes(query) ||
        c.last_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
      if (!customers.length) return { text: `"${query}" se koi customer nahi mila.` };

      let msg = `**Search Results - Customers**\n\n`;
      customers.slice(0, 10).forEach((c, i) => {
        msg += `**${i + 1}.** ${c.first_name} ${c.last_name} | ${c.email || 'No email'} | Orders: ${c.orders_count || 0}\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Customer search fail: ${e.message}` };
    }
  }

  async cancelOrderByNumber(num) {
    try {
      const data = await shopify.getOrder(num);
      if (data.order) {
        await shopify.cancelOrder(data.order.id);
        return { text: `**Order #${num} cancel ho gaya!** Cancelled status: cancelled` };
      }
      return { text: `Order #${num} nahi mila.` };
    } catch (e) {
      return { text: `Order cancel nahi ho paya: ${e.message}` };
    }
  }

  async deleteProductByName(query) {
    try {
      const data = await shopify.getProducts(250);
      const product = (data.products || []).find(p =>
        p.title.toLowerCase().includes(query)
      );
      if (!product) return { text: `"${query}" se koi product nahi mila.` };

      await shopify.deleteProduct(product.id);
      return { text: `**"${product.title}" delete ho gaya!**` };
    } catch (e) {
      return { text: `Product delete nahi ho paya: ${e.message}` };
    }
  }

  async filterOrdersByStatus(status) {
    try {
      const data = await shopify.getOrders(50, status);
      const orders = data.orders || [];
      if (!orders.length) return { text: `${status} status ke koi orders nahi hain.` };

      let msg = `**${status.toUpperCase()} Orders (${orders.length})**\n\n`;
      orders.slice(0, 10).forEach((o, i) => {
        msg += `**#${o.order_number}** | ${o.customer?.first_name || 'Guest'} | $${o.total_price}\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Orders filter nahi ho paye: ${e.message}` };
    }
  }

  async lowStock() {
    try {
      const locations = await shopify.getLocations();
      const loc = locations.locations?.[0];
      if (!loc) return { text: 'Location nahi mili.' };

      const inv = await shopify.getInventoryLevels(loc.id, 250);
      const low = (inv.inventory_levels || []).filter(l => (l.available ?? 0) < 5);
      if (!low.length) return { text: 'Sab items ka stock theek hai!' };

      let msg = `**Low Stock Items (${low.length})**\n\n`;
      low.slice(0, 15).forEach((l, i) => {
        const icon = l.available === 0 ? 'OUT' : 'LOW';
        msg += `**${i + 1}.** Item #${l.inventory_item_id} | Available: **${l.available ?? 0}** | ${icon}\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Stock check nahi ho paya: ${e.message}` };
    }
  }

  async expensiveProducts() {
    try {
      const data = await shopify.getProducts(50);
      const products = (data.products || [])
        .map(p => ({ ...p, price: parseFloat(p.variants?.[0]?.price) || 0 }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 10);

      let msg = `**Most Expensive Products**\n\n`;
      products.forEach((p, i) => {
        msg += `**${i + 1}.** ${p.title} - **$${p.price.toFixed(2)}**\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Products load nahi ho paye: ${e.message}` };
    }
  }

  async cheapProducts() {
    try {
      const data = await shopify.getProducts(50);
      const products = (data.products || [])
        .map(p => ({ ...p, price: parseFloat(p.variants?.[0]?.price) || 0 }))
        .filter(p => p.price > 0)
        .sort((a, b) => a.price - b.price)
        .slice(0, 10);

      let msg = `**Cheapest Products**\n\n`;
      products.forEach((p, i) => {
        msg += `**${i + 1}.** ${p.title} - **$${p.price.toFixed(2)}**\n`;
      });
      return { text: msg };
    } catch (e) {
      return { text: `Products load nahi ho paye: ${e.message}` };
    }
  }

  async shopInfo(shopData) {
    const shop = shopData || await this.getShopData();
    if (!shop) return { text: 'Shop info load nahi ho payi.' };
    return {
      text: `**Store Information**\n\n` +
        `**Name:** ${shop.name}\n` +
        `**Domain:** ${shop.domain}\n` +
        `**Email:** ${shop.email}\n` +
        `**Phone:** ${shop.phone || 'N/A'}\n` +
        `**Address:** ${shop.address1 || ''} ${shop.city || ''} ${shop.country || ''}\n` +
        `**Currency:** ${shop.currency}\n` +
        `**Plan:** ${shop.plan_name}\n` +
        `**Created:** ${shop.created_at}`
    };
  }

  async help() {
    return {
      text: `**Xtore AI Manager - Commands**\n\n` +
        `**Dashboard:**\n` +
        `  dashboard / stats / overview\n\n` +
        `**Products:**\n` +
        `  products / product list\n` +
        `  search product [name]\n` +
        `  expensive products / cheap products\n` +
        `  delete product [name]\n\n` +
        `**Orders:**\n` +
        `  orders / order list\n` +
        `  search order [number]\n` +
        `  fulfilled / pending / cancelled orders\n` +
        `  cancel order #[number]\n\n` +
        `**Customers:**\n` +
        `  customers / customer list\n` +
        `  search customer [name/email]\n\n` +
        `**Inventory:**\n` +
        `  inventory / stock\n` +
        `  low stock\n\n` +
        `**Store:**\n` +
        `  shop info / store name\n\n` +
        `Urdu/Hindi mein bhi likh sakte ho!`
    };
  }

  async greet() {
    return {
      text: `**Welcome to Xtore AI Manager!**\n\n` +
        `Main aapki help kar sakta hoon store manage karne mein.\n\n` +
        `Kuch bhi poochho ya command do:\n` +
        `- Products dikhao\n` +
        `- Orders list karo\n` +
        `- Low stock check karo\n` +
        `- Store info batao\n\n` +
        `Type **help** for full commands list.`
    };
  }

  async thanks() {
    return { text: '**Shukriya!** Koi aur help chahiye to poochho. I am always here!' };
  }

  smartResponse(input, shopData) {
    const greetings = ['hello', 'hi', 'hey', 'salam', 'aoa', 'kya haal', 'kaise ho', 'kaisa hai'];
    if (greetings.some(g => input.includes(g))) return this.greet();

    const thanks = ['thanks', 'shukriya', 'thank', 'meherbani'];
    if (thanks.some(t => input.includes(t))) return this.thanks();

    if (input.includes('?')) {
      if (input.match(/product|item|saman/)) return this.listProducts();
      if (input.match(/order/)) return this.listOrders();
      if (input.match(/customer|client/)) return this.listCustomers();
      if (input.match(/stock|inventory/)) return this.lowStock();
      if (input.match(/shop|store|dukan/)) return this.shopInfo(shopData);
      return {
        text: `Samajh nahi aaya. Yeh try karo:\n\n` +
          `- Products dikhao\n` +
          `- Orders list karo\n` +
          `- Search product [name]\n` +
          `- Dashboard\n` +
          `- Help`
      };
    }

    if (input.match(/manage|handle|karo|chalao|sambhal/)) {
      return {
        text: `**Main yeh sab manage kar sakta hoon:**\n\n` +
          `- Products: add, search, delete, list\n` +
          `- Orders: list, search, cancel, filter by status\n` +
          `- Customers: list, search\n` +
          `- Inventory: view, check low stock\n` +
          `- Dashboard: stats overview\n\n` +
          `Kya karna hai?`
      };
    }

    return {
      text: `**"${input}"** samajh nahi aaya.\n\n` +
        `Try karo:\n` +
        `- **help** - sab commands dekho\n` +
        `- **products** - product list\n` +
        `- **orders** - order list\n` +
        `- **dashboard** - store overview\n` +
        `- **customers** - customer list\n` +
        `- **inventory** - stock check`
    };
  }
}

module.exports = new AIManager();
