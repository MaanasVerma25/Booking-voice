// Vercel serverless function: expose Supabase public config to the browser.
// NOTE: Only exposes the public anon key (safe to expose) — never the service role key.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
