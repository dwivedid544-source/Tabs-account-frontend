import axiosInstance from './axiosInstance';

const getWarehouses = async (companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/warehouse${query}`);
    return response.data;
};

const getWarehouseById = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/warehouse/${id}${query}`);
    return response.data;
};

const createWarehouse = async (data) => {
    const response = await axiosInstance.post('/warehouse', data);
    return response.data;
};

const updateWarehouse = async (id, data) => {
    const response = await axiosInstance.put(`/warehouse/${id}`, data);
    return response.data;
};

const deleteWarehouse = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.delete(`/warehouse/${id}${query}`);
    return response.data;
};

const warehouseService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.get(`/warehouse${query}`);
    },
    getWarehouses,
    getWarehouseById,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse
};

export default warehouseService;
