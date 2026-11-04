// Dynamic import to avoid bundling xlsx in main chunk
let XLSX: typeof import('xlsx');

const loadXLSX = async () => {
  if (!XLSX) {
    XLSX = await import('xlsx');
  }
  return XLSX;
};

import { Lead } from '@/types/lead';

// Filtered columns as requested by user
export const FILTERED_LEAD_COLUMNS = [
  { key: 'created_at', label: 'created_at' },
  { key: 'advisor_id', label: 'channel_code' },
  { key: 'advisor_name', label: 'advisor_name' },
  { key: 'type', label: 'product_category' },
  { key: 'bank_name', label: 'bank_name' },
  { key: 'card_name', label: 'product_name' },
  { key: 'lead_id', label: 'lead_id' },
  { key: 'applicant_name', label: 'customer_name' },
  { key: 'applicant_phone', label: 'phone' },
  { key: 'applicant_email', label: 'email' },
  { key: 'status', label: 'status' },
  { key: 'remark', label: 'remark' },
  { key: 'application_no', label: 'application_no_mis' },
  { key: 'cust_type', label: 'cust_type' },
  { key: 'card_variant', label: 'card_variant_mis' },
  { key: 'vkyc_status', label: 'vkyc_status' },
  { key: 'bkyc_status', label: 'bkyc_status' },
  { key: 'card_issued_date', label: 'card_issued_date' },
  { key: 'activation_status', label: 'activation_status' },
  { key: 'disbursed_amount', label: 'disbursed_amount' },
  { key: 'updated_at', label: 'updated_at' },
];

// Full columns including advisor details
export const FULL_LEAD_COLUMNS = [
  ...FILTERED_LEAD_COLUMNS,
  { key: 'advisor_email', label: 'advisor_email' },
  { key: 'advisor_pan', label: 'advisor_pan' },
  { key: 'advisor_bank', label: 'advisor_bank_acc' },
  { key: 'advisor_ifsc', label: 'advisor_ifsc' },
];

// Default to filtered columns as requested
export const LEAD_COLUMNS = FILTERED_LEAD_COLUMNS;

/**
 * Export leads to Excel file
 */
export const exportLeadsToExcel = async (leads: Lead[], filename: string = 'leads_export.xlsx', customColumns?: { key: string; label: string }[]) => {
  try {
    const XLSX = await loadXLSX();
    const columns = customColumns || LEAD_COLUMNS;

    // Prepare data
    const data = leads.map(lead => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        row[col.label] = (lead as Record<string, any>)[col.key] || '';
      });
      return row;
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Set column widths
    const colWidths = columns.map(() => 18);
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    // Add header styling with light blue background
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4B5563' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Download file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    throw new Error('Failed to export leads');
  }
};

/**
 * Generate and download an offline leads import template
 */
export const downloadOfflineTemplate = async (filename: string = 'offline_leads_template.xlsx', users: any[] = [], cards: any[] = []) => { // v2
  try {
    const XLSX = await loadXLSX();

    const templateData = [
      {
        'created_at': '',
        'customer_name': '',
        'bank_name': '',
        'product_name': '',
        'user_id': '',
        'disbursed_amount': '',
        'application_no_mis': '',
        'status': '',
        'remark': '',
        'cust_type': '',
        'card_variant_mis': '',
        'vkyc_status': '',
        'bkyc_status': '',
        'card_issued_date': '',
        'activation_status': '',
      },
      {
        'created_at': '',
        'customer_name': '',
        'bank_name': '',
        'product_name': '',
        'user_id': '',
        'disbursed_amount': '',
        'application_no_mis': '',
        'status': '',
        'remark': '',
        'cust_type': '',
        'card_variant_mis': '',
        'vkyc_status': '',
        'bkyc_status': '',
        'card_issued_date': '',
        'activation_status': '',
      },
    ];

    for (let i = 0; i < 8; i++) {
      templateData.push({
        'created_at': '',
        'customer_name': '',
        'product_name': '', 'bank_name': '', 'user_id': '',
        'disbursed_amount': '',
        'application_no_mis': '', 'status': '', 'remark': '', 'cust_type': '', 'card_variant_mis': '',
        'vkyc_status': '', 'bkyc_status': '', 'card_issued_date': '', 'activation_status': '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Offline Leads');
    const colWidths = [20, 20, 25, 20, 25, 18, 12, 30, 15, 18, 18, 18, 16, 16, 15];
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_col(C) + '1';
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1D4ED8' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Combined reference sheet: Products (cols A-C) | gap (col D) | Advisors (cols E-F)
    const maxRows = Math.max(users.length, cards.length, 1);
    const refData: any[] = [];

    // Header row
    refData.push({
      'product_category': 'product_category',
      'bank_name': 'bank_name',
      'product_name': 'product_name',
      '_gap': '',
      'user_id': 'user_id (Copy this to Excel)',
      'advisor_name': 'advisor_name',
    });

    for (let i = 0; i < maxRows; i++) {
      const u = users[i];
      const c = cards[i];
      const bankName = c ? (typeof c.bank === 'string' ? c.bank : (c.bank?.name || c.bankName || '')) : '';
      const userId = u ? (u.id || '') : '';
      const userName = u ? (u.name || '') : '';

      refData.push({
        'product_category': c ? (c.type || 'credit_card') : '',
        'bank_name': bankName,
        'product_name': c ? (c.name || '') : '',
        '_gap': '',
        'user_id': userId,  // This is the actual DB user ID (e.g., CH0934B74F)
        'advisor_name': userName,
      });
    }

    const wsRef = XLSX.utils.json_to_sheet(refData, { skipHeader: true });
    wsRef['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 25 }, { wch: 4 }, { wch: 30 }, { wch: 30 }];

    // Style product headers (A1-C1) in brown
    ['A1', 'B1', 'C1'].forEach(addr => {
      if (!wsRef[addr]) return;
      wsRef[addr].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '92400E' } }, alignment: { horizontal: 'center' } };
    });
    // Style advisor headers (E1-F1) in green
    ['E1', 'F1'].forEach(addr => {
      if (!wsRef[addr]) return;
      wsRef[addr].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '065F46' } }, alignment: { horizontal: 'center' } };
    });

    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference');

    XLSX.writeFile(wb, filename);
  } catch (error) {
    throw new Error('Failed to download offline template');
  }
};

/**
 * Parse offline leads Excel file
 */
