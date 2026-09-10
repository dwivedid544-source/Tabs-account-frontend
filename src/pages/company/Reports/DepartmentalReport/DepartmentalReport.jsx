import React, { useState, useEffect, useContext } from 'react';
import { 
    Download, Calendar, Printer, FileText, RefreshCw, 
    Building2, Boxes, Warehouse, CheckCircle2, TrendingUp, Layers
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './DepartmentalReport.css';

const getStartOfYearStr = () => {
    const year = new Date().getFullYear();
    return `${year}-01-01`;
};

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DepartmentalReport = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [startDate, setStartDate] = useState(getStartOfYearStr());
    const [endDate, setEndDate] = useState(getTodayStr());
    const [groupBy, setGroupBy] = useState('operational'); // 'operational' | 'category' | 'warehouse'
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const companyId = GetCompanyId();

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/reports/departmental-pnl?startDate=${startDate}&endDate=${endDate}&companyId=${companyId}&groupBy=${groupBy}`);
            if (res.data?.success) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching departmental P&L:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, groupBy]);

    const getGroupHeaderTitle = () => {
        if (groupBy === 'category') return 'Product Category';
        if (groupBy === 'warehouse') return 'Warehouse / Location';
        return 'Department / Business Unit';
    };

    const getSubheaderDescription = () => {
        if (groupBy === 'category') {
            return 'Segmented by inventory product categories (Sales revenue, item acquisition costs & gross product margin)';
        }
        if (groupBy === 'warehouse') {
            return 'Segmented by warehouse branches and fulfillment locations (Sales, direct stock receipts & local performance)';
        }
        return 'Segmented by operational business units grounded in real Invoices, Bills, POS counters, Overheads & Finance';
    };

    const exportToExcel = () => {
        if (!data) return;
        const groupTitle = getGroupHeaderTitle();
        const rows = [];
        rows.push([`TAB ACCOUNTS - Segmented Profit & Loss (${groupTitle})`]);
        rows.push([`Period: ${startDate} to ${endDate}`, `Generated: ${new Date().toLocaleString()}`]);
        rows.push([]);

        rows.push([groupTitle, 'Revenue', 'Cost of Goods Sold (COGS)', 'Gross Profit', 'Operating Expenses', 'Net Profit', 'Profit Margin %', 'Records Count']);

        (data.breakdown || []).forEach(d => {
            rows.push([
                d.name,
                d.revenue,
                d.cogs,
                d.grossProfit,
                d.expenses,
                d.netProfit,
                `${d.marginPct}%`,
                d.docCount || 0
            ]);
        });

        rows.push([]);
        rows.push([
            'TOTAL COMPANY SUMMARY',
            data.summary.totalRevenue,
            data.summary.totalCogs,
            data.summary.totalRevenue - data.summary.totalCogs,
            data.summary.totalExpenses,
            data.summary.totalNetProfit,
            `${data.summary.overallMarginPct}%`,
            ''
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Departmental PnL');
        XLSX.writeFile(wb, `PnL_${groupBy}_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        if (!data) return;
        const groupTitle = getGroupHeaderTitle();
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TAB ACCOUNTS', 14, 15);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Departmental & Segmented Profit & Loss (${groupTitle})`, 14, 22);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Period: ${startDate} to ${endDate} | Net Profit: ${formatCurrency(data.summary.totalNetProfit)}`, 14, 28);

        const tableHead = [[groupTitle, 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit', 'Margin']];
        const tableBody = (data.breakdown || []).map(d => [
            d.name,
            formatCurrency(d.revenue),
            formatCurrency(d.cogs),
            formatCurrency(d.grossProfit),
            formatCurrency(d.expenses),
            formatCurrency(d.netProfit),
            `${d.marginPct}%`
        ]);

        tableBody.push([
            'TOTAL',
            formatCurrency(data.summary.totalRevenue),
            formatCurrency(data.summary.totalCogs),
            formatCurrency(data.summary.totalRevenue - data.summary.totalCogs),
            formatCurrency(data.summary.totalExpenses),
            formatCurrency(data.summary.totalNetProfit),
            `${data.summary.overallMarginPct}%`
        ]);

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 32,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            styles: { fontSize: 8.5, cellPadding: 3 }
        });

        doc.save(`PnL_${groupBy}_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div className="dept-page-container">
            {/* Header Control Card */}
            <div className="dept-header-card">
                <div className="dept-header-top">
                    <div>
                        <div className="dept-badge-row">
                            <span className="dept-badge-primary">Cost Center Tracking</span>
                            <span className="dept-badge-secondary">Real Data P&amp;L</span>
                        </div>
                        <h1 className="dept-page-title">Departmental &amp; Project Profit &amp; Loss</h1>
                        <p className="dept-page-subtitle">
                            {getSubheaderDescription()}
                        </p>
                    </div>

                    <div className="dept-actions-group">
                        <div className="dept-date-range">
                            <Calendar size={15} />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span>to</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="dept-export-dropdown">
                            <button 
                                className="dept-btn-export"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                            >
                                <Download size={15} /> Export Report
                            </button>
                            {showExportMenu && (
                                <div className="dept-export-menu">
                                    <button onClick={() => { exportToExcel(); setShowExportMenu(false); }}>
                                        <FileText size={14} /> Excel Spreadsheet (.xlsx)
                                    </button>
                                    <button onClick={() => { exportToPDF(); setShowExportMenu(false); }}>
                                        <Printer size={14} /> PDF Document (.pdf)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segmented View Mode Toggle Bar */}
                <div className="dept-view-toggle-bar">
                    <span className="dept-toggle-label">Segment By:</span>
                    <div className="dept-toggle-group">
                        <button
                            type="button"
                            className={`dept-toggle-btn ${groupBy === 'operational' ? 'active' : ''}`}
                            onClick={() => setGroupBy('operational')}
                        >
                            <Building2 size={16} />
                            <span>Operational Units</span>
                            <span className="dept-toggle-pill">Sales, Bills, POS, Overheads</span>
                        </button>
                        <button
                            type="button"
                            className={`dept-toggle-btn ${groupBy === 'category' ? 'active' : ''}`}
                            onClick={() => setGroupBy('category')}
                        >
                            <Boxes size={16} />
                            <span>Product Categories</span>
                            <span className="dept-toggle-pill">Inventory Classes</span>
                        </button>
                        <button
                            type="button"
                            className={`dept-toggle-btn ${groupBy === 'warehouse' ? 'active' : ''}`}
                            onClick={() => setGroupBy('warehouse')}
                        >
                            <Warehouse size={16} />
                            <span>Warehouses &amp; Branches</span>
                            <span className="dept-toggle-pill">Locations</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            {data?.summary && (
                <div className="dept-metrics-grid">
                    <div className="dept-metric-card revenue">
                        <div className="dept-metric-label">Total Revenue</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalRevenue)}</div>
                        <div className="dept-metric-sub">Gross inflows across selected segments</div>
                    </div>

                    <div className="dept-metric-card cogs">
                        <div className="dept-metric-label">Cost of Sales (COGS)</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalCogs)}</div>
                        <div className="dept-metric-sub">Direct inventory &amp; procurement costs</div>
                    </div>

                    <div className="dept-metric-card expenses">
                        <div className="dept-metric-label">Operating Expenses</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalExpenses)}</div>
                        <div className="dept-metric-sub">Overheads &amp; administrative costs</div>
                    </div>

                    <div className="dept-metric-card net-profit">
                        <div className="dept-metric-label">Net Contribution / Profit</div>
                        <div className="dept-metric-val" style={{ color: data.summary.totalNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatCurrency(data.summary.totalNetProfit)}
                        </div>
                        <div className="dept-metric-sub">Overall Net Margin: <strong>{data.summary.overallMarginPct}%</strong></div>
                    </div>
                </div>
            )}

            {/* Department Breakdown Cards */}
            {data?.breakdown && data.breakdown.length > 0 && (
                <div className="dept-cards-grid">
                    {data.breakdown.map((dept, idx) => {
                        const isProfitable = dept.netProfit >= 0;
                        const maxRev = Math.max(...data.breakdown.map(d => d.revenue), 1);
                        const revWidth = `${Math.min(100, Math.max(0, (dept.revenue / maxRev) * 100))}%`;

                        return (
                            <div key={idx} className="dept-unit-card">
                                <div className="dept-unit-header">
                                    <div>
                                        <div className="dept-unit-name">{dept.name}</div>
                                        {dept.description && (
                                            <div className="dept-unit-desc">{dept.description}</div>
                                        )}
                                    </div>
                                    <div className="dept-unit-badges">
                                        {dept.docCount !== undefined && dept.docCount > 0 && (
                                            <span className="dept-record-count-badge">
                                                {dept.docCount} {groupBy === 'operational' ? (dept.code === 'SALES' ? 'Invoices' : dept.code === 'PURCHASE' ? 'Bills' : dept.code === 'POS' ? 'Slips' : 'Postings') : 'Items'}
                                            </span>
                                        )}
                                        <span className={`dept-margin-badge ${isProfitable ? 'positive' : 'negative'}`}>
                                            {dept.marginPct}% Margin
                                        </span>
                                    </div>
                                </div>

                                <div className="dept-unit-stats">
                                    <div className="dept-unit-stat-row">
                                        <span>Revenue:</span>
                                        <strong>{formatCurrency(dept.revenue)}</strong>
                                    </div>
                                    <div className="dept-unit-bar-wrapper">
                                        <div className="dept-unit-bar rev" style={{ width: revWidth }}></div>
                                    </div>

                                    <div className="dept-unit-stat-row">
                                        <span>Direct COGS:</span>
                                        <span>{formatCurrency(dept.cogs)}</span>
                                    </div>

                                    <div className="dept-unit-stat-row">
                                        <span>Operating Expenses:</span>
                                        <span>{formatCurrency(dept.expenses)}</span>
                                    </div>

                                    <div className="dept-unit-stat-row total">
                                        <span>Net Contribution:</span>
                                        <strong style={{ color: isProfitable ? '#0284c7' : '#ef4444' }}>
                                            {formatCurrency(dept.netProfit)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detailed Table */}
            <div className="dept-card">
                <div className="dept-card-header">
                    <h3 className="dept-card-title">Performance Summary: {getGroupHeaderTitle()}</h3>
                    <button className="dept-btn-refresh" onClick={fetchReport} title="Refresh Data">
                        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                    </button>
                </div>

                <div className="dept-table-responsive">
                    <table className="dept-table">
                        <thead>
                            <tr>
                                <th>{getGroupHeaderTitle()}</th>
                                {groupBy === 'operational' && <th>Key Activity / Source</th>}
                                <th style={{ textAlign: 'right' }}>Revenue</th>
                                <th style={{ textAlign: 'right' }}>Direct COGS</th>
                                <th style={{ textAlign: 'right' }}>Gross Profit</th>
                                <th style={{ textAlign: 'right' }}>Operating Expenses</th>
                                <th style={{ textAlign: 'right' }}>Net Profit</th>
                                <th style={{ textAlign: 'right' }}>Profit Margin</th>
                                <th style={{ textAlign: 'center' }}>Activity Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={groupBy === 'operational' ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                        Loading real {getGroupHeaderTitle().toLowerCase()} metrics...
                                    </td>
                                </tr>
                            ) : (!data?.breakdown || data.breakdown.length === 0) ? (
                                <tr>
                                    <td colSpan={groupBy === 'operational' ? 9 : 8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No financial postings recorded for this segment in the selected period.
                                    </td>
                                </tr>
                            ) : (
                                data.breakdown.map((dept, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{dept.name}</span>
                                                {dept.code && <span className="dept-code-pill">{dept.code}</span>}
                                            </div>
                                        </td>
                                        {groupBy === 'operational' && (
                                            <td style={{ color: '#64748b', fontSize: '12px' }}>
                                                {dept.description || '-'}
                                            </td>
                                        )}
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(dept.revenue)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(dept.cogs)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{formatCurrency(dept.grossProfit)}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(dept.expenses)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: dept.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(dept.netProfit)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                            <span className={`dept-pill ${dept.netProfit >= 0 ? 'pos' : 'neg'}`}>
                                                {dept.marginPct}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="dept-doc-badge">
                                                {dept.docCount || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {data?.summary && (
                            <tfoot>
                                <tr className="dept-table-total-row">
                                    <td style={{ fontWeight: 800 }}>TOTAL COMPANY</td>
                                    {groupBy === 'operational' && <td></td>}
                                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(data.summary.totalRevenue)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(data.summary.totalCogs)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                                        {formatCurrency(data.summary.totalRevenue - data.summary.totalCogs)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(data.summary.totalExpenses)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 900, color: data.summary.totalNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(data.summary.totalNetProfit)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{data.summary.overallMarginPct}%</td>
                                    <td style={{ textAlign: 'center', fontWeight: 800 }}>-</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DepartmentalReport;
