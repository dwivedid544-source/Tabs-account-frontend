import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Filter, Clock, User, Shield, Loader2,
    Calendar, RefreshCw, ChevronLeft, ChevronRight, FileText, Download,
    ChevronDown, ChevronUp, ArrowLeft, Eye, X, Copy, Check, Trash2,
    Building, AlertCircle, Info, ShoppingBag, Hash, Tag, DollarSign,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../../api/axiosInstance';
import GetCompanyId from '../../../api/GetCompanyId';
import { AuthContext } from '../../../context/AuthContext';
import * as XLSX from 'xlsx';
import './AuditLogs.css';

const AuditLogs = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useContext(AuthContext);
    const isSuperAdmin = currentUser?.role?.toUpperCase() === 'SUPERADMIN';

    const [searchParams, setSearchParams] = useSearchParams();
    const queryEntityType = searchParams.get('entityType') || searchParams.get('entity') || '';
    const queryEntityId = searchParams.get('entityId') || searchParams.get('invoiceId') || searchParams.get('fromInvoiceId') || '';
    const querySearch = searchParams.get('search') || '';
    const queryAction = searchParams.get('action') || '';
    const queryInvoiceNumber = searchParams.get('invoiceNumber') || '';
    const queryInvoiceType = searchParams.get('invoiceType') || searchParams.get('type') || '';

    const initialEntity = queryEntityType || (queryEntityId ? 'Invoice' : '');
    const initialEntityId = queryEntityId;
    const initialSearch = querySearch;
    const initialAction = queryAction;

    // Preserve invoice context from navigation state or URL query params
    const fromInvoiceState = location.state?.fromInvoice;
    const fromInvoiceParamId = queryEntityId;
    const fromInvoiceParamNumber = queryInvoiceNumber;
    const fromInvoiceParamType = queryInvoiceType;

    // Consolidated invoice origin context
    const invoiceContext = fromInvoiceState || (fromInvoiceParamId || fromInvoiceParamNumber ? {
        id: fromInvoiceParamId ? (isNaN(parseInt(fromInvoiceParamId)) ? fromInvoiceParamId : parseInt(fromInvoiceParamId)) : undefined,
        invoiceNumber: fromInvoiceParamNumber || '',
        type: fromInvoiceParamType || 'TAX_INVOICE'
    } : null);

    const [resolvedInvoiceId, setResolvedInvoiceId] = useState(invoiceContext?.id || (queryEntityId && !isNaN(parseInt(queryEntityId)) ? parseInt(queryEntityId) : null));
    const [resolvedInvoiceNumber, setResolvedInvoiceNumber] = useState(invoiceContext?.invoiceNumber || queryInvoiceNumber || '');

    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [search, setSearch] = useState(initialSearch);
    const [action, setAction] = useState(initialAction);
    const [entity, setEntity] = useState(initialEntity);
    const [entityId, setEntityId] = useState(initialEntityId);
    const [userId, setUserId] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    // Expandable changes state in table
    const [expandedLogIds, setExpandedLogIds] = useState(new Set());

    // Selected log for Detail Modal
    const [selectedLog, setSelectedLog] = useState(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const [copiedJson, setCopiedJson] = useState(false);

    // Export options state
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [exporting, setExporting] = useState(false);
    const exportDropdownRef = useRef(null);

    // Close export dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportMenu]);

    const companyId = GetCompanyId();

    const toggleExpand = (logId, e) => {
        if (e) e.stopPropagation();
        setExpandedLogIds(prev => {
            const next = new Set(prev);
            if (next.has(logId)) next.delete(logId);
            else next.add(logId);
            return next;
        });
    };

    const copyJsonToClipboard = (data) => {
        try {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopiedJson(true);
            toast.success('Raw log JSON copied to clipboard');
            setTimeout(() => setCopiedJson(false), 2000);
        } catch {
            toast.error('Failed to copy JSON');
        }
    };

    const generateExcelFromLogs = (logsToExport, scopeType) => {
        if (!logsToExport || logsToExport.length === 0) {
            toast.error('No audit logs to export');
            return;
        }

        const headers = ['Timestamp', 'User Name', 'User Email', 'Action', 'Entity Type', 'Entity ID'];
        if (isSuperAdmin) headers.push('Company');
        headers.push('Details / Description');

        const scopeLabel = scopeType === 'all'
            ? `Export Scope: All Filtered Records (${logsToExport.length} entries)`
            : `Export Scope: Current Page (Page ${page} of ${totalPages} - ${logsToExport.length} entries)`;

        const rows = [
            ['TAB ACCOUNTS - Audit Trail Activity Log'],
            [`Exported On: ${new Date().toLocaleString()}`],
            [scopeLabel],
            [],
            headers
        ];

        logsToExport.forEach(log => {
            let detailText = log.details || '-';
            try {
                if (typeof log.details === 'string' && (log.details.startsWith('{') || log.details.startsWith('['))) {
                    const parsed = JSON.parse(log.details);
                    detailText = parsed.summary || log.details;
                }
            } catch {}

            const row = [
                new Date(log.createdAt).toLocaleString(),
                log.userName || log.user?.name || 'System',
                log.userEmail || log.user?.email || '-',
                log.action,
                log.entity,
                log.entityId || '-'
            ];

            if (isSuperAdmin) {
                row.push(log.company?.name || `Company #${log.companyId}`);
            }

            row.push(detailText);
            rows.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Auto column widths
        ws['!cols'] = [
            { wch: 22 }, // Timestamp
            { wch: 22 }, // User Name
            { wch: 28 }, // User Email
            { wch: 16 }, // Action
            { wch: 18 }, // Entity Type
            { wch: 12 }, // Entity ID
            ...(isSuperAdmin ? [{ wch: 20 }] : []), // Company
            { wch: 65 }  // Details / Description
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = scopeType === 'all'
            ? `Audit_Trail_All_${logsToExport.length}_Records_${dateStr}.xlsx`
            : `Audit_Trail_Page_${page}_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const handleExport = async (type) => {
        setShowExportMenu(false);

        if (type === 'current') {
            if (!logs || logs.length === 0) {
                toast.error('No logs available on this page to export');
                return;
            }
            generateExcelFromLogs(logs, 'current');
            toast.success(`Exported current page (${logs.length} logs) to Excel`);
            return;
        }

        // Export All
        if (totalLogs === 0) {
            toast.error('No audit logs available matching the current filters');
            return;
        }

        const toastId = toast.loading(`Fetching all ${totalLogs} audit records for export...`);
        setExporting(true);

        try {
            const baseParams = {
                search: search.trim() || undefined,
                action: action || undefined,
                entity: entity || undefined,
                entityId: entityId.trim() || undefined,
                userId: userId || undefined,
                companyId: selectedCompanyId || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            // Fetch with all=true and large limit
            const firstResponse = await axiosInstance.get('/audit-logs', {
                params: {
                    ...baseParams,
                    all: 'true',
                    limit: 1000,
                    page: 1
                },
                headers: { 'X-No-Loader': 'true' }
            });

            let allFetchedLogs = firstResponse.data?.logs || [];
            const expectedTotal = firstResponse.data?.pagination?.total || totalLogs;

            // Fallback pagination if backend capped the result set
            if (allFetchedLogs.length < expectedTotal) {
                const perPageLimit = allFetchedLogs.length > 0 ? allFetchedLogs.length : 100;
                const totalPagesNeeded = Math.ceil(expectedTotal / perPageLimit);

                toast.loading(`Fetching records (page 1 of ${totalPagesNeeded})...`, { id: toastId });

                const remainingPagePromises = [];
                for (let p = 2; p <= totalPagesNeeded; p++) {
                    remainingPagePromises.push(
                        axiosInstance.get('/audit-logs', {
                            params: {
                                ...baseParams,
                                page: p,
                                limit: perPageLimit
                            },
                            headers: { 'X-No-Loader': 'true' }
                        }).then(res => res.data?.logs || []).catch(err => {
                            console.error(`Failed to fetch audit log page ${p}:`, err);
                            return [];
                        })
                    );
                }

                const remainingResults = await Promise.all(remainingPagePromises);
                remainingResults.forEach(pageLogs => {
                    allFetchedLogs = allFetchedLogs.concat(pageLogs);
                });
            }

            if (allFetchedLogs.length === 0) {
                toast.error('No records retrieved for export', { id: toastId });
                return;
            }

            generateExcelFromLogs(allFetchedLogs, 'all');
            toast.success(`Successfully exported all ${allFetchedLogs.length} audit logs to Excel!`, { id: toastId });
        } catch (error) {
            console.error('Error during full audit logs export:', error);
            toast.error('Failed to export all audit logs. Please try again.', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        if (isSuperAdmin) {
            fetchCompanies();
        }
    }, [isSuperAdmin]);

    // Synchronize filters when URL search parameters change (deep linking / back-forward navigation)
    useEffect(() => {
        const pEntityType = searchParams.get('entityType') || searchParams.get('entity') || '';
        const pEntityId = searchParams.get('entityId') || searchParams.get('invoiceId') || searchParams.get('fromInvoiceId') || '';
        const pSearch = searchParams.get('search') || '';
        const pAction = searchParams.get('action') || '';
        const pInvoiceNum = searchParams.get('invoiceNumber') || '';

        if (pEntityType || pEntityId) {
            setEntity(pEntityType || (pEntityId ? 'Invoice' : ''));
            setEntityId(pEntityId);
            setSearch(pSearch);
            if (pAction) setAction(pAction);
            if (pEntityId) setResolvedInvoiceId(isNaN(parseInt(pEntityId)) ? pEntityId : parseInt(pEntityId));
            if (pInvoiceNum) setResolvedInvoiceNumber(pInvoiceNum);
            setPage(1);
        } else if (!searchParams.toString()) {
            setEntity('');
            setEntityId('');
            setSearch('');
            setAction('');
            setResolvedInvoiceId(null);
            setResolvedInvoiceNumber('');
            setPage(1);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchAuditLogs();
    }, [page, limit, action, entity, entityId, userId, selectedCompanyId, startDate, endDate]);

    const fetchUsers = async () => {
        try {
            const url = companyId ? `/users?companyId=${companyId}` : '/users';
            const response = await axiosInstance.get(url);
            if (response.data && response.data.success) {
                setUsers(response.data.data || []);
            } else if (Array.isArray(response.data)) {
                setUsers(response.data);
            }
        } catch (error) {
            console.error('Error fetching users for filter:', error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await axiosInstance.get('/companies');
            if (response.data && response.data.data) {
                setCompanies(response.data.data || []);
            } else if (Array.isArray(response.data)) {
                setCompanies(response.data);
            }
        } catch (error) {
            console.error('Error fetching companies for superadmin filter:', error);
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
                entityType: entity || undefined,
                entityId: entityId.trim() || undefined,
                userId: userId || undefined,
                companyId: selectedCompanyId || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            const response = await axiosInstance.get('/audit-logs', { params });
            if (response.data) {
                const fetchedLogs = response.data.logs || [];
                setLogs(fetchedLogs);
                if (response.data.pagination) {
                    setTotalPages(response.data.pagination.totalPages || 1);
                    setTotalLogs(response.data.pagination.total || 0);
                }

                if (!resolvedInvoiceId && fetchedLogs.length > 0) {
                    const match = fetchedLogs.find(l => (l.entity === 'Invoice' || l.entityType === 'Invoice' || l.entity === 'Sales Invoice') && l.entityId);
                    if (match && match.entityId) {
                        setResolvedInvoiceId(match.entityId);
                    }
                }

                if (!resolvedInvoiceNumber && fetchedLogs.length > 0) {
                    for (const l of fetchedLogs) {
                        try {
                            const p = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                            if (p?.invoiceNumber) {
                                setResolvedInvoiceNumber(p.invoiceNumber);
                                break;
                            }
                        } catch {}
                    }
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
        setSelectedCompanyId('');
        setStartDate('');
        setEndDate('');
        setPage(1);
        setResolvedInvoiceId(null);
        setResolvedInvoiceNumber('');
        setSearchParams({}, { replace: true });
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
            case 'DELETE_FAILED':
                return (
                    <span className="audit-action-badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                        <span className="audit-dot" style={{ background: '#ef4444' }}></span>
                        DELETE FAILED
                    </span>
                );
            case 'UPDATE_SECURITY':
                return (
                    <span className="audit-action-badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                        <span className="audit-dot" style={{ background: '#22c55e' }}></span>
                        SECURITY UPDATED
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

    const parseDetails = (detailsStr) => {
        if (!detailsStr) return null;
        if (typeof detailsStr === 'object') return detailsStr;
        if (typeof detailsStr === 'string' && (detailsStr.startsWith('{') || detailsStr.startsWith('['))) {
            try {
                return JSON.parse(detailsStr);
            } catch {
                return null;
            }
        }
        return null;
    };

    const renderDetailsSummary = (detailsStr, entityType, logId) => {
        if (!detailsStr) return <span className="text-gray-400 italic">No details provided</span>;

        const parsed = parseDetails(detailsStr);

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
                            onClick={(e) => toggleExpand(logId, e)}
                        >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            <span>{isExpanded ? 'Hide Changes' : `View Field Changes (${parsed.changes.length})`}</span>
                        </button>

                        {isExpanded && (
                            <div className="audit-diff-box" onClick={(e) => e.stopPropagation()}>
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

    const activeInvoiceNumber = resolvedInvoiceNumber || invoiceContext?.invoiceNumber || (entity === 'Invoice' && search.trim() ? search.trim() : '');
    const hasInvoiceContext = Boolean(resolvedInvoiceId || invoiceContext?.id || (entity === 'Invoice' && entityId) || activeInvoiceNumber);

    const handleBack = () => {
        const targetInvoiceId = invoiceContext?.id || resolvedInvoiceId || (entity === 'Invoice' && !isNaN(parseInt(entityId)) ? parseInt(entityId) : undefined);
        const targetInvoiceNumber = invoiceContext?.invoiceNumber || resolvedInvoiceNumber || activeInvoiceNumber;
        const targetType = invoiceContext?.type || searchParams.get('invoiceType') || searchParams.get('type') || 'TAX_INVOICE';

        if (targetInvoiceId || targetInvoiceNumber) {
            navigate('/company/sales/invoice', {
                state: {
                    targetInvoiceId: targetInvoiceId || undefined,
                    targetInvoiceNumber: targetInvoiceNumber || undefined,
                    type: targetType,
                    autoOpenDetail: true
                }
            });
            return;
        }

        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/company/sales/invoice');
        }
    };

    // Helper to render Detail Modal contents
    const renderModalBody = (log) => {
        if (!log) return null;
        const parsed = parseDetails(log.details) || {};
        const isDelete = log.action === 'DELETE';
        const deletedRecord = parsed.deletedRecord || (isDelete ? parsed.previousValue : null);
        const deletedItems = parsed.items || deletedRecord?.items || [];
        const changes = Array.isArray(parsed.changes) ? parsed.changes : [];

        return (
            <div className="audit-modal-body">
                {/* Meta Overview Cards */}
                <div className="audit-meta-grid">
                    <div className="audit-meta-card">
                        <div className="audit-meta-card-label">User / Performed By</div>
                        <div className="audit-meta-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} style={{ color: '#64748b' }} />
                            <span>{log.userName || log.user?.name || 'System / Automated'}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {log.userEmail || log.user?.email || 'N/A'} {log.user?.role ? `(${log.user.role})` : ''}
                        </div>
                    </div>

                    <div className="audit-meta-card">
                        <div className="audit-meta-card-label">Entity & ID</div>
                        <div className="audit-meta-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={14} style={{ color: '#64748b' }} />
                            <span>{log.entity} #{log.entityId || parsed.invoiceNumber || 'N/A'}</span>
                        </div>
                        {parsed.poNumber && (
                            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>
                                PO #: {parsed.poNumber}
                            </div>
                        )}
                    </div>

                    <div className="audit-meta-card">
                        <div className="audit-meta-card-label">Timestamp</div>
                        <div className="audit-meta-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} style={{ color: '#64748b' }} />
                            <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                    </div>

                    {isSuperAdmin && (
                        <div className="audit-meta-card">
                            <div className="audit-meta-card-label">Company</div>
                            <div className="audit-meta-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building size={14} style={{ color: '#64748b' }} />
                                <span>{log.company?.name || `Company #${log.companyId}`}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                ID: {log.companyId}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Banner */}
                <div className={`audit-summary-banner ${isDelete ? 'is-delete' : (log.action === 'CREATE' ? 'is-create' : '')}`}>
                    <strong>Event Summary: </strong>
                    {parsed.summary || (typeof log.details === 'string' ? log.details : 'Activity logged successfully.')}
                </div>

                {/* DELETED RECORD VIEW (Special Snapshot Card) */}
                {isDelete && deletedRecord && (
                    <div className="audit-deleted-snapshot-card">
                        <div className="audit-deleted-header">
                            <Trash2 size={18} />
                            <span>Deleted Record Snapshot (What Was Inside)</span>
                        </div>

                        <div className="audit-snapshot-details-grid">
                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Invoice / Record #</span>
                                <span className="audit-snapshot-item-val">{deletedRecord.invoiceNumber || parsed.invoiceNumber || log.entityId || '-'}</span>
                            </div>

                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Customer / Party</span>
                                <span className="audit-snapshot-item-val">{deletedRecord.customerName || parsed.customerName || (deletedRecord.customerId ? `Customer #${deletedRecord.customerId}` : '-')}</span>
                            </div>

                            {deletedRecord.poNumber && (
                                <div className="audit-snapshot-item">
                                    <span className="audit-snapshot-item-label">Purchase Order (P.O. #)</span>
                                    <span className="audit-snapshot-item-val" style={{ color: '#2563eb' }}>{deletedRecord.poNumber}</span>
                                </div>
                            )}

                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Invoice Date</span>
                                <span className="audit-snapshot-item-val">{deletedRecord.date || '-'}</span>
                            </div>

                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Due Date</span>
                                <span className="audit-snapshot-item-val">{deletedRecord.dueDate || '-'}</span>
                            </div>

                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Status Before Delete</span>
                                <span className="audit-snapshot-item-val">
                                    <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#f1f5f9', fontWeight: 700, fontSize: '0.8rem' }}>
                                        {deletedRecord.status || 'N/A'}
                                    </span>
                                </span>
                            </div>

                            <div className="audit-snapshot-item">
                                <span className="audit-snapshot-item-label">Total Amount</span>
                                <span className="audit-snapshot-item-val" style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 700 }}>
                                    {deletedRecord.totalAmount ? Number(deletedRecord.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                </span>
                            </div>

                            {deletedRecord.paidAmount !== undefined && (
                                <div className="audit-snapshot-item">
                                    <span className="audit-snapshot-item-label">Paid / Balance</span>
                                    <span className="audit-snapshot-item-val">
                                        Paid: {Number(deletedRecord.paidAmount || 0).toFixed(2)} | Bal: {Number(deletedRecord.balanceAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Deleted Line Items Table */}
                        {Array.isArray(deletedItems) && deletedItems.length > 0 ? (
                            <div>
                                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Line Items Inside Record ({deletedItems.length})
                                </div>
                                <div className="audit-items-table-wrapper">
                                    <table className="audit-items-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '5%' }}>#</th>
                                                <th style={{ width: '40%' }}>Description / Item</th>
                                                <th style={{ width: '12%', textAlign: 'right' }}>Quantity</th>
                                                <th style={{ width: '13%', textAlign: 'right' }}>Rate</th>
                                                <th style={{ width: '10%', textAlign: 'right' }}>Disc</th>
                                                <th style={{ width: '10%', textAlign: 'right' }}>Tax %</th>
                                                <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>{item.description || item.productName || 'Sales Item'}</div>
                                                        {item.productId && <div style={{ fontSize: '0.725rem', color: '#64748b' }}>Prod ID: {item.productId}</div>}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>{item.quantity || 0}</td>
                                                    <td style={{ textAlign: 'right' }}>{Number(item.rate || 0).toFixed(2)}</td>
                                                    <td style={{ textAlign: 'right' }}>{item.discount ? `${item.discount}` : '-'}</td>
                                                    <td style={{ textAlign: 'right' }}>{item.taxRate ? `${item.taxRate}%` : '0%'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {Number(item.amount || (item.quantity * item.rate) || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="audit-items-table-total-row">
                                                <td colSpan="6" style={{ textAlign: 'right' }}>Grand Total:</td>
                                                <td style={{ textAlign: 'right', color: '#059669' }}>
                                                    {deletedRecord.totalAmount ? Number(deletedRecord.totalAmount).toFixed(2) : '-'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.825rem', color: '#64748b', fontStyle: 'italic' }}>
                                No specific individual line item breakdown was recorded for this deletion snapshot.
                            </div>
                        )}
                    </div>
                )}

                {/* FIELD CHANGES TABLE (For Updates or Any Changes) */}
                {changes.length > 0 && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Info size={16} style={{ color: '#2563eb' }} />
                            <span>Detailed Field Changes ({changes.length})</span>
                        </div>
                        <div className="audit-items-table-wrapper" style={{ marginTop: 0 }}>
                            <table className="audit-items-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30%' }}>Field Name</th>
                                        <th style={{ width: '35%' }}>Previous Value</th>
                                        <th style={{ width: '35%' }}>New / Updated Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {changes.map((c, i) => (
                                        <tr key={i}>
                                            <td className="audit-diff-field">{c.fieldLabel || c.field}</td>
                                            <td>
                                                {c.previousValue !== null && c.previousValue !== undefined ? (
                                                    <span className="audit-diff-prev">{String(c.previousValue)}</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None / Empty</span>
                                                )}
                                            </td>
                                            <td>
                                                {c.newValue !== null && c.newValue !== undefined ? (
                                                    <span className="audit-diff-new">{String(c.newValue)}</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Removed / Cleared</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Technical Raw JSON Inspector */}
                <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowRawJson(prev => !prev)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#475569',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {showRawJson ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span>{showRawJson ? 'Hide Raw Technical JSON Payload' : 'Inspect Raw Technical JSON Payload'}</span>
                        </button>
                    </div>

                    {showRawJson && (
                        <div className="audit-json-box">
                            <button
                                type="button"
                                className="audit-json-copy-btn"
                                onClick={() => copyJsonToClipboard(parsed)}
                                title="Copy JSON"
                            >
                                {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                            </button>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                <code>{JSON.stringify(parsed, null, 2)}</code>
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="audit-logs-page">
            <div className="audit-top-bar">
                <button
                    type="button"
                    onClick={handleBack}
                    className="audit-btn-back"
                    id="audit-back-btn"
                    title={activeInvoiceNumber ? `Return to Invoice ${activeInvoiceNumber}` : 'Back'}
                >
                    <ArrowLeft size={16} />
                    <span>{hasInvoiceContext ? (activeInvoiceNumber ? `Back to Invoice (${activeInvoiceNumber})` : 'Back to Invoice') : 'Back'}</span>
                </button>
            </div>

            <div className="audit-page-header">
                <div>
                    <h1 className="audit-page-title">Audit Logs</h1>
                    <p className="audit-page-subtitle">
                        Track, monitor and inspect all user activities, mutations and deleted items
                        {isSuperAdmin && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#ffffff', fontSize: '0.75rem', fontWeight: 600 }}>Super Admin Access</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="audit-export-dropdown-wrapper" ref={exportDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowExportMenu(prev => !prev)}
                            className="audit-btn-refresh audit-btn-export"
                            title="Export to Excel Options"
                            disabled={exporting}
                            style={{ background: '#1e293b', color: '#ffffff', borderColor: '#1e293b' }}
                        >
                            {exporting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                            <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
                            <ChevronDown
                                size={14}
                                style={{
                                    marginLeft: '2px',
                                    transform: showExportMenu ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.2s ease'
                                }}
                            />
                        </button>

                        {showExportMenu && (
                            <div className="audit-export-menu" role="menu">
                                <div className="audit-export-menu-header">
                                    <span className="audit-export-menu-label">Export Format: Excel (.xlsx)</span>
                                </div>
                                <button
                                    type="button"
                                    className="audit-export-menu-item"
                                    onClick={() => handleExport('current')}
                                    disabled={exporting || logs.length === 0}
                                >
                                    <div className="audit-export-item-icon">
                                        <FileText size={18} />
                                    </div>
                                    <div className="audit-export-item-info">
                                        <div className="audit-export-item-title">Current Page Only</div>
                                        <div className="audit-export-item-desc">
                                            Export {logs.length} entries (Page {page} of {totalPages})
                                        </div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    className="audit-export-menu-item highlight"
                                    onClick={() => handleExport('all')}
                                    disabled={exporting || totalLogs === 0}
                                >
                                    <div className="audit-export-item-icon highlight-icon">
                                        <Download size={18} />
                                    </div>
                                    <div className="audit-export-item-info">
                                        <div className="audit-export-item-title">All Records (Full Audit Trail)</div>
                                        <div className="audit-export-item-desc">
                                            Export all {totalLogs} entries across {totalPages} pages
                                        </div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={fetchAuditLogs} className="audit-btn-refresh" title="Refresh logs">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Active Invoice Filter Banner */}
            {((entity === 'Invoice' && entityId) || (searchParams.get('entityType') === 'Invoice' && searchParams.get('entityId'))) && (
                <div className="audit-active-invoice-banner" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                        <span>
                            Showing audit records for Invoice: <strong>{activeInvoiceNumber || `#${entityId}`}</strong> {entityId && <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>(ID: {entityId})</span>}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetFilters}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            transition: 'all 0.15s ease'
                        }}
                        title="Clear invoice filter and view all audit records"
                    >
                        <X size={13} />
                        <span>Clear Filter (View All Logs)</span>
                    </button>
                </div>
            )}

            {/* Filter and Search Panel */}
            <div className="audit-filters-card">
                <form onSubmit={handleSearchSubmit} className="audit-search-form">
                    <div className="audit-search-row">
                        <div className="audit-search-input-wrapper">
                            <Search size={18} className="audit-search-icon" />
                            <input
                                type="text"
                                placeholder="Search logs by keyword, email, invoice number or description..."
                                className="audit-search-field"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="audit-btn-search">Search</button>
                        <button type="button" onClick={handleResetFilters} className="audit-btn-reset">Reset</button>
                    </div>
                </form>

                <div className="audit-filters-grid" style={{ gridTemplateColumns: isSuperAdmin ? 'repeat(auto-fit, minmax(160px, 1fr))' : undefined }}>
                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Action</label>
                        <select className="audit-filter-select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
                            <option value="">All Actions</option>
                            <option value="CREATE">CREATE</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                            <option value="DELETE_FAILED">DELETE FAILED</option>
                            <option value="UPDATE_SECURITY">SECURITY UPDATED</option>
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
                            <optgroup label="Sales & Receivables">
                                <option value="Invoice">Sales Invoice</option>
                                <option value="POS">POS Invoice</option>
                                <option value="Receipt">Sales Receipt</option>
                                <option value="SalesOrder">Sales Order</option>
                                <option value="SalesQuotation">Sales Quotation</option>
                                <option value="SalesReturn">Sales Return</option>
                                <option value="DeliveryChallan">Delivery Challan</option>
                            </optgroup>
                            <optgroup label="Purchases & Payables">
                                <option value="PurchaseBill">Purchase Bill</option>
                                <option value="Payment">Vendor Payment</option>
                                <option value="PurchaseOrder">Purchase Order</option>
                                <option value="PurchaseQuotation">Purchase Quotation</option>
                                <option value="PurchaseReturn">Purchase Return</option>
                                <option value="GoodsReceiptNote">Goods Receipt Note (GRN)</option>
                                <option value="Expense">Expense</option>
                            </optgroup>
                            <optgroup label="Accounts & Banking">
                                <option value="Voucher">Journal Voucher</option>
                                <option value="Account">Account / Ledger</option>
                                <option value="AccountGroup">Account Group</option>
                                <option value="AccountSubGroup">Account Sub-Group</option>
                                <option value="Income">Direct Income</option>
                                <option value="Contra">Contra Voucher</option>
                                <option value="BankAccount">Bank Account</option>
                                <option value="BankTransfer">Bank Transfer</option>
                            </optgroup>
                            <optgroup label="Inventory & Products">
                                <option value="Product">Product</option>
                                <option value="InventoryAdjustment">Stock Adjustment</option>
                                <option value="StockTransfer">Stock Transfer</option>
                            </optgroup>
                            <optgroup label="People & Access">
                                <option value="Customer">Customer</option>
                                <option value="Vendor">Vendor</option>
                                <option value="User">User / Staff</option>
                                <option value="Role">Role & Permissions</option>
                            </optgroup>
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

                    {isSuperAdmin && (
                        <div className="audit-filter-group">
                            <label className="audit-filter-label">Company</label>
                            <select className="audit-filter-select" value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setPage(1); }}>
                                <option value="">All Companies</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || `Company #${c.id}`}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                                        <th style={{ width: '14%' }}>Timestamp</th>
                                        <th style={{ width: isSuperAdmin ? '16%' : '18%' }}>User</th>
                                        <th style={{ width: '12%' }}>Action</th>
                                        <th style={{ width: '12%' }}>Entity</th>
                                        {isSuperAdmin && <th style={{ width: '12%' }}>Company</th>}
                                        <th style={{ width: isSuperAdmin ? '34%' : '36%' }}>Details / Summary</th>
                                        <th style={{ width: '8%', textAlign: 'center' }}>Inspect</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={isSuperAdmin ? 7 : 6} className="audit-empty-state">
                                                <FileText size={48} className="audit-empty-icon mx-auto mb-2" />
                                                <p className="audit-empty-title">No activity logs found</p>
                                                <p className="audit-empty-subtitle">Try adjusting your filters or keyword search</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="audit-row-clickable"
                                                onClick={() => setSelectedLog(log)}
                                                title="Click to view complete details of this entry"
                                            >
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
                                                        {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                                                    </span>
                                                </td>
                                                {isSuperAdmin && (
                                                    <td>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                                            {log.company?.name || `Company #${log.companyId}`}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="audit-log-details-cell">
                                                    {renderDetailsSummary(log.details, log.entity, log.id)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="audit-btn-view-detail"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedLog(log);
                                                        }}
                                                        title="Click to inspect this log entry"
                                                    >
                                                        <Eye size={13} />
                                                        <span>View</span>
                                                    </button>
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

            {/* Clickable Detail Modal */}
            {selectedLog && (
                <div className="audit-modal-backdrop" onClick={() => setSelectedLog(null)}>
                    <div className="audit-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="audit-modal-header">
                            <div className="audit-modal-header-left">
                                {getActionBadge(selectedLog.action)}
                                <span className="audit-entity-tag">{selectedLog.entity}</span>
                                <h2 className="audit-modal-title">Audit Entry #{selectedLog.id}</h2>
                            </div>
                            <button
                                type="button"
                                className="audit-modal-close-btn"
                                onClick={() => setSelectedLog(null)}
                                title="Close dialog"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {renderModalBody(selectedLog)}

                        <div className="audit-modal-footer">
                            <button
                                type="button"
                                className="audit-modal-close-action-btn"
                                onClick={() => setSelectedLog(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
