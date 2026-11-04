import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import html2canvas from 'html2canvas';

export default function Certificate() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'download' | 'share' | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/auth/profile?t=' + Date.now())
      .then((data) => setProfile(data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!certRef.current) return null;
    return html2canvas(certRef.current, { scale: 3, useCORS: true });
  };

  const handleDownload = async () => {
    if (working) return;
    setWorking('download');
    try {
      const canvas = await captureCanvas();
      if (!canvas) throw new Error('Certificate preview not ready yet');
      const link = document.createElement('a');
      link.download = 'Finonest_Certificate.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download certificate', err);
      toast.error('Failed to download certificate');
    } finally {
      setWorking(null);
    }
  };

  const handleShare = async () => {
    if (working) return;
    setWorking('share');
    try {
      const canvas = await captureCanvas();
      if (!canvas) throw new Error('Certificate preview not ready yet');
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to convert image');

      const name = profile?.name || profile?.full_name || 'Finonest_Partner';
      const file = new File([blob], 'Finonest_Certificate.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Certificate of Association',
          text: `Certificate of Association for ${name} from Finonest`,
          files: [file],
        });
      } else {
        toast.error('Sharing not available on this device. Please download the certificate instead.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to share certificate', err);
        toast.error('Failed to share certificate');
      }
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="w-8 h-8 border-4 border-[#3B5BDB]/20 border-t-[#3B5BDB] rounded-full animate-spin" />
      </div>
    );
  }

  const name = profile?.name || profile?.full_name || 'Associate Partner';
  const role = (profile?.role || 'business_associate').replace(/_/g, ' ').toUpperCase();
  const userId = profile?.user_id || (profile?.id ? profile.id.toString() : 'FN-PENDING');
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
        <h1 className="text-[17px] font-bold text-[#0F172A]">Partner Certificate</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Certificate Card — A4 landscape ratio (1.414), gold double border */}
        <div
          ref={certRef}
          className="w-full mx-auto"
          style={{ aspectRatio: '1.414', backgroundColor: '#FCFBF7', borderRadius: 12, border: '5px solid #D4AF37', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}
        >
          <div className="w-full h-full p-[1px]" style={{ border: '0.8px solid #996515' }}>
            <div className="w-full h-full flex flex-col justify-between px-3 py-2 sm:px-6 sm:py-4">
              {/* Header: Logo + ID */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-base font-black tracking-widest text-[#0F2C82]">FINONEST</p>
                  <div className="h-[1.5px] w-9 sm:w-14 bg-[#D4AF37]" />
                </div>
                <p className="text-[6px] sm:text-[10px] font-bold text-slate-600">ID: {userId}</p>
              </div>

              {/* Title */}
              <div className="text-center">
                <p className="text-[10px] sm:text-base font-extrabold text-[#1E293B] tracking-wide">
                  CERTIFICATE OF ASSOCIATION
                </p>
                <p className="text-[5px] sm:text-[9px] font-bold text-slate-400 tracking-widest mt-0.5">
                  PROUDLY PRESENTED TO
                </p>
              </div>

              {/* Recipient name + description */}
              <div className="text-center px-2 sm:px-8">
                <p className="text-[11px] sm:text-lg font-bold text-[#0F2C82] tracking-wide">
                  {name.toUpperCase()}
                </p>
                <div className="h-px w-32 sm:w-56 bg-[#E2E8F0] mx-auto my-1" />
                <p className="text-[5.5px] sm:text-[10px] text-slate-600 leading-snug">
                  In recognition of their appointment as a certified {role} of Finonest India. They are
                  authorized to represent Finonest and facilitate all financial services, loans, and credit
                  products under the official guidelines of our partnered banks and NBFCs.
                </p>
              </div>

              {/* Footer: Date, Seal, Signature */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[7px] sm:text-sm font-bold text-[#1E293B]">{dateStr}</p>
                  <p className="text-[5px] sm:text-[9px] font-semibold text-slate-500">Date of Issue</p>
                </div>
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 28, height: 28, backgroundColor: '#FFFBEB', border: '1.5px solid #D4AF37' }}
                >
                  <Award size={16} className="text-[#D4AF37]" />
                </div>
                <div className="text-right">
                  <p className="text-[7px] sm:text-sm font-bold text-[#0F2C82]">FINONEST INDIA</p>
                  <div className="h-px w-14 sm:w-16 bg-slate-400 ml-auto my-0.5" />
                  <p className="text-[5px] sm:text-[9px] font-semibold text-slate-500">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {working ? (
            <div className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-[#3B5BDB]/30 border-t-[#3B5BDB] rounded-full animate-spin" />
              <span className="font-bold text-[#3B5BDB] text-sm">
                {working === 'download' ? 'Downloading...' : 'Sharing...'}
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className="w-full bg-[#3B5BDB] hover:bg-[#2F49B0] text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                <Download size={20} /> Download Certificate
              </button>
              <button
                onClick={handleShare}
                className="w-full bg-white border-[1.5px] border-[#3B5BDB] text-[#3B5BDB] font-bold rounded-xl py-3.5 flex items-center justify-center gap-2"
              >
                <Share2 size={20} /> Share Certificate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
