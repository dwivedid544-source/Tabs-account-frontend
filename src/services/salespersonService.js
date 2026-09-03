import axiosInstance from '../api/axiosInstance';

const salespersonService = {
    getAll: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/salespersons${query}`);
        return response.data;
    },
    create: async (data) => {
        const response = await axiosInstance.post('/salespersons', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await axiosInstance.put(`/salespersons/${id}`, data);
        return response.data;
    },
    delete: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/salespersons/${id}${query}`);
        return response.data;
    }
};

export default salespersonService;
