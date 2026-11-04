import { useState, useRef } from 'react';
import { Download, Upload, FileText, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import * as XLSX from 'xlsx';

interface UserImportExportProps {
  users: any[];
  onImportSuccess?: () => void;
  onDeleteAll?: () => void;
}

export const UserImportExport = ({ users, onImportSuccess, onDeleteAll }: UserImportExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedUsers, setImportedUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle template download
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'id': 'CH1234ABCD',
          'name': 'John Doe',
          'mobile': '9876543210',
          'email': 'john@example.com',
          'mpin': '1234',
          'role': 'employee',
          'employee_type': 'Full Time',
          'pan': 'ABCDE1234F',
          'dob': '1990-01-15',
          'aadhaar': '123456789012',
          'aadhaar_name': 'John Doe',
          'aadhaar_address': '123 Main St, City',
          'aadhaar_father': 'Father Name',
          'bank_account': '123456789012',
          'ifsc': 'SBIN0001234',
          'status': 'active',
          'manager_id': '',
          'referred_by_id': '',
        },
      ];

      for (let i = 2; i <= 10; i++) {
        templateData.push({
          'id': '',
          'name': '',
          'mobile': '',
          'email': '',
          'mpin': '',
          'role': '',
          'employee_type': '',
          'pan': '',
          'dob': '',
          'aadhaar': '',
          'aadhaar_name': '',
          'aadhaar_address': '',
          'aadhaar_father': '',
          'bank_account': '',
          'ifsc': '',
          'status': '',
          'manager_id': '',
          'referred_by_id': '',
        });
      }

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      const colWidths = [15, 20, 15, 25, 10, 15, 15, 15, 15, 18, 20, 30, 20, 18, 15, 12, 15, 15];
      ws['!cols'] = colWidths.map(width => ({ wch: width }));

      XLSX.writeFile(wb, 'users_template.xlsx');
      toast({
        title: 'Template Downloaded',
        description: 'The users template has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download template',
        variant: 'destructive',
      });
    }
  };

  // Handle users export (fetch ALL users from API in pages)
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      toast({ title: 'Preparing export', description: 'Fetching all users...' });

      const perPage = 200;
      let pageNum = 1;
      let all: any[] = [];

      while (true) {
        const res = await api.getUsers(pageNum, perPage, '', '');
        const usersPage = res.users || [];
        all = all.concat(usersPage);
        const total = res.total || (usersPage.length + (pageNum - 1) * perPage);
        if (all.length >= total || usersPage.length < perPage) break;
        pageNum += 1;
      }

      const data = all.map((user: any) => ({
        id: user.id || '',
        name: user.name || '',
        mobile: user.mobile || '',
        email: user.email || '',
        role: user.role || '',
        employee_type: user.employeeType || user.employee_type || '',
        pan: user.pan || '',
        dob: user.dob || '',
        aadhaar: user.aadhaar || '',
        aadhaar_name: user.aadhaarName || user.aadhaar_name || '',
        aadhaar_address: user.aadhaarAddress || user.aadhaar_address || '',
        aadhaar_father: user.aadhaarFather || user.aadhaar_father || '',
        bank_account: user.bankAccount || user.bank_account || '',
        ifsc: user.ifsc || '',
        status: user.status || '',
        manager_id: user.managerId || (user.manager && user.manager.id) || '',
        referred_by_id: user.referredById || (user.referredBy && user.referredBy.id) || '',
        created_at: user.createdAt || user.created_at || '',
        updated_at: user.updatedAt || user.updated_at || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `users_export_${timestamp}.xlsx`);

      toast({ title: 'Export Complete', description: `${all.length} users exported to Excel` });
    } catch (error) {
      toast({ title: 'Export Failed', description: error instanceof Error ? error.message : 'Failed to export users', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // Handle file selection for import
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

      console.log('📊 Total rows in Excel:', jsonData.length);
      console.log('📋 Raw Excel data:', jsonData);

      const users = jsonData.map((row: any, index) => {
        const user = {
          id: row['id'] || '',
          name: row['name'] || '',
          mobile: row['mobile'] || '',
          email: row['email'] || '',
          mpin: row['mpin'] || '',
          role: row['role'] || 'employee',
          employee_type: row['employee_type'] || '',
          pan: row['pan'] || '',
          dob: row['dob'] || '',
          aadhaar: row['aadhaar'] || '',
          aadhaar_name: row['aadhaar_name'] || '',
          aadhaar_address: row['aadhaar_address'] || '',
          aadhaar_father: row['aadhaar_father'] || '',
          bank_account: row['bank_account'] || '',
          ifsc: row['ifsc'] || '',
          status: row['status'] || 'active',
          manager_id: row['manager_id'] || '',
          referred_by_id: row['referred_by_id'] || '',
        };
        console.log(`👤 Row ${index + 1}:`, user);
        return user;
      }).filter((user: any) => {
        // Only filter out completely empty rows
        const hasAnyData = Object.values(user).some(val => val && String(val).trim() !== '');
        if (!hasAnyData) {
          console.log('❌ Filtered out - Completely empty row:', user);
        }
        return hasAnyData;
      });

      console.log('✅ Valid users after filtering:', users.length);
      console.log('📦 Users to import:', users);

      setImportedUsers(users);
      setShowImportDialog(true);

      toast({
        title: 'File Loaded',
        description: `${users.length} users ready to import`,
      });
    } catch (error) {
      console.error('❌ Import error:', error);
      toast({
        title: 'Import Error',
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle bulk import submission
  const handleImportSubmit = async () => {
    if (importedUsers.length === 0) return;

    console.log('🚀 Starting import of', importedUsers.length, 'users');
    setIsSubmitting(true);
    
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const token = localStorage.getItem('auth_token');

      console.log('🔗 API Base URL:', BASE);
      console.log('🔑 Auth token:', token ? 'Present' : 'Missing');

      // First, fetch all existing users to map names to IDs
      console.log('📥 Fetching existing users for name mapping...');
      const usersResponse = await fetch(`${BASE}/api/users?page=1&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();
      const existingUsers = usersData.users || [];
      
      // Create name to ID mapping
      const nameToIdMap: Record<string, string> = {};
      existingUsers.forEach((user: any) => {
        if (user.name) {
          nameToIdMap[user.name.toLowerCase().trim()] = user.id;
        }
      });
      console.log('🗺️ Name to ID mapping created:', nameToIdMap);

      const results = await Promise.allSettled(
        importedUsers.map((user, index) => {
          // Map referred_by name to ID
          let referredById = user.referred_by_id;
          if (referredById && !referredById.startsWith('CH')) {
            // It's a name, not an ID
            const mappedId = nameToIdMap[referredById.toLowerCase().trim()];
            if (mappedId) {
              console.log(`🔄 Mapped referred_by "${referredById}" to ID: ${mappedId}`);
              referredById = mappedId;
            } else {
              console.warn(`⚠️ Could not find user with name "${referredById}"`);
              referredById = ''; // Clear if not found
            }
          }

          // Map manager_id name to ID
          let managerId = user.manager_id;
          if (managerId && !managerId.startsWith('CH')) {
            // It's a name, not an ID
            const mappedId = nameToIdMap[managerId.toLowerCase().trim()];
            if (mappedId) {
              console.log(`🔄 Mapped manager "${managerId}" to ID: ${mappedId}`);
              managerId = mappedId;
            } else {
              console.warn(`⚠️ Could not find user with name "${managerId}"`);
              managerId = ''; // Clear if not found
            }
          }

          const payload = {
            id: user.id,
            name: user.name || 'N/A',
            mobile: user.mobile || '0000000000',
            email: user.email || `${user.mobile || Date.now()}@example.com`,
            mpin: user.mpin || '0000',
            role: user.role || 'employee',
            employee_type: user.employee_type,
            pan: user.pan,
            dob: user.dob,
            aadhaar: user.aadhaar,
            aadhaar_name: user.aadhaar_name,
            aadhaar_address: user.aadhaar_address,
            aadhaar_father: user.aadhaar_father,
            bank_account: user.bank_account,
            ifsc: user.ifsc,
            status: user.status || 'active',
            manager_id: managerId,
            referred_by_id: referredById,
          };
          
          console.log(`📤 Sending user ${index + 1}:`, payload);
          
          return fetch(`${BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(payload),
          }).then(async res => {
            const data = await res.json();
            console.log(`📥 Response for user ${index + 1}:`, data);
            if (!data.success) {
              console.error(`❌ Failed user ${index + 1}:`, data.error);
            }
            return data;
          });
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('✅ Import complete - Success:', successful, 'Failed:', failed);
      console.log('📊 Results:', results);

      toast({
        title: 'Import Complete',
        description: `${successful} users imported successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      if (onImportSuccess) {
        onImportSuccess();
      }

      setShowImportDialog(false);
      setImportedUsers([]);
    } catch (error) {
      console.error('❌ Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import users',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete all users
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000').replace(/\/$/, '');
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${BASE}/api/users/delete-all`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'All Users Deleted',
          description: `${data.deletedCount || 0} users have been deleted successfully`,
        });
        
        if (onDeleteAll) {
          onDeleteAll();
        }
      } else {
        throw new Error(data.error || 'Failed to delete users');
      }
      
      setShowDeleteAllDialog(false);
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete all users',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            <span>Import/Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
          <DropdownMenuItem onClick={handleDownloadTemplate} className="cursor-pointer gap-2">
            <FileText className="w-4 h-4" />
            <span>Download Template</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport} className="cursor-pointer gap-2">
            <Download className="w-4 h-4" />
            <span>Export All Users to Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer gap-2">
            <Upload className="w-4 h-4" />
            <span>Import Users from Excel</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteAllDialog(true)} 
            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Users</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Users Preview</DialogTitle>
            <DialogDescription>
              Review the {importedUsers.length} users below before importing.
            </DialogDescription>
          </DialogHeader>

          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Mobile</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-[11px]">Role</th>
                </tr>
              </thead>
              <tbody>
                {importedUsers.map((user, index) => (
                  <tr key={index} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-[11px]">{user.name}</td>
                    <td className="px-3 py-2 text-[11px]">{user.mobile}</td>
                    <td className="px-3 py-2 text-[11px] truncate">{user.email}</td>
                    <td className="px-3 py-2 text-[11px]">{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {importedUsers.length} Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete All Users</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete all users from the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Warning: You are about to delete ALL users from the system.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete All Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserImportExport;
