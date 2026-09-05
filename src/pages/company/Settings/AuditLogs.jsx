import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search, Filter, Clock, User, Shield, Loader2,
    Calendar, RefreshCw, ChevronLeft, ChevronRight, FileText, Download,
    ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../../api/axiosInstance';
import GetCompanyId from '../../../api/GetCompanyId';
import * as XLSX from 'xlsx';
import './AuditLogs.css';

const AuditLogs = () => {
    const [searchParams] = useSearchParams();
    const initialSearch = searchParams.get('search') || searchParams.get('invoiceNumber') || '';
    const initialEntity = searchParams.get('entity') || (initialSearch ? 'Invoice' : '');
    const initialAction = searchParams.get('action') || '';
    const initialEntityId = searchParams.get('entityId') || searchParams.get('invoiceId') || '';

    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [search, setSearch] = useState(initialSearch);
    const [action, setAction] = useState(initialAction);
    const [entity, setEntity] = useState(initialEntity);
    const [entityId, setEntityId] = useState(initialEntityId);
    const [userId, setUserId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    // Expandable changes state
    const [expandedLogIds, setExpandedLogIds] = useState(new Set());

    const companyId = GetCompanyId();

    const toggleExpand = (logId) => {
        setExpandedLogIds(prev => {
            const next = new Set(prev);
            if (next.has(logId)) next.delete(logId);
            else next.add(logId);
            return next;
        });
    };

    const exportToExcel = () => {
        if (!logs || logs.length === 0) {
            toast.error('No audit logs to export');
            return;
        }

        const rows = [
            ['TAB ACCOUNTS - Audit Trail Activity Log'],
            [`Exported On: ${new Date().toLocaleString()}`],
            [],
            ['Timestamp', 'User Name', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'Details / Description']
        ];

        logs.forEach(log => {
            let detailText = log.details || '-';
            try {
                if (typeof log.details === 'string' && (log.details.startsWith('{') || log.details.startsWith('['))) {
                    const parsed = JSON.parse(log.details);
                    detailText = parsed.summary || log.details;
                }
            } catch {}

            rows.push([
                new Date(log.createdAt).toLocaleString(),
                log.userName || log.user?.name || 'System',
                log.userEmail || log.user?.email || '-',
                log.action,
                log.entity,
                log.entityId || '-',
                detailText
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
        XLSX.writeFile(wb, `Audit_Trail_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Audit log exported to Excel');
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchAuditLogs();
    }, [page, limit, action, entity, entityId, userId, startDate, endDate]);

    const fetchUsers = async () => {
        try {
            const response = await axiosInstance.get(`/users?companyId=${companyId}`);
            if (response.data && response.data.success) {
                setUsers(response.data.data || []);
            } else if (Array.isArray(response.data)) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error('Error fetching users for filter:', error);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: search.trim() || undefined,
                action: action || undefined,
                entity: entity || undefined,
                entityId: entityId.trim() || undefined,
                userId: userId || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            const response = await axiosInstance.get('/audit-logs', { params });
            if (response.data) {
                setLogs(response.data.logs || []);
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.totalPages || 1);
                    setTotalLogs(response.data.pagination.total || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchAuditLogs();
    };

    const handleResetFilters = () => {
        setSearch('');
        setAction('');
        setEntity('');
        setEntityId('');
        setUserId('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const getActionBadge = (act) => {
        if (!act) return null;
        const normalized = act.toUpperCase();
        switch (normalized) {
            case 'CREATE':
                return (
                    <span className="audit-action-badge audit-create-badge">
                        <span className="audit-dot"></span>
                        CREATE
                    </span>
                );
            case 'UPDATE':
                return (
                    <span className="audit-action-badge audit-update-badge">
                        <span className="audit-dot"></span>
                        UPDATE
                    </span>
                );
            case 'DELETE':
                return (
                    <span className="audit-action-badge audit-delete-badge">
                        <span className="audit-dot"></span>
                        DELETE
                    </span>
                );
            case 'PAYMENT_ADD':
                return (
                    <span className="audit-action-badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                        <span className="audit-dot" style={{ background: '#10b981' }}></span>
                        PAYMENT ADDED
                    </span>
                );
            case 'PAYMENT_UPDATE':
                return (
                    <span className="audit-action-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                        <span className="audit-dot" style={{ background: '#3b82f6' }}></span>
                        PAYMENT UPDATED
                    </span>
                );
            case 'PAYMENT_REMOVE':
            case 'UNPAY':
                return (
                    <span className="audit-action-badge" style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}>
                        <span className="audit-dot" style={{ background: '#f97316' }}></span>
                        PAYMENT REMOVED
                    </span>
                );
            case 'STATUS_CHANGE':
                return (
                    <span className="audit-action-badge" style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
                        <span className="audit-dot" style={{ background: '#a855f7' }}></span>
                        STATUS CHANGED
                    </span>
                );
            default:
                return <span className="audit-action-badge audit-default-badge">{act}</span>;
        }
    };

    const renderDetails = (detailsStr, entityType, logId) => {
        if (!detailsStr) return <span className="text-gray-400 italic">No details provided</span>;

        let parsed = null;
        if (typeof detailsStr === 'object') {
            parsed = detailsStr;
        } else if (typeof detailsStr === 'string' && (detailsStr.startsWith('{') || detailsStr.startsWith('['))) {
            try {
                parsed = JSON.parse(detailsStr);
            } catch {
                parsed = null;
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            return <span>{detailsStr}</span>;
        }

        const isExpanded = expandedLogIds.has(logId);
        const hasChanges = Array.isArray(parsed.changes) && parsed.changes.length > 0;

        return (
            <div className="audit-details-wrapper">
                <div className="audit-details-summary">
                    {parsed.summary || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed))}
                </div>

                {hasChanges && (
                    <div>
                        <button
                            type="button"
                            className="audit-changes-btn"
                            onClick={() => toggleExpand(logId)}
                        >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            <span>{isExpanded ? 'Hide Changes' : `View Field Changes (${parsed.changes.length})`}</span>
                        </button>

                        {isExpanded && (
                            <div className="audit-diff-box">
                                <table className="audit-diff-table">
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Previous Value</th>
                                            <th>New Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsed.changes.map((c, i) => (
                                            <tr key={i}>
                                                <td className="audit-diff-field">{c.fieldLabel || c.field}</td>
                                                <td>
                                                    {c.previousValue !== null && c.previousValue !== undefined ? (
                                                        <span className="audit-diff-prev">{String(c.previousValue)}</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {c.newValue !== null && c.newValue !== undefined ? (
                                                        <span className="audit-diff-new">{String(c.newValue)}</span>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Removed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="audit-logs-page">
            <div className="audit-page-header">
                <div>
                    <h1 className="audit-page-title">Audit Logs</h1>
                    <p className="audit-page-subtitle">Track and monitor all user activities and data mutations</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={exportToExcel} className="audit-btn-refresh" title="Export to Excel" style={{ background: '#1e293b', color: '#ffffff', borderColor: '#1e293b' }}>
                        <Download size={16} />
                        <span>Export Excel</span>
                    </button>
                    <button onClick={fetchAuditLogs} className="audit-btn-refresh" title="Refresh logs">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter and Search Panel */}
            <div className="audit-filters-card">
                <form onSubmit={handleSearchSubmit} className="audit-search-form">
                    <div className="audit-search-row">
                        <div className="audit-search-input-wrapper">
                            <Search size={18} className="audit-search-icon" />
                            <input
                                type="text"
                                placeholder="Search logs by keyword, email or description..."
                                className="audit-search-field"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="audit-btn-search">Search</button>
                        <button type="button" onClick={handleResetFilters} className="audit-btn-reset">Reset</button>
                    </div>
                </form>

                <div className="audit-filters-grid">
                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Action</label>
                        <select className="audit-filter-select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
                            <option value="">All Actions</option>
                            <option value="CREATE">CREATE</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PAYMENT_ADD">PAYMENT ADDED</option>
                            <option value="PAYMENT_UPDATE">PAYMENT UPDATED</option>
                            <option value="PAYMENT_REMOVE">PAYMENT REMOVED</option>
                            <option value="STATUS_CHANGE">STATUS CHANGED</option>
                        </select>
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Entity Type</label>
                        <select className="audit-filter-select" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
                            <option value="">All Entities</option>
                            <option value="Invoice">Sales Invoice</option>
                            <option value="PurchaseBill">Purchase Bill</option>
                            <option value="Receipt">Sales Receipt</option>
                            <option value="Payment">Vendor Payment</option>
                            <option value="Voucher">Journal Voucher</option>
                            <option value="Customer">Customer</option>
                            <option value="Vendor">Vendor</option>
                            <option value="Product">Product</option>
                            <option value="POS">POS Invoice</option>
                        </select>
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Invoice / Entity ID</label>
                        <input
                            type="text"
                            placeholder="e.g. 79 or INV-001"
                            className="audit-filter-date"
                            style={{ padding: '0.45rem 0.65rem', height: '36px' }}
                            value={entityId}
                            onChange={(e) => { setEntityId(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">User</label>
                        <select className="audit-filter-select" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
                            <option value="">All Users</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Start Date</label>
                        <div className="audit-date-input-wrapper">
                            <Calendar size={14} className="audit-date-icon" />
                            <input
                                type="date"
                                className="audit-filter-date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">End Date</label>
                        <div className="audit-date-input-wrapper">
                            <Calendar size={14} className="audit-date-icon" />
                            <input
                                type="date"
                                className="audit-filter-date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="audit-table-card">
                {loading ? (
                    <div className="audit-loading-spinner-container">
                        <Loader2 className="animate-spin audit-spinner" size={40} />
                        <span className="mt-2 text-sm text-gray-500">Loading audit trail...</span>
                    </div>
                ) : (
                    <>
                        <div className="audit-table-responsive">
                            <table className="audit-data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>Timestamp</th>
                                        <th style={{ width: '20%' }}>User</th>
                                        <th style={{ width: '12%' }}>Action</th>
                                        <th style={{ width: '13%' }}>Entity Type</th>
                                        <th style={{ width: '40%' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="audit-empty-state">
                                                <FileText size={48} className="audit-empty-icon mx-auto mb-2" />
                                                <p className="audit-empty-title">No activity logs found</p>
                                                <p className="audit-empty-subtitle">Try adjusting your filters or keyword search</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="audit-timestamp-cell">
                                                    <div className="audit-timestamp-wrapper">
                                                        <Clock size={12} className="audit-timestamp-icon" />
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="audit-user-info">
                                                        <div className="audit-user-avatar">
                                                            {log.userName || (log.user && log.user.name) ? (log.userName || log.user.name).charAt(0).toUpperCase() : <User size={14} />}
                                                        </div>
                                                        <div className="audit-user-details">
                                                            <span className="audit-user-name">{log.userName || (log.user && log.user.name) || 'System / Unknown'}</span>
                                                            <span className="audit-user-email">{log.userEmail || (log.user && log.user.email) || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{getActionBadge(log.action)}</td>
                                                <td>
                                                    <span className="audit-entity-tag">
                                                        {log.entity}
                                                    </span>
                                                </td>
                                                <td className="audit-log-details-cell">
                                                    {renderDetails(log.details, log.entity, log.id)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Section */}
                        {logs.length > 0 && (
                            <div className="audit-pagination-footer">
                                <span className="audit-pagination-info">
                                    Showing <span className="audit-pagination-bold">{logs.length}</span> of{' '}
                                    <span className="audit-pagination-bold">{totalLogs}</span> entries
                                </span>

                                <div className="audit-pagination-controls">
                                    <button
                                        onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                        disabled={page === 1}
                                        className="audit-pagination-btn"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="audit-pagination-page-indicator">
                                        Page <span className="audit-pagination-bold">{page}</span> of{' '}
                                        <span className="audit-pagination-bold">{totalPages}</span>
                                    </span>
                                    <button
                                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={page === totalPages}
                                        className="audit-pagination-btn"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="audit-page-limit-selector">
                                    <span className="audit-limit-label">Show:</span>
                                    <select
                                        className="audit-limit-select"
                                        value={limit}
                                        onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                                    >
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
