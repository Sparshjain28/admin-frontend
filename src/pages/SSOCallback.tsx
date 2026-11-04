import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI, api } from '@/lib/api';
import { AlertCircle, ArrowRight } from 'lucide-react';

/// Reduces the `redirect` query param to a safe same-origin path.
///
/// It arrives from a URL the app built but anyone can retype, and it is fed
/// to window.location. Left unchecked, `?redirect=https://evil.com` walks the
/// user offsite straight after login, and `?redirect=javascript:...` runs in
/// the portal's own origin — where the JWT this page has just written to
/// localStorage is readable. Only a single-slash relative path is allowed;
/// `//host`, `\\host` and anything carrying a scheme fall back to /dashboard.
const DEFAULT_REDIRECT = '/dashboard';

function safeRedirect(raw: string | null): string {
  if (!raw) return DEFAULT_REDIRECT;
  const value = raw.trim();
  if (!value.startsWith('/')) return DEFAULT_REDIRECT;
  // Protocol-relative ("//evil.com") and backslash variants browsers normalise.
  if (/^[/\\]{2}/.test(value)) return DEFAULT_REDIRECT;
  if (/^\/[\t\n\r ]*[a-z][a-z0-9+.-]*:/i.test(value)) return DEFAULT_REDIRECT;
  return value;
}

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    const redirect = safeRedirect(searchParams.get('redirect') || searchParams.get('target'));

    if (!ticket) {
      setStatus('error');
      setError('No SSO ticket was provided. Please open this link directly from the Finonest App.');
      return;
    }

    let isMounted = true;

    const performExchange = async () => {
      try {
        const res: any = await authAPI.exchangeSsoTicket(ticket);

        if (!isMounted) return;

        if (res && res.token) {
          // Store token and cache
          localStorage.setItem('auth_token', res.token);
          api.setToken(res.token);

          if (res.user) {
            localStorage.setItem('cached_user', JSON.stringify(res.user));
          }
          if (res.permissions) {
            localStorage.setItem('cached_permissions', JSON.stringify(res.permissions));
          }

          setStatus('success');

          // Full reload so every context hydrates from the new token. replace()
          // rather than href: the ticket in this URL is already spent, so Back
          // must not land on it.
          window.location.replace(redirect);
        } else {
          throw new Error(res?.error || 'Authentication exchange failed');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('SSO Exchange Error:', err);
        setStatus('error');
        setError(err?.message || err?.error || 'Session link has expired or is invalid. Please try again.');
      }
    };

    performExchange();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate]);

  // Exchanging and success are invisible: the redirect lands within a few
  // hundred ms, so a "Signing you in..." card would only flash. Hold the same
  // background so there is no white frame, and show the card for errors only.
  if (status !== 'error') {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/Finonest%20logo.png"
            alt="Finonest"
            className="h-10 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {status === 'error' && (
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Unable to Sign In</h2>
            <p className="text-xs text-red-400/90 leading-relaxed bg-red-950/40 p-3 rounded-xl border border-red-800/40">
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg text-sm"
            >
              Go to Standard Login <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
