import axiosInstance from '../api/axiosInstance';

const chartOfAccountsService = {
    // Fetch the full chart of accounts tree
    getChartOfAccounts: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/chart-of-accounts${query}`);
        return response.data;
    },

    // Initialize default COA (if needed)
    initializeCOA: async () => {
        const response = await axiosInstance.post('/chart-of-accounts/initialize');
        return response.data;
    },

    getAccountTypes: async () => {
        const response = await axiosInstance.get('/chart-of-accounts/types');
        return response.data;
    },

    // --- Ledger Operations ---

    getAllLedgers: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/chart-of-accounts/ledgers${query}`);
        return response.data;
    },

    createLedger: async (ledgerData) => {
        const response = await axiosInstance.post('/chart-of-accounts/ledgers', ledgerData);
        return response.data;
    },

    updateLedger: async (id, ledgerData) => {
        const response = await axiosInstance.put(`/chart-of-accounts/ledgers/${id}`, ledgerData);
        return response.data;
    },

    deleteLedger: async (id) => {
        const response = await axiosInstance.delete(`/chart-of-accounts/ledgers/${id}`);
        return response.data;
    },

    createSubGroup: async (subGroupData) => {
        const response = await axiosInstance.post('/chart-of-accounts/subgroups', subGroupData);
        return response.data;
    },

    getLedgerById: async (id) => {
        const response = await axiosInstance.get(`/chart-of-accounts/ledgers/${id}`);
        return response.data;
    },

    getLedgerTransactions: async (id, companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/chart-of-accounts/ledgers/${id}/transactions${query}`);
        return response.data;
    },

    // --- Bank Transfer Operations ---

    createTransfer: async (transferData) => {
        const user = JSON.parse(localStorage.getItem('user'));
        const payload = { ...transferData, companyId: user?.company?.id };
        const response = await axiosInstance.post('/bank-transfers', payload);
        return response.data;
    },

    getTransfers: async () => {
        const response = await axiosInstance.get('/bank-transfers');
        return response.data;
    },

    updateTransfer: async (id, transferData) => {
        const response = await axiosInstance.put(`/bank-transfers/${id}`, transferData);
        return response.data;
    },

    deleteTransfer: async (id) => {
        const response = await axiosInstance.delete(`/bank-transfers/${id}`);
        return response.data;
    },

    // --- Expense Operations ---

    createExpense: async (expenseData, companyId) => {
        const payload = { ...expenseData, companyId: companyId };
        const response = await axiosInstance.post('/expenses', payload);
        return response.data;
    },

    getExpenses: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/expenses${query}`);
        return response.data;
    },

    updateExpense: async (voucherNumber, expenseData, companyId) => {
        const payload = { ...expenseData, companyId: companyId };
        const response = await axiosInstance.put(`/expenses/${voucherNumber}`, payload);
        return response.data;
    },

    deleteExpense: async (voucherNumber) => {
        const response = await axiosInstance.delete(`/expenses/${voucherNumber}`);
        return response.data;
    },

    // --- Income Operations ---

    createIncome: async (incomeData, companyId) => {
        const payload = { ...incomeData, companyId: companyId };
        const response = await axiosInstance.post('/income', payload);
        return response.data;
    },

    getIncome: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/income${query}`);
        return response.data;
    },

    updateIncome: async (voucherNumber, incomeData, companyId) => {
        const payload = { ...incomeData, companyId: companyId };
        const response = await axiosInstance.put(`/income/${voucherNumber}`, payload);
        return response.data;
    },

    deleteIncome: async (voucherNumber) => {
        const response = await axiosInstance.delete(`/income/${voucherNumber}`);
        return response.data;
    },

    // --- Contra Operations ---

    createContra: async (contraData, companyId) => {
        const payload = { ...contraData, companyId: companyId };
        const response = await axiosInstance.post('/contra', payload);
        return response.data;
    },

    getContra: async (companyId) => {
        const query = companyId ? `?companyId=${companyId}` : '';
        const response = await axiosInstance.get(`/contra${query}`);
        return response.data;
    },

    updateContra: async (voucherNumber, contraData, companyId) => {
        const payload = { ...contraData, companyId: companyId };
        const response = await axiosInstance.put(`/contra/${voucherNumber}`, payload);
        return response.data;
    },

    deleteContra: async (voucherNumber) => {
        const response = await axiosInstance.delete(`/contra/${voucherNumber}`);
        return response.data;
    }
};

export default chartOfAccountsService;
