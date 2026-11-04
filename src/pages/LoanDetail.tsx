import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency, APPLICATION_STAGES } from '@/lib/mock-data';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { ArrowLeft, IndianRupee, FileText, Eye, X, Printer, Share2, Download, RefreshCw, Edit2, Settings, Mail, ChevronDown, CheckCircle2, XCircle, MessageCircle, Plus } from 'lucide-react';
import { exportLoanPDF, downloadLoanPDF, prepareLoanShareBundle, prepareDocumentShareBundle } from '@/lib/pdf-export';
import { downloadRCTemplatePDF, exportRCTemplatePDF, shareRCTemplatePDF } from '@/lib/rc-template';
import { toast } from 'sonner';
import { format } from 'date-fns';
import LoanApplicationStageManager from '@/components/LoanApplicationStageManager';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import RtoStatusCard from '@/components/rto/RtoStatusCard';

const LoanTab = lazy(() => import('./LoanDetail/LoanTab').then(m => ({ default: m.default })));
const VehicleTab = lazy(() => import('./LoanDetail/VehicleTab').then(m => ({ default: m.default })));
const ApplicantTab = lazy(() => import('./LoanDetail/ApplicantTab').then(m => ({ default: m.default })));
const CreditTab = lazy(() => import('./LoanDetail/CreditTab').then(m => ({ default: m.default })));
const OpsView = lazy(() => import('./LoanDetail/OpsView').then(m => ({ default: m.default })));

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'aadhar_front', label: 'Aadhar Front' },
  { value: 'aadhar_back', label: 'Aadhar Back' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'rc_front', label: 'RC Front' },
  { value: 'rc_back', label: 'RC Back' },
  { value: 'rc_copy', label: 'RC Copy' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'driving_license', label: 'Driving Licence' },
  { value: 'light_bill', label: 'Light Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'loan_statement', label: 'Loan Statement' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'customer_photo', label: 'Customer Photo' },
  { value: 'photo', label: 'Photo' },
  { value: 'disbursement_memo', label: 'Disbursement Memo' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'customer_ledger', label: 'Customer Ledger' },
  { value: 'co_aadhar_front', label: 'Co-Applicant Aadhar Front' },
  { value: 'co_aadhar_back', label: 'Co-Applicant Aadhar Back' },
  { value: 'co_pan_card', label: 'Co-Applicant PAN Card' },
  { value: 'co_photo', label: 'Co-Applicant Photo' },
  { value: 'guarantor_aadhar_front', label: 'Guarantor Aadhar Front' },
  { value: 'guarantor_aadhar_back', label: 'Guarantor Aadhar Back' },
  { value: 'guarantor_pan_card', label: 'Guarantor PAN Card' },
  { value: 'guarantor_rc_front', label: 'Guarantor RC Front' },
  { value: 'guarantor_rc_back', label: 'Guarantor RC Back' },
  { value: 'guarantor_photo', label: 'Guarantor Photo' },
  { value: 'loan_application_pdf', label: 'Loan Application PDF' },
  { value: 'nach', label: 'NACH' },
  { value: 'other', label: 'Other' },
];

