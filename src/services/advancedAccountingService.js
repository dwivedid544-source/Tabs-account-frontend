import axiosInstance from '../api/axiosInstance';
import GetCompanyId from '../api/GetCompanyId';

const advancedAccountingService = {
    // 1. Currency Revaluation
    getCurrencyRevaluationPreview: async (date, rates = {}) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/currency-revaluation/preview', {
            params: { companyId, date }
        });
        return response.data;
    },

    postCurrencyRevaluation: async (payload) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/currency-revaluation/post', {
            ...payload,
            companyId
        });
        return response.data;
    },

    // 2. Fiscal Year Rollover
    getFiscalRolloverPreview: async (fiscalYear) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/fiscal-rollover/preview', {
            params: { companyId, fiscalYear }
        });
        return response.data;
    },

    executeFiscalRollover: async (payload) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/fiscal-rollover/execute', {
            ...payload,
            companyId
        });
        return response.data;
    },

    // 3. Fixed Assets
    getFixedAssets: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/assets', {
            params: { companyId }
        });
        return response.data;
    },

    createFixedAsset: async (data) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/assets', {
            ...data,
            companyId
        });
        return response.data;
    },

    runDepreciation: async (data = {}) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/assets/depreciate', {
            ...data,
            companyId
        });
        return response.data;
    },

    getAssetDepreciationSchedule: async (assetId) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get(`/advanced-accounting/assets/${assetId}/schedule`, {
            params: { companyId }
        });
        return response.data;
    },

    deleteFixedAsset: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.delete(`/advanced-accounting/assets/${id}`, {
            params: { companyId }
        });
        return response.data;
    },

    // 4. Budgets & Forecasts
    getBudgets: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/budgets', {
            params: { companyId }
        });
        return response.data;
    },

    createBudget: async (data) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/budgets', {
            ...data,
            companyId
        });
        return response.data;
    },

    getBudgetVariance: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get(`/advanced-accounting/budgets/${id}/variance`, {
            params: { companyId }
        });
        return response.data;
    },

    getCashFlowForecast: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/cash-flow-forecast', {
            params: { companyId }
        });
        return response.data;
    },

    // 5. Recurring Transactions
    getRecurringTemplates: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.get('/advanced-accounting/recurring', {
            params: { companyId }
        });
        return response.data;
    },

    createRecurringTemplate: async (data) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/recurring', {
            ...data,
            companyId
        });
        return response.data;
    },

    runPendingRecurring: async () => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post('/advanced-accounting/recurring/run-pending', {
            companyId
        });
        return response.data;
    },

    runSingleRecurring: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.post(`/advanced-accounting/recurring/${id}/run-now`, {
            companyId
        });
        return response.data;
    },

    toggleRecurringStatus: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.patch(`/advanced-accounting/recurring/${id}/toggle-status`, {
            companyId
        });
        return response.data;
    },

    deleteRecurringTemplate: async (id) => {
        const companyId = GetCompanyId();
        const response = await axiosInstance.delete(`/advanced-accounting/recurring/${id}`, {
            params: { companyId }
        });
        return response.data;
    }
};

export default advancedAccountingService;
