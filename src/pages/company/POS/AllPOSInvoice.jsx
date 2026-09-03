import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import {
    Search, Trash2, X, FileText, Printer, Eye, ArrowLeft, Calendar, Plus, Pencil, CreditCard
} from 'lucide-react';
import posService from '../../../services/posService';
import GetCompanyId from '../../../api/GetCompanyId';
import companyService from '../../../api/companyService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import { toast } from 'react-hot-toast';
import './AllPOSInvoice.css';
import '../Sales/Invoice/Invoice.css'; // Also need this for shared template styles
const AllPOSInvoice = () => {
    const { formatCurrency, getInvoiceLabel, getDocumentTitle } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [viewMode, setViewMode] = useState(false);
    const [companyDetails, setCompanyDetails] = useState({
        name: '', address: '', email: '', phone: '', logo: '',
        template: 'Invoice-newyork', color: '#004aad', showQr: false, notes: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);

    // Payment States
    const [accounts, setAccounts] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    useEffect(() => {
        fetchPOSInvoices();
        fetchCompanyDetails();
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (invoices.length > 0 && location.state && location.state.targetInvoiceId) {
            const targetId = parseInt(location.state.targetInvoiceId);
            const foundInvoice = invoices.find(inv => inv.id === targetId);
            if (foundInvoice) {
                handleView(foundInvoice);
                // Clear state so back/refresh doesn't keep auto-opening the invoice
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [invoices, location.state]);

    const fetchAccounts = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await chartOfAccountsService.getAllLedgers(companyId);
                if (res && res.success) {
                    const assetAccounts = res.data.filter(a =>
                        a.accountgroup?.type === 'ASSETS' ||
                        a.group?.type === 'ASSETS' ||
                        a.name.toLowerCase().includes('cash') ||
                        a.name.toLowerCase().includes('bank')
                    );
                    setAccounts(assetAccounts);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchCompanyDetails = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getById(companyId);
                const data = res.data;
                setCompanyDetails({
                    name: data.name || 'Zirak Books',
                    address: data.address || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    logo: data.logo || null,
                    notes: data.notes || '',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true,
                    template: data.invoiceTemplate || 'New York',
                    color: data.invoiceColor || '#004aad'
                });
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchPOSInvoices = async (sDate = startDate, eDate = endDate) => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const params = {};
            if (sDate) params.startDate = sDate;
            if (eDate) params.endDate = eDate;
            const response = await posService.getPOSInvoices(companyId, params);
            if (response.success) {
                setInvoices(response.data);
            }
        } catch (error) {
            console.error('Error fetching POS invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPOSInvoices(startDate, endDate);
    }, [startDate, endDate]);

    const handleDelete = (id) => {
        setInvoiceToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            const companyId = GetCompanyId();
            const response = await posService.deletePOSInvoice(invoiceToDelete, companyId);
            if (response.success) {
                toast.success('Invoice voided successfully');
                fetchPOSInvoices();
            }
        } catch (error) {
            toast.error(error.message || 'Failed to delete invoice');
        } finally {
            setShowDeleteConfirm(false);
            setInvoiceToDelete(null);
        }
    };

    const handleView = (inv) => {
        setSelectedInvoice({
            ...inv,
            items: inv.posinvoiceitem || []
        });
        setViewMode(true);
    };

    const handleCollectPaymentClick = (inv, e) => {
        if (e) e.stopPropagation();
        setSelectedInvoice(inv);
        setPaymentAmount(inv.balanceAmount.toFixed(2));
        setPaymentMode(inv.paymentMode || 'CASH');
        
        const modeName = (inv.paymentMode || 'CASH') === 'CASH' ? 'cash' : 'bank';
        const defaultAcc = accounts.find(a => a.name.toLowerCase().includes(modeName)) || accounts[0];
        setSelectedAccountId(defaultAcc ? defaultAcc.id.toString() : '');
        
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentNotes(`Payment received for POS ${inv.invoiceNumber}`);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedInvoice) return;
        const amt = parseFloat(paymentAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (amt > selectedInvoice.balanceAmount + 0.01) {
            toast.error(`Amount cannot exceed the balance due of ${formatCurrency(selectedInvoice.balanceAmount)}`);
            return;
        }

        try {
            setPaymentSubmitting(true);
            const companyId = GetCompanyId();
            const payload = {
                amount: amt,
                paymentMode,
                accountId: selectedAccountId ? parseInt(selectedAccountId) : null,
                date: paymentDate,
                notes: paymentNotes
            };
            const res = await posService.recordPOSPayment(selectedInvoice.id, payload, companyId);
            if (res.success) {
                toast.success('Payment recorded successfully');
                setShowPaymentModal(false);
                await fetchPOSInvoices(); // Refresh main list
                if (viewMode) {
                    await refreshSelectedInvoice(selectedInvoice.id); // Refresh preview
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Failed to record payment');
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const refreshSelectedInvoice = async (invoiceId) => {
        try {
            const companyId = GetCompanyId();
            const res = await posService.getPOSInvoiceById(invoiceId, companyId);
            if (res && res.success) {
                setSelectedInvoice({
                    ...res.data,
                    items: res.data.posinvoiceitem || []
                });
            }
        } catch (error) {
            console.error('Error refreshing selected invoice:', error);
        }
    };

    const filteredInvoices = invoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customer?.name || 'Walk-in').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (viewMode && selectedInvoice) {
        const returnedQtyMap = {};
        let totalReturned = 0;
        if (selectedInvoice.salesreturn && selectedInvoice.salesreturn.length > 0) {
            selectedInvoice.salesreturn.forEach(ret => {
                totalReturned += ret.totalAmount || 0;
                const itemsList = ret.salesreturnitem || ret.items || [];
                itemsList.forEach(item => {
                    const pId = item.productId;
                    if (pId) {
                        returnedQtyMap[pId] = (returnedQtyMap[pId] || 0) + (item.quantity || 0);
                    }
                });
            });
        }
        const originalSubtotal = selectedInvoice.originalSubtotal !== undefined ? selectedInvoice.originalSubtotal : selectedInvoice.subtotal;
        const originalTaxAmount = selectedInvoice.originalTaxAmount !== undefined ? selectedInvoice.originalTaxAmount : selectedInvoice.taxAmount;
        const originalTotal = selectedInvoice.originalTotalAmount !== undefined ? selectedInvoice.originalTotalAmount : (selectedInvoice.totalAmount + totalReturned);
        const netTotal = selectedInvoice.totalAmount;

        return (
            <div className="posinv-view-root">
                <div className="posinv-top-bar no-print">
                    <button className="posinv-btn-back-square" onClick={() => setViewMode(false)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="posinv-header-info">
                        <h1 className="posinv-title-main">POS Invoice Detail</h1>
                        <p className="posinv-subtitle">Manage and print your POS record</p>
                    </div>
                    <div className="posinv-actions-right" style={{ display: 'flex', gap: '0.75rem' }}>
                        {selectedInvoice.balanceAmount > 0 && (
                            <button className="companypos-category-pill companypos-active" onClick={(e) => handleCollectPaymentClick(selectedInvoice, e)}>
                                <CreditCard size={18} /> Collect Payment
                            </button>
                        )}
                        <button className="companypos-category-pill companypos-active" onClick={() => window.print()}>
                            <Printer size={18} /> Print Record
                        </button>
                    </div>
                </div>

                <div
                    className={`invoice-preview-container posinv-receipt-card template-${(companyDetails.template || 'Invoice-newyork').toLowerCase().replace(/\s+/g, '')}`}
                    id="invoice-print-area"
                    style={{ 
                        '--header-bg': companyDetails.color || '#004aad'
                    }}
                >
                    <div className="invoice-header-wrapper">
                        <div className="invoice-preview-header">
                            <div className="invoice-header-left">
                                {companyDetails.logo ? (
                                    <img src={companyDetails.logo} alt="Company Logo" className="invoice-logo-large" />
                                ) : (
                                    <h2 style={{ color: companyDetails.color, margin: 0, textTransform: 'uppercase' }}>{companyDetails.name}</h2>
                                )}

                                <div className="invoice-company-details">
                                    <strong>{companyDetails.name}</strong><br />
                                    {companyDetails.email}<br />
                                    {companyDetails.phone}<br />
                                    {companyDetails.address}
                                </div>
                            </div>
                            <div className="invoice-header-right">
                                <div className="invoice-title-large">{getDocumentTitle('posinvoice')}</div>
                                <div className="invoice-meta-info">
                                    <div className="invoice-meta-row">
                                        <span className="invoice-label">{getInvoiceLabel('number')}</span> #{selectedInvoice.invoiceNumber}
                                    </div>
                                    <div className="invoice-meta-row">
                                        <span className="invoice-label">{getInvoiceLabel('issue')}</span> {new Date(selectedInvoice.date).toLocaleDateString()}
                                    </div>
                                    <div className="invoice-meta-row">
                                        <span className="invoice-label">{getInvoiceLabel('dueDate')}</span> {new Date(selectedInvoice.date).toLocaleDateString()}
                                    </div>
                                </div>
                                {companyDetails.showQr && selectedInvoice?.id && (
                                    <div className="invoice-qr-box">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/view/pos/${selectedInvoice.id}`)}`} 
                                            alt="QR" 
                                            className="invoice-qr-code" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="invoice-addresses">
                        <div className="invoice-bill-to">
                            <div className="invoice-section-header">{getInvoiceLabel('billTo')}</div>
                            <div className="font-bold">{selectedInvoice.customer?.name || 'Walk-in Customer'}</div>
                            <div className="invoice-company-details">
                                {selectedInvoice.customer?.billingAddress || 'N/A'}<br />
                                {[selectedInvoice.customer?.billingCity, selectedInvoice.customer?.billingState, selectedInvoice.customer?.billingZipCode].filter(Boolean).join(', ')}
                            </div>
                        </div>
                        <div className="invoice-ship-to" style={{ textAlign: 'right' }}>
                            <div className="invoice-section-header">{getInvoiceLabel('shipTo')}</div>
                            <div className="font-bold">{selectedInvoice.customer?.name || 'Walk-in Customer'}</div>
                            <div className="invoice-company-details">
                                {selectedInvoice.customer?.shippingAddress || selectedInvoice.customer?.billingAddress || 'N/A'}<br />
                                {[selectedInvoice.customer?.shippingCity, selectedInvoice.customer?.shippingState, selectedInvoice.customer?.shippingZipCode, selectedInvoice.customer?.shippingCountry].filter(Boolean).join(', ')}
                            </div>
                        </div>
                    </div>

                    <table className="invoice-table-preview">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Warehouse</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th>Rate</th>
                                <th>Amount Paid</th>
                                <th>Tax (%)</th>
                                <th style={{ textAlign: 'right' }}>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedInvoice.items.map((item, idx) => {
                                const retQty = returnedQtyMap[item.productId] || 0;
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '15px 0' }}>
                                            <div className="font-bold">{item.product?.name || item.description || 'Item'}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.description}</div>
                                        </td>
                                        <td style={{ padding: '15px 0' }}>{item.warehouse?.name || (item.warehouseId ? `WH #${item.warehouseId}` : 'Warehouse Hub')}</td>
                                        <td style={{ padding: '15px 0', textAlign: 'center' }}>
                                             {item.originalQuantity !== undefined ? item.originalQuantity : (item.quantity + retQty)}
                                             {retQty > 0 && (
                                                 <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', marginTop: '2px' }}>
                                                     ({retQty} Returned)
                                                 </div>
                                             )}
                                        </td>
                                        <td style={{ padding: '15px 0' }}>{formatCurrency(item.rate)}</td>
                                        <td style={{ padding: '15px 0', color: '#10b981', fontWeight: '700' }}>
                                            {(() => {
                                                const total = selectedInvoice.totalAmount || 1;
                                                const paid = selectedInvoice.paidAmount || 0;
                                                const line = item.amount || 0;
                                                return formatCurrency((line / total) * paid);
                                            })()}
                                        </td>
                                        <td style={{ padding: '15px 0' }}>{item.taxRate}%</td>
                                        <td style={{ padding: '15px 0', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="invoice-total-section">
                        <div className="invoice-totals">
                            <div className="invoice-total-row">
                                <span>{getInvoiceLabel('subTotal')}</span>
                                <span>{formatCurrency(originalSubtotal)}</span>
                            </div>
                            <div className="invoice-total-row">
                                <span>{getInvoiceLabel('tax')}</span>
                                <span>{formatCurrency(originalTaxAmount)}</span>
                            </div>
                            <div className="invoice-final-total">
                                <span>{getInvoiceLabel('total')}</span>
                                <span>{formatCurrency(originalTotal)}</span>
                            </div>
                            {totalReturned > 0 && (
                                <>
                                    <div className="invoice-total-row" style={{ color: '#ef4444', fontWeight: '600' }}>
                                        <span>Returned Amount</span>
                                        <span>-{formatCurrency(totalReturned)}</span>
                                    </div>
                                    <div className="invoice-total-row" style={{ fontWeight: '700', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                                        <span>Net Total</span>
                                        <span>{formatCurrency(netTotal)}</span>
                                    </div>
                                </>
                            )}
                            <div className="invoice-total-row" style={{ color: '#10b981', fontWeight: '600', marginTop: totalReturned > 0 ? '0px' : '0.8rem', borderTop: totalReturned > 0 ? 'none' : '1px solid #edf2f7', paddingTop: totalReturned > 0 ? '0px' : '0.8rem' }}>
                                <span>Amount Paid</span>
                                <span>{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                            </div>
                            <div className="invoice-total-row" style={{ color: '#ef4444', fontWeight: '600' }}>
                                <span>Balance Due</span>
                                <span>{formatCurrency(selectedInvoice.balanceAmount || 0)}</span>
                            </div>
                        </div>
                    </div>
                    {/* Payment Details Section */}
                    {selectedInvoice.paidAmount > 0 && (
                        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                            <h3 className="invoice-section-header" style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>Payment Details:</h3>
                            <table className="invoice-table-preview" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Date</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Method</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Received Into</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const receiptTxs = selectedInvoice.transaction?.filter(t => t.voucherType === 'RECEIPT') || [];
                                        if (receiptTxs.length > 0) {
                                            return receiptTxs.map((t, idx) => (
                                                <tr key={t.id || idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                                                    <td style={{ padding: '8px' }}>{new Date(t.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '8px' }}>
                                                        {(() => {
                                                            const mode = t.narration?.match(/via\s+(\w+)/i)?.[1] || selectedInvoice.paymentMode || 'CASH';
                                                            return mode.toUpperCase();
                                                        })()}
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        {t.ledger_transaction_debitLedgerIdToledger?.name || '-'}
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                                                </tr>
                                            ));
                                        } else {
                                            return (
                                                <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                                                    <td style={{ padding: '8px' }}>{new Date(selectedInvoice.date).toLocaleDateString()}</td>
                                                    <td style={{ padding: '8px' }}>{selectedInvoice.paymentMode || 'CASH'}</td>
                                                    <td style={{ padding: '8px' }}>-</td>
                                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(selectedInvoice.paidAmount)}</td>
                                                </tr>
                                            );
                                        }
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Returned Items Section */}
                    {selectedInvoice.salesreturn && selectedInvoice.salesreturn.length > 0 && (
                        <div style={{ marginTop: '2rem', borderTop: '2px solid #ef4444', paddingTop: '1.5rem' }}>
                            <h3 className="invoice-section-header" style={{ color: '#ef4444', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '1.1rem' }}>Returned Items:</h3>
                            <table className="invoice-table-preview">
                                <thead>
                                    <tr style={{ backgroundColor: '#fef2f2' }}>
                                        <th style={{ color: '#991b1b', padding: '10px' }}>Returned Item</th>
                                        <th style={{ color: '#991b1b', padding: '10px' }}>Warehouse</th>
                                        <th style={{ color: '#991b1b', padding: '10px', textAlign: 'center' }}>Qty Returned</th>
                                        <th style={{ color: '#991b1b', padding: '10px' }}>Rate</th>
                                        <th style={{ color: '#991b1b', padding: '10px' }}>Tax (%)</th>
                                        <th style={{ color: '#991b1b', padding: '10px', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.salesreturn.flatMap((ret) => ret.salesreturnitem || []).map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #fee2e2' }}>
                                            <td style={{ padding: '12px 10px' }}>
                                                <div className="font-bold">{item.product?.name || item.description || 'Item'}</div>
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>{item.warehouse?.name || (item.warehouseId ? `WH #${item.warehouseId}` : '-')}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px 10px' }}>{formatCurrency(item.rate)}</td>
                                            <td style={{ padding: '12px 10px' }}>{item.taxRate}%</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                        <h3 className="invoice-section-header">Notes</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                            {selectedInvoice.notes || companyDetails.notes || 'No extra notes provided.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="posinv-page-root">
            <div className="posinv-main-header">
                <div className="posinv-title-group">
                    <button className="posinv-btn-icon-back" onClick={() => navigate('/company/pos')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="posinv-page-title">POS Invoices</h1>
                        <p className="posinv-page-desc">Track and manage all point-of-sale transactions</p>
                    </div>
                </div>
                <div className="posinv-header-actions">
                    {hasPermission('create pos') && (
                        <button className="companypos-category-pill companypos-active" onClick={() => navigate('/company/pos')}>
                            <Plus size={18} /> New Sales Transaction
                        </button>
                    )}
                </div>
            </div>

            <div className="posinv-filter-layer">
                <div className="posinv-search-container">
                    <Search className="posinv-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Filter by invoice ID or customer name..."
                        className="posinv-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="posinv-date-filters">
                    <div className="posinv-date-group">
                        <label>From:</label>
                        <input
                            type="date"
                            className="posinv-date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="posinv-date-group">
                        <label>To:</label>
                        <input
                            type="date"
                            className="posinv-date-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            className="posinv-btn-clear"
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="posinv-list-card">
                {loading ? (
                    <div className="posinv-loader">
                        <div className="posinv-spinner"></div>
                        <p>Syncing POS Records...</p>
                    </div>
                ) : (
                    <div className="posinv-table-scroll">
                        <table className="posinv-main-table">
                            <thead>
                                <tr>
                                    <th>INVOICE #</th>
                                    <th>CUSTOMER</th>
                                    <th>DATE</th>
                                    <th>RECEIVED INTO</th>
                                    <th>TOTAL AMOUNT</th>
                                    <th>PAID</th>
                                    <th>DUE</th>
                                    <th>STATUS</th>
                                    <th className="posinv-text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="posinv-row">
                                        <td className="posinv-cell-bold">{inv.invoiceNumber}</td>
                                        <td className="posinv-cell-customer">{inv.customer?.name || 'Walk-in'}</td>
                                        <td>{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="font-semibold text-slate-700">
                                            {(() => {
                                                const receiptTx = inv.transaction?.find(t => t.voucherType === 'RECEIPT');
                                                if (receiptTx) {
                                                    return receiptTx.ledger_transaction_debitLedgerIdToledger?.name || '-';
                                                }
                                                return inv.paidAmount > 0 ? (inv.paymentMode || '-') : '-';
                                            })()}
                                        </td>
                                        <td className="posinv-cell-amount">{formatCurrency(inv.totalAmount)}</td>
                                        <td className="posinv-cell-paid">{formatCurrency(inv.paidAmount)}</td>
                                        <td className="posinv-cell-due">{formatCurrency(inv.balanceAmount)}</td>
                                        <td>
                                            {(() => {
                                                const totalReturned = inv.salesreturn?.reduce((sum, r) => sum + (r.totalAmount || 0), 0) || 0;
                                                if (totalReturned >= inv.totalAmount - 0.01) {
                                                    return <span className="posinv-badge posinv-badge-returned">Returned</span>;
                                                } else if (totalReturned > 0) {
                                                    return <span className="posinv-badge posinv-badge-partial-returned">Partially Returned</span>;
                                                } else if (inv.balanceAmount > 0) {
                                                    return <span className="posinv-badge posinv-badge-partial">Partial</span>;
                                                } else {
                                                    return <span className="posinv-badge posinv-badge-paid">Cleared</span>;
                                                }
                                            })()}
                                        </td>
                                        <td className="posinv-text-right">
                                             <div className="posinv-row-actions">
                                                 <button className="posinv-action-btn posinv-view-btn" onClick={() => handleView(inv)} title="View Receipt">
                                                     <Eye size={16} />
                                                 </button>
                                                 {inv.balanceAmount > 0 && hasPermission('create pos') && (
                                                     <button className="posinv-action-btn" style={{ color: '#ffffff', backgroundColor: '#f8fafc' }} onClick={(e) => handleCollectPaymentClick(inv, e)} title="Collect Payment">
                                                         <CreditCard size={16} />
                                                     </button>
                                                 )}
                                                 {hasPermission('create pos') && (
                                                     <button className="posinv-action-btn posinv-edit-btn" onClick={() => navigate(`/company/pos/edit/${inv.id}`)} title="Edit Invoice">
                                                         <Pencil size={16} />
                                                     </button>
                                                 )}
                                                 {hasPermission('delete pos') && (
                                                     <button className="posinv-action-btn posinv-void-btn" onClick={() => handleDelete(inv.id)} title="Void Transaction">
                                                         <Trash2 size={16} />
                                                     </button>
                                                 )}
                                             </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="posinv-empty">
                                            <div className="posinv-empty-content">
                                                <FileText size={48} />
                                                <p>No POS transactions found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Unique Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="POSINV-unique-delete-overlay">
                    <div className="POSINV-unique-delete-modal">
                        <div className="POSINV-unique-delete-header">
                            <h2 className="POSINV-unique-delete-title">Void Invoice?</h2>
                            <button className="POSINV-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="POSINV-unique-delete-body">
                            <p className="POSINV-unique-delete-message">
                                Are you sure you want to void this POS invoice? This action cannot be undone and will permanently void the transaction record.
                            </p>
                        </div>
                        <div className="POSINV-unique-delete-footer">
                            <button className="POSINV-unique-delete-btn POSINV-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="POSINV-unique-delete-btn POSINV-unique-delete-confirm" onClick={confirmDelete}>
                                <Trash2 size={18} /> Void Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Collect Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="POSINV-payment-overlay">
                    <div className="POSINV-payment-modal">
                        <div className="POSINV-payment-header">
                            <h2 className="POSINV-payment-title">Collect Payment - {selectedInvoice.invoiceNumber}</h2>
                            <button className="POSINV-payment-close" onClick={() => setShowPaymentModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="POSINV-payment-body">
                            <div className="POSINV-payment-info-box">
                                <span className="POSINV-payment-info-label">Outstanding Balance:</span>
                                <span className="POSINV-payment-info-value">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                            </div>

                            <div className="POSINV-payment-field">
                                <label>Amount to Collect</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="POSINV-payment-input"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>

                            <div className="POSINV-payment-field">
                                <label>Payment Mode</label>
                                <select
                                    className="POSINV-payment-select"
                                    value={paymentMode}
                                    onChange={(e) => {
                                        setPaymentMode(e.target.value);
                                        const modeName = e.target.value === 'CASH' ? 'cash' : 'bank';
                                        const matched = accounts.find(a => a.name.toLowerCase().includes(modeName));
                                        if (matched) setSelectedAccountId(matched.id.toString());
                                    }}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="BANK">Bank Transfer</option>
                                    <option value="CARD">Card Payment</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            <div className="POSINV-payment-field">
                                <label>Received Into (Account)</label>
                                <select
                                    className="POSINV-payment-select"
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id.toString()}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="POSINV-payment-field">
                                <label>Payment Date</label>
                                <input
                                    type="date"
                                    className="POSINV-payment-input"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </div>

                            <div className="POSINV-payment-field">
                                <label>Notes</label>
                                <textarea
                                    className="POSINV-payment-input"
                                    rows={2}
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Add any payment notes..."
                                />
                            </div>
                        </div>
                        <div className="POSINV-payment-footer">
                            <button className="POSINV-payment-btn-cancel" onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}>
                                Cancel
                            </button>
                            <button className="POSINV-payment-btn-submit" onClick={handleConfirmPayment} disabled={paymentSubmitting}>
                                {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllPOSInvoice;
