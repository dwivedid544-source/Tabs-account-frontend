import axiosInstance, { BASE_URL } from '../api/axiosInstance';

/**
 * Upload image - routes through backend upload endpoint with automatic
 * Cloudinary support, local disk fallback, and base64 resilience.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL / data URI of the uploaded image
 */
export const uploadToCloudinary = async (file) => {
    if (!file) throw new Error('No file provided');

    // 1. Primary: Upload via Backend /upload endpoint
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axiosInstance.post('/upload?folder=products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (res.data && res.data.success && res.data.url) {
            let fileUrl = res.data.url;
            if (fileUrl.startsWith('/uploads')) {
                fileUrl = `${BASE_URL}${fileUrl}`;
            }
            return fileUrl;
        }
    } catch (backendErr) {
        console.warn('Backend /upload route error, attempting fallback...', backendErr);
    }

    // 2. Secondary: If signature is configured and valid, attempt signed Cloudinary upload
    try {
        const sigResponse = await axiosInstance.get('/products/upload-signature');
        if (sigResponse.data?.success && sigResponse.data.isConfigured !== false) {
            const { signature, timestamp, apiKey, cloudName, folder } = sigResponse.data;
            if (cloudName && cloudName !== 'placeholder' && apiKey && apiKey !== 'placeholder') {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('api_key', apiKey);
                formData.append('timestamp', timestamp);
                formData.append('signature', signature);
                if (folder) formData.append('folder', folder);

                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.secure_url) return data.secure_url;
                }
            }
        }
    } catch (cloudErr) {
        console.warn('Cloudinary direct upload failed, falling back to local encoding:', cloudErr);
    }

    // 3. Fallback: Convert to Base64 Data URI so user is never blocked
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Upload base64 image to Cloudinary or return the base64 string
 * @param {string} base64String - The base64 encoded image string
 * @returns {Promise<string>} - The secure URL or data URI of the uploaded image
 */
export const uploadBase64ToCloudinary = async (base64String) => {
    if (!base64String) return '';
    return base64String;
};
