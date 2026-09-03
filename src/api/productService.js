import axiosInstance from './axiosInstance';

const getProducts = async (companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/products${query}`);
    return response.data;
};

const getProductById = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/products/${id}${query}`);
    return response.data;
};

const createProduct = async (data) => {
    const response = await axiosInstance.post('/products', data);
    return response.data;
};

const updateProduct = async (id, data) => {
    const response = await axiosInstance.put(`/products/${id}`, data);
    return response.data;
};

const deleteProduct = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.delete(`/products/${id}${query}`);
    return response.data;
};

const productService = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.get(`/products${query}`);
    },
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};

export default productService;
