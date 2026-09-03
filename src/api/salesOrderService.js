import axios from './axiosInstance';

const salesOrderService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-orders${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-orders/${id}${query}`);
    },
    create: (data) => axios.post('/sales-orders', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/sales-orders/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/sales-orders/${id}${query}`);
    },
    convert: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/sales-orders/${id}/convert${query}`);
    },
};

export default salesOrderService;
