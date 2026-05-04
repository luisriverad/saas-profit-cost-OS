// =====================================================
// FORMAT UTILS — Convenciones es-MX / MXN
// =====================================================

export const fmtMoney = (n, decimals = 2) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const fmtMoneyNoDec = (n) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export const fmtMoneySigned = (n) => {
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return '0';
};

export const fmtPct = (n, decimals = 1) =>
  `${(n * 100).toFixed(decimals)}%`;

export const fmtUnits = (n) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });
