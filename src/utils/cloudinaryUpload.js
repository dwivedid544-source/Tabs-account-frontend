import axios from 'axios';
import axiosInstance from '../api/axiosInstance'; // Import your configured axios instance

/**
 * Upload image to Cloudinary (Signed)
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file) => {
    try {
        // 1. Get Signature from Backend
        const sigResponse = await axiosInstance.get('/products/upload-signature');
        if (!sigResponse.data.success) {
            throw new Error('Failed to get upload signature');
        }
        const { signature, timestamp, apiKey, cloudName, folder } = sigResponse.data;

        // 2. Prepare FormData with Signature
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        if (folder) formData.append('folder', folder);

        // 3. Upload to Cloudinary
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64String - The base64 encoded image string
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadBase64ToCloudinary = async (base64String) => {
    const cloudName = 'dw48hcxi5';
    const uploadPreset = 'product_images';

    const formData = new FormData();
    formData.append('file', base64String);
    formData.append('upload_preset', uploadPreset);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error('Failed to upload image to Cloudinary');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};
