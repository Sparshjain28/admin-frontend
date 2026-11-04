import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, Users, TrendingUp, Target, Calendar } from 'lucide-react';

interface StatisticsRecord {
  id: number;
  name: string;
  full_name: string;
  user_id: string;
  role: string;
  created_at: number;
  total_days: number;
  total_calls_dialed: number;
  total_calls_connected: number;
  total_calling_time: number;
  total_leads_created: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  overall_connection_rate: number;
  average_call_duration: number;
}

interface MobileStatisticsCardsProps {
  statistics: StatisticsRecord[];
  detailedRecords?: any[];
}

const getPerformanceColor = (rate: number) => {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-yellow-600';
  return 'text-red-600';
};



const MobileStatisticsCards: React.FC<MobileStatisticsCardsProps> = ({ statistics, detailedRecords = [] }) => {
  if (detailedRecords.length > 0) {
    return (
      <div className="space-y-3">
        {detailedRecords.map((record) => (
          <Card key={record.id} className="border-l-4 border-l-orange-500 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-bold text-xs">
                    {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Badge variant="secondary" className={`text-[9px] font-bold uppercase ${record.attendance_status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                  record.attendance_status === 'half_day' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                  {record.attendance_status?.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-1.5 bg-muted/40 rounded-md">
                  <p className="text-[10px] text-muted-foreground">Dialed/Conn</p>
                  <p className="text-xs font-semibold">{record.calls_dialed}/{record.calls_connected}</p>
                </div>
                <div className="text-center p-1.5 bg-muted/40 rounded-md">
                  <p className="text-[10px] text-muted-foreground">Rate</p>
                  <p className={`text-xs font-bold ${getPerformanceColor(record.connection_rate)}`}>{record.connection_rate}%</p>
                </div>
                <div className="text-center p-1.5 bg-muted/40 rounded-md">
                  <p className="text-[10px] text-muted-foreground">Time</p>
                  <p className="text-xs font-semibold">{record.total_calling_time}m</p>
                </div>
              </div>


            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (statistics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No statistics available</h3>
        <p className="text-muted-foreground text-sm">Statistics will appear here once calling records are added</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statistics.map((stat) => (
        <Card key={stat.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-sm">
                  {stat.full_name || stat.name}
                </h3>
                <p className="text-xs text-muted-foreground">{stat.user_id} • {stat.role}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">
                  {new Date(stat.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Total Calls */}
              <div className="flex items-center gap-2.5 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Phone className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Calls</p>
                  <p className="text-sm font-semibold">
                    {stat.total_calls_connected || 0}/{stat.total_calls_dialed || 0}
                  </p>
                </div>
              </div>

              {/* Connection Rate */}
              <div className="flex items-center gap-2.5 p-2.5 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className={`text-sm font-semibold ${getPerformanceColor(stat.overall_connection_rate || 0)}`}>
                    {stat.overall_connection_rate || 0}%
                  </p>
                </div>
              </div>

              {/* Total Time */}
              <div className="flex items-center gap-2.5 p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                  <p className="text-sm font-semibold">{stat.total_calling_time || 0}m</p>
                </div>
              </div>

              {/* Leads Created */}
              <div className="flex items-center gap-2.5 p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Users className="h-6 w-6 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Leads</p>
                  <p className="text-sm font-semibold">{stat.total_leads_created || 0}</p>
                </div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-950/20 rounded-lg mb-3">
              <Calendar className="h-4 w-4 text-gray-600" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Attendance ({stat.total_days || 0} days)</p>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600 font-medium">
                    Present: {stat.present_days || 0}
                  </span>
                  <span className="text-yellow-600 font-medium">
                    Half: {stat.half_days || 0}
                  </span>
                  <span className="text-red-600 font-medium">
                    Absent: {stat.absent_days || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Avg Call: {stat.average_call_duration || 0}m</span>
              <span>
                Attendance Rate: {
                  stat.total_days > 0
                    ? Math.round(((stat.present_days || 0) + (stat.half_days || 0) * 0.5) / stat.total_days * 100)
                    : 0
                }%
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MobileStatisticsCards;