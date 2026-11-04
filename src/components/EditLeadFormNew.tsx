import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lead } from '@/types/lead';
import { User, CreditCard, FileText, Calendar, Settings } from 'lucide-react';

interface EditLeadFormProps {
  editLead: Lead | null;
  editStatus: string;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  onUpdateStatus: (status: string) => void;
  onSave: () => void;
}

const EditLeadForm = ({
  editLead,
  editStatus,
  onClose,
  onUpdateLead,
  onUpdateStatus,
  onSave,
}: EditLeadFormProps) => {
  const [loading, setLoading] = useState(false);

  if (!editLead) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave();
    } finally {
      setLoading(false);
    }
  };

  // Format date for display (DD/MM/YY)
  const formatDateForDisplay = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Parse date from DD/MM/YY format to ISO string
  const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate || displayDate.trim() === '') return '';
    try {
      const parts = displayDate.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        // Convert 2-digit year to 4-digit
        if (year.length === 2) {
          year = parseInt(year) > 50 ? '19' + year : '20' + year;
        }
        return `${year}-${month}-${day}`;
      }
    } catch {
      return '';
    }
    return displayDate;
  };

  return (
    <Dialog open={!!editLead} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Edit Lead - {editLead.lead_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-4 h-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicant_name">Customer Name *</Label>
                  <Input
                    id="applicant_name"
                    value={editLead.applicant_name}
                    onChange={e => onUpdateLead({ ...editLead, applicant_name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicant_phone">Phone Number *</Label>
                  <Input
                    id="applicant_phone"
                    value={editLead.applicant_phone}
                    onChange={e => onUpdateLead({ ...editLead, applicant_phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant_email">Email Address</Label>
                <Input
                  id="applicant_email"
                  type="email"
                  value={editLead.applicant_email || ''}
                  onChange={e => onUpdateLead({ ...editLead, applicant_email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-4 h-4" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={editLead.card_name}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={editLead.bank_name}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Advisor</Label>
                  <Input
                    value={editLead.advisor_name}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_variant">Card Variant</Label>
                  <Input
                    id="card_variant"
                    value={editLead.card_variant || ''}
                    onChange={e => onUpdateLead({ ...editLead, card_variant: e.target.value })}
                    placeholder="Enter card variant"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-4 h-4" />
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={editStatus} onValueChange={onUpdateStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Generated">Generated</SelectItem>
                      <SelectItem value="In_Process">In Process</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activation_status">Activation Status</Label>
                  <Select 
                    value={editLead.activation_status || '-'} 
                    onValueChange={v => onUpdateLead({ ...editLead, activation_status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Card Closed">Card Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust_type">Customer Type</Label>
                  <Select 
                    value={editLead.cust_type || '-'} 
                    onValueChange={v => onUpdateLead({ ...editLead, cust_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="ETB">ETB</SelectItem>
                      <SelectItem value="NTB">NTB</SelectItem>
                      <SelectItem value="NTC">NTC</SelectItem>
                      <SelectItem value="ETC">ETC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vkyc_status">VKYC Status</Label>
                  <Select 
                    value={editLead.vkyc_status || '-'} 
                    onValueChange={v => onUpdateLead({ ...editLead, vkyc_status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bkyc_status">BKYC Status</Label>
                  <Select 
                    value={editLead.bkyc_status || '-'} 
                    onValueChange={v => onUpdateLead({ ...editLead, bkyc_status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_no">Application Number</Label>
                <Input
                  id="application_no"
                  value={editLead.application_no || ''}
                  onChange={e => onUpdateLead({ ...editLead, application_no: e.target.value })}
                  placeholder="Enter application number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-4 h-4" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card_issued_date">Card Issued Date (DD/MM/YY)</Label>
                <Input
                  id="card_issued_date"
                  value={formatDateForDisplay(editLead.card_issued_date)}
                  onChange={e => {
                    const isoDate = parseDateFromDisplay(e.target.value);
                    onUpdateLead({ ...editLead, card_issued_date: isoDate });
                  }}
                  placeholder="DD/MM/YY (e.g., 21/05/26)"
                />
                <p className="text-xs text-muted-foreground">
                  Enter date in DD/MM/YY format (e.g., 21/05/26 for May 21, 2026)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">Remarks</Label>
                <Textarea
                  id="remark"
                  value={editLead.remark || ''}
                  onChange={e => onUpdateLead({ ...editLead, remark: e.target.value })}
                  placeholder="Enter any remarks or notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLeadForm;