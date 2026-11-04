import React, { ReactNode } from 'react';
import { UserRole } from '@/contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, Building2, UserCheck, BarChart3,
  Car, CreditCard, Shield, MapPin, UserPlus, Settings,
  Wallet, Receipt, ShieldCheck, Sliders, Folder, Phone, Database, Zap, Globe, Calculator, Percent
} from 'lucide-react';

export interface NavItem {
  label: string;
  path?: string;
  icon: ReactNode;
  permission?: string;
  children?: {
    label: string;
    path: string;
    icon?: ReactNode;
    permission: string;
  }[];
}

// export const NAV_ITEMS: NavItem[] = [
//   { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive', 'operation_team'] },
//   { label: 'Leads', path: '/ops/leads', icon: <FileText size={18} />, roles: ['operation_team'] },
//   { label: 'API Tools', path: '/ops/api-tools', icon: <Database size={18} />, roles: ['operation_team'] },
//   {
//     label: 'Leads & Loans', icon: <Folder size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'],
//     children: [
//       { label: 'Leads', path: '/leads-list', icon: <UserPlus size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
//       { label: 'Loan Apps', path: '/loans', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
//       { label: 'Offline Disbursement', path: '/offline-disbursement', icon: <FileText size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader'] },
//     ]
//   },
//   { label: 'Team', path: '/team', icon: <Users size={18} />, roles: ['manager', 'sales_manager', 'team_leader', 'dsa', 'branch_manager'] },
//   {
//     label: 'Operations', icon: <ShieldCheck size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'executive', 'team_leader', 'ops_team', 'operation_team'],
//     children: [
//       { label: 'Calling', path: '/calling', icon: <Phone size={18} />, roles: ['admin', 'sales_manager', 'branch_manager', 'manager', 'team_leader', 'executive'] },
//       { label: 'Credit Report', path: '/credit-reports', icon: <FileText size={16} />, roles: ['admin', 'sales_manager', 'manager', 'branch_manager', 'team_leader', 'executive', 'dsa'] },
//       { label: 'RC Limits', path: '/rc-limits', icon: <Wallet size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
//       { label: 'Expenses', path: '/expenses', icon: <CreditCard size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
//       { label: 'Insurance', path: '/insurance', icon: <ShieldCheck size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager'] },
//       { label: 'Link Loan Finder', path: '/link-loan-finder', icon: <Shield size={16} />, roles: ['admin', 'sales_manager', 'branch_manager'] },
//     ]
//   },
//   { label: 'Find My Lender', path: '/find-lender', icon: <MapPin size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
//   { label: 'Find My Car Value', path: '/find-car-value', icon: <Car size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa', 'team_leader', 'executive'] },
//   {
//     label: 'Administration', icon: <Settings size={18} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'],
//     children: [
//       { label: 'Reports', path: '/reports', icon: <BarChart3 size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
//       { label: 'Payouts', path: '/payouts', icon: <Receipt size={16} />, roles: ['admin', 'manager', 'sales_manager', 'branch_manager', 'dsa'] },
//       { label: 'Users', path: '/users', icon: <Users size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
//       { label: 'Banks / NBFC', path: '/banks', icon: <Building2 size={16} />, roles: ['admin'] },
//       { label: 'Brokers / DSA', path: '/brokers', icon: <UserCheck size={16} />, roles: ['admin'] },
//       { label: 'Branches', path: '/branches', icon: <MapPin size={16} />, roles: ['admin', 'manager', 'sales_manager'] },
//       { label: 'Permissions', path: '/permissions', icon: <Settings size={16} />, roles: ['admin'] },
//       { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={16} />, roles: ['admin'] },
//       { label: 'System Config', path: '/settings', icon: <Sliders size={16} />, roles: ['admin'] },
//       { label: 'Policy Maker', path: '/policy-maker', icon: <FileText size={16} />, roles: ['admin'] },
//       { label: 'API Usage', path: '/admin/api-usage', icon: <Database size={16} />, roles: ['admin'] },
//       { label: 'API Call Logs', path: '/admin/api-usage-logs', icon: <Database size={16} />, roles: ['admin'] },
//       { label: 'API Integrations', path: '/admin/api-integrations', icon: <Globe size={16} />, roles: ['admin'] },
//       { label: 'DB View', path: '/admin/db-view', icon: <Database size={16} />, roles: ['admin'] },
//     ]
//   },
//   // Accountant items - expanded directly for accountant role
//   { label: 'Accountant Dashboard', path: '/accountant/dashboard', icon: <LayoutDashboard size={18} />, roles: ['accountant'] },
//   { label: 'Operations Leads', path: '/ops/leads', icon: <Zap size={18} />, roles: ['accountant'] },
//   { label: 'Payments & Approvals', path: '/accountant/payments', icon: <Receipt size={18} />, roles: ['accountant', 'sales_manager', 'branch_manager', 'dsa'] },
//   { label: 'Disbursement Ledger', path: '/accountant/disbursement-ledger', icon: <FileText size={18} />, roles: ['accountant'] },
//   { label: 'Folio Accounts', path: '/accountant/folio', icon: <CreditCard size={18} />, roles: ['accountant'] },
//   { label: 'Bank Accounts', path: '/accountant/bank-accounts', icon: <Building2 size={18} />, roles: ['accountant'] },
//   // Grouped version for admin only
//   {
//     label: 'Accountant Portal', icon: <Wallet size={18} />, roles: ['admin'],
//     children: [
//       { label: 'Folio Accounts', path: '/accountant/folio', icon: <CreditCard size={16} />, roles: ['admin'] },
//       { label: 'Payments & Approvals', path: '/accountant/payments', icon: <Receipt size={16} />, roles: ['admin'] },
//       { label: 'Disbursement Ledger', path: '/accountant/disbursement-ledger', icon: <FileText size={16} />, roles: ['admin'] },
//       { label: 'Bank Accounts', path: '/accountant/bank-accounts', icon: <Building2 size={16} />, roles: ['admin'] },
//     ]
//   }
// ];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    permission: "dashboard.view",
  },

  {
    label: "Leads & Loans",
    icon: <Folder size={18} />,
    children: [
      {
        label: "Leads",
        path: "/leads-list",
        icon: <UserPlus size={16} />,
        permission: "leads.read",
      },
      {
        label: "Loan Apps",
        path: "/loans",
        icon: <FileText size={16} />,
        permission: "loans.read",
      },
      {
        label: "Offline Disbursement",
        path: "/offline-disbursement",
        icon: <FileText size={16} />,
        permission: "offline_disbursement.view",
      },
    ],
  },

  {
    label: "API Tools",
    path: "/ops/api-tools",
    icon: <Database size={18} />,
    permission: "api_tools.view",
  },

  {
    label: "Team",
    path: "/team",
    icon: <Users size={18} />,
    permission: "team.view",
  },

  {
    label: "RC Limits",
    icon: <Wallet size={18} />,
    children: [
      {
        label: "Bills",
        path: "/rc-limits/bills",
        icon: <Receipt size={16} />,
        permission: "rc_limits.view",
      },
      {
        label: "Payment",
        path: "/rc-limits/payment",
        icon: <CreditCard size={16} />,
        permission: "rc_limits.view",
      },
    ],
  },
  {
    label: "Operations",
    icon: <ShieldCheck size={18} />,
    children: [
      {
        label: "Calling",
        path: "/calling",
        icon: <Phone size={16} />,
        permission: "calling.view",
      },
      {
        label: "Credit Report",
        path: "/credit-reports",
        icon: <FileText size={16} />,
        permission: "credit_reports.view",
      },
      {
        label: "Expenses",
        path: "/expenses",
        icon: <CreditCard size={16} />,
        permission: "expenses.view",
      },
      {
        label: "Insurance",
        path: "/insurance",
        icon: <ShieldCheck size={16} />,
        permission: "insurance.view",
      },
      {
        label: "Link Loan Finder",
        path: "/link-loan-finder",
        icon: <Shield size={16} />,
        permission: "link_loan_finder.view",
      },
    ],
  },

  {
    label: "Find My Lender",
    path: "/find-lender",
    icon: <MapPin size={18} />,
    permission: "find_lender.view",
  },

  {
    label: "Find My Eligibility",
    path: "/find-eligibility",
    icon: <Calculator size={18} />,
    permission: "find_eligibility.view",
  },

  {
    label: "Find My Car Value",
    path: "/find-car-value",
    icon: <Car size={18} />,
    permission: "find_car_value.view",
  },

  {
    label: "Administration",
    icon: <Settings size={18} />,
    children: [
      {
        label: "Reports",
        path: "/reports",
        icon: <BarChart3 size={16} />,
        permission: "reports.view",
      },
      {
        label: "Payouts",
        path: "/payouts",
        icon: <Receipt size={16} />,
        permission: "payouts.view",
      },
      {
        label: "Users",
        path: "/users",
        icon: <Users size={16} />,
        permission: "users.read",
      },
      {
        label: "Banks / NBFC",
        path: "/banks",
        icon: <Building2 size={16} />,
        permission: "banks.view",
      },
      {
        label: "Brokers / DSA",
        path: "/brokers",
        icon: <UserCheck size={16} />,
        permission: "brokers.view",
      },
      {
        label: "Product Management",
        path: "/product-management",
        icon: <Settings size={16} />,
        permission: "product_management.view",
      },
      {
        label: "Branches",
        path: "/branches",
        icon: <MapPin size={16} />,
        permission: "branches.view",
      },
      {
        label: "Permissions",
        path: "/permissions",
        icon: <Settings size={16} />,
        permission: "permissions.view",
      },
      {
        label: "Audit Logs",
        path: "/audit-logs",
        icon: <FileText size={16} />,
        permission: "audit_logs.view",
      },
      {
        label: "System Config",
        path: "/settings",
        icon: <Sliders size={16} />,
        permission: "settings.view",
      },
      {
        label: "Loan Compare Charges",
        path: "/settings/loan-comparison-charges",
        icon: <Percent size={16} />,
        permission: "settings.view",
      },
      {
        label: "Policy Maker",
        path: "/policy-maker",
        icon: <FileText size={16} />,
        permission: "policy_maker.view",
      },
      {
        label: "Lender Analysis",
        path: "/admin/lender-analysis",
        icon: <BarChart3 size={16} />,
        permission: "lender_analysis.view",
      },
      // {
      //   label: "API Usage",
      //   path: "/admin/api-usage",
      //   icon: <Database size={16} />,
      //   permission: "api_usage.view",
      // },
      // {
      //   label: "API Call Logs",
      //   path: "/admin/api-usage-logs",
      //   icon: <Database size={16} />,
      //   permission: "api_usage_logs.view",
      // },
      // {
      //   label: "API Integrations",
      //   path: "/admin/api-integrations",
      //   icon: <Globe size={16} />,
      //   permission: "api_integrations.view",
      // },
      // {
      //   label: "DB View",
      //   path: "/admin/db-view",
      //   icon: <Database size={16} />,
      //   permission: "db_view.view",
      // },
    ],
  },

  {
    label: "Operations Leads",
    path: "/ops/leads",
    icon: <Zap size={18} />,
    permission: "operations_leads.view",
  },

  {
    label: "Accountant Portal",
    icon: <Wallet size={18} />,
    children: [
      {
        label: "Dashboard",
        path: "/accountant/dashboard",
        icon: <LayoutDashboard size={16} />,
        permission: "accountant.dashboard.view",
      },
      {
        label: "Folio Accounts",
        path: "/accountant/folio",
        icon: <CreditCard size={16} />,
        permission: "accountant.folio.view",
      },
      {
        label: "Disbursement Ledger",
        path: "/accountant/disbursement-ledger",
        icon: <FileText size={16} />,
        permission: "accountant.disbursement.view",
      },
      {
        label: "Bank Accounts",
        path: "/accountant/bank-accounts",
        icon: <Building2 size={16} />,
        permission: "accountant.bank_accounts.view",
      },
      {
        label: "Payouts",
        path: "/payouts",
        icon: <Receipt size={16} />,
        permission: "payouts.view",
      },
    ],
  },
];

