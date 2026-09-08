import React, { useState, useEffect, useContext } from 'react';
import { Plus, Play, Trash2, Repeat, Calendar, DollarSign, X, CheckCircle2, Pause, FileText, ArrowRight, Edit2 } from 'lucide-react';
import { CompanyContext } from '../../../../context/CompanyContext';
import advancedAccountingService from '../../../../services/advancedAccountingService';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import customerService from '../../../../services/customerService';
import vendorService from '../../../../services/vendorService';
import toast from 'react-hot-toast';
import './RecurringTransactions.css';

const RecurringTransactions = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [ledgers, setLedgers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [runningPending, setRunningPending] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const initialFormData = {
        templateName: '',
        transactionType: 'INVOICE', // 'INVOICE', 'PURCHASE_BILL', 'JOURNAL'
        frequency: 'MONTHLY', // 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        partyId: '',
        debitLedgerId: '',
        creditLedgerId: '',
        totalAmount: '',
        notes: ''
    };

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState(initialFormData);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [templatesRes, custRes, vendRes, coaRes] = await Promise.all([
                advancedAccountingService.getRecurringTemplates().catch(e => ({ success: false, data: [] })),
                customerService.getAllCustomers().catch(e => ({ data: [] })),
                vendorService.getAllVendors().catch(e => ({ data: [] })),
                chartOfAccountsService.getChartOfAccounts().catch(e => ({ data: [] }))
            ]);

            if (templatesRes?.success) {
                setTemplates(templatesRes.data || []);
            } else if (Array.isArray(templatesRes)) {
                setTemplates(templatesRes);
            }

            const custList = Array.isArray(custRes) ? custRes : (custRes?.data || custRes?.customers || []);
            setCustomers(custList);

            const vendList = Array.isArray(vendRes) ? vendRes : (vendRes?.data || vendRes?.vendors || []);
            setVendors(vendList);

            if (coaRes?.success) {
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
            toast.error(err.message || 'Error loading recurring templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreateModal = () => {
        setEditingTemplate(null);
        setFormData(initialFormData);
        setShowAddModal(true);
    };

    const handleOpenEditModal = (template) => {
        setEditingTemplate(template);
        let data = {};
        try {
            data = typeof template.templateData === 'string' 
                ? JSON.parse(template.templateData) 
                : (template.templateData || {});
        } catch (e) {
            data = {};
        }

        const partyId = template.transactionType === 'INVOICE' 
            ? (data.customerId ? String(data.customerId) : '')
            : template.transactionType === 'PURCHASE_BILL'
            ? (data.vendorId ? String(data.vendorId) : '')
            : '';

        setFormData({
            templateName: template.templateName || '',
            transactionType: template.transactionType || 'INVOICE',
            frequency: template.frequency || 'MONTHLY',
            startDate: template.startDate ? new Date(template.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: template.endDate ? new Date(template.endDate).toISOString().split('T')[0] : '',
            partyId,
            debitLedgerId: data.debitLedgerId ? String(data.debitLedgerId) : '',
            creditLedgerId: data.creditLedgerId ? String(data.creditLedgerId) : '',
            totalAmount: template.totalAmount !== undefined && template.totalAmount !== null ? String(template.totalAmount) : '',
            notes: data.notes || data.narration || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        if (submitting) return;
        setShowAddModal(false);
        setEditingTemplate(null);
        setFormData(initialFormData);
    };

    const handleSubmitTemplate = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!formData.templateName || !formData.totalAmount) {
            toast.error('Template name and amount are required');
            return;
        }

        if (formData.transactionType === 'JOURNAL') {
            if (!formData.debitLedgerId || !formData.creditLedgerId) {
                toast.error('Both Debit and Credit accounts are required for repeating journals');
                return;
            }
            if (formData.debitLedgerId === formData.creditLedgerId) {
                toast.error('Debit and Credit accounts must be different');
                return;
            }
        } else if (!formData.partyId) {
            toast.error('Customer or Vendor selection is required');
            return;
        }

        try {
            setSubmitting(true);
            const templateData = {
                customerId: formData.transactionType === 'INVOICE' ? formData.partyId : null,
                vendorId: formData.transactionType === 'PURCHASE_BILL' ? formData.partyId : null,
                debitLedgerId: formData.transactionType === 'JOURNAL' ? formData.debitLedgerId : null,
                creditLedgerId: formData.transactionType === 'JOURNAL' ? formData.creditLedgerId : null,
                currency: 'USD',
                narration: formData.notes,
                notes: formData.notes
            };

            const payload = {
                templateName: formData.templateName.trim(),
                transactionType: formData.transactionType,
                frequency: formData.frequency,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                totalAmount: parseFloat(formData.totalAmount) || 0,
                templateData
            };

            let res;
            if (editingTemplate) {
                res = await advancedAccountingService.updateRecurringTemplate(editingTemplate.id, payload);
            } else {
                res = await advancedAccountingService.createRecurringTemplate(payload);
            }

            if (res?.success) {
                toast.success(res.message || (editingTemplate ? 'Recurring template updated!' : 'Recurring template created!'));
                setShowAddModal(false);
                setEditingTemplate(null);
                setFormData(initialFormData);
                fetchData();
            } else {
                toast.error(res?.message || (editingTemplate ? 'Failed to update template' : 'Failed to create template'));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Error saving recurring template');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRunSingle = async (id, name) => {
        try {
            const res = await advancedAccountingService.runSingleRecurring(id);
            if (res.success) {
                toast.success(res.message || `Executed ${name}`);
                fetchData();
            } else {
                toast.error(res.message || 'Execution failed');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Execution error');
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            const res = await advancedAccountingService.toggleRecurringStatus(id);
            if (res.success) {
                toast.success(res.message || 'Status updated');
                fetchData();
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update status');
        }
    };

    const handleRunPending = async () => {
        try {
            setRunningPending(true);
            const res = await advancedAccountingService.runPendingRecurring();
            if (res.success) {
                toast.success(res.message || 'Executed pending recurring transactions!');
                fetchData();
            } else {
                toast.error(res.message || 'Failed to run recurring transactions');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error running recurring transactions');
        } finally {
            setRunningPending(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this recurring template?')) return;
        try {
            const res = await advancedAccountingService.deleteRecurringTemplate(id);
            if (res.success) {
                toast.success('Template deleted successfully');
                fetchData();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to delete template');
        }
    };

    const activeTemplates = templates.filter(t => t.status === 'ACTIVE');
    const totalAllTemplates = templates.reduce((sum, t) => sum + (parseFloat(t.totalAmount) || 0), 0);
    const totalActiveScheduled = activeTemplates.reduce((sum, t) => sum + (parseFloat(t.totalAmount) || 0), 0);
    const totalExecutions = templates.reduce((sum, t) => sum + (parseInt(t.executionCount) || 0), 0);
    const totalGeneratedAmount = templates.reduce((sum, t) => sum + ((parseFloat(t.totalAmount) || 0) * (parseInt(t.executionCount) || 0)), 0);

    return (
        <div className="REC-page-container">
            <div className="REC-header">
                <div className="REC-title-area">
                    <h1>Recurring Transactions Scheduler</h1>
                    <p>Automate repeating customer invoices and supplier bills on customizable recurring schedules</p>
                </div>
                <div className="REC-actions">
                    <button className="REC-btn-secondary" onClick={handleRunPending} disabled={runningPending}>
                        <Play size={16} /> {runningPending ? 'Generating...' : 'Run Pending Now'}
                    </button>
                    <button className="REC-btn-primary" onClick={handleOpenCreateModal}>
                        <Plus size={16} /> Create Recurring Schedule
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="REC-stats-grid">
                <div className="REC-stat-card">
                    <div className="REC-stat-label">Active Recurring Schedules</div>
                    <div className="REC-stat-value">{activeTemplates.length} / {templates.length}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        {templates.length - activeTemplates.length > 0
                            ? `${templates.length - activeTemplates.length} completed / paused`
                            : 'All schedules active'}
                    </div>
                </div>
                <div className="REC-stat-card">
                    <div className="REC-stat-label">Total Recurring Value</div>
                    <div className="REC-stat-value" style={{ color: '#0284c7' }}>
                        {formatCurrency(totalAllTemplates)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        Active Cycle: <span style={{ fontWeight: 600, color: '#0369a1' }}>{formatCurrency(totalActiveScheduled)}</span>
                    </div>
                </div>
                <div className="REC-stat-card">
                    <div className="REC-stat-label">Total Generated Value</div>
                    <div className="REC-stat-value" style={{ color: '#10b981' }}>
                        {formatCurrency(totalGeneratedAmount)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#059669' }}>{totalExecutions}</span> transactions executed
                    </div>
                </div>
                <div className="REC-stat-card">
                    <div className="REC-stat-label">Next Scheduled Run</div>
                    <div className="REC-stat-value" style={{ fontSize: '18px' }}>
                        {activeTemplates[0]?.nextRunDate ? new Date(activeTemplates[0].nextRunDate).toLocaleDateString() : 'None Pending'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                        {activeTemplates.length > 0 ? 'Upcoming recurring run' : 'No active schedules pending'}
                    </div>
                </div>
            </div>

            {/* Templates Table */}
            <div className="REC-card">
                <div className="REC-card-header">
                    <h3 className="REC-card-title">Recurring Schedule Templates ({templates.length})</h3>
                </div>
                <div className="REC-table-responsive">
                    <table className="REC-table">
                        <thead>
                            <tr>
                                <th>Schedule Name</th>
                                <th>Type</th>
                                <th>Frequency</th>
                                <th>Amount / Cycle</th>
                                <th>Start Date</th>
                                <th>Next Run Date</th>
                                <th>Executions</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>Loading recurring schedules...</td>
                                </tr>
                            ) : templates.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        No recurring transactions scheduled. Click "Create Recurring Schedule" to automate your recurring billing.
                                    </td>
                                </tr>
                            ) : (
                                templates.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{t.templateName}</td>
                                        <td>
                                            <span className={`REC-badge ${t.transactionType === 'INVOICE' ? 'type-inv' : t.transactionType === 'PURCHASE_BILL' ? 'type-bill' : 'type-jv'}`}>
                                                {t.transactionType === 'INVOICE' ? 'Sales Invoice' : t.transactionType === 'PURCHASE_BILL' ? 'Purchase Bill' : 'Journal Voucher'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="REC-badge freq">{t.frequency}</span>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(t.totalAmount)}</td>
                                        <td>{new Date(t.startDate).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600, color: '#0284c7' }}>
                                            {t.nextRunDate ? new Date(t.nextRunDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td>{t.executionCount} generated</td>
                                        <td>
                                            <span className={`REC-badge ${t.status === 'ACTIVE' ? 'active' : t.status === 'PAUSED' ? 'paused' : 'completed'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => handleOpenEditModal(t)}
                                                    style={{ border: 'none', background: '#f8fafc', color: '#0284c7', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    title="Edit Schedule"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleRunSingle(t.id, t.templateName)}
                                                    style={{ border: 'none', background: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    title="Run Now Immediately"
                                                >
                                                    <Play size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(t.id)}
                                                    style={{ border: 'none', background: t.status === 'ACTIVE' ? '#fffbeb' : '#eff6ff', color: t.status === 'ACTIVE' ? '#d97706' : '#2563eb', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    title={t.status === 'ACTIVE' ? 'Pause Schedule' : 'Resume Schedule'}
                                                >
                                                    {t.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                    title="Delete Schedule"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {templates.length > 0 && (
                            <tfoot>
                                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                                    <td colSpan="3" style={{ padding: '14px 16px', color: '#334155' }}>
                                        Total ({templates.length} schedules)
                                    </td>
                                    <td style={{ padding: '14px 16px', color: '#0284c7', fontSize: '15px' }}>
                                        {formatCurrency(totalAllTemplates)}
                                    </td>
                                    <td colSpan="2"></td>
                                    <td style={{ padding: '14px 16px', color: '#10b981' }}>
                                        {totalExecutions} generated ({formatCurrency(totalGeneratedAmount)})
                                    </td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Create / Edit Schedule Modal */}
            {showAddModal && (
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
                        maxWidth: '560px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                {editingTemplate ? 'Edit Recurring Schedule' : 'Create Recurring Schedule'}
                            </h2>
                            <button onClick={handleCloseModal} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitTemplate}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Schedule Name*</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Monthly Retainer / Office Rent / Depreciation"
                                    value={formData.templateName}
                                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Transaction Type</label>
                                    <select
                                        value={formData.transactionType}
                                        onChange={(e) => setFormData({ ...formData, transactionType: e.target.value, partyId: '', debitLedgerId: '', creditLedgerId: '' })}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    >
                                        <option value="INVOICE">Sales Invoice (Customer)</option>
                                        <option value="PURCHASE_BILL">Purchase Bill (Vendor)</option>
                                        <option value="JOURNAL">Repeating Journal Voucher</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Frequency</label>
                                    <select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    >
                                        <option value="WEEKLY">Weekly</option>
                                        <option value="BIWEEKLY">Bi-Weekly (Every 2 Weeks)</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly (Every 3 Months)</option>
                                        <option value="ANNUALLY">Annually (Yearly)</option>
                                    </select>
                                </div>
                            </div>

                            {formData.transactionType === 'JOURNAL' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Debit Account (Dr)*</label>
                                        <select
                                            required
                                            value={formData.debitLedgerId}
                                            onChange={(e) => setFormData({ ...formData, debitLedgerId: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        >
                                            <option value="">-- Select Debit Account --</option>
                                            {ledgers.map(l => (
                                                <option key={l.id} value={l.id}>{l.name} ({l.accountgroup?.name || l.accountgroup?.type || 'Account'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Credit Account (Cr)*</label>
                                        <select
                                            required
                                            value={formData.creditLedgerId}
                                            onChange={(e) => setFormData({ ...formData, creditLedgerId: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        >
                                            <option value="">-- Select Credit Account --</option>
                                            {ledgers.map(l => (
                                                <option key={l.id} value={l.id}>{l.name} ({l.accountgroup?.name || l.accountgroup?.type || 'Account'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                            {formData.transactionType === 'INVOICE' ? 'Select Customer*' : 'Select Vendor*'}
                                        </label>
                                        <select
                                            required
                                            value={formData.partyId}
                                            onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        >
                                            <option value="">-- Select Party --</option>
                                            {formData.transactionType === 'INVOICE'
                                                ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                                : vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Amount per Cycle*</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            value={formData.totalAmount}
                                            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.transactionType === 'JOURNAL' && (
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Amount per Cycle*</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        value={formData.totalAmount}
                                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date*</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Narration / Description</label>
                                <input
                                    type="text"
                                    placeholder="Optional notes or journal narration"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="REC-btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="REC-btn-primary"
                                    disabled={submitting}
                                    style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {submitting ? (editingTemplate ? 'Updating...' : 'Saving...') : (editingTemplate ? 'Update Schedule' : 'Save Schedule')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurringTransactions;
