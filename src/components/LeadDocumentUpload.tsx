import { useState } from 'react';
import { X, Eye, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LeadDocumentUploadProps {
  onDocumentsChange: (documents: { [key: string]: File }) => void;
}

const REQUIRED_DOCUMENTS = [
  { value: 'aadhar_front', label: 'Aadhar Front', required: true },
  { value: 'aadhar_back', label: 'Aadhar Back', required: true },
  { value: 'pan_card', label: 'PAN Card', required: true },
  { value: 'rc_front', label: 'RC Front', required: false },
  { value: 'rc_back', label: 'RC Back', required: false },
  { value: 'bank_statement', label: 'Bank Statement', required: false },
  { value: 'loan_statement', label: 'Loan Account Statement', required: false },
];

export default function LeadDocumentUpload({ onDocumentsChange }: LeadDocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});

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
      const newFiles = { ...files, [docType]: selectedFile };
      setFiles(newFiles);
      onDocumentsChange(newFiles);
    }
  };

  const removeFile = (docType: string) => {
    const newFiles = { ...files };
    delete newFiles[docType];
    setFiles(newFiles);
    onDocumentsChange(newFiles);
  };

  const viewDocument = (file: File) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  };

  return (
    <div className="flex flex-col divide-y divide-border">
      {REQUIRED_DOCUMENTS.map((doc, index) => (
        <div key={doc.value} className="flex items-center gap-2 py-1.5">
          {/* Number */}
          <span className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            {index + 1}
          </span>

          {/* Label */}
          <span className="flex-1 text-sm font-semibold text-foreground">
            {doc.label}
            {doc.required && <span className="text-red-500 ml-0.5">*</span>}
          </span>

          {/* Uploaded filename */}
          {files[doc.value] && (
            <span className="text-[10px] text-green-600 font-medium truncate max-w-[100px] sm:max-w-[160px]">
              {files[doc.value].name}
            </span>
          )}

          {/* Status icon */}
          {files[doc.value] ? (
            <CheckCircle size={15} className="shrink-0 text-green-600" />
          ) : null}

          {/* View button */}
          {files[doc.value] && (
            <button
              type="button"
              onClick={() => viewDocument(files[doc.value])}
              className="shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye size={13} />
            </button>
          )}

          {/* Remove button */}
          {files[doc.value] && (
            <button
              type="button"
              onClick={() => removeFile(doc.value)}
              className="shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={13} />
            </button>
          )}

          {/* Upload button */}
          <label
            htmlFor={`file-upload-${doc.value}`}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border
              bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
          >
            <Upload size={11} />
            {files[doc.value] ? 'Change' : 'Upload'}
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => handleFileChange(doc.value, e)}
            className="hidden"
            id={`file-upload-${doc.value}`}
          />
        </div>
      ))}
    </div>
  );
}
