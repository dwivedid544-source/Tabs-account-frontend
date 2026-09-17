import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import posService from '../../../../services/posService';
import { CompanyContext } from '../../../../context/CompanyContext';
import { BASE_URL } from '../../../../api/axiosInstance';
import { resolveLogoUrl } from '../../../../utils/logoUrl';
import './Invoice.css';
import { computeInvoiceFinancials, computeInvoiceLine, resolveInvoicePaymentHistory } from './invoiceFinancials';
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
        const serverUrl = BASE_URL || 'https://tabaccounts.com';
        return `${serverUrl}${cleanPath}`;
    }
    return fallback;
};

const PublicInvoiceView = ({ type = 'invoice' }) => {
    const { id } = useParams();
    const { formatCurrency, companySettings, getSyncRate, getDocumentTitle } = useContext(CompanyContext);
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            const cleanServerUrl = (BASE_URL || 'https://tabaccounts.com').replace(/\/+$/, '');
            const downloadApiUrl = `${cleanServerUrl}/api/public/invoice/${id}/download`;

            const response = await fetch(downloadApiUrl);
            if (!response.ok) {
                throw new Error('Failed to download invoice PDF');
            }
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const docNum = document?.invoiceNumber ? String(document.invoiceNumber).replace(/^#/, '') : id;
            link.download = `Invoice-${docNum}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Download PDF error:', err);
            const cleanServerUrl = (BASE_URL || 'https://tabaccounts.com').replace(/\/+$/, '');
            window.open(`${cleanServerUrl}/api/public/invoice/${id}/download`, '_blank');
        } finally {
            setDownloading(false);
        }
    };

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
            if (!id || (isNaN(parseInt(id)) && !String(id).toLowerCase().includes('combined'))) {
                setError('Invalid Invoice ID. The requested invoice identifier is not valid.');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                let response;
                if (type === 'pos') {
                    response = await posService.getPublicPOSInvoiceById(id);
                } else {
                    const axiosRes = await salesInvoiceService.getPublicById(id);
                    response = axiosRes.data;
                }
                
                if (response && response.success && response.data) {
                    setDocument(response.data);
                } else {
                    setError(response?.message || 'Invoice not found or no longer available.');
                }
            } catch (err) {
                console.error('Public Preview Error:', err);
                const status = err.response?.status;
                if (status === 404) {
                    setError('Invoice Not Found: This invoice does not exist or may have been deleted.');
                } else if (status === 400) {
                    setError('Invalid Invoice ID: The requested invoice identifier is not formatted correctly.');
                } else {
                    setError(err.response?.data?.message || 'Failed to load invoice. Please verify your connection and try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDocument();
        } else {
            setError('No invoice ID provided.');
            setLoading(false);
        }
    }, [id, type]);

    useEffect(() => {
        if (document) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('download') === 'true') {
                const timer = setTimeout(() => {
                    handleDownloadPdf();
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [document]);

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <div style={{
                    background: '#ffffff',
                    padding: '40px 32px',
                    borderRadius: '16px',
                    maxWidth: '480px',
                    width: '100%',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                        Unable to View Invoice
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5', marginBottom: '24px' }}>
                        {error || 'The requested invoice could not be found or has been deleted.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#1e293b',
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            padding: '10px 22px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(30, 41, 59, 0.2)'
                        }}
                    >
                        Retry Loading
                    </button>
                </div>
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
    let cfObj = {};
    if (document?.customFields) {
        try {
            cfObj = typeof document.customFields === 'string' ? JSON.parse(document.customFields) : document.customFields;
        } catch (e) {
            cfObj = {};
        }
    }
    const publicItemsMeta = Array.isArray(cfObj?._itemsDiscountMeta) ? cfObj._itemsDiscountMeta : [];
    const financials = computeInvoiceFinancials(document, {
        itemsMeta: publicItemsMeta,
        otherCharges: otherChargesTotal,
        roundOff: parseFloat(document?.roundOffAmount || 0) || 0,
        paymentsReceived: parseFloat(document?.paidAmount || 0) || undefined
    });

    const subtotalVal = financials.subtotal;
    const totalDiscountVal = financials.discount;
    const taxableVal = financials.taxableAmount;
    const vatSummaryList = financials.vatSummaryList;
    const totalVal = financials.total;
    const paidVal = financials.paidAmount;
    const balanceVal = financials.balanceDue;
    const currentStatus = (document?.status || '').toUpperCase() === 'CANCELLED' ? 'CANCELLED' : financials.status;

    const isFullyPaid = (document?.balanceAmount === 0 || (document?.paidAmount >= document?.totalAmount && document?.totalAmount > 0));
    const paymentReceivedDate = document?.paymentDate || document?.receipt?.[0]?.date || document?.allocations?.[0]?.receipt?.date;

    return (
        <div className="public-invoice-page bg-slate-100 min-h-screen p-4 md:p-10">
            <div className="max-w-4xl mx-auto mb-4 flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 Invoice-no-print">
                <div className="flex items-center gap-3">
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1e293b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>
                        TAB
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>Digital Invoice Portal</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified client billing &amp; settlement statement</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '8px 18px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            border: 'none',
                            cursor: downloading ? 'wait' : 'pointer',
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {downloading ? 'Downloading...' : 'Download Invoice (PDF)'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            color: '#1e293b',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                        }}
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
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

                    const billName = document.customer?.name || document.billingName || 'Valued Customer';
                    const billAddr = document.billingAddress || document.customer?.billingAddress || '';
                    const billCityStateZip = [
                        document.billingCity || document.customer?.billingCity,
                        document.billingState || document.customer?.billingState
                    ].filter(Boolean).join(', ');
                    const billPhone = document.customer?.phone || document.billingPhone || '';
                    const email = document.customer?.email || document.billingEmail || '';
                    const gstin = document.customer?.vatNumber || document.customer?.taxNumber || document.billingVatNumber || document.vatNumber || '';
                    let cfObj = {};
                    if (document?.customFields) {
                        try {
                            cfObj = typeof document.customFields === 'string' ? JSON.parse(document.customFields) : document.customFields;
                        } catch (e) {
                            cfObj = {};
                        }
                    }
                    const itemsMeta = Array.isArray(cfObj?._itemsDiscountMeta) ? cfObj._itemsDiscountMeta : [];

                    const lineItems = items && items.length > 0 ? items : (document.items || document.invoiceitem || []);

                    const bankAccountName = companyDetails.accountName || companyDetails.accountHolder || companyDetails.name || '';
                    const bankIban = companyDetails.iban || '';
                    const bankBic = companyDetails.bic || '';
                    const bankAccount = companyDetails.accountNumber || '';
                    const bankSortCode = companyDetails.sortCode || '';
                    const bankName = companyDetails.bankName || '';
                    const bankAddress = companyDetails.bankAddress || '';
                    const companyLogoSrc = getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo || companySettings?.invoiceLogo || companySettings?.logo);
                    const themeColor = companyDetails.invoiceColor || companySettings?.invoiceColor || '#dedede';
                    const isLightColor = (color) => {
                        if (!color) return true;
                        const c = color.toLowerCase().trim();
                        if (c === '#dedede' || c === '#ffffff' || c === '#f1f5f9' || c === '#e2e8f0') return true;
                        const hex = c.replace('#', '');
                        if (hex.length !== 6) return false;
                        const r = parseInt(hex.substring(0, 2), 16) / 255;
                        const g = parseInt(hex.substring(2, 4), 16) / 255;
                        const b = parseInt(hex.substring(4, 6), 16) / 255;
                        const toLinear = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                        const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
                        return lum > 0.5;
                    };
                    const _isLight = isLightColor(themeColor);
                    const headingColor = _isLight ? '#1e293b' : themeColor;
                    const textHighlightColor = _isLight ? '#111827' : themeColor;
                    const tableHeaderBg = _isLight ? '#dedede' : themeColor;
                    const tableHeaderText = _isLight ? '#555555' : '#ffffff';
                    const showHeader = getInvoiceLabel('showHeader') !== false;
                    const showFooter = getInvoiceLabel('showFooter') !== false;
                    const showWarehouse = getInvoiceLabel('showWarehouse') !== false;
                    const showTax = getInvoiceLabel('showTax') !== false;
                    const showUom = getInvoiceLabel('showUom') === true;
                    const showQty = getInvoiceLabel('showQty') !== false;
                    const showRate = getInvoiceLabel('showRate') !== false;
                    const showDiscount = getInvoiceLabel('showDiscount') !== false || lineItems.some(it => parseFloat(it.discount || 0) > 0);

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
                                    <div className="invoice-cea-doc-heading" style={{ color: headingColor }}>
                                        {type === 'pos' ? 'POS RECEIPT' : (getDocumentTitle('invoice') || (companySettings?.isVatRegistered ? 'VAT INVOICE' : 'INVOICE'))}
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

                                        {(document?.poNumber && typeof document.poNumber === 'string' && document.poNumber.trim()) && (
                                            <>
                                                <span className="invoice-cea-kv-key">P.O. #</span>
                                                <span className="invoice-cea-kv-val">{document.poNumber.trim()}</span>
                                            </>
                                        )}

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
                                    <tr style={{ backgroundColor: tableHeaderBg }}>
                                        <th style={{ width: '18%', textAlign: 'left', color: tableHeaderText }}>
                                            {getTableHeader('item', 'ACTIVITY')}
                                        </th>
                                        <th style={{ width: showUom ? '32%' : '37%', textAlign: 'left', color: tableHeaderText }}>
                                            {getTableHeader('warehouse', 'DESCRIPTION')}
                                        </th>
                                        {showUom && (
                                            <th style={{ width: '6%', textAlign: 'left', color: tableHeaderText }}>
                                                {getTableHeader('uom', 'UOM')}
                                            </th>
                                        )}
                                        {showQty && (
                                            <th style={{ width: '7%', textAlign: 'right', color: tableHeaderText }}>
                                                {getTableHeader('quantity', 'QTY')}
                                            </th>
                                        )}
                                        {showRate && (
                                            <th style={{ width: '10%', textAlign: 'right', color: tableHeaderText }}>
                                                {getTableHeader('rate', 'RATE')}
                                            </th>
                                        )}
                                        {showDiscount && (
                                            <th style={{ width: '9%', textAlign: 'right', color: tableHeaderText }}>
                                                {getTableHeader('discount', 'DISCOUNT')}
                                            </th>
                                        )}
                                        {showTax && (
                                            <th style={{ width: '9%', textAlign: 'right', color: tableHeaderText }}>
                                                {getTableHeader('tax', 'VAT')}
                                            </th>
                                        )}
                                        <th style={{ width: '10%', textAlign: 'right', color: tableHeaderText }}>
                                            {getTableHeader('price', 'AMOUNT')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((item, idx) => {
                                        const meta = itemsMeta[idx] || itemsMeta.find(m => (m.productId && String(m.productId) === String(item.productId)) || (m.serviceId && String(m.serviceId) === String(item.serviceId)));
                                        const productName = meta?.itemName || item.service?.name || item.product?.name || item.activity || item.name || item.description || (item.serviceId ? 'Service' : 'Item');
                                        const computedLine = financials.computedLines[idx] || computeInvoiceLine(item, meta);
                                        const itemDesc = item.description || meta?.description || (item.product?.name ? item.product.name : (item.service?.name || ''));
                                        const itemTax = computedLine.taxRate;
                                        const itemQty = computedLine.qty;
                                        const itemRate = computedLine.rate;
                                        const itemDisc = computedLine.lineDiscount;
                                        const itemAmt = computedLine.net;
                                        const itemUom = item.uom?.name || item.uom || item.unit || 'Units';
                                        const isZeroTax = parseFloat(itemTax) === 0;
                                        const taxDisplay = isZeroTax ? 'No VAT' : (item.taxName && !item.taxName.toLowerCase().includes('standard') ? item.taxName : `${parseFloat(Number(itemTax).toFixed(2))}%`);
                                        const discDisplay = computedLine.discVal > 0
                                            ? (computedLine.discType === 'percentage' ? `${computedLine.discVal}%` : `-${Number(computedLine.discVal).toFixed(2)}`)
                                            : '0%';

                                        return (
                                            <tr key={idx}>
                                                <td className="invoice-cea-activity-cell">{productName}</td>
                                                <td className="invoice-cea-desc-cell">{itemDesc}</td>
                                                {showUom && <td>{itemUom}</td>}
                                                {showQty && <td style={{ textAlign: 'right' }}>{itemQty}</td>}
                                                {showRate && <td style={{ textAlign: 'right' }}>{Number(itemRate).toFixed(2)}</td>}
                                                {showDiscount && <td style={{ textAlign: 'right' }}>{discDisplay}</td>}
                                                {showTax && <td style={{ textAlign: 'right' }}>{taxDisplay}</td>}
                                                <td style={{ textAlign: 'right' }}>{Number(itemAmt).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* 4. DOTTED DIVIDER 1 & TOTALS */}
                            <div className="invoice-cea-divider-dotted" style={{ borderColor: '#9ca3af', opacity: 0.5 }} />

                            <div className="invoice-cea-subtotal-section">
                                <div className="invoice-cea-appreciation">
                                    We appreciate your business.
                                </div>
                                <div className="invoice-cea-totals-grid">
                                    <span className="invoice-cea-total-label">SUBTOTAL</span>
                                    <span className="invoice-cea-total-val">{Number(subtotalVal || 0).toFixed(2)}</span>

                                    <span className="invoice-cea-total-label">DISCOUNT</span>
                                    <span className="invoice-cea-total-val" style={{ color: totalDiscountVal > 0 ? '#dc2626' : undefined }}>
                                        {totalDiscountVal > 0 ? `-${Number(totalDiscountVal).toFixed(2)}` : Number(0).toFixed(2)}
                                    </span>

                                    <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                    <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>

                                    <span className="invoice-cea-total-label">{getInvoiceLabel('tax') || 'VAT'}</span>
                                    <span className="invoice-cea-total-val">
                                        {Number(vatSummaryList.reduce((acc, v) => acc + (v.vatAmount || 0), 0)).toFixed(2)}
                                    </span>

                                    <span className="invoice-cea-total-label">{getInvoiceLabel('total') || 'GRAND TOTAL'}</span>
                                    <span className="invoice-cea-total-val" style={{ fontWeight: '700', color: '#111827' }}>{Number(totalVal).toFixed(2)}</span>

                                    {(() => {
                                        const pubPayHistory = resolveInvoicePaymentHistory(document);
                                        if (pubPayHistory.length > 0) {
                                            return pubPayHistory.map((pmt, pIdx) => {
                                                const pmtD = pmt.date ? new Date(pmt.date) : null;
                                                const pmtLabel = pmtD && !isNaN(pmtD.getTime())
                                                    ? `Payment on ${String(pmtD.getDate()).padStart(2, '0')}-${String(pmtD.getMonth() + 1).padStart(2, '0')}-${pmtD.getFullYear()}`
                                                    : (pmt.receiptNumber ? `Payment (${pmt.receiptNumber})` : 'Payment');
                                                const pmtAmt = parseFloat(pmt.amount || 0);
                                                return (
                                                    <React.Fragment key={`pub-pmt-${pIdx}`}>
                                                        <span
                                                            className="invoice-cea-total-label"
                                                            title={pmt.receiptNumber ? `Receipt: ${pmt.receiptNumber} | Method: ${(pmt.paymentMode || 'BANK').toUpperCase()}` : ''}
                                                            style={{ color: '#2563eb' }}
                                                        >
                                                            {pmtLabel}
                                                        </span>
                                                        <span className="invoice-cea-total-val" style={{ color: '#16a34a', fontWeight: '600' }}>
                                                            -{Number(pmtAmt).toFixed(2)}
                                                        </span>
                                                    </React.Fragment>
                                                );
                                            });
                                        } else if (parseFloat(paidVal) > 0) {
                                            return (
                                                <>
                                                    <span className="invoice-cea-total-label">PAYMENT</span>
                                                    <span className="invoice-cea-total-val" style={{ color: '#16a34a', fontWeight: '600' }}>-{Number(paidVal).toFixed(2)}</span>
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            {/* 5. DOTTED DIVIDER 2 & BALANCE DUE / PAID */}
                            <div className="invoice-cea-divider-dotted" style={{ borderColor: '#9ca3af', opacity: 0.5 }} />

                            <div className="invoice-cea-balance-section">
                                <div className="invoice-cea-balance-box">
                                    <div className="invoice-cea-balance-line">
                                        <span className="invoice-cea-balance-label">BALANCE DUE</span>
                                        <span className="invoice-cea-balance-amount" style={{ color: '#111827' }}>
                                            {document?.currency || companyDetails.currency || 'EUR'} {Number(balanceVal).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="invoice-cea-status-display" style={{ marginTop: '4px', textAlign: 'right' }}>
                                        <span
                                            className="invoice-cea-paid-indicator"
                                            style={{
                                                color: currentStatus === 'PAID' || currentStatus === 'COMPLETED' ? '#16a34a'
                                                    : currentStatus === 'OVERDUE' ? '#dc2626'
                                                    : (currentStatus === 'PARTIAL' || currentStatus === 'PARTIALLY PAID') ? '#ea580c'
                                                    : currentStatus === 'CANCELLED' ? '#64748b'
                                                    : '#dc2626',
                                                display: 'block',
                                                fontSize: '15px',
                                                fontWeight: '800',
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {currentStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. VAT SUMMARY */}
                            <div className="invoice-cea-vat-section">
                                <div className="invoice-cea-vat-title" style={{ color: headingColor }}>VAT SUMMARY</div>
                                <table className="invoice-cea-vat-table">
                                    <thead>
                                        <tr style={{ backgroundColor: tableHeaderBg }}>
                                            <th style={{ width: '40%', textAlign: 'left', color: tableHeaderText }}>RATE</th>
                                            <th style={{ width: '30%', textAlign: 'right', color: tableHeaderText }}>VAT</th>
                                            <th style={{ width: '30%', textAlign: 'right', color: tableHeaderText }}>NET</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vatSummaryList.map((vat, i) => (
                                            <tr key={i}>
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

                            {/* PAYMENT HISTORY SECTION */}
                            {(() => {
                                const sortedPaymentHistory = resolveInvoicePaymentHistory(document);

                                if (sortedPaymentHistory.length === 0) return null;

                                const curr = document?.currency || companyDetails.currency || 'EUR';
                                const sym = curr === 'EUR' ? '€' : (curr === 'GBP' ? '£' : (curr === 'USD' ? '$' : (curr === 'INR' ? '₹' : `${curr} `)));

                                const formatMoney = (val) => {
                                    return `${sym}${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                };

                                const formatDateDmy = (dateVal) => {
                                    if (!dateVal) return '-';
                                    const d = new Date(dateVal);
                                    if (isNaN(d.getTime())) return String(dateVal);
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const year = d.getFullYear();
                                    return `${day}/${month}/${year}`;
                                };

                                return (
                                    <div className="invoice-cea-payment-history-section" style={{ marginTop: '24px', marginBottom: '20px' }}>
                                        <div className="invoice-cea-vat-title" style={{ color: headingColor, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                            Payment History
                                        </div>
                                        <table className="invoice-cea-vat-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: tableHeaderBg }}>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: tableHeaderText, fontWeight: '600' }}>Payment Date</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: tableHeaderText, fontWeight: '600' }}>Receipt Number</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: tableHeaderText, fontWeight: '600' }}>Payment Amount</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', color: tableHeaderText, fontWeight: '600' }}>Payment Method</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'right', color: tableHeaderText, fontWeight: '600' }}>Balance After Payment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedPaymentHistory.map((pmt, pIdx) => {
                                                    const pmtDate = formatDateDmy(pmt.date);
                                                    const rcvNo = pmt.receiptNumber || '-';
                                                    const amt = formatMoney(pmt.amount || 0);
                                                    const mode = (pmt.paymentMode || 'BANK').toUpperCase();
                                                    const balAfter = (pmt.balanceAfterPayment !== undefined && pmt.balanceAfterPayment !== null)
                                                        ? formatMoney(pmt.balanceAfterPayment)
                                                        : '-';

                                                    return (
                                                        <tr key={pIdx} style={{ borderBottom: '1px solid #e2e8f0', background: pIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                                            <td style={{ padding: '9px 12px', textAlign: 'left', color: '#334155' }}>{pmtDate}</td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '600', color: '#0f172a' }}>{rcvNo}</td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>{amt}</td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                                                                    {mode}
                                                                </span>
                              </td>
                                                            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{balAfter}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}

                            {/* 8. PAGE FOOTER */}
                            {showFooter && (
                                <div className="invoice-cea-page-footer">
                                    Page 1 of 1
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="no-print mt-8 mb-12 flex flex-wrap justify-center items-center gap-3">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
                    >
                        {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        {downloading ? 'Downloading Invoice...' : 'Download Invoice (PDF)'}
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg font-semibold shadow hover:shadow-md transition flex items-center gap-2 cursor-pointer"
                    >
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicInvoiceView;
