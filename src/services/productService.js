import axiosInstance from "../api/axiosInstance";

const productService = {
    getProducts: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/products${query}`);
        return response.data;
    },
    getProductById: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/products/${id}${query}`);
        return response.data;
    },
    createProduct: async (data) => {
        const response = await axiosInstance.post('/products', data);
        return response.data;
    },
    updateProduct: async (id, data) => {
        const response = await axiosInstance.put(`/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.delete(`/products/${id}${query}`);
        return response.data;
    }
};

export default productService;
