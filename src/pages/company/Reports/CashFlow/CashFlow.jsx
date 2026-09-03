import React, { useState, useEffect, useContext } from 'react';
import {
    Download, Filter, Calendar, Activity,
    ArrowUpCircle, ArrowDownCircle, Layers, TrendingUp
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './CashFlow.css';

const CashFlow = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [year, setYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('Monthly'); // 'Monthly' or 'Quarterly'
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({
        operating: { inflows: Array(12).fill(0), outflows: Array(12).fill(0), net: Array(12).fill(0) },
        investing: { inflows: Array(12).fill(0), outflows: Array(12).fill(0), net: Array(12).fill(0) },
        financing: { inflows: Array(12).fill(0), outflows: Array(12).fill(0), net: Array(12).fill(0) },
        netCashFlow: Array(12).fill(0),
        openingCash: Array(12).fill(0),
        closingCash: Array(12).fill(0)
    });

    useEffect(() => {
        fetchCompanySettings();
        fetchCashFlow();
    }, [year]);

    const fetchCashFlow = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (companyId) {
                const response = await axiosInstance.get(`/reports/cash-flow?companyId=${companyId}&year=${year}`);
                if (response.data.success) {
                    setReportData(response.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching cash flow:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to aggregate data based on ViewMode
    const getFlowArray = (monthlyArr, mode = 'sum') => {
        const arr = monthlyArr || Array(12).fill(0);
        if (viewMode === 'Monthly') return arr;

        if (mode === 'opening') {
            return [arr[0], arr[3], arr[6], arr[9]];
        }
        if (mode === 'closing') {
            return [arr[2], arr[5], arr[8], arr[11]];
        }

        // Default Sum Quarterly
        return [
            arr[0] + arr[1] + arr[2],
            arr[3] + arr[4] + arr[5],
            arr[6] + arr[7] + arr[8],
            arr[9] + arr[10] + arr[11]
        ];
    };

    const columns = viewMode === 'Monthly'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : ['Q1', 'Q2', 'Q3', 'Q4'];

    // Classified Activity Arrays
    const opInflows = getFlowArray(reportData.operating?.inflows);
    const opOutflows = getFlowArray(reportData.operating?.outflows);
    const opNet = getFlowArray(reportData.operating?.net);

    const invInflows = getFlowArray(reportData.investing?.inflows);
    const invOutflows = getFlowArray(reportData.investing?.outflows);
    const invNet = getFlowArray(reportData.investing?.net);

    const finInflows = getFlowArray(reportData.financing?.inflows);
    const finOutflows = getFlowArray(reportData.financing?.outflows);
    const finNet = getFlowArray(reportData.financing?.net);

    const netCashFlowData = getFlowArray(reportData.netCashFlow);
    const openingCashData = getFlowArray(reportData.openingCash, 'opening');
    const closingCashData = getFlowArray(reportData.closingCash, 'closing');

    // Dynamic Total Net Summary Calculations
    const totalOpNet = opNet.reduce((sum, v) => sum + v, 0);
    const totalInvNet = invNet.reduce((sum, v) => sum + v, 0);
    const totalFinNet = finNet.reduce((sum, v) => sum + v, 0);
    const endingCash = closingCashData[closingCashData.length - 1] || 0;

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ["Cash Flow Statement (GAAP Classified)", "", `Year: ${year}`, `Mode: ${viewMode}`],
            [],
            ["ACTIVITY CATEGORY", ...columns.map(m => m.toUpperCase())],
            ["1. OPERATING ACTIVITIES"],
            ["Cash Receipts from Operating Activities", ...opInflows.map(v => formatCurrency(v))],
            ["Cash Payments for Operating Expenses & Suppliers", ...opOutflows.map(v => formatCurrency(v))],
            ["Net Cash from Operating Activities", ...opNet.map(v => formatCurrency(v))],
            [],
            ["2. INVESTING ACTIVITIES"],
            ["Proceeds from Sale of Fixed Assets / Investments", ...invInflows.map(v => formatCurrency(v))],
            ["Purchase of Fixed Assets & Equipment", ...invOutflows.map(v => formatCurrency(v))],
            ["Net Cash from Investing Activities", ...invNet.map(v => formatCurrency(v))],
            [],
            ["3. FINANCING ACTIVITIES"],
            ["Proceeds from Loans & Equity", ...finInflows.map(v => formatCurrency(v))],
            ["Loan Repayments & Owner Drawings", ...finOutflows.map(v => formatCurrency(v))],
            ["Net Cash from Financing Activities", ...finNet.map(v => formatCurrency(v))],
            [],
            ["SUMMARY"],
            ["Net Increase / Decrease in Cash", ...netCashFlowData.map(v => formatCurrency(v))],
            ["Cash Balance at Beginning of Period", ...openingCashData.map(v => formatCurrency(v))],
            ["Cash Balance at End of Period", ...closingCashData.map(v => formatCurrency(v))]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
        XLSX.writeFile(wb, `Cash_Flow_${year}_${viewMode}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(16);
        doc.text('Cash Flow Statement', 14, 15);
        doc.setFontSize(10);
        doc.text(`Year: ${year} | View Mode: ${viewMode}`, 14, 22);

        const bodyData = [
            [{ content: '1. OPERATING ACTIVITIES', colSpan: columns.length + 1, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
            ['Cash Receipts (Operating)', ...opInflows.map(v => formatCurrency(v))],
            ['Cash Payments (Suppliers/Expenses)', ...opOutflows.map(v => formatCurrency(v))],
            [{ content: 'Net Operating Cash Flow', styles: { fontStyle: 'bold' } }, ...opNet.map(v => ({ content: formatCurrency(v), styles: { fontStyle: 'bold' } }))],
            
            [{ content: '2. INVESTING ACTIVITIES', colSpan: columns.length + 1, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
            ['Asset Sales Proceeds', ...invInflows.map(v => formatCurrency(v))],
            ['Purchase of Fixed Assets', ...invOutflows.map(v => formatCurrency(v))],
            [{ content: 'Net Investing Cash Flow', styles: { fontStyle: 'bold' } }, ...invNet.map(v => ({ content: formatCurrency(v), styles: { fontStyle: 'bold' } }))],
            
            [{ content: '3. FINANCING ACTIVITIES', colSpan: columns.length + 1, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }],
            ['Loans & Capital Received', ...finInflows.map(v => formatCurrency(v))],
            ['Loan Repayments / Drawings', ...finOutflows.map(v => formatCurrency(v))],
            [{ content: 'Net Financing Cash Flow', styles: { fontStyle: 'bold' } }, ...finNet.map(v => ({ content: formatCurrency(v), styles: { fontStyle: 'bold' } }))],

            [{ content: 'SUMMARY & CASH RECONCILIATION', colSpan: columns.length + 1, styles: { fillColor: [219, 234, 254], textColor: [30, 58, 138], fontStyle: 'bold' } }],
            [{ content: 'Net Change in Cash', styles: { fontStyle: 'bold' } }, ...netCashFlowData.map(v => ({ content: formatCurrency(v), styles: { fontStyle: 'bold' } }))],
            ['Beginning Cash Balance', ...openingCashData.map(v => formatCurrency(v))],
            [{ content: 'Ending Cash Balance', styles: { fontStyle: 'bold' } }, ...closingCashData.map(v => ({ content: formatCurrency(v), styles: { fontStyle: 'bold' } }))]
        ];

        autoTable(doc, {
            head: [['ACTIVITY CATEGORY', ...columns.map(m => m.toUpperCase())]],
            body: bodyData,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [30, 41, 59] },
        });

        doc.save(`Cash_Flow_${year}_${viewMode}.pdf`);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading Cash Flow...</div>;

    return (
        <div className="cashflow-page">
            {/* Header Section */}
            <div className="report-header">
                <div>
                    <h1 className="page-title">Cash Flow Statement</h1>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Classified into Operating, Investing, and Financing activities (GAAP/IFRS)</p>
                </div>
                <div className="export-dropdown-wrapper">
                    <button className="btn-export" onClick={() => setShowExportOptions(!showExportOptions)}>
                        <Download size={16} /> Export
                    </button>
                    {showExportOptions && (
                        <div className="export-menu">
                            <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>Excel File (.xlsx)</button>
                            <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>PDF Document (.pdf)</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic KPI Summary Cards */}
            <div className="cashflow-summary-grid">
                <div className="cashflow-summary-card blue">
                    <div className="card-content">
                        <span className="card-label">Net Operating Flow</span>
                        <h3 className="card-value">{formatCurrency(totalOpNet)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><Activity size={22} /></div>
                </div>
                <div className="cashflow-summary-card amber">
                    <div className="card-content">
                        <span className="card-label">Net Investing Flow</span>
                        <h3 className="card-value">{formatCurrency(totalInvNet)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><TrendingUp size={22} /></div>
                </div>
                <div className="cashflow-summary-card purple">
                    <div className="card-content">
                        <span className="card-label">Net Financing Flow</span>
                        <h3 className="card-value">{formatCurrency(totalFinNet)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><Layers size={22} /></div>
                </div>
                <div className="cashflow-summary-card teal">
                    <div className="card-content">
                        <span className="card-label">Ending Cash Position</span>
                        <h3 className="card-value">{formatCurrency(endingCash)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><ArrowUpCircle size={22} /></div>
                </div>
            </div>

            {/* Unified Filter Toolbar Card */}
            <div className="unified-filter-card" style={{ marginBottom: '1.75rem' }}>
                <div className="filter-card-header">
                    <div className="filter-card-title">
                        <Filter size={18} style={{ color: '#1e293b' }} />
                        <span>Cash Flow Controls</span>
                    </div>
                    <div className="filter-card-actions">
                        <button
                            onClick={() => { setYear(new Date().getFullYear()); setViewMode('Monthly'); }}
                            className="btn-filter-reset"
                        >
                            Reset Controls
                        </button>
                    </div>
                </div>

                <div className="filter-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'center' }}>
                    <div className="filter-field">
                        <label className="field-label">Fiscal Year</label>
                        <div className="select-with-icon">
                            <Calendar size={16} className="select-icon" />
                            <select className="styled-select" value={year} onChange={(e) => setYear(e.target.value)}>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <option key={y} value={y}>Fiscal Year {y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Frequency View Mode</label>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                            <button
                                style={{
                                    flex: 1, border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                                    background: viewMode === 'Monthly' ? '#1e293b' : 'transparent',
                                    color: viewMode === 'Monthly' ? 'white' : '#64748b',
                                    boxShadow: viewMode === 'Monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={() => setViewMode('Monthly')}
                            >
                                Monthly
                            </button>
                            <button
                                style={{
                                    flex: 1, border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                                    background: viewMode === 'Quarterly' ? '#1e293b' : 'transparent',
                                    color: viewMode === 'Quarterly' ? 'white' : '#64748b',
                                    boxShadow: viewMode === 'Quarterly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={() => setViewMode('Quarterly')}
                            >
                                Quarterly
                            </button>
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Report Statement Type</label>
                        <div className="meta-box" style={{ padding: '8px 12px' }}>
                            <span className="meta-box-value" style={{ fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                {viewMode} Cash Flow Statement
                            </span>
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Active Period Duration</label>
                        <div className="meta-box" style={{ padding: '8px 12px' }}>
                            <span className="meta-box-value" style={{ fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                Jan-{year} to Dec-{year}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="report-content card">

                {/* 1. Operating Activities */}
                <div className="section-block">
                    <h3 className="section-heading" style={{ color: '#2563eb' }}>1. Operating Activities</h3>
                    <div className="table-responsive">
                        <table className="cashflow-table">
                            <thead>
                                <tr>
                                    <th className="col-category">ACTIVITY / CATEGORY</th>
                                    {columns.map(m => <th key={m}>{m.toUpperCase()}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="row-group">
                                    <td className="detail-label">Cash Receipts from Customers & Sales</td>
                                    {opInflows.map((v, i) => <td key={i} style={{ color: '#334155' }}>+{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-group">
                                    <td className="detail-label">Cash Paid to Suppliers & Operating Expenses</td>
                                    {opOutflows.map((v, i) => <td key={i} style={{ color: '#dc2626' }}>-{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-total" style={{ background: '#eff6ff' }}>
                                    <td className="detail-label" style={{ fontWeight: '700', color: '#1d4ed8' }}>Net Cash from Operating Activities</td>
                                    {opNet.map((v, i) => (
                                        <td key={i} style={{ fontWeight: '700', color: v < 0 ? '#dc2626' : '#1e293b' }}>
                                            {formatCurrency(v)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Investing Activities */}
                <div className="section-block">
                    <h3 className="section-heading" style={{ color: '#d97706' }}>2. Investing Activities</h3>
                    <div className="table-responsive">
                        <table className="cashflow-table">
                            <thead>
                                <tr>
                                    <th className="col-category">ACTIVITY / CATEGORY</th>
                                    {columns.map(m => <th key={m}>{m.toUpperCase()}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="row-group">
                                    <td className="detail-label">Proceeds from Sale of Fixed Assets / Investments</td>
                                    {invInflows.map((v, i) => <td key={i} style={{ color: '#334155' }}>+{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-group">
                                    <td className="detail-label">Purchase of Fixed Assets, Property & Equipment</td>
                                    {invOutflows.map((v, i) => <td key={i} style={{ color: '#dc2626' }}>-{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-total" style={{ background: '#fffbeb' }}>
                                    <td className="detail-label" style={{ fontWeight: '700', color: '#b45309' }}>Net Cash from Investing Activities</td>
                                    {invNet.map((v, i) => (
                                        <td key={i} style={{ fontWeight: '700', color: v < 0 ? '#dc2626' : '#1e293b' }}>
                                            {formatCurrency(v)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Financing Activities */}
                <div className="section-block">
                    <h3 className="section-heading" style={{ color: '#7c3aed' }}>3. Financing Activities</h3>
                    <div className="table-responsive">
                        <table className="cashflow-table">
                            <thead>
                                <tr>
                                    <th className="col-category">ACTIVITY / CATEGORY</th>
                                    {columns.map(m => <th key={m}>{m.toUpperCase()}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="row-group">
                                    <td className="detail-label">Proceeds from Loans & Owner Capital Injection</td>
                                    {finInflows.map((v, i) => <td key={i} style={{ color: '#334155' }}>+{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-group">
                                    <td className="detail-label">Loan Repayments, Dividends & Owner Drawings</td>
                                    {finOutflows.map((v, i) => <td key={i} style={{ color: '#dc2626' }}>-{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-total" style={{ background: '#faf5ff' }}>
                                    <td className="detail-label" style={{ fontWeight: '700', color: '#6b21a8' }}>Net Cash from Financing Activities</td>
                                    {finNet.map((v, i) => (
                                        <td key={i} style={{ fontWeight: '700', color: v < 0 ? '#dc2626' : '#1e293b' }}>
                                            {formatCurrency(v)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 4. Net Cash & Reconciliation Section */}
                <div className="section-block last">
                    <h3 className="section-heading" style={{ color: '#0f172a' }}>Summary & Cash Reconciliation</h3>
                    <div className="table-responsive">
                        <table className="cashflow-table">
                            <tbody>
                                <tr className="row-total" style={{ background: '#f1f5f9' }}>
                                    <td className="detail-label" style={{ fontWeight: '800', color: '#0f172a' }}>Net Change in Cash (Operating + Investing + Financing)</td>
                                    {netCashFlowData.map((v, i) => (
                                        <td key={i} style={{ fontWeight: '800', color: v < 0 ? '#dc2626' : '#2563eb' }}>
                                            {formatCurrency(v)}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="row-group">
                                    <td className="detail-label" style={{ color: '#64748b' }}>Cash Balance at Beginning of Period</td>
                                    {openingCashData.map((v, i) => <td key={i} style={{ color: '#475569' }}>{formatCurrency(v)}</td>)}
                                </tr>
                                <tr className="row-total" style={{ background: '#f1f5f9', borderTop: '2px solid #475569' }}>
                                    <td className="detail-label" style={{ fontWeight: '800', color: '#0f172a' }}>Cash Balance at End of Period</td>
                                    {closingCashData.map((v, i) => (
                                        <td key={i} style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>
                                            {formatCurrency(v)}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CashFlow;
