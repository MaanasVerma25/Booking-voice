<p align="center">
  <img src="https://img.shields.io/badge/AI_Voice-Agent-00D2B8?style=for-the-badge&logo=livekit&logoColor=white" alt="AI Voice Agent" />
  <img src="https://img.shields.io/badge/LiveKit-Agents_v1.6-7C3AED?style=for-the-badge&logo=livekit&logoColor=white" alt="LiveKit Agents" />
  <img src="https://img.shields.io/badge/TTS-Rime_Coda-FF6B35?style=for-the-badge" alt="Rime Coda TTS" />
  <img src="https://img.shields.io/badge/LLM-Groq_Llama_3.3-0088FF?style=for-the-badge&logo=meta&logoColor=white" alt="Groq Llama 3.3" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<h1 align="center">
  <br />
  🏥 Apex Medical Center — AI Voice Booking Agent
  <br />
  <sub>Real-time conversational AI for healthcare appointment scheduling</sub>
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/License-Private-lightgrey" alt="License" />
  <img src="https://img.shields.io/badge/Status-Production-10B981" alt="Status" />
</p>

---

A full-stack **AI voice agent** that powers appointment booking at Apex Medical Center. Visitors call "Sarah," the AI Care Coordinator, via a premium dark-themed web UI. Under the hood, a LiveKit real-time pipeline connects **Deepgram STT → Groq Llama 3.3 LLM → Rime Coda TTS** with push-to-talk and preemptive speech generation for a latency-optimized conversational experience.

> **Demo Mode Built-In** — The app runs a fully functional mock demo when LiveKit credentials aren't configured, using the Web Speech API for voice I/O.

---

## ✨ Features

| Feature | Details |
|:--------|:--------|
| 🎙️ **Push-to-Talk Voice** | RPC-driven mic control with LiveKit turn management — no echo or overlap |
| 🧠 **LLM Persona** | "Sarah" — a warm, HIPAA-mindful care coordinator who books appointments, quotes fees, and verifies insurance |
| 🔊 **Rime Coda TTS** | Ultra-realistic speech synthesis with per-voice `time_scale_factor` tuning |
| 📝 **Live Transcript** | Real-time chat bubbles with clean `display_text` (expressive tokens stripped) |
| ⚡ **Preemptive Generation** | LLM + TTS start on interim transcripts to cut response latency |
| 🔇 **Noise Cancellation** | LiveKit BVC noise cancellation for clean audio in any environment |
| 🎨 **Premium UI** | Glassmorphic dark theme with Inter/Outfit typography, gradient CTAs, and micro-animations |
| 🔄 **Mock Demo Mode** | Full voice experience without any API keys via Web Speech API fallback |

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph CLIENT["🖥️ Browser Client"]
        UI["Premium Web UI<br/>(index.html)"]
        LK_JS["LiveKit JS SDK"]
        MIC["Microphone Input"]
        SPEAKER["Audio Output"]
    end

    subgraph VERCEL["☁️ Vercel / Node.js Server"]
        TOKEN["Token API<br/>/api/token"]
        STATIC["Static File Server<br/>(public/)"]
    end

    subgraph LIVEKIT["🔴 LiveKit Cloud"]
        ROOM["LiveKit Room"]
        DISPATCH["Agent Dispatch<br/>(booth-agent)"]
    end

    subgraph AGENT["🤖 Python Voice Agent"]
        ENTRY["Entrypoint<br/>(agent.py)"]
        PERSONA["Persona Engine<br/>(personas.py)"]
        PRONOUNCE["Pronunciation<br/>Hardening<br/>(pronounce.py)"]

        subgraph PIPELINE["AI Pipeline"]
            STT["Deepgram Nova-3<br/>(LiveKit Inference)"]
            LLM["Groq Llama 3.3 70B<br/>(Versatile)"]
            TTS["Rime Coda TTS"]
        end

        VAD["Silero VAD"]
        BVC["BVC Noise<br/>Cancellation"]
    end

    MIC -->|Audio| LK_JS
    UI -->|"POST /api/token"| TOKEN
    TOKEN -->|"JWT + Room Config"| LK_JS
    LK_JS <-->|"WebRTC"| ROOM
    ROOM <-->|"Media Tracks"| DISPATCH
    DISPATCH --> ENTRY
    ENTRY --> PERSONA
    ENTRY --> VAD
    ENTRY --> BVC

    STT -->|"Transcript"| LLM
    LLM -->|"Response Text"| PRONOUNCE
    PRONOUNCE -->|"Hardened Text"| TTS
    TTS -->|"Audio Frames"| SPEAKER

    style CLIENT fill:#0D1524,stroke:#00D2B8,color:#F1F5F9
    style VERCEL fill:#0D1524,stroke:#7C3AED,color:#F1F5F9
    style LIVEKIT fill:#0D1524,stroke:#FF4D4D,color:#F1F5F9
    style AGENT fill:#0D1524,stroke:#0088FF,color:#F1F5F9
    style PIPELINE fill:#111A2A,stroke:#00D2B8,color:#F1F5F9
