// A variant is "low" once it drops to its own min_stock_level, so warnings
// follow each SKU's threshold rather than one global number.
export const variantStockStatus = (variant) => {
  if (variant.stock_quantity === 0) return 'out';
  if (variant.stock_quantity <= (variant.min_stock_level || 0)) return 'low';
  return 'ok';
};

export const summarizeVariants = (variants = []) => {
  let total = 0, low = 0, out = 0;
  for (const v of variants) {
    total += v.stock_quantity;
    const status = variantStockStatus(v);
    if (status === 'out') out++;
    else if (status === 'low') low++;
  }
  return { total, count: variants.length, low, out };
};
