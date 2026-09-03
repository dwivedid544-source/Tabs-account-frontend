import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, MoreVertical, X, Mail, Calendar, User, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import userService from '../../../services/userService';
import roleService from '../../../services/roleService';
import GetCompanyId from '../../../api/GetCompanyId';
import { toast } from 'react-hot-toast';
import './UserList.css';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../../utils/cropImage';
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../../../config/emailConfig';
import { AuthContext } from '../../../context/AuthContext';

const UserList = () => {
    const { hasPermission } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [loginEnabled, setLoginEnabled] = useState(true);
    const [activeMenu, setActiveMenu] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Disable Modal State
    const [showDisableConfirmModal, setShowDisableConfirmModal] = useState(false);
    const [userToDisable, setUserToDisable] = useState(null);

    // Crop State
    const [showCropModal, setShowCropModal] = useState(false);
    const [activeImg, setActiveImg] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const companyId = GetCompanyId();
            const response = await userService.getUsers(companyId);
            if (response.success) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const companyId = GetCompanyId();
            const response = await roleService.getRoles(companyId);
            if (response.success) {
                setRoles(response.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleMenu = (userId) => {
        if (activeMenu === userId) {
            setActiveMenu(null);
        } else {
            setActiveMenu(userId);
        }
    };

    const handleInputChange = (e) => {
        if (e.target.name === 'role') {
            const selectedRole = roles.find(r => r.name === e.target.value);
            setFormData({
                ...formData,
                role: e.target.value,
                roleId: selectedRole ? selectedRole.id : null
            });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setActiveImg(reader.result);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = null;
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropSave = async () => {
        try {
            const croppedImage = await getCroppedImg(activeImg, croppedAreaPixels);
            setFormData({ ...formData, avatar: croppedImage });
            setShowCropModal(false);
            setActiveImg(null);
        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    const handleCreateUser = async () => {
        if (!formData.name || !formData.email || !formData.role) {
            toast.error("Please fill required fields");
            return;
        }
        if (loginEnabled) {
            if (!formData.password || formData.password !== formData.confirmPassword) {
                toast.error("Passwords do not match or are empty");
                return;
            }
        }

        try {
            const payload = { ...formData, loginEnabled };
            const response = await userService.createUser(payload);
            if (response.success) {
                toast.success("User created successfully");
                
                // Send Email Notification
                if (loginEnabled && formData.password) {
                    try {
                        const templateParams = {
                            to_email: formData.email,
                            name: formData.name,
                            email: formData.email,
                            password: formData.password,
                            role: formData.role,
                            login_url: window.location.origin + '/login',
                            message: `A new account has been created for you as ${formData.role}.`
                        };

                        await emailjs.send(
                            EMAIL_CONFIG.SERVICE_ID,
                            EMAIL_CONFIG.TEMPLATE_ID,
                            templateParams,
                            EMAIL_CONFIG.PUBLIC_KEY
                        );
                        console.log("Welcome email sent to user");
                    } catch (emailError) {
                        console.error("Failed to send welcome email:", emailError);
                        toast.error("User created, but welcome email failed to send.");
                    }
                }

                fetchUsers();
                setShowAddModal(false);
                setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to create user");
        }
    };

    const handleLoginAction = async (user) => {
        setActiveMenu(null);
        if (user.loginEnabled === false) {
            // Enable immediately
            try {
                const response = await userService.updateUser(user.id, { loginEnabled: true });
                if (response.success) {
                    toast.success("User login enabled successfully");
                    fetchUsers();
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to enable user");
            }
        } else {
            // Show Disable Confirmation Modal
            setUserToDisable(user);
            setShowDisableConfirmModal(true);
        }
    };

    const performLoginDisable = async () => {
        if (!userToDisable) return;
        try {
            const response = await userService.updateUser(userToDisable.id, { loginEnabled: false });
            if (response.success) {
                toast.success("User login disabled successfully");
                fetchUsers();
                setShowDisableConfirmModal(false);
                setUserToDisable(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to disable login");
        }
    };

    const handleResetPassword = async () => {
        if (!formData.password || !formData.confirmPassword) {
            toast.error("Please fill all fields");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        try {
            const response = await userService.updateUser(selectedUser.id, { password: formData.password });
            if (response.success) {
                toast.success("Password reset successfully");
                
                // Send Email Notification
                try {
                    const templateParams = {
                        to_email: selectedUser.email,
                        name: selectedUser.name,
                        email: selectedUser.email,
                        password: formData.password,
                        role: selectedUser.role,
                        login_url: window.location.origin + '/login',
                        message: "Your account password has been reset by the administrator."
                    };

                    await emailjs.send(
                        EMAIL_CONFIG.SERVICE_ID,
                        EMAIL_CONFIG.TEMPLATE_ID,
                        templateParams,
                        EMAIL_CONFIG.PUBLIC_KEY
                    );
                    console.log("Password reset email sent");
                } catch (emailError) {
                    console.error("Failed to send reset email:", emailError);
                    toast.error("Password reset, but email notification failed.");
                }

                setShowResetModal(false);
                setFormData({ ...formData, password: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to reset password");
        }
    };

    const handleUpdateUser = async () => {
        try {
            const payload = { ...formData, loginEnabled }; // Include loginEnabled state
            const response = await userService.updateUser(selectedUser.id, payload);
            if (response.success) {
                toast.success("User updated successfully");
                fetchUsers();
                setShowEditModal(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to update user");
        }
    };

    const handleDeleteUser = async () => {
        try {
            const response = await userService.deleteUser(selectedUser.id);
            if (response.success) {
                toast.success("User deleted successfully");
                fetchUsers();
                setShowDeleteModal(false);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setLoginEnabled(user.loginEnabled !== false); // Default to true if undefined
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            roleId: user.roleId,
            password: '',
            confirmPassword: ''
        });
        setShowEditModal(true);
        setActiveMenu(null);
    };

    return (
        <div className="UserList-page">
            <div className="page-header">
                <h1 className="page-title">Users</h1>

                {hasPermission('create user') && (
                    <div className="UserList-add-icon-wrapper" onClick={() => {
                        setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
                        setShowAddModal(true);
                    }} style={{ cursor: 'pointer' }}>
                        <Plus size={24} color="white" fill="white" strokeWidth={3} />
                    </div>
                )}
            </div>

            <div className="UserList-grid">
                {isLoading ? (
                    <p>Loading users...</p>
                ) : users.map((user) => (
                    <div key={user.id} className="UserList-card">
                        <div className="UserList-card-top">
                            <span className="UserList-role-badge">{user.role}</span>
                            <div className="UserList-menu-container">
                                <button className="UserList-more-btn" onClick={() => toggleMenu(user.id)}>
                                    < MoreVertical size={18} color="#94a3b8" />
                                </button>

                                {activeMenu === user.id && (
                                     <div className="UserList-action-dropdown shadow-lg UserList-animate-fade-in">
                                        {hasPermission('edit user') && (
                                            <>
                                                <button className="UserList-dropdown-item" onClick={() => openEditModal(user)}>
                                                    <Pencil size={14} className="UserList-mr-2" /> Edit
                                                </button>
                                                <button className="UserList-dropdown-item" onClick={() => { setSelectedUser(user); setShowResetModal(true); setActiveMenu(null); }}>
                                                    <ShieldCheck size={14} className="UserList-mr-2" /> Reset Password
                                                </button>
                                            </>
                                        )}
                                        {hasPermission('delete user') && (
                                            <button className="UserList-dropdown-item" onClick={() => { setSelectedUser(user); setShowDeleteModal(true); setActiveMenu(null); }}>
                                                <Trash2 size={14} className="UserList-mr-2" /> Delete
                                            </button>
                                        )}
                                        {hasPermission('edit user') && (
                                            <>
                                                <div className="UserList-dropdown-divider"></div>
                                                {user.loginEnabled === false ? (
                                                    <button className="UserList-dropdown-item text-white" onClick={() => handleLoginAction(user)}>
                                                        <ShieldCheck size={14} className="UserList-mr-2" /> Login Enable
                                                    </button>
                                                ) : (
                                                    <button className="UserList-dropdown-item UserList-text-red-500" onClick={() => handleLoginAction(user)}>
                                                        <X size={14} className="UserList-mr-2" /> Login Disable
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="UserList-avatar-wrapper">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="UserList-user-avatar-img" />
                                ) : (
                                    <div className="UserList-user-avatar-placeholder">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <h3 className="UserList-name">{user.name}</h3>
                            <p className="UserList-email">{user.email}</p>
                        </div>
                    </div>
                ))}

                {/* Add New User Card */}
                {hasPermission('create user') && (
                    <div className="UserList-card UserList-add-card" onClick={() => {
                        setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
                        setShowAddModal(true);
                    }}>
                        <div className="UserList-add-icon-wrapper">
                            <Plus size={24} color="white" fill="white" strokeWidth={3} />
                        </div>
                        <h3 className="UserList-add-text">New User</h3>
                        <p className="UserList-add-subtext">Click here to add New User</p>
                    </div>
                )}
            </div>

            {/* Create New User Modal */}
            {showAddModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content">
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Create New User</h2>
                            <button className="UserList-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body">
                            <div className="UserList-form-grid-2">
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">Name <span className="UserList-text-red-500">*</span></label>
                                    <input name="name" type="text" className="UserList-form-input" placeholder="Enter User Name" value={formData.name} onChange={handleInputChange} />
                                </div>
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">Email <span className="UserList-text-red-500">*</span></label>
                                    <input name="email" type="email" className="UserList-form-input" placeholder="Enter User Email" value={formData.email} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="UserList-form-group mt-4">
                                <label className="UserList-form-label">Profile Image</label>
                                <input type="file" accept="image/*" className="UserList-form-input" onChange={handleFileChange} />
                            </div>

                            <div className="UserList-form-grid-2 UserList-mt-4 UserList-items-center">
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">User Role <span className="UserList-text-red-500">*</span></label>
                                    <select name="role" className="UserList-form-input" value={formData.role} onChange={handleInputChange}>
                                        <option value="">Select Role</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="UserList-form-group">
                                    <div className="UserList-flex UserList-items-center UserList-justify-between">
                                        <span className="UserList-form-label mb-0">Login is enable</span>
                                        <label className="UserList-switch">
                                            <input
                                                type="checkbox"
                                                checked={loginEnabled}
                                                onChange={(e) => setLoginEnabled(e.target.checked)}
                                            />
                                            <span className="UserList-slider UserList-round"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {loginEnabled && (
                                <div className="UserList-form-grid-2 mt-4 UserList-animate-fade-in">
                                    <div className="UserList-form-group">
                                        <label className="UserList-form-label">Password <span className="UserList-text-red-500">*</span></label>
                                        <input name="password" type="password" className="UserList-form-input" placeholder="Enter Password" value={formData.password} onChange={handleInputChange} />
                                    </div>
                                    <div className="UserList-form-group">
                                        <label className="UserList-form-label">Confirm Password <span className="UserList-text-red-500">*</span></label>
                                        <input name="confirmPassword" type="password" className="UserList-form-input" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleInputChange} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="UserList-modal-footer">
                            <button className="UserList-btn-cancel-dark" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="UserList-btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={handleCreateUser}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content">
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Edit User</h2>
                            <button className="UserList-close-btn" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body">
                            <div className="UserList-form-grid-2">
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">Name <span className="UserList-text-red-500">*</span></label>
                                    <input name="name" type="text" className="UserList-form-input" value={formData.name} onChange={handleInputChange} />
                                </div>
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">Email <span className="UserList-text-red-500">*</span></label>
                                    <input name="email" type="email" className="UserList-form-input" value={formData.email} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="UserList-form-group UserList-mt-4">
                                <label className="UserList-form-label">Profile Image</label>
                                <input type="file" accept="image/*" className="UserList-form-input" onChange={handleFileChange} />
                            </div>
                            <div className="UserList-form-grid-2 UserList-mt-4 UserList-items-center">
                                <div className="UserList-form-group">
                                    <label className="UserList-form-label">User Role <span className="UserList-text-red-500">*</span></label>
                                    <select name="role" className="UserList-form-input" value={formData.role} onChange={handleInputChange}>
                                        <option value="">Select Role</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.name}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="UserList-form-group">
                                    <div className="UserList-flex UserList-items-center UserList-justify-between">
                                        <span className="UserList-form-label mb-0">Login is enable</span>
                                        <label className="UserList-switch">
                                            <input
                                                type="checkbox"
                                                checked={loginEnabled}
                                                onChange={(e) => setLoginEnabled(e.target.checked)}
                                            />
                                            <span className="UserList-slider UserList-round"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="UserList-form-group UserList-mt-4">
                                <label className="UserList-form-label">New Password (Optional)</label>
                                <input name="password" type="password" className="UserList-form-input" placeholder="Leave blank to keep current" value={formData.password} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="UserList-modal-footer">
                            <button className="UserList-btn-cancel-dark" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="UserList-btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={handleUpdateUser}>Update User</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Delete User</h2>
                            <button className="UserList-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body text-center py-6">
                            <div className="UserList-delete-icon-circle UserList-mx-auto UserList-mb-4">
                                <Trash2 size={32} color="#ef4444" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Are you sure?</h3>
                            <p className="text-gray-500 mt-2">You are about to delete user <strong>{selectedUser?.name}</strong>. This action cannot be undone.</p>
                        </div>
                        <div className="UserList-modal-footer">
                            <button className="UserList-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="UserList-btn-submit" style={{ backgroundColor: '#ef4444' }} onClick={handleDeleteUser}>Delete User</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable Login Confirmation Modal */}
            {showDisableConfirmModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Disable Login</h2>
                            <button className="UserList-close-btn" onClick={() => setShowDisableConfirmModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body text-center py-6">
                            <div className="UserList-delete-icon-circle UserList-mx-auto UserList-mb-4" style={{ backgroundColor: '#fff7ed' }}>
                                <ShieldCheck size={32} color="#f97316" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Disable Access?</h3>
                            <p className="text-gray-500 mt-2">Are you sure you want to disable login for <strong>{userToDisable?.name}</strong>? They will not be able to access the system.</p>
                        </div>
                        <div className="UserList-modal-footer">
                            <button className="UserList-btn-cancel" onClick={() => setShowDisableConfirmModal(false)}>Cancel</button>
                            <button className="UserList-btn-submit" style={{ backgroundColor: '#f97316' }} onClick={performLoginDisable}>Disable Login</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content" style={{ maxWidth: '450px' }}>
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Reset Password</h2>
                            <button className="UserList-close-btn" onClick={() => setShowResetModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body">
                            <div className="UserList-form-group UserList-mb-4">
                                <label className="UserList-form-label">New Password <span className="UserList-text-red-500">*</span></label>
                                <input name="password" type="password" className="UserList-form-input" placeholder="Enter new password" value={formData.password} onChange={handleInputChange} />
                            </div>
                            <div className="UserList-form-group">
                                <label className="UserList-form-label">Confirm Password <span className="UserList-text-red-500">*</span></label>
                                <input name="confirmPassword" type="password" className="UserList-form-input" placeholder="Confirm new password" value={formData.confirmPassword} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="UserList-modal-footer">
                            <button className="UserList-btn-cancel-dark" onClick={() => setShowResetModal(false)}>Cancel</button>
                            <button className="UserList-btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={handleResetPassword}>Reset Password</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Crop Modal */}
            {showCropModal && (
                <div className="UserList-modal-overlay">
                    <div className="UserList-modal-content" style={{ height: '600px', maxWidth: '700px', width: '95%' }}>
                        <div className="UserList-modal-header">
                            <h2 className="UserList-modal-title">Crop Image</h2>
                            <button className="UserList-close-btn" onClick={() => setShowCropModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UserList-modal-body" style={{ height: '500px', position: 'relative', background: '#333' }}>
                            <Cropper
                                image={activeImg}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="UserList-modal-footer" style={{ flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: '100%' }}>
                                <label className="UserList-form-label" style={{ marginBottom: '8px', display: 'block' }}>Zoom: {zoom}</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(e.target.value)}
                                    style={{ width: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
                                <button className="UserList-btn-cancel" onClick={() => setShowCropModal(false)}>Cancel</button>
                                <button className="UserList-btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={handleCropSave}>Save Crop</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;