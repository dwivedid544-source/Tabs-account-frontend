import React, { useContext, useState, useEffect } from 'react';
import { CompanyContext } from '../../context/CompanyContext';
import { AuthContext } from '../../context/AuthContext';
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Users,
    Briefcase,
    FileText,
    ArrowRight
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css';

const UserDashboard = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        recentTransactions: []
    });
    const [loading, setLoading] = useState(true);

    const permissions = currentUser?.permissions || [];
    const hasFinancePerm = permissions.includes('manage reports') || permissions.includes('view reports') || permissions.includes('manage accounts');

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

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) {
        return (
            <div className="user-dashboard-loading">
                <div className="loader-spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="user-dashboard-container">
            <div className="welcome-section">
                <div className="welcome-text">
                    <h1>{getTimeGreeting()}, {currentUser?.name}!</h1>
                    <p>Here's what's happening with your business today.</p>
                </div>
                <div className="current-date">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {hasFinancePerm && (
                <div className="user-stats-grid">
                    <div className="user-stat-card revenue">
                        <div className="stat-icon">
                            <TrendingUp size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Revenue</p>
                            <h2 className="stat-value">{formatCurrency(stats.totalRevenue)}</h2>
                        </div>
                    </div>
                    
                    <div className="user-stat-card expenses">
                        <div className="stat-icon">
                            <TrendingDown size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Total Expenses</p>
                            <h2 className="stat-value">{formatCurrency(stats.totalExpenses)}</h2>
                        </div>
                    </div>

                    <div className="user-stat-card profit">
                        <div className="stat-icon">
                            <Activity size={20} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Net Profit</p>
                            <h2 className="stat-value">{formatCurrency(stats.netProfit)}</h2>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-content-grid">
                <div className="recent-activity-card">
                    <div className="card-header">
                        <h3>Recent Transactions</h3>
                        <button className="view-all-btn" onClick={() => navigate('/company/accounts/transactions')}>
                            View All <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="card-body">
                        {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                            <div className="transaction-list">
                                {stats.recentTransactions.slice(0, 6).map((tx, idx) => (
                                    <div key={idx} className="transaction-item">
                                        <div className="tx-icon">
                                            <div className={`icon-circle ${tx.type === 'INCOME' || tx.type === 'SALES_INVOICE' ? 'income' : 'expense'}`}>
                                                <FileText size={16} />
                                            </div>
                                        </div>
                                        <div className="tx-details">
                                            <p className="tx-desc">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                                            <p className="tx-date">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className={`tx-amount ${tx.type === 'INCOME' || tx.type === 'SALES_INVOICE' ? 'positive' : 'negative'}`}>
                                            {tx.type === 'INCOME' || tx.type === 'SALES_INVOICE' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Activity size={40} className="empty-icon" />
                                <p>No recent transactions found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="quick-actions-card">
                    <div className="card-header">
                        <h3>Quick Actions</h3>
                    </div>
                    <div className="actions-grid">
                        {permissions.includes('show sales') && (
                            <button className="action-item" onClick={() => navigate('/company/sales/invoice')}>
                                <div className="action-icon sales"><TrendingUp size={20} /></div>
                                <span>Create Invoice</span>
                            </button>
                        )}
                        {permissions.includes('manage purchases') && (
                            <button className="action-item" onClick={() => navigate('/company/purchases/bill')}>
                                <div className="action-icon purchase"><TrendingDown size={20} /></div>
                                <span>Add Bill</span>
                            </button>
                        )}
                        {permissions.includes('manage accounts') && (
                            <>
                                <button className="action-item" onClick={() => navigate('/company/accounts/customers')}>
                                    <div className="action-icon customers"><Users size={20} /></div>
                                    <span>Customers</span>
                                </button>
                                <button className="action-item" onClick={() => navigate('/company/accounts/vendors')}>
                                    <div className="action-icon vendors"><Briefcase size={20} /></div>
                                    <span>Vendors</span>
                                </button>
                            </>
                        )}
                        <button className="action-item" onClick={() => navigate('/company/settings/profile')}>
                            <div className="action-icon settings"><Activity size={20} /></div>
                            <span>My Profile</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
