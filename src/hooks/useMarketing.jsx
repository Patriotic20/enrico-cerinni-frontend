import { useState, useEffect, useCallback } from 'react';
import { marketingAPI } from '../api/marketing';
import { toArray } from '../utils/api';
import { useApp } from '../contexts/AppContext';

export const useMarketing = () => {
  const { showError, showSuccess } = useApp();
  
  // State for marketing functionality
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [smsStatus, setSmsStatus] = useState(null);
  
  // Form states
  const [smsForm, setSmsForm] = useState({
    message: '',
    selectedClients: [],
    sendToAll: false,
  });
  
  const [telegramForm, setTelegramForm] = useState({
    message: '',
    image: null,
    selectedClients: [],
    sendToAll: false,
  });

  // Load marketing statistics
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketingAPI.getMarketingStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading marketing stats:', error);
      showError('Marketing statistikalarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load broadcast history
  const loadBroadcastHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketingAPI.getBroadcastHistory();
      if (response.success) {
        setBroadcastHistory(toArray(response.data));
      }
    } catch (error) {
      console.error('Error loading broadcast history:', error);
      showError('Broadcast tarixini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load clients for marketing
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketingAPI.getMarketingClients();
      if (response.success) {
        setClients(toArray(response.data));
      }
    } catch (error) {
      console.error('Error loading marketing clients:', error);
      showError('Mijozlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Test Telegram connection
  const testTelegramConnection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await marketingAPI.testTelegramConnection();
      if (response.success) {
        setTelegramStatus(response.data);
        showSuccess('Telegram bot ulanishi muvaffaqiyatli');
      } else {
        setTelegramStatus({ connected: false, error: response.message });
        showError('Telegram bot ulanishi muvaffaqiyatsiz');
      }
    } catch (error) {
      console.error('Error testing Telegram connection:', error);
      setTelegramStatus({ connected: false, error: error.message });
      showError('Telegram bot ulanishini tekshirishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess]);

  // Test SMS provider (Eskiz) connection
  const testSmsConnection = useCallback(async () => {
    try {
      const response = await marketingAPI.testSmsConnection();
      if (response.success) {
        setSmsStatus(response.data);
      } else {
        setSmsStatus({ connected: false, error: response.message });
      }
    } catch (error) {
      console.error('Error testing SMS connection:', error);
      setSmsStatus({ connected: false, error: error.message });
    }
  }, []);

  // The API answers success even when the provider rejected messages, so
  // inspect per-channel counters to give the user an honest result.
  const summarizeBroadcast = useCallback((data, channel) => {
    const result = (data?.results || []).find(r => r.channel === channel);
    if (!result) return { ok: true, text: '' };
    if (result.failed > 0) {
      const reason = result.errors?.[0] ? ` Sabab: ${result.errors[0]}` : '';
      return {
        ok: result.sent > 0,
        text: `Yuborildi: ${result.sent} ta, xatolik: ${result.failed} ta.${reason}`,
      };
    }
    return { ok: true, text: `Yuborildi: ${result.sent} ta` };
  }, []);

  // Send SMS broadcast
  const sendSMSBroadcast = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await marketingAPI.sendSMSBroadcast(data);
      if (response.success) {
        const summary = summarizeBroadcast(response.data, 'sms');
        if (summary.ok && !summary.text.includes('xatolik')) {
          showSuccess(`SMS xabar muvaffaqiyatli yuborildi. ${summary.text}`);
        } else {
          showError(`SMS to'liq yuborilmadi. ${summary.text}`);
        }
        await loadBroadcastHistory(); // Refresh history
        return summary.ok;
      } else {
        showError(response.message || 'SMS yuborishda xatolik');
        return false;
      }
    } catch (error) {
      console.error('Error sending SMS broadcast:', error);
      showError('SMS yuborishda xatolik yuz berdi');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess, loadBroadcastHistory, summarizeBroadcast]);

  // Send Telegram broadcast
  const sendTelegramBroadcast = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await marketingAPI.sendTelegramBroadcast(data);
      if (response.success) {
        const summary = summarizeBroadcast(response.data, 'telegram');
        if (summary.ok && !summary.text.includes('xatolik')) {
          showSuccess(`Telegram xabar muvaffaqiyatli yuborildi. ${summary.text}`);
        } else {
          showError(`Telegram to'liq yuborilmadi. ${summary.text}`);
        }
        await loadBroadcastHistory(); // Refresh history
        return summary.ok;
      } else {
        showError(response.message || 'Telegram xabar yuborishda xatolik');
        return false;
      }
    } catch (error) {
      console.error('Error sending Telegram broadcast:', error);
      showError('Telegram xabar yuborishda xatolik yuz berdi');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess, loadBroadcastHistory, summarizeBroadcast]);

  // Validate SMS form
  const validateSmsForm = () => {
    if (!smsForm.message.trim()) {
      showError('Xabar matni kiritilmagan');
      return false;
    }
    
    if (!smsForm.sendToAll && smsForm.selectedClients.length === 0) {
      showError('Kamida bitta mijoz tanlanishi kerak');
      return false;
    }
    
    return true;
  };

  // Validate Telegram form
  const validateTelegramForm = () => {
    if (!telegramForm.message.trim()) {
      showError('Xabar matni kiritilmagan');
      return false;
    }
    
    if (!telegramForm.sendToAll && telegramForm.selectedClients.length === 0) {
      showError('Kamida bitta mijoz tanlanishi kerak');
      return false;
    }
    
    return true;
  };

  // Handle SMS broadcast
  const handleSMSBroadcast = async () => {
    if (!validateSmsForm()) return;

    const broadcastData = {
      message: smsForm.message.trim(),
      client_ids: smsForm.sendToAll ? [] : smsForm.selectedClients,
      send_to_all: smsForm.sendToAll,
    };

    const success = await sendSMSBroadcast(broadcastData);
    if (success) {
      // Reset form
      setSmsForm({
        message: '',
        selectedClients: [],
        sendToAll: false,
      });
    }
  };

  // Handle Telegram broadcast
  const handleTelegramBroadcast = async () => {
    if (!validateTelegramForm()) return;

    const formData = new FormData();
    formData.append('message', telegramForm.message.trim());
    formData.append('client_ids', JSON.stringify(telegramForm.sendToAll ? [] : telegramForm.selectedClients));
    formData.append('send_to_all', telegramForm.sendToAll);
    
    if (telegramForm.image) {
      formData.append('image', telegramForm.image);
    }

    const success = await sendTelegramBroadcast(formData);
    if (success) {
      // Reset form
      setTelegramForm({
        message: '',
        image: null,
        selectedClients: [],
        sendToAll: false,
      });
    }
  };

  // Load initial data
  useEffect(() => {
    loadStats();
    loadBroadcastHistory();
    loadClients();
    testTelegramConnection();
    testSmsConnection();
  }, [loadStats, loadBroadcastHistory, loadClients, testTelegramConnection, testSmsConnection]);

  return {
    // State
    loading,
    stats,
    broadcastHistory,
    clients,
    telegramStatus,
    smsStatus,
    smsForm,
    telegramForm,

    // Actions
    setSmsForm,
    setTelegramForm,
    handleSMSBroadcast,
    handleTelegramBroadcast,
    testTelegramConnection,
    testSmsConnection,
    loadStats,
    loadBroadcastHistory,
    loadClients,
  };
}; 