export const parseOfflineLeadsFile = async (file: File): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '', header: 1 }) as any[];

          if (rawData.length < 2) {
            reject(new Error('File must have headers and at least one data row'));
            return;
          }

          const headers = rawData[0];
          const headerIndex: Record<string, number> = {};
          headers.forEach((h: string, i: number) => {
            headerIndex[String(h).toLowerCase().trim()] = i;
          });

          const get = (name: string, row: any[]) => {
            const idx = headerIndex[name.toLowerCase().trim()];
            return idx !== undefined ? String(row[idx] || '').trim() : '';
          };

          const normalizeKyc = (s: string) => {
            if (!s) return undefined;
            const u = s.toUpperCase().trim();
            if (u === 'APPROVED') return 'COMPLETED';
            if (u === 'FAILED' || u === 'FAIL') return 'REJECTED';
            if (['COMPLETED', 'REJECTED', 'PENDING'].includes(u)) return u;
            return u || undefined;
          };

          const normalizeActivation = (s: string) => {
            if (!s) return undefined;
            const l = s.toLowerCase().trim();
            if (l === 'active' || l === 'yes' || l === '1') return 'Active';
            if (l === 'inactive' || l === 'no' || l === '0') return 'Inactive';
            if (l === 'card closed') return 'Card Closed';
            return s.trim() || undefined;
          };

          const deriveBankFromProduct = (p: string) => {
            if (!p) return '';
            const s = p.toLowerCase();
            if (s.includes('hdfc')) return 'HDFC';
            if (s.includes('idfc')) return 'IDFC';
            return '';
          };

          const levenshtein = (a: string, b: string) => {
            const m = a.length;
            const n = b.length;
            if (m === 0) return n;
            if (n === 0) return m;
            const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
            for (let i = 0; i <= m; i++) dp[i][0] = i;
            for (let j = 0; j <= n; j++) dp[0][j] = j;
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
              }
            }
            return dp[m][n];
          };

          const normalizeStatus = (s: string) => {
            if (!s) return 'Generated';
            const raw = String(s).toLowerCase().trim();
            const norm = raw.replace(/[\s_\-]+/g, '').replace(/[^a-z]/g, '');

            // Handle declined -> rejected conversion
            if (raw === 'declined' || norm === 'declined') return 'Rejected';

            const candidates: { key: string; variants: string[] }[] = [
              { key: 'Generated', variants: ['generated', 'gen'] },
              { key: 'In_Process', variants: ['inprocess', 'inprocess'] },
              { key: 'Approved', variants: ['approved'] },
              { key: 'Rejected', variants: ['rejected', 'fail', 'failed', 'declined'] },
              { key: 'Disbursed', variants: ['disbursed'] },
            ];

            // quick exact matches
            for (const c of candidates) {
              for (const v of c.variants) {
                if (norm === v || raw === v || raw.includes(v)) return c.key;
              }
            }

            // fuzzy match using levenshtein
            let bestKey = 'Generated';
            let bestDist = Infinity;
            let bestLen = 0;
            for (const c of candidates) {
              for (const v of c.variants) {
                const d = levenshtein(norm, v);
                if (d < bestDist) {
                  bestDist = d;
                  bestKey = c.key;
                  bestLen = v.length;
                }
              }
            }

            // Accept small typos: absolute <=2 or relative <=33%
            if (bestDist <= 2 || (bestLen > 0 && (bestDist / bestLen) <= 0.33)) return bestKey;

            // Fallback: preserve original trimmed value (capitalized)
            const fallback = String(s).trim();
            return fallback.charAt(0).toUpperCase() + fallback.slice(1);
          };

          const leads: any[] = [];
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every((c: any) => !c || String(c).trim() === '')) continue;

            const customerName = get('customer_name', row);
            if (!customerName) continue;

            const productName = get('product_name', row) || get('card_name', row) || '';
            const bankFromRow = get('bank_name', row) || get('bank', row) || get('bank name', row) || deriveBankFromProduct(productName);

            leads.push({
              created_at: get('created_at', row) || undefined,
              applicant_name: customerName,
              applicant_phone: get('customer_number', row) || '9876543210',
              applicant_email: get('customer_email', row) || 'offlinelead@gmail.com',
              bank_name: bankFromRow,
              card_name: productName,
              advisor_id: get('user_id', row) || undefined,
              disbursed_amount: get('disbursed_amount', row) || undefined,
              application_no: get('application_no_mis', row) || undefined,
              cust_type: get('cust_type', row) || undefined,
              card_variant: get('card_variant_mis', row) || undefined,
              vkyc_status: normalizeKyc(get('vkyc_status', row)),
              bkyc_status: normalizeKyc(get('bkyc_status', row)),
              card_issued_date: get('card_issued_date', row) || undefined,
              activation_status: normalizeActivation(get('activation_status', row)),
              status: normalizeStatus(get('status', row)),
              remark: get('remark', row) || undefined,
            });
          }

          if (leads.length === 0) {
            reject(new Error('No valid rows found in the file'));
          } else {
            resolve(leads);
          }
        } catch (err) {
          reject(new Error(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read the file'));
      reader.readAsBinaryString(file);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate and download an Excel template
 */
export const downloadTemplate = async (filename: string = 'leads_template.xlsx') => {
  try {
    const XLSX = await loadXLSX();

    // Create sample data with the 12 requested fields
    const templateData = [
      {
        'lead_id': 'LEAD001',
        'customer_name': 'John Doe',
        'status': 'Approved',
        'remark': 'High priority',
        'application_no_mis': 'APP-001',
        'cust_type': 'Individual',
        'card_variant_mis': 'Premium',
        'vkyc_status': 'COMPLETED',
        'bkyc_status': 'COMPLETED',
        'card_issued_date': '2024-01-15',
        'activation_status': 'Active',
        'disbursed_amount': '50000',
      },
      // Add note row
      {
        'lead_id': '(Leave blank for new, or provide for update)',
        'customer_name': '(Required for new, Optional for update)',
        'status': '(Generated, Approved, Rejected, Disbursed, In_Process)',
        'remark': '(Optional)',
        'application_no_mis': '(Optional)',
        'cust_type': '(Optional)',
        'card_variant_mis': '(Optional)',
        'vkyc_status': '(COMPLETED, REJECTED, PENDING)',
        'bkyc_status': '(COMPLETED, REJECTED, PENDING)',
        'card_issued_date': '(DD/MM/YYYY format)',
        'activation_status': '(Active, Inactive)',
        'disbursed_amount': '(Numeric value)',
      },
    ];

    // Add 8 more empty rows for user data
    for (let i = 3; i <= 10; i++) {
      templateData.push({
        'lead_id': '',
        'customer_name': '',
        'status': '',
        'remark': '',
        'application_no_mis': '',
        'cust_type': '',
        'card_variant_mis': '',
        'vkyc_status': '',
        'bkyc_status': '',
        'card_issued_date': '',
        'activation_status': '',
        'disbursed_amount': '',
      });
    }

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    // Set column widths
    const colWidths = [15, 20, 15, 20, 18, 15, 18, 15, 15, 15, 18, 15];
    ws['!cols'] = colWidths.map(width => ({ wch: width }));

    // Format header
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4B5563' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }

    // Add data validation hints in comments for the first data row
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '2';
      if (ws[address]) {
        ws[address].s = {
          fill: { fgColor: { rgb: 'E8F4F8' } },
        };
      }
    }

    XLSX.writeFile(wb, filename);
  } catch (error) {
    throw new Error('Failed to download template');
  }
};

/**
 * Shared Utilities for Auto-Formatting
 */
const normalizeActStatus = (status: any) => {
  if (!status) return undefined;
  let s = String(status).trim().toLowerCase();
  if (['active', 'yes', 'y', '1', 'done', 'completed', 'true'].includes(s)) return 'Active';
  if (['inactive', 'no', 'n', '0', 'pending', 'false'].includes(s)) return 'Inactive';
  if (s.includes('closed')) return 'Card Closed';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const buildRemark = (...parts: any[]) => {
  return parts.filter(p => p !== undefined && p !== null && String(p).trim() !== '').join(' | ').trim();
};

const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val;
  }
  let s = String(val).trim();
  if (!s) return null;

  // Try dd-MMM-yy or dd-MMM-yyyy (e.g. 05-Jan-24)
  let m1 = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})/);
  if (m1) {
    let day = m1[1];
    let mon = m1[2];
    let yr = m1[3];
    if (yr.length === 2) yr = '20' + yr;
    let months: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    let index = months[mon.toLowerCase()];
    if (index !== undefined) {
      let d = new Date(parseInt(yr), index, parseInt(day));
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try standard Date parsing
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const formatDate = (d: Date | null) => {
  if (!d) return undefined;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Shared utilities matching GAS helpers
 */
const matchLeadPrefix = (raw: any, prefixes: string[]): string | null => {
  const val = (raw || '').toString().trim();
  const valUp = val.toUpperCase();
  for (const p of prefixes) {
    if (valUp.startsWith(p.toUpperCase())) {
      const leadId = val.substring(p.length).trim();
      if (leadId) return leadId;
    }
  }
  return null;
};

const matchLeadContains = (raw: any, markers: string | string[]): string | null => {
  const val = (raw || '').toString().trim();
  const valUp = val.toUpperCase();
  const list = Array.isArray(markers) ? markers : [markers];
  for (const marker of list) {
    const idx = valUp.indexOf(marker.toUpperCase());
    if (idx !== -1) {
      const leadId = val.substring(idx + marker.length).trim();
      if (leadId) return leadId;
    }
  }
  return null;
};

const stripLeadSuffix = (leadId: string, suffix: string): string => {
  if (leadId.toUpperCase().endsWith(suffix.toUpperCase()))
    return leadId.slice(0, -suffix.length).trim();
  return leadId;
};

const BOB_PREFIXES_WITH_SUBCODE = ['C0079055_935083_', 'FIN001_935083_'];
const BOB_BASE_PREFIXES         = ['C0079055_', 'FIN001_', 'FIN001'];
const BOB_TRAILING_SUFFIXES     = ['_50263'];

const extractBobLeadId = (raw: any): string | null => {
  let leadId = matchLeadPrefix(raw, BOB_PREFIXES_WITH_SUBCODE);
  if (leadId) return leadId;
  leadId = matchLeadPrefix(raw, BOB_BASE_PREFIXES);
  if (!leadId) return null;
  for (const suf of BOB_TRAILING_SUFFIXES) leadId = stripLeadSuffix(leadId, suf);
  return leadId || null;
};

/**
 * DETECTION ENGINE
 */
const detectBank = (headers: string[], dataRows: any[][]): string => {
  const headerSet = new Set(headers.map(h => h.toString().trim()));
  const OUR_PREFIX  = 'C0079055_';
  const FIN_PREFIXES = ['FIN001_', 'FIN001'];
  const matchesOurCode = (val: string) =>
    val.toUpperCase().startsWith(OUR_PREFIX.toUpperCase()) ||
    matchLeadPrefix(val, FIN_PREFIXES) !== null;

  if (headerSet.has('LC1_CODE') || headerSet.has('LC1CODE_1')) return 'HDFC';

  if (headerSet.has('CROSSCELLCODE')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'CROSSCELLCODE');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val) || matchLeadPrefix(val, ['KBSFIN001', 'NRKGV15F_']) !== null) return 'AXIS';
    }
  }

  if (headerSet.has('first_utm_campaign') && headerSet.has('card_issued')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'first_utm_campaign');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val) || matchLeadContains(val, ['FIN001_', 'FIN001']) !== null) return 'SCAPIA';
    }
  }

  if (headerSet.has('first_utm_campaign') && headerSet.has('Pop_Rupay_linked')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'first_utm_campaign');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val) || matchLeadContains(val, ['FIN001_', 'FIN001']) !== null) return 'YESPOP';
    }
  }

  if (headerSet.has('UTM_CAMPAIGN')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'UTM_CAMPAIGN');
    const AU_PREFIX = '989908_C0079055_';
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (val.toUpperCase().startsWith(AU_PREFIX.toUpperCase()) ||
          matchLeadContains(val, ['FIN001_', 'FIN001']) !== null) return 'AU';
    }
  }

  if (headerSet.has('UTM Campaign')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'UTM Campaign');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val) || matchLeadContains(val, ['FIN001_', 'FIN001']) !== null) return 'IDFC_NEW';
    }
  }

  if (headerSet.has('UTM_Partner_AgentCode')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'UTM_Partner_AgentCode');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val)) return 'POONAWALA';
    }
  }

  if (headerSet.has('utm_content')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'utm_content');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (matchesOurCode(val) || matchLeadContains(val, ['FIN001_', 'FIN001']) !== null) return 'INDUSIND';
    }
  }

  if (headerSet.has('Utm Campaign')) {
    const ci = headers.findIndex(h => h.toString().trim() === 'Utm Campaign');
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (!row) continue;
      const val = row[ci] ? row[ci].toString().trim() : '';
      if (extractBobLeadId(val) !== null) return 'BOB';
    }
  }

  return 'UNKNOWN';
};

