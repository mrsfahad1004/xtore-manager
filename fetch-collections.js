require('dotenv').config();
const shopify = require('./lib/shopify');

async function main() {
  // Collections via GraphQL
  const resp = await shopify.makeRequest('POST', '/graphql.json', {
    query: '{ collections(first: 50) { edges { node { id title handle productsCount { count } } } } }'
  });
  console.log('=== COLLECTIONS ===');
  console.log(JSON.stringify(resp, null, 2).substring(0, 8000));

  // Navigation menu (main-menu)
  const menuQuery = '{ menuByHandle(handle: "main-menu") { id title items { id title type url items { id title type url items { id title type url } } } } }';
  const menuResp = await shopify.makeRequest('POST', '/graphql.json', {
    query: menuQuery
  });
  console.log('=== NAV MENU ===');
  console.log(JSON.stringify(menuResp, null, 2).substring(0, 8000));
}

main().catch(console.error);
