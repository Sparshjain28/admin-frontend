import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Megaphone, Landmark, BookOpen, Percent, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DocItem {
  title: string;
  description: string;
  url: string;
  category: 'Marketing' | 'Bank Policies' | 'Guides' | 'Rate Cards' | string;
}

const DOCS: DocItem[] = [
  {
    title: 'Finonest Partner Program Benefits',
    description: 'Brochure describing payout percentages, milestones, and partner perks.',
    url: 'https://www.finonest.com/downloads/partner_benefits_program.pdf',
    category: 'Marketing',
  },
  {
    title: 'HDFC Bank Used Car Loan Policy',
    description: 'Current interest rates, eligibility criteria, and required document checklist for HDFC.',
    url: 'https://www.finonest.com/downloads/hdfc_used_car_loan_policy.pdf',
    category: 'Bank Policies',
  },
  {
    title: 'ICICI Bank Used Car Loan Guidelines',
    description: 'Eligibility matrix, loan-to-value (LTV) ratios, and documentation rules for ICICI.',
    url: 'https://www.finonest.com/downloads/icici_used_car_loan_guidelines.pdf',
    category: 'Bank Policies',
  },
  {
    title: 'Finonest DSA Sourcing Guide',
    description: 'Tips and walkthrough for generating leads and submitting high-conversion loan files.',
    url: 'https://www.finonest.com/downloads/dsa_lead_sourcing_guide.pdf',
    category: 'Guides',
  },
  {
    title: 'Axis Bank Used Car Rate Card',
    description: 'Latest interest rate grids based on credit score bands for Axis bank car loans.',
    url: 'https://www.finonest.com/downloads/axis_car_loan_rates.pdf',
    category: 'Rate Cards',
  },
];

const CATEGORY_STYLE: Record<string, { icon: any; color: string; bg: string }> = {
  Marketing: { icon: Megaphone, color: '#0D9488', bg: '#F0FDFA' },
  'Bank Policies': { icon: Landmark, color: '#D97706', bg: '#FEF3C7' },
  Guides: { icon: BookOpen, color: '#7C3AED', bg: '#F5F3FF' },
  'Rate Cards': { icon: Percent, color: '#BE123C', bg: '#FFE4E6' },
};

const DEFAULT_STYLE = { icon: FileText, color: '#3B5BDB', bg: '#EFF2FE' };

export default function DocsToShare() {
  const navigate = useNavigate();

  const handleShare = async (doc: DocItem) => {
    const text = `Sharing "${doc.title}":\n\nDownload Link: ${doc.url}\n\nShared via Finonest Partner App.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: doc.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to share document');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 flex items-center justify-center px-4 py-3.5 border-b border-slate-100 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#3B5BDB]"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
        </button>
        <h1 className="text-[17px] font-bold text-[#0F172A]">Docs to Share</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {DOCS.map((doc, i) => {
          const style = CATEGORY_STYLE[doc.category] || DEFAULT_STYLE;
          const Icon = style.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-start gap-3.5"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: style.bg }}
              >
                <Icon size={24} color={style.color} />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wide"
                  style={{ backgroundColor: style.bg, color: style.color }}
                >
                  {doc.category.toUpperCase()}
                </span>
                <p className="text-[14px] font-bold text-[#1E293B] mt-2">{doc.title}</p>
                <p className="text-[12px] text-[#64748B] mt-1 leading-snug">{doc.description}</p>
              </div>
              <button
                onClick={() => handleShare(doc)}
                title="Share Document Link"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#3B5BDB] hover:bg-[#EFF2FE] active:scale-95 transition-all"
              >
                <Share2 size={20} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
