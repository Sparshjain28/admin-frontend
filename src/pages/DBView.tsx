import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Database, ArrowUpDown, Eye, X, Table2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALL_TABLES = [
  'payout_ledger',
  'rc_folio_accounts',
  'rc_ledger_entries',
  'earnings',
  'users',
  'loans',
];

export default function DBView() {
  const { user } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string>('payout_ledger');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewingRow, setViewingRow] = useState<any | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRows, setDeletingRows] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['accountant-db-view', user?.id, selectedTable],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/db-view?table=${selectedTable}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to load DB view');
      return await res.json();
    },
    enabled: !!user,
  });

  const columns: { column_name: string; data_type: string }[] = data?.columns || [];
  const rows: any[] = data?.rows || [];
  const tables: { table: string; count: number }[] = data?.tables || [];

  const filteredRows = useMemo(() => {
    let out = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, search, sortKey, sortDir]);

  const formatCell = (col: string, val: any) => {
    if (val == null || val === '') return <span className="text-muted-foreground/40">-</span>;
    if (typeof val === 'boolean') return <span className="font-semibold">{String(val)}</span>;
    if (typeof val === 'number') {
      if (String(col).toLowerCase().includes('amount') || String(col).toLowerCase().includes('balance') || String(col).toLowerCase().includes('tds') || String(col).toLowerCase().includes('paid')) {
        return <span className="font-semibold whitespace-nowrap">₹{Number(val).toLocaleString('en-IN')}</span>;
      }
      return <span className="whitespace-nowrap">{Number(val).toLocaleString('en-IN')}</span>;
    }
    if (typeof val === 'object') {
      return <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{'{JSON}'}</span>;
    }
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return <span className="whitespace-nowrap">{new Date(s).toLocaleString('en-IN')}</span>;
    }
    return s.length > 80 ? <span className="block max-w-[220px] truncate" title={s}>{s}</span> : s;
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const isDeleteTable = selectedTable === 'payout_ledger' || selectedTable === 'earnings';

  useEffect(() => {
    setSelectedRowIds([]);
    setShowDeleteConfirm(false);
  }, [selectedTable]);

  const allRowsSelected = isDeleteTable && filteredRows.length > 0 && filteredRows.every((r: any) => r.id != null && selectedRowIds.includes(r.id));

  const toggleRowSelection = (id: number) => {
    setSelectedRowIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAllRows = () => {
    if (allRowsSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredRows.map((r: any) => r.id).filter((id: any) => id != null));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRowIds.length === 0) return;
    setDeletingRows(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/db-view/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ table: selectedTable, ids: selectedRowIds })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete' }));
        throw new Error(err.error || 'Failed to delete');
      }
      const result = await res.json();
      toast.success(`Deleted ${result.deleted} row(s)`);
      setSelectedRowIds([]);
      setShowDeleteConfirm(false);
      refetch();
    } catch (e: any) {
      console.error('Delete failed:', e);
      toast.error(e?.message || 'Failed to delete rows.');
    } finally {
      setDeletingRows(false);
    }
  };

  return (
    <div className="w-full p-2 sm:p-4 space-y-4">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="text-primary" />
              DB View
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Raw database tables - all columns & data</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search in current table..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {ALL_TABLES.map(t => {
            const meta = tables.find(m => m.table === t);
            const count = meta?.count ?? 0;
            return (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                  selectedTable === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Table2 size={14} />
                {t}
                <span className={cn('px-1.5 rounded-full text-[9px] font-bold', selectedTable === t ? 'bg-white/25 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300')}>
                  {count.toLocaleString('en-IN')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-300">
          Error loading DB view: {(error as any)?.message}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="text-muted-foreground">Table: <b className="text-foreground">{selectedTable}</b></span>
            <span className="text-muted-foreground">Total rows: <b className="text-foreground">{data?.total?.toLocaleString('en-IN') ?? 0}</b></span>
            <span className="text-muted-foreground">Columns: <b className="text-foreground">{columns.length}</b></span>
            <span className="text-muted-foreground">Showing: <b className="text-foreground">{rows.length.toLocaleString('en-IN')}</b> (latest 500)</span>
            {isDeleteTable && (
              <button
                onClick={() => selectedRowIds.length > 0 && setShowDeleteConfirm(true)}
                disabled={selectedRowIds.length === 0}
                className={cn(
                  'ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                  selectedRowIds.length > 0
                    ? 'bg-red-600 text-white border-transparent hover:bg-red-700 cursor-pointer'
                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                )}
              >
                <Trash2 size={13} />
                Delete{selectedRowIds.length > 0 ? ` (${selectedRowIds.length})` : ''}
              </button>
            )}
          </div>

          {filteredRows.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center text-sm text-muted-foreground">
              No records found.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      {isDeleteTable && (
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            checked={allRowsSelected}
                            onChange={handleSelectAllRows}
                            onClick={(e) => e.stopPropagation()}
                            title="Select all"
                          />
                        </th>
                      )}
                      {columns.map(col => (
                        <th
                          key={col.column_name}
                          onClick={() => handleSort(col.column_name)}
                          className={cn(
                            'px-3 py-2 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider',
                            'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none'
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.column_name}
                            <ArrowUpDown size={11} className={cn('text-muted-foreground shrink-0', sortKey === col.column_name && 'text-primary')} />
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredRows.map((row, i) => (
                      <tr key={row.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {isDeleteTable && (
                          <td className="px-3 py-2 text-center">
                            {row.id != null && (
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(row.id)}
                                onChange={() => toggleRowSelection(row.id)}
                              />
                            )}
                          </td>
                        )}
                        {columns.map(col => (
                          <td key={col.column_name} className="px-3 py-2 text-gray-700 dark:text-gray-200 max-w-[240px]">
                            {formatCell(col.column_name, row[col.column_name])}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setViewingRow(row)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-gray-100 dark:border-gray-700">
                Showing {filteredRows.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')} loaded rows
              </div>
            </div>
          )}
        </>
      )}

      {viewingRow && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setViewingRow(null)}>
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-5 max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Row #{viewingRow.id ?? '-'}</h2>
              <button onClick={() => setViewingRow(null)} className="p-1 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer shrink-0">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto space-y-1.5 pr-2">
              {Object.entries(viewingRow).map(([k, v]) => (
                <div key={k} className="flex gap-2 border-b border-gray-100 dark:border-gray-700 pb-1.5">
                  <span className="w-44 shrink-0 text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">{k}</span>
                  <span className="text-xs text-gray-800 dark:text-gray-100 break-all">
                    {v == null || v === '' ? <span className="text-muted-foreground/50">-</span> : (typeof v === 'object' ? <pre className="text-[10px] bg-gray-50 dark:bg-gray-900/50 rounded p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre> : String(v))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && isDeleteTable && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !deletingRows && setShowDeleteConfirm(false)}>
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">Delete Rows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-bold text-foreground">{selectedRowIds.length}</span> row(s) from <span className="font-bold text-foreground">{selectedTable}</span>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingRows}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deletingRows}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingRows ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
