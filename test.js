#!/usr/bin/env node

/**
 * Test Script for Shopify Order Splitter
 * =====================================
 * 
 * This script helps test the order splitting functionality.
 * Run with: node test.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const ADMIN_API_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

async function testEndpoint(url, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const result = await response.text();
    
    return {
      status: response.status,
      ok: response.ok,
      data: result
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function getRecentOrders() {
  try {
    const url = `https://${SHOPIFY_STORE}/admin/api/2024-01/orders.json?limit=5&status=any`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': ADMIN_API_ACCESS_TOKEN
      }
    });
    
    const result = await response.json();
    return result.orders || [];
  } catch (error) {
    log(`Error fetching orders: ${error.message}`, 'error');
    return [];
  }
}

async function runTests() {
  log('🧪 Testing Shopify Order Splitter Service', 'success');
  log('==========================================\n');
  
  // Test 1: Health Check
  log('Test 1: Health Check', 'info');
  log('--------------------');
  
  const healthResult = await testEndpoint(`${BASE_URL}/health`);
  if (healthResult.ok) {
    log('✅ Health check passed', 'success');
    try {
      const healthData = JSON.parse(healthResult.data);
      log(`   Service: ${healthData.service}`);
      log(`   Status: ${healthData.status}`);
      log(`   Version: ${healthData.version}`);
    } catch (e) {
      log(`   Response: ${healthResult.data}`);
    }
  } else {
    log('❌ Health check failed', 'error');
    log(`   Status: ${healthResult.status}`);
    log(`   Error: ${healthResult.error || healthResult.data}`);
    return;
  }
  
  // Test 2: Configuration Check
  log('\nTest 2: Configuration Check', 'info');
  log('---------------------------');
  
  const configResult = await testEndpoint(`${BASE_URL}/config`);
  if (configResult.ok) {
    log('✅ Configuration check passed', 'success');
    try {
      const configData = JSON.parse(configResult.data);
      log(`   Store: ${configData.store}`);
      log(`   SKU Mappings: ${configData.skuMappings.join(', ')}`);
      log(`   Webhook Configured: ${configData.webhookConfigured}`);
      log(`   API Configured: ${configData.apiConfigured}`);
      
      if (!configData.apiConfigured) {
        log('⚠️  Warning: Shopify API not configured', 'warning');
      }
    } catch (e) {
      log(`   Response: ${configResult.data}`);
    }
  } else {
    log('❌ Configuration check failed', 'error');
    log(`   Status: ${configResult.status}`);
    log(`   Error: ${configResult.error || configResult.data}`);
  }
  
  // Test 3: Shopify API Connection
  log('\nTest 3: Shopify API Connection', 'info');
  log('------------------------------');
  
  if (!ADMIN_API_ACCESS_TOKEN) {
    log('❌ Shopify API token not configured', 'error');
  } else {
    const orders = await getRecentOrders();
    if (orders.length > 0) {
      log('✅ Shopify API connection successful', 'success');
      log(`   Found ${orders.length} recent orders`);
      
      // Test 4: Manual Order Processing
      log('\nTest 4: Manual Order Processing', 'info');
      log('-------------------------------');
      
      const testOrder = orders[0];
      log(`   Testing with order: ${testOrder.name} (ID: ${testOrder.id})`);
      
      const processResult = await testEndpoint(`${BASE_URL}/test/process-order/${testOrder.id}`, 'POST');
      if (processResult.ok) {
        log('✅ Manual order processing successful', 'success');
        try {
          const processData = JSON.parse(processResult.data);
          log(`   Result: ${processData.message}`);
          if (processData.originalItems && processData.newItems) {
            log(`   Items: ${processData.originalItems} → ${processData.newItems}`);
          }
        } catch (e) {
          log(`   Response: ${processResult.data}`);
        }
      } else {
        log('❌ Manual order processing failed', 'error');
        log(`   Status: ${processResult.status}`);
        log(`   Error: ${processResult.error || processResult.data}`);
      }
    } else {
      log('⚠️  No recent orders found to test with', 'warning');
    }
  }
  
  // Test 5: Webhook Simulation
  log('\nTest 5: Webhook Simulation', 'info');
  log('--------------------------');
  
  const mockOrder = {
    id: 12345,
    name: '#TEST-001',
    line_items: [
      {
        id: 1,
        sku: 'CANDLE-BUNDLE',
        quantity: 2,
        title: 'Candle Bundle',
        price: '29.99',
        variant_id: 123,
        grams: 100,
        taxable: true
      }
    ]
  };
  
  const webhookResult = await testEndpoint(`${BASE_URL}/webhooks/orders/create`, 'POST', mockOrder);
  if (webhookResult.ok) {
    log('✅ Webhook simulation successful', 'success');
    log(`   Response: ${webhookResult.data}`);
  } else {
    log('❌ Webhook simulation failed', 'error');
    log(`   Status: ${webhookResult.status}`);
    log(`   Error: ${webhookResult.error || webhookResult.data}`);
  }
  
  // Summary
  log('\n📊 Test Summary', 'success');
  log('===============');
  log('\nIf all tests passed, your service is ready!');
  log('\nNext steps:');
  log('1. Deploy to Railway/Heroku/Vercel');
  log('2. Setup Shopify webhook pointing to your deployed URL');
  log('3. Test with a real order (with AutoDS disabled)');
  log('4. Verify AutoDS receives split SKUs');
  log('5. Enable AutoDS automatic ordering');
  
  log('\n🎉 Testing complete!', 'success');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Shopify Order Splitter Test Script
==================================

Usage: node test.js [options]

Options:
  --help, -h     Show this help message
  --url <url>    Test a specific URL (default: http://localhost:3000)

Environment Variables:
  TEST_URL              Base URL to test (default: http://localhost:3000)
  SHOPIFY_STORE         Your Shopify store domain
  SHOPIFY_ACCESS_TOKEN  Your Shopify Admin API access token

Examples:
  node test.js                                    # Test local service
  node test.js --url https://your-app.railway.app # Test deployed service
  TEST_URL=https://your-app.com node test.js      # Test with environment variable
`);
  process.exit(0);
}

if (args.includes('--url')) {
  const urlIndex = args.indexOf('--url');
  if (urlIndex + 1 < args.length) {
    process.env.TEST_URL = args[urlIndex + 1];
  }
}

runTests().catch(console.error);