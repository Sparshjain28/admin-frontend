import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Download, Share2, Printer } from 'lucide-react';
import { downloadRCTemplatePDF, shareRCTemplatePDF, exportRCTemplatePDF } from '@/lib/rc-template';
import { toast } from 'sonner';

export default function RCTemplatePage() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => api.get(`/loans/${loanId}`),
    enabled: !!loanId,
  });

  useEffect(() => {
    if (!loan) return;

    let cancelled = false;

    async function generatePDF() {
      setLoading(true);
      try {
        const { generateRCTemplatePDF } = await import('@/lib/rc-template');
        const blob = await generateRCTemplatePDF(loan);
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
  }, [loan]);

  if (loanLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loan not found</p>
          <button onClick={() => navigate('/loans')} className="text-accent hover:underline">
            ← Back to loans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/loans/${loanId}`)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">RC Template</h1>
            <p className="text-xs text-muted-foreground">{loan.id} • {loan.applicant_name}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportRCTemplatePDF(loan)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all text-sm"
          >
            <Printer size={16} />
            Export
          </button>
          <button
            onClick={() => downloadRCTemplatePDF(loan)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-all text-sm"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={() => shareRCTemplatePDF(loan)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-all text-sm"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center">
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
            className="w-full h-full border-0"
            title="RC Template"
          />
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Failed to load PDF</p>
          </div>
        )}
      </div>
    </div>
  );
}

