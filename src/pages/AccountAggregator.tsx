import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  Database,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Phone,
  User,
  ShieldAlert,
  X,
  CreditCard,
  RefreshCw,
  Download,
  Settings,
  Plus,
  Search,
  Tag,
  Trash2,
  FileText,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import balanceIllustration from "@/assets/balance_illustration.png";

export default function AccountAggregator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [showNewProcessModal, setShowNewProcessModal] = useState(false);
  const [showSetFeeModal, setShowSetFeeModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mobile_number: ''
  });

  // Paytm checkout states
  const [showPaytmModal, setShowPaytmModal] = useState(false);
  const [paytmData, setPaytmData] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'mobile_login' | 'otp_verify' | 'processing'>('mobile_login');
  const [processingStatus, setProcessingStatus] = useState('');

  const [activeSession, setActiveSession] = useState<any>(null);

  // Admin config states
  const [adminFeeInput, setAdminFeeInput] = useState('');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  // Wallet states
  const [rechargeAmount, setRechargeAmount] = useState('');

  // Filters state
  const [selectedExecutive, setSelectedExecutive] = useState('All Users');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Read URL query params from Paytm callback redirect
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    const message = searchParams.get('message');

    if (!paymentStatus) return;

    const processPaymentReturn = async () => {
      if (paymentStatus === 'completed' && orderId) {
        toast.success(`🎉 Payment verified! Processing Account Aggregator...`);

        // Auto-continue: find the AA session matching this orderId and sync its status
        try {
          // Fetch sessions to find the one with this order_id
          const sessionsRes = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/sessions`,
            { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } }
          );
          const sessionsData = await sessionsRes.json();

          // Handle both array response and object with data/sessions key
          const allSessions = Array.isArray(sessionsData)
            ? sessionsData
            : Array.isArray(sessionsData?.data)
              ? sessionsData.data
              : Array.isArray(sessionsData?.sessions)
                ? sessionsData.sessions
                : [];

          const matchedSession = allSessions.find((s: any) => s.order_id === orderId);

          if (matchedSession?.client_id) {
            // Trigger status sync through the API to complete the AA process
            const syncRes = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/status/${matchedSession.client_id}`,
              { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } }
            );
            const syncData = await syncRes.json();

            if (syncRes.ok && syncData.status === 'completed') {
              toast.success(`✅ AA process completed! PDF report is now available for download.`);
            } else {
              toast.info(`AA process synced. Status: ${syncData.status || 'processing'}`);
            }
          } else {
            toast.info('Payment completed. AA session will sync automatically.');
          }
        } catch (err) {
          toast.info('Payment completed. Please use the Sync button to update AA status.');
        }
      } else if (paymentStatus === 'failed') {
        toast.error(`❌ Payment failed.${orderId ? ` Order: ${orderId}` : ''}`);
      } else if (paymentStatus === 'bypassed') {
        toast.success(`⚡ Payment bypassed. AA process completed!`);
      } else if (paymentStatus === 'error') {
        toast.error(`Payment error: ${message || 'Something went wrong'}`);
      } else {
        toast.info(`Payment status: ${paymentStatus}${orderId ? ` — Order: ${orderId}` : ''}`);
      }

      // Refresh sessions list to reflect updated statuses
      queryClient.invalidateQueries({ queryKey: ['aa-sessions'] });

      // Clean URL query params so reload doesn't re-trigger
      setSearchParams({}, { replace: true });
    };

    processPaymentReturn();
  }, [searchParams, setSearchParams, queryClient]);

  // Fetch current fee configuration
  const { data: feeData } = useQuery({
    queryKey: ['aa-fee'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/config/fee`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        }
      );
      if (!response.ok) return { fee: 250 };
      return await response.json();
    }
  });

  // Fetch admin bypass config
  const { data: bypassData } = useQuery({
    queryKey: ['aa-bypass'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/config/bypass`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        }
      );
      if (!response.ok) return { bypass: false };
      return await response.json();
    }
  });

  const currentFee = feeData?.fee ?? 250;
  const isBypassEnabled = bypassData?.bypass ?? false;

  // Initialize admin inputs on fee data load
  useEffect(() => {
    if (feeData) {
      setAdminFeeInput(feeData.fee.toString());
    }
  }, [feeData]);

  // Fetch AA Sessions with dynamic 5s background polling
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['aa-sessions'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/sessions`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        }
      );
      if (!response.ok) return [];
      return await response.json();
    },
    refetchInterval: 5000
  });

  // Fetch Wallet Balance
  const { data: walletData, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/wallet/balance`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return { balance: 0 };
      return await response.json();
    },
    refetchInterval: 10000
  });

  // Recharge Wallet Mutation
  const rechargeWallet = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/wallet/recharge/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ amount })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to initiate recharge');
      return data;
    },
    onSuccess: (data) => {
      toast.info('Redirecting to secure Paytm Checkout...');
      const mid = data.merchant_id;
      const orderId = data.paytm_params?.orderId || data.txn_id;
      const txnToken = data.paytm_params?.txnToken || 'mock_token';
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `https://secure.paytmpayments.com/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderId}`;
      form.target = '_blank';

      Object.entries({ mid, orderId, txnToken }).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      form.remove();
      setRechargeAmount('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to recharge wallet');
    }
  });

  const handleRecharge = () => {
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    rechargeWallet.mutate(amt);
  };

  // Extract unique list of executives for filter select dropdown
  const uniqueExecutives = Array.from(
    new Set(sessions.map((s: any) => s.created_by_name).filter(Boolean))
  ) as string[];

  // Client-side filtering matching executive filter and search query
  const filteredSessions = sessions.filter((s: any) => {
    // 1. Executive filter
    if (selectedExecutive !== 'All Users' && s.created_by_name !== selectedExecutive) {
      return false;
    }
    // 2. Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const customerNameMatch = s.customer_name?.toLowerCase().includes(query);
      const mobileMatch = s.mobile_number?.includes(query);
      const clientIdMatch = s.client_id?.toLowerCase().includes(query);
      return customerNameMatch || mobileMatch || clientIdMatch;
    }
    return true;
  });

  // Auto-sync search input if empty (makes clearing feel fast)
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchQuery('');
    }
  }, [searchInput]);

  // Initiate AA Consent Session
  const initSession = useMutation({
    mutationFn: async (payload: { mobile_number: string; consent_type: string; order_id?: string; payment_status?: string; customer_name?: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/init`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate consent session');
      }
      return data;
    },
    onSuccess: (data) => {
      setActiveSession(data.data);
      queryClient.invalidateQueries({ queryKey: ['aa-sessions'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error initiating session');
    }
  });

  // Delete AA session
  const deleteSession = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/delete/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete session record');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Session record deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['aa-sessions'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete record');
    }
  });

  // Polling check status for active modal payment verification (database status driven)
  useEffect(() => {
    if (!showPaytmModal || !paytmData) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/status/${paytmData.txn_id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          }
        );
        const data = await response.json();

        if (response.ok && data.success) {
          if (data.status === 'completed') {
            clearInterval(intervalId);
            setPaymentStep('processing');
            setProcessingStatus('Verifying completed transaction status...');

            setTimeout(async () => {
              try {
                setProcessingStatus('Creating Account Aggregator session...');
                await initSession.mutateAsync({
                  mobile_number: formData.mobile_number,
                  consent_type: 'loan_underwriting',
                  order_id: paytmData.txn_id,
                  payment_status: 'completed',
                  customer_name: formData.name
                });

                toast.success('🎉 Paytm Payment Verified & AA Session Created!');
                setShowPaytmModal(false);
                setShowNewProcessModal(false);
                setFormData({ name: '', mobile_number: '' });
              } catch (err: any) {
                toast.error(err.message || 'Failed to create session after payment');
                setShowPaytmModal(false);
              }
            }, 1500);
          } else if (data.status === 'failed') {
            clearInterval(intervalId);
            toast.error('❌ Paytm Scan & Pay transaction failed.');
            setShowPaytmModal(false);
          }
        }
      } catch (err) {
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [showPaytmModal, paytmData, formData, initSession]);

  // Click handler to simulate a successful callback from gateway (Developer/tester shortcut)
  const handleSimulateCallback = async (simulatedSuccess: boolean) => {
    if (!paytmData) return;
    try {
      toast.info('Simulating Paytm checkout webhook...');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          txn_id: paytmData.txn_id,
          status: simulatedSuccess ? 'success' : 'failed',
          paytm_txn_id: simulatedSuccess ? `PAYTM_AA_${Date.now()}` : null
        })
      });
      if (response.ok) {
        toast.success('Paytm checkout webhook simulated successfully!');
      } else {
        toast.error('Failed to trigger webhook simulation');
      }
    } catch (err) {
      toast.error('Error simulating webhook callback');
    }
  };

  // Sync session status through API
  const handleSyncStatus = async (clientId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/status/${clientId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        }
      );
      const data = await response.json();
      if (response.ok) {
        toast.success(`Session synced successfully! Status: ${data.status.toUpperCase()}`);
        queryClient.invalidateQueries({ queryKey: ['aa-sessions'] });
      } else {
        toast.error(data.message || 'Failed to sync status');
      }
    } catch (err) {
      toast.error('Error syncing status');
    }
  };

  // Download PDF report
  const handleDownloadPDF = (clientId: string) => {
    const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/account-aggregator-v2/download/${clientId}`;
    const token = localStorage.getItem('auth_token');

    toast.info('Downloading PDF consent report...');

    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('PDF download failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AA_Report_${clientId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('PDF downloaded successfully!');
      })
      .catch(err => {
        toast.error('Failed to download report PDF');
      });
  };

  // Admin update pricing fee & bypass settings
  const handleUpdateFeeAndBypass = async (feeNum: number, bypassState: boolean) => {
    setIsUpdatingConfig(true);
    try {
      // 1. Save Fee config
      const feeResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/config/fee`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ fee: feeNum })
        }
      );

      // 2. Save Bypass config
      const bypassResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/config/bypass`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ bypass: bypassState })
        }
      );

      if (feeResponse.ok && bypassResponse.ok) {
        toast.success('Onboarding configurations updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['aa-fee'] });
        queryClient.invalidateQueries({ queryKey: ['aa-bypass'] });
        setShowSetFeeModal(false);
      } else {
        toast.error('Failed to update configurations');
      }
    } catch (err) {
      toast.error('Error updating pricing config');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // Redirection helper to open the secure Paytm payment gateway page
  const handleOpenPaytmCheckout = () => {
    if (!paytmData) return;

    const mid = paytmData.merchant_id;
    const orderId = paytmData.paytm_params?.orderId || paytmData.txn_id;
    const txnToken = paytmData.paytm_params?.txnToken || 'mock_token';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://secure.paytmpayments.com/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderId}`;
    form.target = '_blank';

    const params = {
      mid,
      orderId,
      txnToken
    };

    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();

    toast.success('Opening secure Paytm Checkout Page...');
  };

  // Initiate Paytm payment gateway flow
  const handleInitiateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter Borrower Name');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile_number)) {
      toast.error('Please enter a valid 10-digit Mobile Number');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/v1/payment-gateway/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          amount: currentFee,
          purpose: 'Account Aggregator Verification'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate verification transaction');
      }

      if (data.bypassed) {
        toast.success('⚡ Payment bypassed automatically under Admin privilege!');
        const sessionResult = await initSession.mutateAsync({
          mobile_number: formData.mobile_number,
          consent_type: 'loan_underwriting',
          order_id: data.txn_id,
          payment_status: 'bypassed',
          customer_name: formData.name
        });

        // Open the Surepass/Finvu consent redirect URL so the borrower can
        // complete OTP verification and bank account linking
        if (sessionResult?.data?.redirect_url) {
          window.open(sessionResult.data.redirect_url, '_blank');
          toast.success('🔗 Consent page opened! Complete OTP & bank linking to finish the process.');
        }

        toast.success('Consent flow initiated successfully!');
        setFormData({ name: '', mobile_number: '' });
        setShowNewProcessModal(false);
      } else {
        // Redirect instantly to the secure Paytm Payment Gateway page
        const mid = data.merchant_id;
        const orderId = data.paytm_params?.orderId || data.txn_id;
        const txnToken = data.paytm_params?.txnToken || 'mock_token';

        toast.info('Redirecting to secure Paytm Checkout...');

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `https://secure.paytmpayments.com/theia/api/v1/showPaymentPage?mid=${mid}&orderId=${orderId}`;
        form.target = '_blank';

        const params = {
          mid,
          orderId,
          txnToken
        };

        Object.entries(params).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        form.remove();

        // Initiate aggregator session in backend immediately as pending
        await initSession.mutateAsync({
          mobile_number: formData.mobile_number,
          consent_type: 'loan_underwriting',
          order_id: orderId,
          payment_status: 'pending',
          customer_name: formData.name
        });

        setFormData({ name: '', mobile_number: '' });
        setShowNewProcessModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error starting onboarding flow');
    }
  };

  const allowedRoles = ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'ops_team', 'operation_team', 'accountant'];

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-full text-red-500 mb-4">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          You do not have the necessary permissions to view this module.
        </p>
      </div>
    );
  }

  // Format creation timestamp
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8 space-y-6">

      {/* 1. Header Banner Mockup Style */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Aggregator V2</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Standalone processing model with integrated payment verification.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          {/* Set Fee - Admin Config */}
          {user.role === 'admin' && (
            <button
              onClick={() => setShowSetFeeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Tag size={15} className="text-slate-400" />
              <span>Set Fee</span>
              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-xs font-bold border border-indigo-200">
                ₹{currentFee}
              </span>
            </button>
          )}
          {/* New Process */}
          <button
            onClick={() => setShowNewProcessModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Process</span>
          </button>
        </div>
      </div>

      {/* Wallet Card - Original GitHub Design */}
      <div className="w-full relative overflow-hidden transition-all duration-200 border-2 border-white/50 bg-[#E8EEFF] shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
        {/* Image Wrapper */}
        <div className="absolute right-0 top-0 w-1/2 md:w-[35%] h-full pointer-events-none mix-blend-multiply opacity-50 md:opacity-100">
          <img
            src={balanceIllustration}
            alt="Deco"
            className="w-full h-full object-contain object-right"
            style={{ filter: "contrast(1.15) brightness(1.1)" }}
          />
        </div>

        {/* Slide details */}
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Wallet size={24} className="text-[#0024A2]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-600">Wallet Balance</p>
            <h3 className="text-3xl font-bold text-[#0024A2] mt-1 leading-tight">
              ₹{walletData?.balance?.toLocaleString() || '0.00'}
            </h3>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-800">₹</span>
            <input 
              type="number"
              placeholder="Amount to add"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 rounded-xl bg-white border border-blue-200 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400 placeholder:font-normal shadow-sm"
            />
          </div>
          <button 
            onClick={handleRecharge}
            disabled={rechargeWallet.isPending || !rechargeAmount}
            className="px-6 py-3 bg-[#0024A2] text-white hover:bg-blue-800 font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {rechargeWallet.isPending ? 'Processing...' : 'Add Money'}
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Box Mockup Style */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          {/* Executive Selector */}
          <div className="md:col-span-4 flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Executive</label>
            <select
              value={selectedExecutive}
              onChange={e => setSelectedExecutive(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-semibold outline-none transition-all"
            >
              <option value="All Users">All Users</option>
              {uniqueExecutives.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="md:col-span-8 flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Search</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name or Mobile..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setSearchQuery(searchInput)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-semibold transition-all"
                />
              </div>
              <button
                onClick={() => setSearchQuery(searchInput)}
                className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-sm transition-all border border-indigo-100/50 cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

        </div>
      </div>



      {/* 3. Wide Sessions Table Mockup Style */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">

        {isLoadingSessions ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">Loading journeys list...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <AlertCircle size={36} className="mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No initiated aggregator cases found</p>
            <p className="text-xs text-slate-400 mt-1">Try refining your search queries or start a new process.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">AA Status</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {filteredSessions.map((session: any) => {
                  const isCompletedPayment = session.payment_status === 'completed';
                  const isBypassedPayment = session.payment_status === 'bypassed';
                  const isAAPending = session.status === 'initiated' || session.status === 'pending';
                  const isAACompleted = session.status === 'completed';

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Created Date */}
                      <td className="px-6 py-5 whitespace-nowrap text-slate-500 font-medium">
                        {formatDate(session.created_at)}
                      </td>

                      {/* Customer Name */}
                      <td className="px-6 py-5 whitespace-nowrap font-extrabold text-slate-900 uppercase">
                        {session.customer_name || 'UNKNOWN'}
                      </td>

                      {/* Mobile */}
                      <td className="px-6 py-5 whitespace-nowrap text-slate-600 font-semibold">
                        {session.mobile_number}
                      </td>

                      {/* Order ID */}
                      <td className="px-6 py-5 font-mono text-[11px] text-slate-500 font-bold uppercase select-all">
                        {session.order_id || 'BYPASS'}
                      </td>

                      {/* Payment Status Pill */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${isCompletedPayment
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : isBypassedPayment
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isCompletedPayment ? 'bg-emerald-500' : isBypassedPayment ? 'bg-indigo-500' : 'bg-amber-500'
                            }`} />
                          {isCompletedPayment ? 'Completed' : isBypassedPayment ? 'Bypassed' : 'Pending'}
                        </span>
                      </td>

                      {/* AA Status Pill with Live Sync Button */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${isAACompleted
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : isAAPending
                                ? 'bg-blue-50 border-blue-100 text-blue-700'
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isAACompleted ? 'bg-emerald-500' : isAAPending ? 'bg-blue-500' : 'bg-amber-500'
                              }`} />
                            <span className="capitalize">{session.status || 'Initiated'}</span>
                          </span>

                          {/* Sync Button */}
                          <button
                            type="button"
                            onClick={() => handleSyncStatus(session.client_id)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Sync Verification Status"
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Creator User Name */}
                      <td className="px-6 py-5 whitespace-nowrap text-slate-500 font-medium">
                        {session.created_by_name || 'System User'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center gap-2.5">
                          {/* Continue Consent - opens redirect URL for incomplete sessions */}
                          {isAAPending && session.redirect_url && (
                            <button
                              type="button"
                              onClick={() => window.open(session.redirect_url, '_blank')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50/50 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                              title="Open consent page to complete OTP & bank linking"
                            >
                              <ExternalLink size={13} />
                              <span>Continue</span>
                            </button>
                          )}

                          {/* PDF Downloader */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(session.client_id)}
                            disabled={!isAACompleted}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${isAACompleted
                                ? 'border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50/50 cursor-pointer shadow-sm'
                                : 'border-slate-100 text-slate-300 bg-slate-50/50 cursor-not-allowed'
                              }`}
                            title={isAACompleted ? 'Download PDF Onboarding Report' : 'PDF Report is pending AA verification'}
                          >
                            <FileText size={13} />
                            <span>PDF</span>
                          </button>

                          {/* Delete Entry */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this session record?')) {
                                deleteSession.mutate(session.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-rose-200 hover:bg-rose-50/50 text-rose-600 bg-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Delete Session Record"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: Set Fee Config & Bypass Options (Admin only) */}
      {showSetFeeModal && user.role === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col transform transition-all scale-100 animate-slide-up">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-500 animate-spin-slow" />
                <h3 className="font-extrabold text-slate-800 text-base">Onboarding Configuration</h3>
              </div>
              <button
                onClick={() => setShowSetFeeModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* Fee Input */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                  Account Aggregator Verification Fee (₹)
                </label>
                <input
                  type="number"
                  placeholder="Enter fee amount (e.g. 250)"
                  value={adminFeeInput}
                  onChange={e => setAdminFeeInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isUpdatingConfig}
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  This fee dynamically restricts onboarding journeys for regular clients until Paytm payments are verified.
                </p>
              </div>

              {/* Paytm Bypass */}
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 space-y-1">
                  <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Admin Payment Bypass
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    When active, admins automatically bypass payment screens and initiate aggregator flows instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newBypass = !isBypassEnabled;
                    handleUpdateFeeAndBypass(Number(adminFeeInput), newBypass);
                  }}
                  disabled={isUpdatingConfig}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${isBypassEnabled
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {isBypassEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowSetFeeModal(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                disabled={isUpdatingConfig}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateFeeAndBypass(Number(adminFeeInput), isBypassEnabled)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                disabled={isUpdatingConfig}
              >
                {isUpdatingConfig ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. MODAL: New Process - Borrower Details */}
      {showNewProcessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col transform transition-all scale-100 animate-slide-up">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                <h3 className="font-extrabold text-slate-800 text-base">New Aggregator Process</h3>
              </div>
              <button
                onClick={() => setShowNewProcessModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <form onSubmit={handleInitiateFlow} className="flex flex-col">
              <div className="p-6 space-y-5">
                {/* Borrower Name */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <User size={12} className="text-indigo-600" /> Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Borrower's Full Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>

                {/* Borrower Mobile Number */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Phone size={12} className="text-indigo-600" /> Mobile Number *
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit Mobile Number"
                    value={formData.mobile_number}
                    onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-slate-400 mt-0.5" />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    This registers the case and provides dynamic verification through Paytm. Standard verification fee is <span className="font-bold text-slate-700">₹{currentFee}</span>.
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewProcessModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard size={15} />
                  <span>
                    {user?.role === 'admin' && isBypassEnabled ? '⚡ Admin Bypass' : `Pay ₹${currentFee}`}
                  </span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

