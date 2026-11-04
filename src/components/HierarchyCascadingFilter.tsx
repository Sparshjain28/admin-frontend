import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import MultiSelectDropdown from './MultiSelectDropdown';

interface User {
  id: string;
  full_name: string;
  role: string;
  reporting_to?: string;
}

export interface HierarchyFilterState {
  salesManager: string[];
  branchManager: string[];
  teamLeader: string[];
  executive: string[];
}

interface HierarchyCascadingFilterProps {
  value: HierarchyFilterState;
  onChange: (value: HierarchyFilterState) => void;
  className?: string;
}

export default function HierarchyCascadingFilter({ value, onChange, className }: HierarchyCascadingFilterProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await api.request('/users/hierarchy');
        setAllUsers(data);
      } catch (e) {
        console.error('Failed to fetch hierarchy', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const salesManagers = allUsers.filter(u => u.role === 'sales_manager');

  const branchManagers = value.salesManager && value.salesManager.length > 0
    ? allUsers.filter(u => {
        if (u.role !== 'branch_manager' && u.role !== 'dsa') return false;
        const sms = salesManagers.filter(s => value.salesManager.includes(s.full_name));
        return sms.some(sm => u.reporting_to === sm.id);
      })
    : allUsers.filter(u => u.role === 'branch_manager' || u.role === 'dsa');

  const teamLeaders = value.branchManager && value.branchManager.length > 0
    ? allUsers.filter(u => {
        if (u.role !== 'team_leader') return false;
        const bms = branchManagers.filter(b => value.branchManager.includes(b.full_name));
        return bms.some(bm => u.reporting_to === bm.id);
      })
    : value.salesManager && value.salesManager.length > 0
      ? allUsers.filter(u => {
          if (u.role !== 'team_leader') return false;
          const sms = salesManagers.filter(s => value.salesManager.includes(s.full_name));
          if (sms.some(sm => u.reporting_to === sm.id)) return true;
          const bm = allUsers.find(b => b.id === u.reporting_to);
          return bm && sms.some(sm => bm.reporting_to === sm.id);
        })
      : allUsers.filter(u => u.role === 'team_leader');

  const executives = value.teamLeader && value.teamLeader.length > 0
    ? allUsers.filter(u => {
        if (u.role !== 'executive') return false;
        const tls = allUsers.filter(t => t.role === 'team_leader' && value.teamLeader.includes(t.full_name));
        return tls.some(tl => u.reporting_to === tl.id);
      })
    : value.branchManager && value.branchManager.length > 0
      ? allUsers.filter(u => {
          if (u.role !== 'executive') return false;
          const bms = branchManagers.filter(b => value.branchManager.includes(b.full_name));
          if (bms.length === 0) return false;
          if (bms.some(bm => u.reporting_to === bm.id)) return true;
          const tl = allUsers.find(t => t.id === u.reporting_to);
          return tl && bms.some(bm => tl.reporting_to === bm.id);
        })
      : value.salesManager && value.salesManager.length > 0
        ? allUsers.filter(u => {
            if (u.role !== 'executive') return false;
            const sms = salesManagers.filter(s => value.salesManager.includes(s.full_name));
            if (sms.some(sm => u.reporting_to === sm.id)) return true;
            const tl = allUsers.find(t => t.id === u.reporting_to);
            if (tl) {
              if (sms.some(sm => tl.reporting_to === sm.id)) return true;
              const bm = allUsers.find(b => b.id === tl.reporting_to);
              if (bm && sms.some(sm => bm.reporting_to === sm.id)) return true;
            }
            const bm = allUsers.find(b => b.id === u.reporting_to);
            if (bm && sms.some(sm => bm.reporting_to === sm.id)) return true;
            return false;
          })
        : allUsers.filter(u => u.role === 'executive');

  const handleSMChange = (val: string[]) => {
    onChange({ salesManager: val, branchManager: [], teamLeader: [], executive: [] });
  };

  const handleBMChange = (val: string[]) => {
    onChange({ ...value, branchManager: val, teamLeader: [], executive: [] });
  };

  const handleTLChange = (val: string[]) => {
    onChange({ ...value, teamLeader: val, executive: [] });
  };

  const handleExecChange = (val: string[]) => {
    onChange({ ...value, executive: val });
  };

  const uniqueSms = Array.from(new Set(salesManagers.map(sm => sm.full_name)));
  const uniqueBms = Array.from(new Set(branchManagers.map(bm => bm.full_name)));
  const uniqueTls = Array.from(new Set(teamLeaders.map(tl => tl.full_name)));
  const uniqueExs = Array.from(new Set(executives.map(ex => ex.full_name)));

  return (
    <>
      {/* Sales Manager */}
      <div className="w-full sm:w-[220px]">
        <MultiSelectDropdown
          options={uniqueSms.map(name => ({ value: name, label: name }))}
          value={value.salesManager || []}
          onChange={handleSMChange}
          placeholder={loading ? 'Loading...' : 'All Sales Managers'}
        />
      </div>

      {/* Branch Manager */}
      <div className="w-full sm:w-[220px]">
        <MultiSelectDropdown
          options={uniqueBms.map(name => ({ value: name, label: name }))}
          value={value.branchManager || []}
          onChange={handleBMChange}
          placeholder={loading ? 'Loading...' : 'All Branch Managers'}
        />
      </div>

      {/* Team Leader */}
      <div className="w-full sm:w-[220px]">
        <MultiSelectDropdown
          options={uniqueTls.map(name => ({ value: name, label: name }))}
          value={value.teamLeader || []}
          onChange={handleTLChange}
          placeholder="All Team Leaders"
        />
      </div>

      {/* Executive */}
      <div className="w-full sm:w-[220px]">
        <MultiSelectDropdown
          options={uniqueExs.map(name => ({ value: name, label: name }))}
          value={value.executive || []}
          onChange={handleExecChange}
          placeholder="All Executives"
        />
      </div>
    </>
  );
}
