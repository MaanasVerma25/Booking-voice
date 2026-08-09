// Vercel serverless function: mint a visitor join token and declare the
// booth-agent dispatch for Apex Medical Center.
import { AccessToken, RoomConfiguration, RoomAgentDispatch } from "livekit-server-sdk";

const rand = () => Math.random().toString(36).slice(2, 8);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  let body = {};
  if (typeof req.body === "string") {
    try { body = JSON.parse(req.body); } catch (_) { body = {}; }
  } else if (req.body && typeof req.body === "object") {
    body = req.body;
  }

  const name = typeof body.name === "string" ? body.name.slice(0, 40) : undefined;
  const industry = "healthcare";
  const voice = "arcade";

  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || LIVEKIT_URL.includes("your-project") || LIVEKIT_API_KEY.includes("your_livekit")) {
    return res.status(200).json({
      mock: true,
      industry: "healthcare",
      voice: "arcade",
      name,
      message: "LiveKit credentials not configured. Running in Mock Demo Mode."
    });
  }

  const room = `clinic-${rand()}`;
  const identity = `patient-${rand()}`;
  const metadata = JSON.stringify({ industry, voice, name });

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity, name: name || "Patient" });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: "booth-agent", metadata })],
  });

  try {
    const token = await at.toJwt();
    return res.status(200).json({ serverUrl: LIVEKIT_URL, token, room });
  } catch (err) {
    console.error("token error:", err);
    return res.status(500).json({ error: "Failed to mint token." });
  }
}
