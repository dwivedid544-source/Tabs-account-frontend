import axios from './axiosInstance';

const salesQuotationService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-quotations${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-quotations/${id}${query}`);
    },
    create: (data) => axios.post('/sales-quotations', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/sales-quotations/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/sales-quotations/${id}${query}`);
    },
    convert: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/sales-quotations/${id}/convert${query}`);
    },
};

export default salesQuotationService;
