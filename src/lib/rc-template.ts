import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { api } from './api';
import QRCode from 'qrcode';

interface LoanData {
  regn_no?: string;
  regn_date?: string;
  valid_upto?: string;
  owner_serial?: string;
  card_issue_date?: string;
  chassis_no?: string;
  engine_no?: string;
  applicant_name?: string;
  father_name?: string;
  ownership_type?: string;
  address?: string;
  fuel_type?: string;
  maker_name?: string;
  model_name?: string;
  vehicle_class?: string;
  color?: string;
  body_type?: string;
  seating_capacity?: string;
  unladen_weight?: string;
  laden_weight?: string;
  cubic_cap?: string;
  wheel_base?: string;
  financier?: string;
  mfg_month_year?: string;
  vehicle_number?: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  owner_name?: string;
  current_address?: string;
  permanent_address?: string;
  present_address?: string;
  emission_norms?: string;
  manufacturing_date?: string;
  manufacturing_date_formatted?: string;
  car_make?: string;
  car_model?: string;
  model_variant_name?: string;
  maker_description?: string;
  maker_model?: string;
  financier_name?: string;
  selected_financier?: string;
  bank_name?: string;
  horse_power?: string;
  bhp?: string;
  no_of_cylinders?: string;
  form_23a?: string;
  case_type?: string;
  financer?: string;
  finance_status?: string;
  insurance_company?: string;
  insurance_valid_upto?: string;
  pucc_valid_upto?: string;
  vehicle_category_description?: string;
  seat_capacity?: string;
  cubic_capacity?: string;
  wheelbase?: string;
  [key: string]: any;
}

async function getImageProps(src: string): Promise<{ data: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas error');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve({
        data: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => reject('Image load failed');
  });
}

async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200,
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

async function fetchRCData(rcNumber: string): Promise<any> {
  try {
    console.log('🔍 Fetching RC data for:', rcNumber);
    const result = await api.get(`/rc-verification/data/${rcNumber}`);
    console.log('✅ RC data fetched successfully:', result.data);
    return result.data;
  } catch (error) {
    console.warn('⚠️ Failed to fetch RC data from API:', error);
  }
  return null;
}

