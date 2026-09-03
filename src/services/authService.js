import axiosInstance from '../api/axiosInstance';

const register = async (userData) => {
    const response = await axiosInstance.post('/auth/register', userData);
    if (response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

const login = async (userData) => {
    const response = await axiosInstance.post('/auth/login', userData);
    if (response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

const getProfile = async () => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
};

const impersonate = async (companyId) => {
    const response = await axiosInstance.post('/auth/impersonate', { companyId });
    if (response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

const authService = {
    register,
    login,
    logout,
    getCurrentUser,
    getProfile,
    impersonate
};

export default authService;
