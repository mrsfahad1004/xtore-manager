# Xtore Manager - Project Progress

## Store Details
- URL: p725wn-s9.myshopify.com (Xtore - www.xtore.shop)
- All credentials stored in .env file
- 177 total collections (30 parent + ~147 subcategories)
- Theme: Horizon (ID: 152587681478)

## Store Colors (for UI)
- Gold/Yellow: #F5B904
- Black: #060000 / #040000
- Orange accent: #FF5B03
- Cart dot: #d74a5d
- Drawer: #ffffff / text #321004

## GitHub
- Repo: https://github.com/mrsfahad1004/xtore-manager

## Replit Deploy
- URL: https://d0a3560a-7266-4845-b74e-7f5536e56a91-00-2eqrjxvr2noa.pike.replit.dev
- All secrets in Replit Secrets (env vars)

## What's Built
1. Express + EJS app with Shopify API integration
2. Dashboard with stats (products, orders, customers, store info)
3. Products CRUD (list, show, new, edit, delete)
4. Orders management (list, show, cancel)
5. Customers CRUD (list, show, new, edit)
6. Inventory management with stock adjustment
7. AI Chatbox agent (lib/agent.js, lib/tools.js) - 17+ tools
8. OAuth flow (auth/login, auth/callback, auth/logout)
9. Token store with env fallback (lib/token-store.js)
10. Auth middleware with env fallback (middleware/auth.js)

## 3D Gold/Black Theme - DONE BUT NOT DEPLOYED ON REPLIT
All views updated with 3D luxury theme matching store colors:
- layout.ejs, dashboard.ejs, chatbox.ejs
- products/*, orders/*, customers/*, inventory/*, error.ejs

## CURRENT BLOCKER
Code pushed to GitHub but Replit still shows OLD design.
User needs to run in Replit Shell: git pull origin main --force
Then Stop -> Run to restart server.

## User Notes
- Speaks Roman Urdu/Hindi
- Internet restrictions: ngrok, Vercel, Netlify blocked; no VPN
- Prefers fast execution
