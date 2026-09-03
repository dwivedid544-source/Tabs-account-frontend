import axiosInstance from '../api/axiosInstance';

const goodsReceiptNoteService = {
    createGRN: async (data) => {
        const response = await axiosInstance.post('/grns', data);
        return response.data;
    },
    getGRNs: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/grns${query}`);
        return response.data;
    },
    getGRNById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/grns/${id}${query}`);
        return response.data;
    },
    updateGRN: async (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.put(`/grns/${id}${query}`, data);
        return response.data;
    },
    deleteGRN: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/grns/${id}${query}`);
        return response.data;
    },
    convertGRN: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.post(`/grns/${id}/convert${query}`);
        return response.data;
    },
    convertMultiple: async (grnIds, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.post(`/grns/convert-multiple${query}`, { grnIds });
        return response.data;
    }
};

export default goodsReceiptNoteService;
