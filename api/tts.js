// Serverless API endpoint: Rime Coda TTS for Apex Healthcare Voice Assistant.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRimeApiKey() {
  if (process.env.RIME_API_KEY && !process.env.RIME_API_KEY.includes("your_")) {
    return process.env.RIME_API_KEY;
  }
  try {
    const agentEnvPath = path.join(__dirname, "..", "agent", ".env");
    if (fs.existsSync(agentEnvPath)) {
      const content = fs.readFileSync(agentEnvPath, "utf-8");
      const match = content.match(/RIME_API_KEY=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (_) {}
  return "bPFL4RCx9rS9U4q5v2DTExBnpIFYHfXnTIYRf2h2IYQ";
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "POST or GET only" });
  }

  let text = "";
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    text = body.text || "";
  } else {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    text = url.searchParams.get("text") || "";
  }

  text = text.trim();
  if (!text) {
    return res.status(400).json({ error: "Text parameter is required" });
  }

  const apiKey = getRimeApiKey();

  try {
    const rimeResp = await fetch("https://users.rime.ai/v1/rime-tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/mp3"
      },
      body: JSON.stringify({
        speaker: "luna",
        text: text,
        modelId: process.env.RIME_MODEL || "coda",
        samplingRate: 22050
      })
    });

    if (!rimeResp.ok) {
      const errText = await rimeResp.text();
      console.error("Rime API Error:", rimeResp.status, errText);
      return res.status(rimeResp.status).json({ error: "Rime TTS failed", details: errText });
    }

    const audioArrayBuffer = await rimeResp.arrayBuffer();
    const buffer = Buffer.from(audioArrayBuffer);

    res.setHeader("Content-Type", "audio/mp3");
    res.setHeader("Content-Length", buffer.length);
    return res.status(200).send(buffer);

  } catch (err) {
    console.error("Error in Rime TTS endpoint:", err);
    return res.status(500).json({ error: "Internal Server Error in TTS" });
  }
}
