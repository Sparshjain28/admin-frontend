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
// Demo accounts for quick login (these exist in the real auth system)
export const DEMO_ACCOUNTS = [
  { name: 'Priya Sharma', email: 'admin@finonest.com', role: 'admin' as UserRole, password: 'Demo@1234' },
  { name: 'Rajesh Kumar', email: 'sales@finonest.com', role: 'sales_manager' as UserRole, password: 'Demo@1234' },
  { name: 'Priya Singh', email: 'bm@finonest.com', role: 'branch_manager' as UserRole, password: 'Demo@1234' },
  { name: 'Amit Patel', email: 'dsa@finonest.com', role: 'dsa' as UserRole, password: 'Demo@1234' },
  { name: 'Neha Sharma', email: 'tl@finonest.com', role: 'team_leader' as UserRole, password: 'Demo@1234' },
  { name: 'Ananya Gupta', email: 'executive@finonest.com', role: 'executive' as UserRole, password: 'Demo@1234' },
];
