import React, { createContext, useState, useEffect, useContext } from 'react';
import companyService from '../api/companyService';
import GetCompanyId from '../api/GetCompanyId';
import { AuthContext } from './AuthContext';

export const CompanyContext = createContext();

export const ALLOWED_CURRENCIES = [
    { code: 'EUR', name: 'Euro (EUR €)', symbol: '€' },
    { code: 'GBP', name: 'British Pound (GBP £)', symbol: '£' },
    { code: 'USD', name: 'US Dollar (USD $)', symbol: '$' },
    { code: 'INR', name: 'Indian Rupee (INR ₹)', symbol: '₹' }
];

const CURRENCY_SYMBOLS = {
    EUR: '€',
    GBP: '£',
    USD: '$',
    INR: '₹'
};

export const CompanyProvider = ({ children }) => {
    const { currentUser } = useContext(AuthContext);
    const [companySettings, setCompanySettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liveRates, setLiveRates] = useState(null);
    const [currencies, setCurrencies] = useState(ALLOWED_CURRENCIES);

    useEffect(() => {
        const fetchLiveRates = async () => {
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/EUR');
                const data = await res.json();
                if (data && data.rates) {
                    setLiveRates(data.rates);
                }
            } catch (e) {
                console.error("Error fetching live rates in CompanyContext:", e);
            }
        };
        fetchLiveRates();
    }, []);

    const fetchCompanySettings = async () => {
        const companyId = GetCompanyId();
        if (companyId) {
            try {
                const res = await companyService.getById(companyId);
                const data = res.data || {};
                if (!data.defaultVatRate) data.defaultVatRate = '23';
                if (!data.currency || !['EUR', 'GBP', 'USD', 'INR'].includes(data.currency)) {
                    data.currency = 'EUR';
                }
                setCompanySettings(data);
            } catch (error) {
                console.error("Error fetching company settings:", error);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.companyId) {
            fetchCompanySettings();
        } else if (currentUser) {
            setLoading(false);
        } else {
            setCompanySettings(null);
            setLoading(false);
        }
    }, [currentUser?.companyId, currentUser?.id]);

    const formatCurrency = (amount) => {
        const currencyCode = companySettings?.currency || 'EUR';

        const localeMap = {
            'EUR': 'en-IE',
            'GBP': 'en-GB',
            'USD': 'en-US',
            'INR': 'en-IN'
        };

        const locale = localeMap[currencyCode] || 'en-IE';

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
            return `${sym}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    };
    const FRONTEND_FALLBACK_RATES = {
        "EUR": 1.0,
        "GBP": 0.857,
        "USD": 1.092,
        "INR": 98.45
    };

    const getExchangeRateFor = async (from, to) => {
        const rates = liveRates || FRONTEND_FALLBACK_RATES;
        const fromRate = rates[from] || FRONTEND_FALLBACK_RATES[from] || 1.0;
        const toRate = rates[to] || FRONTEND_FALLBACK_RATES[to] || 1.0;
        return toRate / fromRate;
    };

    const getSyncRate = (from, to) => {
        const rates = liveRates || FRONTEND_FALLBACK_RATES;
        const fromRate = rates[from] || FRONTEND_FALLBACK_RATES[from] || 1.0;
        const toRate = rates[to] || FRONTEND_FALLBACK_RATES[to] || 1.0;
        return toRate / fromRate;
    };

    const sanitizeEnglishOnly = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/[\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim();
    };

    const DEFAULT_LABELS = {
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

    const getInvoiceLabel = (key) => {
        if (key === 'showWarehouse' || key === 'showUom') {
            return false;
        }
        if (key === 'tax') {
            return 'VAT';
        }
        if (companySettings?.invoiceLabels) {
            try {
                const labels = typeof companySettings.invoiceLabels === 'string'
                    ? JSON.parse(companySettings.invoiceLabels)
                    : companySettings.invoiceLabels;
                if (labels[key] !== undefined) {
                    return sanitizeEnglishOnly(labels[key]);
                }
            } catch (e) {
                // fall through to default
            }
        }
        return sanitizeEnglishOnly(DEFAULT_LABELS[key] !== undefined ? DEFAULT_LABELS[key] : key);
    };

    const DEFAULT_HEADERS = {
        item: 'Item',
        quantity: 'Quantity',
        rate: 'Rate',
        discount: 'Discount',
        tax: 'VAT (%)',
        price: 'Amount',
        warehouse: 'Warehouse',
        uom: 'UOM'
    };

    const getTableHeader = (key, defaultVal) => {
        if (key === 'tax') {
            return 'VAT (%)';
        }
        if (companySettings?.invoiceTableHeaders) {
            try {
                const headers = typeof companySettings.invoiceTableHeaders === 'string'
                    ? JSON.parse(companySettings.invoiceTableHeaders)
                    : companySettings.invoiceTableHeaders;
                if (headers[key] !== undefined) {
                    return sanitizeEnglishOnly(headers[key]);
                }
            } catch (e) {
                // fall through to default
            }
        }
        return sanitizeEnglishOnly(defaultVal || DEFAULT_HEADERS[key] || key);
    };

    const getReceiptPaymentLabel = (key, defaultVal = '') => {
        if (companySettings?.receiptLabels) {
            try {
                const labels = typeof companySettings.receiptLabels === 'string'
                    ? JSON.parse(companySettings.receiptLabels)
                    : companySettings.receiptLabels;
                return labels[key] || defaultVal || key;
            } catch (e) {}
        }
        return defaultVal || key;
    };
    const getReceiptPaymentHeader = (key, defaultVal = '') => {
        if (companySettings?.receiptTableHeaders) {
            try {
                const headers = typeof companySettings.receiptTableHeaders === 'string'
                    ? JSON.parse(companySettings.receiptTableHeaders)
                    : companySettings.receiptTableHeaders;
                return headers[key] || defaultVal || key;
            } catch (e) {}
        }
        return defaultVal || key;
    };

    const DEFAULT_DOCUMENT_TITLES = {
        invoice: 'INVOICE',
        receipt: 'RECEIPT',
        payment: 'PAYMENT VOUCHER',
        salesreturn: 'SALES RETURN',
        purchasebill: 'PURCHASE BILL',
        purchasepayment: 'PAYMENT',
        purchasereturn: 'PURCHASE RETURN',
        salesorder: 'SALES ORDER',
        quotation: 'QUOTATION',
        purchasequotation: 'PURCHASE QUOTATION',
        purchaseorder: 'PURCHASE ORDER',
        deliverychallan: 'DELIVERY CHALLAN',
        goodsreceipt: 'GOODS RECEIPT NOTE',
        posinvoice: 'INVOICE',
        journalvoucher: 'JOURNAL VOUCHER',
        expense: 'EXPENSE VOUCHER',
        income: 'INCOME VOUCHER',
        contravoucher: 'CONTRA VOUCHER',
        addcapital: 'ADD CAPITAL',
        drawingcapital: 'DRAWING CAPITAL',
    };

    const getDocumentTitle = (transactionType) => {
        if (companySettings?.documentTitles) {
            try {
                const titles = typeof companySettings.documentTitles === 'string'
                    ? JSON.parse(companySettings.documentTitles)
                    : companySettings.documentTitles;
                if (titles && titles[transactionType]) {
                    return titles[transactionType];
                }
            } catch (e) {}
        }
        return DEFAULT_DOCUMENT_TITLES[transactionType] || transactionType.toUpperCase();
    };

    return (
        <CompanyContext.Provider value={{ companySettings, fetchCompanySettings, formatCurrency, getInvoiceLabel, getReceiptPaymentLabel, getReceiptPaymentHeader, getTableHeader, getDocumentTitle, getExchangeRateFor, getSyncRate, loading, liveRates, currencies }}>
            {children}
        </CompanyContext.Provider>
    );
};