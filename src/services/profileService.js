import axiosInstance from '../api/axiosInstance';

const getProfile = async () => {
    const response = await axiosInstance.get('/profile');
    return response.data;
};

const updateProfile = async (data) => {
    // If data contains a file (avatar), use FormData
    let payload = data;
    if (data.avatarFile) {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('avatar', data.avatarFile);
        payload = formData;
    }

    const response = await axiosInstance.put('/profile/update', payload, {
        headers: {
            'Content-Type': undefined
        }
    });
    return response.data;
};

const changePassword = async (data) => {
    const response = await axiosInstance.put('/profile/change-password', data);
    return response.data;
};

export default {
    getProfile,
    updateProfile,
    changePassword
};
