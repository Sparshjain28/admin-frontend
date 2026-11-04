import React from 'react';
import { Download, Loader2 } from 'lucide-react';

const DownloadButton = ({ onClick, loading = false, disabled = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex items-center gap-2 px-6 py-3 
        bg-red-600 hover:bg-red-700 
        text-white font-bold rounded-lg 
        shadow-2xl transition-all transform 
        hover:scale-105 disabled:opacity-50 
        disabled:cursor-not-allowed disabled:transform-none
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          <span>Download CIBIL PDF</span>
        </>
      )}
    </button>
  );
};

export default DownloadButton;
