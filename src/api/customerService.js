import axios from './axiosInstance';

const customerService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/customers${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/customers/${id}${query}`);
    },
    create: (data) => axios.post('/customers', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/customers/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/customers/${id}${query}`);
    },
    getStatement: (id, companyId, params = {}) => {
        const queryParams = companyId ? { ...params, companyId } : params;
        return axios.get(`/customers/${id}/statement`, { params: queryParams });
    },
    recalculateBalance: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/customers/${id}/recalculate${query}`);
    },
};

export default customerService;
