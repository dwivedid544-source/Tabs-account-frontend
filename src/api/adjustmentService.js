import axiosInstance from './axiosInstance';

const getAdjustments = async (companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/adjustments${query}`);
    return response.data;
};

const getAdjustmentById = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/adjustments/${id}${query}`);
    return response.data;
};

const createAdjustment = async (data) => {
    const response = await axiosInstance.post('/adjustments', data);
    return response.data;
};

const updateAdjustment = async (id, data) => {
    const response = await axiosInstance.put(`/adjustments/${id}`, data);
    return response.data;
};

const deleteAdjustment = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.delete(`/adjustments/${id}${query}`);
    return response.data;
};

const adjustmentService = {
    getAdjustments,
    getAdjustmentById,
    createAdjustment,
    updateAdjustment,
    deleteAdjustment
};

export default adjustmentService;
