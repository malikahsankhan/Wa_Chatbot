const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const Groq = require('groq-sdk')
require('dotenv').config({ path: '.env.local' })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Conversation history per user
const userSessions = {}

const SYSTEM_PROMPT = `You are a helpful assistant for a fabric shop. 
You help customers with fabric information, prices, orders, and availability.
Be friendly, professional, and reply in the same language the customer uses (Urdu or English).
Keep replies short and to the point.`

async function getAIReply(userNumber, userMessage) {
  if (!userSessions[userNumber]) {
    userSessions[userNumber] = []
  }

  userSessions[userNumber].push({
    role: 'user',
    content: userMessage
  })

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...userSessions[userNumber]
    ],
    max_tokens: 300
  })

  const reply = response.choices[0].message.content

  userSessions[userNumber].push({
    role: 'assistant',
    content: reply
  })

  return reply
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📱 Scan this QR code with WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed. Reconnecting:', shouldReconnect)
      if (shouldReconnect) startBot()
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (msg.key.fromMe) continue

      const from = msg.key.remoteJid
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''

      if (!text) continue

      console.log(`📩 From ${from}: ${text}`)

      try {
        const reply = await getAIReply(from, text)
        await sock.sendMessage(from, { text: reply })
        console.log(`✅ Replied to ${from}`)
      } catch (err) {
        console.error('Error:', err.message)
      }
    }
  })
}

startBot() 
