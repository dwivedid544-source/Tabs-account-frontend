import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Calendar, CheckCircle, AlertTriangle, RefreshCw, 
    ArrowUpCircle, ShieldCheck, CreditCard, Clock, Layers,
    Check, Sparkles, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../../../context/AuthContext';
import subscriptionService from '../../../../services/subscriptionService';
import './SubscriptionReport.css';

const SubscriptionReport = () => {
    const { currentUser, updateCurrentUser } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();

    const [statusData, setStatusData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('renew'); // 'renew' or 'upgrade'
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [billingCycle, setBillingCycle] = useState('Monthly');
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);

            let status = null;
            let history = [];
            let plans = [];

            try {
                status = await subscriptionService.getStatus();
            } catch (err) {
                console.warn('getStatus API error, fallback to company state:', err?.message);
            }

            // Fallback status from currentUser.company if API endpoint was unreachable
            if (!status && currentUser?.company) {
                const comp = currentUser.company;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let isExp = false;
                let daysRemaining = 0;
                let daysExpired = 0;

                if (comp.endDate) {
                    const exp = new Date(comp.endDate);
                    exp.setHours(0, 0, 0, 0);
                    const diffTime = exp.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                        isExp = true;
                        daysExpired = Math.abs(diffDays);
                    } else {
                        daysRemaining = diffDays;
                    }
                }

                status = {
                    companyId: comp.id,
                    companyName: comp.name,
                    planId: comp.planId,
                    planName: comp.planName || comp.plan?.name || 'Standard Plan',
                    planType: comp.planType || 'Monthly',
                    startDate: comp.startDate,
                    expiryDate: comp.endDate,
                    status: isExp ? 'EXPIRED' : 'ACTIVE',
                    isExpired: isExp,
                    daysRemaining,
                    daysExpired,
                    plan: comp.plan
                };
            }

            try {
                history = await subscriptionService.getHistory();
            } catch (err) {
                console.warn('getHistory API notice:', err?.message);
            }

            try {
                plans = await subscriptionService.getPlans();
            } catch (err) {
                console.warn('getPlans API notice:', err?.message);
            }

            setStatusData(status);
            setHistoryData(history || []);
            setAvailablePlans(plans || []);

            if (status?.planId) {
                setSelectedPlanId(status.planId);
            } else if (plans?.length > 0) {
                setSelectedPlanId(plans[0].id);
            }

            if (status?.planType) {
                setBillingCycle(status.planType);
            }
        } catch (error) {
            console.error('Failed to load subscription details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Check for query parameters (?action=renew or ?action=upgrade)
    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'renew') {
            setModalMode('renew');
            setShowModal(true);
            searchParams.delete('action');
            setSearchParams(searchParams);
        } else if (action === 'upgrade') {
            setModalMode('upgrade');
            setShowModal(true);
            searchParams.delete('action');
            setSearchParams(searchParams);
        }
    }, [searchParams, setSearchParams]);

    // Compute plans to display in modal based on mode
    const plansToDisplay = React.useMemo(() => {
        const currentPlanId = Number(statusData?.planId);
        const currentPlanName = (statusData?.planName || '').trim().toLowerCase();

        if (modalMode === 'renew') {
            // Show ONLY the user's current active plan
            const matched = availablePlans.filter(p => 
                Number(p.id) === currentPlanId || 
                (currentPlanName && p.name?.trim().toLowerCase() === currentPlanName)
            );
            if (matched.length > 0) return matched;
            
            // Fallback to active plan details from statusData if not listed in active public plans
            if (statusData) {
                return [{
                    id: statusData.planId || 1,
                    name: statusData.planName || 'Current Plan',
                    totalPrice: statusData.plan?.totalPrice || statusData.plan?.basePrice || 0,
                    basePrice: statusData.plan?.basePrice || 0,
                    descriptions: statusData.plan?.descriptions || ['Active company subscription plan']
                }];
            }
            return [];
        } else {
            // Show ALL available subscription plans EXCEPT the current one
            return availablePlans.filter(p => 
                Number(p.id) !== currentPlanId && 
                (!currentPlanName || p.name?.trim().toLowerCase() !== currentPlanName)
            );
        }
    }, [modalMode, availablePlans, statusData]);

    const openRenewModal = async () => {
        setModalMode('renew');
        if (statusData?.planId) {
            setSelectedPlanId(statusData.planId);
        }
        if (statusData?.planType) {
            setBillingCycle(statusData.planType);
        }
        setShowModal(true);

        // Fetch fresh plans in real-time
        try {
            const freshPlans = await subscriptionService.getPlans();
            if (freshPlans && Array.isArray(freshPlans)) {
                setAvailablePlans(freshPlans);
            }
        } catch (e) {
            console.warn('Failed to refresh plans on renew modal open:', e);
        }
    };

    const openUpgradeModal = async () => {
        setModalMode('upgrade');
        const currentPlanId = Number(statusData?.planId);
        const currentPlanName = (statusData?.planName || '').trim().toLowerCase();
        
        // Initial preselection from existing plans
        const currentUpgradePlans = availablePlans.filter(p => 
            Number(p.id) !== currentPlanId && 
            (!currentPlanName || p.name?.trim().toLowerCase() !== currentPlanName)
        );
        if (currentUpgradePlans.length > 0) {
            setSelectedPlanId(currentUpgradePlans[0].id);
        } else {
            setSelectedPlanId(null);
        }
        setShowModal(true);

        // Fetch fresh plans from DB in real-time so any plans newly created in Super Admin appear immediately!
        try {
            const freshPlans = await subscriptionService.getPlans();
            if (freshPlans && Array.isArray(freshPlans)) {
                setAvailablePlans(freshPlans);
                const freshUpgradePlans = freshPlans.filter(p => 
                    Number(p.id) !== currentPlanId && 
                    (!currentPlanName || p.name?.trim().toLowerCase() !== currentPlanName)
                );
                if (freshUpgradePlans.length > 0 && (!selectedPlanId || !freshUpgradePlans.some(p => p.id === selectedPlanId))) {
                    setSelectedPlanId(freshUpgradePlans[0].id);
                }
            }
        } catch (e) {
            console.warn('Failed to refresh plans on upgrade modal open:', e);
        }
    };

    const handleConfirm = async () => {
        try {
            setSubmitting(true);
            let response;
            if (modalMode === 'renew') {
                response = await subscriptionService.renew({
                    billingCycle: billingCycle,
                    paymentMethod: 'Online Renewal'
                });
                toast.success('Subscription renewed successfully! All modules unlocked.');
            } else {
                response = await subscriptionService.upgrade({
                    planId: selectedPlanId,
                    billingCycle: billingCycle,
                    paymentMethod: 'Plan Upgrade'
                });
                toast.success('Plan upgraded successfully! All modules unlocked.');
            }

            // Immediately update currentUser context so sidebar and permissions reactively unlock
            if (currentUser && response.company) {
                let updatedModules = currentUser.planModules;
                if (response.company.plan?.modules) {
                    try {
                        updatedModules = typeof response.company.plan.modules === 'string' 
                            ? JSON.parse(response.company.plan.modules) 
                            : response.company.plan.modules;
                    } catch (e) {}
                }
                const updatedUser = {
                    ...currentUser,
                    company: response.company,
                    isExpired: false,
                    subscriptionStatus: 'ACTIVE',
                    planModules: updatedModules
                };
                updateCurrentUser(updatedUser);
            }

            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error('Action failed:', error);
            toast.error(error.response?.data?.message || 'Failed to update subscription');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (amt) => {
        const num = parseFloat(amt) || 0;
        return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="subscription-report-page">
                <div className="sub-loading-state">
                    <RefreshCw className="sub-spinner" size={32} />
                    <p>Loading subscription details...</p>
                </div>
            </div>
        );
    }

    const isExpired = statusData?.isExpired || statusData?.status === 'EXPIRED';

    return (
        <div className="subscription-report-page">
            <div className="sub-page-header">
                <div>
                    <h1 className="sub-page-title">Subscription Management & Report</h1>
                    <p className="sub-page-subtitle">
                        Monitor your company plan validity, review past billing cycles, and manage renewals.
                    </p>
                </div>
                <div className="sub-header-actions">
                    <button 
                        type="button" 
                        className="btn-sub-renew"
                        onClick={openRenewModal}
                    >
                        <RefreshCw size={16} />
                        Renew Subscription
                    </button>
                    <button 
                        type="button" 
                        className="btn-sub-upgrade"
                        onClick={openUpgradeModal}
                    >
                        <ArrowUpCircle size={16} />
                        Upgrade Plan
                    </button>
                </div>
            </div>

            {/* Current Plan Overview Card */}
            <div className={`sub-overview-card ${isExpired ? 'sub-card-expired' : 'sub-card-active'}`}>
                <div className="sub-card-banner">
                    <div className="sub-plan-badge-wrapper">
                        <span className="sub-plan-name">{statusData?.planName || 'Standard Plan'}</span>
                        <span className={`sub-status-pill ${isExpired ? 'pill-expired' : 'pill-active'}`}>
                            {isExpired ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                            {isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </span>
                    </div>

                    <div className="sub-quick-stats">
                        {isExpired ? (
                            <div className="stat-item stat-expired">
                                <span className="stat-label">Expired Since</span>
                                <span className="stat-val">{statusData?.daysExpired || 0} Days Ago</span>
                            </div>
                        ) : (
                            <div className="stat-item stat-active">
                                <span className="stat-label">Days Remaining</span>
                                <span className="stat-val">{statusData?.daysRemaining ?? 'N/A'} Days</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sub-card-grid">
                    <div className="sub-grid-cell">
                        <div className="cell-label">Billing Cycle</div>
                        <div className="cell-value">{statusData?.planType || 'Monthly'}</div>
                    </div>
                    <div className="sub-grid-cell">
                        <div className="cell-label">Start Date</div>
                        <div className="cell-value">{formatDate(statusData?.startDate)}</div>
                    </div>
                    <div className="sub-grid-cell">
                        <div className="cell-label">Expiry Date</div>
                        <div className="cell-value">{formatDate(statusData?.expiryDate)}</div>
                    </div>
                    <div className="sub-grid-cell">
                        <div className="cell-label">Plan Price</div>
                        <div className="cell-value">
                            {formatCurrency(statusData?.plan?.totalPrice || statusData?.plan?.basePrice || 0)}
                            <span className="cell-sub"> / {statusData?.planType?.toLowerCase() || 'month'}</span>
                        </div>
                    </div>
                </div>

                {isExpired && (
                    <div className="sub-expired-notice">
                        <AlertCircle size={20} className="notice-icon" />
                        <div>
                            <strong>Your software modules are locked due to subscription expiry.</strong>
                            <p>
                                All your data is safely preserved. Renew your current subscription or upgrade to a new plan to resume full operations immediately.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Subscription History Table */}
            <div className="sub-history-card">
                <div className="sub-history-header">
                    <h2 className="sub-history-title">Subscription & Payment History</h2>
                    <span className="sub-history-count">{historyData.length} records</span>
                </div>

                <div className="table-responsive">
                    <table className="sub-history-table">
                        <thead>
                            <tr>
                                <th>Plan Name</th>
                                <th>Billing Cycle</th>
                                <th>Start Date</th>
                                <th>Expiry Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-4 text-muted">
                                        No subscription records found.
                                    </td>
                                </tr>
                            ) : (
                                historyData.map((item) => {
                                    const isItemExpired = item.status === 'EXPIRED';
                                    return (
                                        <tr key={item.id}>
                                            <td className="fw-semibold text-dark">{item.planName || 'Standard'}</td>
                                            <td>{item.billingCycle || 'Monthly'}</td>
                                            <td>{formatDate(item.startDate)}</td>
                                            <td>{formatDate(item.expiryDate)}</td>
                                            <td className="fw-bold text-dark">{formatCurrency(item.amount)}</td>
                                            <td>
                                                <span className={`sub-status-tag ${isItemExpired ? 'tag-expired' : 'tag-active'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-muted small">{item.paymentReference || 'Direct'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Renewal / Upgrade Modal */}
            {showModal && (
                <div className="sub-modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="sub-modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="sub-modal-top">
                            <div>
                                <h3 className="sub-modal-title">
                                    {modalMode === 'renew' ? 'Renew Subscription' : 'Upgrade Subscription Plan'}
                                </h3>
                                <p className="sub-modal-desc text-muted small mb-0 mt-1">
                                    {modalMode === 'renew' 
                                        ? `Renewing your active plan: ${statusData?.planName || 'Current Plan'}. Choose your billing term.`
                                        : `Your company is currently on ${statusData?.planName || 'Current Plan'}. Select an available plan below to upgrade:`}
                                </p>
                            </div>
                            <button className="sub-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="sub-modal-content">
                            {/* Billing Cycle Switcher */}
                            <div className="cycle-toggle-container">
                                <label className="cycle-toggle-label">Select Billing Term:</label>
                                <div className="cycle-pill-group">
                                    <button
                                        type="button"
                                        className={`cycle-pill ${billingCycle === 'Monthly' ? 'cycle-pill-active' : ''}`}
                                        onClick={() => setBillingCycle('Monthly')}
                                    >
                                        Monthly Billing
                                    </button>
                                    <button
                                        type="button"
                                        className={`cycle-pill ${billingCycle === 'Yearly' ? 'cycle-pill-active' : ''}`}
                                        onClick={() => setBillingCycle('Yearly')}
                                    >
                                        Yearly Billing (12 Months)
                                    </button>
                                </div>
                            </div>

                            {/* Plan Selection Cards */}
                            {plansToDisplay.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <p className="mb-1 fw-semibold">No other plans available for upgrade.</p>
                                    <small>Your company is already subscribed to the highest available plan.</small>
                                </div>
                            ) : (
                                <div className="plan-selection-grid">
                                    {plansToDisplay.map((plan) => {
                                        const isSelected = selectedPlanId === plan.id || modalMode === 'renew';
                                        const basePrice = parseFloat(plan.totalPrice || plan.basePrice || 0);
                                        const displayPrice = billingCycle === 'Yearly' ? basePrice * 12 : basePrice;

                                        return (
                                            <div 
                                                key={plan.id}
                                                className={`plan-card-option ${isSelected ? 'plan-card-selected' : ''}`}
                                                onClick={() => {
                                                    if (modalMode === 'upgrade') {
                                                        setSelectedPlanId(plan.id);
                                                    }
                                                }}
                                                style={modalMode === 'renew' ? { cursor: 'default' } : {}}
                                            >
                                                {isSelected && (
                                                    <div className="plan-selected-badge">
                                                        <Check size={14} /> {modalMode === 'renew' ? 'Current Active Plan' : 'Selected'}
                                                    </div>
                                                )}
                                                <h4 className="plan-option-name">{plan.name}</h4>
                                                <div className="plan-option-price">
                                                    <span className="price-num">{formatCurrency(displayPrice)}</span>
                                                    <span className="price-cycle">/{billingCycle === 'Yearly' ? 'year' : 'mo'}</span>
                                                </div>

                                                <div className="plan-option-features">
                                                    {plan.descriptions && Array.isArray(plan.descriptions) && plan.descriptions.slice(0, 4).map((desc, idx) => (
                                                        <div key={idx} className="feature-item">
                                                            <Check size={14} className="feature-check" />
                                                            <span>{typeof desc === 'string' ? desc : desc.text || desc.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="sub-guarantee-note">
                                <ShieldCheck size={16} />
                                <span>Immediate activation: your subscription validity and database records update instantly upon confirmation.</span>
                            </div>
                        </div>

                        <div className="sub-modal-bottom">
                            <button 
                                type="button" 
                                className="btn-cancel" 
                                onClick={() => setShowModal(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn-confirm-action" 
                                onClick={handleConfirm}
                                disabled={submitting || !selectedPlanId}
                            >
                                {submitting ? 'Processing...' : modalMode === 'renew' ? 'Confirm & Renew Now' : 'Confirm & Upgrade Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionReport;
