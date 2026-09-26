import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Download, Receipt, CreditCard,
    Clock, CheckCircle2, X
} from 'lucide-react';
import './POSReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const POSReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [transactionFilter, setTransactionFilter] = useState('ALL'); // 'ALL', 'SALES', 'RETURNS'
    const [activeCardFilter, setActiveCardFilter] = useState(null); // 'GROSS_POS_SALES', 'OVERDUE', 'NET_POS_SALES', null
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [summaryStats, setSummaryStats] = useState({
        totalSales: 0,
        totalReturns: 0,
        netSales: 0,
        overdue: 0,
        overdueCount: 0,
        totalCash: 0,
        totalCard: 0,
        totalUPI: 0,
        totalOther: 0
    });

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [startDate, endDate, transactionFilter]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const response = await axiosInstance.get(`/reports/pos`, {
                    params: { companyId, startDate, endDate, transactionFilter }
                });
                if (response.data.success) {
                    const sortedData = processReportData(response.data.data, response.data.overdueInvoices || []);
                    setReportData(sortedData);
                    setSummaryStats(response.data.summary || {});
                }
            }
        } catch (error) {
            console.error("Error fetching POS report:", error);
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (data, overdueList = []) => {
        const overduePosIds = new Set(overdueList.map(o => String(o.id || o.invoiceId || o.invoiceNumber)));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (data || []).map(invoice => {
            const isRet = Boolean(invoice.isReturn);
            const items = invoice.posinvoiceitem || invoice.salesreturnitem || [];

            // Extract all line item product names
            const productNames = items
                .map(it => it.product?.name || it.description)
                .filter(Boolean);

            let displayProductName = isRet ? 'POS Return' : 'POS Invoice';
            if (items.length === 1) {
                displayProductName = productNames[0] || (isRet ? 'POS Return' : 'Product');
            } else if (items.length > 1) {
                displayProductName = `Multiple Items (${items.length})`;
            }

            const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);
            const rawTotal = parseFloat(invoice.totalAmount || invoice.total || 0);
            const rawBal = parseFloat(invoice.balanceAmount !== undefined && invoice.balanceAmount !== null
                ? invoice.balanceAmount
                : Math.max(0, rawTotal - parseFloat(invoice.paidAmount || 0)));
            const bal = Math.max(0, Math.min(rawBal, rawTotal));
            const rawPaid = Math.max(0, rawTotal - bal);

            const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : (invoice.date ? new Date(invoice.date) : (invoice.createdAt ? new Date(invoice.createdAt) : null));
            let isPastDue = false;
            if (dueDate && !isNaN(dueDate.getTime())) {
                const d = new Date(dueDate);
                d.setHours(0, 0, 0, 0);
                isPastDue = today.getTime() > d.getTime();
            }

            const isInvOverdue = !isRet && (
                overduePosIds.has(String(invoice.id)) ||
                overduePosIds.has(String(invoice.invoiceNumber)) ||
                String(invoice.status).toUpperCase() === 'OVERDUE' ||
                Boolean(invoice.isOverdue) ||
                (isPastDue && bal > 0.01 && String(invoice.status).toUpperCase() !== 'PAID' && String(invoice.status).toUpperCase() !== 'CANCELLED')
            );

            let authoritativeStatus = invoice.status;
            if (isRet) {
                authoritativeStatus = 'RETURNED';
            } else if (isInvOverdue) {
                authoritativeStatus = 'OVERDUE';
            } else if (bal <= 0.01) {
                authoritativeStatus = 'PAID';
            } else if (rawPaid > 0.01 && bal > 0.01) {
                authoritativeStatus = 'PARTIALLY PAID';
            } else {
                authoritativeStatus = invoice.status || 'UNPAID';
            }

            return {
                id: invoice.id,
                invoiceId: invoice.id,
                invoiceNo: invoice.invoiceNumber,
                date: invoice.createdAt || invoice.date,
                rawDate: invoice.date || invoice.createdAt,
                dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : (invoice.date ? new Date(invoice.date).toLocaleDateString() : '-'),
                productName: displayProductName,
                productNames: productNames,
                items: items,
                qty: totalQty > 0 ? totalQty : (items.length > 0 ? items.length : '-'),
                customerName: invoice.customer?.name || 'Walk-in',
                customerNameArabic: invoice.customer?.nameArabic || '',
                paymentType: invoice.paymentMode || 'CASH',
                amount: rawTotal,
                tax: invoice.taxAmount || 0,
                total: rawTotal,
                totalAmount: rawTotal,
                paidAmount: rawPaid,
                balanceAmount: bal,
                isOverdue: isInvOverdue,
                status: authoritativeStatus,
                isReturn: isRet,
                type: invoice.type || (isRet ? 'RETURN' : 'SALE'),
                time: new Date(invoice.createdAt || invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        });
    };

    const overdueRecords = useMemo(() => {
        return reportData.filter(item => item.isOverdue || String(item.status).toUpperCase() === 'OVERDUE');
    }, [reportData]);
    const overdueRecordsCount = overdueRecords.length;

    const paidRecords = useMemo(() => {
        return reportData.filter(item => !item.isReturn && (
            String(item.status).toUpperCase() === 'PAID' ||
            String(item.status).toUpperCase() === 'FULLY_PAID' ||
            (item.balanceAmount !== undefined && parseFloat(item.balanceAmount) <= 0.01 && !item.isOverdue)
        ));
    }, [reportData]);
    const paidRecordsCount = paidRecords.length;

    const salesRecords = useMemo(() => {
        return reportData.filter(item => !item.isReturn);
    }, [reportData]);
    const salesRecordsCount = salesRecords.length;

    const calculatedGrossSales = useMemo(() => {
        const sum = salesRecords.reduce((s, it) => s + (parseFloat(it.totalAmount || it.amount || it.total) || 0), 0);
        return sum > 0 ? sum : (summaryStats.totalSales || 0);
    }, [salesRecords, summaryStats.totalSales]);

    const calculatedPaidSales = useMemo(() => {
        const sum = paidRecords.reduce((s, it) => s + (parseFloat(it.paidAmount || it.totalAmount || it.total) || 0), 0);
        return sum > 0 ? sum : (summaryStats.netSales || 0);
    }, [paidRecords, summaryStats.netSales]);

    const calculatedOverdueAmount = useMemo(() => {
        const sum = overdueRecords.reduce((s, it) => s + (parseFloat(it.balanceAmount) || 0), 0);
        return sum > 0 ? sum : (summaryStats.overdue || 0);
    }, [overdueRecords, summaryStats.overdue]);

    const filteredReportData = reportData.filter(row => {
        const searchLower = searchTerm.toLowerCase();

        // Card Filter: overrides dropdown transactionFilter for intuitive one-click UX
        if (activeCardFilter === 'OVERDUE') {
            const isItemOverdue = Boolean(row.isOverdue || String(row.status).toUpperCase() === 'OVERDUE');
            if (!isItemOverdue) return false;
        } else if (activeCardFilter === 'GROSS_POS_SALES') {
            // Filter to All POS Sales (excluding returns)
            if (row.isReturn) return false;
        } else if (activeCardFilter === 'NET_POS_SALES') {
            // Filter to Paid / Settled POS Sales
            const isPaid = !row.isReturn && (
                String(row.status).toUpperCase() === 'PAID' ||
                String(row.status).toUpperCase() === 'FULLY_PAID' ||
                (row.balanceAmount !== undefined && parseFloat(row.balanceAmount) <= 0.01 && !row.isOverdue)
            );
            if (!isPaid) return false;
        } else {
            if (transactionFilter === 'SALES' && row.isReturn) return false;
            if (transactionFilter === 'RETURNS' && !row.isReturn) return false;
        }

        return (
            row.invoiceNo?.toLowerCase().includes(searchLower) ||
            row.customerName?.toLowerCase().includes(searchLower) ||
            row.productName?.toLowerCase().includes(searchLower) ||
            (Array.isArray(row.productNames) && row.productNames.some(p => p.toLowerCase().includes(searchLower))) ||
            row.paymentType?.toLowerCase().includes(searchLower) ||
            row.status?.toLowerCase().includes(searchLower)
        );
    });

    const handleInvoiceClick = (row) => {
        if (!row) return;
        if (row.isReturn) {
            navigate('/company/sales/return', {
                state: {
                    targetReturnId: row.invoiceId || row.id,
                    from: location.pathname + location.search,
                    sourceName: 'POS Report',
                    fromReport: true
                }
            });
            return;
        }

        const targetInvoiceId = row.invoiceId || row.id;
        if (targetInvoiceId) {
            navigate('/company/pos/all-invoices', {
                state: {
                    targetInvoiceId: parseInt(targetInvoiceId),
                    from: location.pathname + location.search,
                    sourceName: 'POS Report',
                    fromReport: true
                }
            });
        }
    };

    const handleRowDoubleClick = (row) => {
        handleInvoiceClick(row);
    };

    const exportToExcel = () => {
        const worksheetData = filteredReportData.map(row => ({
            'Invoice / Return No': row.invoiceNo,
            'Type': row.isReturn ? 'POS Return' : 'POS Sale',
            'Date': new Date(row.date).toLocaleDateString(),
            'Customer': row.customerName,
            'Product': row.productName,
            'Qty': row.qty,
            'Payment Type': row.paymentType,
            'Total Amount': row.totalAmount,
            'Paid Amount': row.paidAmount,
            'Balance Due': row.balanceAmount,
            'Status': row.status,
            'Time': row.time
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "POS Report");
        XLSX.writeFile(wb, `POS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text("POS Analytics & Return Report", 14, 20);

        const headers = [["Invoice No", "Type", "Date", "Customer", "Product", "Qty", "Payment", "Total", "Status"]];
        const body = filteredReportData.map(r => [
            r.invoiceNo,
            r.isReturn ? 'POS Return' : 'POS Sale',
            new Date(r.date).toLocaleDateString(),
            r.customerName,
            r.productName,
            r.qty,
            r.paymentType,
            formatCurrency(r.total),
            r.status
        ]);

        autoTable(doc, {
            head: headers,
            body: body,
            startY: 30,
            theme: 'grid'
        });
        doc.save(`POS_Report.pdf`);
    };

    return (
        <div className="pos-report-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">POS Analytics & Returns</h1>
                    <p className="page-subtitle">Point of Sale transactions, returns, and payment analysis</p>
                </div>
                <div className="header-actions">
                    <div className="report-filters-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div className="filter-item">
                            <label>Type:</label>
                            <select
                                value={transactionFilter}
                                onChange={(e) => setTransactionFilter(e.target.value)}
                                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <option value="ALL">All (Sales & Returns)</option>
                                <option value="SALES">Sales Only</option>
                                <option value="RETURNS">Returns Only</option>
                            </select>
                        </div>
                        <div className="filter-item">
                            <label>From:</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label>To:</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        {(startDate || endDate || transactionFilter !== 'ALL') && (
                            <button className="btn-clear-filters" onClick={() => { setStartDate(''); setEndDate(''); setTransactionFilter('ALL'); }}>Clear</button>
                        )}
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

            {/* Summary Cards */}
            <div className="summary-grid-three">
                <div 
                    className={`summary-card card-blue clickable-summary-card ${activeCardFilter === 'GROSS_POS_SALES' ? 'active-card-blue' : ''}`}
                    onClick={() => setActiveCardFilter(prev => prev === 'GROSS_POS_SALES' ? null : 'GROSS_POS_SALES')}
                    title="Click to filter table by Gross POS Sales"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCardFilter(prev => prev === 'GROSS_POS_SALES' ? null : 'GROSS_POS_SALES'); }}
                >
                    <div className="card-content">
                        <span className="card-label">Gross POS Sales</span>
                        <h3 className="card-value">{formatCurrency(calculatedGrossSales || summaryStats.totalSales || 0)}</h3>
                        <span className="card-filter-hint">
                            {activeCardFilter === 'GROSS_POS_SALES'
                                ? `● Filtering sales (${salesRecordsCount} ${salesRecordsCount === 1 ? 'sale' : 'sales'} • Click to reset)`
                                : `${salesRecordsCount} ${salesRecordsCount === 1 ? 'POS sale' : 'POS sales'} • Click to filter`}
                        </span>
                    </div>
                    <div className="card-icon icon-blue"><Receipt size={24} /></div>
                </div>

                <div 
                    className={`summary-card card-orange clickable-summary-card ${activeCardFilter === 'OVERDUE' ? 'active-card-orange' : ''}`}
                    onClick={() => setActiveCardFilter(prev => prev === 'OVERDUE' ? null : 'OVERDUE')}
                    title="Click to filter table by Overdue Invoices"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCardFilter(prev => prev === 'OVERDUE' ? null : 'OVERDUE'); }}
                >
                    <div className="card-content">
                        <div className="card-label-with-tag">
                            <span className="card-label">Overdue Invoices</span>
                            <span className="card-period-tag">365 Days</span>
                        </div>
                        <h3 className="card-value card-value-orange">{formatCurrency(calculatedOverdueAmount || summaryStats.overdue || 0)}</h3>
                        <span className="card-filter-hint">
                            {activeCardFilter === 'OVERDUE'
                                ? `● Filtering overdue (${overdueRecordsCount} ${overdueRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to reset)`
                                : `${overdueRecordsCount} ${overdueRecordsCount === 1 ? 'overdue invoice' : 'overdue invoices'} • Click to filter`}
                        </span>
                    </div>
                    <div className="card-icon icon-orange"><Clock size={24} /></div>
                </div>

                <div 
                    className={`summary-card card-green clickable-summary-card ${activeCardFilter === 'NET_POS_SALES' ? 'active-card-green' : ''}`}
                    onClick={() => setActiveCardFilter(prev => prev === 'NET_POS_SALES' ? null : 'NET_POS_SALES')}
                    title="Click to filter table by Settled POS Sales"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCardFilter(prev => prev === 'NET_POS_SALES' ? null : 'NET_POS_SALES'); }}
                >
                    <div className="card-content">
                        <span className="card-label">Net POS Sales</span>
                        <h3 className="card-value">{formatCurrency(calculatedPaidSales || summaryStats.netSales || 0)}</h3>
                        <span className="card-filter-hint">
                            {activeCardFilter === 'NET_POS_SALES'
                                ? `● Filtering settled (${paidRecordsCount} ${paidRecordsCount === 1 ? 'sale' : 'sales'} • Click to reset)`
                                : `${paidRecordsCount} ${paidRecordsCount === 1 ? 'settled sale' : 'settled sales'} • Click to filter`}
                        </span>
                    </div>
                    <div className="card-icon icon-green"><CheckCircle2 size={24} /></div>
                </div>
            </div>

            {/* Table Section */}
            <div className="report-table-card">
                {/* Table Controls */}
                <div className="table-controls">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by invoice #, customer or product..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeCardFilter && (
                        <div className="active-card-filter-pill">
                            <span>
                                Filter: <strong>{
                                    activeCardFilter === 'OVERDUE' 
                                        ? `Overdue Invoices (${overdueRecordsCount} ${overdueRecordsCount === 1 ? 'invoice' : 'invoices'})` 
                                        : (activeCardFilter === 'GROSS_POS_SALES' ? `Gross POS Sales (${salesRecordsCount} ${salesRecordsCount === 1 ? 'sale' : 'sales'})` : `Settled POS Sales (${paidRecordsCount} ${paidRecordsCount === 1 ? 'sale' : 'sales'})`)
                                }</strong>
                            </span>
                            <button 
                                className="btn-clear-card-filter" 
                                onClick={() => setActiveCardFilter(null)}
                                title="Reset filter"
                            >
                                <X size={14} /> Clear Filter
                            </button>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                <div className="table-container">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading POS data...</div>
                    ) : filteredReportData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No POS transactions found matching your criteria.</div>
                    ) : (
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Invoice / Return No</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Product</th>
                                    <th className="text-center">Qty</th>
                                    <th>Payment Type</th>
                                    <th className="text-right">
                                        {activeCardFilter === 'OVERDUE' ? 'Overdue Amount' : (activeCardFilter === 'NET_POS_SALES' ? 'Paid Amount' : 'Amount')}
                                    </th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReportData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onDoubleClick={() => handleRowDoubleClick(row)}
                                        title={row.isReturn ? "Double-click to view POS Return" : "Double-click to view POS Invoice"}
                                        style={{ cursor: 'pointer' }}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="font-mono font-bold text-theme">
                                            <span
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInvoiceClick(row);
                                                }}
                                                title="Click to view details"
                                            >
                                                {row.invoiceNo}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                background: row.isReturn ? '#fee2e2' : '#f3e8ff',
                                                color: row.isReturn ? '#991b1b' : '#6b21a8',
                                                border: row.isReturn ? 'none' : '1px solid #e9d5ff'
                                            }}>
                                                {row.isReturn ? 'POS Return' : 'POS Sale'}
                                            </span>
                                        </td>
                                        <td className="text-sm text-gray-600">{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{row.customerName}</td>
                                        <td title={row.productNames?.length > 1 ? row.productNames.join(', ') : ''}>
                                            <span style={{ fontWeight: '500' }}>{row.productName}</span>
                                            {row.productNames?.length > 1 && (
                                                <span style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                                    {row.productNames.join(', ')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">{row.qty}</td>
                                        <td>
                                            <span className={`payment-badge ${(row.paymentType || 'cash').toLowerCase()}`}>
                                                {row.paymentType}
                                            </span>
                                        </td>
                                        <td className="text-right font-bold" style={{ color: row.isReturn ? '#dc2626' : 'inherit' }}>
                                            {row.isReturn ? (
                                                `-${formatCurrency(row.total)}`
                                            ) : activeCardFilter === 'OVERDUE' ? (
                                                <div>
                                                    <span style={{ color: '#dc2626' }}>{formatCurrency(row.balanceAmount)}</span>
                                                    {row.paidAmount > 0.01 && (
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#6b7280', marginTop: '2px' }}>
                                                            Total: {formatCurrency(row.total)} • Paid: {formatCurrency(row.paidAmount)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : activeCardFilter === 'NET_POS_SALES' ? (
                                                <div>
                                                    <span>{formatCurrency(row.paidAmount)}</span>
                                                    {row.balanceAmount > 0.01 && (
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#d97706', marginTop: '2px' }}>
                                                            Due: {formatCurrency(row.balanceAmount)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <span>{formatCurrency(row.total)}</span>
                                                    {row.balanceAmount > 0.01 && row.status !== 'PAID' && (
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: row.isOverdue ? '#dc2626' : '#d97706', marginTop: '2px' }}>
                                                            Due: {formatCurrency(row.balanceAmount)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-pill ${row.isReturn ? 'returned' : (row.status || 'unknown').toLowerCase().replace(' ', '-')}`}>
                                                {row.isReturn ? 'Returned' : (row.status || 'Paid')}
                                            </span>
                                        </td>
                                        <td className="text-gray-500 text-sm">{row.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="table-footer" style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>Showing {filteredReportData.length} records</span>
                </div>
            </div>
        </div>
    );
};

export default POSReport;
