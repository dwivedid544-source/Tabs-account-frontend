import axiosInstance from './axiosInstance';

const getAll = async (companyId) => {
    const url = companyId ? `/password-requests?companyId=${companyId}` : '/password-requests';
    const response = await axiosInstance.get(url);
    return response.data;
};

// Alias for compatibility
const getRequests = getAll;

const create = async () => {
    const response = await axiosInstance.post('/password-requests');
    return response.data;
};

const updateStatus = async (id, statusOrData) => {
    // Support both (id, 'Approved') and (id, { status: 'Approved', newPassword: ... })
    const payload = typeof statusOrData === 'string' ? { status: statusOrData } : statusOrData;
    const response = await axiosInstance.put(`/password-requests/${id}`, payload);
    return response.data;
};

export default {
    getAll,
    getRequests,
    create,
    updateStatus
};
