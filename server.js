import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tokenHandler from "./api/token.js";
import chatHandler from "./api/chat.js";
import ttsHandler from "./api/tts.js";
import bookAppointmentHandler from "./api/book-appointment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env file reader
function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv(path.join(__dirname, ".env"));
loadEnv(path.join(__dirname, "agent", ".env"));

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Serve Supabase public config to the browser (GET only, no secrets exposed)
  if (url.pathname === "/api/config" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, ""),
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    }));
  }

  if (url.pathname === "/api/token" || url.pathname === "/api/chat" || url.pathname === "/api/tts" || url.pathname === "/api/book-appointment") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (_) {
        req.body = body;
      }
      res.status = function (code) {
        res.statusCode = code;
        return res;
      };
      res.json = function (data) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      };
      res.send = function (data) {
        res.end(data);
      };
      
      let activeHandler = tokenHandler;
      if (url.pathname === "/api/chat") activeHandler = chatHandler;
      if (url.pathname === "/api/tts") activeHandler = ttsHandler;
      if (url.pathname === "/api/book-appointment") activeHandler = bookAppointmentHandler;

      activeHandler(req, res).catch(err => {
        console.error("API handler error:", err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
      });
    });
    return;
  }

  let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      return res.end("Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`- Serving static frontend from: ./public`);
  console.log(`- Token API endpoint active at: http://localhost:${PORT}/api/token`);
  console.log(`- Groq LLM Chat API endpoint active at: http://localhost:${PORT}/api/chat`);
  console.log(`- Rime Coda TTS API endpoint active at: http://localhost:${PORT}/api/tts`);
  console.log(`- Book Appointment API active at: http://localhost:${PORT}/api/book-appointment\n`);
});


