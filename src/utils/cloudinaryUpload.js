import axiosInstance, { BASE_URL } from '../api/axiosInstance';

/**
 * VPS Local Storage File Upload Utility
 *
 * Direct upload to VPS local disk via /api/upload.
 * Stores files on the server's filesystem under /uploads/<folder>/.
 *
 * @param {File} file - The file to upload (image, pdf, document, etc.)
 * @param {string} [folder='uploads'] - Subfolder: 'products' | 'companies' | 'users' | 'vendors' | 'customers' | 'invoices' | 'documents'
 * @returns {Promise<string>} - Absolute URL or base64 data URI of the uploaded file
 */
export const uploadToCloudinary = async (file, folder = 'uploads') => {
    if (!file) throw new Error('No file provided');

    // 1. Primary: Direct upload to VPS backend local storage
    try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await axiosInstance.post(`/upload?folder=${encodeURIComponent(folder)}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (res.data && res.data.success && res.data.url) {
            let fileUrl = res.data.url;
            // If the backend returned a relative /uploads path, prepend the base server URL
            if (fileUrl.startsWith('/uploads')) {
                const cleanBase = (BASE_URL || window.location.origin).replace(/\/+$/, '');
                fileUrl = `${cleanBase}${fileUrl}`;
            }
            return fileUrl;
        }
    } catch (backendErr) {
        console.warn('[storage] Backend /api/upload error, falling back to local base64:', backendErr?.message || backendErr);
    }

    // 2. Resilience Fallback: Convert to Base64 Data URI so user action is never blocked
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(new Error('Failed to read file: ' + err.message));
        reader.readAsDataURL(file);
    });
};

// Aliases for modern naming & backwards compatibility
export const uploadToFileStorage = uploadToCloudinary;

/**
 * Handle base64 image strings — returns string as-is
 * @param {string} base64String - The base64 encoded image string
 * @returns {Promise<string>}
 */
export const uploadBase64ToCloudinary = async (base64String) => {
    if (!base64String) return '';
    return base64String;
};

export default uploadToCloudinary;
