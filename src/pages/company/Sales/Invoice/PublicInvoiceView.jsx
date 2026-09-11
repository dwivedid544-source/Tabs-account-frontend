import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import posService from '../../../../services/posService';
import { CompanyContext } from '../../../../context/CompanyContext';
import { BASE_URL } from '../../../../api/axiosInstance';
import { resolveLogoUrl } from '../../../../utils/logoUrl';
import './Invoice.css';
import { Loader2, AlertCircle, Download, Printer } from 'lucide-react';
import tabAccountsLogo from '../../../../assets/tab-accounts-logo.png';
import ceaArchitectsLogo from '../../../../assets/cea-architects-logo.png';

const getContrastTextColor = (hexColor) => {
    if (!hexColor) return '#ffffff';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 170) ? '#1e293b' : '#ffffff';
};

const getTintBg = (hexColor, alpha = 0.08) => {
    if (!hexColor) return '#f8fafc';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#f8fafc';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getCompanyLogoSrc = (logoVal, fallback = ceaArchitectsLogo) => {
    if (!logoVal) return fallback;
    if (typeof logoVal === 'string') {
        const resolved = resolveLogoUrl(logoVal);
        if (resolved) return resolved;
        if (logoVal.startsWith('data:') || logoVal.startsWith('http://') || logoVal.startsWith('https://')) {
            return logoVal;
        }
        const cleanPath = logoVal.startsWith('/') ? logoVal : `/${logoVal}`;
        const serverUrl = BASE_URL || 'https://tabaccounting-production.up.railway.app';
        return `${serverUrl}${cleanPath}`;
    }
    return fallback;
};

