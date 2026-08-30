export const models = [
  { id: "gemini-2.5-flash", provider: "Google AI Studio", type: ["text", "code"], access: ["free-forever"], status: "operational", freeLimit: "1,500 requests/day", tags: ["website"], url: "https://aistudio.google.com/" },
  { id: "bad", provider: "Ignored", type: ["text"], access: ["free-tier"], status: "operational", freeLimit: "none", tags: ["website"], url: "javascript:alert(1)" },
  { id: "openrouter", provider: "OpenRouter", type: ["text"], access: ["free-tier"], status: "operational", freeLimit: "free models", tags: ["website"], url: "https://openrouter.ai/models" },
];