```

---

## 🔄 Call Flow Sequence

```mermaid
sequenceDiagram
    actor Patient as 👤 Patient
    participant UI as Web UI
    participant API as Token API
    participant LK as LiveKit Cloud
    participant Agent as Voice Agent
    participant STT as Deepgram STT
    participant LLM as Groq Llama 3.3
    participant TTS as Rime Coda

    Patient->>UI: Click "Call Sarah Now"
    UI->>API: POST /api/token {industry, voice}
    API->>LK: Mint JWT + RoomAgentDispatch
    API-->>UI: {serverUrl, token, room}
    UI->>LK: Connect via WebRTC
    LK->>Agent: Dispatch booth-agent
    Agent->>Agent: Load persona & greeting
    Agent->>TTS: Synthesize greeting
    TTS-->>Patient: 🔊 "Hello! This is Sarah..."

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

### Backend — Token Server
| Technology | Purpose | Version |
|:-----------|:--------|:--------|
| <img src="https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white&style=flat-square" /> | HTTP server, static file serving, env loading | 18+ |
| <img src="https://img.shields.io/badge/-livekit--server--sdk-7C3AED?style=flat-square" /> | JWT minting, room configuration, agent dispatch | ^2.9.0 |
| <img src="https://img.shields.io/badge/-Vercel-000000?logo=vercel&logoColor=white&style=flat-square" /> | Serverless deployment (token function at `/api/token`) | — |

### Backend — Voice Agent
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

---

## 📁 Project Structure

```
apex-medical-voice-agent/
│
├── 📄 README.md                   ← You are here
├── 📄 package.json                ← Node.js manifest (livekit-server-sdk)
├── 📄 server.js                   ← Local dev server (static + /api/token proxy)
├── 📄 vercel.json                 ← Vercel deployment config
├── 📄 .env.example                ← Frontend env template
├── 📄 .gitignore
├── 📄 .vercelignore
│
├── 📂 public/                     ← Static frontend (served by Vercel / Node)
│   └── 📄 index.html              ← Full SPA: hero, doctors grid, call modal (31KB)
│
├── 📂 api/                        ← Vercel serverless functions
│   └── 📄 token.js                ← POST /api/token — JWT minting + agent dispatch
│
└── 📂 agent/                      ← LiveKit voice agent (Python)
    ├── 📄 agent.py                ← Entrypoint: BoothAgent class, RPC handlers, session setup
    ├── 📄 personas.py             ← "Sarah" persona, clinic details, voice config, system prompt
    ├── 📄 pronounce.py            ← TTS pronunciation hardening (Rime→Rhyme, em-dash, etc.)
    ├── 📄 pyproject.toml          ← Python dependencies (livekit-agents + plugins)
    ├── 📄 Dockerfile              ← Multi-stage production container
    ├── 📄 livekit.toml            ← LiveKit agent configuration
    ├── 📄 .env.example            ← Agent env template (LiveKit + Groq + Rime keys)
    └── 📄 README.md               ← Agent-specific documentation
```

---

## 🚀 Quick Start

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

# Voice Agent
cd agent
cp .env.example .env
# Fill in:
#   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
#   ANTHROPIC_API_KEY=...
#   RIME_API_KEY=...
```

### 3️⃣ Start the Voice Agent

```bash
cd agent
uv sync
uv run agent.py dev
```

### 4️⃣ Start the Frontend

```bash
# From project root
npm run dev
# → http://localhost:3000
```

> **💡 No API keys?** The app automatically falls into **Mock Demo Mode** — Sarah responds with scripted replies using the browser's built-in speech synthesis. Perfect for UI development and demos.

---

## 🧠 Agent Intelligence

### Persona System

The agent embodies **Sarah**, a Care Coordinator at Apex Medical Center with knowledge of:

```mermaid
mindmap
  root((Sarah<br/>Care Coordinator))
    📅 Appointments
      Book new visits
      Reschedule existing
      Cancel appointments
    👨‍⚕️ Doctors & Specialties
      Dr. Robert Vance — Family Medicine — $120
      Dr. Elena Rostova — Cardiology — $220
      Dr. Marcus Chen — Pediatrics — $150
      Dr. Sophia Alvarez — Dermatology — $180
    🏥 Clinic Info
      Hours: Mon-Fri 8AM-6PM, Sat 9AM-2PM
      Location: 500 Medical Parkway, Suite A
    💳 Insurance
      Blue Cross Blue Shield
      Aetna, Cigna, UnitedHealth
      Medicare
```

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

## 🔐 Environment Variables

### Frontend (`/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `PORT` | ❌ | Dev server port (default: `3000`) |

### Agent (`/agent/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `LIVEKIT_URL` | ✅ | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | ✅ | LiveKit API key |
| `LIVEKIT_API_SECRET` | ✅ | LiveKit API secret |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for Claude |
| `RIME_API_KEY` | ✅ | Rime API key for Coda TTS |

> 🔒 All `.env` files are gitignored. Share credentials via a password manager only.

---

## 🎨 Design System

The frontend uses a carefully crafted dark theme optimized for healthcare:

```
Color Palette
─────────────────────────────────
Background     #090E17  ██████  Deep Navy
Card BG        #111A2A  ██████  Frosted Glass
Primary        #00D2B8  ██████  Medical Teal
Accent Blue    #0088FF  ██████  Trust Blue
Text Main      #F1F5F9  ██████  Clean White
Text Muted     #94A3B8  ██████  Soft Gray
Danger         #FF4D4D  ██████  Alert Red
Success        #10B981  ██████  Health Green
─────────────────────────────────
Typography: Inter (body) + Outfit (headings)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  <sub>Built with ❤️ using LiveKit Agents, Rime Coda TTS, Groq, and Deepgram</sub>
  <br />
  <sub>© 2026 Apex Medical Center Voice AI</sub>
</p>
