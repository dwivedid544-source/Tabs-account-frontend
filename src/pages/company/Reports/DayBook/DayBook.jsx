import React, { useState, useEffect } from 'react';
import {
    Calendar, Download, Printer, Search, Filter,
    ChevronDown, FileText, ArrowUpCircle, ArrowDownCircle,
    ArrowRightCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { useContext } from 'react';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './DayBook.css';

const DayBook = () => {
    const navigate = useNavigate();
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const today = new Date().toISOString().split('T')[0];

    // States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVoucherType, setSelectedVoucherType] = useState('ALL');
    const [selectedLedgerId, setSelectedLedgerId] = useState('');
    const [ledgers, setLedgers] = useState([]);

    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const [tempVoucherType, setTempVoucherType] = useState('ALL');
    const [tempLedgerId, setTempLedgerId] = useState('');

    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleApplyFilters = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setSelectedVoucherType(tempVoucherType);
        setSelectedLedgerId(tempLedgerId);
    };

    const handleResetFilters = () => {
        setTempStartDate('');
        setTempEndDate('');
        setTempVoucherType('ALL');
        setTempLedgerId('');
        setStartDate('');
        setEndDate('');
        setSelectedVoucherType('ALL');
        setSelectedLedgerId('');
    };

    useEffect(() => {
        fetchCompanySettings();
        fetchLedgers();
    }, []);

    useEffect(() => {
        fetchDayBook();
    }, [startDate, endDate, selectedVoucherType, selectedLedgerId]);

    const fetchLedgers = async () => {
        try {
            const companyId = GetCompanyId();
            const res = await chartOfAccountsService.getAllLedgers(companyId);
            if (res.success) setLedgers(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchDayBook = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            const params = new URLSearchParams({
                companyId,
                startDate,
                endDate,
                voucherType: selectedVoucherType,
                ledgerId: selectedLedgerId
            });

            const response = await axiosInstance.get(`/reports/daybook?${params.toString()}`);
            if (response.data.success) {
                setTransactions(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching Day Book:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (source) => {
        if (!source || !source.type) return;
        const upperType = source.type.toUpperCase();
        const targetId = source.id;
        const stateArgs = { type: source.type };

        switch (upperType) {
            case 'SALES':
            case 'SALES_INVOICE':
            case 'SALES INVOICE':
                navigate('/company/sales/invoice', { state: { ...stateArgs, targetInvoiceId: targetId, type: 'TAX_INVOICE' } });
                break;
            case 'POS':
            case 'POS_INVOICE':
            case 'POS INVOICE':
                navigate('/company/pos/all-invoices', { state: { ...stateArgs, targetInvoiceId: targetId } });
                break;
            case 'PURCHASE':
            case 'PURCHASE_BILL':
            case 'PURCHASE BILL':
                navigate('/company/purchases/bill', { state: { ...stateArgs, targetBillId: targetId } });
                break;
            case 'RECEIPT':
                navigate('/company/sales/payment', { state: { ...stateArgs, targetReceiptId: targetId } });
                break;
            case 'PAYMENT':
                navigate('/company/purchases/payment', { state: { ...stateArgs, targetPaymentId: targetId } });
                break;
            case 'JOURNAL':
                navigate('/company/voucher/create', { state: { ...stateArgs, targetJournalId: targetId } });
                break;
            case 'EXPENSE':
                navigate('/company/voucher/expenses', { state: { ...stateArgs, targetExpenseId: targetId } });
                break;
            case 'INCOME':
                navigate('/company/voucher/income', { state: { ...stateArgs, targetIncomeId: targetId } });
                break;
            case 'CONTRA':
                navigate('/company/voucher/contra', { state: { ...stateArgs, targetContraId: targetId } });
                break;
            default:
                if (source.link) {
                    navigate(source.link);
                }
                break;
        }
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(item =>
        item.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ledger.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.voucherType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDebit = filteredTransactions.reduce((acc, item) => acc + (item.debit || 0), 0);
    const totalCredit = filteredTransactions.reduce((acc, item) => acc + (item.credit || 0), 0);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const dateRangeStr = (startDate && endDate) ? (startDate === endDate ? startDate : `${startDate}_to_${endDate}`) : 'All_Dates';
        const dateRangeDisplay = (startDate && endDate) ? (startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`) : 'All Dates';

        const wsData = [
            ["Day Book", "", `Date: ${dateRangeDisplay}`],
            [],
            ["Date", "Voucher Type", "Voucher No", "Particulars (Ledger)", "Description", "Debit Amount", "Credit Amount"],
            ...filteredTransactions.map(row => [
                formatDate(row.date),
                row.voucherType,
                row.voucherNo,
                row.ledger,
                row.description,
                row.debit > 0 ? formatCurrency(row.debit) : '-',
                row.credit > 0 ? formatCurrency(row.credit) : '-'
            ]),
            [],
            ["Total", "", "", "", "", formatCurrency(totalDebit), formatCurrency(totalCredit)]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Day Book");
        XLSX.writeFile(wb, `Day_Book_${dateRangeStr}.xlsx`);
    };

    const exportToPDF = () => {
        const dateRangeStr = (startDate && endDate) ? (startDate === endDate ? startDate : `${startDate}_to_${endDate}`) : 'All_Dates';
        const dateRangeDisplay = (startDate && endDate) ? (startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`) : 'All Dates';

        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text('Day Book', 14, 15);
        doc.setFontSize(10);
        doc.text(`Date: ${dateRangeDisplay}`, 14, 22);

        const bodyData = filteredTransactions.map(row => [
            formatDate(row.date),
            row.voucherType,
            row.voucherNo,
            row.ledger,
            row.description,
            row.debit > 0 ? formatCurrency(row.debit) : '-',
            row.credit > 0 ? formatCurrency(row.credit) : '-'
        ]);

        bodyData.push([
            { content: 'Total', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(totalCredit), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        autoTable(doc, {
            head: [['Date', 'Voucher Type', 'Voucher No', 'Particulars (Ledger)', 'Description', 'Debit Amount', 'Credit Amount']],
            body: bodyData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] },
        });

        doc.save(`Day_Book_${dateRangeStr}.pdf`);
    };

    if (loading && transactions.length === 0) return <div className="p-8 text-center">Loading Day Book...</div>;

    return (
        <div className="daybook-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Day Book</h1>
                    <p className="page-subtitle">
                        {startDate && endDate 
                            ? `Transaction records from ${formatDate(startDate)} to ${formatDate(endDate)}` 
                            : startDate 
                                ? `Transaction records from ${formatDate(startDate)} onwards` 
                                : endDate 
                                    ? `Transaction records up to ${formatDate(endDate)}` 
                                    : 'All transaction records'}
                    </p>
                </div>
                <div className="header-actions">
                   
                    <div className="export-dropdown-wrapper">
                        <button className="btn-primary" onClick={() => setShowExportOptions(!showExportOptions)}>
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

            {/* Summary Cards */}
            <div className="summary-section">
                <div className="summary-card debit">
                    <div className="card-icon"><ArrowUpCircle size={24} /></div>
                    <div className="card-info">
                        <span className="info-label">Total Debit</span>
                        <h3 className="info-value">{formatCurrency(totalDebit)}</h3>
                    </div>
                </div>
                <div className="summary-card credit">
                    <div className="card-icon"><ArrowDownCircle size={24} /></div>
                    <div className="card-info">
                        <span className="info-label">Total Credit</span>
                        <h3 className="info-value">{formatCurrency(totalCredit)}</h3>
                    </div>
                </div>
                <div className="summary-card net">
                    <div className="card-icon"><FileText size={24} /></div>
                    <div className="card-info">
                        <span className="info-label">Net Movement</span>
                        <h3 className="info-value">{formatCurrency(totalDebit - totalCredit)}</h3>
                    </div>
                </div>
            </div>

            <div className="table-controls-card">
                <div className="search-group">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Voucher No or Ledger..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-options-group">
                    <div className="filter-item">
                        <span className="filter-label">From:</span>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <span className="filter-label">To:</span>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <span className="filter-label">Type:</span>
                        <select
                            className="filter-select"
                            value={tempVoucherType}
                            onChange={(e) => setTempVoucherType(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            <option value="SALES">Sales</option>
                            <option value="PURCHASE">Purchase</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="PAYMENT">Payment</option>
                            <option value="JOURNAL">Journal</option>
                            <option value="CONTRA">Contra</option>
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                            <option value="POS_INVOICE">POS Invoice</option>
                        </select>
                    </div>
                    <div className="filter-item">
                        <span className="filter-label">Account:</span>
                        <select
                            className="filter-select"
                            value={tempLedgerId}
                            onChange={(e) => setTempLedgerId(e.target.value)}
                        >
                            <option value="">All Accounts</option>
                            {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="filter-actions-buttons">
                        <button onClick={handleApplyFilters} className="btn-filter-apply">
                            Apply
                        </button>
                        <button onClick={handleResetFilters} className="btn-filter-reset">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-card">
                <div className="table-responsive">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Voucher Type</th>
                                <th>Voucher No</th>
                                <th>Particulars (Ledger)</th>
                                <th>Description</th>
                                <th className="text-right">Debit Amount</th>
                                <th className="text-right">Credit Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => handleRowClick(row.source)}
                                        className="clickable-row"
                                    >
                                        <td className="text-gray-500">{formatDate(row.date)}</td>
                                        <td>
                                            <span className={`voucher-badge ${row.voucherType.toLowerCase().replace(/\s+/g, '_')}`}>
                                                {row.voucherType}
                                            </span>
                                        </td>
                                        <td className="font-mono">{row.voucherNo}</td>
                                        <td className="font-medium">
                                            {row.ledgerId ? (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/company/reports/ledger', { 
                                                            state: { 
                                                                accountId: row.ledgerId,
                                                                startDate: startDate,
                                                                endDate: endDate
                                                            } 
                                                        });
                                                    }}
                                                    style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    {row.ledger}
                                                </span>
                                            ) : (
                                                row.ledger
                                            )}
                                            {row.source?.link && <ArrowRightCircle size={14} className="nav-icon" />}
                                        </td>
                                        <td className="text-gray-500 text-sm">{row.description}</td>
                                        <td className="text-right font-medium">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                        <td className="text-right font-medium">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center p-4 text-gray-500">No transactions found for this date.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="footer-row">
                                <td colSpan={5} className="text-right">Total</td>
                                <td className="text-right">{formatCurrency(totalDebit)}</td>
                                <td className="text-right">{formatCurrency(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DayBook;
