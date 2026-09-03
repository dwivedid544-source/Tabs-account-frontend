import axiosInstance from '../api/axiosInstance';

const purchaseBillService = {
    createBill: async (data, allowDuplicate = false) => {
        const response = await axiosInstance.post(`/purchase-bills${allowDuplicate ? '?allowDuplicate=true' : ''}`, data);
        return response.data;
    },
    getBills: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-bills${query}`);
        return response.data;
    },
    getBillById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-bills/${id}${query}`);
        return response.data;
    },
    updateBill: async (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.put(`/purchase-bills/${id}${query}`, data);
        return response.data;
    },
    deleteBill: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/purchase-bills/${id}${query}`);
        return response.data;
    },
    getNextNumber: async (companyId) => {
        const response = await axiosInstance.get(`/purchase-bills/next-number?companyId=${companyId}`);
        return response.data;
    },
    unpay: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.post(`/purchase-bills/${id}/unpay${query}`);
        return response.data;
    }
};

export default purchaseBillService;
