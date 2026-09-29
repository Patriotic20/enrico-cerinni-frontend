import { useState } from 'react';
import { BarChart3, History, Smartphone, Bot, Settings } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import MarketingStats from './MarketingStats';
import SMSBroadcast from './SMSBroadcast';
import TelegramBroadcast from './TelegramBroadcast';
import BroadcastHistory from './BroadcastHistory';
import IntegrationSettings from './IntegrationSettings';

const MarketingContent = (props) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // backend enforces this too
  const [activeTab, setActiveTab] = useState('sms');

  const tabs = [
    { id: 'sms', name: 'SMS Yuborish', icon: Smartphone },
    { id: 'telegram', name: 'Telegram Yuborish', icon: Bot },
    { id: 'stats', name: 'Statistikalar', icon: BarChart3 },
    { id: 'history', name: 'Tarix', icon: History },
    ...(isAdmin ? [{ id: 'settings', name: 'Sozlamalar', icon: Settings }] : []),
  ];

  const tabProps = { ...props, openSettings: isAdmin ? () => setActiveTab('settings') : undefined };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'telegram':
        return <TelegramBroadcast {...tabProps} />;
      case 'stats':
        return <MarketingStats {...props} />;
      case 'history':
        return <BroadcastHistory {...props} />;
      case 'settings':
        return (
          <IntegrationSettings
            onSaved={() => {
              props.testSmsConnection();
              props.testTelegramConnection();
            }}
          />
        );
      default:
        return <SMSBroadcast {...tabProps} />;
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 px-6">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={20} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">{renderTabContent()}</div>
    </Card>
  );
};

export default MarketingContent;
