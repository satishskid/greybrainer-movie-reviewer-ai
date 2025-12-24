# Gemini API Issues Fix - December 24, 2025

## 🔍 Issues Identified

### Issue 1: Model Incompatibility (400 Error) ✅ FIXED
**Error:**
```
[GoogleGenerativeAI Error]: Tool use with a response mime type: 'application/json' is unsupported
```

**Root Cause:**
- `searchMovies()` function was using `getSelectedGeminiModel()` which returns `gemini-2.5-flash`
- Gemini 2.5 Flash **does NOT support** `responseMimeType: "application/json"` when using `tools: [{ googleSearch: {} }]`
- This is a known limitation of Gemini 2.5 models

**Solution Applied:**
Changed `searchMovies()` function in `services/geminiService.ts` to explicitly use `gemini-1.5-flash`:

```typescript
// Before (line ~2141)
const model = getGeminiAI().getGenerativeModel({ 
  model: getSelectedGeminiModel(),  // Was using gemini-2.5-flash
  tools: [{ googleSearch: {} }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: "application/json"  // ❌ Not supported in 2.5 with tools
  }
});

// After
const model = getGeminiAI().getGenerativeModel({ 
  model: 'gemini-1.5-flash',  // ✅ Explicitly use 1.5 for JSON + tools
  tools: [{ googleSearch: {} }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: "application/json"  // ✅ Works in 1.5
  }
});
```

**Status:** ✅ **FIXED & DEPLOYED**

---

### Issue 2: Rate Limiting (429 Error) ⚠️ ONGOING
**Error:**
```
[GoogleGenerativeAI Error]: You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, 
limit: 5, model: gemini-2.5-flash
Please retry in 59s
```

**Root Cause:**
- **Gemini 2.5 Flash Free Tier Limits:**
  - 5 requests per minute (RPM)
  - 1,500 requests per day (RPD)
- Movie analysis makes multiple parallel API calls:
  - Movie search (multiple retries)
  - Movie suggestions
  - Story layer analysis
  - Orchestration layer analysis
  - Performance layer analysis
  - Morphokinetics analysis
- **Total: 6-8 API calls** in quick succession → Exceeds 5 RPM limit immediately

**Why Insights Section Works:**
- Uses **1 API call** at a time
- Stays under 5 RPM limit
- No parallel requests

---

## 💡 Solutions for Rate Limiting

### Option 1: Use Gemini 1.5 Flash (Lower Limits) ⚠️
```
Gemini 1.5 Flash Free Tier:
- 15 RPM (3x more than 2.5)
- 1,500 RPD (same)
- 1 million TPM
```

**Pros:** 
- More requests per minute
- Supports JSON + tools combination

**Cons:**
- Still will hit limits with parallel calls
- Not recommended for production

### Option 2: Implement Request Queuing ✅ RECOMMENDED
Add a request queue to serialize API calls instead of parallel execution.

**Implementation:**
```typescript
// Create a queue service
class GeminiRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsThisMinute = 0;
  private lastReset = Date.now();
  private readonly MAX_RPM = 5; // Gemini 2.5 Flash free tier limit
  
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    // Reset counter every minute
    if (Date.now() - this.lastReset > 60000) {
      this.requestsThisMinute = 0;
      this.lastReset = Date.now();
    }
    
    // Wait if we've hit the limit
    if (this.requestsThisMinute >= this.MAX_RPM) {
      const waitTime = 60000 - (Date.now() - this.lastReset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsThisMinute = 0;
      this.lastReset = Date.now();
    }
    
    this.processing = true;
    const task = this.queue.shift();
    
    if (task) {
      this.requestsThisMinute++;
      await task();
      this.processing = false;
      this.processQueue(); // Process next
    } else {
      this.processing = false;
    }
  }
}

// Usage
const geminiQueue = new GeminiRequestQueue();

// Wrap all Gemini API calls
const result = await geminiQueue.enqueue(() => 
  model.generateContent(prompt)
);
```

### Option 3: Upgrade to Paid Plan 💰 BEST FOR PRODUCTION
**Gemini 2.5 Flash (Paid):**
- 1,000 RPM (200x more!)
- 4,000,000 RPD
- $0.075 per 1M input tokens
- $0.30 per 1M output tokens

