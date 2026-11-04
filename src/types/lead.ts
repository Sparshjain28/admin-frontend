export interface Lead {
  id: string;
  lead_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  customer_name?: string;
  email?: string;
  phone?: string;
  type: string;
  card_name: string;
  bank_name: string;
  creditCardId?: string;
  product_name?: string;
  product_category?: string;
  channel_code?: string;
  advisor_name: string;
  advisor_id: string;
  status: string;
  activation_status: string;
  card_variant: string;
  card_variant_mis?: string;
  application_no: string;
  application_no_mis?: string;
  pan_card?: string;
  cust_type: string;
  vkyc_status: string;
  bkyc_status: string;
  card_issued_date: string;
  remark: string;
  utm_link: string;
  notes: string;
  created_at: string;
  updated_at: string;
  total_payout?: number;
  deduction?: number;
  disbursed_amount: string | number;
  ip_addresses: string[];
  // Credit card details (optional, from backend include)
  creditCard?: {
    id: string;
    name: string;
    type: string;
    dsaCommission: number;
    rewardPoints?: string;
    redirectUrl?: string;
    status: string;
    image?: string;
    features?: string;
    joiningFee?: string;
    renewalFee?: string;
    badgeColor?: string;
    badgeText?: string;
    terms?: string;
    bank: {
      id: string;
      name: string;
    };
  };
  // Advisor details (optional, from backend include)
  advisor?: {
    id: string;
    name: string;
    email: string;
    panNumber?: string;
    bankAccount?: string;
    ifsc?: string;
  };
}

export interface NewLeadRow {
  id: string;
  customer_name: string;
  lead_id: string;
  lead_db_id: string;
  phone: string;
  email: string;
  card_name: string;
  bank_name: string;
  status: string;
  activation_status: string;
  card_variant: string;
  application_no: string;
  cust_type: string;
  vkyc_status: string;
  bkyc_status: string;
  card_issued_date: string;
  remark: string;
  advisor_name: string;
  userSearchResults: any[];
  showUserDropdown: boolean;
  selectedDropdownIndex: number;
}
