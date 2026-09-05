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
                {(() => {
                    const formatCeaDate = (dateVal) => {
                        if (!dateVal) return '';
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return String(dateVal);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                    };

                    const billName = document.customer?.name || document.billingName || 'Frank Sheridan';
                    const billAddr = document.billingAddress || document.customer?.billingAddress || '56 New cork road, Midleton, Co. Cork';
                    const billCityStateZip = [
                        document.billingCity || document.customer?.billingCity,
                        document.billingState || document.customer?.billingState
                    ].filter(Boolean).join(', ');
                    const billPhone = document.customer?.phone || document.billingPhone;
                    const email = document.customer?.email || document.billingEmail;
                    const gstin = document.customer?.vatNumber || document.customer?.gstin || document.customer?.gstNumber;

                    const lineItems = items && items.length > 0 ? items : [
                        {
                            activity: 'Services',
                            description: billAddr || '56 New cork road, Midleton, Co. Cork',
                            taxRate: 23,
                            quantity: 1,
                            rate: 200,
                            amount: 200
                        }
                    ];

                    const totalVal = parseFloat(document?.totalAmount || 0);
                    const paidVal = parseFloat(document?.paidAmount || 0);
                    const balanceVal = parseFloat(document?.balanceAmount !== undefined ? document.balanceAmount : Math.max(0, totalVal - paidVal));
                    const isPaid = balanceVal === 0 || (paidVal >= totalVal && totalVal > 0) || document?.status === 'Paid';

                    const bankAccountName = companyDetails.accountName || companyDetails.accountHolder || companyDetails.name || 'CEAC LTD';
                    const bankIban = companyDetails.iban || 'IE03BOFI90290116673832';
                    const bankBic = companyDetails.bic || 'BOFIIE2D';
                    const bankAccount = companyDetails.accountNumber || '16673832';
                    const bankSortCode = companyDetails.sortCode || '902901';
                    const bankName = companyDetails.bankName || 'Bank Of Ireland';
                    const bankAddress = companyDetails.bankAddress || '97 Main Street, Midleton, Co. Cork';
                    const companyLogoSrc = getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo);

                    const effectiveItemCount = lineItems.reduce((acc, it) => {
                        const descLen = (it.description || '').length;
                        const descLines = descLen > 55 ? Math.ceil(descLen / 50) : 1;
                        return acc + descLines;
                    }, 0);

                    const densityClass = effectiveItemCount <= 3
                        ? 'cea-density-normal'
                        : effectiveItemCount <= 6
                            ? 'cea-density-moderate'
                            : effectiveItemCount <= 11
                                ? 'cea-density-compact'
                                : 'cea-density-ultra-compact';

                    return (
                        <div 
                            className={`invoice-preview-container invoice-cea-container ${densityClass}`}
                            id="invoice-print-content"
                        >
                            {/* 1. HEADER: Company Info (Left), CEA Logo (Right) */}
                            <div className="invoice-cea-header">
                                <div className="invoice-cea-company">
                                    <div className="invoice-cea-company-name">{companyDetails.name || 'CEAC Ltd'}</div>
                                    <div className="invoice-cea-company-line">{companyDetails.address || '17 South Mall'}</div>
                                    <div className="invoice-cea-company-line">
                                        {[companyDetails.city || 'Cork', companyDetails.state ? `Co, ${companyDetails.state.replace(/^Co\.?,?\s*/i, '')}` : 'Co, Cork', companyDetails.zip || 'T12VCY2'].filter(Boolean).join(' ')}
                                    </div>
                                    <div className="invoice-cea-company-line">{companyDetails.phone || '+353214272000'}</div>
                                    <div className="invoice-cea-company-line">{companyDetails.email || 'accounts@ceaarchitects.com'}</div>
                                    <div className="invoice-cea-company-line">VAT ID: {companyDetails.vatNumber || companyDetails.gstNumber || '4120278GH'}</div>
                                </div>
                                <div className="invoice-cea-logo-container">
                                    {companyLogoSrc && companyLogoSrc !== tabAccountsLogo ? (
                                        <img
                                            src={companyLogoSrc}
                                            alt={companyDetails.name || "Company Logo"}
                                            className="invoice-cea-logo-img"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.nextSibling) {
                                                    e.currentTarget.nextSibling.style.display = 'block';
                                                }
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className="invoice-cea-logo-text"
                                        style={{ display: (companyLogoSrc && companyLogoSrc !== tabAccountsLogo) ? 'none' : 'block' }}
                                    >
                                        <div className="cea-logo-main">CEA</div>
                                        <div className="cea-logo-sub">ARCHITECTS</div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. TITLE & BILL TO (Left) and METADATA (Right) */}
                            <div className="invoice-cea-middle">
                                <div className="invoice-cea-middle-left">
                                    <div className="invoice-cea-doc-heading">{type === 'pos' ? 'POS RECEIPT' : 'INVOICE'}</div>
                                    <div className="invoice-cea-bill-label">BILL TO</div>
                                    <div className="invoice-cea-client-name">{billName}</div>
                                    <div className="invoice-cea-client-line">{billAddr}</div>
                                    {billCityStateZip && billCityStateZip !== billAddr && (
                                        <div className="invoice-cea-client-line">{billCityStateZip}</div>
                                    )}
                                    {billPhone && <div className="invoice-cea-client-line">{billPhone}</div>}
                                    {email && <div className="invoice-cea-client-line">{email}</div>}
                                    {gstin && <div className="invoice-cea-client-line">VAT ID: {gstin}</div>}
                                </div>
                                <div className="invoice-cea-middle-right">
                                    <div className="invoice-cea-meta-grid">
                                        <span className="invoice-cea-kv-key">INVOICE</span>
                                        <span className="invoice-cea-kv-val">{document.invoiceNumber ? String(document.invoiceNumber).replace(/^#/, '') : '1550'}</span>

                                        <span className="invoice-cea-kv-key">DATE</span>
                                        <span className="invoice-cea-kv-val">{document.date ? formatCeaDate(document.date) : '06-05-2026'}</span>

                                        <span className="invoice-cea-kv-key">TERMS</span>
                                        <span className="invoice-cea-kv-val">{document.paymentTerms || 'Net 7'}</span>

                                        <span className="invoice-cea-kv-key">DUE DATE</span>
                                        <span className="invoice-cea-kv-val">{document.dueDate ? formatCeaDate(document.dueDate) : (document.date ? formatCeaDate(document.date) : '13-05-2026')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. ITEMS TABLE */}
                            <table className="invoice-cea-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '12%', textAlign: 'left' }}>DATE</th>
                                        <th style={{ width: '18%', textAlign: 'left' }}>ACTIVITY</th>
                                        <th style={{ width: '34%', textAlign: 'left' }}>DESCRIPTION</th>
                                        <th style={{ width: '10%', textAlign: 'left' }}>TAX</th>
                                        <th style={{ width: '6%', textAlign: 'right' }}>QTY</th>
                                        <th style={{ width: '10%', textAlign: 'right' }}>RATE</th>
                                        <th style={{ width: '10%', textAlign: 'right' }}>AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((item, idx) => {
                                        const productName = item.service?.name || item.product?.name || item.description || 'Services';
                                        const itemDesc = item.description || (item.product?.name ? item.description : billAddr) || '56 New cork road, Midleton, Co. Cork';
                                        const itemTax = item.taxRate !== undefined ? item.taxRate : (item.tax || 23);
                                        const itemQty = item.quantity !== undefined ? item.quantity : (item.qty || 1);
                                        const itemRate = item.rate !== undefined ? item.rate : (item.price || 200);
                                        const itemAmt = item.amount !== undefined ? item.amount : (itemQty * itemRate);
                                        const isStandardTax = parseFloat(itemTax) === 23 || !itemTax;
                                        const taxDisplay = isStandardTax ? 'Standard' : (item.taxName || `${itemTax}%`);

                                        return (
                                            <tr key={idx}>
                                                <td>{item.date ? formatCeaDate(item.date) : ''}</td>
                                                <td>{productName}</td>
                                                <td>{itemDesc}</td>
                                                <td>{taxDisplay}</td>
                                                <td style={{ textAlign: 'right' }}>{itemQty}</td>
                                                <td style={{ textAlign: 'right' }}>{Number(itemRate).toFixed(2)}</td>
                                                <td style={{ textAlign: 'right' }}>{Number(itemAmt).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* 4. DOTTED DIVIDER 1 & TOTALS */}
                            <div className="invoice-cea-divider-dotted" />

                            <div className="invoice-cea-subtotal-section">
                                <div className="invoice-cea-appreciation">
                                    We appreciate your business.
                                </div>
                                <div className="invoice-cea-totals-grid">
                                    <span className="invoice-cea-total-label">SUBTOTAL</span>
                                    <span className="invoice-cea-total-val">{Number(subtotalVal || 0).toFixed(2)}</span>

                                    <span className="invoice-cea-total-label">TAX</span>
                                    <span className="invoice-cea-total-val">
                                        {Number(vatSummaryList.reduce((acc, v) => acc + (v.vatAmount || 0), 0)).toFixed(2)}
                                    </span>

                                    <span className="invoice-cea-total-label">TOTAL</span>
                                    <span className="invoice-cea-total-val">{Number(totalVal).toFixed(2)}</span>

                                    <span className="invoice-cea-total-label">PAYMENT</span>
                                    <span className="invoice-cea-total-val">{Number(paidVal).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* 5. DOTTED DIVIDER 2 & BALANCE DUE / PAID */}
                            <div className="invoice-cea-divider-dotted" />

                            <div className="invoice-cea-balance-section">
                                <div className="invoice-cea-balance-box">
                                    <div className="invoice-cea-balance-line">
                                        <span className="invoice-cea-balance-label">BALANCE DUE</span>
                                        <span className="invoice-cea-balance-amount">
                                            {document?.currency || companyDetails.currency || 'EUR'} {Number(balanceVal).toFixed(2)}
                                        </span>
                                    </div>
                                    {isPaid && (
                                        <div className="invoice-cea-paid-indicator">
                                            PAID
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 6. VAT SUMMARY */}
                            <div className="invoice-cea-vat-section">
                                <div className="invoice-cea-vat-title">VAT SUMMARY</div>
                                <table className="invoice-cea-vat-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '38%', textAlign: 'left' }}></th>
                                            <th style={{ width: '22%', textAlign: 'left' }}>RATE</th>
                                            <th style={{ width: '20%', textAlign: 'right' }}>VAT</th>
                                            <th style={{ width: '20%', textAlign: 'right' }}>NET</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vatSummaryList.map((vat, i) => (
                                            <tr key={i}>
                                                <td></td>
                                                <td style={{ textAlign: 'left' }}>VAT @ {parseFloat(vat.rate || 23).toFixed(0)}%</td>
                                                <td style={{ textAlign: 'right' }}>{Number(vat.vatAmount).toFixed(2)}</td>
                                                <td style={{ textAlign: 'right' }}>{Number(vat.netAmount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 7. BANK DETAILS BOX */}
                            <div className="invoice-cea-bank-box">
                                <div className="invoice-cea-bank-grid">
                                    <div className="invoice-cea-bank-col">
                                        <div className="invoice-cea-bank-line">Name: {bankAccountName}</div>
                                        <div className="invoice-cea-bank-line">IBAN:{bankIban}</div>
                                        <div className="invoice-cea-bank-line">BIC: {bankBic}</div>
                                        <div className="invoice-cea-bank-line">Account: {bankAccount}</div>
                                    </div>
                                    <div className="invoice-cea-bank-col">
                                        <div className="invoice-cea-bank-line">NSC (SORT CODE): {bankSortCode}</div>
                                        <div className="invoice-cea-bank-line">{bankName}</div>
                                        <div className="invoice-cea-bank-line">{bankAddress}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 8. PAGE FOOTER */}
                            <div className="invoice-cea-page-footer">
                                Page 1 of 1
                            </div>
                        </div>
                    );
                })()}

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
    );
};

export default PublicInvoiceView;
