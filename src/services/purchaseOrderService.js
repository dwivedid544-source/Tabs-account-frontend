import axiosInstance from '../api/axiosInstance';

const purchaseOrderService = {
    createOrder: async (data) => {
        const response = await axiosInstance.post('/purchase-orders', data);
        return response.data;
    },
    getOrders: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-orders${query}`);
        return response.data;
    },
    getOrderById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-orders/${id}${query}`);
        return response.data;
    },
    updateOrder: async (id, data) => {
        const response = await axiosInstance.put(`/purchase-orders/${id}`, data);
        return response.data;
    },
    deleteOrder: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/purchase-orders/${id}${query}`);
        return response.data;
    },
    convertOrder: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.post(`/purchase-orders/${id}/convert${query}`);
        return response.data;
    }
};

export default purchaseOrderService;
