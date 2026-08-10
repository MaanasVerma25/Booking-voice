import { createAppointmentBooking } from "./booking.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST method required" });
  }

  let body = {};
  if (typeof req.body === "string") {
    try { body = JSON.parse(req.body); } catch (_) { body = {}; }
  } else if (req.body && typeof req.body === "object") {
    body = req.body;
  }

  try {
    const result = await createAppointmentBooking(body);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[API/book-appointment] Error processing appointment:", err);
    return res.status(500).json({ error: "Failed to process appointment booking", details: err.message });
  }
}
