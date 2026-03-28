import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Env {
  DB: D1Database;
  GOOGLE_API_KEY: string;
  ADMIN_SECRET: string;
  PRIVATE_JWK: string;
  PUBLIC_JWK_JSON: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  PUBLIC_BASE_URL: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Set CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/newsletter/latest') {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM newsletters ORDER BY date DESC LIMIT 1"
        ).all();
        
        if (!results || results.length === 0) {
          return new Response(JSON.stringify({ error: "No newsletters found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        return new Response(JSON.stringify(results[0]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === '/newsletter/recent') {
      try {
        const daysParam = url.searchParams.get('days');
        const days = Math.min(Math.max(parseInt(daysParam || '30', 10) || 30, 1), 365);
        const { results } = await env.DB.prepare(
          "SELECT * FROM newsletters ORDER BY date DESC LIMIT ?"
        ).bind(days).all();
        return new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ status: "GB BaaS Online" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      console.log('Running daily newsletter cron job with Google Search Grounding...');
      const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
      
      // Use v1beta for Google Search Grounding support
      const model = genAI.getGenerativeModel(
        { 
          model: "gemini-2.5-flash",
          tools: [{ googleSearch: {} }] as any
        },
        { apiVersion: 'v1beta' }
      );
      
      const { results: pastNewsletters } = await env.DB.prepare(
        "SELECT * FROM newsletters ORDER BY date DESC LIMIT 7"
      ).all();
      
      let contextStr = "No past newsletters found.";
      if (pastNewsletters && pastNewsletters.length > 0) {
        contextStr = pastNewsletters.map((n: any) => `- [${n.date}] ${n.title} (Themes: ${n.themes})`).join('\n');
      }

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      const prompt = `**ROLE**
You are the Editor-in-Chief for the @GreyBrainer Daily Newsletter. Your readers are cinephiles and industry professionals who value deep cultural insights into Indian and global cinema.

**OBJECTIVE**
Write today's edition of the daily newsletter (${today}). 

**LIVE GOOGLE SEARCH REQUIREMENT**
Search Google right now to find:
1. What are the top 3 trending stories in the Indian cinema ecosystem today?
2. What notable movies or web series are releasing this week or later this month?

**RAG CONTEXT (WHAT WE WROTE RECENTLY)**
${contextStr}

**CRITICAL CONSTRAINTS:**
- **FACTUAL ACCURACY:** Do not hallucinate. Only report news and release dates found via Google Search. If you cannot find specific trending news, focus on upcoming releases or industry analysis.
- **ZERO REPETITION:** Do not repeat the same analysis from the past context.
- **STRUCTURE:** Use Markdown. Include a catchy title, an "Ecosystem Pulse" section for news, and an "On The Horizon" section for upcoming releases.

Return the newsletter in cleanly formatted markdown.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const title = "Greybrainer Daily - " + todayStr;
      const themes = "Daily Trend, Bollywood, Tollywood, Industry Insights";
      
      await env.DB.prepare(
        "INSERT OR REPLACE INTO newsletters (date, title, themes, content, is_published) VALUES (?, ?, ?, ?, ?)"
      ).bind(todayStr, title, themes, text, 0).run();
      
      console.log('Daily newsletter generated & saved successfully with grounding.');
    } catch (err) {
      console.error('Cron job failed:', err);
    }
  }
};
