import React, { useState, useRef, useEffect, useContext } from 'react';
import { Upload, User, Save, Lock, Loader2 } from 'lucide-react';
import profileService from '../../../../services/profileService';
import passwordRequestService from '../../../../api/passwordRequestService';
import { AuthContext } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';
import './ProfileSettings.css';

const ProfileSettings = () => {
    const { updateCurrentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [personalInfo, setPersonalInfo] = useState({
        name: '',
        email: '',
        avatar: ''
    });
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [requestingReset, setRequestingReset] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await profileService.getProfile();
            setPersonalInfo({
                name: data.name,
                email: data.email,
                avatar: data.avatar || ''
            });
            if (data.avatar) {
                setLogoPreview(data.avatar);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Image size should be less than 2MB');
                return;
            }
            // Use URL.createObjectURL for preview (Binary/Blob) instead of Base64
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);
            setPersonalInfo({ ...personalInfo, avatarFile: file });
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handlePersonalInfoSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await profileService.updateProfile(personalInfo);
            toast.success(res.message);
            updateCurrentUser(res.user);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating profile');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        try {
            const res = await profileService.changePassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            toast.success(res.message);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error changing password');
        }
    };

    const handleRequestAdminReset = async () => {
        try {
            setRequestingReset(true);
            const res = await passwordRequestService.create();
            toast.success(res.message || 'Password reset request submitted to your administrator!');
        } catch (error) {
            console.error('Error submitting password reset request:', error);
            toast.error(error.response?.data?.message || 'Failed to submit reset request');
        } finally {
            setRequestingReset(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="profile-settings-page">
            {/* Personal Info Section */}
            <div className="profile-card">
                <div className="card-header-line">
                    <h2 className="card-title">Personal Info</h2>
                </div>

                <form className="form-content" onSubmit={handlePersonalInfoSubmit}>
                    <div className="form-row">
                        <div className="form-group half">
                            <label>Name<span className="required">*</span></label>
                            <input
                                type="text"
                                value={personalInfo.name}
                                onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                                placeholder="Enter Name"
                                required
                            />
                        </div>
                        <div className="form-group half">
                            <label>Email<span className="required">*</span></label>
                            <input
                                type="email"
                                value={personalInfo.email}
                                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                                placeholder="Enter Email"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Avatar</label>
                        <div className="avatar-upload-container">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                            />
                            <button type="button" className="btn-choose-file" onClick={handleUploadClick}>
                                <Upload size={16} /> Choose file here
                            </button>

                            <div className="avatar-preview">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Avatar" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            <p className="upload-help">Please upload a valid image file. Size of image should not be more than 2MB.</p>
                        </div>
                    </div>

                    <div className="form-actions right">
                        <button type="submit" className="btn-save green">Save Changes</button>
                    </div>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="profile-card">
                <div className="card-header-line">
                    <h2 className="card-title">Change Password</h2>
                </div>

                <form className="form-content" onSubmit={handlePasswordSubmit}>
                    <div className="form-row">
                        <div className="form-group half">
                            <label>Old Password<span className="required">*</span></label>
                            <input
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                placeholder="Enter Old Password"
                                required
                            />
                        </div>
                        <div className="form-group half">
                            <label>New Password<span className="required">*</span></label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Enter Your Password"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label>Confirm New Password<span className="required">*</span></label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Confirm New Password"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-actions right">
                        <button type="submit" className="btn-save green">Change Password</button>
                    </div>

                    <div style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                Forgot your current password?
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                Submit a reset request to your company administrator.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRequestAdminReset}
                            disabled={requestingReset}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Lock size={13} />
                            {requestingReset ? 'Submitting...' : 'Request Admin Reset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
