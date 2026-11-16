export function formatNumber(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(val);
}

export function formatDecimal(val: number, decimals = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}
