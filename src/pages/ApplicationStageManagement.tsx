import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../components/ui/use-toast';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const APPLICATION_STAGES = {
  SUBMITTED: 'submitted',
  LOGIN: 'login',
  IN_PROCESS: 'in_process',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
  CANCELLED: 'cancelled'
};

const STAGE_LABELS = {
  [APPLICATION_STAGES.SUBMITTED]: 'Draft',
  [APPLICATION_STAGES.LOGIN]: 'Login',
  [APPLICATION_STAGES.IN_PROCESS]: 'In Process',
  [APPLICATION_STAGES.REJECTED]: 'Rejected',
  [APPLICATION_STAGES.APPROVED]: 'Approved',
  [APPLICATION_STAGES.DISBURSED]: 'Disbursed',
  [APPLICATION_STAGES.CANCELLED]: 'Cancelled'
};

const STAGE_COLORS = {
  [APPLICATION_STAGES.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [APPLICATION_STAGES.LOGIN]: 'bg-yellow-100 text-yellow-800',
  [APPLICATION_STAGES.IN_PROCESS]: 'bg-orange-100 text-orange-800',
  [APPLICATION_STAGES.REJECTED]: 'bg-red-100 text-red-800',
  [APPLICATION_STAGES.APPROVED]: 'bg-green-100 text-green-800',
  [APPLICATION_STAGES.DISBURSED]: 'bg-purple-100 text-purple-800',
  [APPLICATION_STAGES.CANCELLED]: 'bg-gray-100 text-gray-800'
};

interface Loan {
  id: number;
  loan_number: string;
  customer_name: string;
  loan_amount: number;
  application_stage: string;
  app_score?: string;
  credit_score?: number;
  tags?: string[];
  roi?: number;
  tenure?: number;
  loan_account_number?: string;
  rc_type?: string;
  rc_collected_by?: string;
  rto_agent_name_rc?: string;
  rto_agent_mobile?: string;
  banker_name?: string;
  banker_mobile?: string;
  stage_changed_at: string;
}

interface StageUpdateData {
  stage: string;
  app_score?: string;
  credit_score?: number;
  tags?: string[];
  rejection_remarks?: string;
  approval_remarks?: string;
  loan_amount?: number;
  roi?: number;
  tenure?: number;
  loan_account_number?: string;
  rc_type?: string;
  rc_collected_by?: string;
  rto_agent_name_rc?: string;
  rto_agent_mobile?: string;
  banker_name?: string;
  banker_mobile?: string;
  cancellation_remarks?: string;
  remarks?: string;
}

const ApplicationStageManagement: React.FC = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [stageUpdateData, setStageUpdateData] = useState<StageUpdateData>({} as StageUpdateData);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any[]>([]);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  const canUpdateStages = user?.role !== 'executive';

  useEffect(() => {
    fetchLoans();
    fetchStatistics();
  }, [selectedStageFilter]);

  const fetchLoans = async () => {
    try {
      const params = selectedStageFilter !== 'all' ? { stage: selectedStageFilter } : {};
      const response = await api.get('/application-stages/loans-with-stages', { params });
      setLoans(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch loans',
        variant: 'destructive'
      });
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/application-stages/stage-statistics');
      setStatistics(response.data);
    } catch (error) {
}
  };

  const handleStageUpdate = async () => {
    if (!selectedLoan || !canUpdateStages) return;

    setLoading(true);
    try {
      await api.put(`/application-stages/loans/${selectedLoan.id}/stage`, stageUpdateData);
      toast({
        title: 'Success',
        description: 'Application stage updated successfully'
      });
      fetchLoans();
      fetchStatistics();
      setSelectedLoan(null);
      setStageUpdateData({} as StageUpdateData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update stage',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStageSpecificFields = () => {
    const stage = stageUpdateData.stage;

    switch (stage) {
      case APPLICATION_STAGES.LOGIN:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="app_score">App Score</Label>
              <Input
                id="app_score"
                type="number"
                step="0.01"
                value={stageUpdateData.app_score || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  app_score: parseFloat(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="credit_score">Credit Score</Label>
              <Input
                id="credit_score"
                type="number"
                value={stageUpdateData.credit_score || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  credit_score: parseInt(e.target.value)
                })}
              />
            </div>
          </div>
        );

      case APPLICATION_STAGES.IN_PROCESS:
        return (
          <div>
            <Label htmlFor="tags">Add Tags</Label>
            <Input
              id="tags"
              placeholder="Enter tags separated by commas"
              value={stageUpdateData.tags?.join(', ') || ''}
              onChange={(e) => setStageUpdateData({
                ...stageUpdateData,
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              })}
            />
          </div>
        );

      case APPLICATION_STAGES.REJECTED:
        return (
          <div>
            <Label htmlFor="rejection_remarks">Rejection Remarks</Label>
            <Textarea
              id="rejection_remarks"
              value={stageUpdateData.rejection_remarks || ''}
              onChange={(e) => setStageUpdateData({
                ...stageUpdateData,
                rejection_remarks: e.target.value
              })}
              required
            />
          </div>
        );

      case APPLICATION_STAGES.APPROVED:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan_amount">Loan Amount</Label>
              <Input
                id="loan_amount"
                type="number"
                value={stageUpdateData.loan_amount || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  loan_amount: parseFloat(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="roi">ROI (%)</Label>
              <Input
                id="roi"
                type="number"
                step="0.01"
                value={stageUpdateData.roi || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  roi: parseFloat(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="tenure">Tenure (months)</Label>
              <Input
                id="tenure"
                type="number"
                value={stageUpdateData.tenure || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  tenure: parseInt(e.target.value)
                })}
              />
            </div>
            <div>
              <Label htmlFor="approval_remarks">Approval Remarks</Label>
              <Textarea
                id="approval_remarks"
                value={stageUpdateData.approval_remarks || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  approval_remarks: e.target.value
                })}
              />
            </div>
          </div>
        );

      case APPLICATION_STAGES.DISBURSED:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan_account_number">Loan Account Number</Label>
              <Input
                id="loan_account_number"
                value={stageUpdateData.loan_account_number || ''}
                onChange={(e) => setStageUpdateData({
                  ...stageUpdateData,
                  loan_account_number: e.target.value
                })}
              />
            </div>
            <div>
              <Label htmlFor="rc_type">RC Type</Label>
              <Select
                value={stageUpdateData.rc_type || ''}
                onValueChange={(value) => setStageUpdateData({
                  ...stageUpdateData,
                  rc_type: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select RC Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical_rc">Physical RC</SelectItem>
                  <SelectItem value="digital_rc">Digital RC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rc_collected_by">RC Collected By</Label>
              <Select
                value={stageUpdateData.rc_collected_by || ''}
                onValueChange={(value) => setStageUpdateData({
                  ...stageUpdateData,
                  rc_collected_by: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Collection Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="rto_agent">RTO Agent</SelectItem>
                  <SelectItem value="banker">Banker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {stageUpdateData.rc_collected_by === 'rto_agent' && (
              <>
                <div>
                  <Label htmlFor="rto_agent_name_rc">RTO Agent Name</Label>
                  <Input
                    id="rto_agent_name_rc"
                    value={stageUpdateData.rto_agent_name_rc || ''}
                    onChange={(e) => setStageUpdateData({
                      ...stageUpdateData,
                      rto_agent_name_rc: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="rto_agent_mobile">RTO Agent Mobile</Label>
                  <Input
                    id="rto_agent_mobile"
                    value={stageUpdateData.rto_agent_mobile || ''}
                    onChange={(e) => setStageUpdateData({
                      ...stageUpdateData,
                      rto_agent_mobile: e.target.value
                    })}
                  />
                </div>
              </>
            )}
            {stageUpdateData.rc_collected_by === 'banker' && (
              <>
                <div>
                  <Label htmlFor="banker_name">Banker Name</Label>
                  <Input
                    id="banker_name"
                    value={stageUpdateData.banker_name || ''}
                    onChange={(e) => setStageUpdateData({
                      ...stageUpdateData,
                      banker_name: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="banker_mobile">Banker Mobile</Label>
                  <Input
                    id="banker_mobile"
                    value={stageUpdateData.banker_mobile || ''}
                    onChange={(e) => setStageUpdateData({
                      ...stageUpdateData,
                      banker_mobile: e.target.value
                    })}
                  />
                </div>
              </>
            )}
          </div>
        );

      case APPLICATION_STAGES.CANCELLED:
        return (
          <div>
            <Label htmlFor="cancellation_remarks">Cancellation Remarks</Label>
            <Textarea
              id="cancellation_remarks"
              value={stageUpdateData.cancellation_remarks || ''}
              onChange={(e) => setStageUpdateData({
                ...stageUpdateData,
                cancellation_remarks: e.target.value
              })}
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Application Stage Management</h1>
        <Select value={selectedStageFilter} onValueChange={setSelectedStageFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statistics.map((stat) => (
          <Card key={stat.application_stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {STAGE_LABELS[stat.application_stage] || stat.application_stage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.count}</div>
              {stat.avg_approved_amount && (
                <p className="text-xs text-muted-foreground">
                  Avg: ₹{parseFloat(stat.avg_approved_amount).toLocaleString()}
                </p>
              )}
              {stat.total_disbursed > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: ₹{parseFloat(stat.total_disbursed).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Loan Number</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Last Updated</th>
                  {canUpdateStages && <th className="text-left p-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{loan.loan_number}</td>
                    <td className="p-2">{loan.customer_name}</td>
                    <td className="p-2">₹{loan.loan_amount?.toLocaleString()}</td>
                    <td className="p-2">
                      <Badge className={STAGE_COLORS[loan.application_stage] || 'bg-gray-100 text-gray-800'}>
                        {STAGE_LABELS[loan.application_stage] || loan.application_stage}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {new Date(loan.stage_changed_at).toLocaleDateString()}
                    </td>
                    {canUpdateStages && (
                      <td className="p-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setStageUpdateData({ stage: loan.application_stage });
                              }}
                            >
                              Update Stage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Update Application Stage</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="stage">New Stage</Label>
                                <Select
                                  value={stageUpdateData.stage}
                                  onValueChange={(value) => setStageUpdateData({
                                    ...stageUpdateData,
                                    stage: value
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {renderStageSpecificFields()}

                              <div>
                                <Label htmlFor="remarks">General Remarks</Label>
                                <Textarea
                                  id="remarks"
                                  value={stageUpdateData.remarks || ''}
                                  onChange={(e) => setStageUpdateData({
                                    ...stageUpdateData,
                                    remarks: e.target.value
                                  })}
                                />
                              </div>

                              <div className="flex flex-row items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border">
                                <Button
                                  variant="outline"
                                  className="flex-1 sm:flex-none"
                                  onClick={() => {
                                    setSelectedLoan(null);
                                    setStageUpdateData({} as StageUpdateData);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  className="flex-1 sm:flex-none"
                                  onClick={handleStageUpdate}
                                  disabled={loading || !stageUpdateData.stage}
                                >
                                  {loading ? 'Updating...' : 'Update Stage'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationStageManagement;
