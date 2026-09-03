import React, { useState, useEffect } from 'react';
import { Search, Eye, Pencil, X, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Transactions.css';

const Transactions = () => {
    const { formatCurrency, fetchCompanySettings, companySettings } = useContext(CompanyContext);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [showExportOptions, setShowExportOptions] = useState(false);
    const navigate = useNavigate();

    // Set default date filters to empty string (Show All by default)
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // ERP Advanced Filters
    const [dateRangePreset, setDateRangePreset] = useState('ALL');
    const [filterVoucherType, setFilterVoucherType] = useState('');
    const [filterCustomerVendor, setFilterCustomerVendor] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [filterBalanceType, setFilterBalanceType] = useState('');
    const [filterSourceModule, setFilterSourceModule] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // Sorting
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

    useEffect(() => {
        fetchCompanySettings();
        fetchTransactions();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchTerm,
        fromDate,
        toDate,
        filterVoucherType,
        filterCustomerVendor,
        filterAccount,
        filterWarehouse,
        filterBalanceType,
        filterSourceModule,
        filterStatus,
        minAmount,
        maxAmount
    ]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            const response = await axiosInstance.get(`/reports/transactions?companyId=${companyId}`);
            if (response.data.success) {
                setTransactions(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatVoucherType = (type) => {
        if (!type) return '-';
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const getItemDetailsList = (txn) => {
        if (!txn.items || txn.items === '-') return [];
        const itemNames = txn.items.split(', ').map(s => s.trim());
        const skus = txn.skus && txn.skus !== '-' ? txn.skus.split(', ').map(s => s.trim()) : [];
        const quantities = txn.quantities && txn.quantities !== '-' ? txn.quantities.split(', ').map(s => s.trim()) : [];
        const units = txn.units && txn.units !== '-' ? txn.units.split(', ').map(s => s.trim()) : [];
        const prices = txn.prices && txn.prices !== '-' ? txn.prices.split(', ').map(s => s.trim()) : [];
        const discounts = txn.discounts && txn.discounts !== '-' ? txn.discounts.split(', ').map(s => s.trim()) : [];
        const taxes = txn.taxes && txn.taxes !== '-' ? txn.taxes.split(', ').map(s => s.trim()) : [];
        const warehouses = txn.warehouses && txn.warehouses !== '-' ? txn.warehouses.split(', ').map(s => s.trim()) : [];

        return itemNames.map((name, index) => ({
            name,
            sku: skus[index] || '-',
            quantity: quantities[index] || '-',
            unit: units[index] || '',
            price: prices[index] || '-',
            discount: discounts[index] || '-',
            tax: taxes[index] || '-',
            warehouse: warehouses[index] || '-'
        }));
    };

    const renderJournalPostings = (txn) => {
        const postingsList = txn.postings || [];
        if (postingsList.length === 0) {
            return (
                <div style={{ padding: '8px', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    No detailed posting entries found.
                </div>
            );
        }

        const lines = [];
        postingsList.forEach(p => {
            if (p.debitAccount && p.debitAccount !== '-') {
                lines.push({
                    account: p.debitAccount,
                    debit: p.amount,
                    credit: null
                });
            }
            if (p.creditAccount && p.creditAccount !== '-') {
                lines.push({
                    account: p.creditAccount,
                    debit: null,
                    credit: p.amount
                });
            }
        });

        const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '6px 0', color: '#475569', fontWeight: '600' }}>Particulars (Account Ledger)</th>
                            <th style={{ padding: '6px 0', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Debit</th>
                            <th style={{ padding: '6px 0', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 0', color: '#1e293b', fontWeight: line.debit ? '600' : 'normal', paddingLeft: line.credit ? '20px' : '0' }}>
                                    {line.credit ? `To ${line.account}` : line.account}
                                </td>
                                <td style={{ padding: '8px 0', color: '#10b981', fontWeight: '600', textAlign: 'right' }}>
                                    {line.debit ? formatCurrency(line.debit) : '-'}
                                </td>
                                <td style={{ padding: '8px 0', color: '#ef4444', fontWeight: '600', textAlign: 'right' }}>
                                    {line.credit ? formatCurrency(line.credit) : '-'}
                                </td>
                            </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #cbd5e1', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                            <td style={{ padding: '8px 0', color: '#1e293b' }}>Total</td>
                            <td style={{ padding: '8px 0', color: '#10b981', textAlign: 'right' }}>{formatCurrency(totalDebit)}</td>
                            <td style={{ padding: '8px 0', color: '#ef4444', textAlign: 'right' }}>{formatCurrency(totalCredit)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    const handleVoucherRedirect = (txn, isEdit = false) => {
        if (!txn || !txn.voucherType) return;
        const lowerType = txn.voucherType.toUpperCase();
        const stateArgs = { type: txn.voucherType, isEdit, autoEdit: isEdit };

        switch (lowerType) {
            case 'SALES_INVOICE':
            case 'SALES INVOICE':
                navigate('/company/sales/invoice', { state: { ...stateArgs, targetInvoiceId: txn.targetId, type: 'TAX_INVOICE' } });
                break;
            case 'SALES_RETURN':
            case 'SALES RETURN':
                navigate('/company/sales/return', { state: { ...stateArgs, targetReturnId: txn.targetId } });
                break;
            case 'SALES_QUOTATION':
            case 'SALES QUOTATION':
                navigate('/company/sales/quotation', { state: { ...stateArgs, targetQuotationId: txn.targetId } });
                break;
            case 'SALES_ORDER':
            case 'SALES ORDER':
                navigate('/company/sales/order', { state: { ...stateArgs, targetOrderId: txn.targetId } });
                break;
            case 'DELIVERY_CHALLAN':
            case 'DELIVERY CHALLAN':
                navigate('/company/sales/challan', { state: { ...stateArgs, targetChallanId: txn.targetId } });
                break;
            case 'RECEIPT':
                navigate('/company/sales/payment', { state: { ...stateArgs, targetReceiptId: txn.targetId } });
                break;
            case 'PURCHASE_BILL':
            case 'PURCHASE BILL':
                navigate('/company/purchases/bill', { state: { ...stateArgs, targetBillId: txn.targetId } });
                break;
            case 'PURCHASE_RETURN':
            case 'PURCHASE RETURN':
                navigate('/company/purchases/return', { state: { ...stateArgs, targetReturnId: txn.targetId } });
                break;
            case 'PURCHASE_ORDER':
            case 'PURCHASE ORDER':
                navigate('/company/purchases/order', { state: { ...stateArgs, targetOrderId: txn.targetId } });
                break;
            case 'PURCHASE_QUOTATION':
            case 'PURCHASE QUOTATION':
                navigate('/company/purchases/quotation', { state: { ...stateArgs, targetQuotationId: txn.targetId } });
                break;
            case 'GOODS_RECEIPT':
            case 'GOODS RECEIPT':
                navigate('/company/purchases/receipt', { state: { ...stateArgs, targetGrnId: txn.targetId } });
                break;
            case 'PAYMENT':
                navigate('/company/purchases/payment', { state: { ...stateArgs, targetPaymentId: txn.targetId } });
                break;
            case 'EXPENSE':
                navigate('/company/voucher/expenses', { state: { ...stateArgs, targetExpenseId: txn.targetId } });
                break;
            case 'INCOME':
                navigate('/company/voucher/income', { state: { ...stateArgs, targetIncomeId: txn.targetId } });
                break;
            case 'CONTRA':
                navigate('/company/voucher/contra', { state: { ...stateArgs, targetContraId: txn.targetId } });
                break;
            case 'JOURNAL':
                navigate('/company/voucher/create', { state: { ...stateArgs, targetJournalId: txn.targetId } });
                break;
            case 'POS':
            case 'POS_INVOICE':
                navigate('/company/pos/all-invoices', { state: { ...stateArgs, targetInvoiceId: txn.targetId } });
                break;
            case 'BANK_TRANSFER':
            case 'BANK TRANSFER':
                navigate('/company/bank-transfer', { state: { ...stateArgs, targetTransferId: txn.targetId } });
                break;
            default:
                break;
        }
    };

    const handlePresetChange = (preset) => {
        setDateRangePreset(preset);
        const today = new Date();

        switch (preset) {
            case 'TODAY': {
                const yyyyMmDd = today.toISOString().split('T')[0];
                setFromDate(yyyyMmDd);
                setToDate(yyyyMmDd);
                break;
            }
            case 'YESTERDAY': {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const yyyyMmDd = yesterday.toISOString().split('T')[0];
                setFromDate(yyyyMmDd);
                setToDate(yyyyMmDd);
                break;
            }
            case 'THIS_WEEK': {
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                const firstDay = new Date(today.setDate(diff));
                const lastDay = new Date(firstDay);
                lastDay.setDate(firstDay.getDate() + 6);
                setFromDate(firstDay.toISOString().split('T')[0]);
                setToDate(lastDay.toISOString().split('T')[0]);
                break;
            }
            case 'THIS_MONTH': {
                const y = today.getFullYear();
                const m = today.getMonth();
                const firstDay = new Date(y, m, 1);
                const lastDay = new Date(y, m + 1, 0);
                setFromDate(firstDay.toISOString().split('T')[0]);
                setToDate(lastDay.toISOString().split('T')[0]);
                break;
            }
            case 'THIS_QUARTER': {
                const quarter = Math.floor(today.getMonth() / 3);
                const firstDay = new Date(today.getFullYear(), quarter * 3, 1);
                const lastDay = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                setFromDate(firstDay.toISOString().split('T')[0]);
                setToDate(lastDay.toISOString().split('T')[0]);
                break;
            }
            case 'THIS_YEAR': {
                const y = today.getFullYear();
                const firstDay = new Date(y, 0, 1);
                const lastDay = new Date(y, 11, 31);
                setFromDate(firstDay.toISOString().split('T')[0]);
                setToDate(lastDay.toISOString().split('T')[0]);
                break;
            }
            case 'ALL':
            default:
                setFromDate('');
                setToDate('');
                break;
        }
    };

    // Calculate Running Balance
    const calculateRunningBalances = (txns) => {
        const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
        let balance = 0;
        const balanceMap = {};
        sorted.forEach(t => {
            if (t.balanceType === 'Debit') {
                balance += t.amount;
            } else {
                balance -= t.amount;
            }
            balanceMap[t.id] = balance;
        });
        return txns.map(t => ({
            ...t,
            runningBalance: balanceMap[t.id] || 0
        }));
    };

    const transactionsWithBalance = calculateRunningBalances(transactions);

    // Advanced filtering
    const filteredTransactions = transactionsWithBalance.filter(item => {
        const itemDate = new Date(item.date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;

        let dateMatch = true;
        if (from) dateMatch = dateMatch && itemDate >= from;
        if (to) {
            const endOfDayTo = new Date(to);
            endOfDayTo.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && itemDate <= endOfDayTo;
        }

        const q = searchTerm.toLowerCase().trim();
        const searchMatch = !q ||
            (item.voucherNo?.toLowerCase() || '').includes(q) ||
            (item.fromTo?.toLowerCase() || '').includes(q) ||
            (item.voucherType?.toLowerCase() || '').includes(q) ||
            (item.transactionId?.toLowerCase() || '').includes(q) ||
            (item.debitAccount?.toLowerCase() || '').includes(q) ||
            (item.creditAccount?.toLowerCase() || '').includes(q) ||
            (item.customerVendor?.toLowerCase() || '').includes(q) ||
            (item.items?.toLowerCase() || '').includes(q) ||
            (item.balanceType?.toLowerCase() || '').includes(q) ||
            (item.note?.toLowerCase() || '').includes(q) ||
            (item.paymentMethod?.toLowerCase() || '').includes(q) ||
            (item.bankAccount?.toLowerCase() || '').includes(q) ||
            (item.cashAccount?.toLowerCase() || '').includes(q);

        const voucherTypeMatch = !filterVoucherType || item.voucherType === filterVoucherType;
        const customerVendorMatch = !filterCustomerVendor || item.customerVendor === filterCustomerVendor;
        const accountMatch = !filterAccount || item.debitAccount === filterAccount || item.creditAccount === filterAccount;
        const warehouseMatch = !filterWarehouse || (item.warehouses && item.warehouses.includes(filterWarehouse));
        const balanceTypeMatch = !filterBalanceType || item.balanceType === filterBalanceType;
        const sourceModuleMatch = !filterSourceModule || item.sourceModule === filterSourceModule;
        const statusMatch = !filterStatus || item.status === filterStatus;

        let amountMatch = true;
        const amt = parseFloat(item.amount);
        if (minAmount && amt < parseFloat(minAmount)) amountMatch = false;
        if (maxAmount && amt > parseFloat(maxAmount)) amountMatch = false;

        return dateMatch && searchMatch && voucherTypeMatch && customerVendorMatch && accountMatch && warehouseMatch && balanceTypeMatch && sourceModuleMatch && statusMatch && amountMatch;
    });

    // Dynamic Lists for filter selectors (derived from data)
    const uniqueVoucherTypes = [...new Set(transactions.map(t => t.voucherType))].filter(Boolean);
    const uniqueParties = [...new Set(transactions.map(t => t.customerVendor))].filter(Boolean);
    const uniqueAccounts = [...new Set(transactions.flatMap(t => [t.debitAccount, t.creditAccount]))].filter(a => a && a !== '-');
    const uniqueWarehouses = [...new Set(transactions.flatMap(t => (t.warehouses || '').split(', ')))].filter(w => w && w !== '-');
    const uniqueModules = [...new Set(transactions.map(t => t.sourceModule))].filter(Boolean);
    const uniqueStatuses = [...new Set(transactions.map(t => t.status))].filter(Boolean);

    // Sorting implementation
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        let valA, valB;
        switch (sortColumn) {
            case 'date':
                valA = new Date(a.date);
                valB = new Date(b.date);
                break;
            case 'amount':
                valA = parseFloat(a.amount || 0);
                valB = parseFloat(b.amount || 0);
                break;
            case 'customerVendor':
                valA = (a.customerVendor || '').toLowerCase();
                valB = (b.customerVendor || '').toLowerCase();
                break;
            case 'account':
                valA = (a.debitAccount || '').toLowerCase();
                valB = (b.debitAccount || '').toLowerCase();
                break;
            case 'voucherNo':
                valA = (a.voucherNo || '').toLowerCase();
                valB = (b.voucherNo || '').toLowerCase();
                break;
            case 'voucherType':
                valA = (a.voucherType || '').toLowerCase();
                valB = (b.voucherType || '').toLowerCase();
                break;
            case 'balance':
                valA = parseFloat(a.runningBalance || 0);
                valB = parseFloat(b.runningBalance || 0);
                break;
            default:
                valA = a[sortColumn];
                valB = b[sortColumn];
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (col) => {
        if (sortColumn !== col) return ' ↕';
        return sortDirection === 'asc' ? ' ▲' : ' ▼';
    };

    // Excel, PDF, CSV Exporters
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        const wsData = [
            [companySettings?.name || "Tab Accounts"],
            [companySettings?.address || ""],
            [`Phone: ${companySettings?.phone || ''} | Email: ${companySettings?.email || ''}`.trim()],
            [],
            ["All Transactions Ledger Report", "", `Period: ${fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Time'}`],
            [],
            ["Date", "Transaction ID", "Voucher Type", "Voucher No", "Debit Account (To)", "Credit Account (From)", "Customer/Vendor", "Items", "Debit", "Credit", "Type", "Running Balance", "Note"],
            ...sortedTransactions.map(row => [
                formatDate(row.date),
                row.transactionId,
                formatVoucherType(row.voucherType),
                row.voucherNo,
                row.debitAccount || '-',
                row.creditAccount || '-',
                row.voucherType === 'JOURNAL' ? '' : (row.customerVendor || '-'),
                row.voucherType === 'JOURNAL' ? '' : (row.items || '-'),
                row.balanceType === 'Debit' ? row.amount : '-',
                row.balanceType === 'Credit' ? row.amount : '-',
                row.balanceType,
                row.runningBalance,
                row.note
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `Transactions_${fromDate || 'all'}_${toDate || 'all'}.xlsx`);
    };

    const exportToCSV = () => {
        const headers = ["Date", "Transaction ID", "Voucher Type", "Voucher No", "Debit Account (To)", "Credit Account (From)", "Customer/Vendor", "Items", "Debit", "Credit", "Type", "Running Balance", "Note"];
        const rows = sortedTransactions.map(row => [
            formatDate(row.date),
            row.transactionId,
            formatVoucherType(row.voucherType),
            row.voucherNo,
            row.debitAccount || '-',
            row.creditAccount || '-',
            row.voucherType === 'JOURNAL' ? '' : (row.customerVendor || '-'),
            row.voucherType === 'JOURNAL' ? '' : (row.items || '-'),
            row.balanceType === 'Debit' ? row.amount : '-',
            row.balanceType === 'Credit' ? row.amount : '-',
            row.balanceType,
            row.runningBalance,
            row.note
        ]);

        const companyInfoStr = `"${(companySettings?.name || 'Tab Accounts').replace(/"/g, '""')}"\n`
            + `"${(companySettings?.address || '').replace(/"/g, '""')}"\n`
            + `"${(companySettings?.phone || '').replace(/"/g, '""')} ${(companySettings?.email || '').replace(/"/g, '""')}"\n\n`
            + `"Report: All Transactions Ledger","Period: ${fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Time'}"\n\n`;

        const csvContent = "data:text/csv;charset=utf-8,"
            + companyInfoStr
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Transactions_${fromDate || 'all'}_${toDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');

        let arabicFontLoaded = false;
        try {
            const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
            const fontResponse = await fetch(fontUrl);
            if (fontResponse.ok) {
                const fontBuffer = await fontResponse.arrayBuffer();
                const uint8Array = new Uint8Array(fontBuffer);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
                }
                const base64Font = btoa(binary);
                doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                arabicFontLoaded = true;
            }
        } catch (e) {
            console.warn('Could not load Amiri Arabic font, PDF will render without Arabic:', e);
        }

        const hasArabic = (text) => {
            if (!text) return false;
            return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
        };

        const makeCell = (text) => {
            if (!arabicFontLoaded || !hasArabic(text)) return text || '-';
            return { content: text, styles: { font: 'Amiri', fontSize: 7 } };
        };

        // --- PDF Header: Logo (left) + Company Info (right) ---
        const pageWidth = doc.internal.pageSize.getWidth();
        let logoEndX = 14;
        const headerTopY = 10;

        if (companySettings?.logo) {
            try {
                doc.addImage(companySettings.logo, 'PNG', 14, headerTopY, 28, 28);
                logoEndX = 14 + 28 + 5;
            } catch (e) {
                console.warn('Could not add logo to PDF:', e);
            }
        }

        // Company name — right-aligned block
        const infoRightX = pageWidth - 14;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(companySettings?.name || 'Tab Accounts', infoRightX, headerTopY + 6, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let infoY = headerTopY + 11;
        if (companySettings?.address) {
            doc.text(companySettings.address, infoRightX, infoY, { align: 'right' });
            infoY += 4;
        }
        if (companySettings?.phone || companySettings?.email) {
            const contactLine = [
                companySettings.phone ? `Phone: ${companySettings.phone}` : '',
                companySettings.email ? `Email: ${companySettings.email}` : ''
            ].filter(Boolean).join('  |  ');
            doc.text(contactLine, infoRightX, infoY, { align: 'right' });
            infoY += 4;
        }
        if (companySettings?.website) {
            doc.text(companySettings.website, infoRightX, infoY, { align: 'right' });
            infoY += 4;
        }
        if (companySettings?.taxNumber) {
            doc.text(`Tax No: ${companySettings.taxNumber}`, infoRightX, infoY, { align: 'right' });
            infoY += 4;
        }

        // Divider line
        const headerBottomY = Math.max(headerTopY + 30, infoY + 2);
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(14, headerBottomY, pageWidth - 14, headerBottomY);

        // Report title — left side
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        let currentY = headerBottomY + 6;
        doc.text('All Transactions Ledger Report', 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 5;
        doc.setFontSize(8);
        doc.text(`Period: ${fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Time'}  |  Generated: ${new Date().toLocaleDateString()}`, 14, currentY);
        currentY += 6;

        const bodyData = sortedTransactions.map(row => {
            return [
                formatDate(row.date),
                row.transactionId,
                formatVoucherType(row.voucherType),
                row.voucherNo,
                row.debitAccount || '-',
                row.creditAccount || '-',
                row.voucherType === 'JOURNAL' ? '' : (row.customerVendor || '-'),
                row.voucherType === 'JOURNAL' ? '' : (row.items || '-'),
                row.balanceType === 'Debit' ? formatCurrency(row.amount) : '-',
                row.balanceType === 'Credit' ? formatCurrency(row.amount) : '-',
                row.balanceType,
                formatCurrency(row.runningBalance),
                makeCell(row.note)
            ];
        });

        autoTable(doc, {
            head: [['Date', 'Txn ID', 'Voucher Type', 'Voucher No', 'Debit Account', 'Credit Account', 'Customer/Vendor', 'Items', 'Debit', 'Credit', 'Type', 'Running Bal', 'Note']],
            body: bodyData,
            startY: currentY,
            theme: 'grid',
            styles: { fontSize: 7 },
            headStyles: { fillColor: [30, 41, 59] },
            didParseCell: (data) => {
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        doc.save(`Transactions_${fromDate || 'all'}_${toDate || 'all'}.pdf`);
    };

    // Pagination Logic
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = sortedTransactions.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(sortedTransactions.length / entriesPerPage);

    const changePage = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleView = (txn) => {
        setSelectedTransaction(txn);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTransaction(null);
    };

    const handleResetAllFilters = () => {
        setSearchTerm('');
        setFromDate('');
        setToDate('');
        setDateRangePreset('ALL');
        setFilterVoucherType('');
        setFilterCustomerVendor('');
        setFilterAccount('');
        setFilterWarehouse('');
        setFilterBalanceType('');
        setFilterSourceModule('');
        setFilterStatus('');
        setMinAmount('');
        setMaxAmount('');
    };

    return (
        <div className="transactions-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="page-title">All Transactions</h1>
                <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
                    {/* <button className="btn-primary" onClick={() => window.print()}>Print</button> */}
                    <div className="export-dropdown-wrapper">
                        <button className="btn-primary" onClick={() => setShowExportOptions(!showExportOptions)}>
                            <Download size={18} /> Export
                        </button>
                        {showExportOptions && (
                            <div className="export-menu">
                                <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>Excel File (.xlsx)</button>
                                <button onClick={() => { exportToCSV(); setShowExportOptions(false); }}>CSV File (.csv)</button>
                                <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>PDF Document (.pdf)</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="transactions-card">
                {/* Advanced Sticky Filter Panel */}
                <div className="sticky-filter-panel" style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                        {/* Search */}
                        <div style={{ flex: '2', minWidth: '300px', position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search by Invoice No, Voucher, Customer, Vendor, Item, SKU, Account, Notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                                style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {/* Date Range Preset */}
                        <div style={{ minWidth: '150px' }}>
                            <select
                                value={dateRangePreset}
                                onChange={(e) => handlePresetChange(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                            >
                                <option value="ALL">All Time</option>
                                <option value="TODAY">Today</option>
                                <option value="YESTERDAY">Yesterday</option>
                                <option value="THIS_WEEK">This Week</option>
                                <option value="THIS_MONTH">This Month</option>
                                <option value="THIS_QUARTER">This Quarter</option>
                                <option value="THIS_YEAR">This Year</option>
                            </select>
                        </div>

                        {/* Custom Date from */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>From:</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => { setFromDate(e.target.value); setDateRangePreset('CUSTOM'); }}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {/* Custom Date to */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>To:</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => { setToDate(e.target.value); setDateRangePreset('CUSTOM'); }}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                        {/* Voucher Type */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterVoucherType}
                                onChange={(e) => setFilterVoucherType(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Voucher Type --</option>
                                {uniqueVoucherTypes.map(vt => (
                                    <option key={vt} value={vt}>{formatVoucherType(vt)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Customer / Vendor */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterCustomerVendor}
                                onChange={(e) => setFilterCustomerVendor(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Customer/Vendor --</option>
                                {uniqueParties.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Name */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterAccount}
                                onChange={(e) => setFilterAccount(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Account Name --</option>
                                {uniqueAccounts.map(ac => (
                                    <option key={ac} value={ac}>{ac}</option>
                                ))}
                            </select>
                        </div>

                        {/* Warehouse */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterWarehouse}
                                onChange={(e) => setFilterWarehouse(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Warehouse --</option>
                                {uniqueWarehouses.map(wh => (
                                    <option key={wh} value={wh}>{wh}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                        {/* Balance Type */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterBalanceType}
                                onChange={(e) => setFilterBalanceType(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Debit / Credit --</option>
                                <option value="Debit">Debit Only</option>
                                <option value="Credit">Credit Only</option>
                            </select>
                        </div>

                        {/* Source Module */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterSourceModule}
                                onChange={(e) => setFilterSourceModule(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Source Module --</option>
                                {uniqueModules.map(sm => (
                                    <option key={sm} value={sm}>{sm}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- Status --</option>
                                {uniqueStatuses.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>
                        </div>

                        {/* Min Amount */}
                        <div style={{ minWidth: '130px', flex: '0.5' }}>
                            <input
                                type="number"
                                placeholder="Min Amount"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {/* Max Amount */}
                        <div style={{ minWidth: '130px', flex: '0.5' }}>
                            <input
                                type="number"
                                placeholder="Max Amount"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {/* Reset All Button */}
                        <button
                            onClick={handleResetAllFilters}
                            style={{
                                height: '40px',
                                padding: '0 20px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Sticky Header Scrollable ERP Table */}
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="transactions-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: '0', zIndex: '10' }}>
                            <tr>
                                <th style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>#</th>
                                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    DATE {renderSortIcon('date')}
                                </th>
                                <th onClick={() => handleSort('transactionId')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    TXN ID {renderSortIcon('transactionId')}
                                </th>
                                <th onClick={() => handleSort('voucherType')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    VOUCHER TYPE {renderSortIcon('voucherType')}
                                </th>
                                <th onClick={() => handleSort('voucherNo')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    VOUCHER NO {renderSortIcon('voucherNo')}
                                </th>
                                <th onClick={() => handleSort('account')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    DEBIT ACCOUNT (TO) {renderSortIcon('account')}
                                </th>
                                <th style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>CREDIT ACCOUNT (FROM)</th>
                                <th onClick={() => handleSort('customerVendor')} style={{ cursor: 'pointer', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    PARTY {renderSortIcon('customerVendor')}
                                </th>
                                <th style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>ITEMS/PRODUCTS</th>
                                <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer', textAlign: 'right', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    DEBIT {renderSortIcon('amount')}
                                </th>
                                <th style={{ textAlign: 'right', backgroundColor: '#1e293b', color: '#f8fafc' }}>CREDIT</th>
                                <th onClick={() => handleSort('balance')} style={{ cursor: 'pointer', textAlign: 'right', backgroundColor: '#1e293b', color: '#f8fafc' }}>
                                    RUNNING BALANCE {renderSortIcon('balance')}
                                </th>
                                <th style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>TYPE</th>
                                <th style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="14" className="text-center p-4 text-gray-500">
                                        Loading transactions...
                                    </td>
                                </tr>
                            ) : currentEntries.map((txn, index) => (
                                <tr key={txn.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td>{indexOfFirstEntry + index + 1}</td>
                                    <td>{formatDate(txn.date)}</td>
                                    <td>
                                        <span style={{ fontWeight: '500', color: '#475569' }}>{txn.transactionId}</span>
                                    </td>
                                    <td className="voucher-type-cell">
                                        <span className="badge-txn-type" style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            backgroundColor: '#f1f5f9',
                                            color: '#334155'
                                        }}>
                                            {formatVoucherType(txn.voucherType)}
                                        </span>
                                    </td>
                                    <td>
                                        {txn.targetId ? (
                                            <div
                                                className="voucher-badge"
                                                onClick={() => handleVoucherRedirect(txn)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                #{txn.voucherNo}
                                            </div>
                                        ) : (
                                            <div
                                                className="voucher-badge disabled"
                                                style={{ cursor: 'default', opacity: 0.6, backgroundColor: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb' }}
                                            >
                                                #{txn.voucherNo}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: '500', color: '#0f172a' }}>{txn.debitAccount || '-'}</td>
                                    <td style={{ fontWeight: '500', color: '#0f172a' }}>{txn.creditAccount || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{txn.voucherType === 'JOURNAL' ? '' : (txn.customerVendor || '-')}</span>
                                            {txn.voucherType !== 'JOURNAL' && txn.customerVendor && txn.customerVendor !== '-' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '600',
                                                    backgroundColor: (txn.customerName && txn.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(txn.voucherType) ? '#dbeafe' : '#fef3c7',
                                                    color: (txn.customerName && txn.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(txn.voucherType) ? '#1e40af' : '#92400e'
                                                }}>
                                                    {(txn.customerName && txn.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(txn.voucherType) ? 'Customer' : 'Vendor'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={txn.voucherType === 'JOURNAL' ? '' : txn.items}>
                                        {txn.voucherType === 'JOURNAL' ? '' : (txn.items || '-')}
                                    </td>
                                    <td className="text-right font-bold App-text-success" style={{ color: '#10b981' }}>
                                        {txn.balanceType === 'Debit' ? formatCurrency(txn.amount) : '-'}
                                    </td>
                                    <td className="text-right font-bold text-danger" style={{ color: '#ef4444' }}>
                                        {txn.balanceType === 'Credit' ? formatCurrency(txn.amount) : '-'}
                                    </td>
                                    <td className="text-right font-bold" style={{ color: txn.runningBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(txn.runningBalance)}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            backgroundColor: txn.balanceType === 'Debit' ? '#f1f5f9' : '#fee2e2',
                                            color: txn.balanceType === 'Debit' ? '#0f172a' : '#991b1b'
                                        }}>
                                            {txn.balanceType}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn btn-view"
                                                title="View Details"
                                                onClick={() => handleView(txn)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {txn.targetId && (
                                                <button
                                                    className="action-btn btn-edit"
                                                    title="Edit Transaction"
                                                    onClick={() => handleVoucherRedirect(txn, true)}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && currentEntries.length === 0 && (
                                <tr>
                                    <td colSpan="14" className="text-center p-4 text-gray-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination section */}
                <div className="pagination-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <p className="pagination-info" style={{ margin: 0 }}>
                            Showing {sortedTransactions.length > 0 ? indexOfFirstEntry + 1 : 0} to {Math.min(indexOfLastEntry, sortedTransactions.length)} of {sortedTransactions.length} entries
                        </p>
                        <div className="entries-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                                value={entriesPerPage}
                                onChange={(e) => {
                                    setEntriesPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="entries-select"
                                style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={250}>250</option>
                            </select>
                            <span className="entries-text">entries per page</span>
                        </div>
                    </div>
                    <div className="pagination-controls">
                        <button
                            className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                            onClick={() => changePage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => changePage(page)}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                            onClick={() => changePage(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* View Modal with detailed accounting structure */}
            {isModalOpen && selectedTransaction && (
                <div className="txn-modal-overlay">
                    <div className="txn-modal-card" style={{ maxWidth: '750px', width: '90%' }}>
                        <div className="txn-modal-header">
                            <h2>Transaction Accounting Ledger</h2>
                            <button className="txn-close-btn" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="txn-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* General Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Transaction ID</span>
                                    <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{selectedTransaction.transactionId}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Date</span>
                                    <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{formatDate(selectedTransaction.date)}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Voucher Reference</span>
                                    <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{selectedTransaction.voucherNo}</strong>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Voucher Type</span>
                                    <span className="badge-txn-type" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>{formatVoucherType(selectedTransaction.voucherType)}</span>
                                </div>
                            </div>

                            {/* Accounting double entry details */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '0.9rem', margin: '0 0 12px 0', color: '#334155', fontWeight: '600' }}>
                                    {selectedTransaction.voucherType === 'JOURNAL' ? 'Journal Voucher Ledger Postings' : 'Double-Entry Journal Posting'}
                                </h3>
                                {selectedTransaction.voucherType === 'JOURNAL' ? (
                                    renderJournalPostings(selectedTransaction)
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Debited Account (To)</span>
                                                <strong>{selectedTransaction.debitAccount || '-'}</strong>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Debit Amount</span>
                                                <strong style={{ color: '#10b981' }}>{selectedTransaction.balanceType === 'Debit' ? formatCurrency(selectedTransaction.amount) : '-'}</strong>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Credited Account (From)</span>
                                                <strong>{selectedTransaction.creditAccount || '-'}</strong>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Credit Amount</span>
                                                <strong style={{ color: '#ef4444' }}>{selectedTransaction.balanceType === 'Credit' ? formatCurrency(selectedTransaction.amount) : '-'}</strong>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Additional Ledger/ERP Metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                {selectedTransaction.voucherType !== 'JOURNAL' && (
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Party (Customer/Vendor):</span>
                                        <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            {selectedTransaction.customerVendor || '-'}
                                            {selectedTransaction.customerVendor && selectedTransaction.customerVendor !== '-' && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '600',
                                                    backgroundColor: (selectedTransaction.customerName && selectedTransaction.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(selectedTransaction.voucherType) ? '#dbeafe' : '#fef3c7',
                                                    color: (selectedTransaction.customerName && selectedTransaction.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(selectedTransaction.voucherType) ? '#1e40af' : '#92400e'
                                                }}>
                                                    {(selectedTransaction.customerName && selectedTransaction.customerName !== '-') || ['SALES_INVOICE', 'SALES_RETURN', 'RECEIPT', 'POS_INVOICE'].includes(selectedTransaction.voucherType) ? 'Customer' : 'Vendor'}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Running Balance:</span>
                                    <span style={{ fontWeight: '700', display: 'block', color: selectedTransaction.runningBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(selectedTransaction.runningBalance)}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Source Module:</span>
                                    <span style={{ fontWeight: '600', display: 'block' }}>{selectedTransaction.sourceModule || '-'}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Currency / Ex. Rate:</span>
                                    <span style={{ fontWeight: '600', display: 'block' }}>{selectedTransaction.currency} (Ex: {selectedTransaction.exchangeRate || '1.0'})</span>
                                </div>
                            </div>

                            {/* Products / Items */}
                            {selectedTransaction.items && selectedTransaction.items !== '-' && (
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Involved Items / Products</span>
                                    <div style={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                    }}>
                                        <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '600px' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Item Name</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>SKU</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Quantity</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Rate</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Discount</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Tax (%)</th>
                                                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: '600' }}>Warehouse</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getItemDetailsList(selectedTransaction).map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx < getItemDetailsList(selectedTransaction).length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                            <td style={{ padding: '8px 12px', fontWeight: '500', color: '#1e293b' }}>{item.name}</td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.sku}</td>
                                                            <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: '500' }}>{item.quantity} {item.unit}</td>
                                                            <td style={{ padding: '8px 12px', color: '#1e293b' }}>{item.price !== '-' ? formatCurrency(parseFloat(item.price)) : '-'}</td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.discount !== '-' && parseFloat(item.discount) > 0 ? `${item.discount}%` : '-'}</td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.tax !== '-' && parseFloat(item.tax) > 0 ? `${item.tax}%` : '-'}</td>
                                                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.warehouse}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Additional Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                {selectedTransaction.voucherType !== 'JOURNAL' && (
                                    <>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Payment Mode:</span>
                                            <span style={{ fontWeight: '600', display: 'block' }}>{selectedTransaction.paymentMethod || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Bank Account:</span>
                                            <span style={{ fontWeight: '600', display: 'block' }}>{selectedTransaction.bankAccount || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Cash Account:</span>
                                            <span style={{ fontWeight: '600', display: 'block' }}>{selectedTransaction.cashAccount || '-'}</span>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status:</span>
                                    <span style={{
                                        fontWeight: '700',
                                        display: 'block',
                                        color: selectedTransaction.status === 'PAID' || selectedTransaction.status === 'COMPLETED' ? '#10b981' : '#eab308'
                                    }}>
                                        {selectedTransaction.status}
                                    </span>
                                </div>
                            </div>

                            {/* Note */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Narration / Note</span>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>
                                    {selectedTransaction.note || '-'}
                                </p>
                            </div>
                        </div>
                        <div className="txn-modal-footer">
                            <button className="txn-btn-close" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;
