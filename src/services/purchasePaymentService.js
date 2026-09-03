import axiosInstance from '../api/axiosInstance';

const purchasePaymentService = {
    createPayment: async (data) => {
        const response = await axiosInstance.post('/purchase-payments', data);
        return response.data;
    },
    getPayments: async (companyId, params = {}) => {
        const qParams = new URLSearchParams();
        if (companyId) qParams.append('companyId', companyId);
        Object.entries(params).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                qParams.append(key, val);
            }
        });
        const query = qParams.toString() ? `?${qParams.toString()}` : '';
        const response = await axiosInstance.get(`/purchase-payments${query}`);
        return response.data;
    },
    getPaymentById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-payments/${id}${query}`);
        return response.data;
    },
    updatePayment: async (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.put(`/purchase-payments/${id}${query}`, data);
        return response.data;
    },
    deletePayment: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/purchase-payments/${id}${query}`);
        return response.data;
    },
    getVendorAdvance: async (vendorId, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-payments/vendor-advance/${vendorId}${query}`);
        return response.data;
    },
    getNextNumber: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-payments/next-number${query}`);
        return response.data;
    }
};

export default purchasePaymentService;
