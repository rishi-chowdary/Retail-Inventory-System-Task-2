export const jsonToCsv = (headers: string[], rows: (string | number)[][]): string => {
  const escapeCell = (val: string | number): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCell).join(','));

  return [headerLine, ...rowLines].join('\n');
};
