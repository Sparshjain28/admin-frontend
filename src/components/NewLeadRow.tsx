import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useRole } from '@/contexts/RoleContext';

interface NewLeadRowProps {
  row: {
    id: string;
    customer_name: string;
    lead_id: string;
    lead_db_id: string;
    phone: string;
    email: string;
    card_name: string;
    bank_name: string;
    status: string;
    activation_status: string;
    card_variant: string;
    application_no: string;
    cust_type: string;
    vkyc_status: string;
    bkyc_status: string;
    card_issued_date: string;
    remark: string;
    advisor_name: string;
    userSearchResults: any[];
    showUserDropdown: boolean;
    selectedDropdownIndex: number;
  };
  onUpdateRow: (rowId: string, updates: any) => void;
  onRemoveRow: (rowId: string) => void;
  onSave: (rowId: string) => void;
  onAddNew: () => void;
  existingLeads: any[];
}

const NewLeadRow = ({ row, onUpdateRow, onRemoveRow, onSave, onAddNew, existingLeads }: NewLeadRowProps) => {
  const { displayName, authUser } = useRole();
  const dropdownRef = useRef<HTMLDivElement>(null);
  /** Skip input blur while choosing from dropdown (blur runs before click in some cases). */
  const pickingLeadRef = useRef(false);

  // Auto-scroll to selected item when dropdown index changes
  useEffect(() => {
    if (row.selectedDropdownIndex >= 0 && dropdownRef.current) {
      const selectedItem = dropdownRef.current.querySelector(`[data-index="${row.selectedDropdownIndex}"]`);
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [row.selectedDropdownIndex, row.showUserDropdown]);

  const handleUserSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      onUpdateRow(row.id, { userSearchResults: [], showUserDropdown: false, selectedDropdownIndex: -1 });
      return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const matchingLeads = existingLeads.filter(lead => {
      const leadId = (lead.lead_id || '').toLowerCase();
      const applicantName = (lead.applicant_name || '').toLowerCase();
      
      // Exact start match - Lead ID or name should START with search term
      return leadId.startsWith(searchLower) || applicantName.startsWith(searchLower);
    });
    
    onUpdateRow(row.id, {
      userSearchResults: matchingLeads,
      showUserDropdown: matchingLeads.length > 0,
      selectedDropdownIndex: matchingLeads.length > 0 ? 0 : -1
    });
  };

  const handleSelectUser = (lead: any) => {
    pickingLeadRef.current = true;
    onUpdateRow(row.id, {
      customer_name: lead.applicant_name || '',
      lead_id: lead.lead_id || '',       // Display ID (like ABC123)
      lead_db_id: lead.id || '',         // Database UUID for API calls
      phone: lead.applicant_phone || '',
      email: lead.applicant_email || '',
      card_name: lead.card_name || '',
      bank_name: lead.bank_name || '',
      status: lead.status || 'Generated',
      activation_status: lead.activation_status || '-',
      card_variant: lead.card_variant || '',
      application_no: lead.application_no || '',
      cust_type: lead.cust_type || '-',
      vkyc_status: lead.vkyc_status || '-',
      bkyc_status: lead.bkyc_status || '-',
      card_issued_date: lead.card_issued_date ? String(lead.card_issued_date).split('T')[0].split(' ')[0] : '',
      remark: lead.remark || '',
      showUserDropdown: false,
      userSearchResults: [],
      selectedDropdownIndex: -1,
      advisor_name: lead.advisor_name || '',
      searchQuery: '', // Clear search query after selection
    });
    queueMicrotask(() => {
      pickingLeadRef.current = false;
    });
  };

  // Handle search - different from customer name
  const handleSearch = (searchTerm: string) => {
    onUpdateRow(row.id, { searchQuery: searchTerm });
    
    if (!searchTerm.trim()) {
      onUpdateRow(row.id, { userSearchResults: [], showUserDropdown: false, selectedDropdownIndex: -1 });
      return;
    }
    
    const searchLower = searchTerm.toLowerCase();
    const matchingLeads = existingLeads.filter(lead =>
      (lead.lead_id?.toLowerCase() ?? '').includes(searchLower) ||
      (lead.applicant_name?.toLowerCase() ?? '').includes(searchLower)
    );
    
    onUpdateRow(row.id, {
      userSearchResults: matchingLeads,
      showUserDropdown: matchingLeads.length > 0,
      selectedDropdownIndex: matchingLeads.length > 0 ? 0 : -1
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (row.showUserDropdown && row.userSearchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateRow(row.id, { selectedDropdownIndex: Math.min(row.selectedDropdownIndex + 1, row.userSearchResults.length - 1) });
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateRow(row.id, { selectedDropdownIndex: Math.max(row.selectedDropdownIndex - 1, 0) });
        return;
      } else if (e.key === 'Enter' && row.selectedDropdownIndex >= 0) {
        e.preventDefault();
        handleSelectUser(row.userSearchResults[row.selectedDropdownIndex]);
        return;
      } else if (e.key === 'Escape') {
        onUpdateRow(row.id, { showUserDropdown: false, selectedDropdownIndex: -1 });
        return;
      }
    }
  };

  return (
    <tr className="hover:bg-accent/5 bg-blue-50/30">
      <td className="border border-border p-0 relative">
        <div className="flex flex-col gap-0.5">
          {row.lead_id && (
            <span className="text-[8px] text-accent font-mono px-1">{row.lead_id}</span>
          )}
          <Input 
            value={row.customer_name} 
            onChange={e => {
              const value = e.target.value;
              onUpdateRow(row.id, { customer_name: value });
              
              // Real-time search as user types
              if (!value.trim()) {
                onUpdateRow(row.id, { userSearchResults: [], showUserDropdown: false, selectedDropdownIndex: -1 });
                return;
              }
              
              const searchLower = value.toLowerCase().trim();
              const matchingLeads = existingLeads.filter(lead => {
                const leadId = (lead.lead_id || '').toLowerCase();
                const applicantName = (lead.applicant_name || '').toLowerCase();
                
                // Exact start match - Lead ID or name should START with search term
                return leadId.startsWith(searchLower) || applicantName.startsWith(searchLower);
              });
              
              onUpdateRow(row.id, {
                userSearchResults: matchingLeads,
                showUserDropdown: matchingLeads.length > 0,
                selectedDropdownIndex: matchingLeads.length > 0 ? 0 : -1
              });
            }}
            onBlur={() => {
              // Delay closing dropdown to allow click to register
              setTimeout(() => {
                if (!pickingLeadRef.current) {
                  onUpdateRow(row.id, { showUserDropdown: false, selectedDropdownIndex: -1 });
                }
              }, 200);
            }}
            onKeyDown={handleKeyDown}
            className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
            placeholder="Type Lead ID or name..."
          />
        </div>
        {row.showUserDropdown && row.userSearchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="lead-search-dropdown absolute top-full left-0 w-full bg-white border border-border shadow-lg z-[300] max-h-[20vh] overflow-y-auto"
          >
            {row.userSearchResults.map((lead, index) => (
              <div
                key={lead.id ?? `${lead.lead_id}-${index}`}
                data-index={index}
                onClick={() => {
                  pickingLeadRef.current = true;
                  handleSelectUser(lead);
                  setTimeout(() => {
                    pickingLeadRef.current = false;
                  }, 300);
                }}
                className={`px-2 py-1.5 cursor-pointer border-b border-border last:border-0 ${
                  index === row.selectedDropdownIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
              >
                <p className="text-[11px] font-bold text-accent font-mono">{lead.lead_id}</p>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="border border-border p-0">
        <Input 
          value={row.phone} 
          onChange={e => onUpdateRow(row.id, { phone: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
          placeholder="Phone"
          maxLength={10}
        />
      </td>
      <td className="border border-border p-0">
        <Input 
          value={row.email} 
          onChange={e => onUpdateRow(row.id, { email: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
          placeholder="Email"
        />
      </td>
      <td className="border border-border p-0 bg-muted/20">
        <Input 
          value={row.card_name}
          disabled
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 bg-muted/50 cursor-not-allowed"
          placeholder="Product"
        />
      </td>
      <td className="border border-border p-0 bg-muted/20">
        <Input 
          value={row.bank_name}
          disabled
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 bg-muted/50 cursor-not-allowed"
          placeholder="Bank"
        />
      </td>
      <td className="border border-border p-0 bg-muted/20">
        <Input 
          value={row.advisor_name || authUser?.name || displayName || 'Current User'}
          disabled
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 bg-muted/50 cursor-not-allowed"
          placeholder="Advisor"
        />
      </td>
      <td className="border border-border p-0">
        <Select value={row.status} onValueChange={v => onUpdateRow(row.id, { status: v })}>
          <SelectTrigger className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus:ring-1 focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="Generated" className="text-[10px]">Generated</SelectItem>
            <SelectItem value="In_Process" className="text-[10px]">In Process</SelectItem>
            <SelectItem value="Approved" className="text-[10px]">Approved</SelectItem>
            <SelectItem value="Rejected" className="text-[10px]">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="border border-border p-0">
        <Select value={row.activation_status} onValueChange={v => onUpdateRow(row.id, { activation_status: v })}>
          <SelectTrigger className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus:ring-1 focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="-" className="text-[10px]">-</SelectItem>
            <SelectItem value="Active" className="text-[10px]">Active</SelectItem>
            <SelectItem value="Inactive" className="text-[10px]">Inactive</SelectItem>
            <SelectItem value="Card Closed" className="text-[10px]">Card Closed</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="border border-border p-0">
        <Input 
          value={row.card_variant}
          onChange={e => onUpdateRow(row.id, { card_variant: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
          placeholder="Card Variant"
        />
      </td>
      <td className="border border-border p-0">
        <Input 
          value={row.application_no}
          onChange={e => onUpdateRow(row.id, { application_no: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
          placeholder="Application No"
        />
      </td>
      <td className="border border-border p-0">
        <Select value={row.cust_type} onValueChange={v => onUpdateRow(row.id, { cust_type: v })}>
          <SelectTrigger className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus:ring-1 focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="-" className="text-[10px]">-</SelectItem>
            <SelectItem value="ETB" className="text-[10px]">ETB</SelectItem>
            <SelectItem value="NTB" className="text-[10px]">NTB</SelectItem>
            <SelectItem value="NTC" className="text-[10px]">NTC</SelectItem>
            <SelectItem value="ETC" className="text-[10px]">ETC</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="border border-border p-0">
        <Select value={row.vkyc_status} onValueChange={v => onUpdateRow(row.id, { vkyc_status: v })}>
          <SelectTrigger className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus:ring-1 focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="-" className="text-[10px]">-</SelectItem>
            <SelectItem value="PENDING" className="text-[10px]">PENDING</SelectItem>
            <SelectItem value="EXPIRED" className="text-[10px]">EXPIRED</SelectItem>
            <SelectItem value="REJECTED" className="text-[10px]">REJECTED</SelectItem>
            <SelectItem value="COMPLETED" className="text-[10px]">COMPLETED</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="border border-border p-0">
        <Select value={row.bkyc_status} onValueChange={v => onUpdateRow(row.id, { bkyc_status: v })}>
          <SelectTrigger className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus:ring-1 focus:ring-accent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            <SelectItem value="-" className="text-[10px]">-</SelectItem>
            <SelectItem value="PENDING" className="text-[10px]">PENDING</SelectItem>
            <SelectItem value="EXPIRED" className="text-[10px]">EXPIRED</SelectItem>
            <SelectItem value="REJECTED" className="text-[10px]">REJECTED</SelectItem>
            <SelectItem value="COMPLETED" className="text-[10px]">COMPLETED</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="border border-border p-0">
        <Input 
          type="date"
          value={row.card_issued_date}
          onChange={e => onUpdateRow(row.id, { card_issued_date: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
        />
      </td>
      <td className="border border-border p-0">
        <Input 
          value={row.remark}
          onChange={e => onUpdateRow(row.id, { remark: e.target.value })}
          className="border-0 rounded-none h-[2.5vh] text-[10px] px-1.5 focus-visible:ring-1 focus-visible:ring-accent"
          placeholder="Remark"
        />
      </td>
      <td className="border border-border p-0">
        <div className="flex items-center justify-center h-[2.5vh] gap-1">
          <Button 
            onClick={onAddNew}
            className="h-full text-[9px] px-2 py-0 bg-green-600 hover:bg-green-700 text-white border-0"
          >
            New
          </Button>
          <Button 
            onClick={() => onSave(row.id)}
            disabled={!row.lead_db_id}
            className="h-full text-[9px] px-2 py-0 bg-accent hover:bg-accent/90 text-accent-foreground border-0"
          >
            Update
          </Button>
          <button 
            onClick={() => onRemoveRow(row.id)}
            className="h-full text-[9px] px-2 py-0 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
};

export default NewLeadRow;