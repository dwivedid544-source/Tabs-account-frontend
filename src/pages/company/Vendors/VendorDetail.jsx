import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Download, Printer, FileText, Receipt, History, Truck, ShoppingCart } from 'lucide-react';
import './VendorDetail.css';
import vendorService from '../../../services/vendorService';
import { CompanyContext } from '../../../context/CompanyContext';
import { useContext } from 'react';

const VendorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [vendor, setVendor] = useState(null);
    const [statement, setStatement] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ledger'); // 'ledger', 'invoices', 'quotations', 'orders', 'deliveries'
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
            const [vendRes, statementRes] = await Promise.all([
                vendorService.getVendorById(id),
                vendorService.getVendorStatement(id)
            ]);

            if (vendRes.success) {
                setVendor(vendRes.data);
            }
            if (statementRes.success) {
                setStatement(statementRes.data.statement);
            }
        } catch (error) {
            console.error("Error fetching vendor details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewBill = (billId) => {
        navigate('/company/purchases/bill', { state: { targetBillId: billId } });
    };

    const handleViewOrder = (orderId) => {
        navigate('/company/purchases/order', { state: { targetOrderId: orderId } });
    };

    const handleViewQuotation = (quoteId) => {
        navigate('/company/purchases/quotation', { state: { targetQuotationId: quoteId } });
    };

    const handleViewGRN = (grnId) => {
        navigate('/company/purchases/receipt', { state: { targetGrnId: grnId } });
    };

    const handleViewReturn = (returnId) => {
        navigate('/company/purchases/return', { state: { targetReturnId: returnId } });
    };

    const handleViewPayment = (paymentId) => {
        navigate('/company/purchases/payment', { state: { targetReceiptId: paymentId } });
    };

    const navigateToVoucher = (tx) => {
        const type = tx.voucherType?.toUpperCase();
        if (type === 'PURCHASE' || type === 'PURCHASE_BILL') {
            if (tx.purchaseBillId) handleViewBill(tx.purchaseBillId);
            else navigate('/company/purchases/bill');
        } else if (type === 'PAYMENT' || type === 'RECEIPT') {
            if (tx.receiptId) handleViewPayment(tx.receiptId);
            else navigate('/company/purchases/payment');
        } else if (type === 'PURCHASE_ORDER' || type === 'ORDER') {
            if (tx.purchaseOrderId) handleViewOrder(tx.purchaseOrderId); // Need to make sure backend sends purchaseOrderId
            else navigate('/company/purchases/order');
        } else if (type === 'PURCHASE_RETURN' || type === 'RETURN') {
            if (tx.purchaseReturnId) handleViewReturn(tx.purchaseReturnId);
            else navigate('/company/purchases/return');
        } else if (type === 'GRN') {
            navigate('/company/purchases/receipt');
        } else {
            navigate('/company/accounts/transactions');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading vendor details...</div>;
    if (!vendor) return <div className="p-8 text-center text-red-500">Vendor not found.</div>;

    const stats = {
        totalBills: vendor.purchasebill?.reduce((acc, bill) => acc + (parseFloat(bill.totalAmount) || 0), 0) || 0,
        paidAmount: vendor.payment?.reduce((acc, pay) => acc + (parseFloat(pay.amount) || 0), 0) || 0,
        balance: vendor.ledger?.currentBalance || 0,
        billCount: vendor.purchasebill?.length || 0,
        overdue: vendor.purchasebill?.filter(b => b.balanceAmount > 0 && new Date(b.dueDate) < new Date()).reduce((acc, b) => acc + (parseFloat(b.balanceAmount) || 0), 0) || 0
    };
    stats.averageBill = stats.billCount > 0 ? stats.totalBills / stats.billCount : 0;

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

    const filteredBills = (vendor.purchasebill || []).filter(bill => {
        const d = new Date(bill.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            bill.billNumber.toLowerCase().includes(s) ||
            bill.totalAmount?.toString().includes(s) ||
            bill.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredGRNs = (vendor.goodsreceiptnote || []).filter(grn => {
        const d = new Date(grn.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            grn.grnNumber.toLowerCase().includes(s) ||
            grn.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredOrders = (vendor.purchaseorder || []).filter(order => {
        const d = new Date(order.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            order.orderNumber.toLowerCase().includes(s) ||
            order.totalAmount?.toString().includes(s) ||
            order.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredQuotations = (vendor.purchasequotation || []).filter(q => {
        const d = new Date(q.date).toISOString().split('T')[0];
        const matchesDate = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const s = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            q.quotationNumber.toLowerCase().includes(s) ||
            q.totalAmount?.toString().includes(s) ||
            q.status?.toLowerCase().includes(s);
        return matchesDate && matchesSearch;
    });

    const filteredReturns = (vendor.purchasereturn || []).filter(r => {
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
        <div className="VendorDetail-vendor-detail-page">
            <div className="no-print">
                <div className="VendorDetail-detail-header">
                    <div className="VendorDetail-header-left">
                        <div className="text-sm text-gray-500 mb-1">Dashboard &gt; Vendor &gt; {vendor.name}</div>
                        <h1 className="VendorDetail-page-title">Manage Vendor Detail</h1>
                    </div>
                    <div className="VendorDetail-header-actions">
                        <button className="VendorDetail-btn-action VendorDetail-bg-green" onClick={() => navigate('/company/purchases/bill', { state: { sourceData: { vendorId: vendor.id } } })}>
                            Create Bill
                        </button>
                        <button className="VendorDetail-btn-action VendorDetail-bg-green" onClick={() => navigate('/company/purchases/order', { state: { sourceData: { vendorId: vendor.id } } })}>
                            Create Order
                        </button>
                    </div>
                </div>

                <div className="VendorDetail-info-cards-grid">
                    <div className="VendorDetail-info-card">
                        <h3 className="VendorDetail-card-title">Vendor Info</h3>
                        <div className="VendorDetail-card-content">
                            <p className="VendorDetail-primary-text">{vendor.name}</p>
                            <p className="VendorDetail-secondary-text">{vendor.email}</p>
                            <p className="VendorDetail-secondary-text">{vendor.phone}</p>
                            <p className="VendorDetail-secondary-text">{vendor.gstNumber && `GST: ${vendor.gstNumber}`}</p>
                        </div>
                    </div>
                    <div className="VendorDetail-info-card">
                        <h3 className="VendorDetail-card-title">Billing Info</h3>
                        <div className="VendorDetail-card-content">
                            <p className="VendorDetail-primary-text">{vendor.billingName || vendor.name}</p>
                            <p className="VendorDetail-secondary-text VendorDetail-address-text">
                                {vendor.billingAddress}<br />
                                {vendor.billingCity}, {vendor.billingState} {vendor.billingZipCode}<br />
                                {vendor.billingCountry}
                            </p>
                            <p className="VendorDetail-secondary-text">{vendor.billingPhone}</p>
                        </div>
                    </div>
                    <div className="VendorDetail-info-card">
                        <h3 className="VendorDetail-card-title">Shipping Info (Primary)</h3>
                        <div className="VendorDetail-card-content">
                            {vendor.shippingaddress && vendor.shippingaddress.length > 0 ? (
                                <>
                                    <p className="VendorDetail-primary-text">{vendor.shippingaddress.find(a => a.isDefault)?.name || vendor.shippingaddress[0].name || vendor.name}</p>
                                    <p className="VendorDetail-secondary-text VendorDetail-address-text">
                                        {(vendor.shippingaddress.find(a => a.isDefault)?.address || vendor.shippingaddress[0].address)}<br />
                                        {(vendor.shippingaddress.find(a => a.isDefault)?.city || vendor.shippingaddress[0].city)}, {(vendor.shippingaddress.find(a => a.isDefault)?.state || vendor.shippingaddress[0].state)} {(vendor.shippingaddress.find(a => a.isDefault)?.zipCode || vendor.shippingaddress[0].zipCode)}<br />
                                        {(vendor.shippingaddress.find(a => a.isDefault)?.country || vendor.shippingaddress[0].country)}
                                    </p>
                                    <p className="VendorDetail-secondary-text">{(vendor.shippingaddress.find(a => a.isDefault)?.phone || vendor.shippingaddress[0].phone)}</p>
                                </>
                            ) : (
                                <>
                                    <p className="VendorDetail-primary-text">{vendor.shippingName || vendor.billingName || vendor.name}</p>
                                    <p className="VendorDetail-secondary-text VendorDetail-address-text">
                                        {vendor.shippingAddress || vendor.billingAddress}<br />
                                        {vendor.shippingCity || vendor.billingCity}, {vendor.shippingState || vendor.billingState} {vendor.shippingZipCode || vendor.billingZipCode}<br />
                                        {vendor.shippingCountry || vendor.billingCountry}
                                    </p>
                                    <p className="VendorDetail-secondary-text">{vendor.shippingPhone || vendor.billingPhone}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Shipping Addresses Section */}
                {vendor.shippingaddress && vendor.shippingaddress.length > 1 && (
                    <div className="VendorDetail-detail-section mb-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', margin: '1rem 0 2rem 0', padding: '1.5rem', borderRadius: '8px' }}>
                        <h3 className="VendorDetail-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Truck size={20} className="text-blue-600" />
                            Multiple Shipping Locations ({vendor.shippingaddress.length})
                        </h3>
                        <div className="VendorDetail-info-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', margin: 0, display: 'grid', gap: '1.5rem' }}>
                            {vendor.shippingaddress.map((addr, idx) => (
                                <div key={idx} className="VendorDetail-info-card" style={{ border: addr.isDefault ? '2px solid #1e293b' : '1px solid #e2e8f0', background: 'white' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>Address #{idx + 1} {addr.isDefault && <span style={{ color: '#1e293b', fontSize: '0.7rem' }}>(DEFAULT)</span>}</h4>
                                    </div>
                                    <div className="VendorDetail-card-content">
                                        <p className="VendorDetail-primary-text">{addr.name}</p>
                                        <p className="VendorDetail-secondary-text">{addr.phone}</p>
                                        <p className="VendorDetail-secondary-text VendorDetail-address-text">
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
                <div className="VendorDetail-company-info-card">
                    <h3 className="VendorDetail-card-title">Company Info</h3>
                    <div className="VendorDetail-info-row">
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Vendor Id</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">#VEND{vendor.id.toString().padStart(5, '0')}</span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Date of Creation</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">{new Date(vendor.createdAt || vendor.creationDate || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Balance</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold" style={{ color: stats.balance > 0 ? '#ef4444' : '#10b981' }}>
                                {formatCurrency(Math.abs(stats.balance))} {stats.balance > 0 ? '(Cr)' : '(Dr)'}
                            </span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Overdue</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold VendorDetail-text-red">
                                {formatCurrency(stats.overdue)}
                            </span>
                        </div>
                    </div>
                    <div className="VendorDetail-info-row mt-6">
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Total Sum of Bills</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">{formatCurrency(stats.totalBills)}</span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Quantity of Bill</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">{stats.billCount}</span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Average Purchase</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">{formatCurrency(stats.averageBill)}</span>
                        </div>
                        <div className="VendorDetail-info-item">
                            <span className="VendorDetail-item-label">Paid Amount</span>
                            <span className="VendorDetail-item-value VendorDetail-text-bold">{formatCurrency(stats.paidAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="VendorDetail-tabs-container mt-8">
                    <div className="VendorDetail-tabs-header">
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ledger')}
                        >
                            <History size={18} /> Transactions History (Ledger)
                        </button>
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                            onClick={() => setActiveTab('invoices')}
                        >
                            <FileText size={18} /> Bill
                        </button>
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
                            onClick={() => setActiveTab('deliveries')}
                        >
                            <Truck size={18} /> Deliveries
                        </button>
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            <ShoppingCart size={18} /> Orders
                        </button>
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'quotations' ? 'active' : ''}`}
                            onClick={() => setActiveTab('quotations')}
                        >
                            <FileText size={18} /> Quotations
                        </button>
                        <button
                            className={`VendorDetail-tab-btn ${activeTab === 'returns' ? 'active' : ''}`}
                            onClick={() => setActiveTab('returns')}
                        >
                            <History size={18} /> Returns
                        </button>
                    </div>

                    {/* Global Filters Bar */}
                    <div className="VendorDetail-filters-bar mt-6 mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap items-center gap-4 no-print">
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

                    <div className="VendorDetail-tab-content mt-4">
                        {activeTab === 'ledger' && (
                            <section className="VendorDetail-detail-section">
                                <div className="VendorDetail-section-header-flex">
                                    <h2 className="VendorDetail-section-title">Vendor Ledger / Statement</h2>
                                    <button className="VendorDetail-btn-outline-small" onClick={() => window.print()}>
                                        <Printer size={14} /> Print Statement
                                    </button>
                                </div>

                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table statement-table">
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
                                            <tr className="VendorDetail-opening-balance-row">
                                                <td colSpan="4" className="font-semibold italic">Opening Balance</td>
                                                <td className="text-right">-</td>
                                                <td className="text-right">-</td>
                                                <td className="text-right font-bold">
                                                    <span className="VendorDetail-item-value VendorDetail-text-bold" style={{ color: stats.balance > 0 ? '#ef4444' : '#10b981' }}>
                                                        {formatCurrency(Math.abs(stats.balance))} {stats.balance > 0 ? '(Cr)' : '(Dr)'}
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
                                                    <td><span className={`VendorDetail-voucher-tag ${tx.voucherType.toLowerCase().replace('_', '-')}`}>{tx.voucherType}</span></td>
                                                    <td>
                                                        <span
                                                            className="font-mono text-blue-600 cursor-pointer hover:underline"
                                                            onClick={() => navigateToVoucher(tx)}
                                                        >
                                                            {tx.voucherNumber}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-xs truncate" title={tx.narration}>{tx.narration}</td>
                                                    <td className="text-right text-red-600">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                                    <td className="text-right text-green-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                                    <td className="text-right font-bold" style={{ color: tx.balance < 0 ? '#334155' : '#1e293b' }}>
                                                        {formatCurrency(Math.abs(tx.balance))} {tx.balance < 0 ? '(Dr)' : '(Cr)'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* {filteredStatement.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-8 text-gray-400">No transactions found matching the filters.</td>
                                                </tr>
                                            )} */}
                                            {statement.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="text-center py-8 text-gray-400">No transaction history found for this vendor.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'invoices' && (
                            <section className="VendorDetail-detail-section">
                                <h2 className="VendorDetail-section-title">Bill List</h2>
                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>BILL #</th>
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
                                            {filteredBills.map(bill => (
                                                <tr key={bill.id}>
                                                    <td>
                                                        <span
                                                            className="VendorDetail-id-badge cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewBill(bill.id)}
                                                        >
                                                            {bill.billNumber}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(bill.date).toLocaleDateString()}</td>
                                                    <td className="text-red-500">{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '-'}</td>
                                                    <td className="font-semibold">{formatCurrency(parseFloat(bill.totalAmount) || 0)}</td>
                                                    <td className="text-green-600">{formatCurrency((parseFloat(bill.totalAmount) || 0) - (parseFloat(bill.balanceAmount) || 0))}</td>
                                                    <td className="text-red-600 font-bold">{formatCurrency(parseFloat(bill.balanceAmount) || 0)}</td>
                                                    <td>
                                                        <span className={`VendorDetail-status-pill ${bill.status.toLowerCase()}`}>
                                                            {bill.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="VendorDetail-table-actions justify-end">
                                                            <button
                                                                className="VendorDetail-table-icon-btn VendorDetail-bg-orange"
                                                                title="View Detail"
                                                                onClick={() => handleViewBill(bill.id)}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button className="VendorDetail-table-icon-btn VendorDetail-bg-cyan" title="Edit"><Pencil size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredBills.length === 0 && (
                                                <tr>
                                                    <td colSpan="8" className="text-center py-8 text-gray-400">No bills found matching the filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'deliveries' && (
                            <section className="VendorDetail-detail-section">
                                <h2 className="VendorDetail-section-title">Goods Receipt Notes (GRN)</h2>
                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>GRN #</th>
                                                <th>DATE</th>
                                                <th>ORDER REF</th>
                                                <th>STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredGRNs.map(grn => (
                                                <tr key={grn.id}>
                                                    <td>
                                                        <span
                                                            className="VendorDetail-id-badge cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewGRN(grn.id)}
                                                        >
                                                            {grn.grnNumber}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(grn.date).toLocaleDateString()}</td>
                                                    <td>{grn.purchaseOrderId ? `#ORD-${grn.purchaseOrderId}` : 'Direct'}</td>
                                                    <td><span className={`VendorDetail-status-pill received`}>{grn.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredGRNs.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No GRNs found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'orders' && (
                            <section className="VendorDetail-detail-section">
                                <h2 className="VendorDetail-section-title">Purchase Orders</h2>
                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>ORDER #</th>
                                                <th>DATE</th>
                                                <th>TOTAL</th>
                                                <th>STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrders.map(order => (
                                                <tr key={order.id}>
                                                    <td>
                                                        <span
                                                            className="VendorDetail-id-badge cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewOrder(order.id)}
                                                        >
                                                            {order.orderNumber}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(order.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(parseFloat(order.totalAmount) || 0)}</td>
                                                    <td><span className={`VendorDetail-status-pill ${order.status.toLowerCase()}`}>{order.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredOrders.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No purchase orders found matching the filters.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {activeTab === 'quotations' && (
                            <section className="VendorDetail-detail-section">
                                <h2 className="VendorDetail-section-title">Purchase Quotations</h2>
                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>QUOTATION #</th>
                                                <th>DATE</th>
                                                <th>TOTAL</th>
                                                <th>STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredQuotations.map(quotation => (
                                                <tr key={quotation.id}>
                                                    <td>
                                                        <span
                                                            className="VendorDetail-id-badge cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewQuotation(quotation.id)}
                                                        >
                                                            {quotation.quotationNumber}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(quotation.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(parseFloat(quotation.totalAmount) || 0)}</td>
                                                    <td><span className={`VendorDetail-status-pill ${quotation.status.toLowerCase()}`}>{quotation.status}</span></td>
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
                            <section className="VendorDetail-detail-section">
                                <h2 className="VendorDetail-section-title">Purchase Returns</h2>
                                <div className="VendorDetail-table-responsive">
                                    <table className="VendorDetail-detail-table">
                                        <thead>
                                            <tr>
                                                <th>RETURN #</th>
                                                <th>DATE</th>
                                                <th>TOTAL</th>
                                                <th>STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReturns.map(r => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <span
                                                            className="VendorDetail-id-badge cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewReturn(r.id)}
                                                        >
                                                            {r.returnNumber}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(r.date).toLocaleDateString()}</td>
                                                    <td>{formatCurrency(parseFloat(r.totalAmount) || 0)}</td>
                                                    <td><span className={`VendorDetail-status-pill ${r.status.toLowerCase()}`}>{r.status}</span></td>
                                                </tr>
                                            ))}
                                            {filteredReturns.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-8 text-gray-400">No purchase returns found matching the filters.</td></tr>
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
                        <h1>VENDOR ACCOUNT STATEMENT</h1>
                        <p>Generated on: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="print-customer-info">
                    <div className="info-block">
                        <h3>Statement For:</h3>
                        <p><strong>{vendor.name}</strong></p>
                        <p>{vendor.billingAddress}</p>
                        <p>{vendor.billingCity}, {vendor.billingState} {vendor.billingZipCode}</p>
                        <p>Email: {vendor.email}</p>
                        <p>Phone: {vendor.phone}</p>
                    </div>
                    <div className="info-block text-right">
                        <h3>Account Summary:</h3>
                        <div className="summary-row">
                            <span>Opening Balance:</span>
                            <strong>{formatCurrency(vendor.ledger?.openingBalance || 0)}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Total Debits (Dr):</span>
                            <strong>{formatCurrency(statement.reduce((acc, tx) => acc + (tx.debit || 0), 0))}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Total Credits (Cr):</span>
                            <strong>{formatCurrency(statement.reduce((acc, tx) => acc + (tx.credit || 0), 0))}</strong>
                        </div>
                        <div className="summary-row closing">
                            <span>Closing Balance:</span>
                            <strong>{formatCurrency(Math.abs(stats.balance))} {stats.balance > 0 ? '(Cr)' : '(Dr)'}</strong>
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
                            <th className="text-right">Debit (Dr)</th>
                            <th className="text-right">Credit (Cr)</th>
                            <th className="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan="6" className="bold italic">Opening Balance</td>
                            <td className="text-right bold">{formatCurrency(vendor.ledger?.openingBalance || 0)}</td>
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

export default VendorDetail;