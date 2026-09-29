import api from './client';
import { validateApiResponse } from '../utils/api';

export const marketingAPI = {
  // Send SMS broadcast
  sendSMSBroadcast: async (data) => {
    try {
      const response = await api.post('/marketing/sms/broadcast', data);
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error sending SMS broadcast:', error);
      throw error;
    }
  },

  // Send Telegram broadcast
  sendTelegramBroadcast: async (data) => {
    try {
      const response = await api.post('/marketing/telegram/broadcast', data);
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error sending Telegram broadcast:', error);
      throw error;
    }
  },

  // Get marketing statistics
  getMarketingStats: async () => {
    try {
      const response = await api.get('/marketing/stats');
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error fetching marketing stats:', error);
      throw error;
    }
  },

  // Get broadcast history
  getBroadcastHistory: async (params = {}) => {
    try {
      const response = await api.get('/marketing/history', { params });
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error fetching broadcast history:', error);
      throw error;
    }
  },

  // Test SMS provider (Eskiz) connection
  testSmsConnection: async () => {
    try {
      const response = await api.get('/marketing/sms/test');
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error testing SMS connection:', error);
      throw error;
    }
  },

  // Approved SMS templates from the Eskiz cabinet
  getSmsTemplates: async () => {
    const response = await api.get('/marketing/sms/templates');
    return validateApiResponse(response.data);
  },

  // Integration credentials (admin only). Secrets are write-only.
  getIntegrationSettings: async () => {
    const response = await api.get('/marketing/settings');
    return validateApiResponse(response.data);
  },

  updateIntegrationSettings: async (data) => {
    const response = await api.put('/marketing/settings', data);
    return validateApiResponse(response.data);
  },

  // Personal t.me link a client opens to connect to the bot
  getTelegramLink: async (clientId) => {
    const response = await api.get(`/marketing/telegram/link/${clientId}`);
    return validateApiResponse(response.data);
  },

  // Pick up clients who pressed Start via their link
  syncTelegramLinks: async () => {
    const response = await api.post('/marketing/telegram/sync');
    return validateApiResponse(response.data);
  },

  // Test Telegram bot connection
  testTelegramConnection: async () => {
    try {
      const response = await api.get('/marketing/telegram/test');
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error testing Telegram connection:', error);
      throw error;
    }
  },

  // Get client list for marketing
  getMarketingClients: async (params = {}) => {
    try {
      const response = await api.get('/marketing/clients', { params });
      return validateApiResponse(response.data);
    } catch (error) {
      console.error('Error fetching marketing clients:', error);
      throw error;
    }
  },
}; 