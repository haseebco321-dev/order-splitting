# 🚀 Step-by-Step Deployment Guide

## For: thefloatingcandles.com Shopify Order Splitter

This guide will walk you through deploying your order splitting service step by step.

---

## 📋 Prerequisites Checklist

- [ ] Node.js installed on your computer
- [ ] Shopify store: `thefloatingcandles.myshopify.com`
- [ ] AutoDS account: `thefloatingcandles@gmail.com`
- [ ] GitHub account (for deployment)

---

## 🔧 Step 1: Get Shopify API Credentials

### 1.1 Create a Private App in Shopify

1. **Go to your Shopify Admin:**
   ```
   https://thefloatingcandles.myshopify.com/admin
   ```

2. **Navigate to Apps:**
   - Click **Settings** (bottom left)
   - Click **Apps and sales channels**
   - Click **Develop apps**
   - Click **Create an app**

3. **Create the App:**
   - App name: `Order Splitter Service`
   - Click **Create app**

4. **Configure Permissions:**
   - Click **Configure Admin API scopes**
   - Enable these permissions:
     - ✅ `read_orders`
     - ✅ `write_orders`
     - ✅ `read_products`
   - Click **Save**

5. **Install the App:**
   - Click **Install app**
   - Click **Install** to confirm

6. **Get Your Access Token:**
   - Copy the **Admin API access token**
   - ⚠️ **IMPORTANT:** Save this token securely - you'll need it later!

---

## 💻 Step 2: Setup Local Development

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Configure Environment

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your credentials:**
   ```env
   SHOPIFY_STORE=thefloatingcandles.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_your_actual_token_here
   WEBHOOK_SECRET=your_webhook_secret_here
   PORT=3000
   ```

### 2.3 Configure Your SKU Mappings

1. **Open `index.js`**
2. **Find the `skuMappings` section (around line 25)**
3. **Replace with your actual SKUs:**

```javascript
const skuMappings = {
  'YOUR-ACTUAL-BUNDLE-SKU': [
    { sku: 'YOUR-ACTUAL-CANDLE-SKU', quantity: 1, title: 'Floating Candle' },
    { sku: 'YOUR-ACTUAL-BATTERY-SKU', quantity: 1, title: 'LED Battery Pack' }
  ],
  // Add more bundles as needed
};
```

**Example:**
```javascript
const skuMappings = {
  'FLOATING-CANDLE-BUNDLE': [
    { sku: 'CANDLE-FLOAT-001', quantity: 1, title: 'Floating Candle' },
    { sku: 'BATTERY-LED-001', quantity: 1, title: 'LED Battery Pack' }
  ]
};
```

### 2.4 Test Locally

```bash
npm run dev
```

**Test the service:**
```bash
# Health check
curl http://localhost:3000/health

# Configuration check
curl http://localhost:3000/config
```

---

## 🌐 Step 3: Deploy to Railway (Recommended)

### 3.1 Setup Railway Account

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Connect your GitHub account**

### 3.2 Push Code to GitHub

1. **Create a new repository on GitHub:**
   - Name: `shopify-order-splitter`
   - Make it private (recommended)

2. **Push your code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Shopify order splitter service"
   git remote add origin https://github.com/yourusername/shopify-order-splitter.git
   git push -u origin main
   ```

### 3.3 Deploy on Railway

1. **In Railway dashboard:**
   - Click **New Project**
   - Click **Deploy from GitHub repo**
   - Select your `shopify-order-splitter` repository

2. **Add Environment Variables:**
   - Click on your deployed service
   - Go to **Variables** tab
   - Add these variables:
     ```
     SHOPIFY_STORE=thefloatingcandles.myshopify.com
     SHOPIFY_ACCESS_TOKEN=shpat_your_actual_token_here
     WEBHOOK_SECRET=your_webhook_secret_here
     PORT=3000
     ```

3. **Get Your Deployment URL:**
   - Go to **Settings** tab
   - Copy the **Public Domain** (e.g., `https://your-app.railway.app`)
   - ⚠️ **Save this URL - you'll need it for the webhook!**