/**
 * BANK PROCESSORS
 */
const processHDFC = (headers: string[], rows: any[][]): Partial<Lead>[] => {
  const headerSet = new Set(headers.map(h => h.toString().trim()));
  const IS_NEW_FMT = headerSet.has("LC1CODE_1");
  const getColIdx = (name: string) => headers.findIndex(h => h.toString().trim() === name);

  const idx = {
    lc1Code: IS_NEW_FMT ? getColIdx("LC1CODE_1") : getColIdx("LC1_CODE"),
    lc2Code: IS_NEW_FMT ? getColIdx("LC2CODE") : getColIdx("LC2_CODE"),
    custName: IS_NEW_FMT ? getColIdx("FULL_NAME") : (getColIdx("customer_name") !== -1 ? getColIdx("customer_name") : getColIdx("CUSTOMER_NAME")),
    appRefNum: IS_NEW_FMT ? getColIdx("APPL_REF") : getColIdx("APPLICATION_REFERENCE_NUMBER"),
    promoCode: IS_NEW_FMT ? getColIdx("PROMOCODE_NEW") : (getColIdx("PROMO_CODE") !== -1 ? getColIdx("PROMO_CODE") : getColIdx("Promo Code")),
    finalDecision: IS_NEW_FMT ? getColIdx("SETUP_STAT") : getColIdx("FINAL_DECISION"),
    finalDecisionDate: IS_NEW_FMT ? getColIdx("DECISIN_DT") : getColIdx("FINAL_DECISION_DATE"),
    cardActStatus: IS_NEW_FMT ? getColIdx("Activation") : getColIdx("Card Activation Staus"),
    custType: IS_NEW_FMT ? getColIdx("SEG_ID") : getColIdx("CUSTOMER_TYPE"),
    productDes: IS_NEW_FMT ? getColIdx("PRODUCT_DESC") : getColIdx("Product Des"),
    declineDesc: IS_NEW_FMT ? getColIdx("DECLINE_DESCRIPTION") : getColIdx("Decline Descreption"),
    declineType: IS_NEW_FMT ? getColIdx("DECLINE_CATEGORY") : getColIdx("Decline Type"),
    declineDescUpper: IS_NEW_FMT ? -1 : getColIdx("DECLINE_DESCRIPTION"),
    kycCompDate: getColIdx("KYC Completion date"),
    vkycConsent: getColIdx("VKYC_CONSENT_DATE"),
    kycSuccess: getColIdx("KYC Success/NR"),
    bkycStatus: getColIdx("BKYC Status"),
    ipaStatus: getColIdx("IPA_STATUS"),
    dapFinalFlag: getColIdx("DAP_FINAL_FLAG"),
    currentStage: getColIdx("CURRENT_STAGE"),
    creationDate: getColIdx("Creation Date"),
  };

  const VALID_LC1 = new Set(["CCPLFNC101", "SSFNI0605"]);
  const FIN_REGEX = /^FIN(\d{1,3})$/i;
  const isOurLead = (lc1Raw: string, lc2Raw: string) => {
    const lc1 = lc1Raw.toUpperCase().trim();
    const lc2 = lc2Raw.toUpperCase().trim();
    if (VALID_LC1.has(lc1)) return true;
    if (lc1 === "XRKD") {
      const m = lc2.match(FIN_REGEX);
      if (m) {
        const num = parseInt(m[1], 10);
        return num >= 1 && num <= 999;
      }
    }
    return false;
  };

  const isTxnActiveBasic = (n: string) => n === "TXNACTIVE";
  const isTxnActiveRs100 = (n: string) => n === "TXNACTIVERS100";
  const isVPlusActive = (n: string) => n === "V+ACTIVE";

  const normalizeDecision = (raw: string) => {
    const u = raw.toUpperCase().trim();
    if (IS_NEW_FMT) {
      if (u === "A") return "APPROVE";
      if (u === "D") return "DECLINE";
      return u;
    }
    return u;
  };

  const resolveCustType = (cTypeRaw: string, pCodeRaw: string) => {
    const cType = cTypeRaw.toUpperCase().trim();
    const pCode = pCodeRaw.toUpperCase().trim();
    if (IS_NEW_FMT) {
      if (cType === "NDB" || cType === "OPM") return "NTB";
      if (cType === "WL") return "ETB";
      return cType;
    }
    if (cType === "NTB") return "NTB";
    else if (cType === "WL") return "ETB";
    else if (cType === "NDB") return (pCode === "SI" || pCode === "RI") ? "ETB" : "NTB";
    return "";
  };

  const normActStatus = (val: any) =>
    val ? String(val).toUpperCase().replace(/[\s_\-]+/g, "") : "";

  const buildR = (...parts: any[]) =>
    parts.filter(p => p && String(p).trim() !== "").join(" // ");

  const fmtDate = (date: any) => {
    if (!date) return undefined;
    const d = new Date(date);
    if (isNaN(d.getTime())) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let processedData: Partial<Lead>[] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? row[i].toString().trim() : "";

    if (!isOurLead(getVal(idx.lc1Code), getVal(idx.lc2Code))) continue;

    let output: Partial<Lead> = {
      lead_id: getVal(idx.lc2Code),
      applicant_name: getVal(idx.custName),
      card_variant: getVal(idx.productDes),
      application_no: getVal(idx.appRefNum),
      vkyc_status: undefined,
      bkyc_status: undefined,
      status: "In_Process",
      remark: "",
      card_issued_date: undefined,
      cust_type: resolveCustType(getVal(idx.custType), getVal(idx.promoCode)) || undefined,
      activation_status: undefined,
      created_at: idx.creationDate !== -1 ? formatDate(parseDate(row[idx.creationDate])) : undefined,
    };

    if (!IS_NEW_FMT) {
      const kycDate = getVal(idx.kycCompDate).toUpperCase();
      const vkycConsent = getVal(idx.vkycConsent).toUpperCase();
      const kycSuccess = getVal(idx.kycSuccess).toUpperCase();
      const bkycStatusOrig = getVal(idx.bkycStatus).toUpperCase();
      const isVkycElig = ["VKYC", "SVKYC", "IDCOM"].includes(vkycConsent);
      const kycBlank = kycDate === "" || kycDate === "BLANK";

      if (kycBlank && isVkycElig) output.vkyc_status = "PENDING";
      if (kycBlank && vkycConsent === "BIOKYC") output.bkyc_status = "PENDING";
      if (kycSuccess === "YES" && bkycStatusOrig === "COMPLETED") output.bkyc_status = "COMPLETED";
      if (kycSuccess === "YES" && isVkycElig && bkycStatusOrig !== "COMPLETED") output.vkyc_status = "COMPLETED";
    }

    const finalDecRaw = getVal(idx.finalDecision);
    const finalDec = normalizeDecision(finalDecRaw);

    if (finalDec === "APPROVE") {
      output.status = "Approved";
      output.remark = "CARD ISSUED";
      const rawDate = idx.finalDecisionDate !== -1 ? row[idx.finalDecisionDate] : "";
      if (rawDate) {
        output.card_issued_date = fmtDate(rawDate);
      }
    } else if (finalDec === "DECLINE") {
      output.status = "Rejected";
      output.remark = buildR(getVal(idx.declineDesc), getVal(idx.declineType), getVal(idx.declineDescUpper));
    } else if (!IS_NEW_FMT && finalDec === "INPROCESS") {
      const ipaStat = getVal(idx.ipaStatus).toUpperCase();
      if (ipaStat === "APPROVE") {
        output.status = "In_Process";
        output.remark = getVal(idx.currentStage);
      } else if (ipaStat === "DECLINE") {
        output.status = "Rejected";
        output.remark = "IPA DECLINED";
      }
    } else if (IS_NEW_FMT && finalDec !== "APPROVE" && finalDec !== "DECLINE") {
      output.status = "In_Process";
      output.remark = finalDecRaw;
    }

    if (output.status === "Approved") {
      const rawAct = getVal(idx.cardActStatus);
      const norm = normActStatus(rawAct);
      if (rawAct === "" || norm === "INACTIVE" || norm === "#N/A") {
        output.activation_status = "Inactive";
        output.remark = "PENDING FOR ACTIVATION";
      } else if (norm === "CARDCLOSED") {
        output.activation_status = "Card Closed";
        output.remark = "CARD CLOSED DUE TO INACTIVE";
      } else if (isTxnActiveRs100(norm)) {
        output.activation_status = "Active";
        output.remark = "Txn_Active - Rs 100";
      } else if (isVPlusActive(norm)) {
        output.activation_status = "Inactive";
        output.remark = "CARD RBI ACTIVE ONLY // PENDING FOR RS.100 TXN ACTIVATION";
      } else if (isTxnActiveBasic(norm)) {
        output.activation_status = "Inactive";
        output.remark = "CARD TXN ACTIVE ONLY // PENDING FOR RS.100 TXN ACTIVATION";
      } else if (['ACTIVE', 'YES', 'Y', '1', 'DONE', 'COMPLETED', 'TRUE'].includes(norm)) {
        output.activation_status = "Active";
      }
    }
    processedData.push(output);
  }
  return processedData;
};

