"use client";

import { useEffect } from "react";

const BOT_ORIGIN = "https://coronna-bot.vercel.app";
const BOT_SRC = `${BOT_ORIGIN}/chatbot`;
const BOT_TARGET = BOT_ORIGIN;
const BOT_TOKEN = "dc70fa5f-9774-47c3-b8c2-6366be8d6f28";

const IDLE_MS = 25_000;
const IDLE_CHECK_MS = 5_000;

type BotDimensions = {
  width?: number | string;
  height?: number | string;
  position?: "left" | "right" | "full";
};

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
        left: auto;
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
    iframe.allow = "microphone; autoplay; clipboard-write";
    iframe.setAttribute("allowtransparency", "true");
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

    const applyLayout = (dimensions: BotDimensions) => {
      if (dimensions.position === "full") {
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.right = "auto";
        iframe.style.bottom = "auto";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.width = String(window.innerWidth);
        iframe.height = String(window.innerHeight);
        return;
      }

      iframe.style.top = "auto";
      iframe.style.bottom = "50px";

      if (dimensions.width) {
        iframe.style.width = `${dimensions.width}px`;
        iframe.width = String(dimensions.width);
      }

      if (dimensions.height) {
        iframe.style.height = `${dimensions.height}px`;
        iframe.height = String(dimensions.height);
      }

      if (dimensions.position === "left") {
        iframe.style.left = "50px";
        iframe.style.right = "auto";
      } else {
        iframe.style.right = "50px";
        iframe.style.left = "auto";
      }
    };

    let lastDimensions: BotDimensions | null = null;

    // --- bot -> host messaging (resize + handshake) ---
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== BOT_ORIGIN) return;
      try {
        lastDimensions =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (lastDimensions) applyLayout(lastDimensions);
        iframe.contentWindow?.postMessage(BOT_TOKEN, BOT_TARGET);
      } catch {
        // ignore non-JSON messages from other senders
      }
    };
    window.addEventListener("message", handleMessage);

    const handleResize = () => {
      if (lastDimensions?.position === "full") applyLayout(lastDimensions);
    };
    window.addEventListener("resize", handleResize);

    // --- cleanup ---
    return () => {
      window.clearInterval(idleTimer);
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, resetActivity)
      );
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", handleResize);
      iframe.remove();
      style.remove();
    };
  }, []);
  return null;
}