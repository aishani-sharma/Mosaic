// hooks/useGemini.js
import { useState } from "react";
import { chatWithClutch } from "../lib/gemini";

export function useGeminiChat(userContext) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey! I'm Clutch 👊 Tell me what's on your plate today and I'll help you crush it." }
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text) {
    const userMsg = { role: "user", text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const reply = await chatWithClutch(updated, userContext || {});
      setMessages([...updated, { role: "assistant", text: reply }]);
    } catch {
      setMessages([...updated, { role: "assistant", text: "Something went wrong. Try again?" }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, sendMessage, loading };
}
