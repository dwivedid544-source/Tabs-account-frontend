import axiosInstance from '../api/axiosInstance';
import GetCompanyId from '../api/GetCompanyId';

const bankingService = {
    // 1. Bank Accounts CRUD
    getBankAccounts: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/banking/accounts', {
            params: { companyId }
        });
        return response.data;
    },

    createBankAccount: async (data) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/banking/accounts', {
            ...data,
            companyId
        });
        return response.data;
    },

    updateBankAccount: async (id, data) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.put(`/banking/accounts/${id}`, {
            ...data,
            companyId
        });
        return response.data;
    },

    deleteBankAccount: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.delete(`/banking/accounts/${id}`, {
            data: { companyId }
        });
        return response.data;
    },

    // 2. Statement Import
    importBankStatement: async (bankAccountId, rows) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/banking/import', {
            companyId,
            bankAccountId,
            rows
        });
        return response.data;
    },

    // 3. Bank Feeds & Transaction Matching
    getBankTransactions: async (filters = {}) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/banking/transactions', {
            params: { companyId, ...filters }
        });
        return response.data;
    },

    findMatches: async (transactionId) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get(`/banking/transactions/${transactionId}/matches`, {
            params: { companyId }
        });
        return response.data;
    },

    matchTransaction: async (transactionId, payload) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post(`/banking/transactions/${transactionId}/match`, {
            ...payload,
            companyId
        });
        return response.data;
    },

    categorizeTransaction: async (transactionId, payload) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post(`/banking/transactions/${transactionId}/categorize`, {
            ...payload,
            companyId
        });
        return response.data;
    },

    unmatchTransaction: async (transactionId) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post(`/banking/transactions/${transactionId}/unmatch`, {
            companyId
        });
        return response.data;
    },

    // 4. Bank Reconciliation
    getReconciliationData: async (bankAccountId, statementDate, statementEndingBalance) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/banking/reconciliation/preview', {
            params: {
                companyId,
                bankAccountId,
                statementDate,
                statementEndingBalance
            }
        });
        return response.data;
    },

    toggleClearTransaction: async (transactionId, isCleared) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/banking/reconciliation/toggle-clear', {
            companyId,
            transactionId,
            isCleared
        });
        return response.data;
    },

    commitReconciliation: async (payload) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/banking/reconciliation/commit', {
            ...payload,
            companyId
        });
        return response.data;
    },

    getReconciliationHistory: async (bankAccountId = null) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/banking/reconciliation/history', {
            params: {
                companyId,
                bankAccountId: bankAccountId || undefined
            }
        });
        return response.data;
    }
};

export default bankingService;