const processIDFC = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getCol = (name: string) => headers.indexOf(name);
  let idCol = getCol('Req_Id');
  let nameCol = getCol('Customer_Name');
  let vkycCol = getCol('VKYC_Status');
  let appCol = getCol('App_No');
  let productCol = getCol('Product_Name');
  let apprStatusCol = getCol('Approval_Status');
  let currStatusCol = getCol('Current_Status');
  let rejReasonCol = getCol('RejectReason');

  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    let reqId = row[idCol];
    if (!reqId) continue;
    reqId = String(reqId).trim();
    if (reqId === '') continue;

    let vkyc = String(row[vkycCol] || '').trim().toUpperCase();
    if (vkyc === 'PASSED' || vkyc === 'COMPLETED') vkyc = 'COMPLETED';

    let apprStat = String(row[apprStatusCol] || '').trim().toUpperCase();
    let currStat = String(row[currStatusCol] || '').trim().toUpperCase();
    let status = 'In_Process';

    if (apprStat === 'APPROVED') status = 'Approved';
    else if (currStat.includes('REJECT') || apprStat === 'REJECTED') status = 'Rejected';

    let remark = buildRemark(
      row[currStatusCol] ? `Current: ${row[currStatusCol]}` : null,
      row[rejReasonCol] ? `Reject Reason: ${row[rejReasonCol]}` : null
    );

    leads.push({
      lead_id: reqId,
      applicant_name: row[nameCol] ? String(row[nameCol]) : '',
      status: status,
      remark: remark,
      application_no: row[appCol] ? String(row[appCol]) : undefined,
      card_variant: row[productCol] ? String(row[productCol]) : undefined,
      vkyc_status: vkyc || undefined,
    });
  }
  return leads;
};

const processIDFCNew = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getCol = (name: string) => headers.indexOf(name);

  const idx = {
    utmCampaign:      getCol('UTM Campaign'),
    appRefNo:         getCol('Application Ref. No.'),
    applicantName:    getCol('Applicant: Applicant Name'),
    cardVariant:      getCol('Choice of Credit Card'),
    journeyType:      getCol('Journey Type'),
    stage:            getCol('Stage'),
    subStage:         getCol('Sub Stage'),
    stageByIntStatus: getCol('Stage by Integration Status'),
    softDecision:     getCol('Soft Decision'),
    lastModifiedDate: getCol('Last Modified Date'),
    campaignName:     getCol('Campaign Name'),
    cancelRejReason:  getCol('Cancellation/Rejection Reason'),
    fiCuringReason:   getCol('FI Curing Reason'),
  };

  const PREFIXES = ['C0079055_', 'FIN001_', 'FIN001'];
  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;

    const getVal = (i: number) => (i !== -1 && row[i] !== undefined && row[i] !== null) ? String(row[i]).trim() : '';

    const utmCampaign = getVal(idx.utmCampaign);
    const leadId = matchLeadPrefix(utmCampaign, PREFIXES) || matchLeadContains(utmCampaign, ['FIN001_', 'FIN001']);
    if (!leadId) continue;

    const stageUpper     = getVal(idx.stage).toUpperCase().trim();
    const softDec        = getVal(idx.softDecision).toUpperCase().trim();
    const subStage       = getVal(idx.subStage);
    const stageByInt     = getVal(idx.stageByIntStatus);
    const campaignName   = getVal(idx.campaignName);
    const cancelReason   = getVal(idx.cancelRejReason);
    const fiCuringReason = getVal(idx.fiCuringReason);
    const journeyTypeRaw = getVal(idx.journeyType);
    const custType       = journeyTypeRaw.toUpperCase().trim() === 'ETB AS IS' ? 'ETB' : journeyTypeRaw;

    let status = 'In_Process';
    let remark = '';
    let vkycStatus = '';
    let cardIssuedDate = '';

    if (softDec === 'REJECTED') {
      status = 'Rejected';
      remark = 'IPA DECLINED';
    } else if (softDec === 'APPROVED' && stageUpper === 'APPROVED') {
      status = 'Approved';
      remark = buildRemark(subStage, stageByInt, campaignName);
      const rawDate = idx.lastModifiedDate !== -1 ? row[idx.lastModifiedDate] : '';
      const d = parseDate(rawDate);
      if (d) cardIssuedDate = formatDate(d) || '';
    } else if (softDec === 'APPROVED') {
      if (stageUpper === 'CANCELLED') {
        status = 'Rejected';
        remark = buildRemark(subStage, stageByInt, cancelReason);
      } else if (stageUpper === 'DDE' || stageUpper === 'EKYC' || stageUpper === 'UNDERWRITING') {
        status = 'In_Process';
        remark = buildRemark(subStage, stageByInt);
      } else if (stageUpper === 'FI CURING') {
        status = 'In_Process';
        remark = buildRemark(subStage, stageByInt, fiCuringReason, cancelReason);
      } else if (stageUpper === 'REJECTED') {
        status = 'Rejected';
        remark = buildRemark(subStage, stageByInt, cancelReason);
      } else if (stageUpper === 'VERIFICATIONS') {
        status = 'In_Process';
        remark = buildRemark(subStage, stageByInt);
        vkycStatus = 'COMPLETED';
      } else if (stageUpper === 'VKYC') {
        status = 'In_Process';
        remark = buildRemark(subStage, stageByInt);
        vkycStatus = 'PENDING';
      }
    }

    leads.push({
      lead_id: leadId,
      applicant_name: getVal(idx.applicantName),
      card_variant: getVal(idx.cardVariant),
      application_no: getVal(idx.appRefNo),
      cust_type: custType,
      vkyc_status: vkycStatus || undefined,
      status,
      remark,
      card_issued_date: cardIssuedDate || undefined,
    });
  }
  return leads;
};

