// Role labels (used across the app)
export type UserRole = 'admin' | 'ops_team' | 'operation_team' | 'loan_operations' | 'manager' | 'sales_manager' | 'dsa' | 'team_leader' | 'executive' | 'accountant' | 'branch_manager';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'L1 - Admin',
  ops_team: 'L2 - Operation Team',
  operation_team: 'L2 - Operation Team',
  loan_operations: 'L2 - Loan Operations (Ops)',
  manager: 'L3 - Manager',
  sales_manager: 'L3 - Sales Manager',
  branch_manager: 'L4 - Branch Manager',
  dsa: 'L4 - DSA',
  team_leader: 'L5 - Team Leader',
  executive: 'L6 - Executive',
  accountant: 'L6 - Accountant'
};
