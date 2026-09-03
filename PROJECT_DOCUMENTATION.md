# Ahsan Fabrics — WhatsApp AI Chatbot
### Project Documentation

---

&nbsp;

# Page 1 — Project Overview

## Introduction

The **Ahsan Fabrics WhatsApp AI Chatbot** is a full-stack, production-ready automated customer service system built for a fabric retail business in Lahore, Pakistan. It connects a real WhatsApp number to a large language model (LLM) AI backend, enabling the shop to handle customer inquiries 24/7 — without any human involvement.

Customers send messages on WhatsApp exactly as they normally would. The bot reads every incoming message, processes it through an AI model trained with shop-specific context, and replies instantly — in the same language the customer used (Urdu or English).

A web-based admin dashboard lets the shop owner monitor the bot's live connection status, scan the WhatsApp QR code to pair a device, and disconnect the session when needed — all from a browser.

---

## Business Problem Solved

Small fabric shops receive the same customer questions repeatedly:

- *"Lawn ka kya rate hai?"*
- *"What is the price of pure silk?"*
- *"Where is your shop located?"*
- *"What are your timings?"*

Answering these manually wastes time and requires constant phone availability. This chatbot eliminates that burden entirely — it answers instantly, consistently, and correctly at any hour of the day.

---

## Key Capabilities

| Capability | Detail |
|---|---|
| Auto-reply on WhatsApp | Responds to every incoming customer message within seconds |
| AI-powered responses | Uses a large language model for natural, human-like conversation |
| Bilingual support | Detects Urdu or English and replies in the same language |
| Fabric catalog knowledge | Full pricing for 6 fabric categories built into the AI context |
| Topic enforcement | Refuses off-topic questions (sports, politics, etc.) strictly |
| Live admin panel | Browser-based dashboard showing real-time bot status |
| QR pairing | Admin scans QR code from browser to link a WhatsApp account |
| Auto-reconnect | Bot reconnects automatically if the connection drops |
| Session memory | Remembers last 20 messages per customer for context-aware replies |

---

## Shop Information Handled by the Bot

- **Shop Name:** Ahsan Fabrics
- **Location:** Barkat Market, Lahore
- **Hours:** 9AM – 6PM, 7 days a week
- **Contact:** 0300-1234567
- **Website:** www.ahsanfabrics.com
- **Order Flow:** Customers are directed to the website for orders — no order details collected via WhatsApp

---

&nbsp;

---

# Page 2 — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S PHONE                         │
│                    (WhatsApp Message)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │  WhatsApp Web Protocol (WebSocket)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     BOT SERVER (Node.js)                    │
│                       PORT 3001                             │
│                                                             │
│   ┌─────────────┐     ┌──────────────┐    ┌─────────────┐  │
│   │   Baileys   │────▶│  AI Handler  │───▶│  Groq API   │  │
│   │  WA Client  │     │  (getAIReply)│    │  (LLM)      │  │
│   └─────────────┘     └──────────────┘    └─────────────┘  │
│          │                                                   │
│   ┌──────▼──────┐                                           │
│   │  Socket.IO  │                                           │
│   │   Server    │                                           │
│   └──────┬──────┘                                           │
└──────────┼──────────────────────────────────────────────────┘
           │  WebSocket (real-time events)
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS FRONTEND (Admin)                   │
│                       PORT 3000                             │
│                                                             │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Admin Dashboard (/admin)                │  │
│   │   • QR Code Display                                  │  │
│   │   • Connection Status (Live/Connecting/QR)           │  │
│   │   • Disconnect Button                                │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Two-Process Design

The system runs as two independent but communicating processes:

### Process 1 — Bot Server (`npm run bot`)
A plain **Node.js** process that:
1. Opens a WebSocket connection to WhatsApp's servers via the Baileys library
2. Listens for incoming messages
3. Sends each message to the Groq LLM API and gets a reply
4. Sends the reply back on WhatsApp
5. Hosts a Socket.IO server so the admin dashboard can receive live events

### Process 2 — Next.js Frontend (`npm run dev`)
A **Next.js** web application that:
1. Serves the admin panel at `http://localhost:3000`
2. Connects to the bot's Socket.IO server on port 3001
3. Displays the QR code when the bot is waiting to be paired
4. Shows live connection status
5. Allows the admin to disconnect the WhatsApp session

Both run together via `npm run dev:all` using the `concurrently` package.

---

