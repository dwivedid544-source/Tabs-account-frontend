import axios from './axiosInstance';

const salesReturnService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-returns${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/sales-returns/${id}${query}`);
    },
    create: (data) => axios.post('/sales-returns', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/sales-returns/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/sales-returns/${id}${query}`);
    },
};

export default salesReturnService;
