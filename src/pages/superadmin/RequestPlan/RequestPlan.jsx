import React, { useState } from 'react';
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import './RequestPlan.css';

const RequestPlan = () => {
    // Mock Data
    const [requests, setRequests] = useState([
        // Uncomment to test with data:
        // {
        //     id: 1,
        //     company: 'Tech Solutions Inc.',
        //     email: 'admin@techsolutions.com',
        //     plan: 'Platinum',
        //     billing: 'Yearly',
        //     date: '2023-10-25',
        //     status: 'Pending'
        // },
        // {
        //     id: 2,
        //     company: 'Green Grocers',
        //     email: 'contact@greengrocers.com',
        //     plan: 'Gold',
        //     billing: 'Monthly',
        //     date: '2023-10-24',
        //     status: 'Rejected'
        // }
    ]);

    const [searchTerm, ybSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter Logic
    const filteredRequests = requests.filter(req =>
        req.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSearch = (e) => {
        ybSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="request-plan-page">
            <div className="page-header">
                <div className="page-title">
                    <ClipboardList className="App-text-primary" size={24} />
                    <span>Requested Plans</span>
                </div>
            </div>

            <div className="content-card">
                {/* Controls */}
                <div className="table-controls">
                    <div className="entries-control">
                        <select
                            className="entries-select"
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(parseInt(e.target.value))}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entries per page</span>
                    </div>

                    <div className="search-control">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                    <table className="requests-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Email</th>
                                <th>Plan</th>
                                <th>Billing</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td>{req.company}</td>
                                        <td>{req.email}</td>
                                        <td>
                                            <span className="badge-plan bg-bronze" style={{ backgroundColor: '#10b981' }}>
                                                {req.plan}
                                            </span>
                                        </td>
                                        <td>{req.billing}</td>
                                        <td>{req.date}</td>
                                        <td>
                                            <span className={`status-badge status-${req.status.toLowerCase()}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            {req.status === 'Pending' && (
                                                <>
                                                    <button className="action-btn btn-approve">Approve</button>
                                                    <button className="action-btn btn-reject">Reject</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <div className="empty-state">
                                            No requested plans available. Please check back later.
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Only show if data exists) */}
                {filteredRequests.length > 0 && (
                    <div className="table-footer">
                        <div className="showing-text">
                            Showing 1 to {filteredRequests.length} of {filteredRequests.length} entries
                        </div>
                        <div className="pagination">
                            <button className="page-btn" disabled><ChevronLeft size={16} /></button>
                            <button className="page-btn active">1</button>
                            <button className="page-btn" disabled><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestPlan;
