import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Set column widths automatically
  const maxLengths = Object.keys(data[0]).map(key => {
    return Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    );
  });
  worksheet['!cols'] = maxLengths.map(len => ({ wch: Math.min(Math.max(len + 2, 10), 50) }));

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...data.map(row => headers.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function parseCSV(file: File | string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (typeof file === 'string') {
      const text = file;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header] = values[i];
          return obj;
        }, {} as any);
      });
      resolve(data);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
          }, {} as any);
        });
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
}

export function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
