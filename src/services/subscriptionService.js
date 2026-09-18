import axiosInstance from '../api/axiosInstance';

const subscriptionService = {
    getStatus: async () => {
        const response = await axiosInstance.get('/company/subscription/status', {
            headers: { 'X-No-Loader': true }
        });
        return response.data;
    },

    getHistory: async () => {
        const response = await axiosInstance.get('/company/subscription/history');
        return response.data;
    },

    getPlans: async () => {
        const response = await axiosInstance.get('/company/subscription/plans');
        return response.data;
    },

    renew: async (data) => {
        const response = await axiosInstance.post('/company/subscription/renew', data);
        return response.data;
    },

    upgrade: async (data) => {
        const response = await axiosInstance.post('/company/subscription/upgrade', data);
        return response.data;
    }
};

export default subscriptionService;
