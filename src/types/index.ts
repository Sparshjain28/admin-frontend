export type UserRole = 'super_admin' | 'admin' | 'manager' | 'team_leader' | 'employee' | 'dsa_partner' | 'branch_manager' | 'advisor' | 'ops_team' | 'operation_team' | 'loan_operations' | 'sales_manager' | 'dsa' | 'executive' | 'accountant';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  team_leader: 'Team Leader',
  employee: 'Employee',
  dsa_partner: 'DSA Partner',
  branch_manager: 'Branch Manager',
  advisor: 'Advisor',
  ops_team: 'Ops Team',
  operation_team: 'Operation Team',
  loan_operations: 'Loan Operations (Ops)',
  sales_manager: 'Sales Manager',
  dsa: 'DSA',
  executive: 'Executive',
  accountant: 'Accountant',
};

export interface CreditCardProduct {
  id: string;
  name: string;
  bank: string;
  type: string;
  annual_fee?: number;
  annualFee?: number;
  joining_fee?: number;
  joiningFee?: number;
  renewal_fee?: number;
  renewalFee?: number;
  dsa_commission?: number;
  dsaCommission?: number;
  reward_points?: string;
  rewardPoints?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  createdAt?: string;
  card_image?: string;
  cardImage?: string;
  variant_image?: string;
  variantImage?: string;
  redirect_url?: string;
  redirectUrl?: string;
  payout_source?: string;
  payoutSource?: string;
  features?: string;
  terms?: string;
  pincodes?: string;
  badge_text?: string;
  badgeText?: string;
  badge_color?: string;
  badgeColor?: string;
  card_shadow_color?: string;
  cardShadowColor?: string;
}

export interface Permission {
  view: boolean;
  edit: boolean;
  add: boolean;
  delete: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, { creditCards: Permission }> = {
  super_admin: {
    creditCards: { view: true, edit: true, add: true, delete: true },
  },
  admin: {
    creditCards: { view: true, edit: true, add: true, delete: true },
  },
  manager: {
    creditCards: { view: true, edit: true, add: true, delete: true },
  },
  team_leader: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  employee: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  dsa_partner: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  branch_manager: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  advisor: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  ops_team: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  operation_team: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  loan_operations: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  sales_manager: {
    creditCards: { view: true, edit: true, add: true, delete: false },
  },
  dsa: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  executive: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
  accountant: {
    creditCards: { view: true, edit: false, add: false, delete: false },
  },
};
