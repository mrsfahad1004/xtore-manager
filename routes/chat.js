const express = require('express');
const router = express.Router();
const agent = require('../lib/agent');
const TOOLS = require('../lib/tools');

router.get('/tools', (req, res) => {
  const tools = Object.entries(TOOLS).map(([id, tool]) => ({
    id,
    name: tool.name,
    icon: tool.icon,
    color: tool.color,
    description: tool.description,
    params: tool.params
  }));
  res.json({ tools });
});

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.json({ text: 'Kuch likho pehle!' });
    }
    const response = await agent.processMessage(message.trim());
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error.message);
    res.json({ type: 'error', message: `Error: ${error.message}` });
  }
});

module.exports = router;
