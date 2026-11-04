import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRole } from '@/contexts/RoleContext';
import { toast } from '@/hooks/use-toast';
import { Copy, Key, Terminal, Download, Settings, Activity, Plus, Loader2, BookOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/services/api';

const formatJsonExample = (obj: unknown) => JSON.stringify(obj, null, 2);

// Admin roles allowed
const ALLOWED_ROLES = ['super_admin', 'admin'];

export default function LoansApiIntegration() {
  const { role, authUser } = useRole();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);

  const isAdmin = ALLOWED_ROLES.includes(role || '');

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        try {
          // Attempt 1: Get flat list of all users
          let res = await api.get('/users?limit=1000').catch(() => null);
          let allUsers = [];
          
          if (res && Array.isArray(res)) {
            allUsers = res;
          } else if (res && Array.isArray(res.users)) {
            allUsers = res.users;
          }

          // Attempt 2: If flat list fails (maybe due to roles), fetch hierarchy and flatten it
          if (!allUsers.length) {
            const tree = await api.get('/users/hierarchy').catch(() => null);
            if (tree && Array.isArray(tree)) {
              const flatten = (nodes: any[]): any[] => {
                let flat: any[] = [];
                nodes.forEach(n => {
                  flat.push(n);
                  if (n.team_members && Array.isArray(n.team_members)) {
                    flat = flat.concat(flatten(n.team_members));
                  }
                });
                return flat;
              };
              allUsers = flatten(tree);
            }
          }
          
          setUsers(allUsers);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [isAdmin]);

  const getUserLabel = (user: any) => {
    const name = user.name || user.fullName || user.full_name || user.displayName || 'Unknown';
    const mobile = user.mobile || user.phone || 'N/A';
    return `${name} - ${mobile} (${user.role})`;
  };

  const handleGenerateKey = async () => {
    if (!targetUserId) {
      toast({ title: 'Error', description: 'Please select a user', variant: 'destructive' });
      return;
    }

    try {
      setIsGenerating(true);
      const res = await api.post(`/users/${targetUserId}/generate-api-key`, {});

      if (res.success && res.apiKey) {
        setApiKey(res.apiKey);
        toast({ title: 'Success', description: 'API Key generated successfully.' });
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to generate key', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Server error', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Content successfully copied to clipboard.' });
  };

  const getCurl_CheckUser = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/check-user" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "9876543210"
  }'

# WhatsApp & CRM Automation Helper:
# Checks if the incoming phone number belongs to a registered User (DSA, Partner, Admin, etc.)
# or is an unknown guest/customer.
# Accepts full WhatsApp numbers (e.g. "919876543210", "+91 9876543210") — automatically parses 10 digits.
# Also supports GET: /api/third-party/loans/check-user?phone=9876543210
#
# Success Response Fields (Registered User / DSA):
${formatJsonExample({
  success: true,
  registered: true,
  user: {
    id: 42,
    user_id: "DSA001",
    name: "Amit Kumar",
    phone: "9876543210",
    email: "amit@finonest.com",
    role: "dsa",
    status: "active",
    is_active: true
  }
})}

# Success Response Fields (Unregistered Customer / Guest):
${formatJsonExample({
  success: true,
  registered: false,
  role: "guest",
  phone: "9876543210",
  message: "User not registered in Finonest"
})}`;

  const getCurl_CreateLead = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicant_name": "Jane Doe",
    "mobile": "9876543210",
    "pan_number": "ABCDE1234F",
    "vehicle_number": "MH01AB1234",
    "loan_amount": 500000,
    "case_type": "new_car_purchase",
    "sender_mobile": "9811122233"
  }'

# applicant_name, mobile, and case_type are mandatory — the request is
# rejected with a 400 if any is missing.
#
# sender_mobile (Optional): Pass the WhatsApp sender's mobile number.
# If registered as a DSA/Partner in Finonest, the lead is automatically
# assigned to them! If omitted or unregistered, it defaults to the API Key owner.
#
# case_type — one of (exact string, used directly by the BRE eligibility
# engine, so it must match one of these exactly):
#   "new_car_purchase"    — New Car - Purchase
#   "used_car_purchase"   — Used Car - Purchase
#   "used_car_refinance"  — Used Car - Refinance
#   "used_car_bt_topup"   — Used Car - Balance Transfer / Top-up
#
# Success Response Fields (the CIBIL consent OTP is sent automatically —
# no separate call needed):
${formatJsonExample({
  success: true,
  message: "Lead created and CIBIL OTP sent successfully",
  leadId: "UCLP-001",
  id: "UCLP-001",
  assigned_to: 42,
  sourcing_person_name: "Amit Kumar",
  otp_sent: true,
  otpId: "UCLP-0016",
  otp_error: null
})}`;

  const getCurl_SendOtp = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/send-cibil-otp" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Optional / advanced — Create Lead already sends this OTP automatically.
# Use this only to re-send if the customer didn't receive it, or if
# otp_sent was false in the Create Lead response.
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "OTP sent successfully for CIBIL consent",
  otpId: "UCLP-0016"
})}`;

  const getCurl_VerifyAndPullCibil = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/verify-otp-and-pull-cibil" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "otp": "9999",
    "otpId": "UCLP-0016"
  }'

# selectedEmail / selectedAddress are optional — omit them and the best
# CRIF result is picked automatically. Pass them only if you want your own
# user to choose from the dropdowns first.
# The full raw bureau report is NOT included by default here either — pass
# "include_raw": true only if you need the complete raw CRIF/CIBIL report.
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "OTP verified, CIBIL fetched, and selections saved successfully",
  score: 750,
  dropdowns: {
    emails: ["jane@example.com", "jane.doe@work.com"],
    addresses: ["123 Main St, Mumbai", "456 Side St, Pune"]
  },
  selected: { email: "jane@example.com", address: "123 Main St, Mumbai", auto_selected: true }
})}`;

  const getCurl_VerifyOtp = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/verify-cibil-otp" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "otp": "9999",
    "otpId": "UCLP-0016"
  }'

# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "OTP verified successfully. CIBIL consent granted."
})}`;

  const getCurl_PullCibil = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/cibil" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# The full raw bureau report is NOT included by default (only score +
# dropdowns are). Pass "include_raw": true in the body (or ?include_raw=true)
# only if you specifically need the complete raw CRIF/CIBIL report.
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "CIBIL fetched successfully",
  score: 750,
  dropdowns: {
    emails: ["jane@example.com", "jane.doe@work.com"],
    addresses: ["123 Main St, Mumbai", "456 Side St, Pune"]
  }
})}`;

  const getCurl_SaveSelections = () => `curl -X PUT "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/cibil-selections" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "selectedEmail": "jane@example.com",
    "selectedAddress": "123 Main St, Mumbai"
  }'

# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "CIBIL selections saved successfully"
})}`;

  const getCurl_EligibleLenders = () => `curl -X GET "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/eligible-lenders" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Runs each lender's real underwriting policy (LTV, ROI, eligibility) against
# this lead's vehicle + CIBIL data — the same engine the internal app uses.
# Returns both eligible lenders (top) and uneligible lenders with rejection reasons.
# Success Response Fields:
${formatJsonExample({
  success: true,
  lead_id: "UCLP-001",
  eligible_count: 1,
  uneligible_count: 1,
  eligible_lenders: [
    {
      id: 112, name: "IDFC First Bank Urban", is_eligible: true, code: null,
      rates: [{ product_name: "Used Car BT/Top Up", roi: 16, min_rate: 15, max_tenure: 60, max_loan_amount: null }],
      bre: { eligible: true, reasons: [], deprioritize: false, deprioritize_reasons: [], offer: { ltv: 180, roi: 16, max_loan_amount: 5000000, min_tenure: 32, max_tenure: 60 } }
    }
  ],
  uneligible_lenders: [
    {
      id: 114, name: "Hero Fincorp", is_eligible: false, code: "HERO",
      rates: [{ product_name: "Used Car BT/Top Up", roi: 16.5, min_rate: 15, max_tenure: 60, max_loan_amount: null }],
      bre: { eligible: false, reasons: ["Minimum CIBIL score of 640 is required. (Current: 610)"], deprioritize: false, deprioritize_reasons: [], offer: { ltv: 90, roi: 14.5, max_loan_amount: 10000000, min_tenure: 24, max_tenure: 60 } }
    }
  ]
})}`;

  const getCurl_SaveVehicleInfo = () => `curl -X PUT "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/vehicle-info" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vehicle_number": "RJ14UK0122",
    "maker_name": "MARUTI SUZUKI",
    "model_name": "SWIFT DZIRE",
    "variant": "VXI",
    "manufacturing_year": 2021,
    "manufacture_date": "2021-04-15",
    "fuel_type": "PETROL",
    "finance_status": "Not Financed",
    "idv_value": 550000
  }'

# Saves vehicle details for this lead (Used Car Loans).
# If you only pass "vehicle_number" (or "rc_number"), the backend will automatically
# perform an RC lookup, extract make/model/date, and calculate vehicle age & finance status!
# Passing manual details allows you to override or provide values if RC lookup is skipped.
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "Vehicle information saved successfully",
  data: {
    lead_id: "UCLP-001",
    vehicle_number: "RJ14UK0122",
    rc_number: "RJ14UK0122",
    maker_name: "MARUTI SUZUKI",
    model_name: "SWIFT DZIRE",
    variant: "VXI",
    manufacturing_year: 2021,
    manufacture_date: "2021-04-15",
    vehicle_age: "03yr 05m",
    finance_status: "Not Financed",
    fuel_type: "PETROL",
    idv_value: 550000,
    owner_name: "RAJESH KUMAR",
    ownership_type: "First Owner",
    engine_number: "K12MN1234567",
    chassis_number: "MA3EWDE1S00123456",
    pucc_valid_upto: "2026-03-31",
    insurance_company: "ICICI Lombard",
    insurance_valid_upto: "2026-06-30"
  }
})}`;

  const getCurl_GetVehicleInfo = () => `curl -X GET "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/vehicle-info" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Reads back everything saved for this lead's vehicle, including the registered owner.
# owner_name / ownership_type come from the RC record — pass them in the PUT above only
# if you want to override what the RC lookup found.
# Any field still unresolved comes back as null rather than being omitted.
${formatJsonExample({
  success: true,
  data: {
    lead_id: "UCLP-001",
    vehicle_number: "RJ14UK0122",
    rc_number: "RJ14UK0122",
    maker_name: "MARUTI SUZUKI",
    model_name: "SWIFT DZIRE",
    variant: "VXI",
    manufacturing_year: 2021,
    manufacture_date: "2021-04-15",
    vehicle_age: "03yr 05m",
    finance_status: "Not Financed",
    fuel_type: "PETROL",
    idv_value: 550000,
    owner_name: "RAJESH KUMAR",
    ownership_type: "First Owner",
    engine_number: "K12MN1234567",
    chassis_number: "MA3EWDE1S00123456",
    pucc_valid_upto: "2026-03-31",
    insurance_company: "ICICI Lombard",
    insurance_valid_upto: "2026-06-30"
  }
})}`;

  const getCurl_SelectLender = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/select-lender" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "bank_id": 114 }'