const processAU = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getCol = (name: string) => headers.indexOf(name);

  const idx = {
    utmCampaign:      getCol("UTM_CAMPAIGN"),
    currentStatus:    getCol("CURRENT_STATUS"),
    rejectReason:     getCol("REJECT_REASON"),
    leadId:           getCol("LEAD_ID"),
    customerType:     getCol("CUSTOMER_TYPE"),
    cardVariant:      getCol("PRODUCT_DETAILS_CREDIT_CARD_VARIENT"),
    vkycStatus:       getCol("VKYC_STATUS"),
    cardCreationDate: getCol("CARD_CREATION_REQUEST_DATE"),
    applicantName:    getCol("APPLICANT_NAME") !== -1 ? getCol("APPLICANT_NAME") : getCol("CUSTOMER_NAME"),
  };

  const AU_PREFIX = "989908_C0079055_";
  const AU_SUFFIXES = ["-sms-campaign", "_50263"];

  const normalizeVkyc = (raw: string): string | undefined => {
    const u = raw.toUpperCase().trim();
    if (u === "VKYC APPROVED") return "COMPLETED";
    if (u === "VKYC PENDING") return "PENDING";
    if (u === "VKYC REJECTED") return "REJECTED";
    return raw || undefined;
  };

  const resolveStatus = (currentStatus: string, rejectReason: string) => {
    const cs = currentStatus.toUpperCase().trim();
    const rr = rejectReason.trim();
    const declined = (remark: string) => ({ status: "Rejected" as const, remark, activationStatus: "" as const, useCardDate: false as const });
    const inProc = (remark: string) => ({ status: "In_Process" as const, remark, activationStatus: "" as const, useCardDate: false as const });
    switch (cs) {
      case "AML REJECTED CASE":
      case "BRE DECLINE CASE":
      case "BUREAU DECLINE CASE":
      case "CREDIT REJECT CASE":
      case "DVU REJECT CASE":
      case "PAN AADHAAR CHECK REJECT":
      case "REJECTED CASE":
        return declined(buildRemark(cs, rr));
      case "DISBURSED":
        return { status: "Approved" as const, remark: cs, activationStatus: "Active" as const, useCardDate: true as const };
      case "CPV CASES":
      case "CREDIT UW-A0":
      case "CREDIT UW-A1":
      case "PENDING FOR VKYC":
        return inProc(cs);
      case "DVU-EXCEPTION QUEUE":
      case "REJECT FOR CURING":
        return inProc(buildRemark(cs, rr));
      case "PENDING FOR SUBMISSION":
      case "PENDING FOR SUBMISSION-FD PAYMENT":
        return inProc(buildRemark("PENDING APPLICATION", cs, rr));
      case "RCU CURRING QUEUE":
      case "RCU MISMATCH QUEUE":
      case "RCU NEGATIVE QUEUE":
      case "RCU SAMPLER INITIATION QUEUE":
      case "RCU VERIFIER QUEUE":
        return inProc(buildRemark(cs, rr));
      default:
        return { status: "" as const, remark: cs, activationStatus: "" as const, useCardDate: false as const };
    }
  };

  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "";

    const utmRaw = getVal(idx.utmCampaign);
    let leadId: string | null = null;
    if (utmRaw.toUpperCase().startsWith(AU_PREFIX.toUpperCase())) {
      leadId = utmRaw.substring(AU_PREFIX.length).trim();
    } else {
      leadId = matchLeadContains(utmRaw, "FIN001_");
    }
    if (!leadId) continue;
    for (const suf of AU_SUFFIXES) leadId = stripLeadSuffix(leadId, suf);
    leadId = leadId.trim();
    if (!leadId) continue;

    const resolved = resolveStatus(getVal(idx.currentStatus), getVal(idx.rejectReason));

    let cardIssuedDate: string | undefined = undefined;
    if (resolved.useCardDate && idx.cardCreationDate !== -1) {
      const d = parseDate(row[idx.cardCreationDate]);
      if (d) cardIssuedDate = formatDate(d) || undefined;
    }

    leads.push({
      lead_id: leadId,
      applicant_name: getVal(idx.applicantName) || undefined,
      card_variant: getVal(idx.cardVariant) || undefined,
      application_no: getVal(idx.leadId) || undefined,
      cust_type: getVal(idx.customerType) || undefined,
      vkyc_status: normalizeVkyc(getVal(idx.vkycStatus)),
      status: resolved.status || undefined,
      remark: resolved.remark || undefined,
      card_issued_date: cardIssuedDate,
      activation_status: resolved.activationStatus || undefined,
    });
  }
  return leads;
};

const processAXIS = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getCol = (name: string) => headers.indexOf(name);

  const idx = {
    crosscellCode:   getCol("CROSSCELLCODE"),
    appId:           getCol("Applications id"),
    custName:        getCol("Name"),
    cardType:        getCol("CARD TYPE"),
    etcc:            getCol("ETCC"),
    ipaStatus:       getCol("IPA Status"),
    adStatus:        getCol("A/D STATUS"),
    blazeOutput:     getCol("BLAZE_OUTPUT"),
    finalStatus:     getCol("FINAL STATUS"),
    reason:          getCol("REASON"),
    vkycStatus:      getCol("vkyc Status"),
    vkycPkyv:        getCol("Vkyc/Pkyv"),
    feedbackRemarks: getCol("FEEDBACK - FREE FLOW REMARKS"),
    occupation:      getCol("Occupation"),
    uwDecision:      getCol("UNDERWRITING_DECISION"),
  };

  // Find "Date" column AFTER "A/D STATUS" (for card issued date)
  let cardDateColIdx = -1;
  for (let c = idx.adStatus + 1; c < headers.length; c++) {
    if (headers[c].toString().trim() === "Date") {
      cardDateColIdx = c;
      break;
    }
  }

  const AXIS_PREFIXES = ["C0079055_", "FIN001_", "FIN001", "KBSFIN001", "NRKGV15F_"];

  const normalizeVkyc = (vkycRaw: string, vkycPkyvRaw: string): string | undefined => {
    const v = vkycRaw.toUpperCase().trim();
    const p = vkycPkyvRaw.toUpperCase().trim();
    if (v === "HARD_REJECT") return "REJECTED";
    if (v === "HARD_ACCEPT" || v === "SOFT_ACCEPT") return "COMPLETED";
    if ((v === "0" || v === "") && p === "VKYC") return "COMPLETED";
    return undefined;
  };

  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "";

    const crossCell = getVal(idx.crosscellCode);
    const leadId = matchLeadPrefix(crossCell, AXIS_PREFIXES);
    if (!leadId) continue;

    const ipaStatusRaw = getVal(idx.ipaStatus);
    const ipaUpper = ipaStatusRaw.toUpperCase().trim();
    const adStatusRaw = getVal(idx.adStatus);
    const adUpper = adStatusRaw.toUpperCase().trim();
    const blazeOutput = getVal(idx.blazeOutput);
    const finalStatus = getVal(idx.finalStatus);
    const reason = getVal(idx.reason);
    const vkycRaw = getVal(idx.vkycStatus);
    const vkycPkyvRaw = getVal(idx.vkycPkyv);
    const feedbackRem = getVal(idx.feedbackRemarks);
    const occupation = getVal(idx.occupation);
    const uwDecision = getVal(idx.uwDecision);

    let status = '';
    let remark = '';
    let cardIssuedDate: string | undefined = undefined;
    let activationStatus: string | undefined = undefined;

    if (ipaUpper === "IPA REJECTED") {
      status = "Rejected";
      remark = ipaStatusRaw;
    } else if (adUpper === "APPROVED") {
      status = "Approved";
      remark = finalStatus;
      activationStatus = "Active";
      if (cardDateColIdx !== -1) {
        const d = parseDate(row[cardDateColIdx]);
        if (d) cardIssuedDate = formatDate(d);
      }
    } else if (adUpper === "DECLINED") {
      status = "Rejected";
      remark = buildRemark(finalStatus, reason, uwDecision);
    } else if ((adUpper === "0" || adUpper === "") && ipaUpper === "IPA APPROVED") {
      status = "In_Process";
      remark = buildRemark(blazeOutput, finalStatus, vkycRaw, feedbackRem, occupation);
    }

    leads.push({
      lead_id: leadId,
      applicant_name: getVal(idx.custName) || undefined,
      card_variant: getVal(idx.cardType) || undefined,
      application_no: getVal(idx.appId) || undefined,
      cust_type: getVal(idx.etcc) || undefined,
      vkyc_status: normalizeVkyc(vkycRaw, vkycPkyvRaw),
      status: status || undefined,
      remark: remark || undefined,
      card_issued_date: cardIssuedDate,
      activation_status: activationStatus,
    });
  }
  return leads;
};

