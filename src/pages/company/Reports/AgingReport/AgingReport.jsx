import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, Search, Filter, Printer, FileText, ArrowRight, CheckCircle2, DollarSign, Clock, Users, Building2, ChevronDown, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './AgingReport.css';

const AgingReport = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [reportType, setReportType] = useState('RECEIVABLE'); // 'RECEIVABLE' or 'PAYABLE'
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedParties, setExpandedParties] = useState({});
    const [showExportMenu, setShowExportMenu] = useState(false);

    const companyId = GetCompanyId();

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/reports/aging?type=${reportType}&asOfDate=${asOfDate}&companyId=${companyId}`);
            if (res.data?.success) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error('Error loading aging report:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [reportType, asOfDate]);

    const toggleExpand = (partyId) => {
        setExpandedParties(prev => ({ ...prev, [partyId]: !prev[partyId] }));
    };

    const expandAll = () => {
        if (!data?.parties) return;
        const all = {};
        data.parties.forEach(p => { all[p.partyId] = true; });
        setExpandedParties(all);
    };

    const collapseAll = () => {
        setExpandedParties({});
    };

    const filteredParties = (data?.parties || []).filter(p => 
        p.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        if (!data) return;
        const rows = [];
        const title = reportType === 'RECEIVABLE' ? 'Aged Accounts Receivable (Debtors)' : 'Aged Accounts Payable (Creditors)';
        
        rows.push([`TAB ACCOUNTS - ${title}`]);
        rows.push([`As of Date: ${asOfDate}`, `Generated On: ${new Date().toLocaleString()}`]);
        rows.push([]);
        
        // Header
        rows.push([
            reportType === 'RECEIVABLE' ? 'Customer Name' : 'Supplier Name',
            'Contact',
            'Current (< 0 Days)',
            '1 - 30 Days',
            '31 - 60 Days',
            '61 - 90 Days',
            '90+ Days',
            'Total Outstanding'
        ]);

        filteredParties.forEach(p => {
            rows.push([
                p.partyName,
                p.phone !== '-' ? p.phone : p.email,
                p.current,
                p.days1to30,
                p.days31to60,
                p.days61to90,
                p.days90plus,
                p.totalBalance
            ]);

            if (expandedParties[p.partyId] && p.items?.length > 0) {
                p.items.forEach(item => {
                    rows.push([
                        `  ↳ ${item.number} (${new Date(item.date).toLocaleDateString()} / Due: ${new Date(item.dueDate).toLocaleDateString()})`,
                        `Days Overdue: ${item.daysOverdue}`,
                        item.daysOverdue <= 0 ? item.balanceAmount : 0,
                        item.daysOverdue > 0 && item.daysOverdue <= 30 ? item.balanceAmount : 0,
                        item.daysOverdue > 30 && item.daysOverdue <= 60 ? item.balanceAmount : 0,
                        item.daysOverdue > 60 && item.daysOverdue <= 90 ? item.balanceAmount : 0,
                        item.daysOverdue > 90 ? item.balanceAmount : 0,
                        item.balanceAmount
                    ]);
                });
            }
        });

        rows.push([]);
        rows.push([
            'TOTAL SUMMARY',
            '',
            data.summary.totalCurrent,
            data.summary.total1to30,
            data.summary.total31to60,
            data.summary.total61to90,
            data.summary.total90plus,
            data.summary.totalOutstanding
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Aging Summary');
        XLSX.writeFile(wb, `Aging_Report_${reportType}_${asOfDate}.xlsx`);
    };

    const exportToPDF = () => {
        if (!data) return;
        const doc = new jsPDF('l', 'mm', 'a4');
        const title = reportType === 'RECEIVABLE' ? 'Aged Accounts Receivable (Debtors Aging Report)' : 'Aged Accounts Payable (Creditors Aging Report)';

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TAB ACCOUNTS', 14, 15);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 22);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`As of Date: ${asOfDate} | Total Outstanding: ${formatCurrency(data.summary.totalOutstanding)}`, 14, 28);

        const tableHead = [[
            reportType === 'RECEIVABLE' ? 'Customer' : 'Supplier',
            'Current',
            '1 - 30 Days',
            '31 - 60 Days',
            '61 - 90 Days',
            '90+ Days',
            'Total'
        ]];

        const tableBody = filteredParties.map(p => [
            p.partyName,
            formatCurrency(p.current),
            formatCurrency(p.days1to30),
            formatCurrency(p.days31to60),
            formatCurrency(p.days61to90),
            formatCurrency(p.days90plus),
            formatCurrency(p.totalBalance)
        ]);

        // Append total summary row
        tableBody.push([
            'TOTAL',
            formatCurrency(data.summary.totalCurrent),
            formatCurrency(data.summary.total1to30),
            formatCurrency(data.summary.total31to60),
            formatCurrency(data.summary.total61to90),
            formatCurrency(data.summary.total90plus),
            formatCurrency(data.summary.totalOutstanding)
        ]);

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 32,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold' },
            styles: { fontSize: 8.5, cellPadding: 3 }
        });

        doc.save(`Aging_Report_${reportType}_${asOfDate}.pdf`);
    };

    return (
        <div className="aging-page-container">
            {/* Header / Filter Toolbar */}
            <div className="aging-header-card">
                <div className="aging-header-top">
                    <div>
                        <div className="aging-badge-row">
                            <span className="aging-badge-primary">Enterprise Reporting</span>
                            <span className="aging-badge-secondary">{reportType === 'RECEIVABLE' ? 'Aged Debts (AR)' : 'Aged Payables (AP)'}</span>
                        </div>
                        <h1 className="aging-page-title">
                            {reportType === 'RECEIVABLE' ? 'Aged Accounts Receivable' : 'Aged Accounts Payable'}
                        </h1>
                        <p className="aging-page-subtitle">
                            Analyze outstanding balances bucketed into aging intervals (Current, 30, 60, 90, 90+ days past due)
                        </p>
                    </div>

                    <div className="aging-actions-group">
                        <div className="aging-type-toggle">
                            <button 
                                className={`aging-toggle-btn ${reportType === 'RECEIVABLE' ? 'active' : ''}`}
                                onClick={() => setReportType('RECEIVABLE')}
                            >
                                <Users size={15} /> Receivables (Customers)
                            </button>
                            <button 
                                className={`aging-toggle-btn ${reportType === 'PAYABLE' ? 'active' : ''}`}
                                onClick={() => setReportType('PAYABLE')}
                            >
                                <Building2 size={15} /> Payables (Suppliers)
                            </button>
                        </div>

                        <div className="aging-date-picker">
                            <Calendar size={15} />
                            <span>As of:</span>
                            <input 
                                type="date" 
                                value={asOfDate} 
                                onChange={(e) => setAsOfDate(e.target.value)}
                            />
                        </div>

                        <div className="aging-export-dropdown">
                            <button 
                                className="aging-btn-export"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                            >
                                <Download size={15} /> Export Report
                            </button>
                            {showExportMenu && (
                                <div className="aging-export-menu">
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

            {/* Aging Summary Metrics Cards */}
            {data && (
                <div className="aging-metrics-grid">
                    <div className="aging-metric-card total">
                        <div className="aging-metric-label">Total Outstanding</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.totalOutstanding || 0)}</div>
                        <div className="aging-metric-sub">{data.summary?.partyCount || 0} active accounts with open balances</div>
                    </div>

                    <div className="aging-metric-card current">
                        <div className="aging-metric-label">Current (&lt; 0 Days)</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.totalCurrent || 0)}</div>
                        <div className="aging-metric-sub">Not yet past due</div>
                    </div>

                    <div className="aging-metric-card bucket-30">
                        <div className="aging-metric-label">1 - 30 Days</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.total1to30 || 0)}</div>
                        <div className="aging-metric-sub">Slightly overdue</div>
                    </div>

                    <div className="aging-metric-card bucket-60">
                        <div className="aging-metric-label">31 - 60 Days</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.total31to60 || 0)}</div>
                        <div className="aging-metric-sub">Moderate collection priority</div>
                    </div>

                    <div className="aging-metric-card bucket-90">
                        <div className="aging-metric-label">61 - 90 Days</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.total61to90 || 0)}</div>
                        <div className="aging-metric-sub">High collection priority</div>
                    </div>

                    <div className="aging-metric-card bucket-plus">
                        <div className="aging-metric-label">90+ Days Past Due</div>
                        <div className="aging-metric-val">{formatCurrency(data.summary?.total90plus || 0)}</div>
                        <div className="aging-metric-sub">Critical / Bad debt risk</div>
                    </div>
                </div>
            )}

            {/* Table Card */}
            <div className="aging-card">
                <div className="aging-table-toolbar">
                    <div className="aging-search-box">
                        <Search size={16} />
                        <input 
                            type="text" 
                            placeholder={`Search ${reportType === 'RECEIVABLE' ? 'customers' : 'suppliers'} by name, email, phone...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="aging-toolbar-btns">
                        <button className="aging-btn-link" onClick={expandAll}>Expand All</button>
                        <span className="aging-btn-divider">|</span>
                        <button className="aging-btn-link" onClick={collapseAll}>Collapse All</button>
                        <button className="aging-btn-refresh" onClick={fetchReport} title="Refresh Data">
                            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                        </button>
                    </div>
                </div>

                <div className="aging-table-responsive">
                    <table className="aging-table">
                        <thead>
                            <tr>
                                <th style={{ width: '32px' }}></th>
                                <th>{reportType === 'RECEIVABLE' ? 'Customer' : 'Supplier'}</th>
                                <th>Contact / Terms</th>
                                <th style={{ textAlign: 'right' }}>Current</th>
                                <th style={{ textAlign: 'right' }}>1 - 30 Days</th>
                                <th style={{ textAlign: 'right' }}>31 - 60 Days</th>
                                <th style={{ textAlign: 'right' }}>61 - 90 Days</th>
                                <th style={{ textAlign: 'right' }}>90+ Days</th>
                                <th style={{ textAlign: 'right' }}>Total Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                                        Computing aging schedules...
                                    </td>
                                </tr>
                            ) : filteredParties.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No outstanding {reportType === 'RECEIVABLE' ? 'receivables' : 'payables'} found as of {asOfDate}.
                                    </td>
                                </tr>
                            ) : (
                                filteredParties.map(p => {
                                    const isExpanded = expandedParties[p.partyId];
                                    return (
                                        <React.Fragment key={p.partyId}>
                                            <tr className={`aging-party-row ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleExpand(p.partyId)}>
                                                <td style={{ textAlign: 'center', cursor: 'pointer' }}>
                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </td>
                                                <td>
                                                    <div className="aging-party-name">{p.partyName}</div>
                                                    <div className="aging-party-count">{p.items?.length || 0} open document(s)</div>
                                                </td>
                                                <td>
                                                    <div className="aging-party-contact">{p.phone !== '-' ? p.phone : p.email}</div>
                                                    <div className="aging-party-terms">Credit: {p.creditPeriod || 0} Days</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{p.current > 0 ? formatCurrency(p.current) : '-'}</td>
                                                <td style={{ textAlign: 'right', color: p.days1to30 > 0 ? '#d97706' : 'inherit' }}>
                                                    {p.days1to30 > 0 ? formatCurrency(p.days1to30) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', color: p.days31to60 > 0 ? '#ea580c' : 'inherit' }}>
                                                    {p.days31to60 > 0 ? formatCurrency(p.days31to60) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', color: p.days61to90 > 0 ? '#dc2626' : 'inherit' }}>
                                                    {p.days61to90 > 0 ? formatCurrency(p.days61to90) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: p.days90plus > 0 ? '#b91c1c' : 'inherit' }}>
                                                    {p.days90plus > 0 ? formatCurrency(p.days90plus) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                                    {formatCurrency(p.totalBalance)}
                                                </td>
                                            </tr>

                                            {/* Expandable Document Breakdown */}
                                            {isExpanded && p.items?.map(item => (
                                                <tr key={item.id} className="aging-sub-row">
                                                    <td></td>
                                                    <td colSpan="2" style={{ paddingLeft: '24px' }}>
                                                        <span className="aging-sub-doc">{item.number}</span>
                                                        <span className="aging-sub-meta">
                                                            Date: {new Date(item.date).toLocaleDateString()} | Due: {new Date(item.dueDate).toLocaleDateString()} | Overdue: {item.daysOverdue > 0 ? `${item.daysOverdue} days` : 'Not overdue'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                        {item.daysOverdue <= 0 ? formatCurrency(item.balanceAmount) : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                        {item.daysOverdue > 0 && item.daysOverdue <= 30 ? formatCurrency(item.balanceAmount) : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                        {item.daysOverdue > 30 && item.daysOverdue <= 60 ? formatCurrency(item.balanceAmount) : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                        {item.daysOverdue > 60 && item.daysOverdue <= 90 ? formatCurrency(item.balanceAmount) : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                                                        {item.daysOverdue > 90 ? formatCurrency(item.balanceAmount) : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {formatCurrency(item.balanceAmount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                        {data?.summary && (
                            <tfoot>
                                <tr className="aging-table-total-row">
                                    <td colSpan="3" style={{ fontWeight: 800 }}>TOTAL ({data.summary.partyCount} Accounts)</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.summary.totalCurrent)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.summary.total1to30)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.summary.total31to60)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.summary.total61to90)}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.summary.total90plus)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>{formatCurrency(data.summary.totalOutstanding)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgingReport;
