import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import axiosInstance from '../api/axiosInstance';
import { resolveLogoUrl } from '../utils/logoUrl';

export const AuthContext = createContext();

const normalizeUserData = (user) => {
    if (!user) return user;
    const normalized = { ...user };
    if (normalized.company && normalized.company.logo) {
        normalized.company = {
            ...normalized.company,
            logo: resolveLogoUrl(normalized.company.logo)
        };
    }
    if (Array.isArray(normalized.companies)) {
        normalized.companies = normalized.companies.map(c => ({
            ...c,
            logo: resolveLogoUrl(c.logo)
        }));
    }
    return normalized;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(undefined);

    useEffect(() => {
        const user = normalizeUserData(authService.getCurrentUser());
        if (user) {
            setCurrentUser(user);
        } else {
            setCurrentUser(null);
        }
    }, []);

    const login = async (email, password) => {
        const response = await authService.login({ email, password });
        const normalized = normalizeUserData(response.user);
        setCurrentUser(normalized);
        return response;
    };

    const register = async (name, email, password, company_id) => {
        const response = await authService.register({ name, email, password, company_id });
        const normalized = normalizeUserData(response.user);
        setCurrentUser(normalized);
        return response;
    };

    const logout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    const updateCurrentUser = (userData) => {
        const normalized = normalizeUserData(userData);
        localStorage.setItem('user', JSON.stringify(normalized));
        setCurrentUser(normalized);
    };

    const switchCompany = async (companyId) => {
        const response = await axiosInstance.post('/auth/switch-company', { companyId });
        if (response.data && response.data.token) {
            const normalized = normalizeUserData(response.data.user);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(normalized));
            setCurrentUser(normalized);
        }
        return response.data;
    };

    const refreshCompanies = async () => {
        try {
            const res = await axiosInstance.get('/companies/user-companies');
            if (res.data && res.data.companies && currentUser) {
                const mappedCompanies = res.data.companies.map(c => ({
                    ...c,
                    logo: resolveLogoUrl(c.logo)
                }));
                const updatedUser = { ...currentUser, companies: mappedCompanies };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
            }
        } catch (e) {
            console.error("Error refreshing companies:", e);
        }
    };

    const hasPermission = (permission) => {
        if (!currentUser) return false;
        // SUPERADMIN and COMPANY (Owner) have full access
        if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'COMPANY') return true;
        
        if (!permission) return true;

        const userPerms = currentUser.permissions || [];

        // Direct match
        if (userPerms.includes(permission)) return true;

        // Manage fallback: If user has "manage <module>", they have all access to that module (create, edit, delete, view, etc.)
        const parts = permission.split(' ');
        if (parts.length >= 2) {
            const action = parts[0];
            const moduleName = parts.slice(1).join(' '); // e.g. "uom" or "sales quotation"
            
            const manageKey = `manage ${moduleName}`;
            if (userPerms.includes(manageKey)) return true;
            
            // View fallback: if user has any specific permission for a module, they must be able to view/show it
            if (action === 'view' || action === 'show') {
                const hasAnyAccess = userPerms.some(p => p.endsWith(` ${moduleName}`));
                if (hasAnyAccess) return true;
            }
        }

        return false;
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, register, logout, updateCurrentUser, hasPermission, switchCompany, refreshCompanies }}>
            {children}
        </AuthContext.Provider>
    );
};
