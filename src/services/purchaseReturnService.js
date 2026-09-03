import axiosInstance from '../api/axiosInstance';

const purchaseReturnService = {
    createReturn: async (data) => {
        const response = await axiosInstance.post('/purchase-returns', data);
        return response.data;
    },
    getReturns: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-returns${query}`);
        return response.data;
    },
    getReturnById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-returns/${id}${query}`);
        return response.data;
    },
    updateReturn: async (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.put(`/purchase-returns/${id}${query}`, data);
        return response.data;
    },
    deleteReturn: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/purchase-returns/${id}${query}`);
        return response.data;
    }
};

export default purchaseReturnService;