const processYESPOP = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getColIdx = (name: string) => headers.indexOf(name);
  const idx = {
    utmCampaign:    getColIdx("first_utm_campaign"),
    firstName:      getColIdx("first_name"),
    lastName:       getColIdx("last_name"),
    cardStatus:     getColIdx("card_status"),
    decisionDate:   getColIdx("Decision Date"),
    arn:            getColIdx("ARN"),
    pcb:            getColIdx("PCB"),
    vkycProcess:    getColIdx("vkycProcessStatus"),
    currentStage:   getColIdx("current stage"),
    ekycProcess:    getColIdx("ekycProcessStatus"),
    declineReason:  getColIdx("failure /decline Reason"),
    popRupayLinked: getColIdx("Pop_Rupay_linked"),
    isTransacted:   getColIdx("Is_Transacted"),
    firstTrnxDate:  getColIdx("first_trnx_date"),
  };
  const PREFIXES = ["C0079055_", "FIN001_", "FIN001"];
  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) =>
      i !== -1 && row[i] !== undefined && row[i] !== null ? row[i].toString().trim() : "";
      
    const utmCampaign = getVal(idx.utmCampaign);
    const leadId = matchLeadPrefix(utmCampaign, PREFIXES) || matchLeadContains(utmCampaign, ["FIN001_", "FIN001"]);
    if (!leadId) continue;
    
    const firstName      = getVal(idx.firstName);
    const lastName       = getVal(idx.lastName);
    const customerName   = [firstName, lastName].filter(Boolean).join(" ");
    
    const cardStatusRaw  = getVal(idx.cardStatus);
    const cardStatusUp   = cardStatusRaw.toUpperCase().trim();
    
    const vkycProcessRaw = getVal(idx.vkycProcess);
    const vkycProcessUp  = vkycProcessRaw.toUpperCase().trim();
    
    const currentStage   = getVal(idx.currentStage);
    const ekycProcess    = getVal(idx.ekycProcess);
    const declineReason  = getVal(idx.declineReason);
    const popLinkedRaw   = getVal(idx.popRupayLinked).toUpperCase().trim();
    const isTransacted   = getVal(idx.isTransacted).toUpperCase().trim();
    
    // ── VKYC Status ───────────────────────────────────────────────────────────
    let vkycStatus: string | undefined = undefined;
    if (vkycProcessUp === "AUDITORAPPROVED") vkycStatus = "COMPLETED";
    else if (vkycProcessUp === "AGENTREOPEN" || vkycProcessUp === "AUDITORREOPEN" || vkycProcessUp === "LINKGENERATED") vkycStatus = "PENDING";
    
    // ── Card Issued Date ──────────────────────────────────────────────────────
    let cardIssuedDate: string | undefined = undefined;
    if (cardStatusUp === "APPROVED" || cardStatusUp === "ACTIVATED") {
      const d = parseDate(idx.decisionDate !== -1 ? row[idx.decisionDate] : "");
      if (d) cardIssuedDate = formatDate(d);
    }
    
    let output: Partial<Lead> = {
      lead_id:            leadId,
      applicant_name:     customerName,
      card_variant:       getVal(idx.pcb),
      application_no:     getVal(idx.arn),
      cust_type:          "NTB",
      vkyc_status:        vkycStatus,
      status:             "In_Process",
      remark:             "",
      card_issued_date:   cardIssuedDate,
      activation_status:  undefined,
    };
    
    // ── Activation sub-logic ─────────────────────────────────────────────────
    const applyActivation = (baseRemark: string) => {
      const decisionD  = parseDate(idx.decisionDate  !== -1 ? row[idx.decisionDate]  : "");
      const firstTrnxD = parseDate(idx.firstTrnxDate !== -1 ? row[idx.firstTrnxDate] : "");
      
      if (popLinkedRaw === "LINKED" && isTransacted === "YES") {
        if (decisionD && firstTrnxD) {
          const gap = Math.abs(Math.round((firstTrnxD.getTime() - decisionD.getTime()) / (1000 * 60 * 60 * 24)));
          if (gap <= 60) {
            output.activation_status = "Active";
            output.remark            = buildRemark(baseRemark, "CARD ISSUED");
          } else {
            output.status            = "Rejected";
            output.activation_status = "Active";
            output.remark            = buildRemark(baseRemark, "NOT ELIGIBLE FOR PAYOUT, CARD ACTIVATED AFTER 60 DAYS");
          }
        } else {
          output.activation_status = "Active";
          output.remark            = buildRemark(baseRemark, "CARD ISSUED");
        }
      } else if (popLinkedRaw === "NOT LINKED") {
        output.activation_status = "Inactive";
        output.remark            = buildRemark(baseRemark, "Pop_Rupay_linked = Not Linked");
      } else if (popLinkedRaw === "LINKED" && isTransacted === "NO") {
        output.activation_status = "Inactive";
        output.remark            = buildRemark(baseRemark, "Pop_Rupay_linked = LINKED, BUT TRANSACTION INACTIVE");
      }
    };
    
    // ── Status Logic ──────────────────────────────────────────────────────────
    if (cardStatusUp === "APPROVED") {
      output.status = "Approved";
      applyActivation("");
    } else if (cardStatusUp === "DECLINED") {
      output.status = "Rejected";
      output.remark = declineReason;
    } else if (cardStatusUp === "WIP" || cardStatusUp === "STARTED") {
      output.status = "In_Process";
      output.remark = buildRemark(currentStage, ekycProcess, vkycProcessRaw);
    } else if (cardStatusUp === "ACTIVATED") {
      output.status = "Approved";
      applyActivation("RBI ACTIVE");
    }
    
    leads.push(output);
  }
  return leads;
};

const processSCAPIA = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const headerSet = new Set(headers.map(h => h.toString().trim()));
  const hasNewColumns = headerSet.has('first_utm_campaign');

  if (hasNewColumns) {
    const getColIdx = (name: string) => headers.indexOf(name);
    const idx = {
      utmCampaign:       getColIdx('first_utm_campaign'),
      userId:            getColIdx('user_id'),
      cardIssued:        getColIdx('card_issued'),
      cardIssuedTime:    getColIdx('card_issued_time'),
      currentStatus:     getColIdx('current_status'),
      vkycCompleted:     getColIdx('vkyc_completed'),
      breRejection:      getColIdx('bre_rejection'),
      preCheckRejection: getColIdx('pre_check_rejection'),
      note:              getColIdx('Note'),
    };
    const PREFIXES     = ['C0079055_', 'FIN001_', 'FIN001'];
    const SCAPIA_SUFFIX = '_content=travel&utm_term=card';
    const leads: Partial<Lead>[] = [];

    for (const row of rawData) {
      if (!row || row.length === 0) continue;
      const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';

      const utmCampaign = getVal(idx.utmCampaign);
      let leadId = matchLeadPrefix(utmCampaign, PREFIXES) || matchLeadContains(utmCampaign, ['FIN001_', 'FIN001']);
      if (!leadId) continue;
      leadId = stripLeadSuffix(leadId, SCAPIA_SUFFIX);
      if (!leadId) continue;

      const cardIssuedRaw    = getVal(idx.cardIssued).toUpperCase().trim();
      const currentStatusRaw = getVal(idx.currentStatus);
      const currentStatusUp  = currentStatusRaw.toUpperCase().trim();
      const vkycCompletedRaw = getVal(idx.vkycCompleted).trim();
      const breRejection     = getVal(idx.breRejection).trim();
      const preCheckRejection = getVal(idx.preCheckRejection).trim();
      const noteVal          = getVal(idx.note);

      let vkycStatus: string | undefined = undefined;
      if (vkycCompletedRaw === '0') vkycStatus = 'PENDING';
      else if (vkycCompletedRaw === '1') vkycStatus = 'COMPLETED';

      let cardIssuedDate: string | undefined = undefined;
      if (cardIssuedRaw === 'ISSUED' && idx.cardIssuedTime !== -1) {
        const d = parseDate(row[idx.cardIssuedTime]);
        if (d) cardIssuedDate = formatDate(d);
      }

      let output: Partial<Lead> = {
        lead_id:            leadId,
        applicant_name:     '',
        card_variant:       'SCAPIA',
        application_no:     getVal(idx.userId),
        cust_type:          'NTB',
        vkyc_status:        vkycStatus,
        status:             'In_Process',
        remark:             '',
        card_issued_date:   cardIssuedDate,
        activation_status:  undefined,
      };

      if (cardIssuedRaw === 'ISSUED') {
        output.status = 'Approved';
        output.remark = buildRemark('CARD ISSUED', noteVal);
      } else if (breRejection === '1') {
        output.status = 'Rejected';
        output.remark = buildRemark('BRE REJECT', noteVal);
      } else if (preCheckRejection === '1') {
        output.status = 'Rejected';
        output.remark = buildRemark('PRE CHECK REJECT', noteVal);
      } else if (currentStatusUp === 'REJECTED' || currentStatusUp === 'DISCARDED') {
        output.status = 'Rejected';
        output.remark = buildRemark(currentStatusRaw, noteVal);
      } else if (currentStatusUp === 'IN_PROGRESS') {
        output.status = 'In_Process';
        output.remark = buildRemark(currentStatusRaw, noteVal);
      }

      leads.push(output);
    }
    return leads;
  }

  // OLD row-scanning fallback
  const leads: Partial<Lead>[] = [];
  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    let leadCol = -1;
    for (let c = 0; c < row.length; c++) {
      if (row[c] && String(row[c]).includes('C0079055_')) {
        leadCol = c;
        break;
      }
    }
    if (leadCol === -1) continue;

    let rawLeadId = String(row[leadCol]).trim();
    let actualLeadId = rawLeadId.replace('C0079055_', '');

    let stateCol = -1;
    for (let c = 0; c < row.length; c++) {
      let cell = String(row[c] || '').trim().toUpperCase();
      if (['IN_PROGRESS', 'ACTIVE', 'ABANDONED', 'REJECTED', 'VKYC_COMPLETED', 'APPROVED'].includes(cell)) {
        stateCol = c;
        break;
      }
    }

    let rawStat = stateCol !== -1 ? String(row[stateCol]).trim().toUpperCase() : '';
    let status: string = 'In_Process';
    if (rawStat === 'ACTIVE' || rawStat === 'APPROVED') status = 'Approved';
    else if (rawStat === 'REJECTED' || rawStat === 'ABANDONED') status = 'Rejected';

    leads.push({
      lead_id: actualLeadId,
      status,
      remark: rawStat ? `Scapia State: ${rawStat}` : '',
      card_variant: 'Scapia Card',
    });
  }
  return leads;
};

