import React, { useState, useEffect, useContext } from 'react';
import {
    Calendar, Download, Search, Filter,
    CheckCircle2, BookOpen, Layers, ArrowUpCircle, ArrowDownCircle, AlertCircle
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './TrialBalance.css';

const TrialBalance = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);

    // Filter States (Empty by default = ALL DATA)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [zeroBalanceFilter, setZeroBalanceFilter] = useState('show_all');

    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    useEffect(() => {
        fetchTrialBalance();
    }, [startDate, endDate]);

    const fetchTrialBalance = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            const params = new URLSearchParams({ companyId });
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await axiosInstance.get(`/reports/trial-balance?${params.toString()}`);
            if (response.data.success) {
                setAccounts(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching Trial Balance:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
    };

    const handleResetFilters = () => {
        setTempStartDate('');
        setTempEndDate('');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setSelectedGroup('all');
        setZeroBalanceFilter('show_all');
    };

    // Extract unique account group names dynamically
    const uniqueGroupNames = Array.from(new Set(accounts.map(a => a.type).filter(Boolean))).sort();

    // Comprehensive Filter Logic
    const filteredAccounts = accounts.filter(item => {
        // 1. Keyword search match (Account Name, Group Name, or Group Type)
        const term = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.type && item.type.toLowerCase().includes(term)) ||
            (item.groupType && item.groupType.toLowerCase().includes(term));

        // 2. Account Group match
        const groupTerm = selectedGroup.toLowerCase();
        const matchGroup = selectedGroup === 'all' ||
            (item.type && item.type.toLowerCase() === groupTerm) ||
            (item.groupType && item.groupType.toLowerCase().includes(groupTerm)) ||
            (item.type && item.type.toLowerCase().includes(groupTerm));

        // 3. Zero Balance & Nature match
        const hasDebit = (item.debit || 0) > 0;
        const hasCredit = (item.credit || 0) > 0;

        let matchZero = true;
        if (zeroBalanceFilter === 'hide_zero') {
            matchZero = hasDebit || hasCredit;
        } else if (zeroBalanceFilter === 'debit_only') {
            matchZero = hasDebit;
        } else if (zeroBalanceFilter === 'credit_only') {
            matchZero = hasCredit;
        }

        return matchSearch && matchGroup && matchZero;
    });

    const totalDebit = filteredAccounts.reduce((acc, item) => acc + (item.debit || 0), 0);
    const totalCredit = filteredAccounts.reduce((acc, item) => acc + (item.credit || 0), 0);
    const activeAccountsCount = filteredAccounts.length;

    // Check if balanced within small margin of error
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const dateRangeStr = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'All_Dates';

        const wsData = [
            ["Trial Balance Report", "", `Period: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates'}`],
            [],
            ["Account Name", "Account Type", "Debit Amount", "Credit Amount"],
            ...filteredAccounts.map(row => [
                row.name,
                row.type,
                row.debit > 0 ? formatCurrency(row.debit) : '-',
                row.credit > 0 ? formatCurrency(row.credit) : '-'
            ]),
            [],
            ["Total", "", formatCurrency(totalDebit), formatCurrency(totalCredit)]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
        XLSX.writeFile(wb, `Trial_Balance_${dateRangeStr}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dateRangeStr = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'All_Dates';

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
            console.warn('Could not load Amiri Arabic font:', e);
        }

        const hasArabic = (text) => text && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
        const makeCell = (text) => {
            if (!arabicFontLoaded || !hasArabic(text)) return text || '-';
            return { content: text, styles: { font: 'Amiri', fontSize: 9 } };
        };

        const combineName = (item) => item.nameArabic ? `${item.name}\n${item.nameArabic}` : item.name;

        doc.setFontSize(18);
        doc.text('Trial Balance Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates'}`, 14, 22);

        const bodyData = filteredAccounts.map(row => [
            makeCell(combineName(row)),
            row.type,
            row.debit > 0 ? formatCurrency(row.debit) : '-',
            row.credit > 0 ? formatCurrency(row.credit) : '-'
        ]);
        
        bodyData.push([
            { content: 'Total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(totalCredit), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        autoTable(doc, {
            head: [['Account Name', 'Account Type', 'Debit Amount', 'Credit Amount']],
            body: bodyData,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 41, 59] },
            didParseCell: (data) => {
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        doc.save(`Trial_Balance_${dateRangeStr}.pdf`);
    };

    if (loading && accounts.length === 0) return <div className="p-8 text-center text-gray-500 font-medium">Loading Trial Balance...</div>;

    return (
        <div className="trial-balance-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Trial Balance Register</h1>
                    <p className="page-subtitle">Summary of all ledger balances, debit-credit verification, and audit checks</p>
                </div>
                <div className="header-actions">
                    <div className="export-dropdown-wrapper">
                        <button className="btn-primary" onClick={() => setShowExportOptions(!showExportOptions)}>
                            <Download size={16} /> Export
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

            {/* Summary Cards Grid */}
            <div className="tb-summary-grid">
                <div className="tb-summary-card blue">
                    <div className="card-content">
                        <span className="card-label">Total Active Ledgers</span>
                        <h3 className="card-value">{activeAccountsCount}</h3>
                    </div>
                    <div className="card-icon-wrapper"><BookOpen size={22} /></div>
                </div>
                <div className="tb-summary-card green">
                    <div className="card-content">
                        <span className="card-label">Total Debit Balance</span>
                        <h3 className="card-value">{formatCurrency(totalDebit)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><ArrowUpCircle size={22} /></div>
                </div>
                <div className="tb-summary-card purple">
                    <div className="card-content">
                        <span className="card-label">Total Credit Balance</span>
                        <h3 className="card-value">{formatCurrency(totalCredit)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><ArrowDownCircle size={22} /></div>
                </div>
                <div className="tb-summary-card teal">
                    <div className="card-content">
                        <span className="card-label">Audit Status</span>
                        <h3 className="card-value" style={{ fontSize: '1.1rem', color: !isBalanced ? '#dc2626' : '#1e293b' }}>
                            {activeAccountsCount === 0 ? (
                                '0 Accounts'
                            ) : isBalanced ? (
                                <><CheckCircle2 size={18} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> 100% Matched</>
                            ) : (
                                `Diff: ${formatCurrency(Math.abs(totalDebit - totalCredit))}`
                            )}
                        </h3>
                    </div>
                    <div className="card-icon-wrapper"><Layers size={22} /></div>
                </div>
            </div>

            {/* Unified Filter Toolbar Card */}
            <div className="unified-filter-card">
                <div className="filter-card-header">
                    <div className="filter-card-title">
                        <Filter size={18} style={{ color: '#1e293b' }} />
                        <span>Trial Balance Filters</span>
                    </div>
                    <div className="filter-card-actions">
                        <div className="date-picker-group">
                            <div className="date-input-box">
                                <Calendar size={14} className="date-icon" />
                                <span className="date-label">From:</span>
                                <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} className="date-picker-input" />
                            </div>
                            <span className="date-arrow">→</span>
                            <div className="date-input-box">
                                <Calendar size={14} className="date-icon" />
                                <span className="date-label">To:</span>
                                <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} className="date-picker-input" />
                            </div>
                            <button onClick={handleApplyFilters} className="btn-filter-apply">
                                Apply
                            </button>
                        </div>

                        {(startDate || endDate || tempStartDate || tempEndDate || searchTerm || selectedGroup !== 'all' || zeroBalanceFilter !== 'show_all') && (
                            <button onClick={handleResetFilters} className="btn-filter-reset">
                                Reset All
                            </button>
                        )}
                    </div>
                </div>

                <div className="filter-card-grid">
                    <div className="filter-field" style={{ gridColumn: 'span 2' }}>
                        <label className="field-label">Search Keywords</label>
                        <div className="select-with-icon">
                            <Search size={16} className="select-icon" />
                            <input
                                type="text"
                                placeholder="Search Account Name or Group..."
                                className="styled-select"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Account Group</label>
                        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="styled-select">
                            <option value="all">All Groups</option>
                            <optgroup label="Main Categories">
                                <option value="Asset">Assets</option>
                                <option value="Liability">Liabilities</option>
                                <option value="Equity">Equity</option>
                                <option value="Income">Income / Revenue</option>
                                <option value="Expense">Expenses</option>
                            </optgroup>
                            {uniqueGroupNames.length > 0 && (
                                <optgroup label="Specific Account Groups">
                                    {uniqueGroupNames.map(grp => (
                                        <option key={grp} value={grp}>{grp}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Zero Balances & Filter</label>
                        <select value={zeroBalanceFilter} onChange={(e) => setZeroBalanceFilter(e.target.value)} className="styled-select">
                            <option value="show_all">Show All Accounts</option>
                            <option value="hide_zero">Hide Zero Balances</option>
                            <option value="debit_only">Debit Balances Only</option>
                            <option value="credit_only">Credit Balances Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="table-card">
                <div className="table-responsive">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Account Name</th>
                                <th>Account Type / Group</th>
                                <th className="text-right">Debit Balance</th>
                                <th className="text-right">Credit Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map((row) => {
                                    const typeLower = (row.type || '').toLowerCase();
                                    let badgeClass = 'type-badge';
                                    if (typeLower.includes('asset')) badgeClass += ' asset';
                                    else if (typeLower.includes('liab')) badgeClass += ' liability';
                                    else if (typeLower.includes('equity')) badgeClass += ' equity';
                                    else if (typeLower.includes('income') || typeLower.includes('revenue') || typeLower.includes('sale')) badgeClass += ' revenue';
                                    else if (typeLower.includes('expense') || typeLower.includes('cost')) badgeClass += ' expense';

                                    return (
                                        <tr key={row.id}>
                                            <td className="font-medium text-slate-700">{row.name}</td>
                                            <td>
                                                <span className={badgeClass}>
                                                    {row.type}
                                                </span>
                                            </td>
                                            <td className="text-right font-semibold" style={{ color: row.debit > 0 ? '#334155' : '#94a3b8' }}>
                                                {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                                            </td>
                                            <td className="text-right font-semibold" style={{ color: row.credit > 0 ? '#2563eb' : '#94a3b8' }}>
                                                {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center p-8 text-gray-500 font-medium">
                                        No accounts found matching your filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="footer-row">
                                <td colSpan={2} className="text-right uppercase tracking-wider">Total Volume</td>
                                <td className="text-right font-bold" style={{ color: '#334155' }}>{formatCurrency(totalDebit)}</td>
                                <td className="text-right font-bold" style={{ color: '#2563eb' }}>{formatCurrency(totalCredit)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Status Bar */}
            <div className={`status-bar ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                <div className="icon-wrapper">
                    {isBalanced ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                {isBalanced ? (
                    <div className="status-info">
                        <strong>Trial Balance is 100% Matched</strong>
                        <span>Total Debit Balances equal Total Credit Balances across all accounts.</span>
                    </div>
                ) : (
                    <div className="status-info">
                        <strong>Trial Balance Imbalance Detected</strong>
                        <span>Total Debits and Credits do not match. Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrialBalance;
