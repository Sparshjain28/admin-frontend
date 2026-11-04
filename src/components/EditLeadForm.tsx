import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Lead, NewLeadRow as NewLeadRowType } from '@/types/lead';
import { api } from '@/services/api';
import {
  Check,
  ChevronDown,
  Search
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface EditLeadFormProps {
  editLead: Lead | null;
  editStatus: string;
  newLeadRows: NewLeadRowType[];
  leads: Lead[];
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  onUpdateStatus: (status: string) => void;
  onSave: () => void;
  saving?: boolean;
  onUpdateRow: (rowId: string, updates: Partial<NewLeadRowType>) => void;
  onRemoveRow: (rowId: string) => void;
  onSaveNewLead: (rowId: string) => void;
  onAddNewRow: () => void;
  onNewRow: () => void;
  handleTabSkipFilled: (e: React.KeyboardEvent<HTMLInputElement>, currentValue: string, nextFieldPlaceholder: string) => void;
}

const EditLeadForm = ({
  editLead,
  editStatus,
  onClose,
  onUpdateLead,
  onUpdateStatus,
  onSave,
  saving = false,
}: EditLeadFormProps) => {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const [banks, setBanks] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [advisorSearchOpen, setAdvisorSearchOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [banksRes, mainCardsRes, cardsRes, usersRes] = await Promise.all([
        api.getBanks().catch(() => ({ banks: [] })),
        api.getMainAppCreditCards().catch(() => ({ success: false, data: [] })),
        api.getCreditCards().catch(() => ({ records: [] })),
        api.getUsers(1, 1000).catch(() => ({ users: [] }))
      ]);

      const mainCards = (mainCardsRes?.success && Array.isArray(mainCardsRes.data)) ? mainCardsRes.data : [];
      const moduleCards = Array.isArray(cardsRes?.records) ? cardsRes.records : [];

      const combined: any[] = [];
      const seen = new Set<string>();

      // 1. Add Main App Products first
      for (const mc of mainCards) {
        const name = mc.product_name || mc.name;
        if (!name || name.trim() === '') continue;
        const key = name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            id: String(mc.id),
            name: name,
            bank: mc.bank_name || '',
            bankName: mc.bank_name || ''
          });
        }
      }

      // 2. Add Cards Module Products
      for (const cc of moduleCards) {
        const name = cc.name;
        if (!name || name.trim() === '') continue;
        const key = name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            id: String(cc.id),
            name: name,
            bank: cc.bank || cc.bankName || '',
            bankName: cc.bank || cc.bankName || ''
          });
        }
      }

      setCards(combined);

      // 3. Compile full bank list from master banks + cards
      const bankList = banksRes?.banks || [];
      const bankNames = new Set(bankList.map((b: any) => (b.name || '').toLowerCase().trim()));
      combined.forEach(c => {
        if (c.bank && !bankNames.has(c.bank.toLowerCase().trim())) {
          bankNames.add(c.bank.toLowerCase().trim());
          bankList.push({ id: `b-${c.bank}`, name: c.bank });
        }
      });

      setBanks(bankList);
      setUsers(usersRes?.users || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  if (!editLead) return null;

  // Determine if this is a personal loan
  const isPersonalLoan = editLead.creditCard?.type?.toUpperCase().includes('PERSONAL_LOAN') ||
    editLead.creditCard?.type?.toUpperCase().includes('PERSONAL LOAN');

  // Get status options based on product type
  const getStatusOptions = () => {
    if (isPersonalLoan) {
      if (!isAdmin) {
        return ['Generated', 'In_Process', 'Rejected'];
      }
      return ['Generated', 'In_Process', 'Approved', 'Rejected', 'Disbursed'];
    }
    if (!isAdmin) {
      return ['Generated', 'In_Process', 'Rejected'];
    }
    return ['Generated', 'In_Process', 'Approved', 'Rejected'];
  };

  // Personal Loan Form
  if (isPersonalLoan) {
    return (
      <Dialog open={!!editLead} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Edit Lead - {editLead.lead_id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Name</Label>
                <Input
                  value={editLead.applicant_name}
                  onChange={e => onUpdateLead({ ...editLead, applicant_name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editLead.applicant_phone}
                  onChange={e => onUpdateLead({ ...editLead, applicant_phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editLead.applicant_email || ''}
                  onChange={e => onUpdateLead({ ...editLead, applicant_email: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Product & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Product</Label>
                <Select
                  value={
                    editLead.card_name && editLead.card_name !== '-'
                      ? editLead.card_name
                      : (cards.find(c => c.id === editLead.creditCardId)?.name || 'none')
                  }
                  onValueChange={v => {
                    if (v === 'none') {
                      onUpdateLead({ ...editLead, creditCardId: '', card_name: '', bank_name: '' });
                    } else if (v === 'NA') {
                      onUpdateLead({ ...editLead, creditCardId: 'NA', card_name: 'NA', bank_name: 'NA' });
                    } else {
                      const selectedCard = cards.find(card => card.name === v || card.id === v);
                      const bankName = selectedCard?.bank || selectedCard?.bankName || '';
                      const cardName = selectedCard?.name || v;
                      onUpdateLead({ ...editLead, creditCardId: selectedCard?.id || v, card_name: cardName, bank_name: bankName });
                    }
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Select Product -</SelectItem>
                    <SelectItem value="NA">NA</SelectItem>
                    {editLead.card_name &&
                      editLead.card_name !== 'none' &&
                      editLead.card_name !== 'NA' &&
                      !cards.some(c => c.name?.toLowerCase().trim() === editLead.card_name?.toLowerCase().trim()) && (
                        <SelectItem value={editLead.card_name}>
                          {editLead.card_name}
                        </SelectItem>
                    )}
                    {cards.filter(card => card.name && card.name.trim() !== '' && card.name !== 'NA').map(card => (
                      <SelectItem key={card.id || card.name} value={card.name}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Advisor</Label>
                <Popover open={advisorSearchOpen} onOpenChange={setAdvisorSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={advisorSearchOpen}
                      className="w-full justify-between text-xs h-9 font-normal px-3"
                    >
                      {editLead.advisor_id
                        ? (users.find(u => u.id === editLead.advisor_id)?.name || editLead.advisor_name || 'System')
                        : 'System'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Search advisor..." className="h-8 text-xs" />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty className="text-xs py-2">No advisor found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="system"
                            onSelect={() => {
                              onUpdateLead({ ...editLead, advisor_id: '', advisor_name: 'System' });
                              setAdvisorSearchOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3",
                                !editLead.advisor_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            System
                          </CommandItem>
                          {users.filter(user => user.id && user.name && user.name.trim() !== '').map(user => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.id}`}
                              onSelect={() => {
                                onUpdateLead({ ...editLead, advisor_id: user.id, advisor_name: user.name });
                                setAdvisorSearchOpen(false);
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  editLead.advisor_id === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-[10px] text-muted-foreground">{user.id}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Status *</Label>
                  {!isAdmin && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">(Admin only for Approved)</span>}
                </div>
                <Select 
                  value={editStatus || 'Generated'} 
                  onValueChange={onUpdateStatus}
                  disabled={!isAdmin && (editLead.status === 'Approved' || editLead.status?.toLowerCase() === 'approved')}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map(status => (
                      <SelectItem key={status} value={status}>
                        {status === 'In_Process' ? 'In Process' : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disbursed Amount & Application No */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Disbursed Amount</Label>
                <Input
                  value={editLead.disbursed_amount || ''}
                  onChange={e => onUpdateLead({ ...editLead, disbursed_amount: e.target.value })}
                  placeholder="Enter amount"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Application No (MIS)</Label>
                <Input
                  value={editLead.application_no || ''}
                  onChange={e => onUpdateLead({ ...editLead, application_no: e.target.value })}
                  placeholder="Enter application number"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Deducted Amount</Label>
                <Input
                  value={editLead.deduction || 0}
                  disabled
                  className="text-xs h-9 bg-muted/50"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <Label className="text-xs">Remark</Label>
              <Textarea
                value={editLead.remark || ''}
                onChange={e => onUpdateLead({ ...editLead, remark: e.target.value })}
                placeholder="Enter remarks..."
                className="text-xs min-h-20"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs h-9" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground text-xs h-9" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Credit Card Form (original)
  return (
    <Dialog open={!!editLead} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Edit Lead - {editLead.lead_id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Name</Label>
                <Input
                  value={editLead.applicant_name}
                  onChange={e => onUpdateLead({ ...editLead, applicant_name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={editLead.applicant_phone}
                  onChange={e => onUpdateLead({ ...editLead, applicant_phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editLead.applicant_email || ''}
                  onChange={e => onUpdateLead({ ...editLead, applicant_email: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Product & Status */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bank</Label>
                <Select
                  value={editLead.bank_name && editLead.bank_name !== '—' ? editLead.bank_name : 'none'}
                  onValueChange={v => {
                    if (v === 'none') {
                      onUpdateLead({ ...editLead, bank_name: '' });
                    } else {
                      onUpdateLead({ ...editLead, bank_name: v });
                    }
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Select Bank -</SelectItem>
                    <SelectItem value="NA">NA</SelectItem>
                    {banks.filter(bank => bank.name && bank.name.trim() !== '' && bank.name !== 'NA').map(bank => (
                      <SelectItem key={bank.id || bank.name} value={bank.name}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Product</Label>
                <Select
                  value={
                    editLead.card_name && editLead.card_name !== '-'
                      ? editLead.card_name
                      : (cards.find(c => c.id === editLead.creditCardId)?.name || 'none')
                  }
                  onValueChange={v => {
                    if (v === 'none') {
                      onUpdateLead({ ...editLead, card_name: '', creditCardId: '' });
                    } else if (v === 'NA') {
                      onUpdateLead({ ...editLead, card_name: 'NA', creditCardId: 'NA' });
                    } else {
                      const selectedCard = cards.find(card => card.name === v || card.id === v);
                      const cardName = selectedCard?.name || v;
                      const bankName = selectedCard?.bank || selectedCard?.bankName || editLead.bank_name;
                      onUpdateLead({
                        ...editLead,
                        card_name: cardName,
                        creditCardId: selectedCard?.id || v,
                        bank_name: (bankName && bankName !== '—') ? bankName : editLead.bank_name
                      });
                    }
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Select Product -</SelectItem>
                    <SelectItem value="NA">NA</SelectItem>
                    {/* Always ensure the lead's current card_name is present in options */}
                    {editLead.card_name &&
                      editLead.card_name !== 'none' &&
                      editLead.card_name !== 'NA' &&
                      !cards.some(c => c.name?.toLowerCase().trim() === editLead.card_name?.toLowerCase().trim()) && (
                        <SelectItem value={editLead.card_name}>
                          {editLead.card_name}
                        </SelectItem>
                    )}
                    {cards
                      .filter(card => {
                        // If bank is selected, show that bank's cards (or current card)
                        if (editLead.bank_name && editLead.bank_name !== 'none' && editLead.bank_name !== '—' && editLead.bank_name !== 'NA') {
                          const bNorm = editLead.bank_name.toLowerCase().trim();
                          const cardBankNorm = (card.bank || card.bankName || '').toLowerCase().trim();
                          if (cardBankNorm && (cardBankNorm.includes(bNorm) || bNorm.includes(cardBankNorm))) {
                            return true;
                          }
                          if (card.name === editLead.card_name) return true;
                          return false;
                        }
                        return Boolean(card.name && card.name.trim() !== '' && card.name !== 'NA');
                      })
                      .map(card => (
                        <SelectItem key={card.id || card.name} value={card.name}>
                          {card.name} {card.bank ? `(${card.bank})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Status *</Label>
                  {!isAdmin && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">(Admin only for Approved)</span>}
                </div>
                <Select 
                  value={editStatus || 'Generated'} 
                  onValueChange={onUpdateStatus}
                  disabled={!isAdmin && (editLead.status === 'Approved' || editLead.status?.toLowerCase() === 'approved')}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Generated">Generated</SelectItem>
                    <SelectItem value="In_Process">In Process</SelectItem>
                    {isAdmin && <SelectItem value="Approved">Approved</SelectItem>}
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Activation Status</Label>
                  {!isAdmin && <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">(Admin only)</span>}
                </div>
                <Select 
                  value={editLead.activation_status ? editLead.activation_status : 'dash'} 
                  onValueChange={v => onUpdateLead({ ...editLead, activation_status: v === 'dash' ? '-' : v })}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className={`text-xs h-9 ${!isAdmin ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dash">-</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Card Closed">Card Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Card Variant (MIS)</Label>
                <Input
                  value={editLead.card_variant || ''}
                  onChange={e => onUpdateLead({ ...editLead, card_variant: e.target.value })}
                  placeholder="Enter variant"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Application No (MIS)</Label>
                <Input
                  value={editLead.application_no || ''}
                  onChange={e => onUpdateLead({ ...editLead, application_no: e.target.value })}
                  placeholder="Enter application number"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Deducted Amount</Label>
                <Input
                  value={editLead.deduction || 0}
                  disabled
                  className="text-xs h-9 bg-muted/50"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* KYC & Customer Type */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Customer Type</Label>
                <Select value={editLead.cust_type ? editLead.cust_type : 'dash'} onValueChange={v => onUpdateLead({ ...editLead, cust_type: v === 'dash' ? '-' : v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dash">-</SelectItem>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="NTB">NTB</SelectItem>
                    <SelectItem value="ETC">ETCC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">VKYC Status</Label>
                <Select value={editLead.vkyc_status ? editLead.vkyc_status : 'dash'} onValueChange={v => onUpdateLead({ ...editLead, vkyc_status: v === 'dash' ? '-' : v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dash">-</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">BKYC Status</Label>
                <Select value={editLead.bkyc_status ? editLead.bkyc_status : 'dash'} onValueChange={v => onUpdateLead({ ...editLead, bkyc_status: v === 'dash' ? '-' : v })}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dash">-</SelectItem>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card Issued Date */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Card Issued Date (DD/MM/YY)</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={editLead.card_issued_date ? (() => {
                      const dateStr = editLead.card_issued_date;
                      if (!dateStr) return '';

                      // Check if it's ISO format (from database)
                      if (dateStr.includes('T') || dateStr.includes('-')) {
                        // ISO format: 2026-05-21T00:00:00.000Z or 2026-05-21
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          return `${year}-${month}-${day}`;
                        }
                      } else if (dateStr.includes('/')) {
                        // DD/MM/YY format
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                          const day = parts[0];
                          const month = parts[1];
                          const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                          return `${year}-${month}-${day}`;
                        }
                      }
                      return '';
                    })() : ''}
                    onChange={e => {
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear()).slice(-2);
                        onUpdateLead({ ...editLead, card_issued_date: `${day}/${month}/${year}` });
                      } else {
                        onUpdateLead({ ...editLead, card_issued_date: '' });
                      }
                    }}
                    className="text-xs h-9"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Textarea
              value={editLead.remark || ''}
              onChange={e => onUpdateLead({ ...editLead, remark: e.target.value })}
              placeholder="Enter remarks..."
              className="text-xs min-h-20"
            />
          </div>

          {/* Advisor Info */}
          <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
            <h3 className="text-sm font-semibold">Advisor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Advisor</Label>
                <Popover open={advisorSearchOpen} onOpenChange={setAdvisorSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={advisorSearchOpen}
                      className="w-full justify-between text-xs h-9 font-normal px-3"
                    >
                      {editLead.advisor_id
                        ? (users.find(u => u.id === editLead.advisor_id)?.name || editLead.advisor_name || 'System')
                        : 'System'}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Search advisor..." className="h-8 text-xs" />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty className="text-xs py-2">No advisor found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="system"
                            onSelect={() => {
                              onUpdateLead({ ...editLead, advisor_id: '', advisor_name: 'System' });
                              setAdvisorSearchOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3",
                                !editLead.advisor_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            System
                          </CommandItem>
                          {users.filter(user => user.id && user.name && user.name.trim() !== '').map(user => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.id}`}
                              onSelect={() => {
                                onUpdateLead({ ...editLead, advisor_id: user.id, advisor_name: user.name });
                                setAdvisorSearchOpen(false);
                              }}
                              className="text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  editLead.advisor_id === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-[10px] text-muted-foreground">{user.id}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Advisor ID</Label>
                <Input
                  value={editLead.advisor_id || '-'}
                  disabled
                  className="text-xs h-9 bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1 text-xs h-9" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground text-xs h-9" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLeadForm;
