import axiosInstance from './axiosInstance';

const getServices = async (companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/services${query}`);
    return response.data;
};

const getServiceById = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.get(`/services/${id}${query}`);
    return response.data;
};

const createService = async (serviceData) => {
    const response = await axiosInstance.post('/services', serviceData);
    return response.data;
};

const updateService = async (id, serviceData, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.put(`/services/${id}${query}`, serviceData);
    return response.data;
};

const deleteService = async (id, companyId) => {
    const query = companyId ? `?companyId=${companyId}` : '';
    const response = await axiosInstance.delete(`/services/${id}${query}`);
    return response.data;
};

const servicesApi = {
    getAll: (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        return axiosInstance.get(`/services${query}`);
    },
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService
};

export default servicesApi;
