import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Shield, CreditCard, MessageSquare, Globe, MapPin, Database, Car, Webhook, FileCode, ExternalLink, CheckCircle, XCircle, Phone } from 'lucide-react';

const categoryIcons: Record<string, any> = {
  'n8n Workflow': Globe, 'Surepass KYC': Shield, 'Surepass (Secondary)': Shield,
  'CRIF / KredBharat': CreditCard, 'BotBiz WhatsApp': MessageSquare, 'SMS Gateways': Phone,
  'Google Maps': MapPin, 'Maps & Routing': MapPin, 'Data Lookups': Database,
  'Neokred KYC': Shield, 'Payments': CreditCard, 'Vehicle Data': Car,
  'Webhooks': Webhook, 'ERP / Internal': Database,
};

export default function ApiIntegrations() {
  const [tab, setTab] = useState<'catalog' | 'calls'>('catalog');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['api-integrations'],
    queryFn: async () => api.get('/integrations/list'),
  });

  const catalog = data?.catalog || [];
  const recentCalls = data?.recentCalls || [];
  const recentCallLogs = data?.recentCallLogs || [];

  const categories = useMemo(() => catalog.map((i: any) => i.category), [catalog]);

  const filtered = useMemo(() => catalog.map((g: any) => ({
    ...g,
    apis: g.apis.filter((a: any) => {
      const m = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.endpoint.toLowerCase().includes(search.toLowerCase());
      const c = catFilter === 'all' || g.category === catFilter;
      return m && c;
    })
  })).filter((g: any) => g.apis.length > 0), [catalog, search, catFilter]);

  const methodColor: Record<string, string> = { GET: 'bg-green-100 text-green-700', POST: 'bg-blue-100 text-blue-700', PUT: 'bg-orange-100 text-orange-700', DELETE: 'bg-red-100 text-red-700' };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">API Integrations</h1>
          <p className="text-xs text-muted-foreground">All external APIs & recent call logs</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setTab('catalog')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === 'catalog' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Catalog ({catalog.length})</button>
        <button onClick={() => setTab('calls')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${tab === 'calls' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Recent Calls ({recentCalls.length + recentCallLogs.length})</button>
      </div>

      {tab === 'catalog' && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-accent" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-2 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none">
              <option value="all">All</option>
              {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            {filtered.map((g: any) => {
              const Icon = categoryIcons[g.category] || FileCode;
              const totalCalls = g.apis.reduce((s: number, a: any) => s + (a.calls?.total || 0), 0);
              return (
                <div key={g.category} className="border border-border rounded-lg">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                    <Icon size={14} className="text-accent" />
                    <span className="text-xs font-semibold">{g.category}</span>
                    <span className="text-[10px] text-muted-foreground">({g.apis.length} APIs</span>
                    {totalCalls > 0 && <span className="text-[10px] text-muted-foreground">· {totalCalls} calls)</span>}
                    {totalCalls === 0 && <span className="text-[10px] text-muted-foreground">)</span>}
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">API</th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Method</th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground hidden md:table-cell">Endpoint</th>
                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Calls</th>
                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.apis.map((a: any, i: number) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-2 py-1.5 font-medium">{a.name}</td>
                          <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${methodColor[a.method] || 'bg-gray-100'}`}>{a.method}</span></td>
                          <td className="px-2 py-1.5 text-[10px] text-muted-foreground truncate max-w-[250px] hidden md:table-cell">
                            <a href={a.endpoint.startsWith('http') ? a.endpoint : undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-accent">
                              {a.endpoint.length > 50 ? a.endpoint.slice(0, 50) + '...' : a.endpoint}
                              {a.endpoint.startsWith('http') && <ExternalLink size={10} />}
                            </a>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {(a.calls?.total || 0) > 0 ? (
                              <span className="text-[10px] font-mono">
                                <span className="text-green-600">{a.calls.success || 0}</span>
                                {a.calls.fail > 0 && <span className="text-red-600"> / {a.calls.fail}</span>}
                                <span className="text-muted-foreground"> ({a.calls.total})</span>
                              </span>
                            ) : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100'}`}>
                              <span className={`w-1 h-1 rounded-full ${a.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {a.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No APIs match</div>}
          </div>
        </>
      )}

      {tab === 'calls' && (
        <div className="space-y-4">
          <div className="border border-border rounded-lg">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
              <Database size={14} className="text-accent" />
              <span className="text-xs font-semibold">Recent RC/Surepass Calls</span>
              <span className="text-[10px] text-muted-foreground">({recentCalls.length})</span>
            </div>
            {recentCalls.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">API</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Query</th>
                    <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Result</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground hidden sm:table-cell">User</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.map((c: any, i: number) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1.5 font-medium">{c.api_name}</td>
                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground truncate max-w-[150px]">{c.query_key || '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {c.success ? <CheckCircle size={12} className="inline text-green-500" /> : <XCircle size={12} className="inline text-red-500" />}
                        {c.from_cache && <span className="ml-1 text-[10px] text-yellow-600">(cached)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground hidden sm:table-cell">{c.user_name || '—'}</td>
                      <td className="px-2 py-1.5 text-right text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="py-6 text-center text-xs text-muted-foreground">No RC/Surepass calls logged yet</div>}
          </div>

          <div className="border border-border rounded-lg">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
              <CreditCard size={14} className="text-accent" />
              <span className="text-xs font-semibold">Recent CRIF/CIBIL Calls</span>
              <span className="text-[10px] text-muted-foreground">({recentCallLogs.length})</span>
            </div>
            {recentCallLogs.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">API</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Mobile</th>
                    <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground hidden sm:table-cell">User</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCallLogs.map((c: any, i: number) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-2 py-1.5 font-medium">{c.api_name}</td>
                      <td className="px-2 py-1.5 text-[10px] font-mono">{c.mobile || '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {c.status_code >= 200 && c.status_code < 300
                          ? <CheckCircle size={12} className="inline text-green-500" />
                          : <XCircle size={12} className="inline text-red-500" />}
                        <span className="ml-1 text-[10px]">{c.status_code}</span>
                      </td>
                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground hidden sm:table-cell">{c.user_name || '—'}</td>
                      <td className="px-2 py-1.5 text-right text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="py-6 text-center text-xs text-muted-foreground">No CRIF/CIBIL calls logged yet</div>}
          </div>
        </div>
      )}
    </div>
  );
}
