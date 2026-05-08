"use client";

import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Assalam-o-Alaikum! Main Ahsan Fabrics ka WhatsApp chatbot hoon. Yahan se aap browser se bhi fabrics ke baare mein pooch sakte hain.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setError(null);

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();

      const botMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply || "Maafi, koi reply nahi mila.",
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setError("Kuch masla aa gaya hai, thori der baad dobara try karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4">
      <main className="w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 flex flex-col h-[80vh] overflow-hidden">
        <header className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Ahsan Fabrics Chatbot
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Web chat for the same WhatsApp assistant.
            </p>
          </div>
        </header>

        <section className="flex-1 flex flex-col-reverse overflow-y-auto px-4 sm:px-6 py-4 gap-3 bg-zinc-50/60 dark:bg-zinc-900">
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-emerald-600 text-white"
                    : "mr-auto bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700">
                Bot soch raha hai...
              </div>
            )}
          </div>
        </section>

        <form
          onSubmit={sendMessage}
          className="border-t border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 py-3 bg-white dark:bg-zinc-950 flex items-center gap-2"
        >
          <input
            type="text"
            className="flex-1 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 sm:px-4 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Apna sawal yahan likhein..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>

        {error && (
          <div className="px-4 sm:px-6 pb-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/40 border-t border-red-200/60 dark:border-red-900/60">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
