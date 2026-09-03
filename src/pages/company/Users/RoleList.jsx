import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import roleService from '../../../services/roleService';
import GetCompanyId from '../../../api/GetCompanyId';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../../../context/AuthContext';
import './RoleList.css';

const RoleList = () => {
    const { hasPermission } = useContext(AuthContext);
    const [roles, setRoles] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({ name: '', permissions: [] });
    const [isLoading, setIsLoading] = useState(false);

    // Permission Modules Definition
    const modules = [
        { name: 'Dashboard', permissions: ['Show'] },
        { name: 'User', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Role', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        
        // Accounts
        { name: 'Charts of Accounts', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Customers', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Vendors', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        
        // Inventory
        { name: 'Warehouse', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'UOM', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Products', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Services', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Stock Transfer', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Inventory Adjustment', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        
        // Sales
        { name: 'Sales Quotation', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'Send', 'View'] },
        { name: 'Sales Order', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'View'] },
        { name: 'Delivery Challan', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'View'] },
        { name: 'Sales Invoice', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'View'] },
        { name: 'Sales Payment', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'View'] },
        { name: 'Sales Return', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'Show', 'View'] },
        
        // Purchases
        { name: 'Purchase Quotation', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Purchase Order', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Goods Receipt', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Purchase Bill', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Purchase Payment', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Purchase Return', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        
        // POS & Voucher
        { name: 'POS', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Journal Voucher', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Expenses', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Income', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        { name: 'Contra Voucher', permissions: ['Manage', 'Create', 'Edit', 'Delete', 'View'] },
        
        // Reports & Settings
        { name: 'Reports', permissions: ['Manage', 'View'] },
        { name: 'Settings', permissions: ['Manage', 'Edit', 'View'] }
    ];

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setIsLoading(true);
        try {
            const companyId = GetCompanyId();
            const response = await roleService.getRoles(companyId);
            if (response.success) {
                setRoles(response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load roles");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormData({ name: '', permissions: [] });
        setShowAddModal(true);
    };

    const handleOpenEdit = (role) => {
        setSelectedRole(role);
        setFormData({ name: role.name, permissions: role.permissions || [] });
        setShowEditModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowDeleteModal(false);
        setSelectedRole(null);
        setFormData({ name: '', permissions: [] });
    };

    // Helper to generate permission key
    const getPermKey = (modName, action) => `${action.toLowerCase()} ${modName.toLowerCase()}`;

    const togglePermission = (modName, action) => {
        const key = getPermKey(modName, action);
        setFormData(prev => {
            const exists = prev.permissions.includes(key);
            if (exists) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== key) };
            } else {
                return { ...prev, permissions: [...prev.permissions, key] };
            }
        });
    };

    const toggleModulePermissions = (modName, modPerms) => {
        // Check if any are currently selected
        const allKeys = modPerms.map(p => getPermKey(modName, p));
        const anySelected = allKeys.some(k => formData.permissions.includes(k));

        setFormData(prev => {
            let newPerms = [...prev.permissions];
            if (anySelected) {
                // Remove all
                newPerms = newPerms.filter(p => !allKeys.includes(p));
            } else {
                // Add all
                allKeys.forEach(k => {
                    if (!newPerms.includes(k)) newPerms.push(k);
                });
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSubmit = async (isEdit) => {
        if (!formData.name.trim()) {
            toast.error("Role Name is required");
            return;
        }

        try {
            if (isEdit) {
                const response = await roleService.updateRole(selectedRole.id, formData);
                if (response.success) {
                    toast.success("Role updated successfully");
                    fetchRoles();
                    handleCloseModal();
                }
            } else {
                const response = await roleService.createRole(formData);
                if (response.success) {
                    toast.success("Role created successfully");
                    fetchRoles();
                    handleCloseModal();
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async () => {
        try {
            const response = await roleService.deleteRole(selectedRole.id);
            if (response.success) {
                toast.success("Role deleted successfully");
                fetchRoles();
                handleCloseModal();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete role");
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="RoleList-page">
            <div className="RoleList-page-header">
                <h1 className="RoleList-page-title">Role & Permission</h1>
                {hasPermission('create role') && (
                    <button className="RoleList-btn-add" onClick={handleOpenAdd}>
                        <Plus size={18} className="RoleList-mr-2" /> Create Role
                    </button>
                )}
            </div>

            <div className="RoleList-table-card">
                <div className="RoleList-table-controls">
                    <div className="RoleList-entries-control">
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(e.target.value)}
                            className="RoleList-entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="RoleList-entries-text">entries per page</span>
                    </div>
                    <div className="RoleList-search-control">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="RoleList-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="RoleList-table-container">
                    <table className="RoleList-table">
                        <thead>
                            <tr>
                                <th>ROLE</th>
                                <th>PERMISSIONS</th>
                                <th className="RoleList-text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="3" className="RoleList-text-center RoleList-p-4">Loading...</td></tr>
                            ) : filteredRoles.length === 0 ? (
                                <tr><td colSpan="3" className="RoleList-text-center RoleList-p-4">No roles found</td></tr>
                            ) : filteredRoles.map((role) => (
                                <tr key={role.id}>
                                    <td className="RoleList-name-cell">{role.name}</td>
                                    <td>
                                        <div className="RoleList-permissions-badge-grid">
                                            {(role.permissions || []).slice(0, 8).map((perm, index) => (
                                                <span key={index} className="RoleList-perm-badge">{perm}</span>
                                            ))}
                                            {(role.permissions || []).length > 8 && (
                                                <span className="RoleList-perm-badge more">+{role.permissions.length - 8} more</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="RoleList-text-right">
                                        <div className="RoleList-action-buttons">
                                            {hasPermission('edit role') && (
                                                <button className="RoleList-btn-edit" onClick={() => handleOpenEdit(role)}>
                                                    <Pencil size={16} />
                                                </button>
                                            )}
                                            {hasPermission('delete role') && (
                                                <button className="RoleList-btn-delete" onClick={() => { setSelectedRole(role); setShowDeleteModal(true); }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div className="RoleList-modal-overlay">
                    <div className="RoleList-modal-content RoleList-modal">
                        <div className="RoleList-modal-header">
                            <h2 className="RoleList-modal-title">{showEditModal ? 'Edit Role' : 'Create Role'}</h2>
                            <button className="RoleList-close-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="RoleList-modal-body RoleList-p-0">
                            <div className="RoleList-form-container">
                                <div className="RoleList-form-group RoleList-mb-6">
                                    <label className="RoleList-form-label">Name <span className="RoleList-text-red">*</span></label>
                                    <input
                                        type="text"
                                        className="RoleList-form-input"
                                        placeholder="Enter Role Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="RoleList-permissions-section">
                                    <h3 className="RoleList-section-title">Assign Permission to Roles</h3>
                                    <div className="RoleList-perm-table-container">
                                        <table className="RoleList-perm-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>
                                                        <input type="checkbox" className="RoleList-checkbox" />
                                                    </th>
                                                    <th style={{ width: '200px' }}>MODULE</th>
                                                    <th>PERMISSIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modules.map((mod, idx) => {
                                                    const allKeys = mod.permissions.map(p => getPermKey(mod.name, p));
                                                    const anyChecked = allKeys.some(k => formData.permissions.includes(k));

                                                    return (
                                                        <tr key={idx}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    className="RoleList-checkbox"
                                                                    checked={anyChecked}
                                                                    onChange={() => toggleModulePermissions(mod.name, mod.permissions)}
                                                                />
                                                            </td>
                                                            <td className="RoleList-module-name">
                                                                {mod.name}
                                                                {mod.subModules && <span className="RoleList-text-xs RoleList-text-gray RoleList-block RoleList-font-normal">{mod.subModules.join(', ')}</span>}
                                                            </td>
                                                            <td>
                                                                <div className="RoleList-perm-checkbox-group">
                                                                    {mod.permissions.map((perm, pIdx) => {
                                                                        const key = getPermKey(mod.name, perm);
                                                                        return (
                                                                            <label key={pIdx} className="RoleList-perm-checkbox-item">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="RoleList-checkbox"
                                                                                    checked={formData.permissions.includes(key)}
                                                                                    onChange={() => togglePermission(mod.name, perm)}
                                                                                />
                                                                                <span>{perm}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="RoleList-modal-footer">
                            <button className="RoleList-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                            <button className="RoleList-btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={() => handleSubmit(showEditModal)}>
                                {showEditModal ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="RoleList-modal-overlay">
                    <div className="RoleList-modal-content" style={{ maxWidth: '450px' }}>
                        <div className="RoleList-modal-header">
                            <h2 className="RoleList-modal-title">Delete Role</h2>
                            <button className="RoleList-close-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="RoleList-modal-body RoleList-text-center" style={{ padding: '2rem' }}>
                            <div className="RoleList-delete-icon-circle RoleList-mx-auto RoleList-mb-4">
                                <Trash2 size={32} color="#f43f5e" />
                            </div>
                            <h3 className="RoleList-section-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Are you sure?</h3>
                            <p className="RoleList-text-gray RoleList-mt-2">
                                You are about to delete the role <strong>{selectedRole?.name}</strong>.
                                This will affect all users assigned to this role.
                            </p>
                        </div>
                        <div className="RoleList-modal-footer">
                            <button className="RoleList-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                            <button className="RoleList-btn-submit" style={{ backgroundColor: '#f43f5e' }} onClick={handleDelete}>Delete Role</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleList;
