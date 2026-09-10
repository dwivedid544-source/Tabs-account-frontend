import { BASE_URL } from '../api/axiosInstance';
import tabAccountsLogo from '../assets/tab-accounts-logo.png';

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

/**
 * Returns a guaranteed valid logo image source, with fallback to default tabAccountsLogo.
 */
export const getCompanyLogoSrc = (logoVal, fallback = tabAccountsLogo) => {
    if (!logoVal) return fallback;
    const resolved = resolveLogoUrl(logoVal);
    return resolved || fallback;
};

export { tabAccountsLogo };
