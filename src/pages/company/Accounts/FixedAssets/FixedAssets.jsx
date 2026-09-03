import React, { useState, useEffect, useContext } from 'react';
import { Plus, Play, Trash2, Box, Calendar, DollarSign, X } from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import toast from 'react-hot-toast';
import './FixedAssets.css';

const FixedAssets = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [assets, setAssets] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDepreciateModal, setShowDepreciateModal] = useState(false);
    const [depreciating, setDepreciating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        assetName: '',
        assetNumber: `FA-${Date.now().toString().slice(-4)}`,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: '',
        salvageValue: '0',
        usefulLifeYears: '5',
        depreciationMethod: 'STRAIGHT_LINE',
        assetLedgerId: '',
        accumulatedDepLedgerId: '',
        depExpenseLedgerId: '',
        notes: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assetsRes, coaRes] = await Promise.all([
                advancedAccountingService.getFixedAssets(),
                chartOfAccountsService.getChartOfAccounts()
            ]);
            if (assetsRes.success) setAssets(assetsRes.data);
            if (coaRes.success) {
                // Flatten ledgers
                const flattened = [];
                coaRes.data.forEach(g => {
                    if (g.ledger) flattened.push(...g.ledger);
                    if (g.accountsubgroup) {
                        g.accountsubgroup.forEach(sg => {
                            if (sg.ledger) flattened.push(...sg.ledger);
                        });
                    }
                });
                setLedgers(flattened);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error loading assets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAsset = async (e) => {
        e.preventDefault();
        if (!formData.assetName || !formData.purchaseCost) {
            toast.error('Asset name and purchase cost are required');
            return;
        }
        try {
            const res = await advancedAccountingService.createFixedAsset(formData);
            if (res.success) {
                toast.success(res.message || 'Asset registered successfully!');
                setShowAddModal(false);
                setFormData({
                    assetName: '',
                    assetNumber: `FA-${Date.now().toString().slice(-4)}`,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    purchaseCost: '',
                    salvageValue: '0',
                    usefulLifeYears: '5',
                    depreciationMethod: 'STRAIGHT_LINE',
                    assetLedgerId: '',
                    accumulatedDepLedgerId: '',
                    depExpenseLedgerId: '',
                    notes: ''
                });
                fetchData();
            } else {
                toast.error(res.message || 'Failed to create asset');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error creating asset');
        }
    };

    const handleRunDepreciation = async () => {
        try {
            setDepreciating(true);
            const res = await advancedAccountingService.runDepreciation({ periodMonths: 1 });
            if (res.success) {
                toast.success(res.message || 'Depreciation run successfully!');
                setShowDepreciateModal(false);
                fetchData();
            } else {
                toast.error(res.message || 'Failed to run depreciation');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error running depreciation');
        } finally {
            setDepreciating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this asset?')) return;
        try {
            const res = await advancedAccountingService.deleteFixedAsset(id);
            if (res.success) {
                toast.success('Asset deleted successfully');
                fetchData();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to delete asset');
        }
    };

    // Calculate summary statistics
    const totalCost = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const totalAccDep = assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const netBookValue = assets.reduce((s, a) => s + (a.currentBookValue || 0), 0);
    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;

    return (
        <div className="FA-page-container">
            <div className="FA-header">
                <div className="FA-title-area">
                    <h1>Fixed Asset Register & Depreciation</h1>
                    <p>Track capital assets, calculate useful life schedules, and post automated depreciation</p>
                </div>
                <div className="FA-actions">
                    <button className="FA-btn-secondary" onClick={() => setShowDepreciateModal(true)}>
                        <Play size={16} /> Run Monthly Depreciation
                    </button>
                    <button className="FA-btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} /> Add Fixed Asset
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="FA-stats-grid">
                <div className="FA-stat-card">
                    <div className="FA-stat-label">Total Assets Value</div>
                    <div className="FA-stat-value">{formatCurrency(totalCost)}</div>
                </div>
                <div className="FA-stat-card">
                    <div className="FA-stat-label">Total Accumulated Dep.</div>
                    <div className="FA-stat-value" style={{ color: '#ef4444' }}>
                        -{formatCurrency(totalAccDep)}
                    </div>
                </div>
                <div className="FA-stat-card">
                    <div className="FA-stat-label">Net Book Value</div>
                    <div className="FA-stat-value" style={{ color: '#10b981' }}>
                        {formatCurrency(netBookValue)}
                    </div>
                </div>
                <div className="FA-stat-card">
                    <div className="FA-stat-label">Active Assets</div>
                    <div className="FA-stat-value">{activeCount} / {assets.length}</div>
                </div>
            </div>

            {/* Assets Table */}
            <div className="FA-card">
                <div className="FA-card-header">
                    <h3 className="FA-card-title">Registered Capital Assets ({assets.length})</h3>
                </div>
                <div className="FA-table-responsive">
                    <table className="FA-table">
                        <thead>
                            <tr>
                                <th>Asset #</th>
                                <th>Asset Name</th>
                                <th>Purchase Date</th>
                                <th>Purchase Cost</th>
                                <th>Method</th>
                                <th>Useful Life</th>
                                <th>Accumulated Dep.</th>
                                <th>Current Book Value</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px' }}>Loading fixed assets...</td>
                                </tr>
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No fixed assets registered yet. Click "Add Fixed Asset" to register your first asset.
                                    </td>
                                </tr>
                            ) : (
                                assets.map(asset => (
                                    <tr key={asset.id}>
                                        <td style={{ fontWeight: 600 }}>{asset.assetNumber}</td>
                                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{asset.assetName}</td>
                                        <td>{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                                        <td>{formatCurrency(asset.purchaseCost)}</td>
                                        <td>
                                            <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                                                {asset.depreciationMethod === 'STRAIGHT_LINE' ? 'Straight Line' : 'Declining Balance'}
                                            </span>
                                        </td>
                                        <td>{asset.usefulLifeYears} Yrs</td>
                                        <td style={{ color: '#ef4444' }}>-{formatCurrency(asset.accumulatedDepreciation)}</td>
                                        <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(asset.currentBookValue)}</td>
                                        <td>
                                            <span className={`FA-badge ${asset.status === 'ACTIVE' ? 'active' : 'fully-depreciated'}`}>
                                                {asset.status === 'ACTIVE' ? 'Active' : 'Fully Depreciated'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDelete(asset.id)}
                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete Asset"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Asset Modal */}
            {showAddModal && (
                <div className="FA-modal-overlay">
                    <div className="FA-modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Register New Fixed Asset</h2>
                            <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAsset}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Asset Name*</label>
                                    <input
                                        type="text"
                                        required
                                        className="FA-form-input"
                                        placeholder="e.g. Office Laptop Mac Studio"
                                        value={formData.assetName}
                                        onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                                    />
                                </div>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Asset Number / Tag</label>
                                    <input
                                        type="text"
                                        className="FA-form-input"
                                        value={formData.assetNumber}
                                        onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Purchase Date*</label>
                                    <input
                                        type="date"
                                        required
                                        className="FA-form-input"
                                        value={formData.purchaseDate}
                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    />
                                </div>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Purchase Cost*</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="FA-form-input"
                                        placeholder="0.00"
                                        value={formData.purchaseCost}
                                        onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Useful Life (Years)</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="FA-form-input"
                                        value={formData.usefulLifeYears}
                                        onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                                    />
                                </div>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Salvage Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="FA-form-input"
                                        value={formData.salvageValue}
                                        onChange={(e) => setFormData({ ...formData, salvageValue: e.target.value })}
                                    />
                                </div>
                                <div className="FA-form-group">
                                    <label className="FA-form-label">Depreciation Method</label>
                                    <select
                                        className="FA-form-select"
                                        value={formData.depreciationMethod}
                                        onChange={(e) => setFormData({ ...formData, depreciationMethod: e.target.value })}
                                    >
                                        <option value="STRAIGHT_LINE">Straight Line</option>
                                        <option value="DECLINING_BALANCE">Declining Balance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="FA-form-group">
                                <label className="FA-form-label">Notes / Description</label>
                                <textarea
                                    className="FA-form-textarea"
                                    rows="2"
                                    placeholder="Serial number, warranty details, location..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                                <button type="button" className="FA-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="FA-btn-primary">Register Asset</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Run Depreciation Modal */}
            {showDepreciateModal && (
                <div className="FA-modal-overlay">
                    <div className="FA-modal-content" style={{ maxWidth: '480px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                            Run Automated Depreciation
                        </h2>
                        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5', marginBottom: '18px' }}>
                            This will calculate 1 month of depreciation across all <strong>{activeCount} active asset(s)</strong> and automatically post double-entry Journal Vouchers (Debit: <em>Depreciation Expense</em>, Credit: <em>Accumulated Depreciation</em>).
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="FA-btn-secondary" onClick={() => setShowDepreciateModal(false)} disabled={depreciating}>
                                Cancel
                            </button>
                            <button className="FA-btn-primary" onClick={handleRunDepreciation} disabled={depreciating}>
                                {depreciating ? 'Processing...' : 'Run Depreciation Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixedAssets;
