import { useState, useEffect, useCallback } from 'react';
import { marketingAPI } from '../api/marketing';
import { toArray } from '../utils/api';
import { useApp } from '../contexts/AppContext';

const apiErrorText = (error, fallback) =>
  error?.response?.data?.detail || error?.response?.data?.message || fallback;

// Connection checks run on every page load, so they never toast — the status
// cards on each tab show the result instead.
const checkStatus = async (request) => {
  try {
    const response = await request();
    return response.success ? response.data : { connected: false, ...response.data, error: response.message };
  } catch (error) {
    return { connected: false, error: apiErrorText(error, error.message) };
  }
};

export const useMarketing = () => {
  const { showError, showSuccess } = useApp();

  const [loading, setLoading] = useState(true); // initial data load
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [smsStatus, setSmsStatus] = useState(null);
  const [smsTemplates, setSmsTemplates] = useState({ items: [], error: null, loaded: false });

  const [smsForm, setSmsForm] = useState({
    message: '',
    templateId: null,
    selectedClients: [],
    sendToAll: false,
  });

  const [telegramForm, setTelegramForm] = useState({
    message: '',
    image: null,
    selectedClients: [],
    sendToAll: false,
  });

  const loadStats = useCallback(async () => {
    try {
      const response = await marketingAPI.getMarketingStats();
      if (response.success) setStats(response.data);
    } catch (error) {
      console.error('Error loading marketing stats:', error);
    }
  }, []);

  const loadBroadcastHistory = useCallback(async () => {
    try {
      const response = await marketingAPI.getBroadcastHistory();
      if (response.success) setBroadcastHistory(toArray(response.data));
    } catch (error) {
      console.error('Error loading broadcast history:', error);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await marketingAPI.getMarketingClients();
      if (response.success) setClients(toArray(response.data));
    } catch (error) {
      console.error('Error loading marketing clients:', error);
      showError('Mijozlarni yuklashda xatolik');
    }
  }, [showError]);

  const loadSmsTemplates = useCallback(async () => {
    try {
      const response = await marketingAPI.getSmsTemplates();
      setSmsTemplates({
        items: toArray(response.data),
        error: response.success ? null : response.message,
        loaded: true,
      });
    } catch (error) {
      setSmsTemplates({ items: [], error: apiErrorText(error, error.message), loaded: true });
    }
  }, []);

  // Returns names of clients newly linked to the bot (they pressed Start).
  const syncTelegramLinks = useCallback(async () => {
    try {
      const response = await marketingAPI.syncTelegramLinks();
      const linked = response.success ? toArray(response.data) : [];
      if (linked.length) {
        showSuccess(`Telegramga ulandi: ${linked.join(', ')}`);
        loadClients();
        loadStats();
      }
      return response.success ? linked : null;
    } catch (error) {
      console.error('Error syncing Telegram links:', error);
      return null;
    }
  }, [showSuccess, loadClients, loadStats]);

  const testTelegramConnection = useCallback(async () => {
    setTelegramStatus(null);
    const status = await checkStatus(marketingAPI.testTelegramConnection);
    setTelegramStatus(status);
    if (status.connected) syncTelegramLinks();
  }, [syncTelegramLinks]);

  const testSmsConnection = useCallback(async () => {
    setSmsStatus(null);
    const status = await checkStatus(marketingAPI.testSmsConnection);
    setSmsStatus(status);
    if (status.connected) loadSmsTemplates();
    else setSmsTemplates({ items: [], error: null, loaded: true });
  }, [loadSmsTemplates]);

  // The API answers success even when the provider rejected messages, so
  // inspect per-channel counters to give the user an honest result.
  const sendBroadcast = useCallback(async (request, data, channel, label) => {
    setSending(true);
    try {
      const response = await request(data);
      if (!response.success) {
        showError(response.message || `${label} yuborishda xatolik`);
        return false;
      }
      const result = (response.data?.results || []).find(r => r.channel === channel);
      const sent = result?.sent ?? 0;
      const failed = result?.failed ?? 0;
      if (!result || result.attempted === 0) {
        showError(`${label}: tanlangan mijozlarda ${channel === 'sms' ? 'telefon raqami' : 'Telegram'} yo'q`);
      } else if (failed > 0) {
        const reason = result.errors?.[0] ? ` Sabab: ${result.errors[0]}` : '';
        showError(`${label}: yuborildi ${sent} ta, xatolik ${failed} ta.${reason}`);
      } else {
        showSuccess(`${label} yuborildi: ${sent} ta`);
      }
      loadBroadcastHistory();
      loadStats();
      return sent > 0;
    } catch (error) {
      console.error(`Error sending ${channel} broadcast:`, error);
      showError(apiErrorText(error, `${label} yuborishda xatolik yuz berdi`));
      return false;
    } finally {
      setSending(false);
    }
  }, [showError, showSuccess, loadBroadcastHistory, loadStats]);

  const hasRecipients = (form) => form.sendToAll || form.selectedClients.length > 0;

  const handleSMSBroadcast = async () => {
    if (!smsForm.templateId || !smsForm.message.trim()) {
      showError('Bitta SMS shablonini tanlang');
      return;
    }
    if (!hasRecipients(smsForm)) {
      showError('Kamida bitta mijoz tanlanishi kerak');
      return;
    }

    const ok = await sendBroadcast(marketingAPI.sendSMSBroadcast, {
      message: smsForm.message.trim(),
      client_ids: smsForm.sendToAll ? [] : smsForm.selectedClients,
      send_to_all: smsForm.sendToAll,
    }, 'sms', 'SMS');
    if (ok) setSmsForm({ message: '', templateId: null, selectedClients: [], sendToAll: false });
  };

  const handleTelegramBroadcast = async () => {
    if (!telegramForm.message.trim()) {
      showError('Xabar matni kiritilmagan');
      return;
    }
    if (!hasRecipients(telegramForm)) {
      showError('Kamida bitta mijoz tanlanishi kerak');
      return;
    }

    const formData = new FormData();
    formData.append('message', telegramForm.message.trim());
    formData.append('client_ids', JSON.stringify(telegramForm.sendToAll ? [] : telegramForm.selectedClients));
    formData.append('send_to_all', telegramForm.sendToAll);
    if (telegramForm.image) formData.append('image', telegramForm.image);

    const ok = await sendBroadcast(marketingAPI.sendTelegramBroadcast, formData, 'telegram', 'Telegram xabar');
    if (ok) setTelegramForm({ message: '', image: null, selectedClients: [], sendToAll: false });
  };

  useEffect(() => {
    Promise.all([loadStats(), loadBroadcastHistory(), loadClients()]).finally(() => setLoading(false));
    testTelegramConnection();
    testSmsConnection();
  }, [loadStats, loadBroadcastHistory, loadClients, testTelegramConnection, testSmsConnection]);

  return {
    loading,
    sending,
    stats,
    broadcastHistory,
    clients,
    telegramStatus,
    smsStatus,
    smsTemplates,
    smsForm,
    telegramForm,

    setSmsForm,
    setTelegramForm,
    handleSMSBroadcast,
    handleTelegramBroadcast,
    testTelegramConnection,
    testSmsConnection,
    syncTelegramLinks,
    loadStats,
    loadBroadcastHistory,
    loadClients,
  };
};
