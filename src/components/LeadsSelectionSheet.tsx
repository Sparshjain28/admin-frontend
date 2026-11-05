import { useNavigate } from 'react-router-dom';
import { FileText, Wallet, Archive, X } from 'lucide-react';
import { useEffect } from 'react';

interface LeadsSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const leadsOptions = [
  {
    id: 'all',
    title: 'All Leads',
    icon: FileText,
    path: '/leads',
    bg: 'bg-white',
    glow: 'shadow-blue-300',
  },
  
  {
    id: 'personal-loan',
    title: 'Loans',
    icon: Wallet,
    path: '/personal-loan-leads',
    bg: 'bg-white',
    glow: 'shadow-emerald-300',
  },
  {
    id: 'archived',
    title: 'Archived',
    icon: Archive,
    path: '/archived-leads',
    bg: 'bg-white',
    glow: 'shadow-orange-300',
  },
];

const LeadsSelectionSheet = ({ isOpen, onClose }: LeadsSelectionSheetProps) => {
  const navigate = useNavigate();

  const handleLeadsSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes leads-sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes leads-icon-pop {
          0%   { transform: translateY(24px) scale(0.7); opacity: 0; }
          60%  { transform: translateY(-4px) scale(1.08); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes leads-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Darkened overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50"
        style={{
          animation: 'leads-overlay-in 0.2s ease forwards',
        }}
      />

      {/* Sheet panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl"
        style={{
          animation: 'leads-sheet-up 0.35s cubic-bezier(0.32,0.72,0,1) forwards',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >




        {/* Circular icon grid — slides up one by one */}
        <div className="grid grid-cols-4 gap-3 px-5 pt-6 pb-4">
          {leadsOptions.map((option, i) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleLeadsSelect(option.path)}
                className="flex flex-col items-center gap-2 group outline-none"
                style={{
                  animation: `leads-icon-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${80 + i * 60}ms both`,
                }}
              >
                {/* Circle */}
                <div
                  className={`
                    w-[3.5rem] h-[3.5rem] rounded-full ${option.bg} ${option.glow}
                    shadow-lg flex items-center justify-center
                    group-active:scale-90 transition-transform duration-100
                  `}
                >
                  <Icon className="w-6 h-6 text-black" strokeWidth={1.75} />
                </div>
                {/* Label */}
                <span className="text-[10px] font-semibold text-card-foreground text-center leading-tight">
                  {option.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LeadsSelectionSheet;
