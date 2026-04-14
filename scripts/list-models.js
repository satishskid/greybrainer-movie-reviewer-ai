/**
 * Quick Debug Script to list available Gemini models for your API key.
 * This helps identify the exact strings the Google AI API expects in your region.
 * 
 * Usage:
 * 1. Set your API key in the placeholder below
 * 2. Run: node scripts/list-models.js
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your API key or set it in your environment
const API_KEY = process.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";

if (API_KEY === "YOUR_API_KEY_HERE") {
  console.error("Please provide your API key in the script or via VITE_GEMINI_API_KEY env var.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function checkModels() {
  console.log("Fetching available models for your API key...");
  try {
    const result = await genAI.listModels();
    console.log("\n--- AVAILABLE MODELS ---");
    result.models.forEach(m => {
      console.log(`ID: ${m.name.replace('models/', '')}`);
      console.log(`Display Name: ${m.displayName}`);
      console.log(`Methods: ${m.supportedGenerationMethods.join(', ')}`);
      console.log('---');
    });
    
    console.log("\nRecommended Flash ID for 2026: gemini-3-flash");
    console.log("Recommended Pro ID for 2026: gemini-3.1-pro");
  } catch (error) {
    console.error("Error fetching models:", error.message);
  }
}

checkModels();
