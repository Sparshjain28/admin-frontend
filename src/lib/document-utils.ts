// Helper function to fetch document files from API
export async function fetchDocumentFiles(docs: any[]): Promise<{ file: File; name: string; docType: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // No authentication headers needed for public document access
  
  const DOC_TYPES: Record<string, string> = {
    aadhar_front: 'Aadhar Front',
    aadhar_back: 'Aadhar Back', 
    pan_card: 'PAN Card',
    rc_copy: 'RC Copy', 
    insurance: 'Insurance', 
    income_proof: 'Income Proof',
    bank_statement: 'Bank Statement', 
    nach: 'NACH', 
    photo: 'Photo',
    other: 'Other',
  };
  
  const files: { file: File; name: string; docType: string }[] = [];
  
  for (const doc of docs) {
    try {
      const res = await fetch(`${API}/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) {
        console.warn(`Document ${doc.id} not accessible: ${res.status}`);
        continue;
      }
      
      const blob = await res.blob();
      const docLabel = DOC_TYPES[doc.document_type] || doc.document_type || 'Document';
      const fileName = `${docLabel}-${doc.file_name}`;
      
      files.push({ 
        file: new File([blob], fileName, { type: blob.type }), 
        name: fileName, 
        docType: docLabel 
      });
    } catch (error) {
      console.error(`Failed to fetch document ${doc.id}:`, error);
    }
  }
  
  return files;
}