import React, { useState, useEffect, useContext } from 'react';
import { Lock, Unlock, Calendar, AlertTriangle, ShieldCheck, CheckCircle2, Info, Clock, Save } from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import { AuthContext } from '../../../../context/AuthContext';
import companyService from '../../../../services/companyService';
import toast from 'react-hot-toast';
import './PeriodLock.css';

const PeriodLock = () => {
    const { currentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lockData, setLockData] = useState({
        isLocked: false,
        lockedUntilDate: '',
        reason: 'Year-End / Period Lock',
        updatedAt: null,
        updatedBy: null
    });

    const companyId = currentUser?.companyId;

    const fetchLockSettings = async () => {
        try {
            setLoading(true);
            const res = await companyService.getPeriodLockSettings(companyId);
            if (res.success && res.data) {
                setLockData({
                    isLocked: !!res.data.isLocked,
                    lockedUntilDate: res.data.lockedUntilDate ? res.data.lockedUntilDate.split('T')[0] : '',
                    reason: res.data.reason || 'Year-End / Period Lock',
                    updatedAt: res.data.updatedAt,
                    updatedBy: res.data.updatedBy
                });
            }
        } catch (err) {
            console.error('Error loading period lock:', err);
            toast.error('Failed to load period lock settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId) fetchLockSettings();
    }, [companyId]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (lockData.isLocked && !lockData.lockedUntilDate) {
            toast.error('Please select a lock date');
            return;
        }

        try {
            setSaving(true);
            const res = await companyService.updatePeriodLockSettings(companyId, lockData);
            if (res.success) {
                toast.success(res.message || 'Period lock settings updated successfully');
                setLockData({
                    ...lockData,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || currentUser?.email || 'Administrator'
                });
            } else {
                toast.error(res.message || 'Failed to update period lock');
            }
        } catch (err) {
            console.error('Error saving period lock:', err);
            toast.error(err.response?.data?.message || 'Error updating period lock');
        } finally {
            setSaving(false);
        }
    };

    const applyPreset = (presetType) => {
        const today = new Date();
        let targetDate = new Date();

        if (presetType === 'LAST_MONTH') {
            targetDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (presetType === 'LAST_QUARTER') {
            const currentQuarter = Math.floor(today.getMonth() / 3);
            targetDate = new Date(today.getFullYear(), currentQuarter * 3, 0);
        } else if (presetType === 'PREV_YEAR') {
            targetDate = new Date(today.getFullYear() - 1, 11, 31);
        } else if (presetType === 'CURRENT_YEAR') {
            targetDate = new Date(today.getFullYear(), 11, 31);
        }

        const dateStr = targetDate.toISOString().split('T')[0];
        setLockData(prev => ({
            ...prev,
            isLocked: true,
            lockedUntilDate: dateStr,
            reason: prev.reason || `Closed up to ${dateStr}`
        }));
        toast.success(`Lock date set to ${dateStr}`);
    };

    if (loading) {
        return (
            <div className="PL-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading Period Lock settings...</div>
            </div>
        );
    }

    return (
        <div className="PL-page-container">
            <div className="PL-header">
                <div>
                    <h1>Accounting Period Lock & Year-End Protection</h1>
                    <p>Prevent editing, creating, or deleting posted transactions in closed accounting periods</p>
                </div>
            </div>

            {/* Status Card */}
            <div className={`PL-status-card ${lockData.isLocked ? 'locked' : 'unlocked'}`}>
                <div className="PL-status-icon">
                    {lockData.isLocked ? <Lock size={28} /> : <Unlock size={28} />}
                </div>
                <div className="PL-status-info">
                    <div className="PL-status-title">
                        {lockData.isLocked ? 'Accounting Period is Currently LOCKED' : 'Accounting Period is OPEN'}
                    </div>
                    <div className="PL-status-desc">
                        {lockData.isLocked ? (
                            <>Transactions dated on or before <strong>{lockData.lockedUntilDate}</strong> are locked against all modifications and deletions.</>
                        ) : (
                            <>Transactions of any valid date can currently be created or edited by authorized users.</>
                        )}
                    </div>
                    {lockData.updatedAt && (
                        <div className="PL-status-meta">
                            <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                            Last updated by <strong>{lockData.updatedBy || 'Administrator'}</strong> on {new Date(lockData.updatedAt).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSave} className="PL-form-card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '20px' }}>
                    Period Lock Controls
                </h3>

                {/* Toggle Enable */}
                <div className="PL-control-row">
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Enable Period Lock</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>When turned ON, historical transactions up to the lock date cannot be modified</div>
                    </div>
                    <label className="PL-switch">
                        <input
                            type="checkbox"
                            checked={lockData.isLocked}
                            onChange={(e) => setLockData({ ...lockData, isLocked: e.target.checked })}
                        />
                        <span className="PL-slider"></span>
                    </label>
                </div>

                {/* Lock Until Date */}
                <div className="PL-control-row" style={{ opacity: lockData.isLocked ? 1 : 0.6 }}>
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>Locked-Until Date*</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>All transactions (Invoices, Bills, Journals, Receipts, Payments) dated $\le$ this date are locked</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="date"
                            className="PL-date-input"
                            value={lockData.lockedUntilDate}
                            disabled={!lockData.isLocked}
                            onChange={(e) => setLockData({ ...lockData, lockedUntilDate: e.target.value })}
                            required={lockData.isLocked}
                        />
                    </div>
                </div>

                {/* Quick Presets */}
                <div style={{ margin: '14px 0 20px 0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '10px' }}>Quick Lock Presets:</span>
                    <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <button type="button" className="PL-preset-btn" onClick={() => applyPreset('LAST_MONTH')}>
                            End of Last Month
                        </button>
                        <button type="button" className="PL-preset-btn" onClick={() => applyPreset('LAST_QUARTER')}>
                            End of Last Quarter
                        </button>
                        <button type="button" className="PL-preset-btn" onClick={() => applyPreset('PREV_YEAR')}>
                            FY {new Date().getFullYear() - 1} Close (Dec 31, {new Date().getFullYear() - 1})
                        </button>
                        <button type="button" className="PL-preset-btn" onClick={() => applyPreset('CURRENT_YEAR')}>
                            FY {new Date().getFullYear()} Close (Dec 31, {new Date().getFullYear()})
                        </button>
                    </div>
                </div>

                {/* Reason / Notes */}
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontWeight: 600, color: '#1e293b', fontSize: '13px', marginBottom: '6px' }}>
                        Reason for Lock / Audit Note
                    </label>
                    <input
                        type="text"
                        className="PL-text-input"
                        placeholder="e.g., Year-End Audit Completed / VAT Return Filed"
                        value={lockData.reason}
                        onChange={(e) => setLockData({ ...lockData, reason: e.target.value })}
                    />
                </div>

                {/* Explanatory Notice */}
                <div className="PL-notice-box">
                    <Info size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.5' }}>
                        <strong>Audit Trail & Security Protection:</strong> Period locks enforce GAAP / IFRS accounting standards. Once a period is locked, general ledger entries, customer invoices, supplier bills, VAT filings, and inventory adjustments within that period are frozen. Only authorized administrators can advance or unlock this date.
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="submit" className="PL-btn-save" disabled={saving}>
                        <Save size={16} /> {saving ? 'Saving...' : 'Save Period Lock Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PeriodLock;
