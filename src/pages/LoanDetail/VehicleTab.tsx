import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Car, Loader2 } from 'lucide-react';
import { Card, Field, renderChallanDetails, getVehicleAge, getTentativeValue, SharedTabProps, PddStatusField } from './shared';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleTabProps extends SharedTabProps {
  idvData: any;
}

const fmtDate = (v: any) => {
  if (!v) return '';
  const s = String(v).trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN');
  }
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN');
  }
  m = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[2]), Number(m[1]) - 1, 1);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN');
};

export default function VehicleTab({ loan, idvData }: VehicleTabProps) {
  const l = loan as any;
  const isDisbursedLoan = String(l.application_stage || '').toUpperCase() === 'DISBURSED';
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Strictly only loan_operations account
  const isLoanOps = user?.role === 'loan_operations';

  // Combined conditional RC details edit state
  const [isEditingRcDetails, setIsEditingRcDetails] = useState(false);
  const [isSavingRcDetails, setIsSavingRcDetails] = useState(false);
  const [rcTypeDraft, setRcTypeDraft] = useState('');
  const [rcCollectedByDraft, setRcCollectedByDraft] = useState('SELF');
  const [personNameDraft, setPersonNameDraft] = useState('');
  const [personMobileDraft, setPersonMobileDraft] = useState('');

  const { data: rcLookup } = useQuery({
    queryKey: ['loan-rc', l.vehicle_number],
    queryFn: async () => {
      try {
        const rcNum = encodeURIComponent(String(l.vehicle_number || '').replace(/\s+/g, '').toUpperCase());
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/rc-verification/data/${rcNum}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.success) return null;
        let rc = data.data || null;
        if (rc?.data) rc = rc.data;
        return rc;
      } catch {
        return null;
      }
    },
    enabled: !!l.vehicle_number,
    retry: false,
    staleTime: Infinity,
  });

  const rc = rcLookup || {};
  const v: any = {
    vehicle_number: l.vehicle_number || rc.rc_number || '',
    engine_number: l.engine_number || rc.vehicle_engine_number || rc.engine_number || '',
    chassis_number: l.chassis_number || rc.vehicle_chasi_number || rc.chassis_number || '',
    owner_name: l.owner_name || rc.owner_name || '',
    maker_name: l.maker_name || loan.car_make || rc.maker_description || rc.maker_name || '',
    maker_model: l.maker_model || rc.maker_model || '',
    fuel_type: l.fuel_type || rc.fuel_type || '',
    manufacturing_date: l.manufacturing_date || rc.manufacturing_date_formatted || rc.manufacturing_date || '',
    ownership_type: l.ownership_type || (rc.owner_number === '1' ? 'First Owner' : rc.owner_number === '2' ? 'Second Owner' : rc.owner_number === '3' ? 'Third Owner' : rc.owner_number === '4' ? 'Fourth Owner' : ''),
    case_type: l.case_type || '',
    registered_at: l.registered_at || rc.registered_at || '',
    pucc_valid_upto: l.pucc_valid_upto || rc.pucc_upto || rc.pucc_valid_upto || rc.pucc_expiry || '',
    financer: l.financer || l.old_hpn || rc.financer || '',
    insurance_company_name: l.insurance_company_name || l.insurance_company || rc.insurance_company || '',
    insurance_valid_upto: l.insurance_valid_upto || rc.insurance_upto || rc.insurance_valid_upto || rc.insurance_expiry || '',
    old_hpn: l.old_hpn || l.financer || rc.old_hpn || rc.financer || '',
    new_hpn: l.new_hpn || rc.new_hpn || rc.current_hpn || '',
    existing_lender: l.existing_lender || rc.existing_lender || rc.financer || '',
    rc_type: l.rc_type || rc.rc_type || '',
    rc_collected_by: l.rc_collected_by || '',
    rto_agent_name_rc: l.rto_agent_name_rc || l.rto_agent_name || '',
    rto_agent_mobile: l.rto_agent_mobile || '',
    banker_name: l.banker_name || '',
    banker_mobile: l.banker_mobile || '',
    finance_status: l.finance_status || rc.finance_status || (rc.financed ? 'Financed' : (rc.financer ? 'Active' : 'Not Financed')) || '',
    challan_details: l.challan_details || '',
  };

  const startEditingRcDetails = () => {
    setRcTypeDraft(v.rc_type || '');
    const collBy = (v.rc_collected_by || '').toUpperCase();
    setRcCollectedByDraft(collBy === 'SELF' ? 'SELF' : collBy === 'BANKER' ? 'BANKER' : collBy === 'RTO_AGENT' ? 'RTO_AGENT' : collBy || 'SELF');
    if (collBy === 'BANKER') {
      setPersonNameDraft(v.banker_name || v.rto_agent_name_rc || '');
      setPersonMobileDraft(v.banker_mobile || v.rto_agent_mobile || '');
    } else {
      setPersonNameDraft(v.rto_agent_name_rc || '');
      setPersonMobileDraft(v.rto_agent_mobile || '');
    }
    setIsEditingRcDetails(true);
  };

  const handleSaveRcDetails = async () => {
    try {
      setIsSavingRcDetails(true);
      const payload: any = {
        rc_type: rcTypeDraft || null,
        rc_collected_by: rcCollectedByDraft || null,
      };

      if (rcCollectedByDraft === 'BANKER') {
        payload.banker_name = personNameDraft || null;
        payload.banker_mobile = personMobileDraft || null;
      } else {
        payload.rto_agent_name_rc = personNameDraft || null;
        payload.rto_agent_mobile = personMobileDraft || null;
      }

      const res = await api.put(`/loans/${loan.id}`, payload);
      if (res?.error) throw new Error(res.error);

      toast.success('RC & Collection details updated successfully');
      setIsEditingRcDetails(false);
      queryClient.invalidateQueries({ queryKey: ['loan', String(loan.id)] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      console.error('Failed to update RC details:', err);
      toast.error(err.message || 'Failed to update');
    } finally {
      setIsSavingRcDetails(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vehicle Details */}
        <Card title="Vehicle Details" icon={<Car size={16} />} iconBg="bg-[#0024A2]/10" iconColor="text-[#0024A2]" accent="border-[#0024A2]/20">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Registration No" value={v.vehicle_number} />
            <Field label="Engine Number" value={v.engine_number} />
            <Field label="Chassis Number" value={v.chassis_number} />
            <Field label="Owner Name" value={v.owner_name} />
            <Field label="Maker" value={v.maker_name} />
            <Field label="Model" value={v.maker_model} />
            <Field label="Fuel Type" value={v.fuel_type} />
            <Field label="Manufacturing Date" value={fmtDate(v.manufacturing_date)} />
            <Field label="Ownership Type" value={v.ownership_type} />
            <Field label="Case Type" value={v.case_type} />
            <Field label="Registered At" value={v.registered_at} />
            <Field label="PUCC Valid Upto" value={fmtDate(v.pucc_valid_upto)} />

            <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Valuation & Age</p>
            </div>
            <Field label="Vehicle Age" value={getVehicleAge(v.manufacturing_date)} />
            <Field label="Tentative Car Value (IDV)" value={getTentativeValue(idvData) !== 'NA' ? getTentativeValue(idvData) : (loan?.tentative_value && Number(loan.tentative_value) > 0 ? `₹${Number(loan.tentative_value).toLocaleString('en-IN')}` : 'NA')} />
            <Field label="Existing Lender" value={v.existing_lender || v.financer || '—'} />
            <Field label="Finance Status" value={v.finance_status || '—'} />

            <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Insurance Details</p>
            </div>
            <Field label="Insurance Company Name" value={v.insurance_company_name} />
            <Field label="Insurance Expiry Date (Valid Upto)" value={fmtDate(v.insurance_valid_upto)} />
          </div>
        </Card>

        {/* RC & HPN Details */}
        <Card
          title="RC & HPN Details"
          icon={<Car size={16} />}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-600"
          accent="border-cyan-200/50"
          onEdit={isLoanOps && !isEditingRcDetails ? startEditingRcDetails : undefined}
        >
          {isEditingRcDetails ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Vehicle Number" value={v.vehicle_number || '—'} />
                <Field label="Old HPN (Financer)" value={v.old_hpn || '—'} />
                <Field label="New HPN (RC Updated)" value={v.new_hpn || '—'} />

                {/* RC Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">RC Type</label>
                  <select
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                    value={rcTypeDraft}
                    onChange={(e) => setRcTypeDraft(e.target.value)}
                    disabled={isSavingRcDetails}
                  >
                    <option value="">Select Option</option>
                    <option value="Physical RC">Physical RC</option>
                    <option value="Digital RC">Digital RC</option>
                  </select>
                </div>

                {/* RC Collected By */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">RC Collected By</label>
                  <select
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                    value={rcCollectedByDraft}
                    onChange={(e) => setRcCollectedByDraft(e.target.value)}
                    disabled={isSavingRcDetails}
                  >
                    <option value="SELF">Self</option>
                    <option value="BANKER">Banker</option>
                    <option value="RTO_AGENT">RTO Agent / Receiver</option>
                  </select>
                </div>

                {/* Person Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {rcCollectedByDraft === 'SELF' ? 'Processor Name' : rcCollectedByDraft === 'BANKER' ? 'Banker Name' : 'Receiver Name'}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                    value={personNameDraft}
                    onChange={(e) => setPersonNameDraft(e.target.value)}
                    placeholder={rcCollectedByDraft === 'SELF' ? 'Enter processor name' : rcCollectedByDraft === 'BANKER' ? 'Enter banker name' : 'Enter receiver name'}
                    disabled={isSavingRcDetails}
                  />
                </div>

                {/* Person Mobile */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {rcCollectedByDraft === 'SELF' ? 'Processor Mobile' : rcCollectedByDraft === 'BANKER' ? 'Banker Mobile' : 'Receiver Mobile'}
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-blue-500"
                    value={personMobileDraft}
                    onChange={(e) => setPersonMobileDraft(e.target.value)}
                    placeholder="Enter 10-digit mobile"
                    disabled={isSavingRcDetails}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsEditingRcDetails(false)}
                  disabled={isSavingRcDetails}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRcDetails}
                  disabled={isSavingRcDetails}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingRcDetails ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Vehicle Number" value={v.vehicle_number || '—'} />
              <Field label="Old HPN (Financer)" value={v.old_hpn || '—'} />
              <Field label="New HPN (RC Updated)" value={v.new_hpn || '—'} />
              <Field label="RC Type" value={v.rc_type || '—'} />
              <Field label="RC Collected By" value={v.rc_collected_by || '—'} />

              {(v.rc_collected_by === 'SELF' || v.rc_collected_by?.toLowerCase() === 'self') ? (
                <>
                  <Field label="Processor Name" value={v.rto_agent_name_rc || '—'} />
                  <Field label="Processor Mobile" value={v.rto_agent_mobile || '—'} />
                </>
              ) : (v.rc_collected_by === 'BANKER' || v.rc_collected_by?.toLowerCase() === 'banker') ? (
                <>
                  <Field label="Banker Name" value={v.banker_name || v.rto_agent_name_rc || '—'} />
                  <Field label="Banker Mobile" value={v.banker_mobile || v.rto_agent_mobile || '—'} />
                </>
              ) : (
                <>
                  <Field label="Receiver Name" value={v.rto_agent_name_rc || '—'} />
                  <Field label="Receiver Mobile" value={v.rto_agent_mobile || '—'} />
                </>
              )}

              {isDisbursedLoan && <PddStatusField status={l.pdd_status} />}
            </div>
          )}

          {v.challan_details && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Challan Details</p>
              {renderChallanDetails(v.challan_details)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