# Body is optional:
#  - Omit it (or bank_id) entirely and the best eligible lender is picked
#    automatically (lowest ROI among eligible ones).
#  - Or pass { "bank_id": 114 } to choose ANY lender (both eligible and uneligible).
#    If an uneligible lender is selected, it is accepted with an advisory flag.
# Either way the winning offer (LTV/ROI/tenure/amount) is saved and picked
# up automatically by Convert To Loan below.
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "Hero Fincorp selected successfully",
  selected_lender: "Hero Fincorp",
  bank_id: 114,
  is_eligible: false,
  reasons: ["Minimum CIBIL score of 640 is required. (Current: 610)"],
  auto_selected: false,
  loan_amount: 495000,
  ltv: 90,
  roi: 14.5,
  tenure: 60,
  bre: { eligible: false, reasons: ["Minimum CIBIL score of 640 is required. (Current: 610)"] }
})}`;

  const getCurl_UploadDocument = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/documents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "pan_card=@/path/to/customer_pan.jpg" \\
  -F "aadhar_front=@/path/to/aadhar_front.jpg" \\
  -F "aadhar_back=@/path/to/aadhar_back.jpg" \\
  -F "rc_front=@/path/to/rc_front.jpg" \\
  -F "rc_back=@/path/to/rc_back.jpg"

# BULK / MULTI-FILE UPLOAD (Recommended):
# You can upload all 5 mandatory documents in a SINGLE request by specifying
# each document type as the form-data field name!
#
# MANDATORY DOCUMENT TYPES:
#   - pan_card     : Customer PAN Card
#   - aadhar_front : Aadhaar Card Front
#   - aadhar_back  : Aadhaar Card Back
#   - rc_front     : Vehicle RC Front
#   - rc_back      : Vehicle RC Back
#
# ADDITIONAL / OPTIONAL DOCUMENT TYPES:
#   customer_photo, bank_statement, income_proof, insurance, light_bill, rent_agreement, cheque, loan_track
#
# Single file upload is also supported:
#   -F "document=@/path/to/file.jpg" -F "document_type=pan_card"
#
# Allowed formats: JPG, JPEG, PNG, WEBP, PDF (Max: 10MB each)
# Success Response Fields:
${formatJsonExample({
  success: true,
  message: "5 document(s) uploaded successfully",
  lead_id: "UCLP-001",
  uploaded_count: 5,
  is_mandatory_complete: true,
  missing_mandatory_documents: [],
  documents: [
    { document_id: 451, document_type: "pan_card", file_name: "customer_pan.jpg", file_size: 245120 },
    { document_id: 452, document_type: "aadhar_front", file_name: "aadhar_front.jpg", file_size: 184500 }
  ]
})}`;

  const getCurl_GetLeadDocuments = () => `curl -X GET "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/documents" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Success Response Fields:
${formatJsonExample({
  success: true,
  lead_id: "UCLP-001",
  total_documents: 5,
  is_mandatory_complete: true,
  missing_mandatory_documents: [],
  documents: [
    { id: 451, document_type: "pan_card", file_name: "customer_pan.jpg", file_size: 245120, status: "pending", created_at: "2026-09-21T11:00:00.000Z" },
    { id: 452, document_type: "aadhar_front", file_name: "aadhar_front.jpg", file_size: 184500, status: "pending", created_at: "2026-09-21T11:01:00.000Z" }
  ]
})}`;

  const getCurl_ConvertLoan = () => `curl -X POST "${API_BASE_URL}/api/third-party/loans/leads/UCLP-001/convert-to-loan" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "income_source": "Salaried",
    "company_name": "Tech Corp",
    "designation": "Software Engineer",
    "net_monthly_salary": 85000,
    "salary_slip_available": "Yes",
    "current_job_years": 2,
    "total_work_exp": 5,
    "salary_credit_mode": "Account Transfer",
    "itr_available": "Yes",
    "annual_income_itr": 1020000,
    "marital_status": "Married",
    "spouse_name": "Pooja Sharma"
  }'

# PREREQUISITE:
# All 5 mandatory documents (pan_card, aadhar_front, aadhar_back, rc_front, rc_back)
# must be uploaded via Step 5 (Upload Documents) BEFORE calling Convert To Loan.
# Missing documents will return an HTTP 400 error listing the missing documents.
#
# bank_id/roi/tenure/loan_amount/email/current_address are optional here —
# if CIBIL & Select Lender were already called, this picks up those saved
# selections (email, address, lender, BRE terms) automatically. Pass them
# only if you want to override.
#
# income_source and marital_status are MANDATORY:
#   income_source  — "Salaried" | "Self Employed"
#   marital_status — "Single" | "Married" | "Divorced" | "Widow"
#   spouse_name    — Required when marital_status is "Married"
#
# When income_source is "Salaried", all 10 fields matching the Add Lead portal are required:
#   - company_name           : string
#   - designation            : string
#   - net_monthly_salary     : number
#   - salary_slip_available  : "Yes" | "No"
#   - current_job_years      : number
#   - total_work_exp         : number
#   - salary_credit_mode     : "Account Transfer" | "Cash"
#   - itr_available          : "Yes" | "No"
#   - annual_income_itr      : number (required when itr_available is "Yes")
#
# When income_source is "Self Employed":
#   - profile required, one of: "Business" | "Professional" | "Freelancer/Agent" | "Farmer" | "Other Income"
# Success Response Fields:
${formatJsonExample({
  message: "Loan created successfully",
  id: "loan-uuid",
  loan_number: "UCLP-1002"
})}`;


  const getCurl_GetStatus = () => `curl -X GET "${API_BASE_URL}/api/third-party/loans/status/UCLP-1002" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Success Response Fields:
${formatJsonExample({
  success: true,
  data: {
    loan_number: "UCLP-001",
    application_stage: "IN_PROCESS",
    status: "active"
  }
})}`;

  // --- Insurance API ---
  // Real quote comparison across insurers runs entirely on Square Insurance's
  // POS platform (the same iframe the internal Insurance page embeds) — this
  // API's job is to generate that link correctly attributed to your API key,
  // and expose the lead/policy status Finonest receives back via webhook.
  const getCurl_InsuranceProducts = () => `curl -X GET "${API_BASE_URL}/api/third-party/insurance/products" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Returns the valid "product" keys to pass to /quote-link below.
${formatJsonExample({
  success: true,
  products: [
    { key: "car-insurance", label: "Car Insurance" },
    { key: "bike-insurance", label: "Two Wheeler Insurance" },
    { key: "health-insurance", label: "Health Insurance" },
    { key: "life-insurance", label: "Life Insurance" },
  ]
})}`;

  const getCurl_QuoteLink = () => `curl -X POST "${API_BASE_URL}/api/third-party/insurance/quote-link" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product": "car-insurance",
    "customer_name": "Ramesh Kumar",
    "mobile": "9876543210",
    "vehicle_number": "RJ14AB1234"
  }'

# Open quote_url for the customer (webview/iframe/redirect) to compare live
# quotes across insurers and complete purchase. Finonest gets a webhook once
# a lead is created, and again once payment succeeds.
${formatJsonExample({
  success: true,
  product: "car-insurance",
  quote_url: "https://pos.squareinsurance.in/motor-insurance/car-insurance?source=referred&data=...&user_data=15"
})}`;

  const getCurl_InsuranceCreateLead = () => `curl -X POST "${API_BASE_URL}/api/third-party/insurance/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ramesh Kumar",
    "phone": "9988776655",
    "product_name": "Car Insurance",
    "vehicle_number": "RJ14AB1234"
  }'

# Optional alternative to /quote-link — logs a lead you already captured
# yourself in your own portal, for a Finonest RM to follow up manually.
${formatJsonExample({ success: true, message: "Insurance lead created", id: 8 })}`;

  const getCurl_InsuranceGetLeads = () => `curl -X GET "${API_BASE_URL}/api/third-party/insurance/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Lists only leads tied to your own API key (via quote-link, direct /leads,
# or the Square iframe tagged with your user_data).
${formatJsonExample({
  success: true,
  leads: [{ id: 8, name: "Ramesh Kumar", status: "Lead Created", payment_status: null, si_id: null }]
})}`;

  const getCurl_InsuranceGetLead = () => `curl -X GET "${API_BASE_URL}/api/third-party/insurance/leads/8" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# "8" can be the internal lead id or Square's si_id. 404s if it isn't yours.
${formatJsonExample({ success: true, lead: { id: 8, status: "Success", payment_status: "Success", si_id: "SQPC..." } })}`;

  const getCurl_InsuranceDownloadPdf = () => `curl -X POST "${API_BASE_URL}/api/third-party/insurance/download-pdf" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "quotation_id": "SQPC2026080613453614657" }' \\
  --output Policy.pdf

# Proxies the issued policy PDF from Square Insurance once status is
# "Success". Rejects with 404 if the quotation_id isn't tied to a lead
# created under your API key.`;

  const getCurl_InsuranceCreatePolicy = () => `curl -X POST "${API_BASE_URL}/api/third-party/insurance/policies" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "insurance_company": "HDFC Ergo",
    "policy_type": "Motor Comprehensive",
    "policy_number": "POL-2026-001",
    "premium": 12500,
    "policy_start_date": "2026-10-01",
    "policy_expiry_date": "2027-09-30",
    "idv": 450000,
    "customer_name": "Ramesh Kumar",
    "customer_phone": "9988776655",
    "vehicle_number": "RJ14AB1234"
  }'

# "loan_id" is optional — pass it only if this policy belongs to an existing
# Finonest loan you (this API key) own; omit it for a standalone policy.
${formatJsonExample({ success: true, message: "Policy created", policyId: 1 })}`;

  const getCurl_InsuranceGetPolicies = () => `curl -X GET "${API_BASE_URL}/api/third-party/insurance/policies" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Supports optional query filters: ?policy_number=, ?vehicle_number=, ?loan_id=, ?status=
${formatJsonExample({ success: true, policies: [{ id: 1, policy_number: "POL-2026-001", status: "Active" }] })}`;

  const getCurl_InsuranceUpdatePolicy = () => `curl -X PUT "${API_BASE_URL}/api/third-party/insurance/policies/POL-2026-001" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "premium": 13000,
    "status": "Active"
  }'

# "POL-2026-001" can be the internal id or the policy_number. 404s if it
# isn't a policy you created.
${formatJsonExample({ success: true, message: "Policy updated" })}`;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Terminal className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          Only administrators can manage Third-Party API integrations for the Loan &amp; Insurance systems.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Management (Loans &amp; Insurance)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate API keys and manage third-party integration access for the loan and insurance flows. The same key works for both — use it at any of your other portals.
        </p>
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key size={14} /> Credentials
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen size={14} /> Loans API
          </TabsTrigger>
          <TabsTrigger value="insurance-docs" className="flex items-center gap-2">
            <Shield size={14} /> Insurance API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-6 mt-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <CardHeader>
              <CardTitle className="text-lg">Generate API Key</CardTitle>
              <CardDescription>
                Select a user (partner or DSA) to generate a dedicated long-lived API token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Target User / Partner
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                  >
                    <option value="">-- Select User --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{getUserLabel(u)}</option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  onClick={handleGenerateKey} 
                  disabled={!targetUserId || isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                  Generate Key
                </Button>
              </div>

              {apiKey && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Key size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">New API Key Generated</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background/50 p-2.5 rounded text-xs font-mono break-all text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
                      {apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey)}
                      className="shrink-0 bg-white dark:bg-black"
                    >
                      <Copy size={14} className="mr-2" /> Copy
                    </Button>
                  </div>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-2">
                    Copy this key now. It is linked directly to the selected user. Any loans created using this key will be attributed to them.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6 mt-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal size={18} className="text-blue-500" />
                Step-by-Step API Documentation
              </CardTitle>
              <CardDescription>
                Follow these precise steps to fully recreate the internal application process via API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-3 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-transparent rounded-sm px-2">POST / GET</Badge>
                    Check User &amp; Role (WhatsApp &amp; CRM Automation)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_CheckUser())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_CheckUser()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <strong>WhatsApp Bot Entry Point:</strong> Call this at the start of your n8n / WhatsApp flow when a user messages. It identifies whether the sender is a registered Partner/DSA (returning their role and user details) or a guest customer, enabling dynamic bot branching!
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">1. POST</Badge>
                    Create Lead
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_CreateLead())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_CreateLead()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Creates the Lead and automatically performs RC Lookup to calculate vehicle age and finance status.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">2. POST</Badge>
                    Verify OTP &amp; Pull CIBIL
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_VerifyAndPullCibil())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_VerifyAndPullCibil()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Combined step — verifies the OTP the customer received, pulls the CIBIL report, and saves the
                  email/address selection all in one call. Pass the OTP once the customer gives it to you.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-transparent rounded-sm px-2">3. PUT</Badge>
                    Save Vehicle Info (Used Car)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_SaveVehicleInfo())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_SaveVehicleInfo()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Saves vehicle details for the lead. You can provide just <code>vehicle_number</code> (which automatically triggers RC lookup &amp; age calculation), or provide detailed vehicle fields (maker, model, manufacturing year, fuel type, IDV). This data directly informs bank BRE policies in the next step.
                  The response echoes back every resolved field, including <code>owner_name</code> and <code>ownership_type</code> from the RC record.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-sky-100 text-sky-800 border-transparent rounded-sm px-2">3b. GET</Badge>
                    Read Vehicle Info (Owner Name)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_GetVehicleInfo())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-sky-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_GetVehicleInfo()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Fetches the saved vehicle record for a lead — use this to read the registered <code>owner_name</code>,
                  <code>ownership_type</code>, engine and chassis numbers after saving. Safe to call repeatedly; it reads
                  stored data and does not consume an RC lookup.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">4. POST</Badge>
                    Select Lender
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_SelectLender())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_SelectLender()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  The BRE eligibility check evaluates both CIBIL profile &amp; vehicle details. Leave the
                  body empty to auto-pick the best eligible lender, or pass <code>bank_id</code> to choose one
                  yourself (rejected with reasons if that lender doesn't actually qualify).
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">5. POST</Badge>
                    Upload Documents (Mandatory KYC &amp; RC)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_UploadDocument())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_UploadDocument()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Upload all 5 mandatory documents (<code>pan_card</code>, <code>aadhar_front</code>, <code>aadhar_back</code>, <code>rc_front</code>, <code>rc_back</code>) via multipart form-data. Convert To Loan requires these 5 documents to be uploaded first.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">6. POST</Badge>
                    Convert To Loan
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_ConvertLoan())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_ConvertLoan()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Finalizes all the data and creates the permanent UCLP-xxxx loan number with applicant, CIBIL, vehicle details, and auto-links all uploaded documents. Requires the 5 mandatory documents to be uploaded in Step 5.
                </p>
              </div>

            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings size={16} className="text-muted-foreground" />
                Optional / Advanced Endpoints
              </CardTitle>
              <CardDescription>
                Not needed for the standard flow above — use these only if you want finer control (e.g. showing the
                CIBIL email/address dropdowns to your own user before picking one) or need to resend an OTP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">GET</Badge>
                    List All Eligible Lenders
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_EligibleLenders())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_EligibleLenders()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Select Lender already runs this same check internally. Use this only if you want to show the
                  full ranked list to your own user and let them pick, instead of auto-selecting.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">POST</Badge>
                    Re-send CIBIL OTP
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_SendOtp())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_SendOtp()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">POST</Badge>
                    Verify CIBIL OTP (only)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_VerifyOtp())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_VerifyOtp()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">POST</Badge>
                    Pull CIBIL &amp; Dropdowns (only)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_PullCibil())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_PullCibil()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Requires OTP to already be verified. Returns emails/addresses without saving a selection.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-transparent rounded-sm px-2">PUT</Badge>
                    Save CIBIL Selections (only)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_SaveSelections())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_SaveSelections()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Overrides the auto-picked email/address from step 2 if you want to change it afterward.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">GET</Badge>
                    Check Lead Uploaded Documents
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_GetLeadDocuments())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_GetLeadDocuments()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Returns all documents currently uploaded for the lead, whether mandatory documents are complete (<code>is_mandatory_complete</code>), and which mandatory documents are still missing.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance-docs" className="space-y-6 mt-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield size={18} className="text-rose-500" />
                Insurance API Documentation
              </CardTitle>
              <CardDescription>
                Real quote comparison across insurers runs on Square Insurance's POS platform (the same engine the
                internal Insurance page embeds) — this API gets you a correctly-attributed quote link and exposes
                the lead/policy status Finonest receives back, plus simple record-keeping for policies you want
                tracked in Finonest regardless of where they were issued. Use the same API key as the Loans API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-3 p-4 bg-rose-500/5 rounded-lg border border-rose-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-rose-100 text-rose-800 border-transparent rounded-sm px-2">GET</Badge>
                    List Supported Products
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceProducts())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceProducts()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Call this to discover the valid <code>product</code> keys (car-insurance, bike-insurance, health-insurance, life-insurance, etc.) before requesting a quote link.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">1. POST</Badge>
                    Get Quote Link
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_QuoteLink())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_QuoteLink()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Returns a <code>quote_url</code> tagged with your API key — open it for the customer (webview/iframe/redirect)
                  to compare live premiums across insurers and buy. This is the main entry point for insurance from your portal.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">2. GET</Badge>
                    List Your Leads
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceGetLeads())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceGetLeads()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Poll this (or the single-lead version below) to track a lead from "Lead Created" to "Success" after the customer completes the quote link.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">GET</Badge>
                    Get a Single Lead
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceGetLead())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceGetLead()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-transparent rounded-sm px-2">3. POST</Badge>
                    Download Policy PDF
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceDownloadPdf())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceDownloadPdf()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Call once the lead's status is "Success" — streams the issued policy PDF back as the response body.
                </p>
              </div>

            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings size={16} className="text-muted-foreground" />
                Policy Record-Keeping (optional)
              </CardTitle>
              <CardDescription>
                For policies you want tracked inside Finonest regardless of how they were issued — standalone, or
                linked to one of your existing Finonest loans via <code>loan_id</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent rounded-sm px-2">POST</Badge>
                    Create Policy
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceCreatePolicy())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceCreatePolicy()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">GET</Badge>
                    List Your Policies
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceGetPolicies())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceGetPolicies()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-transparent rounded-sm px-2">PUT</Badge>
                    Update Policy (renewal, status)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceUpdatePolicy())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceUpdatePolicy()}
                  </pre>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-transparent rounded-sm px-2">POST</Badge>
                    Log a Lead Directly (skip the quote link)
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getCurl_InsuranceCreateLead())} className="h-8 text-xs">
                    <Copy size={12} className="mr-1" /> Copy cURL
                  </Button>
                </div>
                <div className="relative rounded-md overflow-hidden bg-[#1e1e1e]">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {getCurl_InsuranceCreateLead()}
                  </pre>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Only needed if you've already collected the customer's details yourself and just want it logged for a Finonest RM to follow up on.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
