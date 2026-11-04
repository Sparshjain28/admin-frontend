import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Download, Loader2, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DownloadDocuments() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'fetching' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [files, setFiles] = useState<{id: string, filename: string, url: string, isImage: boolean}[]>([]);

  useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      setStatus('error');
      setErrorMsg('No documents specified for download.');
      return;
    }

    const documentIds = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (documentIds.length === 0) {
      setStatus('error');
      setErrorMsg('Invalid document IDs.');
      return;
    }

    setTotal(documentIds.length);
    setStatus('fetching');

    const fetchAll = async () => {
      try {
        let completed = 0;
        const fetchedFiles = [];

        for (const docId of documentIds) {
          const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/${docId}/download?loan_id=${id}`;
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error(`Failed to fetch document ${docId}`);
          const blob = await response.blob();
          
          let filename = `document_${docId}.pdf`;
          let isImage = false;
          
          const contentDisposition = response.headers.get('content-disposition');
          if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
            if (filename.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) isImage = true;
          } else {
            const contentType = response.headers.get('content-type');
            if (contentType === 'image/jpeg') { filename = `document_${docId}.jpg`; isImage = true; }
            else if (contentType === 'image/png') { filename = `document_${docId}.png`; isImage = true; }
          }
          
          fetchedFiles.push({
            id: docId,
            filename,
            url: URL.createObjectURL(blob),
            isImage
          });
          
          completed++;
          setProgress(completed);
        }
        
        setFiles(fetchedFiles);
        setStatus('ready');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'An error occurred during fetch');
      }
    };

    fetchAll();
    
    return () => {
      // Cleanup object URLs on unmount
      files.forEach(f => URL.revokeObjectURL(f.url));
    };
  }, [id, searchParams]);

  const handleDownloadAll = () => {
    // Add a small delay between each download so the browser doesn't block them as spam.
    // This allows the browser to prompt the user "Allow site to download multiple files?"
    files.forEach((file, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // 500ms delay between each file
    });
  };

  const handleDownloadSingle = (file: {url: string, filename: string}) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          {status === 'loading' || status === 'fetching' ? (
            <div className="relative">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <Download className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          ) : status === 'ready' ? (
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          ) : (
            <AlertCircle className="h-16 w-16 text-destructive" />
          )}
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            {status === 'loading' && 'Preparing...'}
            {status === 'fetching' && 'Fetching Documents'}
            {status === 'ready' && 'Ready to Download!'}
            {status === 'error' && 'Download Failed'}
          </h2>
          
          <p className="text-muted-foreground text-sm">
            {status === 'fetching' && `Preparing ${progress} of ${total} files. Please wait...`}
            {status === 'ready' && 'Your files are ready. Click below to save them.'}
            {status === 'error' && errorMsg}
          </p>
        </div>
        
        {status === 'fetching' && total > 0 && (
          <div className="w-full bg-secondary rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        )}

        {status === 'ready' && files.length > 0 && (
          <div className="space-y-4">
            {files.length > 1 && (
              <Button onClick={handleDownloadAll} className="w-full bg-primary font-bold">
                <Download className="w-4 h-4 mr-2" /> Save All Files
              </Button>
            )}
            
            <div className="max-h-[40vh] overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-muted/30">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-md shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden text-left">
                    {file.isImage ? <ImageIcon className="w-5 h-5 text-accent shrink-0" /> : <FileText className="w-5 h-5 text-blue-500 shrink-0" />}
                    <span className="text-sm font-medium truncate">{file.filename}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadSingle(file)} className="shrink-0 ml-2">
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button onClick={() => navigate('/')} variant="ghost" className="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
