import axiosInstance from '../api/axiosInstance';

const getDashboardStats = async () => {
    const response = await axiosInstance.get('/superadmin/dashboard/stats');
    return response.data;
};

const getCompanyStats = async () => {
    const response = await axiosInstance.get('/superadmin/dashboard/company-stats');
    return response.data;
};

const getAnnouncements = async () => {
    const response = await axiosInstance.get('/superadmin/dashboard/announcements');
    return response.data;
};

const createAnnouncement = async (data) => {
    const response = await axiosInstance.post('/superadmin/dashboard/announcements', data);
    return response.data;
};

const updateAnnouncement = async (id, data) => {
    const response = await axiosInstance.put(`/superadmin/dashboard/announcements/${id}`, data);
    return response.data;
};

const deleteAnnouncement = async (id) => {
    const response = await axiosInstance.delete(`/superadmin/dashboard/announcements/${id}`);
    return response.data;
};

export default {
    getDashboardStats,
    getCompanyStats,
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
};
