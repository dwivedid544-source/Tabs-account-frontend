import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Download, FileText, Printer } from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


import toast from 'react-hot-toast';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import './LedgerReport.css';

const formatVoucherType = (type) => {
    if (!type) return '-';
    const upper = type.toUpperCase();
    if (upper === 'OPENING BALANCE') return 'Opening Balance';
    if (upper === 'POS_INVOICE') return 'POS Invoice';
    if (upper === 'JOURNAL') return 'Journal Entry';
    if (upper === 'INVOICE') return 'Sales Invoice';
    if (upper === 'BILL') return 'Purchase Bill';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

const LedgerReport = () => {
    const { formatCurrency, fetchCompanySettings, companySettings } = useContext(CompanyContext);
    const location = useLocation();
    const navigate = useNavigate();

    const formatDocCurrency = (amount, currencyCode) => {
        try {
            const locale = companySettings?.locale || 'en-US';
            const curr = currencyCode || companySettings?.currency || 'INR';
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: curr
            }).format(amount);
        } catch (e) {
            return `${currencyCode || ''} ${Number(amount).toFixed(2)}`;
        }
    };

    const getTransactionAllAccounts = (target, activeLedgerId) => {
        if (!target) return [];

        let txList = [];
        if (target.items && Array.isArray(target.items)) {
            txList = target.items;
        } else if (Array.isArray(target)) {
            txList = target;
        } else {
            txList = [target];
        }

        const activeId = parseInt(activeLedgerId);
        const list = [];

        const isExcludedAccount = (name) => {
            if (!name) return false;
            const lower = name.toLowerCase().trim();
            return (
                lower.includes('cost of goods sold') ||
                lower === 'cogs' ||
                lower.includes('inventory asset') ||
                lower.includes('inventory stock') ||
                lower.includes('stock in hand') ||
                lower.includes('opening stock') ||
                lower.includes('closing stock')
            );
        };

        txList.forEach(txn => {
            if (txn.journalEntry && txn.journalEntry.transaction) {
                txn.journalEntry.transaction.forEach(t => {
                    const debId = t.debitLedgerId;
                    const credId = t.creditLedgerId;
                    const amt = t.amount;
                    const debName = t.ledger_transaction_debitLedgerIdToledger?.name || t.debitLedger?.name;
                    const credName = t.ledger_transaction_creditLedgerIdToledger?.name || t.creditLedger?.name;

                    if (debId && debId !== activeId && debName && !isExcludedAccount(debName)) {
                        list.push({ name: debName, amount: amt, type: 'Dr' });
                    }
                    if (credId && credId !== activeId && credName && !isExcludedAccount(credName)) {
                        list.push({ name: credName, amount: amt, type: 'Cr' });
                    }
                });
            } else {
                const isDebit = txn.debitLedgerId === activeId;
                const isCredit = txn.creditLedgerId === activeId;

                if (!isDebit && txn.debitLedgerId) {
                    const debName = txn.debitLedger?.name || txn.debitLedgerName || 'Debit Account';
                    if (!isExcludedAccount(debName)) {
                        list.push({ name: debName, amount: txn.amount, type: 'Dr' });
                    }
                }
                if (!isCredit && txn.creditLedgerId) {
                    const credName = txn.creditLedger?.name || txn.creditLedgerName || 'Credit Account';
                    if (!isExcludedAccount(credName)) {
                        list.push({ name: credName, amount: txn.amount, type: 'Cr' });
                    }
                }
            }
        });

        const uniqueMap = new Map();
        list.forEach(item => {
            const key = `${item.name}-${item.type}-${item.amount}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
            }
        });

        return Array.from(uniqueMap.values());
    };

    // State
    const [ledgers, setLedgers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedAccount, setSelectedAccount] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [filterType, setFilterType] = useState('ALL');
    const [hideInvoice, setHideInvoice] = useState(false);
    const [hideReceipt, setHideReceipt] = useState(false);
    const [enableColors, setEnableColors] = useState(true);

    // Filter Panel Options
    const [displayWarehouse, setDisplayWarehouse] = useState(false);
    const [displayItemDetails, setDisplayItemDetails] = useState(false);
    const [displayNarration, setDisplayNarration] = useState(false);
    const [displayBillDetails, setDisplayBillDetails] = useState(false);
    const [displayRefNumber, setDisplayRefNumber] = useState(true);
    const [displayVoucherType, setDisplayVoucherType] = useState(true);
    const [displayRunningBalance, setDisplayRunningBalance] = useState(true);
    const [displayContactInfo, setDisplayContactInfo] = useState(false);
    const [displayTaxDetails, setDisplayTaxDetails] = useState(false);
    const [displayCreatedBy, setDisplayCreatedBy] = useState(false);
    const [displayAmountForAllAccounts, setDisplayAmountForAllAccounts] = useState(false);
    const [displayDiscount, setDisplayDiscount] = useState(false);

    // Hover details popup state
    const [hoveredTxn, setHoveredTxn] = useState(null);

    const getTransactionItems = (txn) => {
        if (!txn) return null;
        if (txn.invoice && txn.invoice.invoiceitem) {
            return txn.invoice.invoiceitem.map(item => ({
                name: item.product?.name || item.service?.name || item.description || 'Unknown Item',
                qty: item.quantity,
                rate: item.rate,
                amount: item.amount,
                warehouseName: item.warehouse?.name || '',
                unit: item.product?.unit || '',
                taxRate: item.taxRate || 0,
                discount: item.discount || 0
            }));
        }
        if (txn.purchaseBill && txn.purchaseBill.purchasebillitem) {
            return txn.purchaseBill.purchasebillitem.map(item => ({
                name: item.product?.name || item.description || 'Unknown Item',
                qty: item.quantity,
                rate: item.rate,
                amount: item.amount,
                warehouseName: item.warehouse?.name || '',
                unit: item.product?.unit || '',
                taxRate: item.taxRate || 0,
                discount: item.discount || 0
            }));
        }
        if (txn.posInvoice && txn.posInvoice.posinvoiceitem) {
            return txn.posInvoice.posinvoiceitem.map(item => ({
                name: item.product?.name || item.description || 'Unknown Item',
                qty: item.quantity,
                rate: item.rate,
                amount: item.amount,
                warehouseName: item.warehouse?.name || '',
                unit: item.product?.unit || '',
                taxRate: item.taxRate || 0,
                discount: item.discount || 0
            }));
        }
        return null;
    };

    const handleMouseEnter = (e, txn, title) => {
        const items = getTransactionItems(txn);
        if (!items || items.length === 0) return;

        const doc = txn?.invoice || txn?.purchaseBill || txn?.posInvoice || txn?.receipt || txn?.payment;

        const itemsSubtotal = items.reduce((sum, i) => sum + (parseFloat(i.amount) || (parseFloat(i.rate || 0) * parseFloat(i.qty || 0))), 0);
        let subtotal = doc?.subtotal || itemsSubtotal;

        let discountAmount = doc?.discountAmount || 0;
        if (!discountAmount && doc?.overallDiscount) {
            if (doc.overallDiscountType === 'percentage') {
                discountAmount = (subtotal * parseFloat(doc.overallDiscount)) / 100;
            } else {
                discountAmount = parseFloat(doc.overallDiscount) || 0;
            }
        }

        let taxAmount = doc?.taxAmount || 0;
        let otherCharges = doc?.otherCharges || 0;

        if (!otherCharges && doc?.customFields) {
            try {
                const cf = typeof doc.customFields === 'string' ? JSON.parse(doc.customFields) : doc.customFields;
                if (Array.isArray(cf?._otherCharges)) {
                    otherCharges = cf._otherCharges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                }
            } catch (err) {}
        }

        const total = doc?.totalAmount || doc?.amount || txn.amount || 0;

        const netCalc = subtotal - discountAmount + taxAmount;
        if (!otherCharges && total > netCalc + 0.01) {
            otherCharges = total - netCalc;
        } else if (!discountAmount && netCalc > total + 0.01 && !taxAmount) {
            discountAmount = subtotal - total;
        }

        const paidAmount = doc?.paidAmount || 0;
        const balanceAmount = doc?.balanceAmount ?? Math.max(0, total - paidAmount);

        setHoveredTxn({
            title,
            items,
            subtotal,
            docCurrency: doc?.currency || companySettings?.currency || 'INR',
            docExRate: doc?.exchangeRate || 1.0,
            discountAmount,
            otherCharges,
            taxAmount,
            total,
            paidAmount,
            balanceAmount,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMouseMove = (e) => {
        if (!hoveredTxn) return;
        setHoveredTxn(prev => prev ? {
            ...prev,
            x: e.clientX,
            y: e.clientY
        } : null);
    };

    const handleMouseLeave = () => {
        setHoveredTxn(null);
    };

    const getPopupPosition = (x, y) => {
        const popupWidth = 380;
        const popupHeight = 250;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Position offset from cursor
        let finalX = x + 15;
        let finalY = y + 15;

        // Flip to left if screen boundary exceeded
        if (finalX + popupWidth > windowWidth) {
            finalX = x - popupWidth - 15;
        }
        // Flip to top if screen boundary exceeded
        if (finalY + popupHeight > windowHeight) {
            finalY = y - popupHeight - 15;
        }

        // Prevent negative values if screen is too small
        finalX = Math.max(10, finalX);
        finalY = Math.max(10, finalY);

        return { left: `${finalX}px`, top: `${finalY}px` };
    };



    // Helper to flatten COA for dropdown
    const flattenLedgers = (coaData) => {
        let flattened = [];
        const traverse = (groups, parentType = null) => {
            groups.forEach(group => {
                const currentType = group.type || parentType;
                if (group.ledger) {
                    group.ledger.forEach(ledger => flattened.push({
                        ...ledger,
                        groupName: group.name,
                        groupType: currentType
                    }));
                }
                if (group.accountsubgroup) {
                    traverse(group.accountsubgroup, currentType);
                }
            });
        };
        traverse(coaData);
        return flattened;
    };

    // Fetch initial data (Ledger List)
    useEffect(() => {
        fetchCompanySettings();
        const fetchLedgers = async () => {
            try {
                // We use getChartOfAccounts to build the dropdown options
                const response = await chartOfAccountsService.getChartOfAccounts();
                if (response.success) {
                    const allLedgers = flattenLedgers(response.data);
                    setLedgers(allLedgers);

                    // Pre-select account if passed via navigation state
                    if (location.state?.accountId) {
                        setSelectedAccount(location.state.accountId);
                    } else if (allLedgers.length > 0) {
                        // Default to first account 
                        setSelectedAccount(allLedgers[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching ledgers:', error);
                toast.error('Failed to load chart of accounts');
            }
        };

        const initDates = () => {
            if (location.state?.startDate && location.state?.endDate) {
                setDateRange({
                    startDate: location.state.startDate,
                    endDate: location.state.endDate
                });
            } else {
                setDateRange({
                    startDate: '',
                    endDate: ''
                });
            }
        };

        fetchLedgers();
        initDates();
    }, [location.state]);

    // Fetch Transactions when Selected Account Changes or Search is clicked
    const fetchTransactions = async () => {
        if (!selectedAccount) return;

        setLoading(true);
        try {
            const companyId = GetCompanyId();
            // NOTE: The service method might need to support date filtering params.
            // Currently assuming getLedgerTransactions fetches all or we filter client side.
            // If backend supports optional query params, we should pass them.
            // For now, fetching all and filtering client side if needed, or assumig backend gives recent.
            const response = await chartOfAccountsService.getLedgerTransactions(selectedAccount, companyId);
            if (response.success) {
                setTransactions(response.data);
            } else {
                setTransactions([]); // Clear or empty
                if (response.message) toast.error(response.message);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            // toast.error('Failed to fetch transactions'); // Optional, to avoid spam
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when selectedAccount changes (optional, or wait for search button)
    useEffect(() => {
        if (selectedAccount) {
            fetchTransactions();
        }
    }, [selectedAccount]);

    const handleSearch = () => {
        fetchTransactions();
    };

    const handleReset = () => {
        setDateRange({
            startDate: '',
            endDate: ''
        });
        setFilterType('ALL');
        setHideInvoice(false);
        setHideReceipt(false);
        setEnableColors(true);
        setDisplayWarehouse(false);
        setDisplayItemDetails(false);
        setDisplayNarration(false);
        setDisplayBillDetails(false);
        setDisplayRefNumber(true);
        setDisplayVoucherType(true);
        setDisplayRunningBalance(true);
        setDisplayContactInfo(false);
        setDisplayTaxDetails(false);
        setDisplayCreatedBy(false);
        setDisplayAmountForAllAccounts(false);
        setDisplayDiscount(false);
        // Optionally reset account or keep it
        fetchTransactions();
    };

    // Process transactions to add running balance
    // Backend might return them sorted, but we ensure sorting by Date
    const [expandedGroups, setExpandedGroups] = useState({});

    const handleDownloadExcel = () => {
        if (!groupedTransactions || groupedTransactions.length === 0) {
            return;
        }

        const currency = companySettings?.currency || 'INR';
        const locale = companySettings?.locale || 'en-US';

        // Format amount with currency symbol
        const fmtAmt = (amount) => {
            if (!amount && amount !== 0) return '';
            try {
                return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
            } catch {
                return `${currency} ${Number(amount).toFixed(2)}`;
            }
        };

        const fmtBalance = (bal) => {
            if (bal === undefined || bal === null) return '';
            try {
                const abs = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Math.abs(bal));
                return `${abs} ${bal >= 0 ? 'Dr' : 'Cr'}`;
            } catch {
                return `${currency} ${Math.abs(bal).toFixed(2)} ${bal >= 0 ? 'Dr' : 'Cr'}`;
            }
        };

        // Build rows for Excel
        const rows = [];

        // Header info rows
        rows.push(['Ledger Summary']);
        rows.push(['Account:', currentLedgerName]);
        rows.push(['Currency:', currency]);
        rows.push([
            'Period:',
            `${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`
        ]);
        rows.push(['Generated:', new Date().toLocaleString()]);
        rows.push([]); // blank spacer

        // Column headers
        rows.push([
            'ACCOUNT NAME',
            'TRANSACTION TYPE',
            'REF NO',
            'DATE',
            `DEBIT (${currency})`,
            `CREDIT (${currency})`,
            'BALANCE'
        ]);

        // Data rows — flatten all groups and their sub-items
        groupedTransactions.forEach(group => {
            const displayType = formatVoucherType(group.typeLabel);
            rows.push([
                currentLedgerName,
                group.items.length > 1 ? `${displayType} (${group.items.length} lines)` : displayType,
                group.refNo || '-',
                group.date ? new Date(group.date).toLocaleDateString() : '-',
                group.totalDebit > 0 ? fmtAmt(group.totalDebit) : '',
                group.totalCredit > 0 ? fmtAmt(group.totalCredit) : '',
                fmtBalance(group.lastBalance)
            ]);
            // Sub-transaction rows (only if there are multiple sub-items to expand)
            if (group.items.length > 1) {
                group.items.forEach(item => {
                    const name = item.partyName !== '-'
                        ? item.partyName
                        : (item.creditLedger?.name || item.debitLedger?.name || '-');
                    rows.push([
                        `  ↳ ${name}`,
                        formatVoucherType(item.voucherType || group.typeLabel),
                        item.refNo || group.refNo || '-',
                        item.dateStr || new Date(item.date).toLocaleDateString(),
                        item.debit > 0 ? fmtAmt(item.debit) : '',
                        item.credit > 0 ? fmtAmt(item.credit) : '',
                        fmtBalance(item.balance)
                    ]);
                });
            }
        });

        // Totals row
        const totalDebit = groupedTransactions.reduce((s, g) => s + (g.totalDebit || 0), 0);
        const totalCredit = groupedTransactions.reduce((s, g) => s + (g.totalCredit || 0), 0);
        rows.push([]);
        rows.push(['TOTALS', '', '', '', fmtAmt(totalDebit), fmtAmt(totalCredit), '']);

        // Create worksheet and workbook
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Style the header columns (bold, wider)
        ws['!cols'] = [
            { wch: 32 }, // Account Name
            { wch: 24 }, // Transaction Type
            { wch: 18 }, // Ref No
            { wch: 14 }, // Date
            { wch: 20 }, // Debit
            { wch: 20 }, // Credit
            { wch: 22 }  // Balance
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ledger Summary');

        const fileName = `Ledger_${currentLedgerName.replace(/\s+/g, '_')}_${currency}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleDownloadPDF = async () => {
        if (!groupedTransactions || groupedTransactions.length === 0) return;

        const doc = new jsPDF({ orientation: 'landscape' });

        // --- Register Arabic Font (Amiri TTF) from CDN ---
        // jsPDF only supports TTF format (not woff/woff2)
        let arabicFontLoaded = false;
        try {
            // Fetch actual TTF binary from jsDelivr (Google Fonts GitHub mirror)
            const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
            const fontResponse = await fetch(fontUrl);
            if (fontResponse.ok) {
                const fontBuffer = await fontResponse.arrayBuffer();
                // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
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

        // Helper: check if text has Arabic characters
        const hasArabic = (text) => {
            if (!text) return false;
            return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
        };

        // Helper: build cell with Arabic + English text
        // Handles: (1) arabicName provided separately, (2) englishName itself contains Arabic
        const makeNameCell = (englishName, arabicName) => {
            if (!arabicFontLoaded) return englishName || '-';
            const nameHasArabic = hasArabic(englishName);
            const hasExtra = arabicName && arabicName.trim().length > 0;
            // No Arabic anywhere - plain string
            if (!nameHasArabic && !hasExtra) return englishName || '-';
            // Build content: englishName on line 1, arabicName on line 2 (if separate)
            const content = hasExtra
                ? `${englishName || '-'}\n${arabicName}`
                : (englishName || '-');
            return { content, styles: { font: 'Amiri', fontSize: 8, lineHeight: 1.5 } };
        };

        // Unused renderArabic kept for reference
        const renderArabic = (text) => {
            if (!text) return '';
            return text;
        };

        // --- Header ---
        // Helper: split text into English-only and Arabic-only segments
        const splitByScript = (text) => {
            if (!text) return [{ text: '', isArabic: false }];
            const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
            const parts = [];
            let lastIndex = 0;
            let match;
            while ((match = arabicRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    parts.push({ text: text.slice(lastIndex, match.index).trim(), isArabic: false });
                }
                parts.push({ text: match[0], isArabic: true });
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
                parts.push({ text: text.slice(lastIndex).trim(), isArabic: false });
            }
            return parts.filter(p => p.text.length > 0);
        };

        // Helper: render mixed English/Arabic text on the SAME line
        // Returns the Y position (same as input y since it's one line)
        const renderMixedText = (text, x, y, fontSize, fontStyle = 'normal') => {
            if (!text) return y;
            if (!arabicFontLoaded || !hasArabic(text)) {
                doc.setFont('helvetica', fontStyle);
                doc.setFontSize(fontSize);
                doc.text(text, x, y);
                return y;
            }
            // Has Arabic: split by script
            const segments = splitByScript(text);
            const englishParts = segments.filter(s => !s.isArabic).map(s => s.text).join(' ').trim();
            const arabicParts = segments.filter(s => s.isArabic).map(s => s.text).join(' ').trim();

            let currentX = x;

            // Render English part
            if (englishParts) {
                doc.setFont('helvetica', fontStyle);
                doc.setFontSize(fontSize);
                doc.text(englishParts, currentX, y);
                currentX += doc.getTextWidth(englishParts) + 5; // 5 units gap
            }

            // Render Arabic part on the SAME line
            if (arabicParts) {
                doc.setFont('Amiri', 'normal');
                doc.setFontSize(fontSize);
                doc.text(arabicParts, currentX, y);
            }

            doc.setFont('helvetica', fontStyle);
            return y;
        };

        if (companySettings?.logo) {
            try {
                doc.addImage(companySettings.logo, 'PNG', 14, 10, 25, 25);
            } catch (e) {
                console.warn("Could not add logo to PDF:", e);
            }
        }

        // Company Name - Now on a single line
        const nameBottomY = renderMixedText(companySettings?.name || 'Ledger Summary', 45, 18, 20, 'bold');

        // Address & Phone
        const infoStartY = nameBottomY + 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(companySettings?.address || '', 45, infoStartY);
        doc.text(`Phone: ${companySettings?.phone || ''} | Email: ${companySettings?.email || ''}`, 45, infoStartY + 5);

        // Divider line
        doc.line(14, 38, 283, 38);

        // Account Ledger - Single line
        const ledgerBottomY = renderMixedText(`Account Ledger: ${currentLedgerName}`, 14, 48, 13, 'bold');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}`, 14, ledgerBottomY + 6);
        doc.text(`Type: ${filterType} | Generated: ${new Date().toLocaleString()}`, 14, ledgerBottomY + 11);

        // --- Currency helpers for PDF ---
        const pdfCurrency = companySettings?.currency || 'INR';
        const pdfLocale = companySettings?.locale || 'en-US';

        const pdfFmtAmt = (amount) => {
            if (!amount && amount !== 0) return '-';
            try {
                return new Intl.NumberFormat(pdfLocale, { style: 'currency', currency: pdfCurrency }).format(amount);
            } catch {
                return `${pdfCurrency} ${Number(amount).toFixed(2)}`;
            }
        };

        const pdfFmtBalance = (bal) => {
            if (bal === undefined || bal === null) return '-';
            try {
                const abs = new Intl.NumberFormat(pdfLocale, { style: 'currency', currency: pdfCurrency }).format(Math.abs(bal));
                return `${abs} ${bal >= 0 ? 'Dr' : 'Cr'}`;
            } catch {
                return `${pdfCurrency} ${Math.abs(bal).toFixed(2)} ${bal >= 0 ? 'Dr' : 'Cr'}`;
            }
        };

        // Add currency label below period info
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Currency: ${pdfCurrency}`, 14, ledgerBottomY + 16);

        // --- Build table body ---
        const tableBody = [];
        groupedTransactions.forEach(group => {
            // Get Arabic name from group or first item
            const arabicName = group.partyNameArabic || group.items[0]?.partyNameArabic || '';

            const displayType = formatVoucherType(group.typeLabel);
            // Summary row - use makeNameCell which checks arabicFontLoaded
            tableBody.push([
                makeNameCell(currentLedgerName, arabicName),
                group.items.length > 1 ? `${displayType} (${group.items.length} lines)` : displayType,
                group.refNo || '-',
                group.date ? new Date(group.date).toLocaleDateString() : '-',
                group.totalDebit > 0 ? pdfFmtAmt(group.totalDebit) : '-',
                group.totalCredit > 0 ? pdfFmtAmt(group.totalCredit) : '-',
                pdfFmtBalance(group.lastBalance)
            ]);
            // Sub-rows (only if there are multiple sub-items to expand)
            if (group.items.length > 1) {
                group.items.forEach(item => {
                    const name = item.partyName !== '-'
                        ? item.partyName
                        : (item.creditLedger?.name || item.debitLedger?.name || '-');
                    const itemArabicName = item.partyNameArabic || '';
                    const nameCell = makeNameCell(`  \u21b3 ${name}`, itemArabicName);
                    tableBody.push([
                        typeof nameCell === 'string'
                            ? { content: nameCell, styles: { textColor: [100, 116, 139], fontSize: 7 } }
                            : nameCell,
                        formatVoucherType(item.voucherType || group.typeLabel),
                        item.refNo || group.refNo || '-',
                        item.dateStr || new Date(item.date).toLocaleDateString(),
                        item.debit > 0 ? pdfFmtAmt(item.debit) : '-',
                        item.credit > 0 ? pdfFmtAmt(item.credit) : '-',
                        pdfFmtBalance(item.balance)
                    ]);
                });
            }
        });

        // Totals row
        const pdfTotalDebit = groupedTransactions.reduce((s, g) => s + (g.totalDebit || 0), 0);
        const pdfTotalCredit = groupedTransactions.reduce((s, g) => s + (g.totalCredit || 0), 0);
        const lastGroup = groupedTransactions[groupedTransactions.length - 1];
        const closingBalance = lastGroup ? lastGroup.lastBalance : 0;
        tableBody.push([
            { content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [30, 41, 59], textColor: 255 } },
            { content: '', styles: { fillColor: [30, 41, 59] } },
            { content: '', styles: { fillColor: [30, 41, 59] } },
            { content: '', styles: { fillColor: [30, 41, 59] } },
            { content: pdfFmtAmt(pdfTotalDebit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [30, 41, 59], textColor: 255 } },
            { content: pdfFmtAmt(pdfTotalCredit), styles: { fontStyle: 'bold', halign: 'right', fillColor: [30, 41, 59], textColor: 255 } },
            { content: pdfFmtBalance(closingBalance), styles: { fontStyle: 'bold', halign: 'right', fillColor: [30, 41, 59], textColor: 255 } }
        ]);

        autoTable(doc, {
            startY: ledgerBottomY + 19,
            margin: { left: 14, right: 14 },
            head: [[
                'ACCOUNT NAME',
                'TRANSACTION TYPE',
                'REF NO',
                'DATE',
                `DEBIT (${pdfCurrency})`,
                `CREDIT (${pdfCurrency})`,
                'BALANCE'
            ]],
            body: tableBody,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Flexible to fill space
                1: { cellWidth: 42 },
                2: { cellWidth: 30 },
                3: { cellWidth: 26 },
                4: { cellWidth: 34, halign: 'right' },
                5: { cellWidth: 34, halign: 'right' },
                6: { cellWidth: 38, halign: 'right' }
            },
            didParseCell: (data) => {
                // Style sub-rows (indented ↳ rows) in grey when no Arabic font
                const cellContent = data.row.raw?.[0];
                const contentStr = typeof cellContent === 'string'
                    ? cellContent
                    : (cellContent?.content?.toString() || '');
                if (contentStr.includes('\u21b3')) {
                    // Only apply grey if not already styled by makeNameCell (Amiri font)
                    const hasCustomFont = typeof cellContent === 'object' && cellContent?.styles?.font;
                    if (!hasCustomFont) {
                        data.cell.styles.textColor = [100, 116, 139];
                        data.cell.styles.fontSize = 7;
                    }
                }
                // Safety: if Amiri font not loaded, override back to helvetica
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        const fileName = `Ledger_${currentLedgerName.replace(/\s+/g, '_')}_${pdfCurrency}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const content = document.querySelector('.Ledger-table-card').innerHTML;
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => s.outerHTML)
            .join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Ledger Report - ${currentLedgerName}</title>
                    ${styles}
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .print-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                        .print-logo { width: 80px; height: 80px; object-fit: contain; }
                        .print-info h1 { margin: 0; color: #1e293b; }
                        .print-info p { margin: 5px 0; color: #64748b; }
                        .Ledger-expand-btn { display: none; }
                        @media print {
                            .Ledger-table { width: 100%; border-collapse: collapse; }
                            .Ledger-table th, .Ledger-table td { border: 1px solid #e2e8f0; padding: 8px; }
                            .Ledger-expand-btn { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        ${companySettings?.logo ? `<img src="${companySettings.logo}" class="print-logo" />` : ''}
                        <div class="print-info">
                            <h1>${companySettings?.name || 'Ledger Report'}</h1>
                            <p>${companySettings?.address || ''}</p>
                            <p>Phone: ${companySettings?.phone || ''} | Email: ${companySettings?.email || ''}</p>
                        </div>
                    </div>
                    <div class="report-meta">
                        <h2>Account Ledger: ${currentLedgerName}</h2>
                        <p>Period: ${dateRange.startDate || 'All'} to ${dateRange.endDate || 'All'}</p>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                    ${content}

                    ${(companySettings?.notes || companySettings?.terms) ? `
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; color: #555;">
                        <div>
                            ${companySettings?.notes ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Notes &amp; Privacy Policy</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.notes}</div>
                            ` : ''}
                        </div>
                        <div>
                            ${companySettings?.terms ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Terms &amp; Conditions</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.terms}</div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <script>
                        window.onload = () => {
                            window.print();
                            // window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const handleVoucherRedirect = (typeLabel, item) => {
        if (!item) return;
        const upperType = typeLabel?.toUpperCase();
        const stateArgs = { type: upperType };

        if ((upperType === 'INVOICE' || upperType === 'SALES_INVOICE' || upperType === 'SALES INVOICE') && item.invoice) {
            navigate('/company/sales/invoice', { state: { ...stateArgs, targetInvoiceId: item.invoice.id, type: 'TAX_INVOICE' } });
        } else if ((upperType === 'BILL' || upperType === 'PURCHASE_BILL' || upperType === 'PURCHASE BILL') && item.purchaseBill) {
            navigate('/company/purchases/bill', { state: { ...stateArgs, targetBillId: item.purchaseBill.id } });
        } else if (upperType === 'RECEIPT') {
            if (item.posInvoice) {
                navigate('/company/pos/all-invoices', { state: { ...stateArgs, targetInvoiceId: item.posInvoice.id } });
            } else if (item.receipt) {
                navigate('/company/sales/payment', { state: { ...stateArgs, targetReceiptId: item.receipt.id } });
            }
        } else if (upperType === 'PAYMENT' && item.payment) {
            navigate('/company/purchases/payment', { state: { ...stateArgs, targetPaymentId: item.payment.id } });
        } else if ((upperType === 'PURCHASE_RETURN' || upperType === 'DEBIT_NOTE') && item.purchaseReturn) {
            navigate('/company/purchases/debit-note', { state: { ...stateArgs, targetReturnId: item.purchaseReturn.id } });
        } else if ((upperType === 'SALES_RETURN' || upperType === 'CREDIT_NOTE') && item.salesReturn) {
            navigate('/company/sales/credit-note', { state: { ...stateArgs, targetReturnId: item.salesReturn.id } });
        } else if ((upperType === 'POS_INVOICE' || upperType === 'POS INVOICE') && item.posInvoice) {
            navigate('/company/pos/all-invoices', { state: { ...stateArgs, targetInvoiceId: item.posInvoice.id } });
        } else if (upperType === 'JOURNAL' && item.journalEntry) {
            navigate('/company/voucher/create', { state: { ...stateArgs, targetJournalId: item.journalEntry.id } });
        } else if (upperType === 'JOURNAL' && item.posInvoice) {
            navigate('/company/pos/all-invoices', { state: { ...stateArgs, targetInvoiceId: item.posInvoice.id } });
        } else if (upperType === 'JOURNAL' && item.invoice) {
            navigate('/company/sales/invoice', { state: { ...stateArgs, targetInvoiceId: item.invoice.id, type: 'TAX_INVOICE' } });
        }
    };

    // Process transactions to add running balance and group them
    const groupedTransactions = React.useMemo(() => {
        if (!transactions || !selectedAccount) return [];

        const currentLedger = ledgers.find(l => l.id == selectedAccount);
        const groupType = currentLedger?.groupType;
        const openingBalance = parseFloat(currentLedger?.openingBalance || 0);

        // Filter transactions if checkboxes are checked
        let filteredTxns = [...transactions];
        if (hideInvoice) {
            filteredTxns = filteredTxns.filter(t => {
                const type = (t.voucherType || '').toUpperCase();
                const isInvoice = type === 'INVOICE' || type === 'POS_INVOICE' || type === 'POS INVOICE' || type === 'SALES_INVOICE' || type === 'BILL' || type === 'PURCHASE_BILL';
                return !isInvoice;
            });
        }
        if (hideReceipt) {
            filteredTxns = filteredTxns.filter(t => {
                const type = (t.voucherType || '').toUpperCase();
                const isReceipt = type === 'RECEIPT' || type === 'PAYMENT';
                return !isReceipt;
            });
        }

        // 1. Sort all transactions by date
        const sorted = filteredTxns.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 2. Calculate individual details and running balance
        let runningBalance = (groupType === 'ASSETS' || groupType === 'EXPENSES')
            ? openingBalance
            : -openingBalance;

        const withDetails = sorted.map(txn => {
            const isDebit = txn.debitLedgerId === parseInt(selectedAccount);
            const isCredit = txn.creditLedgerId === parseInt(selectedAccount);

            const debit = isDebit ? txn.amount : 0;
            const credit = isCredit ? txn.amount : 0;
            runningBalance = runningBalance + debit - credit;

            let partyName = '-';
            let partyNameArabic = '';
            if (txn.invoice?.customer) {
                partyName = txn.invoice.customer.name;
                partyNameArabic = txn.invoice.customer.nameArabic || '';
            }
            else if (txn.purchaseBill?.vendor) {
                partyName = txn.purchaseBill.vendor.name;
                partyNameArabic = txn.purchaseBill.vendor.nameArabic || '';
            }
            else if (txn.receipt?.customer) {
                partyName = txn.receipt.customer.name;
                partyNameArabic = txn.receipt.customer.nameArabic || '';
            }
            else if (txn.payment?.vendor) {
                partyName = txn.payment.vendor.name;
                partyNameArabic = txn.payment.vendor.nameArabic || '';
            }
            else if (txn.purchaseReturn?.vendor) {
                partyName = txn.purchaseReturn.vendor.name;
                partyNameArabic = txn.purchaseReturn.vendor.nameArabic || '';
            }
            else if (txn.salesReturn?.customer) {
                partyName = txn.salesReturn.customer.name;
                partyNameArabic = txn.salesReturn.customer.nameArabic || '';
            }
            else {
                if (isDebit) {
                    partyName = txn.creditLedger?.name || txn.creditAccount?.name || txn.toAccount?.name || txn.creditLedgerName || '-';
                }
                if (isCredit) {
                    partyName = txn.debitLedger?.name || txn.debitAccount?.name || txn.fromAccount?.name || txn.debitLedgerName || '-';
                }
            }

            let typeLabel = txn.voucherType?.toUpperCase() === 'PURCHASE' ? 'BILL' : (txn.voucherType?.toUpperCase() || 'JOURNAL');
            let refNo = txn.voucherNumber;
            if (txn.invoice) {
                typeLabel = 'INVOICE';
                refNo = txn.invoice.invoiceNumber;
            } else if (txn.purchaseBill) {
                typeLabel = 'BILL';
                refNo = txn.purchaseBill.billNumber;
            } else if (txn.receipt) {
                typeLabel = 'RECEIPT';
                refNo = txn.receipt.receiptNumber;
            } else if (txn.payment) {
                typeLabel = 'PAYMENT';
                refNo = txn.payment.paymentNumber;
            } else if (txn.purchaseReturn) {
                typeLabel = 'PURCHASE_RETURN';
                refNo = txn.purchaseReturn.debitNoteNumber || txn.voucherNumber;
            } else if (txn.salesReturn) {
                typeLabel = 'SALES_RETURN';
                refNo = txn.salesReturn.creditNoteNumber || txn.voucherNumber;
            } else if (txn.posInvoice) {
                if (txn.voucherType === 'RECEIPT') {
                    typeLabel = 'RECEIPT';
                } else {
                    typeLabel = 'POS_INVOICE';
                }
                refNo = txn.posInvoice.invoiceNumber;
            } else if (txn.journalEntry) {
                typeLabel = 'JOURNAL';
                refNo = txn.journalEntry.voucherNumber || txn.voucherNumber;
            } else if (txn.voucherType === 'CONTRA') {
                typeLabel = 'CONTRA';
            } else if (txn.voucherType === 'JOURNAL') {
                typeLabel = 'JOURNAL';
            }

            const dateStr = new Date(txn.date).toISOString().split('T')[0];
            const groupKey = `${typeLabel}-${refNo}-${dateStr}`;

            return {
                ...txn,
                debit,
                credit,
                balance: runningBalance,
                partyName,
                partyNameArabic,
                typeLabel,
                refNo,
                groupKey,
                dateStr
            };
        });

        // 3. Filter by Date Range and calculate Opening for the period
        const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        const transactionsBeforePeriod = withDetails.filter(txn => start && new Date(txn.date) < start);
        const openingForPeriod = transactionsBeforePeriod.length > 0
            ? transactionsBeforePeriod[transactionsBeforePeriod.length - 1].balance
            : ((groupType === 'ASSETS' || groupType === 'EXPENSES') ? openingBalance : -openingBalance);

        let filtered = withDetails.filter(txn => {
            const txnDate = new Date(txn.date);
            if (start && txnDate < start) return false;
            if (end && txnDate > end) return false;
            return true;
        });

        // Apply Transaction Type Filter
        if (filterType !== 'ALL') {
            filtered = filtered.filter(txn => txn.typeLabel === filterType);
        }

        // 4. Group consecutive transactions and add Opening Balance Row
        const groups = [];

        // Add Opening Balance Row (only if not filtering by type, or if type is ALL)
        if (filterType === 'ALL') {
            groups.push({
                groupKey: 'OPENING',
                items: [],
                totalDebit: openingForPeriod >= 0 ? Math.abs(openingForPeriod) : 0,
                totalCredit: openingForPeriod < 0 ? Math.abs(openingForPeriod) : 0,
                typeLabel: 'Opening Balance',
                refNo: '-',
                date: dateRange.startDate || (sorted.length > 0 ? sorted[0].date : ''),
                lastBalance: openingForPeriod,
                partyName: 'Opening Balance'
            });
        }

        filtered.forEach(txn => {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.groupKey === txn.groupKey && lastGroup.groupKey !== 'OPENING') {
                lastGroup.items.push(txn);
                lastGroup.totalDebit += txn.debit;
                lastGroup.totalCredit += txn.credit;
                lastGroup.lastBalance = txn.balance;
            } else {
                groups.push({
                    groupKey: txn.groupKey,
                    items: [txn],
                    totalDebit: txn.debit,
                    totalCredit: txn.credit,
                    typeLabel: txn.typeLabel,
                    refNo: txn.refNo,
                    date: txn.dateStr,
                    lastBalance: txn.balance,
                    partyName: txn.partyName,
                    partyNameArabic: txn.partyNameArabic || ''
                });
            }
        });

        return groups;
    }, [transactions, selectedAccount, dateRange, ledgers, filterType, hideInvoice, hideReceipt, enableColors]);

    const currentLedgerName = ledgers.find(l => l.id == selectedAccount)?.name || '';

    const getTransactionColor = (item) => {
        if (!item) return null;
        if (item.typeLabel === 'Opening Balance') return null;

        // Check manualStatus: "manual paid blue"
        const isManual = item.invoice?.manualStatus ||
            item.purchaseBill?.manualStatus ||
            item.receipt?.manualStatus ||
            item.payment?.manualStatus ||
            item.posInvoice?.manualStatus;

        if (isManual) {
            return {
                background: '#dbeafe', // blue-100
                color: '#1e40af'       // blue-800
            };
        }

        // Check Transaction Type: "paid by receipt green"
        const isReceiptOrPayment = ['RECEIPT', 'PAYMENT'].includes(item.typeLabel);
        if (isReceiptOrPayment) {
            return {
                background: '#f1f5f9', // green-100
                color: '#1e293b'       // green-800
            };
        }

        // Invoice/Bill Status checks
        const linkedDoc = item.invoice || item.purchaseBill || item.posInvoice;
        if (linkedDoc) {
            const status = (linkedDoc.status || '').toUpperCase();
            if (status === 'PAID' || status === 'COMPLETED' || status === 'FULLY PAID') {
                return {
                    background: '#f1f5f9', // green-100
                    color: '#1e293b'       // green-800
                };
            }
            if (status === 'PARTIAL' || status === 'PARTIALLY PAID') {
                return {
                    background: '#fef9c3', // yellow-100
                    color: '#854d0e'       // yellow-800
                };
            }
            if (status === 'UNPAID' || status === 'PENDING' || status === 'OVERDUE') {
                return {
                    background: '#fee2e2', // red-100
                    color: '#991b1b'       // red-800
                };
            }
        }

        return null;
    };

    const activeCols = 5 + (displayWarehouse ? 1 : 0) + (displayRunningBalance ? 1 : 0) + (displayNarration ? 1 : 0);

    return (
        <div className="Ledger-report-page">
            <div className="Ledger-page-header">
                <div>
                    <h1 className="Ledger-page-title">Ledger Summary</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="Ledger-btn-download" onClick={handleDownloadExcel} title="Download Excel" style={{ backgroundColor: '#94a3b8' }}>
                        <Download size={18} />
                    </button>
                    <button className="Ledger-btn-download" onClick={handleDownloadPDF} title="Download PDF" style={{ backgroundColor: '#ef4444' }}>
                        <FileText size={18} />
                    </button>
                    <button className="Ledger-btn-download" onClick={handlePrint} title="Print Report" style={{ backgroundColor: '#3b82f6' }}>
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="Ledger-filter-card">
                <div className="Ledger-filter-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        className="Ledger-form-input"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                </div>
                <div className="Ledger-filter-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        className="Ledger-form-input"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                </div>
                <div className="Ledger-filter-group" style={{ flexGrow: 1 }}>
                    <label>Account</label>
                    <div className="Ledger-select-wrapper">
                        <select
                            className="Ledger-form-select"
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                        >
                            <option value="">Select Account</option>
                            {ledgers.map(ledger => (
                                <option key={ledger.id} value={ledger.id}>{ledger.name} - {ledger.groupName}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="Ledger-filter-group" style={{ flexGrow: 1 }}>
                    <label>Transaction Type</label>
                    <div className="Ledger-select-wrapper">
                        <select
                            className="Ledger-form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Types</option>
                            <option value="INVOICE">Sales Invoice</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="PAYMENT">Payment</option>
                            <option value="BILL">Purchase Bill</option>
                            <option value="POS_INVOICE">POS Invoice</option>
                            <option value="SALES_RETURN">Sales Return</option>
                            <option value="PURCHASE_RETURN">Purchase Return</option>
                            <option value="JOURNAL">Journal Entry</option>
                            <option value="EXPENSE">Expense</option>
                            <option value="INCOME">Income</option>
                            <option value="CONTRA">Contra</option>
                        </select>
                    </div>
                </div>
                <div className="Ledger-filter-group" style={{ justifyContent: 'center', minWidth: '130px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', height: '100%', marginTop: 'auto', marginBottom: '8px', fontWeight: '500', color: '#64748b', fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={hideInvoice}
                            onChange={(e) => setHideInvoice(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                        />
                        <span>Hide Invoice/Bill</span>
                    </label>
                </div>
                <div className="Ledger-filter-group" style={{ justifyContent: 'center', minWidth: '140px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', height: '100%', marginTop: 'auto', marginBottom: '8px', fontWeight: '500', color: '#64748b', fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={hideReceipt}
                            onChange={(e) => setHideReceipt(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                        />
                        <span>Hide Receipt/Payment</span>
                    </label>
                </div>
                <div className="Ledger-filter-group" style={{ justifyContent: 'center', minWidth: '150px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', height: '100%', marginTop: 'auto', marginBottom: '8px', fontWeight: '500', color: '#64748b', fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={enableColors}
                            onChange={(e) => setEnableColors(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                        />
                        <span>Color Transactions</span>
                    </label>
                </div>
                <div className="Ledger-filter-actions">
                    <button className="Ledger-btn-search" onClick={handleSearch} title="Search">
                        <Search size={20} />
                    </button>
                    <button className="Ledger-btn-reset" onClick={handleReset} title="Reset">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Filter Panel (Report Display Options) */}
            <div className="Ledger-display-panel">
                <div className="Ledger-panel-title">
                    <span>Display Options</span>
                </div>
                <div className="Ledger-panel-grid">
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayWarehouse}
                            onChange={(e) => setDisplayWarehouse(e.target.checked)}
                        />
                        <span>Display Warehouse</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayItemDetails}
                            onChange={(e) => setDisplayItemDetails(e.target.checked)}
                        />
                        <span>Display Item Details</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayNarration}
                            onChange={(e) => setDisplayNarration(e.target.checked)}
                        />
                        <span>Display Narration</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayBillDetails}
                            onChange={(e) => setDisplayBillDetails(e.target.checked)}
                        />
                        <span>Display Bill Details</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayRefNumber}
                            onChange={(e) => setDisplayRefNumber(e.target.checked)}
                        />
                        <span>Display Reference Number</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayVoucherType}
                            onChange={(e) => setDisplayVoucherType(e.target.checked)}
                        />
                        <span>Display Voucher Type</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayRunningBalance}
                            onChange={(e) => setDisplayRunningBalance(e.target.checked)}
                        />
                        <span>Display Running Balance</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayContactInfo}
                            onChange={(e) => setDisplayContactInfo(e.target.checked)}
                        />
                        <span>Display Contact Information</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayTaxDetails}
                            onChange={(e) => setDisplayTaxDetails(e.target.checked)}
                        />
                        <span>Display Tax Details</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayCreatedBy}
                            onChange={(e) => setDisplayCreatedBy(e.target.checked)}
                        />
                        <span>Display Created By</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayAmountForAllAccounts}
                            onChange={(e) => setDisplayAmountForAllAccounts(e.target.checked)}
                        />
                        <span>Display Amount For All Accounts</span>
                    </label>
                    <label className="Ledger-panel-checkbox-label">
                        <input
                            type="checkbox"
                            className="Ledger-panel-checkbox-input"
                            checked={displayDiscount}
                            onChange={(e) => setDisplayDiscount(e.target.checked)}
                        />
                        <span>Display Discount Details</span>
                    </label>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="Ledger-table-card">
                <table className="Ledger-table">
                    <thead>
                        <tr>
                            <th>ACCOUNT NAME</th>
                            <th>TRANSACTION TYPE</th>
                            <th>TRANSACTION DATE</th>
                            {displayWarehouse && <th className="text-left">WAREHOUSE</th>}
                            {displayNarration && <th className="text-left">NARRATION</th>}
                            <th className="text-right">DEBIT</th>
                            <th className="text-right">CREDIT</th>
                            {displayRunningBalance && <th className="text-right">BALANCE</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={activeCols} className="text-center p-4">Loading transactions...</td></tr>
                        ) : groupedTransactions.length > 0 ? (
                            groupedTransactions.map((group, index) => {
                                const hasItems = getTransactionItems(group.items && group.items[0]) !== null;
                                return (
                                    <React.Fragment key={group.groupKey}>
                                        <tr
                                            className={`${group.items.length > 1 ? 'Ledger-grouped-row' : ''} ${hasItems ? 'Ledger-hoverable-row' : ''}`}
                                            style={enableColors ? (() => {
                                                const colorStyle = getTransactionColor(group.items && group.items[0]);
                                                return colorStyle ? { backgroundColor: colorStyle.background } : null;
                                            })() : null}
                                            onMouseEnter={(e) => handleMouseEnter(e, group.items && group.items[0], `${formatVoucherType(group.typeLabel)} #${group.refNo}`)}
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <td className="font-medium">
                                                {currentLedgerName}
                                                {displayContactInfo && (() => {
                                                    const party = group.items[0]?.invoice?.customer || group.items[0]?.receipt?.customer || group.items[0]?.posInvoice?.customer || group.items[0]?.purchaseBill?.vendor || group.items[0]?.payment?.vendor;
                                                    if (party && (party.phone || party.email)) {
                                                        return (
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                                                                {party.phone || ''} {party.email ? `(${party.email})` : ''}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {displayVoucherType && (
                                                            enableColors ? (
                                                                (() => {
                                                                    const colorStyle = getTransactionColor(group.items && group.items[0]);
                                                                    return (
                                                                        <span
                                                                            style={{
                                                                                color: colorStyle ? colorStyle.color : '#1e293b',
                                                                                fontSize: '0.85rem',
                                                                                fontWeight: '700',
                                                                                display: 'inline-block',
                                                                                textTransform: 'uppercase'
                                                                            }}
                                                                        >
                                                                            {formatVoucherType(group.typeLabel)}
                                                                        </span>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <span style={{ fontWeight: 500 }}>{formatVoucherType(group.typeLabel)}</span>
                                                            )
                                                        )}
                                                    </div>
                                                    {displayRefNumber && group.refNo && group.refNo !== '-' && (
                                                        <span
                                                            style={{ fontSize: '0.75rem', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => {
                                                                if (group.refNo && group.refNo !== '-' && group.items && group.items[0]) {
                                                                    handleVoucherRedirect(group.typeLabel, group.items[0]);
                                                                }
                                                            }}
                                                        >
                                                            #{group.refNo}
                                                        </span>
                                                    )}
                                                    {displayBillDetails && (group.items && (group.items[0]?.invoice || group.items[0]?.purchaseBill || group.items[0]?.posInvoice)) && (
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                            {(() => {
                                                                const doc = group.items[0].invoice || group.items[0].purchaseBill || group.items[0].posInvoice;
                                                                const dueDateStr = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '';
                                                                const status = doc.status || 'Paid';
                                                                return `Status: ${status}${dueDateStr ? ` | Due: ${dueDateStr}` : ''}`;
                                                            })()}
                                                        </span>
                                                    )}
                                                    {displayTaxDetails && (() => {
                                                        const doc = group.items[0]?.invoice || group.items[0]?.purchaseBill || group.items[0]?.posInvoice;
                                                        if (doc && doc.taxAmount > 0) {
                                                            return (
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                    Tax Amount: {formatCurrency(doc.taxAmount)}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    {displayDiscount && (() => {
                                                        const doc = group.items[0]?.invoice || group.items[0]?.purchaseBill || group.items[0]?.posInvoice || group.items[0]?.receipt || group.items[0]?.payment;
                                                        if (doc && doc.discountAmount > 0) {
                                                            return (
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                    Discount Amount: {formatCurrency(doc.discountAmount)}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    {displayCreatedBy && (
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                            Created By: Admin
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{group.date ? new Date(group.date).toLocaleDateString() : '-'}</td>
                                            {displayWarehouse && (
                                                <td>
                                                    {(() => {
                                                        const items = getTransactionItems(group.items && group.items[0]);
                                                        if (items && items.length > 0) {
                                                            const uniqueWarehouses = [...new Set(items.map(i => i.warehouseName).filter(Boolean))];
                                                            return uniqueWarehouses.join(', ') || '-';
                                                        }
                                                        return '-';
                                                    })()}
                                                </td>
                                            )}
                                            {displayNarration && (
                                                <td>{group.items && group.items[0]?.narration || '-'}</td>
                                            )}
                                            <td className="text-right">
                                                {group.totalDebit > 0 ? (
                                                    (() => {
                                                        const mainItem = group.items && group.items[0];
                                                        const doc = mainItem?.invoice || mainItem?.purchaseBill || mainItem?.posInvoice || mainItem?.receipt || mainItem?.payment;
                                                        const docCurrency = doc?.currency;
                                                        const docExRate = doc?.exchangeRate || 1.0;
                                                        if (docCurrency && docCurrency !== (companySettings?.currency || 'INR')) {
                                                            return (
                                                                <div>
                                                                    <div>{formatDocCurrency(group.totalDebit / docExRate, docCurrency)}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ({formatCurrency(group.totalDebit)})
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return formatCurrency(group.totalDebit);
                                                    })()
                                                ) : '-'}
                                            </td>
                                            <td className="text-right">
                                                {group.totalCredit > 0 ? (
                                                    (() => {
                                                        const mainItem = group.items && group.items[0];
                                                        const doc = mainItem?.invoice || mainItem?.purchaseBill || mainItem?.posInvoice || mainItem?.receipt || mainItem?.payment;
                                                        const docCurrency = doc?.currency;
                                                        const docExRate = doc?.exchangeRate || 1.0;
                                                        if (docCurrency && docCurrency !== (companySettings?.currency || 'INR')) {
                                                            return (
                                                                <div>
                                                                    <div>{formatDocCurrency(group.totalCredit / docExRate, docCurrency)}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ({formatCurrency(group.totalCredit)})
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return formatCurrency(group.totalCredit);
                                                    })()
                                                ) : '-'}
                                            </td>
                                            {displayRunningBalance && (
                                                <td className="text-right font-medium">
                                                    {(() => {
                                                        const mainItem = group.items && group.items[0];
                                                        const doc = mainItem?.invoice || mainItem?.purchaseBill || mainItem?.posInvoice || mainItem?.receipt || mainItem?.payment;
                                                        const docCurrency = doc?.currency;
                                                        const docExRate = doc?.exchangeRate || 1.0;
                                                        if (docCurrency && docCurrency !== (companySettings?.currency || 'INR')) {
                                                            return (
                                                                <div>
                                                                    <div>{formatDocCurrency(Math.abs(group.lastBalance) / docExRate, docCurrency)} {group.lastBalance >= 0 ? 'Dr' : 'Cr'}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ({formatCurrency(Math.abs(group.lastBalance))} {group.lastBalance >= 0 ? 'Dr' : 'Cr'})
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return <>{formatCurrency(Math.abs(group.lastBalance))} {group.lastBalance >= 0 ? 'Dr' : 'Cr'}</>;
                                                    })()}
                                                </td>
                                            )}
                                        </tr>
                                        {displayItemDetails && getTransactionItems(group.items && group.items[0]) && (
                                            <tr key={`${group.groupKey}-items`} className="Ledger-items-detail-row" style={{ backgroundColor: '#f8fafc' }}>
                                                <td colSpan={activeCols} style={{ padding: '8px 16px', borderTop: 'none' }}>
                                                    <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '8px' }}>Item Details:</div>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#475569' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>
                                                                    <th style={{ padding: '4px', color: '#1e293b' }}>Item Name</th>
                                                                    <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>Qty</th>
                                                                    <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>Rate</th>
                                                                    <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>Discount</th>
                                                                    <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>Tax</th>
                                                                    <th style={{ padding: '4px', color: '#1e293b' }}>Warehouse</th>
                                                                    <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {getTransactionItems(group.items[0]).map((itm, itmIdx) => (
                                                                    <tr key={itmIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                        <td style={{ padding: '4px', fontWeight: '500', color: '#334155' }}>{itm.name}</td>
                                                                        <td style={{ padding: '4px', textAlign: 'right' }}>{itm.qty} {itm.unit || ''}</td>
                                                                        <td style={{ padding: '4px', textAlign: 'right' }}>{formatCurrency(itm.rate)}</td>
                                                                        <td style={{ padding: '4px', textAlign: 'right' }}>{itm.discount > 0 ? `${itm.discount}%` : '-'}</td>
                                                                        <td style={{ padding: '4px', textAlign: 'right' }}>{itm.taxRate > 0 ? `${itm.taxRate}%` : '-'}</td>
                                                                        <td style={{ padding: '4px' }}>{itm.warehouseName || '-'}</td>
                                                                        <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(itm.amount)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '0.8rem' }}>
                                                            {(() => {
                                                                const doc = group.items[0]?.invoice || group.items[0]?.purchaseBill || group.items[0]?.posInvoice;
                                                                if (!doc) return null;
                                                                return (
                                                                    <>
                                                                        <div><strong>Total:</strong> {formatCurrency(doc.totalAmount)}</div>
                                                                        <div style={{ color: '#334155' }}><strong>Paid:</strong> {formatCurrency(doc.paidAmount)}</div>
                                                                        <div style={{ color: '#dc2626' }}><strong>Due:</strong> {formatCurrency(doc.balanceAmount)}</div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {displayAmountForAllAccounts && (() => {
                                            if (!group.items || group.items.length === 0) return null;
                                            const allAccounts = getTransactionAllAccounts(group, selectedAccount);
                                            if (allAccounts.length === 0) return null;
                                            const mainItem = group.items[0];
                                            const doc = mainItem.invoice || mainItem.purchaseBill || mainItem.posInvoice || mainItem.receipt || mainItem.payment;
                                            const docCurrency = doc?.currency;
                                            const docExRate = doc?.exchangeRate || 1.0;
                                            return (
                                                <tr key={`${group.groupKey}-all-accounts`} className="Ledger-items-detail-row" style={{ backgroundColor: '#f8fafc' }}>
                                                    <td colSpan={activeCols} style={{ padding: '8px 16px', borderTop: 'none' }}>
                                                        <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', maxWidth: '400px' }}>
                                                            <div style={{ fontStyle: 'italic', fontWeight: '700', fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>(As Per Details)</div>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#475569' }}>
                                                                <tbody>
                                                                    {allAccounts.map((acc, accIdx) => {
                                                                        const isForeign = docCurrency && docCurrency !== (companySettings?.currency || 'INR');
                                                                        return (
                                                                            <tr key={accIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                <td style={{ padding: '4px', fontWeight: '500', color: '#334155' }}>{acc.name}</td>
                                                                                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                                                                                    {isForeign ? (
                                                                                        <div>
                                                                                            <div>{formatDocCurrency(acc.amount / docExRate, docCurrency)} {acc.type}</div>
                                                                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                                                ({formatCurrency(acc.amount)} {acc.type})
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>{formatCurrency(acc.amount)} {acc.type}</>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                        {displayBillDetails && (() => {
                                            const mainItem = group.items && group.items[0];
                                            if (!mainItem) return null;
                                            
                                            let allocationsList = [];
                                            let title = '';
                                            let refHeader = 'REFERENCE NO';
                                            
                                            if (mainItem.invoice?.allocations?.length > 0) {
                                                allocationsList = mainItem.invoice.allocations.map(a => ({
                                                    date: a.receipt?.date,
                                                    refNo: a.receipt?.receiptNumber,
                                                    amount: a.amount
                                                }));
                                                title = 'Linked Receipts / Payments Details';
                                                refHeader = 'RECEIPT NO';
                                            } else if (mainItem.purchaseBill?.allocations?.length > 0) {
                                                allocationsList = mainItem.purchaseBill.allocations.map(a => ({
                                                    date: a.payment?.date,
                                                    refNo: a.payment?.paymentNumber,
                                                    amount: a.amount
                                                }));
                                                title = 'Linked Payments Details';
                                                refHeader = 'PAYMENT NO';
                                            } else if (mainItem.receipt?.allocations?.length > 0) {
                                                allocationsList = mainItem.receipt.allocations.map(a => ({
                                                    date: a.invoice?.date,
                                                    refNo: a.invoice?.invoiceNumber,
                                                    amount: a.amount
                                                }));
                                                title = 'Linked Invoices Details';
                                                refHeader = 'INVOICE NO';
                                            } else if (mainItem.payment?.allocations?.length > 0) {
                                                allocationsList = mainItem.payment.allocations.map(a => ({
                                                    date: a.purchasebill?.date,
                                                    refNo: a.purchasebill?.billNumber,
                                                    amount: a.amount
                                                }));
                                                title = 'Linked Bills Details';
                                                refHeader = 'BILL NO';
                                            }

                                            if (allocationsList.length === 0) return null;

                                            return (
                                                <tr key={`${group.groupKey}-bills`} className="Ledger-items-detail-row" style={{ backgroundColor: '#f8fafc' }}>
                                                    <td colSpan={activeCols} style={{ padding: '8px 16px', borderTop: 'none' }}>
                                                        <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#1e293b', marginBottom: '8px' }}>{title}:</div>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#475569' }}>
                                                                <thead>
                                                                    <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>
                                                                        <th style={{ padding: '4px', color: '#1e293b' }}>DATE</th>
                                                                        <th style={{ padding: '4px', color: '#1e293b' }}>{refHeader}</th>
                                                                        <th style={{ padding: '4px', textAlign: 'right', color: '#1e293b' }}>AMOUNT</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {allocationsList.map((alloc, allocIdx) => (
                                                                        <tr key={allocIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                            <td style={{ padding: '4px' }}>{alloc.date ? new Date(alloc.date).toLocaleDateString() : '-'}</td>
                                                                            <td style={{ padding: '4px', fontWeight: '500', color: '#2563eb' }}>{alloc.refNo || '-'}</td>
                                                                            <td style={{ padding: '4px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(alloc.amount)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr><td colSpan={activeCols} className="text-center p-4">No transactions found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {hoveredTxn && (
                <div
                    className="Ledger-hover-popup visible"
                    style={getPopupPosition(hoveredTxn.x, hoveredTxn.y)}
                >
                    <div className="Ledger-popup-header">
                        <span>{hoveredTxn.title}</span>
                    </div>
                    <table className="Ledger-popup-table">
                        <thead>
                            <tr>
                                <th>Maal / Items</th>
                                <th className="text-right">Qty</th>
                                <th className="text-right">Rate</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoveredTxn.items.map((item, idx) => {
                                const isForeign = hoveredTxn.docCurrency && hoveredTxn.docCurrency !== (companySettings?.currency || 'INR');
                                return (
                                    <tr key={idx}>
                                        <td>{item.name}</td>
                                        <td className="text-right">{item.qty}</td>
                                        <td className="text-right">
                                            {isForeign ? (
                                                <div>
                                                    <div>{formatDocCurrency(item.rate, hoveredTxn.docCurrency)}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'normal' }}>
                                                        ({formatCurrency(item.rate * hoveredTxn.docExRate)})
                                                    </div>
                                                </div>
                                            ) : (
                                                formatCurrency(item.rate)
                                            )}
                                        </td>
                                        <td className="text-right">
                                            {isForeign ? (
                                                <div>
                                                    <div>{formatDocCurrency(item.amount, hoveredTxn.docCurrency)}</div>
                                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'normal' }}>
                                                        ({formatCurrency(item.amount * hoveredTxn.docExRate)})
                                                    </div>
                                                </div>
                                            ) : (
                                                formatCurrency(item.amount)
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '8px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        {(() => {
                            const isForeign = hoveredTxn.docCurrency && hoveredTxn.docCurrency !== (companySettings?.currency || 'INR');
                            return (
                                <>
                                    {hoveredTxn.subtotal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Subtotal:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.subtotal, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.subtotal * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.subtotal)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {hoveredTxn.discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Discount:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.discountAmount, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.discountAmount * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.discountAmount)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {hoveredTxn.otherCharges > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Other Charges:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.otherCharges, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.otherCharges * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.otherCharges)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {hoveredTxn.taxAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span>Tax Amount:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.taxAmount, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.taxAmount * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.taxAmount)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #475569' }}>
                                        <span>Total Amount:</span>
                                        <span>
                                            {isForeign ? (
                                                <>{formatDocCurrency(hoveredTxn.total, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.total * hoveredTxn.docExRate)})</>
                                            ) : (
                                                formatCurrency(hoveredTxn.total)
                                            )}
                                        </span>
                                    </div>
                                    {hoveredTxn.paidAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#94a3b8' }}>
                                            <span>Paid Amount:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.paidAmount, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.paidAmount * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.paidAmount)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {hoveredTxn.balanceAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#f87171' }}>
                                            <span>Due Amount:</span>
                                            <span style={{ fontWeight: '600' }}>
                                                {isForeign ? (
                                                    <>{formatDocCurrency(hoveredTxn.balanceAmount, hoveredTxn.docCurrency)} ({formatCurrency(hoveredTxn.balanceAmount * hoveredTxn.docExRate)})</>
                                                ) : (
                                                    formatCurrency(hoveredTxn.balanceAmount)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LedgerReport;
