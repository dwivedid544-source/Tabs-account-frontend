import React, { useState, useEffect } from 'react';
import {
    CreditCard, Plus, Edit, Eye, Trash2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Plans.css';
import planService from '../../../services/planService';

const Plans = () => {
    // --- State ---
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showModulesModal, setShowModulesModal] = useState(false); // New state for modules modal

    // For Edit Mode
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Form State
    const initialFormState = {
        name: '',
        basePrice: 0,
        currency: 'USD',
        invoiceLimit: '10 invoices',
        customInvoiceLimit: '',
        additionalInvoicePrice: 0,
        userLimit: '1 user',
        customUserLimit: '',
        storageCapacity: '5 GB',
        billingCycle: 'Monthly',
        status: 'Active',
        modules: [
            { name: 'Account', price: 0, enabled: true },
            { name: 'Inventory', price: 0, enabled: true },
            { name: 'POS', price: 0, enabled: true },
            { name: 'Sales', price: 0, enabled: true },
            { name: 'Purchase', price: 0, enabled: true },
            { name: 'GST Report', price: 0, enabled: true },
            { name: 'User Management', price: 0, enabled: true },
        ],
        descriptions: ['']
    };

    const [formData, setFormData] = useState(initialFormState);

    // --- Helpers ---
    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await planService.getPlans();
            setPlans(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const calculateTotalPrice = () => {
        const base = parseFloat(formData.basePrice) || 0;
        const modulesTotal = formData.modules.reduce((sum, mod) => {
            return mod.enabled ? sum + (parseFloat(mod.price) || 0) : sum;
        }, 0);
        return (base + modulesTotal).toFixed(2);
    };

    // --- Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleModuleToggle = (index) => {
        const newModules = [...formData.modules];
        newModules[index].enabled = !newModules[index].enabled;
        setFormData(prev => ({ ...prev, modules: newModules }));
    };

    const handleModulePriceChange = (index, value) => {
        const newModules = [...formData.modules];
        newModules[index].price = value;
        setFormData(prev => ({ ...prev, modules: newModules }));
    };

    const handleDescriptionChange = (index, value) => {
        const newDesc = [...formData.descriptions];
        newDesc[index] = value;
        setFormData(prev => ({ ...prev, descriptions: newDesc }));
    };

    const addDescriptionField = () => {
        setFormData(prev => ({ ...prev, descriptions: [...prev.descriptions, ''] }));
    };

    const removeDescriptionField = (index) => {
        const newDesc = formData.descriptions.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, descriptions: newDesc }));
    };

    // --- Modal Triggers ---
    const openCreateModal = () => {
        setFormData(initialFormState);
        setIsEditMode(false);
        setSelectedPlan(null);
        setShowCreateModal(true);
    };

    const openEditModal = (plan) => {
        const mappedModules = initialFormState.modules.map(defMod => {
            const existing = plan.modules?.find(m => m.name === defMod.name);
            return existing ? { ...existing, enabled: true } : { ...defMod };
        });

        const isCustomInvoice = !['10 invoices', 'Unlimited'].includes(plan.invoiceLimit);
        const isCustomUser = !['1 user', '5 users', 'Unlimited'].includes(plan.userLimit);

        setFormData({
            ...plan,
            invoiceLimit: isCustomInvoice ? 'Custom' : (plan.invoiceLimit || '10 invoices'),
            customInvoiceLimit: isCustomInvoice ? plan.invoiceLimit.replace(/[^0-9]/g, '') : '',
            userLimit: isCustomUser ? 'Custom' : (plan.userLimit || '1 user'),
            customUserLimit: isCustomUser ? plan.userLimit.replace(/[^0-9]/g, '') : '',
            storageCapacity: plan.storageCapacity || '5 GB',
            modules: mappedModules,
            descriptions: plan.descriptions && plan.descriptions.length > 0 ? plan.descriptions : ['']
        });
        setSelectedPlan(plan);
        setIsEditMode(true);
        setShowCreateModal(true);
    };

    const openViewModal = (plan) => {
        setSelectedPlan(plan);
        setShowViewModal(true);
    };

    const openDeleteModal = (plan) => {
        setSelectedPlan(plan);
        setShowDeleteModal(true);
    };

    const openModulesModal = (plan) => {
        setSelectedPlan(plan);
        setShowModulesModal(true);
    };

    const handleSubmit = async () => {
        try {
            const finalInvoiceLimit = formData.invoiceLimit === 'Custom'
                ? `${formData.customInvoiceLimit} invoices`
                : formData.invoiceLimit;

            const finalUserLimit = formData.userLimit === 'Custom'
                ? `${formData.customUserLimit} user${parseInt(formData.customUserLimit) > 1 ? 's' : ''}`
                : formData.userLimit;

            const payload = {
                ...formData,
                invoiceLimit: finalInvoiceLimit,
                userLimit: finalUserLimit,
                totalPrice: calculateTotalPrice()
            };

            if (isEditMode) {
                await planService.updatePlan(selectedPlan.id, payload);
                toast.success('Plan updated successfully');
            } else {
                await planService.createPlan(payload);
                toast.success('Plan created successfully');
            }
            setShowCreateModal(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Failed to save plan');
        }
    };

    const handleDelete = async () => {
        try {
            await planService.deletePlan(selectedPlan.id);
            toast.success('Plan deleted successfully');
            setShowDeleteModal(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete plan');
        }
    };

    // Render modules column cell
    const renderModulesCell = (plan) => {
        const enabledModules = plan.modules?.filter(m => m.enabled) || [];
        const displayCount = 2;
        const displayedModules = enabledModules.slice(0, displayCount);
        const remainingCount = enabledModules.length - displayCount;

        return (
            <div className="superplan-modules-list">
                {displayedModules.map((mod, idx) => (
                    <div key={idx} className="superplan-module-pill">
                        {mod.name} (${mod.price})
                    </div>
                ))}
                {remainingCount > 0 && (
                    <button
                        className="superplan-btn-more-modules"
                        onClick={() => openModulesModal(plan)}
                    >
                        + {remainingCount} more...
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="superplan-page">
            <div className="superplan-page-header">
                <div className="superplan-page-title">
                    <CreditCard size={24} className="text-orange-500" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>Plans & Pricing</span>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '400' }}>
                            Manage your subscription plans, pricing options.
                        </span>
                    </div>
                </div>
                <div className="superplan-header-actions">
                    <button className="superplan-btn-add-plan" onClick={openCreateModal}>
                        <Plus size={18} />
                        Add Plan
                    </button>
                </div>
            </div>

            <div className="superplan-content-card">
                {/* Controls */}
                <div className="superplan-table-controls">
                    <div className="superplan-entries-control">
                        <select className="superplan-entries-select">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                        <span>entries per page</span>
                    </div>
                    <div className="superplan-search-control">
                        <input className="superplan-search-input" placeholder="Search..." />
                    </div>
                </div>

                {/* Table */}
                <div className="superplan-table-responsive">
                    <table className="superplan-plans-table">
                        <thead>
                            <tr>
                                <th>PLAN NAME</th>
                                <th>CURRENCY</th>
                                <th>BASE PRICE</th>
                                <th>TOTAL PRICE</th>
                                <th>INVOICE LIMIT</th>
                                <th>ADDITIONAL PRICE</th>
                                <th>USER LIMIT</th>
                                <th>STORAGE</th>
                                <th>BILLING</th>
                                <th>STATUS</th>
                                <th>MODULES</th>
                                <th>SUBSCRIBERS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="13" style={{ textAlign: 'center', padding: '2rem' }}>Loading plans...</td>
                                </tr>
                            ) : plans.length === 0 ? (
                                <tr>
                                    <td colSpan="13" style={{ textAlign: 'center', padding: '2rem' }}>No plans found.</td>
                                </tr>
                            ) : (
                                plans.map(plan => (
                                    <tr key={plan.id}>
                                        <td>
                                            <span className={`superplan-badge-plan text-nowrap superplan-bg-bronze`}>
                                                {plan.name}
                                            </span>
                                        </td>
                                        <td>{plan.currency}</td>
                                        <td>${plan.basePrice}</td>
                                        <td>${plan.totalPrice}</td>
                                        <td>{plan.invoiceLimit}</td>
                                        <td>${plan.additionalInvoicePrice}/invoice</td>
                                        <td>{plan.userLimit}</td>
                                        <td>{plan.storageCapacity}</td>
                                        <td>{plan.billingCycle}</td>
                                        <td>
                                            <span className="superplan-status-badge">{plan.status}</span>
                                        </td>
                                        <td>
                                            {renderModulesCell(plan)}
                                        </td>
                                        <td>{plan._count?.companies || 0}</td>
                                        <td>
                                            <div className="superplan-actions-cell">
                                                <button className="superplan-action-icon-btn superplan-btn-edit" title="Edit" onClick={() => openEditModal(plan)}>
                                                    <Edit size={14} />
                                                </button>
                                                <button className="superplan-action-icon-btn superplan-btn-view" title="View" onClick={() => openViewModal(plan)}>
                                                    <Eye size={14} />
                                                </button>
                                                <button className="superplan-action-icon-btn superplan-btn-delete" title="Delete" onClick={() => openDeleteModal(plan)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="superplan-table-footer">
                    <span className="superplan-showing-text">
                        Showing 1 to {plans.length} of {plans.length} entries
                    </span>
                    <div className="superplan-pagination">
                        <button className="superplan-page-btn" disabled><ChevronLeft size={16} /></button>
                        <button className="superplan-page-btn active">1</button>
                        <button className="superplan-page-btn" disabled><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* --- CREATE / EDIT MODAL --- */}
            {showCreateModal && (
                <div className="superplan-modal-overlay">
                    <div className="superplan-modal-content superplan-modal-lg">
                        <div className="superplan-modal-header">
                            <h3>{isEditMode ? 'Edit Plan' : 'Add New Plan (USD)'}</h3>
                            <button className="superplan-close-btn" onClick={() => setShowCreateModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="superplan-modal-body">
                            {/* Row 1 */}
                            <div className="superplan-form-row three-col">
                                <div className="superplan-form-group">
                                    <label>Plan Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Plan Name"
                                    />
                                </div>
                                <div className="superplan-form-group">
                                    <label>Base Price ($)</label>
                                    <input
                                        type="number"
                                        name="basePrice"
                                        value={formData.basePrice}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="superplan-form-group">
                                    <label>Currency</label>
                                    <select name="currency" value={formData.currency} onChange={handleInputChange}>
                                        <option value="USD">USD ($) - US Dollar</option>
                                        <option value="EUR">EUR (€) - Euro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="superplan-form-row three-col">
                                <div className="superplan-form-group">
                                    <label>Invoice Limit</label>
                                    <div className="input-group">
                                        <select name="invoiceLimit" value={formData.invoiceLimit} onChange={handleInputChange}>
                                            <option>10 invoices</option>
                                            <option>Unlimited</option>
                                            <option>Custom</option>
                                        </select>
                                        {formData.invoiceLimit === 'Custom' && (
                                            <input
                                                type="number"
                                                name="customInvoiceLimit"
                                                value={formData.customInvoiceLimit}
                                                onChange={handleInputChange}
                                                placeholder="Enter limit"
                                                style={{ marginTop: '8px' }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="superplan-form-group">
                                    <label>Additional Invoice Price ($)</label>
                                    <input
                                        type="number"
                                        name="additionalInvoicePrice"
                                        value={formData.additionalInvoicePrice}
                                        onChange={handleInputChange}
                                        placeholder="Price beyond limit"
                                    />
                                </div>
                                <div className="superplan-form-group">
                                    <label>User Limit</label>
                                    <select name="userLimit" value={formData.userLimit} onChange={handleInputChange}>
                                        <option>1 user</option>
                                        <option>5 users</option>
                                        <option>Unlimited</option>
                                        <option>Custom</option>
                                    </select>
                                    {formData.userLimit === 'Custom' && (
                                        <input
                                            type="number"
                                            name="customUserLimit"
                                            value={formData.customUserLimit}
                                            onChange={handleInputChange}
                                            placeholder="Enter limit"
                                            style={{ marginTop: '8px' }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Row 3 */}
                            <div className="superplan-form-row two-col">
                                <div className="superplan-form-group">
                                    <label>Storage Capacity</label>
                                    <select name="storageCapacity" value={formData.storageCapacity} onChange={handleInputChange}>
                                        <option>5 GB</option>
                                        <option>10 GB</option>
                                        <option>100 GB</option>
                                    </select>
                                </div>
                                <div className="superplan-form-group">
                                    <label>Billing Cycle</label>
                                    <select name="billingCycle" value={formData.billingCycle} onChange={handleInputChange}>
                                        <option>Monthly</option>
                                        <option>Yearly</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 4 */}
                            <div className="superplan-form-row">
                                <div className="superplan-form-group">
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option>Active</option>
                                        <option>Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="superplan-form-group superplan-modules-section">
                                <label>Modules</label>
                                <div className="superplan-modules-grid">
                                    {formData.modules.map((mod, idx) => (
                                        <div key={idx} className="superplan-module-item">
                                            <div className="superplan-checkbox-wrapper">
                                                <input
                                                    type="checkbox"
                                                    checked={mod.enabled}
                                                    onChange={() => handleModuleToggle(idx)}
                                                    disabled
                                                />
                                                <span>{mod.name}</span>
                                            </div>
                                            {mod.enabled && (
                                                <div className="superplan-price-input-wrapper">
                                                    <span>$</span>
                                                    <input
                                                        type="number"
                                                        value={mod.price}
                                                        onChange={(e) => handleModulePriceChange(idx, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total Price */}
                            <div className="superplan-total-price-banner">
                                <span>Total Price: <strong>${calculateTotalPrice()}</strong> (Base Price + Selected Modules)</span>
                            </div>

                            {/* Descriptions */}
                            <div className="superplan-form-group superplan-descriptions-section">
                                <label>Descriptions</label>
                                {formData.descriptions.map((desc, idx) => (
                                    <div key={idx} className="superplan-description-row">
                                        <input
                                            type="text"
                                            value={desc}
                                            onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                                            placeholder={`Description ${idx + 1}`}
                                        />
                                        <button className="superplan-add-btn-small" onClick={addDescriptionField}>
                                            <Plus size={16} />
                                        </button>
                                        {idx > 0 && (
                                            <button className="superplan-remove-btn-small" onClick={() => removeDescriptionField(idx)}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                        </div>
                        <div className="superplan-modal-footer">
                            <button className="superplan-cancel-btn" onClick={() => setShowCreateModal(false)}>Close</button>
                            <button className="superplan-submit-btn" onClick={handleSubmit}>
                                {isEditMode ? 'Update Plan' : 'Add Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedPlan && (
                <div className="superplan-modal-overlay">
                    <div className="superplan-modal-content">
                        <div className="superplan-modal-header">
                            <h3>View Plan Details</h3>
                            <button className="superplan-close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="superplan-modal-body view-body">
                            <div className="view-row"><strong>Name:</strong> <span>{selectedPlan.name}</span></div>
                            <div className="view-row"><strong>Total Price:</strong> <span>${selectedPlan.totalPrice}</span></div>
                            <div className="view-row"><strong>Billing:</strong> <span>{selectedPlan.billingCycle}</span></div>
                            <div className="view-row"><strong>Modules:</strong>
                                <div className="view-modules">
                                    {selectedPlan.modules?.filter(m => m.enabled).map(m => m.name).join(', ')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DELETE MODAL --- */}
            {showDeleteModal && selectedPlan && (
                <div className="superplan-modal-overlay">
                    <div className="superplan-modal-content superplan-modal-sm">
                        <div className="superplan-modal-header">
                            <h3>Delete Plan</h3>
                            <button className="superplan-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="superplan-modal-body">
                            <p>Are you sure you want to delete <strong>{selectedPlan.name}</strong>? This action cannot be undone.</p>
                        </div>
                        <div className="superplan-modal-footer">
                            <button className="superplan-cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="superplan-delete-confirm-btn" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODULES MODAL --- */}
            {showModulesModal && selectedPlan && (
                <div className="superplan-modal-overlay">
                    <div className="superplan-modal-content superplan-modal-sm">
                        <div className="superplan-modal-header">
                            <h3>Included Modules ({selectedPlan.name})</h3>
                            <button className="superplan-close-btn" onClick={() => setShowModulesModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="superplan-modal-body">
                            <div className="superplan-modules-list">
                                {selectedPlan.modules?.filter(m => m.enabled).map((mod, idx) => (
                                    <div key={idx} className="superplan-module-pill" style={{ marginBottom: '5px' }}>
                                        {mod.name} (${mod.price})
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="superplan-modal-footer">
                            <button className="superplan-cancel-btn" onClick={() => setShowModulesModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Plans;
