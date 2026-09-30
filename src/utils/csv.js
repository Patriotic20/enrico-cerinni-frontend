// Text starting with = + - @ tab CR runs as an Excel formula (CSV injection).
// Numbers pass through so negative amounts stay numeric.
export const safeCell = (v) => {
  const s = String(v ?? '');
  return typeof v === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

// Download rows as a CSV file. The BOM makes Excel read UTF-8 (Uzbek letters) correctly.
export const downloadCsv = (filename, header, rows) => {
  const esc = (v) => `"${safeCell(v).replace(/"/g, '""')}"`;
  const text = [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
