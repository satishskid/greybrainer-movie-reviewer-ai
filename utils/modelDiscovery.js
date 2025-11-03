/**
 * Model Discovery Utility
 * 
 * This script helps discover which Gemini model names actually work
 * Run this in browser console to test different model names
 */

// Common model names to test
const MODELS_TO_TEST = [
  'gemini-pro',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'text-bison-001',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.0-pro-latest',
  'gemini-pro-vision',
  'gemini-1.5-pro-vision-latest'
];

async function testModel(apiKey, modelName) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent('Say "test" and nothing else.');
    const response = await result.response;
    const text = response.text();
    
    return {
      model: modelName,
      success: true,
      response: text.trim(),
      error: null
    };
  } catch (error) {
    return {
      model: modelName,
      success: false,
      response: null,
      error: error.message
    };
  }
}

async function discoverWorkingModels(apiKey) {
  console.log('🔍 Testing Gemini models...');
  const results = [];
  
  for (const modelName of MODELS_TO_TEST) {
    console.log(`Testing: ${modelName}`);
    const result = await testModel(apiKey, modelName);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${modelName}: WORKS`);
    } else {
      console.log(`❌ ${modelName}: ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 SUMMARY:');
  const working = results.filter(r => r.success);
  const broken = results.filter(r => !r.success);
  
  console.log(`✅ Working models (${working.length}):`);
  working.forEach(r => console.log(`  - ${r.model}`));
  
  console.log(`❌ Broken models (${broken.length}):`);
  broken.forEach(r => console.log(`  - ${r.model}: ${r.error}`));
  
  return results;
}

// Usage:
// 1. Open browser console on https://greybrainer.netlify.app
// 2. Get your API key: const apiKey = localStorage.getItem('greybrainer_gemini_api_key')
// 3. Run: discoverWorkingModels(apiKey)

console.log('Model Discovery Utility loaded. Usage:');
console.log('1. const apiKey = localStorage.getItem("greybrainer_gemini_api_key")');
console.log('2. discoverWorkingModels(apiKey)');

// Export for use
window.discoverWorkingModels = discoverWorkingModels;
window.testModel = testModel;