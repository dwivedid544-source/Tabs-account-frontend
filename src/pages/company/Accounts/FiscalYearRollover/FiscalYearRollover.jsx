import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
    Calendar, 
    CheckCircle2, 
    ArrowRight, 
    Lock, 
    AlertTriangle, 
    ShieldCheck, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight, 
    X, 
    CalendarDays 
} from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import toast from 'react-hot-toast';
import './FiscalYearRollover.css';

const FiscalYearRollover = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const currentCalendarYear = new Date().getFullYear();
    const [fiscalYear, setFiscalYear] = useState(currentCalendarYear);
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [rolloverData, setRolloverData] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [completedResult, setCompletedResult] = useState(null);

    // Calendar / Year Picker Popover States
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerDecadeStart, setPickerDecadeStart] = useState(() => Math.floor(currentCalendarYear / 10) * 10);
    const [pickerTab, setPickerTab] = useState('grid'); // 'grid' | 'calendar'
    const [calendarDate, setCalendarDate] = useState(() => `${currentCalendarYear}-01-01`);
    const [jumpYearInput, setJumpYearInput] = useState('');
    const pickerRef = useRef(null);

    // Dynamically generate fiscal years extending indefinitely into future (including beyond 2036)
    const minAvailableYear = Math.min(currentCalendarYear - 10, fiscalYear - 5, 2020);
    const maxAvailableYear = Math.max(currentCalendarYear + 25, fiscalYear + 5, 2050);
    const availableYears = [];
    for (let y = minAvailableYear; y <= maxAvailableYear; y++) {
        availableYears.push(y);
    }

    // Close picker when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsPickerOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsPickerOpen(false);
            }
        };

        if (isPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPickerOpen]);

    // Keep picker decade start and calendar date aligned when fiscalYear changes
    useEffect(() => {
        setCalendarDate(`${fiscalYear}-01-01`);
        setPickerDecadeStart(Math.floor(fiscalYear / 10) * 10);
    }, [fiscalYear]);

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

    const handleSelectYear = (year) => {
        setFiscalYear(year);
        setIsPickerOpen(false);
    };

    const handleJumpYearSubmit = (e) => {
        if (e) e.preventDefault();
        const y = parseInt(jumpYearInput, 10);
        if (isNaN(y) || y < 1900 || y > 2150) {
            toast.error('Please enter a valid year between 1900 and 2150');
            return;
        }
        setFiscalYear(y);
        setPickerDecadeStart(Math.floor(y / 10) * 10);
        setJumpYearInput('');
        setIsPickerOpen(false);
    };

    const handleCalendarDateChange = (val) => {
        setCalendarDate(val);
        if (val) {
            const yr = parseInt(val.split('-')[0], 10);
            if (!isNaN(yr)) {
                setPickerDecadeStart(Math.floor(yr / 10) * 10);
            }
        }
    };

    const handleApplyCalendarDate = () => {
        if (!calendarDate) return;
        const yr = parseInt(calendarDate.split('-')[0], 10);
        if (!isNaN(yr)) {
            setFiscalYear(yr);
            setIsPickerOpen(false);
        }
    };

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

    // 12-year window for decade grid
    const gridYears = Array.from({ length: 12 }, (_, i) => pickerDecadeStart + i);

    // Preset shortcuts including years beyond 2036
    const presetShortcuts = [
        { label: `Current (${currentCalendarYear})`, year: currentCalendarYear },
        { label: `Next (${currentCalendarYear + 1})`, year: currentCalendarYear + 1 },
        { label: '2037', year: 2037 },
        { label: '2040', year: 2040 },
        { label: '2050', year: 2050 },
    ];

    const parsedCalendarYear = calendarDate ? parseInt(calendarDate.split('-')[0], 10) : fiscalYear;

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

            {/* Fiscal Year Selector Card */}
            <div className="FY-card FY-selector-card" ref={pickerRef}>
                <div className="FY-selector-controls">
                    <button
                        type="button"
                        className="FY-calendar-toggle-btn"
                        onClick={() => setIsPickerOpen(prev => !prev)}
                        title="Click to open Calendar / Year Picker"
                        aria-label="Open Calendar / Year Picker"
                    >
                        <Calendar size={18} />
                    </button>
                    <label className="FY-selector-label">Select Fiscal Year to Close:</label>
                    <select
                        className="FY-select"
                        value={fiscalYear}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                                setFiscalYear(val);
                                setPickerDecadeStart(Math.floor(val / 10) * 10);
                            }
                        }}
                    >
                        {availableYears.map(yr => (
                            <option key={yr} value={yr}>
                                FY {yr} (Jan 1, {yr} - Dec 31, {yr})
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className={`FY-btn-calendar-picker ${isPickerOpen ? 'active' : ''}`}
                        onClick={() => setIsPickerOpen(prev => !prev)}
                        title="Open interactive calendar and year picker"
                    >
                        <CalendarDays size={15} />
                        <span>Calendar / Year Picker</span>
                    </button>
                </div>

                {rolloverData?.isAlreadyClosed && (
                    <div className="FY-closed-badge">
                        <Lock size={16} /> This fiscal year is already closed and locked.
                    </div>
                )}

                {/* Interactive Year Picker / Calendar Popover */}
                {isPickerOpen && (
                    <div className="FY-year-picker-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="FY-picker-header">
                            <div className="FY-picker-title">
                                <CalendarDays size={16} color="#0284c7" />
                                <span>Select Fiscal Year</span>
                            </div>
                            <button
                                type="button"
                                className="FY-picker-close-btn"
                                onClick={() => setIsPickerOpen(false)}
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* View Tabs */}
                        <div className="FY-picker-tabs">
                            <button
                                type="button"
                                className={`FY-picker-tab-btn ${pickerTab === 'grid' ? 'active' : ''}`}
                                onClick={() => setPickerTab('grid')}
                            >
                                Year Grid (Decade View)
                            </button>
                            <button
                                type="button"
                                className={`FY-picker-tab-btn ${pickerTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => setPickerTab('calendar')}
                            >
                                Calendar / Date View
                            </button>
                        </div>

                        {pickerTab === 'grid' ? (
                            <>
                                {/* Decade Navigation Bar */}
                                <div className="FY-decade-nav">
                                    <div className="FY-nav-group">
                                        <button
                                            type="button"
                                            className="FY-nav-btn"
                                            onClick={() => setPickerDecadeStart(prev => prev - 10)}
                                            title="Previous Decade (-10 yrs)"
                                        >
                                            <ChevronsLeft size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="FY-nav-btn"
                                            onClick={() => setPickerDecadeStart(prev => prev - 1)}
                                            title="Previous Year (-1 yr)"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                    </div>

                                    <div className="FY-decade-title">
                                        {pickerDecadeStart} – {pickerDecadeStart + 11}
                                    </div>

                                    <div className="FY-nav-group">
                                        <button
                                            type="button"
                                            className="FY-nav-btn"
                                            onClick={() => setPickerDecadeStart(prev => prev + 1)}
                                            title="Next Year (+1 yr)"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="FY-nav-btn"
                                            onClick={() => setPickerDecadeStart(prev => prev + 10)}
                                            title="Next Decade (+10 yrs)"
                                        >
                                            <ChevronsRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* 12-Year Tile Grid */}
                                <div className="FY-years-grid">
                                    {gridYears.map(yr => {
                                        const isSelected = yr === fiscalYear;
                                        const isCurrent = yr === currentCalendarYear;
                                        return (
                                            <button
                                                key={yr}
                                                type="button"
                                                className={`FY-year-tile ${isSelected ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                                onClick={() => handleSelectYear(yr)}
                                                title={`Select Fiscal Year ${yr}`}
                                            >
                                                <span className="FY-year-num">{yr}</span>
                                                {isCurrent && <span className="FY-year-badge">Current</span>}
                                                {isSelected && <span className="FY-year-badge selected">Active</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Direct Jump Input */}
                                <form className="FY-quick-jump" onSubmit={handleJumpYearSubmit}>
                                    <span className="FY-jump-label">Jump to Year:</span>
                                    <input
                                        type="number"
                                        className="FY-jump-input"
                                        placeholder="e.g. 2038"
                                        min="1900"
                                        max="2150"
                                        value={jumpYearInput}
                                        onChange={(e) => setJumpYearInput(e.target.value)}
                                    />
                                    <button type="submit" className="FY-jump-btn">
                                        Go
                                    </button>
                                </form>

                                {/* Presets / Quick shortcuts */}
                                <div className="FY-quick-presets">
                                    <span className="FY-presets-label">Quick:</span>
                                    {presetShortcuts.map(p => (
                                        <button
                                            key={p.label}
                                            type="button"
                                            className={`FY-preset-btn ${p.year === fiscalYear ? 'active' : ''}`}
                                            onClick={() => handleSelectYear(p.year)}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Calendar Date Picker View */
                            <div className="FY-calendar-view">
                                <label className="FY-cal-label">Pick any date within required Fiscal Year:</label>
                                <input
                                    type="date"
                                    className="FY-picker-date-input"
                                    value={calendarDate}
                                    onChange={(e) => handleCalendarDateChange(e.target.value)}
                                />

                                <div className="FY-cal-info-box">
                                    <div className="FY-cal-info-title">
                                        Detected Fiscal Year: <strong>FY {parsedCalendarYear}</strong>
                                    </div>
                                    <div className="FY-cal-info-range">
                                        Period: Jan 1, {parsedCalendarYear} – Dec 31, {parsedCalendarYear}
                                    </div>
                                    <div className="FY-calendar-quarters">
                                        <div className="FY-quarter-card">
                                            <span className="FY-q-num">Q1</span>
                                            <span className="FY-q-dates">Jan 1 – Mar 31</span>
                                        </div>
                                        <div className="FY-quarter-card">
                                            <span className="FY-q-num">Q2</span>
                                            <span className="FY-q-dates">Apr 1 – Jun 30</span>
                                        </div>
                                        <div className="FY-quarter-card">
                                            <span className="FY-q-num">Q3</span>
                                            <span className="FY-q-dates">Jul 1 – Sep 30</span>
                                        </div>
                                        <div className="FY-quarter-card">
                                            <span className="FY-q-num">Q4</span>
                                            <span className="FY-q-dates">Oct 1 – Dec 31</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="FY-apply-date-btn"
                                    onClick={handleApplyCalendarDate}
                                >
                                    Select FY {parsedCalendarYear} (Jan 1 – Dec 31, {parsedCalendarYear})
                                </button>
                            </div>
                        )}

                        {/* Popover Footer */}
                        <div className="FY-picker-footer">
                            <span className="FY-picker-footer-text">
                                Currently Selected: <strong>FY {fiscalYear}</strong>
                            </span>
                            <button
                                type="button"
                                className="FY-picker-footer-done"
                                onClick={() => setIsPickerOpen(false)}
                            >
                                Done
                            </button>
                        </div>
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
