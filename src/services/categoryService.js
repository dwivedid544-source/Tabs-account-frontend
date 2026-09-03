import axiosInstance from "../api/axiosInstance";

const categoryService = {
    getCategories: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/categories${query}`);
        return response.data;
    },
    createCategory: async (data) => {
        const response = await axiosInstance.post('/categories', data);
        return response.data;
    },
    updateCategory: async (id, data) => {
        const response = await axiosInstance.put(`/categories/${id}`, data);
        return response.data;
    },
    deleteCategory: async (id) => {
        const response = await axiosInstance.delete(`/categories/${id}`);
        return response.data;
    }
};

export default categoryService;
