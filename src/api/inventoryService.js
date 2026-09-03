import axiosInstance from './axiosInstance';

const transferStock = async (data) => {
    const response = await axiosInstance.post('/inventory/transfer', data);
    return response.data;
};

const adjustStock = async (data) => {
    const response = await axiosInstance.post('/inventory/adjust', data);
    return response.data;
};

const getInventoryHistory = async (params) => {
    const response = await axiosInstance.get('/inventory/history', { params });
    return response.data;
};

const inventoryService = {
    transferStock,
    adjustStock,
    getInventoryHistory
};

export default inventoryService;
