import axiosInstance from "../api/axiosInstance";

const uomService = {
    getUOMs: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/uom${query}`);
        return response.data;
    },
    getUOMById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/uom/${id}${query}`);
        return response.data;
    },
    createUOM: async (data) => {
        const response = await axiosInstance.post('/uom', data);
        return response.data;
    },
    updateUOM: async (id, data, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.put(`/uom/${id}${query}`, data);
        return response.data;
    },
    deleteUOM: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/uom/${id}${query}`);
        return response.data;
    }
};

export default uomService;
