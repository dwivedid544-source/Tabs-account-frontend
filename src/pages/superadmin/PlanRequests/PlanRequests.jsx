import React, { useState, useEffect } from 'react';
import {
    Clock, Search, Pencil, Trash2, X,
    CheckCircle2, XCircle, AlertCircle, Building2,
    Mail, Calendar, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import planRequestService from '../../../services/planRequestService';
import planService from '../../../services/planService';
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../../../config/emailConfig';
import './PlanRequests.css';

const PlanRequests = () => {
    const [requests, setRequests] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingRequest, setEditingRequest] = useState(null);
    const [requestToDelete, setRequestToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approvePassword, setApprovePassword] = useState('');
    const [requestToApprove, setRequestToApprove] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const [formData, setFormData] = useState({
        companyName: '',
        email: '',
        planId: '',
        billingCycle: 'Monthly',
        startDate: new Date().toISOString().split('T')[0],
        status: 'Pending'
    });

    const generateRandomPassword = () => {
        const charset = "0123456789";
        let retVal = "";
        for (let i = 0; i < 8; ++i) { // 8 digit numeric password
            retVal += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return retVal;
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [requestsRes, plansRes] = await Promise.all([
                planRequestService.getPlanRequests(),
                planService.getPlans()
            ]);

            // Handle both wrapped { data: [...] } and direct array responses
            const reqData = Array.isArray(requestsRes) ? requestsRes : (requestsRes?.data || []);
            const pData = Array.isArray(plansRes) ? plansRes : (plansRes?.data || []);

            setRequests(reqData);
            setPlans(pData);
        } catch (error) {
            console.error('Fetch Data Error:', error);
            toast.error('Failed to fetch data. Please check your permissions.');
            setRequests([]); // Fallback to empty array
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };

        if (name === 'planId' && value) {
            const selectedPlan = plans.find(p => String(p.id) === String(value));
            if (selectedPlan) {
                // Dynamically set billingCycle based on the selected plan's billing cycle
                if (selectedPlan.billingCycle) {
                    updatedFormData.billingCycle = selectedPlan.billingCycle;
                }
            }
        }

        setFormData(updatedFormData);
    };

    const handleLogoChange = (e) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const selectedPlan = plans.find(p => p.id === parseInt(formData.planId));
            const dataToSubmit = new FormData();
            Object.keys(formData).forEach(key => {
                dataToSubmit.append(key, formData[key]);
            });
            dataToSubmit.append('planName', selectedPlan ? selectedPlan.name : '');
            if (logoFile) {
                dataToSubmit.append('logo', logoFile);
            }

            if (editingRequest) {
                await planRequestService.updatePlanRequest(editingRequest.id, dataToSubmit);
                toast.success('Request updated successfully');
            } else {
                await planRequestService.createPlanRequest(dataToSubmit);
                toast.success('Request created successfully');
            }
            fetchData();
            closeModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async () => {
        try {
            await planRequestService.deletePlanRequest(requestToDelete.id);
            toast.success('Request deleted successfully');
            fetchData();
            setShowDeleteModal(false);
        } catch (error) {
            toast.error('Failed to delete request');
        }
    };

    const handleApprove = async (id) => {
        const req = requests.find(r => r.id === id);
        setRequestToApprove(req);
        setApprovePassword(generateRandomPassword());
        setShowApproveModal(true);
    };

    const confirmApprove = async () => {
        if (!approvePassword) {
            toast.error('Please enter a password for the new account');
            return;
        }

        try {
            setIsApproving(true);
            const response = await planRequestService.approvePlanRequest(requestToApprove.id, {
                password: approvePassword
            });
            const message = response?.message || 'Request Accepted';
            
            // Send Email Notification via EmailJS
            try {
                const templateParams = {
                    to_email: requestToApprove.email,
                    name: requestToApprove.companyName,
                    email: requestToApprove.email,
                    password: approvePassword,
                    planName: requestToApprove.plan?.name || requestToApprove.planName || 'Standard Plan',
                    message: "Plan Buy Successfully! Your account is now active.",
                    time: new Date().toLocaleString(),
                    loginUrl: window.location.origin + '/login',
                    reply_to: 'support@tabaccounts.com' // Optional: adds reply_to context
                };

                await emailjs.send(
                    emailConfig.SERVICE_ID,
                    emailConfig.TEMPLATE_ID,
                    templateParams,
                    emailConfig.PUBLIC_KEY
                );
                toast.success('Approval email sent to client');
            } catch (emailError) {
                console.error('Email Send Error:', emailError);
                toast.error('Approved, but failed to send notification email');
            }

            toast.success(message);
            setShowApproveModal(false);
            fetchData();
        } catch (error) {
            console.error('Approve Error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to approve request';
            toast.error(errorMsg);
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async (id) => {
        try {
            await planRequestService.rejectPlanRequest(id);
            toast.success('Request Rejected');
            fetchData();
        } catch (error) {
            toast.error('Failed to reject request');
        }
    };

    const openModal = (request = null) => {
        if (request) {
            setEditingRequest(request);
            setFormData({
                companyName: request.companyName || '',
                email: request.email || '',
                planId: request.planId || '',
                billingCycle: request.billingCycle || 'Monthly',
                startDate: request.startDate ? request.startDate.split('T')[0] : '',
                status: request.status || 'Pending'
            });
            setLogoPreview(request.logo || null);
            setLogoFile(null);
        } else {
            setEditingRequest(null);
            setFormData({
                companyName: '',
                email: '',
                planId: '',
                billingCycle: 'Monthly',
                startDate: new Date().toISOString().split('T')[0],
                status: 'Pending'
            });
            setLogoPreview(null);
            setLogoFile(null);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingRequest(null);
        setLogoPreview(null);
        setLogoFile(null);
    };

    const getStatusBadgeClass = (status) => {
        const s = status?.toString().toLowerCase();
        if (s === 'accepted' || s === 'approved') return 'PlanReq-badge-success';
        if (s === 'rejected') return 'PlanReq-badge-danger';
        if (s === 'pending') return 'PlanReq-badge-warning';
        return 'PlanReq-badge-secondary';
    };

    const getStatusLabel = (status) => {
        if (!status) return 'Pending';
        const s = status.toString().toLowerCase();
        // User wants to show "Accepted" and "Rejected"
        if (s === 'approved' || s === 'accepted') return 'Accepted';
        if (s === 'rejected') return 'Rejected';
        if (s === 'pending') return 'Pending';
        return status;
    };

    const filteredRequests = Array.isArray(requests) ? requests.filter(req => {
        const matchesSearch = req.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === '' || req.status?.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    }) : [];

    return (
        <div className="PlanReq-container">
            <div className="PlanReq-page">
                <div className="PlanReq-header">
                    <div className="PlanReq-title">
                        <Clock size={24} className="text-orange-500" />
                        <span>Plan Purchase Requests</span>
                    </div>
                    {/* <button className="PlanReq-add-btn" onClick={() => openModal()}>
                        Complete Your Purchase
                    </button> */}
                </div>

                <div className="PlanReq-filters-bar">
                    <div className="PlanReq-search-wrapper">
                        <Search className="PlanReq-search-icon" size={18} />
                        <input
                            type="text"
                            className="PlanReq-form-control"
                            placeholder="Search by company or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="PlanReq-filter-group flex items-center gap-2">
                        <select
                            className="PlanReq-form-control"
                            style={{ width: '200px' }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="accepted">Accepted</option>
                        </select>
                    </div>
                </div>

                <div className="PlanReq-table-container">
                    <table className="PlanReq-custom-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Contact</th>
                                <th>Plan</th>
                                <th>Billing</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-10">Loading requests...</td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-10">No requests found.</td></tr>
                            ) : (
                                filteredRequests.map(request => (
                                    <tr key={request.id}>
                                        <td data-label="Company">
                                            <div className="flex items-center gap-2">
                                                {request.logo ? (
                                                    <img src={request.logo} alt="logo" className="PlanReq-company-logo-sm" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="PlanReq-company-icon-sm">
                                                        <Building2 size={16} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold">{request.companyName}</div>
                                                    <div className="text-xs text-gray-500">{request.address?.substring(0, 30)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Contact">
                                            <div className="text-sm">{request.email}</div>
                                            <div className="text-xs text-gray-500">{request.phone}</div>
                                        </td>
                                        <td data-label="Plan">
                                            <span className="PlanReq-plan-tag">
                                                {request.plan?.name || request.planName || 'N/A'}
                                            </span>
                                        </td>
                                        <td data-label="Billing">{request.billingCycle}</td>
                                        <td data-label="Date">{new Date(request.startDate).toLocaleDateString()}</td>
                                        <td data-label="Status">
                                            <span className={`PlanReq-status-badge ${getStatusBadgeClass(request.status)}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                        </td>
                                        <td data-label="Actions">
                                            <div className="PlanReq-action-btns">
                                                {request.status?.toLowerCase() === 'pending' ? (
                                                    <>
                                                        <button
                                                            className="PlanReq-btn-sm PlanReq-btn-approve"
                                                            onClick={() => handleApprove(request.id)}
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 size={14} /> Approve
                                                        </button>
                                                        <button
                                                            className="PlanReq-btn-sm PlanReq-btn-reject"
                                                            onClick={() => handleReject(request.id)}
                                                            title="Reject"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic"></span>
                                                )}
                                                <div className="flex gap-1 ml-2 border-l pl-2">
                                                    <button
                                                        className="PlanReq-btn-sm PlanReq-btn-edit"
                                                        onClick={() => openModal(request)}
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="PlanReq-btn-sm PlanReq-btn-delete"
                                                        onClick={() => { setRequestToDelete(request); setShowDeleteModal(true); }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Post/Put Modal */}
                {showModal && (
                    <div className="PlanReq-modal-overlay">
                        <div className="PlanReq-modal-content">
                            <div className="PlanReq-modal-header">
                                <h2>{editingRequest ? 'Update Purchase Request' : 'Complete Your Purchase'}</h2>
                                <button className="PlanReq-close-btn" onClick={closeModal}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="PlanReq-modal-body">
                                    <div className="space-y-4">
                                        <div className="PlanReq-form-group flex flex-col items-center mb-4">
                                            <label className="block mb-2 font-semibold text-slate-700 w-full text-center">Company Logo</label>
                                            <div className="flex items-center gap-4">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo Preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                ) : (
                                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                                        <Building2 size={24} />
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        <div className="PlanReq-form-group">
                                            <label className="required block mb-1 font-semibold text-slate-700">Selected Plan</label>
                                            <select
                                                name="planId"
                                                className="PlanReq-form-control w-full"
                                                value={formData.planId}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select a Plan</option>
                                                {plans.map(plan => (
                                                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Modules Display */}
                                        {formData.planId && plans.find(p => p.id === parseInt(formData.planId)) && (
                                            <div className="PlanReq-form-group">
                                                <label className="block mb-2 font-semibold text-slate-700">Included Modules</label>
                                                <div className="PlanReq-modules-grid">
                                                    {(plans.find(p => p.id === parseInt(formData.planId))?.modules || []).map((mod, idx) => (
                                                        <div key={idx} className={`PlanReq-module-item ${mod.enabled ? 'enabled' : 'disabled'}`}>
                                                            {mod.enabled ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-slate-300" />}
                                                            <span>{mod.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="PlanReq-form-row">
                                            <div className="PlanReq-form-group">
                                                <label className="required block mb-1 font-semibold text-slate-700">Company Name</label>
                                                <div className="PlanReq-input-icon-wrapper">
                                                    <Building2 size={16} className="PlanReq-input-icon" />
                                                    <input
                                                        type="text"
                                                        name="companyName"
                                                        className="PlanReq-form-control"
                                                        placeholder="Enter Company Name"
                                                        value={formData.companyName}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="PlanReq-form-group">
                                                <label className="required block mb-1 font-semibold text-slate-700">Email Address</label>
                                                <div className="PlanReq-input-icon-wrapper">
                                                    <Mail size={16} className="PlanReq-input-icon" />
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        className="PlanReq-form-control"
                                                        placeholder="Enter Email Address"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="PlanReq-form-group">
                                            <label className="required block mb-1 font-semibold text-slate-700">Billing Duration</label>
                                            <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                                                    <input
                                                        type="radio"
                                                        name="billingCycle"
                                                        value="Monthly"
                                                        checked={formData.billingCycle === 'Monthly'}
                                                        onChange={handleInputChange}
                                                    />
                                                    <span>Monthly</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                                                    <input
                                                        type="radio"
                                                        name="billingCycle"
                                                        value="Yearly"
                                                        checked={formData.billingCycle === 'Yearly'}
                                                        onChange={handleInputChange}
                                                    />
                                                    <span>Yearly</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div className="PlanReq-form-row">
                                            <div className="PlanReq-form-group">
                                                <label className="required block mb-1 font-semibold text-slate-700">Start Date</label>
                                                <div className="PlanReq-input-icon-wrapper">
                                                    <Calendar size={16} className="PlanReq-input-icon" />
                                                    <input
                                                        type="date"
                                                        name="startDate"
                                                        className="PlanReq-form-control"
                                                        value={formData.startDate}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            {editingRequest && (
                                                <div className="PlanReq-form-group">
                                                    <label className="block mb-1 font-semibold text-slate-700">Status</label>
                                                    <select
                                                        name="status"
                                                        className="PlanReq-form-control w-full"
                                                        value={formData.status}
                                                        onChange={handleInputChange}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Approved">Approved</option>
                                                        <option value="Accepted">Accepted</option>
                                                        <option value="Rejected">Rejected</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="PlanReq-modal-footer">
                                    <button type="button" className="PlanReq-btn-cancel" onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="PlanReq-btn-save">
                                        {editingRequest ? 'Update Request' : 'Submit Purchase'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Modal */}
                {showDeleteModal && (
                    <div className="PlanReq-modal-overlay">
                        <div className="PlanReq-modal-content PlanReq-modal-sm">
                            <div className="PlanReq-delete-modal-body">
                                <div className="PlanReq-delete-icon-wrapper">
                                    <AlertCircle size={40} />
                                </div>
                                <h3 className="PlanReq-delete-modal-title">Delete Request?</h3>
                                <p className="PlanReq-delete-modal-text">
                                    Are you sure you want to delete this purchase request?
                                    <br />This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-5 mt-4">
                                    <button className="PlanReq-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                    <button className="PlanReq-btn-delete-full" onClick={handleDelete}>Delete Anyway</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Approve with Password Modal */}
                {showApproveModal && (
                    <div className="PlanReq-modal-overlay">
                        <div className="PlanReq-modal-content PlanReq-modal-sm">
                            <div className="PlanReq-modal-header">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Approve & Create Account</h2>
                                <button className="PlanReq-close-btn" onClick={() => setShowApproveModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="PlanReq-modal-body">
                                <div className="PlanReq-delete-icon-wrapper" style={{ backgroundColor: '#f8fafc', color: '#1e293b', borderColor: '#f1f5f9' }}>
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="PlanReq-delete-modal-title">Admin Account Password</h3>
                                <p className="PlanReq-delete-modal-text">
                                    A random password has been generated for <strong>{requestToApprove?.companyName}</strong>.
                                    Please copy and share this with the client.
                                </p>
                                <div className="PlanReq-input-icon-wrapper">
                                    <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="PlanReq-form-control"
                                            value={approvePassword}
                                            readOnly
                                            style={{ backgroundColor: '#fdfdfd', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '1px' }}
                                        />
                                        <button
                                            type="button"
                                            className="PlanReq-btn-sm"
                                            onClick={() => setApprovePassword(generateRandomPassword())}
                                            style={{ padding: '0 15px', whiteSpace: 'nowrap' }}
                                        >
                                            Regenerate
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="PlanReq-modal-footer">
                                <button className="PlanReq-btn-cancel" onClick={() => setShowApproveModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="PlanReq-btn-save"
                                    onClick={confirmApprove}
                                    disabled={isApproving}
                                    style={{ backgroundColor: '#1e293b' }}
                                >
                                    {isApproving ? 'Approving...' : 'Accept & Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlanRequests;