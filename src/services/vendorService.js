import axiosInstance from '../api/axiosInstance';

const vendorService = {
    // Create new vendor
    createVendor: async (vendorData) => {
        try {
            const response = await axiosInstance.post('/vendors', vendorData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get all vendors
    getAllVendors: async (companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.get(`/vendors${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get vendor by ID
    getVendorById: async (id, companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.get(`/vendors/${id}${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Update vendor
    updateVendor: async (id, vendorData, companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.put(`/vendors/${id}${query}`, vendorData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Delete vendor
    deleteVendor: async (id, companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.delete(`/vendors/${id}${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get vendor statement/ledger
    getVendorStatement: async (id, companyId) => {
        try {
            const query = companyId ? `?companyId=${companyId}` : '';
            const response = await axiosInstance.get(`/vendors/statement/${id}${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Aliases
    getVendors: async (companyId) => {
        return vendorService.getAllVendors(companyId);
    },

    getAll: async (companyId) => {
        return vendorService.getAllVendors(companyId);
    },

    getById: async (id, companyId) => {
        return vendorService.getVendorById(id, companyId);
    },

    getStatement: async (id, companyId) => {
        return vendorService.getVendorStatement(id, companyId);
    },

    // Recalculate ALL vendor balances from transaction history (fixes stale data)
    recalculateAllBalances: async () => {
        try {
            const response = await axiosInstance.post('/vendors/recalculate-all');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
};

export default vendorService;
