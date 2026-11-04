import { toast } from 'sonner';

/**
 * Simple test function to verify WhatsApp share is working
 */
export async function testWhatsAppShare() {
  console.log('🔍 TEST: WhatsApp share function called!');
  toast.info('WhatsApp share test started...');
  
  try {
    // Test 1: Check if function is callable
    console.log('✅ Test 1: Function is callable');
    
    // Test 2: Check Share API
    console.log('✅ Test 2: Checking Share API...');
    console.log('   navigator.share exists:', !!navigator.share);
    console.log('   navigator.canShare exists:', !!navigator.canShare);
    
    // Test 3: Try simple text share
    if (navigator.share) {
      console.log('✅ Test 3: Attempting simple text share...');
      
      try {
        await navigator.share({
          title: 'Test',
          text: 'This is a test message for WhatsApp'
        });
        console.log('✅ Test 3 Success: Share dialog opened');
        toast.success('Share dialog opened!');
        return true;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('ℹ️ Test 3: User cancelled share');
          toast.info('Share cancelled by user');
        } else {
          console.error('❌ Test 3 Failed:', error);
          toast.error('Share failed: ' + error.message);
        }
      }
    } else {
      console.warn('❌ Test 3: Share API not available');
      toast.error('Share API not available on this device');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    toast.error('Test failed');
  }
}

/**
 * Simple WhatsApp direct link share
 */
export async function simpleWhatsAppShare(message: string) {
  console.log('🔍 Simple WhatsApp share called with message:', message);
  toast.info('Opening WhatsApp...');
  
  try {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    
    console.log('Opening URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
    
    toast.success('WhatsApp opened!');
    return true;
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to open WhatsApp');
    return false;
  }
}

/**
 * Share PDF to WhatsApp (simple version)
 */
export async function sharePDFSimple(
  pdfBlob: Blob,
  fileName: string,
  message: string
) {
  console.log('🔍 Share PDF Simple called');
  console.log('   File name:', fileName);
  console.log('   Message:', message);
  console.log('   PDF size:', (pdfBlob.size / (1024 * 1024)).toFixed(2), 'MB');
  
  const loadingToast = toast.loading('Preparing to share...');
  
  try {
    // Method 1: Try Web Share API with file
    if (navigator.share && navigator.canShare) {
      console.log('✅ Method 1: Trying Web Share API with file...');
      
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      try {
        if (navigator.canShare({ files: [pdfFile] })) {
          console.log('✅ Device can share files');
          
          toast.dismiss(loadingToast);
          
          await navigator.share({
            files: [pdfFile],
            title: 'Loan Document',
            text: message
          });
          
          console.log('✅ Share successful!');
          toast.success('Shared successfully!');
          return true;
        } else {
          console.warn('⚠️ Device cannot share files');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('ℹ️ User cancelled');
          toast.dismiss(loadingToast);
          toast.info('Share cancelled');
          return false;
        }
        console.warn('⚠️ Web Share API failed:', error.message);
      }
    }
    
    // Method 2: Direct WhatsApp link
    console.log('✅ Method 2: Using direct WhatsApp link...');
    toast.dismiss(loadingToast);
    
    const fullMessage = `${message}\n\n📎 PDF: ${fileName}`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    
    console.log('Opening WhatsApp URL...');
    window.open(whatsappUrl, '_blank');
    
    toast.success('Opening WhatsApp...');
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    toast.dismiss(loadingToast);
    toast.error('Failed to share');
    return false;
  }
}

/**
 * Download PDF as fallback
 */
export async function downloadPDFSimple(
  pdfBlob: Blob,
  fileName: string
) {
  console.log('🔍 Download PDF called');
  console.log('   File name:', fileName);
  
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    console.log('Triggering download...');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ Download started');
    toast.success('PDF downloaded!');
    return true;
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    toast.error('Download failed');
    return false;
  }
}
