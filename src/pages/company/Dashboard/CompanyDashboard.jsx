import React, { useState, useEffect, useContext } from 'react';
import { CompanyContext } from '../../../context/CompanyContext';
import { useTranslation } from '../../../context/LanguageContext';
import {
    ShoppingBag,
    FileText,
    FileSpreadsheet,
    Users,
    User,
    Briefcase,
    TrendingUp,
    TrendingDown,
    Activity,
    Package
} from 'lucide-react';
import dashboardService from '../../../services/dashboardService';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import './CompanyDashboard.css';

import GetCompanyId from '../../../api/GetCompanyId';

const DashboardProductImage = ({ src, alt }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className="list-img-placeholder">
                <Package size={20} color="#64748b" />
            </div>
        );
    }

    return (
        <img
            src={src}
            className="list-img"
            alt={alt}
            onError={() => setError(true)}
        />
    );
};

const DashboardCustomerImage = ({ src, alt }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return (
            <div className="list-img-placeholder">
                <User size={20} color="#64748b" />
            </div>
        );
    }

    return (
        <img
            src={src}
            className="list-img"
            alt={alt}
            onError={() => setError(true)}
        />
    );
};

const CompanyDashboard = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const { t } = useTranslation();
    const companyId = GetCompanyId();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        customerCount: 0,
        vendorCount: 0,
        productCount: 0,
        saleInvoiceCount: 0,
        purchaseBillCount: 0,
        recentTransactions: [],
        chartData: [],
        topProducts: [],
        lowStockProducts: [],
        topCustomers: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const response = await dashboardService.getCompanyStats();
                if (response.success) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // const formatCurrency = (val) => {
    //     return new Intl.NumberFormat('en-IN', {
    //         style: 'currency',
    //         currency: 'INR'
    //     }).format(val);
    // };

    return (
        <div className="company-dashboard">
            <div className="dashboard-header">
                <div className="dashboard-title">{t('Tab Accounts Dashboard')}</div>
            </div>

            {/* Top Metrics Grid */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-info">
                        <h3>{formatCurrency(stats.totalRevenue)}</h3>
                        <p>{t('Total Revenue')}</p>
                    </div>
                    <div className="metric-icon" style={{ backgroundColor: "#d2fae1ff" }}>
                        <TrendingUp size={24} color="#334155" />
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-info">
                        <h3>{formatCurrency(stats.totalExpenses)}</h3>
                        <p>{t('Total Expenses')}</p>
                    </div>
                    <div className="metric-icon" style={{ backgroundColor: "#fef2f2ff" }}>
                        <TrendingDown size={24} color="#dc2626" />
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-info">
                        <h3>{formatCurrency(stats.netProfit)}</h3>
                        <p>{t('Net Profit')}</p>
                    </div>
                    <div className="metric-icon" style={{ backgroundColor: "#e0e7ffff" }}>
                        <FileSpreadsheet size={24} color="#2563eb" />
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-info">
                        <h3>{stats.recentTransactions.length}</h3>
                        <p>{t('Recent Activities')}</p>
                    </div>
                    <div className="metric-icon icon-yellow">
                        <Activity size={24} color="#ca8a04" />
                    </div>
                </div>
            </div>

            {/* Counts Grid */}
            <div className="secondary-metrics-grid">
                <div className="secondary-card">
                    <div className="secondary-info">
                        <h4>{stats.customerCount}</h4>
                        <span>{t('Customers')}</span>
                    </div>
                    <div className="secondary-icon text-warning">
                        <Users size={24} color="#f59e0b" />
                    </div>
                </div>
                <div className="secondary-card">
                    <div className="secondary-info">
                        <h4>{stats.vendorCount}</h4>
                        <span>{t('Vendors')}</span>
                    </div>
                    <div className="secondary-icon text-info">
                        <Briefcase size={24} color="#3b82f6" />
                    </div>
                </div>
                <div className="secondary-card">
                    <div className="secondary-info">

                        <h4>{stats.purchaseBillCount}</h4>
                        <span>{t('Purchase Bills')}</span>
                    </div>
                    <div className="secondary-icon App-text-primary">
                        <FileText size={24} color="#1e293b" />
                    </div>
                </div>
                <div className="secondary-card">
                    <div className="secondary-info">
                        <h4>{stats.saleInvoiceCount}</h4>
                        <span>{t('Sales Invoices')}</span>
                    </div>
                    <div className="secondary-icon App-text-success">
                        <FileText size={24} color="#10b981" />
                    </div>
                </div>
            </div>

            {/* Sales & Purchase Report Chart */}
            <div className="charts-section">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">{t('Sales & Purchase Report')}</h3>

                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => Number(value).toFixed(2)}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="expense" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} name={t('Purchase/Expense')} />
                                <Bar dataKey="revenue" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} name={t('Sales/Revenue')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Widgets Grid */}
            <div className="widgets-grid">
                {/* Top Selling Products */}
                <div className="list-card">
                    <div className="list-header" style={{ borderLeftColor: '#10b981' }}>
                        <div className="list-title">Top Selling Products</div>
                    </div>
                    <div className="list-body">
                        {stats.topProducts.length > 0 ? (
                            <div className="data-list">
                                {stats.topProducts.map((p, i) => (
                                    <div key={i} className="list-item">
                                        <div className="list-info">
                                            <DashboardProductImage src={p.image} alt={p.name} />
                                            <div className="list-details">
                                                <span className="list-name">{p.name}</span>
                                                <span className="list-sub">{formatCurrency(p.salePrice)}</span>
                                            </div>
                                        </div>
                                        <div className="list-value">{p.quantity} sold</div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="empty-message">No sales data yet</p>}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="list-card">
                    <div className="list-header" style={{ borderLeftColor: '#3b82f6' }}>
                        <div className="list-title">Recent Transactions</div>
                    </div>
                    <div className="list-body">
                        {stats.recentTransactions.length > 0 ? (
                            <div className="recent-list">
                                {stats.recentTransactions.map((tx, idx) => (
                                    <div key={idx} className="recent-item">
                                        <div className="recent-info">
                                            <p className="recent-desc">{tx.description || tx.type}</p>
                                            <p className="recent-date">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`recent-amount ${['INCOME', 'SALES_INVOICE', 'SALES', 'POS_INVOICE', 'RECEIPT'].includes(tx.type) ? 'App-text-success' : 'text-danger'}`}>
                                            {formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="empty-message">No recent activity</p>}
                    </div>
                </div>

                {/* Low Stock */}
                <div className="list-card">
                    <div className="list-header" style={{ borderLeftColor: '#f59e0b' }}>
                        <div className="list-title">Low Stock Products</div>
                    </div>
                    <div className="list-body">
                        {stats.lowStockProducts.length > 0 ? (
                            <div className="data-list">
                                {stats.lowStockProducts.map((p, i) => (
                                    <div key={i} className="list-item">
                                        <div className="list-info">
                                            <DashboardProductImage src={p.image} alt={p.name} />
                                            <div className="list-details">
                                                <span className="list-name">{p.name}</span>
                                                <span className="list-sub">Stock: {p.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="list-value text-danger">Min: {p.minQty}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="empty-message">Stock levels are healthy</p>}
                    </div>
                </div>

                {/* Sales Statistics */}
                <div className="chart-card">
                    <div className="chart-header" style={{ borderLeftColor: '#ef4444' }}>
                        <h3 className="chart-title">Sales Statistics</h3>
                    </div>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <p className="stat-label">Revenue</p>
                            <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
                        </div>
                        <div className="stat-item">
                            <p className="stat-label">Expense</p>
                            <p className="stat-value">{formatCurrency(stats.totalExpenses)}</p>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} name="Revenue" />
                                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} name="Expense" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Customers */}
                <div className="list-card">
                    <div className="list-header" style={{ borderLeftColor: '#ec4899' }}>
                        <div className="list-title">Top Customers</div>
                    </div>
                    <div className="list-body">
                        {stats.topCustomers.length > 0 ? (
                            <div className="data-list">
                                {stats.topCustomers.map((c, i) => (
                                    <div key={i} className="list-item">
                                        <div className="list-info">
                                            <DashboardCustomerImage src={c.profileImage} alt={c.name} />
                                            <div className="list-details">
                                                <span className="list-name">{c.name}</span>
                                                <span className="list-sub">{c.email}</span>
                                            </div>
                                        </div>
                                        <div className="list-value">{formatCurrency(c.totalSales)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="empty-message">No customer data yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyDashboard;
