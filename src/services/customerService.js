import axiosInstance from '../api/axiosInstance';
import GetCompanyId from '../api/GetCompanyId';

const customerService = {
    // Create new customer
    createCustomer: async (customerData) => {
        try {
            const companyId = customerData?.companyId || GetCompanyId();
            const payload = { ...customerData };
            if (companyId && !payload.companyId) {
                payload.companyId = parseInt(companyId);
            }
            const response = await axiosInstance.post('/customers', payload);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get all customers
    getAllCustomers: async (companyId) => {
        try {
            const cId = companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.get(`/customers${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get customer by ID
    getCustomerById: async (id, companyId) => {
        try {
            const cId = companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.get(`/customers/${id}${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Update customer
    updateCustomer: async (id, customerData, companyId) => {
        try {
            const cId = companyId || customerData?.companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.put(`/customers/${id}${query}`, customerData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Delete customer
    deleteCustomer: async (id, companyId) => {
        try {
            const cId = companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.delete(`/customers/${id}${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Aliases
    getAll: async (companyId) => {
        return customerService.getAllCustomers(companyId);
    },

    getCustomers: async (companyId) => {
        return customerService.getAllCustomers(companyId);
    },

    getById: async (id, companyId) => {
        return customerService.getCustomerById(id, companyId);
    },

    getStatement: async (id, companyId, params = {}) => {
        try {
            const cId = companyId || GetCompanyId();
            const queryParams = cId ? { ...params, companyId: cId } : params;
            const response = await axiosInstance.get(`/customers/${id}/statement`, { params: queryParams });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    recalculateBalance: async (id, companyId) => {
        try {
            const cId = companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.post(`/customers/${id}/recalculate${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Recalculate ALL customer balances from transaction history (fixes stale data)
    recalculateAllBalances: async (companyId) => {
        try {
            const cId = companyId || GetCompanyId();
            const query = cId ? `?companyId=${cId}` : '';
            const response = await axiosInstance.post(`/customers/recalculate-all${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
};

export default customerService;
