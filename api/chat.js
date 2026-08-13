// Vercel serverless function: Groq LLM endpoint for Apex Medical Center Voice Assistant.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppointmentBooking } from "./booking.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get GROQ_API_KEY from process.env or agent/.env
function getGroqKey() {
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("your_")) {
    return process.env.GROQ_API_KEY;
  }
  try {
    const agentEnvPath = path.join(__dirname, "..", "agent", ".env");
    if (fs.existsSync(agentEnvPath)) {
      const content = fs.readFileSync(agentEnvPath, "utf-8");
      const match = content.match(/GROQ_API_KEY=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (_) {}
  return null;
}

function getSystemPrompt() {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTimeStr = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

  return `You are Priya, a warm, caring, respectful, and professional Senior Care Coordinator at Apex Healthcare Clinic in Gurugram, India.
Today's Clinic Date & Time: ${currentDateStr}, ${currentTimeStr}.

APPOINTMENT BOOKING WORKFLOW:
When a patient expresses interest in booking an appointment, check if you have all required booking details:
1. Patient's Full Name
2. Contact Mobile / Phone Number
3. Specialty or Doctor required (e.g. Dr. Rajesh Sharma for General Medicine, Dr. Ananya Deshmukh for Cardiology, Dr. Sunita Rao for Dermatology, Dr. Amit Patel for Pediatrics, Dr. Vikram Malhotra for Orthopedics, Dr. Rohan Verma for Neurology, Dr. Meera Nambiar for Gastroenterology, Dr. Sanjay Gupta for ENT)
4. Preferred Date and Time

IF ANY DETAILS ARE MISSING:
Warmly ask the patient for the missing information in a concise, polite sentence (e.g., "I would be happy to book an appointment for you! May I please have your full name, contact phone number, and preferred doctor or specialty?"). Do NOT invoke 'book_appointment' until you have the patient's name, phone number, doctor/specialty, and date/time.

ONCE YOU HAVE ALL DETAILS (Name, Phone Number, Doctor/Specialty, Date/Time):
Invoke the 'book_appointment' function tool to register the appointment in Google Calendar and Google Sheets, and confirm the details to the patient. For date_time argument, include both specific date and time clearly (e.g. "Tomorrow at 4:00 PM" or "2026-08-14 16:00").

Apex Healthcare Clinic (India) Database:
- Address: One hundred eight Ring Road, Near Cyber City, Phase Two, Gurugram, Haryana.
- Regular Hours: Monday through Saturday eight AM to eight PM, Sunday nine AM to two PM.
- Emergency / Urgent Care: Open twenty-four hours.

Specialists & Consultation Fees:
- General Medicine: Dr. Rajesh Sharma (five hundred rupees).
- Cardiology: Dr. Ananya Deshmukh (one thousand two hundred rupees).
- Pediatrics: Dr. Amit Patel (seven hundred rupees).
- Dermatology: Dr. Sunita Rao (nine hundred rupees).
- Orthopedics: Dr. Vikram Malhotra (one thousand rupees).
- Neurology: Dr. Rohan Verma (one thousand five hundred rupees).
- Gastroenterology: Dr. Meera Nambiar (one thousand one hundred rupees).
- ENT: Dr. Sanjay Gupta (eight hundred rupees).

VOICE & DIALOGUE RULES:
- Keep replies concise (1 to 3 sentences) and conversational in clear, respectful Indian English.
- Never write digits or symbols: spell numbers and currency as words (e.g., five hundred rupees, ten AM, nine eight seven six five four three two one zero).`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Saves appointment directly to Google Calendar and Google Sheets once patient name, phone number, doctor/specialty, and date/time are collected.",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string", description: "Full name of the patient" },
          phone_number: { type: "string", description: "Mobile / contact phone number of the patient" },
          doctor_or_specialty: { type: "string", description: "Doctor name or medical specialty required" },
          date_time: { type: "string", description: "Date and time requested for appointment (e.g. 'Tomorrow at 4:00 PM' or '2026-08-14 16:00')" },
          insurance_details: { type: "string", description: "Insurance or cashless TPA details if provided" },
          notes: { type: "string", description: "Reason for visit or additional notes" }
        },
        required: ["patient_name", "phone_number", "doctor_or_specialty", "date_time"]
      }
    }
  }
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  let body = {};
  if (typeof req.body === "string") {
    try { body = JSON.parse(req.body); } catch (_) { body = {}; }
  } else if (req.body && typeof req.body === "object") {
    body = req.body;
  }

  const userMessage = body.message || "";
  const history = Array.isArray(body.history) ? body.history : [];

  if (!userMessage.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const apiKey = getGroqKey();
  if (!apiKey) {
    return res.status(200).json({
      reply: "I am happy to assist you! For appointment bookings, doctor consultations, lab tests, or insurance questions at Apex Medical Center, please let me know what you need.",
      source: "fallback"
    });
  }

  try {
    const messages = [
      { role: "system", content: getSystemPrompt() },
      ...history.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content })),
      { role: "user", content: userMessage }
    ];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.5,
        max_tokens: 300
      })
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error response:", errText);
      throw new Error(`Groq API returned status ${groqResponse.status}`);
    }

    const data = await groqResponse.json();
    const choiceMessage = data.choices?.[0]?.message;

    // Check if the LLM invoked tool call 'book_appointment'
    if (choiceMessage?.tool_calls && choiceMessage.tool_calls.length > 0) {
      const toolCall = choiceMessage.tool_calls[0];
      if (toolCall.function?.name === "book_appointment") {
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch (_) {}

        console.log("[Groq Chat] Executing tool call book_appointment with args:", args);
        const bookingResult = await createAppointmentBooking(args);

        // Append tool execution context
        messages.push(choiceMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: "book_appointment",
          content: JSON.stringify(bookingResult)
        });

        // Request final spoken response from LLM confirming booking
        const followUpResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.5,
            max_tokens: 250
          })
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const reply = followUpData.choices?.[0]?.message?.content || `I have booked your appointment for ${args.patient_name || 'you'} with ${args.doctor_or_specialty || 'our specialist'} on ${args.date_time || 'the requested time'} and saved it to Google Calendar and Sheets.`;
          return res.status(200).json({ reply, booking: bookingResult, model: "llama-3.3-70b-versatile" });
        }
      }
    }

    const reply = choiceMessage?.content || "Thank you for reaching out to Apex Medical Center. How else can I assist you?";
    return res.status(200).json({ reply, model: "llama-3.3-70b-versatile" });

  } catch (err) {
    console.error("Error in Groq chat endpoint:", err);
    return res.status(200).json({
      reply: "Thank you for contacting Apex Medical Center! I am happy to help you book appointments with our specialists, verify insurance, or check lab testing pricing.",
      source: "fallback_error"
    });
  }
}
