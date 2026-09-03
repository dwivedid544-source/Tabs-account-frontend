import axiosInstance from '../api/axiosInstance';

const getCompanies = async () => {
    const response = await axiosInstance.get('/companies');
    return response.data;
};

const getCompanyById = async (id) => {
    const response = await axiosInstance.get(`/companies/${id}`);
    return response.data;
};

const createCompany = async (formData) => {
    // formData is a FormData object
    const response = await axiosInstance.post('/companies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const updateCompany = async (id, formData) => {
    // formData is a FormData object
    const response = await axiosInstance.put(`/companies/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

const deleteCompany = async (id) => {
    const response = await axiosInstance.delete(`/companies/${id}`);
    return response.data;
};

const companyService = {
    getCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};

export default companyService;
