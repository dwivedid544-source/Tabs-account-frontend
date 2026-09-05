import React, { useState, useEffect, useContext } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, BarChart2, ArrowUpRight, ArrowDownRight, X, AlertCircle, Download, Trash2, Layers, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import toast from 'react-hot-toast';
import './Budgets.css';

const Budgets = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [activeTab, setActiveTab] = useState('variance'); // 'variance' or 'forecast'
    const [budgets, setBudgets] = useState([]);
    const [selectedBudgetId, setSelectedBudgetId] = useState('');
    const [varianceData, setVarianceData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [ledgers, setLedgers] = useState([]);
    const [availableExpenseLedgers, setAvailableExpenseLedgers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [budgetName, setBudgetName] = useState('');
    const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
    const [budgetRows, setBudgetRows] = useState([]);
    const [selectedExpenseToAdd, setSelectedExpenseToAdd] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [budgetsRes, forecastRes, coaRes] = await Promise.all([
                advancedAccountingService.getBudgets(),
                advancedAccountingService.getCashFlowForecast(),
                chartOfAccountsService.getChartOfAccounts()
            ]);

            if (budgetsRes.success) {
                setBudgets(budgetsRes.data);
                if (budgetsRes.data.length > 0 && !selectedBudgetId) {
                    setSelectedBudgetId(budgetsRes.data[0].id.toString());
                }
            }
            if (forecastRes.success) setForecastData(forecastRes.data);
            if (coaRes.success) {
                const flattened = [];
                const expenseAccounts = [];
                const seenLedgerIds = new Set();

                (coaRes.data || []).forEach(g => {
                    const isExpenseGroup = g.type === 'EXPENSES' || (g.name && g.name.toLowerCase().includes('expense'));

                    if (Array.isArray(g.ledger)) {
                        g.ledger.forEach(l => {
                            if (!seenLedgerIds.has(l.id)) {
                                seenLedgerIds.add(l.id);
                                const enriched = { ...l, groupName: g.name, groupType: g.type };
                                flattened.push(enriched);
                                if (isExpenseGroup) expenseAccounts.push(enriched);
                            }
                        });
                    }

                    if (Array.isArray(g.accountsubgroup)) {
                        g.accountsubgroup.forEach(sg => {
                            const isExpenseSub = isExpenseGroup || sg.type === 'EXPENSES' || (sg.name && sg.name.toLowerCase().includes('expense'));
                            if (Array.isArray(sg.ledger)) {
                                sg.ledger.forEach(l => {
                                    if (!seenLedgerIds.has(l.id)) {
                                        seenLedgerIds.add(l.id);
                                        const enriched = { ...l, groupName: sg.name || g.name, groupType: g.type };
                                        flattened.push(enriched);
                                        if (isExpenseSub) expenseAccounts.push(enriched);
                                    }
                                });
                            }
                        });
                    }
                });

                // Fallback: If no expense accounts matched specifically, include all accounts that look like expenses or all accounts
                const finalExpenseLedgers = expenseAccounts.length > 0
                    ? expenseAccounts
                    : flattened.filter(l => (l.name && l.name.toLowerCase().includes('expense')) || l.groupId === 4 || l.groupType === 'EXPENSES');

                setLedgers(flattened);
                setAvailableExpenseLedgers(finalExpenseLedgers.length > 0 ? finalExpenseLedgers : flattened);

                // Initialize default rows if empty
                if (budgetRows.length === 0 && finalExpenseLedgers.length > 0) {
                    setBudgetRows(finalExpenseLedgers.slice(0, 5).map(l => ({
                        ledgerId: l.id,
                        ledgerName: l.name,
                        groupName: l.groupName || 'Expenses',
                        allocatedAmount: '1000'
                    })));
                }
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error loading financial data');
        } finally {
            setLoading(false);
        }
    };

    const fetchVariance = async (id) => {
        if (!id) return;
        try {
            const res = await advancedAccountingService.getBudgetVariance(id);
            if (res.success) setVarianceData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedBudgetId) fetchVariance(selectedBudgetId);
    }, [selectedBudgetId]);

    const handleAddExpenseRow = (ledgerIdToAdd) => {
        const idNum = parseInt(ledgerIdToAdd || selectedExpenseToAdd);
        if (!idNum) return;

        if (budgetRows.some(r => r.ledgerId === idNum)) {
            toast.error('This expense account is already added to allocations.');
            return;
        }

        const targetLedger = availableExpenseLedgers.find(l => l.id === idNum) || ledgers.find(l => l.id === idNum);
        if (!targetLedger) return;

        setBudgetRows(prev => [
            ...prev,
            {
                ledgerId: targetLedger.id,
                ledgerName: targetLedger.name,
                groupName: targetLedger.groupName || 'Expenses',
                allocatedAmount: '1000'
            }
        ]);
        setSelectedExpenseToAdd('');
    };

    const handleAddAllExpenseAccounts = () => {
        if (availableExpenseLedgers.length === 0) {
            toast.error('No expense accounts found in Chart of Accounts.');
            return;
        }

        const existingIds = new Set(budgetRows.map(r => r.ledgerId));
        const newRows = availableExpenseLedgers.map(l => {
            const existing = budgetRows.find(r => r.ledgerId === l.id);
            return {
                ledgerId: l.id,
                ledgerName: l.name,
                groupName: l.groupName || 'Expenses',
                allocatedAmount: existing ? existing.allocatedAmount : '1000'
            };
        });

        setBudgetRows(newRows);
        toast.success(`Added ${newRows.length} expense accounts to budget.`);
    };

    const handleRemoveExpenseRow = (ledgerIdToRemove) => {
        setBudgetRows(prev => prev.filter(r => r.ledgerId !== ledgerIdToRemove));
    };

    const handleCreateBudget = async (e) => {
        e.preventDefault();
        if (!budgetName.trim()) {
            toast.error('Budget name is required');
            return;
        }

        if (budgetRows.length === 0) {
            toast.error('Please add at least one expense account allocation.');
            return;
        }

        const validItems = budgetRows
            .filter(r => parseFloat(r.allocatedAmount) > 0)
            .map(r => ({
                ledgerId: r.ledgerId,
                allocatedAmount: parseFloat(r.allocatedAmount) || 0,
                monthIndex: 1
            }));

        if (validItems.length === 0) {
            toast.error('Please allocate an amount greater than 0 for at least one account.');
            return;
        }

        try {
            const totalAllocated = validItems.reduce((sum, item) => sum + item.allocatedAmount, 0);
            const res = await advancedAccountingService.createBudget({
                name: budgetName.trim(),
                fiscalYear: budgetYear,
                periodType: 'ANNUAL',
                startDate: `${budgetYear}-01-01`,
                endDate: `${budgetYear}-12-31`,
                totalBudgetAmount: totalAllocated,
                items: validItems
            });
            if (res.success) {
                toast.success(res.message || 'Budget created successfully!');
                setShowCreateModal(false);
                setBudgetName('');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to create budget');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error creating budget');
        }
    };

    const handleExportExcel = () => {
        if (!varianceData?.comparison || varianceData.comparison.length === 0) {
            toast.error('No budget data to export');
            return;
        }

        const dataToExport = varianceData.comparison.map(row => ({
            'Account Name': row.ledgerName,
            'Category': row.groupName || row.groupType,
            'Budgeted Amount': row.budgetedAmount,
            'Actual Spent': row.actualAmount,
            'Variance Amount': row.variance,
            'Variance (%)': `${row.variancePercent}%`,
            'Status': row.status === 'UNDER_BUDGET' ? 'Under Budget (Favorable)' : 'Over Budget (Unfavorable)'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Budget vs Actuals');
        XLSX.writeFile(wb, `Budget_vs_Actuals_${varianceData.budget?.name || 'Report'}.xlsx`);
        toast.success('Budget variance report exported to Excel!');
    };

    return (
        <div className="BUD-page-container">
            <div className="BUD-header">
                <div className="BUD-title-area">
                    <h1>Financial Budgets & Cash Flow Forecasting</h1>
                    <p>Set operational budgets, monitor real-time variance against ledger actuals, and forecast cash runway</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {activeTab === 'variance' && varianceData?.comparison?.length > 0 && (
                        <button 
                            className="BUD-btn-primary" 
                            style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
                            onClick={handleExportExcel}
                        >
                            <Download size={16} /> Export to Excel
                        </button>
                    )}
                    <button className="BUD-btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={16} /> Create New Budget
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="BUD-tab-bar">
                <button
                    className={`BUD-tab-btn ${activeTab === 'variance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('variance')}
                >
                    <BarChart2 size={16} /> Budget vs Actual Variance
                </button>
                <button
                    className={`BUD-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
                    onClick={() => setActiveTab('forecast')}
                >
                    <TrendingUp size={16} /> 30/60/90-Day Cash Flow Forecast
                </button>
            </div>

            {/* TAB 1: Budget vs Actual Variance */}
            {activeTab === 'variance' && (
                <>
                    {budgets.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Budget Plan:</label>
                            <select
                                value={selectedBudgetId}
                                onChange={(e) => setSelectedBudgetId(e.target.value)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontWeight: 700,
                                    color: '#1e293b'
                                }}
                            >
                                {budgets.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} (FY {b.fiscalYear} - {formatCurrency(b.totalBudgetAmount)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="BUD-stats-grid">
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Total Budgeted</div>
                            <div className="BUD-stat-value">{formatCurrency(varianceData?.totalBudgeted || 0)}</div>
                        </div>
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Total Actual Spent</div>
                            <div className="BUD-stat-value" style={{ color: '#0284c7' }}>
                                {formatCurrency(varianceData?.totalActual || 0)}
                            </div>
                        </div>
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Net Variance</div>
                            <div className="BUD-stat-value" style={{ color: (varianceData?.netVariance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                {(varianceData?.netVariance || 0) >= 0 ? '+' : ''}{formatCurrency(varianceData?.netVariance || 0)}
                            </div>
                        </div>
                    </div>

                    {varianceData?.comparison?.some(c => c.status === 'OVER_BUDGET') && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '20px',
                            color: '#b91c1c',
                            fontSize: '13px',
                            fontWeight: 500
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>
                                <strong>Budget Warning:</strong> One or more expense accounts have exceeded their allocated expenditure target. Review the table below for unfavorable variances.
                            </span>
                        </div>
                    )}

                    {/* Variance Table */}
                    <div className="BUD-card">
                        <div className="BUD-card-header">
                            <h3 className="BUD-card-title">Account Budget vs Actual Variance Table</h3>
                        </div>
                        <div className="BUD-table-responsive">
                            <table className="BUD-table">
                                <thead>
                                    <tr>
                                        <th>Account Name</th>
                                        <th>Category</th>
                                        <th>Budgeted Amount</th>
                                        <th>Actual Spent</th>
                                        <th>Variance ($)</th>
                                        <th>Variance (%)</th>
                                        <th>Budget Utilization</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading variance report...</td>
                                        </tr>
                                    ) : !varianceData?.comparison || varianceData?.comparison.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                No budget allocations found. Click "Create New Budget" to set targets.
                                            </td>
                                        </tr>
                                    ) : (
                                        varianceData?.comparison.map((row, idx) => {
                                            const pctSpent = row.budgetedAmount > 0 ? Math.min(100, Math.round((row.actualAmount / row.budgetedAmount) * 100)) : 0;
                                            const isOver = row.status === 'OVER_BUDGET';

                                            return (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{row.ledgerName}</td>
                                                    <td>{row.groupName || row.groupType}</td>
                                                    <td>{formatCurrency(row.budgetedAmount)}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(row.actualAmount)}</td>
                                                    <td style={{ fontWeight: 700, color: isOver ? '#ef4444' : '#10b981' }}>
                                                        {row.variance >= 0 ? `+${formatCurrency(row.variance)}` : `-${formatCurrency(Math.abs(row.variance))}`}
                                                    </td>
                                                    <td>{row.variancePercent}%</td>
                                                    <td style={{ width: '160px' }}>
                                                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{pctSpent}%</span>
                                                        </div>
                                                        <div className="BUD-progress-bar">
                                                            <div
                                                                className="BUD-progress-fill"
                                                                style={{
                                                                    width: `${pctSpent}%`,
                                                                    backgroundColor: isOver ? '#ef4444' : pctSpent > 80 ? '#f59e0b' : '#10b981'
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: isOver ? '#fee2e2' : '#d1fae5',
                                                            color: isOver ? '#991b1b' : '#065f46'
                                                        }}>
                                                            {isOver ? 'Over Budget' : 'Under Budget'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* TAB 2: Cash Flow Forecast */}
            {activeTab === 'forecast' && (
                <>
                    <div className="BUD-stats-grid">
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Current Liquid Cash</div>
                            <div className="BUD-stat-value">{formatCurrency(forecastData?.openingLiquidCash || 0)}</div>
                        </div>
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Projected Inflows (90d)</div>
                            <div className="BUD-stat-value" style={{ color: '#10b981' }}>
                                +{formatCurrency(forecastData?.inflows?.total || 0)}
                            </div>
                        </div>
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Projected Outflows (90d)</div>
                            <div className="BUD-stat-value" style={{ color: '#ef4444' }}>
                                -{formatCurrency(forecastData?.outflows?.total || 0)}
                            </div>
                        </div>
                        <div className="BUD-stat-card">
                            <div className="BUD-stat-label">Net Projected Cash (90d)</div>
                            <div className="BUD-stat-value" style={{ color: '#0284c7' }}>
                                {formatCurrency(forecastData?.projectedBalances?.after90Days || 0)}
                            </div>
                        </div>
                    </div>

                    <div className="BUD-card">
                        <div className="BUD-card-header">
                            <h3 className="BUD-card-title">Projected Cash Runway Schedule</h3>
                        </div>
                        <div className="BUD-table-responsive">
                            <table className="BUD-table">
                                <thead>
                                    <tr>
                                        <th>Timeline Window</th>
                                        <th>Projected Inflows (AR)</th>
                                        <th>Projected Outflows (AP)</th>
                                        <th>Net Cash Flow</th>
                                        <th>Projected Closing Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Overdue Receivables / Payables</td>
                                        <td style={{ color: '#10b981' }}>+{formatCurrency(forecastData?.inflows?.overdue || 0)}</td>
                                        <td style={{ color: '#ef4444' }}>-{formatCurrency(forecastData?.outflows?.overdue || 0)}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {formatCurrency((forecastData?.inflows?.overdue || 0) - (forecastData?.outflows?.overdue || 0))}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(forecastData?.openingLiquidCash || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>Next 30 Days</td>
                                        <td style={{ color: '#10b981' }}>+{formatCurrency(forecastData?.inflows?.next30Days || 0)}</td>
                                        <td style={{ color: '#ef4444' }}>-{formatCurrency(forecastData?.outflows?.next30Days || 0)}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {formatCurrency((forecastData?.inflows?.next30Days || 0) - (forecastData?.outflows?.next30Days || 0))}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(forecastData?.projectedBalances?.after30Days || 0)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>31 - 60 Days</td>
                                        <td style={{ color: '#10b981' }}>+{formatCurrency(forecastData?.inflows?.next60Days || 0)}</td>
                                        <td style={{ color: '#ef4444' }}>-{formatCurrency(forecastData?.outflows?.next60Days || 0)}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {formatCurrency((forecastData?.inflows?.next60Days || 0) - (forecastData?.outflows?.next60Days || 0))}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(forecastData?.projectedBalances?.after60Days || 0)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600 }}>61 - 90 Days</td>
                                        <td style={{ color: '#10b981' }}>+{formatCurrency(forecastData?.inflows?.next90Days || 0)}</td>
                                        <td style={{ color: '#ef4444' }}>-{formatCurrency(forecastData?.outflows?.next90Days || 0)}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {formatCurrency((forecastData?.inflows?.next90Days || 0) - (forecastData?.outflows?.next90Days || 0))}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(forecastData?.projectedBalances?.after90Days || 0)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create Budget Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '650px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Create Annual / Monthly Budget</h2>
                                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0' }}>Define budget caps for company expense accounts</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBudget}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '18px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Budget Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. FY 2026 Operating Budget"
                                        value={budgetName}
                                        onChange={(e) => setBudgetName(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Fiscal Year</label>
                                    <input
                                        type="number"
                                        value={budgetYear}
                                        onChange={(e) => setBudgetYear(parseInt(e.target.value) || new Date().getFullYear())}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            {/* Expense Allocations Section */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Expense Account Allocations</h4>
                                        <span style={{ fontSize: '12px', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontWeight: 600 }}>
                                            {budgetRows.length} {budgetRows.length === 1 ? 'Account' : 'Accounts'}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddAllExpenseAccounts}
                                        style={{
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            padding: '5px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: '#475569',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Add All Expense Accounts
                                    </button>
                                </div>

                                {/* Account Picker Bar */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <select
                                        value={selectedExpenseToAdd}
                                        onChange={(e) => setSelectedExpenseToAdd(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: '#334155'
                                        }}
                                    >
                                        <option value="">-- Select Expense Account to Add --</option>
                                        {availableExpenseLedgers
                                            .filter(l => !budgetRows.some(r => r.ledgerId === l.id))
                                            .map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.name} {l.groupName ? `(${l.groupName})` : ''}
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => handleAddExpenseRow(selectedExpenseToAdd)}
                                        disabled={!selectedExpenseToAdd}
                                        style={{
                                            padding: '8px 16px',
                                            background: selectedExpenseToAdd ? '#1e293b' : '#94a3b8',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: selectedExpenseToAdd ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>

                                {/* Allocations Table Box */}
                                <div style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: '#ffffff'
                                }}>
                                    {budgetRows.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                            No expense accounts allocated yet.<br />
                                            Select an account above or click <strong>"Add All Expense Accounts"</strong> to populate.
                                        </div>
                                    ) : (
                                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 1 }}>
                                                    <tr>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Account Name</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Category</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569', width: '160px' }}>Budgeted Amount</th>
                                                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {budgetRows.map((r, idx) => (
                                                        <tr key={r.ledgerId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                                                                {r.ledgerName}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                                                <span style={{ fontSize: '11px', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px' }}>
                                                                    {r.groupName || 'Expense'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="any"
                                                                    value={r.allocatedAmount}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setBudgetRows(prev => prev.map((item, i) => i === idx ? { ...item, allocatedAmount: val } : item));
                                                                    }}
                                                                    style={{
                                                                        width: '130px',
                                                                        padding: '5px 8px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #cbd5e1',
                                                                        fontWeight: 700,
                                                                        textAlign: 'right',
                                                                        color: '#1e293b'
                                                                    }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveExpenseRow(r.ledgerId)}
                                                                    title="Remove account"
                                                                    style={{
                                                                        border: 'none',
                                                                        background: 'none',
                                                                        color: '#94a3b8',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        borderRadius: '4px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Live Budget Sum Bar */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 16px',
                                        background: '#f8fafc',
                                        borderTop: '1px solid #e2e8f0'
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                            Total Allocated Budget:
                                        </span>
                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                            {formatCurrency(budgetRows.reduce((sum, r) => sum + (parseFloat(r.allocatedAmount) || 0), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="BUD-tab-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="BUD-btn-primary" style={{ padding: '9px 24px' }}>Save Budget</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budgets;
