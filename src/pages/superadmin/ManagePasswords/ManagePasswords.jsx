import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import passwordRequestService from '../../../api/passwordRequestService';
import './ManagePasswords.css';

const ManagePasswords = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const data = await passwordRequestService.getRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (request) => {
        setSelectedRequest(request);
        setFormData({ password: '', confirmPassword: '' });
        setShowModal(true);
    };

    const handleApprove = async () => {
        if (!formData.password || !formData.confirmPassword) {
            toast.error("Please fill all fields");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            await passwordRequestService.updateStatus(selectedRequest.id, {
                status: 'Approved',
                newPassword: formData.password
            });
            toast.success("Password reset and request approved");
            setShowModal(false);
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast.error("Failed to approve request");
        }
    };

    const handleReject = async () => {
        try {
            await passwordRequestService.updateStatus(selectedRequest.id, {
                status: 'Rejected'
            });
            toast.success("Request rejected");
            setShowModal(false);
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject request");
        }
    };

    return (
        <div className="mp-page-container">
            <div className="mp-page-header">
                <h1 className="mp-page-heading">Manage Passwords</h1>
            </div>

            <div className="mp-card">
                <div className="mp-card-header">
                    <h3 className="mp-card-title">Manage Password Requests</h3>
                </div>

                <div className="mp-table-responsive">
                    <table className="mp-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>COMPANY</th>
                                <th>USER / EMAIL</th>
                                <th>REQUEST DATE</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center p-4">Loading...</td></tr>
                            ) : requests.length > 0 ? (
                                requests.map((req, index) => (
                                    <tr key={req.id}>
                                        <td>{index + 1}</td>
                                        <td>{req.company?.name || 'N/A'}</td>
                                        <td>
                                            <div className="mp-user-info">
                                                <span className="mp-user-name">{req.user?.name}</span>
                                                <span className="mp-user-email">{req.user?.email}</span>
                                            </div>
                                        </td>
                                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`mp-status-badge mp-status-${req.status.toLowerCase()}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            {req.status === 'Pending' && (
                                                <button className="mp-btn-respond" onClick={() => handleAction(req)}>Respond</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <div className="mp-empty-state">
                                            No password change requests found.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Respond Modal */}
            {showModal && selectedRequest && (
                <div className="mp-modal-overlay">
                    <div className="mp-modal-content">
                        <div className="mp-modal-header">
                            <h2 className="mp-modal-title">Reset Password</h2>
                            <button className="mp-btn-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="mp-modal-body">
                            <p className="mb-4 text-gray-600">
                                Request from: <strong>{selectedRequest.user?.email}</strong><br />
                                Company: <strong>{selectedRequest.company?.name}</strong>
                            </p>
                            <div className="mp-form-group">
                                <label className="mp-form-label">New Password</label>
                                <input
                                    type="password"
                                    className="mp-form-input"
                                    placeholder="Enter new password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="mp-form-group">
                                <label className="mp-form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="mp-form-input"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mp-modal-footer">
                            <button className="mp-btn-reject" onClick={handleReject}>Reject</button>
                            <div className="mp-modal-actions-right">
                                <button className="mp-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="mp-btn-approve" onClick={handleApprove}>Approve & Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePasswords;
