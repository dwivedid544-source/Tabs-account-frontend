import React, { useState, useEffect, useContext } from 'react';
import {
    Calendar, Download, Search, Filter,
    ChevronDown, ChevronUp, CheckCircle2,
    BookOpen, Layers, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './JournalEntries.css';

const JournalEntries = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    
    // Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    
    const [selectedLedger, setSelectedLedger] = useState('all');
    const [valueFilter, setValueFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [searchTerm, setSearchTerm] = useState('');

    const [ledgersList, setLedgersList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [expandedEntries, setExpandedEntries] = useState({});
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
        fetchLedgers();
    }, []);

    useEffect(() => {
        fetchJournalEntries();
    }, [startDate, endDate]);

    const fetchLedgers = async () => {
        try {
            const companyId = GetCompanyId();
            if (!companyId) return;
            const res = await chartOfAccountsService.getAllLedgers(companyId);
            if (res.success && Array.isArray(res.data)) {
                setLedgersList(res.data);
            }
        } catch (e) {
            console.error("Error fetching ledgers for journal filter:", e);
        }
    };

    const fetchJournalEntries = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            const params = new URLSearchParams({ companyId });
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await axiosInstance.get(`/reports/journal?${params.toString()}`);
            if (response.data.success) {
                setEntries(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching Journal entries:", error);
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
        setSelectedLedger('all');
        setValueFilter('all');
        setSortBy('newest');
        setSearchTerm('');
    };

    const toggleEntry = (id) => {
        setExpandedEntries(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Dynamic Filter & Sort Logic
    const filteredEntries = entries.filter(entry => {
        const term = searchTerm.toLowerCase();
        const matchSearch = !searchTerm ||
            (entry.voucherNo && entry.voucherNo.toLowerCase().includes(term)) ||
            (entry.narration && entry.narration.toLowerCase().includes(term)) ||
            entry.ledgers.some(l => l.name && l.name.toLowerCase().includes(term));

        const matchLedger = selectedLedger === 'all' ||
            entry.ledgers.some(l => l.name === selectedLedger);

        const totalAmt = entry.ledgers.filter(l => l.nature === 'Debit').reduce((sum, l) => sum + l.amount, 0);
        const matchValue = valueFilter === 'all' ||
            (valueFilter === 'high_value' && totalAmt >= 10000);

        return matchSearch && matchLedger && matchValue;
    }).sort((a, b) => {
        const totalA = a.ledgers.filter(l => l.nature === 'Debit').reduce((sum, l) => sum + l.amount, 0);
        const totalB = b.ledgers.filter(l => l.nature === 'Debit').reduce((sum, l) => sum + l.amount, 0);

        if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'amount_high') return totalB - totalA;
        if (sortBy === 'amount_low') return totalA - totalB;
        return new Date(b.date) - new Date(a.date);
    });

    // Summary Dynamic Calculations
    const totalEntriesCount = filteredEntries.length;
    const totalDebitVolume = filteredEntries.reduce((acc, entry) => {
        return acc + entry.ledgers.filter(l => l.nature === 'Debit').reduce((s, l) => s + l.amount, 0);
    }, 0);
    const totalCreditVolume = filteredEntries.reduce((acc, entry) => {
        return acc + entry.ledgers.filter(l => l.nature === 'Credit').reduce((s, l) => s + l.amount, 0);
    }, 0);
    const isBalanced = Math.abs(totalDebitVolume - totalCreditVolume) < 0.01;

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const dateRangeStr = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'All_Dates';
        const wsData = [
            ["Journal Entries Report", "", `Period: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates'}`],
            [],
            ["Date", "Voucher No", "Particulars", "Debit Amount", "Credit Amount"]
        ];

        filteredEntries.forEach(entry => {
            const entryDate = new Date(entry.date).toLocaleDateString();
            entry.ledgers.forEach((ledger, idx) => {
                const particulars = ledger.nature === 'Credit' ? `To ${ledger.name}` : `${ledger.name} Dr`;
                wsData.push([
                    idx === 0 ? entryDate : "",
                    idx === 0 ? entry.voucherNo : "",
                    particulars,
                    ledger.nature === 'Debit' ? formatCurrency(ledger.amount) : '',
                    ledger.nature === 'Credit' ? formatCurrency(ledger.amount) : ''
                ]);
            });
            wsData.push(["", "", `Narration: ${entry.narration}`, "", ""]);
            wsData.push([]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Journal");
        XLSX.writeFile(wb, `Journal_${dateRangeStr}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const dateRangeStr = (startDate && endDate) ? `${startDate}_to_${endDate}` : 'All_Dates';
        const isArabic = (text) => text && /[\u0600-\u06FF]/.test(text);
        const arrayBufferToBase64 = (buffer) => {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        };

        let arabicFontLoaded = false;
        try {
            const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf';
            const response = await fetch(fontUrl);
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const base64Font = arrayBufferToBase64(buffer);
                doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                arabicFontLoaded = true;
            }
        } catch (e) {
            console.warn('Could not load Amiri Arabic font for PDF export:', e);
        }

        doc.setFontSize(18);
        doc.text('Journal Entries Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates'}`, 14, 22);

        const bodyData = [];
        filteredEntries.forEach(entry => {
            const entryDate = new Date(entry.date).toLocaleDateString();
            entry.ledgers.forEach((ledger, idx) => {
                const isCredit = ledger.nature === 'Credit';
                const fullParticulars = `${isCredit ? 'To ' : ''}${ledger.name}${!isCredit ? ' Dr' : ''}`;
                const hasArabic = isArabic(ledger.name);
                bodyData.push([
                    idx === 0 ? entryDate : "",
                    idx === 0 ? entry.voucherNo : "",
                    hasArabic && arabicFontLoaded
                        ? { content: fullParticulars, styles: { font: 'Amiri', fontStyle: 'normal' } }
                        : fullParticulars,
                    ledger.nature === 'Debit' ? formatCurrency(ledger.amount) : '',
                    ledger.nature === 'Credit' ? formatCurrency(ledger.amount) : ''
                ]);
            });
            bodyData.push([ { content: `Narration: ${entry.narration || ''}`, colSpan: 5, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } } ]);
        });

        autoTable(doc, {
            head: [['Date', 'Voucher No', 'Particulars', 'Debit', 'Credit']],
            body: bodyData,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 41, 59] }
        });

        doc.save(`Journal_${dateRangeStr}.pdf`);
    };

    if (loading && entries.length === 0) return <div className="p-8 text-center text-gray-500 font-medium">Loading Journal Entries...</div>;

    return (
        <div className="journal-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">General Journal Register</h1>
                    <p className="page-subtitle">Complete ledger transactions, debit-credit entries, and narration history</p>
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

            {/* Summary Dynamic Metric Cards */}
            <div className="journal-summary-grid">
                <div className="journal-summary-card blue">
                    <div className="card-content">
                        <span className="card-label">Total Vouchers</span>
                        <h3 className="card-value">{totalEntriesCount}</h3>
                    </div>
                    <div className="card-icon-wrapper"><BookOpen size={22} /></div>
                </div>
                <div className="journal-summary-card green">
                    <div className="card-content">
                        <span className="card-label">Total Debit Volume</span>
                        <h3 className="card-value">{formatCurrency(totalDebitVolume)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><ArrowUpCircle size={22} /></div>
                </div>
                <div className="journal-summary-card purple">
                    <div className="card-content">
                        <span className="card-label">Total Credit Volume</span>
                        <h3 className="card-value">{formatCurrency(totalCreditVolume)}</h3>
                    </div>
                    <div className="card-icon-wrapper"><ArrowDownCircle size={22} /></div>
                </div>
                <div className="journal-summary-card teal">
                    <div className="card-content">
                        <span className="card-label">Audit Status</span>
                        <h3 className="card-value" style={{ fontSize: '1.1rem', color: !isBalanced ? '#dc2626' : '#1e293b' }}>
                            {totalEntriesCount === 0 ? (
                                '0 Vouchers'
                            ) : isBalanced ? (
                                <><CheckCircle2 size={18} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> 100% Balanced</>
                            ) : (
                                `Diff: ${formatCurrency(Math.abs(totalDebitVolume - totalCreditVolume))}`
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
                        <span>Journal Filters</span>
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

                        {(startDate || endDate || selectedLedger !== 'all' || valueFilter !== 'all' || sortBy !== 'newest' || searchTerm) && (
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
                                placeholder="Search by Voucher #, Narration, or Account Name..."
                                className="styled-select"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Account / Ledger</label>
                        <select value={selectedLedger} onChange={(e) => setSelectedLedger(e.target.value)} className="styled-select">
                            <option value="all">All Accounts</option>
                            {ledgersList.map(l => (
                                <option key={l.id} value={l.name}>{l.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Voucher Value</label>
                        <select value={valueFilter} onChange={(e) => setValueFilter(e.target.value)} className="styled-select">
                            <option value="all">All Values</option>
                            <option value="high_value">High Value (≥ ₹10,000)</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Sort Order</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="styled-select">
                            <option value="newest">Date (Newest First)</option>
                            <option value="oldest">Date (Oldest First)</option>
                            <option value="amount_high">Amount (Highest First)</option>
                            <option value="amount_low">Amount (Lowest First)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Entries List */}
            <div className="entries-list">
                {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => {
                        const totalDebit = entry.ledgers.filter(l => l.nature === 'Debit').reduce((sum, l) => sum + l.amount, 0);
                        const isExpanded = expandedEntries[entry.id] !== false;

                        return (
                            <div key={entry.id} className="entry-card">
                                <div className="entry-header">
                                    <div className="header-left">
                                        <div className="date-block">
                                            <span className="date-day">{new Date(entry.date).getDate()}</span>
                                            <span className="date-month">{new Date(entry.date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                        <div className="voucher-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="voucher-no">{entry.voucherNo}</span>
                                                <span className="voucher-type journal">Journal</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {new Date(entry.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="header-right">
                                        <div className="total-block">
                                            <span className="label">Voucher Total</span>
                                            <span className="value">{formatCurrency(totalDebit)}</span>
                                        </div>
                                        <button 
                                            onClick={() => toggleEntry(entry.id)} 
                                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="entry-body">
                                        <table className="journal-table">
                                            <thead>
                                                <tr>
                                                    <th>Particulars (Ledger Account)</th>
                                                    <th className="text-right width-15">Debit Amount</th>
                                                    <th className="text-right width-15">Credit Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entry.ledgers.map((ledger, idx) => (
                                                    <tr key={idx} className={ledger.nature === 'Credit' ? 'credit-row' : ''}>
                                                        <td className="particulars-cell">
                                                            <span className="ledger-name">
                                                                {ledger.nature === 'Credit' ? 'To ' : ''}{ledger.name}
                                                            </span>
                                                            {ledger.nature === 'Debit' && <span className="dr-tag">Dr</span>}
                                                        </td>
                                                        <td className="text-right font-semibold" style={{ color: ledger.nature === 'Debit' ? '#334155' : '#94a3b8' }}>
                                                            {ledger.nature === 'Debit' ? formatCurrency(ledger.amount) : '-'}
                                                        </td>
                                                        <td className="text-right font-semibold" style={{ color: ledger.nature === 'Credit' ? '#2563eb' : '#94a3b8' }}>
                                                            {ledger.nature === 'Credit' ? formatCurrency(ledger.amount) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {entry.narration && (
                                            <div className="narration-box">
                                                <span className="narration-label">Narration:</span> {entry.narration}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div style={{ background: 'white', padding: '3rem', borderRadius: '14px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: '500' }}>
                        No journal entries found matching your filter criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalEntries;
