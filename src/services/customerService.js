import axiosInstance from '../api/axiosInstance';

const customerService = {
    // Create new customer
    createCustomer: async (customerData) => {
        try {
            const response = await axiosInstance.post('/customers', customerData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get all customers
    getAllCustomers: async (companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.get(`/customers${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get customer by ID
    getCustomerById: async (id) => {
        try {
            const response = await axiosInstance.get(`/customers/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Update customer
    updateCustomer: async (id, customerData) => {
        try {
            const response = await axiosInstance.put(`/customers/${id}`, customerData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Delete customer
    deleteCustomer: async (id) => {
        try {
            const response = await axiosInstance.delete(`/customers/${id}`);
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
        return customerService.getCustomerById(id);
    },

    getStatement: async (id, companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.get(`/customers/${id}/statement${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    recalculateBalance: async (id) => {
        try {
            const response = await axiosInstance.post(`/customers/${id}/recalculate`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Recalculate ALL customer balances from transaction history (fixes stale data)
    recalculateAllBalances: async () => {
        try {
            const response = await axiosInstance.post('/customers/recalculate-all');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
};

export default customerService;
