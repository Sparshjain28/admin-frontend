import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Settings } from 'lucide-react';
import CallingStatistics from '@/components/CallingStatistics';
import CallingConfiguration from '@/components/CallingConfiguration';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const CallingManagement = () => {
  const [activeTab, setActiveTab] = useState('statistics');
  const [teamMembers, setTeamMembers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const teamMembersData = await api.get('/calling/team-members');
      setTeamMembers(teamMembersData || []);
    } catch (error) {
setTeamMembers([]);
    }
  };

  const canEdit = ['admin', 'sales_manager', 'manager'].includes(user?.role);
  const canEnter = ['admin', 'sales_manager', 'manager', 'branch_manager', 'team_leader'].includes(user?.role);
  const canApprove = user?.role === 'executive';
  const isExecutive = user?.role === 'executive';

  return (
    <div className="container mx-auto p-2 sm:p-3 space-y-4 pb-20 lg:pb-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full h-auto min-h-10 p-1 ${canEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="statistics" className="flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-normal text-center py-2 h-auto">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="sm:hidden inline">Performance</span>
            <span className="sm:inline hidden">
              {isExecutive ? 'My Daily Performance' : "Today's Performance & Records"}
            </span>
          </TabsTrigger>
          {canEdit && (
            <TabsTrigger value="configuration" className="flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-normal text-center py-2 h-auto">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="sm:hidden inline">Settings</span>
              <span className="sm:inline hidden">Configuration</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="statistics" className="space-y-4">
          <CallingStatistics
            teamMembers={teamMembers}
            onTeamMembersUpdate={fetchTeamMembers}
            canEdit={canEdit}
            canEnter={canEnter}
            canApprove={canApprove}
            isExecutive={isExecutive}
          />
        </TabsContent>

        {canEdit && (
          <TabsContent value="configuration" className="space-y-4">
            <CallingConfiguration />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default CallingManagement;
