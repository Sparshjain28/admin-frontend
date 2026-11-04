import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CardFront, CardBack } from '@/components/IDCard';
import html2canvas from 'html2canvas';

const CARD_W = 450;
const CARD_H = Math.round(CARD_W * (2.125 / 3.375));
const GAP = 20;

export default function VisitingCard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'download' | 'share' | null>(null);

  useEffect(() => {
    api.get('/auth/profile?t=' + Date.now())
      .then((data) => setProfile(data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const buildCardCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const front = document.getElementById('card-front');
    const back = document.getElementById('card-back');
    if (!front || !back) return null;

    const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, width: CARD_W, height: CARD_H });
    const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, width: CARD_W, height: CARD_H });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = CARD_W * 3;
    finalCanvas.height = (CARD_H * 2 + GAP) * 3;
    const ctx = finalCanvas.getContext('2d')!;
    ctx.scale(3, 3);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, CARD_W, CARD_H * 2 + GAP);
    ctx.drawImage(canvasFront, 0, 0, CARD_W, CARD_H);
    ctx.drawImage(canvasBack, 0, CARD_H + GAP, CARD_W, CARD_H);
    return finalCanvas;
  };

  const handleDownload = async () => {
    if (working) return;
    setWorking('download');
    try {
      const canvas = await buildCardCanvas();
      if (!canvas) throw new Error('Card preview not ready yet');
      const link = document.createElement('a');
      link.download = 'Business_Card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download', err);
      toast.error('Failed to download Business Card');
    } finally {
      setWorking(null);
    }
  };

  const handleShare = async () => {
    if (working) return;
    setWorking('share');
    try {
      const canvas = await buildCardCanvas();
      if (!canvas) throw new Error('Card preview not ready yet');
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to convert image');

      const name = profile?.name || profile?.full_name || 'Finonest_User';
      const file = new File([blob], 'Business_Card.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Business Card',
          text: `Business Card for ${name} from Finonest`,
          files: [file],
        });
      } else {
        toast.error('Sharing not available on this device. Please download the card instead.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to share', err);
        toast.error('Failed to share Business Card');
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <p className="text-red-500">Failed to load profile.</p>
      </div>
    );
  }

  const kyc = profile.kyc || {};
  const address = kyc.address
    ? [kyc.address.line1, kyc.address.city, kyc.address.state, kyc.address.pincode].filter(Boolean).join(', ')
    : 'Finonest House, 3rd Floor, BL Tower 1, Mahaveer Nagar, Tonk Road, Jaipur';

  const cardData = {
    userId: profile.user_id || profile.id?.toString() || 'PENDING',
    name: profile.name || profile.full_name || '',
    position: 'Business Associate',
    company: 'Finonest',
    mobile: profile.phone || '',
    address,
    photo: profile.photo_path ? (profile.photo_path.startsWith('http') ? profile.photo_path : `/${profile.photo_path}`) : null,
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
        <h1 className="text-[17px] font-bold text-[#0F172A]">Visiting Card</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1E293B] text-[15px]">Your Business Card</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!!working}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              {working === 'download' ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Download
            </button>
            <button
              onClick={handleShare}
              disabled={!!working}
              className="bg-white hover:bg-slate-50 disabled:opacity-60 text-[#1E293B] border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              {working === 'share' ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Share2 size={14} />
              )}
              Share
            </button>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center overflow-x-auto">
          <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <CardFront cardData={cardData} />
          </div>
          <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200">
            <CardBack cardData={cardData} />
          </div>
        </div>

        <p className="text-center text-[11px] text-[#64748B] mt-3">
          Use the buttons above to download or share your card.
        </p>
      </div>
    </div>
  );
}