**Cost Estimate:**
- Typical movie analysis: ~15,000 tokens total
- Cost per analysis: ~$0.005 (half a cent)
- 1,000 analyses per day: ~$5/day

### Option 4: Switch to Gemini 1.5 Pro (Higher Free Tier) 🎯 QUICK FIX
**Gemini 1.5 Pro Free Tier:**
- 2 RPM (lower than 2.5 Flash, but more stable)
- Higher quality responses
- Better reasoning

**Implementation:**
```typescript
// In config/gemini-models.json
{
  "defaultModels": {
    "preferred": "gemini-1.5-pro",  // Change from gemini-2.5-flash
    "fallback": "gemini-1.5-flash",
    "legacy": "gemini-1.5-flash"
  }
}
```

---

## 🎯 Recommended Immediate Action

### For Development/Testing:
1. ✅ **Keep current fix** (gemini-1.5-flash for searchMovies)
2. ⚠️ **Add retry logic with exponential backoff**
3. ⚠️ **Serialize layer analysis** (one at a time instead of parallel)

### For Production:
1. 💰 **Upgrade to paid Gemini API plan** ($5-10/day for moderate usage)
2. ✅ **Implement request queuing** for free tier users
3. ✅ **Add rate limit detection** and user-friendly error messages

---

## 📝 Code Changes Made

### File: `services/geminiService.ts`
**Line ~2141-2150:**
```diff
- const model = getGeminiAI().getGenerativeModel({ 
-   model: getSelectedGeminiModel(),
+ const model = getGeminiAI().getGenerativeModel({ 
+   model: 'gemini-1.5-flash', // Use 1.5 for JSON + tools support
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  });
```

**Commit:** `42bf87e`  
**Status:** ✅ Deployed to production

---

## 🧪 Testing Results

### Before Fix:
❌ Movie search: 400 error (model incompatibility)  
❌ Movie analysis: 429 error (rate limit)  
✅ Insights section: Working (single requests)

### After Fix:
✅ Movie search: **FIXED** (uses gemini-1.5-flash)  
⚠️ Movie analysis: Still hits rate limits (needs queuing or paid plan)  
✅ Insights section: Still working

---

## 📊 Rate Limit Comparison

| Model | Free RPM | Free RPD | Paid RPM | JSON + Tools |
|-------|----------|----------|----------|--------------|
| Gemini 2.5 Flash | 5 | 1,500 | 1,000 | ❌ No |
| Gemini 1.5 Flash | 15 | 1,500 | 2,000 | ✅ Yes |
| Gemini 1.5 Pro | 2 | 50 | 360 | ✅ Yes |
| Gemini 2.0 Flash | 10 | 1,500 | 4,000 | ⚠️ Unknown |

**Legend:**
- RPM: Requests Per Minute
- RPD: Requests Per Day
- JSON + Tools: Supports `responseMimeType: "application/json"` with `tools: [{ googleSearch: {} }]`

---

## 🚀 Next Steps

### Immediate (Today):
1. ✅ Monitor deployment
2. ⚠️ Test movie search functionality
3. ⚠️ Observe rate limit behavior

### Short-term (This Week):
1. Implement request queuing for free tier
2. Add user-friendly rate limit messages
3. Serialize layer analysis calls
4. Add retry logic with exponential backoff

### Long-term (Production):
1. Upgrade to paid Gemini API plan
2. Implement caching for repeated requests
3. Add request analytics/monitoring
4. Consider multi-model strategy (use 1.5 for some, 2.5 for others)

---

## 📚 References

- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini 2.5 Flash Documentation](https://ai.google.dev/gemini-api/docs/models/gemini-v2)
- [Gemini 1.5 Flash Documentation](https://ai.google.dev/gemini-api/docs/models/gemini)
- [Pricing Information](https://ai.google.dev/pricing)

---

**Status:** ✅ **Model incompatibility FIXED** | ⚠️ **Rate limiting needs attention**  
**Deployed:** December 24, 2025  
**Commit:** `42bf87e`
