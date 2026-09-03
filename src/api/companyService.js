import axiosInstance from './axiosInstance';

const companyService = {
    getById: (id) => axiosInstance.get(`/companies/${id}`),
    update: (id, data) => {
        // Since we might have files, we should use FormData
        // But if data is already FormData, just send it
        return axiosInstance.put(`/companies/${id}`, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    getNextNumber: (id, type) => axiosInstance.get(`/companies/${id}/next-number?type=${type}`),
    getNumberingSettings: (id) => axiosInstance.get(`/companies/${id}/numbering-settings`),
    updateNumberingSettings: (id, settings) => axiosInstance.put(`/companies/${id}/numbering-settings`, { settings }),
    getUserCompanies: () => axiosInstance.get('/companies/user-companies'),
    createUserCompany: (data) => {
        return axiosInstance.post('/companies/user-company', data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

export default companyService;
