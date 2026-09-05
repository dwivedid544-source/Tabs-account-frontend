import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, Download, Calendar,
    DollarSign, CheckCircle2, XCircle, AlertCircle,
    User, Package, FileText
} from 'lucide-react';
import './SalesReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SalesReport = () => {
    const navigate = useNavigate();
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [reportType, setReportType] = useState('general'); // 'general', 'item', 'customer'
    const [transactionFilter, setTransactionFilter] = useState('ALL'); // 'ALL', 'SALES', 'RETURNS'
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryStats, setSummaryStats] = useState({
        totalSales: 0,
        totalReturns: 0,
        netRevenue: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        overdue: 0
    });

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');

    const handleApplyFilters = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
    };

    const handleResetFilters = () => {
        setTempStartDate('');
        setTempEndDate('');
        setStartDate('');
        setEndDate('');
        setTransactionFilter('ALL');
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, reportType, transactionFilter]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            let endpoint = '/reports/sales';
            if (reportType === 'item') endpoint = '/reports/sales-by-item';
            if (reportType === 'customer') endpoint = '/reports/sales-by-customer';

            const response = await axiosInstance.get(endpoint, {
                params: { companyId, startDate, endDate, transactionFilter }
            });

            if (response.data.success) {
                const data = response.data.data;
                
                if (reportType === 'general') {
                    setSummaryStats(response.data.summary || { totalSales: 0, totalReturns: 0, netRevenue: 0, totalAmount: 0, totalPaid: 0, totalUnpaid: 0, overdue: 0 });
                    // Flatten for table
                    const flattened = data.flatMap(inv => {
                        const items = (inv.invoiceitem && inv.invoiceitem.length > 0)
                            ? inv.invoiceitem
                            : [{ id: inv.id, product: null, description: inv.isReturn ? 'Sales Return' : 'Invoice', quantity: 1, amount: inv.totalAmount }];
                        
                        return items.map(item => ({
                            id: item.id || inv.id,
                            invoiceId: inv.isReturn ? (inv.invoiceId || null) : inv.id,
                            salesReturnId: inv.isReturn ? (inv.salesReturnId || inv.id) : null,
                            invoiceNumber: inv.invoiceNumber,
                            date: new Date(inv.date).toLocaleDateString(),
                            customerName: inv.customer?.name || 'Walk-in',
                            productName: item.product?.name || item.description || (inv.isReturn ? 'Sales Return' : 'Unknown'),
                            qty: item.quantity,
                            amount: item.amount,
                            status: inv.isReturn ? 'RETURNED' : (inv.status || 'PAID'),
                            isReturn: Boolean(inv.isReturn),
                            isPosReturn: Boolean(inv.isPosReturn || inv.type === 'POS_RETURN'),
                            source: inv.source,
                            type: inv.type || (inv.isReturn ? (inv.isPosReturn ? 'POS_RETURN' : 'RETURN') : 'SALE')
                        }));
                    });
                    setReportData(flattened);
                } else {
                    setReportData(data);
                }
            }
        } catch (error) {
            console.error("Error fetching sales report:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvoiceClick = (row) => {
        if (row.isReturn && !row.invoiceId && row.salesReturnId) {
            navigate('/company/sales/sales-return');
            return;
        }
        if (row.invoiceId) {
            const isPos = row.isPosReturn || row.type === 'POS_RETURN' || row.source === 'POS' || row.type === 'POS_SALE' || row.type === 'POS_INVOICE';
            navigate('/company/sales/invoice', {
                state: {
                    targetInvoiceId: parseInt(row.invoiceId),
                    type: isPos ? 'POS_INVOICE' : 'TAX_INVOICE'
                }
            });
        }
    };

    const handleRowDoubleClick = (row) => {
        handleInvoiceClick(row);
    };

    const filteredData = reportData.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        
        if (transactionFilter === 'SALES' && item.isReturn) return false;
        if (transactionFilter === 'RETURNS' && !item.isReturn) return false;

        if (reportType === 'general') {
            return (
                item.invoiceNumber?.toLowerCase().includes(searchLower) ||
                item.customerName?.toLowerCase().includes(searchLower) ||
                item.productName?.toLowerCase().includes(searchLower) ||
                item.status?.toLowerCase().includes(searchLower)
            );
        } else if (reportType === 'item') {
            return item.productName?.toLowerCase().includes(searchLower) || item.sku?.toLowerCase().includes(searchLower);
        } else {
            return item.customerName?.toLowerCase().includes(searchLower);
        }
    });

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `Sales_${reportType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text(`Sales Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, 20);
        
        let headers = [];
        let body = [];

        if (reportType === 'general') {
            headers = [["Inv / Return #", "Type", "Date", "Customer", "Product", "Qty", "Amount", "Status"]];
            body = filteredData.map(r => [r.invoiceNumber, r.type, r.date, r.customerName, r.productName, r.qty, formatCurrency(r.amount), r.status]);
        } else if (reportType === 'item') {
            headers = [["Product", "SKU", "Category", "Total Qty", "Total Sales", "Avg Rate", "Invoices"]];
            body = filteredData.map(r => [r.productName, r.sku, r.category, r.totalQty, formatCurrency(r.totalAmount), formatCurrency(r.avgRate), r.invoiceCount]);
        } else {
            headers = [["Customer Name", "Invoices", "Total Sales", "Paid", "Pending"]];
            body = filteredData.map(r => [r.customerName, r.totalInvoices, formatCurrency(r.totalSales), formatCurrency(r.totalPaid), formatCurrency(r.totalPending)]);
        }

        autoTable(doc, {
            head: headers,
            body: body,
            startY: 30,
            theme: 'grid'
        });
        doc.save(`Sales_${reportType}_Report.pdf`);
    };

    return (
        <div className="sales-report-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sales Analytics</h1>
                    <p className="page-subtitle">Track revenue, sales, and sales returns performance</p>
                </div>
                
                <div className="header-actions">
                    <div className="report-filters-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div className="date-input-wrapper">
                            <span className="date-label">Type</span>
                            <select
                                value={transactionFilter}
                                onChange={(e) => setTransactionFilter(e.target.value)}
                                className="date-input"
                                style={{ fontWeight: '600', cursor: 'pointer' }}
                            >
                                <option value="ALL">All (Sales & Returns)</option>
                                <option value="SALES">All Sales (Invoice & POS)</option>
                                <option value="INVOICE">Invoice Sales Only</option>
                                <option value="POS">POS Sales Only</option>
                                <option value="RETURNS">Returns Only</option>
                            </select>
                        </div>
                        <div className="date-input-wrapper">
                            <span className="date-label">From</span>
                            <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} className="date-input" />
                        </div>
                        <span className="date-separator">to</span>
                        <div className="date-input-wrapper">
                            <span className="date-label">To</span>
                            <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} className="date-input" />
                        </div>
                        <button onClick={handleApplyFilters} className="btn-export" style={{ background: '#1e293b', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', transition: 'all 0.2s', height: '38px', display: 'flex', alignItems: 'center' }}>
                            Apply
                        </button>
                        <button onClick={handleResetFilters} style={{ background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontWeight: '500', transition: 'all 0.2s', height: '38px', display: 'flex', alignItems: 'center' }}>
                            Reset
                        </button>
                    </div>
                    
                    <div className="export-dropdown-wrapper">
                        <button className="btn-export" onClick={() => setShowExportOptions(!showExportOptions)}>
                            <Download size={16} /> Export
                        </button>
                        {showExportOptions && (
                            <div className="export-menu">
                                <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>Excel (.xlsx)</button>
                                <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>PDF (.pdf)</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="report-tabs">
                <button 
                    className={`tab-btn ${reportType === 'general' ? 'active' : ''}`}
                    onClick={() => setReportType('general')}
                >
                    <FileText size={18} /> Detailed Sales & Returns
                </button>
                <button 
                    className={`tab-btn ${reportType === 'item' ? 'active' : ''}`}
                    onClick={() => setReportType('item')}
                >
                    <Package size={18} /> Sales by Item
                </button>
                <button 
                    className={`tab-btn ${reportType === 'customer' ? 'active' : ''}`}
                    onClick={() => setReportType('customer')}
                >
                    <User size={18} /> Sales by Customer
                </button>
            </div>

            {reportType === 'general' && (
                <div className="summary-grid">
                    <div className="summary-card card-blue">
                        <div className="card-content">
                            <span className="card-label">Gross Sales</span>
                            <h3 className="card-value">{formatCurrency(summaryStats.totalSales || summaryStats.totalAmount)}</h3>
                        </div>
                        <div className="card-icon icon-blue"><DollarSign size={24} /></div>
                    </div>
                    <div className="summary-card card-red">
                        <div className="card-content">
                            <span className="card-label">Total Returns</span>
                            <h3 className="card-value" style={{ color: '#ef4444' }}>{formatCurrency(summaryStats.totalReturns || 0)}</h3>
                        </div>
                        <div className="card-icon icon-red"><XCircle size={24} /></div>
                    </div>
                    <div className="summary-card card-green">
                        <div className="card-content">
                            <span className="card-label">Net Revenue</span>
                            <h3 className="card-value">{formatCurrency(summaryStats.netRevenue ?? (summaryStats.totalSales - (summaryStats.totalReturns || 0)))}</h3>
                        </div>
                        <div className="card-icon icon-green"><CheckCircle2 size={24} /></div>
                    </div>
                </div>
            )}

            <div className="report-table-card">
                <div className="table-controls">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder={`Search ${reportType} report...`} 
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="loader-container">Loading Report...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="empty-state">No records found for the selected period.</div>
                    ) : (
                        <table className="report-table">
                            <thead>
                                {reportType === 'general' && (
                                    <tr>
                                        <th>Inv / Return #</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Customer</th>
                                        <th>Product</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-right">Amount</th>
                                        <th>Status</th>
                                    </tr>
                                )}
                                {reportType === 'item' && (
                                    <tr>
                                        <th>Product Name</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th className="text-center">Total Qty</th>
                                        <th className="text-right">Total Sales</th>
                                        <th className="text-right">Avg Rate</th>
                                        <th className="text-center">Invoices</th>
                                    </tr>
                                )}
                                {reportType === 'customer' && (
                                    <tr>
                                        <th>Customer Name</th>
                                        <th className="text-center">Total Invoices</th>
                                        <th className="text-right">Total Sales</th>
                                        <th className="text-right">Paid</th>
                                        <th className="text-right">Pending</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {filteredData.map((row, idx) => (
                                    <tr 
                                        key={idx}
                                        onDoubleClick={() => handleRowDoubleClick(row)}
                                        title={row.invoiceId ? "Double-click to view invoice details" : ""}
                                        style={{ cursor: row.invoiceId ? 'pointer' : 'default' }}
                                    >
                                        {reportType === 'general' && (
                                            <>
                                                <td className="font-mono">
                                                    {(row.invoiceId || (row.isReturn && row.salesReturnId)) ? (
                                                        <span 
                                                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleInvoiceClick(row);
                                                            }}
                                                            title="Click to view details"
                                                        >
                                                            {row.invoiceNumber}
                                                        </span>
                                                    ) : (
                                                        row.invoiceNumber
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        background: (row.isPosReturn || row.type === 'POS_RETURN') ? '#fae8ff' : (row.isReturn ? '#fee2e2' : (row.source === 'POS' || row.type === 'POS_SALE' ? '#f3e8ff' : '#e0f2fe')),
                                                        color: (row.isPosReturn || row.type === 'POS_RETURN') ? '#86198f' : (row.isReturn ? '#991b1b' : (row.source === 'POS' || row.type === 'POS_SALE' ? '#6b21a8' : '#075985')),
                                                        border: (row.isPosReturn || row.type === 'POS_RETURN') ? '1px solid #f5d0fe' : 'none'
                                                    }}>
                                                        {(row.isPosReturn || row.type === 'POS_RETURN') ? 'POS Return' : (row.isReturn ? 'Sales Return' : (row.source === 'POS' || row.type === 'POS_SALE' ? 'POS Sale' : 'Invoice'))}
                                                    </span>
                                                </td>
                                                <td>{row.date}</td>
                                                <td className="font-medium">{row.customerName}</td>
                                                <td>{row.productName}</td>
                                                <td className="text-center">{row.qty}</td>
                                                <td className="text-right font-bold" style={{ color: row.isReturn ? '#dc2626' : 'inherit' }}>
                                                    {row.isReturn ? `-${formatCurrency(row.amount)}` : formatCurrency(row.amount)}
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${row.isReturn ? 'returned' : (row.status || 'unknown').toLowerCase()}`}>
                                                        {row.isReturn ? 'Returned' : (row.status || 'Paid')}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {reportType === 'item' && (
                                            <>
                                                <td className="font-medium">{row.productName}</td>
                                                <td className="font-mono">{row.sku}</td>
                                                <td><span className="category-badge">{row.category}</span></td>
                                                <td className="text-center">{row.totalQty}</td>
                                                <td className="text-right font-bold">{formatCurrency(row.totalAmount)}</td>
                                                <td className="text-right">{formatCurrency(row.avgRate)}</td>
                                                <td className="text-center">{row.invoiceCount}</td>
                                            </>
                                        )}
                                        {reportType === 'customer' && (
                                            <>
                                                <td className="font-medium">{row.customerName}</td>
                                                <td className="text-center">{row.totalInvoices}</td>
                                                <td className="text-right font-bold">{formatCurrency(row.totalSales)}</td>
                                                <td className="text-right text-green-600">{formatCurrency(row.totalPaid)}</td>
                                                <td className="text-right text-red-600">{formatCurrency(row.totalPending)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesReport;
