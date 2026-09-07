import { BASE_URL } from '../api/axiosInstance';

/**
 * Resolves a company logo URL, ensuring relative backend upload paths
 * (e.g. /uploads/company_logos/...) are prefixed with the backend server host.
 */
export const resolveLogoUrl = (logoVal) => {
    if (!logoVal || typeof logoVal !== 'string') return null;
    const trimmed = logoVal.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const serverUrl = (BASE_URL || 'https://tabaccounting-production.up.railway.app').replace(/\/+$/, '');
    return `${serverUrl}${cleanPath}`;
};
