import React, { useState, useEffect, useContext } from 'react';
import { Download, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import './TaxReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TaxReport = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [year, setYear] = useState(new Date().getFullYear());
    const [basis, setBasis] = useState('cash'); // 'cash' or 'accrual'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchCompanySettings();
        fetchTaxReport();
    }, [year, startDate, endDate, basis]);

    const fetchTaxReport = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (companyId) {
                const params = { companyId, year, basis };
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;

                const response = await axiosInstance.get(`/reports/tax`, { params });
                if (response.data.success) {
                    setData(response.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching VAT report:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setYear(new Date().getFullYear());
        setBasis('cash');
    };

    const incomeTaxes = [
        { name: 'Standard Rate (23%)', values: data?.income?.Standard23 || Array(12).fill(0) },
        { name: 'Reduced Rate (13.5%)', values: data?.income?.Reduced13_5 || Array(12).fill(0) },
        { name: 'Zero / Exempt Rate (0%)', values: data?.income?.OtherVat || Array(12).fill(0) },
        { name: 'Total Output VAT (Sales)', values: data?.income?.TotalVat || Array(12).fill(0) }
    ];

    const expenseTaxes = [
        { name: 'Standard Rate (23%)', values: data?.expense?.Standard23 || Array(12).fill(0) },
        { name: 'Reduced Rate (13.5%)', values: data?.expense?.Reduced13_5 || Array(12).fill(0) },
        { name: 'Zero / Exempt Rate (0%)', values: data?.expense?.OtherVat || Array(12).fill(0) },
        { name: 'Total Input VAT (Purchases)', values: data?.expense?.TotalVat || Array(12).fill(0) }
    ];

    const biMonthlyPeriods = data?.biMonthly || [
        { id: 1, period: 'Jan - Feb', periodName: 'Period 1 (Jan - Feb)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
        { id: 2, period: 'Mar - Apr', periodName: 'Period 2 (Mar - Apr)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
        { id: 3, period: 'May - Jun', periodName: 'Period 3 (May - Jun)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
        { id: 4, period: 'Jul - Aug', periodName: 'Period 4 (Jul - Aug)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
        { id: 5, period: 'Sep - Oct', periodName: 'Period 5 (Sep - Oct)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
        { id: 6, period: 'Nov - Dec', periodName: 'Period 6 (Nov - Dec)', salesVat: 0, purchasesVat: 0, netVatOwed: 0, status: 'Nil Balance' },
    ];

    const summary = data?.summary || {
        totalSalesVat: data?.income?.TotalVat ? data.income.TotalVat.reduce((a, b) => a + b, 0) : 0,
        totalPurchasesVat: data?.expense?.TotalVat ? data.expense.TotalVat.reduce((a, b) => a + b, 0) : 0,
        totalNetVatOwed: (data?.income?.TotalVat?.reduce((a, b) => a + b, 0) || 0) - (data?.expense?.TotalVat?.reduce((a, b) => a + b, 0) || 0),
        overallStatus: 'Nil Balance'
    };

    const exportToExcel = () => {
        const worksheetData = [];
        
        // Header
        worksheetData.push(['TAB ACCOUNTS - BI-MONTHLY VAT RETURN TO REVENUE', '', `Year: ${year}`, startDate ? `Range: ${startDate} to ${endDate}` : 'Full Tax Year', `Method: ${basis.toUpperCase()} BASIS`]);
        worksheetData.push([]);

        // Bi-Monthly Section
        worksheetData.push(['BI-MONTHLY VAT CALCULATIONS (EVERY 2 MONTHS - SALES VS PURCHASES)']);
        worksheetData.push(['Period', 'Filing Term', 'Sales VAT (Output T1)', 'Purchases VAT (Input T2)', 'Net VAT Owed to Revenue (T1 - T2)', 'Status']);
        biMonthlyPeriods.forEach(p => {
            worksheetData.push([
                p.periodName,
                p.period,
                p.salesVat,
                p.purchasesVat,
                p.netVatOwed,
                p.status
            ]);
        });
        worksheetData.push([
            'FULL YEAR TOTAL',
            '',
            summary.totalSalesVat,
            summary.totalPurchasesVat,
            summary.totalNetVatOwed,
            summary.totalNetVatOwed > 0 ? 'Payable to Revenue' : (summary.totalNetVatOwed < 0 ? 'Refund Due' : 'Nil Balance')
        ]);

        worksheetData.push([]);
        worksheetData.push(['OUTPUT TAXES (Sales VAT Breakdown)']);
        worksheetData.push(['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Zero/Exempt (0%)', 'Total Output VAT']);
        months.forEach((m, i) => {
            worksheetData.push([
                m,
                data?.income?.Standard23?.[i] || 0,
                data?.income?.Reduced13_5?.[i] || 0,
                data?.income?.OtherVat?.[i] || 0,
                data?.income?.TotalVat?.[i] || 0
            ]);
        });
        
        worksheetData.push([]);
        worksheetData.push(['INPUT TAXES (Purchases VAT Breakdown)']);
        worksheetData.push(['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Zero/Exempt (0%)', 'Total Input VAT']);
        months.forEach((m, i) => {
            worksheetData.push([
                m,
                data?.expense?.Standard23?.[i] || 0,
                data?.expense?.Reduced13_5?.[i] || 0,
                data?.expense?.OtherVat?.[i] || 0,
                data?.expense?.TotalVat?.[i] || 0
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "VAT Returns");
        XLSX.writeFile(wb, `BiMonthly_VAT_Return_${year}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text(`TAB ACCOUNTS - Bi-Monthly VAT Return`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Tax Year: ${year} ${startDate ? `| Range: ${startDate} to ${endDate}` : ''} | Method: ${basis.toUpperCase()} BASIS`, 14, 22);

        // Bi-Monthly Return Table
        doc.setFontSize(12);
        doc.text('Bi-Monthly VAT Calculation (Sales vs Purchases Owed to Revenue)', 14, 30);
        const biMonthlyRows = biMonthlyPeriods.map(p => [
            p.periodName,
            formatCurrency(p.salesVat),
            formatCurrency(p.purchasesVat),
            formatCurrency(p.netVatOwed),
            p.status
        ]);
        biMonthlyRows.push([
            'FULL YEAR TOTAL',
            formatCurrency(summary.totalSalesVat),
            formatCurrency(summary.totalPurchasesVat),
            formatCurrency(summary.totalNetVatOwed),
            summary.totalNetVatOwed > 0 ? 'Payable' : (summary.totalNetVatOwed < 0 ? 'Refund' : 'Nil')
        ]);

        autoTable(doc, {
            head: [['Period', 'Sales VAT (Output)', 'Purchases VAT (Input)', 'Net Owed to Revenue', 'Status']],
            body: biMonthlyRows,
            startY: 34,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`BiMonthly_VAT_Return_${year}.pdf`);
    };

    return (
        <div className="tax-report-page">
            {/* Unified Top Control Card */}
            <div className="unified-top-card card">
                <div className="top-card-header">
                    <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>REVENUE VAT REPORT</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: basis === 'cash' ? '#dcfce7' : '#fef3c7', color: basis === 'cash' ? '#15803d' : '#b45309' }}>
                                {basis === 'cash' ? 'Cash-Basis (Payments Received/Made)' : 'Accrual-Basis (Invoice/Bill Dates)'}
                            </span>
                        </div>
                        <h1 className="page-title">VAT Return &amp; Bi-Monthly Calculation</h1>
                        <p className="page-subtitle">Calculate VAT owed to Revenue every 2 months (Sales vs Purchases) &amp; full breakdown by VAT rate brackets</p>
                    </div>
                    <div className="top-card-actions">
                        <div className="duration-badge">
                            <span>Period:</span>
                            <strong>{startDate && endDate ? `${startDate} to ${endDate}` : `Jan-${year} to Dec-${year}`}</strong>
                        </div>
                        <div className="export-dropdown-wrapper">
                            <button className="btn-download-green" onClick={() => setShowExportOptions(!showExportOptions)} title="Export Report">
                                <Download size={18} /> Export
                            </button>
                            {showExportOptions && (
                                <div className="export-menu">
                                    <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>Excel File (.xlsx)</button>
                                    <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>PDF Document (.pdf)</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="top-card-filters">
                    <div className="filter-item">
                        <label>Reporting Basis</label>
                        <div className="vat-basis-pill-wrap">
                            <button
                                type="button"
                                className={`vat-basis-btn ${basis === 'cash' ? 'active' : ''}`}
                                onClick={() => setBasis('cash')}
                                title="VAT calculated based on actual cash receipts & payments"
                            >
                                Cash-Basis (Moneys Received)
                            </button>
                            <button
                                type="button"
                                className={`vat-basis-btn ${basis === 'accrual' ? 'active' : ''}`}
                                onClick={() => setBasis('accrual')}
                                title="VAT calculated based on invoice & bill issue dates"
                            >
                                Accrual-Basis (Invoice Dates)
                            </button>
                        </div>
                    </div>
                    <div className="filter-item">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <label>Select Tax Year</label>
                        <select className="filter-select" value={year} onChange={(e) => setYear(e.target.value)}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {(startDate || endDate) && (
                        <div className="filter-item filter-action">
                            <button onClick={handleClearFilters} className="btn-clear-link">
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="vat-kpi-grid">
                <div className="vat-kpi-card">
                    <div className="vat-kpi-header">
                        <span className="vat-kpi-label">Sales VAT (Output T1)</span>
                        <div className="vat-kpi-icon sales"><ArrowUpRight size={18} /></div>
                    </div>
                    <div className="vat-kpi-value">{formatCurrency(summary.totalSalesVat)}</div>
                    <p className="vat-kpi-hint">Total VAT collected on sales &amp; POS invoices</p>
                </div>

                <div className="vat-kpi-card">
                    <div className="vat-kpi-header">
                        <span className="vat-kpi-label">Purchases VAT (Input T2)</span>
                        <div className="vat-kpi-icon purchases"><ArrowDownRight size={18} /></div>
                    </div>
                    <div className="vat-kpi-value">{formatCurrency(summary.totalPurchasesVat)}</div>
                    <p className="vat-kpi-hint">Total VAT paid on purchase bills &amp; expenses</p>
                </div>

                <div className={`vat-kpi-card highlight ${summary.totalNetVatOwed > 0 ? 'payable' : (summary.totalNetVatOwed < 0 ? 'refund' : 'nil')}`}>
                    <div className="vat-kpi-header">
                        <span className="vat-kpi-label">Net VAT Owed to Revenue (T1 - T2)</span>
                        <div className="vat-kpi-icon revenue"><DollarSign size={18} /></div>
                    </div>
                    <div className="vat-kpi-value">{formatCurrency(Math.abs(summary.totalNetVatOwed))}</div>
                    <div className="vat-kpi-status-badge">
                        {summary.totalNetVatOwed > 0 ? 'PAYABLE TO REVENUE' : (summary.totalNetVatOwed < 0 ? 'REFUND DUE FROM REVENUE' : 'NIL BALANCE')}
                    </div>
                </div>
            </div>

            {/* 1. BI-MONTHLY VAT RETURN TABLE (Every 2 Months) */}
            <div className="section-card card mt-6">
                <div className="section-header-row">
                    <div>
                        <h3 className="section-title">Bi-Monthly VAT Return (Every 2 Months: Sales vs Purchases)</h3>
                        <p className="section-desc">Statutory 2-month VAT cycle comparing VAT charged on sales versus VAT paid on purchases to calculate amount owed to Revenue</p>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="tax-table bimonthly-table">
                        <thead>
                            <tr>
                                <th>TAX PERIOD</th>
                                <th>CYCLE</th>
                                <th style={{ textAlign: 'right' }}>SALES VAT (OUTPUT)</th>
                                <th style={{ textAlign: 'right' }}>PURCHASES VAT (INPUT)</th>
                                <th style={{ textAlign: 'right' }}>NET VAT OWED TO REVENUE</th>
                                <th style={{ textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {biMonthlyPeriods.map((p) => {
                                const isPayable = p.netVatOwed > 0;
                                const isRefund = p.netVatOwed < 0;
                                return (
                                    <tr key={p.id}>
                                        <td className="tax-name font-bold">{p.periodName}</td>
                                        <td><span className="cycle-badge">{p.period}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(p.salesVat)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(p.purchasesVat)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', color: isPayable ? '#dc2626' : (isRefund ? '#16a34a' : '#475569') }}>
                                            {formatCurrency(p.netVatOwed)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`status-pill ${isPayable ? 'status-payable' : (isRefund ? 'status-refund' : 'status-nil')}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bimonthly-total-row">
                                <td colSpan="2" className="tax-name font-bold">FULL YEAR TOTAL</td>
                                <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(summary.totalSalesVat)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '800' }}>{formatCurrency(summary.totalPurchasesVat)}</td>
                                <td style={{ textAlign: 'right', fontWeight: '800', color: summary.totalNetVatOwed > 0 ? '#dc2626' : (summary.totalNetVatOwed < 0 ? '#16a34a' : '#475569') }}>
                                    {formatCurrency(summary.totalNetVatOwed)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={`status-pill ${summary.totalNetVatOwed > 0 ? 'status-payable' : (summary.totalNetVatOwed < 0 ? 'status-refund' : 'status-nil')}`}>
                                        {summary.totalNetVatOwed > 0 ? 'PAYABLE' : (summary.totalNetVatOwed < 0 ? 'REFUND' : 'NIL')}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* 2. Monthly Output VAT Breakdown */}
            <div className="section-card card mt-6">
                <h3 className="section-title">Output VAT by Rate (Sales &amp; POS)</h3>
                <div className="table-responsive">
                    <table className="tax-table">
                        <thead>
                            <tr>
                                <th>VAT RATE</th>
                                {months.map(m => <th key={m}>{m.toUpperCase().substr(0, 3)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {incomeTaxes.map((tax, idx) => (
                                <tr key={idx} className={idx === incomeTaxes.length - 1 ? 'total-vat-row' : ''}>
                                    <td className="tax-name">{tax.name}</td>
                                    {tax.values.map((val, vIdx) => (
                                        <td key={vIdx}>
                                            {formatCurrency(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Monthly Input VAT Breakdown */}
            <div className="section-card card mt-6">
                <h3 className="section-title">Input VAT by Rate (Purchases &amp; Expenses)</h3>
                <div className="table-responsive">
                    <table className="tax-table">
                        <thead>
                            <tr>
                                <th>VAT RATE</th>
                                {months.map(m => <th key={m}>{m.toUpperCase().substr(0, 3)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {expenseTaxes.map((tax, idx) => (
                                <tr key={idx} className={idx === expenseTaxes.length - 1 ? 'total-vat-row' : ''}>
                                    <td className="tax-name">{tax.name}</td>
                                    {tax.values.map((val, vIdx) => (
                                        <td key={vIdx}>
                                            {formatCurrency(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TaxReport;
