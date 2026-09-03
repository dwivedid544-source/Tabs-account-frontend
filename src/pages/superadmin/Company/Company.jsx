import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, Plus, Search, Grid, List as ListIcon, MoreVertical,
    Calendar, Users, HardDrive, X, Upload, Pencil, LogIn, Trash2, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Company.css';
import companyService from '../../../services/companyService';
import planService from '../../../services/planService';
import userService from '../../../services/userService';
import authService from '../../../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { useContext } from 'react';

const Company = () => {
    const navigate = useNavigate();
    const { updateCurrentUser } = useContext(AuthContext);
    const [viewMode, setViewMode] = useState('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [activeCompany, setActiveCompany] = useState(null);
    const [storageValue, setStorageValue] = useState('');
    const [activeCompanyForUsers, setActiveCompanyForUsers] = useState(null);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [planFilter, setPlanFilter] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        startDate: '',
        endDate: '',
        planId: '',
        planType: '',
        password: '',
        confirmPassword: ''
    });

    const [logoFile, setLogoFile] = useState(null);

    useEffect(() => {
        fetchCompanies();
        fetchPlans();
    }, []);

    const fetchCompanies = async () => {
        try {
            const data = await companyService.getCompanies();
            setCompanies(data);
        } catch (error) {
            toast.error('Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const data = await planService.getPlans();
            setAvailablePlans(data);
        } catch (error) {
            console.error('Failed to fetch plans', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };

        if (name === 'planId' && value) {
            const selectedPlan = availablePlans.find(plan => String(plan.id) === String(value));
            if (selectedPlan) {
                // Dynamically set planType based on the selected plan's billing cycle
                if (selectedPlan.billingCycle) {
                    updatedFormData.planType = selectedPlan.billingCycle;
                }
            }
        }

        // Auto-calculate End Date
        if (name === 'startDate' || name === 'planType' || (name === 'planId' && value)) {
            const { startDate, planType } = updatedFormData;
            if (startDate && planType) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    let end = new Date(start);
                    if (planType === 'Monthly') {
                        end.setMonth(end.getMonth() + 1);
                    } else if (planType === 'Yearly') {
                        end.setFullYear(end.getFullYear() + 1);
                    }
                    updatedFormData.endDate = end.toISOString().split('T')[0];
                }
            }
        }

        setFormData(updatedFormData);
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (!editingCompany) {
                if (formData.password !== formData.confirmPassword) {
                    return toast.error('Passwords do not match');
                }
                if (!formData.password) {
                    return toast.error('Password is required');
                }
            }

            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'confirmPassword') {
                    data.append(key, formData[key]);
                }
            });
            if (logoFile) {
                data.append('logo', logoFile);
            }

            if (editingCompany) {
                await companyService.updateCompany(editingCompany.id, data);
                toast.success('Company updated successfully');
            } else {
                await companyService.createCompany(data);
                toast.success('Company created successfully');
            }
            fetchCompanies();
            handleCreateModalClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async () => {
        try {
            await companyService.deleteCompany(companyToDelete.id);
            toast.success('Company deleted successfully');
            fetchCompanies();
            setShowDeleteModal(false);
        } catch (error) {
            toast.error('Failed to delete company');
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const [activeDropdownId, setActiveDropdownId] = useState(null);

    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUsersClick = async (company) => {
        setActiveCompanyForUsers(company);
        setShowUsersModal(true);
        setLoadingUsers(true);
        try {
            const response = await userService.getUsers(company.id);
            if (response.success) {
                setCompanyUsers(response.data);
            } else {
                toast.error('Failed to fetch users');
            }
        } catch (error) {
            console.error('Fetch users error:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleUpgradeClick = (company) => {
        setActiveCompany(company);
        const today = new Date().toISOString().split('T')[0];
        const planType = company.planType || 'Monthly';
        
        // Calculate end date based on today
        let end = new Date(today);
        if (planType === 'Yearly') {
            end.setFullYear(end.getFullYear() + 1);
        } else {
            end.setMonth(end.getMonth() + 1);
        }

        setFormData({
            ...formData,
            planId: company.planId || '',
            planType: planType,
            startDate: today,
            endDate: end.toISOString().split('T')[0]
        });
        setShowUpgradeModal(true);
    };

    const handleStorageClick = (company) => {
        setActiveCompany(company);
        setStorageValue(company.storageCapacity || '0');
        setShowStorageModal(true);
    };

    const handleUpgradeSubmit = async () => {
        try {
            const data = new FormData();
            data.append('planId', formData.planId);
            data.append('planType', formData.planType);
            data.append('startDate', formData.startDate);
            data.append('endDate', formData.endDate);
            
            await companyService.updateCompany(activeCompany.id, data);
            toast.success('Plan upgraded successfully');
            fetchCompanies();
            setShowUpgradeModal(false);
        } catch (error) {
            toast.error('Failed to upgrade plan');
        }
    };

    const handleLoginAsCompany = async (company) => {
        try {
            const response = await authService.impersonate(company.id);
            if (response.token) {
                updateCurrentUser(response.user);
                toast.success(`Logged in as ${company.name}`);
                navigate('/company/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Impersonation failed');
        }
    };

    const handleStorageSubmit = async () => {
        try {
            const data = new FormData();
            data.append('storageCapacity', storageValue);
            
            await companyService.updateCompany(activeCompany.id, data);
            toast.success('Storage updated successfully');
            fetchCompanies();
            setShowStorageModal(false);
        } catch (error) {
            toast.error('Failed to update storage');
        }
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdownId(activeDropdownId === id ? null : id);
    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState(null);
    const [editingCompany, setEditingCompany] = useState(null);

    const handleEditClick = (company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            startDate: company.startDate ? company.startDate.split('T')[0] : '',
            endDate: company.endDate ? company.endDate.split('T')[0] : '',
            planId: company.planId || '',
            planType: company.planType || '',
            password: '',
            confirmPassword: ''
        });
        setLogoPreview(company.logo);
        setShowCreateModal(true);
        setActiveDropdownId(null);
    };

    const handleDeleteClick = (company) => {
        setCompanyToDelete(company);
        setShowDeleteModal(true);
        setActiveDropdownId(null);
    };

    const handleCreateModalClose = () => {
        setShowCreateModal(false);
        setEditingCompany(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            startDate: '',
            endDate: '',
            planId: '',
            planType: '',
            password: '',
            confirmPassword: ''
        });
        setLogoPreview(null);
        setLogoFile(null);
    };

    const filteredCompanies = companies.filter(company => {
        const matchesSearch = (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (company.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesPlan = planFilter ? String(company.planId) === String(planFilter) : true;
        
        const isExpired = company.endDate ? new Date(company.endDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
        const matchesStatus = statusFilter ? (statusFilter === 'active' ? !isExpired : isExpired) : true;
        
        return matchesSearch && matchesPlan && matchesStatus;
    });

    return (
        <div className="supercompany-page">
            <div className="supercompany-page-header">
                <div className="supercompany-page-title">
                    <Building2 size={24} className="text-blue-500" />
                    <span>Manage Companies</span>
                </div>
                <div className="supercompany-header-actions">
                    <button className="supercompany-add-btn" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Create Company
                    </button>
                </div>
            </div>

            <div className="supercompany-filters-bar">
                <div className="supercompany-search-input-wrapper">
                    <Search className="supercompany-search-icon" size={18} />
                    <input
                        type="text"
                        className="supercompany-form-control"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="supercompany-filter-group">
                    <span className="supercompany-filter-label">Plan:</span>
                    <select 
                        className="supercompany-form-select"
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                    >
                        <option value="">All Plans</option>
                        {availablePlans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                        ))}
                    </select>
                </div>
                <div className="supercompany-filter-group">
                    <span className="supercompany-filter-label">Status:</span>
                    <select 
                        className="supercompany-form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            <div className={viewMode === 'grid' ? 'supercompany-grid' : 'supercompany-list'}>
                {loading ? (
                    <div className="supercompany-loading-state">Loading companies...</div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="supercompany-empty-state">No companies found.</div>
                ) : (
                    filteredCompanies.map(company => (
                        <div key={company.id} className="supercompany-card">
                            <div className="supercompany-card-top">
                                <div className="flex items-center gap-2">
                                    <span className={`supercompany-plan-badge supercompany-badge-bronze`}>
                                        {company.plan?.name || company.planName || 'No Plan'}
                                    </span>
                                    {(() => {
                                        const isExpired = company.endDate ? new Date(company.endDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
                                        return (
                                            <span className={`supercompany-status-badge ${isExpired ? 'expired' : 'active'}`}>
                                                {isExpired ? 'Expired' : 'Active'}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="supercompany-relative">
                                    <button className="supercompany-menu-trigger" onClick={(e) => toggleDropdown(e, company.id)}>
                                        <MoreVertical size={18} />
                                    </button>
                                    {activeDropdownId === company.id && (
                                        <div className="supercompany-action-dropdown" ref={dropdownRef}>
                                            <div className="supercompany-dropdown-item" onClick={() => handleEditClick(company)}>
                                                <Pencil size={14} /> Edit
                                            </div>
                                            <div className="supercompany-dropdown-divider"></div>
                                            <div className="supercompany-dropdown-item text-danger" onClick={() => handleDeleteClick(company)}>
                                                <Trash2 size={14} /> Delete
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="supercompany-identity">
                                {company.logo ? (
                                    <img src={company.logo} alt={company.name} className="supercompany-avatar" />
                                ) : (
                                    <div className="supercompany-avatar-placeholder">
                                        {company.name?.charAt(0).toUpperCase() || 'C'}
                                    </div>
                                )}
                                <div className="supercompany-details">
                                    <h3>{company.name}</h3>
                                    <p className="supercompany-email">{company.email}</p>
                                </div>
                            </div>

                            <div className="supercompany-info-rows">
                                <div className="supercompany-info-row">
                                    <div className="supercompany-info-left">
                                        <Grid size={16} className="supercompany-info-icon supercompany-icon-cyan" />
                                        <span className="supercompany-info-label">Type:</span>
                                    </div>
                                    <span className="supercompany-info-value">{company.planType || 'N/A'}</span>
                                </div>
                                <div className="supercompany-info-row">
                                    <div className="supercompany-info-left">
                                        <Calendar size={16} className="supercompany-info-icon supercompany-icon-blue" />
                                        <span className="supercompany-info-label">Start:</span>
                                    </div>
                                    <span className="supercompany-info-value">{company.startDate ? new Date(company.startDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="supercompany-info-row">
                                    <div className="supercompany-info-left">
                                        <Calendar size={16} className="supercompany-info-icon supercompany-icon-red" />
                                        <span className="supercompany-info-label">End:</span>
                                    </div>
                                    <span className="supercompany-info-value">{company.endDate ? new Date(company.endDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>

                            <div className="supercompany-card-actions">
                                <button 
                                    className='supercompany-btn-upgrade-new' 
                                    onClick={() => handleUpgradeClick(company)}
                                >
                                    Upgrade
                                </button>
                                <div className="supercompany-btn-icon-stack" onClick={() => handleUsersClick(company)}>
                                    <Users size={12} />
                                    <span>Users</span>
                                </div>
                                <div className="supercompany-btn-icon-stack" onClick={() => handleLoginAsCompany(company)}>
                                    <LogIn size={12} />
                                    <span>Login</span>
                                </div>
                                <div className="supercompany-btn-icon-stack" onClick={() => handleStorageClick(company)}>
                                    <div className="flex items-center gap-0.5" style={{ fontSize: '0.65rem', fontWeight: '700' }}>
                                        {String(company.storageCapacity || company.plan?.storageCapacity || '0').replace(/GB/gi, '')}G
                                        <HardDrive size={10} />
                                    </div>
                                    <span>Storage</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="supercompany-modal-overlay">
                    <div className="supercompany-modal-content supercompany-modal-lg">
                        <div className="supercompany-modal-header">
                            <h2>{editingCompany ? 'Edit Company' : 'Create New Company'}</h2>
                            <button className="supercompany-close-btn" onClick={handleCreateModalClose}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="supercompany-modal-body">
                            <div className="supercompany-form-grid">
                                <div className="supercompany-form-group col-span-2 flex flex-col items-center">
                                    <label className="text-center w-full mb-2">Company Logo</label>
                                    <div className="supercompany-logo-upload-wrapper">
                                        <div className="supercompany-logo-placeholder" onClick={handleLogoClick}>
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" />
                                            ) : (
                                                <div className="flex flex-col items-center text-gray-400">
                                                    <Upload size={24} />
                                                    <span className="text-[10px] mt-1">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="supercompany-upload-info">
                                            <button type="button" className="supercompany-upload-btn" onClick={handleLogoClick}>Select Logo</button>
                                            <p className="text-xs App-text-muted mt-2">Max 2MB (JPG, PNG)</p>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="supercompany-form-group">
                                    <label className="required">Company Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="supercompany-form-control"
                                        placeholder="Enter Company Name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="supercompany-form-group">
                                    <label className="required">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="supercompany-form-control"
                                        placeholder="Enter Email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="supercompany-form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        className="supercompany-form-control"
                                        placeholder="Enter Phone Number"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="supercompany-form-group">
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        className="supercompany-form-control"
                                        placeholder="Enter Address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                 <div className="supercompany-form-group">
                                    <label className="required">Plan</label>
                                    <select
                                        name="planId"
                                        className="supercompany-form-select w-full"
                                        value={formData.planId}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Plan</option>
                                        {availablePlans.map(plan => (
                                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                                        ))}
                                    </select>
                                </div>
                                  <div className="supercompany-form-group">
                                    <label className="required">Plan Type</label>
                                    <select
                                        name="planType"
                                        className="supercompany-form-select w-full"
                                        value={formData.planType}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Type</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div> 
                                <div className="supercompany-form-group">
                                    <label className="required">Start Date</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="supercompany-form-control"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="supercompany-form-group">
                                    <label className="required">Expire Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="supercompany-form-control"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                               
                              
                                {!editingCompany && (
                                    <>
                                        <div className="supercompany-form-group">
                                            <label className="required">Password</label>
                                            <input
                                                type="password"
                                                name="password"
                                                className="supercompany-form-control"
                                                placeholder="Enter password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="supercompany-form-group">
                                            <label className="required">Confirm Password</label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                className="supercompany-form-control"
                                                placeholder="Confirm password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="supercompany-modal-footer">
                            <button className="supercompany-btn-cancel" onClick={handleCreateModalClose}>Cancel</button>
                            <button
                                className="supercompany-btn-create"
                                style={{ backgroundColor: '#475569' }} // Lime green from image
                                onClick={handleCreateOrUpdate}
                            >
                                {editingCompany ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && companyToDelete && (
                <div className="supercompany-modal-overlay">
                    <div className="supercompany-modal-content supercompany-modal-md">
                        <div className="supercompany-modal-header">
                            <h2>Delete Company</h2>
                            <button className="supercompany-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="supercompany-modal-body">
                            <p className="text-gray-700">
                                Are you sure you want to delete <strong>{companyToDelete.name}</strong>?
                                <br />
                                This action cannot be undone and will also delete company users.
                            </p>
                        </div>
                        <div className="supercompany-modal-footer">
                            <button className="supercompany-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button
                                className="supercompany-btn-close-gray bg-red-600 hover:bg-red-700 text-white border-none"
                                onClick={handleDelete}
                                style={{ backgroundColor: '#ef4444', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Modal */}
            {showUsersModal && activeCompanyForUsers && (
                <div className="supercompany-modal-overlay">
                    <div className="supercompany-modal-content supercompany-modal-md">
                        <div className="supercompany-modal-header">
                            <h2>Users of {activeCompanyForUsers.name}</h2>
                            <button className="supercompany-close-btn-red" onClick={() => setShowUsersModal(false)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="supercompany-modal-body">
                            {loadingUsers ? (
                                <div className="text-center py-4">Loading users...</div>
                            ) : (
                                <table className="supercompany-users-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>NAME</th>
                                            <th>EMAIL</th>
                                            <th>ROLE</th>
                                            <th>CREATED DATE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companyUsers && companyUsers.length > 0 ? (
                                            companyUsers.map((user, index) => (
                                                <tr key={user.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td><span className="supercompany-badge-role">{user.role}</span></td>
                                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4">No users found for this company</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="supercompany-modal-footer">
                            <button className="supercompany-btn-close-gray" onClick={() => setShowUsersModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Upgrade Plan Modal */}
            {showUpgradeModal && activeCompany && (
                <div className="supercompany-modal-overlay">
                    <div className="supercompany-modal-content supercompany-modal-md">
                        <div className="supercompany-modal-header">
                            <h2>Upgrade Plan for {activeCompany.name}</h2>
                            <button className="supercompany-close-btn" onClick={() => setShowUpgradeModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="supercompany-modal-body">
                            <div className="supercompany-form-group">
                                <label className="required">Select New Plan</label>
                                <select
                                    name="planId"
                                    className="supercompany-form-select w-full"
                                    value={formData.planId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Plan</option>
                                    {availablePlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="supercompany-form-group mt-4">
                                <label className="required">Plan Type</label>
                                <select
                                    name="planType"
                                    className="supercompany-form-select w-full"
                                    value={formData.planType}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="supercompany-form-group mt-4">
                                <label className="required">Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    className="supercompany-form-control"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="supercompany-form-group mt-4">
                                <label className="required">Expire Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    className="supercompany-form-control"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="supercompany-modal-footer">
                            <button className="supercompany-btn-cancel" onClick={() => setShowUpgradeModal(false)}>Cancel</button>
                            <button className="supercompany-btn-create" onClick={handleUpgradeSubmit}>Upgrade Plan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Storage Modal */}
            {showStorageModal && activeCompany && (
                <div className="supercompany-modal-overlay">
                    <div className="supercompany-modal-content supercompany-modal-sm">
                        <div className="supercompany-modal-header">
                            <h2>Update Storage: {activeCompany.name}</h2>
                            <button className="supercompany-close-btn" onClick={() => setShowStorageModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="supercompany-modal-body">
                            <div className="supercompany-form-group">
                                <label className="required">Storage Capacity (GB)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="supercompany-form-control"
                                        value={storageValue}
                                        onChange={(e) => setStorageValue(e.target.value)}
                                        placeholder="e.g. 5"
                                        min="0"
                                    />
                                    <span className="font-medium text-gray-500">GB</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Current plan storage will be overridden by this value.</p>
                            </div>
                        </div>
                        <div className="supercompany-modal-footer">
                            <button className="supercompany-btn-cancel" onClick={() => setShowStorageModal(false)}>Cancel</button>
                            <button className="supercompany-btn-create" onClick={handleStorageSubmit}>Update Storage</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Company;
