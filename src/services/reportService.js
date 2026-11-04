import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ReportService {
  async getCustomerReport(customerId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/customer-report/${customerId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch report');
    }
  }

  async downloadPDF(fileName) {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/download/${fileName}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      throw new Error('Failed to download PDF');
    }
  }

  async deletePDF(fileName) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/reports/delete/${fileName}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to delete PDF');
    }
  }
}

export default new ReportService();
