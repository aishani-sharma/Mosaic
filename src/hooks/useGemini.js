// hooks/useGemini.js
import { useState } from "react";
import { chatWithMosaic } from "../lib/gemini";

export function useGeminiChat(userContext) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! I'm Mosaic. Tell me what's on your plate today and I'll help you crush it." }
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text) {
    const userMsg = { role: "user", text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const reply = await chatWithMosaic(updated, userContext || {});
      setMessages([...updated, { role: "assistant", text: reply }]);
    } catch (e) {
      const msg = e.message?.includes("429")
        ? "I'm getting too many requests — wait 30 seconds and try again."
        : "Something went wrong. Try again?";
      setMessages([...updated, { role: "assistant", text: msg }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, sendMessage, loading };
}
