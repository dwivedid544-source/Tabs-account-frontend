import axios from './axiosInstance';

const salesInvoiceService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-invoices${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-invoices/${id}${query}`);
    },
    getPublicById: (id) => axios.get(`/sales-invoices/public/${id}`),
    create: (data, allowDuplicate = false) => axios.post(`/sales-invoices${allowDuplicate ? '?allowDuplicate=true' : ''}`, data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/sales-invoices/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/sales-invoices/${id}${query}`);
    },
    getNextNumber: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-invoices/next-number${query}`);
    },
    unpay: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/sales-invoices/${id}/unpay${query}`);
    },
    sendEmail: (id, emailPayload, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/sales-invoices/${id}/send-email${query}`, emailPayload);
    }
};

export default salesInvoiceService;
