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

export interface LoanApplication {
  id: string;
  applicantName: string;
  mobile: string;
  pan: string;
  aadhaar: string;
  address: string;
  carMake: string;
  carModel: string;
  carVariant: string;
  onRoadPrice: number;
  dealerName: string;
  loanAmount: number;
  downPayment: number;
  tenure: number;
  interestRate: number;
  emi: number;
  status: LeadStatus;
  assignedBank: string;
  assignedBroker: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_LOANS: LoanApplication[] = [
  {
    id: 'CL-2025-001',
    applicantName: 'Arjun Mehta',
    mobile: '9876543210',
    pan: 'ABCPM1234K',
    aadhaar: '1234-5678-9012',
    address: 'Mumbai, Maharashtra',
    carMake: 'Maruti Suzuki',
    carModel: 'Brezza',
    carVariant: 'ZXi+',
    onRoadPrice: 1450000,
    dealerName: 'Nexa Andheri',
    loanAmount: 1100000,
    downPayment: 350000,
    tenure: 60,
    interestRate: 8.5,
    emi: 22567,
    status: 'disbursed',
    assignedBank: 'HDFC Bank',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-01-15',
    updatedAt: '2025-02-10',
  },
  {
    id: 'CL-2025-002',
    applicantName: 'Sneha Reddy',
    mobile: '9812345678',
    pan: 'DEFPR5678L',
    aadhaar: '2345-6789-0123',
    address: 'Hyderabad, Telangana',
    carMake: 'Hyundai',
    carModel: 'Creta',
    carVariant: 'SX(O)',
    onRoadPrice: 1850000,
    dealerName: 'Hyundai Jubilee Hills',
    loanAmount: 1400000,
    downPayment: 450000,
    tenure: 48,
    interestRate: 9.0,
    emi: 34839,
    status: 'approved',
    assignedBank: 'ICICI Bank',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-01-28',
    updatedAt: '2025-02-15',
  },
  {
    id: 'CL-2025-003',
    applicantName: 'Rahul Joshi',
    mobile: '9988776655',
    pan: 'GHIJK9012M',
    aadhaar: '3456-7890-1234',
    address: 'Pune, Maharashtra',
    carMake: 'Tata',
    carModel: 'Nexon',
    carVariant: 'XZ+ Dark',
    onRoadPrice: 1350000,
    dealerName: 'Tata Motors Kothrud',
    loanAmount: 1000000,
    downPayment: 350000,
    tenure: 60,
    interestRate: 8.75,
    emi: 20625,
    status: 'in_process',
    assignedBank: 'SBI',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-02-05',
    updatedAt: '2025-02-12',
  },
  {
    id: 'CL-2025-004',
    applicantName: 'Kavita Nair',
    mobile: '9654321098',
    pan: 'LMNOP3456N',
    aadhaar: '4567-8901-2345',
    address: 'Bangalore, Karnataka',
    carMake: 'Kia',
    carModel: 'Seltos',
    carVariant: 'HTX+',
    onRoadPrice: 1700000,
    dealerName: 'Kia Whitefield',
    loanAmount: 1300000,
    downPayment: 400000,
    tenure: 72,
    interestRate: 9.25,
    emi: 23471,
    status: 'new',
    assignedBank: 'Axis Bank',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-02-10',
    updatedAt: '2025-02-10',
  },
  {
    id: 'CL-2025-005',
    applicantName: 'Deepak Verma',
    mobile: '9123456789',
    pan: 'QRSTU7890P',
    aadhaar: '5678-9012-3456',
    address: 'Delhi NCR',
    carMake: 'MG',
    carModel: 'Hector',
    carVariant: 'Sharp Pro',
    onRoadPrice: 2100000,
    dealerName: 'MG Dwarka',
    loanAmount: 1600000,
    downPayment: 500000,
    tenure: 60,
    interestRate: 8.9,
    emi: 33104,
    status: 'contacted',
    assignedBank: '',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-02-14',
    updatedAt: '2025-02-14',
  },
  {
    id: 'CL-2025-006',
    applicantName: 'Pooja Desai',
    mobile: '9876512345',
    pan: 'VWXYZ1234Q',
    aadhaar: '6789-0123-4567',
    address: 'Ahmedabad, Gujarat',
    carMake: 'Toyota',
    carModel: 'Urban Cruiser Hyryder',
    carVariant: 'V Hybrid',
    onRoadPrice: 1920000,
    dealerName: 'Toyota SG Highway',
    loanAmount: 1500000,
    downPayment: 420000,
    tenure: 48,
    interestRate: 8.6,
    emi: 37092,
    status: 'rejected',
    assignedBank: 'Kotak Mahindra Bank',
    assignedBroker: 'Vikram Singh',
    createdAt: '2025-01-20',
    updatedAt: '2025-02-08',
  },
];

export const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'IndusInd Bank', 'Bajaj Finserv'];
export const CAR_MAKES = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Kia', 'MG', 'Toyota', 'Honda', 'Mahindra', 'Skoda', 'Volkswagen'];

export function formatCurrency(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 12 / 100;
  if (monthlyRate === 0) return principal / tenure;
  return Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1));
}
