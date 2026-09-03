import React, { useState, useEffect } from 'react';
import {
    Plus, Search, RotateCcw, Edit, Trash2, ChevronRight, X, Sparkles, Calendar, Eye, Printer, FileText
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import { CompanyContext } from '../../../../context/CompanyContext';
import { AuthContext } from '../../../../context/AuthContext';
import './BankTransfer.css';

const BankTransfer = () => {
    const { formatCurrency } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter and Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [tempFilterDate, setTempFilterDate] = useState('');
    const [tempFilterFromAccount, setTempFilterFromAccount] = useState('');
    const [tempFilterToAccount, setTempFilterToAccount] = useState('');
    
    const [appliedFilters, setAppliedFilters] = useState({
        date: '',
        fromAccount: '',
        toAccount: ''
    });

    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const [selectedEntry, setSelectedEntry] = useState(null);
    const [formData, setFormData] = useState({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        date: '',
        reference: '',
        description: ''
    });

    // Fetch Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [transfersRes, coaRes] = await Promise.all([
                chartOfAccountsService.getTransfers(),
                chartOfAccountsService.getChartOfAccounts()
            ]);

            if (transfersRes.success) {
                setEntries(transfersRes.data);
            }

            if (coaRes.success) {
                // Flatten COA with Asset filter
                let flatAccounts = [];
                const traverse = (groups, parentType = null) => {
                    groups.forEach(group => {
                        const currentType = group.type || parentType;
                        const lowerName = (group.name || '').toLowerCase();
                        
                        // Only process if it's an Asset group and NOT a receivable account
                        const isReceivable = lowerName.includes('receivable') || 
                                           lowerName.includes('debtor');

                        if (currentType === 'ASSETS' && !isReceivable) {
                            if (group.ledger) {
                                group.ledger.forEach(l => {
                                    flatAccounts.push({ ...l, groupName: group.name });
                                });
                            }
                            if (group.accountsubgroup) {
                                traverse(group.accountsubgroup, currentType);
                            }
                        } else if (!parentType) {
                            // If it's a top-level group that's not ASSETS, still traverse to find ASSETS
                            if (group.accountsubgroup) {
                                traverse(group.accountsubgroup, currentType);
                            }
                        }
                    });
                };
                traverse(coaRes.data);
                setAccounts(flatAccounts);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (location.state && location.state.targetTransferId && entries.length > 0) {
            const targetId = parseInt(location.state.targetTransferId);
            const foundEntry = entries.find(e => e.id === targetId);
            if (foundEntry) {
                openView(foundEntry);
            }
            // Clear state so re-renders/navigation don't keep opening the modal
            navigate(location.pathname, { replace: true, state: { ...location.state, targetTransferId: undefined } });
        }
    }, [entries, location.state, navigate]);

    // Form Handling
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            fromAccountId: '',
            toAccountId: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            reference: '',
            description: ''
        });
    };

    const openCreate = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const openEdit = (entry) => {
        setSelectedEntry(entry);
        setFormData({
            fromAccountId: entry.fromAccount?.id || '',
            toAccountId: entry.toAccount?.id || '',
            amount: entry.amount,
            date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
            reference: entry.reference || '',
            description: entry.description || ''
        });
        setIsEditOpen(true);
    };

    const openDelete = (entry) => {
        setSelectedEntry(entry);
        setIsDeleteOpen(true);
    };

    const openView = (entry) => {
        setSelectedEntry(entry);
        setIsViewOpen(true);
    };

    const handlePrint = () => {
        window.print();
    };

    // Actions & Filtering Logic
    const handleSearchClick = () => {
        setAppliedFilters({
            date: tempFilterDate,
            fromAccount: tempFilterFromAccount,
            toAccount: tempFilterToAccount
        });
        setCurrentPage(1);
    };

    const handleResetClick = () => {
        setTempFilterDate('');
        setTempFilterFromAccount('');
        setTempFilterToAccount('');
        setAppliedFilters({
            date: '',
            fromAccount: '',
            toAccount: ''
        });
        setSearchQuery('');
        setCurrentPage(1);
    };

    // Filter Logic
    const filteredEntries = entries.filter(item => {
        if (appliedFilters.date) {
            const itemDate = new Date(item.date).toISOString().split('T')[0];
            if (itemDate !== appliedFilters.date) return false;
        }
        if (appliedFilters.fromAccount && item.fromAccount?.id !== parseInt(appliedFilters.fromAccount)) {
            return false;
        }
        if (appliedFilters.toAccount && item.toAccount?.id !== parseInt(appliedFilters.toAccount)) {
            return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const ref = (item.reference || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const fromName = (item.fromAccount?.name || '').toLowerCase();
            const toName = (item.toAccount?.name || '').toLowerCase();
            const amt = String(item.amount);
            if (!ref.includes(q) && !desc.includes(q) && !fromName.includes(q) && !toName.includes(q) && !amt.includes(q)) {
                return false;
            }
        }
        return true;
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

    const handleCreate = async () => {
        try {
            if (!formData.fromAccountId || !formData.toAccountId || !formData.amount || !formData.date) {
                toast.error("Please fill required fields");
                return;
            }
            if (formData.fromAccountId == formData.toAccountId) {
                toast.error("Source and Destination accounts must be different");
                return;
            }

            await chartOfAccountsService.createTransfer(formData);
            toast.success('Transfer created successfully');
            setIsCreateOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create transfer');
        }
    };

    const handleUpdate = async () => {
        try {
            if (!formData.fromAccountId || !formData.toAccountId || !formData.amount || !formData.date) {
                toast.error("Please fill required fields");
                return;
            }
            if (formData.fromAccountId == formData.toAccountId) {
                toast.error("Source and Destination accounts must be different");
                return;
            }

            await chartOfAccountsService.updateTransfer(selectedEntry.id, formData);
            toast.success('Transfer updated successfully');
            setIsEditOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update transfer');
        }
    };

    const handleDelete = async () => {
        try {
            await chartOfAccountsService.deleteTransfer(selectedEntry.id);
            toast.success('Transfer deleted successfully');
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete transfer');
        }
    };



    return (
        <div className="BankTransfer-page">
            <div className="BankTransfer-header">
                <div>
                    <h1 className="BankTransfer-title">Bank Balance Transfer</h1>
                    <div className="BankTransfer-breadcrumb">
                        <Link to="/company/dashboard" className="BankTransfer-breadcrumb-link">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="BankTransfer-breadcrumb-current">Bank Balance Transfer</span>
                    </div>
                </div>
                {hasPermission('create accounts') && (
                    <button className="BankTransfer-btn-add" onClick={openCreate}>
                        <Plus size={18} />
                    </button>
                )}
            </div>

            <div className="BankTransfer-filter-card">
                <div className="BankTransfer-filter-row">
                    <div className="BankTransfer-filter-group">
                        <label>Date</label>
                        <input 
                            type="date" 
                            placeholder="YYYY-MM-DD" 
                            value={tempFilterDate}
                            onChange={(e) => setTempFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="BankTransfer-filter-group">
                        <label>From Account</label>
                        <select 
                            value={tempFilterFromAccount}
                            onChange={(e) => setTempFilterFromAccount(e.target.value)}
                        >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.groupName})</option>
                            ))}
                        </select>
                    </div>
                    <div className="BankTransfer-filter-group">
                        <label>To Account</label>
                        <select 
                            value={tempFilterToAccount}
                            onChange={(e) => setTempFilterToAccount(e.target.value)}
                        >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.groupName})</option>
                            ))}
                        </select>
                    </div>
                    <div className="BankTransfer-filter-actions">
                        <button className="BankTransfer-btn-search" onClick={handleSearchClick}>
                            <Search size={18} />
                        </button>
                        <button className="BankTransfer-btn-reset" onClick={handleResetClick}>
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="BankTransfer-table-card">
                <div className="BankTransfer-table-controls">
                    <div className="BankTransfer-entries-control">
                        <select 
                            value={entriesPerPage} 
                            onChange={(e) => { setEntriesPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entries per page</span>
                    </div>
                    <div className="BankTransfer-search-control">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                <div className="BankTransfer-table-responsive">
                    <table className="BankTransfer-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>FROM ACCOUNT</th>
                                <th>TO ACCOUNT</th>
                                <th>AMOUNT</th>
                                <th>REFERENCE</th>
                                <th>DESCRIPTION</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="BankTransfer-text-center p-4">Loading...</td></tr>
                            ) : paginatedEntries.length > 0 ? (
                                paginatedEntries.map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td>{row.fromAccount?.name || '-'}</td>
                                        <td>{row.toAccount?.name || '-'}</td>
                                        <td>{formatCurrency(row.amount)}</td>
                                        <td>{row.reference || '-'}</td>
                                        <td>{row.description || '-'}</td>
                                        <td>
                                             <div className="BankTransfer-actions">
                                                <button className="BankTransfer-btn-icon BankTransfer-view" title="View Detail" onClick={() => openView(row)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit accounts') && (
                                                    <button className="BankTransfer-btn-icon BankTransfer-edit" title="Edit" onClick={() => openEdit(row)}>
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete accounts') && (
                                                    <button className="BankTransfer-btn-icon BankTransfer-delete" title="Delete" onClick={() => openDelete(row)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                             </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="BankTransfer-text-center p-4">No data available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="BankTransfer-table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Showing {filteredEntries.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries</span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1}
                                className="BankTransfer-btn-cancel" 
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={currentPage === page ? "BankTransfer-btn-submit" : "BankTransfer-btn-cancel"}
                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                >
                                    {page}
                                </button>
                            ))}
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages}
                                className="BankTransfer-btn-cancel" 
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="BankTransfer-modal-overlay">
                    <div className="BankTransfer-modal BankTransfer-modal-lg">
                        <div className="BankTransfer-modal-header">
                            <h2>Create Transfer</h2>
                            <button className="BankTransfer-modal-close" onClick={() => setIsCreateOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="BankTransfer-modal-body">
                            <div className="BankTransfer-form-row">
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>From Account<span className="BankTransfer-required">*</span></label>
                                    <select
                                        name="fromAccountId"
                                        value={formData.fromAccountId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option
                                                key={acc.id}
                                                value={acc.id}
                                                disabled={acc.id == formData.toAccountId}
                                            >
                                                {acc.name} ({acc.groupName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>To Account<span className="BankTransfer-required">*</span></label>
                                    <select
                                        name="toAccountId"
                                        value={formData.toAccountId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option
                                                key={acc.id}
                                                value={acc.id}
                                                disabled={acc.id == formData.fromAccountId}
                                            >
                                                {acc.name} ({acc.groupName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="BankTransfer-form-row">
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>Amount<span className="BankTransfer-required">*</span></label>
                                    <input
                                        type="number"
                                        name="amount"
                                        placeholder="Enter Amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>Date<span className="BankTransfer-required">*</span></label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="BankTransfer-form-group">
                                <label>Reference</label>
                                <input
                                    type="text"
                                    name="reference"
                                    placeholder="Enter Reference"
                                    value={formData.reference}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="BankTransfer-form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    placeholder="Enter Description"
                                    rows="3"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                        <div className="BankTransfer-modal-footer">
                            <button className="BankTransfer-btn-cancel" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                            <button className="BankTransfer-btn-submit" onClick={handleCreate}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="BankTransfer-modal-overlay">
                    <div className="BankTransfer-modal BankTransfer-modal-lg">
                        <div className="BankTransfer-modal-header">
                            <h2>Edit Transfer</h2>
                            <button className="BankTransfer-modal-close" onClick={() => setIsEditOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="BankTransfer-modal-body">
                            <div className="BankTransfer-form-row">
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>From Account<span className="BankTransfer-required">*</span></label>
                                    <select
                                        name="fromAccountId"
                                        value={formData.fromAccountId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option
                                                key={acc.id}
                                                value={acc.id}
                                                disabled={acc.id == formData.toAccountId}
                                            >
                                                {acc.name} ({acc.groupName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>To Account<span className="BankTransfer-required">*</span></label>
                                    <select
                                        name="toAccountId"
                                        value={formData.toAccountId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option
                                                key={acc.id}
                                                value={acc.id}
                                                disabled={acc.id == formData.fromAccountId}
                                            >
                                                {acc.name} ({acc.groupName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="BankTransfer-form-row">
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>Amount<span className="BankTransfer-required">*</span></label>
                                    <input
                                        type="number"
                                        name="amount"
                                        placeholder="Enter Amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="BankTransfer-form-group BankTransfer-half">
                                    <label>Date<span className="BankTransfer-required">*</span></label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="BankTransfer-form-group">
                                <label>Reference</label>
                                <input
                                    type="text"
                                    name="reference"
                                    placeholder="Enter Reference"
                                    value={formData.reference}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="BankTransfer-form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    placeholder="Enter Description"
                                    rows="3"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                        <div className="BankTransfer-modal-footer">
                            <button className="BankTransfer-btn-cancel" onClick={() => setIsEditOpen(false)}>Cancel</button>
                            <button className="BankTransfer-btn-submit" onClick={handleUpdate}>Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {isViewOpen && selectedEntry && (
                <div className="BankTransfer-modal-overlay no-print-bg">
                    <div className="BankTransfer-modal BankTransfer-modal-lg BankTransfer-view-modal printable-area">
                        <div className="BankTransfer-modal-header no-print">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} className="text-blue-500" /> Transfer Details
                            </h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="BankTransfer-btn-print no-print" onClick={handlePrint}>
                                    <Printer size={18} /> Print
                                </button>
                                <button className="BankTransfer-modal-close no-print" onClick={() => setIsViewOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="BankTransfer-modal-body">
                            <div className="BankTransfer-view-header">
                                <div className="BankTransfer-view-brand">
                                    <h3>TAB ACCOUNTS</h3>
                                    <span>Financial Document</span>
                                </div>
                                <div className="BankTransfer-view-ref">
                                    <p>Reference: {selectedEntry.reference || 'N/A'}</p>
                                    <p>Date: {new Date(selectedEntry.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="BankTransfer-view-details-grid">
                                <div className="BankTransfer-view-detail-box transfer-source">
                                    <label>From Account</label>
                                    <p>{selectedEntry.fromAccount?.name || 'N/A'}</p>
                                    <span>Source of funds</span>
                                </div>
                                <div className="BankTransfer-view-arrow">
                                    <ChevronRight size={24} color="#64748b" />
                                </div>
                                <div className="BankTransfer-view-detail-box transfer-dest">
                                    <label>To Account</label>
                                    <p>{selectedEntry.toAccount?.name || 'N/A'}</p>
                                    <span>Destination of funds</span>
                                </div>
                            </div>

                            <div className="BankTransfer-view-amount-section">
                                <label>Transfer Amount</label>
                                <h2 className="BankTransfer-view-amount">{formatCurrency(selectedEntry.amount)}</h2>
                            </div>

                            {selectedEntry.description && (
                                <div className="BankTransfer-view-desc-section">
                                    <label>Description / Notes</label>
                                    <p className="BankTransfer-view-description">{selectedEntry.description}</p>
                                </div>
                            )}

                            <div className="BankTransfer-view-footer">
                                <p>Generated on {new Date().toLocaleString()}</p>
                                <p>System Generated Voucher</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="BankTransfer-modal-overlay">
                    <div className="BankTransfer-modal BankTransfer-modal-sm">
                        <div className="BankTransfer-modal-header">
                            <h2>Delete Transfer</h2>
                            <button className="BankTransfer-modal-close" onClick={() => setIsDeleteOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="BankTransfer-modal-body">
                            <p>Are you sure you want to delete this transfer?</p>
                        </div>
                        <div className="BankTransfer-modal-footer">
                            <button className="BankTransfer-btn-cancel" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
                            <button className="BankTransfer-btn-delete-final" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankTransfer;
