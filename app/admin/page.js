'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export default function AdminPage() {
  const [status, setStatus] = useState('connecting')
  const [qrImage, setQrImage] = useState(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [socketError, setSocketError] = useState('')

  useEffect(() => {
    const socketHost = window.location.hostname || 'localhost'
    const socket = io(`http://${socketHost}:3001`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    })
    const handleDisconnect = () => {
      socket.emit('disconnect-request')
    }

    window.addEventListener('admin-disconnect', handleDisconnect)

    socket.on('connect', () => {
      console.log('Socket connected')
      setSocketError('')
    })

    socket.on('qr', (imageUrl) => {
      console.log('QR event received')
      setQrImage(imageUrl)
      setStatus('qr')
      setIsDisconnecting(false)
    })

    socket.on('whatsapp-connected', () => {
      setStatus('connected')
      setQrImage(null)
      setIsDisconnecting(false)
    })

    socket.on('whatsapp-disconnected', () => {
      setStatus('connecting')
      setQrImage(null)
      setIsDisconnecting(false)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err?.message)
      setSocketError('Cannot connect to bot server on port 3001. Start bot and refresh.')
      setStatus('connecting')
      setQrImage(null)
      setIsDisconnecting(false)
    })

    socket.on('disconnect', () => {
      setSocketError('Socket disconnected. Retrying...')
    })

    return () => {
      window.removeEventListener('admin-disconnect', handleDisconnect)
      socket.disconnect()
    }
  }, [])

  const handleDisconnect = () => {
    if (isDisconnecting) return

    // Optimistic UI update so admin panel responds immediately.
    setIsDisconnecting(true)
    setStatus('connecting')
    setQrImage(null)

    const ev = new CustomEvent('admin-disconnect')
    window.dispatchEvent(ev)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#111827] to-black flex items-center justify-center px-4 py-3">
      
      {/* Glow Background */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full" />

      <div className="relative w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr] items-start">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-3xl bg-[#111827] border border-green-500/15 shadow-lg shadow-green-500/10">
                <span className="text-lg font-semibold text-green-400">AF</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                  Ahsan Fabrics
                </h1>
                <p className="text-gray-400 text-sm mt-1 uppercase tracking-[3px]">
                  WhatsApp admin panel
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Wide-screen view • landscape optimized
            </div>
          </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40 lg:h-[72vh]">
              {status === 'connecting' && (
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-green-500 animate-spin" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      Connecting...
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 lg:max-w-lg">
                      Connecting to the WhatsApp bot server. Wait a few seconds for the QR to arrive.
                    </p>
                    {socketError && (
                      <p className="text-red-400 text-sm mt-3 lg:max-w-lg">
                        {socketError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {status === 'qr' && qrImage && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="lg:max-w-[52%] text-center lg:text-left">
                    <h2 className="text-2xl font-bold text-white">
                      Scan QR Code
                    </h2>
                    <p className="text-gray-400 text-sm mt-3 leading-6 lg:max-w-lg">
                      Open WhatsApp → Linked Devices → Link a Device. Scan the code below to connect your phone.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-4 py-3 rounded-full">
                      <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-green-400 text-sm font-medium">
                        Waiting for device connection
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-green-500/20 border border-green-500/20">
                    <img
                      src={qrImage}
                      alt="WhatsApp QR"
                      className="w-52 h-52 sm:w-56 sm:h-56 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {status === 'connected' && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="text-center lg:text-left">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/15 border border-green-500/20 shadow-lg shadow-green-500/20">
                      <span className="text-5xl">✅</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mt-4">
                      Connected
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 leading-6 lg:max-w-md">
                      Your WhatsApp chatbot is now live and responding to customers automatically.
                    </p>

                    <div className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full inline-flex">
                      <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-green-400 font-bold tracking-[3px] text-sm">
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      type="button"
                      disabled={isDisconnecting}
                      className="w-full max-w-xs bg-red-600 hover:bg-red-700 disabled:bg-red-500/70 disabled:cursor-not-allowed text-white font-medium px-4 py-3 rounded-full transition-colors"
                      onClick={handleDisconnect}
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Device'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5 lg:h-[72vh] lg:flex lg:flex-col lg:justify-between">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/40">
              <h2 className="text-lg font-semibold text-white mb-3">
                Overview
              </h2>
              <ul className="space-y-4 text-sm text-gray-300">
                <li className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <strong className="block text-white">Fast connect</strong>
                  Scan QR code quickly from WhatsApp linked devices.
                </li>
                <li className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <strong className="block text-white">Live status</strong>
                  Current bot state is shown here in real time.
                </li>
                <li className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <strong className="block text-white">Disconnect</strong>
                  Use the button after connection to restart pairing.
                </li>
              </ul>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/40">
              <h2 className="text-xl font-semibold text-white mb-4">
                Tips
              </h2>
              <p className="text-gray-400 text-sm leading-6">
                For best results, open WhatsApp on your phone and keep the screen active while scanning. The QR is valid for a short time only.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}