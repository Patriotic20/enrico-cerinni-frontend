// Intl formatters are expensive to build and these run per card/row/render,
// so each distinct config is built once and reused.
const cache = new Map();
const nf = (opts) => {
  const key = JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat('uz-UZ', opts));
  return cache.get(key);
};
const df = (opts) => {
  const key = 'd' + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new Intl.DateTimeFormat('uz-UZ', opts));
  return cache.get(key);
};

// The one money format for the app: "1 500 000 soʻm", no decimals.
export const formatCurrency = (amount, currency = 'UZS') =>
  nf({ style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Number(amount) || 0);

export const formatDate = (date, options = {}) => {
  if (!date) return '';
  return df({ year: 'numeric', month: 'long', day: 'numeric', ...options }).format(new Date(date));
};

export const formatNumber = (number) => nf({}).format(Number(number) || 0);

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
