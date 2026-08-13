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
 * Parses natural language or formatted date-time strings into a Date object.
 */
export function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;

  const rawStr = String(dateTimeStr).trim();
  if (!rawStr) return null;

  // 1. Direct standard date parse
  const directMs = Date.parse(rawStr);
  if (!isNaN(directMs)) {
    const d = new Date(directMs);
    if (d.getFullYear() > 2000) return d;
  }

  // 2. Relative & Spoken language date parsing
  const lower = rawStr.toLowerCase();
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0); // Default 10 AM

  // Handle Days
  if (lower.includes("day after tomorrow")) {
    targetDate.setDate(now.getDate() + 2);
  } else if (lower.includes("tomorrow")) {
    targetDate.setDate(now.getDate() + 1);
  } else if (lower.includes("today")) {
    targetDate.setDate(now.getDate());
  } else {
    // Check for weekday names
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    let matchedDay = false;
    for (let d = 0; d < days.length; d++) {
      if (lower.includes(days[d])) {
        const currentDay = now.getDay();
        let diff = d - currentDay;
        if (diff <= 0) diff += 7;
        targetDate.setDate(now.getDate() + diff);
        matchedDay = true;
        break;
      }
    }

    if (!matchedDay) {
      // Check for explicit YYYY-MM-DD or MM/DD/YYYY
      const ymdMatch = lower.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymdMatch) {
        targetDate.setFullYear(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
      } else {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        let foundMonth = -1;
        for (let m = 0; m < 12; m++) {
          if (lower.includes(months[m]) || lower.includes(shortMonths[m])) {
            foundMonth = m;
            break;
          }
        }
        const dayMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?/);
        if (foundMonth !== -1 && dayMatch) {
          const dayNum = parseInt(dayMatch[1], 10);
          targetDate.setMonth(foundMonth, dayNum);
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }
      }
    }
  }

  // Handle Time: convert word numbers to digits for common hours
  const wordMap = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12"
  };
  let timeStr = lower;
  Object.keys(wordMap).forEach(w => {
    timeStr = timeStr.replace(new RegExp(`\\b${w}\\b`, "g"), wordMap[w]);
  });

  const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    if (!ampm && hours >= 1 && hours <= 7) hours += 12; // e.g. 4 -> 16 (4 PM)

    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

/**
 * Creates an appointment booking.
 */
export async function createAppointmentBooking(bookingData) {
  const timestamp = new Date().toISOString();
  const rawDateTime = bookingData.date_time || bookingData.dateTime || "As requested";
  const parsedDate = parseDateTime(rawDateTime);

  const isoDateTime = parsedDate ? parsedDate.toISOString() : null;
  const formattedDateTime = parsedDate ? parsedDate.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }) : rawDateTime;
  
  const record = {
    id: "APT-" + Date.now(),
    timestamp,
    patient_name: bookingData.patient_name || bookingData.name || "Valued Patient",
    phone_number: bookingData.phone_number || bookingData.phone || "Not provided",
    doctor_or_specialty: bookingData.doctor_or_specialty || bookingData.doctor || "General Consultation",
    date_time: formattedDateTime,
    raw_date_time: rawDateTime,
    iso_date_time: isoDateTime,
    insurance_details: bookingData.insurance_details || bookingData.insurance || "Self-pay / N/A",
    notes: bookingData.notes || "Booked via Apex Voice Assistant"
  };

  // 1. Save local backup to data/appointments.json
  try {
    ensureStorage();
    const existing = JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, "utf-8") || "[]");
    existing.push(record);
    fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`[Booking] Appointment recorded locally: ${record.id} for ${record.patient_name} at ${record.date_time}`);
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

