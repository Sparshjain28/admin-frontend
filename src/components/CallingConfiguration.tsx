import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const CallingConfiguration = () => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await api.get('/calling/config');
      setConfig(data);
    } catch (error) {
toast({
        title: "Error",
        description: "Failed to fetch calling configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/calling/config', config);
      toast({
        title: "Success",
        description: "Calling configuration updated successfully"
      });
    } catch (error) {
toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      absent_max_time: '119',
      half_day_max_time: '179',
      full_day_min_time: '180',
      min_leads_for_multiple: '2',
      min_time_with_leads: '60',
      min_time_with_one_lead: '120',
      present_salary: '400',
      half_day_salary: '200'
    });
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access calling configuration.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
            Calling Configuration
          </h1>
          <p className="text-muted-foreground text-sm">Configure attendance calculation rules and calling system settings</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 gap-6">
        {/* Lead-based Attendance Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead-based Attendance Rules (Higher Priority)</CardTitle>
            <p className="text-sm text-muted-foreground">
              When executives create leads, these rules take priority over time-based rules
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 2+ Leads Rules */}
            <div className="border-l-4 border-green-500 pl-4 space-y-4">
              <h3 className="font-semibold text-green-700">With 2 or More Leads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_leads_for_multiple">Minimum Leads Required</Label>
                  <Input
                    id="min_leads_for_multiple"
                    type="number"
                    min="2"
                    value={config.min_leads_for_multiple || '2'}
                    onChange={(e) => updateConfig('min_leads_for_multiple', e.target.value)}
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of leads needed for this rule
                  </p>
                </div>
                <div>
                  <Label htmlFor="min_time_with_leads">Minimum Time for Present (minutes)</Label>
                  <Input
                    id="min_time_with_leads"
                    type="number"
                    min="0"
                    value={config.min_time_with_leads || ''}
                    onChange={(e) => updateConfig('min_time_with_leads', e.target.value)}
                    placeholder="60"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum calling time required
                  </p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800">
                  Rule: If executive creates <span className="font-bold">{config.min_leads_for_multiple || 2}+</span> leads and works <span className="font-bold">{config.min_time_with_leads || 60}+</span> minutes → <span className="font-semibold text-green-700">Present</span>
                </p>
              </div>
            </div>

            {/* 1 Lead Rules */}
            <div className="border-l-4 border-blue-500 pl-4 space-y-4">
              <h3 className="font-semibold text-blue-700">With Exactly 1 Lead</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exact_one_lead">Exact Leads Required</Label>
                  <Input
                    id="exact_one_lead"
                    type="number"
                    value="1"
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Fixed at 1 lead for this rule
                  </p>
                </div>
                <div>
                  <Label htmlFor="min_time_with_one_lead">Minimum Time for Present (minutes)</Label>
                  <Input
                    id="min_time_with_one_lead"
                    type="number"
                    min="0"
                    value={config.min_time_with_one_lead || ''}
                    onChange={(e) => updateConfig('min_time_with_one_lead', e.target.value)}
                    placeholder="120"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum calling time required
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800">
                    Rule: If executive creates <span className="font-bold">1</span> lead and works <span className="font-bold">{config.min_time_with_one_lead || 120}+</span> minutes → <span className="font-semibold text-green-700">Present</span>
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Automatic Rule: If executive creates <span className="font-bold">1</span> lead but works less than <span className="font-bold">{config.min_time_with_one_lead || 120}</span> minutes (any time from 1 to {(parseInt(config.min_time_with_one_lead || 120) - 1)} minutes) → <span className="font-semibold text-yellow-700">Half Day</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time-based Attendance Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Time-based Attendance Rules (Lower Priority)</CardTitle>
            <p className="text-sm text-muted-foreground">
              These rules apply when executives have 0 leads. Configure attendance status based on total calling time.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-red-500 pl-4">
              <Label htmlFor="absent_max_time">Absent: Maximum Time (minutes)</Label>
              <Input
                id="absent_max_time"
                type="number"
                min="0"
                value={config.absent_max_time || ''}
                onChange={(e) => updateConfig('absent_max_time', e.target.value)}
                placeholder="119"
              />
              <p className="text-xs text-muted-foreground mt-1">
                0 to {config.absent_max_time || 119} minutes with 0 leads → <span className="font-semibold text-red-600">Absent</span>
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <Label htmlFor="half_day_max_time">Half Day: Maximum Time (minutes)</Label>
              <Input
                id="half_day_max_time"
                type="number"
                min="0"
                value={config.half_day_max_time || ''}
                onChange={(e) => updateConfig('half_day_max_time', e.target.value)}
                placeholder="179"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(parseInt(config.absent_max_time || 119) + 1)} to {config.half_day_max_time || 179} minutes with 0 leads → <span className="font-semibold text-yellow-600">Half Day</span>
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <Label htmlFor="full_day_min_time">Present: Minimum Time (minutes)</Label>
              <Input
                id="full_day_min_time"
                type="number"
                min="0"
                value={config.full_day_min_time || ''}
                onChange={(e) => updateConfig('full_day_min_time', e.target.value)}
                placeholder="180"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {config.full_day_min_time || 180}+ minutes with 0 leads → <span className="font-semibold text-green-600">Present</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Salary Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Salary Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure daily salary based on attendance status
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="present_salary">Present Day Salary (₹)</Label>
                <Input
                  id="present_salary"
                  type="number"
                  min="0"
                  value={config.present_salary || ''}
                  onChange={(e) => updateConfig('present_salary', e.target.value)}
                  placeholder="400"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Daily salary for Present status
                </p>
              </div>
              <div>
                <Label htmlFor="half_day_salary">Half Day Salary (₹)</Label>
                <Input
                  id="half_day_salary"
                  type="number"
                  min="0"
                  value={config.half_day_salary || ''}
                  onChange={(e) => updateConfig('half_day_salary', e.target.value)}
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Daily salary for Half Day status
                </p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Note:</span> Absent status always results in ₹0 salary
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Complete Attendance Calculation Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-3 text-base">Priority Order (Top to Bottom):</h4>
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <h5 className="font-semibold text-green-800 mb-2">1. Lead-based Rules (Highest Priority)</h5>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">✅</span>
                      <span><strong>{config.min_leads_for_multiple || 2}+ Leads + {config.min_time_with_leads || 60}+ minutes</strong> → <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded font-semibold">Present</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">✅</span>
                      <span><strong>1 Lead + {config.min_time_with_one_lead || 120}+ minutes</strong> → <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded font-semibold">Present</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold mt-0.5">⚠️</span>
                      <span><strong>1 Lead + 1 to {(parseInt(config.min_time_with_one_lead || 120) - 1)} minutes</strong> → <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded font-semibold">Half Day</span></span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <h5 className="font-semibold text-blue-800 mb-2">2. Time-based Rules (Lower Priority - Only when 0 Leads)</h5>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">✅</span>
                      <span><strong>0 Leads + {config.full_day_min_time || 180}+ minutes</strong> → <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded font-semibold">Present</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold mt-0.5">⚠️</span>
                      <span><strong>0 Leads + {(parseInt(config.absent_max_time || 119) + 1)} to {config.half_day_max_time || 179} minutes</strong> → <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded font-semibold">Half Day</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-0.5">❌</span>
                      <span><strong>0 Leads + 0 to {config.absent_max_time || 119} minutes</strong> → <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded font-semibold">Absent</span></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="text-xl">💡</span>
                Key Insight
              </h4>
              <p className="text-sm text-blue-800">
                <strong>Lead-based rules ALWAYS take priority.</strong> If an executive creates even 1 lead, they cannot be marked as Absent regardless of time worked. The system will automatically give them at least Half Day status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallingConfiguration;
