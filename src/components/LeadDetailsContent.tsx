import React from 'react'
import { useAuth } from '@/hooks/useAuth';

type Lead = any

export default function LeadDetailsContent({ lead }: { lead: Lead }) {
  const { userRole } = useAuth();
  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || String(val).trim() === '') return '-';
    const cleaned = String(val).replace(/[₹,\s]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? `₹${num.toLocaleString()}` : String(val);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Lead ID & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-accent/5 rounded-lg p-3 border border-accent/20">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Lead ID</p>
          <p className="text-sm font-mono font-bold text-accent">{lead.lead_id}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Status</p>
          <p className="text-sm font-bold text-blue-700">{lead.status?.replace(/_/g, ' ')}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Disbursed Amount</p>
          <p className="text-sm font-bold text-foreground">{formatCurrency((lead as any).disbursed_amount)}</p>
        </div>
      </div>

      {/* Applicant Information */}
      <div>
        <h3 className="font-semibold text-xs mb-2 text-foreground">Applicant Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Name</p>
            <p className="text-xs font-medium text-foreground">{lead.applicant_name}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Phone</p>
            <p className="text-xs font-medium text-foreground">{lead.applicant_phone}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2 md:col-span-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Email</p>
            <p className="text-xs font-medium text-foreground truncate">{lead.applicant_email || '-'}</p>
          </div>
        </div>
      </div>

      {/* Credit Card Information */}
      <div>
        <h3 className="font-semibold text-xs mb-2 text-foreground">Credit Card Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Product Name</p>
            <p className="text-xs font-medium text-foreground">{lead.card_name}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Bank</p>
            <p className="text-xs font-medium text-foreground">{lead.bank_name}</p>
          </div>
          {lead.creditCard && (
            <>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Card Type</p>
                <p className="text-xs font-medium text-foreground capitalize">{lead.creditCard.type?.replace(/_/g, ' ') || '-'}</p>
              </div>
              {userRole !== 'employee' && userRole !== 'team_leader' && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5"> Commission</p>
                  <p className="text-xs font-bold text-green-600">
                    {lead.creditCard.type?.toUpperCase().includes('PERSONAL_LOAN') || lead.creditCard.type?.toUpperCase().includes('PERSONAL LOAN')
                      ? `${lead.creditCard.dsaCommission || 0}%`
                      : `₹${lead.creditCard.dsaCommission?.toLocaleString() || '0'}`}
                  </p>
                </div>
              )}
              {lead.creditCard.joiningFee && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Joining Fee</p>
                  <p className="text-xs font-medium text-foreground">{lead.creditCard.joiningFee}</p>
                </div>
              )}
              {lead.creditCard.renewalFee && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Renewal Fee</p>
                  <p className="text-xs font-medium text-foreground">{lead.creditCard.renewalFee}</p>
                </div>
              )}
              {lead.creditCard.rewardPoints && (
                <div className="bg-muted/30 rounded-lg p-2 md:col-span-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Reward Points</p>
                  <p className="text-xs font-medium text-foreground">{lead.creditCard.rewardPoints}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Application Details */}
      <div>
        <h3 className="font-semibold text-xs mb-2 text-foreground">Application</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Application No</p>
            <p className="text-xs font-medium text-foreground">{lead.application_no || '-'}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="text-[9px] text-blue-600 uppercase font-semibold mb-0.5">Cust Type</p>
            <p className="text-xs font-bold text-blue-700">{lead.cust_type || '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Status</p>
            <p className="text-xs font-medium text-foreground">{lead.activation_status || '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Card Variant</p>
            <p className="text-xs font-medium text-foreground">{lead.card_variant || '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">VKYC Status</p>
            <p className="text-xs font-medium text-foreground">{lead.vkyc_status || '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">BKYC Status</p>
            <p className="text-xs font-medium text-foreground">{lead.bkyc_status || '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Card Issued Date</p>
            <p className="text-xs font-medium text-foreground">{lead.card_issued_date ? (() => {
              const dateStr = lead.card_issued_date;
              // If it's ISO format with time, extract just the date part
              if (dateStr.includes('T')) {
                return dateStr.split('T')[0];
              }
              // If it's DD/MM/YY format, return as is
              return dateStr;
            })() : '-'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Disbursed Amount</p>
            <p className="text-xs font-medium text-foreground">{formatCurrency((lead as any).disbursed_amount)}</p>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <h3 className="font-semibold text-xs mb-2 text-foreground">Remarks</h3>
        <div className="bg-muted/30 rounded-lg p-3 border border-border/60">
          <p className="text-xs font-medium text-foreground whitespace-pre-wrap break-words">
            {lead.remark || '-'}
          </p>
        </div>
      </div>

      {/* Advisor Details */}
      {lead.advisor && (
        <div>
          <h3 className="font-semibold text-xs mb-2 text-foreground">Advisor Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Name</p>
              <p className="text-xs font-medium text-foreground">{lead.advisor.name || '-'}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Email</p>
              <p className="text-xs font-medium text-foreground truncate">{lead.advisor.email || '-'}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">PAN Number</p>
              <p className="text-xs font-mono font-medium text-foreground">{lead.advisor?.userPAN?.panNumber || '-'}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Bank Account</p>
              <p className="text-xs font-mono font-medium text-foreground">{lead.advisor.bankAccount || '-'}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">IFSC Code</p>
              <p className="text-xs font-mono font-medium text-foreground">{lead.advisor.ifsc || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border">
        <div className="bg-muted/20 rounded-lg p-2">
          <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Created</p>
          <p className="text-xs font-medium text-foreground">{lead.created_at || '-'}</p>
        </div>
        <div className="bg-muted/20 rounded-lg p-2 md:col-span-3">
          <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-0.5">Updated</p>
          <p className="text-xs font-medium text-foreground">{lead.updated_at || '-'}</p>
        </div>
      </div>
    </div>
  )
}
