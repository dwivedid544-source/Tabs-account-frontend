import React, { useState, useEffect } from 'react';
import { Download, Search, Settings } from 'lucide-react';
import './TaxReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TaxReport = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [year, setYear] = useState(new Date().getFullYear());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const [showExportOptions, setShowExportOptions] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
        fetchTaxReport();
    }, [year, startDate, endDate]);

    const fetchTaxReport = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const params = { companyId, year };
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;

                const response = await axiosInstance.get(`/reports/tax`, { params });
                if (response.data.success) {
                    setData(response.data.data);
                }
            }
        } catch (error) {
            console.error("Error fetching Tax report:", error);
        }
    };

    const handleClearFilters = () => {
        setStartDate('');
        setEndDate('');
        setYear(new Date().getFullYear());
    };

    const incomeTaxes = [
        { name: 'Standard Rate (23%)', values: data?.income?.Standard23 || data?.income?.CGST || Array(12).fill(0) },
        { name: 'Reduced Rate (13.5%)', values: data?.income?.Reduced13_5 || data?.income?.SGST || Array(12).fill(0) },
        { name: 'Other Rates (9%/0%)', values: data?.income?.OtherVat || data?.income?.IGST || Array(12).fill(0) },
        { name: 'Total Output VAT', values: data?.income?.TotalVat || Array(12).fill(0) }
    ];

    const expenseTaxes = [
        { name: 'Standard Rate (23%)', values: data?.expense?.Standard23 || data?.expense?.CGST || Array(12).fill(0) },
        { name: 'Reduced Rate (13.5%)', values: data?.expense?.Reduced13_5 || data?.expense?.SGST || Array(12).fill(0) },
        { name: 'Other Rates (9%/0%)', values: data?.expense?.OtherVat || data?.expense?.IGST || Array(12).fill(0) },
        { name: 'Total Input VAT', values: data?.expense?.TotalVat || Array(12).fill(0) }
    ];

    const exportToExcel = () => {
        const worksheetData = [];
        
        // Header info
        worksheetData.push(['TAB ACCOUNTS - VAT Summary Report', '', `Year: ${year}`, startDate ? `Range: ${startDate} to ${endDate}` : 'Full Year']);
        worksheetData.push([]);

        // Income Section
        worksheetData.push(['OUTPUT TAXES (Sales VAT)']);
        worksheetData.push(['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Other Rates', 'Total Output VAT']);
        months.forEach((m, i) => {
            worksheetData.push([
                m,
                data?.income?.Standard23?.[i] || 0,
                data?.income?.Reduced13_5?.[i] || 0,
                data?.income?.OtherVat?.[i] || 0,
                data?.income?.TotalVat?.[i] || 0
            ]);
        });
        
        worksheetData.push([]); // Spacer
        
        // Expense Section
        worksheetData.push(['INPUT TAXES (Purchases VAT)']);
        worksheetData.push(['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Other Rates', 'Total Input VAT']);
        months.forEach((m, i) => {
            worksheetData.push([
                m,
                data?.expense?.Standard23?.[i] || 0,
                data?.expense?.Reduced13_5?.[i] || 0,
                data?.expense?.OtherVat?.[i] || 0,
                data?.expense?.TotalVat?.[i] || 0
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "VAT Summary");
        XLSX.writeFile(wb, `VAT_Summary_${year}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text(`TAB ACCOUNTS - Tax Summary Report`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Year: ${year} ${startDate ? `| Range: ${startDate} to ${endDate}` : ''}`, 14, 22);
        
        // Income Table
        doc.setFontSize(13);
        doc.text('Output Taxes (Sales VAT)', 14, 30);
        const incomeRows = months.map((m, i) => [
            m,
            formatCurrency(data?.income?.Standard23?.[i] || 0),
            formatCurrency(data?.income?.Reduced13_5?.[i] || 0),
            formatCurrency(data?.income?.OtherVat?.[i] || 0),
            formatCurrency(data?.income?.TotalVat?.[i] || 0)
        ]);

        autoTable(doc, {
            head: [['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Other Rates', 'Total Output VAT']],
            body: incomeRows,
            startY: 34,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(13);
        doc.text('Input Taxes (Purchases VAT)', 14, finalY);

        const expenseRows = months.map((m, i) => [
            m,
            formatCurrency(data?.expense?.Standard23?.[i] || 0),
            formatCurrency(data?.expense?.Reduced13_5?.[i] || 0),
            formatCurrency(data?.expense?.OtherVat?.[i] || 0),
            formatCurrency(data?.expense?.TotalVat?.[i] || 0)
        ]);

        autoTable(doc, {
            head: [['Month', 'Standard (23%)', 'Reduced (13.5%)', 'Other Rates', 'Total Input VAT']],
            body: expenseRows,
            startY: finalY + 4,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }
        });

        doc.save(`VAT_Summary_${year}.pdf`);
    };

    return (
        <div className="tax-report-page">
            {/* Unified Top Control Card */}
            <div className="unified-top-card card">
                <div className="top-card-header">
                    <div>
                        <h1 className="page-title">VAT Monthly Summary</h1>
                        <p className="page-subtitle">Monthly breakdown of Output VAT and Input VAT by rate brackets</p>
                    </div>
                    <div className="top-card-actions">
                        <div className="duration-badge">
                            <span>Period:</span>
                            <strong>{startDate && endDate ? `${startDate} to ${endDate}` : `Jan-${year} to Dec-${year}`}</strong>
                        </div>
                        <div className="export-dropdown-wrapper">
                            <button className="btn-download-green" onClick={() => setShowExportOptions(!showExportOptions)} title="Export Report">
                                <Download size={18} />
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

                <div className="top-card-filters">
                    <div className="filter-item">
                        <label>From Date</label>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <label>To Date</label>
                        <input
                            type="date"
                            className="filter-date-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <label>Select Year</label>
                        <select className="filter-select" value={year} onChange={(e) => setYear(e.target.value)}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {(startDate || endDate) && (
                        <div className="filter-item filter-action">
                            <button onClick={handleClearFilters} className="btn-clear-link">
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Income Section */}
            <div className="section-card card mt-6">
                <h3 className="section-title">Income (Output Tax)</h3>
                <div className="table-responsive">
                    <table className="tax-table">
                        <thead>
                            <tr>
                                <th>TAX</th>
                                {months.map(m => <th key={m}>{m.toUpperCase().substr(0, 3)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {incomeTaxes.map((tax, idx) => (
                                <tr key={idx}>
                                    <td className="tax-name">{tax.name}</td>
                                    {tax.values.map((val, vIdx) => (
                                        <td key={vIdx}>
                                            {formatCurrency(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Expense Section */}
            <div className="section-card card mt-6">
                <h3 className="section-title">Expense (Input Tax Credit)</h3>
                <div className="table-responsive">
                    <table className="tax-table">
                        <thead>
                            <tr>
                                <th>TAX</th>
                                {months.map(m => <th key={m}>{m.toUpperCase().substr(0, 3)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {expenseTaxes.map((tax, idx) => (
                                <tr key={idx}>
                                    <td className="tax-name">{tax.name}</td>
                                    {tax.values.map((val, vIdx) => (
                                        <td key={vIdx}>
                                            {formatCurrency(val)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TaxReport;
