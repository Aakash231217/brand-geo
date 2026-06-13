"use client";

import { useEffect } from "react";

const BOT_ORIGIN = "https://coronna-bot.vercel.app";
const BOT_SRC = `${BOT_ORIGIN}/chatbot`;
const BOT_TARGET = `${BOT_ORIGIN}/`;
const BOT_TOKEN = "c0c6c4a3-9773-4372-860d-1a3c49b93a78";

const IDLE_MS = 25_000;
const IDLE_CHECK_MS = 5_000;

export function ChatbotWidget() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("coronna-chat-frame")) return;

    // --- styles ---
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

    // --- iframe ---
    const iframe = document.createElement("iframe");
    iframe.id = "coronna-chat-frame";
    iframe.src = BOT_SRC;
    iframe.classList.add("chat-frame");
    // Delegate device permissions to the cross-origin bot iframe.
    // Without this, the browser blocks microphone access inside the iframe,
    // so the bot's speech recognition (Web Speech API / getUserMedia) never works.
    iframe.allow = `microphone ${BOT_ORIGIN}; camera ${BOT_ORIGIN}; autoplay`;
    document.body.appendChild(iframe);

    // --- behavior tracker: auto-open bot when user looks stuck ---
    let lastActivity = Date.now();
    let proactiveSent = false;
    let exitFired = false;

    const resetActivity = () => {
      lastActivity = Date.now();
    };

    const activityEvents = [
      "mousemove",
      "scroll",
      "keydown",
      "click",
      "touchstart",
    ] as const;
    activityEvents.forEach((ev) =>
      window.addEventListener(ev, resetActivity, { passive: true })
    );

    const sendProactive = (reason: "idle" | "exit-intent") => {
      if (proactiveSent) return;
      proactiveSent = true;
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            type: "bot:proactive",
            reason,
            path: window.location.pathname,
            title: document.title,
          }),
          BOT_TARGET
        );
      } catch {
        // iframe may not be ready yet
      }
    };

    const idleTimer = window.setInterval(() => {
      if (proactiveSent) return;
      if (Date.now() - lastActivity > IDLE_MS) sendProactive("idle");
    }, IDLE_CHECK_MS);

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 5 && !exitFired) {
        exitFired = true;
        sendProactive("exit-intent");
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);

    // --- bot -> host messaging (resize + handshake) ---
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== BOT_ORIGIN) return;
      try {
        const dimensions =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (dimensions?.width) iframe.width = String(dimensions.width);
        if (dimensions?.height) iframe.height = String(dimensions.height);
        iframe.contentWindow?.postMessage(BOT_TOKEN, BOT_TARGET);
      } catch {
        // ignore non-JSON messages from other senders
      }
    };
    window.addEventListener("message", handleMessage);

    // --- cleanup ---
    return () => {
      window.clearInterval(idleTimer);
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, resetActivity)
      );
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("message", handleMessage);
      iframe.remove();
      style.remove();
    };
  }, []);
  return null;
}