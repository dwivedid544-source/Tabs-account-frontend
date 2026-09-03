import api from '../api/axios';

const getUsers = async (companyId) => {
    const url = companyId ? `/users?companyId=${companyId}` : '/users';
    const response = await api.get(url);
    return response.data;
};

const createUser = async (data) => {
    const response = await api.post('/users', data);
    return response.data;
};

const updateUser = async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
};

const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

const userService = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};

export default userService;
