#!/usr/bin/env node

/**
 * Interactive Setup Script for Shopify Order Splitter
 * ==================================================
 * 
 * This script helps you configure the service step by step.
 * Run with: node setup.js
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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

async function main() {
  log('🚀 Shopify Order Splitter Setup', 'success');
  log('=====================================\n');
  
  log('This setup will help you configure your order splitting service.\n');
  
  // Step 1: Basic Configuration
  log('📋 Step 1: Basic Configuration', 'info');
  log('------------------------------');
  
  const store = await question('Enter your Shopify store domain (e.g., thefloatingcandles.myshopify.com): ');
  const accessToken = await question('Enter your Shopify Admin API access token: ');
  const webhookSecret = await question('Enter webhook secret (optional, press Enter to skip): ');
  const port = await question('Enter port number (default: 3000): ') || '3000';
  
  // Step 2: SKU Mapping
  log('\n🔗 Step 2: SKU Mapping Configuration', 'info');
  log('------------------------------------');
  
  const skuMappings = {};
  let addMore = true;
  
  while (addMore) {
    log('\nConfiguring a bundle SKU...');
    const bundleSku = await question('Enter bundle SKU (the SKU that needs to be split): ');
    
    if (bundleSku) {
      const components = [];
      let addComponent = true;
      
      while (addComponent) {
        const componentSku = await question('Enter component SKU: ');
        const componentTitle = await question('Enter component title: ');
        const componentQty = await question('Enter component quantity (default: 1): ') || '1';
        
        components.push({
          sku: componentSku,
          title: componentTitle,
          quantity: parseInt(componentQty)
        });
        
        const more = await question('Add another component? (y/n): ');
        addComponent = more.toLowerCase() === 'y';
      }
      
      skuMappings[bundleSku] = components;
    }
    
    const moreBundle = await question('\nAdd another bundle SKU? (y/n): ');
    addMore = moreBundle.toLowerCase() === 'y';
  }
  
  // Step 3: Generate Configuration Files
  log('\n📝 Step 3: Generating Configuration Files', 'info');
  log('----------------------------------------');
  
  // Create .env file
  const envContent = `# Shopify Store Configuration
SHOPIFY_STORE=${store}
SHOPIFY_ACCESS_TOKEN=${accessToken}

# Webhook Configuration
WEBHOOK_SECRET=${webhookSecret}
PORT=${port}

# AutoDS Configuration
AUTODS_EMAIL=thefloatingcandles@gmail.com
AUTODS_PASSWORD=halloween2025
`;
  
  fs.writeFileSync('.env', envContent);
  log('✅ Created .env file');
  
  // Update index.js with SKU mappings
  let indexContent = fs.readFileSync('index.js', 'utf8');
  
  const skuMappingString = JSON.stringify(skuMappings, null, 2)
    .replace(/"(\w+)":/g, '$1:') // Remove quotes from keys
    .replace(/"([^"]+)":/g, "'$1':") // Use single quotes for string keys
    .replace(/"/g, "'"); // Use single quotes for string values
  
  const newSkuMapping = `const skuMappings = ${skuMappingString};`;
  
  indexContent = indexContent.replace(
    /const skuMappings = {[\s\S]*?};/,
    newSkuMapping
  );
  
  fs.writeFileSync('index.js', indexContent);
  log('✅ Updated SKU mappings in index.js');
  
  // Step 4: Next Steps
  log('\n🎯 Step 4: Next Steps', 'success');
  log('--------------------');
  
  log('\n1. Install dependencies:');
  log('   npm install', 'warning');
  
  log('\n2. Test locally:');
  log('   npm run dev', 'warning');
  
  log('\n3. Test the service:');
  log(`   curl http://localhost:${port}/health`, 'warning');
  log(`   curl http://localhost:${port}/config`, 'warning');
  
  log('\n4. Deploy to Railway (recommended):');
  log('   - Go to https://railway.app', 'warning');
  log('   - Connect your GitHub repository', 'warning');
  log('   - Add environment variables from .env file', 'warning');
  log('   - Deploy!', 'warning');
  
  log('\n5. Setup Shopify webhook:');
  log('   - Go to Shopify Admin → Settings → Notifications', 'warning');
  log('   - Create webhook for "Order creation"', 'warning');
  log('   - URL: https://your-deployed-app.com/webhooks/orders/create', 'warning');
  
  log('\n6. Test with AutoDS:');
  log('   - Disable AutoDS automatic ordering', 'warning');
  log('   - Place test order with bundle SKU', 'warning');
  log('   - Verify split SKUs appear in Shopify and AutoDS', 'warning');
  log('   - Re-enable AutoDS automatic ordering', 'warning');
  
  log('\n🎉 Setup complete! Check README.md for detailed instructions.', 'success');
  
  rl.close();
}

main().catch(console.error);