const processPOONAWALA = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getColIdx = (name: string) => headers.indexOf(name);
  const idx = {
    agentCode:      getColIdx('UTM_Partner_AgentCode'),
    appIdCrm:       getColIdx('Application_ID_CRM_Application_ID'),
    loanStatus:     getColIdx('Loan_Status'),
    loanAmount:     getColIdx('Loan_Amount'),
    loanScheme:     getColIdx('Loan_Details_Scheme'),
    disbursalDate:  getColIdx('Disbursal_Date'),
    loanAcctNumber: getColIdx('Loan_Account_Number'),
    substage:       getColIdx('Third_Party_Data_Partner_Substage'),
    breSegment:     getColIdx('BRE_Segement'),
  };
  const PREFIXES = ['C0079055_', 'FIN001_', 'FIN001'];
  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';

    const agentCode = getVal(idx.agentCode);
    const leadId = matchLeadPrefix(agentCode, PREFIXES);
    if (!leadId) continue;

    const loanStatusRaw = getVal(idx.loanStatus);
    const loanStatusUp  = loanStatusRaw.toUpperCase().trim();
    const substage      = getVal(idx.substage);
    const breSegment    = getVal(idx.breSegment);
    const loanAcctNumber = getVal(idx.loanAcctNumber);
    const appIdCrm      = getVal(idx.appIdCrm);

    let output: Partial<Lead> = {
      lead_id:            leadId,
      applicant_name:     '',
      card_variant:       getVal(idx.loanScheme),
      application_no:     loanAcctNumber || appIdCrm,
      cust_type:          'NTB',
      vkyc_status:        undefined,
      status:             'In_Process',
      remark:             '',
      card_issued_date:   undefined,
      activation_status:  undefined,
    };

    if (loanStatusUp === 'DISBURSEMENT') {
      output.status = 'Approved';
      output.remark = buildRemark('CASE DISBURSED', substage, breSegment);
      output.activation_status = 'Active';
      const d = parseDate(idx.disbursalDate !== -1 ? row[idx.disbursalDate] : '');
      if (d) output.card_issued_date = formatDate(d);
    } else if (loanStatusUp === 'CREDIT_APPROVAL') {
      output.status = 'Approved';
      output.remark = buildRemark('CREDIT APPROVED', substage, breSegment);
    } else if (loanStatusUp === 'REJECTED' || loanStatusUp === 'SYSTEM REJECT') {
      output.status = 'Rejected';
      output.remark = buildRemark(loanStatusRaw, substage, breSegment);
    } else if (loanStatusUp === 'DROP OFF REJECTED NI') {
      output.status = 'Rejected';
      output.remark = buildRemark('DROP OFF REJECTED - NOT INTERESTED', substage, breSegment);
    } else if (loanStatusUp === 'DROP OFF') {
      output.status = 'In_Process';
      output.remark = buildRemark('DROP OFF', substage, breSegment);
    } else {
      output.status = 'In_Process';
      output.remark = buildRemark(loanStatusRaw, substage, breSegment);
    }

    leads.push(output);
  }
  return leads;
};

const processINDUSIND = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getColIdx = (name: string) => headers.indexOf(name);
  const idx = {
    utmContent:      getColIdx('utm_content'),
    applicationId:   getColIdx('Application_Id'),
    applicantName:   getColIdx('Applicant_Name'),
    customerCat:     getColIdx('Customer_Category'),
    cardType:        getColIdx('Card_Type'),
    status:          getColIdx('Status'),
    subStatus:       getColIdx('Sub_Status'),
    vkycStatus:      getColIdx('Vkyc_Status'),
    dropOffScreen:   getColIdx('Drop_Off_screen'),
    workflowStatus:  getColIdx('Workflow_Status'),
    stage:           getColIdx('Stage'),
    cardIssualDate:  getColIdx('CardIssualDate'),
  };
  const PREFIXES = ['C0079055_', 'FIN001_', 'FIN001'];

  const normalizeVkyc = (raw: string): string | undefined => {
    const u = raw.toUpperCase().trim();
    if (u === 'AUDITOR APPROVED') return 'COMPLETED';
    if (u === 'AGENT INITIATION') return 'PENDING';
    if (u === 'UNABLE') return 'REJECTED';
    return undefined;
  };

  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';

    const utmContent = getVal(idx.utmContent);
    const leadId = matchLeadPrefix(utmContent, PREFIXES) || matchLeadContains(utmContent, ['FIN001_', 'FIN001']);
    if (!leadId) continue;

    const statusRaw = getVal(idx.status);
    const statusUp  = statusRaw.toUpperCase().trim();
    const stageRaw  = getVal(idx.stage);
    const stageUp   = stageRaw.toUpperCase().trim();
    const subStatus = getVal(idx.subStatus);
    const dropOffScreen = getVal(idx.dropOffScreen);
    const workflowStatus = getVal(idx.workflowStatus);

    let output: Partial<Lead> = {
      lead_id:            leadId,
      applicant_name:     getVal(idx.applicantName),
      card_variant:       getVal(idx.cardType),
      application_no:     getVal(idx.applicationId),
      cust_type:          getVal(idx.customerCat),
      vkyc_status:        normalizeVkyc(getVal(idx.vkycStatus)),
      status:             'In_Process',
      remark:             '',
      card_issued_date:   undefined,
      activation_status:  undefined,
    };

    if (statusUp === 'REJECTED') {
      output.status = 'Rejected';
      output.remark = buildRemark(stageRaw, subStatus);
    } else if (stageUp === 'APPROVED') {
      output.status = 'Approved';
      output.remark = workflowStatus;
      const d = parseDate(idx.cardIssualDate !== -1 ? row[idx.cardIssualDate] : '');
      if (d) output.card_issued_date = formatDate(d);
    } else {
      output.status = 'In_Process';
      output.remark = buildRemark(stageRaw, subStatus, dropOffScreen);
    }

    leads.push(output);
  }
  return leads;
};

const processBOB = (headers: string[], rawData: any[][]): Partial<Lead>[] => {
  const getColIdx = (name: string) => headers.indexOf(name);
  const idx = {
    utmCampaign:    getColIdx('Utm Campaign'),
    applicationId:  getColIdx('Application Id'),
    name:           getColIdx('Name'),
    appStatus:      getColIdx('Application Status'),
    stage:          getColIdx('Stage'),
    createdDate:    getColIdx('Created Date'),
    cardVariant:    getColIdx('Selected Card Variant'),
  };
  const leads: Partial<Lead>[] = [];

  for (const row of rawData) {
    if (!row || row.length === 0) continue;
    const getVal = (i: number) => i !== -1 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '';

    const utmCampaign = getVal(idx.utmCampaign);
    const leadId = extractBobLeadId(utmCampaign);
    if (!leadId) continue;

    const appStatusRaw = getVal(idx.appStatus);
    const appStatusUp  = appStatusRaw.toUpperCase().trim();
    const stageRaw     = getVal(idx.stage);

    let output: Partial<Lead> = {
      lead_id:            leadId,
      applicant_name:     getVal(idx.name),
      card_variant:       getVal(idx.cardVariant),
      application_no:     getVal(idx.applicationId),
      cust_type:          'NTB',
      vkyc_status:        undefined,
      status:             'In_Process',
      remark:             '',
      card_issued_date:   undefined,
      activation_status:  undefined,
    };

    if (appStatusUp === 'REJECTED' || appStatusUp === 'EXPIRED') {
      output.status = 'Rejected';
      output.remark = stageRaw;
    } else if (appStatusUp === 'ONBOARDED') {
      output.status = 'Approved';
      output.remark = stageRaw;
      output.activation_status = 'Active';
      output.vkyc_status = 'COMPLETED';
      const d = parseDate(idx.createdDate !== -1 ? row[idx.createdDate] : '');
      if (d) output.card_issued_date = formatDate(d);
    } else {
      output.status = 'In_Process';
      output.remark = stageRaw;
    }

    leads.push(output);
  }
  return leads;
};

/**
 * Parse imported Excel file and validate data
 */
