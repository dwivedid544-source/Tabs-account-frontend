import axios from 'axios';
import { loaderService } from '../services/loaderService';
import toast from 'react-hot-toast';

// const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
// const BASE_URL = isLocal ? 'http://localhost:8080' : 'https://tabaccounting-production.up.railway.app';
// const BASE_URL = 'http://localhost:8080';
const BASE_URL = 'https://tabaccounting-production.up.railway.app';

const axiosInstance = axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export { BASE_URL };

// Request interceptor to add the access token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Assuming token is stored as 'token'
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (!config.headers['X-No-Loader']) {
            loaderService.show(); // Show loader on request
        }
        return config;
    },
    (error) => {
        if (!error.config || !error.config.headers || !error.config.headers['X-No-Loader']) {
            loaderService.hide(); // Hide loader on request error
        }
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
    (response) => {
        if (!response.config.headers || !response.config.headers['X-No-Loader']) {
            loaderService.hide(); // Hide loader on successful response
        }
        return response;
    },
    (error) => {
        if (!error.config || !error.config.headers || !error.config.headers['X-No-Loader']) {
            loaderService.hide(); // Hide loader on response error
        }

        const isLoginPage = window.location.pathname === '/login';
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/auth/login');
        const status = error.response?.status;
        const msg = error.response?.data?.message || '';

        const isTokenError = status === 401 || msg === 'Invalid or expired token' || msg === 'Access token required';
        const isPlanExpired = status === 403 && error.response?.data?.isExpired;

        if (!isLoginPage && !isLoginRequest) {
            if (isTokenError) {
                // Silently clear expired / invalid token
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Only redirect to login if user is on a protected route
                const publicPaths = ['/', '/login', '/overview', '/features', '/pricing', '/aboutus', '/contact', '/careers', '/how-it-works', '/privacy-policy', '/terms-conditions'];
                const isPublicRoute = publicPaths.includes(window.location.pathname) || window.location.pathname.startsWith('/view/');

                if (!isPublicRoute) {
                    window.location.href = '/login';
                }
            } else if (isPlanExpired) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                toast.error(msg || 'Your company plan has expired. Please contact super admin to renew your plan.');
                window.location.href = '/login';
            } else if (error.response && error.response.data && error.response.data.message) {
                // Show backend error message for legitimate business errors (skip token error popups)
                if (msg !== 'Invalid or expired token' && msg !== 'Access token required') {
                    toast.error(error.response.data.message, {
                        duration: 5000,
                        style: {
                            maxWidth: '500px',
                        },
                    });
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;