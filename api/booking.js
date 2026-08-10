import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");

// Ensure data directory exists for local record keeping
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

// Get Google Webhook URL from process.env or agent/.env
function getWebhookUrl() {
  if (process.env.GOOGLE_WEBHOOK_URL) {
    return process.env.GOOGLE_WEBHOOK_URL.trim();
  }
  try {
    const agentEnvPath = path.join(__dirname, "..", "agent", ".env");
    if (fs.existsSync(agentEnvPath)) {
      const content = fs.readFileSync(agentEnvPath, "utf-8");
      const match = content.match(/GOOGLE_WEBHOOK_URL=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Creates an appointment booking.
 */
export async function createAppointmentBooking(bookingData) {
  const timestamp = new Date().toISOString();
  
  const record = {
    id: "APT-" + Date.now(),
    timestamp,
    patient_name: bookingData.patient_name || bookingData.name || "Valued Patient",
    phone_number: bookingData.phone_number || bookingData.phone || "Not provided",
    doctor_or_specialty: bookingData.doctor_or_specialty || bookingData.doctor || "General Consultation",
    date_time: bookingData.date_time || bookingData.dateTime || "As requested",
    insurance_details: bookingData.insurance_details || bookingData.insurance || "Self-pay / N/A",
    notes: bookingData.notes || "Booked via Apex Voice Assistant"
  };

  // 1. Save local backup to data/appointments.json
  try {
    ensureStorage();
    const existing = JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, "utf-8") || "[]");
    existing.push(record);
    fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`[Booking] Appointment recorded locally: ${record.id} for ${record.patient_name}`);
  } catch (err) {
    console.error("[Booking] Error writing to local appointments.json:", err);
  }

  // 2. Dispatch to Google Apps Script Webhook
  const webhookUrl = getWebhookUrl();
  let googleSynced = false;
  let googleError = null;

  if (webhookUrl && webhookUrl.startsWith("http")) {
    try {
      console.log(`[Booking] Dispatching to Google Webhook: ${webhookUrl}`);
      
      // Google Apps Script Web Apps handle text/plain or application/json best with redirect: follow
      const response = await fetch(webhookUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(record)
      });

      const responseText = await response.text();

      if (response.ok && !responseText.includes("You need access") && !responseText.includes("accounts.google.com")) {
        googleSynced = true;
        console.log(`[Booking] Successfully synced appointment ${record.id} to Google Calendar & Sheet!`);
      } else {
        googleError = `Google Webhook returned access restriction (HTTP ${response.status}). Authorization required in Google Apps Script.`;
        console.warn(`[Booking] ${googleError}`);
      }
    } catch (err) {
      googleError = err.message;
      console.error("[Booking] Google Webhook fetch failed:", err);
    }
  } else {
    console.log("[Booking] GOOGLE_WEBHOOK_URL not configured. Recorded locally in data/appointments.json.");
  }

  return {
    success: true,
    booking: record,
    googleSynced,
    googleError: googleSynced ? null : (googleError || "Webhook URL not configured yet")
  };
}