## Data Flow — Incoming Customer Message

```
1. Customer sends WhatsApp message
        ↓
2. Baileys receives message via WebSocket
        ↓
3. Bot extracts text from message object
        ↓
4. Bot sends "composing..." presence (shows typing indicator)
        ↓
5. getAIReply() called with phone number + message text
        ↓
6. User's conversation history retrieved (last 20 messages)
        ↓
7. Groq API called with system prompt + conversation history
        ↓
8. LLM generates reply
        ↓
9. Reply sent back via WhatsApp
        ↓
10. "paused" presence sent (stops typing indicator)
        ↓
11. Reply logged to console
```

---

## Connection State Management

The bot maintains three states communicated to the admin dashboard in real time via Socket.IO events:

| State | Socket.IO Event | Admin Panel Shows |
|---|---|---|
| Waiting for QR scan | `qr` (with image data URL) | QR code image |
| Successfully paired | `whatsapp-connected` | ✅ Connected + Disconnect button |
| Disconnected / reconnecting | `whatsapp-disconnected` | Spinning loader |

---

&nbsp;

---

# Page 3 — Technology Stack

## Frontend

### Next.js 16.2.5
The admin dashboard is built with **Next.js** using the App Router. Next.js provides server-side rendering, file-based routing, and a production-grade build pipeline out of the box. The admin page is a client component (`'use client'`) since it needs browser APIs (WebSocket, window events).

**Why Next.js:** Fast setup, built-in optimizations, and easy deployment to Vercel or any Node.js host.

### React 19
The UI is built with **React 19**, using hooks (`useState`, `useEffect`) for state management. There is no external state library — the component is self-contained and manages its own socket connection lifecycle.

### Tailwind CSS v4
Styling is done entirely with **Tailwind CSS v4**, using utility classes directly in JSX. The admin panel uses a dark glassmorphism design — `backdrop-blur`, `bg-white/5`, gradient backgrounds, and animated pulse indicators.

**Design highlights:**
- Dark gradient background (`from-[#0f172a] via-[#111827] to-black`)
- Glassmorphism cards with `backdrop-blur-xl` and `border border-white/10`
- Animated green pulse dot for live status
- Responsive layout — single column on mobile, two-column grid on desktop (landscape optimized)
- Animated spinning QR waiting state

### Geist Font (Google Fonts via Next.js)
The UI uses **Geist Sans** and **Geist Mono** loaded via `next/font/google` for clean, modern typography.

---

## Backend — Bot Server

### Baileys (`@whiskeysockets/baileys` v7.0.0-rc10)
**Baileys** is a pure JavaScript WhatsApp Web API library. It connects to WhatsApp's WebSocket servers using the multi-device protocol — the same protocol the WhatsApp Web browser client uses. No official WhatsApp Business API is needed.

Key features used:
- `makeWASocket` — creates the WhatsApp connection
- `useMultiFileAuthState` — persists authentication credentials to disk (`auth_info/` folder) so the bot stays logged in across restarts
- `fetchLatestWaWebVersion` — fetches the current WhatsApp Web version number at runtime, preventing version-rejection errors (HTTP 405) from WhatsApp's servers
- `DisconnectReason` — enum for handling different disconnect scenarios (logged out, connection replaced, etc.)

### Groq SDK (`groq-sdk` v1.1.2)
**Groq** is an AI inference platform that runs open-source LLMs at extremely high speed using custom LPU (Language Processing Unit) hardware. The bot uses Groq's chat completions API — the same interface as OpenAI's API.

**Model in use: `qwen/qwen3.8-27b`**
- 27 billion parameter model from Alibaba's Qwen3 family
- Fast inference speed on Groq's LPU hardware
- Clean, concise output without verbose reasoning traces
- Handles both English and Urdu naturally

### Socket.IO (`socket.io` v4.8.3)
**Socket.IO** provides the real-time bidirectional communication channel between the bot server and the admin dashboard. The bot server creates a Socket.IO server on port 3001. The admin dashboard connects as a client using `socket.io-client`.

Events emitted by the bot:
- `qr` — sends QR code as a base64 data URL image
- `whatsapp-connected` — notifies dashboard of successful pairing
- `whatsapp-disconnected` — notifies dashboard of disconnection

Events received by the bot:
- `disconnect-request` — admin clicked the disconnect button

