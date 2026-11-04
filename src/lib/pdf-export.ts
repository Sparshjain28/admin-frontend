import { formatCurrency } from '@/lib/mock-data';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-IN'); } catch { return '—'; }
}

function fmt(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}

function fmtCur(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return formatCurrency(n).replace('₹', 'Rs. ');
}

function row4(l1: string, v1: string, l2: string, v2: string, l3: string, v3: string, l4: string, v4: string): string {
  return `<tr>
    <td class="lbl">${l1}</td><td class="val">${v1}</td>
    <td class="lbl">${l2}</td><td class="val">${v2}</td>
    <td class="lbl">${l3}</td><td class="val">${v3}</td>
    <td class="lbl">${l4}</td><td class="val">${v4}</td>
  </tr>`;
}

function sectionTitle(icon: string, title: string): string {
  return `<tr><td colspan="8" class="sec-title">${icon} ${title}</td></tr>`;
}

function buildLoanHTML(loan: LoanData): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Loan Application - ${loan.loan_number || loan.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; font-size: 10px; line-height: 1.4; padding: 10px; }
  
  .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 2px solid #1a3a6b; padding-bottom: 6px; }
  .hdr-table td { vertical-align: middle; padding: 4px; }
  .company-logo { height: 35px; width: auto; }
  .company-name { font-size: 18px; font-weight: 800; color: #1a3a6b; }
  .company-sub { font-size: 9px; color: #666; }
  .hdr-right { text-align: right; }
  .hdr-lbl { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .hdr-val { font-size: 12px; font-weight: 700; color: #1a3a6b; }

  .title-bar { background: #1a3a6b; color: #fff; padding: 6px 12px; margin-bottom: 8px; }
  .title-bar table { width: 100%; }
  .title-bar td { color: #fff; }
  .title-bar .t-left { font-size: 13px; font-weight: 700; }
  .title-bar .t-right { text-align: right; font-size: 9px; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; }

  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .data-table td { padding: 3px 5px; border: 1px solid #e0e4ea; vertical-align: top; }
  .data-table .lbl { font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; width: 9%; background: #f8f9fb; }
  .data-table .val { font-size: 10px; font-weight: 600; color: #1a1a2e; width: 16%; word-break: break-word; }
  .data-table .sec-title { font-size: 10px; font-weight: 700; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #1a3a6b; background: #f0f4f8; padding: 5px; }

  .sig-table { width: 100%; margin-top: 25px; border-collapse: collapse; }
  .sig-table td { width: 33%; text-align: center; padding-top: 40px; border-top: 1px solid #333; font-size: 9px; color: #555; }

  .footer-table { width: 100%; margin-top: 12px; border-top: 1.5px solid #e8ecf1; padding-top: 6px; }
  .footer-table td { font-size: 8px; color: #999; padding: 2px; }
</style></head><body>

<table class="hdr-table">
  <tr>
    <td style="width:70%">
      <img src="/finonest_pro_logo_cropped.png" alt="Finonest India" class="company-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
      <div style="display:none;">
        <span class="company-name">Finonest India</span><br/>
        <span class="company-sub">Vehicle Loan Solutions &bull; Since 2015</span>
      </div>
    </td>
    <td class="hdr-right">
      <span class="hdr-lbl">Application ID</span><br/>
      <span class="hdr-val">${loan.loan_number || loan.id}</span><br/>
      <span class="hdr-lbl">Date</span><br/>
      <span class="hdr-val" style="font-size:11px">${new Date().toLocaleDateString('en-IN')}</span>
    </td>
  </tr>
</table>

<div class="title-bar">
  <table><tr>
    <td class="t-left">Loan Application Details</td>
    <td><span class="t-right">${fmt(loan.status)}</span></td>
  </tr></table>
</div>

<table class="data-table">
  ${sectionTitle('&#128100;', 'Applicant Information')}
  ${row4('LoanApp ID', fmt(loan.loan_number || loan.id), 'Applicant Name', fmt(loan.applicant_name || loan.customer_name), 'Mobile', fmt(loan.mobile || loan.phone), 'Email', fmt(loan.email || loan._lead_email || loan.customer_email))}
  ${row4('Co-Applicant', fmt(loan.co_applicant_name), 'Co-App Mobile', fmt(loan.co_applicant_mobile), 'Guarantor', fmt(loan.guarantor_name), 'Guarantor Mobile', fmt(loan.guarantor_mobile))}
  <tr>
    <td class="lbl">Address</td><td class="val" colspan="3">${fmt(loan.current_address || loan.address || loan.customer_address)}</td>
    <td class="lbl">Landmark</td><td class="val">${fmt(loan.landmark || loan.current_landmark || loan.customer_landmark)}</td>
    <td class="lbl">City & State</td><td class="val">${fmt((loan.city || loan.current_city || loan.current_district || '') + (loan.state || loan.current_state ? ', ' + (loan.state || loan.current_state) : ''))}</td>
  </tr>
  <tr>
    <td class="lbl">Pincode</td><td class="val">${fmt(loan.pincode || loan.current_pincode || loan.customer_pincode)}</td>
    <td class="lbl">PAN Number</td><td class="val">${fmt(loan.pan_number)}</td>
    <td class="lbl"></td><td class="val"></td>
    <td class="lbl"></td><td class="val"></td>
  </tr>

  ${sectionTitle('&#128663;', 'Vehicle Details')}
  ${row4('Reg. No', fmt(loan.vehicle_number || loan.registration_number), 'Maker', fmt(loan.maker_name || loan.car_make || loan.vehicle_make), 'Model/Variant', fmt(loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant), 'Engine Number', fmt(loan.engine_number))}
  ${row4('Chassis Number', fmt(loan.chassis_number), 'Owner Name', fmt(loan.owner_name || loan.rc_owner_name), 'Fuel Type', fmt(loan.fuel_type), 'Mfg Date', formatDate(loan.manufacturing_date || loan.mfg_date))}
  ${row4('Ownership Type', fmt(loan.ownership_type), 'Financer', fmt(loan.financer || loan.existing_financier), 'Finance Status', fmt(loan.finance_status), 'Insurance Company', fmt(loan.insurance_company))}
  ${row4('Insurance Valid Upto', formatDate(loan.insurance_valid_upto || loan.insurance_expiry), 'PUCC Valid Upto', formatDate(loan.pucc_valid_upto || loan.pucc_expiry), 'Case Type', fmt(loan.case_type), '', '')}

  ${sectionTitle('&#128176;', 'Existing Loan & EMI Details')}
  ${row4('Loan Status', fmt(loan.existing_loan_status || loan.loan_status || loan.finance_status), 'Loan Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_loan_amount) : '—', 'Tenure', loan.existing_loan_status === 'Active' && (loan.existing_tenure || loan.tenure) ? (loan.existing_tenure || loan.tenure) + ' months' : '—', 'EMI Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_emi || loan.emi_amount || loan.emi) : '—')}
  ${loan.existing_loan_status === 'Active' ? row4('No of EMI Paid', fmt(loan.no_of_emi_paid || 0), 'Total Interest', fmtCur(loan.total_interest || 0), 'Bouncing in Last 3M', fmt(loan.bouncing_3_months || 0), 'Bouncing in Last 6M', fmt(loan.bouncing_6_months || 0)) : ''}
  ${row4('Financier Name', fmt(loan.rto_financier_name || loan.financer), '', '', '', '', '', '')}

  ${(() => {
    const profFields: [string, string][] = [];
    if (loan.income_source) profFields.push(['Income Source', fmt(loan.income_source)]);
    if (loan.monthly_income || loan.net_monthly_salary) profFields.push(['Monthly Income', loan.monthly_income ? fmtCur(loan.monthly_income) : fmtCur(loan.net_monthly_salary)]);
    if (loan.company_name) profFields.push(['Company Name', fmt(loan.company_name)]);
    if (loan.designation) profFields.push(['Designation', fmt(loan.designation)]);
    if (loan.current_job_years) profFields.push(['Current Job (Yrs)', fmt(loan.current_job_years)]);
    if (loan.total_work_exp || loan.work_experience) profFields.push(['Total Work Exp (Yrs)', fmt(loan.total_work_exp || loan.work_experience)]);
    if (loan.salary_credit_mode) profFields.push(['Salary Credit Mode', fmt(loan.salary_credit_mode.replace(/_/g, ' '))]);
    if (loan.salary_slip_available != null) profFields.push(['Salary Slip', loan.salary_slip_available ? 'Available' : 'Not Available']);
    if (loan.business_name) profFields.push(['Business Name', fmt(loan.business_name)]);
    if (loan.business_type) profFields.push(['Business Type', fmt(loan.business_type)]);
    if (loan.business_vintage) profFields.push(['Business Vintage (Yrs)', fmt(loan.business_vintage)]);
    if (loan.annual_income_itr) profFields.push(['Annual Income (ITR)', fmtCur(loan.annual_income_itr)]);
    if (loan.itr_available != null) profFields.push(['ITR Available', loan.itr_available ? 'Yes' : 'No']);
    if (loan.professional_subtype) profFields.push(['Professional Sub Type', fmt(loan.professional_subtype)]);
    if (loan.practice_experience) profFields.push(['Practice Exp (Yrs)', fmt(loan.practice_experience)]);
    if (loan.freelancer_subtype) profFields.push(['Freelancer Type', fmt(loan.freelancer_subtype)]);
    if (profFields.length === 0) return '';
    while (profFields.length % 4 !== 0) profFields.push(['', '']);
    return sectionTitle('&#128188;', 'Professional Details') + profFields.reduce((acc, _, i) => {
      if (i % 4 === 0) acc += row4(profFields[i]?.[0]||'', profFields[i]?.[1]||'', profFields[i+1]?.[0]||'', profFields[i+1]?.[1]||'', profFields[i+2]?.[0]||'', profFields[i+2]?.[1]||'', profFields[i+3]?.[0]||'', profFields[i+3]?.[1]||'');
      return acc;
    }, '');
  })()}

  ${sectionTitle('&#127974;', 'Lender Details')}
  ${row4('Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name), 'Branch', fmt(loan.financier_branch_name), 'Sales Manager', fmt(loan.financier_executive_name), 'SM Mobile', fmt(loan.financier_executive_mobile))}
  ${row4('Area Manager', fmt(loan.financier_area_manager_name), 'AM Mobile', fmt(loan.financier_area_manager_mobile), 'Loan Amount Required', fmtCur(loan.loan_amount), 'Case Type', fmt(loan.case_type))}

  ${loan.application_stage === 'APPROVED' || loan.application_stage === 'DISBURSED' || loan.application_stage === 'CANCELLED' || loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'cancelled' ? `
  ${sectionTitle('&#128203;', 'Deductions & Disbursement')}
  ${row4('File Charge', fmtCur(loan.file_charge), 'Loan Suraksha', fmtCur(loan.loan_suraksha), 'Stamping', fmtCur(loan.stamping), 'Processing Fee', fmtCur(loan.processing_fee))}
  ${row4('Total Deduction', fmtCur(loan.total_deduction), 'Net Disbursement', fmtCur(loan.net_disbursement_amount), 'Payment Recd.', formatDate(loan.payment_received_date), 'Disburse Date', formatDate(loan.financier_disburse_date))}
  ` : ''}
</table>

<div style="margin-top: 20px;">
  <h3 style="font-size: 12px; font-weight: bold; color: #1a3a6b; margin-bottom: 10px;">REFERENCES</h3>
</div>

<table class="sig-table">
  <tr>
    ${(() => {
      const refs = loan._hierarchy || [
        { name: loan.created_by_name || '—', designation: 'Creator' }
      ];
      const w = Math.floor(100 / refs.length);
      return refs.map((ref: any) => `
        <td style="padding-top:20px;width:${w}%;text-align:center;border-top:1px solid #333;font-size:9px;color:#555;">
          <div style="font-size:10px;font-weight:bold;color:#1a1a2e;margin-bottom:5px;">${ref.name}</div>
          <div style="margin-top:5px;">${ref.designation}</div>
        </td>`).join('');
    })()}
  </tr>
</table>

<table class="footer-table">
  <tr>
    <td>Generated on ${new Date().toLocaleString('en-IN')} &bull; Finonest India</td>
    <td style="text-align:right">This is a system-generated document</td>
  </tr>
</table>

</body></html>`;
}

const ROLE_LABELS_MAP: Record<string, string> = {
  executive: 'Executive',
  team_leader: 'Team Leader',
  branch_manager: 'Branch Manager',
  dsa: 'DSA',
  sales_manager: 'Sales Manager',
  manager: 'Manager',
  admin: 'Admin',
};

async function fetchLeadProfile(leadId: any): Promise<any | null> {
  // Lead profile endpoint not available in production
  return null;
}

async function fetchHierarchy(loan: LoanData): Promise<{ name: string; designation: string }[]> {
  try {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` };

    // If loan came from a lead, use lead's creator for hierarchy
    let creatorId = loan.created_by;
    if (loan.lead_id) {
      try {
        const leadRes = await fetch(`${API}/leads/${loan.lead_id}`, { headers });
        if (leadRes.ok) {
          const lead = await leadRes.json();
          if (lead.created_by) creatorId = lead.created_by;
          if (lead.email) loan._lead_email = lead.email;
        }
      } catch {}
    }
    // If no lead_id, use loan's created_by directly (TL or executive who created loan)
    if (!creatorId) return [];

    const hierarchy: { name: string; designation: string }[] = [];
    let currentId = creatorId;
    let depth = 0;
    while (currentId && depth < 6) {
      const res = await fetch(`${API}/users/${currentId}`, { headers });
      if (!res.ok) break;
      const u = await res.json();
      hierarchy.push({ name: u.full_name || '—', designation: ROLE_LABELS_MAP[u.role] || u.role || '—' });
      currentId = u.reporting_to;
      depth++;
    }
    return hierarchy;
  } catch {
    return [];
  }
}

export function exportLoanPDF(loan: LoanData, docs: any[] = []) {
  const win = window.open('', '_blank');
  if (!win) return;
  const leadId = loan.lead_id || loan.id;
  Promise.all([fetchHierarchy(loan), fetchDocumentFiles(docs), fetchLeadProfile(leadId)]).then(async ([hierarchy, docFileObjs, profile]) => {
    const loanWithHierarchy = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined, _profile: profile };
    const html = buildLoanHTML(loanWithHierarchy);
    win.document.write(html);
    win.document.close();

    // Append document images inline in the print window
    if (docFileObjs.length > 0) {
      const container = win.document.createElement('div');
      container.style.cssText = 'margin-top:20px;';
      const heading = win.document.createElement('h3');
      heading.style.cssText = 'font-size:12px;font-weight:bold;color:#1a3a6b;margin-bottom:10px;';
      heading.textContent = 'UPLOADED DOCUMENTS';
      container.appendChild(heading);

      for (const docFile of docFileObjs) {
        const wrapper = win.document.createElement('div');
        wrapper.style.cssText = 'page-break-inside:avoid;margin-bottom:16px;border:1px solid #e0e4ea;border-radius:4px;overflow:hidden;';

        const label = win.document.createElement('div');
        label.style.cssText = 'background:#1a3a6b;color:#fff;padding:4px 10px;font-size:10px;font-weight:bold;';
        label.textContent = docFile.docType;
        wrapper.appendChild(label);

        if (docFile.file.type.startsWith('image/')) {
          const url = URL.createObjectURL(docFile.file);
          const img = win.document.createElement('img');
          img.src = url;
          img.style.cssText = 'max-width:100%;display:block;';
          wrapper.appendChild(img);
        } else {
          const note = win.document.createElement('p');
          note.style.cssText = 'padding:8px;font-size:9px;color:#666;';
          note.textContent = `${docFile.name} (PDF - see downloaded file)`;
          wrapper.appendChild(note);
        }
        container.appendChild(wrapper);
      }
      win.document.body.appendChild(container);
    }
    setTimeout(() => win.print(), 800);
  });
}

const PDF_DOC_LABELS: Record<string, string> = {
  aadhar_front: 'Aadhar Front', aadhar_back: 'Aadhar Back', pan_card: 'PAN Card',
  rc_front: 'RC Front', rc_back: 'RC Back', rc_copy: 'RC Copy',
  driving_licence: 'Driving Licence', driving_license: 'Driving Licence',
  light_bill: 'Light Bill', bank_statement: 'Bank Statement', loan_statement: 'Loan Statement',
  cheque: 'Cheque', income_proof: 'Income Proof', rent_agreement: 'Rent Agreement',
  customer_photo: 'Customer Photo', photo: 'Photo', disbursement_memo: 'Disbursement Memo',
  insurance: 'Insurance', customer_ledger: 'Customer Ledger',
  co_aadhar_front: 'Co-Applicant Aadhar Front', co_aadhar_back: 'Co-Applicant Aadhar Back',
  co_pan_card: 'Co-Applicant PAN Card', co_photo: 'Co-Applicant Photo',
  guarantor_aadhar_front: 'Guarantor Aadhar Front', guarantor_aadhar_back: 'Guarantor Aadhar Back',
  guarantor_pan_card: 'Guarantor PAN Card', guarantor_rc_front: 'Guarantor RC Front',
  guarantor_rc_back: 'Guarantor RC Back', guarantor_photo: 'Guarantor Photo',
  nach: 'NACH', other: 'Other',
};

async function fetchDocumentFiles(docs: any[]): Promise<{ file: File; name: string; docType: string; docId: number; shareToken?: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // No authentication headers needed for public document access
  const files: { file: File; name: string; docType: string; docId: number; shareToken?: string }[] = [];
  for (const doc of docs) {
    try {
      const res = await fetch(`${API}/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) {
        console.warn(`Failed to fetch document ${doc.id}: ${res.status}`);
        continue;
      }
      
      const blob = await res.blob();
      
      // Validate blob has content
      if (blob.size === 0) {
        console.warn(`Document ${doc.id} has empty blob`);
        continue;
      }
      
      let finalBlob = blob;
      let mimeType = blob.type;
      const fileName = doc.file_name || `document-${doc.id}`;
      let fileExt = fileName.split('.').pop()?.toLowerCase();
      
      // Fix MIME type if needed
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (fileExt === 'jpg' || fileExt === 'jpeg') mimeType = 'image/jpeg';
        else if (fileExt === 'png') mimeType = 'image/png';
        else if (fileExt === 'pdf') mimeType = 'application/pdf';
        else if (fileExt === 'gif') mimeType = 'image/gif';
        else if (fileExt === 'webp') mimeType = 'image/webp';
      }

      // Compress large images for sharing (max 800px, 0.6 quality) to keep share bundle < 1.5MB
      if (mimeType.startsWith('image/') && finalBlob.size > 200 * 1024) {
        try {
          const imgBitmap = await createImageBitmap(finalBlob);
          const canvas = document.createElement('canvas');
          let { width, height } = imgBitmap;
          const MAX_DIMENSION = 800;
          
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imgBitmap, 0, 0, width, height);
            const compressedBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.6));
            if (compressedBlob && compressedBlob.size < finalBlob.size) {
              finalBlob = compressedBlob;
              mimeType = 'image/jpeg';
              fileExt = 'jpg';
            }
          }
        } catch (e) {
          console.warn('Image compression failed', e);
        }
      }
      
      const docLabel = PDF_DOC_LABELS[doc.document_type] || doc.document_type?.replace(/_/g, ' ') || 'Document';
      const cleanFileName = fileExt && !fileName.toLowerCase().endsWith(fileExt) ? `${fileName}.${fileExt}` : fileName;
      const shareFileName = `${docLabel}-${cleanFileName}`;
      
      const file = new File([finalBlob], shareFileName, { type: mimeType });
      files.push({
        file,
        name: doc.file_name || 'document',
        docType: doc.document_type || 'unknown',
        docId: doc.id,
        shareToken: doc.share_token || doc.id
      });
      
      console.log(`✅ Loaded document: ${shareFileName} (${mimeType}, ${blob.size} bytes)`);
    } catch (error) {
      console.error(`Failed to fetch document ${doc.id}:`, error);
    }
  }
  return files;
}

// Function to share individual documents with better mobile support
export async function shareDocuments(docs: any[]) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }
    
    if (docs.length === 0) {
      toast.error('No documents to share');
      return;
    }
    
    const loadingToast = toast.loading('Preparing documents for sharing...');
    
    // Fetch document files
    const docFileObjs = await fetchDocumentFiles(docs);
    
    if (docFileObjs.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No documents could be prepared for sharing');
      return;
    }
    
    // Separate by file type for better mobile compatibility
    const imageFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.startsWith('image/') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png');
    });
    
    const pdfFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.includes('pdf');
    });
    
    toast.dismiss(loadingToast);
    
    try {
      // Strategy 1: Try sharing all documents together (works on newer devices)
      const allFiles = docFileObjs.map(f => f.file);
      if (navigator.canShare) {
        const canShareAll = await navigator.canShare({ files: allFiles });
        if (canShareAll) {
          await navigator.share({ 
            title: 'Loan Documents',
            text: `${docFileObjs.length} loan documents`,
            files: allFiles
          });
          toast.success(`Shared ${docFileObjs.length} documents!`);
          return;
        }
      }
      
      // Strategy 2: Share images first (mobile handles images better)
      if (imageFiles.length > 0) {
        const imageFilesList = imageFiles.map(f => f.file);
        const canShareImages = navigator.canShare ? await navigator.canShare({ files: imageFilesList }) : true;
        
        if (canShareImages) {
          await navigator.share({ 
            title: 'Loan Document Images',
            text: `${imageFiles.length} loan document images`,
            files: imageFilesList
          });
          
          // Offer to share PDFs separately if any exist
          if (pdfFiles.length > 0) {
            setTimeout(async () => {
              const sharePDFs = confirm(`Share ${pdfFiles.length} PDF documents separately?`);
              if (sharePDFs) {
                try {
                  const pdfFilesList = pdfFiles.map(f => f.file);
                  await navigator.share({ 
                    title: 'Loan PDF Documents',
                    text: `${pdfFiles.length} loan PDF documents`,
                    files: pdfFilesList
                  });
                  toast.success(`Shared ${pdfFiles.length} PDF documents!`);
                } catch (e) {
                  toast.error('Could not share PDF documents');
                }
              }
            }, 2000);
          }
          
          toast.success(`Shared ${imageFiles.length} document images!`);
          return;
        }
      }
      
      // Strategy 3: Try sharing PDFs only
      if (pdfFiles.length > 0) {
        const pdfFilesList = pdfFiles.map(f => f.file);
        const canSharePDFs = navigator.canShare ? await navigator.canShare({ files: pdfFilesList }) : true;
        
        if (canSharePDFs) {
          await navigator.share({ 
            title: 'Loan PDF Documents',
            text: `${pdfFiles.length} loan PDF documents`,
            files: pdfFilesList
          });
          toast.success(`Shared ${pdfFiles.length} PDF documents!`);
          return;
        }
      }
      
      // Strategy 4: Fallback message
      toast.error('Unable to share documents on this device. Try sharing individual files.');
      
    } catch (shareError) {
      console.error('Document share error:', shareError);
      
      if (shareError.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error('Failed to share documents: ' + shareError.message);
      }
    }
    
  } catch (e) {
    console.error('Error preparing documents for sharing:', e);
    toast.error('Failed to prepare documents for sharing');
  }
}

export function getShareMessageText(loan: LoanData, docIds: string = ''): string {
  const customerName = loan.applicant_name || loan.customer_name || 'Customer';
  const mobile = loan.mobile || loan.phone || 'N/A';
  const caseType = loan.case_type || 'N/A';
  const vehicleRc = loan.vehicle_number || loan.registration_number || 'N/A';
  
  const maker = loan.maker_name || loan.car_make || loan.vehicle_make || '';
  const model = loan.maker_model || loan.car_model || loan.vehicle_model || '';
  const variant = loan.model_variant_name || loan.variant || '';
  const vehicleModel = [maker, model, variant].filter(Boolean).join(' - ') || 'N/A';
  
  const currentFinancier = loan.existing_financier || loan.financer || 'N/A';
  const lender = loan.financier_name || loan.selected_financier || loan.bank_name || 'N/A';
  const advisorName = loan.created_by_name || loan.assigned_to_name || 'N/A';

  let lines = [
    `•  Customer Name: ${customerName}`,
    `•  Mobile Number: ${mobile}`,
    `•  Case Type: ${caseType}`,
    `•  Vehicle RC Number: ${vehicleRc}`,
    `•  Vehicle Model: ${vehicleModel}`,
    `•  BT FROM: ${currentFinancier}`,
    `•  Loan Amount Required: MAXIMUM POSSIBLE`,
    `•  LENDER: ${lender}`,
    `•  Reference / Advisor Name: ${advisorName}`,
  ];

  lines.push('');
  lines.push(`To download all documents, please click here:`);
  lines.push(`https://app.finonest.com/download-documents/${loan.id || ''}${docIds ? `?ids=${docIds}` : ''}`);
  
  lines.push('');
  lines.push('For more details, contact Finonest India team.');
  lines.push('');
  lines.push('Thank you,');
  lines.push('Finonest India');
  
  return lines.join('\n');
}

export async function shareLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    // Show loading toast
    const loadingToast = toast.loading('Preparing documents for sharing...');
    
    const [docFileObjs, pdfBlob] = await Promise.all([fetchDocumentFiles(docs), fetchLoanPdfBlob(loan.id)]);
    const customerName = (loan.applicant_name || loan.customer_name || 'Application').replace(/\s+/g, '_');
    const loanNum = loan.loan_number || loan.id;
    const pdfFile = new File([pdfBlob], `${loanNum}_${customerName}.pdf`, { type: 'application/pdf' });
    
    toast.dismiss(loadingToast);
    
    // Check if native sharing is available
    if (!navigator.share) {
      toast.error('Native sharing not supported on this device/browser');
      return;
    }
    
    const docIdsStr = docFileObjs.map(d => d.shareToken || d.docId).filter(Boolean).join(',');
    try {
      // First try sharing with all files (PDF + documents)
      const filesToShare = [pdfFile];
      
      // Add document files as attachments (limit file types for better mobile compatibility)
      if (docFileObjs.length > 0) {
        docFileObjs.forEach(docFile => {
          // Only add common file types that mobile devices can handle
          const fileType = docFile.file.type;
          if (fileType.includes('pdf') || fileType.includes('image/') || fileType.includes('jpeg') || fileType.includes('png')) {
            filesToShare.push(docFile.file);
          }
        });
      }
      
      console.log('Attempting to share files:', filesToShare.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      // Check if files can be shared
      if (navigator.canShare && typeof navigator.canShare === 'function') {
        const canShareFiles = await navigator.canShare({ files: filesToShare });
        console.log('Can share files:', canShareFiles);
        
        if (canShareFiles) {
          try { await navigator.clipboard.writeText(getShareMessageText(loan, docIdsStr)); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
          await navigator.share({ 
            title: `Loan Application - ${loan.loan_number || loan.id}`,
            text: getShareMessageText(loan, docIdsStr),
            files: filesToShare 
          });
          toast.success(`Shared PDF with ${docFileObjs.length} document attachments!`);
          return;
        }
      }
      
      // Fallback: Try sharing just the PDF if multiple files not supported
      console.log('Multiple files not supported, trying PDF only');
      const canSharePDF = navigator.canShare ? await navigator.canShare({ files: [pdfFile] }) : true;
      
      if (canSharePDF) {
        try { await navigator.clipboard.writeText(getShareMessageText(loan, docIdsStr)); toast.success('Message copied to clipboard! You can paste it when sharing.'); } catch(e){}
        await navigator.share({ 
          title: `Loan Application - ${loan.loan_number || loan.id}`,
          text: getShareMessageText(loan, docIdsStr) + '\n\nAdditional documents available separately.',
          files: [pdfFile] 
        });
        toast.success('Shared PDF! Additional documents may need to be shared separately.');
        return;
      }
      
      // Last fallback: Share without files (text only)
      console.log('File sharing not supported, trying text only');
      await navigator.share({ 
        title: `Loan Application - ${loan.loan_number || loan.id}`,
        text: getShareMessageText(loan, docIdsStr)
      });
      toast.info('Shared loan details as text. Documents need to be shared separately.');
      
    } catch (shareError) {
      console.error('Share error:', shareError);
      if (shareError.name === 'AbortError') {
        toast.info('Sharing cancelled by user');
      } else {
        toast.error('Failed to share: ' + shareError.message);
      }
    }
    
  } catch (e) {
    console.error('Error preparing documents for sharing:', e);
    toast.error('Failed to prepare documents for sharing');
  }
}

// Server-rendered loan application PDF — single source of truth shared with
// the Flutter app (App-backend's loanApplicationTemplate.js), so this and
// the mobile app can never drift apart the way the old client-side jsPDF
// generation (generatePDFBlob/generatePDFBlobWithoutImages) did.
async function fetchLoanPdfBlob(loanId: string | number): Promise<Blob> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const res = await fetch(`${API}/loans/${loanId}/pdf`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to generate loan PDF: ${res.status}`);
  }
  return res.blob();
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    const pdfBlob = await fetchLoanPdfBlob(loan.id);
    const customerName = (loan.applicant_name || loan.customer_name || 'Application').replace(/\s+/g, '_');
    const loanNum = loan.loan_number || loan.id;
    triggerDownload(pdfBlob, `${loanNum}_${customerName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF for download:', error);
    alert('Error generating PDF. Please try again.');
  }
}

export async function buildLoanApplicationPdfBlob(loan: LoanData, docs: any[] = []): Promise<Blob> {
  return fetchLoanPdfBlob(loan.id);
}

export async function prepareLoanShareBundle(loan: LoanData, docs: any[] = []) {
  try {
    const pdfBlob = await fetchLoanPdfBlob(loan.id);
    const customerName = (loan.applicant_name || loan.customer_name || 'Application').replace(/\s+/g, '_');
    const loanNum = loan.loan_number || loan.id;
    const pdfFile = new File([pdfBlob], `${loanNum}_${customerName}.pdf`, { type: 'application/pdf' });

    const docIdsStr = docs.map(d => d.share_token || d.id).filter(Boolean).join(',');
    return {
      title: `Loan Application - ${loan.loan_number || loan.id}`,
      text: getShareMessageText(loan, docIdsStr),
      files: [pdfFile],
    };
  } catch (error) {
    console.error('Error preparing loan share bundle:', error);
    throw error;
  }
}

// Missing export function for preparing document share bundle
export async function prepareDocumentShareBundle(docs: any[] = [], loanId?: string | number) {
  try {
    const docFileObjs = await fetchDocumentFiles(docs);
    
    // Filter to ONLY include image files (no PDFs)
    const imageFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.startsWith('image/') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png') || fileType.includes('gif') || fileType.includes('webp');
    });
    
    if (imageFiles.length === 0) {
      throw new Error('No image documents found');
    }
    
    const files = imageFiles.map(docFile => docFile.file);
    const docIdsStr = imageFiles.map(d => d.shareToken || d.docId).filter(Boolean).join(',');
    
    return {
      title: 'Loan Document Images',
      text: `${imageFiles.length} loan document image${imageFiles.length > 1 ? 's' : ''}.\n\nTo download all documents, please click here:\nhttps://app.finonest.com/download-documents/${loanId || ''}${docIdsStr ? `?ids=${docIdsStr}` : ''}`,
      files: files,
      docCount: imageFiles.length,
    };
  } catch (error) {
    console.error('Error preparing document share bundle:', error);
    throw error;
  }
}