function isPlaceholder(value: any): boolean {
  if (!value || typeof value !== 'string') return true;
  const lower = value.toLowerCase().trim();
  return lower === 'address' || lower === 'father_name' || lower === '------' || lower === '';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

function getAddressFromRC(rcData: any): string {
  if (!rcData) return '';

  const possibleFields = [
    'owner_address',
    'permanent_address',
    'present_address',
    'address',
    'current_address',
    'registered_address',
    'owner_permanent_address',
    'owner_present_address',
    'owner_current_address',
    'permanent_add',
    'present_add',
    'current_add',
  ];

  for (const field of possibleFields) {
    const value = rcData[field];
    if (!isPlaceholder(value)) {
      console.log(`✓ Address found in field '${field}':`, value);
      return value;
    }
  }

  console.warn('⚠️ No address field found in RC data');
  return '';
}

export async function generateRCTemplatePDF(loan: LoanData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  try {
    const frontImgProps = await getImageProps('/rcfront.png');
    const backImgProps = await getImageProps('/rcback.png');

    doc.addImage(frontImgProps.data, 'PNG', 10, 10, frontImgProps.width / 10, frontImgProps.height / 10);

    let rcData: any = null;
    const rcNumber = loan.vehicle_number || loan.registration_number;

    if (rcNumber) {
      rcData = await fetchRCData(rcNumber);
    }

    let addr = '';
    if (rcData) {
      addr = getAddressFromRC(rcData);
    }
    if (!addr) {
      addr = loan.permanent_address || loan.present_address || loan.address || loan.current_address || '';
      if (!isPlaceholder(addr)) {
        console.log('✓ Address from loan data:', addr);
      } else {
        addr = '';
      }
    }

    const regn = rcData?.rc_number || loan.regn_no || loan.vehicle_number || loan.registration_number || '';
    const regDate = formatDate(rcData?.registration_date || loan.regn_date || '');
    let validUpto = rcData?.fit_up_to || rcData?.tax_paid_upto || rcData?.registration_validity_upto || rcData?.valid_upto || loan.valid_upto || '';
    validUpto = formatDate(validUpto);
    console.log('🔍 Valid Upto raw:', rcData?.fit_up_to || rcData?.tax_paid_upto, '-> formatted:', validUpto);

    const ownerSerial = rcData?.owner_serial || loan.owner_serial || '1';
    const cardIssueDate = rcData?.card_issue_date || loan.card_issue_date || '';
    const chassis = rcData?.vehicle_chasi_number || rcData?.chassis_number || loan.chassis_no || loan.chassis_number || '';
    const engine = rcData?.vehicle_engine_number || rcData?.engine_number || loan.engine_no || loan.engine_number || '';
    const owner = rcData?.owner_name || loan.owner_name || loan.applicant_name || '';
    let fatherName = rcData?.owner_father_name || rcData?.father_name || loan.father_name || '';
    if (isPlaceholder(fatherName)) {
      fatherName = '';
    }
    const ownership = rcData?.ownership_type || loan.ownership_type || 'INDIVIDUAL';
    const fuel = rcData?.fuel_type || loan.fuel_type || 'PURE EV';
    const emission = rcData?.norms_type || rcData?.emission_norms || loan.emission_norms || 'NOT AVAILABLE';

    // Create RC details object for QR code
    const rcDetailsForQR = {
      rc_number: regn,
      owner_name: owner,
      address: addr,
      chassis: chassis,
      engine: engine,
      registration_date: regDate,
      validity_upto: validUpto,
      fuel_type: fuel,
      vehicle_class: rcData?.vehicle_category_description || loan.vehicle_category_description || 'MOTOR CAR (LMV)',
    };

    // Generate QR code with URL that includes RC data
    const rcDataEncoded = encodeURIComponent(JSON.stringify(rcDetailsForQR));
    const qrUrl = `/rc-template-viewer?data=${rcDataEncoded}`;
    const qrCodeImage = await generateQRCode(qrUrl);
    console.log('✅ QR Code generated with RC viewer URL');

    console.log('=== RC TEMPLATE DATA ===');
    console.log('Regn:', regn);
    console.log('Regn Date:', regDate);
    console.log('Valid Upto:', validUpto);
    console.log('Owner:', owner);
    console.log('Father Name:', fatherName || '(empty)');
    console.log('Address:', addr || '(empty)');
    console.log('Fuel:', fuel);
    console.log('======================');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Indian Union Vehicle Registration Certificate', 50, 15, { align: 'center' });

    doc.setFontSize(5);
    doc.setFont('helvetica');
    doc.text('NT', 81.5, 16);
    doc.text('RJ', 86.5, 16);

    doc.setFontSize(6);
    doc.text('Sourced by mParivahan Api', 50, 18, { align: 'center' });

    // Add QR Code to the right side of the front page


    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    doc.text('Regn No', 28, 25);
    doc.text('Date of Regn.', 40, 25);
    doc.text('Regn. Validity', 54, 25);
    doc.text('OwnerSerial :-', 67, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(regn || "------", 28, 28);
    doc.text(regDate || "------", 40, 28);
    doc.text(validUpto || "------", 54, 28);
    doc.text(ownerSerial || "------", 83, 24);


    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Chassis No', 28, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(chassis || "------", 28, 34);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Engine/Motor No', 28, 36.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(engine || "------", 28, 38.5);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Owner Name', 28, 41);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const ownerText = owner ? owner.substring(0, 50) : '------';
    doc.text(ownerText, 28, 43.5);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Son/Wife/Daughter of', 28, 46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const fatherText = fatherName ? fatherName.substring(0, 50) : '------';
    doc.text(fatherText, 28, 48);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Ownership', 28, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const ownershipText = ownership ? ownership.substring(0, 30) : '------';
    doc.text(ownershipText, 28, 52);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Address', 28, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const addressText = addr && addr.trim() ? addr.substring(0, 200) : '------';
    console.log('📝 Address text to display:', addressText);
    const addressLines = doc.splitTextToSize(addressText, 50);
    doc.text(addressLines, 28, 57, { align: 'left' });

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Fuel', 12, 47);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(fuel || "------", 12, 50);

    doc.setFontSize(4);
    doc.setFont('helvetica', 'bold');
    doc.text('Emission Norms', 11.5, 53);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.text(emission || "------", 12, 56);

    doc.addImage(backImgProps.data, 'PNG', 10, 70, backImgProps.width / 8, backImgProps.height / 8);

    const vehicleClass = rcData?.vehicle_category_description || rcData?.vehicle_category || loan.vehicle_category_description || loan.vehicle_class || 'MOTOR CAR (LMV)';
    const maker = rcData?.maker_description || rcData?.maker_name || loan.maker_description || loan.maker_name || loan.car_make || '';
    const model = rcData?.maker_model || rcData?.model_name || loan.maker_model || loan.model_name || loan.model_variant_name || loan.car_model || '';
    const colorVal = rcData?.color || loan.color || '';
    const bodyType = rcData?.body_type || loan.body_type || '';
    const seating = rcData?.seat_capacity || rcData?.seating_capacity || loan.seat_capacity || loan.seating_capacity || '5';
    const unladenWt = rcData?.unladen_weight || loan.unladen_weight || '';
    const ladenWt = rcData?.vehicle_gross_weight || rcData?.laden_weight || loan.laden_weight || '';
    const cubicCap = rcData?.cubic_capacity || rcData?.cubic_cap || loan.cubic_capacity || loan.cubic_cap || '0.00';
    const wheelBase = rcData?.wheelbase || rcData?.wheel_base || loan.wheelbase || loan.wheel_base || '';
    const financier = loan.financer || loan.financier || loan.financier_name || loan.selected_financier || loan.bank_name || '';
    const mfgDate = rcData?.manufacturing_date || rcData?.manufacturing_date_formatted || rcData?.mfg_month_year || loan.manufacturing_date_formatted || loan.mfg_month_year || loan.manufacturing_date || '';

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("VEHICLE CLASS:-", 31, 77);
    doc.text(vehicleClass, 50, 77);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Regn. Number', 13, 84);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(regn || "------", 13, 86);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text("Maker's Name:", 35, 83);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(maker || "------", 35, 85.7);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Model Name:', 35, 88.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(model || "------", 35, 91.1);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Colour:', 35, 93.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(colorVal || "------", 35, 96.5);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Body Type:', 72, 93.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(bodyType || "------", 72, 96.5);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Seating(in all) Capacity:', 35, 99.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(seating || "------", 35, 101.9);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Unladen / Laden Weight (Kg):', 35, 104.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(`${unladenWt || "------"} / ${ladenWt || "------"}`, 35, 107.3);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Cubic Cap. /  Wheel Base(mm):', 35, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    const cubicCapVal = cubicCap || "------";
    const wheelBaseVal = wheelBase || "------";
    doc.text(`${cubicCapVal}`, 35, 112.7);
    doc.text(`${wheelBaseVal}`, 67, 112.7);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Financier:', 35, 115.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(financier || "------", 35, 118.1);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Month-Year of Mfg.', 12, 108);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(mfgDate || "------", 12, 110.7);

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('No. of Cylinders', 12, 114);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(rcData?.no_cylinders || rcData?.no_of_cylinders || loan.no_of_cylinders || "0", 12, 116.7);




    if (qrCodeImage) {
      doc.addImage(qrCodeImage, 'PNG', 13, 87, 17, 17);
      console.log('📱 QR Code added to PDF');
    }

    return doc.output('blob');
  } catch (err) {
    toast.error('Template loading failed. Check public folder.');
    throw err;
  }
}

export async function generateRCTemplateFullPagePDF(loan: LoanData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  try {
    const frontImgProps = await getImageProps('/rcfront.png');
    const backImgProps = await getImageProps('/rcback.png');

    doc.addImage(frontImgProps.data, 'PNG', 10, 10, frontImgProps.width / 10, frontImgProps.height / 10);

    doc.addPage();
    doc.addImage(backImgProps.data, 'PNG', 10, 10, backImgProps.width / 10, backImgProps.height / 10);

    return doc.output('blob');
  } catch (err) {
    toast.error('Template loading failed. Check public folder.');
    throw err;
  }
}

export async function downloadRCTemplatePDF(loan: LoanData) {
  try {
    const blob = await generateRCTemplatePDF(loan);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RC-${loan.regn_no || loan.vehicle_number || 'Template'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('RC Template downloaded!');
  } catch (error) {
    console.error('Error downloading RC template:', error);
    toast.error('Failed to download RC template');
  }
}

export async function shareRCTemplatePDF(loan: LoanData) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }

    const blob = await generateRCTemplatePDF(loan);
    const fileName = `RC-${loan.regn_no || loan.vehicle_number || 'Template'}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      toast.error('This device cannot share PDF files');
      return;
    }

    await navigator.share({
      title: `RC Template - ${loan.regn_no || loan.vehicle_number}`,
      text: `RC Template for ${loan.applicant_name || 'Customer'}`,
      files: [file],
    });
    toast.success('RC Template shared!');
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      toast.info('Sharing cancelled');
    } else {
      console.error('Share error:', error);
      toast.error('Failed to share RC template');
    }
  }
}

export async function exportRCTemplatePDF(loan: LoanData) {
  try {
    const blob = await generateRCTemplatePDF(loan);
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Could not open preview window');
      return;
    }
    const url = URL.createObjectURL(blob);
    win.location.href = url;
    toast.success('RC Template opened for preview');
  } catch (error) {
    console.error('Error exporting RC template:', error);
    toast.error('Failed to open RC template');
  }
}

export async function downloadRCTemplateFullPage(loan: LoanData) {
  try {
    const blob = await generateRCTemplateFullPagePDF(loan);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RC-FullPage-${loan.regn_no || loan.vehicle_number || 'Template'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('RC Template (Full Page) downloaded!');
  } catch (error) {
    console.error('Error downloading RC template:', error);
    toast.error('Failed to download RC template');
  }
}

export async function exportRCTemplateFullPage(loan: LoanData) {
  try {
    const blob = await generateRCTemplateFullPagePDF(loan);
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Could not open preview window');
      return;
    }
    const url = URL.createObjectURL(blob);
    win.location.href = url;
    toast.success('RC Template (Full Page) opened for preview');
  } catch (error) {
    console.error('Error exporting RC template:', error);
    toast.error('Failed to open RC template');
  }
}