export const ROLES = {
  sales_manager: { label: 'Sales Manager', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  branch_manager: { label: 'Branch Manager', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  team_leader: { label: 'Team Leader', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  executive: { label: 'Executive', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  dsa: { label: 'DSA', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  accountant: { label: 'Accountact', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  operations: { label: 'Operations', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' }
};

// export const MODULES = {
//   dashboard: { label: 'Dashboard', icon: '📊' },
//   leads: { label: 'Leads', icon: '👥' },
//   loans: { label: 'Loans', icon: '💰' },
//   // applications: { label: 'Applications', icon: '📋' },
//   users: { label: 'Users', icon: '👤' },
//   reports: { label: 'Reports', icon: '📈' },
//   settings: { label: 'Settings', icon: '⚙️' }
// };

export const MODULES = {
  dashboard: { label: "Dashboard", icon: "📊" },
  leads: { label: "Leads", icon: "👥" },
  loans: { label: "Loans", icon: "💰" },
  users: { label: "Users", icon: "👤" },
  reports: { label: "Reports", icon: "📈" },
  settings: { label: "Settings", icon: "⚙️" },
  // permissions: { label: "Permissions", icon: "🔐" }, 
  accountant: { label: "Accountant", icon: "💼" },

  // api_tools: { label: "API Tools", icon: "🛠️" },
  // team: { label: "Team", icon: "👨‍💼" },
  // offline_disbursement: { label: "Offline Disbursement", icon: "💵" },
  // calling: { label: "Calling", icon: "📞" },
  // credit_reports: { label: "Credit Reports", icon: "📄" },
  // rc_limits: { label: "RC Limits", icon: "🚗" },
  // expenses: { label: "Expenses", icon: "💳" },
  // insurance: { label: "Insurance", icon: "🛡️" },
  // link_loan_finder: { label: "Link Loan Finder", icon: "🔗" },
  // account_aggregator: { label: "Account Aggregator", icon: "🗂️" },
  // find_lender: { label: "Find My Lender", icon: "🏦" },
  // find_car_value: { label: "Find My Car Value", icon: "🚘" },
  // payouts: { label: "Payouts", icon: "💸" },
  // banks: { label: "Banks", icon: "🏛️" },
  // brokers: { label: "Brokers", icon: "🤝" },
  // branches: { label: "Branches", icon: "🏢" },
  audit_logs: { label: "Audit Logs", icon: "📜" },
  // policy_maker: { label: "Policy Maker", icon: "📋" },
  // api_usage: { label: "API Usage", icon: "📊" },
  // api_usage_logs: { label: "API Usage Logs", icon: "📝" },
  // api_integrations: { label: "API Integrations", icon: "🌐" },
  // db_view: { label: "DB View", icon: "🗄️" },
  // operations_leads: { label: "Operations Leads", icon: "⚡" },
};

export const ALL_ROLES = [
  { key: 'sales_manager', label: 'Sales Mgr' },
  { key: 'branch_manager', label: 'Branch Mgr' },
  { key: 'team_leader', label: 'Team Leader' },
  { key: 'executive', label: 'Executive' },
  { key: 'dsa', label: 'DSA' },
  { key: 'ops_team', label: 'Ops Team' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'manager', label: 'Manager' },
];

export const PAGES = [
  {
    group: 'Core',
    icon: <LayoutDashboard size={15} />,
    items: [
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'ops_team', 'accountant', 'manager', 'loan_operations'] },
      { key: 'leads_list', label: 'Leads', path: '/leads-list', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
      { key: 'loans', label: 'Loan Applications', path: '/loans', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager', 'loan_operations'] },
      { key: 'offline_disbursement', label: 'Offline Disbursement', path: '/offline-disbursement', defaultRoles: ['admin', 'sales_manager', 'dsa', 'loan_operations'] },
      { key: 'insurance_leads', label: 'Insurance Leads', path: '/insurance-leads', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
    ]
  },
  {
    group: 'Cards Module',
    icon: <CreditCard size={15} />,
    items: [
      { key: 'credit_cards', label: 'Credit Cards', path: '/credit-cards', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
      { key: 'cards_eligibility', label: 'Cards Eligibility', path: '/cards-eligibility', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
      { key: 'credit_card_leads', label: 'Credit Card Leads', path: '/credit-card-leads', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
      { key: 'cards_payouts', label: 'Cards Payouts', path: '/cards-payouts', defaultRoles: ['sales_manager', 'branch_manager', 'dsa', 'manager'] },
      { key: 'manage_products', label: 'Manage Products', path: '/manage-products', defaultRoles: [] },
      { key: 'api_integration', label: 'API Integration', path: '/api-integration', defaultRoles: [] },
    ]
  },
  {
    group: 'RC Limits',
    icon: <Wallet size={15} />,
    items: [
      { key: 'rc_limits_bills', label: 'Bills', path: '/rc-limits/bills', defaultRoles: ['admin', 'sales_manager', 'branch_manager', 'dsa', 'manager', 'accountant'] },
      { key: 'rc_limits_payment', label: 'Payment', path: '/rc-limits/payment', defaultRoles: ['admin', 'sales_manager', 'branch_manager', 'dsa', 'manager', 'accountant'] },
    ]
  },
  {
    group: 'Operations',
    icon: <ShieldCheck size={15} />,
    items: [
      { key: 'calling', label: 'Calling', path: '/calling', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'executive', 'dsa', 'manager'] },
      { key: 'credit_reports', label: 'Credit Reports', path: '/credit-reports', defaultRoles: ['sales_manager', 'branch_manager', 'manager', 'dsa'] },
      { key: 'expenses', label: 'Expenses', path: '/expenses', defaultRoles: ['sales_manager', 'branch_manager', 'dsa', 'manager'] },
      { key: 'insurance', label: 'Insurance', path: '/insurance', defaultRoles: ['sales_manager', 'branch_manager', 'manager'] },
      { key: 'link_loan_finder', path: '/link-loan-finder', defaultRoles: ['sales_manager', 'branch_manager'] },
    ]
  },
  {
    group: 'Administration',
    icon: <Settings size={15} />,
    items: [
      { key: 'reports', label: 'Reports', path: '/reports', defaultRoles: ['sales_manager', 'branch_manager', 'manager'] },
      { key: 'payouts', label: 'Payouts', path: '/payouts', defaultRoles: ['dsa', 'executive', 'accountant'] },
      { key: 'users', label: 'Users', path: '/users', defaultRoles: ['sales_manager', 'manager'] },
      { key: 'branches', label: 'Branches', path: '/branches', defaultRoles: ['sales_manager', 'manager'] },
      { key: 'team', label: 'Team', path: '/team', defaultRoles: ['sales_manager', 'branch_manager', 'team_leader', 'dsa', 'manager', 'operation_team', 'loan_operations'] },
      { key: 'find_lender', label: 'Find My Lender', path: '/find-lender', defaultRoles: ['sales_manager', 'branch_manager', 'dsa', 'team_leader', 'manager'] },
      { key: 'find_eligibility', label: 'Find My Eligibility', path: '/find-eligibility', defaultRoles: ['admin'] },
    ]
  },
];
