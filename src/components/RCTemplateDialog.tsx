import { useState, useEffect } from 'react';
import { X, Printer, Share2, Download } from 'lucide-react';
import { downloadRCTemplatePDF, shareRCTemplatePDF, exportRCTemplatePDF, downloadRCTemplateFullPage, exportRCTemplateFullPage } from '@/lib/rc-template';
import { toast } from 'sonner';

interface RCTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
}

export default function RCTemplateDialog({ isOpen, onClose, loan }: RCTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'compact' | 'fullpage'>('compact');

  useEffect(() => {
    if (!isOpen || !loan) return;

    let cancelled = false;

    async function generatePDF() {
      setLoading(true);
      try {
        const { generateRCTemplatePDF, generateRCTemplateFullPagePDF } = await import('@/lib/rc-template');
        const pdfGenerator = viewMode === 'compact' ? generateRCTemplatePDF : generateRCTemplateFullPagePDF;
        const blob = await pdfGenerator(loan);
        const url = URL.createObjectURL(blob);
        if (!cancelled) {
          setPdfUrl(url);
        }
      } catch (error) {
if (!cancelled) {
          toast.error('Failed to generate RC template');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    generatePDF();

    return () => {
      cancelled = true;
    };
  }, [isOpen, loan, viewMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-1">
      <div className="bg-card rounded-2xl border border-border w-[99vw] h-[99vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">RC Template - {loan.id}</h2>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'compact'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setViewMode('fullpage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'fullpage'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Full Page
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* PDF Preview - Full Height */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center min-h-0">
          {loading ? (
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-muted-foreground">Generating RC Template...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 flex-1"
              title="RC Template Preview"
            />
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Failed to load PDF</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0 flex-wrap">
          <button
            onClick={() => viewMode === 'compact' ? exportRCTemplatePDF(loan) : exportRCTemplateFullPage(loan)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all text-sm"
          >
            <Printer size={16} />
            Export
          </button>
          <button
            onClick={() => viewMode === 'compact' ? downloadRCTemplatePDF(loan) : downloadRCTemplateFullPage(loan)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-all text-sm"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={() => shareRCTemplatePDF(loan)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-all text-sm"
          >
            <Share2 size={16} />
            Share
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2.5 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

