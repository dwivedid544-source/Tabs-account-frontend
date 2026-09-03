import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar,
    Download, Printer, ArrowUpRight, ArrowDownRight, Percent
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { useContext } from 'react';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './ProfitLoss.css';

const ProfitLoss = () => {
    const { formatCurrency, fetchCompanySettings, companySettings } = useContext(CompanyContext);
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('statement'); // 'dashboard' or 'statement'

    // Data States
    const [summaryData, setSummaryData] = useState({
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        incomeGrowth: 0,
        expenseGrowth: 0,
        profitGrowth: 0,
        profitMargin: 0
    });

    const [chartData, setChartData] = useState([]);
    const [statement, setStatement] = useState(null);
    const [calculations, setCalculations] = useState(null);

    useEffect(() => {
        fetchCompanySettings();
        fetchProfitLoss();
    }, [startDate, endDate]);

    const fetchProfitLoss = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            let query = `/reports/profit-loss?companyId=${companyId}`;
            if (startDate) query += `&startDate=${startDate}`;
            if (endDate) query += `&endDate=${endDate}`;

            const response = await axiosInstance.get(query);
            if (response.data.success && response.data.data) {
                const { summary, chartData, statement, calculations } = response.data.data;
                
                // Calculate Net Profit Margin
                const margin = summary.totalIncome > 0 ? (summary.netProfit / summary.totalIncome * 100).toFixed(1) : 0;
                
                setSummaryData({ ...summary, profitMargin: margin });
                setChartData(chartData.map(item => ({ ...item, profit: (item.income || 0) - (item.expense || 0) })));
                setStatement(statement);
                setCalculations(calculations);
            }
        } catch (error) {
            console.error("❌ Error fetching Profit & Loss report:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!statement) return;
        const wb = XLSX.utils.book_new();

        const allIncomeItems = [
            ...(statement.revenue?.items || []),
            ...(statement.otherIncome?.items || [])
        ].filter(item => item && item.value !== undefined && item.value !== null);
        const totalIncomeValue = allIncomeItems.reduce((sum, item) => sum + (item.value || 0), 0);

        const allExpenseItems = [
            ...(statement.cogs?.items || []),
            ...(statement.operatingExpenses?.items || []),
            ...(statement.otherExpense?.items || [])
        ].filter(item => item && item.value !== undefined && item.value !== null);
        const totalExpenseValue = allExpenseItems.reduce((sum, item) => sum + (item.value || 0), 0);

        const wsData = [
            ["Profit & Loss Statement", "", `Period: ${startDate} to ${endDate}`],
            [],
            ["INCOME ACCOUNTS"],
            ...allIncomeItems.map(i => [i.name, i.value]),
            ["Total Income", "", totalIncomeValue],
            [],
            ["EXPENSE ACCOUNTS"],
            ...allExpenseItems.map(i => [i.name, i.value]),
            ["Total Expenses", "", totalExpenseValue],
            [],
            ["NET PROFIT / (LOSS)", "", totalIncomeValue - totalExpenseValue]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "P&L Statement");
        XLSX.writeFile(wb, `Profit_Loss_Statement_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        if (!statement) return;
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text('Profit & Loss Statement', 14, 15);
        doc.setFontSize(10);
        doc.text(`Period: ${startDate} to ${endDate}`, 14, 22);

        const allIncomeItems = [
            ...(statement.revenue?.items || []),
            ...(statement.otherIncome?.items || [])
        ].filter(item => item && item.value !== undefined && item.value !== null);
        const totalIncomeValue = allIncomeItems.reduce((sum, item) => sum + (item.value || 0), 0);

        const allExpenseItems = [
            ...(statement.cogs?.items || []),
            ...(statement.operatingExpenses?.items || []),
            ...(statement.otherExpense?.items || [])
        ].filter(item => item && item.value !== undefined && item.value !== null);
        const totalExpenseValue = allExpenseItems.reduce((sum, item) => sum + (item.value || 0), 0);

        const rows = [
            [{ content: 'INCOME ACCOUNTS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
            ...allIncomeItems.map(i => [i.name, formatCurrency(i.value)]),
            [{ content: 'Total Income', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalIncomeValue), styles: { fontStyle: 'bold' } }],
            ['', ''],
            [{ content: 'EXPENSE ACCOUNTS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''],
            ...allExpenseItems.map(i => [i.name, formatCurrency(i.value)]),
            [{ content: 'Total Expenses', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalExpenseValue), styles: { fontStyle: 'bold' } }],
            ['', ''],
            [{ content: 'NET PROFIT / (LOSS)', styles: { fontStyle: 'bold', fillColor: [16, 185, 129], textColor: [255, 255, 255] } }, { content: formatCurrency(totalIncomeValue - totalExpenseValue), styles: { fontStyle: 'bold' } }]
        ];

        autoTable(doc, {
            body: rows,
            startY: 30,
            theme: 'plain',
            styles: { fontSize: 9 },
            columnStyles: { 1: { halign: 'right' } }
        });

        doc.save(`Profit_Loss_Statement_${startDate}_to_${endDate}.pdf`);
    };

    const StatementRow = ({ name, value, isTotal = false, isHeader = false, indent = false, totalRevenue = 0, type = '' }) => {
        const percentage = (totalRevenue > 0 && value !== undefined) ? ((value / totalRevenue) * 100).toFixed(1) : null;
        
        // Accounting Logic: Red if it's a negative result or an expense being added
        const isNegative = value < 0;
        const colorClass = isNegative ? 'text-danger' : (isTotal && value > 0 ? 'text-success' : '');

        return (
            <div className={`statement-row ${isTotal ? 'total-row' : ''} ${isHeader ? 'header-row' : ''} ${indent ? 'indent' : ''} type-${type}`}>
                <span className="row-name">
                    {!isHeader && !isTotal && type === 'add' && <span className="math-prefix">+</span>}
                    {!isHeader && !isTotal && type === 'sub' && <span className="math-prefix">-</span>}
                    {name}
                </span>
                <div className="row-data">
                    {percentage !== null && !isHeader && !isTotal && (
                        <span className="row-percentage">{percentage}%</span>
                    )}
                    <span className={`row-value ${colorClass}`}>
                        {value !== undefined ? (
                            isNegative ? `(${formatCurrency(Math.abs(value))})` : formatCurrency(value)
                        ) : ''}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="profit-loss-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profit & Loss Statement</h1>
                    <p className="page-subtitle">Standard financial performance report</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'statement' ? 'active' : ''}`}
                            onClick={() => setViewMode('statement')}
                        >
                            Official Report
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setViewMode('dashboard')}
                        >
                            Dashboard
                        </button>
                    </div>
                    <div className="date-filter-range">
                        <div className="filter-group">
                            <label>From:</label>
                            <input
                                type="date"
                                className="date-input-field"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>To:</label>
                            <input
                                type="date"
                                className="date-input-field"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
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

            {viewMode === 'dashboard' ? (
                <>
                    {/* Summary Cards */}
                    <div className="summary-cards">
                        <div className="kpi-card income">
                            <div className="kpi-icon"><TrendingUp size={24} /></div>
                            <div className="kpi-content">
                                <span className="kpi-label">Total Income</span>
                                <h3 className="kpi-value">{formatCurrency(summaryData.totalIncome)}</h3>
                                <span className={`kpi-trend ${summaryData.incomeGrowth >= 0 ? 'positive' : 'negative'}`}>
                                    {summaryData.incomeGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(summaryData.incomeGrowth)}% vs last year
                                </span>
                            </div>
                        </div>
                        <div className="kpi-card expense">
                            <div className="kpi-icon"><TrendingDown size={24} /></div>
                            <div className="kpi-content">
                                <span className="kpi-label">Total Expenses</span>
                                <h3 className="kpi-value">{formatCurrency(summaryData.totalExpense)}</h3>
                                <span className={`kpi-trend ${summaryData.expenseGrowth <= 0 ? 'positive' : 'negative'}`}>
                                    {summaryData.expenseGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(summaryData.expenseGrowth)}% vs last year
                                </span>
                            </div>
                        </div>
                        <div className="kpi-card margin">
                            <div className="kpi-icon"><Percent size={24} /></div>
                            <div className="kpi-content">
                                <span className="kpi-label">Net Profit Margin</span>
                                <h3 className="kpi-value">{summaryData.profitMargin}%</h3>
                                <span className={`kpi-trend ${summaryData.profitGrowth >= 0 ? 'positive' : 'negative'}`}>
                                    {summaryData.profitGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    Profitability Index
                                </span>
                            </div>
                        </div>
                        <div className="kpi-card profit">
                            <div className="kpi-icon"><DollarSign size={24} /></div>
                            <div className="kpi-content">
                                <span className="kpi-label">Net Profit</span>
                                <h3 className="kpi-value">{formatCurrency(summaryData.netProfit)}</h3>
                                <span className={`kpi-trend ${summaryData.profitGrowth >= 0 ? 'positive' : 'negative'}`}>
                                    {summaryData.profitGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(summaryData.profitGrowth)}% vs last year
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-container">
                        <div className="chart-card main-chart">
                            <h3>Income vs Expense</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#334155" stopOpacity={1} />
                                            </linearGradient>
                                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                                <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="income" name="Income" fill="url(#colorIncome)" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" name="Expense" fill="url(#colorExpense)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-card secondary-chart">
                            <h3>Net Profit Trend</h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="profit" 
                                            stroke="#3b82f6" 
                                            fillOpacity={1} 
                                            fill="url(#colorProfit)" 
                                            name="Net Profit" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="official-statement-card">
                    {loading ? (
                        <div className="loading-state">
                             <div className="spinner"></div>
                             Fetching report data...
                        </div>
                    ) : (statement && calculations) ? (
                        <div className="statement-content">
                            {(() => {
                                const allIncomeItems = [
                                    ...(statement.revenue?.items || []),
                                    ...(statement.otherIncome?.items || [])
                                ].filter(item => item && item.value !== undefined && item.value !== null);
                                const totalIncomeValue = allIncomeItems.reduce((sum, item) => sum + (item.value || 0), 0);

                                const allExpenseItems = [
                                    ...(statement.cogs?.items || []),
                                    ...(statement.operatingExpenses?.items || []),
                                    ...(statement.otherExpense?.items || [])
                                ].filter(item => item && item.value !== undefined && item.value !== null);
                                const totalExpenseValue = allExpenseItems.reduce((sum, item) => sum + (item.value || 0), 0);
                                const netProfitValue = totalIncomeValue - totalExpenseValue;

                                return (
                                    <>
                                        {/* Report Header */}
                                        <div className="report-header-premium">
                                            <div className="company-info-box">
                                                <h2 className="report-company-name">{companySettings?.name || 'Tab Accounts'}</h2>
                                                <p className="report-company-details">{companySettings?.address || 'Company Address'}</p>
                                                <p className="report-company-details">{companySettings?.phone || ''} {companySettings?.email || ''}</p>
                                            </div>
                                            <div className="report-type-box">
                                                <h3 className="report-type-title">Income Statement</h3>
                                                <p className="report-period">For the period {startDate} to {endDate}</p>
                                            </div>
                                        </div>

                                        <div className="statement-table-header">
                                            <span>Account Description</span>
                                            <span>Amount</span>
                                        </div>

                                        {/* Section 1: Income */}
                                        <StatementRow name="INCOME ACCOUNTS" isHeader type="add" />
                                        {allIncomeItems.map(item => (
                                            <StatementRow key={item.id} name={item.name} value={item.value} indent type="add" />
                                        ))}
                                        <StatementRow name="Total Income" value={totalIncomeValue} isTotal type="result" />

                                        <div className="statement-spacer" />

                                        {/* Section 2: Expenses */}
                                        <StatementRow name="EXPENSE ACCOUNTS" isHeader type="sub" />
                                        {allExpenseItems.map(item => (
                                            <StatementRow key={item.id} name={item.name} value={item.value} indent type="sub" />
                                        ))}
                                        <StatementRow name="Total Expenses" value={totalExpenseValue} isTotal type="result" />

                                        <div className="statement-final-spacer" />
                                        <div className="net-income-box-premium">
                                            <div className="net-income-label">
                                                <span className="main-label">NET PROFIT / (LOSS)</span>
                                                <span className="sub-label">Total bottom-line earnings after adjustments</span>
                                            </div>
                                            <div className="net-income-value-wrapper">
                                                <span className={`net-income-value ${netProfitValue < 0 ? 'text-danger' : 'text-success'}`}>
                                                    {netProfitValue < 0 ? `(${formatCurrency(Math.abs(netProfitValue))})` : formatCurrency(netProfitValue)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="loading-state">No financial data found for the period {startDate} to {endDate}.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProfitLoss;
