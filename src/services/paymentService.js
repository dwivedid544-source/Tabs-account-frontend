import axiosInstance from '../api/axiosInstance';

const getPayments = async () => {
    const response = await axiosInstance.get('/payments');
    return response.data;
};

const getPaymentById = async (id) => {
    const response = await axiosInstance.get(`/payments/${id}`);
    return response.data;
};

const createPayment = async (paymentData) => {
    const response = await axiosInstance.post('/payments', paymentData);
    return response.data;
};

const updatePayment = async (id, paymentData) => {
    const response = await axiosInstance.put(`/payments/${id}`, paymentData);
    return response.data;
};

const deletePayment = async (id) => {
    const response = await axiosInstance.delete(`/payments/${id}`);
    return response.data;
};

export default {
    getPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
