import React, { useState, useEffect, useContext } from 'react';
import {
    CheckCircle2, AlertCircle, Calendar, DollarSign, ArrowRightLeft,
    Check, RotateCcw, Clock, ShieldCheck, History, Printer, Search,
    CheckSquare, Square, ChevronRight, FileCheck, Landmark
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompanyContext } from '../../../context/CompanyContext';
import bankingService from '../../../services/bankingService';
import toast from 'react-hot-toast';
import './BankReconciliation.css';

const BankReconciliation = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { formatCurrency } = useContext(CompanyContext);

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(searchParams.get('bankAccountId') || '');
    const [activeView, setActiveView] = useState('RECONCILE'); // 'RECONCILE' or 'HISTORY'

    // Reconciliation Inputs
    const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
    const [statementEndingBalance, setStatementEndingBalance] = useState('');
    const [reconciliationNotes, setReconciliationNotes] = useState('');

    // Live Calculation Data from Backend
    const [recData, setRecData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Active Checklist Tab
    const [checklistTab, setChecklistTab] = useState('ALL'); // 'ALL', 'DEPOSITS', 'PAYMENTS'
    const [historyList, setHistoryList] = useState([]);

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const res = await bankingService.getBankAccounts();
                if (res?.success) {
                    setAccounts(res.data || []);
                    if (!selectedAccountId && res.data.length > 0) {
                        setSelectedAccountId(res.data[0].id.toString());
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load bank accounts');
            }
        };
        loadAccounts();
    }, []);

    const fetchReconciliationPreview = async () => {
        if (!selectedAccountId) return;
        try {
            setLoading(true);
            const res = await bankingService.getReconciliationData(
                selectedAccountId,
                statementDate,
                statementEndingBalance
            );
            if (res?.success) {
                setRecData(res.data);
            }
        } catch (err) {
            console.error(err);
            toast.error('Error calculating reconciliation figures');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeView === 'RECONCILE') {
            fetchReconciliationPreview();
        } else {
            fetchHistory();
        }
    }, [selectedAccountId, statementDate, statementEndingBalance, activeView]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await bankingService.getReconciliationHistory(selectedAccountId);
            if (res?.success) {
                setHistoryList(res.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Toggle single transaction clear
    const handleToggleClear = async (txId, currentStatus) => {
        try {
            const nextStatus = !currentStatus;
            // Optimistic local state update
            setRecData(prev => {
                if (!prev) return prev;
                const updatedTxs = prev.transactions.map(t => t.id === txId ? { ...t, isCleared: nextStatus } : t);
                
                let depCount = 0;
                let depAmt = 0;
                let withCount = 0;
                let withAmt = 0;

                updatedTxs.forEach(t => {
                    const amt = parseFloat(t.amount) || 0;
                    if (t.isCleared) {
                        if (t.transactionType === 'DEPOSIT') {
                            depCount++;
                            depAmt += amt;
                        } else {
                            withCount++;
                            withAmt += amt;
                        }
                    }
                });

                const clearedBal = prev.beginningBalance + depAmt - withAmt;
                const diff = (parseFloat(statementEndingBalance) || 0) - clearedBal;

                return {
                    ...prev,
                    transactions: updatedTxs,
                    clearedDepositsCount: depCount,
                    clearedDepositsAmount: depAmt,
                    clearedWithdrawalsCount: withCount,
                    clearedWithdrawalsAmount: withAmt,
                    clearedBalance: clearedBal,
                    difference: diff,
                    isBalanced: Math.abs(diff) < 0.01
                };
            });

            await bankingService.toggleClearTransaction(txId, nextStatus);
        } catch (err) {
            console.error(err);
            toast.error('Failed to update transaction status');
            fetchReconciliationPreview();
        }
    };

    // Bulk Select / Deselect All
    const handleToggleSelectAll = async (targetClear) => {
        if (!recData?.transactions) return;
        const currentFiltered = getFilteredTransactions();
        const txIds = currentFiltered.map(t => t.id);

        try {
            // Update each in background
            await Promise.all(txIds.map(id => bankingService.toggleClearTransaction(id, targetClear)));
            toast.success(targetClear ? 'Marked all as cleared' : 'Cleared all selections');
            fetchReconciliationPreview();
        } catch (err) {
            console.error(err);
            toast.error('Error updating transactions');
        }
    };

    const handleFinishReconciliation = async () => {
        if (!recData?.isBalanced) {
            toast.error(`Difference must be $0.00 to finish. Current difference: ${formatCurrency(recData?.difference || 0)}`);
            return;
        }

        const clearedIds = recData.transactions.filter(t => t.isCleared).map(t => t.id);

        try {
            setSubmitting(true);
            const payload = {
                bankAccountId: selectedAccountId,
                statementDate,
                statementEndingBalance: parseFloat(statementEndingBalance) || 0,
                beginningBalance: recData.beginningBalance,
                clearedBalance: recData.clearedBalance,
                difference: recData.difference,
                clearedDepositsCount: recData.clearedDepositsCount,
                clearedDepositsAmount: recData.clearedDepositsAmount,
                clearedWithdrawalsCount: recData.clearedWithdrawalsCount,
                clearedWithdrawalsAmount: recData.clearedWithdrawalsAmount,
                clearedTransactionIds: clearedIds,
                notes: reconciliationNotes
            };

            const res = await bankingService.commitReconciliation(payload);
            if (res.success) {
                toast.success('🎉 Reconciliation successfully finished and locked!');
                setActiveView('HISTORY');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to finish reconciliation');
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredTransactions = () => {
        if (!recData?.transactions) return [];
        if (checklistTab === 'DEPOSITS') {
            return recData.transactions.filter(t => t.transactionType === 'DEPOSIT');
        }
        if (checklistTab === 'PAYMENTS') {
            return recData.transactions.filter(t => t.transactionType === 'WITHDRAWAL');
        }
        return recData.transactions;
    };

    const filteredTransactions = getFilteredTransactions();
    const currentAccount = accounts.find(a => a.id.toString() === selectedAccountId);
    const isBalanced = recData?.isBalanced && statementEndingBalance !== '';

    return (
        <div className="bank-reconciliation-page">
            {/* Header */}
            <div className="page-header-ribbon">
                <div>
                    <h1 className="page-title">
                        <ShieldCheck size={26} className="title-icon" />
                        Reconcile Bank Account
                    </h1>
                    <p className="page-subtitle">
                        Compare your bank statement against your books. Check off cleared transactions until difference is $0.00.
                    </p>
                </div>

                <div className="header-actions">
                    <div className="view-switch-btns">
                        <button 
                            className={`btn btn-sm ${activeView === 'RECONCILE' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveView('RECONCILE')}
                        >
                            <FileCheck size={14} /> Reconcile
                        </button>
                        <button 
                            className={`btn btn-sm ${activeView === 'HISTORY' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveView('HISTORY')}
                        >
                            <History size={14} /> History
                        </button>
                    </div>
                </div>
            </div>

            {/* Reconciliation Workspace */}
            {activeView === 'RECONCILE' ? (
                <>
                    {/* Setup Bar */}
                    <div className="rec-setup-panel">
                        <div className="setup-col">
                            <label>Bank Account *</label>
                            <select 
                                value={selectedAccountId} 
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.accountName} ({acc.bankName} ••••{acc.accountNumber?.slice(-4)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="setup-col">
                            <label>Statement Ending Date *</label>
                            <input 
                                type="date" 
                                value={statementDate} 
                                onChange={(e) => setStatementDate(e.target.value)}
                            />
                        </div>

                        <div className="setup-col">
                            <label>Statement Ending Balance *</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                value={statementEndingBalance} 
                                onChange={(e) => setStatementEndingBalance(e.target.value)}
                            />
                        </div>

                        <div className="setup-col notes-col">
                            <label>Reconciliation Memo / Notes</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Month-end statement review"
                                value={reconciliationNotes}
                                onChange={(e) => setReconciliationNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Financial Summary Ribbon (QuickBooks Style) */}
                    <div className="rec-summary-ribbon">
                        <div className="rec-summary-item">
                            <span className="rec-sum-label">Beginning Balance</span>
                            <span className="rec-sum-val">{formatCurrency(recData?.beginningBalance || 0)}</span>
                        </div>

                        <span className="math-operator">+</span>

                        <div className="rec-summary-item">
                            <span className="rec-sum-label">
                                {recData?.clearedDepositsCount || 0} Cleared Deposits
                            </span>
                            <span className="rec-sum-val text-success">
                                +{formatCurrency(recData?.clearedDepositsAmount || 0)}
                            </span>
                        </div>

                        <span className="math-operator">-</span>

                        <div className="rec-summary-item">
                            <span className="rec-sum-label">
                                {recData?.clearedWithdrawalsCount || 0} Cleared Payments
                            </span>
                            <span className="rec-sum-val text-danger">
                                -{formatCurrency(recData?.clearedWithdrawalsAmount || 0)}
                            </span>
                        </div>

                        <span className="math-operator">=</span>

                        <div className="rec-summary-item">
                            <span className="rec-sum-label">Cleared Balance</span>
                            <span className="rec-sum-val">{formatCurrency(recData?.clearedBalance || 0)}</span>
                        </div>

                        <div className="rec-summary-divider"></div>

                        <div className="rec-summary-item">
                            <span className="rec-sum-label">Statement Ending</span>
                            <span className="rec-sum-val text-slate">
                                {formatCurrency(parseFloat(statementEndingBalance) || 0)}
                            </span>
                        </div>

                        {/* Real-time $0.00 Difference Box */}
                        <div className={`rec-difference-box ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                            <div className="diff-left">
                                {isBalanced ? (
                                    <CheckCircle2 size={24} className="text-white" />
                                ) : (
                                    <AlertCircle size={24} className="text-white" />
                                )}
                                <div>
                                    <span className="diff-label">
                                        {isBalanced ? 'Difference Balanced!' : 'Difference'}
                                    </span>
                                    <h2 className="diff-amount">
                                        {formatCurrency(recData?.difference || 0)}
                                    </h2>
                                </div>
                            </div>
                            <button 
                                className="btn btn-finish-rec"
                                disabled={!isBalanced || submitting}
                                onClick={handleFinishReconciliation}
                            >
                                {submitting ? 'Finishing...' : 'Finish Now'}
                            </button>
                        </div>
                    </div>

                    {/* Checklist Controls */}
                    <div className="checklist-controls-bar">
                        <div className="checklist-tabs">
                            <button 
                                className={`c-tab ${checklistTab === 'ALL' ? 'active' : ''}`}
                                onClick={() => setChecklistTab('ALL')}
                            >
                                All ({recData?.transactions?.length || 0})
                            </button>
                            <button 
                                className={`c-tab ${checklistTab === 'DEPOSITS' ? 'active' : ''}`}
                                onClick={() => setChecklistTab('DEPOSITS')}
                            >
                                Deposits & Inflows ({recData?.transactions?.filter(t => t.transactionType === 'DEPOSIT').length || 0})
                            </button>
                            <button 
                                className={`c-tab ${checklistTab === 'PAYMENTS' ? 'active' : ''}`}
                                onClick={() => setChecklistTab('PAYMENTS')}
                            >
                                Payments & Outflows ({recData?.transactions?.filter(t => t.transactionType === 'WITHDRAWAL').length || 0})
                            </button>
                        </div>

                        <div className="checklist-actions">
                            <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleToggleSelectAll(true)}
                            >
                                <CheckSquare size={14} /> Clear All
                            </button>
                            <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleToggleSelectAll(false)}
                            >
                                <Square size={14} /> Unclear All
                            </button>
                        </div>
                    </div>

                    {/* Transactions Checklist Table */}
                    <div className="checklist-table-card">
                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Loading checklist...</p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="empty-checklist">
                                <CheckCircle2 size={40} className="empty-icon text-success" />
                                <h4>No Unreconciled Transactions</h4>
                                <p>There are no transactions to reconcile for this period.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="checklist-table">
                                    <thead>
                                        <tr>
                                            <th width="48" className="text-center">Cleared</th>
                                            <th width="120">Date</th>
                                            <th width="120">Type</th>
                                            <th width="140">Reference</th>
                                            <th>Description / Payee</th>
                                            <th className="text-right" width="140">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map((tx) => {
                                            const isDeposit = tx.transactionType === 'DEPOSIT';
                                            return (
                                                <tr 
                                                    key={tx.id} 
                                                    className={`checklist-row ${tx.isCleared ? 'is-cleared' : ''}`}
                                                    onClick={() => handleToggleClear(tx.id, tx.isCleared)}
                                                >
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input 
                                                            type="checkbox" 
                                                            className="clear-checkbox"
                                                            checked={!!tx.isCleared}
                                                            onChange={() => handleToggleClear(tx.id, tx.isCleared)}
                                                        />
                                                    </td>
                                                    <td>{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                                    <td>
                                                        <span className={`type-badge ${isDeposit ? 'deposit' : 'withdrawal'}`}>
                                                            {tx.transactionType}
                                                        </span>
                                                    </td>
                                                    <td>{tx.referenceNumber || '-'}</td>
                                                    <td><strong>{tx.description || '-'}</strong></td>
                                                    <td className={`text-right font-semibold ${isDeposit ? 'text-success' : 'text-danger'}`}>
                                                        {isDeposit ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Reconciliation History View */
                <div className="history-table-card">
                    <div className="history-header">
                        <h3>Past Reconciliations</h3>
                        <span className="text-muted text-sm">Archived reconciliation runs</span>
                    </div>

                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading history...</p>
                        </div>
                    ) : historyList.length === 0 ? (
                        <div className="empty-checklist">
                            <History size={40} className="empty-icon text-muted" />
                            <h4>No Reconciliation History</h4>
                            <p>Completed reconciliations will appear here.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="checklist-table">
                                <thead>
                                    <tr>
                                        <th>Statement Date</th>
                                        <th>Bank Account</th>
                                        <th className="text-right">Statement Ending</th>
                                        <th className="text-right">Cleared Deposits</th>
                                        <th className="text-right">Cleared Payments</th>
                                        <th className="text-right">Difference</th>
                                        <th>Status</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyList.map(h => (
                                        <tr key={h.id}>
                                            <td>{new Date(h.statementDate).toLocaleDateString('en-GB')}</td>
                                            <td><strong>{h.accountName}</strong> ({h.bankName})</td>
                                            <td className="text-right font-semibold">{formatCurrency(h.statementEndingBalance)}</td>
                                            <td className="text-right text-success">+{formatCurrency(h.clearedDepositsAmount)}</td>
                                            <td className="text-right text-danger">-{formatCurrency(h.clearedWithdrawalsAmount)}</td>
                                            <td className="text-right font-semibold text-success">{formatCurrency(h.difference)}</td>
                                            <td>
                                                <span className="meta-badge badge-clear">
                                                    <ShieldCheck size={12} /> {h.status}
                                                </span>
                                            </td>
                                            <td>{h.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BankReconciliation;
