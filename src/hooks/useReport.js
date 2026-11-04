import { useState, useCallback } from 'react';
import reportService from '../services/reportService';

export const useReport = () => {
  const [reportData, setReportData] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchReport = useCallback(async (customerId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportService.getCustomerReport(customerId);
      setReportData(response.data);
      setPdfInfo(response.pdf);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPDF = useCallback(async () => {
    if (!pdfInfo?.fileName) {
      setError('No PDF available to download');
      return;
    }

    setDownloading(true);
    setError(null);
    try {
      await reportService.downloadPDF(pdfInfo.fileName);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setDownloading(false);
    }
  }, [pdfInfo]);

  const deletePDF = useCallback(async () => {
    if (!pdfInfo?.fileName) return;

    try {
      await reportService.deletePDF(pdfInfo.fileName);
      setPdfInfo(null);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [pdfInfo]);

  const clearReport = useCallback(() => {
    setReportData(null);
    setPdfInfo(null);
    setError(null);
  }, []);

  return {
    reportData,
    pdfInfo,
    loading,
    error,
    downloading,
    fetchReport,
    downloadPDF,
    deletePDF,
    clearReport
  };
};
