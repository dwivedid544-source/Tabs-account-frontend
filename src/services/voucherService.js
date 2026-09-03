import api from '../api/axios';

const createVoucher = async (voucherData) => {
    const response = await api.post('/vouchers', voucherData);
    return response.data;
};

const getVouchers = async (companyId) => {
    const params = companyId ? { companyId: companyId } : {};
    const response = await api.get('/vouchers', { params });
    return response.data;
};

const getVoucher = async (id) => {
    const response = await api.get(`/vouchers/${id}`);
    return response.data;
};

const updateVoucher = async (id, voucherData) => {
    const response = await api.put(`/vouchers/${id}`, voucherData);
    return response.data;
};

const deleteVoucher = async (id) => {
    const response = await api.delete(`/vouchers/${id}`);
    return response.data;
};

const getNextNumber = async (companyId) => {
    const params = companyId ? { companyId: companyId } : {};
    const response = await api.get('/vouchers/next-number', { params });
    return response.data;
};

const voucherService = {
    createVoucher,
    getVouchers,
    getVoucher,
    updateVoucher,
    deleteVoucher,
    getNextNumber
};

export default voucherService;
