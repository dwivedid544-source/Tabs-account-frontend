import React, { useState, useEffect } from 'react';
import {
    Server, Mail, Key, Shield, Send, CheckCircle2,
    XCircle, AlertCircle, RefreshCw, Eye, EyeOff, Save,
    Globe, User, Sparkles, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import smtpService from '../../../../api/smtpService';
import GetCompanyId from '../../../../api/GetCompanyId';
import './SmtpSettings.css';

const SmtpSettings = ({ isTab = false }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingConn, setTestingConn] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Test Email Modal
    const [showTestModal, setShowTestModal] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');

    // Form fields (blank by default as requested)
    const [formData, setFormData] = useState({
        host: '',
        ip: '',
        port: 587,
        security: 'TLS',
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        hasPassword: false,
        isConfigured: false,
        lastTestedAt: null,
        lastTestStatus: null
    });

    const companyId = GetCompanyId();

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await smtpService.getSettings(companyId);
            if (res.data?.success && res.data.data) {
                const data = res.data.data;
                setFormData({
                    host: data.host || '',
                    ip: data.ip || '',
                    port: data.port || 587,
                    security: data.security || 'TLS',
                    username: data.username || '',
                    password: data.hasPassword ? '••••••••' : '',
                    fromEmail: data.fromEmail || '',
                    fromName: data.fromName || '',
                    hasPassword: Boolean(data.hasPassword),
                    isConfigured: Boolean(data.isConfigured),
                    lastTestedAt: data.lastTestedAt,
                    lastTestStatus: data.lastTestStatus
                });
                if (data.fromEmail) {
                    setTestRecipient(data.fromEmail);
                }
            }
        } catch (err) {
            console.error('Error fetching SMTP settings:', err);
            toast.error(err.response?.data?.message || 'Failed to load SMTP settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [companyId]);

    const handlePortSelect = (portNum, securityType) => {
        setFormData(prev => ({
            ...prev,
            port: portNum,
            security: securityType || prev.security
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        try {
            setSaving(true);
            const res = await smtpService.updateSettings(formData, companyId);
            if (res.data?.success) {
                toast.success(res.data.message || 'SMTP settings saved successfully');
                const saved = res.data.data;
                setFormData(prev => ({
                    ...prev,
                    hasPassword: Boolean(saved.hasPassword),
                    isConfigured: Boolean(saved.isConfigured),
                    lastTestedAt: saved.lastTestedAt,
                    lastTestStatus: saved.lastTestStatus,
                    password: saved.hasPassword ? '••••••••' : ''
                }));
            } else {
                toast.error(res.data?.message || 'Failed to save SMTP settings');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Error saving SMTP settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!formData.host || !formData.username) {
            toast.error('Please enter at least Host and Username to test connection');
            return;
        }

        try {
            setTestingConn(true);
            const res = await smtpService.testConnection(formData, companyId);
            if (res.data?.success) {
                toast.success(res.data.message || 'SMTP Connection established successfully!');
                setFormData(prev => ({
                    ...prev,
                    lastTestedAt: new Date().toISOString(),
                    lastTestStatus: 'SUCCESS'
                }));
            } else {
                toast.error(res.data?.message || 'SMTP Connection failed');
                setFormData(prev => ({
                    ...prev,
                    lastTestedAt: new Date().toISOString(),
                    lastTestStatus: 'FAILED'
                }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'SMTP Connection test failed');
            setFormData(prev => ({
                ...prev,
                lastTestedAt: new Date().toISOString(),
                lastTestStatus: 'FAILED'
            }));
        } finally {
            setTestingConn(false);
        }
    };

    const handleSendTestEmail = async (e) => {
        if (e) e.preventDefault();
        if (!testRecipient || !testRecipient.includes('@')) {
            toast.error('Please enter a valid recipient email address');
            return;
        }

        try {
            setSendingTest(true);
            const res = await smtpService.sendTestEmail({
                ...formData,
                toEmail: testRecipient
            }, companyId);

            if (res.data?.success) {
                toast.success(res.data.message || `Test email sent to ${testRecipient}`);
                setShowTestModal(false);
                setFormData(prev => ({
                    ...prev,
                    lastTestedAt: new Date().toISOString(),
                    lastTestStatus: 'SUCCESS'
                }));
            } else {
                toast.error(res.data?.message || 'Failed to send test email');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to send test email');
        } finally {
            setSendingTest(false);
        }
    };

    const containerClassName = isTab ? 'smtp-tab-wrapper' : 'smtp-settings-page';

    if (loading) {
        return (
            <div className={containerClassName} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <RefreshCw size={28} className="animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            {/* Header (standalone view only) */}
            {!isTab && (
                <div className="smtp-page-header">
                    <div>
                        <h1 className="smtp-page-title">Email &amp; SMTP Settings</h1>
                        <p className="smtp-page-subtitle">
                            Configure company-specific SMTP server credentials to automatically send invoice emails to customers.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`smtp-status-badge ${formData.isConfigured ? 'configured' : 'unconfigured'}`}>
                            <span className="smtp-status-dot" />
                            {formData.isConfigured ? 'SMTP Configured & Active' : 'SMTP Not Configured'}
                        </span>
                    </div>
                </div>
            )}

            {/* Diagnostic Banner */}
            {formData.lastTestedAt && (
                <div className={`smtp-diagnostic-banner ${formData.lastTestStatus === 'SUCCESS' ? 'success' : 'failed'}`}>
                    <div className="flex items-center gap-3">
                        {formData.lastTestStatus === 'SUCCESS' ? (
                            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                            <XCircle size={20} className="text-red-500 flex-shrink-0" />
                        )}
                        <div>
                            <span className="font-semibold text-slate-800 text-sm">
                                {formData.lastTestStatus === 'SUCCESS' ? 'Last connection verified successfully' : 'Last connection attempt failed'}
                            </span>
                            <span className="text-xs text-slate-500 block">
                                {new Date(formData.lastTestedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConn}
                        className="smtp-port-pill"
                        style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer' }}
                    >
                        {testingConn ? 'Retesting...' : 'Retest Now'}
                    </button>
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Card 1: Server Configuration */}
                <div className="smtp-card">
                    <div className="smtp-card-header">
                        <div className="smtp-card-icon">
                            <Server size={20} />
                        </div>
                        <div>
                            <h2 className="smtp-card-title">SMTP Server Configuration</h2>
                            <p className="smtp-card-desc">
                                Connection endpoints and encryption parameters for your outgoing mail server.
                            </p>
                        </div>
                    </div>

                    <div className="smtp-form-grid">
                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                SMTP Host <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <Server size={16} className="smtp-input-icon" />
                                <input
                                    type="text"
                                    className="smtp-input"
                                    placeholder="e.g. smtp.gmail.com, mail.yourdomain.com"
                                    value={formData.host}
                                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                    required
                                />
                            </div>
                            <span className="smtp-hint">Mail server domain or hostname</span>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                Server IP <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <Globe size={16} className="smtp-input-icon" />
                                <input
                                    type="text"
                                    className="smtp-input"
                                    placeholder="e.g. 192.168.1.10"
                                    value={formData.ip}
                                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                                />
                            </div>
                            <span className="smtp-hint">Optional specific IP binding address</span>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                Port <span className="smtp-required">*</span>
                            </label>
                            <input
                                type="number"
                                className="smtp-input no-icon"
                                placeholder="587"
                                value={formData.port}
                                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                required
                            />
                            <div className="smtp-port-pills">
                                <button
                                    type="button"
                                    className={`smtp-port-pill ${Number(formData.port) === 587 ? 'active' : ''}`}
                                    onClick={() => handlePortSelect(587, 'TLS')}
                                >
                                    587 (TLS / STARTTLS)
                                </button>
                                <button
                                    type="button"
                                    className={`smtp-port-pill ${Number(formData.port) === 465 ? 'active' : ''}`}
                                    onClick={() => handlePortSelect(465, 'SSL')}
                                >
                                    465 (SSL)
                                </button>
                                <button
                                    type="button"
                                    className={`smtp-port-pill ${Number(formData.port) === 25 ? 'active' : ''}`}
                                    onClick={() => handlePortSelect(25, 'NONE')}
                                >
                                    25 (Plain)
                                </button>
                            </div>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                Security / Encryption <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <Shield size={16} className="smtp-input-icon" />
                                <select
                                    className="smtp-select"
                                    value={formData.security}
                                    onChange={(e) => setFormData({ ...formData, security: e.target.value })}
                                >
                                    <option value="TLS">TLS (STARTTLS - Recommended for Port 587)</option>
                                    <option value="SSL">SSL / SMTPS (Implicit SSL - Port 465)</option>
                                    <option value="NONE">None (Plaintext - Port 25 / Internal)</option>
                                </select>
                            </div>
                            <span className="smtp-hint">Protocol used to secure outbound socket communication</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Authentication & Sender Details */}
                <div className="smtp-card">
                    <div className="smtp-card-header">
                        <div className="smtp-card-icon">
                            <Key size={20} />
                        </div>
                        <div>
                            <h2 className="smtp-card-title">Authentication &amp; Sender Information</h2>
                            <p className="smtp-card-desc">
                                Credentials used to authenticate with the SMTP server and identity shown to customers.
                            </p>
                        </div>
                    </div>

                    <div className="smtp-form-grid">
                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                Username <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <User size={16} className="smtp-input-icon" />
                                <input
                                    type="text"
                                    className="smtp-input"
                                    placeholder="e.g. billing@yourcompany.com"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <span className="smtp-hint">Typically your email address or account username</span>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                Password <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <Key size={16} className="smtp-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="smtp-input"
                                    placeholder={formData.hasPassword ? '••••••••' : 'Enter SMTP password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="smtp-toggle-pass-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <span className="smtp-hint">
                                {formData.hasPassword ? (
                                    <span className="text-emerald-600 font-medium">
                                        ✓ Encrypted in database (AES-256). Leave unchanged to keep current.
                                    </span>
                                ) : (
                                    'Encrypted with AES-256-GCM before saving to database.'
                                )}
                            </span>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                From Email <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <Mail size={16} className="smtp-input-icon" />
                                <input
                                    type="email"
                                    className="smtp-input"
                                    placeholder="e.g. invoices@yourcompany.com"
                                    value={formData.fromEmail}
                                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                                    required
                                />
                            </div>
                            <span className="smtp-hint">Sender email address displayed on invoice emails</span>
                        </div>

                        <div className="smtp-form-group">
                            <label className="smtp-label">
                                From Name <span className="smtp-required">*</span>
                            </label>
                            <div className="smtp-input-wrapper">
                                <User size={16} className="smtp-input-icon" />
                                <input
                                    type="text"
                                    className="smtp-input"
                                    placeholder="e.g. Acme Corp Billing"
                                    value={formData.fromName}
                                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                                    required
                                />
                            </div>
                            <span className="smtp-hint">Sender name displayed in customer's email inbox</span>
                        </div>
                    </div>
                </div>

                {/* Actions Footer Bar */}
                <div className="smtp-actions-bar">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConn || !formData.host || !formData.username}
                        className="smtp-btn smtp-btn-secondary"
                    >
                        {testingConn ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" /> Verifying Connection...
                            </>
                        ) : (
                            <>
                                <Server size={16} /> Test Connection
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowTestModal(true)}
                        disabled={!formData.host || !formData.username}
                        className="smtp-btn smtp-btn-secondary"
                    >
                        <Send size={16} /> Send Test Email
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="smtp-btn smtp-btn-primary"
                    >
                        {saving ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} /> Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Test Email Modal */}
            {showTestModal && (
                <div className="smtp-modal-overlay">
                    <div className="smtp-modal">
                        <div className="smtp-modal-header">
                            <h3 className="smtp-modal-title flex items-center gap-2">
                                <Send size={18} className="text-slate-700" /> Send Test Email
                            </h3>
                            <button
                                type="button"
                                className="smtp-modal-close"
                                onClick={() => setShowTestModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendTestEmail}>
                            <div className="smtp-modal-body">
                                <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.4 }}>
                                    Send a verification email through your configured SMTP server ({formData.host || 'your host'}) to verify real email delivery.
                                </p>
                                <div className="smtp-form-group">
                                    <label className="smtp-label">Recipient Email Address <span className="smtp-required">*</span></label>
                                    <div className="smtp-input-wrapper">
                                        <Mail size={16} className="smtp-input-icon" />
                                        <input
                                            type="email"
                                            className="smtp-input"
                                            placeholder="youremail@example.com"
                                            value={testRecipient}
                                            onChange={(e) => setTestRecipient(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="smtp-modal-footer">
                                <button
                                    type="button"
                                    className="smtp-btn smtp-btn-secondary"
                                    onClick={() => setShowTestModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingTest}
                                    className="smtp-btn smtp-btn-primary"
                                >
                                    {sendingTest ? (
                                        <>
                                            <RefreshCw size={16} className="animate-spin" /> Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> Send Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmtpSettings;
