import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { toast } from 'sonner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function BankImportModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        toast.error('Please select an Excel (.xlsx, .xls) or CSV file');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/banks/import/excel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Import failed');
        setResults({ success: 0, failed: 1, errors: [data.error || 'Import failed'] });
        return;
      }

      setResults(data);
      toast.success(`Import completed: ${data.success} successful, ${data.failed} failed`);
      
      if (data.failed === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message);
      setResults({ success: 0, failed: 1, errors: [error.message] });
    } finally {
      setLoading(false);
    }
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Import Banks & Branches</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!results ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Upload an Excel or CSV file with bank and branch data</p>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}>
                  <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Click to select file</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {file && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm text-foreground font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
                  <span className="block"><strong>Required:</strong> Branch Name, Bank Name</span>
                  <span className="block"><strong>Products (Yes/No):</strong> New Car Purchase · Used Car Purchase · Used Car Refinance Up · Used Car BT/Top Up</span>
                  <span className="block"><strong>Optional:</strong> Sr No. · Location · Geo Limit · SM Name · SM Number · ASM Name · ASM Number · Status</span>
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">✓ Import Completed</p>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
                  {results.success} records imported successfully
                </p>
              </div>
              {results.failed > 0 && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100">{results.failed} records failed</p>
                  {results.errors && results.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      {results.errors.slice(0, 5).map((err: string, i: number) => (
                        <p key={i} className="text-xs text-red-800 dark:text-red-200 mt-1">{err}</p>
                      ))}
                      {results.errors.length > 5 && (
                        <p className="text-xs text-red-800 dark:text-red-200 mt-1">... and {results.errors.length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted text-sm font-medium"
          >
            Close
          </button>
          {!results && (
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-4 py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-60 text-sm font-medium"
            >
              {loading ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
