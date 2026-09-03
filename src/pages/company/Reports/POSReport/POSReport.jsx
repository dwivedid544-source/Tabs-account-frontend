import React, { useState, useEffect } from 'react';
import {
    Search, Filter, Download, Calendar,
    Receipt, FileText, PieChart, Printer,
    CreditCard, Banknote
} from 'lucide-react';
import './POSReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const POSReport = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [transactionFilter, setTransactionFilter] = useState('ALL'); // 'ALL', 'SALES', 'RETURNS'
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [summaryStats, setSummaryStats] = useState({
        totalSales: 0,
        totalReturns: 0,
        netSales: 0,
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
                    const sortedData = processReportData(response.data.data);
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

    const processReportData = (data) => {
        // Flatten nested items for tabular display
        let rows = [];
        (data || []).forEach(invoice => {
            const isRet = Boolean(invoice.isReturn);
            if (invoice.posinvoiceitem && invoice.posinvoiceitem.length > 0) {
                invoice.posinvoiceitem.forEach(item => {
                    rows.push({
                        id: item.id,
                        invoiceId: invoice.id,
                        invoiceNo: invoice.invoiceNumber,
                        date: invoice.createdAt,
                        productName: item.product?.name || item.description || (isRet ? 'Returned Item' : 'Product'),
                        productNameArabic: item.product?.nameArabic || '',
                        customerName: invoice.customer?.name || 'Walk-in',
                        customerNameArabic: invoice.customer?.nameArabic || '',
                        paymentType: invoice.paymentMode || 'CASH',
                        amount: item.amount,
                        tax: (item.amount * (item.taxRate || 0)) / 100,
                        total: item.amount,
                        isReturn: isRet,
                        type: invoice.type || (isRet ? 'RETURN' : 'SALE'),
                        time: new Date(invoice.createdAt || invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                });
            } else {
                rows.push({
                    id: invoice.id,
                    invoiceId: invoice.id,
                    invoiceNo: invoice.invoiceNumber,
                    date: invoice.createdAt,
                    productName: isRet ? 'POS Return' : 'N/A',
                    paymentType: invoice.paymentMode || 'CASH',
                    amount: invoice.subtotal || invoice.totalAmount,
                    tax: invoice.taxAmount || 0,
                    total: invoice.totalAmount,
                    isReturn: isRet,
                    type: invoice.type || (isRet ? 'RETURN' : 'SALE'),
                    time: new Date(invoice.createdAt || invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        });
        return rows;
    };

    const filteredReportData = reportData.filter(row => {
        const searchLower = searchTerm.toLowerCase();

        if (transactionFilter === 'SALES' && row.isReturn) return false;
        if (transactionFilter === 'RETURNS' && !row.isReturn) return false;

        return (
            row.invoiceNo?.toLowerCase().includes(searchLower) ||
            row.productName?.toLowerCase().includes(searchLower) ||
            row.customerName?.toLowerCase().includes(searchLower) ||
            row.paymentType?.toLowerCase().includes(searchLower)
        );
    });

    const exportToExcel = () => {
        const worksheetData = filteredReportData.map(row => ({
            'Invoice No': row.invoiceNo,
            'Type': row.isReturn ? 'POS Return' : 'POS Sale',
            'Date': new Date(row.date).toLocaleDateString(),
            'Customer': row.customerName,
            'Product': row.productName,
            'Payment Type': row.paymentType,
            'Total': row.total,
            'Time': row.time
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "POS Report");
        XLSX.writeFile(wb, `POS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text("POS Analytics & Return Report", 14, 20);

        const headers = [["Invoice No", "Type", "Date", "Customer", "Product", "Payment", "Total"]];
        const body = filteredReportData.map(r => [
            r.invoiceNo,
            r.isReturn ? 'POS Return' : 'POS Sale',
            new Date(r.date).toLocaleDateString(),
            r.customerName,
            r.productName,
            r.paymentType,
            formatCurrency(r.total)
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
                <div className="summary-card card-blue">
                    <div className="card-content">
                        <span className="card-label">Gross POS Sales</span>
                        <h3 className="card-value">{formatCurrency(summaryStats.totalSales || 0)}</h3>
                    </div>
                    <div className="card-icon icon-blue"><Receipt size={24} /></div>
                </div>
                <div className="summary-card card-red">
                    <div className="card-content">
                        <span className="card-label">Total POS Returns</span>
                        <h3 className="card-value" style={{ color: '#ef4444' }}>{formatCurrency(summaryStats.totalReturns || 0)}</h3>
                    </div>
                    <div className="card-icon icon-red"><Banknote size={24} /></div>
                </div>
                <div className="summary-card card-green">
                    <div className="card-content">
                        <span className="card-label">Net POS Sales</span>
                        <h3 className="card-value">{formatCurrency(summaryStats.netSales ?? ((summaryStats.totalSales || 0) - (summaryStats.totalReturns || 0)))}</h3>
                    </div>
                    <div className="card-icon icon-green"><CreditCard size={24} /></div>
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
                            placeholder="Search POS invoices or returns..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
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
                                    <th>Payment Type</th>
                                    <th className="text-right">Total</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReportData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="font-mono App-text-primary">{row.invoiceNo}</td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                background: row.isReturn ? '#fee2e2' : '#e0f2fe',
                                                color: row.isReturn ? '#991b1b' : '#075985'
                                            }}>
                                                {row.isReturn ? 'POS Return' : 'POS Sale'}
                                            </span>
                                        </td>
                                        <td className="text-sm text-gray-600">{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="font-medium">{row.customerName}</td>
                                        <td className="font-medium">{row.productName}</td>
                                        <td>
                                            <span className={`payment-badge ${(row.paymentType || 'cash').toLowerCase()}`}>
                                                {row.paymentType}
                                            </span>
                                        </td>
                                        <td className="font-bold" style={{ color: row.isReturn ? '#dc2626' : 'inherit' }}>
                                            {row.isReturn ? `-${formatCurrency(row.total)}` : formatCurrency(row.total)}
                                        </td>
                                        <td className="text-gray-500">{row.time}</td>
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

export default POSReport;
