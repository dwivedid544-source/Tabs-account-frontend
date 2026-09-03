import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Eye, Receipt, Upload, Trash, Download, Filter } from 'lucide-react';
import './Expense.css';

const Expense = () => {
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Mock data based on requested fields
    const [expenses] = useState([
        {
            id: 1,
            date: '2026-01-13',
            autoReceiptNo: 'AUTO-001',
            manualReceiptNo: 'M-101',
            paidFrom: 'HDFC Bank',
            accounts: 'Office Rent, Electricity',
            totalAmount: '₹ 25,000.00',
            status: 'Paid',
            narration: 'Monthly office expenses'
        },
        {
            id: 2,
            date: '2026-01-12',
            autoReceiptNo: 'AUTO-002',
            manualReceiptNo: 'M-102',
            paidFrom: 'Cash in Hand',
            accounts: 'Stationery',
            totalAmount: '₹ 1,200.00',
            status: 'Pending',
            narration: 'Purchase of markers and papers'
        },
    ]);

    // Modal Item State
    const [rows, setRows] = useState([{ id: Date.now(), account: '', amount: 0, narration: '' }]);

    const handleAddRow = () => {
        setRows([...rows, { id: Date.now(), account: '', amount: 0, narration: '' }]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length > 1) {
            setRows(rows.filter(row => row.id !== id));
        }
    };

    const calculateTotal = () => {
        return rows.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0).toFixed(2);
    };

    return (
        <div className="expense-page">
            <div className="page-header">
                <h1 className="page-title">Expense</h1>
                <button className="btn-add" style={{ backgroundColor: '#1e293b' }} onClick={() => setShowAddModal(true)}>
                    <Plus size={18} />
                    Create Voucher
                </button>
            </div>

            <div className="expense-card">
                <div className="controls-row">
                    <div className="entries-control">
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="entries-text">entries per page</span>
                    </div>
                    <div className="search-control">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>AUTO RECEIPT NO</th>
                                <th>MANUAL RECEIPT NO</th>
                                <th>PAID FROM</th>
                                <th>ACCOUNTS</th>
                                <th>TOTAL AMOUNT</th>
                                <th>STATUS</th>
                                <th>NARRATION</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((exp) => (
                                <tr key={exp.id}>
                                    <td>{exp.date}</td>
                                    <td className="auto-no">{exp.autoReceiptNo}</td>
                                    <td>{exp.manualReceiptNo}</td>
                                    <td className="paid-from">{exp.paidFrom}</td>
                                    <td>{exp.accounts}</td>
                                    <td className="amount-cell">{exp.totalAmount}</td>
                                    <td>
                                        <span className={`status-badge ${exp.status.toLowerCase()}`}>
                                            {exp.status}
                                        </span>
                                    </td>
                                    <td className="narration-cell">{exp.narration}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="action-btn btn-view" onClick={() => { setSelectedExpense(exp); setShowViewModal(true); }}>
                                                <Eye size={18} />
                                            </button>
                                            <button className="action-btn btn-edit" onClick={() => { setSelectedExpense(exp); setShowEditModal(true); }}>
                                                <Pencil size={18} />
                                            </button>
                                            <button className="action-btn btn-delete" onClick={() => { setSelectedExpense(exp); setShowDeleteModal(true); }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination-row">
                    <p className="pagination-info">Showing 1 to {expenses.length} of {expenses.length} entries</p>
                    <div className="pagination-controls">
                        <button className="pagination-btn disabled">Previous</button>
                        <button className="pagination-btn active">1</button>
                        <button className="pagination-btn disabled">Next</button>
                    </div>
                </div>
            </div>

            {/* Create Voucher Modal */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay">
                    <div className="modal-content expense-modal">
                        <div className="modal-header">
                            <h2 className="modal-title">Create Voucher</h2>
                            <button className="close-btn" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label className="form-label">Auto Receipt No</label>
                                    <input type="text" className="form-input disabled-input" defaultValue="AUTO-001" readOnly />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manual Receipt No</label>
                                    <input type="text" className="form-input" placeholder="Enter manual number" />
                                </div>
                            </div>

                            <div className="form-grid-2 mt-3">
                                <div className="form-group">
                                    <label className="form-label">Voucher Date <span className="text-red">*</span></label>
                                    <input type="date" className="form-input" defaultValue="2026-01-13" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Paid From <span className="text-red">*</span></label>
                                    <div className="flex-row">
                                        <select className="form-input flex-1">
                                            <option>ABC Traders</option>
                                            <option>Cash Account</option>
                                            <option>Bank Account</option>
                                        </select>

                                    </div>
                                </div>
                            </div>

                            <div className="form-group mt-3">
                                <label className="form-label">Paid To</label>
                                <select className="form-input">
                                    <option>Select Account or Vendor</option>
                                </select>
                            </div>

                            <div className="items-table-container mt-4">
                                <table className="items-input-table">
                                    <thead>
                                        <tr>
                                            <th>ACCOUNT</th>
                                            <th>AMOUNT</th>
                                            <th>NARRATION</th>
                                            <th style={{ width: '50px' }}>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>
                                                    <input type="text" className="form-input" placeholder="Search account..." />
                                                </td>
                                                <td>
                                                    <input type="number" className="form-input" defaultValue="0.00" />
                                                </td>
                                                <td>
                                                    <input type="text" className="form-input" placeholder="Narration for this item" />
                                                </td>
                                                <td className="text-center">
                                                    <button className="btn-remove-row" onClick={() => handleRemoveRow(row.id)}>
                                                        <Trash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="1" className="text-right font-bold">Total:</td>
                                            <td className="font-bold">{calculateTotal()}</td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <button className="btn-add-row-link" onClick={handleAddRow}>
                                + Add Row
                            </button>

                            <div className="form-group mt-4">
                                <label className="form-label">Voucher Narration</label>
                                <textarea className="form-input textarea" rows={4} placeholder="Enter narration for this voucher..."></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancel</button>
                            <button className="btn-submit" style={{ backgroundColor: '#475569' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Expense Modal */}
            {showViewModal && (
                <div className="modal-overlay">
                    <div className="modal-content expense-modal">
                        <div className="modal-header">
                            <h2 className="modal-title">View Expense Voucher</h2>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="view-header-grid">
                                <div className="view-group">
                                    <label>DATE</label>
                                    <p>{selectedExpense?.date}</p>
                                </div>
                                <div className="view-group">
                                    <label>AUTO RECEIPT NO</label>
                                    <p className="auto-no">{selectedExpense?.autoReceiptNo}</p>
                                </div>
                                <div className="view-group">
                                    <label>MANUAL RECEIPT NO</label>
                                    <p>{selectedExpense?.manualReceiptNo}</p>
                                </div>
                            </div>

                            <div className="view-payment-grid mt-4">
                                <div className="view-group">
                                    <label>PAID FROM</label>
                                    <p className="paid-from text-lg">{selectedExpense?.paidFrom}</p>
                                </div>
                                <div className="view-group">
                                    <label>STATUS</label>
                                    <span className={`status-badge ${selectedExpense?.status.toLowerCase()}`}>
                                        {selectedExpense?.status}
                                    </span>
                                </div>
                            </div>

                            <div className="items-table-container mt-5">
                                <h3 className="section-subtitle">Account Details</h3>
                                <table className="items-input-table view-only">
                                    <thead>
                                        <tr>
                                            <th>ACCOUNT</th>
                                            <th>AMOUNT</th>
                                            <th>NARRATION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedExpense?.accounts.split(',').map((acc, idx) => (
                                            <tr key={idx}>
                                                <td>{acc.trim()}</td>
                                                <td>{idx === 0 ? selectedExpense?.totalAmount : '₹ 0.00'}</td>
                                                <td>{selectedExpense?.narration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td className="text-right font-bold">Total:</td>
                                            <td className="font-bold">{selectedExpense?.totalAmount}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="view-narration-section mt-4">
                                <label className="form-label text-xs uppercase font-bold text-gray-500">Voucher Narration</label>
                                <p className="view-narration-box">{selectedExpense?.narration}</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
                            <button className="btn-submit" style={{ backgroundColor: '#1e293b' }} onClick={() => { setShowViewModal(false); setShowEditModal(true); }}>Edit Voucher</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Delete Expense</h2>
                            <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete expense <strong>{selectedExpense?.autoReceiptNo}</strong>?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn-submit" style={{ backgroundColor: '#ff4d4d' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expense;
