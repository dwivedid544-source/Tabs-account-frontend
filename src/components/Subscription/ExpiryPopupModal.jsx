import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Layers, X, ShieldCheck } from 'lucide-react';
import './ExpiryPopupModal.css';

const ExpiryPopupModal = ({ isOpen, onClose, subscriptionInfo, onRenewClick }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleRenew = () => {
        if (onRenewClick) {
            onRenewClick();
        } else {
            onClose();
            navigate('/company/settings/subscription-report?action=renew');
        }
    };

    const handleViewPlans = () => {
        onClose();
        navigate('/company/settings/subscription-report?action=upgrade');
    };

    return (
        <div className="expiry-modal-overlay" onClick={onClose}>
            <div className="expiry-modal-container" onClick={(e) => e.stopPropagation()}>
                <button className="expiry-modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                <div className="expiry-modal-header">
                    <div className="expiry-modal-icon-wrapper">
                        <AlertTriangle className="expiry-warning-icon" size={36} />
                    </div>
                    <h2 className="expiry-modal-title">Your Subscription Has Expired</h2>
                </div>

                <div className="expiry-modal-body">
                    <p className="expiry-modal-message">
                        Your subscription plan has expired. Please renew or upgrade your plan to continue accessing all software modules. Your data is completely safe.
                    </p>

                    {subscriptionInfo && (
                        <div className="expiry-info-card">
                            <div className="expiry-info-item">
                                <span className="expiry-info-label">Current Plan</span>
                                <span className="expiry-info-value">{subscriptionInfo.planName || 'Standard Plan'}</span>
                            </div>
                            <div className="expiry-info-item">
                                <span className="expiry-info-label">Billing Cycle</span>
                                <span className="expiry-info-value">{subscriptionInfo.planType || subscriptionInfo.billingCycle || 'Monthly'}</span>
                            </div>
                            <div className="expiry-info-item">
                                <span className="expiry-info-label">Status</span>
                                <span className="expiry-status-badge">EXPIRED</span>
                            </div>
                        </div>
                    )}

                    <div className="expiry-safe-guarantee">
                        <ShieldCheck size={18} className="shield-icon" />
                        <span>All your previous invoices, financial entries, and reports remain 100% secure and viewable.</span>
                    </div>
                </div>

                <div className="expiry-modal-footer">
                    <button 
                        type="button" 
                        className="btn-renew-primary"
                        onClick={handleRenew}
                    >
                        <RefreshCw size={17} className="btn-icon" />
                        Renew Subscription
                    </button>
                    <button 
                        type="button" 
                        className="btn-view-plans"
                        onClick={handleViewPlans}
                    >
                        <Layers size={17} className="btn-icon" />
                        View Plans
                    </button>
                    <button 
                        type="button" 
                        className="btn-close-secondary"
                        onClick={onClose}
                    >
                        Close / Continue to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiryPopupModal;
