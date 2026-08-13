<p align="center">
  <img src="https://img.shields.io/badge/AI_Voice-Agent-00D2B8?style=for-the-badge&logo=livekit&logoColor=white" alt="AI Voice Agent" />
  <img src="https://img.shields.io/badge/LiveKit-Agents_v1.6-7C3AED?style=for-the-badge&logo=livekit&logoColor=white" alt="LiveKit Agents" />
  <img src="https://img.shields.io/badge/TTS-Rime_Coda-FF6B35?style=for-the-badge" alt="Rime Coda TTS" />
  <img src="https://img.shields.io/badge/LLM-Groq_Llama_3.3-0088FF?style=for-the-badge&logo=meta&logoColor=white" alt="Groq Llama 3.3" />
  <img src="https://img.shields.io/badge/Google-Sheets_%26_Calendar-34A853?style=for-the-badge&logo=googlesheets&logoColor=white" alt="Google Sheets & Calendar" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<h1 align="center">
 

  <br />
         https://booking-voice-ochre.vercel.app/   <br />
           <br />
  Apex Healthcare Clinic — AI Voice Booking Agent
  <br />
  <sub>Real-time conversational AI for healthcare appointment scheduling with Google Calendar & Sheets sync</sub>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/License-Private-lightgrey" alt="License" />
  <img src="https://img.shields.io/badge/Status-Production-10B981" alt="Status" />
  <img src="https://img.shields.io/badge/Google-Integrated-4285F4?logo=google&logoColor=white" alt="Google Integrated" />
</p>

---

A full-stack **AI voice agent** that powers appointment booking at Apex Healthcare Clinic (Gurugram, India). Visitors call **"Priya,"** the AI Senior Care Coordinator, via a premium dark-themed web UI. Under the hood, a LiveKit real-time pipeline connects **Deepgram STT → Groq Llama 3.3 LLM → Rime Coda TTS** with push-to-talk and preemptive speech generation. Bookings are **automatically synced to Google Calendar and Google Sheets** via a Google Apps Script webhook.

> **Demo Mode Built-In** — The app runs a fully functional mock demo when LiveKit credentials aren't configured, using the Web Speech API for voice I/O and the Groq Chat API for intelligent responses.

---


https://github.com/user-attachments/assets/acbdf94d-e796-46b2-8f7a-7f1bd4d84168

