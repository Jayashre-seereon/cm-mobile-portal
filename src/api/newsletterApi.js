import api from './axios';

export async function getNewsletters() {
  const response = await api.get('/newsletter/');
  return response?.data ?? null;
}