### Pino (`pino` v10.3.1)
**Pino** is a high-performance JSON logger for Node.js. It is used as the Baileys internal logger with `level: "silent"` to suppress the library's verbose internal logs, keeping the terminal output clean.

### QRCode Libraries
Two QR code libraries serve different purposes:
- `qrcode-terminal` — renders the QR code as ASCII art in the terminal (for local debugging)
- `qrcode` — generates a proper PNG image as a base64 data URL, which is sent to the admin dashboard and displayed as an `<img>` tag

---

## Development Tools

| Tool | Purpose |
|---|---|
| `concurrently` v9.2.1 | Runs bot and Next.js dev server in one terminal |
| `dotenv` v17.4.2 | Loads `.env.local` into `process.env` for the bot process |
| `eslint` + `eslint-config-next` | Code linting |
| `@tailwindcss/postcss` | Tailwind CSS PostCSS integration |

---

&nbsp;

---

# Page 4 — AI System & Features

## The AI Brain — System Prompt Engineering

The intelligence of the chatbot is defined not just by the LLM model, but by the **system prompt** — a carefully crafted instruction set that shapes the model's entire personality, knowledge, and behavior boundaries.

The system prompt defines:

### 1. Identity & Role
The AI is introduced as a "smart, friendly and professional sales assistant" for Ahsan Fabrics. This primes the model to respond in a business-appropriate, sales-oriented tone.

### 2. Complete Product Catalog (Built into Context)
All fabric types and prices are hardcoded into the system prompt. This means the model never needs to search a database — the entire catalog lives in the AI's context window on every request.

**6 fabric categories with 4–5 variants each:**

| Fabric | Variants | Price Range |
|---|---|---|
| Lawn | Regular, Printed, Embroidered, Designer | Rs. 250 – 900/meter |
| Cotton | Lattha, Chairman, Soft, Japani | Rs. 200 – 500/meter |
| Silk | Regular, Pure, Printed | Rs. 800 – 1500/meter |
| Boski | Plain, Printed, Premium | Rs. 600 – 950/meter |
| Chiffon | Plain, Printed, Embroidered | Rs. 400 – 800/meter |
| Khaddar | Plain, Printed, Embroidered | Rs. 300 – 650/meter |

### 3. Ordering Flow
The AI never collects order details over WhatsApp. It consistently redirects customers to the website (`www.ahsanfabrics.com`) for placing orders — keeping the process clean and avoiding any data handling issues.

### 4. Bilingual Enforcement
A language detection rule is embedded in the prompt:
- English message in → English reply out
- Urdu message in → Urdu reply out
- Language mixing is explicitly forbidden

This is critical for a Pakistani market where customers switch between both languages freely.

### 5. Strict Topic Boundary (Guardrails)
The system prompt contains a hard boundary list of forbidden topics — politics, sports, weather, general knowledge, math unrelated to fabric prices, personal advice, news, and geography questions. When the AI receives an off-topic message, it responds with one of two pre-defined refusal messages (one in English, one in Urdu) and nothing else.

This prevents the bot from going "off-brand" and ensures every interaction stays relevant to the business.

### 6. Feedback Handling
Positive customer feedback is met with a warm thank-you. Negative feedback triggers an apology and a redirect to the shop's contact number. This is handled by the AI naturally within conversation.

---

## Conversation Memory

Each customer's conversation is stored in memory (a JavaScript object keyed by WhatsApp phone number):

```
userSessions = {
  "923001234567@s.whatsapp.net": [
    { role: "user",      content: "lawn ka rate?" },
    { role: "assistant", content: "Regular Lawn Rs. 250/meter hai..." },
    { role: "user",      content: "embroidered?" },
    ...
  ]
}
```

The last **20 messages** per customer are kept and sent with every API request. This gives the AI full context of the ongoing conversation — so "embroidered?" after asking about lawn is correctly understood as "embroidered lawn."

Messages older than 20 are dropped from the sliding window to manage token usage and keep costs low.

---

## Typing Indicator

Before calling the Groq API, the bot sends a `composing` presence update to WhatsApp. This makes the bot show "typing..." in the customer's chat while the AI is thinking. Once the reply is sent, a `paused` presence update is sent to stop the indicator. This small detail makes the bot feel more natural and human-like.

---

## Auto-Reconnect Logic

WhatsApp connections can drop for various reasons (network issues, server-side timeouts, device logged out). The bot handles this gracefully:

