const TOOLS = require('./tools');

class Agent {
  constructor() {
    this.conversationHistory = [];
  }

  async processMessage(input) {
    const lower = input.toLowerCase().trim();
    this.conversationHistory.push({ role: 'user', content: input });

    const intent = this.parseIntent(lower);

    if (intent.tool) {
      try {
        const result = await TOOLS[intent.tool].execute(intent.params);
        this.conversationHistory.push({ role: 'assistant', content: JSON.stringify(result) });
        return {
          tool_used: intent.tool,
          tool_name: TOOLS[intent.tool].name,
          tool_icon: TOOLS[intent.tool].icon,
          tool_color: TOOLS[intent.tool].color,
          ...result
        };
      } catch (e) {
        return {
          type: 'error',
          message: `${TOOLS[intent.tool].name} fail ho gaya: ${e.message}`,
          tool_used: intent.tool,
          tool_name: TOOLS[intent.tool].name,
          tool_icon: TOOLS[intent.tool].icon
        };
      }
    }

    return this.smartResponse(lower);
  }

  parseIntent(input) {
    // Delete product with name
    if (input.match(/delete|remove|hatao|hatado|mitao|hata de/)) {
      if (input.match(/product|item|saman/)) {
        const q = input.replace(/delete|remove|hatao|hatado|mitao|hata de/g, '').replace(/product|item|saman/g, '').replace(/from|se/g, '').trim();
        return { tool: 'delete_product', params: { query: q } };
      }
    }

    // Cancel order
    if (input.match(/cancel/)) {
      if (input.match(/order/)) {
        const num = input.match(/#?(\d+)/);
        return { tool: 'cancel_order', params: { query: num ? num[1] : '' } };
      }
    }

    // Create product
    if (input.match(/create|add|new|naya|banao|banayo|jodo|insert/)) {
      if (input.match(/product|item|saman/)) {
        const params = this.extractProductParams(input);
        return { tool: 'create_product', params };
      }
    }

    // Search product
    if (input.match(/search|dhundh|find|khoj|look|dhoondo/)) {
      if (input.match(/product|item|saman/)) {
        const q = input.replace(/search|dhundh|find|khoj|look|dhoondo/g, '').replace(/product|item|saman/g, '').replace(/for|ka|ki|ke|named|called|titled/g, '').trim();
        return { tool: 'search_products', params: { query: q } };
      }
      if (input.match(/order/)) {
        const q = input.replace(/search|dhundh|find|khoj|look|dhoondo/g, '').replace(/order/g, '').replace(/#|for|ka|ki|ke/g, '').trim();
        return { tool: 'search_order', params: { query: q } };
      }
      if (input.match(/customer|client|log/)) {
        const q = input.replace(/search|dhundh|find|khoj|look|dhoondo/g, '').replace(/customer|client|log/g, '').replace(/for|ka|ki|ke/g, '').trim();
        return { tool: 'search_customer', params: { query: q } };
      }
    }

    // Low stock
    if (input.match(/low stock|kam stock|out of stock|khatam|zero stock|stock.*khatam|stock.*kam|stock.*check|kam.*stock/)) {
      return { tool: 'low_stock', params: {} };
    }

    // Inventory
    if (input.match(/inventory|stock|stock.*level|bacha hua|available|warehouse/)) {
      return { tool: 'list_inventory', params: {} };
    }

    // Collections
    if (input.match(/collection|category|categories|groups|samuh/)) {
      return { tool: 'list_collections', params: {} };
    }

    // Products
    if (input.match(/product|products|items|saman|mal|goods/)) {
      return { tool: 'list_products', params: {} };
    }

    // Orders with status filter
    const statusMatch = input.match(/(fulfilled|shipped|delivered|pending|open|cancelled|canceled|refunded|paid|unpaid|partially)/);
    if (input.match(/order/)) {
      if (statusMatch) {
        const statusMap = {
          'fulfilled': 'fulfilled', 'shipped': 'fulfilled', 'delivered': 'fulfilled',
          'pending': 'pending', 'open': 'open',
          'cancelled': 'cancelled', 'canceled': 'cancelled',
          'refunded': 'refunded', 'paid': 'paid', 'unpaid': 'unpaid',
          'partially': 'partially_paid'
        };
        const s = statusMap[statusMatch[1]] || statusMatch[1];
        return { tool: 'list_orders', params: { status: s } };
      }
      return { tool: 'list_orders', params: { status: '' } };
    }

    // Customers
    if (input.match(/customer|customers|clients|log|users|members/)) {
      return { tool: 'list_customers', params: {} };
    }

    // Shop info
    if (input.match(/shop|store|dukan|setting|info|information|detail|details|about/)) {
      return { tool: 'shop_info', params: {} };
    }

    // File operations
    if (input.match(/list.*file|file.*list|files|folder|directory|dir|subfolder/)) {
      const dirMatch = input.replace(/list|files|file|folder|directory|dir|subfolder|of|in|ka|ki|ke|show|dikhao/g, '').trim();
      return { tool: 'list_files', params: { dir: dirMatch || '' } };
    }

    if (input.match(/read|open|show|dekho|padho|dikhao/) && input.match(/file|\.js|\.json|\.ejs|\.css|\.env|\.txt/)) {
      const file = input.replace(/read|open|show|dekho|padho|dikhao|file|the/g, '').trim();
      return { tool: 'read_file', params: { query: file } };
    }

    if (input.match(/edit|update|change|badlo|replace|modify/)) {
      const editMatch = input.match(/edit\s+(?:file\s+)?(\S+)/);
      if (editMatch) {
        const findMatch = input.match(/find\s+["'](.+?)["']/);
        const replaceMatch = input.match(/(?:replace|to|se)\s+["'](.+?)["']/);
        if (findMatch && replaceMatch) {
          return { tool: 'edit_file', params: { file: editMatch[1], find: findMatch[1], replace: replaceMatch[1] } };
        }
        return { tool: 'edit_file', params: { file: editMatch[1], find: '', replace: '' } };
      }
    }

    // Run command
    if (input.match(/run|execute|chala|exec|terminal|cmd|command|shell/)) {
      const cmd = input.replace(/run|execute|chala|exec|terminal|cmd|command|shell|the|this|ye|wo/g, '').trim();
      return { tool: 'run_command', params: { query: cmd } };
    }

    // Dashboard
    if (input.match(/dashboard|stats|statistic|overview|summary|kitna|kitne|home|main/)) {
      return { tool: 'dashboard', params: {} };
    }

    return { tool: null };
  }

  extractProductParams(input) {
    const params = { title: '', price: '', body_html: '', vendor: '', product_type: '' };

    const priceMatch = input.match(/price\s*(?:is|of| hai)?\s*\$?(\d+\.?\d*)/);
    if (priceMatch) params.price = priceMatch[1];

    const titleMatch = input.match(/(?:called|named|title|naam|title)\s+["'](.+?)["']/);
    if (titleMatch) {
      params.title = titleMatch[1];
    } else {
      let title = input
        .replace(/create|add|new|naya|banao|banayo|jodo|insert/g, '')
        .replace(/product|item|saman/g, '')
        .replace(/called|named|title|naam|with|price|of|for|type|vendor/g, '')
        .replace(/\$?\d+\.?\d*/g, '')
        .replace(/called|named|title|naam/g, '')
        .trim();
      if (title.length > 2) params.title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return params;
  }

  smartResponse(input) {
    const greetings = ['hello', 'hi', 'hey', 'salam', 'aoa', 'kya haal', 'kaise ho', 'kaisa hai', 'sup'];
    if (greetings.some(g => input.includes(g))) {
      return {
        type: 'greeting',
        message: `**Welcome!** Main Xtore AI Agent hoon.\n\nKuch bhi command do - products manage karo, orders check karo, files edit karo, commands run karo.\n\nType **help** for all commands.`
      };
    }

    const thanks = ['thanks', 'shukriya', 'thank', 'meherbani', 'thx'];
    if (thanks.some(t => input.includes(t))) {
      return { type: 'text', message: '**You\'re welcome!** Koi aur help chahiye to batao.' };
    }

    if (input.match(/help|commands|kya kar|kya kya|batao|sab/)) {
      return this.showHelp();
    }

    if (input.match(/manage|handle|karo|chalao|sambhal|kaam|agent|ai|tum/)) {
      return {
        type: 'text',
        message: `**Main yeh sab kar sakta hoon:**\n\n` +
          `**Store Management:**\n` +
          `- Products: list, search, create, delete\n` +
          `- Orders: list, search, cancel, filter by status\n` +
          `- Customers: list, search\n` +
          `- Inventory: view stock, low stock alerts\n` +
          `- Collections: list all\n` +
          `- Store info & dashboard\n\n` +
          `**File Operations:**\n` +
          `- List files & folders\n` +
          `- Read file contents\n` +
          `- Edit files (find & replace)\n\n` +
          `**System:**\n` +
          `- Run shell commands\n\n` +
          `Natural language mein bolo - main samajh jaunga!`
      };
    }

    return {
      type: 'text',
      message: `**"${input}"** samajh nahi aaya.\n\nKuch yeh try karo:\n` +
        `- **help** - sab commands dekho\n` +
        `- **products** - product list\n` +
        `- **orders** - order list\n` +
        `- **dashboard** - store overview\n` +
        `- **search product [name]** - product dhundho\n` +
        `- **create product [name]** - naya product\n` +
        `- **customers** - customer list\n` +
        `- **inventory** - stock level\n` +
        `- **low stock** - kam stock items\n` +
        `- **list files** - project files\n` +
        `- **run [command]** - command execute\n` +
        `- **shop info** - store details`
    };
  }

  showHelp() {
    const toolList = Object.entries(TOOLS).map(([key, tool]) => {
      const paramStr = tool.params.length ? ` (${tool.params.join(', ')})` : '';
      return `- **${tool.name}**${paramStr} - ${tool.description}`;
    }).join('\n');

    return {
      type: 'help',
      title: 'Xtore AI Agent - All Tools',
      tools: Object.entries(TOOLS).map(([key, tool]) => ({
        id: key,
        name: tool.name,
        icon: tool.icon,
        color: tool.color,
        description: tool.description,
        params: tool.params
      })),
      message: toolList
    };
  }
}

module.exports = new Agent();
