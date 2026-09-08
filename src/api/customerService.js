import axios from './axiosInstance';
import GetCompanyId from './GetCompanyId';

const customerService = {
    getAll: (companyId) => {
        const cId = companyId || GetCompanyId();
        const query = cId ? `?companyId=${cId}` : '';
        return axios.get(`/customers${query}`);
    },
    getById: (id, companyId) => {
        const cId = companyId || GetCompanyId();
        const query = cId ? `?companyId=${cId}` : '';
        return axios.get(`/customers/${id}${query}`);
    },
    create: (data) => {
        const cId = data?.companyId || GetCompanyId();
        const payload = { ...data };
        if (cId && !payload.companyId) {
            payload.companyId = parseInt(cId);
        }
        return axios.post('/customers', payload);
    },
    update: (id, data, companyId) => {
        const cId = companyId || data?.companyId || GetCompanyId();
        const query = cId ? `?companyId=${cId}` : '';
        return axios.put(`/customers/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const cId = companyId || GetCompanyId();
        const query = cId ? `?companyId=${cId}` : '';
        return axios.delete(`/customers/${id}${query}`);
    },
    getStatement: (id, companyId, params = {}) => {
        const cId = companyId || GetCompanyId();
        const queryParams = cId ? { ...params, companyId: cId } : params;
        return axios.get(`/customers/${id}/statement`, { params: queryParams });
    },
    recalculateBalance: (id, companyId) => {
        const cId = companyId || GetCompanyId();
        const query = cId ? `?companyId=${cId}` : '';
        return axios.post(`/customers/${id}/recalculate${query}`);
    },
};

export default customerService;
