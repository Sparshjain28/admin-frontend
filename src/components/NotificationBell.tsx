import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Check, CheckCheck, Trash2, FileText, AlertCircle, CheckCircle2, Info, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
}

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  related_id: string | number | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: { link?: string; link_label?: string } | null;
}

// Only same-site paths from the notification's own metadata are followed.
function safeMetaLink(link: unknown): string | null {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : null;
}

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'text-blue-500' },
  success: { icon: CheckCircle2, color: 'text-green-500' },
  warning: { icon: AlertCircle, color: 'text-yellow-500' },
  error: { icon: AlertCircle, color: 'text-red-500' },
  rework: { icon: RefreshCw, color: 'text-amber-500' },
  stage_change: { icon: RefreshCw, color: 'text-blue-500' },
  dsa_application: { icon: FileText, color: 'text-indigo-500' },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Browsers refuse to actually run an AudioContext until a real user
  // gesture (click/keydown) has happened on the page — on a hard refresh
  // there hasn't been one yet, so a beep attempted right away gets silently
  // dropped (ctx stays 'suspended', resume() is a no-op without a gesture
  // behind it). We still try immediately in case the page already has a
  // gesture in its history, but if it's unread, we also remember that and
  // flush the beep the moment the very next click/keydown fires — which is
  // the earliest point sound is actually allowed to play.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendingBeepRef = useRef(false);

  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtxRef.current || (Ctx ? new Ctx() : null);
      if (!ctx) return;
      audioCtxRef.current = ctx;

      const fire = () => {
        pendingBeepRef.current = false;
        // Two short notes read more clearly as "a notification" than one tone.
        [880, 1175].forEach((freq, i) => {
          const startAt = ctx.currentTime + i * 0.14;
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.3);
        });
      };

      if (ctx.state === 'running') {
        fire();
      } else {
        pendingBeepRef.current = true;
        ctx.resume().then(() => {
          if (ctx.state === 'running') fire();
        }).catch(() => {});
      }
    } catch {
      // Autoplay can still be blocked in some browsers — safe to ignore.
    }
  };

  useEffect(() => {
    const unlock = () => {
      if (pendingBeepRef.current) playBeep();
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: notificationsRaw } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  const notifications = notificationsRaw || [];

  // Beep on every fetch (initial load, page refresh, and each 30s poll) as
  // long as there's at least one unread notification — not just the instant
  // a brand-new one shows up, so an unread alert keeps nudging the user
  // instead of going silent after the first refresh. If the page hasn't
  // seen a gesture yet this just queues it (see playBeep above).
  useEffect(() => {
    if (!notificationsRaw) return;
    const hasUnread = notificationsRaw.some(n => !n.is_read);
    if (hasUnread) playBeep();
  }, [notificationsRaw]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API}/notifications/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ is_read: true }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/notifications/mark-all-read`, { method: 'POST', headers: authHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: authHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 lg:p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell size={16} className="lg:w-5 lg:h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 lg:top-1 lg:right-1 min-w-[16px] h-[16px] lg:min-w-[18px] lg:h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] lg:text-[10px] font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-bold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                <X size={16} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Bell size={32} className="mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const config = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                const metaLink = safeMetaLink(n.metadata?.link);
                const linkTo = metaLink
                  || (n.related_type === 'loan' ? `/loans/${n.related_id}`
                  : n.related_type === 'lead' ? `/leads/${n.related_id}`
                  : null);
                const linkLabel = metaLink ? (n.metadata?.link_label || 'Open') : 'View Lead';
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-accent/5' : ''}`}
                  >
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                        {linkTo && (
                          <Link
                            to={linkTo}
                            onClick={() => { setOpen(false); if (!n.is_read) markAsRead.mutate(n.id); }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <FileText size={10} /> {linkLabel}
                          </Link>
                        )}
                        {!n.is_read && (
                          <button
                            onClick={() => markAsRead.mutate(n.id)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                          >
                            <Check size={10} /> Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification.mutate(n.id)}
                          className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}