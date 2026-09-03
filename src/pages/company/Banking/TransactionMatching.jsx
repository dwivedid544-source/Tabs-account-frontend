import React, { useState, useEffect, useContext } from 'react';
import {
    ArrowRightLeft, Landmark, Search, Filter, CheckCircle2, AlertCircle,
    Check, X, ChevronDown, ChevronUp, Clock, Plus, Tag, RotateCcw,
    FileText, Calendar, DollarSign, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompanyContext } from '../../../context/CompanyContext';
import bankingService from '../../../services/bankingService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import toast from 'react-hot-toast';
import './TransactionMatching.css';

const TransactionMatching = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { formatCurrency } = useContext(CompanyContext);

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(searchParams.get('bankAccountId') || '');
    const [statusTab, setStatusTab] = useState('FOR_REVIEW'); // 'FOR_REVIEW', 'MATCHED', 'ALL'
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [rowMatches, setRowMatches] = useState({}); // { [txId]: matchArray }
    const [loadingMatches, setLoadingMatches] = useState({});

    // Categorize sub-form state
    const [ledgers, setLedgers] = useState([]);
    const [categorizeForm, setCategorizeForm] = useState({
        ledgerId: '',
        narration: '',
        payee: ''
    });
    const [submittingAction, setSubmittingAction] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const [accRes, coaRes] = await Promise.all([
                    bankingService.getBankAccounts(),
                    chartOfAccountsService.getChartOfAccounts()
                ]);

                if (accRes?.success) {
                    setAccounts(accRes.data || []);
                    if (!selectedAccountId && accRes.data.length > 0) {
                        setSelectedAccountId(accRes.data[0].id.toString());
                    }
                }

                const rawGroups = Array.isArray(coaRes?.data) ? coaRes.data : (coaRes?.data?.data || []);
                if (Array.isArray(rawGroups)) {
                    // Flatten COA ledgers
                    const flat = [];
                    rawGroups.forEach(g => {
                        if (g?.ledger && Array.isArray(g.ledger)) flat.push(...g.ledger.map(l => ({ ...l, groupType: g.type })));
                        if (g?.accountsubgroup && Array.isArray(g.accountsubgroup)) {
                            g.accountsubgroup.forEach(sg => {
                                if (sg?.ledger && Array.isArray(sg.ledger)) flat.push(...sg.ledger.map(l => ({ ...l, groupType: g.type })));
                            });
                        }
                    });
                    setLedgers(flat);
                }
            } catch (err) {
                console.error(err);
            }
        };
        init();
    }, []);

    const fetchTransactions = async () => {
        if (!selectedAccountId) return;
        try {
            setLoading(true);
            const res = await bankingService.getBankTransactions({
                bankAccountId: selectedAccountId,
                status: statusTab,
                search: searchTerm,
                startDate,
                endDate
            });
            if (res?.success) {
                const txList = res.data || [];
                setTransactions(txList);

                // Auto-fetch match suggestions for unmatched transactions (first 25)
                txList.filter(t => t.status === 'UNMATCHED' || t.status === 'PENDING').slice(0, 25).forEach(t => {
                    checkMatchesForTx(t.id);
                });
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load bank transactions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [selectedAccountId, statusTab, startDate, endDate]);

    const checkMatchesForTx = async (txId) => {
        if (rowMatches[txId] !== undefined) return;
        try {
            setLoadingMatches(prev => ({ ...prev, [txId]: true }));
            const res = await bankingService.findMatches(txId);
            if (res?.success) {
                setRowMatches(prev => ({ ...prev, [txId]: res.data || [] }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMatches(prev => ({ ...prev, [txId]: false }));
        }
    };

    const handleToggleExpand = (tx) => {
        if (expandedRowId === tx.id) {
            setExpandedRowId(null);
        } else {
            setExpandedRowId(tx.id);
            setCategorizeForm({
                ledgerId: '',
                narration: tx.description || '',
                payee: ''
            });
            checkMatchesForTx(tx.id);
        }
    };

    const handleQuickMatch = async (txId, match) => {
        try {
            setSubmittingAction(true);
            const res = await bankingService.matchTransaction(txId, {
                entityType: match.entityType,
                entityId: match.entityId,
                reference: match.reference
            });
            if (res.success) {
                toast.success(res.message);
                fetchTransactions();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to match transaction');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleCategorizeSubmit = async (txId) => {
        if (!categorizeForm.ledgerId) {
            toast.error('Please select an Expense or Income ledger');
            return;
        }

        try {
            setSubmittingAction(true);
            const res = await bankingService.categorizeTransaction(txId, categorizeForm);
            if (res.success) {
                toast.success(res.message);
                setExpandedRowId(null);
                fetchTransactions();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to categorize transaction');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleUnmatch = async (txId) => {
        try {
            setSubmittingAction(true);
            const res = await bankingService.unmatchTransaction(txId);
            if (res.success) {
                toast.success('Transaction un-matched');
                fetchTransactions();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to unmatch transaction');
        } finally {
            setSubmittingAction(false);
        }
    };

    const currentAccount = accounts.find(a => a.id.toString() === selectedAccountId);

    return (
        <div className="transaction-matching-page">
            {/* Header */}
            <div className="page-header-ribbon">
                <div>
                    <h1 className="page-title">
                        <ArrowRightLeft size={26} className="title-icon" />
                        Bank Feeds & Transaction Matching
                    </h1>
                    <p className="page-subtitle">Review incoming bank feeds, match deposits/payments to invoices and bills, or categorize on the fly.</p>
                </div>

                <div className="header-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate(`/company/banking/import?bankAccountId=${selectedAccountId}`)}
                    >
                        Import Statement
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate(`/company/banking/reconcile?bankAccountId=${selectedAccountId}`)}
                    >
                        Go to Reconcile
                    </button>
                </div>
            </div>

            {/* Account Selector Strip */}
            <div className="account-selector-strip">
                <div className="strip-left">
                    <span className="strip-label">Working Account:</span>
                    <select 
                        value={selectedAccountId} 
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="account-dropdown"
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.accountName} ({acc.bankName} ••••{acc.accountNumber?.slice(-4)})
                            </option>
                        ))}
                    </select>
                </div>

                {currentAccount && (
                    <div className="strip-balances">
                        <div className="strip-bal">
                            <span className="b-label">In Books:</span>
                            <span className="b-val">{formatCurrency(currentAccount.bookBalance)}</span>
                        </div>
                        <div className="strip-bal">
                            <span className="b-label">Statement Balance:</span>
                            <span className="b-val">{formatCurrency(currentAccount.currentBalance)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs & Filter Bar */}
            <div className="matching-controls-bar">
                <div className="status-tabs">
                    <button 
                        className={`tab-btn ${statusTab === 'FOR_REVIEW' ? 'active' : ''}`}
                        onClick={() => setStatusTab('FOR_REVIEW')}
                    >
                        For Review / Unmatched
                    </button>
                    <button 
                        className={`tab-btn ${statusTab === 'MATCHED' ? 'active' : ''}`}
                        onClick={() => setStatusTab('MATCHED')}
                    >
                        Categorized / Matched
                    </button>
                    <button 
                        className={`tab-btn ${statusTab === 'ALL' ? 'active' : ''}`}
                        onClick={() => setStatusTab('ALL')}
                    >
                        All Transactions
                    </button>
                </div>

                <div className="filter-inputs">
                    <div className="search-input-wrap">
                        <Search size={14} className="s-icon" />
                        <input 
                            type="text" 
                            placeholder="Filter by payee or ref..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                        />
                    </div>
                    <button className="btn btn-icon btn-secondary" onClick={fetchTransactions}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Transactions Feed Table */}
            <div className="feed-table-card">
                {loading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                        <p>Scanning bank feeds...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-feed">
                        <CheckCircle2 size={44} className="empty-icon text-success" />
                        <h3>You're All Caught Up!</h3>
                        <p>No transactions found for this filter. Import a new statement to review feeds.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="matching-table">
                            <thead>
                                <tr>
                                    <th width="120">Date</th>
                                    <th>Description / Payee</th>
                                    <th>Reference</th>
                                    <th className="text-right" width="130">Spent (Outflow)</th>
                                    <th className="text-right" width="130">Received (Inflow)</th>
                                    <th width="240">Suggested Match / Action</th>
                                    <th width="80"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const isDeposit = tx.transactionType === 'DEPOSIT';
                                    const isExpanded = expandedRowId === tx.id;
                                    const matches = rowMatches[tx.id] || [];
                                    const hasMatch = matches.length > 0;
                                    const isMatched = tx.status === 'MATCHED';

                                    return (
                                        <React.Fragment key={tx.id}>
                                            <tr className={`feed-row ${isExpanded ? 'row-expanded' : ''} ${isMatched ? 'row-matched' : ''}`}>
                                                <td>
                                                    <span className="date-cell">
                                                        {new Date(tx.date).toLocaleDateString('en-GB')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="desc-cell">
                                                        <strong>{tx.description || '-'}</strong>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="ref-cell">{tx.referenceNumber || '-'}</span>
                                                </td>
                                                <td className="text-right text-danger font-semibold">
                                                    {!isDeposit ? formatCurrency(tx.amount) : '-'}
                                                </td>
                                                <td className="text-right text-success font-semibold">
                                                    {isDeposit ? formatCurrency(tx.amount) : '-'}
                                                </td>
                                                <td>
                                                    {isMatched ? (
                                                        <div className="matched-status-tag">
                                                            <CheckCircle2 size={14} className="text-success" />
                                                            <span>Matched ({tx.matchedEntityType} #{tx.referenceNumber || ''})</span>
                                                        </div>
                                                    ) : hasMatch ? (
                                                        <div className="quick-match-pill">
                                                            <div className="match-info">
                                                                <span className="match-ref">{matches[0].reference}</span>
                                                                <span className="match-party">{matches[0].partyName}</span>
                                                            </div>
                                                            <button 
                                                                className="btn btn-sm btn-match"
                                                                onClick={() => handleQuickMatch(tx.id, matches[0])}
                                                                disabled={submittingAction}
                                                            >
                                                                Match
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted text-sm">No auto-match found</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    {isMatched ? (
                                                        <button 
                                                            className="btn-link text-danger" 
                                                            onClick={() => handleUnmatch(tx.id)}
                                                            title="Un-match"
                                                        >
                                                            Unmatch
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="btn-expand"
                                                            onClick={() => handleToggleExpand(tx)}
                                                        >
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Categorization Drawer */}
                                            {isExpanded && !isMatched && (
                                                <tr className="drawer-row">
                                                    <td colSpan="7">
                                                        <div className="categorize-drawer">
                                                            <h4>Categorize & Add to Books</h4>
                                                            <div className="drawer-grid">
                                                                <div className="form-group">
                                                                    <label>GL Account Ledger *</label>
                                                                    <select 
                                                                        value={categorizeForm.ledgerId}
                                                                        onChange={(e) => setCategorizeForm({ ...categorizeForm, ledgerId: e.target.value })}
                                                                    >
                                                                        <option value="">-- Select Ledger Account --</option>
                                                                        {ledgers.map(l => (
                                                                            <option key={l.id} value={l.id}>
                                                                                [{l.groupType}] {l.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                <div className="form-group">
                                                                    <label>Payee / Party Name</label>
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="e.g. Vendor or Customer"
                                                                        value={categorizeForm.payee}
                                                                        onChange={(e) => setCategorizeForm({ ...categorizeForm, payee: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div className="form-group">
                                                                    <label>Memo / Description</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={categorizeForm.narration}
                                                                        onChange={(e) => setCategorizeForm({ ...categorizeForm, narration: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div className="drawer-actions">
                                                                    <button 
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={() => setExpandedRowId(null)}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-primary btn-sm"
                                                                        onClick={() => handleCategorizeSubmit(tx.id)}
                                                                        disabled={submittingAction}
                                                                    >
                                                                        Add & Match
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionMatching;
