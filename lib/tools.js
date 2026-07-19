const shopify = require('./shopify');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOOLS = {
  // Dashboard
  dashboard: {
    name: 'Dashboard',
    icon: 'fas fa-chart-line',
    color: '#667eea',
    description: 'Store overview & stats',
    params: [],
    async execute() {
      const stats = await shopify.getDashboardStats();
      const s = stats.shop;
      return {
        type: 'dashboard',
        data: {
          shop: s.name,
          domain: s.domain,
          currency: s.currency,
          plan: s.plan_name,
          email: s.email,
          products: stats.productsCount,
          orders: stats.ordersCount,
          customers: stats.customersCount
        }
      };
    }
  },

  // Products
  list_products: {
    name: 'List Products',
    icon: 'fas fa-box',
    color: '#f093fb',
    description: 'Show all products',
    params: [],
    async execute() {
      const data = await shopify.getProducts(50);
      const products = data.products || [];
      return {
        type: 'table',
        title: `Products (${products.length})`,
        columns: ['Title', 'Type', 'Vendor', 'Price', 'Status'],
        rows: products.map(p => [
          p.title,
          p.product_type || '-',
          p.vendor || '-',
          `$${p.variants?.[0]?.price || 0}`,
          p.status || 'active'
        ]),
        empty: 'Koi product nahi hai store mein.'
      };
    }
  },

  search_products: {
    name: 'Search Products',
    icon: 'fas fa-search',
    color: '#43e97b',
    description: 'Find products by name/type/vendor',
    params: ['query'],
    async execute({ query }) {
      const data = await shopify.getProducts(250);
      const q = query.toLowerCase();
      const products = (data.products || []).filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.product_type?.toLowerCase().includes(q) ||
        p.vendor?.toLowerCase().includes(q) ||
        p.tags?.toLowerCase().includes(q)
      );
      return {
        type: 'table',
        title: `Search: "${query}" (${products.length} results)`,
        columns: ['Title', 'Type', 'Price', 'Status'],
        rows: products.map(p => [
          p.title,
          p.product_type || '-',
          `$${p.variants?.[0]?.price || 0}`,
          p.status || 'active'
        ]),
        empty: `"${query}" se koi product nahi mila.`
      };
    }
  },

  create_product: {
    name: 'Create Product',
    icon: 'fas fa-plus-circle',
    color: '#4facfe',
    description: 'Add new product to store',
    params: ['title', 'price', 'body_html', 'vendor', 'product_type'],
    async execute({ title, price, body_html, vendor, product_type }) {
      if (!title) return { type: 'error', message: 'Product title zaruri hai!' };
      const productData = { title };
      if (price) productData.variants = [{ price: parseFloat(price) }];
      if (body_html) productData.body_html = body_html;
      if (vendor) productData.vendor = vendor;
      if (product_type) productData.product_type = product_type;

      const result = await shopify.createProduct(productData);
      return {
        type: 'success',
        title: 'Product Created!',
        message: `"${result.product.title}" successfully add ho gaya!`,
        data: {
          id: result.product.id,
          title: result.product.title,
          status: result.product.status
        },
        link: `https://p725wn-s9.myshopify.com/admin/products/${result.product.id}`
      };
    }
  },

  delete_product: {
    name: 'Delete Product',
    icon: 'fas fa-trash',
    color: '#f5576c',
    description: 'Remove a product',
    params: ['query'],
    async execute({ query }) {
      if (!query) return { type: 'error', message: 'Kaunsa product delete karna hai? Naam batao.' };
      const data = await shopify.getProducts(250);
      const product = (data.products || []).find(p =>
        p.title.toLowerCase().includes(query.toLowerCase())
      );
      if (!product) return { type: 'error', message: `"${query}" se koi product nahi mila.` };
      await shopify.deleteProduct(product.id);
      return {
        type: 'success',
        title: 'Product Deleted!',
        message: `"${product.title}" successfully delete ho gaya!`,
        link: `https://p725wn-s9.myshopify.com/admin/products`
      };
    }
  },

  // Orders
  list_orders: {
    name: 'List Orders',
    icon: 'fas fa-shopping-cart',
    color: '#f5576c',
    description: 'Show all orders',
    params: ['status'],
    async execute({ status }) {
      const s = status || 'any';
      const data = await shopify.getOrders(50, s);
      const orders = data.orders || [];
      return {
        type: 'table',
        title: `Orders (${orders.length}) ${s !== 'any' ? `- ${s}` : ''}`,
        columns: ['#', 'Customer', 'Total', 'Financial', 'Fulfillment', 'Date'],
        rows: orders.map(o => [
          `#${o.order_number}`,
          `${o.customer?.first_name || 'Guest'} ${o.customer?.last_name || ''}`,
          `$${o.total_price}`,
          o.financial_status || '-',
          o.fulfillment_status || 'unfulfilled',
          new Date(o.created_at).toLocaleDateString()
        ]),
        empty: 'Koi order nahi hai.'
      };
    }
  },

  search_order: {
    name: 'Search Order',
    icon: 'fas fa-search',
    color: '#43e97b',
    description: 'Find order by number',
    params: ['query'],
    async execute({ query }) {
      const num = parseInt(query.replace('#', ''));
      if (isNaN(num)) return { type: 'error', message: 'Valid order number do. Example: 1001' };
      try {
        const data = await shopify.getOrder(num);
        const o = data.order;
        return {
          type: 'detail',
          title: `Order #${o.order_number}`,
          data: {
            'Customer': `${o.customer?.first_name || 'Guest'} ${o.customer?.last_name || ''}`,
            'Email': o.email || '-',
            'Total': `$${o.total_price}`,
            'Subtotal': `$${o.subtotal_price}`,
            'Tax': `$${o.total_tax}`,
            'Discount': `$${o.total_discounts}`,
            'Financial Status': o.financial_status,
            'Fulfillment': o.fulfillment_status || 'unfulfilled',
            'Items': o.line_items?.length || 0,
            'Shipping': `${o.shipping_address?.address1 || '-'}, ${o.shipping_address?.city || '-'}`,
            'Notes': o.note || '-',
            'Created': new Date(o.created_at).toLocaleString()
          },
          link: `https://p725wn-s9.myshopify.com/admin/orders/${o.id}`
        };
      } catch {
        return { type: 'error', message: `Order #${num} nahi mila.` };
      }
    }
  },

  cancel_order: {
    name: 'Cancel Order',
    icon: 'fas fa-ban',
    color: '#f5576c',
    description: 'Cancel an order',
    params: ['query'],
    async execute({ query }) {
      const num = parseInt(query.replace('#', ''));
      if (isNaN(num)) return { type: 'error', message: 'Order number do. Example: 1001' };
      try {
        const data = await shopify.getOrder(num);
        if (data.order) {
          await shopify.cancelOrder(data.order.id);
          return {
            type: 'success',
            title: 'Order Cancelled!',
            message: `Order #${num} successfully cancel ho gaya!`,
            link: `https://p725wn-s9.myshopify.com/admin/orders/${data.order.id}`
          };
        }
      } catch {
        return { type: 'error', message: `Order #${num} cancel nahi ho paya.` };
      }
    }
  },

  // Customers
  list_customers: {
    name: 'List Customers',
    icon: 'fas fa-users',
    color: '#4facfe',
    description: 'Show all customers',
    params: [],
    async execute() {
      const data = await shopify.getCustomers(50);
      const customers = data.customers || [];
      return {
        type: 'table',
        title: `Customers (${customers.length})`,
        columns: ['Name', 'Email', 'Phone', 'Orders', 'Total Spent'],
        rows: customers.map(c => [
          `${c.first_name} ${c.last_name}`,
          c.email || '-',
          c.phone || '-',
          c.orders_count || 0,
          `$${c.total_spent || 0}`
        ]),
        empty: 'Koi customer nahi hai.'
      };
    }
  },

  search_customer: {
    name: 'Search Customer',
    icon: 'fas fa-search',
    color: '#43e97b',
    description: 'Find customer by name/email',
    params: ['query'],
    async execute({ query }) {
      const data = await shopify.getCustomers(250);
      const q = query.toLowerCase();
      const customers = (data.customers || []).filter(c =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
      return {
        type: 'table',
        title: `Search: "${query}" (${customers.length} results)`,
        columns: ['Name', 'Email', 'Orders', 'Total Spent'],
        rows: customers.map(c => [
          `${c.first_name} ${c.last_name}`,
          c.email || '-',
          c.orders_count || 0,
          `$${c.total_spent || 0}`
        ]),
        empty: `"${query}" se koi customer nahi mila.`
      };
    }
  },

  // Inventory
  list_inventory: {
    name: 'List Inventory',
    icon: 'fas fa-warehouse',
    color: '#43e97b',
    description: 'Show stock levels',
    params: [],
    async execute() {
      const locations = await shopify.getLocations();
      const loc = locations.locations?.[0];
      if (!loc) return { type: 'error', message: 'Koi location nahi mili.' };
      const inv = await shopify.getInventoryLevels(loc.id, 50);
      const levels = inv.inventory_levels || [];
      return {
        type: 'table',
        title: `Inventory - ${loc.name} (${levels.length} items)`,
        columns: ['Item ID', 'Available', 'Status'],
        rows: levels.map(l => {
          const avail = l.available ?? 0;
          return [
            `#${l.inventory_item_id}`,
            avail.toString(),
            avail === 0 ? 'OUT OF STOCK' : avail < 5 ? 'LOW' : 'OK'
          ];
        }),
        empty: 'Inventory data nahi hai.'
      };
    }
  },

  low_stock: {
    name: 'Low Stock',
    icon: 'fas fa-exclamation-triangle',
    color: '#f5a623',
    description: 'Items with low/zero stock',
    params: [],
    async execute() {
      const locations = await shopify.getLocations();
      const loc = locations.locations?.[0];
      if (!loc) return { type: 'error', message: 'Location nahi mili.' };
      const inv = await shopify.getInventoryLevels(loc.id, 250);
      const low = (inv.inventory_levels || []).filter(l => (l.available ?? 0) < 5);
      return {
        type: 'table',
        title: `Low Stock Items (${low.length})`,
        columns: ['Item ID', 'Available', 'Status'],
        rows: low.map(l => [
          `#${l.inventory_item_id}`,
          (l.available ?? 0).toString(),
          l.available === 0 ? 'OUT OF STOCK' : 'LOW'
        ]),
        empty: 'Sab items ka stock theek hai!'
      };
    }
  },

  // Store Info
  shop_info: {
    name: 'Store Info',
    icon: 'fas fa-store',
    color: '#667eea',
    description: 'Store details & settings',
    params: [],
    async execute() {
      const data = await shopify.getShopInfo();
      const s = data.shop;
      return {
        type: 'detail',
        title: 'Store Information',
        data: {
          'Name': s.name,
          'Domain': s.domain,
          'Email': s.email,
          'Phone': s.phone || '-',
          'Address': `${s.address1 || ''} ${s.city || ''} ${s.country || ''}`.trim() || '-',
          'Currency': s.currency,
          'Plan': s.plan_name,
          'Timezone': s.timezone || '-',
          'Created': new Date(s.created_at).toLocaleDateString()
        },
        link: `https://p725wn-s9.myshopify.com/admin/settings`
      };
    }
  },

  // File Operations
  list_files: {
    name: 'List Files',
    icon: 'fas fa-folder',
    color: '#f5a623',
    description: 'Show project files',
    params: ['dir'],
    async execute({ dir }) {
      const baseDir = path.join(__dirname, '..');
      const targetDir = dir ? path.join(baseDir, dir) : baseDir;
      try {
        const items = fs.readdirSync(targetDir, { withFileTypes: true });
        const files = items.map(i => ({
          name: i.name,
          type: i.isDirectory() ? 'folder' : 'file',
          size: i.isDirectory() ? '-' : `${(fs.statSync(path.join(targetDir, i.name)).size / 1024).toFixed(1)}KB`
        }));
        return {
          type: 'filelist',
          title: `Files in ${dir || 'project root'}`,
          files: files
        };
      } catch (e) {
        return { type: 'error', message: `Folder nahi mila: ${dir}` };
      }
    }
  },

  read_file: {
    name: 'Read File',
    icon: 'fas fa-file-alt',
    color: '#4facfe',
    description: 'Read a file\'s contents',
    params: ['query'],
    async execute({ query }) {
      if (!query) return { type: 'error', message: 'File ka naam batao.' };
      const baseDir = path.join(__dirname, '..');
      const filePath = path.join(baseDir, query);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(query);
        const lang = { '.js': 'javascript', '.json': 'json', '.ejs': 'html', '.css': 'css', '.env': 'plaintext' }[ext] || 'plaintext';
        return {
          type: 'code',
          title: query,
          language: lang,
          content: content.length > 3000 ? content.substring(0, 3000) + '\n... (truncated)' : content
        };
      } catch {
        return { type: 'error', message: `"${query}" file nahi mili.` };
      }
    }
  },

  edit_file: {
    name: 'Edit File',
    icon: 'fas fa-edit',
    color: '#f5a623',
    description: 'Edit a file (find & replace)',
    params: ['file', 'find', 'replace'],
    async execute({ file, find, replace }) {
      if (!file || !find || replace === undefined) return { type: 'error', message: 'File, find, aur replace sab zaruri hai.' };
      const baseDir = path.join(__dirname, '..');
      const filePath = path.join(baseDir, file);
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes(find)) return { type: 'error', message: `"${find}" nahi mila ${file} mein.` };
        content = content.replace(find, replace);
        fs.writeFileSync(filePath, content, 'utf8');
        return {
          type: 'success',
          title: 'File Updated!',
          message: `${file} mein "${find}" -> "${replace}" replace ho gaya!`
        };
      } catch {
        return { type: 'error', message: `File edit nahi ho payi: ${file}` };
      }
    }
  },

  // System
  run_command: {
    name: 'Run Command',
    icon: 'fas fa-terminal',
    color: '#1a1a2e',
    description: 'Execute a shell command',
    params: ['query'],
    async execute({ query }) {
      if (!query) return { type: 'error', message: 'Command batao kya run karna hai.' };
      try {
        const output = execSync(query, {
          encoding: 'utf8',
          timeout: 15000,
          cwd: path.join(__dirname, '..'),
          windowsHide: true
        });
        return {
          type: 'code',
          title: `Command: ${query}`,
          language: 'plaintext',
          content: output || '(no output)'
        };
      } catch (e) {
        return {
          type: 'code',
          title: `Command failed: ${query}`,
          language: 'plaintext',
          content: e.stderr || e.message || 'Unknown error'
        };
      }
    }
  },

  // Collections
  list_collections: {
    name: 'List Collections',
    icon: 'fas fa-layer-group',
    color: '#764ba2',
    description: 'Show all collections',
    params: [],
    async execute() {
      try {
        const resp = await shopify.makeRequest('GET', '/collections.json?limit=50');
        const collections = resp.collections || [];
        return {
          type: 'table',
          title: `Collections (${collections.length})`,
          columns: ['Title', 'Type', 'Products Count', 'Published'],
          rows: collections.map(c => [
            c.title,
            c.collection_type || '-',
            c.products_count?.toString() || '0',
            c.published_at ? 'Yes' : 'No'
          ]),
          empty: 'Koi collection nahi hai.'
        };
      } catch {
        return { type: 'error', message: 'Collections load nahi ho paye.' };
      }
    }
  }
};

module.exports = TOOLS;
