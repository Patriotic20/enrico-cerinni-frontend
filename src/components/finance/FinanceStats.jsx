
import { TrendingDown, Users, Building2, Wallet, Calendar } from 'lucide-react';

const FinanceStats = ({ stats, formatCurrency }) => {
  const statCards = [
    {
      title: 'Jami xarajatlar',
      value: stats.totalExpenses,
      subtitle: 'Bu oy',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: TrendingDown,
      iconColor: 'text-red-500'
    },
    {
      title: 'Yetkazib beruvchilar',
      value: stats.supplierCosts,
      subtitle: 'Xarajatlar',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: Building2,
      iconColor: 'text-orange-500'
    },
    {
      title: 'Ish haqi',
      value: stats.salaryExpenses,
      subtitle: 'Xodimlar',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Users,
      iconColor: 'text-blue-500'
    },
    {
      title: 'Kunlik xarajatlar',
      value: stats.dailyExpenses,
      subtitle: 'Xarajatlar',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      icon: Calendar,
      iconColor: 'text-purple-500'
    }
  ];


  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div key={index} className={`bg-white rounded-xl p-6 shadow-sm border ${card.borderColor} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={card.iconColor} size={24} />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {card.title}
              </h3>
              <p className={`text-2xl font-bold ${card.color} leading-none`}>
                {formatCurrency(card.value)}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Wallet size={12} />
                {card.subtitle}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${
                    card.color.includes('red') ? 'bg-red-500' :
                    card.color.includes('orange') ? 'bg-orange-500' :
                    card.color.includes('blue') ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(100, (card.value / Math.max(...statCards.map(s => s.value))) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FinanceStats; 