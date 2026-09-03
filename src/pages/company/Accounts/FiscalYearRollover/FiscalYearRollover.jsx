import React, { useState, useEffect, useContext } from 'react';
import { Calendar, CheckCircle2, ArrowRight, Lock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import toast from 'react-hot-toast';
import './FiscalYearRollover.css';

const FiscalYearRollover = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [fiscalYear, setFiscalYear] = useState(2026);
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [rolloverData, setRolloverData] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [completedResult, setCompletedResult] = useState(null);

    const fetchPreview = async () => {
        try {
            setLoading(true);
            const res = await advancedAccountingService.getFiscalRolloverPreview(fiscalYear);
            if (res.success) {
                setRolloverData(res.data);
            } else {
                toast.error(res.message || 'Failed to fetch rollover preview');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error loading fiscal rollover');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPreview();
        setCurrentStep(1);
        setCompletedResult(null);
    }, [fiscalYear]);

    const handleExecuteClose = async () => {
        try {
            setExecuting(true);
            const res = await advancedAccountingService.executeFiscalRollover({ fiscalYear });
            if (res.success) {
                toast.success(res.message || 'Fiscal Year successfully closed and rolled over!');
                setCompletedResult(res.data);
                setCurrentStep(4);
            } else {
                toast.error(res.message || 'Failed to execute rollover');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error executing year-end close');
        } finally {
            setExecuting(false);
        }
    };

    const isProfit = (rolloverData?.netProfitLoss || 0) >= 0;

    return (
        <div className="FY-page-container">
            <div className="FY-header">
                <h1>Fiscal Year Rollover & Period Closing</h1>
                <p>Close nominal accounts to Retained Earnings and roll forward balance sheet opening balances</p>
            </div>

            {/* Stepper */}
            <div className="FY-wizard-stepper">
                <div className={`FY-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`} onClick={() => setCurrentStep(1)}>
                    <div className="FY-step-number">{currentStep > 1 ? '✓' : '1'}</div>
                    <span>1. P&L Verification</span>
                </div>
                <div className={`FY-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`} onClick={() => setCurrentStep(2)}>
                    <div className="FY-step-number">{currentStep > 2 ? '✓' : '2'}</div>
                    <span>2. Retained Earnings</span>
                </div>
                <div className={`FY-step ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`} onClick={() => setCurrentStep(3)}>
                    <div className="FY-step-number">{currentStep > 3 ? '✓' : '3'}</div>
                    <span>3. Balance Sheet Rollover</span>
                </div>
                <div className={`FY-step ${currentStep === 4 ? 'active' : ''}`}>
                    <div className="FY-step-number">4</div>
                    <span>4. Year Lock & Confirm</span>
                </div>
            </div>

            {/* Fiscal Year Selector */}
            <div className="FY-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={20} color="#64748b" />
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Select Fiscal Year to Close:</label>
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 700,
                            color: '#1e293b'
                        }}
                    >
                        <option value={2025}>FY 2025 (Jan 1, 2025 - Dec 31, 2025)</option>
                        <option value={2026}>FY 2026 (Jan 1, 2026 - Dec 31, 2026)</option>
                        <option value={2027}>FY 2027 (Jan 1, 2027 - Dec 31, 2027)</option>
                    </select>
                </div>
                {rolloverData?.isAlreadyClosed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>
                        <Lock size={16} /> This fiscal year is already closed and locked.
                    </div>
                )}
            </div>

            {/* STEP 1: P&L Verification */}
            {currentStep === 1 && (
                <div className="FY-card">
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                        Step 1: Profit & Loss Account Verification (FY {fiscalYear})
                    </h2>
                    
                    <div className="FY-summary-grid">
                        <div className="FY-summary-box">
                            <div className="FY-box-label">Total Revenue / Income</div>
                            <div className="FY-box-value" style={{ color: '#10b981' }}>
                                {formatCurrency(rolloverData?.totalIncome || 0)}
                            </div>
                        </div>
                        <div className="FY-summary-box">
                            <div className="FY-box-label">Total Expenses</div>
                            <div className="FY-box-value" style={{ color: '#ef4444' }}>
                                {formatCurrency(rolloverData?.totalExpenses || 0)}
                            </div>
                        </div>
                        <div className={`FY-summary-box highlight ${isProfit ? '' : 'loss'}`}>
                            <div className="FY-box-label">Net Profit / (Loss)</div>
                            <div className={`FY-box-value ${isProfit ? 'profit' : 'loss'}`}>
                                {isProfit ? '+' : ''}{formatCurrency(rolloverData?.netProfitLoss || 0)}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '14px' }}>Income Accounts ({rolloverData?.incomeAccounts?.length || 0})</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '13px' }}>
                                {rolloverData?.incomeAccounts?.map(acc => (
                                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span>{acc.name}</span>
                                        <strong>{formatCurrency(acc.balance)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '14px' }}>Expense Accounts ({rolloverData?.expenseAccounts?.length || 0})</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '13px' }}>
                                {rolloverData?.expenseAccounts?.map(acc => (
                                    <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span>{acc.name}</span>
                                        <strong>{formatCurrency(acc.balance)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="FY-footer-actions">
                        <div></div>
                        <button className="FY-btn-next" onClick={() => setCurrentStep(2)}>
                            Next: Retained Earnings <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Retained Earnings Transfer Preview */}
            {currentStep === 2 && (
                <div className="FY-card">
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                        Step 2: Transfer to Retained Earnings Preview
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                        At year-end closing, all revenue and expense balances are zeroed out via a closing journal entry, and the net 
                        {isProfit ? ' profit ' : ' loss '} of <strong>{formatCurrency(Math.abs(rolloverData?.netProfitLoss || 0))}</strong> is automatically transferred into the <strong>Retained Earnings</strong> equity account.
                    </p>

                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>Closing Journal Entry Preview</h4>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Account Name</th>
                                    <th style={{ padding: '8px' }}>Account Type</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Debit</th>
                                    <th style={{ padding: '8px', textAlign: 'right' }}>Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '8px' }}>Total Revenue Accounts (Zero Out)</td>
                                    <td style={{ padding: '8px' }}>INCOME</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(rolloverData?.totalIncome || 0)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '8px' }}>Total Expense Accounts (Zero Out)</td>
                                    <td style={{ padding: '8px' }}>EXPENSES</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(rolloverData?.totalExpenses || 0)}</td>
                                </tr>
                                <tr style={{ backgroundColor: '#f0fdf4' }}>
                                    <td style={{ padding: '8px', fontWeight: 700 }}>Retained Earnings Account</td>
                                    <td style={{ padding: '8px', fontWeight: 600 }}>EQUITY</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>{isProfit ? '-' : formatCurrency(Math.abs(rolloverData?.netProfitLoss || 0))}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{isProfit ? formatCurrency(rolloverData?.netProfitLoss || 0) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="FY-footer-actions">
                        <button className="FY-btn-back" onClick={() => setCurrentStep(1)}>Back</button>
                        <button className="FY-btn-next" onClick={() => setCurrentStep(3)}>
                            Next: Balance Sheet Rollover <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Balance Sheet Rollover */}
            {currentStep === 3 && (
                <div className="FY-card">
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                        Step 3: Balance Sheet Rollover to FY {fiscalYear + 1}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                        All Asset, Liability, and Equity ledger closing balances will roll forward as initial opening balances for the new fiscal year <strong>{fiscalYear + 1}</strong>.
                    </p>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '24px' }}>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 14px' }}>Account Name</th>
                                    <th style={{ padding: '10px 14px' }}>Type</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>FY{fiscalYear} Closing Balance</th>
                                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>FY{fiscalYear + 1} Opening Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rolloverData?.balanceSheetAccounts?.map(acc => (
                                    <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{acc.name}</td>
                                        <td style={{ padding: '10px 14px' }}>{acc.type}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatCurrency(acc.closingBalance)}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                                            {formatCurrency(acc.rollForwardOpening)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="FY-footer-actions">
                        <button className="FY-btn-back" onClick={() => setCurrentStep(2)}>Back</button>
                        <button
                            className="FY-btn-next"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={handleExecuteClose}
                            disabled={executing || rolloverData?.isAlreadyClosed}
                        >
                            {executing ? 'Closing Fiscal Year...' : `Close FY ${fiscalYear} & Rollover to ${fiscalYear + 1}`}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: Completed Confirmation */}
            {currentStep === 4 && (
                <div className="FY-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <ShieldCheck size={56} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                        Fiscal Year {fiscalYear} Closed Successfully!
                    </h2>
                    <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
                        Year-end closing journal entry <strong>#{completedResult?.closingVoucherNumber}</strong> has been posted. Net profit of <strong>{formatCurrency(completedResult?.netProfitLoss || 0)}</strong> has been transferred into Retained Earnings, and opening balances for FY {fiscalYear + 1} are active.
                    </p>

                    <button
                        className="FY-btn-next"
                        onClick={() => {
                            setFiscalYear(fiscalYear + 1);
                        }}
                    >
                        View FY {fiscalYear + 1} Overview
                    </button>
                </div>
            )}
        </div>
    );
};

export default FiscalYearRollover;