export const parseExcelFile = async (file: File): Promise<Partial<Lead>[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

          // Scan all sheets — use the first one with recognizable bank headers
          let sheetName: string | undefined;
          let rawData: any[][] | undefined;
          for (const name of workbook.SheetNames) {
            const ws = workbook.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(ws, {
              raw: false, defval: '', header: 1
            }) as any[][];
            if (rows.length < 2) continue;
            const h = rows[0] as string[];
            const d = rows.slice(1);
            if (detectBank(h, d) !== 'UNKNOWN') {
              sheetName = name;
              rawData = rows;
              break;
            }
          }

          // Fallback: first sheet with at least 2 rows
          if (!rawData) {
            for (const name of workbook.SheetNames) {
              const ws = workbook.Sheets[name];
              const rows = XLSX.utils.sheet_to_json(ws, {
                raw: false, defval: '', header: 1
              }) as any[][];
              if (rows.length >= 2) {
                sheetName = name;
                rawData = rows;
                break;
              }
            }
          }

          if (!rawData) {
            reject(new Error('Excel file must have headers and at least one data row'));
            return;
          }

          // First row contains headers
          const headers = rawData[0] as string[];
          const dataRows = rawData.slice(1);

          // Attempt to detect Bank MIS format
          const bankFormat = detectBank(headers, dataRows);
          let leads: Partial<Lead>[] = [];

          if (bankFormat === 'HDFC') {
            leads = processHDFC(headers, dataRows);
          } else if (bankFormat === 'IDFC') {
            leads = processIDFC(headers, dataRows);
          } else if (bankFormat === 'IDFC_NEW') {
            leads = processIDFCNew(headers, dataRows);
          } else if (bankFormat === 'AU') {
            leads = processAU(headers, dataRows);
          } else if (bankFormat === 'AXIS') {
            leads = processAXIS(headers, dataRows);
          } else if (bankFormat === 'YESPOP') {
            leads = processYESPOP(headers, dataRows);
          } else if (bankFormat === 'SCAPIA') {
            leads = processSCAPIA(headers, dataRows);
          } else if (bankFormat === 'POONAWALA') {
            leads = processPOONAWALA(headers, dataRows);
          } else if (bankFormat === 'INDUSIND') {
            leads = processINDUSIND(headers, dataRows);
          } else if (bankFormat === 'BOB') {
            leads = processBOB(headers, dataRows);
          } else {
            // UNKNOWN FORMAT - Fall back to general / standard template format parsing
            const headerIndex: Record<string, number> = {};
            headers.forEach((header: string, index: number) => {
              const normalized = String(header).toLowerCase().trim();
              headerIndex[normalized] = index;
            });

            // Helper functions
            const toString = (val: any) => val ? String(val).trim() : '';

            const getValue = (headerName: string, row: any[]) => {
              const normalized = headerName.toLowerCase().trim();
              const index = headerIndex[normalized];
              if (index === undefined) return '';
              return toString(row[index]);
            };

            const normalizeStatus = (status: string) => {
              const statusLower = status.toLowerCase();
              if (statusLower === 'declined') return 'Rejected';
              if (statusLower === 'generated') return 'Generated';
              if (statusLower === 'approved') return 'Approved';
              if (statusLower === 'in_process' || statusLower === 'in process') return 'In_Process';
              return status || 'Generated';
            };

            const normalizeKycStatus = (status: string) => {
              if (!status) return undefined;
              const upper = String(status).toUpperCase().trim();
              if (['COMPLETED', 'REJECTED', 'PENDING'].includes(upper)) {
                return upper;
              }
              if (upper === 'APPROVED') return 'COMPLETED';
              if (upper === 'FAILED' || upper === 'FAIL') return 'REJECTED';
              return upper;
            };

            for (const row of dataRows) {
              // Skip completely empty rows
              if (!row || row.length === 0 || row.every((cell: any) => !cell || String(cell).trim() === '')) {
                continue;
              }

              const leadId = getValue('lead_id', row);
              const status = getValue('status', row);
              const actStatus = getValue('activation_status', row);

              leads.push({
                created_at: getValue('created_at', row),
                advisor_id: getValue('channel_code', row) || getValue('advisor_id', row),
                advisor_name: getValue('advisor_name', row),
                type: getValue('product_category', row) || getValue('type', row) || 'credit_card',
                bank_name: getValue('bank_name', row),
                card_name: getValue('product_name', row) || getValue('card_name', row),
                lead_id: leadId,
                applicant_name: getValue('customer_name', row) || getValue('applicant_name', row),
                applicant_phone: getValue('phone', row) || getValue('applicant_phone', row),
                applicant_email: getValue('email', row) || getValue('applicant_email', row),
                status: normalizeStatus(status),
                remark: getValue('remark', row),
                application_no: getValue('application_no_mis', row) || getValue('application_no', row),
                cust_type: getValue('cust_type', row),
                card_variant: getValue('card_variant_mis', row) || getValue('card_variant', row),
                vkyc_status: normalizeKycStatus(getValue('vkyc_status', row)),
                bkyc_status: normalizeKycStatus(getValue('bkyc_status', row)),
                card_issued_date: getValue('card_issued_date', row),
                activation_status: normalizeActStatus(actStatus) || actStatus,
                disbursed_amount: getValue('disbursed_amount', row),
                updated_at: getValue('updated_at', row),
              });
            }
          }

          // Filter out completely empty rows
          const validLeads = leads.filter((lead) => {
            const hasAnyData = Object.values(lead).some(val => val !== undefined && val !== null && String(val).trim() !== '');
            return hasAnyData;
          });

          if (validLeads.length === 0) {
            reject(new Error('No valid leads found in the file'));
          } else {
            resolve(validLeads);
          }
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file'));
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Validate lead data before import
 */
export const validateLeadData = (lead: Partial<Lead>): { valid: boolean; errors: string[] } => {
  return {
    valid: true,
    errors: [],
  };
};

/** Normalized payout row for import */
export interface PayoutImportRow {
  advisorName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  panNumber?: string;
  paymentStatus?: string;
  leadAmount?: number;
  leadId?: string;
  customerName?: string;
  productName?: string;
  variant?: string;
  payoutSource?: string;
  applicationNoMis?: string;
}

const normalizeHeaderKey = (key: string) =>
  String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

const buildRowLookup = (row: Record<string, unknown>) => {
  const lookup = new Map<string, string>();
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue;
    const text = String(val).trim();
    if (!text) continue;
    lookup.set(normalizeHeaderKey(key), text);
  }
  return lookup;
};

const getByAliases = (lookup: Map<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const normalized = normalizeHeaderKey(alias);
    const value = lookup.get(normalized);
    if (value) return value;
  }
  return '';
};

const parseAmount = (raw: string) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const normalizePaymentStatus = (raw: string) => {
  const s = raw.toLowerCase().trim();
  if (['paid', 'completed', 'success', 'done'].includes(s)) return 'paid';
  return 'pending';
};

export const mapRowToPayoutImport = (row: Record<string, unknown>): PayoutImportRow => {
  const lookup = buildRowLookup(row);

  const leadId =
    getByAliases(lookup, ['lead_id', 'lead id', 'leadid']) ||
    getByAliases(lookup, ['application_no_mis', 'application no mis', 'application_no', 'application no']);

  const rawAmount =
    getByAliases(lookup, [
      'lead_amount',
      'lead amount',
      'commission',
      'amount',
      'net_payout',
      'net payout',
      'disbursed_amount',
      'disbursed amount',
      'payout',
    ]) ||
    '';

  const rawStatus = getByAliases(lookup, [
    'payment_status',
    'payment status',
    'payout_status',
    'payout status',
    'status',
  ]);

  const advisorName = getByAliases(lookup, [
    'advisor_name',
    'advisor name',
    'user_name',
    'user name',
    'user',
    'dsa_name',
    'channel_code',
  ]);

  const accountNumber = getByAliases(lookup, [
    'account_number',
    'account number',
    'bank_account',
    'bank account',
  ]);

  const bankName = getByAliases(lookup, ['bank_name', 'bank name', 'bank']);
  const ifscCode = getByAliases(lookup, ['ifsc_code', 'ifsc code', 'ifsc']);
  const panNumber = getByAliases(lookup, ['pan_number', 'pan number', 'pan']);

  const customerName = getByAliases(lookup, [
    'customer_name',
    'customer name',
    'applicant_name',
    'applicant name',
  ]);

  const productName = getByAliases(lookup, [
    'product_name',
    'product name',
    'card_name',
    'card name',
    'card',
  ]);

  const variant = getByAliases(lookup, [
    'variant',
    'card_variant',
    'card variant',
    'card_variant_mis',
  ]);

  const applicationNoMis = getByAliases(lookup, [
    'application_no_mis',
    'application no mis',
    'application_no',
    'application no',
  ]);

  return {
    advisorName,
    accountNumber,
    bankName,
    ifscCode,
    panNumber,
    paymentStatus: normalizePaymentStatus(rawStatus),
    leadAmount: parseAmount(rawAmount),
    leadId,
    customerName,
    productName,
    variant,
    payoutSource: getByAliases(lookup, ['payout_source', 'payout source']),
    applicationNoMis,
  };
};

export const validatePayoutImportRow = (_row: PayoutImportRow): string[] => [];

/**
 * Parse Excel/CSV for payout import (supports template, leads export, and payouts table formats)
 */
export const parsePayoutExcelFile = async (file: File): Promise<PayoutImportRow[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: '',
            blankrows: true,
          }) as Record<string, unknown>[];

          const payouts = jsonData.map((row, index) => {
            const mapped = mapRowToPayoutImport(row);
            return mapped;
          });

          resolve(payouts);
        } catch (error) {
          reject(
            new Error(
              `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };

      reader.onerror = () => reject(new Error('Failed to read the file'));
      reader.readAsBinaryString(file);
    } catch (error) {
      reject(error);
    }
  });
};
