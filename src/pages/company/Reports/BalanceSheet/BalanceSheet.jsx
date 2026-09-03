import React, { useState, useEffect } from 'react';
import {
    Calendar, Download, Printer, Share2,
    ChevronDown, ChevronRight, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './BalanceSheet.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const BalanceSheet = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState({
        currentAssets: true,
        fixedAssets: true,
        currentLiabilities: true,
        longTermLiabilities: true,
        equity: true
    });

    const [balanceData, setBalanceData] = useState({
        assets: { current: [], fixed: [], total: 0 },
        liabilities: { current: [], longTerm: [], total: 0 },
        equity: { items: [], total: 0 },
        netProfit: 0
    });

    // Date filter state
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const [loading, setLoading] = useState(true);

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        fetchCompanySettings();
        fetchBalanceSheet();
    }, [asOfDate]);

    const fetchBalanceSheet = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (companyId) {
                // Added timestamp to prevent caching of old data
                const response = await axiosInstance.get(`/reports/balance-sheet?companyId=${companyId}&asOfDate=${asOfDate}&t=${new Date().getTime()}`);
                if (response.data.success) {
                    setBalanceData(response.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching balance sheet:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculations - Data comes pre-aggregated but we might want frontend sums for display logic if needed.
    // However, backend sends: { assets: { current: [], fixed: [], total: ... }, liabilities: ..., equity: ... }
    // Let's use backend totals if available, or reduce locally if preferred.
    // The backend sends 'total' for each main category.
    // We can compute sub-totals.

    const totalCurrentAssets = (balanceData.assets?.current || []).reduce((acc, item) => acc + (item.value || 0), 0);
    const totalFixedAssets = (balanceData.assets?.fixed || []).reduce((acc, item) => acc + (item.value || 0), 0);
    const calcTotalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = (balanceData.liabilities?.current || []).reduce((acc, item) => acc + (item.value || 0), 0);
    const totalLongTermLiabilities = (balanceData.liabilities?.longTerm || []).reduce((acc, item) => acc + (item.value || 0), 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = (balanceData.equity?.items || []).reduce((acc, item) => acc + (item.value || 0), 0);
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;

    const isBooksBalanced = Math.abs(calcTotalAssets - totalLiabilitiesEquity) < 0.01;

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        const wsData = [
            ["Balance Sheet"],
            [`As of: ${asOfDate}`],
            [],
            ["ASSETS"],
            ["Current Assets", "", formatCurrency(totalCurrentAssets)]
        ];
        balanceData.assets.current.forEach(item => {
            wsData.push([item.name, formatCurrency(item.value), ""]);
        });
        wsData.push([]);
        wsData.push(["Fixed Assets", "", formatCurrency(totalFixedAssets)]);
        balanceData.assets.fixed.forEach(item => {
            wsData.push([item.name, formatCurrency(item.value), ""]);
        });
        wsData.push([]);
        wsData.push(["Total Assets", "", formatCurrency(calcTotalAssets)]);
        wsData.push([]);
        wsData.push(["LIABILITIES & EQUITY"]);
        wsData.push(["Current Liabilities", "", formatCurrency(totalCurrentLiabilities)]);
        balanceData.liabilities.current.forEach(item => {
            wsData.push([item.name, formatCurrency(item.value), ""]);
        });
        wsData.push([]);
        wsData.push(["Long-term Liabilities", "", formatCurrency(totalLongTermLiabilities)]);
        balanceData.liabilities.longTerm.forEach(item => {
            wsData.push([item.name, formatCurrency(item.value), ""]);
        });
        wsData.push(["Total Liabilities", "", formatCurrency(totalLiabilities)]);
        wsData.push([]);
        wsData.push(["Equity", "", formatCurrency(totalEquity)]);
        balanceData.equity.items.forEach(item => {
            wsData.push([item.name, formatCurrency(item.value), ""]);
        });
        wsData.push([]);
        wsData.push(["Total Liabilities & Equity", "", formatCurrency(totalLiabilitiesEquity)]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
        XLSX.writeFile(wb, `Balance_Sheet_${asOfDate}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');

        // --- Register Arabic Font (Amiri TTF) from CDN ---
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

        // Helper: check if text has Arabic characters
        const hasArabic = (text) => {
            if (!text) return false;
            return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
        };

        // Helper: build cell with Arabic font if needed
        const makeCell = (text) => {
            if (!arabicFontLoaded || !hasArabic(text)) return text || '-';
            return { content: text, styles: { font: 'Amiri', fontSize: 9 } };
        };

        const combineName = (item) => {
            return item.nameArabic ? `${item.name}\n${item.nameArabic}` : item.name;
        };

        doc.setFontSize(18);
        doc.text('Balance Sheet', 14, 15);
        doc.setFontSize(10);
        doc.text(`As of: ${asOfDate}`, 14, 22);

        let finalY = 30;

        // Assets
        doc.setFontSize(12);
        doc.text("Assets", 14, finalY);
        finalY += 5;

        const assetRows = [];
        balanceData.assets.current.forEach(item => {
            assetRows.push([makeCell(combineName(item)), formatCurrency(item.value)]);
        });
        assetRows.push([{ content: 'Total Current Assets', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalCurrentAssets), styles: { fontStyle: 'bold' } }]);
        balanceData.assets.fixed.forEach(item => {
            assetRows.push([makeCell(combineName(item)), formatCurrency(item.value)]);
        });
        assetRows.push([{ content: 'Total Fixed Assets', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalFixedAssets), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
            head: [['Account', 'Amount']],
            body: assetRows,
            startY: finalY,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [16, 185, 129] },
            didParseCell: (data) => {
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text(`Total Assets: ${formatCurrency(calcTotalAssets)}`, 14, finalY);

        finalY += 15;

        // Liabilities & Equity
        doc.setFontSize(12);
        doc.text("Liabilities & Equity", 14, finalY);
        finalY += 5;

        const liabilityRows = [];
        balanceData.liabilities.current.forEach(item => {
            liabilityRows.push([makeCell(combineName(item)), formatCurrency(item.value)]);
        });
        liabilityRows.push([{ content: 'Total Current Liabilities', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalCurrentLiabilities), styles: { fontStyle: 'bold' } }]);
        balanceData.liabilities.longTerm.forEach(item => {
            liabilityRows.push([makeCell(combineName(item)), formatCurrency(item.value)]);
        });
        liabilityRows.push([{ content: 'Total Long-term Liabilities', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalLongTermLiabilities), styles: { fontStyle: 'bold' } }]);
        balanceData.equity.items.forEach(item => {
            liabilityRows.push([makeCell(combineName(item)), formatCurrency(item.value)]);
        });
        liabilityRows.push([{ content: 'Total Equity', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalEquity), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
            head: [['Account', 'Amount']],
            body: liabilityRows,
            startY: finalY,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [239, 68, 68] },
            didParseCell: (data) => {
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.text(`Total Liabilities & Equity: ${formatCurrency(totalLiabilitiesEquity)}`, 14, finalY);

        doc.save(`Balance_Sheet_${asOfDate}.pdf`);
    };

    // Helper Components for clean render
    const SectionHeader = ({ title, sectionKey, total, expanded, onToggle }) => (
        <div className="bs-section-header" onClick={() => onToggle(sectionKey)}>
            <div className="bs-flex-center">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="bs-section-title-text">{title}</span>
            </div>
            <span className="bs-section-total">{formatCurrency(total)}</span>
        </div>
    );

    const RowItem = ({ item }) => {
        const isNegative = item.value < 0;
        return (
            <div
                className={`bs-row ${item.id ? 'clickable-row' : ''}`}
                style={{ cursor: item.id ? 'pointer' : 'default' }}
                onClick={() => {
                    if (item.id) {
                        navigate('/company/reports/ledger', { state: { accountId: item.id } });
                    }
                }}
            >
                <span className="bs-row-name" style={{ color: item.id ? '#2563eb' : 'inherit', textDecoration: 'none' }}>
                    {item.name}
                </span>
                <span className={`bs-row-value ${isNegative ? 'text-danger' : ''}`}>
                    {isNegative ? `(${formatCurrency(Math.abs(item.value))})` : formatCurrency(item.value)}
                </span>
            </div>
        );
    };

    return (
        <div className="bs-page">
            <div className="bs-header">
                <div>
                    <h1 className="bs-title">Balance Sheet</h1>
                    <p className="bs-subtitle">Statement of financial position as of Today</p>
                </div>
                <div className="bs-actions">
                    <div className="bs-date-wrapper">
                        <Calendar size={16} />
                        <span className="text-gray-500 mr-2">As of:</span>
                        <input
                            type="date"
                            className="bs-date-input"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                        />
                    </div>
                    <div className="export-dropdown-wrapper">
                        <button className="bs-btn-primary" onClick={() => setShowExportOptions(!showExportOptions)}>
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

            <div className="bs-sheet-container">
                {/* Assets Column */}
                <div className="bs-column">
                    <h2 className="bs-col-header assets">Assets</h2>

                    <div className="bs-card">
                        <SectionHeader
                            title="Current Assets"
                            sectionKey="currentAssets"
                            total={totalCurrentAssets}
                            expanded={expandedSections.currentAssets}
                            onToggle={toggleSection}
                        />
                        {expandedSections.currentAssets && (
                            <div className="bs-section-content">
                                {balanceData.assets.current.length > 0 ? (
                                    balanceData.assets.current.map((item, idx) => <RowItem key={idx} item={item} />)
                                ) : <div className="text-gray-400 italic pl-8 py-1">No current assets</div>}
                            </div>
                        )}

                        <div className="bs-divider"></div>

                        <SectionHeader
                            title="Fixed Assets"
                            sectionKey="fixedAssets"
                            total={totalFixedAssets}
                            expanded={expandedSections.fixedAssets}
                            onToggle={toggleSection}
                        />
                        {expandedSections.fixedAssets && (
                            <div className="bs-section-content">
                                {balanceData.assets.fixed.length > 0 ? (
                                    balanceData.assets.fixed.map((item, idx) => <RowItem key={idx} item={item} />)
                                ) : <div className="text-gray-400 italic pl-8 py-1">No fixed assets</div>}
                            </div>
                        )}

                        <div className="bs-total-row main">
                            <div className="bs-row-line top">
                                <span className="bs-label-total">Total</span>
                                <span className="bs-total-amount">{formatCurrency(calcTotalAssets)}</span>
                            </div>
                            <div className="bs-row-line bottom">
                                <span className="bs-label-section">Assets</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="bs-column">
                    <h2 className="bs-col-header liabilities">Liabilities & Equity</h2>

                    <div className="bs-card">
                        <SectionHeader
                            title="Current Liabilities"
                            sectionKey="currentLiabilities"
                            total={totalCurrentLiabilities}
                            expanded={expandedSections.currentLiabilities}
                            onToggle={toggleSection}
                        />
                        {expandedSections.currentLiabilities && (
                            <div className="bs-section-content">
                                {balanceData.liabilities.current.length > 0 ? (
                                    balanceData.liabilities.current.map((item, idx) => <RowItem key={idx} item={item} />)
                                ) : <div className="text-gray-400 italic pl-8 py-1">No current liabilities</div>}
                            </div>
                        )}

                        <SectionHeader
                            title="Long-term Liabilities"
                            sectionKey="longTermLiabilities"
                            total={totalLongTermLiabilities}
                            expanded={expandedSections.longTermLiabilities}
                            onToggle={toggleSection}
                        />
                        {expandedSections.longTermLiabilities && (
                            <div className="bs-section-content">
                                {balanceData.liabilities.longTerm.length > 0 ? (
                                    balanceData.liabilities.longTerm.map((item, idx) => <RowItem key={idx} item={item} />)
                                ) : <div className="text-gray-400 italic pl-8 py-1">No long-term liabilities</div>}
                            </div>
                        )}

                        <div className="bs-total-row sub">
                            <span>Total Liabilities</span>
                            <span>{formatCurrency(totalLiabilities)}</span>
                        </div>

                        <div className="bs-divider"></div>

                        <SectionHeader
                            title="Equity"
                            sectionKey="equity"
                            total={totalEquity}
                            expanded={expandedSections.equity}
                            onToggle={toggleSection}
                        />
                        {expandedSections.equity && (
                            <div className="bs-section-content">
                                {balanceData.equity.items.map((item, idx) => <RowItem key={idx} item={item} />)}
                            </div>
                        )}

                        <div className="bs-total-row main">
                            <div className="bs-row-line top">
                                <span className="bs-label-total">Total</span>
                                <span className="bs-total-amount">{formatCurrency(totalLiabilitiesEquity)}</span>
                            </div>
                            <div className="bs-row-line bottom">
                                <span className="bs-label-section">Liabilities & Equity</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Check Balance Status */}
            <div className={`bs-status ${isBooksBalanced ? 'status-balanced' : 'status-unbalanced'}`}>
                {isBooksBalanced ? (
                    <>
                        <div className="bs-status-icon success"><TrendingUp size={20} /></div>
                        <div className="bs-status-text">
                            <h4>Books are Balanced</h4>
                            <p>Total Assets align perfectly with Total Liabilities & Equity.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bs-status-icon error">!</div>
                        <div className="bs-status-text">
                            <h4>Discrepancy Detected</h4>
                            <p>Assets do not equal Liabilities + Equity. Please review entries.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BalanceSheet;
