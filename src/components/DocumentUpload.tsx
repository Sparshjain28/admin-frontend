import { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, XCircle, File, Image, CreditCard, Car, Building, User, Shield, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  leadId: number;
  onUploadComplete?: () => void;
}

interface DocumentListProps {
  leadId: number;
}

const REQUIRED_DOCUMENTS = [
  { value: 'rc_front', label: 'RC Front', required: true },
  { value: 'rc_back', label: 'RC Back', required: true },
  { value: 'aadhar_front', label: 'Aadhar Front', required: true },
  { value: 'aadhar_back', label: 'Aadhar Back', required: true },
  { value: 'pan_card', label: 'PAN Card', required: true },
];

const OPTIONAL_DOCUMENTS = [
  { value: 'bank_statement', label: 'Bank Statement', required: false },
  { value: 'loan_statement', label: 'Loan Statement', required: false },
];

export default function DocumentUpload({ leadId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const handleDocTypeChange = (docType: string, checked: boolean) => {
    if (checked) {
      setSelectedDocTypes(prev => [...prev, docType]);
    } else {
      setSelectedDocTypes(prev => prev.filter(type => type !== docType));
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[docType];
        return newFiles;
      });
    }
  };

  const handleFileChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(selectedFile.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }
      setFiles(prev => ({ ...prev, [docType]: selectedFile }));
    }
  };

  const removeFile = (docType: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[docType];
      return newFiles;
    });
  };

  const handleUpload = async () => {
    const filesToUpload = Object.entries(files);
    if (filesToUpload.length === 0) {
      toast.error('Please select at least one document to upload');
      return;
    }

    const missingRequired = REQUIRED_DOCUMENTS.filter(doc => 
      selectedDocTypes.includes(doc.value) && !files[doc.value]
    );
    
    if (missingRequired.length > 0) {
      toast.error(`Please upload all required documents: ${missingRequired.map(d => d.label).join(', ')}`);
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [docType, file] of filesToUpload) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('lead_id', leadId.toString());
      formData.append('document_type', docType);
      if (source) formData.append('source', source);
      if (notes) formData.append('notes', notes);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        successCount++;
      } catch (error) {
        errorCount++;
}
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully`);
      setFiles({});
      setSelectedDocTypes([]);
      setSource('');
      setNotes('');
      onUploadComplete?.();
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to upload`);
    }

    setUploading(false);
  };

  return (
      <div className="bg-card w-full border border-border shadow-sm rounded-2xl p-5 md:p-6 mb-6 transition-all duration-300">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight leading-none mb-1">Upload Documents</h2>
            <p className="text-xs text-muted-foreground font-medium">Add Files to Case</p>
          </div>
        </div>
        
        <div className="mb-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground ml-1">Document Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Email, WhatsApp, Portal"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground ml-1">Internal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional processing notes..."
                rows={1}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Required Documents</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-3">
            {REQUIRED_DOCUMENTS.map(doc => (
              <label key={doc.value} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedDocTypes.includes(doc.value)}
                    onChange={(e) => handleDocTypeChange(doc.value, e.target.checked)}
                    className="peer w-4 h-4 appearance-none border border-border rounded bg-background focus:ring-2 focus:ring-primary/20 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <CheckCircle size={10} className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  {doc.label} <span className="text-primary">*</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <File size={16} className="text-muted-foreground" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Optional Items</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-3">
            {OPTIONAL_DOCUMENTS.map(doc => (
              <label key={doc.value} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedDocTypes.includes(doc.value)}
                    onChange={(e) => handleDocTypeChange(doc.value, e.target.checked)}
                    className="peer w-4 h-4 appearance-none border border-border rounded bg-background focus:ring-2 focus:ring-primary/20 checked:bg-primary checked:border-primary transition-all cursor-pointer"
                  />
                  <CheckCircle size={10} className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  {doc.label}
                </span>
              </label>
            ))}
          </div>
        </div>

          {selectedDocTypes.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS]
                  .filter(doc => selectedDocTypes.includes(doc.value))
                  .map(({ value: docType, label, required }) => (
                  <div key={docType} className="flex flex-col group/item mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1">
                      {label} {required && <span className="text-primary font-bold">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(docType, e)}
                        className="hidden"
                        id={`file-upload-${docType}`}
                      />
                      <label 
                        htmlFor={`file-upload-${docType}`} 
                        className={`flex items-center w-full h-12 px-3 bg-background border rounded-xl cursor-pointer transition-all hover:bg-muted/50 ${
                          files[docType] ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg mr-3 transition-colors ${
                          files[docType] ? 'bg-primary text-secondary' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Upload size={14} />
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate min-w-0 flex-1">
                          {files[docType] ? files[docType].name : `Select file...`}
                        </span>
                        {files[docType] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeFile(docType);
                            }}
                            className="ml-2 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-5 mt-4 border-t border-border">
                <button
                  onClick={() => {
                    setFiles({});
                    setSelectedDocTypes([]);
                    setSource('');
                    setNotes('');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleUpload}
                  disabled={Object.keys(files).length === 0 || uploading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-secondary text-xs font-bold rounded-xl shadow-[0_4px_12px_rgba(40,114,161,0.2)] hover:shadow-[0_6px_16px_rgba(40,114,161,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {uploading ? 'Processing...' : 'Upload To Case'}
                </button>
              </div>
            </div>
          )}
      </div>
  );
}

export function DocumentList({ leadId }: DocumentListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const fetchDocuments = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/lead/${leadId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Remove duplicates based on document_type and file_name
        const uniqueDocs = data.filter((doc, index, self) => {
          const firstIndex = self.findIndex(d => 
            d.document_type === doc.document_type && 
            d.file_name === doc.file_name
          );
          return index === firstIndex;
        });
setDocuments(uniqueDocs);
      }
    } catch (error) {
} finally {
      setLoading(false);
    }
  };

  const handlePreview = async (doc: any) => {
    try {
      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${doc.id}/download`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewDoc(doc);
      } else {
        toast.error('Failed to load document preview');
      }
    } catch (error) {
      toast.error('Failed to load document preview');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewDoc(null);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        toast.success('Document deleted successfully');
        fetchDocuments();
        if (previewDoc?.id === docId) closePreview();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
toast.error('Failed to delete document');
    }
  };

  const handleReplaceDoc = async (docId: number, docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      // First delete the old document
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      // Then upload the new one
      const formData = new FormData();
      formData.append('document', file);
      formData.append('lead_id', leadId.toString());
      formData.append('document_type', docType);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success(`${docType.replace(/_/g, ' ')} replaced successfully`);
        fetchDocuments();
        if (previewDoc?.id === docId) closePreview();
      } else {
        toast.error('Failed to replace document');
      }
    } catch (error) {
toast.error('Failed to replace document');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-muted animate-pulse rounded-lg"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-2"></div>
              <div className="h-2 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card w-full border border-border shadow-sm rounded-2xl p-5 md:p-6 transition-all duration-300 min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight leading-none mb-1">Lead Documents</h3>
            <p className="text-xs text-muted-foreground font-medium">Files & Attachments</p>
          </div>
        </div>
        {documents.length > 0 && (
          <span className="flex items-center justify-center px-3 py-1 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-lg border border-border/50 shadow-sm">
            {documents.length} FILES
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-8 overflow-y-auto pr-2 scrollbar-hide">
        {/* Document List Grid - Refined for Mobile App Aesthetics */}
        <div className="shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {documents.length === 0 ? (
            <div className="text-center py-10 bg-muted/10 rounded-2xl border border-dashed border-border/60">
              <div className="p-3 bg-background/50 rounded-full w-fit mx-auto mb-3 border border-border/40 shadow-sm">
                <FileText className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-bold text-foreground">No documents found</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Upload files to see them here</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {documents.map((doc, index) => {
                const isSelected = previewDoc?.id === doc.id;
                const getStatusConfig = (status: string) => {
                  switch (status) {
                    case 'verified':
                      return { label: 'Verified', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
                    case 'rejected':
                      return { label: 'Rejected', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
                    case 'pending':
                    default:
                      return { label: 'Uploaded', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
                  }
                };
                const statusConfig = getStatusConfig(doc.status);

                return (
                  <div key={doc.id}>
                    <div
                      onClick={() => handlePreview(doc)}
                      className={`flex items-center gap-3 py-2.5 px-2 cursor-pointer rounded-xl transition-all ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      {/* Number */}
                      <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>

                      {/* Icon */}
                      <div className={`shrink-0 p-2 rounded-lg ${
                        isSelected ? 'bg-primary text-secondary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <FileText size={14} />
                      </div>

                      {/* Name + Status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate capitalize">
                          {doc.document_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{doc.file_name}</p>
                      </div>

                      {/* Status badge */}
                      <span className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        statusConfig.bg} ${statusConfig.border} ${statusConfig.color
                      }`}>
                        {statusConfig.label}
                      </span>

                      {/* Admin actions */}
                      {user?.role === 'admin' && (
                        <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                          <label className="p-1.5 rounded-md bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer">
                            <Upload size={11} />
                            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e) => handleReplaceDoc(doc.id, doc.document_type, e)} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Inline preview */}
                    {isSelected && (
                      <div className="mt-2 mb-3 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex flex-col bg-background rounded-2xl border border-border shadow-md overflow-hidden">
                          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                <Eye size={14} />
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[180px]">{doc.file_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={previewUrl} download={doc.file_name}
                                className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-primary transition-all border border-transparent">
                                <Upload size={14} className="rotate-180" />
                              </a>
                              <button onClick={(e) => { e.stopPropagation(); closePreview(); }}
                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-center items-center py-4 px-2 bg-muted/10">
                            {doc.file_name.toLowerCase().endsWith('.pdf') ? (
                              <div className="text-center py-6">
                                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs font-medium text-foreground mb-3">{doc.file_name}</p>
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold">
                                  <Eye size={14} /> Open PDF
                                </a>
                              </div>
                            ) : (
                              <img src={previewUrl} alt="Preview"
                                className="w-full max-w-2xl h-auto object-contain rounded-xl shadow-md border border-border" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inline Preview Area - Appears directly inline for mobile focus */}      </div>
    </div>
  );
}

