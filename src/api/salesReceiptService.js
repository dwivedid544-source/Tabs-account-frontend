import axios from './axiosInstance';

const salesReceiptService = {
    getAll: (companyId, params = {}) => {
        const qParams = new URLSearchParams();
        if (companyId) qParams.append('companyId', companyId);
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                qParams.append(key, val);
            }
        });
        const query = qParams.toString() ? `?${qParams.toString()}` : '';
        return axios.get(`/sales-receipts${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-receipts/${id}${query}`);
    },
    create: (data) => axios.post('/sales-receipts', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/sales-receipts/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/sales-receipts/${id}${query}`);
    },
    getCustomerAdvance: (customerId, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-receipts/customer-advance/${customerId}${query}`);
    },
};

export default salesReceiptService;
