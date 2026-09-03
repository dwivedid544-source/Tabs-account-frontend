import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(undefined);

    useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else {
            setCurrentUser(null);
        }
    }, []);

    const login = async (email, password) => {
        const response = await authService.login({ email, password });
        setCurrentUser(response.user);
        return response;
    };

    const register = async (name, email, password, company_id) => {
        const response = await authService.register({ name, email, password, company_id });
        setCurrentUser(response.user);
        return response;
    };

    const logout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    const updateCurrentUser = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentUser(userData);
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
        <AuthContext.Provider value={{ currentUser, login, register, logout, updateCurrentUser, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};
