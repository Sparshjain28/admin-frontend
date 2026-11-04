import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [filter, setFilter] = useState('mtd');
  const [drillDown, setDrillDown] = useState<'bank' | 'manager' | 'executive'>('bank');

  const { data: reportData } = useQuery({
    queryKey: ['reports', filter, drillDown],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports?filter=${filter}&drillDown=${drillDown}`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }
      );
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const funnelData = [
    { name: 'Login', value: reportData?.login || 0 },
    { name: 'Approval', value: reportData?.approval || 0 },
    { name: 'Disbursal', value: reportData?.disbursal || 0 },
  ];

  const approvalRate = reportData?.login ? ((reportData.approval / reportData.login) * 100).toFixed(1) : 0;
  const disbursalRate = reportData?.approval ? ((reportData.disbursal / reportData.approval) * 100).toFixed(1) : 0;

  const exportToExcel = () => {
    const csv = 'data:text/csv;charset=utf-8,' + 
      'Metric,Value\n' +
      `Login,${reportData?.login || 0}\n` +
      `Approval,${reportData?.approval || 0}\n` +
      `Disbursal,${reportData?.disbursal || 0}\n` +
      `Approval Rate,${approvalRate}%\n` +
      `Disbursal Rate,${disbursalRate}%`;
    
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `report_${filter}_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90">
          <Download size={18} /> Export
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        {['mtd', 'last_month', 'this_fy', 'last_fy'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${filter === f ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}
          >
            {f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="stat-card">
          <h3 className="text-sm text-muted-foreground mb-2">Approval Rate</h3>
          <div className="text-3xl font-bold text-green-600">{approvalRate}%</div>
        </div>
        <div className="stat-card">
          <h3 className="text-sm text-muted-foreground mb-2">Disbursal Rate</h3>
          <div className="text-3xl font-bold text-blue-600">{disbursalRate}%</div>
        </div>
        <div className="stat-card">
          <h3 className="text-sm text-muted-foreground mb-2">Total Login</h3>
          <div className="text-3xl font-bold">{reportData?.login || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <div className="flex gap-2 mb-4">
            {['bank', 'manager', 'executive'].map(d => (
              <button
                key={d}
                onClick={() => setDrillDown(d as any)}
                className={`px-3 py-1 rounded text-sm ${drillDown === d ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.drillDownData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
