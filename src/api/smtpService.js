import axiosInstance from './axiosInstance';

const smtpService = {
    /**
     * Get SMTP settings for a company
     * @param {number|string} [companyId]
     */
    getSettings: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.get(`/companies/smtp-settings${query}`);
    },

    /**
     * Save / update SMTP settings
     * @param {Object} data
     * @param {number|string} [companyId]
     */
    updateSettings: (data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.put(`/companies/smtp-settings${query}`, { ...data, companyId });
    },

    /**
     * Test SMTP Connection
     * @param {Object} data
     * @param {number|string} [companyId]
     */
    testConnection: (data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.post(`/companies/smtp-test-connection${query}`, { ...data, companyId });
    },

    /**
     * Send a live test email
     * @param {Object} data
     * @param {number|string} [companyId]
     */
    sendTestEmail: (data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.post(`/companies/smtp-send-test-email${query}`, { ...data, companyId });
    }
};

export default smtpService;
