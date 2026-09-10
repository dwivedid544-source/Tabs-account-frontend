import React, { useState, useEffect } from 'react';
import {
    Search, CheckCircle, XCircle, Clock,
    Shield, Loader2, Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import './PasswordRequests.css';
import passwordRequestService from '../../../../api/passwordRequestService';
import GetCompanyId from '../../../../api/GetCompanyId';

const PasswordRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const data = await passwordRequestService.getAll(companyId);
            setRequests(data);
        } catch (error) {
            console.error('Error fetching password requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequest = async () => {
        try {
            setRequesting(true);
            const res = await passwordRequestService.create();
            toast.success(res.message || 'Password change request submitted successfully!');
            fetchRequests();
        } catch (error) {
            console.error('Error submitting password request:', error);
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setRequesting(false);
        }
    };

    const handleApprove = async (id, userName) => {
        const newPass = window.prompt(`Enter new temporary password for ${userName || 'this user'}:`, 'Welcome@123');
        if (newPass === null) return; // Cancelled
        if (!newPass.trim()) {
            toast.error('Password cannot be empty');
            return;
        }

        try {
            await passwordRequestService.updateStatus(id, {
                status: 'Approved',
                newPassword: newPass.trim()
            });
            toast.success(`Password reset successfully! New temporary password: ${newPass.trim()}`, { duration: 6000 });
            fetchRequests();
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error(error.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this password change request?')) return;

        try {
            await passwordRequestService.updateStatus(id, 'Rejected');
            toast.success('Request rejected.');
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error(error.response?.data?.message || 'Failed to reject request');
        }
    };

    const filteredRequests = requests.filter(req =>
        req.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        if (!status) return null;
        switch (status.toString().toLowerCase()) {
            case 'approved':
                return (
                    <span className="req-status-badge approved">
                        <CheckCircle size={14} strokeWidth={2.5} />
                        <span>Approved</span>
                    </span>
                );
            case 'rejected':
                return (
                    <span className="req-status-badge rejected">
                        <XCircle size={14} strokeWidth={2.5} />
                        <span>Rejected</span>
                    </span>
                );
            default:
                return (
                    <span className="req-status-badge pending">
                        <Clock size={14} strokeWidth={2.5} />
                        <span>Pending</span>
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="password-requests-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Loader2 className="animate-spin" size={40} />
                </div>
            </div>
        );
    }

    return (
        <div className="password-requests-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">Password Requests</h1>
                    <p className="page-subtitle">Manage user password change requests</p>
                </div>
                <button
                    type="button"
                    className="btn-create-request"
                    onClick={handleCreateRequest}
                    disabled={requesting}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <Key size={15} />
                    {requesting ? 'Submitting...' : 'Request Password Reset'}
                </button>
            </div>

            {/* Controls */}
            <div className="table-controls-card">
                <div className="search-group">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Requests Table */}
            <div className="table-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Request Date</th>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                                        No password requests found. When employees request an admin-assisted password reset, their requests will appear here.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((row) => (
                                    <tr key={row.id}>
                                        <td className="text-gray-500">
                                            {new Date(row.createdAt).toLocaleString()}
                                        </td>
                                        <td>
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    <span>{row.user?.name?.charAt(0) || 'U'}</span>
                                                </div>
                                                <div className="user-details">
                                                    <span className="user-name">{row.user?.name || 'Unknown'}</span>
                                                    <span className="user-email">{row.user?.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="role-tag flex-center">
                                                <Shield size={12} className="mr-1" /> {row.user?.role || 'USER'}
                                            </span>
                                        </td>
                                        <td>{getStatusBadge(row.status)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {row.status === 'Pending' ? (
                                                <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-action approve"
                                                        title="Approve and set temporary password"
                                                        onClick={() => handleApprove(row.id, row.user?.name)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: '#10b981',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <CheckCircle size={13} /> Approve &amp; Reset
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn-action reject"
                                                        title="Reject Request"
                                                        onClick={() => handleReject(row.id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: '#fee2e2',
                                                            color: '#b91c1c',
                                                            border: '1px solid #fecaca',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <XCircle size={13} /> Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Resolved</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PasswordRequests;
