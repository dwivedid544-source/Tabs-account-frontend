import api from '../api/axios';

const getRoles = async (companyId) => {
    const url = companyId ? `/roles?companyId=${companyId}` : '/roles';
    const response = await api.get(url);
    return response.data;
};

const createRole = async (data) => {
    const response = await api.post('/roles', data);
    return response.data;
};

const updateRole = async (id, data) => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
};

const deleteRole = async (id) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
};

const roleService = {
    getRoles,
    createRole,
    updateRole,
    deleteRole
};

export default roleService;
