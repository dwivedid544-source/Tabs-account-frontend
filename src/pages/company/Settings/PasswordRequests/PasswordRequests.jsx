import React, { useState, useEffect } from 'react';
import {
    Search, Filter, CheckCircle, XCircle, Clock,
    MoreHorizontal, Shield, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './PasswordRequests.css';
import passwordRequestService from '../../../../api/passwordRequestService';
import GetCompanyId from '../../../../api/GetCompanyId';

const PasswordRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const handleApprove = async (id) => {
        try {
            await passwordRequestService.updateStatus(id, 'Approved');
            toast.success('Request approved successfully!');
            fetchRequests();
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        }
    };

    const handleReject = async (id) => {
        try {
            await passwordRequestService.updateStatus(id, 'Rejected');
            toast.success('Request rejected successfully!');
            fetchRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
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
            <div className="page-header">
                <div>
                    <h1 className="page-title">Password Requests</h1>
                    <p className="page-subtitle">Manage user password change requests</p>
                </div>
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
                                {/* <th className="text-right">Actions</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No password requests found
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
                                        {/* <td className="text-right">
                                            {row.status === 'Pending' ? (
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-action approve"
                                                        title="Approve"
                                                        onClick={() => handleApprove(row.id)}
                                                    >
                                                        ✅ Approve
                                                    </button>

                                                    <button
                                                        className="btn-action reject"
                                                        title="Reject"
                                                        onClick={() => handleReject(row.id)}
                                                    >
                                                        ❌ Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td> */}
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
