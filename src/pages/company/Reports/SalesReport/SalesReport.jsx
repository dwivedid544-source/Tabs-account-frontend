import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Filter, Download, Calendar,
    DollarSign, CheckCircle2, XCircle, AlertCircle,
    User, Package, FileText, Clock, ArrowRight, X
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
    const location = useLocation();
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);

    const savedFilters = useMemo(() => {
        if (location.state?.returnState) {
            return location.state.returnState;
        }
        try {
            const raw = sessionStorage.getItem('tab_sales_report_filters');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }, [location.state]);

    const [reportType, setReportType] = useState(savedFilters?.reportType || 'general'); // 'general', 'item', 'customer'
    const [transactionFilter, setTransactionFilter] = useState(savedFilters?.transactionFilter || 'ALL'); // 'ALL', 'SALES', 'RETURNS'
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summaryStats, setSummaryStats] = useState({
        totalSales: 0,
        totalReturns: 0,
        netRevenue: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        overdue: 0,
        overdueCount: 0
    });
    const [overdueInvoices, setOverdueInvoices] = useState([]);
    const [activeCardFilter, setActiveCardFilter] = useState(null); // null, 'GROSS_SALES', 'OVERDUE', 'NET_REVENUE'

    const [startDate, setStartDate] = useState(savedFilters?.startDate || '');
    const [endDate, setEndDate] = useState(savedFilters?.endDate || '');
    const [tempStartDate, setTempStartDate] = useState(savedFilters?.startDate || '');
    const [tempEndDate, setTempEndDate] = useState(savedFilters?.endDate || '');

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
        setActiveCardFilter(null);
        try {
            sessionStorage.removeItem('tab_sales_report_filters');
        } catch (e) { }
    };
    const [searchTerm, setSearchTerm] = useState(savedFilters?.searchTerm || '');
    const [showExportOptions, setShowExportOptions] = useState(false);

    // Save filters to session storage when they change
    useEffect(() => {
        try {
            sessionStorage.setItem('tab_sales_report_filters', JSON.stringify({
                reportType,
                transactionFilter,
                startDate,
                endDate,
                searchTerm
            }));
        } catch (e) { }
    }, [reportType, transactionFilter, startDate, endDate, searchTerm]);

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
                    let overdueList = [];
                    if (Array.isArray(response.data.overdueInvoices) && response.data.overdueInvoices.length > 0) {
                        overdueList = response.data.overdueInvoices;
                    } else if (Array.isArray(data)) {
                        // Extract qualifying overdue invoices directly from data
                        const now = new Date();
                        const past365Days = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        past365Days.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        overdueList = data.filter(inv => {
                            if (inv.isReturn) return false;
                            const st = String(inv.status || '').toUpperCase();
                            if (st === 'CANCELLED' || st === 'PAID') return false;

                            const rawBal = parseFloat(inv.balanceAmount !== undefined && inv.balanceAmount !== null
                                ? inv.balanceAmount
                                : ((inv.totalAmount || 0) - (inv.paidAmount || 0)));
                            if (isNaN(rawBal) || rawBal <= 0.01) return false;

                            const dueDate = inv.dueDate ? new Date(inv.dueDate) : (inv.date ? new Date(inv.date) : null);
                            if (!dueDate || isNaN(dueDate.getTime())) return false;

                            const d = new Date(dueDate);
                            d.setHours(0, 0, 0, 0);
                            const duePassed = today.getTime() > d.getTime() || st === 'OVERDUE';
                            if (!duePassed) return false;

                            const invDate = inv.date ? new Date(inv.date) : dueDate;
                            if (invDate < past365Days) return false;

                            return true;
                        }).map(inv => {
                            const due = new Date(inv.dueDate || inv.date);
                            due.setHours(0, 0, 0, 0);
                            const diffDays = Math.max(1, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
                            const rawBal = parseFloat(inv.balanceAmount !== undefined && inv.balanceAmount !== null
                                ? inv.balanceAmount
                                : ((inv.totalAmount || 0) - (inv.paidAmount || 0)));
                            const rawTotal = parseFloat(inv.totalAmount || 0);
                            const rawPaid = parseFloat(inv.paidAmount !== undefined ? inv.paidAmount : (rawTotal - rawBal));

                            const isPos = Boolean(inv.isPosReturn || inv.type === 'POS_RETURN' || inv.source === 'POS' || inv.type === 'POS_SALE' || inv.type === 'POS_INVOICE');

                            return {
                                id: inv.id,
                                invoiceId: inv.id,
                                invoiceNumber: inv.invoiceNumber,
                                type: isPos ? 'POS_INVOICE' : 'TAX_INVOICE',
                                date: inv.date,
                                dueDate: inv.dueDate || inv.date,
                                daysOverdue: diffDays,
                                customerName: inv.customer?.name || 'Walk-in',
                                totalAmount: rawTotal,
                                paidAmount: rawPaid,
                                balanceAmount: rawBal,
                                status: 'OVERDUE'
                            };
                        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                    }

                    setOverdueInvoices(overdueList);

                    const incomingSummary = response.data.summary || {};
                    const calculatedOverdueSum = overdueList.reduce((s, i) => s + (i.balanceAmount || 0), 0);
                    const finalOverdueAmount = incomingSummary.overdue !== undefined && incomingSummary.overdue > 0
                        ? incomingSummary.overdue
                        : calculatedOverdueSum;

                    setSummaryStats({
                        totalSales: incomingSummary.totalSales || 0,
                        totalReturns: incomingSummary.totalReturns || 0,
                        netRevenue: incomingSummary.netRevenue || 0,
                        totalAmount: incomingSummary.totalAmount || 0,
                        totalPaid: incomingSummary.totalPaid || 0,
                        totalUnpaid: incomingSummary.totalUnpaid || 0,
                        overdue: finalOverdueAmount,
                        overdueCount: incomingSummary.overdueCount !== undefined ? incomingSummary.overdueCount : overdueList.length
                    });

                    // Background sync with dedicated endpoint if available
                    if (!response.data.overdueInvoices) {
                        axiosInstance.get('/reports/overdue-invoices', { params: { companyId } })
                            .then(res => {
                                if (res.data?.success && Array.isArray(res.data.invoices) && res.data.invoices.length > 0) {
                                    setOverdueInvoices(res.data.invoices);
                                    setSummaryStats(prev => ({
                                        ...prev,
                                        overdue: res.data.totalOverdueAmount !== undefined ? res.data.totalOverdueAmount : prev.overdue,
                                        overdueCount: res.data.overdueCount !== undefined ? res.data.overdueCount : res.data.invoices.length
                                    }));
                                    const bgOverdueIds = new Set(res.data.invoices.map(o => String(o.id || o.invoiceId)));
                                    setReportData(prev => prev.map(row => {
                                        if (bgOverdueIds.has(String(row.invoiceId || row.id)) || bgOverdueIds.has(String(row.invoiceNumber))) {
                                            return {
                                                ...row,
                                                isOverdue: true,
                                                status: 'OVERDUE'
                                            };
                                        }
                                        return row;
                                    }));
                                }
                            })
                            .catch(() => {
                                // Dedicated endpoint not yet available on remote server; fallback to extracted list is active
                            });
                    }

                    // Set of all qualifying overdue IDs
                    const overdueInvoiceIds = new Set(overdueList.map(o => String(o.id || o.invoiceId)));

                    // Transform data to INVOICE-LEVEL records (one row per unique invoice/transaction)
                    const invoiceRows = data.map(inv => {
                        const isReturn = Boolean(inv.isReturn);
                        const isPos = Boolean(inv.isPosReturn || inv.type === 'POS_RETURN' || inv.source === 'POS' || inv.type === 'POS_SALE' || inv.type === 'POS_INVOICE');

                        const items = (inv.invoiceitem && inv.invoiceitem.length > 0)
                            ? inv.invoiceitem
                            : (inv.posinvoiceitem || inv.salesreturnitem || []);

                        // Extract product names for display and search
                        const productNames = items
                            .map(it => it.product?.name || it.description)
                            .filter(Boolean);

                        let displayProductName = isReturn ? 'Sales Return' : 'Invoice';
                        if (items.length === 1) {
                            displayProductName = productNames[0] || (isReturn ? 'Sales Return' : 'Unknown');
                        } else if (items.length > 1) {
                            displayProductName = `Multiple Items (${items.length})`;
                        }

                        // Total quantity across line items
                        const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);

                        const now = new Date();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const dueDate = inv.dueDate ? new Date(inv.dueDate) : (inv.date ? new Date(inv.date) : null);
                        let isPastDue = false;
                        if (dueDate && !isNaN(dueDate.getTime())) {
                            const d = new Date(dueDate);
                            d.setHours(0, 0, 0, 0);
                            isPastDue = today.getTime() > d.getTime();
                        }

                        const rawBal = parseFloat(inv.balanceAmount !== undefined && inv.balanceAmount !== null
                            ? inv.balanceAmount
                            : ((inv.totalAmount || 0) - (inv.paidAmount || 0)));
                        const rawTotal = parseFloat(inv.totalAmount || 0);
                        const rawPaid = parseFloat(inv.paidAmount !== undefined ? inv.paidAmount : Math.max(0, rawTotal - rawBal));

                        const isInvOverdue = !isReturn && (
                            overdueInvoiceIds.has(String(inv.id)) ||
                            overdueInvoiceIds.has(String(inv.invoiceNumber)) ||
                            String(inv.status).toUpperCase() === 'OVERDUE' ||
                            (isPastDue && rawBal > 0.01 && String(inv.status).toUpperCase() !== 'PAID' && String(inv.status).toUpperCase() !== 'CANCELLED')
                        );

                        // Overdue / outstanding amount for this invoice
                        const overdueAmount = isInvOverdue ? rawBal : 0;

                        // Authoritative status
                        let authoritativeStatus = inv.status;
                        if (isReturn) {
                            authoritativeStatus = 'RETURNED';
                        } else if (isInvOverdue) {
                            authoritativeStatus = 'OVERDUE';
                        } else if (rawBal <= 0.01) {
                            authoritativeStatus = 'PAID';
                        } else if (rawPaid > 0.01 && rawBal > 0.01) {
                            authoritativeStatus = 'PARTIALLY PAID';
                        } else {
                            authoritativeStatus = inv.status || 'UNPAID';
                        }

                        return {
                            id: inv.id,
                            invoiceId: isReturn ? (inv.invoiceId || null) : inv.id,
                            salesReturnId: isReturn ? (inv.salesReturnId || inv.id) : null,
                            invoiceNumber: inv.invoiceNumber,
                            date: new Date(inv.date).toLocaleDateString(),
                            rawDate: inv.date,
                            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : (inv.date ? new Date(inv.date).toLocaleDateString() : '-'),
                            rawDueDate: inv.dueDate,
                            customerName: inv.customer?.name || 'Walk-in',
                            productName: displayProductName,
                            productNames: productNames,
                            items: items,
                            qty: totalQty > 0 ? totalQty : (items.length > 0 ? items.length : '-'),
                            totalAmount: rawTotal,
                            paidAmount: rawPaid,
                            balanceAmount: rawBal,
                            overdueAmount: overdueAmount,
                            amount: rawTotal,
                            status: authoritativeStatus,
                            isOverdue: isInvOverdue,
                            isReturn: isReturn,
                            isPosReturn: Boolean(inv.isPosReturn || inv.type === 'POS_RETURN'),
                            source: inv.source,
                            type: inv.type || (isReturn ? (inv.isPosReturn ? 'POS_RETURN' : 'RETURN') : (isPos ? 'POS_SALE' : 'SALE'))
                        };
                    });
                    setReportData(invoiceRows);
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
                    type: isPos ? 'POS_INVOICE' : 'TAX_INVOICE',
                    from: location.pathname + location.search,
                    sourceName: 'Sales Report',
                    fromReport: true,
                    returnState: {
                        reportType,
                        transactionFilter,
                        startDate,
                        endDate,
                        searchTerm
                    }
                }
            });
        }
    };

    const handleRowDoubleClick = (row) => {
        handleInvoiceClick(row);
    };

    const overdueRecords = useMemo(() => {
        return reportData.filter(item => item.isOverdue || String(item.status).toUpperCase() === 'OVERDUE');
    }, [reportData]);
    const overdueRecordsCount = overdueRecords.length;

    const paidRecords = useMemo(() => {
        return reportData.filter(item => !item.isReturn && (
            String(item.status).toUpperCase() === 'PAID' ||
            String(item.status).toUpperCase() === 'FULLY_PAID' ||
            String(item.status).toUpperCase() === 'PARTIALLY PAID' ||
            String(item.status).toUpperCase() === 'PARTIAL' ||
            (parseFloat(item.paidAmount) > 0.01) ||
            (item.balanceAmount !== undefined && parseFloat(item.balanceAmount) <= 0.01 && !item.isOverdue)
        ));
    }, [reportData]);
    const paidRecordsCount = paidRecords.length;

    const salesRecords = useMemo(() => {
        return reportData.filter(item => !item.isReturn);
    }, [reportData]);
    const salesRecordsCount = salesRecords.length;

    const calculatedGrossSales = useMemo(() => {
        const sum = salesRecords.reduce((s, item) => s + (parseFloat(item.totalAmount || item.amount) || 0), 0);
        return sum > 0 ? sum : (summaryStats.totalSales || summaryStats.totalAmount || 0);
    }, [salesRecords, summaryStats.totalSales, summaryStats.totalAmount]);

    const calculatedPaidSales = useMemo(() => {
        const sum = salesRecords.reduce((s, item) => {
            const paid = parseFloat(item.paidAmount);
            if (!isNaN(paid) && paid > 0) return s + paid;
            if (String(item.status).toUpperCase() === 'PAID' || String(item.status).toUpperCase() === 'FULLY_PAID' || (item.balanceAmount !== undefined && parseFloat(item.balanceAmount) <= 0.01)) {
                return s + (parseFloat(item.totalAmount || item.amount) || 0);
            }
            return s;
        }, 0);
        return sum > 0 ? sum : (summaryStats.totalPaid || summaryStats.netRevenue || 0);
    }, [salesRecords, summaryStats.totalPaid, summaryStats.netRevenue]);

    const filteredData = reportData.filter(item => {
        const searchLower = searchTerm.toLowerCase();

        // Card Filter: overrides dropdown transactionFilter for intuitive one-click UX
        if (activeCardFilter === 'OVERDUE') {
            const isItemOverdue = Boolean(item.isOverdue || String(item.status).toUpperCase() === 'OVERDUE');
            if (!isItemOverdue) return false;
        } else if (activeCardFilter === 'GROSS_SALES') {
            // Filter to All Sales invoices (excluding returns)
            if (item.isReturn) return false;
        } else if (activeCardFilter === 'NET_REVENUE') {
            // Filter to Paid / Collected Revenue invoices (including partially paid)
            const isPaid = !item.isReturn && (
                String(item.status).toUpperCase() === 'PAID' ||
                String(item.status).toUpperCase() === 'FULLY_PAID' ||
                String(item.status).toUpperCase() === 'PARTIALLY PAID' ||
                String(item.status).toUpperCase() === 'PARTIAL' ||
                (parseFloat(item.paidAmount) > 0.01) ||
                (item.balanceAmount !== undefined && parseFloat(item.balanceAmount) <= 0.01 && !item.isOverdue)
            );
            if (!isPaid) return false;
        } else {
            if (transactionFilter === 'SALES' && item.isReturn) return false;
            if (transactionFilter === 'RETURNS' && !item.isReturn) return false;
            if (transactionFilter === 'INVOICE' && (item.isReturn || item.isPosReturn || item.source === 'POS' || item.type === 'POS_SALE' || item.type === 'POS_INVOICE')) return false;
            if (transactionFilter === 'POS' && (item.isReturn || (!item.isPosReturn && item.source !== 'POS' && item.type !== 'POS_SALE' && item.type !== 'POS_INVOICE'))) return false;
        }

        if (reportType === 'general') {
            return (
                item.invoiceNumber?.toLowerCase().includes(searchLower) ||
                item.customerName?.toLowerCase().includes(searchLower) ||
                item.productName?.toLowerCase().includes(searchLower) ||
                (Array.isArray(item.productNames) && item.productNames.some(p => p.toLowerCase().includes(searchLower))) ||
                item.status?.toLowerCase().includes(searchLower)
            );
        } else if (reportType === 'item') {
            return item.productName?.toLowerCase().includes(searchLower) || item.sku?.toLowerCase().includes(searchLower);
        } else {
            return item.customerName?.toLowerCase().includes(searchLower);
        }
    });

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filteredData.map(r => ({
            'Invoice / Return #': r.invoiceNumber,
            'Type': r.type,
            'Date': r.date,
            'Due Date': r.dueDate,
            'Customer': r.customerName,
            'Product': r.productName,
            'Qty': r.qty,
            'Total Amount': r.totalAmount,
            'Paid Amount': r.paidAmount,
            'Balance Due': r.balanceAmount,
            'Status': r.status
        })));
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
            headers = [["Inv / Return #", "Type", "Date", "Customer", "Product", "Qty", "Total", "Balance", "Status"]];
            body = filteredData.map(r => [
                r.invoiceNumber,
                r.type,
                r.date,
                r.customerName,
                r.productName,
                r.qty,
                formatCurrency(r.totalAmount || r.amount),
                formatCurrency(r.balanceAmount || 0),
                r.status
            ]);
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
            {/* <div className="report-tabs">
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
            </div> */}

            {reportType === 'general' && (
                <div className="summary-grid">
                    <div
                        className={`summary-card card-blue clickable-summary-card ${activeCardFilter === 'GROSS_SALES' ? 'active-card-blue' : ''}`}
                        onClick={() => setActiveCardFilter(prev => prev === 'GROSS_SALES' ? null : 'GROSS_SALES')}
                        title="Click to filter table by Gross Sales (all sales invoices)"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCardFilter(prev => prev === 'GROSS_SALES' ? null : 'GROSS_SALES'); }}
                    >
                        <div className="card-content">
                            <span className="card-label">Gross Sales</span>
                            <h3 className="card-value">{formatCurrency(calculatedGrossSales)}</h3>
                            <span className="card-filter-hint">
                                {activeCardFilter === 'GROSS_SALES'
                                    ? `● Filtering sales (${salesRecordsCount} ${salesRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to reset)`
                                    : `${salesRecordsCount} ${salesRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to filter`}
                            </span>
                        </div>
                        <div className="card-icon icon-blue"><DollarSign size={24} /></div>
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
                            <h3 className="card-value card-value-orange">{formatCurrency(summaryStats.overdue || 0)}</h3>
                            <span className="card-filter-hint">
                                {activeCardFilter === 'OVERDUE'
                                    ? `● Filtering overdue (${overdueRecordsCount} ${overdueRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to reset)`
                                    : `${overdueRecordsCount} overdue ${overdueRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to filter`}
                            </span>
                        </div>
                        <div className="card-icon icon-orange"><Clock size={24} /></div>
                    </div>
                    <div
                        className={`summary-card card-green clickable-summary-card ${activeCardFilter === 'NET_REVENUE' ? 'active-card-green' : ''}`}
                        onClick={() => setActiveCardFilter(prev => prev === 'NET_REVENUE' ? null : 'NET_REVENUE')}
                        title="Click to filter table by Paid Revenue (collected invoices)"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveCardFilter(prev => prev === 'NET_REVENUE' ? null : 'NET_REVENUE'); }}
                    >
                        <div className="card-content">
                            <span className="card-label">Net Revenue</span>
                            <h3 className="card-value">{formatCurrency(calculatedPaidSales || summaryStats.netRevenue || 0)}</h3>
                            <span className="card-filter-hint">
                                {activeCardFilter === 'NET_REVENUE'
                                    ? `● Filtering paid revenue (${paidRecordsCount} ${paidRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to reset)`
                                    : `${paidRecordsCount} paid ${paidRecordsCount === 1 ? 'invoice' : 'invoices'} • Click to filter`}
                            </span>
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
                    {activeCardFilter && (
                        <div className="active-card-filter-pill">
                            <span>
                                Filter: <strong>{
                                    activeCardFilter === 'OVERDUE'
                                        ? `Overdue Invoices (${overdueRecordsCount} ${overdueRecordsCount === 1 ? 'invoice' : 'invoices'})`
                                        : (activeCardFilter === 'GROSS_SALES'
                                            ? `Gross Sales (${salesRecordsCount} ${salesRecordsCount === 1 ? 'invoice' : 'invoices'})`
                                            : `Paid Revenue (${paidRecordsCount} ${paidRecordsCount === 1 ? 'invoice' : 'invoices'})`)
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
                                        <th className="text-right">
                                            {activeCardFilter === 'OVERDUE' ? 'Overdue Amount' : (activeCardFilter === 'NET_REVENUE' ? 'Paid Amount' : 'Amount')}
                                        </th>
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
                                                <td title={row.productNames?.length > 1 ? row.productNames.join(', ') : ''}>
                                                    <span style={{ fontWeight: '500' }}>{row.productName}</span>
                                                    {row.productNames?.length > 1 && (
                                                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                                            {row.productNames.join(', ')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center">{row.qty}</td>
                                                <td className="text-right font-bold" style={{ color: row.isReturn ? '#dc2626' : 'inherit' }}>
                                                    {row.isReturn ? (
                                                        `-${formatCurrency(row.totalAmount || row.amount)}`
                                                    ) : activeCardFilter === 'OVERDUE' ? (
                                                        <div>
                                                            <span style={{ color: '#dc2626' }}>{formatCurrency(row.balanceAmount)}</span>
                                                            {row.paidAmount > 0.01 && (
                                                                <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#6b7280', marginTop: '2px' }}>
                                                                    Total: {formatCurrency(row.totalAmount)} • Paid: {formatCurrency(row.paidAmount)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <span>{formatCurrency(row.totalAmount || row.amount)}</span>
                                                            {row.balanceAmount > 0.01 && row.status !== 'PAID' && (
                                                                <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: row.isOverdue ? '#dc2626' : '#d97706', marginTop: '2px' }}>
                                                                    Due: {formatCurrency(row.balanceAmount)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
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
