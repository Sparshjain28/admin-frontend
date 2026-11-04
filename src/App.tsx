import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { Suspense, lazy, useEffect } from "react";
import { cleanupDigilocker } from "@/lib/digilockerCleanup";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { useScreenshotProtection } from "@/hooks/useScreenshotProtection";
import DashboardLayout from "@/components/DashboardLayout";
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const SSOCallback = lazy(() => import("@/pages/SSOCallback"));
const ForgotMpin = lazy(() => import("@/pages/ForgotMpin"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Loans = lazy(() => import("@/pages/Loans"));
const CreateLoan = lazy(() => import("@/pages/CreateLoan"));
const LoanLoginDetails = lazy(() => import("@/pages/LoanLoginDetails"));
const LoanDetail = lazy(() => import("@/pages/LoanDetail"));
const EditLead = lazy(() => import("@/pages/EditLead"));
const EditLoan = lazy(() => import("@/pages/EditLoan"));
const LoanPaymentRequest = lazy(() => import("@/pages/LoanPaymentRequest"));
const OfflineDisbursement = lazy(() => import("@/pages/OfflineDisbursement"));

const UserManagement = lazy(() => import("@/pages/UserManagement"));
const BankManagement = lazy(() => import("@/pages/BankManagement"));
const BrokerManagement = lazy(() => import("@/pages/BrokerManagement"));
const DsaPerformance = lazy(() => import("@/pages/DsaPerformance"));
const DsaProfile = lazy(() => import("@/pages/DsaProfile"));
const BranchManagement = lazy(() => import("@/pages/BranchManagement"));
const Commission = lazy(() => import("@/pages/Commission"));
const Reports = lazy(() => import("@/pages/Reports"));
const AddLead = lazy(() => import("@/pages/AddLead"));
const LeadsList = lazy(() => import("@/pages/LeadsList"));
const LeadDetail = lazy(() => import("@/pages/LeadDetail"));
const FieldPermissions = lazy(() => import("@/pages/FieldPermissions"));
const DashboardPermissions = lazy(() => import("@/pages/DashboardPermissions"));
const PayoutManagement = lazy(() => import("@/pages/PayoutManagement"));
const ExpenseManagement = lazy(() => import("@/pages/ExpenseManagement"));
const RCLimitModule = lazy(() => import("@/pages/RCLimitModule"));
const RCLimitBills = lazy(() => import("@/pages/RCLimitBills"));
const RCLimitPayments = lazy(() => import("@/pages/RCLimitPayments"));
const SystemConfig = lazy(() => import("@/pages/SystemConfig"));
const LoanComparisonChargesPage = lazy(() => import("@/pages/LoanComparisonChargesPage"));

const AuditLogPage = lazy(() => import("@/pages/AuditLogPage"));
const TeamUsers = lazy(() => import("@/pages/TeamUsers"));
const LinkLoanFinder = lazy(() => import("@/pages/LinkLoanFinder"));
const FolioLedger = lazy(() => import("@/pages/FolioLedger"));
const FindMyLender = lazy(() => import("@/pages/FindMyLender"));
const FindMyEligibility = lazy(() => import("@/pages/FindMyEligibility"));
const FindMyCarValue = lazy(() => import("@/pages/FindMyCarValue"));
const AdminNearbyBranches = lazy(() => import("@/pages/AdminNearbyBranches"));
const LenderAnalysis = lazy(() => import("@/pages/LenderAnalysis"));
const AccountantDashboard = lazy(() => import("@/pages/AccountantDashboard"));
const FolioAccounts = lazy(() => import("@/pages/FolioAccounts"));
const AccountPayments = lazy(() => import("@/pages/AccountPayments"));
const DBView = lazy(() => import("@/pages/DBView"));
const BankAccounts = lazy(() => import("@/pages/BankAccounts"));
const DisbursementLedger = lazy(() => import("@/pages/DisbursementLedger"));
const ApplicationStageManagement = lazy(() => import("@/pages/ApplicationStageManagement"));
const RCTemplatePage = lazy(() => import("@/pages/RCTemplatePage"));
const RCTemplateViewer = lazy(() => import("@/pages/RCTemplateViewer"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const ProfileSetup = lazy(() => import("@/pages/ProfileSetup"));
const VisitingCard = lazy(() => import("@/pages/VisitingCard"));
const Certificate = lazy(() => import("@/pages/Certificate"));
const DocsToShare = lazy(() => import("@/pages/DocsToShare"));
const EMICalculator = lazy(() => import("@/pages/EMICalculator"));
const CallingManagement = lazy(() => import("@/pages/CallingManagement"));
const StandaloneCreditReports = lazy(() => import("@/pages/StandaloneCreditReports"));
const AccountAggregator = lazy(() => import("@/pages/AccountAggregator"));
const ApiUsage = lazy(() => import("@/pages/ApiUsage"));
const AdminApiUsage = lazy(() => import("@/pages/AdminApiUsage"));
const ApiIntegrations = lazy(() => import("@/pages/ApiIntegrations"));
const OperationsLogin = lazy(() => import("@/pages/OperationsLogin"));
const OperationsDashboard = lazy(() => import("@/pages/OperationsDashboard"));
const LoanOperationsDashboard = lazy(() => import("@/pages/LoanOperationsDashboard"));
const OperationsLeads = lazy(() => import("@/pages/OperationsLeads"));
const OpsApiTools = lazy(() => import("@/pages/OpsApiTools"));
const LoansApiIntegration = lazy(() => import("@/pages/LoansApiIntegration"));
const ProductManagement = lazy(() => import("@/pages/ProductManagement"));
const PDDTracking = lazy(() => import("@/pages/PDDTracking"));
const FolioDetails = lazy(() => import("@/pages/FolioDetails"));
const DownloadDocuments = lazy(() => import("@/pages/DownloadDocuments"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AccountDeletion = lazy(() => import("@/pages/AccountDeletion"));
const DsaApplications = lazy(() => import("@/pages/DsaApplications"));
import LoanSelection from "./pages/category/LoanSelection";
import Dashboard2 from "./pages/Dashboard2";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'operation_team') return <Navigate to="/ops/dashboard" replace />;
  if (user.role === 'loan_operations') return <Navigate to="/loan-ops/dashboard" replace />;
  if (user.role === 'accountant') return <Navigate to="/accountant/dashboard" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function RoleProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  const normalizedRole = user.role?.toLowerCase() || '';
  if (!allowedRoles.includes(normalizedRole)) {
    if (normalizedRole === 'loan_operations') return <Navigate to="/loan-ops/dashboard" replace />;
    if (normalizedRole === 'operation_team') return <Navigate to="/ops/dashboard" replace />;
    if (normalizedRole === 'accountant') return <Navigate to="/accountant/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

function RoleDashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'accountant':
      return <Navigate to="/accountant/dashboard" replace />;
    case 'loan_operations':
      return <Navigate to="/loan-ops/dashboard" replace />;
    case 'operation_team':
      return <Navigate to="/ops/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Redirect based on user role
  switch (user.role) {
    case 'accountant':
      return <Navigate to="/accountant/dashboard" replace />;
    case 'loan_operations':
      return <Navigate to="/loan-ops/dashboard" replace />;
    case 'operation_team':
      return <Navigate to="/ops/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

function AppRoutes() {
  const auth = useAuth();
  const location = useLocation();
  useScreenshotProtection();

  if (!auth.currentPortal) {
    return <NotFound />;
  }

  // Clean up any stray DigiLocker buttons that leaked into document.body on route change
  useEffect(() => {
    cleanupDigilocker();
  }, [location.pathname]);

  // Set data-role attribute on HTML element for accountant role
  React.useEffect(() => {
    if (auth.user?.role === 'accountant') {
      document.documentElement.setAttribute('data-role', 'accountant');
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [auth.user?.role]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const { user } = auth;
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/ops-login" element={user ? <Navigate to="/ops/dashboard" replace /> : <OperationsLogin />} />
        <Route path="/loan-ops/dashboard" element={
          <RoleProtectedRoute allowedRoles={['loan_operations']}>
            <LoanOperationsDashboard />
          </RoleProtectedRoute>
        } />
        <Route path="/ops/dashboard" element={
          <RoleProtectedRoute allowedRoles={['operation_team']}>
            <OperationsDashboard />
          </RoleProtectedRoute>
        } />
        <Route
          path="/loan"
          element={
            <ProtectedRoute>
              {user?.role === 'loan_operations' ? (
                <Navigate to="/loans" replace />
              ) : (
                <LoanSelection />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="/ops/leads" element={
          <RoleProtectedRoute allowedRoles={['operation_team', 'accountant']}>
            <OperationsLeads />
          </RoleProtectedRoute>
        } />
        <Route path="/ops/api-tools" element={
          <RoleProtectedRoute allowedRoles={['operation_team']}>
            <OpsApiTools />
          </RoleProtectedRoute>
        } />
        <Route path="/pdd-management" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager', 'operation_team', 'loan_operations']}>
            <PDDTracking />
          </RoleProtectedRoute>
        } />
        <Route path="/ops/loans/:id" element={
          <RoleProtectedRoute allowedRoles={['operation_team', 'loan_operations', 'accountant']}>
            <LoanDetail />
          </RoleProtectedRoute>
        } />
        <Route path="/download-documents/:id" element={<Suspense fallback={<div>Loading...</div>}><DownloadDocuments /></Suspense>} />
        <Route path="/sso" element={<SSOCallback />} />
        <Route path="/login" element={user ? <RoleDashboardRedirect /> : <Login />} />
        <Route path="/signup" element={user ? <RoleDashboardRedirect /> : <Signup />} />
        <Route path="/join/:token" element={user ? <RoleDashboardRedirect /> : <Signup />} />
        <Route path="/forgot-mpin" element={user ? <RoleDashboardRedirect /> : <ForgotMpin />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard2" element={<ProtectedRoute><Dashboard2 /> </ProtectedRoute>} />
        <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
        <Route path="/loans/new" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
        <Route path="/loans/login-details" element={<ProtectedRoute><LoanLoginDetails /></ProtectedRoute>} />
        <Route path="/loans/edit/:id" element={<ProtectedRoute><EditLoan /></ProtectedRoute>} />
        <Route path="/loans/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
        <Route path="/loans/:id/payments" element={<ProtectedRoute><LoanPaymentRequest /></ProtectedRoute>} />
        <Route path="/add-lead" element={<ProtectedRoute><AddLead /></ProtectedRoute>} />
        <Route path="/leads-list" element={
          <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager']}>
            <LeadsList />
          </RoleProtectedRoute>
        } />
        <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
        <Route path="/offline-disbursement" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager', 'loan_operations', 'operation_team']}>
            <OfflineDisbursement />
          </RoleProtectedRoute>
        } />

        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/banks" element={<ProtectedRoute><BankManagement /></ProtectedRoute>} />
        <Route path="/brokers" element={<ProtectedRoute><BrokerManagement /></ProtectedRoute>} />
        <Route path="/brokers/:id/performance" element={<ProtectedRoute><DsaPerformance /></ProtectedRoute>} />
        <Route path="/brokers/:id/profile" element={<ProtectedRoute><DsaProfile /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute><BranchManagement /></ProtectedRoute>} />
        <Route path="/commission" element={<ProtectedRoute><Commission /></ProtectedRoute>} />
        <Route path="/reports" element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager']}><Reports /></RoleProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><FieldPermissions /></ProtectedRoute>} />
        <Route path="/dashboard-permissions" element={<ProtectedRoute><DashboardPermissions /></ProtectedRoute>} />

        <Route path="/payouts" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <PayoutManagement />
          </RoleProtectedRoute>
        } />
        <Route path="/expenses" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />
        <Route path="/rc-limits" element={<ProtectedRoute><RCLimitBills /></ProtectedRoute>} />
        <Route path="/rc-limits/bills" element={<ProtectedRoute><RCLimitBills /></ProtectedRoute>} />
        <Route path="/rc-limits/payment" element={<ProtectedRoute><RCLimitPayments /></ProtectedRoute>} />

        <Route path="/admin/api-management" element={<ProtectedRoute><LoansApiIntegration /></ProtectedRoute>} />
        <Route path="/find-car-value" element={<ProtectedRoute><FindMyCarValue /></ProtectedRoute>} />
        <Route path="/link-loan-finder" element={<ProtectedRoute><LinkLoanFinder /></ProtectedRoute>} />
        <Route path="/find-lender" element={<ProtectedRoute><FindMyLender /></ProtectedRoute>} />
        <Route path="/find-eligibility" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <FindMyEligibility />
          </RoleProtectedRoute>
        } />
        <Route path="/admin/nearby-branches" element={<ProtectedRoute><AdminNearbyBranches /></ProtectedRoute>} />
        <Route path="/admin/lender-analysis" element={<ProtectedRoute><LenderAnalysis /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SystemConfig /></ProtectedRoute>} />
        <Route path="/settings/loan-comparison-charges" element={<ProtectedRoute><LoanComparisonChargesPage /></ProtectedRoute>} />
        <Route path="/admin/loan-comparison-charges" element={<ProtectedRoute><LoanComparisonChargesPage /></ProtectedRoute>} />

        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
        <Route path="/team" element={
          <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager', 'operation_team', 'loan_operations']}>
            <TeamUsers />
          </RoleProtectedRoute>
        } />
        <Route path="/rc-template/:loanId" element={<ProtectedRoute><RCTemplatePage /></ProtectedRoute>} />
        <Route path="/rc-template-viewer" element={<RCTemplateViewer />} />
        <Route path="/profile" element={
          <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager', 'operation_team', 'loan_operations', 'accountant']}>
            <UserProfile />
          </RoleProtectedRoute>
        } />
        <Route path="/tools/visiting-card" element={<ProtectedRoute><VisitingCard /></ProtectedRoute>} />
        <Route path="/tools/certificate" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
        <Route path="/tools/docs-to-share" element={<ProtectedRoute><DocsToShare /></ProtectedRoute>} />
        <Route path="/tools/emi-calculator" element={<ProtectedRoute><EMICalculator /></ProtectedRoute>} />
        <Route path="/profile-setup" element={
          <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager', 'operation_team', 'loan_operations', 'accountant']}>
            <ProfileSetup />
          </RoleProtectedRoute>
        } />
        {/* The list is open to everyone who can start an application (non reviewers see status only). Details are admin / sales manager only. */}
        <Route path="/dsa-applications" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager', 'operation_team', 'ops_team', 'loan_operations']}>
            <DsaApplications />
          </RoleProtectedRoute>
        } />
        <Route path="/dsa-applications/:id" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager']}>
            <DsaApplications />
          </RoleProtectedRoute>
        } />
        <Route path="/calling" element={
          <RoleProtectedRoute allowedRoles={['admin', 'manager', 'sales_manager']}>
            <CallingManagement />
          </RoleProtectedRoute>
        } />
        <Route path="/credit-reports" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager', 'manager', 'operation_team', 'loan_operations']}>
            <StandaloneCreditReports />
          </RoleProtectedRoute>
        } />
        <Route path="/account-aggregator" element={
          <RoleProtectedRoute allowedRoles={['admin', 'sales_manager', 'manager', 'operation_team']}>
            <AccountAggregator />
          </RoleProtectedRoute>
        } />
        <Route path="/admin/api-usage" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <ApiUsage />
          </RoleProtectedRoute>
        } />
        <Route path="/admin/api-usage-logs" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AdminApiUsage />
          </RoleProtectedRoute>
        } />
        <Route path="/admin/api-integrations" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <ApiIntegrations />
          </RoleProtectedRoute>
        } />
        <Route path="/product-management" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <ProductManagement />
          </RoleProtectedRoute>
        } />
        
        {/* Accountant Portal */}
        <Route path="/accountant/dashboard" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <AccountantDashboard />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/folio" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <FolioAccounts />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/payments" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant', 'sales_manager', 'operation_team', 'loan_operations', 'manager']}>
            <AccountPayments />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/ledger" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <FolioLedger />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/bank-accounts" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <BankAccounts />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/disbursement-ledger" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <DisbursementLedger />
          </RoleProtectedRoute>
        } />
        <Route path="/accountant/db-view" element={
          <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
            <DBView />
          </RoleProtectedRoute>
        } />

        {/* Account Deletion (Public - Google Play requirement) */}
        <Route path="/account-deletion" element={<AccountDeletion />} />

        <Route path="/bank-accounts" element={<BankAccounts />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <RoleProvider>
            <AppRoutes />
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