---

## 🔗 Step 4: Setup Shopify Webhook

### 4.1 Create Webhook in Shopify Admin

1. **Go to Shopify Admin:**
   ```
   https://thefloatingcandles.myshopify.com/admin/settings/notifications
   ```

2. **Scroll to Webhooks section**

3. **Click "Create webhook"**

4. **Configure webhook:**
   - **Event:** `Order creation`
   - **Format:** `JSON`
   - **URL:** `https://your-app.railway.app/webhooks/orders/create`
   - Click **Save webhook**

### 4.2 Test Webhook

1. **Check your Railway logs:**
   - Go to Railway dashboard
   - Click on your service
   - Go to **Deployments** tab
   - Click **View Logs**

2. **Test with a real order (IMPORTANT):**
   - ⚠️ **First, disable AutoDS automatic ordering**
   - Place a test order with your bundle SKU
   - Check Railway logs for processing messages
   - Check Shopify order - it should now show split SKUs
   - ✅ **Re-enable AutoDS automatic ordering**

---

## 🧪 Step 5: Testing & Verification

### 5.1 Test Service Health

```bash
# Replace with your actual Railway URL
curl https://your-app.railway.app/health
curl https://your-app.railway.app/config
```

### 5.2 Test with Existing Order

1. **Find an order ID from Shopify admin**
2. **Test manual processing:**
   ```bash
   curl -X POST "https://your-app.railway.app/test/process-order/ORDER_ID"
   ```

### 5.3 Full Integration Test

1. **Disable AutoDS automatic ordering**
2. **Place test order with bundle SKU**
3. **Verify in Shopify:**
   - Order should show split SKUs instead of bundle
4. **Verify in AutoDS:**
   - Both component SKUs should appear
   - Check that they map to correct Amazon URLs
5. **Re-enable AutoDS automatic ordering**

---

## 📊 Step 6: Monitoring

### 6.1 Railway Monitoring

- **Logs:** Railway dashboard → Your service → Deployments → View Logs
- **Metrics:** Railway dashboard → Your service → Metrics
- **Health:** `https://your-app.railway.app/health`

### 6.2 Shopify Monitoring

- **Webhook Status:** Shopify Admin → Settings → Notifications → Webhooks
- **Order Processing:** Check recent orders for split SKUs

### 6.3 AutoDS Monitoring

- **SKU Mapping:** AutoDS dashboard → Products
- **Order Processing:** AutoDS dashboard → Orders

---

## 🔧 Troubleshooting

### Common Issues:

**1. "Service not responding"**
- Check Railway deployment status
- Verify environment variables are set
- Check Railway logs for errors

**2. "Webhook not triggering"**
- Verify webhook URL in Shopify
- Check Railway logs during order placement
- Ensure webhook is active in Shopify

**3. "Orders not splitting"**
- Verify SKU mapping in `index.js`
- Check that bundle SKU matches exactly
- Review Railway logs for processing messages

**4. "AutoDS not receiving split SKUs"**
- Ensure component SKUs exist in Shopify products
- Verify AutoDS sync is working
- Check AutoDS product mapping

### Getting Help:

1. **Check Railway logs first**
2. **Test with manual endpoints**
3. **Verify configuration with `/config` endpoint**
4. **Contact support with specific error messages**

---

## ✅ Success Checklist

- [ ] Service deployed and healthy
- [ ] Webhook configured and active
- [ ] SKU mappings correct
- [ ] Test order splits correctly
- [ ] AutoDS receives split SKUs
- [ ] AutoDS maps to Amazon URLs
- [ ] Automatic ordering works

---

## 🎉 You're Done!

Your order splitting service is now live and will automatically:

1. **Detect bundle orders** in your Shopify store
2. **Split them into component SKUs** 
3. **Update the order** in Shopify
4. **Send split SKUs to AutoDS**
5. **AutoDS orders from Amazon** using your mapped URLs

**Store:** thefloatingcandles.com  
**Service:** Order Splitting for AutoDS Integration  
**Status:** ✅ Active