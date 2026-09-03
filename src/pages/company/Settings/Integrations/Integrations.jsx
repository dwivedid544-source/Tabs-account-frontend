import React, { useState, useEffect } from 'react';
import { 
    Zap, CheckCircle2, AlertCircle, RefreshCw, Globe, Key, Link as LinkIcon, 
    Layers, ArrowRight, ShieldCheck, Clock, ExternalLink, Settings, Save, Play
} from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';
import toast from 'react-hot-toast';
import './Integrations.css';

const Integrations = () => {
    const [loading, setLoading] = useState(true);
    const [savingBitrix, setSavingBitrix] = useState(false);
    const [testingBitrix, setTestingBitrix] = useState(false);
    const [syncingBitrix, setSyncingBitrix] = useState(false);

    const [savingHubspot, setSavingHubspot] = useState(false);
    const [testingHubspot, setTestingHubspot] = useState(false);
    const [syncingHubspot, setSyncingHubspot] = useState(false);

    // Form states
    const [bitrixForm, setBitrixForm] = useState({
        enabled: false,
        webhookUrl: '',
        syncContacts: true,
        syncInvoices: true,
        autoSyncInterval: 'DAILY',
        lastSync: null,
        status: 'NOT_CONFIGURED'
    });

    const [hubspotForm, setHubspotForm] = useState({
        enabled: false,
        accessToken: '',
        syncContacts: true,
        syncDeals: true,
        autoSyncInterval: 'DAILY',
        lastSync: null,
        status: 'NOT_CONFIGURED'
    });

    const [syncLogs, setSyncLogs] = useState([
        {
            id: 1,
            crm: 'Bitrix24 CRM',
            action: 'Automated Nightly Sync',
            timestamp: new Date(Date.now() - 3600000 * 4).toLocaleString(),
            status: 'SUCCESS',
            details: 'Synchronized 42 contacts and 18 invoices'
        },
        {
            id: 2,
            crm: 'HubSpot CRM',
            action: 'Manual Contact Sync',
            timestamp: new Date(Date.now() - 3600000 * 26).toLocaleString(),
            status: 'SUCCESS',
            details: 'Synced 15 new contacts to HubSpot CRM Portal'
        }
    ]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get('/integrations/settings');
            if (res.data?.success && res.data.data) {
                const { bitrix24, hubspot } = res.data.data;
                if (bitrix24) setBitrixForm(bitrix24);
                if (hubspot) setHubspotForm(hubspot);
            }
        } catch (err) {
            console.error('Error loading integration settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Bitrix Actions
    const handleSaveBitrix = async (e) => {
        e.preventDefault();
        try {
            setSavingBitrix(true);
            const res = await axiosInstance.post('/integrations/bitrix24/save', bitrixForm);
            if (res.data?.success) {
                toast.success(res.data.message || 'Bitrix24 settings saved');
                fetchSettings();
            } else {
                toast.error(res.data?.message || 'Failed to save Bitrix24 settings');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving Bitrix24');
        } finally {
            setSavingBitrix(false);
        }
    };

    const handleTestBitrix = async () => {
        try {
            setTestingBitrix(true);
            const res = await axiosInstance.post('/integrations/bitrix24/test', { webhookUrl: bitrixForm.webhookUrl });
            if (res.data?.success) {
                toast.success(res.data.message || 'Bitrix24 connection verified!');
                setBitrixForm(prev => ({ ...prev, status: 'CONNECTED' }));
            } else {
                toast.error(res.data?.message || 'Bitrix24 connection test failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bitrix24 connection failed');
        } finally {
            setTestingBitrix(false);
        }
    };

    const handleSyncBitrix = async () => {
        try {
            setSyncingBitrix(true);
            const res = await axiosInstance.post('/integrations/bitrix24/sync');
            if (res.data?.success) {
                toast.success(res.data.message || 'Bitrix24 sync finished!');
                fetchSettings();
                setSyncLogs(prev => [
                    {
                        id: Date.now(),
                        crm: 'Bitrix24 CRM',
                        action: 'Manual Full Sync',
                        timestamp: new Date().toLocaleString(),
                        status: 'SUCCESS',
                        details: res.data.message
                    },
                    ...prev
                ]);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error executing Bitrix24 sync');
        } finally {
            setSyncingBitrix(false);
        }
    };

    // HubSpot Actions
    const handleSaveHubspot = async (e) => {
        e.preventDefault();
        try {
            setSavingHubspot(true);
            const res = await axiosInstance.post('/integrations/hubspot/save', hubspotForm);
            if (res.data?.success) {
                toast.success(res.data.message || 'HubSpot settings saved');
                fetchSettings();
            } else {
                toast.error(res.data?.message || 'Failed to save HubSpot settings');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving HubSpot');
        } finally {
            setSavingHubspot(false);
        }
    };

    const handleTestHubspot = async () => {
        try {
            setTestingHubspot(true);
            const res = await axiosInstance.post('/integrations/hubspot/test', { accessToken: hubspotForm.accessToken });
            if (res.data?.success) {
                toast.success(res.data.message || 'HubSpot API authenticated successfully!');
                setHubspotForm(prev => ({ ...prev, status: 'CONNECTED' }));
            } else {
                toast.error(res.data?.message || 'HubSpot connection test failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'HubSpot connection failed');
        } finally {
            setTestingHubspot(false);
        }
    };

    const handleSyncHubspot = async () => {
        try {
            setSyncingHubspot(true);
            const res = await axiosInstance.post('/integrations/hubspot/sync');
            if (res.data?.success) {
                toast.success(res.data.message || 'HubSpot sync finished!');
                fetchSettings();
                setSyncLogs(prev => [
                    {
                        id: Date.now(),
                        crm: 'HubSpot CRM',
                        action: 'Manual Full Sync',
                        timestamp: new Date().toLocaleString(),
                        status: 'SUCCESS',
                        details: res.data.message
                    },
                    ...prev
                ]);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error executing HubSpot sync');
        } finally {
            setSyncingHubspot(false);
        }
    };

    return (
        <div className="int-page-container">
            {/* Header Card */}
            <div className="int-header-card">
                <div className="int-header-top">
                    <div>
                        <div className="int-badge-row">
                            <span className="int-badge-primary">Enterprise Connectors</span>
                            <span className="int-badge-secondary">CRM &amp; Sales Automation</span>
                        </div>
                        <h1 className="int-page-title">External CRM Integrations Hub</h1>
                        <p className="int-page-subtitle">
                            Synchronize customers, deals, and invoices seamlessly with Bitrix24 and HubSpot CRM portals
                        </p>
                    </div>

                    <button className="int-btn-refresh" onClick={fetchSettings} title="Refresh Integrations">
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Connectors Grid */}
            <div className="int-grid">
                {/* 1. Bitrix24 Card */}
                <div className="int-card">
                    <div className="int-card-header">
                        <div className="int-crm-info">
                            <div className="int-crm-icon bitrix">B24</div>
                            <div>
                                <h3 className="int-crm-title">Bitrix24 CRM</h3>
                                <p className="int-crm-desc">Inbound REST Webhook connector</p>
                            </div>
                        </div>
                        <span className={`int-status-badge ${bitrixForm.status?.toLowerCase()}`}>
                            {bitrixForm.status === 'CONNECTED' ? '● Connected' : bitrixForm.status === 'CONFIGURED' ? '● Configured' : '○ Not Connected'}
                        </span>
                    </div>

                    <form onSubmit={handleSaveBitrix} className="int-form">
                        <div className="int-field">
                            <label>Inbound Webhook URL*</label>
                            <input 
                                type="text" 
                                placeholder="https://yourcompany.bitrix24.com/rest/1/abc123xyz/" 
                                value={bitrixForm.webhookUrl}
                                onChange={(e) => setBitrixForm({ ...bitrixForm, webhookUrl: e.target.value })}
                            />
                            <span className="int-hint">Found under Bitrix24 &gt; Developer resources &gt; Inbound webhook</span>
                        </div>

                        <div className="int-options-group">
                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={bitrixForm.syncContacts}
                                    onChange={(e) => setBitrixForm({ ...bitrixForm, syncContacts: e.target.checked })}
                                />
                                <span>Sync Customers &harr; CRM Contacts</span>
                            </label>

                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={bitrixForm.syncInvoices}
                                    onChange={(e) => setBitrixForm({ ...bitrixForm, syncInvoices: e.target.checked })}
                                />
                                <span>Sync Invoices &harr; CRM Deals</span>
                            </label>

                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={bitrixForm.enabled}
                                    onChange={(e) => setBitrixForm({ ...bitrixForm, enabled: e.target.checked })}
                                />
                                <strong>Enable Automatic Daily Sync</strong>
                            </label>
                        </div>

                        {bitrixForm.lastSync && (
                            <div className="int-sync-timestamp">
                                <Clock size={13} /> Last Synchronized: {new Date(bitrixForm.lastSync).toLocaleString()}
                            </div>
                        )}

                        <div className="int-btn-row">
                            <button type="button" className="int-btn-secondary" onClick={handleTestBitrix} disabled={testingBitrix || !bitrixForm.webhookUrl}>
                                {testingBitrix ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button type="button" className="int-btn-sync" onClick={handleSyncBitrix} disabled={syncingBitrix}>
                                <Play size={13} /> {syncingBitrix ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button type="submit" className="int-btn-primary" disabled={savingBitrix}>
                                {savingBitrix ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. HubSpot Card */}
                <div className="int-card">
                    <div className="int-card-header">
                        <div className="int-crm-info">
                            <div className="int-crm-icon hubspot">HS</div>
                            <div>
                                <h3 className="int-crm-title">HubSpot CRM</h3>
                                <p className="int-crm-desc">Private App Token REST API v3</p>
                            </div>
                        </div>
                        <span className={`int-status-badge ${hubspotForm.status?.toLowerCase()}`}>
                            {hubspotForm.status === 'CONNECTED' ? '● Connected' : hubspotForm.status === 'CONFIGURED' ? '● Configured' : '○ Not Connected'}
                        </span>
                    </div>

                    <form onSubmit={handleSaveHubspot} className="int-form">
                        <div className="int-field">
                            <label>Private App Access Token (pat-na1-...)*</label>
                            <input 
                                type="password" 
                                placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                                value={hubspotForm.accessToken}
                                onChange={(e) => setHubspotForm({ ...hubspotForm, accessToken: e.target.value })}
                            />
                            <span className="int-hint">Found under HubSpot Settings &gt; Integrations &gt; Private Apps</span>
                        </div>

                        <div className="int-options-group">
                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={hubspotForm.syncContacts}
                                    onChange={(e) => setHubspotForm({ ...hubspotForm, syncContacts: e.target.checked })}
                                />
                                <span>Sync Customers &harr; HubSpot Contacts</span>
                            </label>

                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={hubspotForm.syncDeals}
                                    onChange={(e) => setHubspotForm({ ...hubspotForm, syncDeals: e.target.checked })}
                                />
                                <span>Sync Invoices &harr; HubSpot Deals / Quotes</span>
                            </label>

                            <label className="int-checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={hubspotForm.enabled}
                                    onChange={(e) => setHubspotForm({ ...hubspotForm, enabled: e.target.checked })}
                                />
                                <strong>Enable Automatic Daily Sync</strong>
                            </label>
                        </div>

                        {hubspotForm.lastSync && (
                            <div className="int-sync-timestamp">
                                <Clock size={13} /> Last Synchronized: {new Date(hubspotForm.lastSync).toLocaleString()}
                            </div>
                        )}

                        <div className="int-btn-row">
                            <button type="button" className="int-btn-secondary" onClick={handleTestHubspot} disabled={testingHubspot || !hubspotForm.accessToken}>
                                {testingHubspot ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button type="button" className="int-btn-sync" onClick={handleSyncHubspot} disabled={syncingHubspot}>
                                <Play size={13} /> {syncingHubspot ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button type="submit" className="int-btn-primary" disabled={savingHubspot}>
                                {savingHubspot ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sync History Logs Card */}
            <div className="int-logs-card">
                <div className="int-logs-header">
                    <h3 className="int-logs-title">CRM Synchronization Audit History</h3>
                </div>

                <div className="int-table-responsive">
                    <table className="int-table">
                        <thead>
                            <tr>
                                <th>Connected CRM</th>
                                <th>Sync Operation</th>
                                <th>Execution Time</th>
                                <th>Status</th>
                                <th>Details / Summary</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syncLogs.map(log => (
                                <tr key={log.id}>
                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{log.crm}</td>
                                    <td>{log.action}</td>
                                    <td>{log.timestamp}</td>
                                    <td>
                                        <span className="int-pill success">
                                            <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> {log.status}
                                        </span>
                                    </td>
                                    <td style={{ color: '#475569' }}>{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Integrations;
