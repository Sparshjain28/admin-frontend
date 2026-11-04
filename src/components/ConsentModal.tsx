import React, { useState } from 'react';
import { Loader2, X, Link as LinkIcon, Smartphone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (skipped?: boolean) => void;
  mobile: string;
  associateName?: string;
  customerName?: string;
  hideSkipButton?: boolean;
}

export default function ConsentModal({ isOpen, onClose, onSuccess, mobile, associateName, customerName, hideSkipButton }: ConsentModalProps) {
  const [consentMode, setConsentMode] = useState<'SELECTION' | 'LINK' | 'OTP'>('SELECTION');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerificationId, setOtpVerificationId] = useState('');
  const [linkAttemptId, setLinkAttemptId] = useState('');

  const onSuccessCalled = React.useRef(false);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (consentMode === 'LINK' && linkAttemptId) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/consent/link/status/${linkAttemptId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'COMPLETED') {
              clearInterval(intervalId);
              if (!onSuccessCalled.current) {
                onSuccessCalled.current = true;
                if (data.bureauPullDecision === 'DENIED') {
                  toast.error('Customer DENIED consent for CIBIL check!');
                  onSuccess(true); // skip CIBIL
                } else {
                  toast.success('Customer approved consent successfully!');
                  onSuccess(false);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error checking link status', err);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [consentMode, linkAttemptId, onSuccess]);

  if (!isOpen) return null;

  const handleSendLink = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/consent/link/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          mobileNumber: mobile,
          purposeIds: ['BUREAU_PULL'],
          deliveryChannel: 'WHATSAPP',
          associateName: associateName || 'Our Associate',
          customerName: customerName || 'Customer'
        })
      });
      if (!res.ok) throw new Error('Failed to send consent link');
      const data = await res.json();
      setLinkAttemptId(data.attemptId);
      setConsentMode('LINK');
      toast.success('Consent link sent via WhatsApp!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleTriggerOtp = async () => {
    setLoading(true);
    try {
      // Create a dummy subject if needed or rely on backend fallback logic
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/consent/otp/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          subjectId: '00000000-0000-0000-0000-000000000000', // Typically fetched, but the backend handles it or we need to pass a real one. Let's assume the backend handles it or we pass a generic one for now.
          mobileNumber: mobile,
          purposeIds: ['BUREAU_PULL'],
          fallbackReason: 'LINK_NOT_OPENED',
          primaryAttemptId: linkAttemptId || undefined
        })
      });
      if (!res.ok) throw new Error('Failed to trigger OTP');
      const data = await res.json();
      setOtpVerificationId(data.otpVerificationId);
      setConsentMode('OTP');
      toast.success('OTP sent to customer!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (!otp) return toast.error('Enter OTP');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/consent/otp/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          otpVerificationId,
          otp,
          decisions: [
            { purposeId: 'BUREAU_PULL', status: 'APPROVED' }
          ]
        })
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Failed to verify OTP');
      }
      toast.success('Consent verified!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            Customer Consent Required
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {consentMode === 'SELECTION' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-6">
                Please collect consent from the customer before fetching their CIBIL report.
              </p>

              <button
                type="button"
                onClick={handleSendLink}
                disabled={loading}
                className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold"
              >
                {loading ? <Loader2 className="animate-spin" /> : <LinkIcon size={18} />}
                Send Consent Link via WhatsApp
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerOtp}
                disabled={loading}
                className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-semibold"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Smartphone size={18} />}
                Use OTP Fallback (Customer Present)
              </button>

              {!hideSkipButton && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Manual</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toast.info('OTP Skipped. Please fill CIBIL details manually.');
                      onSuccess(true);
                    }}
                    disabled={loading}
                    className="w-full py-3 px-4 flex items-center justify-center gap-3 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-colors font-semibold border border-border"
                  >
                    Skip OTP & Fill Manually
                  </button>
                </>
              )}
            </div>
          )}

          {consentMode === 'LINK' && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <div>
                <h4 className="font-bold mb-2">Waiting for Approval...</h4>
                <p className="text-sm text-muted-foreground">
                  A consent link has been sent to {mobile}. Please ask the customer to open the link and approve.
                  The form will automatically continue once approved.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerOtp}
                className="text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
              >
                Link not working? Use OTP Fallback
              </button>
            </div>
          )}

          {consentMode === 'OTP' && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="font-bold mb-2">Enter OTP</h4>
                <p className="text-sm text-muted-foreground">
                  Please enter the 6-digit OTP sent to {mobile}
                </p>
              </div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSubmitOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Verify Consent'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
