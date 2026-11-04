import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Phone, Clock, Users, TrendingUp, Calendar, Target, BarChart3, Plus, CheckCircle, UserMinus, AlertCircle, Download, Upload, FileSpreadsheet, Trash2, UserX, FileText, Check, ChevronsUpDown, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import MobileStatisticsCards from '@/components/MobileStatisticsCards';
import { useRef } from 'react';
import { format, startOfMonth, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CallingStatistics = ({ teamMembers: propTeamMembers, onTeamMembersUpdate, canEdit = false, canEnter = false, canApprove = false, isExecutive = false }) => {
  const [showEntrySheet, setShowEntrySheet] = useState(false);
  const entrySheetRef = useRef<HTMLDivElement>(null);
  const [statistics, setStatistics] = useState([]);
  const [dailySummary, setDailySummary] = useState<Record<string, any>>({});
  const [teamMembers, setTeamMembers] = useState(propTeamMembers || []);
  const [todayRecords, setTodayRecords] = useState([]);
  const [detailedRecords, setDetailedRecords] = useState([]);
  const [loadingDetailed, setLoadingDetailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);
  const [userToTerminate, setUserToTerminate] = useState(null);
  const [terminating, setTerminating] = useState(false);
  const [selectedCallerIds, setSelectedCallerIds] = useState<number[]>([]);
  const [quickEntryData, setQuickEntryData] = useState<Record<number, any>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [filterManager, setFilterManager] = useState('all');
  const [chartFilterManager, setChartFilterManager] = useState('all');
  const [managers, setManagers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [chartManagerSearch, setChartManagerSearch] = useState('');
  const [chartManagerPopoverOpen, setChartManagerPopoverOpen] = useState(false);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ calls_dialed: '', calls_connected: '', total_calling_time: '', leads_created: '', attendance_status: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [otpRecord, setOtpRecord] = useState<any>(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const fetchConfigs = async () => {
    try {
      const data = await api.get('/calling/config');
      setConfigs(data || {});
    } catch (error) {
}
  };

  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [filterUser, setFilterUser] = useState('all');

  // Keep string dates in sync with range picker for API calls
  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : (date?.from ? format(date.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState({
    calls_dialed: '',
    calls_connected: '',
    total_calling_time: '',
    leads_created: 0
  });

  useEffect(() => {
    if (propTeamMembers && propTeamMembers.length > 0) {
      setTeamMembers(propTeamMembers);
    } else {
      fetchTeamMembers();
    }
    fetchConfigs();
    if (user?.role === 'admin' || user?.role === 'branch_manager' || user?.role === 'operation_team' || user?.role === 'sales_manager' || user?.role === 'manager') {
      fetchTeamLeaders();
    }
    const execUserId = isExecutive && user?.id ? user.id.toString() : undefined;
    if (execUserId) setFilterUser(execUserId);
    fetchStatistics(execUserId);
    fetchTodayRecords();
    fetchDailySummary();
  }, []);

  useEffect(() => {
    if (user?.role === 'executive') {
      setFilterUser(user.id.toString());
    }
  }, [user]);

  useEffect(() => {
    if (showEntrySheet && entrySheetRef.current) {
      setTimeout(() => {
        entrySheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showEntrySheet]);

  const fetchTeamLeaders = async () => {
    try {
      const data = await api.get('/calling/team-leaders');
      setManagers(data || []);
    } catch (error) {
}
  };

  const handleApplyFilters = () => {
    fetchStatistics(filterUser !== 'all' ? filterUser : undefined);
    if (!isExecutive) {
      fetchTeamMembers();
      fetchTodayRecords();
      fetchDailySummary();
    }
  };

  // ─── FOCUS TRAP FOR TODAY'S ENTRY SHEET ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showEntrySheet || !entrySheetRef.current) return;
      if (e.key !== 'Tab') return;

      const focusableElements = entrySheetRef.current.querySelectorAll(
        'input[tabindex="0"], button:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEntrySheet]);

  const syncQuickEntryData = (members, records) => {
    setQuickEntryData(prev => {
      const newData = { ...prev };
      const today = new Date().toLocaleDateString('en-CA');
      
      members.forEach(member => {
        const record = records.find(r => (r.database_user_id || r.user_id) === member.id);

        // If we have a submitted record from server
        if (record) {
          // Check if record is for today - if yes, allow editing
          // Normalize the date format to compare properly
          const recordDate = new Date(record.date).toLocaleDateString('en-CA');
          const canEdit = recordDate === today;
          
          console.log('Record sync:', { 
            memberId: member.id, 
            recordDate, 
            today, 
            canEdit,
            rawDate: record.date 
          });
          
          newData[member.id] = {
            dialed: record.calls_dialed,
            connected: record.calls_connected,
            time: record.total_calling_time,
            leads: record.leads_created,
            status: record.attendance_status || 'present',
            is_approved: record.is_approved || false,
            isSubmitted: true,
            canEdit: canEdit  // only admin/sales_manager/manager can edit saved records
          };
        } else if (!newData[member.id]) {
          // Only initialize if no existing local data for this member
          newData[member.id] = { dialed: '', connected: '', time: '', leads: '', status: 'draft', isSubmitted: false, canEdit: true };
        }
      });
      return newData;
    });
  };

  useEffect(() => {
    if (teamMembers.length > 0) {
      syncQuickEntryData(teamMembers, todayRecords);
    }
  }, [teamMembers, todayRecords]);

  const getConfig = (key: string, defaultValue: any) => {
    return configs[key] || defaultValue;
  };

  const calculateAttendanceStatus = (time: number, leads: number) => {
    // Ensure we are working with numbers
    const timeNum = Number(time) || 0;
    const leadsNum = Number(leads) || 0;

    // Fetch config values. 
    // IMPORTANT: Forced new requested defaults (60/120) because database has old values (120/150)
    const absentMax = Number(getConfig('absent_max_time', 119));
    const fullDayMin = Number(getConfig('full_day_min_time', 180));

    // User requested specifically 60 and 120. We will use these as hard requirements now.
    const timeWithOneLead = 120;     // 1 lead needs 120 mins
    const timeWithMultipleLeads = 60; // 2+ leads need 60 mins
console.log("Current Numbers:", { timeNum, leadsNum });
console.log("Full Config State:", configs);

    // Rule 1: High Performance (Present status based on leads)
    if (leadsNum >= 2 && timeNum >= timeWithMultipleLeads) {
return 'present';
    }
    if (leadsNum >= 1 && timeNum >= timeWithOneLead) {
return 'present';
    }

    // Rule 2: Half day for 1 lead with any time above 0 (but less than required for present)
    if (leadsNum >= 1 && timeNum > 0 && timeNum < timeWithOneLead) {
return 'half_day';
    }

    // Rule 3: Absolute Time Limit (e.g., 180+ always Present)
    if (timeNum >= fullDayMin) return 'present';

    // Rule 4: Absent status (0 to absentMax with no leads)
    if (timeNum <= absentMax) return 'absent';

    // Rule 5: Half Day status (everything else in between)
    return 'half_day';
  };

  const handleQuickEntryChange = (userId: number, field: string, value: string | number) => {
    let valStr = value.toString();
    const numVal = parseInt(valStr) || 0;

    // Prevent negative values
    if (numVal < 0) {
      toast({ title: "Validation Error", description: "Negative values are not allowed", variant: "destructive" });
      return;
    }

    // Validation Rules
    if (field === 'dialed' && numVal > 500) {
      toast({ title: "Validation Error", description: "Dialed calls cannot exceed 500", variant: "destructive" });
      return;
    }
    if (field === 'connected' && numVal > 300) {
      toast({ title: "Validation Error", description: "Connected calls cannot exceed 300", variant: "destructive" });
      return;
    }
    if (field === 'time' && numVal > 480) {
      toast({ title: "Validation Error", description: "Total time cannot exceed 480 minutes", variant: "destructive" });
      return;
    }
    if (field === 'leads' && numVal > 10) {
      toast({ title: "Validation Error", description: "Leads cannot exceed 10", variant: "destructive" });
      return;
    }

    setQuickEntryData(prev => {
      const currentEntry = prev[userId] || { dialed: '', connected: '', time: '', leads: '', status: 'draft', isSubmitted: false };

      // Cross-field validation: Connected <= Dialed
      if (field === 'connected') {
        const dialedNum = parseInt(currentEntry.dialed) || 0;
        if (numVal > dialedNum) {
          toast({ title: "Validation Error", description: "Connected calls cannot exceed Dialed calls", variant: "destructive" });
          return prev;
        }
      }

      if (field === 'dialed') {
        const connectedNum = parseInt(currentEntry.connected) || 0;
        if (connectedNum > numVal) {
          // Soft warning or auto-adjustment? Let's just update and let the user fix if needed, 
          // but usually we should prevent inconsistency.
          // For now, I'll allow the change to dialed but user will be blocked from saving if connected > dialed.
        }
      }

      const updatedData = { ...currentEntry, [field]: value };

      // Auto-calculate Status based on configs
      if (!updatedData.isSubmitted && (field === 'time' || field === 'leads')) {
        const timeNum = parseInt(updatedData.time) || 0;
        const leadsNum = parseInt(updatedData.leads) || 0;
        updatedData.status = calculateAttendanceStatus(timeNum, leadsNum);
      }

      return { ...prev, [userId]: updatedData };
    });
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const recordsToSave = teamMembers
        .map(member => {
          const data = quickEntryData[member.id];
          // For new records: anyone with canEnter can save
          // For existing records: only canEdit roles can update
          if (!data) return null;
          if (data.isSubmitted && !data.canEdit) return null;
          if (!data.isSubmitted && !canEnter) return null;
          if (!data.dialed) return null;

          const dialed = parseInt(data.dialed) || 0;
          const connected = parseInt(data.connected) || 0;
          const time = parseInt(data.time) || 0;
          const leads = parseInt(data.leads) || 0;

          // Final safety check
          if (dialed > 500 || connected > 300 || time > 480 || leads > 10 || connected > dialed) {
            return null;
          }

          return {
            user_id: member.id,
            date: today,
            calls_dialed: dialed,
            calls_connected: connected,
            total_calling_time: time,
            leads_created: leads,
            attendance_status: data.status || 'present'
          };
        })
        .filter(Boolean);

      if (recordsToSave.length === 0) {
        toast({ title: "No changes", description: "All records are either empty or already saved." });
        return;
      }

      const result = await api.post('/calling/records/bulk', { records: recordsToSave });
      toast({ title: "Success", description: `Saved ${result.count || recordsToSave.length} records.` });
      fetchTodayRecords();
      fetchDailySummary();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save records", variant: "destructive" });
    } finally {
      setSavingAll(false);
    }
  };

  const handleBulkAction = async (action: 'absent' | 'terminate') => {
    if (selectedCallerIds.length === 0) return;

    setLoading(true);
    try {
      if (action === 'absent') {
        const today = new Date().toLocaleDateString('en-CA');
        const records = selectedCallerIds.map(id => ({
          user_id: id,
          date: today,
          calls_dialed: 0,
          calls_connected: 0,
          total_calling_time: 0,
          leads_created: 0,
          attendance_status: 'absent'
        }));
        await api.post('/calling/records/bulk', { records });
        
        // Remove absent users from the visible team members list for today
        setTeamMembers(prev => prev.filter(member => !selectedCallerIds.includes(member.id)));
        
        // Also remove from quick entry data
        setQuickEntryData(prev => {
          const newData = { ...prev };
          selectedCallerIds.forEach(id => {
            delete newData[id];
          });
          return newData;
        });
        
        toast({ title: "Bulk Absent", description: `Marked ${selectedCallerIds.length} users as absent and removed from today's list.` });
      } else {
        // Bulk terminate
        await Promise.all(selectedCallerIds.map(id => api.put(`/users/${id}`, { status: 'terminated' })));
        toast({ title: "Bulk Terminate", description: `Terminated ${selectedCallerIds.length} users.` });
        fetchTeamMembers();
      }
      setSelectedCallerIds([]);
      fetchTodayRecords();
      fetchDailySummary();
    } catch (error: any) {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (managerId?: string) => {
    try {
      const mgrId = managerId !== undefined ? managerId : filterManager;
      const url = mgrId !== 'all'
        ? `/calling/team-members?managerId=${mgrId}`
        : '/calling/team-members';
      const data = await api.get(url);
      setTeamMembers(data);
      if (onTeamMembersUpdate) {
        onTeamMembersUpdate();
      }
    } catch (error) {
}
  };

  const fetchTodayRecords = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const records = await api.get(`/calling/records?date=${today}`);
      setTodayRecords(records || []);
    } catch (error) {
}
  };

  const fetchLeadsForUser = async (userId, date) => {
    try {
      setFetchingLeads(true);
      const response = await api.get(`/leads?created_by=${userId}&date=${date}`);
      return response?.length || 0;
    } catch (error) {
return 0;
    } finally {
      setFetchingLeads(false);
    }
  };

  const fetchStatistics = async (overrideUserId?: string) => {
    setLoading(true);
    try {
      const activeUser = overrideUserId !== undefined ? overrideUserId : filterUser;
      let url = `/calling/statistics?startDate=${startDate}&endDate=${endDate}`;
      if (activeUser && activeUser !== 'all') {
        url += `&userId=${activeUser}`;
      }
      if (filterManager && filterManager !== 'all') {
        url += `&managerId=${filterManager}`;
      }
      const data = await api.get(url);
      setStatistics(data);

      if (activeUser && activeUser !== 'all') {
        setLoadingDetailed(true);
        try {
          const detailUrl = `/calling/records?userId=${activeUser}&startDate=${startDate}&endDate=${endDate}`;
          const detailedData = await api.get(detailUrl);
          setDetailedRecords(detailedData || []);
        } catch (e) {
} finally {
          setLoadingDetailed(false);
        }
      } else {
        setDetailedRecords([]);
      }
    } catch (error) {
toast({ title: 'Error', description: 'Failed to fetch statistics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const data = await api.get(`/calling/daily-summary?date=${endDate}`);
      setDailySummary(data);
    } catch (error) {
}
  };

  const handleApprove = async (recordId: number, currentApproved: boolean) => {
    setApprovingId(recordId);
    try {
      await api.patch(`/calling/records/${recordId}/approve`, { approved: !currentApproved });
      toast({ title: !currentApproved ? 'Record Approved' : 'Approval Removed', description: !currentApproved ? 'Record has been approved.' : 'Approval has been removed.' });
      fetchTodayRecords();
      fetchStatistics();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update approval', variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleEditSave = async () => {
    if (!editRecord) return;
    setSavingEdit(true);
    try {
      await api.post('/calling/records', {
        record_id: editRecord.id,
        user_id: editRecord.user_id || editRecord.database_user_id,
        date: editRecord.date,
        calls_dialed: parseInt(editForm.calls_dialed) || 0,
        calls_connected: parseInt(editForm.calls_connected) || 0,
        total_calling_time: parseInt(editForm.total_calling_time) || 0,
        leads_created: parseInt(editForm.leads_created) || 0,
      });
      toast({ title: 'Updated', description: 'Record updated successfully.' });
      setEditRecord(null);
      fetchStatistics(filterUser !== 'all' ? filterUser : undefined);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update record', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRequestOTP = async (record: any) => {
    setOtpRecord(record);
    setOtpValue('');
    setOtpSent(false);
    setOtpLoading(true);
    try {
      await api.post('/calling/records/approval-otp/generate', { record_id: record.id });
      setOtpSent(true);
      setOtpTimer(120);
      toast({ title: 'OTP Sent', description: 'Enter the OTP sent to your registered mobile number.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send OTP', variant: 'destructive' });
      setOtpRecord(null);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpRecord || !otpValue) return;
    setOtpLoading(true);
    try {
      await api.post('/calling/records/approval-otp/verify', { record_id: otpRecord.id, otp: otpValue });
      toast({ title: 'Attendance Approved', description: 'Your attendance has been confirmed successfully.' });
      setOtpRecord(null);
      setOtpValue('');
      setOtpSent(false);
      fetchStatistics(user?.id?.toString());
    } catch (error: any) {
      toast({ title: 'Invalid OTP', description: error.message || 'OTP verification failed', variant: 'destructive' });
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP countdown timer
  React.useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  const handleAddRecord = async (member) => {
    setSelectedUser(member.id.toString());

    // Fetch leads created by this user today
    const today = new Date().toLocaleDateString('en-CA');
    const leadsCount = await fetchLeadsForUser(member.id, today);

    setFormData({
      calls_dialed: '',
      calls_connected: '',
      total_calling_time: '',
      leads_created: leadsCount
    });
    setShowAddDialog(true);
  };

  const handleSubmitRecord = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA');

      const recordData = {
        user_id: selectedUser,
        date: today,
        calls_dialed: parseInt(formData.calls_dialed) || 0,
        calls_connected: parseInt(formData.calls_connected) || 0,
        total_calling_time: parseInt(formData.total_calling_time) || 0,
        leads_created: formData.leads_created
      };

      await api.post('/calling/records', recordData);

      toast({
        title: "Success",
        description: "Calling record added successfully"
      });

      setShowAddDialog(false);
      setSelectedUser('');
      setFormData({
        calls_dialed: '',
        calls_connected: '',
        total_calling_time: '',
        leads_created: 0
      });

      // Refresh data
      fetchTodayRecords();
      fetchDailySummary();
      if (onTeamMembersUpdate) onTeamMembersUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save record',
        variant: 'destructive',
      });
    }
  };

  const handleTerminate = async () => {
    if (!userToTerminate) return;

    setTerminating(true);
    try {
      await api.put(`/users/${userToTerminate.id}`, { status: 'terminated' });

      toast({
        title: 'Success',
        description: `${userToTerminate.full_name} has been terminated and removed from the active list.`,
      });

      // Refresh team members and today's list
      fetchTeamMembers();
      fetchTodayRecords();
      if (onTeamMembersUpdate) onTeamMembersUpdate();

      setShowTerminateDialog(false);
      setUserToTerminate(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to terminate user',
        variant: 'destructive',
      });
    } finally {
      setTerminating(false);
    }
  };
  const handleDownloadPDF = () => {
    try {
      const dataToExport = filterUser === 'all' ? statistics : detailedRecords;
      if (dataToExport.length === 0) {
        toast({ title: "No data", description: "There is no data to download for the selected filters." });
        return;
      }

      const doc = new jsPDF();
      const title = user?.role === 'executive'
        ? `${user.full_name || user.name} - ${format(date?.from || startOfMonth(new Date()), "MMMM yyyy")} Calling Report`
        : `Calling Report: ${filterUser === 'all' ? 'Team Summary' : (statistics[0]?.full_name || 'Member')}`;

      // Add Title
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229); // Accent color
      doc.text(title, 14, 20);

      // Add Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 28);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 33);

      const tableColumn = filterUser === 'all'
        ? ["User ID", "Name", "Days", "Dialed", "Connected", "Rate", "Time", "Leads", "P/H/A"]
        : ["Date", "Dialed", "Connected", "Rate", "Time", "Leads", "Attendance"];

      const tableRows = dataToExport.map(item => {
        if (filterUser === 'all') {
          return [
            item.user_id,
            item.full_name || item.name,
            item.total_days,
            item.total_calls_dialed,
            item.total_calls_connected,
            `${item.overall_connection_rate}%`,
            `${item.total_calling_time}m`,
            item.total_leads_created,
            `${item.present_days}/${item.half_days}/${item.absent_days}`
          ];
        } else {
          return [
            new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            item.calls_dialed,
            item.calls_connected,
            `${item.connection_rate}%`,
            `${item.total_calling_time}m`,
            item.leads_created,
            item.attendance_status?.replace('_', ' ').toUpperCase()
          ];
        }
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      const fileName = `Calling_Report_${filterUser === 'all' ? 'Summary' : filterUser}_${startDate}.pdf`;
      doc.save(fileName);

      toast({ title: "Success", description: "PDF report downloaded successfully." });
    } catch (error) {
toast({ title: "Export Failed", description: "Could not generate PDF file.", variant: "destructive" });
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filterUser === 'all' ? statistics : detailedRecords;
      if (dataToExport.length === 0) {
        toast({ title: "No data", description: "There is no data to export for the selected filters." });
        return;
      }

      const fileName = `Calling_Report_${filterUser === 'all' ? 'Summary' : filterUser}_${startDate}_to_${endDate}.xlsx`;

      const worksheetData = dataToExport.map(item => {
        if (filterUser === 'all') {
          return {
            'User ID': item.user_id,
            'Full Name': item.full_name || item.name,
            'Total Days': item.total_days,
            'Dialed': item.total_calls_dialed,
            'Connected': item.total_calls_connected,
            'Rate (%)': item.overall_connection_rate,
            'Total Time (Min)': item.total_calling_time,
            'Avg Duration': item.average_call_duration,
            'Leads': item.total_leads_created,
            'Present': item.present_days,
            'Half Days': item.half_days,
            'Absent': item.absent_days
          };
        } else {
          return {
            'Date': item.date,
            'User ID': item.user_string_id,
            'Full Name': item.user_full_name,
            'Dialed': item.calls_dialed,
            'Connected': item.calls_connected,
            'Rate (%)': item.connection_rate,
            'Time (Min)': item.total_calling_time,
            'Leads': item.leads_created,
            'Attendance': item.attendance_status
          };
        }
      });

      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Calling Records");
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not generate Excel file.", variant: "destructive" });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus({ message: 'Reading file...' });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          throw new Error('Excel file is empty');
        }

        setImportStatus({ message: `Processing ${json.length} records...` });

        // Map English headers to backend fields
        const records = json.map(row => {
          const userId = row['User ID'] || row['userId'] || row['user_id'];
          const dateStr = row['Date'] || row['date'];
          const member = teamMembers.find(m => m.user_id === userId);

          return {
            user_id: member ? member.id : userId,
            date: dateStr,
            calls_dialed: parseInt(row['Dialed'] || row['calls_dialed']) || 0,
            calls_connected: parseInt(row['Connected'] || row['calls_connected']) || 0,
            total_calling_time: parseInt(row['Time'] || row['Time (Min)'] || row['total_calling_time']) || 0,
            leads_created: parseInt(row['Leads'] || row['leads_created']) || 0
          };
        });

        const response = await api.post('/calling/records/bulk', { records });

        toast({
          title: "Import Complete",
          description: response.data.message
        });

        if (response.data.errors) {
          setImportStatus({
            success: true,
            message: `Imported ${response.data.count} records.`,
            errors: response.data.errors
          });
        } else {
          setImportStatus(null);
          setShowImportDialog(false);
        }

        fetchStatistics();
        fetchTodayRecords();
      } catch (error: any) {
        setImportStatus({ error: true, message: error.response?.data?.error || error.message });
        toast({ title: "Import Failed", description: error.response?.data?.error || error.message, variant: "destructive" });
      } finally {
        setImporting(false);
        event.target.value = ''; // Reset file input
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { 'User ID': 'FIN001', 'Date': new Date().toISOString().split('T')[0], 'Dialed': 100, 'Connected': 50, 'Time (Min)': 180, 'Leads': 2 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Calling_Upload_Template.xlsx");
  };

  const getPerformanceColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedStatistics = () => {
    if (!sortConfig) return statistics;

    const sorted = [...statistics].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric fields
      if (['total_days', 'total_calls_dialed', 'total_calls_connected', 'overall_connection_rate', 
           'total_calling_time', 'average_call_duration', 'total_leads_created', 
           'present_days', 'half_days', 'absent_days'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Handle string fields (name)
      if (sortConfig.key === 'full_name' || sortConfig.key === 'name') {
        aValue = (a.full_name || a.name || '').toLowerCase();
        bValue = (b.full_name || b.name || '').toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronsUpDown className="h-4 w-4 text-primary" />
    ) : (
      <ChevronsUpDown className="h-4 w-4 text-primary rotate-180" />
    );
  };

  const getAttendanceData = () => {
    const totalDays = statistics.reduce((sum, stat) => sum + (stat.total_days || 0), 0);
    const presentDays = statistics.reduce((sum, stat) => sum + (stat.present_days || 0), 0);
    const halfDays = statistics.reduce((sum, stat) => sum + (stat.half_days || 0), 0);
    const absentDays = statistics.reduce((sum, stat) => sum + (stat.absent_days || 0), 0);

    return [
      { name: 'Present', value: presentDays, color: '#10B981' },
      { name: 'Half Day', value: halfDays, color: '#F59E0B' },
      { name: 'Absent', value: absentDays, color: '#EF4444' }
    ];
  };

  const getCallsData = () => {
    // Determine which manager filter to use for the chart
    const activeChartManager = user?.role === 'executive' ? 'all' : chartFilterManager;

    let filteredStats = statistics;

    // Locally filter or aggregate based on chart-specific manager selection
    if (activeChartManager !== 'all') {
      filteredStats = statistics.filter(stat =>
        stat.manager_id?.toString() === activeChartManager ||
        stat.dsa_id?.toString() === activeChartManager
      );
    }

    if (user?.role === 'admin' && activeChartManager === 'all' && filterUser === 'all') {
      // Aggregate data by Team Leader/Manager
      const managerGroups: Record<string, any> = {};

      filteredStats.forEach(stat => {
        const mgrName = stat.manager_name || 'Direct / Unassigned';
        const mgrId = stat.manager_id || 'unassigned';

        if (!managerGroups[mgrId]) {
          managerGroups[mgrId] = {
            name: mgrName,
            dialed: 0,
            connected: 0,
            leads: 0,
            present_days: 0,
            total_days: 0
          };
        }

        managerGroups[mgrId].dialed += parseInt(stat.total_calls_dialed) || 0;
        managerGroups[mgrId].connected += parseInt(stat.total_calls_connected) || 0;
        managerGroups[mgrId].leads += parseInt(stat.total_leads_created) || 0;
        managerGroups[mgrId].present_days += parseInt(stat.present_days) || 0;
        managerGroups[mgrId].total_days += parseInt(stat.total_days) || 0;
      });

      return Object.values(managerGroups).map(mgr => ({
        name: mgr.name,
        connectionRatio: mgr.dialed > 0 ? parseFloat(((mgr.connected / mgr.dialed) * 100).toFixed(1)) : 0,
        attendanceRatio: mgr.total_days > 0 ? parseFloat(((mgr.present_days / mgr.total_days) * 100).toFixed(1)) : 0,
        leads: mgr.leads
      }));
    }

    // Default: Show individual executives
    return filteredStats.map(stat => {
      const dialed = parseInt(stat.total_calls_dialed) || 0;
      const connected = parseInt(stat.total_calls_connected) || 0;
      const present = parseInt(stat.present_days) || 0;
      const total = parseInt(stat.total_days) || 0;

      return {
        name: stat.full_name || stat.name,
        connectionRatio: dialed > 0 ? parseFloat(((connected / dialed) * 100).toFixed(1)) : 0,
        attendanceRatio: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0,
        leads: parseInt(stat.total_leads_created) || 0
      };
    });
  };

  return (
    <div className="space-y-2 -mx-4 sm:mx-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-0">
        <div>
          <h1 className="text-lg font-bold">Calling Statistics</h1>
          <p className="text-muted-foreground text-[10px]">Analyze team performance and daily logs</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {canEnter && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowEntrySheet(!showEntrySheet)}
              className="flex items-center gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 h-7 text-[10px] px-2"
            >
              <Plus className="h-3 w-3" />
              {showEntrySheet ? 'Hide Entry' : 'Add Data'}
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="flex items-center gap-1.5 h-7 text-[10px] px-2">
              <Upload className="h-3 w-3" />
              Import
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-1.5 border-primary text-primary hover:bg-primary/5 h-7 text-[10px] px-2">
            <FileText className="h-3 w-3" />
            PDF
          </Button>
          {!isExecutive && (
            <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5 h-7 text-[10px] px-2">
              <Download className="h-3 w-3" />
              Excel
            </Button>
          )}
        </div>
      </div>

      {!isExecutive && (
        <Card>
          <CardContent className="pt-4 px-2 sm:pt-6 sm:px-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="grid gap-2 w-full sm:w-[240px]">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Select Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 border-accent/20",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                      {date?.from ? (
                        date.to ? (
                          <span className="font-medium">
                            {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                          </span>
                        ) : (
                          <span className="font-medium">{format(date.from, "LLL dd, y")}</span>
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2 w-full sm:w-[200px]">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Filter By Team Leader</Label>
                <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={managerPopoverOpen}
                      className="w-full justify-between h-10 border-accent/20 font-normal"
                    >
                      {filterManager === "all"
                        ? "All Team Leaders"
                        : managers.find((m) => m.id.toString() === filterManager)?.full_name ||
                        managers.find((m) => m.id.toString() === filterManager)?.name ||
                        "Select leader..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <div className="flex items-center border-b px-3 h-10">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        autoFocus
                        className="flex h-full w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Search leader..."
                        value={managerSearch}
                        onChange={(e) => setManagerSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      <button
                        onClick={() => { 
                          setFilterManager('all'); 
                          setFilterUser('all'); 
                          setManagerPopoverOpen(false);
                          fetchTeamMembers('all');
                        }}
                        className={cn(
                          "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                          filterManager === "all" && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filterManager === "all" ? "opacity-100" : "opacity-0")} />
                        All Team Leaders
                      </button>
                      {managers
                        .filter(m =>
                          m.role === 'team_leader' &&
                          ((m.full_name || m.name || '').toLowerCase().includes(managerSearch.toLowerCase()))
                        )
                        .map((mgr) => (
                          <button
                            key={mgr.id}
                            onClick={() => {
                              setFilterManager(mgr.id.toString());
                              setFilterUser('all');
                              setManagerPopoverOpen(false);
                              fetchTeamMembers(mgr.id.toString());
                            }}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left",
                              filterManager === mgr.id.toString() && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Check className={cn("mr-2 h-4 w-4", filterManager === mgr.id.toString() ? "opacity-100" : "opacity-0")} />
                            <span>{mgr.full_name || mgr.name}</span>
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2 w-full sm:w-[240px]">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Filter By Member</Label>
                <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberPopoverOpen}
                      className="w-full justify-between h-10 border-accent/20 font-normal"
                    >
                      {filterUser === "all"
                        ? "All Members"
                        : teamMembers.find((m) => m.id.toString() === filterUser)?.full_name ||
                        teamMembers.find((m) => m.id.toString() === filterUser)?.name ||
                        "Select member..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <div className="flex items-center border-b px-3 h-10">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        autoFocus
                        className="flex h-full w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search member..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      <button
                        onClick={() => { setFilterUser('all'); setMemberPopoverOpen(false); }}
                        className={cn(
                          "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                          filterUser === "all" && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filterUser === "all" ? "opacity-100" : "opacity-0")} />
                        All Members
                      </button>
                      {teamMembers
                        .filter(m =>
                          (m.full_name || m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
                          (m.user_id || '').toLowerCase().includes(memberSearch.toLowerCase())
                        )
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              setFilterUser(member.id.toString());
                              setMemberPopoverOpen(false);
                            }}
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left",
                              filterUser === member.id.toString() && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Check className={cn("mr-2 h-4 w-4", filterUser === member.id.toString() ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span>{member.full_name || member.name}</span>
                              <span className="text-[10px] text-muted-foreground">{member.user_id}</span>
                            </div>
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleApplyFilters}
                  disabled={loading}
                  className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 font-bold px-8 h-10"
                >
                  {loading ? 'Processing...' : 'Apply Filters'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isExecutive && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5 px-2 sm:px-0">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2 px-3 pr-10">
              <CardTitle className="text-[10px] font-medium">Total Calls Dialed</CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2 px-3 pr-10">
              <div className="text-lg font-bold">
                {statistics.reduce((sum: number, s: any) => sum + (parseInt(s.total_calls_dialed) || 0), 0)}
              </div>
              <p className="text-[9px] text-muted-foreground">{startDate === endDate ? "Today" : "Period total"}</p>
            </CardContent>
            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2 px-3 pr-10">
              <CardTitle className="text-[10px] font-medium">Calls Connected</CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2 px-3 pr-10">
              <div className="text-lg font-bold">
                {statistics.reduce((sum: number, s: any) => sum + (parseInt(s.total_calls_connected) || 0), 0)}
              </div>
              <p className="text-[9px] text-muted-foreground">{startDate === endDate ? "Today" : "Period total"}</p>
            </CardContent>
            <TrendingUp className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2 px-3 pr-10">
              <CardTitle className="text-[10px] font-medium">Total Calling Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2 px-3 pr-10">
              <div className="text-lg font-bold">
                {statistics.reduce((sum: number, s: any) => sum + (parseInt(s.total_calling_time) || 0), 0)} min
              </div>
              <p className="text-[9px] text-muted-foreground">{startDate === endDate ? "Today" : "Period total"}</p>
            </CardContent>
            <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2 px-3 pr-10">
              <CardTitle className="text-[10px] font-medium">Leads Created</CardTitle>
            </CardHeader>
            <CardContent className="pt-0.5 pb-2 px-3 pr-10">
              <div className="text-lg font-bold">
                {statistics.reduce((sum: number, s: any) => sum + (parseInt(s.total_leads_created) || 0), 0)}
              </div>
              <p className="text-[9px] text-muted-foreground">{startDate === endDate ? "Today" : "Period total"}</p>
            </CardContent>
            <Target className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
          </Card>
        </div>
      )}

      {!isExecutive && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 px-2 sm:px-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-1.5 px-3">
              <CardTitle className="text-sm">Calling Statistics</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-2 px-2">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={getCallsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={8}
                    tick={{ fontSize: 8 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis fontSize={8} unit="%" />
                  <Tooltip formatter={(value, name) => [value + (name === 'Leads' ? '' : '%'), name]} />
                  <Bar dataKey="connectionRatio" fill="#3B82F6" name="Conn. Ratio" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attendanceRatio" fill="#10B981" name="Att. Ratio" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" fill="#F59E0B" name="Leads" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-sm">Attendance Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-2 px-2">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={getAttendanceData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={55}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getAttendanceData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {canEnter && showEntrySheet && (
        <Card ref={entrySheetRef} className="animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-2 sm:pb-3 px-2 sm:px-6 py-2 sm:py-4 border-b border-border bg-muted/20">
            <CardTitle className="flex items-center justify-between text-sm sm:text-lg gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                <span className="lg:text-lg text-[0.6rem]">Today's Caller Entry</span>
                {user?.role !== 'executive' && (
                  <div className="flex items-center gap-2 border-l pl-3 ml-1">
                    <Button
                      variant="outline"
                      size="sm"
                      tabIndex={-1}
                      disabled={selectedCallerIds.length === 0}
                      className={`h-7 text-[10px] gap-1 transition-all ${selectedCallerIds.length > 0 ? 'text-red-500 border-red-200 bg-red-50' : 'opacity-50'}`}
                      onClick={() => handleBulkAction('terminate')}
                    >
                    <UserX className="h-1 w-1 lg:h-3 lg:w-3" /> Terminate Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      tabIndex={-1}
                      disabled={selectedCallerIds.length === 0}
                      className={`h-7 text-[10px] gap-1 transition-all ${selectedCallerIds.length > 0 ? 'text-amber-500 border-amber-200 bg-amber-50' : 'opacity-50'}`}
                      onClick={() => handleBulkAction('absent')}
                    >
                      <Trash2 className="h-3 w-3" /> Mark Absent
                    </Button>
                  </div>
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-normal text-muted-foreground bg-background px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-border">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-20">
                  <TableRow className="bg-[#f8f9fa] shadow-sm">
                    <TableHead className="w-[28px] sm:w-[36px] md:w-[40px] py-0 sm:py-1 md:py-2 px-1 sm:px-1.5">
                      <Checkbox
                      
                        tabIndex={-1}
                        checked={selectedCallerIds.length === teamMembers.length && teamMembers.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCallerIds(teamMembers.map(m => m.id));
                          else setSelectedCallerIds([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="min-w-[110px] sm:min-w-[150px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold">Caller Name</TableHead>
                    <TableHead className="min-w-[60px] sm:min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold">Dialed</TableHead>
                    <TableHead className="min-w-[60px] sm:min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold">Connected</TableHead>
                    <TableHead className="min-w-[65px] sm:min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold">Ratio (%)</TableHead>
                    <TableHead className="min-w-[70px] sm:min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold">Time</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[80px] py-1 md:py-2 text-xs uppercase font-bold">Avg Time</TableHead>
                    <TableHead className="min-w-[60px] sm:min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold text-center">Leads</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[100px] py-2 text-xs uppercase font-bold text-center">Est. Salary</TableHead>
                    <TableHead className="min-w-[70px] sm:min-w-[60px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold text-center">Status</TableHead>
                    {canEdit && <TableHead className="min-w-[80px] py-0 sm:py-1 md:py-2 text-[10px] sm:text-xs uppercase font-bold text-center">Approve</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => {
                      const data = quickEntryData[member.id] || {};
                      const isSubmitted = !!data.isSubmitted;
                      const canEdit = data.canEdit !== false; // Allow edit by default or if explicitly set to true

                      const dialedNum = parseInt(data.dialed) || 0;
                      const connNum = parseInt(data.connected) || 0;
                      const timeNum = parseInt(data.time) || 0;
                      const leadsNum = parseInt(data.leads) || 0;

                      // Calculate status REAL-TIME based on current numbers
                      const currentStatus = calculateAttendanceStatus(timeNum, leadsNum);

                      const ratio = dialedNum > 0 ? parseFloat(((connNum / dialedNum) * 100).toFixed(1)) : 0;
                      const avgDur = connNum > 0 ? (timeNum / connNum).toFixed(1) : '0.0';

                      

                      // Calculate real-time Salary based on the calculated status
                      let presentSalary = parseInt(getConfig('present_salary', '400'));
                      let halfSalary = parseInt(getConfig('half_day_salary', '200'));

                      let basePay = 0;
                      if (currentStatus === 'present') basePay = presentSalary;
                      else if (currentStatus === 'half_day') basePay = halfSalary;
                      else if (currentStatus === 'absent') basePay = 0;

                      const estSalary = basePay;

                      return (
                        <TableRow key={member.id} className={`${isSubmitted && canEdit ? "bg-blue-50/10 dark:bg-blue-950/5" : isSubmitted ? "bg-gray-50/10 dark:bg-gray-950/5" : ""} border-b border-gray-200 h-6 sm:h-8 md:h-9`}>
                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1 text-center">
                            <Checkbox
                              tabIndex={-1}
                              checked={selectedCallerIds.includes(member.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedCallerIds(prev => [...prev, member.id]);
                                else setSelectedCallerIds(prev => prev.filter(id => id !== member.id));
                              }}
                            />
                          </TableCell>
                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1">
                            <div className="flex flex-col">
                              <span className="text-[9px] sm:text-[11px] font-bold text-gray-800 truncate max-w-[90px] sm:max-w-[120px]">{member.full_name || member.name}</span>
                              <span className="text-[7px] sm:text-[9px] text-muted-foreground uppercase">{member.user_id}</span>
                            </div>
                          </TableCell>

                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1">
                            <Input
                              type="number"
                              value={data.dialed ?? ''}
                              onChange={(e) => handleQuickEntryChange(member.id, 'dialed', e.target.value)}
                              disabled={!canEdit}
                              tabIndex={!canEdit || data.dialed ? -1 : 0}
                              className={`h-5 sm:h-6 md:h-7 text-[10px] sm:text-xs border-gray-300 px-1 focus-visible:ring-1 ${parseInt(data.dialed) > 500 ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
                              placeholder="0"
                              min="0"
                              max="500"
                            />
                          </TableCell>

                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1">
                            <Input
                              type="number"
                              value={data.connected ?? ''}
                              onChange={(e) => handleQuickEntryChange(member.id, 'connected', e.target.value)}
                              disabled={!canEdit}
                              tabIndex={!canEdit || data.connected ? -1 : 0}
                              className={`h-5 sm:h-6 md:h-7 text-[10px] sm:text-xs border-gray-300 px-1 focus-visible:ring-1 ${(parseInt(data.connected) > 300 || (parseInt(data.connected) > parseInt(data.dialed))) ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
                              placeholder="0"
                              min="0"
                              max="300"
                            />
                          </TableCell>

                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1 bg-gray-50/50">
                            <div className={`text-[0.85rem] sm:text-[1rem] font-black text-center ${parseInt(data.dialed) > 0 && ratio < 20 ? 'text-red-600' : 'text-gray-700'}`}>
                              {data.dialed && parseInt(data.dialed) > 0 ? `${ratio}%` : '-'}
                            </div>
                          </TableCell>

                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1">
                            <Input
                              type="number"
                              value={data.time ?? ''}
                              onChange={(e) => handleQuickEntryChange(member.id, 'time', e.target.value)}
                              disabled={!canEdit}
                              tabIndex={!canEdit || data.time ? -1 : 0}
                              className={`h-5 sm:h-6 md:h-7 text-[10px] sm:text-xs border-gray-300 px-1 focus-visible:ring-1 ${parseInt(data.time) > 200 ? 'border-red-500 bg-red-50 text-red-900' : ''}`}
                              placeholder="Mins"
                              min="0"
                              max="200"
                            />
                          </TableCell>

                          <TableCell className="hidden sm:table-cell border-r border-gray-300 p-1 bg-gray-50/50 text-center">
                            <span className="text-sm font-bold text-gray-500">{avgDur}m</span>
                          </TableCell>

                          <TableCell className="border-r border-gray-300 p-0 sm:p-0.5 md:p-1 bg-orange-50/30">
                            <Input
                              type="number"
                              value={data.leads ?? ''}
                              onChange={(e) => handleQuickEntryChange(member.id, 'leads', e.target.value)}
                              disabled={!canEdit}
                              tabIndex={!canEdit || data.leads ? -1 : 0}
                              className={`h-5 sm:h-6 md:h-7 text-[0.9rem] sm:text-[1rem] font-black border-orange-200 px-1 focus-visible:ring-1 text-center ${parseInt(data.leads) > 10 ? 'border-red-500 bg-red-50 text-red-900' : 'text-orange-700'}`}
                              placeholder="0"
                              min="0"
                              max="10"
                            />
                          </TableCell>

                          <TableCell className="hidden md:table-cell border-r border-gray-300 p-0 sm:p-0.5 md:p-1 text-center bg-gray-50/50">
                            <span className="text-sm font-black text-gray-700 font-mono">₹{estSalary}</span>
                          </TableCell>

                          <TableCell className="py-0 sm:py-0.5 md:py-1 px-0 sm:px-1 md:px-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              {currentStatus === 'absent' ? (
                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[7px] sm:text-[8px] uppercase font-bold px-1 sm:px-1.5 py-0 h-3 sm:h-4">
                                  Absent
                                </Badge>
                              ) : (!data.dialed && !data.connected && !data.time && !data.leads) ? (
                                <span className="text-[0.7rem] sm:text-[0.9rem] text-muted-foreground italic">Draft</span>
                              ) : (
                                <>
                                  {currentStatus === 'present' && (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[7px] sm:text-[0.9rem] uppercase font-bold px-1 sm:px-1.5 py-0 h-3 sm:h-4">
                                      Full Day
                                    </Badge>
                                  )}
                                  {currentStatus === 'half_day' && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[7px] sm:text-[0.9rem] uppercase font-bold px-1 sm:px-1.5 py-0 h-3 sm:h-4">
                                      Half Day
                                    </Badge>
                                  )}
                                  {currentStatus === 'absent' && (
                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[7px] sm:text-[0.9rem] uppercase font-bold px-1 sm:px-1.5 py-0 h-3 sm:h-4">
                                      Absent
                                    </Badge>
                                  )}
                                  {isSubmitted && canEdit && (
                                    <span className="text-[0.65rem] sm:text-[0.8rem] text-blue-600 font-bold uppercase">Editable</span>
                                  )}
                                  {isSubmitted && !canEdit && (
                                    <span className="text-[0.65rem] sm:text-[0.8rem] text-gray-600 font-bold uppercase">Locked</span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="py-0 sm:py-0.5 md:py-1 px-1 text-center">
                              {isSubmitted ? (
                                <Button
                                  size="sm"
                                  variant={data.is_approved ? 'default' : 'outline'}
                                  className={`h-6 text-[9px] px-2 ${data.is_approved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                                  disabled={approvingId === (todayRecords.find(r => (r.database_user_id || r.user_id) === member.id)?.id)}
                                  onClick={() => {
                                    const rec = todayRecords.find(r => (r.database_user_id || r.user_id) === member.id);
                                    if (rec) handleApprove(rec.id, !!data.is_approved);
                                  }}
                                >
                                  {data.is_approved ? <><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Approved</> : 'Approve'}
                                </Button>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-6 text-muted-foreground text-sm">
                        No team members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-2 sm:p-4 bg-muted/10 border-t flex justify-between items-center">

              {canEnter && (
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={savingAll || loading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-4 sm:px-8 py-0.5 sm:py-1 h-8 sm:h-9 text-xs sm:text-sm font-bold"
                >
                  {savingAll ? "Saving..." : "Save All Today's Records"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OTP Approval Dialog - Executive */}
      <Dialog open={!!otpRecord} onOpenChange={(open) => { if (!open) { setOtpRecord(null); setOtpValue(''); setOtpSent(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Confirm Attendance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {otpRecord && (
              <p className="text-xs text-muted-foreground">
                {new Date(otpRecord.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — {otpRecord.attendance_status?.replace('_', ' ').toUpperCase()}
              </p>
            )}
            {!otpSent ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">An OTP will be sent to your registered mobile number to confirm your attendance.</p>
                <Button onClick={() => otpRecord && handleRequestOTP(otpRecord)} disabled={otpLoading} className="w-full">
                  {otpLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Enter the 6-digit OTP sent to your mobile number.</p>
                <Input
                  type="number"
                  placeholder="Enter OTP"
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value)}
                  maxLength={6}
                  className="h-10 text-center text-lg tracking-widest font-bold"
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{otpTimer > 0 ? `Expires in ${otpTimer}s` : 'OTP expired'}</span>
                  {otpTimer === 0 && (
                    <button className="text-primary underline" onClick={() => otpRecord && handleRequestOTP(otpRecord)}>Resend OTP</button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setOtpRecord(null); setOtpValue(''); setOtpSent(false); }}>Cancel</Button>
                  <Button className="flex-1" onClick={handleVerifyOTP} disabled={otpLoading || otpValue.length !== 6 || otpTimer === 0}>
                    {otpLoading ? 'Verifying...' : 'Confirm Attendance'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog - Admin/Sales Manager */}
      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Calling Record</DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {editRecord.user_full_name || editRecord.user_name} — {new Date(editRecord.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Calls Dialed</Label>
                  <Input type="number" min="0" value={editForm.calls_dialed} onChange={e => setEditForm(p => ({ ...p, calls_dialed: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Calls Connected</Label>
                  <Input type="number" min="0" value={editForm.calls_connected} onChange={e => setEditForm(p => ({ ...p, calls_connected: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Total Time (mins)</Label>
                  <Input type="number" min="0" value={editForm.total_calling_time} onChange={e => setEditForm(p => ({ ...p, total_calling_time: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Leads Created</Label>
                  <Input type="number" min="0" value={editForm.leads_created} onChange={e => setEditForm(p => ({ ...p, leads_created: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
                <Button onClick={handleEditSave} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirm Termination
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to terminate <span className="font-bold text-foreground">{userToTerminate?.full_name}</span>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-3 rounded border border-red-100">
              This will immediately remove them from the active calling list and they will no longer be able to log in or access the system.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
            >
              {terminating ? "Terminating..." : "Yes, Terminate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Calling Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Calls Dialed</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.calls_dialed}
                  onChange={(e) => setFormData(prev => ({ ...prev, calls_dialed: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label>Calls Connected</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.calls_connected}
                  onChange={(e) => setFormData(prev => ({ ...prev, calls_connected: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Time (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_calling_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_calling_time: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label>Leads Created</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={fetchingLeads ? 'Loading...' : formData.leads_created}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    title="Auto-calculated from leads submitted today"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {fetchingLeads ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRecord}>
                Add Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Bulk Import Records
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-center gap-2 relative h-32">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Click to upload or drag Excel file</p>
                <p className="text-xs text-muted-foreground">Supported format: .xlsx, .csv</p>
              </div>
              <Input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImport}
                disabled={importing}
                className="cursor-pointer opacity-0 absolute inset-0 w-full h-full"
              />
            </div>

            {importing && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded text-sm animate-pulse">
                <Clock className="h-4 w-4 animate-spin" />
                {importStatus?.message || 'Processing...'}
              </div>
            )}

            {importStatus?.errors && (
              <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-slate-50 rounded border">
                <p className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Import Errors:
                </p>
                {importStatus.errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-500 bg-red-50/50 p-1.5 rounded border border-red-100">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="pt-2 border-t flex flex-col gap-2">
              <p className="text-[11px] text-muted-foreground italic">
                Required Headers: User ID (e.g. FIN001), Date (YYYY-MM-DD), Dialed, Connected, Time, Leads
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="w-fit text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 p-0 h-auto flex items-center gap-1">
                <Download className="h-3 w-3" />
                Download Format Template
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportStatus(null); }} disabled={importing}>
              {importStatus?.success ? "Finish" : "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Performance Details / Executive Monthly Report */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {user?.role === 'executive'
                ? `${format(date?.from || startOfMonth(new Date()), "MMM yyyy")} Report`
                : (
                  <div className="flex items-center text-xs lg:text-sm gap-1.5">
                    <span>{filterUser === 'all' ? 'Team Statistics' : `Logs: ${statistics[0]?.full_name || 'Member'}`}</span>

                    {date?.from ? (
                      date.to ? (
                        <span className="font-medium text-[10px]">
                          {format(date.from, "MMM dd")} - {format(date.to, "MMM dd")}
                        </span>
                      ) : (
                        <span className="font-medium text-[10px]">{format(date.from, "MMM dd")}</span>
                      )
                    ) : (
                      <span className="text-[10px]">Pick range</span>
                    )}

                  </div>
                )}
            </div>
            {user?.role !== 'executive' && filterUser !== 'all' && (
              <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                {detailedRecords.length} Entries
              </Badge>
            )}
          </CardTitle>
        </CardHeader> 
        <CardContent className="p-2">
          {/* Desktop Table - For Executives or Team Details */}
          <div className="hidden md:block overflow-x-auto">
            {user?.role === 'executive' || filterUser !== 'all' ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs uppercase font-bold py-3">Date</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Dialed</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Connected</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Connection Rate</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Total Time</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Leads</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Attendance</TableHead>
                    <TableHead className="text-xs uppercase font-bold py-3">Status</TableHead>
                    {(canApprove || isExecutive) && <TableHead className="text-xs uppercase font-bold py-3">Approve</TableHead>}
                    {canEdit && <TableHead className="text-xs uppercase font-bold py-3">Edit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDetailed ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10">Loading logs...</TableCell></TableRow>
                  ) : detailedRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No records found for this period</TableCell></TableRow>
                  ) : (
                    detailedRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/30 h-10">
                        <TableCell className="font-medium whitespace-nowrap text-xs">
                          {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-xs">{record.calls_dialed}</TableCell>
                        <TableCell className="text-xs">{record.calls_connected}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`${getPerformanceColor(record.connection_rate)} font-bold`}>
                            {record.connection_rate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{record.total_calling_time} min</TableCell>
                        <TableCell className="text-xs">{record.leads_created}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-[9px] uppercase font-bold px-1.5 py-0 ${record.attendance_status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                            record.attendance_status === 'half_day' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {record.attendance_status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.is_approved
                            ? <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0"><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Approved</Badge>
                            : <Badge variant="outline" className="text-[9px] text-gray-400 px-1.5 py-0">Pending</Badge>
                          }
                        </TableCell>
                        {(canApprove || isExecutive) && (
                          <TableCell>
                            {isExecutive && record.created_by === user?.id ? (
                              <span className="text-[9px] text-muted-foreground italic">Self-entered</span>
                            ) : (
                              <Button
                                size="sm"
                                variant={record.is_approved ? 'default' : 'outline'}
                                className={`h-6 text-[9px] px-2 ${record.is_approved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                                disabled={approvingId === record.id || (isExecutive && record.is_approved)}
                                onClick={() => isExecutive ? handleRequestOTP(record) : (!record.is_approved && handleApprove(record.id, false))}
                              >
                                {record.is_approved
                                  ? <><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Approved</>
                                  : isExecutive ? 'Confirm' : 'Approve'}
                              </Button>
                            )}
                          </TableCell>
                        )}
                        {canEdit && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[9px] px-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setEditRecord(record);
                                setEditForm({
                                  calls_dialed: record.calls_dialed?.toString() || '0',
                                  calls_connected: record.calls_connected?.toString() || '0',
                                  total_calling_time: record.total_calling_time?.toString() || '0',
                                  leads_created: record.leads_created?.toString() || '0',
                                  attendance_status: record.attendance_status || 'present',
                                });
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table className="relative">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="bg-muted/50 border-b">
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('full_name')}>
                      <div className="flex items-center gap-1">
                        Team Member
                        <SortIcon columnKey="full_name" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('total_days')}>
                      <div className="flex items-center gap-1">
                        Total Days
                        <SortIcon columnKey="total_days" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('total_calls_dialed')}>
                      <div className="flex items-center gap-1">
                        Calls Dialed
                        <SortIcon columnKey="total_calls_dialed" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('total_calls_connected')}>
                      <div className="flex items-center gap-1">
                        Calls Connected
                        <SortIcon columnKey="total_calls_connected" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('overall_connection_rate')}>
                      <div className="flex items-center gap-1">
                        Connection Rate
                        <SortIcon columnKey="overall_connection_rate" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('total_calling_time')}>
                      <div className="flex items-center gap-1">
                        Total Time
                        <SortIcon columnKey="total_calling_time" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('average_call_duration')}>
                      <div className="flex items-center gap-1">
                        Avg Call Duration
                        <SortIcon columnKey="average_call_duration" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('total_leads_created')}>
                      <div className="flex items-center gap-1">
                        Leads Created
                        <SortIcon columnKey="total_leads_created" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/70" onClick={() => handleSort('present_days')}>
                      <div className="flex items-center gap-1">
                        Attendance
                        <SortIcon columnKey="present_days" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <BarChart3 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No statistics available for the selected period</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    getSortedStatistics().map((stat) => (
                      <TableRow key={stat.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stat.full_name || stat.name}</div>
                            <div className="text-sm text-muted-foreground">{stat.user_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{stat.total_days || 0}</TableCell>
                        <TableCell>{stat.total_calls_dialed || 0}</TableCell>
                        <TableCell>{stat.total_calls_connected || 0}</TableCell>
                        <TableCell>
                          <span className={getPerformanceColor(stat.overall_connection_rate || 0)}>
                            {stat.overall_connection_rate || 0}%
                          </span>
                        </TableCell>
                        <TableCell>{stat.total_calling_time || 0} min</TableCell>
                        <TableCell>{stat.average_call_duration || 0} min</TableCell>
                        <TableCell>{stat.total_leads_created || 0}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Present: {stat.present_days || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Half: {stat.half_days || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Absent: {stat.absent_days || 0}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            <MobileStatisticsCards
              statistics={statistics}
              detailedRecords={detailedRecords}
              configs={configs}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallingStatistics;
