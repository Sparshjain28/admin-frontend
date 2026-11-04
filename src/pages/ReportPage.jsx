import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useReport } from '../hooks/useReport';
import DownloadButton from '../components/DownloadButton';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const ReportPage = () => {
  const { customerId } = useParams();
  const { reportData, pdfInfo, loading, error, downloading, fetchReport, downloadPDF } = useReport();

  useEffect(() => {
    if (customerId) {
      fetchReport(customerId);
    }
  }, [customerId, fetchReport]);

  const formatCurrency = (amount) => {
    return '₹' + (amount || 0).toLocaleString('en-IN');
  };

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-emerald-600';
    if (score >= 650) return 'text-orange-500';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Credit Report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center">{error}</p>
          <button
            onClick={() => fetchReport(customerId)}
            className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">No report data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Floating Download Button */}
      <div className="fixed top-4 right-4 z-50">
        <DownloadButton onClick={downloadPDF} loading={downloading} disabled={!pdfInfo} />
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Success Message */}
        {pdfInfo && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-emerald-800 font-semibold">Report Generated Successfully!</p>
              <p className="text-emerald-600 text-sm">Your PDF is ready to download</p>
            </div>
          </div>
        )}

        {/* Report Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          
          {/* Header */}
          <div className="border-b-4 border-red-600 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-red-600 mb-1">CIBIL</h1>
                <p className="text-xs text-gray-600">TransUnion CIBIL Limited</p>
                <p className="text-sm font-semibold text-gray-800 mt-2">Credit Information Report</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Control Number</p>
                <p className="text-sm font-semibold text-gray-800">{reportData.Header?.chmRef}</p>
                <p className="text-xs text-gray-500 mt-2">Report Date</p>
                <p className="text-sm font-semibold text-gray-800">{reportData.Header?.dateOfIssue}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-500">Report Prepared For</p>
              <p className="text-xl font-bold text-gray-900">{reportData.Header?.customerName}</p>
            </div>
          </div>

          {/* Credit Score */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">CIBIL TransUnion Score</p>
                <p className="text-lg font-bold text-gray-900">{reportData.Score?.name}</p>
                <p className="text-xs text-gray-500 mt-1">Score Range: {reportData.Score?.range}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Your CIBIL Score</p>
                <p className={`text-7xl font-bold ${getScoreColor(reportData.Score?.value)}`}>
                  {reportData.Score?.value}
                </p>
              </div>
            </div>
          </div>

          {/* Account Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-bold bg-red-600 text-white px-3 py-2 mb-4">CREDIT ACCOUNT SUMMARY</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.PrimarySummary?.totalAccounts}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Active Accounts</p>
                <p className="text-3xl font-bold text-emerald-600">{reportData.PrimarySummary?.activeAccounts}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Overdue Accounts</p>
                <p className="text-3xl font-bold text-red-600">{reportData.PrimarySummary?.overdueAccounts}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Total Credit Limit</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.PrimarySummary?.totalSanctioned)}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Total Disbursed</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.PrimarySummary?.totalDisbursed)}</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="text-xs text-gray-600">Outstanding Balance</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(reportData.PrimarySummary?.totalCurrentBalance)}</p>
              </div>
            </div>
          </div>

          {/* Accounts Preview */}
          <div className="mb-6">
            <h2 className="text-lg font-bold bg-red-600 text-white px-3 py-2 mb-4">CREDIT ACCOUNTS</h2>
            <div className="space-y-4">
              {reportData.Accounts?.slice(0, 3).map((account, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{account.type}</h3>
                      <p className="text-sm text-gray-600 font-semibold">{account.grantor}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {account.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Balance: </span>
                      <span className="font-semibold">{formatCurrency(account.currentBalance)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Limit: </span>
                      <span className="font-semibold">{formatCurrency(account.creditLimit)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {reportData.Accounts?.length > 3 && (
                <p className="text-center text-sm text-gray-500">
                  + {reportData.Accounts.length - 3} more accounts (view in PDF)
                </p>
              )}
            </div>
          </div>

          {/* Download CTA */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-center text-white">
            <h3 className="text-xl font-bold mb-2">Complete Report Available</h3>
            <p className="text-red-100 mb-4">Download the full PDF report with detailed payment history and analysis</p>
            <DownloadButton 
              onClick={downloadPDF} 
              loading={downloading} 
              disabled={!pdfInfo}
              className="bg-white text-red-600 hover:bg-gray-100 mx-auto"
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportPage;
