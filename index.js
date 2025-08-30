/**
 * Shopify Order Splitting Service
 * ===============================
 * 
 * This service automatically splits bundle SKUs into component SKUs
 * when new orders are created in Shopify.
 * 
 * Features:
 * - Webhook verification for security
 * - Automatic order splitting based on SKU mapping
 * - Error handling and logging
 * - AutoDS compatibility
 * 
 * Author: Trae AI
 * Store: thefloatingcandles.com
 */

import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for raw body (needed for webhook verification)
app.use('/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// Configuration
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'thefloatingcandles.myshopify.com';
const ADMIN_API_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// SKU Mapping Configuration
// Define which bundle SKUs should be split into component SKUs
const skuMappings = {
  'CANDLE-BUNDLE': [
    { sku: 'CANDLE-SKU', quantity: 1, title: 'Floating Candle' },
    { sku: 'BATTERY-SKU', quantity: 1, title: 'LED Battery Pack' }
  ],
  'CANDLE-BUNDLE-3PACK': [
    { sku: 'CANDLE-SKU', quantity: 3, title: 'Floating Candle (3-Pack)' },
    { sku: 'BATTERY-SKU', quantity: 3, title: 'LED Battery Pack (3-Pack)' }
  ],
  // Add more bundle mappings as needed
};

// Logging utility
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Webhook verification
function verifyWebhook(data, signature) {
  if (!WEBHOOK_SECRET) {
    log('warn', 'Webhook secret not configured - skipping verification');
    return true;
  }
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(data);
  const calculatedSignature = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(calculatedSignature, 'base64')
  );
}

// Shopify API helper
async function shopifyAPI(endpoint, method = 'GET', data = null) {
  const url = `https://${SHOPIFY_STORE}/admin/api/2024-01/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_API_ACCESS_TOKEN
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Shopify API Error: ${response.status} - ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    log('error', `Shopify API request failed: ${error.message}`);
    throw error;
  }
}

// Split order line items based on SKU mappings
function splitLineItems(originalLineItems) {
  const newLineItems = [];
  let hasChanges = false;
  
  for (const item of originalLineItems) {
    const mapping = skuMappings[item.sku];
    
    if (mapping) {
      log('info', `Splitting bundle SKU: ${item.sku} (quantity: ${item.quantity})`);
      hasChanges = true;
      
      // Add component SKUs
      for (const component of mapping) {
        newLineItems.push({
          variant_id: null, // Will be resolved by Shopify
          sku: component.sku,
          quantity: component.quantity * item.quantity,
          title: component.title,
          price: (parseFloat(item.price) / mapping.length).toFixed(2), // Split price evenly
          grams: item.grams || 0,
          taxable: item.taxable || false
        });
      }
    } else {
      // Keep original item unchanged
      newLineItems.push({
        id: item.id,
        variant_id: item.variant_id,
        sku: item.sku,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        grams: item.grams,
        taxable: item.taxable
      });
    }
  }
  
  return { newLineItems, hasChanges };
}

// Update order with new line items
async function updateOrder(orderId, lineItems) {
  try {
    log('info', `Updating order ${orderId} with split SKUs`);
    
    const result = await shopifyAPI(`orders/${orderId}.json`, 'PUT', {
      order: {
        id: orderId,
        line_items: lineItems
      }
    });
    
    log('info', `Order ${orderId} updated successfully`);
    return result;
  } catch (error) {
    log('error', `Failed to update order ${orderId}: ${error.message}`);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'shopify-order-splitter',
    version: '1.0.0'
  });
});

// Configuration endpoint
app.get('/config', (req, res) => {
  res.json({
    store: SHOPIFY_STORE,
    skuMappings: Object.keys(skuMappings),
    webhookConfigured: !!WEBHOOK_SECRET,
    apiConfigured: !!ADMIN_API_ACCESS_TOKEN
  });
});

// Main webhook handler for order creation
app.post('/webhooks/orders/create', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.get('X-Shopify-Hmac-Sha256');
    if (signature && !verifyWebhook(req.body, signature)) {
      log('error', 'Webhook verification failed');
      return res.status(401).send('Unauthorized');
    }
    
    // Parse order data
    const order = JSON.parse(req.body.toString());
    log('info', `Processing new order: ${order.id} (${order.name})`);
    
    // Check if order has any bundle SKUs that need splitting
    const { newLineItems, hasChanges } = splitLineItems(order.line_items);
    
    if (!hasChanges) {
      log('info', `Order ${order.id} has no bundle SKUs to split`);
      return res.status(200).send('No changes needed');
    }
    
    // Update the order with split SKUs
    await updateOrder(order.id, newLineItems);
    
    log('info', `Order ${order.id} processing completed successfully`);
    res.status(200).send('Order processed successfully');
    
  } catch (error) {
    log('error', `Webhook processing failed: ${error.message}`, error);
    res.status(500).send('Internal server error');
  }
});

// Test endpoint for manual order processing
app.post('/test/process-order/:orderId', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    log('info', `Manual processing requested for order: ${orderId}`);
    
    // Fetch order from Shopify
    const orderData = await shopifyAPI(`orders/${orderId}.json`);
    const order = orderData.order;
    
    // Process the order
    const { newLineItems, hasChanges } = splitLineItems(order.line_items);
    
    if (!hasChanges) {
      return res.json({
        success: true,
        message: 'No bundle SKUs found to split',
        order: order
      });
    }
    
    // Update the order
    await updateOrder(orderId, newLineItems);
    
    res.json({
      success: true,
      message: 'Order processed successfully',
      originalItems: order.line_items.length,
      newItems: newLineItems.length
    });
    
  } catch (error) {
    log('error', `Manual processing failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  log('error', `Unhandled error: ${error.message}`, error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start the server
app.listen(PORT, () => {
  log('info', `Shopify Order Splitter service started on port ${PORT}`);
  log('info', `Store: ${SHOPIFY_STORE}`);
  log('info', `Bundle SKUs configured: ${Object.keys(skuMappings).join(', ')}`);
  
  if (!ADMIN_API_ACCESS_TOKEN) {
    log('warn', 'SHOPIFY_ACCESS_TOKEN not configured!');
  }
  
  if (!WEBHOOK_SECRET) {
    log('warn', 'WEBHOOK_SECRET not configured - webhooks will not be verified!');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully');
  process.exit(0);
});