const getDocLabel = (docType: string) => {
  const found = DOC_TYPES.find(d => d.value === docType);
  if (found) return found.label;
  return docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Warm up the lazy route chunk + data so navigating to Folio Ledger feels instant
  const preloadFolioLedger = () => {
    if (!id) return;
    import('@/pages/LoanPaymentRequest').catch(() => {});
    queryClient.prefetchQuery({
      queryKey: ['loan-payments', id],
      queryFn: async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/payments?status=all&loanId=${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return [];
        return await response.json();
      },
    });
    queryClient.prefetchQuery({
      queryKey: ['folio-accounts'],
      queryFn: async () => {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/accountant/folio-accounts`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!res.ok) return [];
        return await res.json();
      },
    });
  };

  // Role-based permissions
  const userRole = user?.role || '';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isExecutive = userRole === 'executive';
  const canEditLoanFromCard = ['admin', 'dsa', 'branch_manager', 'ops_team', 'sales_manager', 'team_leader', 'loan_operations'].includes(userRole);
  const isLoanOperations = userRole === 'loan_operations';
  const isOpsTeam = userRole === 'ops_team';
  const canDelete = isAdmin;

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => api.get(`/loans/${id}`),
    enabled: !!id,
  });

  const { data: reworkHistoryData } = useQuery({
    queryKey: ['loan-rework-history', id],
    queryFn: async () => {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API}/loans/${id}/rework/history`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) return { events: [], itemStatus: {} };
      const data = await res.json();
      return { events: data.events || [], itemStatus: data.itemStatus || {} };
    },
    enabled: !!id,
  });
  const reworkHistory = reworkHistoryData?.events || [];
  // Per-tag status for the currently-open cycle — { [tag]: { status, documentIds } }
  // status is 'pending' | 'uploaded' (awaiting approval) | 'approved'. Each
  // pending item is approved/rejected independently of the others.
  const reworkItemStatus: Record<string, { status: string; documentIds: number[] }> = reworkHistoryData?.itemStatus || {};

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['loan-documents', id],
    queryFn: async () => {
      try {
        const docs = await api.get(`/loans/${id}/documents`);
        const uniqueDocs = docs.filter((doc, index, self) => {
          const firstIndex = self.findIndex(d =>
            d.document_type === doc.document_type &&
            d.file_name === doc.file_name
          );
          return index === firstIndex;
        });
        console.log(`Fetched ${docs.length} documents, filtered to ${uniqueDocs.length} unique documents`);
        return uniqueDocs;
      }
      catch { return []; }
    },
    enabled: !!id,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.ok ? await response.json() : [];
    },
  });

  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', user?.role],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/permissions`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) return null;
        return await response.json();
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  const isTimerEnforced = () => {
    const config = configs?.find((c: any) => c.config_key === 'loan_timer_enabled');
    if (!config || config.config_value !== 'true') return false; // Timer is off globally
    
    // Admins and users with dashboard.timer permission bypass the timer restriction
    const bypassTimer = user?.role === 'admin' || userPermissions?.permissions?.dashboard?.timer === true;
    return !bypassTimer;
  };

  const isLoanTimerExpired = (createdAt: string, applicationStage: string): boolean => {
    if (!['LOGIN', 'IN_PROCESS'].includes(applicationStage)) return false;
    if (!createdAt) return true;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    if (isNaN(created)) return true;
    const elapsed = now - created;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return elapsed >= twentyFourHours;
  };

  const canUpdateStage = () => {
    if (!loan) return false;
    return true;
  };

  const updateStatus = useMutation({
    mutationFn: (newStatus: string) => api.put(`/loans/${id}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteLoan = useMutation({
    mutationFn: () => api.delete(`/loans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Loan application deleted');
      navigate('/loans');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete loan'),
  });

  const convertToLead = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}/convert-to-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert to lead');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`Loan converted back to lead successfully! Lead ID: ${data.leadId}`);
      navigate('/leads');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert to lead');
    },
  });

  const [activeTab, setActiveTab] = useState<'loan' | 'vehicle' | 'applicant' | 'credit' | 'rework' | 'rto'>('loan');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<number | string | null>(null);
  const [showReapplyModal, setShowReapplyModal] = useState(false);
  const [editModalState, setEditModalState] = useState<'none' | 'applicant' | 'loan' | 'income'>('none');
  const [editForm, setEditForm] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showStageManager, setShowStageManager] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showRCMenu, setShowRCMenu] = useState(false);
  const [shareBundle, setShareBundle] = useState<Awaited<ReturnType<typeof prepareLoanShareBundle>> | null>(null);
  const [shareBundleLoading, setShareBundleLoading] = useState(false);
  const [documentShareBundle, setDocumentShareBundle] = useState<Awaited<ReturnType<typeof prepareDocumentShareBundle>> | null>(null);
  const [documentShareBundleLoading, setDocumentShareBundleLoading] = useState(false);

  const [uploadDocType, setUploadDocType] = useState('aadhar_front');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [expandedReworkGroups, setExpandedReworkGroups] = useState<Set<number>>(new Set());
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Per-pending-item state for the Rework tab — each tag/issue gets its own
  // file picker and its own approve/reject action, independent of the others.
  const [tagFiles, setTagFiles] = useState<Record<string, File[]>>({});
  const [tagActionLoading, setTagActionLoading] = useState<Record<string, boolean>>({});
  const [tagRejectOpen, setTagRejectOpen] = useState<Record<string, boolean>>({});
  const [tagRejectReason, setTagRejectReason] = useState<Record<string, string>>({});
  const [tagMessage, setTagMessage] = useState<Record<string, string>>({});
  const [newIssueText, setNewIssueText] = useState('');
  const [isAddingIssue, setIsAddingIssue] = useState(false);

  const reworkTags: string[] = Array.isArray((loan as any)?.rework_tags) ? (loan as any).rework_tags : [];
  // Reuse an existing DOC_TYPES value when a tag matches one exactly (e.g.
  // "Bank Statement"), so it groups with documents uploaded elsewhere under
  // the same type; otherwise derive a slug from the tag text.
  const tagToDocType = (tag: string) => {
    const existing = DOC_TYPES.find(d => d.label.toLowerCase() === tag.toLowerCase());
    if (existing) return existing.value;
    return tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  };

  const [showMailTrailModal, setShowMailTrailModal] = useState(false);
  const [mailTrail, setMailTrail] = useState<{ hasThread: boolean; conversationId: string | null; messages: any[] } | null>(null);
  const [isLoadingMailTrail, setIsLoadingMailTrail] = useState(false);
  const [mailTo, setMailTo] = useState('');
  const [mailCc, setMailCc] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyDocIds, setReplyDocIds] = useState<number[]>([]);
  const [showReplyDocPicker, setShowReplyDocPicker] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);

  const { data: idvData } = useQuery({
    queryKey: ['loan-idv', loan?.vehicle_number],
    queryFn: () => api.post(`/find-lender/idv`, { id_number: loan?.vehicle_number }),
    enabled: !!loan?.vehicle_number,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const isLoanAllowedBank = (bank: any) => {
    if (!bank) return false;
    let cats: string[] = [];
    try {
      if (Array.isArray(bank.category)) cats = bank.category;
      else if (typeof bank.category === 'string') {
        const t = bank.category.trim();
        cats = t.startsWith('[') ? JSON.parse(t) : [t];
      }
    } catch {}
    const catLower = cats.map(c => String(c).toLowerCase().trim()).filter(Boolean);
    const hasLoan = catLower.some(c => c === 'loan' || c.includes('loan') || c.includes('auto') || c.includes('vehicle'));
    const hasCC = catLower.some(c => c.includes('credit') || c === 'cc');
    if (hasCC && !hasLoan) return false;
    if (catLower.length > 0 && !hasLoan) return false;

    let subs: string[] = [];
    try {
      if (Array.isArray(bank.subcategory)) subs = bank.subcategory;
      else if (typeof bank.subcategory === 'string') {
        const t = bank.subcategory.trim();
        subs = t.startsWith('[') ? JSON.parse(t) : [t];
      }
    } catch {}
    const subLower = subs.map(s => String(s).toLowerCase().trim()).filter(Boolean);
    if (subLower.length > 0) {
      const hasUsedCar = subLower.some(s => 
        s.includes('used car') || s.includes('used_car') || s.includes('pre-owned') || 
        s.includes('refinance') || s.includes('bt') || s === 'auto loan' || 
        s === 'vehicle loan' || s === 'car loan' || s === 'loan'
      );
      if (!hasUsedCar) return false;
    }
    return true;
  };

  const { data: banks = [] } = useQuery({
    queryKey: ['banks-list'],
    queryFn: async () => {
      try {
        const response: any = await api.get('/banks?product=used_car_loan');
        if (response?.error) return [];
        return Array.isArray(response) ? response.filter(isLoanAllowedBank) : [];
      } catch {
        return [];
      }
    },
  });

  const lenders = [...banks.map((b: any) => b.name).filter(Boolean), 'Others'];

  const handleDirectUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    setIsUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', uploadFile);
    formData.append('document_type', uploadDocType);
    formData.append('loan_id', id || '');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Document uploaded successfully!');
        setUploadFile(null);
        const fileInput = document.getElementById('direct-doc-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        refetchDocs();
      } else {
        const errorText = await response.text();
        toast.error(`Upload failed: ${errorText}`);
      }
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast.error(`Upload error: ${error?.message || error}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Same upload as handleDirectUpload, but also pings the person who sent
  // this loan for rework once the file lands, so they know to come review it.
  // One pending item at a time: upload the file(s) for THIS tag only, then
  // notify the initiator scoped to just this tag — the other pending items
  // for this cycle are untouched and keep whatever status they already have.
  // One combined action per pending item: a file, a message, or both. A file
  // (with or without a message attached) sends it for approval; a message on
  // its own just posts to the conversation without touching that item's
  // approval status — either side can use it to ask something or reply.
  const handleTagUploadAndSend = async (tag: string) => {
    const files = tagFiles[tag] || [];
    const note = (tagMessage[tag] || '').trim();
    if (files.length === 0 && !note) {
      toast.error('Select a file or type a message');
      return;
    }
    setTagActionLoading(prev => ({ ...prev, [tag]: true }));
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    if (files.length === 0) {
      try {
        const response = await fetch(`${API}/loans/${id}/rework/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ tag, message: note })
        });
        if (response.ok) {
          toast.success('Message sent');
          setTagMessage(prev => ({ ...prev, [tag]: '' }));
          queryClient.invalidateQueries({ queryKey: ['loan-rework-history', id] });
        } else {
          const err = await response.json().catch(() => ({}));
          toast.error(err.message || err.error || 'Failed to send message');
        }
      } catch (error: any) {
        toast.error(`Error: ${error?.message || error}`);
      } finally {
        setTagActionLoading(prev => ({ ...prev, [tag]: false }));
      }
      return;
    }

    const docType = tagToDocType(tag);
    const uploadedIds: number[] = [];
    let failCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', docType);
      formData.append('loan_id', id || '');
      try {
        const response = await fetch(`${API}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
          body: formData
        });
        if (response.ok) {
          const result = await response.json().catch(() => null);
          if (result?.documentId) uploadedIds.push(result.documentId);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (uploadedIds.length === 0) {
      toast.error('Upload failed');
      setTagActionLoading(prev => ({ ...prev, [tag]: false }));
      return;
    }

    try {
      const response = await fetch(`${API}/loans/${id}/rework/notify-initiator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ docLabel: tag, documentIds: uploadedIds, note })
      });
      if (response.ok) {
        toast.success(`${tag} sent for approval.`);
        setTagFiles(prev => ({ ...prev, [tag]: [] }));
        setTagMessage(prev => ({ ...prev, [tag]: '' }));
        queryClient.invalidateQueries({ queryKey: ['loan-rework-history', id] });
        queryClient.invalidateQueries({ queryKey: ['loan-documents', id] });
        refetchDocs();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || err.error || 'Failed to notify the rework initiator');
      }
    } catch (error: any) {
      toast.error(`Error: ${error?.message || error}`);
    } finally {
      setTagActionLoading(prev => ({ ...prev, [tag]: false }));
    }
    if (failCount > 0) {
      toast.error(`${failCount} file${failCount > 1 ? 's' : ''} failed to upload`);
    }
  };

  // Initiator-only: approves just this one pending item. Once every item in
  // the cycle is approved this way, the backend moves the loan back into the
  // normal pipeline on its own.
  const handleApproveTag = async (tag: string) => {
    setTagActionLoading(prev => ({ ...prev, [tag]: true }));
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const response = await fetch(`${API}/loans/${id}/rework/items/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ tag })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.success(data.message || `${tag} approved.`);
        queryClient.invalidateQueries({ queryKey: ['loan', id] });
        queryClient.invalidateQueries({ queryKey: ['loan-rework-history', id] });
        queryClient.invalidateQueries({ queryKey: ['loan-documents', id] });
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || err.error || 'Failed to approve');
      }
    } catch (error: any) {
      toast.error(`Error: ${error?.message || error}`);
    } finally {
      setTagActionLoading(prev => ({ ...prev, [tag]: false }));
    }
  };

  // Initiator-only: sends just this one item back — the owner can re-upload
  // it while any other already-approved items stay approved.
  const handleRejectTag = async (tag: string) => {
    const reason = tagRejectReason[tag] || '';
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    setTagActionLoading(prev => ({ ...prev, [tag]: true }));
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const response = await fetch(`${API}/loans/${id}/rework/items/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ tag, reason })
      });
      if (response.ok) {
        toast.success('Sent back — the owner has been notified.');
        setTagRejectOpen(prev => ({ ...prev, [tag]: false }));
        setTagRejectReason(prev => ({ ...prev, [tag]: '' }));
        queryClient.invalidateQueries({ queryKey: ['loan-rework-history', id] });
        queryClient.invalidateQueries({ queryKey: ['loan-documents', id] });
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || err.error || 'Failed to send back');
      }
    } catch (error: any) {
      toast.error(`Error: ${error?.message || error}`);
    } finally {
      setTagActionLoading(prev => ({ ...prev, [tag]: false }));
    }
  };

  // Initiator-only: flag one more issue on the SAME open rework cycle,
  // instead of having to leave and re-send the loan to rework from scratch.
  const handleAddReworkItem = async () => {
    if (!newIssueText.trim()) {
      toast.error('Please enter what needs to be corrected');
      return;
    }
    setIsAddingIssue(true);
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    try {
      const response = await fetch(`${API}/loans/${id}/rework/items/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ tag: newIssueText.trim() })
      });
      if (response.ok) {
        toast.success('Issue added to this rework.');
        setNewIssueText('');
        queryClient.invalidateQueries({ queryKey: ['loan', id] });
        queryClient.invalidateQueries({ queryKey: ['loan-rework-history', id] });
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.message || err.error || 'Failed to add item');
      }
    } catch (error: any) {
      toast.error(`Error: ${error?.message || error}`);
    } finally {
      setIsAddingIssue(false);
    }
  };

  const fetchMailTrail = async () => {
    if (!id) return;
    setIsLoadingMailTrail(true);
    try {
      const data = await api.get(`/loans/${id}/mail-trail`);
      setMailTrail(data);
    } catch (error: any) {
      console.error('Mail trail fetch error:', error);
      toast.error('Failed to load mail trail');
    } finally {
      setIsLoadingMailTrail(false);
    }
  };

  useEffect(() => {
    if (isAdmin && id) {
      fetchMailTrail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAdmin]);

  const handleSendMail = async () => {
    if (!mailTo || !mailSubject || !mailBody) {
      toast.error('To, subject and message are all required');
      return;
    }
    setIsSendingMail(true);
    try {
      await api.post(`/loans/${id}/mail-trail`, {
        to: mailTo,
        cc: mailCc || undefined,
        subject: mailSubject,
        html: mailBody,
      });
      toast.success('Mail sent successfully!');
      setMailTo('');
      setMailCc('');
      setMailSubject('');
      setMailBody('');
      await fetchMailTrail();
    } catch (error: any) {
      console.error('Send mail error:', error);
      toast.error(`Failed to send mail: ${error?.message || error}`);
    } finally {
      setIsSendingMail(false);
    }
  };

  const handleReplyMail = async () => {
    if (!replyText.trim()) {
      toast.error('Reply message is required');
      return;
    }
    setIsSendingMail(true);
    try {
      const formData = new FormData();
      formData.append('text', replyText);
      formData.append('cc', replyCc);
      replyFiles.forEach((file) => formData.append('documents', file));
      formData.append('documentIds', JSON.stringify(replyDocIds));

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/loans/${id}/mail-trail/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || errorData.message || 'Failed to send reply');
      }

      toast.success('Reply sent successfully!');
      setReplyText('');
      setReplyCc('');
      setReplyFiles([]);
      setReplyDocIds([]);
      setShowReplyDocPicker(false);
      await fetchMailTrail();
    } catch (error: any) {
      console.error('Reply mail error:', error);
      toast.error(`Failed to send reply: ${error?.message || error}`);
    } finally {
      setIsSendingMail(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function buildBundle() {
      if (!loan) return;
      setShareBundleLoading(true);
      try {
        const bundle = await prepareLoanShareBundle(loan, documents as any[]);
        if (!cancelled) setShareBundle(bundle);
      } catch (error) {
        console.error('Failed to prepare share bundle:', error);
        if (!cancelled) setShareBundle(null);
      } finally {
        if (!cancelled) setShareBundleLoading(false);
      }
    }

    buildBundle();
    return () => { cancelled = true; };
  }, [loan, documents]);

  useEffect(() => {
    let cancelled = false;

    async function buildDocumentBundle() {
      if (!documents.length) {
        setDocumentShareBundle(null);
        return;
      }
      setDocumentShareBundleLoading(true);
      try {
        const bundle = await prepareDocumentShareBundle(documents as any[], loan.id);
        if (!cancelled) {
          setDocumentShareBundle(bundle);
        }
      } catch (error) {
        console.error('Failed to prepare document share bundle:', error);
        if (!cancelled) {
          setDocumentShareBundle(null);
        }
      } finally {
        if (!cancelled) {
          setDocumentShareBundleLoading(false);
        }
      }
    }

    buildDocumentBundle();

    return () => {
      cancelled = true;
    };
  }, [documents]);

  const handleReapply = () => {
    if (!loan) return;
    sessionStorage.setItem('reapply_loan_data', JSON.stringify(loan));
    navigate('/add-lead?reapply_loan=true&step=4');
  };

  const handleSavePartial = async () => {
    try {
      setIsSavingEdit(true);
      const res = await api.put(`/loans/${id}`, editForm);
      if (res.error) throw new Error(res.error);
      toast.success('Updated successfully');
      setEditModalState('none');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLenderChange = async (lenderName: string) => {
    setEditForm((prev: any) => ({ ...prev, financier_name: lenderName, financier_branch_name: '', financier_executive_name: '', financier_executive_mobile: '', financier_area_manager_name: '', financier_area_manager_mobile: '' }));
    setBranchOptions([]);
    if (!lenderName || lenderName === 'Others') {
      setEditForm((prev: any) => ({ ...prev, assigned_bank_id: null, bank_id: null }));
      return;
    }

    const matchedBank = banks.find((b: any) => b.name.toLowerCase() === lenderName.toLowerCase());
    if (!matchedBank) return;

    setEditForm((prev: any) => ({ ...prev, assigned_bank_id: matchedBank.id, bank_id: matchedBank.id }));

    setLoadingBranches(true);
    try {
      const [ratesRes, branchesRes] = await Promise.all([
        api.get(`/banks/${matchedBank.id}/product-rates`),
        api.get(`/banks/${matchedBank.id}/branches`),
      ]);

      if (ratesRes && !ratesRes.error) {
        const ratesData = ratesRes;
        const ct = (loan.case_type || '').toLowerCase();
        let productName = 'Used Car Purchase';
        if (ct.includes('new')) productName = 'New Car Purchase';
        else if (ct.includes('refinance')) productName = 'Used Car Refinance Up';
        else if (ct.includes('bt') || ct.includes('top')) productName = 'Used Car BT/Top Up';

        const matchedRate = ratesData.find((r: any) => r.product_name === productName);
        const activeRate = matchedRate || (ratesData.length > 0 ? ratesData[0] : null);

        if (activeRate) {
          const rateVal = activeRate.racc_rate !== null ? activeRate.racc_rate : activeRate.min_rate;
          const tenureVal = activeRate.max_tenure !== null ? activeRate.max_tenure : activeRate.min_tenure;

          setEditForm((prev: any) => ({
            ...prev,
            roi: rateVal !== null ? String(rateVal) : prev.roi,
            tenure: tenureVal !== null ? String(tenureVal) : prev.tenure,
          }));
        }
      }

      if (branchesRes && !branchesRes.error) {
        setBranchOptions(branchesRes);
      }
    } catch (e) {
      console.error('Failed to fetch bank rates or branches', e);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleBranchChange = (branchName: string) => {
    const branch = branchOptions.find((b: any) => b.branch_name === branchName);
    setEditForm((prev: any) => ({
      ...prev,
      financier_branch_name: branch?.branch_name || '',
      financier_executive_name: branch?.sales_manager_name || '',
      financier_executive_mobile: branch?.sales_manager_mobile || '',
      financier_area_manager_name: branch?.area_sales_manager_name || '',
      financier_area_manager_mobile: branch?.area_sales_manager_mobile || '',
    }));
  };

  const openEditModal = (type: 'applicant' | 'loan' | 'income') => {
    if (type === 'applicant') {
      setEditForm({
        applicant_name: loan.applicant_name || '',
        mobile: loan.mobile || '',
        email: (loan as any).email || '',
        pan_number: (loan as any).pan_number || '',
        co_applicant_name: (loan as any).co_applicant_name || '',
        co_applicant_mobile: (loan as any).co_applicant_mobile || '',
        guarantor_name: (loan as any).guarantor_name || '',
        guarantor_mobile: (loan as any).guarantor_mobile || '',
        marital_status: (loan as any).marital_status || '',
        mother_name: (loan as any).mother_name || '',
        spouse_name: (loan as any).spouse_name || '',
        current_address: (loan as any).current_address || loan.address || '',
        current_landmark: (loan as any).current_landmark || (loan as any).landmark || '',
        current_district: (loan as any).current_district || '',
        current_state: (loan as any).current_state || '',
        current_pincode: (loan as any).current_pincode || '',
      });
    } else if (type === 'loan') {
      const existingLender = (loan as any).financier_name || (typeof (loan as any).bank_name === 'object' ? (loan as any).bank_name?.name : (loan as any).bank_name) || '';
      setEditForm({
        loan_amount: (loan as any).loan_amount || '',
        tenure: (loan as any).tenure || '',
        roi: (loan as any).roi || '',
        emi_amount: (loan as any).emi_amount || '',
        financier_name: existingLender,
        financier_branch_name: (loan as any).financier_branch_name || '',
        financier_executive_name: (loan as any).financier_executive_name || '',
        financier_executive_mobile: (loan as any).financier_executive_mobile || '',
        financier_area_manager_name: (loan as any).financier_area_manager_name || '',
        financier_area_manager_mobile: (loan as any).financier_area_manager_mobile || '',
      });
      if (existingLender && existingLender !== 'Others') {
        const matchedBank = banks.find((b: any) => b.name.toLowerCase() === existingLender.toLowerCase());
        if (matchedBank) {
          setLoadingBranches(true);
          api.get(`/banks/${matchedBank.id}/branches`).then((branchesRes: any) => {
            if (branchesRes && !branchesRes.error) setBranchOptions(branchesRes);
          }).catch(() => {}).finally(() => setLoadingBranches(false));
        }
      }
    } else if (type === 'income') {
      setEditForm({
        income_source: (loan as any).income_source || '',
        company_name: (loan as any).company_name || '',
        designation: (loan as any).designation || '',
        net_monthly_salary: (loan as any).net_monthly_salary || '',
        salary_slip_available: (loan as any).salary_slip_available || '',
        current_job_years: (loan as any).current_job_years || '',
        total_work_exp: (loan as any).total_work_exp || '',
        salary_credit_mode: (loan as any).salary_credit_mode || '',
        itr_available: (loan as any).itr_available || '',
        annual_income_itr: (loan as any).annual_income_itr || '',
        profile: (loan as any).profile || '',
        has_office_setup: (loan as any).has_office_setup || '',
        business_name: (loan as any).business_name || '',
        business_type: (loan as any).business_type || '',
        business_vintage: (loan as any).business_vintage || '',
        professional_subtype: (loan as any).professional_subtype || '',
        practice_experience: (loan as any).practice_experience || '',
        freelancer_subtype: (loan as any).freelancer_subtype || '',
        other_income_type: (loan as any).other_income_type || '',
      });
    }
    setEditModalState(type);
  };

  const previewDocument = async (doc: any) => {
    setLoadingPreview(doc.id);
    try {
      const downloadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });

      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = URL.createObjectURL(blob);
        setPreviewDoc({ url, name: doc.file_name });
      } else {
        throw new Error(`Document not found (${downloadResponse.status})`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(`Unable to preview document. Document ID ${doc.id} may not exist or may have been deleted.`);
    } finally {
      setLoadingPreview(null);
    }
  };

  const handleShareAll = async () => {
    try {
      if (!shareBundle) {
        toast.info(shareBundleLoading ? 'Loading saved PDF…' : 'Saved PDF is still loading. Please try again in a moment.');
        return;
      }

      if (navigator.share) {
        const shareData: ShareData = {
          title: shareBundle.title,
          text: shareBundle.text,
          files: shareBundle.files,
        };

        try {
          await navigator.clipboard.writeText(shareBundle.text);
          toast.success('Message copied to clipboard! Paste it when sending.');
        } catch (e) {
          // ignore
        }

        if (navigator.canShare && !navigator.canShare(shareData)) {
          const textOnly: ShareData = { title: shareBundle.title, text: shareBundle.text };
          if (navigator.canShare && navigator.canShare(textOnly)) {
            await navigator.share(textOnly);
            toast.success('Shared successfully!');
            return;
          }
          try {
            await navigator.clipboard.writeText(shareBundle.text);
            toast.success('Message copied to clipboard! You can paste it when sharing.');
          } catch (e) {
            toast.info('Share not supported on this device.');
          }
          return;
        }

        await navigator.share(shareData);
        toast.success('Shared PDF!');
      } else {
        try {
          await navigator.clipboard.writeText(shareBundle.text);
          toast.success('Message copied to clipboard! You can paste it in WhatsApp or any app.');
        } catch (e) {
          window.prompt('Copy this message:', shareBundle.text);
        }
      }
    } catch (error: any) {
      console.error('Share error:', error);
      if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else if (error?.name === 'NotAllowedError') {
        try {
          await navigator.clipboard.writeText(shareBundle.text);
          toast.success('Message copied to clipboard!');
        } catch (e) {
          window.prompt('Copy this message:', shareBundle.text);
        }
      } else {
        toast.error(error?.message || 'Failed to share loan application');
      }
    }
  };

  const handleShareDocuments = async () => {
    if (!documentShareBundle) {
      if (documentShareBundleLoading) {
        toast.info('Loading documents…');
      } else {
        toast.error('No documents available to share.');
      }
      return;
    }

    if (!navigator.share) {
      try {
        await navigator.clipboard.writeText(documentShareBundle.text);
        toast.success('Message copied to clipboard!');
      } catch (e) {
        toast.error('Sharing not available on this device');
      }
      return;
    }

    try {
      const shareData: ShareData = {
        title: documentShareBundle.title,
        text: documentShareBundle.text,
        files: documentShareBundle.files,
      };

      try {
        await navigator.clipboard.writeText(documentShareBundle.text);
        toast.success('Message copied to clipboard! Paste it when sending.');
      } catch (e) {
        // ignore
      }

      if (navigator.canShare && !navigator.canShare(shareData)) {
        try {
          await navigator.share({ title: documentShareBundle.title, text: documentShareBundle.text });
          toast.success('Shared successfully!');
        } catch (e: any) {
          if (e?.name !== 'AbortError') {
            try { await navigator.clipboard.writeText(documentShareBundle.text); toast.success('Message copied to clipboard!'); } catch (ce) { }
          }
        }
        return;
      }

      await navigator.share(shareData);
      toast.success(`Shared ${documentShareBundle.docCount} images!`);
    } catch (error: any) {
      console.error('Document share error:', error);
      if (error?.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else if (error?.name === 'NotAllowedError') {
        try {
          await navigator.clipboard.writeText(documentShareBundle.text);
          toast.success('Message copied to clipboard!');
        } catch (e) {
          window.prompt('Copy this message:', documentShareBundle.text);
        }
      } else {
        toast.error(error?.message || 'Failed to share documents');
      }
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  if (error) {
    console.error('Loan detail error:', error);
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-2">Error loading loan details</p>
        <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  if (!loan) {
    console.log('No loan data found for ID:', id);
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Loan not found (ID: {id})</p>
        <p className="text-xs text-muted-foreground mt-2">Check if the loan exists or if you have permission to view it</p>
        <button onClick={() => navigate('/loans')} className="mt-4 text-accent hover:underline text-sm">← Back to loans</button>
      </div>
    );
  }

  let tentativeLoanAmount: number | null = null;
  let tentativeTenure: string | null = null;
  let tentativeRoi: string | null = null;
  let tentativeEmi: string | null = null;

  if (loan) {
    const stageData = loan.stage_data || {};
    let leadStageData: any = {};
    try {
      leadStageData = typeof loan.lead_stage_data === 'string' ? JSON.parse(loan.lead_stage_data) : (loan.lead_stage_data || {});
    } catch (e) { }

    const bankDetails = stageData.selectedBankDetails || leadStageData.selectedBankDetails || {};

    if (bankDetails.loanAmountNumeric || bankDetails.maxLoanAmountNumeric) {
      tentativeLoanAmount = Number(bankDetails.maxLoanAmountNumeric || bankDetails.loanAmountNumeric);
    } else if (bankDetails.maxLoanAmount) {
      const parts = String(bankDetails.maxLoanAmount).split('-');
      const lastPart = parts[parts.length - 1].trim();
      const maxL = lastPart.replace(/[^0-9.]/g, '');
      if (maxL) {
        if (String(bankDetails.maxLoanAmount).includes('L')) {
          tentativeLoanAmount = Number(maxL) * 100000;
        } else {
          tentativeLoanAmount = Number(maxL);
        }
      }
    }

    if (bankDetails.roiNumeric) {
      tentativeRoi = String(bankDetails.roiNumeric);
    } else if (bankDetails.roi) {
      tentativeRoi = String(bankDetails.roi).replace(/[^0-9.]/g, '');
    }

    if (bankDetails.tenureNumeric) {
      tentativeTenure = String(bankDetails.tenureNumeric);
    } else if (bankDetails.maxTenure) {
      tentativeTenure = String(bankDetails.maxTenure).replace(/[^0-9]/g, '');
    }

    if (bankDetails.emiNumeric || bankDetails.maxEmiNumeric) {
      tentativeEmi = String(bankDetails.maxEmiNumeric || bankDetails.emiNumeric);
    } else if (bankDetails.loanEmi) {
      const parts = String(bankDetails.loanEmi).split('-');
      const lastPart = parts[parts.length - 1].trim();
      tentativeEmi = lastPart.replace(/[^0-9.]/g, '');
    }
  }

  const displayLoanAmount = loan?.loan_amount > 0 ? Number(loan.loan_amount) : (tentativeLoanAmount || 0);
  const displayTenure = loan?.tenure ? `${loan.tenure} months` : (tentativeTenure ? `${tentativeTenure} months` : 'NA');
  const displayIrr = loan?.irr ? `${loan.irr}%` : (tentativeRoi ? `${tentativeRoi}%` : 'NA');
  const displayEmiAmount = loan?.emi_amount > 0 ? formatCurrency(Number(loan.emi_amount)) : (tentativeEmi ? formatCurrency(Number(tentativeEmi)) : 'NA');

  const editProps = {
    canEditLoanFromCard,
    isLoanOperations,
    editModalState,
    editForm,
    setEditForm,
    isSavingEdit,
    handleSavePartial,
    openEditModal,
  };

  const isDisbursed = String((loan as any)?.application_stage || '').toUpperCase() === 'DISBURSED';

  const renderTab = () => {
    if (isOpsTeam) {
      return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading operations view…</div>}>
          <OpsView loan={loan} />
        </Suspense>
      );
    }
    if (activeTab === 'rework') {
      const sentByName = (loan as any).application_stage === 'REWORK' ? (loan as any).stage_data?.updatedByName : null;
      const isReworkInitiator = (loan as any).rework_initiated_by != null && (loan as any).rework_initiated_by === user?.id;
      const resolvedCount = reworkTags.filter(tag => reworkItemStatus[tag]?.status === 'approved').length;
      return (
        <div className="space-y-4">
          {(loan as any).application_stage === 'REWORK' && (
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-amber-500"><RefreshCw size={18} /></span>
              <h3 className="font-semibold text-foreground">Rework Details</h3>
              {reworkTags.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{resolvedCount}/{reworkTags.length} resolved</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sent back for rework{sentByName ? ` by ${sentByName}` : ''}{(loan as any).rework_from_stage ? ` (was at ${(loan as any).rework_from_stage})` : ''}</p>
              <p className="text-sm text-foreground mt-1">{(loan as any).rework_remarks || '—'}</p>
            </div>

            {reworkTags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/80 space-y-2.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Pending Items — each is approved on its own</p>
                {reworkTags.map((tag, tagIdx) => {
                  const itemState = reworkItemStatus[tag] || { status: 'pending', documentIds: [] };
                  const status = itemState.status;
                  const files = tagFiles[tag] || [];
                  const loadingThis = !!tagActionLoading[tag];
                  const noteText = tagMessage[tag] || '';
                  return (
                    <div key={tag} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground">Issue {tagIdx + 1} — {tag}</span>
                        {status === 'approved' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 size={11} /> Approved</span>
                        )}
                        {status === 'uploaded' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Awaiting Approval</span>
                        )}
                        {status === 'pending' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending</span>
                        )}
                      </div>

                      {itemState.documentIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {itemState.documentIds.map((docId: number) => {
                            const doc = (documents as any[]).find(d => d.id === docId);
                            return (
                              <button
                                key={docId}
                                onClick={() => previewDocument(doc || { id: docId, file_name: 'Document' })}
                                disabled={loadingPreview === docId}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-medium transition-colors disabled:opacity-50"
                              >
                                <Eye size={10} /> {loadingPreview === docId ? 'Loading…' : (doc?.file_name || `Document #${docId}`)}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {status !== 'approved' && (
                        <>
                          <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 min-w-0">
                              <input
                                type="file"
                                id={`rework-file-${tag}`}
                                multiple
                                onChange={(e) => setTagFiles(prev => ({ ...prev, [tag]: Array.from(e.target.files || []) }))}
                                accept="image/*,.pdf"
                                className="hidden"
                              />
                              <label
                                htmlFor={`rework-file-${tag}`}
                                className="w-full flex items-center justify-between px-3 py-1.5 border border-dashed border-border hover:border-primary rounded-xl cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-all truncate"
                              >
                                <span>{files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Select File(s) (image/pdf)'}</span>
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded ml-2 shrink-0">Browse</span>
                              </label>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <textarea
                              value={noteText}
                              onChange={(e) => setTagMessage(prev => ({ ...prev, [tag]: e.target.value }))}
                              placeholder="Add a message (optional)..."
                              rows={1}
                              className="flex-1 min-w-0 px-3 py-1.5 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                            <button
                              onClick={() => handleTagUploadAndSend(tag)}
                              disabled={loadingThis || (files.length === 0 && !noteText.trim())}
                              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Mail size={13} /> {loadingThis ? 'Sending...' : files.length > 0 ? (status === 'uploaded' ? 'Update & Resend' : 'Upload & Send') : 'Send Message'}
                            </button>
                          </div>
                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {files.map((f, i) => (
                                <span key={i} className="text-[10px] font-medium px-2 py-1 rounded-lg bg-muted text-foreground flex items-center gap-1">
                                  {f.name}
                                  <button onClick={() => setTagFiles(prev => ({ ...prev, [tag]: (prev[tag] || []).filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive">
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {status === 'uploaded' && (
                            <p className="text-[10px] text-muted-foreground mt-1.5">Already sent — you can still add more, message, or replace it with a new upload until it's approved.</p>
                          )}
                        </>
                      )}

                      {status === 'uploaded' && isReworkInitiator && (
                        <div className="mt-2">
                          {!tagRejectOpen[tag] ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveTag(tag)}
                                disabled={loadingThis}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} /> {loadingThis ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => setTagRejectOpen(prev => ({ ...prev, [tag]: true }))}
                                disabled={loadingThis}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-all disabled:opacity-50"
                              >
                                <XCircle size={13} /> Cancelled
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <textarea
                                value={tagRejectReason[tag] || ''}
                                onChange={(e) => setTagRejectReason(prev => ({ ...prev, [tag]: e.target.value }))}
                                placeholder="Reason this isn't approved..."
                                rows={2}
                                className="w-full px-3 py-1.5 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRejectTag(tag)}
                                  disabled={loadingThis || !(tagRejectReason[tag] || '').trim()}
                                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                  {loadingThis ? 'Sending...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setTagRejectOpen(prev => ({ ...prev, [tag]: false }))}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted transition-all"
                                >
                                  Back
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {status === 'uploaded' && !isReworkInitiator && (
                        <p className="text-[10px] text-muted-foreground mt-2">Waiting on the rework initiator to review.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(isReworkInitiator || isAdmin) && (
              <div className="mt-4 pt-4 border-t border-border/80">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Add Another Issue</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newIssueText}
                    onChange={(e) => setNewIssueText(e.target.value)}
                    placeholder="What else needs to be corrected?"
                    className="flex-1 min-w-0 px-3 py-1.5 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddReworkItem}
                    disabled={isAddingIssue || !newIssueText.trim()}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={13} /> {isAddingIssue ? 'Adding...' : `Add as Issue ${reworkTags.length + 1}`}
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          <div className="stat-card">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Conversation</h4>
            {reworkHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rework activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {reworkHistory.reduce((groups: any[], event: any) => {
                  if (event.type === 'sent_for_rework') {
                    groups.push({ ...event, uploads: [] });
                  } else if (groups.length > 0) {
                    groups[groups.length - 1].uploads.push(event);
                  }
                  return groups;
                }, []).map((group: any, idx: number) => {
                  const isExpanded = expandedReworkGroups.has(idx);
                  const toggle = () => setExpandedReworkGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(idx)) next.delete(idx); else next.add(idx);
                    return next;
                  });
                  return (
                    <div key={idx} className="border border-border/60 rounded-lg overflow-hidden">
                      <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left">
                        <span className="w-5 h-5 shrink-0 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <RefreshCw size={11} />
                        </span>
                        <span className="text-xs font-bold text-foreground">Rework {idx + 1}</span>
                        {group.by && <span className="text-[10px] text-muted-foreground">by {group.by}</span>}
                        {group.uploads.length > 0 && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${group.uploads.some((u: any) => u.type === 'cancelled') ? 'bg-red-100 text-red-700' : group.uploads.some((u: any) => u.type === 'approved') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {group.uploads.length} update{group.uploads.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                          {group.at ? format(new Date(group.at), 'd MMM yyyy, h:mm a') : '—'}
                        </span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-border/50">
                          {group.remarks && <p className="text-sm text-foreground mt-2">{group.remarks}</p>}
                          {group.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {group.tags.map((tag: string) => (
                                <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{tag}</span>
                              ))}
                            </div>
                          )}
                          {group.uploads.map((upload: any, uIdx: number) => {
                            const isApproved = upload.type === 'approved' || upload.type === 'item_approved';
                            const isRejected = upload.type === 'cancelled' || upload.type === 'item_rejected';
                            const isMessage = upload.type === 'message';
                            const isAdded = upload.type === 'item_added';
                            const UploadIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : isMessage ? MessageCircle : isAdded ? Plus : FileText;
                            const iconColor = isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : isMessage ? 'text-slate-600' : isAdded ? 'text-amber-600' : 'text-blue-600';
                            const label = isApproved ? 'Approved' : isRejected ? 'Not Approved' : isMessage ? 'Message' : isAdded ? 'Issue Added' : 'Reply';
                            return (
                              <div key={uIdx} className="flex items-start gap-2 mt-2.5 pt-2.5 border-t border-border/40">
                                <UploadIcon size={12} className={`${iconColor} mt-0.5 shrink-0`} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                                    {upload.docLabel && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{upload.docLabel}</span>
                                    )}
                                    {isMessage && upload.by && (
                                      <span className="text-[10px] text-muted-foreground">by {upload.by}</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground">{upload.message}</p>
                                  {upload.documentIds?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {upload.documentIds.map((docId: number) => {
                                        const doc = (documents as any[]).find(d => d.id === docId);
                                        return (
                                          <button
                                            key={docId}
                                            onClick={() => previewDocument(doc || { id: docId, file_name: 'Document' })}
                                            disabled={loadingPreview === docId}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-medium transition-colors disabled:opacity-50"
                                          >
                                            <Eye size={10} /> {loadingPreview === docId ? 'Loading…' : (doc?.file_name || `Document #${docId}`)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">{upload.at ? format(new Date(upload.at), 'd MMM yyyy, h:mm a') : '—'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (activeTab === 'rto' && id) {
      return <RtoStatusCard loanId={id} />;
    }
    if (activeTab === 'credit') {
      return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading credit report…</div>}>
          <CreditTab loan={loan} />
        </Suspense>
      );
    }
    if (activeTab === 'loan') {
      return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading loan details…</div>}>
          <LoanTab
            loan={loan}
            displayLoanAmount={displayLoanAmount}
            displayTenure={displayTenure}
            displayIrr={displayIrr}
            displayEmiAmount={displayEmiAmount}
            lenders={lenders}
            branchOptions={branchOptions}
            loadingBranches={loadingBranches}
            handleLenderChange={handleLenderChange}
            handleBranchChange={handleBranchChange}
            {...editProps}
          />
        </Suspense>
      );
    }
    if (activeTab === 'vehicle') {
      return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading vehicle details…</div>}>
          <VehicleTab loan={loan} idvData={idvData} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading applicant details…</div>}>
        <ApplicantTab loan={loan} banks={banks} {...editProps} />
      </Suspense>
    );
  };

  return (
    <div>
      <button onClick={() => navigate(isOpsTeam ? '/ops/leads' : '/loans')} className="lg:flex hidden items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> {isOpsTeam ? 'Back to Operations' : 'Back to Applications'}
      </button>

      {/* Mobile sticky header + actions via portal */}
      {createPortal(
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm rounded-b-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => navigate(-1)} className="p-1.5 bg-muted/50 rounded-lg shrink-0">
                <ArrowLeft size={16} className="text-primary" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate leading-tight">{loan.loan_number || loan.id}</p>
                <p className="text-[10px] text-muted-foreground truncate">{loan.applicant_name} • {(loan as any).maker_name || loan.car_make}</p>
              </div>
            </div>
            <LoanStatusBadge status={loan.status as any} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide">
            {!isExecutive && (
              <button onClick={() => setShowReapplyModal(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent">
                <RefreshCw size={12} /> Reapply
              </button>
            )}
            {!isExecutive && (
              <button
                onClick={() => setShowStageManager(true)}
                disabled={!canUpdateStage()}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                title={!canUpdateStage() ? 'Stage update not allowed (timer expired or stage disabled)' : 'Update Stage'}
              >
                <Settings size={12} /> Stage
              </button>
            )}
            {!isExecutive && (
              <button onClick={() => setShowShareMenu(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent" title="Share options">
                <Share2 size={12} /> Share
              </button>
            )}
            {!isExecutive && (
              <button onClick={() => setShowRCMenu(true)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent" title="RC Template options">
                <FileText size={12} /> RC
              </button>
            )}
            {!isExecutive && ['APPROVED', 'DISBURSED'].includes((loan as any).application_stage) && (
              <button onMouseEnter={preloadFolioLedger} onPointerEnter={preloadFolioLedger} onClick={() => navigate(`/loans/${loan.id}/payments`)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent">
                <IndianRupee size={12} /> RC Limits
              </button>
            )}
            {isAdmin && (
              <button onClick={() => navigate(`/loans/edit/${loan.id}`)} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm active:scale-95 transition-all border border-transparent">
                <Edit2 size={12} /> Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => { if (confirm('Delete this loan?')) deleteLoan.mutate(); }} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                Delete
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Mobile spacer */}
      <div className="lg:hidden h-[88px]" />

      <Sheet open={showShareMenu} onOpenChange={setShowShareMenu}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle>Share Loan</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                setShowShareMenu(false);
                handleShareAll();
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Share PDF</p>
                  <p className="text-xs text-muted-foreground">Saved loan PDF only</p>
                </div>
                <Share2 size={18} className="text-blue-500 shrink-0" />
              </div>
            </button>
            {documents.length > 0 && (
              <button
                onClick={() => {
                  setShowShareMenu(false);
                  handleShareDocuments();
                }}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Share Documents</p>
                    <p className="text-xs text-muted-foreground">All loan documents</p>
                  </div>
                  <FileText size={18} className="text-green-500 shrink-0" />
                </div>
              </button>
            )}
            <button
              onClick={() => {
                setShowShareMenu(false);
                downloadLoanPDF(loan, documents as any[]);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Download PDF</p>
                  <p className="text-xs text-muted-foreground">Save a copy on this device</p>
                </div>
                <Download size={18} className="text-accent shrink-0" />
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showRCMenu} onOpenChange={setShowRCMenu}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl px-5 pb-6 pt-5">
          <SheetHeader>
            <SheetTitle>RC Template</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                setShowRCMenu(false);
                downloadRCTemplatePDF(loan);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Download</p>
                  <p className="text-xs text-muted-foreground">Save RC template on device</p>
                </div>
                <Download size={18} className="text-cyan-500 shrink-0" />
              </div>
            </button>
            <button
              onClick={() => {
                setShowRCMenu(false);
                exportRCTemplatePDF(loan);
              }}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">View</p>
                  <p className="text-xs text-muted-foreground">Preview RC template</p>
                </div>
                <Eye size={18} className="text-indigo-500 shrink-0" />
              </div>
            </button>
            {navigator.share && (
              <button
                onClick={() => {
                  setShowRCMenu(false);
                  shareRCTemplatePDF(loan);
                }}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Share</p>
                    <p className="text-xs text-muted-foreground">Share RC template natively</p>
                  </div>
                  <Share2 size={18} className="text-blue-500 shrink-0" />
                </div>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reapply Confirmation Modal */}
      {showReapplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Reapply Loan</h3>
            <p className="text-sm text-muted-foreground mb-6">This will open a pre-filled loan form with the same details. You can edit before submitting.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReapplyModal(false)} className="px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted transition-all text-sm">Cancel</button>
              <button
                onClick={handleReapply}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden sm:flex sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{loan.loan_number || loan.id}</h1>
            <LoanStatusBadge status={loan.status as any} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{loan.applicant_name} • {(loan as any).maker_name || loan.car_make} {(loan as any).model_variant_name || loan.car_model}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {!isExecutive && (
              <button
                onClick={() => exportLoanPDF(loan, documents as any[])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
              >
                <Printer size={14} className="text-accent" />
                Export
              </button>
            )}
            {!isExecutive && (
              <button
                onClick={() => setShowReapplyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-orange-500/10 hover:border-orange-500 transition-colors"
              >
                <RefreshCw size={14} className="text-orange-500" />
                Reapply
              </button>
            )}
            {!isExecutive && (
              <button
                onClick={() => downloadLoanPDF(loan, documents as any[])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-accent/10 hover:border-accent transition-colors"
              >
                <Download size={14} className="text-accent" />
                Download
              </button>
            )}
            {!isExecutive && (
              <button
                onClick={() => setShowStageManager(true)}
                disabled={!canUpdateStage()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-purple-500/10 hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border"
                title={!canUpdateStage() ? 'Stage update not allowed (timer expired or stage disabled)' : 'Update Stage'}
              >
                <Settings size={14} className="text-purple-500" />
                Update Stage
              </button>
            )}
            {!isExecutive && ['APPROVED', 'DISBURSED'].includes((loan as any).application_stage) && (
              <button
                onMouseEnter={preloadFolioLedger}
                onPointerEnter={preloadFolioLedger}
                onClick={() => navigate(`/loans/${loan.id}/payments`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500 bg-card text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                title="RC Limits"
              >
                <IndianRupee size={14} />
                RC Limits
              </button>
            )}
          </div>

          {!isExecutive && <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
              title="Share options"
            >
              <Share2 size={14} className="text-blue-500" />
              Share
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={handleShareAll}
                disabled={shareBundleLoading}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50 disabled:opacity-60"
              >
                <Share2 size={12} className="text-blue-500" />
                Share PDF
              </button>
              {documents.length > 0 && (
                <button
                  onClick={handleShareDocuments}
                  disabled={documentShareBundleLoading}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Share Documents
                </button>
              )}
              <button
                onClick={() => downloadLoanPDF(loan, documents as any[])}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2"
              >
                <Download size={12} className="text-accent" />
                Download PDF
              </button>
            </div>
          </div>}
          {!isExecutive && <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-cyan-500/10 hover:border-cyan-500 transition-colors"
              title="RC Template options"
            >
              <FileText size={14} className="text-cyan-500" />
              RC Template
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => downloadRCTemplatePDF(loan)}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
              >
                <Download size={12} className="text-cyan-500" />
                Download
              </button>
              <button
                onClick={() => exportRCTemplatePDF(loan)}
                className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2 border-b border-border/50"
              >
                <Eye size={12} className="text-indigo-500" />
                View
              </button>
              {navigator.share && (
                <button
                  onClick={() => shareRCTemplatePDF(loan)}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 flex items-center gap-2"
                >
                  <Share2 size={12} className="text-blue-500" />
                  Share
                </button>
              )}
            </div>
          </div>}
          {canDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this loan application? This action cannot be undone.')) {
                  deleteLoan.mutate();
                }
              }}
              disabled={deleteLoan.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 bg-card text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => navigate(`/loans/edit/${loan.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
            >
              <Edit2 size={14} className="text-blue-500" />
              Edit
            </button>
          )}
        </div>
      </div>

      {(loan as any).application_stage === 'REWORK' && (
        <div className="mx-4 lg:mx-0 mt-4 lg:mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <RefreshCw size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 min-w-0">
              <p className="font-semibold">Sent back for rework{(loan as any).rework_from_stage ? ` (was at ${(loan as any).rework_from_stage})` : ''}</p>
              {(loan as any).rework_remarks && <p className="mt-0.5">{(loan as any).rework_remarks}</p>}
              {Array.isArray((loan as any).rework_tags) && (loan as any).rework_tags.length > 0 && (
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">Pending: {(loan as any).rework_tags.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-1 mt-4 lg:mt-0">
        {/* Status Pipeline */}
        <div className="py-2 min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-4">Status Pipeline</h3>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {(() => {
              // REWORK/REJECTED/CANCELLED are side-exits, not forward steps — only
              // this subset represents real linear progress. When the loan is
              // sitting in REWORK, show progress up to the stage it will return
              // to (rework_from_stage), not up to REWORK's own position in the
              // full stages list (which used to light up every single stage).
              const FORWARD_ORDER = ['SUBMITTED', 'LOGIN', 'IN_PROCESS', 'APPROVED', 'DISBURSED'];
              const actualStage = (loan as any).application_stage;
              const effectiveStage = actualStage === 'REWORK' ? ((loan as any).rework_from_stage || 'SUBMITTED') : actualStage;
              const currentIdx = FORWARD_ORDER.indexOf(effectiveStage);
              const isRejectedOrCancelled = ['REJECTED', 'CANCELLED'].includes(actualStage);
              const isReworkNow = actualStage === 'REWORK';

              return APPLICATION_STAGES.map((s, i) => {
                const stageIdx = FORWARD_ORDER.indexOf(s.value);
                const isActive = stageIdx !== -1 && currentIdx !== -1 && stageIdx <= currentIdx;
                const isCurrent = s.value === actualStage;
                const isRework = s.value === 'REWORK';
                return (
                  <div key={s.value} className="flex items-center gap-1 shrink-0">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${isCurrent
                      ? isRejectedOrCancelled
                        ? 'bg-red-500 text-white shadow-sm'
                        : isRework
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-primary text-secondary shadow-sm'
                      : isActive && !isRejectedOrCancelled && !(isReworkNow && isRework)
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                      <div className={`w-1 h-1 rounded-full ${isCurrent
                        ? 'bg-white'
                        : isActive && !isRejectedOrCancelled
                          ? 'bg-primary'
                          : 'bg-muted-foreground/40'
                        }`} />
                      {s.label}
                    </div>
                    {i < APPLICATION_STAGES.length - 1 && (
                      <div className={`w-2.5 h-[1.5px] rounded-full ${isActive && stageIdx !== -1 && stageIdx < currentIdx && !isRejectedOrCancelled
                        ? 'bg-primary/30'
                        : 'bg-border'
                        }`} />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Team Hierarchy */}
        <div className="py-2 min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-4">Team Hierarchy</h3>
          <div className="flex items-center overflow-x-auto pb-1 scrollbar-hide">
            {[
              (loan as any).created_by_name && { label: 'Executive', name: (loan as any).created_by_name, branch: (loan as any).created_by_branch, color: 'bg-violet-500' },
              (loan as any).team_leader_name && { label: 'Team Leader', name: (loan as any).team_leader_name, branch: (loan as any).team_leader_branch, color: 'bg-blue-500' },
              (loan as any).branch_manager_name && { label: 'Branch Mgr', name: (loan as any).branch_manager_name, branch: (loan as any).manager_branch, color: 'bg-amber-500' },
              (loan as any).senior_manager_name && (loan as any).senior_manager_name !== (loan as any).branch_manager_name && { label: 'Sales Mgr', name: (loan as any).senior_manager_name, branch: (loan as any).senior_manager_branch, color: 'bg-orange-500' },
            ].filter(Boolean).map((item: any, idx, arr) => (
              <div key={idx} className="flex items-center shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 w-[140px] h-[52px]">
                  <div className={`w-6 h-6 rounded-full ${item.color} text-white flex items-center justify-center text-[8px] font-bold shrink-0`}>
                    {item.label.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] text-muted-foreground font-bold uppercase leading-none mb-0.5">{item.label}</p>
                    <p className="text-[10px] font-bold text-foreground truncate">{item.name}</p>
                    {item.branch && <p className="text-[8px] text-muted-foreground truncate leading-none mt-0.5">{item.branch}</p>}
                  </div>
                </div>
                {idx < arr.length - 1 && <div className="w-3 h-[2px] bg-border shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab switcher — hidden for ops_team */}
      {!isOpsTeam && <div className="flex gap-1.5 mb-4 bg-[#E8EEFF]/40 p-1 rounded-xl w-fit border border-[#0024A2]/10">
        {((loan as any).application_stage === 'REWORK' || (loan as any).rework_remarks) && (
          <button
            onClick={() => setActiveTab('rework')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'rework' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'
              }`}
          >
            Rework
          </button>
        )}
        <button
          onClick={() => setActiveTab('loan')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'loan' ? 'bg-[#0024A2] text-white shadow-sm' : 'text-slate-600 hover:text-[#0024A2] hover:bg-[#E8EEFF]/40'
            }`}
        >
          Loan Info
        </button>
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'vehicle' ? 'bg-[#0024A2] text-white shadow-sm' : 'text-slate-600 hover:text-[#0024A2] hover:bg-[#E8EEFF]/40'
            }`}
        >
          Vehicle Info
        </button>
        <button
          onClick={() => setActiveTab('applicant')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'applicant' ? 'bg-[#0024A2] text-white shadow-sm' : 'text-slate-600 hover:text-[#0024A2] hover:bg-[#E8EEFF]/40'
            }`}
        >
          Applicant Info
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'credit' ? 'bg-[#0024A2] text-white shadow-sm' : 'text-slate-600 hover:text-[#0024A2] hover:bg-[#E8EEFF]/40'
            }`}
        >
          Credit Report
        </button>
        {isDisbursed && (
          <button
            onClick={() => setActiveTab('rto')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'rto' ? 'bg-[#0024A2] text-white shadow-sm' : 'text-slate-600 hover:text-[#0024A2] hover:bg-[#E8EEFF]/40'
              }`}
          >
            RTO Status
          </button>
        )}
      </div>}

      {renderTab()}

      {/* RTO (VAHAN) status — ops team has no tabs, so show it under the ops view */}
      {isOpsTeam && isDisbursed && id && <RtoStatusCard loanId={id} />}

      {/* Documents Section (Read-only) — hidden for ops_team */}
      {!isOpsTeam && <div className="stat-card mt-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-accent"><FileText size={18} /></span>
          <h3 className="font-semibold text-foreground">Loan Documents</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{(documents as any[]).length} files</span>
        </div>

        {/* Inline Preview */}
        {previewDoc && (
          <div className="mb-4 rounded-xl border border-border overflow-hidden bg-background">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{previewDoc.name}</p>
              <button onClick={() => {
                if (previewDoc.url.startsWith('blob:')) {
                  URL.revokeObjectURL(previewDoc.url);
                }
                setPreviewDoc(null);
              }} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            <iframe
              src={previewDoc.url}
              className="w-full border-0"
              style={{ height: '60vh', minHeight: '300px' }}
              title={previewDoc.name}
              sandbox="allow-same-origin allow-scripts"
              loading="lazy"
            />
          </div>
        )}

        {/* Document list */}
        {(documents as any[]).length > 0 && (
          <div className="grid gap-2">
            {(documents as any[]).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <FileText size={16} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-foreground">{getDocLabel(doc.document_type)}</p>
                    {doc.status === 'verified' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Approved</span>
                    )}
                    {doc.status === 'rejected' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Rejected</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{doc.file_name}</p>
                </div>
                <button
                  onClick={() => previewDocument(doc)}
                  disabled={loadingPreview === doc.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent transition-colors text-xs font-medium disabled:opacity-50"
                  title="Preview"
                >
                  <Eye size={14} /> {loadingPreview === doc.id ? 'Loading…' : 'View'}
                </button>
              </div>
            ))}
          </div>
        )}
        {(documents as any[]).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No documents available.</p>
        )}

        {/* Upload documents form */}
        <div className="mt-6 pt-4 border-t border-border/80">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Upload New Document</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {DOC_TYPES.map(doc => (
                <option key={doc.value} value={doc.value}>{doc.label}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-0">
              <input
                type="file"
                id="direct-doc-file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf"
                className="hidden"
              />
              <label
                htmlFor="direct-doc-file"
                className="w-full flex items-center justify-between px-3 py-1.5 border border-dashed border-border hover:border-primary rounded-xl cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-all truncate"
              >
                <span>{uploadFile ? uploadFile.name : 'Select File (image/pdf)'}</span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded ml-2 shrink-0">Browse</span>
              </label>
            </div>
            <button
              onClick={handleDirectUpload}
              disabled={isUploadingDoc || !uploadFile}
              className="sm:w-auto w-full px-4 py-1.5 rounded-xl bg-primary text-secondary text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1"
            >
              {isUploadingDoc ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>}



      {/* Loan Application Stage Manager Modal */}
      <LoanApplicationStageManager
        loan={loan}
        isOpen={showStageManager}
        onClose={() => setShowStageManager(false)}
      />
    </div>
  );
}