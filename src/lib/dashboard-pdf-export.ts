export function downloadDashboardPDF() {
  const element = document.getElementById('dashboard-content');
  if (!element) return;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'dashboard.pdf';
  link.click();
}
