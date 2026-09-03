import axios from './axiosInstance';

const deliveryChallanService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/delivery-challans${query}`);
    },
    getById: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.get(`/delivery-challans/${id}${query}`);
    },
    create: (data) => axios.post('/delivery-challans', data),
    update: (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.put(`/delivery-challans/${id}${query}`, data);
    },
    delete: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.delete(`/delivery-challans/${id}${query}`);
    },
    convert: (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/delivery-challans/${id}/convert${query}`);
    },
    convertMultiple: (challanIds, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axios.post(`/delivery-challans/convert-multiple${query}`, { challanIds });
    },
};

export default deliveryChallanService;
