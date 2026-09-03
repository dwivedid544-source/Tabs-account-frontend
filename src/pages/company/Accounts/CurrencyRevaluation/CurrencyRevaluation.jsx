import React, { useState, useEffect, useContext } from 'react';
import { RefreshCw, DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import toast from 'react-hot-toast';
import './CurrencyRevaluation.css';

const CurrencyRevaluation = () => {
    const { formatCurrency, companySettings } = useContext(CompanyContext);
    const [loading, setLoading] = useState(true);
    const [revalData, setRevalData] = useState(null);
    const [revaluationDate, setRevaluationDate] = useState(new Date().toISOString().split('T')[0]);
    const [spotRates, setSpotRates] = useState({});
    const [fetchingLiveRates, setFetchingLiveRates] = useState(false);
    const [liveRatesTimestamp, setLiveRatesTimestamp] = useState(null);
    const [showPostingModal, setShowPostingModal] = useState(false);
    const [posting, setPosting] = useState(false);

    const baseCurrency = revalData?.baseCurrency || companySettings?.currency || 'EUR';

    // Fetch live market exchange rates for the base currency
    const fetchLiveMarketRates = async (currencies = []) => {
        try {
            setFetchingLiveRates(true);
            const targetBase = baseCurrency;
            const res = await fetch(`https://open.er-api.com/v6/latest/${targetBase}`);
            const data = await res.json();

            if (data.result === 'success' && data.rates) {
                const newRates = { ...spotRates };
                // Calculate 1 FOREIGN = X BASE (1 / rate)
                currencies.forEach(curr => {
                    if (data.rates[curr]) {
                        const foreignPerBase = data.rates[curr];
                        const basePerForeign = (1 / foreignPerBase).toFixed(4);
                        newRates[curr] = basePerForeign;
                    }
                });

                // Also populate standard currencies if not present
                ['USD', 'EUR', 'GBP', 'CAD', 'SAR', 'AED'].forEach(curr => {
                    if (data.rates[curr] && !newRates[curr]) {
                        newRates[curr] = (1 / data.rates[curr]).toFixed(4);
                    }
                });

                setSpotRates(newRates);
                setLiveRatesTimestamp(new Date().toLocaleTimeString());
                return newRates;
            }
        } catch (err) {
            console.warn('Could not fetch live market FX rates:', err.message);
        } finally {
            setFetchingLiveRates(false);
        }
        return spotRates;
    };

    const fetchPreview = async (customRates = null) => {
        try {
            setLoading(true);
            const activeRates = customRates || spotRates;
            const res = await advancedAccountingService.getCurrencyRevaluationPreview(revaluationDate, activeRates);
            if (res.success) {
                setRevalData(res.data);
                
                // Extract distinct currencies from the data
                const detectedCurrencies = Array.from(new Set((res.data.items || []).map(i => i.currency)));
                
                // If rates aren't initialized for all detected currencies, fetch them
                const missing = detectedCurrencies.filter(c => !spotRates[c]);
                if (missing.length > 0 || Object.keys(spotRates).length === 0) {
                    await fetchLiveMarketRates(detectedCurrencies);
                }
            } else {
                toast.error(res.message || 'Failed to load revaluation preview');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error loading currency revaluation');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPreview();
    }, [revaluationDate]);

    const handleRateChange = (curr, val) => {
        setSpotRates(prev => ({ ...prev, [curr]: val }));
    };

    const handleApplyRates = () => {
        fetchPreview(spotRates);
        toast.success('Updated exchange spot rates applied!');
    };

    const handleFetchLiveClick = async () => {
        const detectedCurrencies = Array.from(new Set((revalData?.items || []).map(i => i.currency)));
        const freshRates = await fetchLiveMarketRates(detectedCurrencies);
        fetchPreview(freshRates);
        toast.success('Live market exchange rates updated successfully!');
    };

    const handlePostJournal = async () => {
        if (!revalData || Math.abs(revalData.netGainLoss) < 0.01) {
            toast.error('No unrealized FX variance to post.');
            return;
        }
        try {
            setPosting(true);
            const res = await advancedAccountingService.postCurrencyRevaluation({
                date: revaluationDate,
                netGainLoss: revalData.netGainLoss,
                items: revalData.items,
                notes: `Foreign Currency Revaluation as of ${revaluationDate}`
            });
            if (res.success) {
                toast.success(res.message || 'FX Revaluation Journal posted successfully!');
                setShowPostingModal(false);
                fetchPreview();
            } else {
                toast.error(res.message || 'Failed to post revaluation journal');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error posting revaluation journal');
        } finally {
            setPosting(false);
        }
    };

    const netGain = (revalData?.netGainLoss || 0) >= 0;
    const detectedCurrencies = Array.from(new Set((revalData?.items || []).map(i => i.currency)));
    const allCurrenciesToShow = Array.from(new Set([...detectedCurrencies, 'USD', 'EUR', 'GBP', 'CAD', 'AED', 'SAR']));

    return (
        <div className="FX-page-container">
            <div className="FX-header">
                <div className="FX-title-area">
                    <h1>Multi-Currency Revaluation</h1>
                    <p>Revalue open foreign currency receivables, payables, and bank balances against live market exchange rates</p>
                </div>
                <div className="FX-actions">
                    <input
                        type="date"
                        value={revaluationDate}
                        onChange={(e) => setRevaluationDate(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontWeight: 600,
                            color: '#334155'
                        }}
                    />
                    <button className="FX-btn-secondary" onClick={handleFetchLiveClick} disabled={fetchingLiveRates}>
                        <Globe size={16} color="#0284c7" /> {fetchingLiveRates ? 'Fetching Live...' : 'Fetch Live Market Rates'}
                    </button>
                    <button className="FX-btn-secondary" onClick={() => fetchPreview()}>
                        <RefreshCw size={16} /> Recalculate
                    </button>
                    <button
                        className="FX-btn-primary"
                        onClick={() => setShowPostingModal(true)}
                        disabled={!revalData || revalData.items?.length === 0}
                    >
                        <TrendingUp size={16} /> Post Revaluation Journal
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="FX-stats-grid">
                <div className="FX-stat-card">
                    <div className="FX-stat-label">Open Foreign Positions</div>
                    <div className="FX-stat-value">{revalData?.totalItems || 0}</div>
                </div>
                <div className="FX-stat-card">
                    <div className="FX-stat-label">Total Unrealized Gain</div>
                    <div className="FX-stat-value gain">
                        +{formatCurrency(revalData?.totalUnrealizedGain || 0)}
                    </div>
                </div>
                <div className="FX-stat-card">
                    <div className="FX-stat-label">Total Unrealized Loss</div>
                    <div className="FX-stat-value loss">
                        -{formatCurrency(revalData?.totalUnrealizedLoss || 0)}
                    </div>
                </div>
                <div className="FX-stat-card">
                    <div className="FX-stat-label">Net FX Gain / Loss</div>
                    <div className={`FX-stat-value ${netGain ? 'gain' : 'loss'}`}>
                        {netGain ? '+' : '-'}{formatCurrency(Math.abs(revalData?.netGainLoss || 0))}
                    </div>
                </div>
            </div>

            {/* Currency Rates Adjustment Bar */}
            <div className="FX-card mb-4" style={{ marginBottom: '20px' }}>
                <div className="FX-card-header">
                    <div>
                        <h3 className="FX-card-title">Live Valuation Spot Rates (vs Base Currency: {baseCurrency})</h3>
                        <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                            Live Market FX Feed Active {liveRatesTimestamp && `(Last updated: ${liveRatesTimestamp})`}
                        </div>
                    </div>
                    <button
                        style={{
                            backgroundColor: '#1e293b',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        onClick={handleApplyRates}
                    >
                        Apply Rates
                    </button>
                </div>
                <div style={{ padding: '16px 24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {allCurrenciesToShow.map(curr => (
                        <div key={curr} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: detectedCurrencies.includes(curr) ? '#f0fdf4' : '#f8fafc',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: detectedCurrencies.includes(curr) ? '1px solid #86efac' : '1px solid #e2e8f0'
                        }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                1 {curr} =
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                value={spotRates[curr] !== undefined ? spotRates[curr] : '1.0000'}
                                onChange={(e) => handleRateChange(curr, e.target.value)}
                                style={{
                                    width: '95px',
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    backgroundColor: '#ffffff'
                                }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{baseCurrency}</span>
                            {detectedCurrencies.includes(curr) && (
                                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                    In Use
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Foreign Positions Table */}
            <div className="FX-card">
                <div className="FX-card-header">
                    <h3 className="FX-card-title">Foreign Currency Outstanding Positions</h3>
                </div>
                <div className="FX-table-responsive">
                    <table className="FX-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Ref #</th>
                                <th>Party Name</th>
                                <th>Currency</th>
                                <th>Foreign Balance</th>
                                <th>Booked Value ({baseCurrency})</th>
                                <th>Revalued Value ({baseCurrency})</th>
                                <th>Unrealized Diff</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>Loading positions...</td>
                                </tr>
                            ) : revalData?.items?.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No outstanding foreign currency receivables or payables found.
                                    </td>
                                </tr>
                            ) : (
                                revalData?.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <span className={`FX-badge ${item.type === 'RECEIVABLE' ? 'ar' : 'ap'}`}>
                                                {item.type === 'RECEIVABLE' ? 'AR (Customer)' : 'AP (Vendor)'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{item.refNumber}</td>
                                        <td>{item.partyName}</td>
                                        <td><strong>{item.currency}</strong></td>
                                        <td>{item.foreignBalance.toLocaleString()} {item.currency}</td>
                                        <td>{formatCurrency(item.bookedBaseAmount)}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.revaluedBaseAmount)}</td>
                                        <td style={{ fontWeight: 700, color: item.gainLoss >= 0 ? '#10b981' : '#ef4444' }}>
                                            {item.gainLoss >= 0 ? `+${formatCurrency(item.gainLoss)}` : `-${formatCurrency(Math.abs(item.gainLoss))}`}
                                        </td>
                                        <td>
                                            <span className={`FX-badge ${item.status === 'GAIN' ? 'gain' : 'loss'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Posting Modal */}
            {showPostingModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                            Confirm Revaluation Journal Posting
                        </h2>
                        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
                            This will create an automated Journal Voucher posting the net unrealized foreign exchange difference of 
                            <strong style={{ color: netGain ? '#10b981' : '#ef4444' }}> {formatCurrency(Math.abs(revalData?.netGainLoss || 0))}</strong> ({netGain ? 'Net Gain' : 'Net Loss'}) into the General Ledger.
                        </p>

                        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                            <div><strong>Date:</strong> {revaluationDate}</div>
                            <div><strong>Account Debited:</strong> {netGain ? 'Currency Revaluation Reserve' : 'Foreign Exchange Loss Account'}</div>
                            <div><strong>Account Credited:</strong> {netGain ? 'Foreign Exchange Gain Account' : 'Currency Revaluation Reserve'}</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                className="FX-btn-secondary"
                                onClick={() => setShowPostingModal(false)}
                                disabled={posting}
                            >
                                Cancel
                            </button>
                            <button
                                className="FX-btn-primary"
                                onClick={handlePostJournal}
                                disabled={posting}
                            >
                                {posting ? 'Posting...' : 'Confirm & Post Journal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencyRevaluation;
