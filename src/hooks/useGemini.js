import { useState } from "react";
import { chatWithMosaic } from "../lib/gemini";

function getGeminiErrorMessage(error) {
  const text = error?.message || "";

  if (text.includes("API key not valid") || text.includes("API_KEY_INVALID")) {
    return "Gemini is misconfigured: the API key is invalid.";
  }

  if (text.includes("429") || text.includes("RESOURCE_EXHAUSTED") || text.includes("Too Many Requests")) {
    return "Gemini free-tier quota is exhausted. Wait a bit and try again.";
  }

  if (text.includes("503") || text.includes("UNAVAILABLE") || text.includes("high demand")) {
    return "Gemini is under heavy load right now. Wait a moment and try again.";
  }

  if (text.includes("not found for API version") || text.includes("not supported")) {
    return "The selected Gemini model is not available for this API key.";
  }

  return "Gemini request failed. Check the server config and try again.";
}

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
    } catch (error) {
      setMessages([...updated, { role: "assistant", text: getGeminiErrorMessage(error) }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, sendMessage, loading };
}
