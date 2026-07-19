require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const STORE_URL = process.env.SHOPIFY_STORE_URL;

// OAuth URL - is link se code milega
const OAUTH_URL = `http://${STORE_URL}/admin/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=http://localhost`;

console.log('=== Shopify Token Regenerator ===\n');
console.log('1. Pehle is link ko browser mein open karo:');
console.log(`\n   ${OAUTH_URL}\n`);
console.log('2. App install karo aur code milega redirect URL mein');
console.log('3. Code yahan paste karo\n');

// Code exchange function
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(`https://${STORE_URL}/admin/oauth/access_token.json`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code
    });

    const accessToken = response.data.access_token;
    
    // Update .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /SHOPIFY_ACCESS_TOKEN=.*/,
      `SHOPIFY_ACCESS_TOKEN=${accessToken}`
    );
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n=== SUCCESS ===');
    console.log('New Access Token:', accessToken);
    console.log('.env file updated!');
    
    // Test the new token
    const shopResponse = await axios.get(`https://${STORE_URL}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n=== Store Connected ===');
    console.log('Store:', shopResponse.data.shop.name);
    console.log('Domain:', shopResponse.data.shop.domain);
    
    return accessToken;
  } catch (error) {
    console.error('\nError:', error.response?.data || error.message);
    return null;
  }
}

// Run if code is provided
const code = process.argv[2];
if (code) {
  exchangeCodeForToken(code);
} else {
  console.log('Usage: node regenerate-token.js <CODE>');
  console.log('Example: node regenerate-token.js abc123def456');
}