import React, { useState, useEffect, useContext } from 'react';
import {
    Landmark, Plus, Upload, ArrowRightLeft, CheckCircle2, AlertCircle,
    Calendar, DollarSign, Clock, Search, MoreVertical, Edit2, Trash2,
    ShieldCheck, RefreshCw, Layers, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CompanyContext } from '../../../context/CompanyContext';
import bankingService from '../../../services/bankingService';
import toast from 'react-hot-toast';
import './BankingOverview.css';

const BankingOverview = () => {
    const navigate = useNavigate();
    const { formatCurrency, companySettings } = useContext(CompanyContext);

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        accountName: '',
        accountNumber: '',
        bankName: '',
        branchName: '',
        ifscCode: '',
        iban: '',
        swiftBic: '',
        currency: companySettings?.currency || 'EUR',
        openingBalance: '0',
        linkToLedger: true
    });

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await bankingService.getBankAccounts();
            if (res?.success) {
                setAccounts(res.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error loading bank accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!formData.accountName || !formData.accountNumber || !formData.bankName) {
            toast.error('Please enter Account Name, Account Number, and Bank Name');
            return;
        }

        try {
            setSubmitting(true);
            const res = await bankingService.createBankAccount(formData);
            if (res.success) {
                toast.success('Bank Account added successfully!');
                setShowAddModal(false);
                setFormData({
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    branchName: '',
                    ifscCode: '',
                    iban: '',
                    swiftBic: '',
                    currency: companySettings?.currency || 'EUR',
                    openingBalance: '0',
                    linkToLedger: true
                });
                fetchAccounts();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to create bank account');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (acc) => {
        setSelectedAccount(acc);
        setFormData({
            accountName: acc.accountName || '',
            accountNumber: acc.accountNumber || '',
            bankName: acc.bankName || '',
            branchName: acc.branchName || '',
            ifscCode: acc.ifscCode || '',
            iban: acc.iban || '',
            swiftBic: acc.swiftBic || '',
            currency: acc.currency || 'USD',
            openingBalance: acc.openingBalance?.toString() || '0',
            linkToLedger: false
        });
        setShowEditModal(true);
    };

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        if (!selectedAccount) return;
        try {
            setSubmitting(true);
            const res = await bankingService.updateBankAccount(selectedAccount.id, formData);
            if (res.success) {
                toast.success('Bank Account updated successfully!');
                setShowEditModal(false);
                setSelectedAccount(null);
                fetchAccounts();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update bank account');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!selectedAccount) return;
        try {
            setSubmitting(true);
            const res = await bankingService.deleteBankAccount(selectedAccount.id);
            if (res.success) {
                toast.success('Bank Account deleted successfully');
                setShowDeleteModal(false);
                setSelectedAccount(null);
                fetchAccounts();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to delete bank account');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter accounts
    const filteredAccounts = accounts.filter(acc => {
        const q = searchTerm.toLowerCase();
        return (
            (acc.accountName || '').toLowerCase().includes(q) ||
            (acc.bankName || '').toLowerCase().includes(q) ||
            (acc.accountNumber || '').toLowerCase().includes(q)
        );
    });

    // Summary statistics
    const totalLiquidCash = accounts.reduce((sum, a) => sum + (parseFloat(a.bookBalance) || parseFloat(a.currentBalance) || 0), 0);
    const totalUnmatchedTransactions = accounts.reduce((sum, a) => sum + (a.unmatchedCount || 0), 0);

    return (
        <div className="banking-overview-page">
            {/* Page Header */}
            <div className="page-header-ribbon">
                <div>
                    <h1 className="page-title">
                        <Landmark size={28} className="title-icon text-primary" />
                        Banking & Cash Management
                    </h1>
                    <p className="page-subtitle">
                        Monitor bank balances, import statements, match transactions to invoices/bills, and reconcile to $0.00 difference.
                    </p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => navigate('/company/banking/import')}
                    >
                        <Upload size={16} /> Import Statement
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={16} /> Add Bank Account
                    </button>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="banking-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon-wrap bg-blue">
                        <DollarSign size={24} />
                    </div>
                    <div className="kpi-body">
                        <span className="kpi-label">Total Liquid Holdings</span>
                        <h3 className="kpi-value">{formatCurrency(totalLiquidCash)}</h3>
                        <span className="kpi-subtext">Across {accounts.length} linked accounts</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon-wrap bg-amber">
                        <Clock size={24} />
                    </div>
                    <div className="kpi-body">
                        <span className="kpi-label">Transactions For Review</span>
                        <h3 className="kpi-value">{totalUnmatchedTransactions}</h3>
                        <span className="kpi-subtext">Awaiting matching or categorization</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon-wrap bg-emerald">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="kpi-body">
                        <span className="kpi-label">Active Bank Accounts</span>
                        <h3 className="kpi-value">{accounts.length}</h3>
                        <span className="kpi-subtext">Integrated with Chart of Accounts</span>
                    </div>
                </div>
            </div>

            {/* Accounts Section Header */}
            <div className="accounts-section-bar">
                <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search by account, bank name or number..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    className="btn btn-icon btn-secondary" 
                    onClick={fetchAccounts} 
                    title="Refresh Bank Accounts"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Accounts Grid */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading banking data...</p>
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="empty-banking-card">
                    <Landmark size={48} className="empty-icon" />
                    <h3>No Bank Accounts Found</h3>
                    <p>Add your first bank account to begin tracking cash flows, importing statements, and reconciling.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Add Bank Account
                    </button>
                </div>
            ) : (
                <div className="accounts-grid">
                    {filteredAccounts.map((acc) => {
                        const bookBal = parseFloat(acc.bookBalance) || 0;
                        const bankBal = parseFloat(acc.currentBalance) || 0;
                        const isSync = Math.abs(bookBal - bankBal) < 0.01;

                        return (
                            <div className="bank-account-card" key={acc.id}>
                                <div className="card-top">
                                    <div className="bank-identity">
                                        <div className="bank-avatar">
                                            <Landmark size={22} />
                                        </div>
                                        <div>
                                            <h4 className="acc-name">{acc.accountName}</h4>
                                            <span className="acc-bank">{acc.bankName} ••••{acc.accountNumber?.slice(-4)}</span>
                                        </div>
                                    </div>
                                    <div className="card-actions-dropdown">
                                        <button 
                                            className="btn-action-icon" 
                                            onClick={() => handleOpenEdit(acc)}
                                            title="Edit Account"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            className="btn-action-icon text-danger" 
                                            onClick={() => { setSelectedAccount(acc); setShowDeleteModal(true); }}
                                            title="Delete Account"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="balance-dual-ribbon">
                                    <div className="balance-col">
                                        <span className="bal-tag">In QuickBooks / Books</span>
                                        <span className="bal-num">{formatCurrency(bookBal)}</span>
                                    </div>
                                    <div className="balance-col">
                                        <span className="bal-tag">Statement Balance</span>
                                        <span className="bal-num text-slate">{formatCurrency(bankBal)}</span>
                                    </div>
                                </div>

                                <div className="account-meta-info">
                                    <div className="meta-item">
                                        <span className="meta-label">GL Ledger:</span>
                                        <span className="meta-val">{acc.ledgerName || 'Auto-Linked'}</span>
                                    </div>
                                    {acc.unmatchedCount > 0 ? (
                                        <div className="meta-badge badge-unmatched">
                                            <Clock size={12} /> {acc.unmatchedCount} to review
                                        </div>
                                    ) : (
                                        <div className="meta-badge badge-clear">
                                            <CheckCircle2 size={12} /> Up to date
                                        </div>
                                    )}
                                </div>

                                {acc.lastReconciledDate && (
                                    <div className="reconciliation-stamp">
                                        <ShieldCheck size={14} className="text-emerald" />
                                        <span>Reconciled through {new Date(acc.lastReconciledDate).toLocaleDateString()}</span>
                                    </div>
                                )}

                                <div className="card-bottom-actions">
                                    <button 
                                        className="btn btn-outline btn-sm"
                                        onClick={() => navigate(`/company/banking/matching?bankAccountId=${acc.id}`)}
                                    >
                                        <ArrowRightLeft size={14} /> Match Feeds
                                    </button>
                                    <button 
                                        className="btn btn-outline btn-sm"
                                        onClick={() => navigate(`/company/banking/import?bankAccountId=${acc.id}`)}
                                    >
                                        <Upload size={14} /> Import
                                    </button>
                                    <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => navigate(`/company/banking/reconcile?bankAccountId=${acc.id}`)}
                                    >
                                        <CheckCircle2 size={14} /> Reconcile
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Add Bank Account */}
            {showAddModal && (
                <div className="bank-modal-overlay">
                    <div className="bank-modal-container">
                        <div className="bank-modal-header">
                            <div className="bank-modal-title-group">
                                <div className="bank-modal-icon">
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <h3 className="bank-modal-title">Add Bank Account</h3>
                                    <p className="bank-modal-subtitle">Connect a new bank account to track feeds and reconciliations</p>
                                </div>
                            </div>
                            <button className="bank-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleCreateAccount}>
                            <div className="bank-modal-body">
                                <div className="bank-form-group">
                                    <label className="bank-label">
                                        Account Display Name <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="bank-input"
                                        placeholder="e.g. AIB Main Operating Account" 
                                        value={formData.accountName}
                                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                    />
                                </div>

                                <div className="bank-form-grid">
                                    <div className="bank-form-group">
                                        <label className="bank-label">
                                            Bank Name <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="bank-input"
                                            placeholder="e.g. Allied Irish Bank / Chase" 
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div className="bank-form-group">
                                        <label className="bank-label">
                                            Account Number <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="bank-input"
                                            placeholder="e.g. 12345678" 
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="bank-form-grid">
                                    <div className="bank-form-group">
                                        <label className="bank-label">IBAN (Optional)</label>
                                        <input 
                                            type="text" 
                                            className="bank-input"
                                            placeholder="IE29 AIBK 9311 5212 3456 78" 
                                            value={formData.iban}
                                            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                        />
                                    </div>
                                    <div className="bank-form-group">
                                        <label className="bank-label">BIC / SWIFT / Sort Code</label>
                                        <input 
                                            type="text" 
                                            className="bank-input"
                                            placeholder="AIBKIE2D or 93-11-52" 
                                            value={formData.swiftBic}
                                            onChange={(e) => setFormData({ ...formData, swiftBic: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="bank-form-grid">
                                    <div className="bank-form-group">
                                        <label className="bank-label">Account Currency</label>
                                        <select 
                                            className="bank-select"
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="EUR">EUR (€ - Euro)</option>
                                            <option value="GBP">GBP (£ - British Pound)</option>
                                            <option value="USD">USD ($ - US Dollar)</option>
                                            <option value="INR">INR (₹ - Indian Rupee)</option>
                                        </select>
                                    </div>
                                    <div className="bank-form-group">
                                        <label className="bank-label">Opening Balance</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            className="bank-input"
                                            placeholder="0.00" 
                                            value={formData.openingBalance}
                                            onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="bank-checkbox-card">
                                    <input 
                                        type="checkbox" 
                                        id="linkLedger" 
                                        className="bank-checkbox"
                                        checked={formData.linkToLedger}
                                        onChange={(e) => setFormData({ ...formData, linkToLedger: e.target.checked })}
                                    />
                                    <div className="bank-checkbox-text">
                                        <label htmlFor="linkLedger" className="bank-checkbox-label">
                                            Auto-link to Chart of Accounts
                                        </label>
                                        <span className="bank-checkbox-hint">
                                            Creates a corresponding Asset ledger so financial reports and balances stay synchronized.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bank-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Bank Account */}
            {showEditModal && (
                <div className="bank-modal-overlay">
                    <div className="bank-modal-container">
                        <div className="bank-modal-header">
                            <div className="bank-modal-title-group">
                                <div className="bank-modal-icon">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="bank-modal-title">Edit Bank Account</h3>
                                    <p className="bank-modal-subtitle">Update account credentials and identifiers</p>
                                </div>
                            </div>
                            <button className="bank-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleUpdateAccount}>
                            <div className="bank-modal-body">
                                <div className="bank-form-group">
                                    <label className="bank-label">
                                        Account Display Name <span className="text-danger">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="bank-input"
                                        value={formData.accountName}
                                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                    />
                                </div>

                                <div className="bank-form-grid">
                                    <div className="bank-form-group">
                                        <label className="bank-label">
                                            Bank Name <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="bank-input"
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div className="bank-form-group">
                                        <label className="bank-label">
                                            Account Number <span className="text-danger">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="bank-input"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="bank-form-grid">
                                    <div className="bank-form-group">
                                        <label className="bank-label">IBAN</label>
                                        <input 
                                            type="text" 
                                            className="bank-input"
                                            value={formData.iban}
                                            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                        />
                                    </div>
                                    <div className="bank-form-group">
                                        <label className="bank-label">BIC / SWIFT / Sort Code</label>
                                        <input 
                                            type="text" 
                                            className="bank-input"
                                            value={formData.swiftBic}
                                            onChange={(e) => setFormData({ ...formData, swiftBic: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bank-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Delete Bank Account */}
            {showDeleteModal && (
                <div className="bank-modal-overlay">
                    <div className="bank-modal-container bank-modal-sm">
                        <div className="bank-modal-header">
                            <div className="bank-modal-title-group">
                                <div className="bank-modal-icon bg-red-light text-danger">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h3 className="bank-modal-title text-danger">Delete Bank Account?</h3>
                                    <p className="bank-modal-subtitle">This action cannot be undone</p>
                                </div>
                            </div>
                            <button className="bank-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
                        </div>
                        <div className="bank-modal-body">
                            <p className="delete-warning-text">
                                Are you sure you want to delete <strong>{selectedAccount?.accountName}</strong>?
                            </p>
                            <p className="text-muted text-sm">
                                All imported statement lines for this account will be removed. Your Chart of Accounts and general ledger entries will remain intact.
                            </p>
                        </div>
                        <div className="bank-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={submitting}>
                                {submitting ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankingOverview;
