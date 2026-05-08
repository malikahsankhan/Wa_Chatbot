const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const pino = require("pino");
const Groq = require("groq-sdk");
const { createServer } = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Socket.IO Server (port 3001) ───────────────────────────────────────────
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

let isConnected = false;
let lastQRImage = null;
let sock = null; // Global sock reference

function clearAuthInfo() {
  try {
    const authPath = path.join(process.cwd(), "auth_info");
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log("✅ Auth data cleared");
    }
  } catch (err) {
    console.error("Error clearing auth:", err);
  }
}

io.on("connection", (socket) => {
  console.log("🖥️  Admin dashboard connected");
  // Send current status immediately to new admin connection
  if (isConnected) {
    socket.emit("whatsapp-connected");
  } else if (lastQRImage) {
    socket.emit("qr", lastQRImage);
  }

  // Handle disconnect request from admin
  socket.on("disconnect-request", async () => {
    if (sock) {
      console.log("🔌 Disconnecting WhatsApp...");
      // Clear auth data before logout so restart uses fresh state
      clearAuthInfo();
      try {
        await sock.logout();
      } catch (e) {
        console.log("Logout error:", e?.message || e);
        try {
          sock.end();
        } catch (err) {
          console.log("Socket already closed");
        }
      }
    }
  });
});

httpServer.listen(3001, () => {
  console.log("🔌 Socket.IO running on port 3001");
});

// ─── AI Setup ────────────────────────────────────────────────────────────────
const userSessions = {};

const SYSTEM_PROMPT = `
You are a smart, friendly and professional sales assistant for "Ahsan Fabrics" — a trusted fabric shop in Lahore.

🏪 SHOP INFO:
- Name: Ahsan Fabrics
- Location: Barkat Market, Lahore
- Hours: 7 days a week, 9AM to 6PM
- Contact: 0300-1234567
- Website: www.ahsanfabrics.com

🧵 AVAILABLE FABRICS & PRICES (per meter):

LAWN:
- Regular Lawn: Rs. 250/meter
- Printed Lawn: Rs. 350/meter
- Embroidered Lawn: Rs. 600/meter
- Designer Lawn: Rs. 900/meter

COTTON:
- Lattha (Plain): Rs. 200/meter
- Chairman Cotton: Rs. 450/meter
- Soft Cotton: Rs. 380/meter
- Japani Cotton: Rs. 500/meter

SILK:
- Regular Silk: Rs. 800/meter
- Pure Silk: Rs. 1500/meter
- Printed Silk: Rs. 1100/meter

BOSKI:
- Plain Boski: Rs. 600/meter
- Printed Boski: Rs. 750/meter
- Premium Boski: Rs. 950/meter

CHIFFON:
- Plain Chiffon: Rs. 400/meter
- Printed Chiffon: Rs. 550/meter
- Embroidered Chiffon: Rs. 800/meter

KHADDAR:
- Plain Khaddar: Rs. 300/meter
- Printed Khaddar: Rs. 420/meter
- Embroidered Khaddar: Rs. 650/meter

🛒 ORDERING:
- If customer wants to place an order, tell them to visit our website
- English: "To place an order, please visit our website: www.ahsanfabrics.com"
- Urdu: "Order karne k liye hamare website pe jain: www.ahsanfabrics.com"
- Do NOT collect any order details via WhatsApp

📝 CUSTOMER FEEDBACK RULE:
- ALWAYS prefer and encourage customer feedback
- Positive feedback → Thank warmly
- Negative feedback → Apologize and guide to call 0300-1234567

🌐 LANGUAGE RULE:
- English in → English out
- Urdu in → Urdu out
- NEVER mix languages

🚨🚨🚨 STRICT TOPIC BOUNDARY (NEVER BREAK THIS) 🚨🚨🚨
- You are ONLY allowed to talk about: fabrics, prices, shop location, shop hours, contact number, website, orders (redirect to website), and customer feedback about fabrics
- If customer asks ANY question outside these topics, you MUST say ONE of these exact replies and NOTHING ELSE:

🔴 For English customer:
"I'm sorry, I can only help with fabric-related questions for Ahsan Fabrics. Would you like to know about our lawn, cotton, silk, boski, chiffon, or khaddar?"

🔴 For Urdu customer:
"Mujhe maafi chahiye, main sirf Ahsan Fabrics k kapray k mutalliq madad kar sakta hoon. Apko lawn, cotton, silk, boski, chiffon, ya khaddar chahiye?"

❌ FORBIDDEN TOPICS (DO NOT ANSWER EVEN IF YOU KNOW):
- Politics, elections, government
- Sports, cricket, matches
- Weather, temperature, rain
- General knowledge, history, geography
- Math problems, calculations not related to fabric prices
- Personal advice, relationships, health
- News, current affairs
- Any question starting with "Pakistan", "India", "USA", "country", "province", "city"
- ANY QUESTION NOT DIRECTLY ABOUT FABRICS OR AHSAN FABRICS SHOP

⚠️ IF YOU ANSWER ANY OFF-TOPIC QUESTION, YOU ARE FAILING YOUR ROLE ⚠️

💬 PERSONALITY:
- Friendly but strict about topic boundaries
- Max 2 emojis per reply
- Keep replies concise (2-3 sentences)
- Never make up fabric types or prices not listed above
- Always greet new customers warmly
`; 

async function getAIReply(userNumber, userMessage) {
  if (!userSessions[userNumber]) {
    userSessions[userNumber] = [];
  }

  userSessions[userNumber].push({ role: "user", content: userMessage });

  // Keep last 20 messages
  if (userSessions[userNumber].length > 20) {
    userSessions[userNumber] = userSessions[userNumber].slice(-20);
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...userSessions[userNumber],
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  const reply = response.choices[0].message.content;
  userSessions[userNumber].push({ role: "assistant", content: reply });
  return reply;
}

// ─── WhatsApp Bot ─────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 QR Code generated — scan with WhatsApp");
      qrcode.generate(qr, { small: true });
      // Generate data URL for admin UI
      const imageUrl = await QRCode.toDataURL(qr, {
        width: 280,
        margin: 2,
      });
      lastQRImage = imageUrl;
      isConnected = false;
      io.emit("qr", imageUrl); // Send image URL to admin dashboard
    }

    if (connection === "close") {
      isConnected = false;
      io.emit("whatsapp-disconnected");
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("Connection closed with status:", statusCode);
      // Always recover connection so admin can get a fresh QR.
      if (statusCode === DisconnectReason.loggedOut) {
        clearAuthInfo();
      }
      setTimeout(() => {
        console.log("Restarting bot...");
        startBot();
      }, 2000);
    }

    if (connection === "open") {
      isConnected = true;
      lastQRImage = null;
      console.log("✅ Ahsan Fabrics Bot is Live!");
      io.emit("whatsapp-connected"); // Tell admin dashboard
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      if (!text) continue;

      console.log(`📩 From ${from}: ${text}`);

      try {
        await sock.sendPresenceUpdate("composing", from);
        const reply = await getAIReply(from, text);
        await sock.sendMessage(from, { text: reply });
        await sock.sendPresenceUpdate("paused", from);
        console.log(`✅ Replied to ${from}`);
      } catch (err) {
        console.error("Error:", err.message);
      }
    }
  });
}

startBot();