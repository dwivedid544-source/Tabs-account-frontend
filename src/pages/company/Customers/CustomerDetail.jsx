import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Download, Printer, FileText, Receipt, History, Truck, ShoppingCart } from 'lucide-react';
import './CustomerDetail.css';
import customerService from '../../../api/customerService';
import { CompanyContext } from '../../../context/CompanyContext';
import { useContext } from 'react';
import { toast } from 'react-hot-toast';

const CustomerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [statement, setStatement] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('statement');
    const { companySettings, formatCurrency } = useContext(CompanyContext);

    // Filters state
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [hoveredTxn, setHoveredTxn] = useState(null);

    const getPopupPosition = (x, y) => {
        const popupWidth = 380;
        const popupHeight = 250;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let finalX = x + 15;
        let finalY = y + 15;

        if (finalX + popupWidth > windowWidth) {
            finalX = x - popupWidth - 15;
        }
        if (finalY + popupHeight > windowHeight) {
            finalY = y - popupHeight - 15;
        }

        finalX = Math.max(10, finalX);
        finalY = Math.max(10, finalY);

        return { left: `${finalX}px`, top: `${finalY}px` };
    };

    const handleMouseEnter = (e, tx) => {
        if (!tx.items || tx.items.length === 0) return;

        const itemsSubtotal = tx.items.reduce((sum, i) => sum + (parseFloat(i.amount) || (parseFloat(i.rate || 0) * parseFloat(i.qty || 0))), 0);
        let subtotal = tx.subtotal || itemsSubtotal;

        let discountAmount = tx.discountAmount || 0;
        let taxAmount = tx.taxAmount || 0;
        let otherCharges = tx.otherCharges || 0;

        const total = tx.totalAmount || (tx.debit || tx.credit) || 0;

        const netCalc = subtotal - discountAmount + taxAmount;
        if (!otherCharges && total > netCalc + 0.01) {
            otherCharges = total - netCalc;
        } else if (!discountAmount && netCalc > total + 0.01 && !taxAmount) {
            discountAmount = subtotal - total;
        }

        const paidAmount = tx.paidAmount || 0;
        const balanceAmount = tx.balanceAmount ?? Math.max(0, total - paidAmount);

        setHoveredTxn({
            title: `${tx.voucherType} #${tx.voucherNumber}`,
            items: tx.items,
            subtotal,
            discountAmount,
            otherCharges,
            taxAmount,
            total,
            paidAmount,
            balanceAmount,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleMouseMove = (e) => {
        if (!hoveredTxn) return;
        setHoveredTxn(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };

    const handleMouseLeave = () => {
        setHoveredTxn(null);
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [custRes, statementRes] = await Promise.all([
                customerService.getById(id),
                customerService.getStatement(id)
            ]);

            if (custRes.data.success) {
                setCustomer(custRes.data.data);
            }
            if (statementRes.data.success) {
                setStatement(statementRes.data.data.statement);
            }
        } catch (error) {
            console.error("Error fetching customer details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateBalance = async () => {
        try {
            const loadingToast = toast.loading('Recalculating balance...');
            const response = await customerService.recalculateBalance(id);
            if (response.data.success) {
                toast.success('Balance recalculated successfully', { id: loadingToast });
                fetchData(); // Refresh data
            } else {
                toast.error(response.data.message || 'Failed to recalculate balance', { id: loadingToast });
            }
        } catch (error) {
            console.error("Error recalculating balance:", error);
            toast.error(error.message || 'An error occurred while recalculating balance');
        }
    };

    const handleViewInvoice = (invoiceId) => {
        navigate('/company/sales/invoice', { state: { targetInvoiceId: invoiceId } });
    };

    const handleViewQuotation = (id) => {
        navigate('/company/sales/quotation', { state: { targetQuotationId: id } });
    };

    const handleViewSalesOrder = (id) => {
        navigate('/company/sales/order', { state: { targetOrderId: id } });
    };

    const handleViewChallan = (id) => {
        navigate('/company/sales/challan', { state: { targetChallanId: id } });
    };

    const handleViewReturn = (id) => {
        navigate('/company/sales/return', { state: { targetReturnId: id } });
    };

    const navigateToVoucher = (tx) => {
        const type = tx.voucherType?.toUpperCase();
        if (type === 'SALES' || type === 'SALES_INVOICE') {
            if (tx.invoiceId) navigate('/company/sales/invoice', { state: { targetInvoiceId: tx.invoiceId, type: 'SALES' } });
            else navigate('/company/sales/invoice');
        } else if (type === 'RECEIPT') {
            if (tx.receiptId) navigate('/company/sales/payment', { state: { targetReceiptId: tx.receiptId, type: 'RECEIPT' } });
            else navigate('/company/sales/payment');
        } else if (type === 'POS_INVOICE') {
            if (tx.posInvoiceId) navigate('/company/sales/invoice', { state: { targetInvoiceId: tx.posInvoiceId, type: 'POS_INVOICE' } });
            else navigate('/company/pos');
        } else if (type === 'CHALLAN' || type === 'DELIVERY') {
            navigate('/company/sales/challan');
        } else if (type === 'ORDER' || type === 'SALES_ORDER') {
            navigate('/company/sales/order');
        } else if (type === 'QUOTATION' || type === 'QUOTE') {
            navigate('/company/sales/quotation');
        } else if (type === 'SALES_RETURN' || type === 'RETURN') {
            if (tx.salesReturnId) navigate('/company/sales/return', { state: { targetReturnId: tx.salesReturnId } });
            else navigate('/company/sales/return');
        } else if (type === 'PURCHASE' || type === 'PURCHASE_BILL') {
            navigate('/company/purchases/bill');
        } else if (type === 'PAYMENT') {
            navigate('/company/purchases/payment');
        } else if (type === 'JOURNAL' || type === 'CONTRA') {
            navigate('/company/voucher/create');
        } else {
            navigate('/company/accounts/transactions');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading customer details...</div>;
    if (!customer) return <div className="p-8 text-center text-red-500">Customer not found.</div>;

    const stats = {
        totalSales: customer.invoice?.reduce((acc, inv) => acc + inv.totalAmount, 0) || 0,
        paidAmount: customer.invoice?.reduce((acc, inv) => acc + inv.paidAmount, 0) || 0,
        balance: customer.ledger?.currentBalance || 0,
        invoiceCount: customer.invoice?.length || 0,
        overdue: customer.invoice?.filter(i => i.balanceAmount > 0 && new Date(i.dueDate) < new Date()).reduce((acc, i) => acc + i.balanceAmount, 0) || 0
    };
    stats.averageSales = stats.invoiceCount > 0 ? stats.totalSales / stats.invoiceCount : 0;

    // Filtered Datasets
    const filteredStatement = statement.filter(tx => {
        const txDate = new Date(tx.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || txDate >= fromDate) && (!toDate || txDate <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            tx.voucherNumber.toLowerCase().includes(s) ||
            tx.narration.toLowerCase().includes(s) ||
            tx.voucherType.toLowerCase().includes(s) ||
            tx.debit?.toString().includes(s) ||
            tx.credit?.toString().includes(s) ||
            tx.balance?.toString().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredInvoices = (customer.invoice || []).filter(inv => {
        const d = new Date(inv.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            inv.invoiceNumber.toLowerCase().includes(s) ||
            inv.totalAmount?.toString().includes(s) ||
            inv.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredDeliveries = (customer.deliverychallan || []).filter(dc => {
        const d = new Date(dc.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            dc.challanNumber.toLowerCase().includes(s) ||
            dc.totalAmount?.toString().includes(s) ||
            dc.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredOrders = (customer.salesorder || []).filter(order => {
        const d = new Date(order.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            order.orderNumber.toLowerCase().includes(s) ||
            order.totalAmount?.toString().includes(s) ||
            order.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredQuotations = (customer.salesquotation || []).filter(q => {
        const d = new Date(q.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            q.quotationNumber.toLowerCase().includes(s) ||
            q.totalAmount?.toString().includes(s) ||
            q.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredReturns = (customer.salesreturn || []).filter(r => {
        const d = new Date(r.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            r.returnNumber.toLowerCase().includes(s) ||
            r.totalAmount?.toString().includes(s) ||
            r.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    return (
        <div className="CustomerDetail-customer-detail-page">
            <div className="no-print">
                <div className="CustomerDetail-detail-header">
                    <div className="CustomerDetail-header-left">
                        <div className="text-sm text-gray-500 mb-1">Dashboard &gt; Customer &gt; {customer.name}</div>
                        <h1 className="CustomerDetail-page-title">Manage Customer Detail</h1>
                    </div>
                    <div className="CustomerDetail-header-actions">
                        {/* <button className="CustomerDetail-btn-action CustomerDetail-bg-blue" onClick={handleRecalculateBalance} title="Fix balance if it looks wrong">
                            Recalculate Balance
                        </button> */}
                        <button className="CustomerDetail-btn-action CustomerDetail-bg-green" onClick={() => navigate('/company/sales/invoice')}>
                            Create Invoice
                        </button>
                        <button className="CustomerDetail-btn-action CustomerDetail-bg-green" onClick={() => navigate('/company/sales/quotation')}>
                            Create Quotation
                        </button>
                    </div>
                </div>

                <div className="CustomerDetail-info-cards-grid">
                    <div className="CustomerDetail-info-card">
                        <h3 className="CustomerDetail-card-title">Customer Info</h3>
                        <div className="CustomerDetail-card-content">
                            <p className="CustomerDetail-primary-text">{customer.name}</p>
                            <p className="CustomerDetail-secondary-text">{customer.email}</p>
                            <p className="CustomerDetail-secondary-text">{customer.phone}</p>
                            <p className="CustomerDetail-secondary-text">{customer.gstNumber && `GST: ${customer.gstNumber}`}</p>
                        </div>
                    </div>
                    <div className="CustomerDetail-info-card">
                        <h3 className="CustomerDetail-card-title">Billing Info</h3>
                        <div className="CustomerDetail-card-content">
                            <p className="CustomerDetail-primary-text">{customer.billingName || customer.name}</p>
                            <p className="CustomerDetail-secondary-text CustomerDetail-address-text">
                                {customer.billingAddress}<br />
                                {customer.billingCity}, {customer.billingState} {customer.billingZipCode}<br />
                                {customer.billingCountry}
                            </p>
                            <p className="CustomerDetail-secondary-text">{customer.billingPhone}</p>
                        </div>
                    </div>
                    <div className="CustomerDetail-info-card">
                        <h3 className="CustomerDetail-card-title">Shipping Info (Primary)</h3>
                        <div className="CustomerDetail-card-content">
                            {customer.shippingaddress && customer.shippingaddress.length > 0 ? (
                                <>
                                    <p className="CustomerDetail-primary-text">{customer.shippingaddress.find(a => a.isDefault)?.name || customer.shippingaddress[0].name || customer.name}</p>
                                    <p className="CustomerDetail-secondary-text CustomerDetail-address-text">
                                        {customer.shippingaddress.find(a => a.isDefault)?.address || customer.shippingaddress[0].address}<br />
                                        {customer.shippingaddress.find(a => a.isDefault)?.city || customer.shippingaddress[0].city}, {customer.shippingaddress.find(a => a.isDefault)?.state || customer.shippingaddress[0].state} {customer.shippingaddress.find(a => a.isDefault)?.zipCode || customer.shippingaddress[0].zipCode}<br />
                                        {customer.shippingaddress.find(a => a.isDefault)?.country || customer.shippingaddress[0].country}
                                    </p>
                                    <p className="CustomerDetail-secondary-text">{customer.shippingaddress.find(a => a.isDefault)?.phone || customer.shippingaddress[0].phone}</p>
                                </>
                            ) : (
                                <>
                                    <p className="CustomerDetail-primary-text">{customer.shippingName || customer.billingName || customer.name}</p>
                                    <p className="CustomerDetail-secondary-text CustomerDetail-address-text">
                                        {customer.shippingAddress || customer.billingAddress}<br />
                                        {customer.shippingCity || customer.billingCity}, {customer.shippingState || customer.billingState} {customer.shippingZipCode || customer.billingZipCode}<br />
                                        {customer.shippingCountry || customer.billingCountry}
                                    </p>
                                    <p className="CustomerDetail-secondary-text">{customer.shippingPhone || customer.billingPhone}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Shipping Addresses Section */}
                {customer.shippingaddress && customer.shippingaddress.length > 1 && (
                    <div className="CustomerDetail-detail-section mb-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', margin: '1rem 0 2rem 0' }}>
                        <h3 className="CustomerDetail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Truck size={20} className="text-blue-600" />
                            Multiple Shipping Locations ({customer.shippingaddress.length})
                        </h3>
                        <div className="CustomerDetail-info-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', margin: 0 }}>
                            {customer.shippingaddress.map((addr, idx) => (
                                <div key={idx} className="CustomerDetail-info-card" style={{ border: addr.isDefault ? '2px solid #1e293b' : '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>Address #{idx + 1} {addr.isDefault && <span style={{ color: '#1e293b', fontSize: '0.7rem' }}>(DEFAULT)</span>}</h4>
                                    </div>
                                    <div className="CustomerDetail-card-content">
                                        <p className="CustomerDetail-primary-text">{addr.name}</p>
                                        <p className="CustomerDetail-secondary-text">{addr.phone}</p>
                                        <p className="CustomerDetail-secondary-text CustomerDetail-address-text">
                                            {addr.address}<br />
                                            {addr.city}, {addr.state} {addr.zipCode}<br />
                                            {addr.country}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Company Info Wide Card */}
                <div className="CustomerDetail-company-info-card">
                    <h3 className="CustomerDetail-card-title">Company Info</h3>
                    <div className="CustomerDetail-info-row">
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Customer Id</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">#CUST{customer.id.toString().padStart(5, '0')}</span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Date of Creation</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">{new Date(customer.createdAt || customer.creationDate || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Balance</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold" style={{ color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(Math.abs(stats.balance))} {stats.balance >= 0 ? '(Dr)' : '(Cr)'}
                            </span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Overdue</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold CustomerDetail-text-red">
                                {formatCurrency(stats.overdue)}
                            </span>
                        </div>
                    </div>
                    <div className="CustomerDetail-info-row mt-6">
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Total Sum of Invoices</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">{formatCurrency(stats.totalSales)}</span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Quantity of Invoice</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">{stats.invoiceCount}</span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Average Sales</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">{formatCurrency(stats.averageSales)}</span>
                        </div>
                        <div className="CustomerDetail-info-item">
                            <span className="CustomerDetail-item-label">Paid Amount</span>
                            <span className="CustomerDetail-item-value CustomerDetail-text-bold">{formatCurrency(stats.paidAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="CustomerDetail-tabs-container mt-8">
                    <div className="tabs-header">
                        <button className={`tab-btn ${activeTab === 'statement' ? 'active' : ''}`} onClick={() => setActiveTab('statement')}>
                            <History size={18} /> Transactions History (Ledger)
                        </button>
                        <button className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
                            <FileText size={18} /> Invoices
                        </button>
                        <button className={`tab-btn ${activeTab === 'deliveries' ? 'active' : ''}`} onClick={() => setActiveTab('deliveries')}>
                            <Truck size={18} /> Deliveries
                        </button>
                        <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
                            <ShoppingCart size={18} /> Orders
                        </button>
                        <button className={`tab-btn ${activeTab === 'quotations' ? 'active' : ''}`} onClick={() => setActiveTab('quotations')}>
                            <FileText size={18} /> Quotations
                        </button>
                        <button className={`tab-btn ${activeTab === 'returns' ? 'active' : ''}`} onClick={() => setActiveTab('returns')}>
                            <History size={18} /> Returns
                        </button>
                    </div>

                    {/* Global Filters Bar */}
                    <div className="CustomerDetail-filters-bar mt-6 mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap items-center gap-4 no-print">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">From:</label>
                            <input
                                type="date"
                                className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">To:</label>
                            <input
                                type="date"
                                className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search by Number or Particulars..."
                                className="w-full border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {(fromDate || toDate || searchTerm) && (
                            <button
                                className="text-sm text-red-500 hover:text-red-700 font-medium"
                                onClick={() => {
                                    setFromDate('');
                                    setToDate('');
                                    setSearchTerm('');
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="tab-content mt-4">
                        {activeTab === 'statement' && (
                            <section className="CustomerDetail-detail-section">
                                <div className="section-header-flex">
                                    <h2 className="CustomerDetail-section-title">Customer Ledger / Statement</h2>
                                    <button className="btn-outline-small" onClick={() => window.print()}>
                                        <Printer size={14} /> Print Statement
                                    </button>
                                </div>

                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table statement-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Voucher Type</th>
                                                <th>Voucher No.</th>
                                                <th>Particulars</th>
                                                <th className="text-right">Debit (Dr)</th>
                                                <th className="text-right">Credit (Cr)</th>
                                                <th className="text-right">Running Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan="6" className="font-semibold px-4 py-2 bg-gray-50 text-gray-600 italic">Running Balance</td>
                                                <td className="text-right font-bold px-4 py-2 bg-gray-50">
                                                    <span className="CustomerDetail-item-value CustomerDetail-text-bold" style={{ color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {formatCurrency(Math.abs(stats.balance))} {stats.balance >= 0 ? '(Dr)' : '(Cr)'}
                                                    </span>
                                                </td>
                                            </tr>
                                             {filteredStatement.map(tx => (
                                                <tr
                                                    key={tx.id}
                                                    onMouseEnter={(e) => handleMouseEnter(e, tx)}
                                                    onMouseMove={handleMouseMove}
                                                    onMouseLeave={handleMouseLeave}
                                                    className={tx.items && tx.items.length > 0 ? 'hover:bg-slate-50 transition-colors' : ''}
                                                >
                                                    <td>{new Date(tx.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={`voucher-badge ${tx.voucherType.toLowerCase()}`} style={{ cursor: 'pointer' }} onClick={() => navigateToVoucher(tx)}>
                                                            {tx.voucherType}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="font-mono text-blue-600" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigateToVoucher(tx)}>
                                                            {tx.voucherNumber}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-xs truncate">{tx.narration}</td>
                                                    <td className="text-right text-red-600">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                                    <td className="text-right text-green-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                                     <td className="text-right font-bold" style={{ color: tx.balance < 0 ? '#334155' : '#1e293b' }}>
                                                         {formatCurrency(Math.abs(tx.balance))} {tx.balance < 0 ? '(Cr)' : '(Dr)'}
                                                     </td>
                                                </tr>
                                            ))}
                                            {filteredStatement.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-8 text-gray-400">No transactions found matching the filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'invoices' && (
                            <section className="CustomerDetail-detail-section">
                                <h2 className="CustomerDetail-section-title">Invoice List</h2>
                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>INVOICE #</th>
                                                <th>ISSUE DATE</th>
                                                <th>DUE DATE</th>
                                                <th>TOTAL AMOUNT</th>
                                                <th>PAID</th>
                                                <th>BALANCE</th>
                                                <th>STATUS</th>
                                                <th className="text-right">ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInvoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td><span className="CustomerDetail-id-badge pointer" onClick={() => handleViewInvoice(inv.id)}>{inv.invoiceNumber}</span></td>
                                                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                                                    <td className="text-red-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                                                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                                                    <td className="text-green-600">{formatCurrency(inv.paidAmount)}</td>
                                                    <td className="text-red-600 font-bold">{formatCurrency(inv.balanceAmount)}</td>
                                                    <td><span className={`status-pill ${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                                                    <td className="text-right">
                                                        <div className="CustomerDetail-table-actions justify-end">
                                                            <button className="CustomerDetail-table-icon-btn CustomerDetail-bg-orange" onClick={() => handleViewInvoice(inv.id)}><Eye size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredInvoices.length === 0 && (
                                                <tr><td colSpan="8" className="text-center py-8 text-gray-400">No invoices found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'deliveries' && (
                            <section className="CustomerDetail-detail-section">
                                <h2 className="CustomerDetail-section-title">Delivery Challans</h2>
                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table">
                                        <thead>
                                            <tr><th>CHALLAN #</th><th>DATE</th><th>ORDER REF</th><th>STATUS</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredDeliveries.map(dc => (
                                                <tr key={dc.id}>
                                                    <td><span className="CustomerDetail-id-badge pointer" onClick={() => handleViewChallan(dc.id)}>{dc.challanNumber}</span></td>
                                                    <td>{new Date(dc.date).toLocaleDateString()}</td>
                                                    <td>{dc.salesOrderId || 'Direct'}</td>
                                                    <td><span className={`status-pill ${dc.status.toLowerCase()}`}>{dc.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredDeliveries.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No deliveries found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'orders' && (
                            <section className="CustomerDetail-detail-section">
                                <h2 className="CustomerDetail-section-title">Sales Orders</h2>
                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table">
                                        <thead>
                                            <tr><th>ORDER #</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrders.map(so => (
                                                <tr key={so.id}>
                                                    <td><span className="CustomerDetail-id-badge pointer" onClick={() => handleViewSalesOrder(so.id)}>{so.orderNumber}</span></td>
                                                    <td>{new Date(so.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(so.totalAmount)}</td>
                                                    <td><span className={`status-pill ${so.status.toLowerCase()}`}>{so.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredOrders.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No orders found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'quotations' && (
                            <section className="CustomerDetail-detail-section">
                                <h2 className="CustomerDetail-section-title">Quotations</h2>
                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table">
                                        <thead>
                                            <tr><th>QUOTATION #</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredQuotations.map(q => (
                                                <tr key={q.id}>
                                                    <td><span className="CustomerDetail-id-badge pointer" onClick={() => handleViewQuotation(q.id)}>{q.quotationNumber}</span></td>
                                                    <td>{new Date(q.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(q.totalAmount)}</td>
                                                    <td><span className={`status-pill ${q.status.toLowerCase()}`}>{q.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredQuotations.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No quotations found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'returns' && (
                            <section className="CustomerDetail-detail-section">
                                <h2 className="CustomerDetail-section-title">Sales Returns</h2>
                                <div className="CustomerDetail-table-responsive">
                                    <table className="CustomerDetail-detail-table">
                                        <thead>
                                            <tr><th>RETURN #</th><th>DATE</th><th>TOTAL</th><th>STATUS</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredReturns.map(r => (
                                                <tr key={r.id}>
                                                    <td><span className="CustomerDetail-id-badge pointer" onClick={() => handleViewReturn(r.id)}>{r.returnNumber}</span></td>
                                                    <td>{new Date(r.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(r.totalAmount)}</td>
                                                    <td><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredReturns.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No returns found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {/* Printable Statement Area (Visible only in Print) */}
            <div id="printable-statement" className="printable-only">
                <div className="print-header">
                    <div className="company-info">
                        {companySettings?.logo && <img src={companySettings.logo} alt="Logo" className="print-logo" />}
                        <div className="company-text">
                            <h2>{companySettings?.name || 'Your Company Name'}</h2>
                            <p>{companySettings?.address}</p>
                            <p>{companySettings?.email} | {companySettings?.phone}</p>
                            {companySettings?.gstNumber && <p>GSTIN: {companySettings.gstNumber}</p>}
                        </div>
                    </div>
                    <div className="statement-title">
                        <h1>CUSTOMER ACCOUNT STATEMENT</h1>
                        <p>Generated on: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="print-customer-info">
                    <div className="info-block">
                        <h3>Statement For:</h3>
                        <p><strong>{customer.name}</strong></p>
                        <p>{customer.billingAddress}</p>
                        <p>{customer.billingCity}, {customer.billingState} {customer.billingZipCode}</p>
                        <p>Email: {customer.email}</p>
                        <p>Phone: {customer.phone}</p>
                    </div>
                    <div className="info-block text-right">
                        <h3>Account Summary:</h3>
                        <div className="summary-row">
                            <span>Opening Balance:</span>
                            <strong>{formatCurrency(customer.ledger?.openingBalance || 0)}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Total Debits:</span>
                            <strong>{formatCurrency(statement.reduce((acc, tx) => acc + (tx.debit || 0), 0))}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Total Credits:</span>
                            <strong>{formatCurrency(statement.reduce((acc, tx) => acc + (tx.credit || 0), 0))}</strong>
                        </div>
                        <div className="summary-row closing">
                            <span>Closing Balance:</span>
                            <strong>{formatCurrency(stats.balance)} {stats.balance >= 0 ? '(Dr)' : '(Cr)'}</strong>
                        </div>
                    </div>
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Voucher Type</th>
                            <th>Voucher No.</th>
                            <th>Particulars</th>
                            <th className="text-right">Debit</th>
                            <th className="text-right">Credit</th>
                            <th className="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan="6" className="bold italic">Opening Balance</td>
                            <td className="text-right bold">{formatCurrency(customer.ledger?.openingBalance || 0)}</td>
                        </tr>
                        {statement.map(tx => (
                            <tr key={tx.id}>
                                <td>{new Date(tx.date).toLocaleDateString()}</td>
                                <td>{tx.voucherType}</td>
                                <td>{tx.voucherNumber}</td>
                                <td style={{ maxWidth: '250px' }}>{tx.narration}</td>
                                <td className="text-right">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                <td className="text-right">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                <td className="text-right bold">{formatCurrency(tx.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="print-footer">
                    <p>This is a computer-generated statement and does not require a physical signature.</p>
                    <p>Thank you for your business!</p>
                </div>
            </div>

            {hoveredTxn && (
                <div
                    className="Ledger-hover-popup visible"
                    style={{
                        position: 'fixed',
                        ...getPopupPosition(hoveredTxn.x, hoveredTxn.y),
                        zIndex: 99999,
                        backgroundColor: '#1e293b',
                        color: '#f8fafc',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                        minWidth: '320px',
                        maxWidth: '400px',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b', borderBottom: '1px solid #334155', paddingBottom: '6px', marginBottom: '8px' }}>
                        {hoveredTxn.title}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '0.65rem', color: '#94a3b8' }}>
                                <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Maal / Items</th>
                                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Qty</th>
                                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Rate</th>
                                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoveredTxn.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                    <td style={{ padding: '4px 0' }}>{item.name}</td>
                                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{item.qty}</td>
                                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(item.rate)}</td>
                                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '8px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        {hoveredTxn.subtotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Subtotal:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.subtotal)}</span>
                            </div>
                        )}
                        {hoveredTxn.discountAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Discount:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.discountAmount)}</span>
                            </div>
                        )}
                        {hoveredTxn.otherCharges > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Other Charges:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.otherCharges)}</span>
                            </div>
                        )}
                        {hoveredTxn.taxAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Tax Amount:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.taxAmount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #475569' }}>
                            <span>Total Amount:</span>
                            <span>{formatCurrency(hoveredTxn.total)}</span>
                        </div>
                        {hoveredTxn.paidAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#94a3b8' }}>
                                <span>Paid Amount:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.paidAmount)}</span>
                            </div>
                        )}
                        {hoveredTxn.balanceAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#f87171' }}>
                                <span>Due Amount:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(hoveredTxn.balanceAmount)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDetail;
