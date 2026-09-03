import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import posService from '../../../../services/posService';
import { CompanyContext } from '../../../../context/CompanyContext';
import './Invoice.css';
import { Loader2, AlertCircle, Download, Printer } from 'lucide-react';
import tabAccountsLogo from '../../../../assets/tab-accounts-logo.png';

const getCompanyLogoSrc = (logoVal) => {
    if (!logoVal) return tabAccountsLogo;
    if (typeof logoVal === 'string') {
        if (logoVal.startsWith('data:') || logoVal.startsWith('http://') || logoVal.startsWith('https://')) {
            return logoVal;
        }
        const cleanPath = logoVal.startsWith('/') ? logoVal : `/${logoVal}`;
        return `http://localhost:8080${cleanPath}`;
    }
    return tabAccountsLogo;
};

const PublicInvoiceView = ({ type = 'invoice' }) => {
    const { id } = useParams();
    const { formatCurrency, companySettings, getSyncRate } = useContext(CompanyContext);
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || document?.currency || companySettings?.currency || 'EUR';

        const localeMap = {
            'INR': 'en-IN',
            'AED': 'ar-AE',
            'SAR': 'ar-SA',
            'EUR': 'en-IE',
            'GBP': 'en-GB',
            'JPY': 'ja-JP',
            'CNY': 'zh-CN',
            'RUB': 'ru-RU',
            'BRL': 'pt-BR',
            'CAD': 'en-CA',
            'AUD': 'en-AU',
            'PKR': 'en-PK',
            'BDT': 'en-BD'
        };

        const locale = localeMap[docCurrency] || 'en-IE';

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: docCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            const sym = docCurrency === 'EUR' ? '€' : (docCurrency === 'GBP' ? '£' : (docCurrency === 'USD' ? '$' : '₹'));
            return `${sym}${(amount || 0).toFixed(2)}`;
        }
    };

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                setLoading(true);
                let response;
                if (type === 'pos') {
                    response = await posService.getPublicPOSInvoiceById(id);
                } else {
                    const axiosRes = await salesInvoiceService.getPublicById(id);
                    response = axiosRes.data;
                }
                
                if (response.success) {
                    setDocument(response.data);
                } else {
                    setError('Document not found or inaccessible.');
                }
            } catch (err) {
                console.error('Public Preview Error:', err);
                setError('Failed to load document. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDocument();
    }, [id, type]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="text-slate-600 font-medium">Fetching secure digital document...</p>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
                <AlertCircle className="text-red-500 mb-4" size={48} />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
                <p className="text-slate-600">{error || 'Unable to load this document.'}</p>
            </div>
        );
    }

    const companyDetails = document.company || {};

    const sanitizeEnglishOnly = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim();
    };

    const getTableHeader = (key, defaultVal) => {
        const defaults = {
            item: 'Item',
            quantity: 'Quantity',
            rate: 'Rate',
            discount: 'Discount',
            tax: 'VAT (%)',
            price: 'Amount',
            warehouse: 'Warehouse',
            uom: 'UOM'
        };
        if (companyDetails?.invoiceTableHeaders) {
            try {
                const headers = typeof companyDetails.invoiceTableHeaders === 'string'
                    ? JSON.parse(companyDetails.invoiceTableHeaders)
                    : companyDetails.invoiceTableHeaders;
                if (headers[key] !== undefined) {
                    return sanitizeEnglishOnly(headers[key]);
                }
            } catch (e) {
                console.error(e);
            }
        }
        return sanitizeEnglishOnly(defaultVal || defaults[key] || key);
    };

    const getCustomLabel = (key) => {
        if (key === 'showWarehouse' || key === 'showUom') return false;
        const defaults = {
            billTo: 'Bill To:',
            shipTo: 'Ship To:',
            subTotal: 'Subtotal',
            tax: 'VAT',
            total: 'Total',
            number: 'Invoice #:',
            issue: 'Date:',
            dueDate: 'Due Date:',
            showHeader: true,
            showFooter: true,
            showWarehouse: false,
            showQty: true,
            showUom: false,
            showRate: true,
            showTax: true,
            showDiscount: true
        };
        if (companyDetails?.invoiceLabels) {
            try {
                const labels = typeof companyDetails.invoiceLabels === 'string'
                    ? JSON.parse(companyDetails.invoiceLabels)
                    : companyDetails.invoiceLabels;
                if (labels[key] !== undefined) {
                    return sanitizeEnglishOnly(labels[key]);
                }
            } catch (e) {}
        }
        return sanitizeEnglishOnly(defaults[key] !== undefined ? defaults[key] : key);
    };

    const items = type === 'pos' ? (document.posinvoiceitem || []) : (document.invoiceitem || []);

    const returnedQtyMap = {};
    let totalReturned = 0;
    if (document.salesreturn && document.salesreturn.length > 0) {
        document.salesreturn.forEach(ret => {
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
    const netTotal = Math.max(0, document.totalAmount - totalReturned);
    const viewRate = getSyncRate(document?.currency || 'USD', companySettings?.currency || 'EUR') || 1.0;

    const parsedOtherCharges = (() => {
        try {
            if (document?.customFields) {
                const cf = typeof document.customFields === 'string'
                    ? JSON.parse(document.customFields)
                    : document.customFields;
                return cf?._otherCharges || [];
            }
        } catch (e) {
            console.error('Error parsing custom fields for other charges in public view:', e);
        }
        return [];
    })();

    const otherChargesTotal = parsedOtherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const getOverallDiscountAmt = () => {
        if (document.overallDiscount > 0) {
            if (document.overallDiscountType === 'percentage') {
                const F = (parseFloat(document.overallDiscount) || 0) / 100;
                if (F >= 1) return document.discountAmount || 0;
                const sub = parseFloat(document.subtotal) || 0;
                const totDisc = parseFloat(document.discountAmount) || 0;
                const tax = parseFloat(document.taxAmount) || 0;
                return ((sub - totDisc + tax) * F) / (1 - F);
            }
            return parseFloat(document.overallDiscount) || 0;
        }
        return 0;
    };

    const overallDiscountAmt = getOverallDiscountAmt();
    const itemDiscountAmt = Math.max(0, (parseFloat(document.discountAmount) || 0) - overallDiscountAmt);

    const rawItems = items;
    const groups = {};
    rawItems.forEach(item => {
        const rate = parseFloat(item.taxRate !== undefined ? item.taxRate : (item.tax || 0));
        const qty = parseFloat(item.quantity !== undefined ? item.quantity : (item.qty || 1));
        const unitRate = parseFloat(item.rate !== undefined ? item.rate : (item.price || 0));
        const netAmt = qty * unitRate;
        const vatAmt = netAmt * (rate / 100);
        const rateKey = rate.toFixed(2);
        if (!groups[rateKey]) {
            groups[rateKey] = { rate, vatAmount: 0, netAmount: 0 };
        }
        groups[rateKey].vatAmount += vatAmt;
        groups[rateKey].netAmount += netAmt;
    });
    let vatSummaryList = Object.values(groups);
    if (vatSummaryList.length === 0 && (document?.taxAmount > 0 || document?.subtotal > 0)) {
        const sub = parseFloat(document?.subtotal || 0);
        const tax = parseFloat(document?.taxAmount || 0);
        const calcRate = sub > 0 ? (tax / sub) * 100 : 0;
        vatSummaryList = [{ rate: calcRate, vatAmount: tax, netAmount: sub }];
    }

    const subtotalVal = document?.subtotal !== undefined && document?.subtotal !== null
        ? document.subtotal
        : rawItems.reduce((acc, it) => acc + ((it.quantity || 1) * (it.rate || 0)), 0);

    const isFullyPaid = (document?.balanceAmount === 0 || (document?.paidAmount >= document?.totalAmount && document?.totalAmount > 0));
    const paymentReceivedDate = document?.paymentDate || document?.receipt?.[0]?.date || document?.allocations?.[0]?.receipt?.date;

    return (
        <div className="public-invoice-page bg-slate-100 min-h-screen p-4 md:p-10">
            <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 Invoice-no-print">
                <div className="flex items-center gap-3">
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1e293b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>
                        TAB
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>Digital Invoice Portal</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified client billing &amp; settlement statement</div>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#1e293b',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(30, 41, 59, 0.2)'
                    }}
                >
                    <Download size={16} /> Print / Save PDF
                </button>
            </div>
            <div className="max-w-4xl mx-auto">
                <div 
                    className={`invoice-preview-container invoice-cea-container template-${(companyDetails.invoiceTemplate || 'newyork').toLowerCase().replace(/\s+/g, '')}`}
                    id="invoice-print-content"
                    style={{ 
                        '--header-bg': companyDetails.invoiceColor || '#1e293b',
                        '--header-text': (() => {
                            const hex = (companyDetails.invoiceColor || '#1e293b').replace('#', '');
                            const r = parseInt(hex.substr(0, 2), 16);
                            const g = parseInt(hex.substr(2, 2), 16);
                            const b = parseInt(hex.substr(4, 2), 16);
                            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                            return (yiq >= 150) ? '#1e293b' : '#ffffff';
                        })()
                    }}
                >
                    {/* 1. TOP HEADER */}
                    <div className="invoice-cea-header">
                        <div className="invoice-cea-company">
                            <h1 className="invoice-cea-company-title">{companyDetails.name || 'Tab Accounts'}</h1>
                            {companyDetails.address && <p className="invoice-cea-company-text">{companyDetails.address}</p>}
                            {(companyDetails.city || companyDetails.state || companyDetails.zip || companyDetails.country) && (
                                <p className="invoice-cea-company-text">
                                    {[companyDetails.city, companyDetails.state, companyDetails.zip, companyDetails.country].filter(Boolean).join(', ')}
                                </p>
                            )}
                            {(companyDetails.phone || companyDetails.email) && (
                                <p className="invoice-cea-company-text">
                                    {companyDetails.phone && <span>{companyDetails.phone}</span>}
                                    {companyDetails.phone && companyDetails.email && <span> | </span>}
                                    {companyDetails.email && <span>{companyDetails.email}</span>}
                                </p>
                            )}
                            {(companyDetails.vatNumber || companyDetails.gstNumber) && (
                                <div className="invoice-cea-vat-badge">
                                    <span>VAT No: </span><strong>{companyDetails.vatNumber || companyDetails.gstNumber}</strong>
                                </div>
                            )}
                        </div>
                        <div className="invoice-cea-logo-box">
                            <img
                                src={getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo)}
                                alt={companyDetails.name || "Company Logo"}
                                className="invoice-cea-logo"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = tabAccountsLogo;
                                }}
                            />
                        </div>
                    </div>

                    {/* 2. 2-COLUMN INFO GRID: BILL TO & METADATA */}
                    <div className="invoice-cea-info-grid">
                        <div className="invoice-cea-bill-to">
                            <div className="invoice-cea-label">BILL TO</div>
                            <div className="invoice-cea-client-name">{document.customer?.name || document.billingName || 'Walk-in Customer'}</div>
                            <div className="invoice-cea-client-text">
                                {document.billingAddress || document.customer?.billingAddress || 'N/A'}<br />
                                {[document.billingCity || document.customer?.billingCity, document.billingState || document.customer?.billingState].filter(Boolean).join(', ')}
                            </div>
                            {(document.customer?.phone || document.billingPhone) && (
                                <div className="invoice-cea-client-text">{document.customer?.phone || document.billingPhone}</div>
                            )}
                            {(document.customer?.email || document.billingEmail) && (
                                <div className="invoice-cea-client-text">{document.customer?.email || document.billingEmail}</div>
                            )}
                            {(document.customer?.vatNumber || document.customer?.gstin || document.customer?.gstNumber) && (
                                <div className="invoice-cea-client-text">
                                    <strong>VAT / Tax ID: </strong>{document.customer?.vatNumber || document.customer?.gstin || document.customer?.gstNumber}
                                </div>
                            )}
                        </div>
                        <div className="invoice-cea-meta-box">
                            <div className="invoice-cea-doc-title">
                                {type === 'pos' ? 'POS RECEIPT' : 'INVOICE'}
                            </div>
                            <div className="invoice-cea-meta-table">
                                <div className="invoice-cea-meta-row">
                                    <span className="invoice-cea-meta-key">INVOICE #</span>
                                    <span className="invoice-cea-meta-val">{document.invoiceNumber || 'N/A'}</span>
                                </div>
                                <div className="invoice-cea-meta-row">
                                    <span className="invoice-cea-meta-key">DATE</span>
                                    <span className="invoice-cea-meta-val">
                                        {document.date ? new Date(document.date).toLocaleDateString('en-GB') : 'N/A'}
                                    </span>
                                </div>
                                <div className="invoice-cea-meta-row">
                                    <span className="invoice-cea-meta-key">PAYMENT TERMS</span>
                                    <span className="invoice-cea-meta-val">{document.paymentTerms || 'Due on Receipt'}</span>
                                </div>
                                {document.dueDate && (
                                    <div className="invoice-cea-meta-row">
                                        <span className="invoice-cea-meta-key">DUE DATE</span>
                                        <span className="invoice-cea-meta-val">
                                            {new Date(document.dueDate).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. LINE ITEMS TABLE */}
                    <table className="invoice-cea-table">
                        <thead>
                            <tr>
                                <th style={{ width: '13%' }}>DATE</th>
                                <th style={{ width: '22%' }}>ACTIVITY</th>
                                <th style={{ width: '27%' }}>DESCRIPTION</th>
                                <th style={{ width: '8%', textAlign: 'center' }}>VAT</th>
                                <th style={{ width: '8%', textAlign: 'center' }}>QTY</th>
                                <th style={{ width: '11%', textAlign: 'right' }}>RATE</th>
                                <th style={{ width: '11%', textAlign: 'right' }}>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const productName = item.product?.name || item.service?.name || item.description || 'Service';
                                const itemTax = item.taxRate !== undefined ? item.taxRate : (item.tax || 0);
                                const itemQty = item.quantity !== undefined ? item.quantity : (item.qty || 1);
                                const itemRate = item.rate !== undefined ? item.rate : (item.price || 0);
                                const itemAmt = item.amount !== undefined ? item.amount : (itemQty * itemRate);

                                return (
                                    <tr key={idx}>
                                        <td>
                                            {item.date ? new Date(item.date).toLocaleDateString('en-GB') : (document?.date ? new Date(document.date).toLocaleDateString('en-GB') : '-')}
                                        </td>
                                        <td>
                                            <div className="invoice-cea-item-title">{productName}</div>
                                        </td>
                                        <td>
                                            <div className="invoice-cea-item-desc">{item.description || '-'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{itemTax}%</td>
                                        <td style={{ textAlign: 'center' }}>{itemQty}</td>
                                        <td style={{ textAlign: 'right' }}>{formatDocCurrency(itemRate, document?.currency)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatDocCurrency(itemAmt, document?.currency)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* 4. TOTALS & VAT SUMMARY SECTION */}
                    <div className="invoice-cea-summary-wrap">
                        {/* Left: VAT Summary Table */}
                        <div className="invoice-cea-vat-summary-block">
                            <div className="invoice-cea-label">VAT SUMMARY</div>
                            <table className="invoice-cea-vat-table">
                                <thead>
                                    <tr>
                                        <th>VAT RATE</th>
                                        <th style={{ textAlign: 'right' }}>VAT AMOUNT</th>
                                        <th style={{ textAlign: 'right' }}>NET AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vatSummaryList.map((vat, i) => (
                                        <tr key={i}>
                                            <td>{vat.rate.toFixed(2)}%</td>
                                            <td style={{ textAlign: 'right' }}>{formatDocCurrency(vat.vatAmount, document?.currency)}</td>
                                            <td style={{ textAlign: 'right' }}>{formatDocCurrency(vat.netAmount, document?.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '1.25rem', fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                                We appreciate your business.
                            </div>
                        </div>

                        {/* Right: Totals Card */}
                        <div className="invoice-cea-totals-block">
                            <div className="invoice-cea-totals-card">
                                <div className="invoice-cea-total-row">
                                    <span>SUBTOTAL</span>
                                    <span>{formatDocCurrency(subtotalVal, document?.currency)}</span>
                                </div>
                                {vatSummaryList.map((vat, i) => (
                                    <div key={i} className="invoice-cea-total-row">
                                        <span>VAT @ {vat.rate.toFixed(1)}%</span>
                                        <span>{formatDocCurrency(vat.vatAmount, document?.currency)}</span>
                                    </div>
                                ))}
                                <div className="invoice-cea-total-row grand-total">
                                    <span>TOTAL</span>
                                    <span>{formatDocCurrency(document?.totalAmount || 0, document?.currency)}</span>
                                </div>
                                <div className="invoice-cea-total-row">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span>PAYMENT RECEIVED</span>
                                        {paymentReceivedDate && (document?.paidAmount || 0) > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
                                                (Paid on {new Date(paymentReceivedDate).toLocaleDateString()})
                                            </span>
                                        )}
                                    </div>
                                    <span>{formatDocCurrency(document?.paidAmount || 0, document?.currency)}</span>
                                </div>
                                <div className="invoice-cea-total-row balance-due">
                                    <span>BALANCE DUE</span>
                                    <span style={{ color: (document?.balanceAmount || 0) > 0 ? '#ef4444' : '#10b981' }}>
                                        {formatDocCurrency(document?.balanceAmount || 0, document?.currency)}
                                    </span>
                                </div>
                            </div>

                            {/* PAID Stamp Badge */}
                            {isFullyPaid && (
                                <div className="invoice-cea-paid-stamp">
                                    PAID
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. BANK SETTLEMENT / PAYMENT DETAILS FOOTER */}
                    {(companyDetails.bankName || companyDetails.iban || companyDetails.accountNumber) && (
                        <div className="invoice-cea-bank-card">
                            <div className="invoice-cea-bank-title">PAYMENT DETAILS / BANK SETTLEMENT</div>
                            <div className="invoice-cea-bank-grid">
                                {companyDetails.bankName && (
                                    <div className="invoice-cea-bank-item"><span>Bank:</span> <strong>{companyDetails.bankName}</strong></div>
                                )}
                                {(companyDetails.accountName || companyDetails.accountHolder) && (
                                    <div className="invoice-cea-bank-item"><span>Account Name:</span> <strong>{companyDetails.accountName || companyDetails.accountHolder}</strong></div>
                                )}
                                {companyDetails.accountNumber && (
                                    <div className="invoice-cea-bank-item"><span>Account Number:</span> <strong>{companyDetails.accountNumber}</strong></div>
                                )}
                                {companyDetails.iban && (
                                    <div className="invoice-cea-bank-item"><span>IBAN:</span> <strong>{companyDetails.iban}</strong></div>
                                )}
                                {companyDetails.bic && (
                                    <div className="invoice-cea-bank-item"><span>BIC / SWIFT:</span> <strong>{companyDetails.bic}</strong></div>
                                )}
                                {companyDetails.sortCode && (
                                    <div className="invoice-cea-bank-item"><span>Sort Code:</span> <strong>{companyDetails.sortCode}</strong></div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 6. NOTES & TERMS */}
                    {(document.notes || companyDetails.notes || companyDetails.termsInvoice || companyDetails.terms) && (
                        <div className="invoice-cea-notes">
                            {document.notes && (
                                <div style={{ marginBottom: '8px' }}>
                                    <strong>Notes:</strong> <span style={{ whiteSpace: 'pre-line' }}>{document.notes}</span>
                                </div>
                            )}
                            {(companyDetails.termsInvoice || companyDetails.terms) && (
                                <div>
                                    <strong>Terms &amp; Conditions:</strong> <span>{companyDetails.termsInvoice || companyDetails.terms}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="no-print mt-10 flex justify-center">
                        <button 
                            onClick={() => window.print()}
                            className="bg-slate-800 text-white px-8 py-2.5 rounded-lg font-semibold shadow-lg hover:bg-slate-900 transition flex items-center gap-2"
                        >
                            Download / Print PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicInvoiceView;
