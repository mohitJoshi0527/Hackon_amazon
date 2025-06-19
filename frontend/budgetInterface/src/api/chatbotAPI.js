// src/api/chatbotAPI.js
import API from './index';

export const sendMessage = async (message) => {
  try {
    console.log('Sending to chatbot API:', message);
    const response = await API.post('/api/chatbot/chat', { message });
    console.log('Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};