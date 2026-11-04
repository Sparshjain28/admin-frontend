import { Car, FileText } from 'lucide-react';
import { Card, Field, PddStatusField, renderChallanDetails, SharedTabProps } from './shared';

export default function OpsView({ loan }: SharedTabProps) {
  const l = loan as any;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Vehicle Details" icon={<Car size={16} />} iconBg="bg-blue-500/10" iconColor="text-blue-600" accent="border-blue-200/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Registration No" value={l.vehicle_number || ''} />
          <Field label="Engine Number" value={l.engine_number || '—'} />
          <Field label="Chassis Number" value={l.chassis_number || '—'} />
          <Field label="Owner Name" value={l.owner_name || '—'} />
          <Field label="Maker" value={l.maker_name || loan.car_make || ''} />
          <Field label="Model" value={l.maker_model || '—'} />
          <Field label="Fuel Type" value={l.fuel_type || '—'} />
          <Field label="Manufacturing Date" value={l.manufacturing_date ? new Date(l.manufacturing_date).toLocaleDateString('en-IN') : '—'} />
          <Field label="Ownership Type" value={l.ownership_type || '—'} />
          <Field label="Case Type" value={l.case_type || '—'} />
          <Field label="Insurance Company" value={l.insurance_company_name || l.insurance_company || '—'} />
          <Field label="Insurance Valid Upto" value={l.insurance_valid_upto ? new Date(l.insurance_valid_upto).toLocaleDateString('en-IN') : '—'} />
          <Field label="PUCC Valid Upto" value={l.pucc_valid_upto ? new Date(l.pucc_valid_upto).toLocaleDateString('en-IN') : '—'} />
          <Field label="Registered At" value={l.registered_at || '—'} />
        </div>
      </Card>

      <Card title="RC & HPN Details" icon={<Car size={16} />} iconBg="bg-cyan-500/10" iconColor="text-cyan-600" accent="border-cyan-200/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Customer Name" value={loan.applicant_name || '—'} />
          <Field label="Vehicle Number" value={l.vehicle_number || '—'} />
          <Field label="Old HPN (Financer)" value={l.financer || '—'} />
          <Field label="New HPN (RC Updated)" value={l.new_hpn || '—'} />
          <Field label="Finance Status" value={l.finance_status || '—'} />
          <Field label="RC Type" value={l.rc_type || '—'} />
          {String(l.application_stage || '').toUpperCase() === 'DISBURSED' && <PddStatusField status={l.pdd_status} />}
        </div>
      </Card>

      <Card title="RC Collection" icon={<FileText size={16} />} iconBg="bg-indigo-500/10" iconColor="text-indigo-600" accent="border-indigo-200/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="RC Collected By" value={l.rc_collected_by || '—'} />
          {l.rc_collected_by === 'SELF' ? (
            <>
              <Field label="Processor Name" value={l.rto_agent_name_rc || l.rto_agent_name || '—'} />
              <Field label="Processor Mobile" value={l.rto_agent_mobile || '—'} />
            </>
          ) : l.rc_collected_by === 'BANKER' ? (
            <>
              <Field label="Banker Name" value={l.banker_name || '—'} />
              <Field label="Banker Mobile" value={l.banker_mobile || '—'} />
            </>
          ) : (
            <>
              <Field label="Receiver Name" value={l.rto_agent_name_rc || l.rto_agent_name || '—'} />
              <Field label="Receiver Mobile" value={l.rto_agent_mobile || '—'} />
            </>
          )}
          <Field label="Disbursement Date" value={l.disbursement_date ? new Date(l.disbursement_date).toLocaleDateString('en-IN') : '—'} />
        </div>
      </Card>

      <Card title="Challan Details" icon={<FileText size={16} />} iconBg="bg-amber-500/10" iconColor="text-amber-600" accent="border-amber-200/50">
        {(() => {
          const status = l.challan || 'No';
          let totalAmount = 0;
          if (l.challan_details) {
            try {
              const parsed = typeof l.challan_details === 'string'
                ? JSON.parse(l.challan_details)
                : l.challan_details;
              const challans = parsed.challans || (Array.isArray(parsed) ? parsed : []);
              totalAmount = challans.reduce((sum: number, c: any) => sum + Number(c.amount || c.fine_amount || c.challan_amount || 0), 0);
            } catch (e) { console.error(e); }
          }
          const value = status === 'Yes' ? `Yes (Total: ₹${totalAmount.toLocaleString('en-IN')})` : 'No';
          return (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
                <Field label="Challan Status" value={value} />
              </div>
              {renderChallanDetails(l.challan_details)}
            </>
          );
        })()}
      </Card>
    </div>
  );
}