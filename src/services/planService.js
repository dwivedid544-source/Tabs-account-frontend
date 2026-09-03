import axiosInstance from '../api/axiosInstance';

const planService = {
    getPlans: async () => {
        const response = await axiosInstance.get('/plans');
        return response.data;
    },
    getPlanById: async (id) => {
        const response = await axiosInstance.get(`/plans/${id}`);
        return response.data;
    },
    createPlan: async (planData) => {
        const response = await axiosInstance.post('/plans', planData);
        return response.data;
    },
    updatePlan: async (id, planData) => {
        const response = await axiosInstance.put(`/plans/${id}`, planData);
        return response.data;
    },
    deletePlan: async (id) => {
        const response = await axiosInstance.delete(`/plans/${id}`);
        return response.data;
    }
};

export default planService;
