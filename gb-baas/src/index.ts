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
      console.log('Running daily newsletter cron job...');
      const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const { results: pastNewsletters } = await env.DB.prepare(
        "SELECT * FROM newsletters ORDER BY date DESC LIMIT 7"
      ).all();
      
      let contextStr = "No past newsletters found.";
      if (pastNewsletters && pastNewsletters.length > 0) {
        contextStr = pastNewsletters.map((n: any) => `- [${n.date}] ${n.title} (Themes: ${n.themes})`).join('\n');
      }

      const prompt = `
        You are an elite expert in finding cinematic storylines.
        Find what's trending right now out of India's film ecosystem and craft a dynamic, insightful Daily Newsletter.
        Return it in cleanly formatted markdown.
        
        Past Context:
        ${contextStr}
      `;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      const text = result.response.text();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const title = "Greybrainer Daily - " + todayStr;
      const themes = "Daily Trend, Bollywood, Tollywood";
      
      await env.DB.prepare(
        "INSERT OR REPLACE INTO newsletters (date, title, themes, content, is_published) VALUES (?, ?, ?, ?, ?)"
      ).bind(todayStr, title, themes, text, 0).run();
      
      console.log('Daily newsletter generated & saved successfully.');
    } catch (err) {
      console.error('Cron job failed:', err);
    }
  }
};
