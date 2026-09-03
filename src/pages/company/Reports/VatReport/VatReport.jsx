import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, Search, Filter, Printer, FileText, ArrowRight, CheckCircle2, DollarSign, Layers, ShieldCheck, RefreshCw } from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './VatReport.css';

const VatReport = () => {
    const { formatCurrency, fetchCompanySettings, companySettings } = useContext(CompanyContext);
    const [year, setYear] = useState(new Date().getFullYear());
    const [period, setPeriod] = useState('P1'); // 'P1'..'P6', 'ALL', 'custom'
    const [basis, setBasis] = useState('cash'); // 'cash' or 'accrual'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'output', 'input', 'all'
    const [loading, setLoading] = useState(false);
    const [reportPayload, setReportPayload] = useState(null);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const biMonthlyPeriods = [
        { id: 'P1', label: 'Jan - Feb', sub: 'Period 1' },
        { id: 'P2', label: 'Mar - Apr', sub: 'Period 2' },
        { id: 'P3', label: 'May - Jun', sub: 'Period 3' },
        { id: 'P4', label: 'Jul - Aug', sub: 'Period 4' },
        { id: 'P5', label: 'Sep - Oct', sub: 'Period 5' },
        { id: 'P6', label: 'Nov - Dec', sub: 'Period 6' },
        { id: 'ALL', label: 'Full Year', sub: `${year}` },
        { id: 'custom', label: 'Custom Range', sub: 'Date Picker' }
    ];

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    useEffect(() => {
        fetchVatReport();
    }, [year, period, basis, startDate, endDate]);

    const fetchVatReport = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            const params = {
                companyId,
                year,
                period,
                basis
            };
            if (period === 'custom' && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }

            const response = await axiosInstance.get(`/reports/vat`, { params });
            if (response.data.success) {
                setReportPayload(response.data.detailed || null);
            }
        } catch (error) {
            console.error("Error fetching VAT report:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        if (newPeriod !== 'custom') {
            setStartDate('');
            setEndDate('');
        }
    };

    const handleClearFilters = () => {
        setPeriod('P1');
        setStartDate('');
        setEndDate('');
        setYear(new Date().getFullYear());
        setSearchTerm('');
        setBasis('cash');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const summary = reportPayload?.summary || {
        outputVatTotal: 0,
        inputVatTotal: 0,
        netVatPayable: 0,
        totalTaxableSales: 0,
        totalTaxablePurchases: 0,
        totalGrossSales: 0,
        totalGrossPurchases: 0
    };

    const rateBreakdown = reportPayload?.rateBreakdown || [];
    const outputVatTransactions = (reportPayload?.outputVatTransactions || []).filter(item =>
        (item.docNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const inputVatTransactions = (reportPayload?.inputVatTransactions || []).filter(item =>
        (item.docNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const allTransactions = [
        ...outputVatTransactions.map(t => ({ ...t, direction: 'Output' })),
        ...inputVatTransactions.map(t => ({ ...t, direction: 'Input' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Export to Excel
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // 1. VAT Return Summary Sheet
        const summaryWsData = [
            ["TAB ACCOUNTS - VAT RETURN STATEMENT"],
            [`Company: ${companySettings?.name || 'Tab Accounts'}`],
            [`VAT Number: ${companySettings?.vatNumber || 'N/A'}`],
            [`Period: ${reportPayload?.periodLabel || period}`],
            [`Accounting Method: ${basis.toUpperCase()} BASIS`],
            [],
            ["VAT RETURN BOXES", "DESCRIPTION", "AMOUNT"],
            ["Box T1", "VAT on Sales (Output VAT)", formatCurrency(summary.outputVatTotal)],
            ["Box T2", "VAT on Purchases (Input VAT)", formatCurrency(summary.inputVatTotal)],
            ["Box T3", "Net VAT Payable / (Refund Due)", formatCurrency(summary.netVatPayable)],
            [],
            ["NET TURNOVER & EXPENDITURE", "", ""],
            ["Total Net Sales (Excl. VAT)", "", formatCurrency(summary.totalTaxableSales)],
            ["Total Net Purchases (Excl. VAT)", "", formatCurrency(summary.totalTaxablePurchases)],
            ["Total Gross Sales (Incl. VAT)", "", formatCurrency(summary.totalGrossSales)],
            ["Total Gross Purchases (Incl. VAT)", "", formatCurrency(summary.totalGrossPurchases)],
            [],
            ["VAT RATE BREAKDOWN", "", "", "", "", ""],
            ["Rate (%)", "Net Sales", "Output VAT (T1)", "Net Purchases", "Input VAT (T2)", "Net VAT Balance"],
            ...rateBreakdown.map(r => [
                `${r.rate}%`,
                formatCurrency(r.salesTaxable),
                formatCurrency(r.salesVat),
                formatCurrency(r.purchasesTaxable),
                formatCurrency(r.purchasesVat),
                formatCurrency(r.netVat)
            ])
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryWsData);
        XLSX.utils.book_append_sheet(wb, summaryWs, "VAT Summary");

        // 2. Output VAT Transactions
        const outputWsData = [
            ["OUTPUT VAT - SALES & RECEIPTS SCHEDULE"],
            [`Period: ${reportPayload?.periodLabel || period}`],
            [],
            ["Date", "Type", "Doc #", "Ref #", "Customer", "Taxable Net", "VAT Rate (%)", "VAT Amount", "Gross Amount", "Payment Mode"],
            ...outputVatTransactions.map(t => [
                formatDate(t.date),
                t.type,
                t.docNumber,
                t.refNumber || '-',
                t.partyName,
                formatCurrency(t.taxableAmount),
                `${t.vatRate}%`,
                formatCurrency(t.vatAmount),
                formatCurrency(t.grossAmount),
                t.paymentMode || '-'
            ])
        ];
        const outputWs = XLSX.utils.aoa_to_sheet(outputWsData);
        XLSX.utils.book_append_sheet(wb, outputWs, "Output VAT Sales");

        // 3. Input VAT Transactions
        const inputWsData = [
            ["INPUT VAT - PURCHASES & EXPENSES SCHEDULE"],
            [`Period: ${reportPayload?.periodLabel || period}`],
            [],
            ["Date", "Type", "Doc #", "Ref #", "Vendor / Payee", "Taxable Net", "VAT Rate (%)", "VAT Amount", "Gross Amount", "Payment Mode"],
            ...inputVatTransactions.map(t => [
                formatDate(t.date),
                t.type,
                t.docNumber,
                t.refNumber || '-',
                t.partyName,
                formatCurrency(t.taxableAmount),
                `${t.vatRate}%`,
                formatCurrency(t.vatAmount),
                formatCurrency(t.grossAmount),
                t.paymentMode || '-'
            ])
        ];
        const inputWs = XLSX.utils.aoa_to_sheet(inputWsData);
        XLSX.utils.book_append_sheet(wb, inputWs, "Input VAT Purchases");

        XLSX.writeFile(wb, `VAT_Return_${year}_${period}_${basis.toUpperCase()}.xlsx`);
    };

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');

        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text('TAB ACCOUNTS', 14, 15);

        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text('Bi-Monthly VAT Return Statement', 14, 21);

        doc.setFontSize(9);
        doc.text(`Company: ${companySettings?.name || 'Tab Accounts'} | VAT No: ${companySettings?.vatNumber || 'N/A'}`, 14, 27);
        doc.text(`Period: ${reportPayload?.periodLabel || period} | Method: ${basis.toUpperCase()} BASIS`, 14, 32);

        // Summary Return Box Table
        autoTable(doc, {
            head: [['Return Box', 'Description', 'Amount']],
            body: [
                ['Box T1', 'VAT on Sales (Output VAT)', formatCurrency(summary.outputVatTotal)],
                ['Box T2', 'VAT on Purchases (Input VAT)', formatCurrency(summary.inputVatTotal)],
                ['Box T3', 'Net VAT Payable / (Refund Due)', formatCurrency(summary.netVatPayable)],
                ['Net Turnover', 'Total Net Sales (Excl. VAT)', formatCurrency(summary.totalTaxableSales)],
                ['Net Purchases', 'Total Net Purchases (Excl. VAT)', formatCurrency(summary.totalTaxablePurchases)]
            ],
            startY: 38,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8.5 }
        });

        // Rate Breakdown Table
        autoTable(doc, {
            head: [['VAT Rate', 'Net Sales', 'Output VAT (T1)', 'Net Purchases', 'Input VAT (T2)', 'Net VAT']],
            body: rateBreakdown.map(r => [
                `${r.rate}%`,
                formatCurrency(r.salesTaxable),
                formatCurrency(r.salesVat),
                formatCurrency(r.purchasesTaxable),
                formatCurrency(r.purchasesVat),
                formatCurrency(r.netVat)
            ]),
            startY: doc.lastAutoTable.finalY + 8,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8 }
        });

        doc.save(`VAT_Return_${year}_${period}.pdf`);
    };

    return (
        <div className="vat-report-page">
            {/* Top Header Card */}
            <div className="vat-control-card">
                <div className="vat-control-header">
                    <div>
                        <div className="vat-badge-row">
                            <span className="vat-badge-live">TAB ACCOUNTS VAT ENGINE</span>
                            <span className="vat-badge-basis">{basis === 'cash' ? 'Cash Receipts Basis' : 'Accrual Invoice Basis'}</span>
                        </div>
                        <h1 className="vat-page-title">VAT Return & Bi-Monthly Reporting</h1>
                        <p className="vat-page-subtitle">
                            Official VAT return calculation statement (Boxes T1, T2, T3) and detailed audit schedules.
                        </p>
                    </div>
                    <div className="vat-control-actions">
                        <div className="vat-period-pill">
                            <Calendar size={15} />
                            <strong>{reportPayload?.periodLabel || `Period ${period}`}</strong>
                        </div>
                        <div className="vat-export-dropdown">
                            <button
                                className="vat-btn-export"
                                onClick={() => setShowExportOptions(!showExportOptions)}
                                title="Export Report"
                            >
                                <Download size={16} /> Export
                            </button>
                            {showExportOptions && (
                                <div className="vat-export-menu">
                                    <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>
                                        Export Excel Spreadsheet (.xlsx)
                                    </button>
                                    <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>
                                        Export Official PDF Statement (.pdf)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Period Selector Tabs */}
                <div className="vat-period-selector-row">
                    <div className="vat-period-buttons">
                        {biMonthlyPeriods.map((p) => (
                            <button
                                key={p.id}
                                className={`vat-period-btn ${period === p.id ? 'active' : ''}`}
                                onClick={() => handlePeriodChange(p.id)}
                            >
                                <span className="vat-p-label">{p.label}</span>
                                <span className="vat-p-sub">{p.sub}</span>
                            </button>
                        ))}
                    </div>

                    <div className="vat-year-select-wrap">
                        <label>Tax Year</label>
                        <select
                            className="vat-year-select"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Second Row: Accounting Basis & Custom Date Range / Search */}
                <div className="vat-secondary-controls">
                    <div className="vat-basis-toggle-group">
                        <span className="vat-basis-label">Reporting Basis:</span>
                        <div className="vat-basis-pill-wrap">
                            <button
                                className={`vat-basis-btn ${basis === 'cash' ? 'active' : ''}`}
                                onClick={() => setBasis('cash')}
                                title="VAT calculated based on actual cash receipts & payments"
                            >
                                Cash-Basis (Moneys Received)
                            </button>
                            <button
                                className={`vat-basis-btn ${basis === 'accrual' ? 'active' : ''}`}
                                onClick={() => setBasis('accrual')}
                                title="VAT calculated based on invoice & bill issue dates"
                            >
                                Accrual-Basis (Invoice Dates)
                            </button>
                        </div>
                    </div>

                    {period === 'custom' && (
                        <div className="vat-custom-dates-wrap">
                            <div className="vat-date-field">
                                <label>From Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="vat-date-field">
                                <label>To Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="vat-search-box">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder="Search document #, customer, vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {(period !== 'P1' || basis !== 'cash' || searchTerm || startDate) && (
                        <button className="vat-btn-reset" onClick={handleClearFilters}>
                            <RefreshCw size={13} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* 3 Primary Return Boxes (T1, T2, T3) */}
            <div className="vat-kpi-grid">
                {/* Box T1 */}
                <div className="vat-kpi-card output">
                    <div className="vat-kpi-header">
                        <span className="vat-box-code">BOX T1</span>
                        <span className="vat-box-type">OUTPUT VAT (SALES)</span>
                    </div>
                    <div className="vat-kpi-amount">{formatCurrency(summary.outputVatTotal)}</div>
                    <div className="vat-kpi-footer">
                        <span>Total Net Sales:</span>
                        <strong>{formatCurrency(summary.totalTaxableSales)}</strong>
                    </div>
                </div>

                {/* Box T2 */}
                <div className="vat-kpi-card input">
                    <div className="vat-kpi-header">
                        <span className="vat-box-code">BOX T2</span>
                        <span className="vat-box-type">INPUT VAT (PURCHASES)</span>
                    </div>
                    <div className="vat-kpi-amount">{formatCurrency(summary.inputVatTotal)}</div>
                    <div className="vat-kpi-footer">
                        <span>Total Net Purchases:</span>
                        <strong>{formatCurrency(summary.totalTaxablePurchases)}</strong>
                    </div>
                </div>

                {/* Box T3 */}
                <div className={`vat-kpi-card net ${summary.netVatPayable >= 0 ? 'payable' : 'refund'}`}>
                    <div className="vat-kpi-header">
                        <span className="vat-box-code">BOX T3</span>
                        <span className="vat-box-type">
                            {summary.netVatPayable >= 0 ? 'NET VAT PAYABLE (T1 - T2)' : 'NET VAT REFUND DUE (T1 - T2)'}
                        </span>
                    </div>
                    <div className="vat-kpi-amount">{formatCurrency(Math.abs(summary.netVatPayable))}</div>
                    <div className="vat-kpi-footer">
                        <span className="vat-status-pill">
                            {summary.netVatPayable >= 0 ? '● Payable to Revenue' : '● Repayment Due from Revenue'}
                        </span>
                        <strong>Gross Turnover: {formatCurrency(summary.totalGrossSales)}</strong>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="vat-nav-tabs">
                <button
                    className={`vat-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    <Layers size={16} /> VAT Rate Breakdown
                </button>
                <button
                    className={`vat-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveTab('output')}
                >
                    <FileText size={16} /> Output VAT Sales ({outputVatTransactions.length})
                </button>
                <button
                    className={`vat-tab-btn ${activeTab === 'input' ? 'active' : ''}`}
                    onClick={() => setActiveTab('input')}
                >
                    <DollarSign size={16} /> Input VAT Purchases ({inputVatTransactions.length})
                </button>
                <button
                    className={`vat-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <ShieldCheck size={16} /> All Audit Transactions ({allTransactions.length})
                </button>
            </div>

            {/* TAB 1: Rate Breakdown */}
            {activeTab === 'summary' && (
                <div className="vat-table-card">
                    <div className="vat-card-title-bar">
                        <h3>VAT Rates & Taxable Turnover Breakdown</h3>
                        <span className="vat-method-note">Calculation Basis: {basis.toUpperCase()}</span>
                    </div>
                    <div className="vat-table-responsive">
                        <table className="vat-data-table">
                            <thead>
                                <tr>
                                    <th>VAT Rate</th>
                                    <th className="text-right">Net Sales (Excl. VAT)</th>
                                    <th className="text-right">Output VAT (T1)</th>
                                    <th className="text-right">Net Purchases (Excl. VAT)</th>
                                    <th className="text-right">Input VAT (T2)</th>
                                    <th className="text-right">Net VAT Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rateBreakdown.length > 0 ? (
                                    rateBreakdown.map((r) => (
                                        <tr key={r.rate}>
                                            <td>
                                                <span className="vat-rate-tag">{r.rate}% VAT</span>
                                            </td>
                                            <td className="text-right">{formatCurrency(r.salesTaxable)}</td>
                                            <td className="text-right font-bold text-slate-800">{formatCurrency(r.salesVat)}</td>
                                            <td className="text-right">{formatCurrency(r.purchasesTaxable)}</td>
                                            <td className="text-right font-bold text-slate-800">{formatCurrency(r.purchasesVat)}</td>
                                            <td className={`text-right font-bold ${r.netVat >= 0 ? 'text-slate-900' : 'text-cyan-700'}`}>
                                                {formatCurrency(r.netVat)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center p-6 text-slate-500">
                                            No VAT transactions recorded for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="vat-footer-row">
                                    <td>Grand Total</td>
                                    <td className="text-right">{formatCurrency(summary.totalTaxableSales)}</td>
                                    <td className="text-right">{formatCurrency(summary.outputVatTotal)}</td>
                                    <td className="text-right">{formatCurrency(summary.totalTaxablePurchases)}</td>
                                    <td className="text-right">{formatCurrency(summary.inputVatTotal)}</td>
                                    <td className="text-right">{formatCurrency(summary.netVatPayable)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: Output VAT Details */}
            {activeTab === 'output' && (
                <div className="vat-table-card">
                    <div className="vat-card-title-bar">
                        <h3>Output VAT - Sales Invoices, POS & Customer Receipts</h3>
                        <span className="vat-count-badge">{outputVatTransactions.length} Entries</span>
                    </div>
                    <div className="vat-table-responsive">
                        <table className="vat-data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Doc #</th>
                                    <th>Invoice Ref</th>
                                    <th>Customer / Client</th>
                                    <th className="text-right">Taxable Net</th>
                                    <th className="text-center">Rate</th>
                                    <th className="text-right">VAT Amount</th>
                                    <th className="text-right">Gross Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {outputVatTransactions.length > 0 ? (
                                    outputVatTransactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{formatDate(t.date)}</td>
                                            <td>
                                                <span className="vat-type-badge sale">{t.type}</span>
                                            </td>
                                            <td className="font-semibold text-slate-800">{t.docNumber}</td>
                                            <td className="text-slate-500">{t.refNumber || '-'}</td>
                                            <td>{t.partyName}</td>
                                            <td className="text-right">{formatCurrency(t.taxableAmount)}</td>
                                            <td className="text-center">{t.vatRate}%</td>
                                            <td className="text-right font-bold text-slate-900">{formatCurrency(t.vatAmount)}</td>
                                            <td className="text-right text-slate-600">{formatCurrency(t.grossAmount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center p-6 text-slate-500">No output VAT sales records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: Input VAT Details */}
            {activeTab === 'input' && (
                <div className="vat-table-card">
                    <div className="vat-card-title-bar">
                        <h3>Input VAT - Purchase Bills, Vendor Payments & Expenses</h3>
                        <span className="vat-count-badge">{inputVatTransactions.length} Entries</span>
                    </div>
                    <div className="vat-table-responsive">
                        <table className="vat-data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Doc / Bill #</th>
                                    <th>Bill Ref</th>
                                    <th>Vendor / Payee</th>
                                    <th className="text-right">Taxable Net</th>
                                    <th className="text-center">Rate</th>
                                    <th className="text-right">VAT Amount</th>
                                    <th className="text-right">Gross Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inputVatTransactions.length > 0 ? (
                                    inputVatTransactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{formatDate(t.date)}</td>
                                            <td>
                                                <span className="vat-type-badge purchase">{t.type}</span>
                                            </td>
                                            <td className="font-semibold text-slate-800">{t.docNumber}</td>
                                            <td className="text-slate-500">{t.refNumber || '-'}</td>
                                            <td>{t.partyName}</td>
                                            <td className="text-right">{formatCurrency(t.taxableAmount)}</td>
                                            <td className="text-center">{t.vatRate}%</td>
                                            <td className="text-right font-bold text-slate-900">{formatCurrency(t.vatAmount)}</td>
                                            <td className="text-right text-slate-600">{formatCurrency(t.grossAmount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center p-6 text-slate-500">No input VAT purchase records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: All Audit Transactions */}
            {activeTab === 'all' && (
                <div className="vat-table-card">
                    <div className="vat-card-title-bar">
                        <h3>Consolidated VAT Audit Schedule</h3>
                        <span className="vat-count-badge">{allTransactions.length} Total Records</span>
                    </div>
                    <div className="vat-table-responsive">
                        <table className="vat-data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Direction</th>
                                    <th>Type</th>
                                    <th>Doc #</th>
                                    <th>Party</th>
                                    <th className="text-right">Taxable Net</th>
                                    <th className="text-center">Rate</th>
                                    <th className="text-right">VAT Amount</th>
                                    <th className="text-right">Gross Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTransactions.length > 0 ? (
                                    allTransactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{formatDate(t.date)}</td>
                                            <td>
                                                <span className={`vat-dir-tag ${t.direction.toLowerCase()}`}>{t.direction}</span>
                                            </td>
                                            <td>{t.type}</td>
                                            <td className="font-semibold text-slate-800">{t.docNumber}</td>
                                            <td>{t.partyName}</td>
                                            <td className="text-right">{formatCurrency(t.taxableAmount)}</td>
                                            <td className="text-center">{t.vatRate}%</td>
                                            <td className="text-right font-bold text-slate-900">{formatCurrency(t.vatAmount)}</td>
                                            <td className="text-right text-slate-600">{formatCurrency(t.grossAmount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center p-6 text-slate-500">No audit records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VatReport;
