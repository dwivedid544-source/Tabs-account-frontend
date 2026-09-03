import api from '../api/axios';

// Accounts
const createAccount = async (accountData) => {
    const response = await api.post('/coa', accountData);
    return response.data;
};

const getAccounts = async (companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get('/coa', { params });
    return response.data;
};

const getAccount = async (id) => {
    const response = await api.get(`/coa/${id}`);
    return response.data;
};

const deleteAccount = async (id) => {
    const response = await api.delete(`/coa/${id}`);
    return response.data;
};

// Ledgers
const createLedger = async (ledgerData) => {
    const response = await api.post('/ledgers', ledgerData);
    return response.data;
};

const getLedgers = async (companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const response = await api.get('/ledgers', { params });
    return response.data;
};

const getLedger = async (id) => {
    const response = await api.get(`/ledgers/${id}`);
    return response.data;
};

const accountingService = {
    createAccount,
    getAccounts,
    getAccount,
    deleteAccount,
    createLedger,
    getLedgers,
    getLedger,
};

export default accountingService;
