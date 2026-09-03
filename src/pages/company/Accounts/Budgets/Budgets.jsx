import React, { useState, useEffect, useContext } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar, BarChart2, ArrowUpRight, ArrowDownRight, X, AlertCircle } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [budgetName, setBudgetName] = useState('');
    const [budgetYear, setBudgetYear] = useState(2026);
    const [budgetRows, setBudgetRows] = useState([]);

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
                coaRes.data.forEach(g => {
                    if (g.ledger) flattened.push(...g.ledger);
                    if (g.accountsubgroup) {
                        g.accountsubgroup.forEach(sg => {
                            if (sg.ledger) flattened.push(...sg.ledger);
                        });
                    }
                });
                setLedgers(flattened);
                
                // Prepare initial budget rows for expense accounts
                const expenseLedgers = flattened.filter(l => l.groupId === 4 || l.accountgroup?.type === 'EXPENSES');
                setBudgetRows(expenseLedgers.slice(0, 8).map(l => ({
                    ledgerId: l.id,
                    ledgerName: l.name,
                    allocatedAmount: '1000'
                })));
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

    const handleCreateBudget = async (e) => {
        e.preventDefault();
        if (!budgetName) {
            toast.error('Budget name is required');
            return;
        }
        try {
            const items = budgetRows.map(r => ({
                ledgerId: r.ledgerId,
                allocatedAmount: parseFloat(r.allocatedAmount) || 0,
                monthIndex: 1
            }));
            const res = await advancedAccountingService.createBudget({
                name: budgetName,
                fiscalYear: budgetYear,
                items
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

    return (
        <div className="BUD-page-container">
            <div className="BUD-header">
                <div className="BUD-title-area">
                    <h1>Financial Budgets & Cash Flow Forecasting</h1>
                    <p>Set operational budgets, monitor real-time variance against ledger actuals, and forecast cash runway</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Create Annual / Monthly Budget</h2>
                            <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBudget}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Budget Name*</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. FY 2026 Operating Budget"
                                        value={budgetName}
                                        onChange={(e) => setBudgetName(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Fiscal Year</label>
                                    <input
                                        type="number"
                                        value={budgetYear}
                                        onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 10px 0' }}>Expense Account Allocations:</h4>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                {budgetRows.map((r, idx) => (
                                    <div key={r.ledgerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{r.ledgerName}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Allocated:</span>
                                            <input
                                                type="number"
                                                value={r.allocatedAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setBudgetRows(prev => prev.map((item, i) => i === idx ? { ...item, allocatedAmount: val } : item));
                                                }}
                                                style={{ width: '100px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="BUD-tab-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="BUD-btn-primary">Save Budget</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budgets;
