import React, { createContext, useState, useEffect, useContext } from 'react';
import companyService from '../api/companyService';
import GetCompanyId from '../api/GetCompanyId';
import { AuthContext } from './AuthContext';

export const CompanyContext = createContext();

const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', INR: '₹', GBP: '£', JPY: '¥', CAD: '$', AUD: '$', CHF: 'CHF', CNY: '¥', NZD: '$', ZAR: 'R',
    AED: 'د.إ', SAR: 'ر.س', QAR: 'ر.ق', KWD: 'د.ك', BHD: '.د.ب', OMR: 'ر.ع.', SGD: '$', HKD: '$', MYR: 'RM', THB: '฿',
    IDR: 'Rp', PHP: '₱', VND: '₫', KRW: '₩', RUB: '₽', TRY: '₺', BRL: 'R$', MXN: '$', AFN: '؋', ALL: 'L', AMD: '֏',
    ANG: 'ƒ', AOA: 'Kz', ARS: '$', AWG: 'ƒ', AZN: '₼', BAM: 'KM', BBD: '$', BDT: '৳', BGN: 'лв', BIF: 'FBu', BMD: '$',
    BND: '$', BOB: '$b', BSD: '$', BTN: 'Nu.', BWP: 'P', BYN: 'Br', BZD: 'BZ$', CDF: 'FC', CLP: '$', COP: '$', CRC: '₡',
    CUP: '₱', CVE: '$', CZK: 'Kč', DJF: 'Fdj', DKK: 'kr', DOP: 'RD$', DZD: 'دج', EGP: '£', ERN: 'Nfk', ETB: 'Br',
    FJD: '$', FKP: '£', GEL: '₾', GGP: '£', GHS: '¢', GIP: '£', GMD: 'D', GNF: 'FG', GTQ: 'Q', GYD: '$', HNL: 'L',
    HRK: 'kn', HTG: 'G', HUF: 'Ft', ILS: '₪', IMP: '£', IQD: 'ع.د', IRR: '﷼', ISK: 'kr', JEP: '£', JMD: 'J$', JOD: 'د.ا',
    KES: 'KSh', KGS: 'лв', KHR: '៛', KMF: 'CF', KPW: '₩', KYD: '$', KZT: '₸', LAK: '₭', LBP: '£', LKR: '₨', LRD: '$',
    LSL: 'L', LYD: 'ل.د', MAD: 'د.م.', MDL: 'L', MGA: 'Ar', MKD: 'ден', MMK: 'K', MNT: '₮', MOP: 'MOP$', MRU: 'UM',
    MUR: '₨', MVR: '.ރ', MWK: 'MK', MZN: 'MT', NAD: '$', NGN: '₦', NIO: 'C$', NOK: 'kr', NPR: '₨', PAB: 'B/.',
    PEN: 'S/.', PGK: 'K', PKR: '₨', PLN: 'zł', PYG: 'Gs', RON: 'lei', RSD: 'Дин.', RWF: 'Rf', SBD: '$', SCR: '₨',
    SDG: 'ج.س.', SEK: 'kr', SHP: '£', SLL: 'Le', SOS: 'S', SRD: '$', SSP: '£', STN: 'Db', SYP: '£', SZL: 'L', TJS: 'SM',
    TMT: 'T', TND: 'د.ت', TOP: 'T$', TTD: 'TT$', TWD: 'NT$', TZS: 'TSh', UAH: '₴', UGX: 'USh', UYU: '$U', UZS: 'лв',
    VES: 'Bs.S', WST: 'WS$', XAF: 'FCFA', XCD: '$', XOF: 'CFAF', XPF: 'CFPF', YER: '﷼', ZMW: 'ZK', ZWL: '$'
};

export const CompanyProvider = ({ children }) => {
    const { currentUser } = useContext(AuthContext);
    const [companySettings, setCompanySettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liveRates, setLiveRates] = useState(null);
    const [currencies, setCurrencies] = useState([]);

    useEffect(() => {
        const fetchLiveRates = async () => {
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/USD');
                const data = await res.json();
                if (data && data.rates) {
                    setLiveRates(data.rates);
                    const fetchedCodes = Object.keys(data.rates);
                    const mappedCurrencies = fetchedCodes.map(code => {
                        const symbol = CURRENCY_SYMBOLS[code] ? ` (${CURRENCY_SYMBOLS[code]})` : '';
                        return { code, name: `${code}${symbol}` };
                    });
                    setCurrencies(mappedCurrencies);
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
                setCompanySettings(res.data);
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
        if (currentUser) {
            fetchCompanySettings();
        } else {
            setCompanySettings(null);
            setLoading(false);
        }
    }, [currentUser]);

    const formatCurrency = (amount) => {
        const currencyCode = companySettings?.currency || 'USD';

        // Dynamic locale mapping to ensure proper thousand/lakh separators
        // Most currencies can use 'en-US' formatting with their specific symbol,
        // but some like INR have unique grouping rules.
        const localeMap = {
            'INR': 'en-IN',
            'AED': 'ar-AE',
            'SAR': 'ar-SA',
            'EUR': 'de-DE',
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

        const locale = localeMap[currencyCode] || 'en-US';

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            // Ultimate fallback for very rare or unsupported currency codes
            return `${currencyCode} ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    };
    const FRONTEND_FALLBACK_RATES = {
        "USD": 1,
        "AED": 3.6725,
        "INR": 95.240603,
        "KWD": 0.309391,
        "EUR": 0.878331,
        "GBP": 0.753734,
        "SAR": 3.75,
        "JPY": 162.547842,
        "CNY": 6.801054
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

    const DEFAULT_LABELS = {
        billTo: 'Bill To:',
        shipTo: 'Ship To:',
        subTotal: 'Sub Total',
        tax: 'Tax',
        total: 'Total',
        number: 'Number:',
        issue: 'Issue:',
        dueDate: 'Due Date:',
        showHeader: true,
        showFooter: true,
        showWarehouse: true,
        showQty: true,
        showUom: true,
        showRate: true,
        showTax: true,
        showDiscount: true
    };

    const getInvoiceLabel = (key) => {
        if (companySettings?.invoiceLabels) {
            try {
                const labels = typeof companySettings.invoiceLabels === 'string'
                    ? JSON.parse(companySettings.invoiceLabels)
                    : companySettings.invoiceLabels;
                if (labels[key] !== undefined) {
                    return labels[key];
                }
            } catch (e) {
                // fall through to default
            }
        }
        return DEFAULT_LABELS[key] !== undefined ? DEFAULT_LABELS[key] : key;
    };

    const DEFAULT_HEADERS = {
        item: 'Item',
        quantity: 'Quantity',
        rate: 'Rate',
        discount: 'Discount',
        tax: 'Tax (%)',
        price: 'Price',
        warehouse: 'Warehouse',
        uom: 'UOM'
    };

    const getTableHeader = (key, defaultVal) => {
        if (companySettings?.invoiceTableHeaders) {
            try {
                const headers = typeof companySettings.invoiceTableHeaders === 'string'
                    ? JSON.parse(companySettings.invoiceTableHeaders)
                    : companySettings.invoiceTableHeaders;
                return headers[key] !== undefined ? headers[key] : (defaultVal || DEFAULT_HEADERS[key] || key);
            } catch (e) {
                // fall through to default
            }
        }
        return defaultVal || DEFAULT_HEADERS[key] || key;
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