- On any disconnect, it waits 2 seconds then calls `startBot()` again
- If the disconnect reason is `loggedOut` (user manually removed the device), it clears the `auth_info` folder so a fresh QR is generated
- The Socket.IO server stays alive through reconnects — the admin dashboard always reconnects automatically

---

&nbsp;

---

# Page 5 — Setup, Deployment & Project Structure

## Project Structure

```
Wa_Chatbot/
│
├── app/                          # Next.js App Router
│   ├── admin/
│   │   └── page.js               # Admin dashboard UI (client component)
│   ├── page.js                   # Home page (renders admin)
│   ├── layout.js                 # Root layout with fonts and metadata
│   └── globals.css               # Tailwind CSS global styles
│
├── bot/
│   └── index.js                  # WhatsApp bot + Socket.IO server
│
├── auth_info/                    # WhatsApp session credentials (auto-generated)
│   └── (creds.json, keys, etc.)
│
├── public/                       # Static assets
│
├── .env.local                    # Environment variables (GROQ_API_KEY)
├── package.json                  # Dependencies and scripts
├── next.config.mjs               # Next.js webpack configuration
├── postcss.config.mjs            # PostCSS / Tailwind config
└── jsconfig.json                 # JS path aliases
```

---

## Environment Variables

| Variable | Description | Where to Get |
|---|---|---|
| `GROQ_API_KEY` | Groq API authentication key | https://console.groq.com |

The bot loads `.env.local` using `dotenv` with an explicit path:
```js
require("dotenv").config({ path: ".env.local" });
```
This ensures the env file is found regardless of which directory the Node process is started from.

---

## NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev --webpack` | Start Next.js dev server on port 3000 |
| `npm run bot` | `node bot/index.js` | Start WhatsApp bot on port 3001 |
| `npm run dev:all` | `concurrently "npm run dev" "npm run bot"` | Run both together |
| `npm run build` | `next build --webpack` | Build Next.js for production |

---

## Local Setup Guide

**Prerequisites:**
- Node.js v18 or higher
- A WhatsApp account (to scan the QR code)
- A Groq API key (free tier available at console.groq.com)

**Steps:**

```bash
# 1. Clone or download the project
cd Wa_Chatbot

# 2. Install dependencies
npm install

# 3. Add your Groq API key to .env.local
# GROQ_API_KEY=gsk_your_key_here

# 4. Start both servers
npm run dev:all
```

**After starting:**
1. Open `http://localhost:3000` in your browser
2. Wait a few seconds — the admin panel will show a QR code
3. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device**
4. Scan the QR code
5. The panel shows **✅ Connected** — the bot is live

---

## Webpack Configuration Note

The `next.config.mjs` includes a custom webpack config that marks `utf-8-validate` and `bufferutil` as external CommonJS modules on the server side. These are optional native bindings used by the `ws` WebSocket library (a dependency of Baileys). Without this config, Next.js's bundler would try to pack them and throw build errors.

---

## Known Limitations & Notes

| Topic | Note |
|---|---|
| WhatsApp ToS | Baileys uses the unofficial WhatsApp Web protocol. Use responsibly on personal/business accounts |
| Session persistence | `auth_info/` folder must be preserved between restarts to avoid re-scanning QR |
| Memory sessions | `userSessions` object lives in RAM — restarting the bot clears all conversation history |
| Single device | One bot instance = one WhatsApp number. Multiple numbers need multiple instances |
| Rate limits | Groq free tier has per-minute token limits; high traffic may hit rate limits |
| Model availability | If the Groq model is unavailable, update the model name in `bot/index.js` line 183 |

---

## Deployment Options

| Platform | Notes |
|---|---|
| **Local machine** | `npm run dev:all` — simplest, works immediately |
| **VPS (Ubuntu/AWS/DigitalOcean)** | Run bot with `pm2`, deploy Next.js with `npm run build && npm start` |
| **Vercel** (frontend only) | Deploy Next.js to Vercel using `npm run vercel-build`; run bot separately on a server |
| **Railway / Render** | Can host both processes if configured with separate services |

For production, it's recommended to run the bot process with **PM2**:
```bash
npm install -g pm2
pm2 start bot/index.js --name "ahsan-bot"
pm2 startup   # auto-start on server reboot
pm2 save
```

---

*Documentation prepared for Ahsan Fabrics WhatsApp AI Chatbot — built with Next.js, Node.js, Baileys, Groq AI, and Socket.IO.*
