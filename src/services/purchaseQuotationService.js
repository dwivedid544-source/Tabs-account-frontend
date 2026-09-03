import axiosInstance from '../api/axiosInstance';

const purchaseQuotationService = {
    createQuotation: async (data) => {
        const response = await axiosInstance.post('/purchase-quotations', data);
        return response.data;
    },
    getQuotations: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-quotations${query}`);
        return response.data;
    },
    getQuotationById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/purchase-quotations/${id}${query}`);
        return response.data;
    },
    updateQuotation: async (id, data) => {
        const response = await axiosInstance.put(`/purchase-quotations/${id}`, data);
        return response.data;
    },
    deleteQuotation: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/purchase-quotations/${id}${query}`);
        return response.data;
    },
    convertQuotation: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.post(`/purchase-quotations/${id}/convert${query}`);
        return response.data;
    }
};

export default purchaseQuotationService;
