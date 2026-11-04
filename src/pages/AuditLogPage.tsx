import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Download, Trash2, Calendar, AlertTriangle, Eye, ChevronLeft, ChevronRight,
  ShieldAlert, Users, PlusCircle, Pencil, XCircle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 25;

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 6 },
  { label: 'Last 30 days', days: 29 },
] as const;

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toISODate(start), endDate: toISODate(now) };
}

function presetRange(daysBack: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

function actionBadgeClass(action: string) {
  const a = (action || '').toUpperCase();
  if (a.includes('DELETE') || a.includes('REMOVE')) return 'bg-red-50 text-red-700 border-red-200';
  if (a.includes('CREATE') || a.includes('ADD') || a.includes('INSERT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('CHECK')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('LOGOUT')) return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-muted text-muted-foreground border-border';
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) {
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">—</Badge>;
  }
  return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{role}</Badge>;
}

function prettyJson(value: any) {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditLogPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userFilter, setUserFilter] = useState('');
  const [userInput, setUserInput] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recordId, setRecordId] = useState(searchParams.get('record_id') || '');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [page, setPage] = useState(1);

  // A record_id arriving via URL (e.g. "View Audit Trail" from a lead page)
  // drives the initial filter but shouldn't keep re-triggering on its own.
  useEffect(() => {
    const fromUrl = searchParams.get('record_id');
    if (fromUrl && fromUrl !== recordId) {
      setRecordId(fromUrl);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [detailLog, setDetailLog] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFromDate, setDeleteFromDate] = useState('');
  const [deleteToDate, setDeleteToDate] = useState(new Date().toISOString().split('T')[0]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Debounce the free-text user filter so every keystroke doesn't trigger a fetch.
  useEffect(() => {
    const t = setTimeout(() => {
      setUserFilter(userInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [userInput]);

  const filters = {
    user: userFilter,
    action: actionFilter === 'all' ? '' : actionFilter,
    startDate,
    endDate,
    recordId,
    critical: criticalOnly ? 'true' : '',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      return api.get(`/audit-logs?${params}`);
    },
  });

  const logs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const { data: actionTypes = [] } = useQuery({
    queryKey: ['audit-log-action-types'],
    queryFn: () => api.get('/audit-logs/action-types'),
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-log-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      return api.get(`/audit-logs/stats?${params}`);
    },
  });

  const applyPreset = (days: number) => {
    const { startDate: s, endDate: e } = presetRange(days);
    setStartDate(s);
    setEndDate(e);
    setPage(1);
  };

  const applyThisMonth = () => {
    const { startDate: s, endDate: e } = thisMonthRange();
    setStartDate(s);
    setEndDate(e);
    setPage(1);
  };

  const clearRecordIdFilter = () => {
    setRecordId('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('record_id');
    setSearchParams(next, { replace: true });
  };

  const deleteCountQuery = useQuery({
    queryKey: ['audit-log-delete-count', deleteFromDate, deleteToDate],
    queryFn: () => api.get(`/audit-logs/delete-range/count?fromDate=${deleteFromDate}&toDate=${deleteToDate}`),
    enabled: showDeleteModal && !!deleteFromDate,
  });

  const deleteLogs = useMutation({
    mutationFn: async ({ fromDate, toDate }: { fromDate: string; toDate: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/audit-logs/delete-range`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ fromDate, toDate }),
        }
      );
      if (!response.ok) throw new Error('Failed to delete logs');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success(`Successfully deleted ${data.deletedCount} audit log(s)`);
      closeDeleteModal();
    },
    onError: () => {
      toast.error('Failed to delete audit logs');
    },
  });

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteFromDate('');
    setDeleteConfirmText('');
  };

  const handleDeleteLogs = () => {
    if (!deleteFromDate) {
      toast.error('Please select a start date');
      return;
    }
    deleteLogs.mutate({ fromDate: deleteFromDate, toDate: deleteToDate });
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/audit-logs/export?${params}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
            <FileText size={24} className="text-primary shrink-0" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 ml-[2rem]">
            {total.toLocaleString()} record{total === 1 ? '' : 's'} matching current filters
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="flex-1 sm:flex-initial">
            <Trash2 size={16} /> Delete Logs
          </Button>
          <Button variant="outline" onClick={exportLogs} className="flex-1 sm:flex-initial">
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 mb-5 lg:max-w-[1100px]">
        <StatTile icon={FileText} label="Total Actions" value={stats?.total} />
        <StatTile icon={PlusCircle} label="Creates" value={stats?.creates} className="text-emerald-600" />
        <StatTile icon={Pencil} label="Updates" value={stats?.updates} className="text-blue-600" />
        <StatTile icon={XCircle} label="Deletes" value={stats?.deletes} className="text-red-600" />
        <StatTile icon={ShieldAlert} label="Critical" value={stats?.critical} className="text-amber-600" />
        <StatTile icon={Users} label="Unique Users" value={stats?.unique_users} />
      </div>

      {recordId && (
        <div className="flex items-center justify-between gap-2 mb-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="text-xs font-semibold text-foreground">
            Showing audit trail for Record ID <span className="font-mono">{recordId}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={clearRecordIdFilter}>
            <X size={14} className="mr-1" /> Clear
          </Button>
        </div>
      )}

      <Card className="mb-5 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">User ID / Name</label>
            <Input
              placeholder="Search by User ID or Name..."
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Action</label>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypes.map((a: string) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Record ID</label>
            <Input
              placeholder="Filter by record ID..."
              value={recordId}
              onChange={e => { setRecordId(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Start Date</label>
            <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">End Date</label>
            <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map(p => (
              <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.days)}>
                {p.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={applyThisMonth}>This Month</Button>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}>
                Clear dates
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer select-none">
            <Switch checked={criticalOnly} onCheckedChange={v => { setCriticalOnly(v); setPage(1); }} />
            <ShieldAlert size={14} className="text-amber-600" />
            Critical actions only
          </label>
        </div>
      </Card>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {logs.map((log: any) => (
          <div
            key={log.id}
            className="bg-card border border-border rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setDetailLog(log)}
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2.5">
              <span className="text-xs text-muted-foreground font-semibold">
                {new Date(log.created_at).toLocaleString()}
              </span>
              <RoleBadge role={log.user_role} />
            </div>

            <div className="mb-2.5">
              <p className="text-sm font-bold text-foreground">
                <Badge variant="outline" className={actionBadgeClass(log.action)}>{log.action}</Badge>
                {log.table_name && <> on <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border/50">{log.table_name}</span></>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/20">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User</p>
                <p className="font-semibold text-foreground truncate mt-0.5">{log.user_name || log.user_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Record ID</p>
                <p className="font-mono font-semibold text-foreground truncate mt-0.5">{log.record_id || '—'}</p>
              </div>
              <div className="col-span-2 pt-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">IP Address</p>
                <p className="font-mono text-muted-foreground mt-0.5">{log.ip_address || '—'}</p>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && logs.length === 0 && (
          <div className="text-center py-10 text-muted-foreground bg-card border border-dashed border-border rounded-xl">
            No audit logs found.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 py-2 whitespace-nowrap">Timestamp</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">User</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">Role</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">Action</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">Table</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">Record ID</TableHead>
              <TableHead className="h-9 py-2 whitespace-nowrap">IP Address</TableHead>
              <TableHead className="h-9 py-2 text-right whitespace-nowrap">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="py-2 font-medium text-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className="py-2 font-semibold text-foreground">{log.user_name || log.user_id}</TableCell>
                <TableCell className="py-2">
                  <RoleBadge role={log.user_role} />
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className={actionBadgeClass(log.action)}>{log.action}</Badge>
                </TableCell>
                <TableCell className="py-2 font-mono text-xs">{log.table_name || '—'}</TableCell>
                <TableCell className="py-2 font-mono text-xs">{log.record_id || '—'}</TableCell>
                <TableCell className="py-2 font-mono text-xs text-muted-foreground">{log.ip_address || '—'}</TableCell>
                <TableCell className="py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetailLog(log)}>
                    <Eye size={14} className="mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft size={14} /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Row Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={open => !open && setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={actionBadgeClass(detailLog?.action)}>{detailLog?.action}</Badge>
              {detailLog?.table_name && <span className="font-mono text-sm text-muted-foreground">{detailLog.table_name}</span>}
            </DialogTitle>
            <DialogDescription>
              {detailLog && new Date(detailLog.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {detailLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 text-sm">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User</p>
                  <p className="font-semibold">{detailLog.user_name || detailLog.user_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role</p>
                  <p className="font-semibold">{detailLog.user_role || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Record ID</p>
                  <p className="font-mono">{detailLog.record_id || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">IP Address</p>
                  <p className="font-mono">{detailLog.ip_address || '—'}</p>
                </div>
                {detailLog.severity && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Severity</p>
                    <p className="font-semibold">{detailLog.severity}</p>
                  </div>
                )}
                {detailLog.endpoint && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Endpoint</p>
                    <p className="font-mono text-xs break-all">{detailLog.method ? `${detailLog.method} ` : ''}{detailLog.endpoint}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">{detailLog.user_agent || '—'}</p>
                </div>
              </div>

              {prettyJson(detailLog.before_value) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Before</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border/50">{prettyJson(detailLog.before_value)}</pre>
                </div>
              )}
              {prettyJson(detailLog.after_value) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">After / Submitted Data</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border/50">{prettyJson(detailLog.after_value)}</pre>
                </div>
              )}
              {prettyJson(detailLog.details) && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Event Details</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto border border-border/50">{prettyJson(detailLog.details)}</pre>
                </div>
              )}
              {!prettyJson(detailLog.before_value) && !prettyJson(detailLog.after_value) && !prettyJson(detailLog.details) && (
                <p className="text-xs text-muted-foreground italic">No additional data captured for this entry.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Logs Confirmation */}
      <AlertDialog open={showDeleteModal} onOpenChange={open => !open && closeDeleteModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              Delete Audit Logs
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes audit log entries in the selected date range. This action cannot be undone
              and should only be used for routine retention cleanup.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar size={14} className="inline mr-1" />
                From Date *
              </label>
              <Input
                type="date"
                value={deleteFromDate}
                onChange={e => { setDeleteFromDate(e.target.value); setDeleteConfirmText(''); }}
                max={deleteToDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar size={14} className="inline mr-1" />
                To Date (Today)
              </label>
              <Input
                type="date"
                value={deleteToDate}
                onChange={e => { setDeleteToDate(e.target.value); setDeleteConfirmText(''); }}
                min={deleteFromDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {deleteFromDate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium">
                  {deleteCountQuery.isLoading
                    ? 'Checking how many logs will be affected...'
                    : `⚠️ ${deleteCountQuery.data?.count ?? 0} audit log(s) from ${deleteFromDate} to ${deleteToDate} will be permanently deleted.`}
                </p>
              </div>
            )}

            {deleteFromDate && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={closeDeleteModal}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLogs}
              disabled={!deleteFromDate || deleteConfirmText !== 'DELETE' || deleteLogs.isPending}
            >
              {deleteLogs.isPending ? 'Deleting...' : 'Delete Logs'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, className }: { icon: any; label: string; value?: number; className?: string }) {
  return (
    <Card className="p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon size={13} className={className} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-xl font-bold tracking-tight ${className || 'text-foreground'}`}>
        {value === undefined ? '—' : value.toLocaleString()}
      </span>
    </Card>
  );
}
