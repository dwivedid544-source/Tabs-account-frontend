import axios from './axiosInstance';

const ledgerService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/chart-of-accounts/ledgers${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/chart-of-accounts/ledgers/${id}${query}`);
    },
    create: (data) => axios.post('/chart-of-accounts/ledgers', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/chart-of-accounts/ledgers/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/chart-of-accounts/ledgers/${id}${query}`);
    },
};

export default ledgerService;
