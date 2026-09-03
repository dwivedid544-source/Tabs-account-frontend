import axiosInstance from '../api/axiosInstance';

const deliverypersonService = {
    getAll: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/deliverypersons${query}`);
        return response.data;
    },
    create: async (data) => {
        const response = await axiosInstance.post('/deliverypersons', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await axiosInstance.put(`/deliverypersons/${id}`, data);
        return response.data;
    },
    delete: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/deliverypersons/${id}${query}`);
        return response.data;
    }
};

export default deliverypersonService;
