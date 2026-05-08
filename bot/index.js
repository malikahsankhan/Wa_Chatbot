const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const Groq = require("groq-sdk");
require("dotenv").config({ path: ".env.local" });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Conversation history per user
const userSessions = {};

// Order tracking per user
const userOrders = {};

const SYSTEM_PROMPT = `
You are a smart, friendly and professional sales assistant for "Ahsan Fabrics" — a trusted fabric shop in Lahore.

🏪 SHOP INFO:
- Name: Ahsan Fabrics
- Location: Barkat Market, Lahore
- Hours: 7 days a week, 9AM to 6PM
- Contact: 0300-1234567
- Delivery: Available via WhatsApp order

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

📦 DELIVERY POLICY:
- Delivery available all over Pakistan
...
🛒 ORDER PROCESS (IMPORTANT - follow this exactly):
When a customer wants to place an order, collect this info step by step:
1. Ask: Which fabric and quality?
...



🛒 ORDERING:
- If customer wants to place an order, tell them to visit our website:
- Website: www.ahsanfabrics.com
- English: "To place an order, please visit our website: www.ahsanfabrics.com"
- Urdu: "Order karne k liye hamare website pe jain: www.ahsanfabrics.com"
- Do NOT collect any order details via WhatsApp

🌐 LANGUAGE RULE (VERY IMPORTANT):
- If customer writes in ENGLISH → reply in English only
- If customer writes in URDU (roman or actual urdu script) → reply in Urdu only
- Match customer's language in EVERY reply — never mix unless customer mixes

💬 PERSONALITY:
- Friendly, helpful, professional
- Use emojis naturally (not too much)
- Keep replies concise and clear
- If asked something you don't know, politely say to call: 0300-1234567
- Never make up fabric types or prices not listed above
- Always greet new customers warmly

🚫 RULES:
- Never discuss anything unrelated to fabrics or the shop
- If someone asks unrelated stuff, politely redirect to fabric topics
`;

async function getAIReply(userNumber, userMessage) {
  if (!userSessions[userNumber]) {
    userSessions[userNumber] = [];
  }

  userSessions[userNumber].push({
    role: "user",
    content: userMessage,
  });

  // Keep last 20 messages only (memory management)
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

  userSessions[userNumber].push({
    role: "assistant",
    content: reply,
  });

  return reply;
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📱 Scan this QR code with WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === "open") {
      console.log("✅ Ahsan Fabrics Bot is Live!");
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
        // Typing indicator
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