const PublicInvoiceView = ({ type = 'invoice' }) => {
    const { id } = useParams();
    const { formatCurrency, companySettings, getSyncRate, getDocumentTitle } = useContext(CompanyContext);
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
                    return typeof labels[key] === 'string' ? sanitizeEnglishOnly(labels[key]) : labels[key];
                }
            } catch (e) {}
        }
        const val = defaults[key] !== undefined ? defaults[key] : key;
        return typeof val === 'string' ? sanitizeEnglishOnly(val) : val;
    };
    const getInvoiceLabel = getCustomLabel;

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

    const rawItems = items || [];
    const subtotalVal = document?.subtotal !== undefined && document?.subtotal !== null
        ? parseFloat(document.subtotal)
        : rawItems.reduce((acc, it) => acc + ((parseFloat(it.quantity) || 1) * (parseFloat(it.rate) || 0)), 0);

    const lineDiscountsTotal = rawItems.reduce((sum, it) => sum + (parseFloat(it.discount || 0) || 0), 0);
    const ovDiscountValue = parseFloat(document?.overallDiscount || 0);
    const ovDiscountType = document?.overallDiscountType || 'percentage';
    const netBeforeOv = Math.max(0, subtotalVal - lineDiscountsTotal);
    let calculatedOvDiscountAmt = 0;
    if (ovDiscountValue > 0) {
        calculatedOvDiscountAmt = ovDiscountType === 'percentage'
            ? (netBeforeOv * Math.min(100, ovDiscountValue)) / 100
            : Math.min(netBeforeOv, ovDiscountValue);
    }

    let totalDiscountVal = parseFloat(document?.discountAmount || 0);
    if (totalDiscountVal === 0 && (lineDiscountsTotal > 0 || calculatedOvDiscountAmt > 0)) {
        totalDiscountVal = lineDiscountsTotal + calculatedOvDiscountAmt;
    }
    const taxableVal = Math.max(0, subtotalVal - totalDiscountVal);
    const overallDiscountRatio = netBeforeOv > 0 ? (calculatedOvDiscountAmt / netBeforeOv) : 0;

    const groups = {};
    rawItems.forEach(item => {
        const rate = parseFloat(item.taxRate !== undefined ? item.taxRate : (item.tax || 0));
        const qty = parseFloat(item.quantity !== undefined ? item.quantity : (item.qty || 1));
        const unitRate = parseFloat(item.rate !== undefined ? item.rate : (item.price || 0));
        const lineGross = qty * unitRate;
        const lineNetBeforeOv = Math.max(0, lineGross - (parseFloat(item.discount || 0) || 0));
        const lineDiscountedTaxable = lineNetBeforeOv * (1 - overallDiscountRatio);
        const discountedAmt = (item.amount !== undefined && item.amount !== null && parseFloat(item.amount) <= lineGross + 0.01)
            ? parseFloat(item.amount)
            : lineDiscountedTaxable;

        const rateKey = rate.toFixed(2);
        if (!groups[rateKey]) {
            groups[rateKey] = { rate, vatAmount: 0, netAmount: 0 };
        }
        groups[rateKey].netAmount += discountedAmt;
        if (rate > 0) {
            groups[rateKey].vatAmount += (discountedAmt * rate) / 100;
        }
    });
    let vatSummaryList = Object.values(groups).sort((a, b) => b.rate - a.rate);
    if (vatSummaryList.length === 0 && (document?.taxAmount > 0 || document?.subtotal > 0)) {
        const tax = parseFloat(document?.taxAmount || 0);
        const calcRate = taxableVal > 0 ? (tax / taxableVal) * 100 : 0;
        vatSummaryList = [{ rate: calcRate, vatAmount: tax, netAmount: taxableVal }];
    }

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
                    let paidVal = parseFloat(document?.paidAmount || 0);
                    if (isNaN(paidVal)) paidVal = 0;

                    if (Array.isArray(document?.receipt) && document.receipt.length > 0) {
                        const receiptSum = document.receipt.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                        if (receiptSum > paidVal) paidVal = receiptSum;
                    }

                    const rawBal = document?.balanceAmount !== undefined ? parseFloat(document.balanceAmount) : (totalVal - paidVal);
                    const calculatedBal = Math.max(0, isNaN(rawBal) ? Math.max(0, totalVal - paidVal) : rawBal);
                    const tol = 0.01;
                    const balanceVal = calculatedBal <= tol ? 0 : calculatedBal;
                    const isDuePassed = Boolean(document?.dueDate && new Date(document.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0));
                    const rawStatus = String(document?.status || '').toUpperCase();

                    const currentStatus = (() => {
                        if (rawStatus === 'CANCELLED') return 'CANCELLED';
                        if (balanceVal <= tol && (totalVal > 0 || paidVal > 0)) return 'PAID';
                        if (balanceVal <= tol && totalVal === 0) return 'PAID';
                        if (rawStatus === 'PAID' && balanceVal <= tol) return 'PAID';
                        if (balanceVal > tol && isDuePassed) return 'OVERDUE';
                        if (paidVal > tol && balanceVal > tol) return 'PARTIAL';
                        if (rawStatus === 'OVERDUE' && balanceVal > tol) return 'OVERDUE';
                        if (rawStatus === 'PARTIAL' && balanceVal > tol && paidVal > tol) return 'PARTIAL';
                        if (rawStatus && rawStatus !== 'UNPAID' && rawStatus !== 'DUE') return rawStatus;
                        return 'UNPAID';
                    })();

                    const bankAccountName = companyDetails.accountName || companyDetails.accountHolder || companyDetails.name || 'CEAC LTD';
                    const bankIban = companyDetails.iban || 'IE03BOFI90290116673832';
                    const bankBic = companyDetails.bic || 'BOFIIE2D';
                    const bankAccount = companyDetails.accountNumber || '16673832';
                    const bankSortCode = companyDetails.sortCode || '902901';
                    const bankName = companyDetails.bankName || 'Bank Of Ireland';
                    const bankAddress = companyDetails.bankAddress || '97 Main Street, Midleton, Co. Cork';
                    const companyLogoSrc = getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo || companySettings?.invoiceLogo || companySettings?.logo);
                    const themeColor = companyDetails.invoiceColor || companySettings?.invoiceColor || '#004aad';
                    const showHeader = getInvoiceLabel('showHeader') !== false;
                    const showFooter = getInvoiceLabel('showFooter') !== false;
                    const showWarehouse = getInvoiceLabel('showWarehouse') !== false;
                    const showTax = getInvoiceLabel('showTax') !== false;
                    const showUom = getInvoiceLabel('showUom') === true;
                    const showQty = getInvoiceLabel('showQty') !== false;
                    const showRate = getInvoiceLabel('showRate') !== false;
                    const showDiscount = getInvoiceLabel('showDiscount') === true;

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
                            {showHeader && (
                                <div className="invoice-cea-header">
                                    <div className="invoice-cea-company">
                                        <div className="invoice-cea-company-name">{companyDetails.name || 'CEAC Ltd'}</div>
                                        <div className="invoice-cea-company-line">{companyDetails.address || '17 South Mall'}</div>
                                        <div className="invoice-cea-company-line">
                                            {companyDetails.city && companyDetails.zip
                                                ? `${companyDetails.city}, ${companyDetails.state ? (companyDetails.state.includes('Co') ? companyDetails.state : `Co, ${companyDetails.state}`) : 'Co, Cork'} ${companyDetails.zip}`
                                                : 'Cork, Co, Cork T12VCY2'}
                                        </div>
                                        <div className="invoice-cea-company-line">{companyDetails.phone || '+353214272000'}</div>
                                        <div className="invoice-cea-company-line">{companyDetails.email || 'accounts@ceaarchitects.com'}</div>
                                        <div className="invoice-cea-company-line">VAT ID: {companyDetails.vatNumber || '4120278GH'}</div>
                                    </div>
                                    <div className="invoice-cea-logo-container">
                                        <img
                                            src={companyLogoSrc}
                                            alt={companyDetails.name || "Company Logo"}
                                            className="invoice-cea-logo-img"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = ceaArchitectsLogo;
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 2. TITLE & BILL TO (Left) and METADATA (Right) */}
                            <div className="invoice-cea-middle">
                                <div className="invoice-cea-middle-left">
                                    <div className="invoice-cea-doc-heading" style={{ color: themeColor || '#1e293b' }}>
                                        {type === 'pos' ? 'POS RECEIPT' : (companySettings?.invoiceTemplate || getDocumentTitle('invoice') || 'INVOICE')}
                                    </div>
                                    <div className="invoice-cea-bill-label">{getInvoiceLabel('billTo') || 'BILL TO'}</div>
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
                                        <span className="invoice-cea-kv-key">{getInvoiceLabel('number') || 'INVOICE'}</span>
                                        <span className="invoice-cea-kv-val">{document.invoiceNumber ? String(document.invoiceNumber).replace(/^#/, '') : '1550'}</span>

                                        <span className="invoice-cea-kv-key">{getInvoiceLabel('issue') || 'DATE'}</span>
                                        <span className="invoice-cea-kv-val">{document.date ? formatCeaDate(document.date) : '06-05-2026'}</span>

                                        <span className="invoice-cea-kv-key">TERMS</span>
                                        <span className="invoice-cea-kv-val">{document.paymentTerms || 'Net 7'}</span>

                                        <span className="invoice-cea-kv-key">{getInvoiceLabel('dueDate') || 'DUE DATE'}</span>
                                        <span className="invoice-cea-kv-val">{document.dueDate ? formatCeaDate(document.dueDate) : (document.date ? formatCeaDate(document.date) : '13-05-2026')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. ITEMS TABLE */}
                            <table className="invoice-cea-table">
                                <thead>
                                    <tr style={{ backgroundColor: themeColor || '#dedede' }}>
                                        <th style={{ textAlign: 'left', color: getContrastTextColor(themeColor) }}>
                                            {getTableHeader('item', 'ACTIVITY')}
                                        </th>
                                        {showWarehouse && (
                                            <th style={{ textAlign: 'left', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('warehouse', 'DESCRIPTION')}
                                            </th>
                                        )}
                                        {showTax && (
                                            <th style={{ textAlign: 'left', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('tax', 'TAX')}
                                            </th>
                                        )}
                                        {showUom && (
                                            <th style={{ textAlign: 'left', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('uom', 'UOM')}
                                            </th>
                                        )}
                                        {showQty && (
                                            <th style={{ textAlign: 'right', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('quantity', 'QTY')}
                                            </th>
                                        )}
                                        {showRate && (
                                            <th style={{ textAlign: 'right', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('rate', 'RATE')}
                                            </th>
                                        )}
                                        {showDiscount && (
                                            <th style={{ textAlign: 'right', color: getContrastTextColor(themeColor) }}>
                                                {getTableHeader('discount', 'DISCOUNT')}
                                            </th>
                                        )}
                                        <th style={{ textAlign: 'right', color: getContrastTextColor(themeColor) }}>
                                            {getTableHeader('price', 'AMOUNT')}
                                        </th>
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
                                        const itemDisc = parseFloat(item.discount || 0) || 0;
                                        const itemUom = item.uom?.name || item.uom || item.unit || 'Units';
                                        const isZeroTax = parseFloat(itemTax) === 0;
                                        const isStandardTax = parseFloat(itemTax) === 23;
                                        const taxDisplay = isZeroTax ? 'No VAT' : (isStandardTax ? 'Standard' : (item.taxName || `${itemTax}%`));

                                        return (
                                            <tr key={idx}>
                                                <td>{productName}</td>
                                                {showWarehouse && <td>{itemDesc}</td>}
                                                {showTax && <td>{taxDisplay}</td>}
                                                {showUom && <td>{itemUom}</td>}
                                                {showQty && <td style={{ textAlign: 'right' }}>{itemQty}</td>}
                                                {showRate && <td style={{ textAlign: 'right' }}>{Number(itemRate).toFixed(2)}</td>}
                                                {showDiscount && <td style={{ textAlign: 'right' }}>{Number(itemDisc).toFixed(2)}</td>}
                                                <td style={{ textAlign: 'right' }}>{Number(itemAmt).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* 4. DOTTED DIVIDER 1 & TOTALS */}
                            <div className="invoice-cea-divider-dotted" style={{ borderColor: themeColor || '#9ca3af', opacity: 0.5 }} />

                            <div className="invoice-cea-subtotal-section">
                                <div className="invoice-cea-appreciation">
                                    We appreciate your business.
                                </div>
                                <div className="invoice-cea-totals-grid">
                                    <span className="invoice-cea-total-label">{getInvoiceLabel('subTotal') || 'SUBTOTAL'}</span>
                                    <span className="invoice-cea-total-val">{Number(subtotalVal || 0).toFixed(2)}</span>

                                    {totalDiscountVal > 0 && (
                                        <>
                                            <span className="invoice-cea-total-label">DISCOUNT</span>
                                            <span className="invoice-cea-total-val">-{Number(totalDiscountVal).toFixed(2)}</span>

                                            <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                            <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>
                                        </>
                                    )}

                                    <span className="invoice-cea-total-label">{getInvoiceLabel('tax') || 'TAX'}</span>
                                    <span className="invoice-cea-total-val">
                                        {Number(vatSummaryList.reduce((acc, v) => acc + (v.vatAmount || 0), 0)).toFixed(2)}
                                    </span>

                                    <span className="invoice-cea-total-label">{getInvoiceLabel('total') || 'TOTAL'}</span>
                                    <span className="invoice-cea-total-val" style={{ fontWeight: '700', color: themeColor || '#111827' }}>{Number(totalVal).toFixed(2)}</span>

                                    <span className="invoice-cea-total-label">PAYMENT</span>
                                    <span className="invoice-cea-total-val">{Number(paidVal).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* 5. DOTTED DIVIDER 2 & BALANCE DUE / PAID */}
                            <div className="invoice-cea-divider-dotted" style={{ borderColor: themeColor || '#9ca3af', opacity: 0.5 }} />

                            <div className="invoice-cea-balance-section">
                                <div className="invoice-cea-balance-box">
                                    <div className="invoice-cea-balance-line">
                                        <span className="invoice-cea-balance-label">BALANCE DUE</span>
                                        <span className="invoice-cea-balance-amount" style={{ color: themeColor || '#111827' }}>
                                            {document?.currency || companyDetails.currency || 'EUR'} {Number(balanceVal).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="invoice-cea-status-display" style={{ marginTop: '5px', textAlign: 'right' }}>
                                        <span
                                            className={`invoice-cea-status-badge status-${(currentStatus || '').toLowerCase()}`}
                                            style={{
                                                display: 'inline-block',
                                                padding: '3px 14px',
                                                borderRadius: '9999px',
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                backgroundColor: currentStatus === 'PAID' || currentStatus === 'COMPLETED' ? '#dcfce7'
                                                    : currentStatus === 'OVERDUE' ? '#fee2e2'
                                                    : currentStatus === 'PARTIAL' ? '#ffedd5'
                                                    : currentStatus === 'CANCELLED' ? '#f1f5f9'
                                                    : '#fee2e2',
                                                color: currentStatus === 'PAID' || currentStatus === 'COMPLETED' ? '#15803d'
                                                    : currentStatus === 'OVERDUE' ? '#dc2626'
                                                    : currentStatus === 'PARTIAL' ? '#c2410c'
                                                    : currentStatus === 'CANCELLED' ? '#475569'
                                                    : '#dc2626',
                                                border: `1.5px solid ${
                                                    currentStatus === 'PAID' || currentStatus === 'COMPLETED' ? '#86efac'
                                                    : currentStatus === 'OVERDUE' ? '#fca5a5'
                                                    : currentStatus === 'PARTIAL' ? '#fdba74'
                                                    : currentStatus === 'CANCELLED' ? '#cbd5e1'
                                                    : '#fca5a5'
                                                }`,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            {currentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. VAT SUMMARY */}
                            <div className="invoice-cea-vat-section">
                                <div className="invoice-cea-vat-title" style={{ color: themeColor || '#111827' }}>VAT SUMMARY</div>
                                <table className="invoice-cea-vat-table">
                                    <thead>
                                        <tr style={{ backgroundColor: themeColor || '#dedede' }}>
                                            <th style={{ width: '38%', textAlign: 'left', color: getContrastTextColor(themeColor) }}></th>
                                            <th style={{ width: '22%', textAlign: 'left', color: getContrastTextColor(themeColor) }}>RATE</th>
                                            <th style={{ width: '20%', textAlign: 'right', color: getContrastTextColor(themeColor) }}>VAT</th>
                                            <th style={{ width: '20%', textAlign: 'right', color: getContrastTextColor(themeColor) }}>NET</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vatSummaryList.map((vat, i) => (
                                            <tr key={i}>
                                                <td></td>
                                                <td style={{ textAlign: 'left' }}>{parseFloat(vat.rate) === 0 ? 'No VAT' : `VAT @ ${parseFloat(Number(vat.rate !== undefined ? vat.rate : 23).toFixed(2))}%`}</td>
                                                <td style={{ textAlign: 'right' }}>{Number(vat.vatAmount).toFixed(2)}</td>
                                                <td style={{ textAlign: 'right' }}>{Number(vat.netAmount).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 7. BANK DETAILS BOX */}
                            <div className="invoice-cea-bank-box" style={{ borderLeft: `3px solid ${themeColor || '#3b82f6'}`, backgroundColor: getTintBg(themeColor, 0.04) }}>
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
                            {showFooter && (
                                <div className="invoice-cea-page-footer">
                                    Page 1 of 1
                                </div>
                            )}
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
