import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronDown, Pencil, CreditCard, RotateCcw,
    Mail, Download, Printer, Shield, Trash2, FileSpreadsheet
} from 'lucide-react';

const InvoiceActionDropdown = ({
    invoice,
    variant = 'row', // 'row' | 'detail'
    isOpen,
    onToggle,
    onClose,
    hasPermission,
    handleEdit,
    handleDelete,
    handleUnpay,
    handleOpenEmailModal,
    handleDownloadSingleInvoicePDF,
    handlePrintInvoice,
    handlePrint,
    navigate,
    setShowExportModal,
    handleOpenExportModal,
    setViewMode
}) => {
    const containerRef = useRef(null);
    const [opensUpward, setOpensUpward] = useState(false);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 320 && rect.top > 320) {
                setOpensUpward(true);
            } else {
                setOpensUpward(false);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!invoice) return null;

    const isPos = invoice.type === 'POS_INVOICE';
    const canEdit = !isPos && (hasPermission ? hasPermission('edit sales invoice') : true);
    const canDelete = hasPermission ? hasPermission('delete sales invoice') : true;
    const canPay = (invoice.balanceAmount > 0) && (hasPermission ? hasPermission('create sales payment') : true);
    const canUnpay = !isPos && (invoice.paidAmount > 0 || invoice.status === 'PAID' || invoice.status === 'PARTIAL') && (hasPermission ? hasPermission('edit sales invoice') : true);

    const handleReceivePayment = () => {
        onClose?.();
        if (navigate) {
            navigate('/company/sales/payment', {
                state: {
                    targetInvoiceId: invoice.id,
                    invoiceType: invoice.type,
                    customerId: invoice.customerId
                }
            });
        }
    };

    const handleAuditTrail = () => {
        onClose?.();
        if (navigate && invoice) {
            const invoiceId = invoice.id || invoice.invoiceId || '';
            const invoiceNum = invoice.invoiceNumber || invoice.number || '';
            const invoiceType = invoice.type || 'TAX_INVOICE';

            navigate(
                `/company/settings/audit-logs?entityType=Invoice&entityId=${invoiceId}&invoiceNumber=${encodeURIComponent(invoiceNum)}`,
                {
                    state: {
                        fromInvoice: {
                            id: invoiceId,
                            invoiceNumber: invoiceNum,
                            type: invoiceType
                        }
                    }
                }
            );
        }
    };

    const handlePrintAction = () => {
        onClose?.();
        if (variant === 'detail' && handlePrint) {
            handlePrint();
        } else if (handlePrintInvoice) {
            handlePrintInvoice(invoice);
        }
    };

    const handleEditAction = () => {
        onClose?.();
        if (variant === 'detail' && setViewMode) {
            setViewMode(false);
        }
        if (handleEdit) {
            handleEdit(invoice);
        }
    };

    return (
        <div className={`Invoice-actions-container ${variant === 'detail' ? 'Invoice-actions-container-detail' : ''}`} ref={containerRef}>
            <button
                type="button"
                className={variant === 'detail' ? 'Invoice-detail-actions-trigger-btn' : 'Invoice-actions-trigger-btn'}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.();
                }}
                aria-haspopup="true"
                aria-expanded={isOpen}
                title="Invoice Actions"
            >
                <span>Actions</span>
                <ChevronDown size={variant === 'detail' ? 16 : 14} className={`Invoice-dropdown-chevron ${isOpen ? 'rotate' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className={`Invoice-actions-dropdown-menu ${opensUpward ? 'opens-up' : 'opens-down'} ${variant === 'detail' ? 'Invoice-actions-dropdown-menu-detail' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Edit Invoice */}
                    {canEdit && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={handleEditAction}
                        >
                            <Pencil size={14} color="#0284c7" />
                            <span>Edit Invoice</span>
                        </button>
                    )}

                    {/* Receive Payment */}
                    {canPay && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={handleReceivePayment}
                        >
                            <CreditCard size={14} color="#10b981" />
                            <span>Receive Payment</span>
                        </button>
                    )}

                    {/* Mark as Unpaid & Revert Payments (if applicable) */}
                    {canUnpay && handleUnpay && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={() => {
                                onClose?.();
                                handleUnpay(invoice);
                            }}
                        >
                            <RotateCcw size={14} color="#f97316" />
                            <span>Mark as Unpaid</span>
                        </button>
                    )}

                    {/* Email Invoice */}
                    {handleOpenEmailModal && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={() => {
                                onClose?.();
                                handleOpenEmailModal(invoice);
                            }}
                        >
                            <Mail size={14} color="#3b82f6" />
                            <span>Email Invoice</span>
                        </button>
                    )}

                    {/* Download PDF */}
                    {handleDownloadSingleInvoicePDF && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={() => {
                                onClose?.();
                                handleDownloadSingleInvoicePDF(invoice);
                            }}
                        >
                            <Download size={14} color="#059669" />
                            <span>Download PDF</span>
                        </button>
                    )}

                    {/* Print */}
                    {(handlePrintInvoice || handlePrint) && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={handlePrintAction}
                        >
                            <Printer size={14} color="#475569" />
                            <span>Print</span>
                        </button>
                    )}

                    {/* Export */}
                    {(handleOpenExportModal || setShowExportModal) && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={() => {
                                onClose?.();
                                if (handleOpenExportModal) {
                                    handleOpenExportModal(invoice);
                                } else if (setShowExportModal) {
                                    setShowExportModal(true);
                                }
                            }}
                        >
                            <FileSpreadsheet size={14} color="#0891b2" />
                            <span>Export</span>
                        </button>
                    )}

                    {/* Audit Trail */}
                    {navigate && invoice.invoiceNumber && (
                        <button
                            type="button"
                            className="Invoice-actions-item"
                            onClick={handleAuditTrail}
                        >
                            <Shield size={14} color="#6366f1" />
                            <span>Audit Trail</span>
                        </button>
                    )}

                    {/* Destructive Delete Invoice at Bottom */}
                    {canDelete && handleDelete && (
                        <>
                            <div className="Invoice-actions-divider" />
                            <button
                                type="button"
                                className="Invoice-actions-item danger"
                                onClick={() => {
                                    onClose?.();
                                    handleDelete(invoice);
                                }}
                            >
                                <Trash2 size={14} color="#ef4444" />
                                <span>Delete Invoice</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default InvoiceActionDropdown;
