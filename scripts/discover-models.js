#!/usr/bin/env node

/**
 * Gemini Model Discovery Script
 * 
 * This script discovers available Gemini models and tests which ones work.
 * Run with: node scripts/discover-models.js YOUR_API_KEY
 */

const https = require('https');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function discoverModels(apiKey) {
  console.log('🔍 Discovering available Gemini models...\n');
  
  try {
    // Get list of available models
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await makeRequest(listUrl);
    
    if (listResponse.status !== 200) {
      console.error('❌ Failed to fetch models:', listResponse.data);
      return;
    }
    
    const models = listResponse.data.models || [];
    const generateContentModels = models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log(`📋 Found ${models.length} total models`);
    console.log(`✅ ${generateContentModels.length} support generateContent\n`);
    
    console.log('🧪 Testing each model...\n');
    
    const workingModels = [];
    const brokenModels = [];
    
    for (const model of generateContentModels) {
      const modelName = model.name;
      process.stdout.write(`Testing ${modelName}... `);
      
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
        const testResponse = await makeRequest(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Say "test" and nothing else.'
              }]
            }]
          })
        });
        
        if (testResponse.status === 200) {
          const text = testResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
          workingModels.push({ name: modelName, displayName: model.displayName, response: text.trim() });
          console.log(`✅ WORKS! Response: "${text.trim()}"`);
        } else {
          brokenModels.push({ name: modelName, error: `${testResponse.status}: ${JSON.stringify(testResponse.data)}` });
          console.log(`❌ FAILED: ${testResponse.status}`);
        }
      } catch (error) {
        brokenModels.push({ name: modelName, error: error.message });
        console.log(`❌ ERROR: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DISCOVERY RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n✅ WORKING MODELS (${workingModels.length}):`);
    workingModels.forEach(model => {
      console.log(`  • ${model.name}`);
      console.log(`    Display: ${model.displayName || 'N/A'}`);
      console.log(`    Test Response: "${model.response}"`);
    });
    
    console.log(`\n❌ BROKEN MODELS (${brokenModels.length}):`);
    brokenModels.forEach(model => {
      console.log(`  • ${model.name}: ${model.error}`);
    });
    
    if (workingModels.length > 0) {
      console.log('\n🔧 RECOMMENDED CONFIGURATION:');
      console.log('Update your config/gemini-models.json with:');
      console.log(JSON.stringify({
        defaultModels: {
          preferred: workingModels[0].name.replace('models/', ''),
          fallback: workingModels[1]?.name.replace('models/', '') || workingModels[0].name.replace('models/', ''),
          legacy: workingModels[0].name.replace('models/', '')
        }
      }, null, 2));
      
      console.log('\n📝 NEXT STEPS:');
      console.log('1. Update your configuration file with the working model names above');
      console.log('2. Clear your browser cache or use clear-model-cache.html');
      console.log('3. Restart your application');
      console.log('4. Test the film analysis features');
    } else {
      console.log('\n🚨 NO WORKING MODELS FOUND!');
      console.log('This suggests an issue with:');
      console.log('- Your API key (check if it\'s valid)');
      console.log('- The Gemini API service');
      console.log('- Network connectivity');
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

// Main execution
const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node scripts/discover-models.js YOUR_GEMINI_API_KEY');
  console.log('');
  console.log('This script will:');
  console.log('1. Fetch all available Gemini models from Google API');
  console.log('2. Test each model to see which ones actually work');
  console.log('3. Provide updated configuration for your app');
  process.exit(1);
}

discoverModels(apiKey);