🔗 **[Watch the full demo on YouTube](https://www.youtube.com/watch?v=OV0wJUCw5n0)**
##  Features

| Feature | Details |
|:--------|:--------|
| 🎙️ **Push-to-Talk Voice** | RPC-driven mic control with LiveKit turn management — no echo or overlap |
| 🧠 **LLM Persona — "Priya"** | A warm, HIPAA-mindful Indian Care Coordinator who books appointments, quotes fees in ₹, and verifies insurance |
| 🔊 **Rime Coda TTS** | Ultra-realistic speech synthesis with per-voice `time_scale_factor` tuning |
| 📝 **Live Transcript** | Real-time chat bubbles with clean `display_text` (expressive tokens stripped) |
| ⚡ **Preemptive Generation** | LLM + TTS start on interim transcripts to cut response latency |
| 🔇 **Noise Cancellation** | LiveKit BVC noise cancellation for clean audio in any environment |
| 📅 **Google Calendar Sync** | Appointments auto-create Google Calendar events via Apps Script webhook |
| 📊 **Google Sheets Logging** | Every booking is logged in a structured Google Sheet with patient details |
| 🛠️ **LLM Function Calling** | Groq Llama 3.3 auto-invokes `book_appointment` tool when all details are collected |
| 💾 **Local JSON Backup** | All bookings persisted to `data/appointments.json` as failsafe |
| 🎨 **Premium UI** | Glassmorphic dark theme with Inter/Outfit typography, gradient CTAs, and micro-animations |
| 🔄 **Mock Demo Mode** | Full voice experience without any API keys via Web Speech API + Groq Chat fallback |

---

##  System Architecture

```mermaid
graph TB
    subgraph CLIENT[" Browser Client"]
        UI["Premium Web UI<br/>(index.html)"]
        LK_JS["LiveKit JS SDK"]
        MIC["Microphone Input"]
        SPEAKER["Audio Output"]
    end

    subgraph VERCEL[" Vercel / Node.js Server"]
        TOKEN["/api/token<br/>JWT Minting"]
        CHAT["/api/chat<br/>Groq LLM + Tool Calls"]
        TTS_API["/api/tts<br/>Rime Coda TTS Proxy"]
        BOOK["/api/book-appointment<br/>Booking Orchestrator"]
    end

    subgraph LIVEKIT[" LiveKit Cloud"]
        ROOM["LiveKit Room"]
        DISPATCH["Agent Dispatch<br/>(booth-agent)"]
    end

    subgraph AGENT[" Python Voice Agent"]
        ENTRY["Entrypoint<br/>(agent.py)"]
        PERSONA["Persona Engine<br/>(personas.py — Priya)"]
        PRONOUNCE["Pronunciation<br/>Hardening<br/>(pronounce.py)"]
        TOOL_CALL["book_appointment<br/>@ai_callable Tool"]

        subgraph PIPELINE["AI Pipeline"]
            STT["Deepgram Nova-3<br/>(LiveKit Inference)"]
            LLM["Groq Llama 3.3 70B<br/>(Versatile)"]
            TTS["Rime Coda TTS"]
        end

        VAD["Silero VAD"]
        BVC["BVC Noise<br/>Cancellation"]
    end

    subgraph GOOGLE[" Google Workspace"]
        GAS["Google Apps Script<br/>(Webhook)"]
        GCAL["Google Calendar<br/>(Event Creation)"]
        GSHEET["Google Sheets<br/>(Appointment Log)"]
    end

    subgraph STORAGE[" Local Storage"]
        JSON_DB["data/appointments.json"]
    end

    MIC -->|Audio| LK_JS
    UI -->|"POST /api/token"| TOKEN
    UI -->|"POST /api/chat"| CHAT
    UI -->|"POST /api/tts"| TTS_API
    TOKEN -->|"JWT + Room Config"| LK_JS
    LK_JS <-->|"WebRTC"| ROOM
    ROOM <-->|"Media Tracks"| DISPATCH
    DISPATCH --> ENTRY
    ENTRY --> PERSONA
    ENTRY --> VAD
    ENTRY --> BVC

    STT -->|"Transcript"| LLM
    LLM -->|"Response Text"| PRONOUNCE
    LLM -->|"Tool Call"| TOOL_CALL
    PRONOUNCE -->|"Hardened Text"| TTS
    TTS -->|"Audio Frames"| SPEAKER

    CHAT -->|"Tool Execution"| BOOK
    TOOL_CALL -->|"HTTP POST"| BOOK
    BOOK -->|"Webhook POST"| GAS
    BOOK -->|"Append Row"| JSON_DB
    GAS -->|"createEvent()"| GCAL
    GAS -->|"appendRow()"| GSHEET

    style CLIENT fill:#0D1524,stroke:#00D2B8,color:#F1F5F9
    style VERCEL fill:#0D1524,stroke:#7C3AED,color:#F1F5F9
    style LIVEKIT fill:#0D1524,stroke:#FF4D4D,color:#F1F5F9
    style AGENT fill:#0D1524,stroke:#0088FF,color:#F1F5F9
    style PIPELINE fill:#111A2A,stroke:#00D2B8,color:#F1F5F9
    style GOOGLE fill:#0D1524,stroke:#34A853,color:#F1F5F9
    style STORAGE fill:#0D1524,stroke:#F59E0B,color:#F1F5F9
```
# n8n-workflow-starforge
<div align="center">
  
#  Conversational AI Voice Agent

*An intelligent, low-latency voice assistant built on **n8n** that handles phone calls, processes natural language, and books appointments autonomously.*

[![n8n](https://img.shields.io/badge/n8n-Workflow_Automation-EA4B71?style=for-the-badge&logo=n8n)](https://n8n.io/)
[![Twilio](https://img.shields.io/badge/Twilio-Telephony-F22F46?style=for-the-badge&logo=twilio)](https://twilio.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3_70B-F55036?style=for-the-badge)](https://groq.com/)
[![Rime AI](https://img.shields.io/badge/Rime_AI-TTS-000000?style=for-the-badge)](https://rime.ai/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Audio_Storage-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)

---
</div>

##  Overview

This project implements a fully automated, conversational voice assistant using **n8n**. By connecting **Twilio** for telephony with **Groq's Llama-3-70B** model, the system can hold natural, real-time conversations over the phone. 

What makes this agent powerful is its ability to take action: during a call, it can intelligently trigger tools to **create Google Calendar events** and **append data to Google Sheets** (e.g., booking appointments). The agent's text responses are synthesized into lifelike speech using **Rime AI**, hosted instantly on **Cloudinary**, and played back to the caller seamlessly.

## 📸 Workflow Architecture

> **Note:** This is the visual representation of our n8n automation flow.

*(Delete this text and drag your image here)*

## ⚙️ The Tech Stack

- **[n8n](https://n8n.io/):** The core orchestration engine linking all APIs and services.
- **[Twilio](https://www.twilio.com/):** Receives incoming phone calls and sends the voice/text data to our webhook.
- **[Groq (Llama-3-70B)](https://groq.com/):** Serves as the brain of the agent. It processes the caller's intent, generates conversational text, and decides when to use external tools.
- **[Rime AI](https://rime.ai/):** Converts the LLM's text responses into ultra-realistic, low-latency audio.
- **[Cloudinary](https://cloudinary.com/):** Temporarily stores the generated audio files to generate a direct playback URL.
- **[Google Workspace](https://workspace.google.com/):** Used as memory and action endpoints for the AI to book calendar events and manage sheets.

##  System Flowchart

Here is the step-by-step execution path of our workflow:

```mermaid
graph TD
    %% Styling
    classDef twilio fill:#F22F46,stroke:#fff,stroke-width:2px,color:#fff;
    classDef n8n fill:#EA4B71,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ai fill:#F55036,stroke:#fff,stroke-width:2px,color:#fff;
    classDef rime fill:#000000,stroke:#fff,stroke-width:2px,color:#fff;
    classDef cloudinary fill:#3448C5,stroke:#fff,stroke-width:2px,color:#fff;
    classDef tools fill:#0F9D58,stroke:#fff,stroke-width:2px,color:#fff;

    %% Nodes
    User(("📱 Caller")):::twilio
    Webhook["⚡ n8n Webhook<br>(Receives Call Data)"]:::n8n
    Agent{"🤖 Groq AI Agent<br>(Llama-3-70B)"}:::ai
    Tools_Cal["📅 Google Calendar<br>(Create Event)"]:::tools
    Tools_Sheet["📊 Google Sheets<br>(Append Appointment)"]:::tools
    TTS["🗣️ Rime AI<br>(HTTP: Text-to-Speech)"]:::rime
    Storage["☁️ Cloudinary<br>(HTTP: Store Audio)"]:::cloudinary
    Response["📤 Webhook Response<br>(Sends Audio URL)"]:::n8n

    %% Flow
    User -->|Initiates Call via Twilio| Webhook
    Webhook --> Agent
    
    Agent -.->|Tool Call| Tools_Cal
    Agent -.->|Tool Call| Tools_Sheet
    
    Agent -->|Generates Text Response| TTS
    TTS -->|Returns Audio File| Storage
    Storage -->|Generates Public URL| Response
    Response -->|Plays Audio via Twilio| User
```

---

##  Google Sheets & Calendar Integration

The appointment booking system connects to **Google Workspace** via a Google Apps Script webhook. When a patient books an appointment — via voice or chat — the data flows through a dual-write pipeline:

```mermaid
flowchart LR
    subgraph TRIGGER["🎤 Booking Trigger"]
        VOICE["Voice Agent<br/>(Priya via LiveKit)"]
        CHAT_UI["Chat UI<br/>(Mock Demo Mode)"]
    end

    subgraph SERVER["⚙️ Node.js Booking Engine"]
        API["/api/book-appointment"]
        LOCAL["Save to<br/>appointments.json"]
        WEBHOOK["POST to Google<br/>Apps Script URL"]
    end

    subgraph GOOGLE_WS["🟢 Google Workspace"]
        GAS_FN["doPost(e)<br/>Apps Script Function"]
        SHEET[" Google Sheet<br/>Apex Clinic Appointments"]
        CAL["📅 Google Calendar<br/>30-min Event Created"]
    end

    VOICE -->|"@ai_callable<br/>book_appointment"| API
    CHAT_UI -->|"Groq tool_call<br/>book_appointment"| API
    API --> LOCAL
    API --> WEBHOOK
    WEBHOOK -->|"JSON payload"| GAS_FN
    GAS_FN -->|"appendRow()"| SHEET
    GAS_FN -->|"createEvent()"| CAL

    style TRIGGER fill:#1E293B,stroke:#00D2B8,color:#F1F5F9
    style SERVER fill:#1E293B,stroke:#7C3AED,color:#F1F5F9
    style GOOGLE_WS fill:#1E293B,stroke:#34A853,color:#F1F5F9
```

### Google Sheet Schema

| Column | Field | Example |
|:-------|:------|:--------|
| A | `Timestamp` | `2026-08-10 11:08:01` |
| B | `Patient Name` | `Rahul Sharma` |
| C | `Phone Number` | `+91 9876543210` |
| D | `Doctor / Specialty` | `Dr. Rajesh Sharma (General Medicine)` |
| E | `Appointment Date & Time` | `Tomorrow at 10 AM` |
| F | `Insurance / Payment` | `Star Health Insurance` |
| G | `Status` | `Confirmed` |
| H | `Notes` | `Routine Health Checkup` |

### Google Calendar Event

Each confirmed booking creates a **30-minute calendar event** with the title format:  
`Medical Appointment: <Patient Name> (<Doctor/Specialty>)`

The event description includes all collected patient details.

>  **Full Setup Guide** → See [`GOOGLE_INTEGRATION.md`](GOOGLE_INTEGRATION.md) for step-by-step setup instructions.

---

##  Call Flow Sequence

```mermaid
sequenceDiagram
    actor Patient as 👤 Patient
    participant UI as Web UI
    participant API as Token API
    participant LK as LiveKit Cloud
    participant Agent as Voice Agent (Priya)
    participant STT as Deepgram STT
    participant LLM as Groq Llama 3.3
    participant TTS as Rime Coda
    participant Book as /api/book-appointment
    participant Google as Google Apps Script

    Patient->>UI: Click "Call Priya Now"
    UI->>API: POST /api/token {industry, voice}
    API->>LK: Mint JWT + RoomAgentDispatch
    API-->>UI: {serverUrl, token, room}
    UI->>LK: Connect via WebRTC
    LK->>Agent: Dispatch booth-agent
    Agent->>Agent: Load Priya persona & greeting
    Agent->>TTS: Synthesize greeting
    TTS-->>Patient: 🔊 "Namaste! This is Priya..."

    loop Conversation
        Patient->>UI: 🎤 Tap mic (start_turn RPC)
        UI->>Agent: RPC: start_turn
        Agent->>Agent: Enable audio input
        Patient->>STT: Stream audio
        STT-->>Agent: Transcript (interim + final)
        Patient->>UI: 🎤 Tap mic again (end_turn RPC)
        UI->>Agent: RPC: end_turn
        Agent->>LLM: Full conversation context
        LLM-->>Agent: Response text
        Agent->>Agent: tts_pronounce() hardening
        Agent->>TTS: Hardened text
        TTS-->>Patient: 🔊 Spoken response
    end

    Note over Patient, Google: Appointment Booking Flow
    Patient->>Agent: "Book appointment with Dr. Rajesh tomorrow at 10 AM"
    Agent->>LLM: Context + booking request
    LLM-->>Agent: tool_call: book_appointment(...)
    Agent->>Book: HTTP POST booking payload
    Book->>Book: Save to appointments.json
    Book->>Google: POST webhook payload
    Google->>Google: appendRow() + createEvent()
    Google-->>Book: {status: "success"}
    Book-->>Agent: Booking confirmed
    Agent->>TTS: Confirmation message
    TTS-->>Patient: 🔊 "Your appointment is confirmed!"
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose | Version |
|:-----------|:--------|:--------|
| <img src="https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white&style=flat-square" /> | Single-page application shell | — |
| <img src="https://img.shields.io/badge/-CSS3-1572B6?logo=css3&logoColor=white&style=flat-square" /> | Glassmorphic dark theme, animations | — |
| <img src="https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black&style=flat-square" /> | LiveKit client, voice controls, mock mode | ES2022 |
| <img src="https://img.shields.io/badge/-LiveKit_JS-7C3AED?logo=livekit&logoColor=white&style=flat-square" /> | WebRTC real-time communication | v2.x CDN |
| <img src="https://img.shields.io/badge/-Web_Speech_API-4285F4?logo=google&logoColor=white&style=flat-square" /> | Browser speech recognition (mock mode fallback) | Native |

### Backend — Node.js API Server
| Technology | Purpose | Version |
|:-----------|:--------|:--------|
| <img src="https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white&style=flat-square" /> | HTTP server, static file serving, env loading | 18+ |
| <img src="https://img.shields.io/badge/-livekit--server--sdk-7C3AED?style=flat-square" /> | JWT minting, room configuration, agent dispatch | ^2.9.0 |
| <img src="https://img.shields.io/badge/-Groq_API-F55036?logo=groq&logoColor=white&style=flat-square" /> | LLM chat endpoint with function calling (`/api/chat`) | — |
| <img src="https://img.shields.io/badge/-Rime_Coda-FF6B35?style=flat-square" /> | TTS proxy endpoint (`/api/tts`) | — |
| <img src="https://img.shields.io/badge/-Google_Apps_Script-34A853?logo=google&logoColor=white&style=flat-square" /> | Webhook integration for Sheets + Calendar sync | — |
| <img src="https://img.shields.io/badge/-Vercel-000000?logo=vercel&logoColor=white&style=flat-square" /> | Serverless deployment (functions at `/api/*`) | — |

### Backend — Python Voice Agent
| Technology | Purpose | Version |
|:-----------|:--------|:--------|
| <img src="https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white&style=flat-square" /> | Agent runtime | 3.10 – 3.14 |
| <img src="https://img.shields.io/badge/-LiveKit_Agents-7C3AED?style=flat-square" /> | Agent framework, session management, RPC | ~1.6 |
| <img src="https://img.shields.io/badge/-Deepgram_Nova_3-13EF93?style=flat-square" /> | Speech-to-Text (via LiveKit Inference, keyless) | — |
| <img src="https://img.shields.io/badge/-Groq-F55036?logo=groq&logoColor=white&style=flat-square" /> | LLM inference (Llama 3.3 70B Versatile) | — |
| <img src="https://img.shields.io/badge/-Rime_Coda-FF6B35?style=flat-square" /> | Text-to-Speech with per-voice speed tuning | — |
| <img src="https://img.shields.io/badge/-Silero_VAD-00ACC1?style=flat-square" /> | Voice Activity Detection | — |
| <img src="https://img.shields.io/badge/-BVC-FF4D4D?style=flat-square" /> | Background Voice Cancellation / Noise cancellation | ~0.2 |
| <img src="https://img.shields.io/badge/-uv-7C3AED?style=flat-square" /> | Fast Python package manager | Latest |
| <img src="https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white&style=flat-square" /> | Containerized agent deployment | Multi-stage |

### Integrations
| Technology | Purpose | Connection |
|:-----------|:--------|:-----------|
| <img src="https://img.shields.io/badge/-Google_Sheets-34A853?logo=googlesheets&logoColor=white&style=flat-square" /> | Appointment log database | Apps Script `appendRow()` |
| <img src="https://img.shields.io/badge/-Google_Calendar-4285F4?logo=googlecalendar&logoColor=white&style=flat-square" /> | Calendar event creation | Apps Script `createEvent()` |
| <img src="https://img.shields.io/badge/-Google_Apps_Script-EA4335?logo=google&logoColor=white&style=flat-square" /> | Serverless webhook glue | `doPost(e)` web app endpoint |

---

## 🔗 Tech Stack Connection Map

```mermaid
graph LR
    subgraph FRONTEND["🖥️ Frontend Layer"]
        HTML["HTML5 SPA"]
        CSS["CSS3 Glassmorphic"]
        JS["JavaScript ES2022"]
    end

    subgraph COMM["📡 Communication"]
        LKJS["LiveKit JS SDK"]
        WEBRTC["WebRTC"]
        REST["REST API Calls"]
    end

    subgraph NODE["⚙️ Node.js Server"]
        TOKEN_EP["/api/token"]
        CHAT_EP["/api/chat"]
        TTS_EP["/api/tts"]
        BOOK_EP["/api/book-appointment"]
    end

    subgraph EXTERNAL["🌐 External APIs"]
        GROQ["Groq API<br/>(Llama 3.3 70B)"]
        RIME["Rime API<br/>(Coda TTS)"]
        LK_CLOUD["LiveKit Cloud"]
    end

    subgraph AGENT_RT["🤖 Python Agent Runtime"]
        LKAGENT["LiveKit Agents v1.6"]
        DEEPGRAM["Deepgram Nova-3 STT"]
        SILERO["Silero VAD"]
        BVC_NC["BVC Noise Cancel"]
    end

    subgraph GOOGLE_INT["🟢 Google Integration"]
        GAS_WH["Apps Script Webhook"]
        G_SHEETS["Google Sheets"]
        G_CAL["Google Calendar"]
    end

    HTML --> JS
    CSS --> HTML
    JS --> LKJS
    JS --> REST
    LKJS --> WEBRTC
    WEBRTC --> LK_CLOUD
    REST --> TOKEN_EP
    REST --> CHAT_EP
    REST --> TTS_EP

    TOKEN_EP --> LK_CLOUD
    CHAT_EP --> GROQ
    CHAT_EP --> BOOK_EP
    TTS_EP --> RIME
    BOOK_EP --> GAS_WH
    GAS_WH --> G_SHEETS
    GAS_WH --> G_CAL

    LK_CLOUD --> LKAGENT
    LKAGENT --> DEEPGRAM
    LKAGENT --> GROQ
    LKAGENT --> RIME
    LKAGENT --> SILERO
    LKAGENT --> BVC_NC
    LKAGENT --> BOOK_EP

    style FRONTEND fill:#0D1524,stroke:#00D2B8,color:#F1F5F9
    style COMM fill:#0D1524,stroke:#0088FF,color:#F1F5F9
    style NODE fill:#0D1524,stroke:#7C3AED,color:#F1F5F9
    style EXTERNAL fill:#0D1524,stroke:#FF6B35,color:#F1F5F9
    style AGENT_RT fill:#0D1524,stroke:#FF4D4D,color:#F1F5F9
    style GOOGLE_INT fill:#0D1524,stroke:#34A853,color:#F1F5F9
```

---

##  Project Structure

```
apex-healthcare-voice-agent/
│
├── 📄 README.md                   ← You are here
├── 📄 GOOGLE_INTEGRATION.md       ← Step-by-step Google Sheets & Calendar setup
├── 📄 package.json                ← Node.js manifest (livekit-server-sdk)
├── 📄 server.js                   ← Local dev server (static + /api/* proxy)
├── 📄 vercel.json                 ← Vercel deployment config
├── 📄 .env.example                ← Frontend env template
├── 📄 .gitignore
├── 📄 .vercelignore
│
├── 📂 public/                     ← Static frontend (served by Vercel / Node)
│   └── 📄 index.html              ← Full SPA: hero, doctors grid, call modal (46KB)
│
├── 📂 api/                        ← Vercel serverless functions
│   ├── 📄 token.js                ← POST /api/token — JWT minting + agent dispatch
│   ├── 📄 chat.js                 ← POST /api/chat — Groq LLM with book_appointment tool
│   ├── 📄 tts.js                  ← POST /api/tts — Rime Coda TTS audio proxy
│   ├── 📄 book-appointment.js     ← POST /api/book-appointment — Booking orchestrator
│   └── 📄 booking.js              ← Core booking logic: local save + Google webhook dispatch
│
├── 📂 data/                       ← Local appointment storage
│   └── 📄 appointments.json       ← JSON backup of all bookings (failsafe)
│
└── 📂 agent/                      ← LiveKit voice agent (Python)
    ├── 📄 agent.py                ← Entrypoint: BoothAgent class, RPC handlers, book_appointment tool
    ├── 📄 personas.py             ← "Priya" persona, clinic details, voice config, system prompt
    ├── 📄 pronounce.py            ← TTS pronunciation hardening (Rime→Rhyme, em-dash, etc.)
    ├── 📄 pyproject.toml          ← Python dependencies (livekit-agents + plugins)
    ├── 📄 Dockerfile              ← Multi-stage production container
    ├── 📄 livekit.toml            ← LiveKit agent configuration
    ├── 📄 .env.example            ← Agent env template (LiveKit + Groq + Rime keys)
    └── 📄 README.md               ← Agent-specific documentation
```

---

##  Quick Start

### Prerequisites

| Tool | Install |
|:-----|:--------|
| **Node.js** 18+ | [nodejs.org](https://nodejs.org) |
| **Python** 3.10+ | [python.org](https://python.org) |
| **uv** (Python pkg mgr) | `pip install uv` |
| **LiveKit Cloud Account** | [cloud.livekit.io](https://cloud.livekit.io) |

### 1️⃣ Clone & Install

```bash
git clone https://github.com/MaanasVerma25/Booking-voice.git
cd Booking-voice
npm install
```

### 2️⃣ Configure Environment

```bash
# Frontend / Token Server
cp .env.example .env
# Fill in:
#   LIVEKIT_URL=wss://your-project.livekit.cloud
#   LIVEKIT_API_KEY=...
#   LIVEKIT_API_SECRET=...
#   GOOGLE_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# Voice Agent
cd agent
cp .env.example .env
# Fill in:
#   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
#   GROQ_API_KEY=...
#   RIME_API_KEY=...
#   GOOGLE_WEBHOOK_URL=... (same webhook URL)
```

### 3️⃣ Set Up Google Integration (Optional but Recommended)

Follow the step-by-step guide in [`GOOGLE_INTEGRATION.md`](GOOGLE_INTEGRATION.md) to:
1. Create a Google Sheet with the appointment schema
2. Add the Apps Script webhook handler
3. Deploy as a web app
4. Add the webhook URL to your `.env`

### 4️⃣ Start the Voice Agent

```bash
cd agent
uv sync
uv run agent.py dev
```

### 5️⃣ Start the Frontend

```bash
# From project root
npm run dev
# → http://localhost:3000
```

> ** No API keys?** The app automatically falls into **Mock Demo Mode** — Priya responds with intelligent replies using the Groq Chat API and the browser's built-in speech synthesis. Perfect for UI development and demos.

---

##  Agent Intelligence

### Persona System

The agent embodies **Priya**, a Senior Care Coordinator at Apex Healthcare Clinic (Gurugram, India) with knowledge of:

```mermaid
mindmap
  root((Priya<br/>Senior Care<br/>Coordinator))
     Appointments
      Book new visits
      Reschedule existing
      Cancel appointments
      Auto-sync to Google Calendar
      Log to Google Sheets
     Doctors & Specialties
      Dr. Rajesh Sharma — General Medicine — ₹500
      Dr. Ananya Deshmukh — Cardiology — ₹1200
      Dr. Amit Patel — Pediatrics — ₹700
      Dr. Sunita Rao — Dermatology — ₹900
      Dr. Vikram Malhotra — Orthopedics — ₹1000
      Dr. Rohan Verma — Neurology — ₹1500
      Dr. Meera Nambiar — Gastroenterology — ₹1100
      Dr. Sanjay Gupta — ENT — ₹800
     Clinic Info
      Hours: Mon-Sat 8AM-8PM, Sun 9AM-2PM
      Location: 108 Ring Road, Gurugram
      24/7 Emergency & Urgent Care
     Insurance & Payment
      Star Health, HDFC ERGO, ICICI Lombard
      Niva Bupa, Care Health, Ayushman Bharat
      UPI, Cards, Cash, EMI options
     Lab & Diagnostics
      CBC ₹350, Lipid Panel ₹600
      X-Ray ₹800, MRI ₹4500
      ECG ₹400, Ultrasound ₹1200
     Telehealth
      20% discount on virtual consults
      WhatsApp video, app, or browser
```

### LLM Function Calling — Appointment Booking Tool

The Groq Llama 3.3 LLM is equipped with a `book_appointment` function tool. When the patient provides all required details (name, phone, doctor, date/time), the LLM **automatically invokes** the tool:

```mermaid
flowchart TD
    A[" Patient speaks:<br/>'Book Dr. Rajesh tomorrow 10 AM'"] --> B{"🧠 LLM Checks:<br/>All 4 fields collected?"}
    B -->|" Missing fields"| C["Ask patient for<br/>missing details"]
    C --> A
    B -->|" All collected"| D["LLM emits tool_call:<br/>book_appointment(...)"]
    D --> E["/api/book-appointment<br/>Node.js handler"]
    E --> F["💾 Save to<br/>appointments.json"]
    E --> G{"GOOGLE_WEBHOOK_URL<br/>configured?"}
    G -->|"Yes"| H["POST to Google<br/>Apps Script"]
    H --> I["📊 Append row to<br/>Google Sheet"]
    H --> J["📅 Create event in<br/>Google Calendar"]
    G -->|"No"| K["Skip webhook<br/>(local-only save)"]
    F --> L["Return booking<br/>confirmation"]
    I --> L
    J --> L
    K --> L
    L --> M["🔊 Priya confirms:<br/>'Appointment booked!'"]

    style A fill:#1E293B,stroke:#00D2B8,color:#F1F5F9
    style D fill:#1E293B,stroke:#7C3AED,color:#F1F5F9
    style H fill:#1E293B,stroke:#34A853,color:#F1F5F9
    style M fill:#1E293B,stroke:#00D2B8,color:#F1F5F9
```

### Required Booking Fields

| # | Field | Example | Collection Method |
|:--|:------|:--------|:-----------------|
| 1 | Patient's Full Name | `Rahul Sharma` | Asked by Priya |
| 2 | Mobile / Phone Number | `+91 9876543210` | Asked by Priya |
| 3 | Doctor / Specialty | `Dr. Rajesh Sharma` | Selected or spoken |
| 4 | Preferred Date & Time | `Tomorrow at 10 AM` | Requested by patient |

### Pronunciation Hardening Pipeline

All LLM output passes through `tts_pronounce()` before reaching the TTS engine:

```mermaid
graph LR
    A["LLM Output"] --> B["Em-dash → Comma"]
    B --> C["AI4 → 'AI four'"]
    C --> D["Rime → 'Rhyme'"]
    D --> E["Collapse ha runs"]
    E --> F["Strip stray asterisks"]
    F --> G["Normalize repeats<br/>(sooooo → so)"]
    G --> H["Dedupe punctuation<br/>(!! → !)"]
    H --> I["🔊 Rime Coda TTS"]

    style A fill:#1E293B,stroke:#0088FF,color:#F1F5F9
    style I fill:#1E293B,stroke:#00D2B8,color:#F1F5F9
```

---

##  API Endpoints

| Endpoint | Method | Description |
|:---------|:-------|:------------|
| `/api/token` | POST | Mints LiveKit JWT, configures room, dispatches `booth-agent` |
| `/api/chat` | POST | Groq Llama 3.3 chat with `book_appointment` function tool |
| `/api/tts` | POST/GET | Proxies text to Rime Coda TTS, returns MP3 audio |
| `/api/book-appointment` | POST | Saves booking locally + dispatches to Google webhook |

### `/api/chat` — Groq LLM with Function Calling

```json
// Request
POST /api/chat
{
  "message": "Book appointment with Dr. Rajesh tomorrow at 10 AM",
  "history": [
    { "role": "user", "content": "Hi Priya" },
    { "role": "assistant", "content": "Namaste! How can I help?" }
  ]
}

// Response (when tool is invoked)
{
  "reply": "Your appointment with Dr. Rajesh Sharma is confirmed for tomorrow at ten AM!",
  "booking": {
    "success": true,
    "booking": { "id": "APT-1786338481542", ... },
    "googleSynced": true
  },
  "model": "llama-3.3-70b-versatile"
}
```

---

## 🚢 Deployment

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

> ⚠️ Turn **Deployment Protection off** if the app needs public access without authentication.

### Voice Agent → LiveKit Cloud

```bash
cd agent

# First time: create the agent
lk agent create --region us-east --secrets-file .env

# Subsequent updates
lk agent deploy
```

### Voice Agent → Docker (Self-hosted)

```bash
cd agent
docker build -t apex-voice-agent .
docker run --env-file .env apex-voice-agent
```

---

##  Environment Variables

### Frontend (`/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `GOOGLE_WEBHOOK_URL` | ⭐ | Google Apps Script webhook URL for Calendar + Sheets |
| `PORT` | ❌ | Dev server port (default: `3000`) |

### Agent (`/agent/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `GROQ_API_KEY` | ✅ | Groq API key for Llama 3.3 70B |
| `RIME_API_KEY` | ✅ | Rime API key for Coda TTS |
| `GOOGLE_WEBHOOK_URL` | ⭐ | Google Apps Script webhook URL (same as frontend) |

> 🔒 All `.env` files are gitignored. Share credentials via a password manager only.  
> ⭐ `GOOGLE_WEBHOOK_URL` is optional but recommended — without it, bookings are saved locally to `data/appointments.json` only.

---

##  Design System

The frontend uses a carefully crafted dark theme optimized for healthcare:

```
Color Palette
─────────────────────────────────
Background     #090E17  ██████  Deep Navy
Card BG        #111A2A  ██████  Frosted Glass
Primary        #00D2B8  ██████  Medical Teal
Accent Blue    #0088FF  ██████  Trust Blue
Google Green   #34A853  ██████  Integration Green
Text Main      #F1F5F9  ██████  Clean White
Text Muted     #94A3B8  ██████  Soft Gray
Danger         #FF4D4D  ██████  Alert Red
Success        #10B981  ██████  Health Green
─────────────────────────────────
Typography: Inter (body) + Outfit (headings)
```

---

##  Testing

### Test Appointment Booking via cURL / PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/book-appointment" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"patient_name": "Rohan Verma", "phone_number": "+91 9876543210", "doctor_or_specialty": "Dr. Rajesh Sharma (General Medicine)", "date_time": "Tomorrow at 10 AM", "insurance_details": "Star Health Insurance", "notes": "Fever and routine health checkup"}'
```

### Test via Voice Assistant

Speak to Priya:
> *"Hi Priya, I want to book an appointment with Dr. Rajesh Sharma tomorrow at 10 AM. My name is Rohan Verma and my phone number is 9876543210."*

Priya will automatically invoke `book_appointment` and save the event to Google Calendar and Google Sheets!

### Test via Chat (Mock Mode)

In mock demo mode, type the same booking request in the chat interface. The Groq LLM will invoke the `book_appointment` tool call and confirm the booking.

---

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  <sub>Built by Maanas,Kartikeya,Yogita and Varuni using Rime Coda TTS, Groq, Qdrant, Google Sheets & Google Calendar</sub>
  <br />
  <sub>© 2026 Apex Healthcare Clinic Voice AI</sub>
</p>
