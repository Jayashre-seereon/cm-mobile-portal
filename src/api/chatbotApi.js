import api from './axios';

/** GET /api/chatbot/config -> { enabled, aiEnabled, name, greeting, starterPrompts, maxMessageLength } */
export async function getChatbotConfig() {
  const response = await api.get('/chatbot/config');
  return response?.data?.data ?? null;
}

/**
 * POST /api/chatbot/ask (works for guests; the shared axios instance adds the user's token).
 * @param {{ message: string, history: { role: 'user'|'assistant', content: string }[] }} body
 * @returns {Promise<{ reply: string, links: object[], pages: object[], source: string }>}
 */
export async function askChatbot({ message, history = [] }) {
  const response = await api.post('/chatbot/ask', {
    message,
    history: history.slice(-20),
    platform: 'mobile',
  });
  return response?.data?.data ?? null;
}
