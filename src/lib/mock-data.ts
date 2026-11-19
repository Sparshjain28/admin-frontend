export type LeadStatus = 'new' | 'contacted' | 'documents_collected' | 'in_process' | 'approved' | 'rejected' | 'disbursed';
export type ApplicationStage = 'SUBMITTED' | 'LOGIN' | 'IN_PROCESS' | 'REJECTED' | 'APPROVED' | 'DISBURSED' | 'CANCELLED' | 'REWORK';

export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New Lead', color: 'status-submitted' },
  { value: 'contacted', label: 'Contacted', color: 'status-review' },
  { value: 'documents_collected', label: 'Docs Collected', color: 'status-review' },
  { value: 'in_process', label: 'In Process', color: 'status-review' },
  { value: 'approved', label: 'Approved', color: 'status-approved' },
  { value: 'rejected', label: 'Rejected', color: 'status-rejected' },
  { value: 'disbursed', label: 'Disbursed', color: 'status-disbursed' },
];

export const APPLICATION_STAGES: { value: ApplicationStage; label: string; color: string }[] = [
  { value: 'SUBMITTED', label: 'Submitted', color: 'bg-blue-500 text-white' },
  { value: 'LOGIN', label: 'Login', color: 'bg-blue-100 text-blue-800' },
  { value: 'IN_PROCESS', label: 'In Process', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'APPROVED', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'DISBURSED', label: 'Disbursed', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  { value: 'REWORK', label: 'Rework', color: 'bg-amber-100 text-amber-800' },
];

export const CAR_MAKES = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Kia', 'MG', 'Toyota', 'Honda', 'Mahindra', 'Skoda', 'Volkswagen'];

export function formatCurrency(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 12 / 100;
  if (monthlyRate === 0) return principal / tenure;
  return Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
}
