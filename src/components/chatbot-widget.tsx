"use client";

import { useEffect } from "react";

const BOT_ORIGIN = "https://coronna-bot.vercel.app";
const BOT_SRC = `${BOT_ORIGIN}/chatbot`;
const BOT_TOKEN = "c0c6c4a3-9773-4372-860d-1a3c49b93a78";

export function ChatbotWidget() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("coronna-chat-frame")) return;

    const style = document.createElement("style");
    style.setAttribute("data-coronna-chat", "true");
    style.textContent = `
      .chat-frame {
        position: fixed;
        bottom: 50px;
        right: 50px;
        border: none;
        z-index: 9999;
      }
    `;
    document.head.append(style);

    const iframe = document.createElement("iframe");
    iframe.id = "coronna-chat-frame";
    iframe.src = BOT_SRC;
    iframe.classList.add("chat-frame");
    document.body.appendChild(iframe);

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== BOT_ORIGIN) return;
      try {
        const dimensions =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (dimensions?.width) iframe.width = String(dimensions.width);
        if (dimensions?.height) iframe.height = String(dimensions.height);
        iframe.contentWindow?.postMessage(BOT_TOKEN, `${BOT_ORIGIN}/`);
      } catch {
        // ignore non-JSON messages from other senders
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      iframe.remove();
      style.remove();
    };
  }, []);

  return null;
}
