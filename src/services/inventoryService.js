import axiosInstance from '../api/axiosInstance';

const inventoryService = {
    // --- Warehouse Operations ---
    createWarehouse: async (data, companyId) => {
        const payload = { ...data, companyId };
        const response = await axiosInstance.post('/warehouse', payload);
        return response.data;
    },

    getWarehouses: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/warehouse${query}`);
        return response.data;
    },

    getWarehouseById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/warehouse/${id}${query}`);
        return response.data;
    },

    updateWarehouse: async (id, data, companyId) => {
        const payload = { ...data, companyId };
        const response = await axiosInstance.put(`/warehouse/${id}`, payload);
        return response.data;
    },

    deleteWarehouse: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/warehouse/${id}${query}`);
        return response.data;
    }
};

export default inventoryService;
