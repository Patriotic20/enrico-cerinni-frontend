export const formatCurrency = (amount, currency = 'UZS') => {
  if (amount === null || amount === undefined) return '0 UZS';
  
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  return new Intl.DateTimeFormat('uz-UZ', mergedOptions).format(new Date(date));
};

export const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  
  return new Intl.NumberFormat('uz-UZ').format(number);
};

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}; 
/**
 * Short axis label for a money value.
 *
 * A fixed "/ 1000000 + M" scale prints every tick as "0.0M" once the numbers
 * are small — which is exactly what a young shop's dashboard looks like — so
 * the unit follows the magnitude instead.
 */
export const compactAmount = (value) => {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(num)}`;
};
