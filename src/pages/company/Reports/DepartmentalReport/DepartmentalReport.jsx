import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, Search, Filter, Printer, FileText, ArrowRight, CheckCircle2, DollarSign, TrendingUp, Layers, PieChart, BarChart2, RefreshCw } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const companyId = GetCompanyId();

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/reports/departmental-pnl?startDate=${startDate}&endDate=${endDate}&companyId=${companyId}`);
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
    }, [startDate, endDate]);

    const exportToExcel = () => {
        if (!data) return;
        const rows = [];
        rows.push(['TAB ACCOUNTS - Departmental & Project Profit & Loss']);
        rows.push([`Period: ${startDate} to ${endDate}`, `Generated: ${new Date().toLocaleString()}`]);
        rows.push([]);

        rows.push(['Department / Cost Center', 'Revenue', 'Cost of Goods Sold', 'Gross Profit', 'Operating Expenses', 'Net Profit', 'Profit Margin %']);

        (data.breakdown || []).forEach(d => {
            rows.push([
                d.name,
                d.revenue,
                d.cogs,
                d.grossProfit,
                d.expenses,
                d.netProfit,
                `${d.marginPct}%`
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
            `${data.summary.overallMarginPct}%`
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Departmental PnL');
        XLSX.writeFile(wb, `Departmental_PnL_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        if (!data) return;
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TAB ACCOUNTS', 14, 15);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Departmental & Project Profit & Loss Statement', 14, 22);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Period: ${startDate} to ${endDate} | Net Profit: ${formatCurrency(data.summary.totalNetProfit)}`, 14, 28);

        const tableHead = [['Department', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit', 'Margin']];
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

        doc.save(`Departmental_PnL_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div className="dept-page-container">
            {/* Header Control Card */}
            <div className="dept-header-card">
                <div className="dept-header-top">
                    <div>
                        <div className="dept-badge-row">
                            <span className="dept-badge-primary">Cost Center Tracking</span>
                            <span className="dept-badge-secondary">Departmental P&L</span>
                        </div>
                        <h1 className="dept-page-title">Departmental &amp; Project Profit &amp; Loss</h1>
                        <p className="dept-page-subtitle">
                            Analyze revenue, operating costs, and profit margins segmented across business units &amp; project classes
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
            </div>

            {/* KPI Summary Cards */}
            {data?.summary && (
                <div className="dept-metrics-grid">
                    <div className="dept-metric-card revenue">
                        <div className="dept-metric-label">Total Revenue</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalRevenue)}</div>
                        <div className="dept-metric-sub">Across all business units</div>
                    </div>

                    <div className="dept-metric-card cogs">
                        <div className="dept-metric-label">Cost of Sales (COGS)</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalCogs)}</div>
                        <div className="dept-metric-sub">Direct project/product costs</div>
                    </div>

                    <div className="dept-metric-card expenses">
                        <div className="dept-metric-label">Operating Expenses</div>
                        <div className="dept-metric-val">{formatCurrency(data.summary.totalExpenses)}</div>
                        <div className="dept-metric-sub">Overheads &amp; administrative costs</div>
                    </div>

                    <div className="dept-metric-card net-profit">
                        <div className="dept-metric-label">Net Operating Profit</div>
                        <div className="dept-metric-val" style={{ color: data.summary.totalNetProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatCurrency(data.summary.totalNetProfit)}
                        </div>
                        <div className="dept-metric-sub">Overall Net Margin: <strong>{data.summary.overallMarginPct}%</strong></div>
                    </div>
                </div>
            )}

            {/* Department Breakdown Cards */}
            {data?.breakdown && (
                <div className="dept-cards-grid">
                    {data.breakdown.map((dept, idx) => {
                        const isProfitable = dept.netProfit >= 0;
                        const maxRev = Math.max(...data.breakdown.map(d => d.revenue), 1);
                        const revWidth = `${Math.min(100, (dept.revenue / maxRev) * 100)}%`;

                        return (
                            <div key={idx} className="dept-unit-card">
                                <div className="dept-unit-header">
                                    <div className="dept-unit-name">{dept.name}</div>
                                    <span className={`dept-margin-badge ${isProfitable ? 'positive' : 'negative'}`}>
                                        {dept.marginPct}% Margin
                                    </span>
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
                                        <span>COGS &amp; Expenses:</span>
                                        <span>{formatCurrency(dept.cogs + dept.expenses)}</span>
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
                    <h3 className="dept-card-title">Departmental Performance Summary</h3>
                    <button className="dept-btn-refresh" onClick={fetchReport} title="Refresh Data">
                        <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                    </button>
                </div>

                <div className="dept-table-responsive">
                    <table className="dept-table">
                        <thead>
                            <tr>
                                <th>Department / Cost Center</th>
                                <th style={{ textAlign: 'right' }}>Revenue</th>
                                <th style={{ textAlign: 'right' }}>Direct COGS</th>
                                <th style={{ textAlign: 'right' }}>Gross Profit</th>
                                <th style={{ textAlign: 'right' }}>Operating Expenses</th>
                                <th style={{ textAlign: 'right' }}>Net Profit</th>
                                <th style={{ textAlign: 'right' }}>Profit Margin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                                        Loading departmental P&amp;L metrics...
                                    </td>
                                </tr>
                            ) : (!data?.breakdown || data.breakdown.length === 0) ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No financial postings recorded for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                data.breakdown.map((dept, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{dept.name}</td>
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {data?.summary && (
                            <tfoot>
                                <tr className="dept-table-total-row">
                                    <td style={{ fontWeight: 800 }}>TOTAL COMPANY</td>
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
