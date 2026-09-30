import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Input from '../forms/Input';
import { AlertCircle, Smartphone, Bot, Send, Users, UserCheck, Search, CheckCircle, XCircle, X } from 'lucide-react';
import { marketingAPI } from '../../api/marketing';

export default function ClientMessagingModal({ 
  isOpen, 
  onClose, 
  client,
  selectedClients,
  allClients
}) {
  const [messageType, setMessageType] = useState('sms'); // 'sms' or 'telegram'
  const [message, setMessage] = useState('');
  const [selectedClientsForMessage, setSelectedClientsForMessage] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [telegramStatus, setTelegramStatus] = useState(null);
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);

  // Initialize selected clients when modal opens
  useEffect(() => {
    if (isOpen) {
      if (client) {
        // Single client selected
        setSelectedClientsForMessage([client.id]);
        setSendToAll(false);
      } else if (selectedClients.length > 0) {
        // Multiple clients selected from table
        setSelectedClientsForMessage(selectedClients);
        setSendToAll(false);
      } else {
        // No specific clients selected
        setSelectedClientsForMessage([]);
        setSendToAll(true);
      }
      setMessage('');
      setError('');
      setSuccess('');
      setImage(null);
      testTelegramConnection();
    }
  }, [isOpen, client, selectedClients]);

  const testTelegramConnection = async () => {
    try {
      const response = await marketingAPI.testTelegramConnection();
      if (response.success) {
        setTelegramStatus(response.data);
      } else {
        setTelegramStatus({ connected: false, error: response.message });
      }
    } catch (error) {
      setTelegramStatus({ connected: false, error: error.message });
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setError('');
  };

  const handleSendToAllChange = (e) => {
    setSendToAll(e.target.checked);
    if (e.target.checked) {
      setSelectedClientsForMessage([]);
    }
  };

  const handleClientSelection = (clientId) => {
    setSelectedClientsForMessage(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
    setSendToAll(false);
  };

  const handleSelectAllClients = () => {
    setSelectedClientsForMessage(allClients.map(client => client.id));
    setSendToAll(false);
  };

  const handleClearSelection = () => {
    setSelectedClientsForMessage([]);
  };

  // Preview URL for the selected image (revoked on change/unmount)
  const [imagePreview, setImagePreview] = useState(null);
  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Rasm hajmi 10MB dan katta bo\'lishi mumkin emas');
        return;
      }
      setImage(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError('Xabar matni kiritilmagan');
      return;
    }

    if (!sendToAll && selectedClientsForMessage.length === 0) {
      setError('Kamida bitta mijoz tanlanishi kerak');
      return;
    }

    if (messageType === 'telegram' && !telegramStatus?.connected) {
      setError('Telegram bot ulanmagan. Iltimos, avval ulanishni tekshiring.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const broadcastData = {
        message: message.trim(),
        client_ids: sendToAll ? [] : selectedClientsForMessage,
        send_to_all: sendToAll,
      };

      let response;
      if (messageType === 'sms') {
        response = await marketingAPI.sendSMSBroadcast(broadcastData);
      } else {
        const formData = new FormData();
        formData.append('message', message.trim());
        formData.append('client_ids', JSON.stringify(sendToAll ? [] : selectedClientsForMessage));
        formData.append('send_to_all', sendToAll);
        
        if (image) {
          formData.append('image', image);
        }

        response = await marketingAPI.sendTelegramBroadcast(formData);
      }

      if (response.success) {
        setSuccess(`${messageType === 'sms' ? 'SMS' : 'Telegram'} xabar muvaffaqiyatli yuborildi`);
        setMessage('');
        setImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.message || 'Xabar yuborishda xatolik');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Xabar yuborishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedClientsForMessage([]);
    setSendToAll(false);
    setError('');
    setSuccess('');
    setImage(null);
    setSearchTerm('');
    onClose();
  };

  const filteredClients = allClients.filter(client =>
    client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  const selectedClientsCount = selectedClientsForMessage.length;
  const totalClients = allClients.length;

  const getConnectionStatus = () => {
    if (!telegramStatus) return { connected: false, message: 'Ulanish tekshirilmoqda...' };
    return telegramStatus.connected 
      ? { connected: true, message: 'Telegram bot ulangan' }
      : { connected: false, message: 'Telegram bot ulanmagan' };
  };

  const connectionStatus = getConnectionStatus();

  const charLimit = messageType === 'sms' ? 160 : 4096;
  const channelBtnCls = (active) =>
    `flex-1 min-h-[40px] inline-flex items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`;
  const checkboxCls = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mijozlarga xabar yuborish"
      size="lg"
    >
      <div className="space-y-5">
        {/* Message Type Selection */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1" role="group" aria-label="Xabar turi">
          <button
            type="button"
            aria-pressed={messageType === 'sms'}
            className={channelBtnCls(messageType === 'sms')}
            onClick={() => setMessageType('sms')}
          >
            <Smartphone size={18} aria-hidden="true" />
            <span>SMS</span>
          </button>
          <button
            type="button"
            aria-pressed={messageType === 'telegram'}
            className={channelBtnCls(messageType === 'telegram')}
            onClick={() => setMessageType('telegram')}
          >
            <Bot size={18} aria-hidden="true" />
            <span>Telegram</span>
          </button>
        </div>

        {/* Telegram Connection Status */}
        {messageType === 'telegram' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div
              className={`flex items-center gap-2 text-sm font-medium ${
                connectionStatus.connected ? 'text-emerald-700' : 'text-red-700'
              }`}
              role="status"
            >
              {connectionStatus.connected
                ? <CheckCircle size={16} aria-hidden="true" />
                : <XCircle size={16} aria-hidden="true" />}
              <span>{connectionStatus.message}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testTelegramConnection}
              disabled={loading}
            >
              Ulanishni tekshirish
            </Button>
          </div>
        )}

        {/* Message Input */}
        <div>
          <h3 className="mb-1.5 text-sm font-medium text-gray-700">
            <label htmlFor="client-message-text">Xabar matni</label>
          </h3>
          <textarea
            id="client-message-text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
            value={message}
            onChange={handleMessageChange}
            placeholder="Xabar matnini kiriting..."
            rows={4}
            maxLength={charLimit}
          />
          <div className="mt-1 text-right text-xs text-gray-500" aria-live="polite">
            {message.length}/{charLimit} belgi
          </div>
        </div>

        {/* Image Upload for Telegram */}
        {messageType === 'telegram' && (
          <div>
            <h3 className="mb-1.5 text-sm font-medium text-gray-700">Rasm (ixtiyoriy)</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Rasm tanlash
              </Button>
              {image && (
                <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt={image.name}
                      className="h-12 w-12 shrink-0 rounded-md border border-gray-200 object-cover"
                    />
                  )}
                  <span className="max-w-[12rem] truncate text-sm text-gray-700">{image.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    aria-label="Rasmni olib tashlash"
                    title="O'chirish"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recipients Selection */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Qabul qiluvchilar</h3>

          <div className="mb-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={handleSendToAllChange}
                className={checkboxCls}
              />
              <span>Barcha mijozlarga yuborish ({totalClients} ta)</span>
            </label>
          </div>

          {!sendToAll && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Tanlangan mijozlar: {selectedClientsCount} ta</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllClients}
                    disabled={selectedClientsCount === totalClients}
                  >
                    Hammasini tanlash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={selectedClientsCount === 0}
                  >
                    Tozalash
                  </Button>
                </div>
              </div>

              <Input
                placeholder="Mijozlarni qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={16} aria-hidden="true" />}
                aria-label="Mijozlarni qidirish"
              />

              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500">
                    <Users size={40} aria-hidden="true" />
                    <p className="m-0 text-sm">Mijozlar topilmadi</p>
                  </div>
                ) : (
                  filteredClients.map(client => (
                    <label
                      key={client.id}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientsForMessage.includes(client.id)}
                        onChange={() => handleClientSelection(client.id)}
                        className={checkboxCls}
                      />
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-gray-900">
                          {client.first_name} {client.last_name}
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">{client.phone}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
            <CheckCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Bekor qilish
          </Button>
          <Button
            variant="primary"
            onClick={handleSendMessage}
            disabled={loading || !message.trim() || (!sendToAll && selectedClientsCount === 0) || (messageType === 'telegram' && !connectionStatus.connected)}
            loading={loading}
          >
            {!loading && <Send size={16} aria-hidden="true" />}
            <span>{messageType === 'sms' ? 'SMS' : 'Telegram'} Yuborish</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
