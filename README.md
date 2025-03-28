# 🧱 Lego

> First bricks for profitability

## 🌐 Try It Live

**Quick Start**: Check out the live demo at [https://lego-analyzer.vercel.app/](https://lego-analyzer.vercel.app/)

**⚠️ Important Notice**: 
- The deployed version provides limited functionality
- Full analysis and Vinted scraping only work in the local version
- You'll see the top deals by score and estimated net profit, basic Dealabs information when running the analysis, but not the complete investment analysis

**To get full functionality**: Follow the local testing setup instructions below

## 📱 Context

LEGO investments are a good source of profit, but navigating the marketplace requires strategic analysis and intelligent tools.

## 🤔 The Bullet-List Problems

Collecting profit on your LEGO investments isn't as easy as it sounds.

* How to identify profitable LEGO sets?
* How to buy LEGO sets under the retail price to maximize profit?
* How to sell profitable LEGO sets above the retail price?

## 🎯 Objective

**Build an end-to-end web application to determine if a LEGO set deal is really a good deal.**

## 🛣 How to Solve It?

1. 🧱 **Manipulate deals and sold items**: How to manipulate the products in the browser
2. 🧹 **Scrape deals and sales**: How to fetch products from different website sources
3. 📱 **Render deals and sales in the browser**: How to interact with the products in the browser
4. 💽 **Save deals and sales in a database**: How to avoid scraping the same data repeatedly
5. ⤵️ **Request deals and sales with an API**: How to give access to your data
6. 🐛 **Test your code**: How to ensure quality and confidence
7. 🚀 **Deploy in production**: How to give access to anyone
8. 🎨 **Make a frictionless experience**: How to easily identify profitable deals in very few clicks
9. ...

## 🌟 Key Features

- Real-time LEGO marketplace data scraping
- Profitability analysis for LEGO sets
- Multi-marketplace deal comparison
- Automated price trend tracking
- User-friendly interface for investment decisions

## 👩🏽‍💻 Step by Step with Workshops

With [inception](https://github.com/92bondstreet/inception?tab=readme-ov-file#%EF%B8%8F-the-3-themes) themes, we'll follow the next workshops to solve our problem:

| Step | Workshops | Planned Date |
| --- | --- | --- |
| 1 | [Manipulate data with JavaScript in the browser](./workshops/1-manipulate-javascript.md) | Jan 2025 |
| 2 | [Interact data with JavaScript, HTML, and CSS in the browser again](./workshops/2-interact-js-css.md) | Jan 2025 |
| 3 | [Be an advocate for your design](./workshops/3-advocate-your-design.md) | Jan 2025 |
| 4 | [Scrape data with Node.js](./workshops/4-scrape-node.md) | Feb 2025 |
| 5 | [Save data in a Database with MongoDB](./workshops/5-store-mongodb.md) | Mar 2024 |
| 6 | [Build an API with Express to request data](./workshops/6-api-express.md) | Mar 2025 |
| 7 | [Deploy in production with Vercel](./workshops/7-deploy.md) | Mar 2025 |
| n | Design an effective experience | Mar 2025 |

## 🧪 Testing the Application

### 🚀 Why Run Locally?

**Critical Insight**: The local version offers **full functionality** that the deployed version cannot:
- Complete web scraping capabilities, especially for Vinted marketplace
- Real-time deal analysis with unrestricted data collection
- Direct marketplace data extraction
- Comprehensive LEGO set investment insights

### Local Testing Setup

1. **Prerequisites**:
   - Node.js installed
   - MongoDB configured
   - Basic understanding of web development

2. **Update API Configuration**:
   In `client/v2/src/api.js`, modify the API URL:
   ```javascript
   // From
   const API_URL = 'https://lego-backend-pp5v.onrender.com';
   
   // To
   const API_URL = 'http://localhost:8092';
   ```

3. **Start Backend Server**:
   ```bash
   node server/api.js
   ```

4. **Start Frontend**:
   ```bash
   # In another terminal
   cd client/v2
   npm start
   ```

5. **Try the analysis locally**:
   - Open the local application
   - In the search field, enter either:
     * A Dealabs.com link (e.g., `https://www.dealabs.com/bons-plans/lego-fortnite-banane-pelee-3027895`)
     * A LEGO set ID (e.g., `42151`)
   - Click the "Analyze Deal" button to get insights

### Deployed Backend Testing Endpoints

1. **Search Deals**:
   ```bash
   curl "https://lego-backend-pp5v.onrender.com/deals/search?limit=10&price=50&filterBy=best-discount"
   ```

2. **Get Specific Deal**:
   ```bash
   curl https://lego-backend-pp5v.onrender.com/deals/{DEAL_ID}
   ```

3. **Search Sales**:
   ```bash
   curl "https://lego-backend-pp5v.onrender.com/sales/search?legoSetId=42151&limit=5"
   ```

### 🔍 Deployed Version Limitations

The online version at [https://lego-analyzer.vercel.app/](https://lego-analyzer.vercel.app/) provides:
- Top deals by score and profit
- Basic Dealabs link information when running analysis
- Limited marketplace insights

**To get full functionality**: Follow the local testing setup instructions

### 🛠 Troubleshooting
- Verify MongoDB connection
- Check environment variables
- Ensure all dependencies are installed
- Replace `{DEAL_ID}` with actual MongoDB ObjectId

## 📝 Licence

Uncopyrighted