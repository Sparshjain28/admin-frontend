import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Activity, RefreshCw, Trash2, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ApiCall {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  createdAt: string;
  duration: number;
  leadId?: string;
  action?: string;
  errorMessage?: string;
}

const ApiCallsTab = () => {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    averageDuration: 0,
    successRate: 0,
  });
  const [timeRange, setTimeRange] = useState('24h');

  const loadApiCalls = async () => {
    setLoading(true);
    try {
      const res = await api.getApiLogs(100, 1, {});
      if (res.success && res.records) {
        setApiCalls(res.records);
      }
    } catch (error) {
      console.error('Failed to load API calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getApiCallStats(timeRange);
      if (res.success) {
        setStats({
          totalCalls: res.totalCalls || 0,
          successfulCalls: res.successfulCalls || 0,
          failedCalls: res.failedCalls || 0,
          averageDuration: res.avgDuration || 0,
          successRate: res.successRate || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadApiCalls();
    loadStats();
    const interval = setInterval(() => {
      loadApiCalls();
      loadStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const clearLogs = async () => {
    try {
      const res = await api.clearOldApiLogs(30);
      if (res.success) {
        toast({ title: 'Success', description: `Deleted ${res.deletedCount} old logs` });
        loadApiCalls();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear logs',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800';
    if (status >= 500) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4" />;
    if (status >= 400) return <AlertCircle className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-purple-100 text-purple-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Calls</p>
              <p className="text-3xl font-bold">{stats.totalCalls}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Successful</p>
              <p className="text-3xl font-bold text-green-600">{stats.successfulCalls}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{stats.failedCalls}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
              <p className="text-3xl font-bold">{stats.averageDuration}ms</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">{stats.successRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Calls Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <div>
                <CardTitle>API Call Tracking</CardTitle>
                <CardDescription>Real-time API call logs from all operations</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={loadApiCalls}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" variant="destructive" onClick={clearLogs} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Clear Old
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {apiCalls.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No API calls recorded in this period</p>
              <p className="text-xs text-muted-foreground/70 mt-1">API calls will appear here as you perform operations</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Lead ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="text-xs font-mono">{formatTime(call.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate">{call.endpoint}</TableCell>
                      <TableCell>
                        <Badge className={getMethodColor(call.method)}>{call.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(call.status)}
                          <Badge className={getStatusColor(call.status)}>{call.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{call.duration}ms</TableCell>
                      <TableCell className="text-xs">{call.action || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {call.leadId ? <Badge variant="secondary">{call.leadId}</Badge> : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Call Flow Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Update Lead Operation Flow
          </CardTitle>
          <CardDescription>API calls triggered when updating a lead</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-semibold">PUT /api/leads/:id</p>
                <p className="text-xs text-muted-foreground">Update lead status, KYC, activation, and other fields</p>
              </div>
            </div>

            <div className="flex gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-semibold">Payout Auto-creation (Conditional)</p>
                <p className="text-xs text-muted-foreground">
                  POST /api/payouts — Triggered when lead status becomes "Approved + Active" (credit cards) or "Disbursed" (personal loans)
                </p>
              </div>
            </div>

            <div className="flex gap-3 text-sm">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-semibold">Data Persistence & Validation</p>
                <p className="text-xs text-muted-foreground">
                  The system validates all fields, performs HDFC IP duplicate checks, and logs all API activity for audit purposes
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-900">
              <strong>Note:</strong> The exact API call count and sequence depends on:
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                <li>Lead status transition (e.g., Generated → Approved)</li>
                <li>Product type (credit card vs personal loan)</li>
                <li>Activation status changes</li>
                <li>Payout creation eligibility</li>
              </ul>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiCallsTab;
