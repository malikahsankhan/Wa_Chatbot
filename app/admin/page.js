'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import QRCode from 'qrcode'

export default function AdminPage() {
  const [status, setStatus] = useState('connecting')
  const [qrImage, setQrImage] = useState(null)

  useEffect(() => {
    const socket = io('http://localhost:3001')

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    socket.on('qr', async (qrData) => {
      const imageUrl = await QRCode.toDataURL(qrData, {
        width: 280,
        margin: 2,
      })

      setQrImage(imageUrl)
      setStatus('qr')
    })

    socket.on('whatsapp-connected', () => {
      setStatus('connected')
      setQrImage(null)
    })

    socket.on('whatsapp-disconnected', () => {
      setStatus('qr')
    })

    return () => socket.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#111827] to-black flex items-center justify-center px-4 py-10">
      
      {/* Glow Background */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-green-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/10 blur-3xl rounded-full" />

      <div className="relative w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
            <span className="text-4xl">🧵</span>
          </div>

          <h1 className="text-4xl font-bold text-white mt-5 tracking-wide">
            Ahsan Fabrics
          </h1>

          <p className="text-gray-400 text-sm mt-2 tracking-[4px] uppercase">
            WhatsApp Admin Dashboard
          </p>
        </div>

        {/* Main Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">

          {/* CONNECTING */}
          {status === 'connecting' && (
            <div className="flex flex-col items-center text-center">
              
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-green-500 animate-spin" />
              </div>

              <h2 className="text-2xl font-semibold text-white">
                Connecting...
              </h2>

              <p className="text-gray-400 text-sm mt-2">
                Connecting to WhatsApp bot server
              </p>
            </div>
          )}

          {/* QR SECTION */}
          {status === 'qr' && qrImage && (
            <div className="flex flex-col items-center text-center">
              
              <div className="bg-white p-5 rounded-3xl shadow-2xl shadow-green-500/20 border border-green-500/20">
                <img
                  src={qrImage}
                  alt="WhatsApp QR"
                  className="w-64 h-64 rounded-2xl"
                />
              </div>

              <h2 className="text-2xl font-bold text-white mt-6">
                Scan QR Code
              </h2>

              <p className="text-gray-400 text-sm mt-3 leading-6 max-w-xs">
                Open WhatsApp → Linked Devices → Link a Device
              </p>

              <div className="mt-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-5 py-3 rounded-full">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-green-400 text-sm font-medium">
                  Waiting for device connection
                </span>
              </div>
            </div>
          )}

          {/* CONNECTED */}
          {status === 'connected' && (
            <div className="flex flex-col items-center text-center">
              
              <div className="w-28 h-28 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/20 shadow-lg shadow-green-500/20">
                <span className="text-6xl">✅</span>
              </div>

              <h2 className="text-3xl font-bold text-white mt-6">
                Connected
              </h2>

              <p className="text-gray-400 text-sm mt-3 leading-6 max-w-xs">
                Your WhatsApp chatbot is now live and responding to customers automatically.
              </p>

              <div className="mt-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-6 py-3 rounded-full">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>

                <span className="text-green-400 font-bold tracking-[3px] text-sm">
                  LIVE
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs tracking-wider">
            Ahsan Fabrics • Barkat Market Lahore
          </p>
        </div>
      </div>
    </div>
  )
}