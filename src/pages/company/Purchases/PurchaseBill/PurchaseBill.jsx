import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import { CompanyContext } from '../../../../context/CompanyContext';
import { AuthContext } from '../../../../context/AuthContext';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Eye, Printer, FilePlus, Check, ArrowLeft, AlertTriangle, RotateCcw,
    Download, FileSpreadsheet
} from 'lucide-react';

import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import '../Purchase.css';
import './PurchaseBill.css';
import './PurchaseBillInvoiceView.css';
import '../../Sales/Invoice/Invoice.css'; // Global template styles
import purchaseBillService from '../../../../services/purchaseBillService';
import axiosInstance from '../../../../api/axiosInstance';
import purchasePaymentService from '../../../../services/purchasePaymentService';
import vendorService from '../../../../services/vendorService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import purchaseOrderService from '../../../../services/purchaseOrderService';
import goodsReceiptNoteService from '../../../../services/goodsReceiptNoteService';
import companyService from '../../../../api/companyService';
import uomService from '../../../../services/uomService';
import GetCompanyId from '../../../../api/GetCompanyId';
import '../../Vendors/Vendors.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { Upload, Loader2 } from 'lucide-react';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import salespersonService from '../../../../services/salespersonService';
import deliverypersonService from '../../../../services/deliverypersonService';
import ExcelImportModal from '../../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../../utils/excelService';


const ALL_CURRENCIES = [
    { code: 'USD', name: 'USD ($)' },
    { code: 'EUR', name: 'EUR (€)' },
    { code: 'INR', name: 'INR (₹)' },
    { code: 'GBP', name: 'GBP (£)' },
    { code: 'JPY', name: 'JPY (¥)' },
    { code: 'CAD', name: 'CAD ($)' },
    { code: 'AUD', name: 'AUD ($)' },
    { code: 'CHF', name: 'CHF (CHF)' },
    { code: 'CNY', name: 'CNY (¥)' },
    { code: 'NZD', name: 'NZD ($)' },
    { code: 'ZAR', name: 'ZAR (R)' },
    { code: 'AED', name: 'AED (د.إ)' },
    { code: 'SAR', name: 'SAR (ر.س)' },
    { code: 'QAR', name: 'QAR (ر.ق)' },
    { code: 'KWD', name: 'KWD (د.ك)' },
    { code: 'BHD', name: 'BHD (.د.ب)' },
    { code: 'OMR', name: 'OMR (ر.ع.)' },
    { code: 'SGD', name: 'SGD ($)' },
    { code: 'HKD', name: 'HKD ($)' },
    { code: 'MYR', name: 'MYR (RM)' },
    { code: 'THB', name: 'THB (฿)' },
    { code: 'IDR', name: 'IDR (Rp)' },
    { code: 'PHP', name: 'PHP (₱)' },
    { code: 'VND', name: 'VND (₫)' },
    { code: 'KRW', name: 'KRW (₩)' },
    { code: 'RUB', name: 'RUB (₽)' },
    { code: 'TRY', name: 'TRY (₺)' },
    { code: 'BRL', name: 'BRL (R$)' },
    { code: 'MXN', name: 'MXN ($)' },
    { code: 'AFN', name: 'AFN (؋)' },
    { code: 'ALL', name: 'ALL (L)' },
    { code: 'AMD', name: 'AMD (֏)' },
    { code: 'ANG', name: 'ANG (ƒ)' },
    { code: 'AOA', name: 'AOA (Kz)' },
    { code: 'ARS', name: 'ARS ($)' },
    { code: 'AWG', name: 'AWG (ƒ)' },
    { code: 'AZN', name: 'AZN (₼)' },
    { code: 'BAM', name: 'BAM (KM)' },
    { code: 'BBD', name: 'BBD ($)' },
    { code: 'BDT', name: 'BDT (৳)' },
    { code: 'BGN', name: 'BGN (лв)' },
    { code: 'BIF', name: 'BIF (FBu)' },
    { code: 'BMD', name: 'BMD ($)' },
    { code: 'BND', name: 'BND ($)' },
    { code: 'BOB', name: 'BOB ($b)' },
    { code: 'BSD', name: 'BSD ($)' },
    { code: 'BTN', name: 'BTN (Nu.)' },
    { code: 'BWP', name: 'BWP (P)' },
    { code: 'BYN', name: 'BYN (Br)' },
    { code: 'BZD', name: 'BZD (BZ$)' },
    { code: 'CDF', name: 'CDF (FC)' },
    { code: 'CLP', name: 'CLP ($)' },
    { code: 'COP', name: 'COP ($)' },
    { code: 'CRC', name: 'CRC (₡)' },
    { code: 'CUP', name: 'CUP (₱)' },
    { code: 'CVE', name: 'CVE ($)' },
    { code: 'CZK', name: 'CZK (Kč)' },
    { code: 'DJF', name: 'DJF (Fdj)' },
    { code: 'DKK', name: 'DKK (kr)' },
    { code: 'DOP', name: 'DOP (RD$)' },
    { code: 'DZD', name: 'DZD (دج)' },
    { code: 'EGP', name: 'EGP (£)' },
    { code: 'ERN', name: 'ERN (Nfk)' },
    { code: 'ETB', name: 'ETB (Br)' },
    { code: 'FJD', name: 'FJD ($)' },
    { code: 'FKP', name: 'FKP (£)' },
    { code: 'GEL', name: 'GEL (₾)' },
    { code: 'GGP', name: 'GGP (£)' },
    { code: 'GHS', name: 'GHS (¢)' },
    { code: 'GIP', name: 'GIP (£)' },
    { code: 'GMD', name: 'GMD (D)' },
    { code: 'GNF', name: 'GNF (FG)' },
    { code: 'GTQ', name: 'GTQ (Q)' },
    { code: 'GYD', name: 'GYD ($)' },
    { code: 'HNL', name: 'HNL (L)' },
    { code: 'HRK', name: 'HRK (kn)' },
    { code: 'HTG', name: 'HTG (G)' },
    { code: 'HUF', name: 'HUF (Ft)' },
    { code: 'ILS', name: 'ILS (₪)' },
    { code: 'IMP', name: 'IMP (£)' },
    { code: 'IQD', name: 'IQD (ع.د)' },
    { code: 'IRR', name: 'IRR (﷼)' },
    { code: 'ISK', name: 'ISK (kr)' },
    { code: 'JEP', name: 'JEP (£)' },
    { code: 'JMD', name: 'JMD (J$)' },
    { code: 'JOD', name: 'JOD (د.ا)' },
    { code: 'KES', name: 'KES (KSh)' },
    { code: 'KGS', name: 'KGS (лв)' },
    { code: 'KHR', name: 'KHR (៛)' },
    { code: 'KMF', name: 'KMF (CF)' },
    { code: 'KPW', name: 'KPW (₩)' },
    { code: 'KYD', name: 'KYD ($)' },
    { code: 'KZT', name: 'KZT (₸)' },
    { code: 'LAK', name: 'LAK (₭)' },
    { code: 'LBP', name: 'LBP (£)' },
    { code: 'LKR', name: 'LKR (₨)' },
    { code: 'LRD', name: 'LRD ($)' },
    { code: 'LSL', name: 'LSL (L)' },
    { code: 'LYD', name: 'LYD (ل.د)' },
    { code: 'MAD', name: 'MAD (د.م.)' },
    { code: 'MDL', name: 'MDL (L)' },
    { code: 'MGA', name: 'MGA (Ar)' },
    { code: 'MKD', name: 'MKD (ден)' },
    { code: 'MMK', name: 'MMK (K)' },
    { code: 'MNT', name: 'MNT (₮)' },
    { code: 'MOP', name: 'MOP (MOP$)' },
    { code: 'MRU', name: 'MRU (UM)' },
    { code: 'MUR', name: 'MUR (₨)' },
    { code: 'MVR', name: 'MVR (.ރ)' },
    { code: 'MWK', name: 'MWK (MK)' },
    { code: 'MZN', name: 'MZN (MT)' },
    { code: 'NAD', name: 'NAD ($)' },
    { code: 'NGN', name: 'NGN (₦)' },
    { code: 'NIO', name: 'NIO (C$)' },
    { code: 'NOK', name: 'NOK (kr)' },
    { code: 'NPR', name: 'NPR (₨)' },
    { code: 'PAB', name: 'PAB (B/.)' },
    { code: 'PEN', name: 'PEN (S/.)' },
    { code: 'PGK', name: 'PGK (K)' },
    { code: 'PKR', name: 'PKR (₨)' },
    { code: 'PLN', name: 'PLN (zł)' },
    { code: 'PYG', name: 'PYG (Gs)' },
    { code: 'RON', name: 'RON (lei)' },
    { code: 'RSD', name: 'RSD (Дин.)' },
    { code: 'RWF', name: 'RWF (Rf)' },
    { code: 'SBD', name: 'SBD ($)' },
    { code: 'SCR', name: 'SCR (₨)' },
    { code: 'SDG', name: 'SDG (ج.س.)' },
    { code: 'SEK', name: 'SEK (kr)' },
    { code: 'SHP', name: 'SHP (£)' },
    { code: 'SLL', name: 'SLL (Le)' },
    { code: 'SOS', name: 'SOS (S)' },
    { code: 'SRD', name: 'SRD ($)' },
    { code: 'SSP', name: 'SSP (£)' },
    { code: 'STN', name: 'STN (Db)' },
    { code: 'SYP', name: 'SYP (£)' },
    { code: 'SZL', name: 'SZL (L)' },
    { code: 'TJS', name: 'TJS (SM)' },
    { code: 'TMT', name: 'TMT (T)' },
    { code: 'TND', name: 'TND (د.ت)' },
    { code: 'TOP', name: 'TOP (T$)' },
    { code: 'TTD', name: 'TTD (TT$)' },
    { code: 'TWD', name: 'TWD (NT$)' },
    { code: 'TZS', name: 'TZS (TSh)' },
    { code: 'UAH', name: 'UAH (₴)' },
    { code: 'UGX', name: 'UGX (USh)' },
    { code: 'UYU', name: 'UYU ($U)' },
    { code: 'UZS', name: 'UZS (лв)' },
    { code: 'VES', name: 'VES (Bs.S)' },
    { code: 'WST', name: 'WST (WS$)' },
    { code: 'XAF', name: 'XAF (FCFA)' },
    { code: 'XCD', name: 'XCD ($)' },
    { code: 'XOF', name: 'XOF (CFAF)' },
    { code: 'XPF', name: 'XPF (CFPF)' },
    { code: 'YER', name: 'YER (﷼)' },
    { code: 'ZMW', name: 'ZMW (ZK)' },
    { code: 'ZWL', name: 'ZWL ($)' }
];

const PurchaseBill = () => {
    const { companySettings, formatCurrency, getTableHeader, getInvoiceLabel, getDocumentTitle, getExchangeRateFor, getSyncRate, currencies: dynamicCurrencies } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const sourceData = location.state?.sourceData;

    const availableCurrencies = useMemo(() => {
        return (dynamicCurrencies && dynamicCurrencies.length > 0) ? dynamicCurrencies : ALL_CURRENCIES;
    }, [dynamicCurrencies]);

    const calculateDueDate = (dateStr, creditPeriod) => {
        if (!dateStr) return '';
        const days = parseInt(creditPeriod) || 0;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    const [selectedCurrency, setSelectedCurrency] = useState(() => companySettings?.currency || 'USD');
    const [exchangeRate, setExchangeRate] = useState(1.0);

    useEffect(() => {
        if (companySettings?.currency) {
            setSelectedCurrency(companySettings.currency);
        }
    }, [companySettings]);

    const handleCurrencyChange = async (cur) => {
        setSelectedCurrency(cur);
        let rateVal = 1.0;
        if (cur === (companySettings?.currency || 'INR')) {
            setExchangeRate(1.0);
        } else {
            try {
                rateVal = await getExchangeRateFor(cur, companySettings?.currency || 'INR');
                setExchangeRate(rateVal.toFixed(6));
            } catch (e) {
                rateVal = 1.0;
                setExchangeRate(1.0);
            }
        }

        // Convert existing items rates to the new currency
        setItems(prevItems => prevItems.map(item => {
            let basePrice = 0;
            if (item.productId) {
                const prod = products.find(p => p.id === parseInt(item.productId));
                if (prod) {
                    basePrice = prod.purchasePrice || 0;
                    // Apply UOM multiplier if any
                    const uom = allUoms.find(u => u.id === item.uomId) || prod.uom || prod.purchaseUom || prod.salesUom;
                    const multiplier = uom?.uomType === 'Compound' ? parseFloat(uom.conversionRate) || 1 : 1;
                    basePrice = basePrice * multiplier;
                }
            } else {
                // If it's a custom line item with no product, convert the current rate directly
                const prevRate = parseFloat(item.rate) || 0;
                const prevConversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                const priceInBase = prevRate * prevConversionRate;
                const converted = priceInBase / rateVal;

                const qty = parseFloat(item.qty) || 0;
                const rate = Number(converted.toFixed(6)) || 0;
                const tax = parseFloat(item.tax) || 0;
                const discount = parseFloat(item.discount) || 0;
                const subtotal = qty * rate;
                const taxable = subtotal - discount;
                const taxAmount = (taxable * tax) / 100;
                return {
                    ...item,
                    rate: rate,
                    total: taxable + taxAmount
                };
            }

            const conversionRate = rateVal;
            const converted = basePrice / conversionRate;
            const qty = parseFloat(item.qty) || 0;
            const rate = Number(converted.toFixed(6)) || 0;
            const tax = parseFloat(item.tax) || 0;
            const discount = parseFloat(item.discount) || 0;
            const subtotal = qty * rate;
            const taxable = subtotal - discount;
            const taxAmount = (taxable * tax) / 100;

            return {
                ...item,
                rate: rate,
                total: taxable + taxAmount
            };
        }));
    };

    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || selectedCurrency || companySettings?.currency || 'USD';

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

        const locale = localeMap[docCurrency] || 'en-US';

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: docCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            return `${docCurrency} ${(amount || 0).toFixed(2)}`;
        }
    };



    // --- State Management ---
    const [bills, setBills] = useState([]);
    const [customFieldValues, setCustomFieldValues] = useState({});

    const getCustomFieldsForType = (type) => {
        if (!companySettings?.customFieldsConfig) return [];
        try {
            const parsed = typeof companySettings.customFieldsConfig === 'string'
                ? JSON.parse(companySettings.customFieldsConfig)
                : companySettings.customFieldsConfig;
            if (Array.isArray(parsed)) {
                const config = parsed.find(c => c.transactionType === type);
                return config ? (config.fields || []) : [];
            }
        } catch (e) {
            console.error("Error parsing customFieldsConfig:", e);
        }
        return [];
    };
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    // Other Charges states
    const [showOtherCharges, setShowOtherCharges] = useState(false);
    const [otherCharges, setOtherCharges] = useState([]);
    const [otherChargesAccounts, setOtherChargesAccounts] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Inline Modals States
    const [showAddVendorModal, setShowAddVendorModal] = useState(false);
    const [accountTypes, setAccountTypes] = useState([]);

    useEffect(() => {
        if (showAddVendorModal) {
            const fetchCOA = async () => {
                try {
                    const companyId = GetCompanyId();
                    const res = await chartOfAccountsService.getAccountTypes(companyId);
                    if (res?.success && Array.isArray(res.data)) {
                        setAccountTypes(res.data);
                    } else if (res?.data && Array.isArray(res.data)) {
                        setAccountTypes(res.data);
                    } else if (Array.isArray(res)) {
                        setAccountTypes(res);
                    }
                } catch (e) {
                    console.error("Error fetching account types", e);
                }
            };
            fetchCOA();
        }
    }, [showAddVendorModal]);
    const [vendorFormData, setVendorFormData] = useState({
        name: '', nameArabic: '', companyName: '', companyLocation: '',
        billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: '', billingCountry: '', billingZipCode: '',
        shippingSameAsBilling: true,
        shippingAddresses: [],
        accountType: 'Credit', balanceType: 'Credit', accountBalance: '', creationDate: new Date().toISOString().split('T')[0],
        bankAccountNumber: '', bankIFSC: '', bankNameBranch: '',
        primaryContactName: '', email: '', phone: '', alternativePhone: '', designation: '', website: '', gstin: '', profileImage: '', anyFile: '', remarks: ''
    });
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [uploadingAnyFile, setUploadingAnyFile] = useState(false);
    const profileImageRef = useRef();
    const anyFileRef = useRef();

    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [productFormData, setProductFormData] = useState({
        name: '', sku: '', hsn: '', barcode: '', categoryId: '',
        uomId: '', purchaseUomId: '', salesUomId: '', unit: '', description: '', asOfDate: new Date().toISOString().split('T')[0],
        taxAccount: '', initialCost: 0, salePrice: 0, purchasePrice: 0,
        discount: 0, remarks: '', image: null
    });
    const [productWarehouseRows, setProductWarehouseRows] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // UOM Modal States
    const [showUomModal, setShowUomModal] = useState(false);
    const [uomFormData, setUomFormData] = useState({
        category: '', unitName: '', weightPerUnit: '', uomType: 'Simple', baseUnitId: '', conversionRate: ''
    });
    const measurementCategories = ['Weight', 'Area', 'Volume', 'Length', 'Count'];
    const unitsByCategory = {
        'Weight': ['Microgram', 'Milligram', 'Gram', 'Kilogram (KG)', 'Metric Ton (Tonne)', 'Quintal', 'Pound (lb)', 'Ounce (oz)', 'Stone', 'Carat'],
        'Area': ['Square Millimeter', 'Square Centimeter', 'Square Meter', 'Square Kilometer', 'Square Inch', 'Square Foot', 'Square Yard', 'Acre', 'Hectare', 'Bigha', 'Kanal', 'Cent'],
        'Volume': ['Millilitre (mL)', 'Litre (L)', 'Cubic Centimeter (cc)', 'Cubic Meter', 'Cubic Inch', 'Cubic Foot', 'Gallon', 'Barrel', 'Pint', 'Quart', 'Fluid Ounce'],
        'Length': ['Nanometer', 'Micrometer', 'Millimeter', 'Centimeter', 'Meter', 'Kilometer', 'Inch', 'Foot', 'Yard', 'Mile'],
        'Count': ['Piece', 'Unit', 'Dozen', 'Pair', 'Set', 'Box', 'Packet', 'Carton', 'Bundle', 'Roll', 'Strip', 'Bottle', 'Bag', 'Can', 'Jar', 'Tube']
    };
    const [editingId, setEditingId] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [viewBill, setViewBill] = useState(null);
    const viewRate = getSyncRate(viewBill?.currency || 'USD', companySettings?.currency || 'INR');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [showUnpayModal, setShowUnpayModal] = useState(false);
    const [billToUnpay, setBillToUnpay] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Source Selection State
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [sourceStep, setSourceStep] = useState('type');
    const [selectedSourceType, setSelectedSourceType] = useState(null);
    const [sourceDocs, setSourceDocs] = useState([]);
    const [linkedSource, setLinkedSource] = useState(null);
    const [creationMode, setCreationMode] = useState('direct'); // 'direct' | 'from_po' | 'from_grn'
    const [allUoms, setAllUoms] = useState([]);

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: '', address: '', email: '', phone: '', logo: '', notes: '', terms: ''
    });
    const [billMeta, setBillMeta] = useState({
        manualNo: '', date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0],
        deliveryPersonName: '', deliveryPersonMobile: '', deliveryPersonEmail: ''
    });
    const [vendorId, setVendorId] = useState('');
    const [selectedVendorCreditPeriod, setSelectedVendorCreditPeriod] = useState(0);

    const [items, setItems] = useState([
        { id: Date.now(), productId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
    ]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('percentage');
    const [salespersonsList, setSalespersonsList] = useState([]);
    const [salespersonId, setSalespersonId] = useState('');
    const [carNumber, setCarNumber] = useState('');
    const [manualReference, setManualReference] = useState('');
    const [shouldAutoOpenNext, setShouldAutoOpenNext] = useState(false);
    const [showAddSalespersonModal, setShowAddSalespersonModal] = useState(false);
    const [salespersonFormData, setSalespersonFormData] = useState({ name: '', phone: '', email: '' });
    const [showSalespersonField, setShowSalespersonField] = useState(false);
    const [showDeliveryFields, setShowDeliveryFields] = useState(false);
    const [deliverypersonsList, setDeliverypersonsList] = useState([]);
    const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState('');
    const [showAddDeliveryPersonModal, setShowAddDeliveryPersonModal] = useState(false);
    const [deliverypersonFormData, setDeliverypersonFormData] = useState({ name: '', phone: '', email: '' });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRefToRetry, setDuplicateRefToRetry] = useState('');
    const [bankDetails, setBankDetails] = useState({
        accountName: '', bankName: '', accountNo: '', branch: '', ifsc: ''
    });
    const [billingAddress, setBillingAddress] = useState({
        name: '', address: '', city: '', state: '', zipCode: '', country: '', phone: ''
    });
    const [shippingAddress, setShippingAddress] = useState({
        name: '', address: '', city: '', state: '', zipCode: '', country: '', phone: ''
    });
    const [vendorShippingAddresses, setVendorShippingAddresses] = useState([]);
    const [showCurrencyField, setShowCurrencyField] = useState(false);

    useEffect(() => {
        if (!showCurrencyField) {
            setSelectedCurrency(companySettings?.currency || 'INR');
            setExchangeRate(1.0);
        }
    }, [showCurrencyField, companySettings]);
    const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
    const [nextBillNumber, setNextBillNumber] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceSearchTerm, setSourceSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [billFilterVendorId, setBillFilterVendorId] = useState('');
    const [availablePayments, setAvailablePayments] = useState([]);
    const [adjustments, setAdjustments] = useState([]);

    // Attachments State & Refs
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const photoInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const fetchNextBillNumber = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await purchaseBillService.getNextNumber(companyId);
                const data = res.data || res;
                if (data.success && data.nextNumber) {
                    setNextBillNumber(data.nextNumber);
                    const nextRef = data.nextManualReference || data.details?.nextManualReference || '';
                    if (nextRef) {
                        setManualReference(nextRef);
                    }
                    return data.nextNumber;
                }
            }
        } catch (error) {
            console.error("Error generating next bill number:", error);
        }
        return '';
    };

    const fetchAccounts = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await chartOfAccountsService.getAllLedgers(companyId);
                if (res && res.data) {
                    const chargesAccounts = res.data.filter(a =>
                        a.accountgroup?.type === 'EXPENSES' ||
                        a.accountgroup?.type === 'INCOME' ||
                        a.group?.type === 'EXPENSES' ||
                        a.group?.type === 'INCOME'
                    );
                    setOtherChargesAccounts(chargesAccounts);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts for other charges:', error);
        }
    };

    useEffect(() => {
        fetchInitialData();
        fetchBills();
        fetchAccounts();
    }, []);

    useEffect(() => {
        const loadNextNo = async () => {
            if (showAddModal && !editingId) {
                await fetchNextBillNumber();
            }
        };
        loadNextNo();
    }, [showAddModal, editingId]);

    // Handle Deep Link from Navigation State
    useEffect(() => {
        const fetchTarget = async () => {
            if (location.state && location.state.targetBillId) {
                const targetId = location.state.targetBillId;
                const isEdit = location.state.isEdit || location.state.autoEdit;
                try {
                    if (isEdit) {
                        await handleEdit(targetId);
                    } else {
                        const companyId = GetCompanyId();
                        const response = await purchaseBillService.getBillById(targetId, companyId);
                        if (response.success) {
                            setViewBill(response.data);
                            setIsViewMode(true);
                        }
                    }
                } catch (error) {
                    console.error("Error loading target purchase bill", error);
                }
                // Clear location state after handling to prevent re-opening on re-renders
                navigate(location.pathname, { replace: true, state: {} });
            }
        };
        fetchTarget();
    }, [location.state, navigate]);

    // Handle vendor change to populate addresses & available advances
    useEffect(() => {
        if (vendorId && vendors.length > 0) {
            fetchVendorPayments(vendorId);
            const v = vendors.find(v => v.id == vendorId);
            if (v) {
                setBillingAddress({
                    name: v.billingName || v.name || '',
                    address: v.billingAddress || '',
                    city: v.billingCity || '',
                    state: v.billingState || '',
                    zipCode: v.billingZipCode || '',
                    country: v.billingCountry || '',
                    phone: v.billingPhone || v.phone || ''
                });

                // Default shipping address
                setShippingAddress({
                    name: v.shippingName || v.name || '',
                    address: v.shippingAddress || '',
                    city: v.shippingCity || '',
                    state: v.shippingState || '',
                    zipCode: v.shippingZipCode || '',
                    country: v.shippingCountry || v.billingCountry || '',
                    phone: v.shippingPhone || v.phone || ''
                });

                setVendorShippingAddresses(v.shippingaddress || []);
            }
        } else {
            setAvailablePayments([]);
            setBillingAddress({ name: '', address: '', city: '', state: '', zipCode: '', country: '', phone: '' });
            setShippingAddress({ name: '', address: '', city: '', state: '', zipCode: '', country: '', phone: '' });
            setVendorShippingAddresses([]);
        }
    }, [vendorId, vendors]);

    // Update shipping if same as billing
    useEffect(() => {
        if (shippingSameAsBilling) {
            setShippingAddress({ ...billingAddress });
        }
    }, [billingAddress, shippingSameAsBilling]);

    const handleShippingAddressSelect = (addrId) => {
        if (addrId === 'default') {
            const v = vendors.find(v => v.id == vendorId);
            if (v) {
                setShippingAddress({
                    name: v.shippingName || v.name || '',
                    address: v.shippingAddress || '',
                    city: v.shippingCity || '',
                    state: v.shippingState || '',
                    zipCode: v.shippingZipCode || '',
                    country: v.shippingCountry || v.billingCountry || '',
                    phone: v.shippingPhone || v.phone || ''
                });
                setShippingSameAsBilling(false);
            }
        } else if (addrId === 'billing') {
            setShippingSameAsBilling(true);
        } else {
            const addr = vendorShippingAddresses.find(a => a.id == addrId);
            if (addr) {
                setShippingAddress({
                    name: addr.name || '',
                    address: addr.address || '',
                    city: addr.city || '',
                    state: addr.state || '',
                    zipCode: addr.zipCode || '',
                    country: addr.country || '',
                    phone: addr.phone || ''
                });
                setShippingSameAsBilling(false);
            }
        }
    };

    useEffect(() => {
        if (sourceData && !editingId && vendors.length > 0) {
            setVendorId(sourceData.vendorId);
            setNotes(sourceData.notes || '');
            setTerms(sourceData.terms || '');

            if (sourceData.items) {
                const billItems = sourceData.items.map(item => {
                    let rate = item.rate || 0;
                    let tax = item.taxRate || item.tax || 0;
                    let discount = item.discount || 0;

                    // If we have a GRN source with PO items linked in sourceData (unlikely but safe)
                    if (sourceData.sourceType === 'grn' && sourceData.poItems) {
                        const poItem = sourceData.poItems.find(pi => pi.productId === item.productId);
                        if (poItem) {
                            rate = poItem.rate || 0;
                            tax = poItem.taxRate || 0;
                            discount = poItem.discount || 0;
                        }
                    }

                    return {
                        id: Date.now() + Math.random(),
                        productId: item.productId || item.product?.id || '',
                        warehouseId: item.warehouseId || item.warehouse?.id || '',
                        qty: item.receivedQty || item.quantity || item.qty || 1,
                        uomId: item.uomId || '',
                        rate,
                        tax,
                        discount,
                        total: 0,
                        description: item.description || ''
                    };
                });

                const calculatedItems = billItems.map(i => {
                    const sub = i.qty * i.rate;
                    const taxAmt = ((sub - i.discount) * i.tax) / 100;
                    return { ...i, total: (sub - i.discount) + taxAmt };
                });

                setItems(calculatedItems);
            }
            setShowAddModal(true);
        }
    }, [sourceData, editingId, vendors, warehouses]);

    const fetchInitialData = async () => {
        try {
            const companyId = GetCompanyId();
            const promises = [
                vendorService.getAllVendors(companyId),
                productService.getProducts(companyId),
                warehouseService.getWarehouses(companyId),
                uomService.getUOMs(companyId)
            ];

            if (companyId) {
                promises.push(companyService.getById(companyId));
                promises.push(salespersonService.getAll(companyId));
                promises.push(deliverypersonService.getAll(companyId));
            }

            const results = await Promise.all(promises);
            const vendorRes = results[0];
            const productRes = results[1];
            const warehouseRes = results[2];
            const uomRes = results[3];
            const companyRes = companyId ? results[4] : null;
            const salespersonRes = companyId ? results[5] : null;
            const deliverypersonRes = companyId ? results[6] : null;

            setVendors(vendorRes.data || vendorRes || []);
            setProducts(productRes.data || productRes || []);
            setWarehouses(warehouseRes.data || warehouseRes || []);
            if (uomRes && uomRes.success) {
                setAllUoms(uomRes.data);
            }
            if (salespersonRes && salespersonRes.success) {
                setSalespersonsList(salespersonRes.data || []);
            }
            if (deliverypersonRes && deliverypersonRes.success) {
                setDeliverypersonsList(deliverypersonRes.data || []);
            }

            if (companyRes && companyRes.data) {
                const cData = companyRes.data;
                setCompanyDetails({
                    name: cData.name || '',
                    email: cData.email || '',
                    phone: cData.phone || '',
                    address: `${cData.address || ''}, ${cData.city || ''}`,
                    logo: cData.invoiceLogo || cData.logo || '',
                    template: cData.invoiceTemplate || 'New York',
                    color: cData.invoiceColor || '#004aad',
                    showQrCode: cData.showQrCode !== undefined ? cData.showQrCode : true,
                    accountHolder: cData.accountHolder || '',
                    bankName: cData.bankName || '',
                    accountNumber: cData.accountNumber || '',
                    ifsc: cData.ifsc || '',
                    notes: cData.notes || '',
                    terms: cData.terms || '',
                    termsPurchase: cData.termsPurchase || ''
                });
                setNotes(cData.notes || '');
                setTerms(cData.termsPurchase || cData.terms || '');
                setBankDetails({
                    accountName: cData.accountHolder || '',
                    bankName: cData.bankName || '',
                    accountNo: cData.accountNumber || '',
                    branch: '',
                    ifsc: cData.ifsc || ''
                });
                if (cData.notes) setNotes(cData.notes);
                if (cData.termsPurchase || cData.terms) setTerms(cData.termsPurchase || cData.terms);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to load initial data");
        }
    };

    useEffect(() => {
        if (showAddProductModal) {
            const companyId = GetCompanyId();
            categoryService.getCategories(companyId).then(res => {
                if (res.success) setCategories(res.data);
            });
        }
    }, [showAddProductModal]);

    useEffect(() => {
        if (billMeta.deliveryPersonName && deliverypersonsList.length > 0) {
            const matched = deliverypersonsList.find(dp => dp.name === billMeta.deliveryPersonName);
            if (matched) {
                setSelectedDeliveryPersonId(matched.id);
            }
        }
    }, [billMeta.deliveryPersonName, deliverypersonsList]);

    const handleDeleteSalesperson = async (targetId) => {
        const idToDelete = targetId || salespersonId;
        if (!idToDelete) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this salesperson?");
        if (!confirmDelete) return;

        try {
            const companyId = GetCompanyId();
            const res = await salespersonService.delete(idToDelete, companyId);
            if (res.success) {
                toast.success("Salesperson deleted successfully");
                if (String(salespersonId) === String(idToDelete)) {
                    setSalespersonId('');
                }
                const listRes = await salespersonService.getAll(companyId);
                if (listRes.success) setSalespersonsList(listRes.data);
            } else {
                toast.error(res.message || "Failed to delete salesperson");
            }
        } catch (e) {
            console.error("Error deleting salesperson:", e);
            toast.error(e.message || "Failed to delete salesperson");
        }
    };

    const handleDeliveryPersonChange = (id) => {
        setSelectedDeliveryPersonId(id);
        if (id === '') {
            setBillMeta(prev => ({
                ...prev,
                deliveryPersonName: '',
                deliveryPersonMobile: '',
                deliveryPersonEmail: ''
            }));
        } else {
            const selectedDp = deliverypersonsList.find(dp => String(dp.id) === String(id));
            if (selectedDp) {
                setBillMeta(prev => ({
                    ...prev,
                    deliveryPersonName: selectedDp.name,
                    deliveryPersonMobile: selectedDp.phone || '',
                    deliveryPersonEmail: selectedDp.email || ''
                }));
            }
        }
    };

    const handleDeleteDeliveryPerson = async (targetId) => {
        const idToDelete = targetId || selectedDeliveryPersonId;
        if (!idToDelete) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this delivery person?");
        if (!confirmDelete) return;

        try {
            const companyId = GetCompanyId();
            const res = await deliverypersonService.delete(idToDelete, companyId);
            if (res.success) {
                toast.success("Delivery person deleted successfully");
                if (String(selectedDeliveryPersonId) === String(idToDelete)) {
                    setSelectedDeliveryPersonId('');
                    setBillMeta(prev => ({
                        ...prev,
                        deliveryPersonName: '',
                        deliveryPersonMobile: '',
                        deliveryPersonEmail: ''
                    }));
                }
                const listRes = await deliverypersonService.getAll(companyId);
                if (listRes.success) setDeliverypersonsList(listRes.data);
            } else {
                toast.error(res.message || "Failed to delete delivery person");
            }
        } catch (e) {
            console.error("Error deleting delivery person:", e);
            toast.error(e.message || "Failed to delete delivery person");
        }
    };

    // Inline Vendor Handlers
    const handleVendorInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if ((name === 'phone' || name === 'billingPhone' || name === 'alternativePhone') && typeof value === 'string') {
            val = value.replace(/\D/g, '');
        }
        setVendorFormData(prev => {
            const newData = { ...prev, [name]: val };
            if (name === 'billingAddress' && prev.shippingSameAsBilling) {
                newData.shippingAddress = val;
            }
            if (prev.shippingSameAsBilling && name.startsWith('billing')) {
                const shippingField = name.replace('billing', 'shipping');
                newData[shippingField] = val;
            }
            if (name === 'shippingSameAsBilling' && val) {
                newData.shippingAddress = prev.billingAddress;
                newData.shippingCity = prev.billingCity;
                newData.shippingState = prev.billingState;
                newData.shippingCountry = prev.billingCountry;
                newData.shippingZipCode = prev.billingZipCode;
            }
            return newData;
        });
    };

    const handleVendorShippingAddressChange = (index, field, value) => {
        setVendorFormData(prev => {
            const newAddresses = [...prev.shippingAddresses];
            let processedValue = value;
            if (field === 'phone' && typeof value === 'string') {
                processedValue = value.replace(/\D/g, '');
            }
            newAddresses[index] = { ...newAddresses[index], [field]: processedValue };
            return { ...prev, shippingAddresses: newAddresses };
        });
    };

    const addVendorShippingAddress = () => {
        setVendorFormData(prev => ({
            ...prev,
            shippingAddresses: [
                ...prev.shippingAddresses,
                { name: '', phone: '', address: '', city: '', state: '', country: '', zipCode: '', isDefault: false }
            ]
        }));
    };

    const removeVendorShippingAddress = (index) => {
        setVendorFormData(prev => ({
            ...prev,
            shippingAddresses: prev.shippingAddresses.filter((_, i) => i !== index)
        }));
    };

    const handleVendorFileUpload = async (file, field, folder) => {
        if (!file) return;
        const setUploading = field === 'profileImage' ? setUploadingProfileImage : setUploadingAnyFile;
        setUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            setVendorFormData(prev => ({ ...prev, [field]: url }));
            toast.success(`${field === 'profileImage' ? 'Profile image' : 'File'} uploaded!`);
        } catch (err) {
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleFullVendorSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!vendorFormData.name || !vendorFormData.email) {
            toast.error('Please fill in required fields (Name and Email)');
            return;
        }

        const payload = { ...vendorFormData };
        let shippingAddresses = [...vendorFormData.shippingAddresses];

        if (vendorFormData.shippingSameAsBilling) {
            const billingAsShipping = {
                name: vendorFormData.billingName || vendorFormData.name,
                phone: vendorFormData.billingPhone || vendorFormData.phone,
                address: vendorFormData.billingAddress,
                city: vendorFormData.billingCity,
                state: vendorFormData.billingState,
                country: vendorFormData.billingCountry,
                zipCode: vendorFormData.billingZipCode,
                isDefault: true
            };
            shippingAddresses = [billingAsShipping, ...vendorFormData.shippingAddresses];
        }

        payload.shippingAddresses = shippingAddresses;
        payload.companyId = parseInt(GetCompanyId());

        try {
            const res = await vendorService.createVendor(payload);
            toast.success('Vendor created successfully!');
            setShowAddVendorModal(false);

            // Refresh vendors list
            const companyId = GetCompanyId();
            const vendRes = await vendorService.getAllVendors(companyId);
            if (vendRes?.success && Array.isArray(vendRes.data)) {
                setVendors(vendRes.data);
            } else if (Array.isArray(vendRes)) {
                setVendors(vendRes);
            } else if (vendRes?.data && Array.isArray(vendRes.data)) {
                setVendors(vendRes.data);
            }

            const added = res?.data || res;
            if (added && added.id) {
                setVendorId(added.id.toString());
            }

            // Reset vendor form
            setVendorFormData({
                name: '', nameArabic: '', companyName: '', companyLocation: '',
                billingName: '', billingPhone: '', billingAddress: '', billingCity: '', billingState: '', billingCountry: '', billingZipCode: '',
                shippingSameAsBilling: true,
                shippingAddresses: [],
                accountType: 'Credit', balanceType: 'Credit', accountBalance: '', creationDate: new Date().toISOString().split('T')[0],
                bankAccountNumber: '', bankIFSC: '', bankNameBranch: '',
                primaryContactName: '', email: '', phone: '', alternativePhone: '', designation: '', website: '', gstin: '', profileImage: '', anyFile: '', remarks: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create vendor');
        }
    };

    // Inline Product Handlers
    const handleProductInputChange = (e) => {
        const { name, value } = e.target;
        setProductFormData(prev => ({ ...prev, [name]: value }));
    };

    const addProductWarehouseRow = () => {
        const firstWhId = warehouses.length > 0 ? warehouses[0].id : '';
        setProductWarehouseRows([...productWarehouseRows, {
            id: Date.now(),
            warehouseId: firstWhId,
            quantity: 0,
            minOrderQty: 0,
            initialQty: 0
        }]);
    };

    const removeProductWarehouseRow = (id) => {
        setProductWarehouseRows(productWarehouseRows.filter(row => row.id !== id));
    };

    const handleProductWhRowChange = (id, field, value) => {
        setProductWarehouseRows(productWarehouseRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleProductImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                setUploadingImage(true);
                toast.loading('Uploading image...', { id: 'prod-image-upload' });
                const imageUrl = await uploadToCloudinary(file);
                setProductFormData(prev => ({ ...prev, image: imageUrl }));
                toast.success('Image uploaded successfully', { id: 'prod-image-upload' });
            } catch (error) {
                console.error(error);
                toast.error('Failed to upload image', { id: 'prod-image-upload' });
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const handleProductAddCategorySubmit = async () => {
        if (!newCategoryName.trim()) return toast.error('Category name is required');
        try {
            const companyId = GetCompanyId();
            const res = await categoryService.createCategory({ name: newCategoryName, companyId });
            if (res.success) {
                toast.success('Category added');
                setShowCategoryModal(false);
                setNewCategoryName('');
                const catRes = await categoryService.getCategories(companyId);
                if (catRes.success) setCategories(catRes.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add category');
        }
    };

    const getUniqueCategories = () => {
        return [...new Set(allUoms.map(u => u.category))];
    };

    const getAvailableBaseUnitsForCategory = (category) => {
        return allUoms.filter(u => u.category === category && u.uomType === 'Simple');
    };

    const handleUomInputChange = (e) => {
        const { name, value } = e.target;
        setUomFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUomSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            const companyId = GetCompanyId();
            const payload = {
                category: uomFormData.category,
                unitName: uomFormData.unitName,
                weightPerUnit: uomFormData.weightPerUnit,
                uomType: uomFormData.uomType,
                baseUnitId: uomFormData.uomType === 'Compound' && uomFormData.baseUnitId
                    ? (isNaN(uomFormData.baseUnitId) ? uomFormData.baseUnitId : parseInt(uomFormData.baseUnitId))
                    : null,
                conversionRate: uomFormData.uomType === 'Compound' && uomFormData.conversionRate ? parseFloat(uomFormData.conversionRate) : null,
                companyId: parseInt(companyId)
            };

            const res = await uomService.createUOM(payload);
            if (res.success) {
                toast.success('Unit added successfully');
                const uomsRes = await uomService.getUOMs(companyId);
                if (uomsRes.success) {
                    setAllUoms(uomsRes.data || []);
                }
                setProductFormData(prev => ({
                    ...prev,
                    uomId: res.data?.id || prev.uomId,
                    purchaseUomId: res.data?.id || prev.purchaseUomId,
                    salesUomId: res.data?.id || prev.salesUomId
                }));
                setShowUomModal(false);
                setUomFormData({
                    category: '', unitName: '', weightPerUnit: '', uomType: 'Simple', baseUnitId: '', conversionRate: ''
                });
            }
        } catch (error) {
            console.error('Error saving UOM:', error);
            toast.error(error.response?.data?.message || 'Failed to save UOM');
        }
    };

    const handleFullProductSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!productFormData.name) {
            toast.error('Item Name is required');
            return;
        }
        try {
            const companyId = GetCompanyId();
            const payload = {
                ...productFormData,
                companyId: parseInt(companyId),
                warehouseInfo: productWarehouseRows.map(row => ({
                    warehouseId: parseInt(row.warehouseId),
                    quantity: parseFloat(row.quantity) || 0,
                    minOrderQty: parseFloat(row.minOrderQty) || 0,
                    initialQty: parseFloat(row.initialQty) || 0
                }))
            };
            await productServiceFromServices.createProduct(payload);
            toast.success('Product created successfully!');
            setShowAddProductModal(false);

            // Refresh products
            const prodRes = await productService.getProducts(companyId);
            if (prodRes?.success && Array.isArray(prodRes.data)) {
                setProducts(prodRes.data);
            } else if (prodRes?.data) {
                setProducts(prodRes.data);
            } else if (Array.isArray(prodRes)) {
                setProducts(prodRes);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create product');
        }
    };

    const filteredBills = useMemo(() => {
        return bills.filter(b => {
            const query = searchTerm.toLowerCase();
            const billNo = (b.billNumber || '').toLowerCase();
            const vendorName = (b.vendor?.name || '').toLowerCase();
            const poRef = (b.purchaseorder?.orderNumber || '').toLowerCase();

            const matchesSearch = !query ||
                billNo.includes(query) ||
                vendorName.includes(query) ||
                poRef.includes(query);

            const bDate = new Date(b.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || bDate >= start) && (!end || bDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [bills, searchTerm, startDate, endDate]);

    const filteredSourceDocs = useMemo(() => {
        return sourceDocs.filter(doc => {
            const query = sourceSearchTerm.toLowerCase();
            const docRef = (doc.poNumber || doc.grnNumber || doc.billNumber || doc.id || '').toString().toLowerCase();
            const vendorName = (doc.vendor?.name || '').toLowerCase();
            const amount = (doc.totalAmount || 0).toString();

            const matchesSearch = !query ||
                docRef.includes(query) ||
                vendorName.includes(query) ||
                amount.includes(query);

            const matchesVendor = !billFilterVendorId || doc.vendorId === parseInt(billFilterVendorId);

            return matchesSearch && matchesVendor;
        });
    }, [sourceDocs, sourceSearchTerm, billFilterVendorId]);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await purchaseBillService.getBills(companyId);
            if (res.success) {
                setBills(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setIsViewMode(false);
        setViewBill(null);
        setVendorId('');
        setSelectedVendorCreditPeriod(0);
        setSelectedCurrency(companySettings?.currency || 'USD');
        setExchangeRate(1.0);
        setBillMeta({
            manualNo: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            deliveryPersonName: '',
            deliveryPersonMobile: '',
            deliveryPersonEmail: ''
        });
        let defWarehouseId = '';
        if (companySettings?.inventoryConfig) {
            try {
                const parsed = typeof companySettings.inventoryConfig === 'string'
                    ? JSON.parse(companySettings.inventoryConfig)
                    : companySettings.inventoryConfig;
                if (parsed.defaultPurchaseWarehouseId) {
                    defWarehouseId = parseInt(parsed.defaultPurchaseWarehouseId);
                }
            } catch (e) {
                console.error(e);
            }
        }
        setItems([{ id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
        setSalespersonId('');
        setSelectedDeliveryPersonId('');
        setShowSalespersonField(false);
        setShowDeliveryFields(false);
        setShowCurrencyField(false);
        setCarNumber('');
        setManualReference('');
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsPurchase || companyDetails.terms || '');
        setCustomFieldValues({});
        setSelectedPhotos([]);
        setSelectedFiles([]);
        setOtherCharges([]);
        setShowOtherCharges(false);
        setShowAddModal(false);
        setShowSourceModal(false);
        setSourceStep('type');
        setSourceDocs([]);
        setLinkedSource(null);
        setSourceSearchTerm('');
        setBillFilterVendorId('');
        setOverallDiscount(0);
        setOverallDiscountType('percentage');
        setAvailablePayments([]);
        setAdjustments([]);
        fetchInitialData();
    };

    const fetchVendorPayments = async (vId) => {
        if (!vId) {
            setAvailablePayments([]);
            setAdjustments([]);
            return;
        }
        try {
            const companyId = GetCompanyId();
            const resAdv = await purchasePaymentService.getVendorAdvance(vId, companyId);
            if (resAdv && resAdv.success) {
                setAvailablePayments(resAdv.data || []);
                setAdjustments([]);
            } else {
                const res = await purchasePaymentService.getPayments(companyId, { vendorId: vId });
                const payments = (res || []).map(p => {
                    const allocatedAmount = p.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0;
                    const availableAdvance = (p.advanceUnallocated !== undefined ? p.advanceUnallocated : (p.amount - allocatedAmount));
                    return {
                        ...p,
                        availableAdvance
                    };
                }).filter(p => p.availableAdvance > 0.01);

                setAvailablePayments(payments);
                setAdjustments([]);
            }
        } catch (error) {
            console.error("Error fetching vendor payments:", error);
        }
    };

    const loadVendorPaymentsForEdit = async (vId, billId) => {
        if (!vId) {
            setAvailablePayments([]);
            setAdjustments([]);
            return;
        }
        try {
            const companyId = GetCompanyId();
            const paymentsRes = await purchasePaymentService.getPayments(companyId, { vendorId: vId });
            const billRes = await purchaseBillService.getBillById(billId, companyId);
            const currentAllocations = billRes.data?.allocations || [];

            const payments = (paymentsRes || []).map(p => {
                const otherAllocations = p.allocations?.filter(a => a.purchaseBillId !== billId) || [];
                const otherAllocatedSum = otherAllocations.reduce((sum, a) => sum + a.amount, 0) || 0;
                const availableAdvance = p.amount - otherAllocatedSum;

                const currentAlloc = currentAllocations.find(a => a.paymentId === p.id);
                const currentAllocAmount = currentAlloc ? currentAlloc.amount : 0;

                return {
                    ...p,
                    availableAdvance,
                    currentAllocAmount
                };
            }).filter(p => p.availableAdvance > 0.01 || p.currentAllocAmount > 0);

            setAvailablePayments(payments);

            const initialAdjustments = currentAllocations.map(a => {
                const pObj = paymentsRes.find(p => p.id === a.paymentId);
                return {
                    paymentId: a.paymentId,
                    paymentNumber: pObj ? pObj.paymentNumber : `Payment #${a.paymentId}`,
                    amount: a.amount
                };
            });
            setAdjustments(initialAdjustments);
        } catch (error) {
            console.error("Error loading vendor payments for edit:", error);
        }
    };

    const handleAddNew = async () => {
        resetForm();
        setShowSourceModal(false);
        const nextNum = await fetchNextBillNumber();
        setBillMeta(prev => ({ ...prev, manualNo: nextNum }));
        setShowAddModal(true);
    };

    const handleSourceTypeSelect = async (type) => {
        setSelectedSourceType(type);
        if (type === 'manual') {
            setShowSourceModal(false);
            const nextNum = await fetchNextBillNumber();
            setBillMeta(prev => ({ ...prev, manualNo: nextNum }));
            setShowAddModal(true);
        } else if (type === 'po') {
            setLoading(true);
            try {
                const companyId = GetCompanyId();
                const res = await purchaseOrderService.getOrders(companyId);
                const orders = res.data || res || [];
                // Filter out POs that are already completed OR already have linked bills
                setSourceDocs(orders.filter(o => o.status !== 'COMPLETED' && (!o.purchaseBills || o.purchaseBills.length === 0)));
                setSourceStep('list');
            } catch (err) {
                toast.error('Failed to fetch Purchase Orders');
            } finally {
                setLoading(false);
            }
        } else if (type === 'grn') {
            setLoading(true);
            try {
                const companyId = GetCompanyId();
                const res = await goodsReceiptNoteService.getGRNs(companyId);
                const grns = res.data || res || [];
                // Filter out GRNs that are already invoiced OR already have linked bills
                setSourceDocs(grns.filter(g => g.status !== 'Invoiced' && (!g.purchaseBills || g.purchaseBills.length === 0)));
                setSourceStep('list');
            } catch (err) {
                toast.error('Failed to fetch GRNs');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSourceDocSelect = async (doc) => {
        setVendorId(doc.vendorId);
        const vendorObj = vendors.find(v => v.id == doc.vendorId);
        const creditDays = vendorObj?.creditPeriod || 0;
        setSelectedVendorCreditPeriod(creditDays);
        const newDueDate = calculateDueDate(billMeta.date, creditDays);
        setBillMeta(prev => ({ ...prev, dueDate: newDueDate }));
        setNotes(doc.notes || '');
        setTerms(doc.terms || '');

        let mappedItems = [];
        const itemsList = doc.purchaseorderitem || doc.goodsreceiptnoteitem || doc.items || [];
        if (itemsList.length > 0) {
            mappedItems = itemsList.map(item => {
                let rate = item.rate || 0;
                let tax = item.taxRate || item.tax || 0;
                let discount = item.discount || 0;

                // For GRN, pull rates/taxes from the linked Purchase Order
                if (selectedSourceType === 'grn' && doc.purchaseorder?.purchaseorderitem) {
                    const poItem = doc.purchaseorder.purchaseorderitem.find(pi => pi.productId === item.productId);
                    if (poItem) {
                        rate = poItem.rate || 0;
                        tax = poItem.taxRate || 0;
                        discount = poItem.discount || 0;
                    }
                }

                return {
                    id: Date.now() + Math.random(),
                    productId: item.productId || item.product?.id || '',
                    warehouseId: item.warehouseId || item.warehouse?.id || '',
                    qty: item.receivedQty || item.quantity || item.qty || 1,
                    uomId: item.uomId || '',
                    rate,
                    tax,
                    discount,
                    total: 0,
                    description: item.description || ''
                };
            });

            mappedItems = mappedItems.map(i => {
                const sub = i.qty * i.rate;
                const taxAmt = ((sub - i.discount) * i.tax) / 100;
                return { ...i, total: (sub - i.discount) + taxAmt };
            });
            setItems(mappedItems);
        }

        if (selectedSourceType === 'po') {
            setLinkedSource({ purchaseOrderId: doc.id });
            setNotes(`Purchase Order No: ${doc.orderNumber || doc.poNumber}${doc.notes ? '\n' + doc.notes : ''}`);
            const nextNum = await fetchNextBillNumber();
            setBillMeta(prev => ({ ...prev, manualNo: nextNum || `BILL-PO-${doc.poNumber || doc.id}` }));
        } else if (selectedSourceType === 'grn') {
            setLinkedSource({ grnId: doc.id, purchaseOrderId: doc.purchaseOrderId });
            setNotes(`${doc.purchaseorder?.orderNumber ? `Purchase Order No: ${doc.purchaseorder.orderNumber}\n` : ''}GRN No: ${doc.grnNumber}${doc.notes ? '\n' + doc.notes : ''}`);
            const nextNum = await fetchNextBillNumber();
            setBillMeta(prev => ({ ...prev, manualNo: nextNum || `BILL-GRN-${doc.grnNumber || doc.id}` }));
        }

        setShowSourceModal(false);
        setShowAddModal(true);
    };

    const handleView = async (bill) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseBillService.getBillById(bill.id, companyId);
            if (res.success && res.data) {
                const billData = res.data;
                resetForm();
                setViewBill(billData);
                setEditingId(billData.id);
                setVendorId(billData.vendorId);
                let viewFieldValues = {};
                if (billData.customFields) {
                    try {
                        viewFieldValues = typeof billData.customFields === 'string'
                            ? JSON.parse(billData.customFields)
                            : billData.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on view:', e);
                    }
                }
                setBillMeta({
                    manualNo: billData.billNumber,
                    date: billData.date.split('T')[0],
                    dueDate: billData.dueDate ? billData.dueDate.split('T')[0] : '',
                    deliveryPersonName: viewFieldValues.deliveryPersonName || '',
                    deliveryPersonMobile: viewFieldValues.deliveryPersonMobile || '',
                    deliveryPersonEmail: viewFieldValues.deliveryPersonEmail || ''
                });
                setNotes(billData.notes || '');

                const itemsData = billData.purchasebillitem || billData.items;
                if (itemsData) {
                    const mappedItems = itemsData.map(i => ({
                        id: i.id || Date.now() + Math.random(),
                        productId: i.productId || '',
                        warehouseId: i.warehouseId || '',
                        qty: i.quantity,
                        uomId: i.uomId || '',
                        rate: i.rate,
                        tax: i.taxRate,
                        discount: i.discount,
                        total: i.amount,
                        description: i.description
                    }));
                    setItems(mappedItems);
                }
                let fieldValues = {};
                if (billData.customFields) {
                    try {
                        fieldValues = typeof billData.customFields === 'string'
                            ? JSON.parse(billData.customFields)
                            : billData.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }
                setCustomFieldValues(fieldValues);
                setSelectedPhotos(fieldValues?._attachments?.photos || []);
                setSelectedFiles(fieldValues?._attachments?.files || []);

                const savedOtherCharges = fieldValues?._otherCharges || [];
                if (savedOtherCharges.length > 0) {
                    setOtherCharges(savedOtherCharges);
                    setShowOtherCharges(true);
                } else {
                    setOtherCharges([]);
                    setShowOtherCharges(false);
                }
                setOverallDiscount(billData.overallDiscount || 0);
                setOverallDiscountType(billData.overallDiscountType || 'percentage');
                setSelectedCurrency(billData.currency || companySettings?.currency || 'USD');
                setExchangeRate(billData.exchangeRate || 1.0);

                // Set address details
                setBillingAddress({
                    name: billData.billingName || (billData.vendor?.billingName || billData.vendor?.name || ''),
                    address: billData.billingAddress || (billData.vendor?.billingAddress || ''),
                    city: billData.billingCity || (billData.vendor?.billingCity || ''),
                    state: billData.billingState || (billData.vendor?.billingState || ''),
                    zipCode: billData.billingZipCode || (billData.vendor?.billingZipCode || ''),
                    country: billData.billingCountry || (billData.vendor?.billingCountry || ''),
                    phone: billData.vendor?.billingPhone || billData.vendor?.phone || ''
                });

                setShippingAddress({
                    name: billData.shippingName || (billData.vendor?.shippingName || billData.vendor?.name || ''),
                    address: billData.shippingAddress || (billData.vendor?.shippingAddress || ''),
                    city: billData.shippingCity || (billData.vendor?.shippingCity || ''),
                    state: billData.shippingState || (billData.vendor?.shippingState || ''),
                    zipCode: billData.shippingZipCode || (billData.vendor?.shippingZipCode || ''),
                    country: billData.shippingCountry || (billData.vendor?.shippingCountry || ''),
                    phone: billData.vendor?.shippingPhone || billData.vendor?.phone || ''
                });

                setIsViewMode(true);
                // setShowAddModal(true);
            }
        } catch (error) {
            console.error("Error fetching bill details", error);
            toast.error("Failed to fetch bill details");
        }
    };

    const handleVendorView = (group) => {
        resetForm();
        const allPayments = [];
        group.bills.forEach(bill => {
            const curr = bill.currency || companySettings?.currency || 'USD';
            if (bill.payment && bill.payment.length > 0) {
                bill.payment.forEach(pay => {
                    allPayments.push({
                        ...pay,
                        billCurrency: curr
                    });
                });
            }
        });
        // Sort payments by date ascending
        allPayments.sort((a, b) => new Date(a.date) - new Date(b.date));

        setViewBill({
            ...group,
            isStatement: true,
            payment: allPayments,
            billingName: group.vendor?.billingName || group.vendor?.name || '',
            billingAddress: group.vendor?.billingAddress || '',
            billingCity: group.vendor?.billingCity || '',
            billingState: group.vendor?.billingState || '',
            billingZipCode: group.vendor?.billingZipCode || '',
            billingCountry: group.vendor?.billingCountry || '',
            shippingName: group.vendor?.shippingName || group.vendor?.name || '',
            shippingAddress: group.vendor?.shippingAddress || group.vendor?.billingAddress || '',
            shippingCity: group.vendor?.city || '',
            shippingState: group.vendor?.state || '',
            shippingZipCode: group.vendor?.zipCode || '',
            shippingCountry: group.vendor?.country || ''
        });
        setIsViewMode(true);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleUnpay = (bill) => {
        setBillToUnpay(bill);
        setShowUnpayModal(true);
    };

    const confirmUnpay = async () => {
        if (!billToUnpay) return;
        try {
            const companyId = GetCompanyId();
            const res = await purchaseBillService.unpay(billToUnpay.id, companyId);
            if (res.success) {
                toast.success('Purchase bill marked as unpaid and all payments reverted successfully.');
                setShowUnpayModal(false);
                setBillToUnpay(null);
                fetchBills();
            } else {
                toast.error(res.message || 'Failed to revert payments.');
            }
        } catch (error) {
            console.error('Error reverting payments:', error);
            toast.error(error.response?.data?.message || 'Failed to revert payments.');
        }
    };

    const handleEdit = async (id) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseBillService.getBillById(id, companyId);
            if (res.success && res.data) {
                const billToEdit = res.data;
                if (billToEdit.paidAmount > 0 || billToEdit.status === 'PAID' || billToEdit.status === 'PARTIAL') {
                    toast.error('A paid or partially paid bill cannot be edited. Please mark it as unpaid first.');
                    return;
                }
                resetForm();
                setEditingId(id);
                setVendorId(billToEdit.vendorId);
                const vendorObj = vendors.find(v => v.id == billToEdit.vendorId);
                setSelectedVendorCreditPeriod(vendorObj?.creditPeriod || 0);
                let fieldValues = {};
                if (billToEdit.customFields) {
                    try {
                        fieldValues = typeof billToEdit.customFields === 'string'
                            ? JSON.parse(billToEdit.customFields)
                            : billToEdit.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }
                setCustomFieldValues(fieldValues);
                setSalespersonId(billToEdit.salespersonId || '');
                setShowSalespersonField(!!billToEdit.salespersonId);
                setShowDeliveryFields(!!fieldValues.deliveryPersonName);

                // Match delivery person from list by name if possible
                const matchingDp = (deliverypersonsList || []).find(dp => dp.name === (fieldValues.deliveryPersonName || ''));
                setSelectedDeliveryPersonId(matchingDp ? String(matchingDp.id) : '');
                setShowCurrencyField(!!billToEdit.currency && billToEdit.currency !== (companySettings?.currency || 'INR'));
                setCarNumber(billToEdit.carNumber || '');
                setManualReference(billToEdit.manualReference || '');
                setBillMeta({
                    manualNo: billToEdit.billNumber,
                    date: billToEdit.date.split('T')[0],
                    dueDate: billToEdit.dueDate ? billToEdit.dueDate.split('T')[0] : '',
                    deliveryPersonName: fieldValues.deliveryPersonName || '',
                    deliveryPersonMobile: fieldValues.deliveryPersonMobile || '',
                    deliveryPersonEmail: fieldValues.deliveryPersonEmail || ''
                });
                setNotes(billToEdit.notes || '');

                const itemsData = billToEdit.purchasebillitem || billToEdit.items;
                if (itemsData) {
                    const mappedItems = itemsData.map(i => ({
                        id: i.id || Date.now() + Math.random(),
                        productId: i.productId || '',
                        warehouseId: i.warehouseId || '',
                        qty: i.quantity,
                        uomId: i.uomId || '',
                        rate: i.rate,
                        tax: i.taxRate,
                        discount: i.discount,
                        total: i.amount,
                        description: i.description
                    }));
                    setItems(mappedItems);
                }
                setSelectedPhotos(fieldValues?._attachments?.photos || []);
                setSelectedFiles(fieldValues?._attachments?.files || []);

                const savedOtherCharges = fieldValues?._otherCharges || [];
                if (savedOtherCharges.length > 0) {
                    setOtherCharges(savedOtherCharges);
                    setShowOtherCharges(true);
                } else {
                    setOtherCharges([]);
                    setShowOtherCharges(false);
                }
                setOverallDiscount(billToEdit.overallDiscount || 0);
                setOverallDiscountType(billToEdit.overallDiscountType || 'percentage');
                setSelectedCurrency(billToEdit.currency || companySettings?.currency || 'USD');
                setExchangeRate(billToEdit.exchangeRate || 1.0);

                // Set address details
                setBillingAddress({
                    name: billToEdit.billingName || (billToEdit.vendor?.billingName || billToEdit.vendor?.name || ''),
                    address: billToEdit.billingAddress || (billToEdit.vendor?.billingAddress || ''),
                    city: billToEdit.billingCity || (billToEdit.vendor?.billingCity || ''),
                    state: billToEdit.billingState || (billToEdit.vendor?.billingState || ''),
                    zipCode: billToEdit.billingZipCode || (billToEdit.vendor?.billingZipCode || ''),
                    country: billToEdit.billingCountry || (billToEdit.vendor?.billingCountry || ''),
                    phone: billToEdit.vendor?.billingPhone || billToEdit.vendor?.phone || ''
                });

                setShippingAddress({
                    name: billToEdit.shippingName || (billToEdit.vendor?.shippingName || billToEdit.vendor?.name || ''),
                    address: billToEdit.shippingAddress || (billToEdit.vendor?.shippingAddress || ''),
                    city: billToEdit.shippingCity || (billToEdit.vendor?.shippingCity || ''),
                    state: billToEdit.shippingState || (billToEdit.vendor?.shippingState || ''),
                    zipCode: billToEdit.shippingZipCode || (billToEdit.vendor?.shippingZipCode || ''),
                    country: billToEdit.shippingCountry || (billToEdit.vendor?.shippingCountry || ''),
                    phone: billToEdit.vendor?.shippingPhone || billToEdit.vendor?.phone || ''
                });

                setLinkedSource({
                    grnId: billToEdit.grnId || null,
                    purchaseOrderId: billToEdit.purchaseOrderId || null
                });
                await loadVendorPaymentsForEdit(billToEdit.vendorId, id);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error("Error fetching bill details", error);
            toast.error("Failed to fetch details for editing");
        }
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            await purchaseBillService.deleteBill(deleteId, companyId);
            toast.success("Bill deleted");
            fetchBills();
        } catch (error) {
            console.error(error);
        }
        setShowDeleteConfirm(false);
        setDeleteId(null);
    };

    const handleStatusChange = async (billId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const res = await purchaseBillService.updateBill(billId, payload, companyId);
            if (res?.success || res?.data?.success) {
                toast.success('Status updated');
                fetchBills();
            }
        } catch (error) {
            console.error('Error changing status:', error);
            toast.error('Failed to update status');
        }
    };

    const safeFloat = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const incrementString = (str) => {
        if (!str) return '1';
        const match = str.match(/(\d+)$/);
        if (match) {
            const numStr = match[1];
            const nextNum = parseInt(numStr, 10) + 1;
            const paddedNum = String(nextNum).padStart(numStr.length, '0');
            return str.substring(0, str.length - numStr.length) + paddedNum;
        } else {
            return str + '1';
        }
    };

    const handleSave = async (forceAllowDuplicate = false, overrideManualRef = null) => {
        const isForce = forceAllowDuplicate === true;
        if (!vendorId) {
            toast.error("Please select a vendor");
            return;
        }


        const totals = calculateTotals();

        const companyId = GetCompanyId();
        const netBase = Math.max(0, totals.total - (totals.otherChargesTotal || 0));
        const validOtherChargesList = showOtherCharges
            ? otherCharges.filter(c => c.accountId && parseFloat(c.value !== undefined ? c.value : c.amount) > 0).map(c => {
                const val = parseFloat(c.value !== undefined ? c.value : c.amount) || 0;
                const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
                const computedAmt = isPct ? (netBase * val) / 100 : val;
                return {
                    id: c.id || Date.now() + Math.random(),
                    accountId: parseInt(c.accountId),
                    accountName: c.accountName || '',
                    chargeType: c.chargeType || (c.type === 'percentage' ? 'percentage' : 'fixed'),
                    value: val,
                    amount: computedAmt
                };
            })
            : [];

        const customFieldsPayload = {
            ...customFieldValues,
            deliveryPersonName: billMeta.deliveryPersonName,
            deliveryPersonMobile: billMeta.deliveryPersonMobile,
            deliveryPersonEmail: billMeta.deliveryPersonEmail,
            _attachments: {
                photos: selectedPhotos,
                files: selectedFiles
            },
            _otherCharges: validOtherChargesList
        };

        const payload = {
            customFields: JSON.stringify(customFieldsPayload),
            companyId,
            purchaseOrderId: sourceData?.purchaseOrderId || linkedSource?.purchaseOrderId || null,
            grnId: sourceData?.grnId || linkedSource?.grnId || null,
            vendorId: parseInt(vendorId),
            billNumber: billMeta.manualNo || `BILL-${Date.now()}`,
            manualReference: overrideManualRef !== null ? overrideManualRef : (manualReference || null),
            salespersonId: salespersonId ? parseInt(salespersonId) : null,
            carNumber: carNumber || null,
            date: billMeta.date,
            dueDate: billMeta.dueDate,
            totalAmount: safeFloat(totals.total),
            taxAmount: safeFloat(totals.tax),
            discountAmount: safeFloat(totals.discount),
            overallDiscount: safeFloat(overallDiscount),
            overallDiscountType: overallDiscountType,
            currency: selectedCurrency,
            exchangeRate: safeFloat(exchangeRate) || 1.0,
            otherCharges: validOtherChargesList.map(c => ({
                accountId: c.accountId,
                amount: c.amount,
                accountName: c.accountName
            })),
            adjustments: adjustments.filter(adj => adj.amount > 0).map(adj => ({
                paymentId: adj.paymentId,
                amount: adj.amount
            })),
            items: items.map(item => ({
                productId: parseInt(item.productId),
                warehouseId: item.warehouseId ? parseInt(item.warehouseId) : null,
                uomId: item.uomId ? parseInt(item.uomId) : null,
                description: item.description,
                quantity: safeFloat(item.qty),
                rate: safeFloat(item.rate),
                discount: safeFloat(item.discount),
                taxRate: safeFloat(item.tax),
                amount: safeFloat(item.total)
            })),
            notes,
            billingName: billingAddress.name,
            billingAddress: billingAddress.address,
            billingCity: billingAddress.city,
            billingState: billingAddress.state,
            billingZipCode: billingAddress.zipCode,
            billingCountry: billingAddress.country,
            shippingName: shippingAddress.name,
            shippingAddress: shippingAddress.address,
            shippingCity: shippingAddress.city,
            shippingState: shippingAddress.state,
            shippingZipCode: shippingAddress.zipCode,
            shippingCountry: shippingAddress.country
        };

        try {
            if (editingId) {
                await purchaseBillService.updateBill(editingId, payload);
                toast.success("Bill updated successfully");
                setEditingId(null);
                setShowAddModal(false);
                fetchBills();
            } else {
                await purchaseBillService.createBill(payload, isForce);
                toast.success("Bill created successfully");
                setShowAddModal(false);
                fetchBills();
            }
        } catch (error) {
            console.error(error);
            if (error.response?.data?.isDuplicate) {
                const currentRef = overrideManualRef !== null ? overrideManualRef : (manualReference || '');
                setDuplicateRefToRetry(currentRef);
                setShowDuplicateModal(true);
            } else {
                toast.error(error.response?.data?.message || error.message || "Failed to save bill");
            }
        }
    };

    const handleAttachmentUpload = async (e, type) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const setUploading = type === 'photo' ? setUploadingPhotos : setUploadingFiles;
        const setSelected = type === 'photo' ? setSelectedPhotos : setSelectedFiles;

        setUploading(true);
        try {
            const uploadedUrls = [];
            for (const file of files) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', file);
                const res = await axiosInstance.post('/upload?folder=purchase-bills', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data.success) {
                    uploadedUrls.push({
                        name: file.name,
                        url: res.data.url
                    });
                }
            }
            setSelected(prev => [...prev, ...uploadedUrls]);
            toast.success(`${files.length} file(s) uploaded successfully!`);
        } catch (err) {
            console.error(err);
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleMakePayment = (bill) => {
        navigate('/company/purchases/payment', {
            state: {
                sourceData: {
                    vendorId: bill.vendorId,
                    amount: bill.totalAmount,
                    billNumber: bill.billNumber,
                    billId: bill.id
                }
            }
        });
    };

    const addItem = () => {
        let defWarehouseId = '';
        if (companySettings?.inventoryConfig) {
            try {
                const parsed = typeof companySettings.inventoryConfig === 'string'
                    ? JSON.parse(companySettings.inventoryConfig)
                    : companySettings.inventoryConfig;
                if (parsed.defaultPurchaseWarehouseId) {
                    defWarehouseId = parseInt(parsed.defaultPurchaseWarehouseId);
                }
            } catch (e) {
                console.error(e);
            }
        }
        setItems(prevItems => [...prevItems, { id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
    };

    const handleAutoAddNextRow = (itemId) => {
        setItems(prevItems => {
            if (prevItems && prevItems.length > 0) {
                const lastItem = prevItems[prevItems.length - 1];
                if (String(lastItem.id) === String(itemId)) {
                    let defWarehouseId = '';
                    if (companySettings?.inventoryConfig) {
                        try {
                            const parsed = typeof companySettings.inventoryConfig === 'string'
                                ? JSON.parse(companySettings.inventoryConfig)
                                : companySettings.inventoryConfig;
                            if (parsed.defaultPurchaseWarehouseId) {
                                defWarehouseId = parseInt(parsed.defaultPurchaseWarehouseId);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return [...prevItems, { id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }];
                }
            }
            return prevItems;
        });
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                let updatedItem = { ...item, [field]: value };

                if (field === 'productId') {
                    const prod = products.find(p => p.id === parseInt(value));
                    if (prod) {
                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                        updatedItem.uomId = prod.purchaseUomId || prod.uomId || '';
                        updatedItem.rate = Number(((prod.purchasePrice || 0) / conversionRate).toFixed(6));
                        updatedItem.description = prod.description || '';
                    }
                } else if (field === 'uomId') {
                    const newUomId = value ? parseInt(value) : '';
                    const prodId = item.productId ? parseInt(item.productId) : null;
                    const prod = prodId ? products.find(p => p.id === prodId) : null;
                    if (prod) {
                        const newUom = allUoms.find(u => u.id === newUomId) || prod.uom || prod.purchaseUom || prod.salesUom;
                        const basePrice = prod.purchasePrice || 0;
                        const multiplier = newUom?.uomType === 'Compound' ? parseFloat(newUom.conversionRate) || 1 : 1;
                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                        updatedItem = {
                            ...item,
                            uomId: newUomId,
                            rate: Number(((basePrice * multiplier) / conversionRate).toFixed(6))
                        };
                    } else {
                        updatedItem = { ...item, uomId: newUomId };
                    }
                }

                if (['qty', 'rate', 'tax', 'discount'].includes(field) || field === 'productId') {
                    const qty = parseFloat(updatedItem.qty) || 0;
                    const rate = parseFloat(updatedItem.rate) || 0;
                    const tax = parseFloat(updatedItem.tax) || 0;
                    const discount = parseFloat(updatedItem.discount) || 0;

                    const subtotal = qty * rate;
                    const taxable = subtotal - discount;
                    const taxAmount = (taxable * tax) / 100;

                    const totalVal = taxable + taxAmount;
                    updatedItem.total = isNaN(totalVal) ? 0 : totalVal;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const calculateTotals = () => {
        const totalsObj = items.reduce((acc, item) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const discount = parseFloat(item.discount) || 0;
            const subtotal = qty * rate;
            const tax = parseFloat(item.tax) || 0;
            const taxable = subtotal - discount;
            const taxAmount = (taxable * tax) / 100;

            acc.subTotal += subtotal;
            acc.discount += discount;
            acc.tax += taxAmount;
            acc.total += item.total;
            return acc;
        }, { subTotal: 0, tax: 0, discount: 0, total: 0 });

        let finalTotal = totalsObj.total;
        let ovDiscountAmt = 0;
        if (overallDiscount && overallDiscount > 0) {
            if (overallDiscountType === 'percentage') {
                ovDiscountAmt = (finalTotal * parseFloat(overallDiscount)) / 100;
                finalTotal -= ovDiscountAmt;
            } else {
                ovDiscountAmt = parseFloat(overallDiscount);
                finalTotal -= ovDiscountAmt;
            }
        }
        const netBase = Math.max(0, finalTotal);
        const otherChargesTotal = showOtherCharges
            ? otherCharges.reduce((sum, c) => {
                const val = parseFloat(c.value !== undefined ? c.value : c.amount) || 0;
                const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
                const amt = isPct ? (netBase * val) / 100 : val;
                return sum + amt;
            }, 0)
            : 0;

        totalsObj.ovDiscountAmt = ovDiscountAmt;
        totalsObj.otherChargesTotal = otherChargesTotal;
        totalsObj.total = netBase + otherChargesTotal;
        return totalsObj;
    };

    const totals = calculateTotals();

    const purchaseProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'purchase-order', label: 'Purchase Order', icon: ShoppingCart, status: 'completed' },
        { id: 'grn', label: 'Goods Receipt', icon: Truck, status: 'completed' },
        { id: 'bill', label: 'Bill', icon: Receipt, status: 'active' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    if (isViewMode && viewBill) {
        return (
            <div className="PBILL-page-full-view p-3">
                <div className="PBILL-view-header no-print">
                    <button className="PBILL-back-btn" onClick={() => {
                        if (location.state && location.state.targetBillId) {
                            navigate(-1);
                        } else {
                            setIsViewMode(false);
                            setViewBill(null);
                            navigate('/company/purchases/bill', { replace: true, state: {} });
                        }
                    }}>
                        <ArrowLeft size={18} /> Back
                    </button>
                    <div className="PBILL-view-actions">
                        {viewBill.balanceAmount > 0 && hasPermission('create purchase payment') && !viewBill.isStatement && (
                            <button
                                className="PBILL-btn-add"
                                onClick={() => handleMakePayment(viewBill)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#334155',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <CreditCard size={18} /> Record Payment
                            </button>
                        )}
                        <button className="PBILL-btn-print" onClick={handlePrint}>
                            <Printer size={18} /> Print
                        </button>
                    </div>
                </div>

                <div className="PBILL-view-content-pane printable-area">
                    <div
                        className={`invoice-preview-container template-${(companySettings?.invoiceTemplate || companyDetails.template || 'New York').toLowerCase().replace(' ', '').replace('invoice-', '')}`}
                        id="invoice-print-content"
                        style={{
                            '--header-bg': companySettings?.invoiceColor || companyDetails.color || '#004aad',
                            '--header-text': (() => {
                                const hex = (companySettings?.invoiceColor || companyDetails.color || '#004aad').replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                return (yiq >= 150) ? '#1e293b' : '#ffffff';
                            })()
                        }}
                    >
                        {/* Header Section */}
                        {getInvoiceLabel('showHeader') !== false && (
                            <div className="invoice-header-wrapper">
                                <div className="invoice-preview-header">
                                    <div className="invoice-header-left">
                                        {companySettings?.invoiceLogo || companyDetails.logo ? (
                                            <img
                                                src={companySettings?.invoiceLogo || (companyDetails.logo.startsWith('http') ? companyDetails.logo : `${BASE_URL}/${companyDetails.logo.replace(/\\/g, '/')}`)}
                                                alt="Company Logo"
                                                className="invoice-logo-large"
                                            />
                                        ) : (
                                            <h2 style={{ color: companySettings?.invoiceColor || companyDetails.color, margin: 0, textTransform: 'uppercase' }}>{companyDetails.name}</h2>
                                        )}

                                        <div className="invoice-company-details">
                                            <strong>{companyDetails.name}</strong><br />
                                            {companyDetails.email}<br />
                                            {companyDetails.phone}<br />
                                            {companyDetails.address}
                                        </div>
                                    </div>
                                    <div className="invoice-header-right">
                                        <div className="invoice-title-large">{viewBill.isStatement ? 'VENDOR STATEMENT' : getDocumentTitle('purchasebill')}</div>
                                        <div className="invoice-meta-info">
                                            {viewBill.isStatement ? (
                                                <>
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">Vendor:</span> {viewBill.vendor?.name}
                                                    </div>
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">Total Bills:</span> {viewBill.bills.length}
                                                    </div>
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">As of:</span> {new Date().toLocaleDateString()}
                                                    </div>
                                                    {(() => {
                                                        const fb = viewBill.bills && viewBill.bills[0];
                                                        if (!fb) return null;
                                                        return (
                                                            <>
                                                                {fb.salesperson && (
                                                                    <>
                                                                        <div className="invoice-meta-row">
                                                                            <span className="invoice-label">Salesperson:</span> <span>{fb.salesperson.name}</span>
                                                                        </div>
                                                                        {fb.salesperson.phone && (
                                                                            <div className="invoice-meta-row">
                                                                                <span className="invoice-label">Salesperson Phone:</span> <span>{fb.salesperson.phone}</span>
                                                                            </div>
                                                                        )}
                                                                        {fb.salesperson.email && (
                                                                            <div className="invoice-meta-row">
                                                                                <span className="invoice-label">Salesperson Email:</span> <span>{fb.salesperson.email}</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {fb.carNumber && (
                                                                    <div className="invoice-meta-row">
                                                                        <span className="invoice-label">Car Number:</span> <span>{fb.carNumber}</span>
                                                                    </div>
                                                                )}
                                                                {(() => {
                                                                    if (!fb.customFields) return null;
                                                                    try {
                                                                        const cf = typeof fb.customFields === 'string'
                                                                            ? JSON.parse(fb.customFields)
                                                                            : fb.customFields;
                                                                        return (
                                                                            <>
                                                                                {cf.deliveryPersonName && (
                                                                                    <div className="invoice-meta-row">
                                                                                        <span className="invoice-label">Del. Person:</span> <span>{cf.deliveryPersonName}</span>
                                                                                    </div>
                                                                                )}
                                                                                {cf.deliveryPersonMobile && (
                                                                                    <div className="invoice-meta-row">
                                                                                        <span className="invoice-label">Del. Mobile:</span> <span>{cf.deliveryPersonMobile}</span>
                                                                                    </div>
                                                                                )}
                                                                                {cf.deliveryPersonEmail && (
                                                                                    <div className="invoice-meta-row">
                                                                                        <span className="invoice-label">Del. Email:</span> <span>{cf.deliveryPersonEmail}</span>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    } catch (e) {
                                                                        return null;
                                                                    }
                                                                })()}
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">Bill No:</span> {viewBill.billNumber}
                                                    </div>
                                                    {viewBill.manualReference && (
                                                        <div className="invoice-meta-row">
                                                            <span className="invoice-label">Manual Ref:</span> {viewBill.manualReference}
                                                        </div>
                                                    )}
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">Date:</span> {new Date(viewBill.date).toLocaleDateString()}
                                                    </div>
                                                    <div className="invoice-meta-row">
                                                        <span className="invoice-label">{getInvoiceLabel('dueDate')}</span> {viewBill.dueDate ? new Date(viewBill.dueDate).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                    {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                        <>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">Currency:</span> {viewBill.currency}
                                                            </div>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">Ex. Rate:</span> 1 {viewBill.currency} = {Number(viewRate).toFixed(4)} {companySettings?.currency || 'INR'}
                                                            </div>
                                                        </>
                                                    )}
                                                    {viewBill?.salesperson && (
                                                        <>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">Salesperson:</span> <span>{viewBill.salesperson.name}</span>
                                                            </div>
                                                            {viewBill.salesperson.phone && (
                                                                <div className="invoice-meta-row">
                                                                    <span className="invoice-label">Salesperson Phone:</span> <span>{viewBill.salesperson.phone}</span>
                                                                </div>
                                                            )}
                                                            {viewBill.salesperson.email && (
                                                                <div className="invoice-meta-row">
                                                                    <span className="invoice-label">Salesperson Email:</span> <span>{viewBill.salesperson.email}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {viewBill?.carNumber && (
                                                        <div className="invoice-meta-row">
                                                            <span className="invoice-label">Car Number:</span> <span>{viewBill.carNumber}</span>
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        if (!viewBill?.customFields) return null;
                                                        try {
                                                            const cf = typeof viewBill.customFields === 'string'
                                                                ? JSON.parse(viewBill.customFields)
                                                                : viewBill.customFields;
                                                            return (
                                                                <>
                                                                    {cf.deliveryPersonName && (
                                                                        <div className="invoice-meta-row">
                                                                            <span className="invoice-label">Del. Person:</span> <span>{cf.deliveryPersonName}</span>
                                                                        </div>
                                                                    )}
                                                                    {cf.deliveryPersonMobile && (
                                                                        <div className="invoice-meta-row">
                                                                            <span className="invoice-label">Del. Mobile:</span> <span>{cf.deliveryPersonMobile}</span>
                                                                        </div>
                                                                    )}
                                                                    {cf.deliveryPersonEmail && (
                                                                        <div className="invoice-meta-row">
                                                                            <span className="invoice-label">Del. Email:</span> <span>{cf.deliveryPersonEmail}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        } catch (e) {
                                                            return null;
                                                        }
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                        {companyDetails.showQrCode && (
                                            <div className="invoice-qr-box" style={{
                                                marginTop: '15px',
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                visibility: 'visible',
                                                opacity: 1
                                            }}>
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/view/bill/${viewBill.id}`)}`}
                                                    alt="QR"
                                                    style={{ width: '100px', height: '100px', display: 'block' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Addresses Section */}
                        <div className="invoice-addresses">
                            <div className="invoice-bill-to">
                                <div className="invoice-section-header">{getInvoiceLabel('billTo')}</div>
                                <div className="font-bold">{viewBill.billingName || viewBill.vendor?.name || 'N/A'}</div>
                                <div className="invoice-company-details">
                                    {viewBill.billingAddress || viewBill.vendor?.billingAddress || 'N/A'}<br />
                                    {[viewBill.billingCity || viewBill.vendor?.city, viewBill.billingState || viewBill.vendor?.state, viewBill.billingZipCode || viewBill.vendor?.zipCode].filter(Boolean).join(', ')}
                                </div>
                            </div>
                            <div className="invoice-ship-to" style={{ textAlign: 'right' }}>
                                <div className="invoice-section-header">{getInvoiceLabel('shipTo')}</div>
                                <div className="font-bold">{viewBill.shippingName || viewBill.vendor?.name || 'N/A'}</div>
                                <div className="invoice-company-details">
                                    {viewBill.shippingAddress || viewBill.vendor?.shippingAddress || viewBill.vendor?.billingAddress}<br />
                                    {[viewBill.shippingCity || viewBill.vendor?.city, viewBill.shippingState || viewBill.vendor?.state, viewBill.shippingZipCode || viewBill.vendor?.zipCode].filter(Boolean).join(', ')}
                                </div>
                            </div>
                        </div>


                        {/* Custom Fields Print View */}
                        {(() => {
                            let customFieldVals = {};
                            if (viewBill?.customFields) {
                                try {
                                    customFieldVals = typeof viewBill.customFields === 'string'
                                        ? JSON.parse(viewBill.customFields)
                                        : viewBill.customFields;
                                } catch (e) {
                                    console.error('Error parsing bill custom fields for view:', e);
                                }
                            }
                            const fieldsList = getCustomFieldsForType('purchasebill');
                            const activeCustomFields = fieldsList.filter(f => customFieldVals[f.label]);
                            if (activeCustomFields.length === 0) return null;
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', margin: '20px 0', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', textAlign: 'left' }}>
                                    {activeCustomFields.map(field => (
                                        <div key={field.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>{field.label}</span>
                                            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginTop: '2px' }}>{customFieldVals[field.label]}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Items Table / Bills Table */}
                        {viewBill.isStatement ? (
                            <table className="invoice-table-preview">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>Bill No</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>Date</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('item', 'Item').toUpperCase()}</th>
                                        {getInvoiceLabel('showWarehouse') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                        {getInvoiceLabel('showQty') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'center' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>Bill Total</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>Paid</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewBill.bills.map((bill, bIdx) => {
                                        const items = bill.purchasebillitem || bill.items || [];
                                        return items.map((item, iIdx) => (
                                            <tr key={`${bIdx}-${iIdx}`}>
                                                <td style={{ fontWeight: iIdx === 0 ? 600 : 400, color: iIdx === 0 ? 'inherit' : '#94a3b8' }}>
                                                    {iIdx === 0 ? bill.billNumber : ''}
                                                </td>
                                                <td style={{ color: iIdx === 0 ? 'inherit' : '#94a3b8' }}>
                                                    {iIdx === 0 ? new Date(bill.date).toLocaleDateString() : ''}
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{item.product?.name || 'N/A'}</td>
                                                {getInvoiceLabel('showWarehouse') !== false && <td>{item.warehouse?.name || 'N/A'}</td>}
                                                {getInvoiceLabel('showQty') !== false && <td style={{ textAlign: 'center' }}>{item.quantity}</td>}
                                                <td style={{ textAlign: 'right' }}>
                                                    {iIdx === 0 ? (
                                                        <>
                                                            {formatDocCurrency(bill.totalAmount, bill.currency)}
                                                            {bill.currency && bill.currency !== (companySettings?.currency || 'INR') && (
                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                    ({formatDocCurrency(bill.totalAmount * (getSyncRate(bill.currency, companySettings?.currency || 'INR') || 1.0), companySettings?.currency || 'INR')})
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {iIdx === 0 ? (
                                                        <>
                                                            {formatDocCurrency(bill.totalAmount - bill.balanceAmount, bill.currency)}
                                                            {bill.currency && bill.currency !== (companySettings?.currency || 'INR') && (
                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                    ({formatDocCurrency((bill.totalAmount - bill.balanceAmount) * (getSyncRate(bill.currency, companySettings?.currency || 'INR') || 1.0), companySettings?.currency || 'INR')})
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: iIdx === 0 ? 600 : 400 }}>
                                                    {iIdx === 0 ? (
                                                        <>
                                                            {formatDocCurrency(bill.balanceAmount, bill.currency)}
                                                            {bill.currency && bill.currency !== (companySettings?.currency || 'INR') && (
                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                    ({formatDocCurrency(bill.balanceAmount * (getSyncRate(bill.currency, companySettings?.currency || 'INR') || 1.0), companySettings?.currency || 'INR')})
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : ''}
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <table className="invoice-table-preview">
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('item', 'Item Description').toUpperCase()}</th>
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>HSN/SKU</th>
                                        {getInvoiceLabel('showWarehouse') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                        {getInvoiceLabel('showQty') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'center' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                        {getInvoiceLabel('showUom') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'center' }}>UOM</th>}
                                        {getInvoiceLabel('showRate') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                        {getInvoiceLabel('showTax') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>{getTableHeader('price', 'Amount').toUpperCase()}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewBill.purchasebillitem || viewBill.items || []).map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.product?.name || 'Unknown Product'}</div>
                                                {item.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{item.description}</div>}
                                            </td>
                                            <td>{item.product?.hsnCode || item.product?.sku || '-'}</td>
                                            {getInvoiceLabel('showWarehouse') !== false && <td>{item.warehouse?.name || '-'}</td>}
                                            {getInvoiceLabel('showQty') !== false && <td style={{ textAlign: 'center' }}>{item.quantity}</td>}
                                            {getInvoiceLabel('showUom') !== false && <td style={{ textAlign: 'center' }}>{item.uom?.unitName || allUoms.find(u => u.id === item.uomId)?.unitName || ''}</td>}
                                            {getInvoiceLabel('showRate') !== false && (
                                                <td style={{ textAlign: 'right' }}>
                                                    {formatDocCurrency(item.rate, viewBill.currency)}
                                                    {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                            ({formatDocCurrency(item.rate * viewRate, companySettings?.currency || 'INR')})
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            {getInvoiceLabel('showTax') !== false && <td style={{ textAlign: 'right' }}>{item.taxRate}%</td>}
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                {formatDocCurrency(item.amount, viewBill.currency)}
                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                        ({formatDocCurrency(item.amount * viewRate, companySettings?.currency || 'INR')})
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Totals Section */}
                        <div className="invoice-total-section">
                            <div className="invoice-totals">
                                {viewBill.isStatement ? (
                                    <>
                                        <div className="invoice-total-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span className="invoice-label">Total Bill Amount:</span>
                                                <span style={{ fontWeight: '600' }}>{formatCurrency(viewBill.totalBillAmount)}</span>
                                            </div>
                                            {Object.keys(viewBill.currencyTotals || {}).map(curr => {
                                                const baseCurr = companySettings?.currency || 'INR';
                                                if (curr === baseCurr) return null;
                                                const originalTotal = viewBill.bills.filter(b => (b.currency || baseCurr) === curr).reduce((sum, b) => sum + b.totalAmount, 0);
                                                return (
                                                    <span key={`tot-${curr}`} style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        ({formatDocCurrency(originalTotal, curr)})
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div className="invoice-final-total" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', borderTop: '1px solid #edf2f7', paddingTop: '8px', marginTop: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span>Total Amount Paid:</span>
                                                <span style={{ color: '#334155', fontWeight: '700' }}>{formatCurrency(viewBill.totalBillAmount - viewBill.balanceAmount)}</span>
                                            </div>
                                            {Object.keys(viewBill.currencyTotals || {}).map(curr => {
                                                const baseCurr = companySettings?.currency || 'INR';
                                                if (curr === baseCurr) return null;
                                                const originalPaid = viewBill.bills.filter(b => (b.currency || baseCurr) === curr).reduce((sum, b) => sum + (b.totalAmount - b.balanceAmount), 0);
                                                return (
                                                    <span key={`paid-${curr}`} style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                        ({formatDocCurrency(originalPaid, curr)})
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div className="invoice-final-total" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', borderTop: '1px solid #ef4444', marginTop: '6px', paddingTop: '6px', color: '#ef4444' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                <span>Total Balance Due:</span>
                                                <span style={{ fontWeight: '700' }}>{formatCurrency(viewBill.balanceAmount)}</span>
                                            </div>
                                            {Object.keys(viewBill.currencyTotals || {}).map(curr => {
                                                const baseCurr = companySettings?.currency || 'INR';
                                                if (curr === baseCurr) return null;
                                                const originalBalance = viewBill.currencyTotals[curr];
                                                return (
                                                    <span key={`bal-${curr}`} style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                                                        ({formatDocCurrency(originalBalance, curr)})
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {(() => {
                                            let parsedOtherCharges = [];
                                            try {
                                                if (viewBill.customFields) {
                                                    const cf = typeof viewBill.customFields === 'string'
                                                        ? JSON.parse(viewBill.customFields)
                                                        : viewBill.customFields;
                                                    parsedOtherCharges = cf?._otherCharges || [];
                                                }
                                            } catch (e) {
                                                console.error('Error parsing custom fields for other charges in view:', e);
                                            }

                                            const otherChargesTotal = parsedOtherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
                                            const subtotalVal = (viewBill.subtotal !== undefined && viewBill.subtotal !== null)
                                                ? viewBill.subtotal
                                                : (viewBill.totalAmount - (viewBill.taxAmount || 0) + (viewBill.discountAmount || 0) - otherChargesTotal);

                                            const getOverallDiscountAmt = () => {
                                                if (viewBill.overallDiscount > 0) {
                                                    if (viewBill.overallDiscountType === 'percentage') {
                                                        const F = (parseFloat(viewBill.overallDiscount) || 0) / 100;
                                                        if (F >= 1) return viewBill.discountAmount || 0;
                                                        const sub = parseFloat(subtotalVal) || 0;
                                                        const totDisc = parseFloat(viewBill.discountAmount) || 0;
                                                        const tax = parseFloat(viewBill.taxAmount) || 0;
                                                        return ((sub - totDisc + tax) * F) / (1 - F);
                                                    }
                                                    return parseFloat(viewBill.overallDiscount) || 0;
                                                }
                                                return 0;
                                            };

                                            const overallDiscountAmt = getOverallDiscountAmt();
                                            const itemDiscountAmt = Math.max(0, (parseFloat(viewBill.discountAmount) || 0) - overallDiscountAmt);

                                            return (
                                                <>
                                                    <div className="invoice-total-row">
                                                        <span className="invoice-label">{getInvoiceLabel('subTotal')}:</span>
                                                        <span>
                                                            {formatDocCurrency(subtotalVal, viewBill.currency)}
                                                            {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                    ({formatDocCurrency(subtotalVal * viewRate, companySettings?.currency || 'INR')})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {itemDiscountAmt > 0 && (
                                                        <div className="invoice-total-row">
                                                            <span className="invoice-label">Item Discount:</span>
                                                            <span>
                                                                <span style={{ color: '#ef4444' }}>- {formatDocCurrency(itemDiscountAmt, viewBill.currency)}</span>
                                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                        (- {formatDocCurrency(itemDiscountAmt * viewRate, companySettings?.currency || 'INR')})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {viewBill.taxAmount > 0 && (
                                                        <div className="invoice-total-row">
                                                            <span className="invoice-label">{getInvoiceLabel('tax')}:</span>
                                                            <span>
                                                                <span>+ {formatDocCurrency(viewBill.taxAmount, viewBill.currency)}</span>
                                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                        (+ {formatDocCurrency(viewBill.taxAmount * viewRate, companySettings?.currency || 'INR')})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {overallDiscountAmt > 0 && (
                                                        <div className="invoice-total-row">
                                                            <span className="invoice-label">Overall Discount ({viewBill.overallDiscountType === 'percentage' ? `${viewBill.overallDiscount}%` : 'Flat'}):</span>
                                                            <span>
                                                                <span style={{ color: '#ef4444' }}>- {formatDocCurrency(overallDiscountAmt, viewBill.currency)}</span>
                                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                        (- {formatDocCurrency(overallDiscountAmt * viewRate, companySettings?.currency || 'INR')})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {parsedOtherCharges.filter(c => c.accountId && parseFloat(c.amount) > 0).map((charge) => (
                                                        <div className="invoice-total-row" key={charge.id} style={{ color: '#1e293b' }}>
                                                            <span className="invoice-label">Other Charges{charge.accountName ? ` (${charge.accountName})` : ''}:</span>
                                                            <span>
                                                                + {formatDocCurrency(parseFloat(charge.amount) || 0, viewBill.currency)}
                                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                        (+ {formatDocCurrency((parseFloat(charge.amount) || 0) * viewRate, companySettings?.currency || 'INR')})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                        <div className="invoice-final-total">
                                            <span>{getInvoiceLabel('total')}:</span>
                                            <span>
                                                {formatDocCurrency(viewBill.totalAmount, viewBill.currency)}
                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                        ({formatDocCurrency((viewBill.totalAmount || 0) * viewRate, companySettings?.currency || 'INR')})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="invoice-total-row" style={{ marginTop: '5px', fontWeight: '600', color: '#334155' }}>
                                            <span className="invoice-label">Amount Paid:</span>
                                            <span>
                                                {formatDocCurrency(viewBill.paidAmount || 0, viewBill.currency)}
                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                        ({formatDocCurrency((viewBill.paidAmount || 0) * viewRate, companySettings?.currency || 'INR')})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="invoice-total-row" style={{ borderTop: '1px solid #e2e8f0', marginTop: '5px', paddingTop: '5px', fontWeight: '700', color: '#ef4444' }}>
                                            <span className="invoice-label">Balance Due:</span>
                                            <span>
                                                {formatDocCurrency(viewBill.balanceAmount, viewBill.currency)}
                                                {viewBill.currency && viewBill.currency !== (companySettings?.currency || 'INR') && (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                        ({formatDocCurrency((viewBill.balanceAmount || 0) * viewRate, companySettings?.currency || 'INR')})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bank Details & Signature Section */}
                        {/* <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div className="invoice-section-header">Bank Details:</div>
                                    <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                                        <strong>Account Name:</strong> {companyDetails.accountHolder || 'N/A'}<br />
                                        <strong>Bank Name:</strong> {companyDetails.bankName || 'N/A'}<br />
                                        <strong>Account No:</strong> {companyDetails.accountNumber || 'N/A'}<br />
                                        <strong>IFSC Code:</strong> {companyDetails.ifsc || 'N/A'}
                                    </div>
                                </div>
                                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                                    <div style={{ width: '200px', borderTop: '1px solid #1e293b', marginTop: '3rem', paddingTop: '0.5rem', textAlign: 'center', fontWeight: '700' }}>
                                        Authorized Signatory
                                    </div>
                                </div>
                            </div> */}

                        {/* Payment Details Section */}
                        {viewBill?.payment && viewBill.payment.length > 0 && (
                            <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <h3 className="invoice-section-header" style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>Payment Details:</h3>
                                <table className="invoice-table-preview" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Date</th>
                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Vch Type</th>
                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Reference No.</th>
                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'left' }}>Paid From</th>
                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', padding: '8px', textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewBill.payment.map((pay, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                                                <td style={{ padding: '8px' }}>{new Date(pay.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '8px' }}>Payment</td>
                                                <td style={{ padding: '8px' }}>{pay.paymentNumber || '-'}</td>
                                                <td style={{ padding: '8px' }}>{pay.bankLedger?.name || '-'}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {(() => {
                                                        const payCurrency = pay.billCurrency || viewBill?.currency;
                                                        if (payCurrency && payCurrency !== (companySettings?.currency || 'INR')) {
                                                            return (
                                                                <>
                                                                    <div>{formatDocCurrency(pay.amount, payCurrency)}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ({formatDocCurrency(pay.baseAmount || pay.amount, companySettings?.currency || 'INR')})
                                                                    </div>
                                                                </>
                                                            );
                                                        }
                                                        return formatDocCurrency(pay.amount, payCurrency);
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Notes Section */}
                        {getInvoiceLabel('showFooter') !== false && (
                            <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <h3 className="invoice-section-header">Notes &amp; Terms</h3>
                                {(() => {
                                    let displayNotes = viewBill?.notes || companyDetails.notes || '';
                                    const linkedGrnNo = viewBill?.goodsreceiptnote?.grnNumber;
                                    const linkedPoNo = viewBill?.purchaseorder?.orderNumber;

                                    if (linkedGrnNo && !displayNotes.includes(linkedGrnNo)) {
                                        displayNotes = `GRN No: ${linkedGrnNo}${displayNotes ? '\n' + displayNotes : ''}`;
                                    }
                                    if (linkedPoNo && !displayNotes.includes(linkedPoNo)) {
                                        displayNotes = `Purchase Order No: ${linkedPoNo}${displayNotes ? '\n' + displayNotes : ''}`;
                                    }

                                    return displayNotes ? (
                                        <p style={{ color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-line', marginBottom: '8px' }}>{displayNotes}</p>
                                    ) : null;
                                })()}
                                {companyDetails.terms && (
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        <strong>Terms &amp; Conditions:</strong> {companyDetails.terms}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Attachments Section in View Mode */}
                        {(() => {
                            let customFieldVals = {};
                            if (viewBill?.customFields) {
                                try {
                                    customFieldVals = typeof viewBill.customFields === 'string'
                                        ? JSON.parse(viewBill.customFields)
                                        : viewBill.customFields;
                                } catch (e) {
                                    console.error('Error parsing bill custom fields for view:', e);
                                }
                            }
                            const atts = customFieldVals?._attachments;
                            const photos = atts?.photos || [];
                            const files = atts?.files || [];
                            if (photos.length === 0 && files.length === 0) return null;
                            return (
                                <div className="PBILL-no-print no-print" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', textAlign: 'left' }}>
                                    <h3 className="invoice-section-header" style={{ marginBottom: '0.75rem', fontWeight: 'bold' }}>Attachments</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {photos.map((item, idx) => (
                                            <a key={`p-${idx}`} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                                                <span>🖼️</span> {item.name}
                                            </a>
                                        ))}
                                        {files.map((item, idx) => (
                                            <a key={`f-${idx}`} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                                                <span>📎</span> {item.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {getInvoiceLabel('showFooter') !== false && (
                            <div className="invoice-thank-you" style={{ textAlign: 'center', marginTop: '3rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                                Thank you for your business!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const handleExportExcel = () => {
        if (!bills.length) {
            toast.error('No purchase bills available to export');
            return;
        }
        const exportData = bills.map(b => ({
            'Bill #': b.billNumber,
            'Vendor Name': b.vendor?.name || b.billingName || '',
            'Date': b.date ? new Date(b.date).toLocaleDateString() : '',
            'Due Date': b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '',
            'Total Amount': b.totalAmount || 0,
            'Paid Amount': b.paidAmount || 0,
            'Balance Due': b.balanceAmount || 0,
            'Status': b.status || 'UNPAID',
            'Currency': b.currency || 'USD'
        }));
        exportToExcel(exportData, 'Purchase_Bills_Export.xlsx', 'PurchaseBills');
        toast.success(`Exported ${exportData.length} purchase bills to Excel.`);
    };

    return (
        <div className="PBILL-page">
            {!showAddModal && !isViewMode && (
                <>
                    <div className="PBILL-header">
                        <div>
                            <h1 className="PBILL-title">Purchase Bill</h1>
                            <p className="PBILL-subtitle">Record vendor bills and invoices</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                className="PBILL-btn-add"
                                style={{ background: '#334155' }}
                                onClick={handleExportExcel}
                            >
                                <Download size={18} /> Export Excel
                            </button>
                            {hasPermission('create purchase bill') && (
                                <button
                                    className="PBILL-btn-add"
                                    style={{ background: '#334155' }}
                                    onClick={() => setShowImportModal(true)}
                                >
                                    <FileSpreadsheet size={18} /> Import Bills
                                </button>
                            )}
                            {hasPermission('create purchase bill') && (
                                <button className="PBILL-btn-add" onClick={handleAddNew}>
                                    <Plus size={18} /> Create Bill
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="PBILL-tracker-card">
                        <div className="PBILL-tracker-wrapper">
                            {purchaseProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`PBILL-tracker-step ${step.status}`}>
                                        <div className="PBILL-step-icon-box">
                                            <step.icon size={20} />
                                        </div>
                                        <span className="PBILL-step-label">{step.label}</span>
                                    </div>
                                    {index < purchaseProcess.length - 1 && (
                                        <div className={`PBILL-tracker-divider ${purchaseProcess[index + 1].status !== 'pending' ? 'active' : ''}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="PBILL-table-card">
                        <div className="PBILL-table-controls">
                            <div className="PBILL-search-wrapper">
                                <Search className="PBILL-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by ID, PO or Vendor..."
                                    className="PBILL-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="PBILL-date-filters">
                                <div className="PBILL-filter-group">
                                    <label>From:</label>
                                    <input
                                        type="date"
                                        className="PBILL-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="PBILL-filter-group">
                                    <label>To:</label>
                                    <input
                                        type="date"
                                        className="PBILL-date-input"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                {(searchTerm || startDate || endDate) && (
                                    <button
                                        className="PBILL-clear-btn"
                                        onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="PBILL-table-container">
                            <table className="PBILL-table">
                                <thead>
                                    <tr>
                                        <th>BILL ID</th>
                                        <th>PO REF</th>
                                        <th>VENDOR</th>
                                        <th>DATE</th>
                                        <th>DUE DATE</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const groupedMap = {};

                                        bills.filter(b => {
                                            const query = searchTerm.toLowerCase();
                                            const billNo = (b.billNumber || '').toLowerCase();
                                            const vendorName = (b.vendor?.name || '').toLowerCase();
                                            const matchesSearch = !query || billNo.includes(query) || vendorName.includes(query);

                                            const bDate = new Date(b.date);
                                            const start = startDate ? new Date(startDate) : null;
                                            const end = endDate ? new Date(endDate) : null;
                                            if (start) start.setHours(0, 0, 0, 0);
                                            if (end) end.setHours(23, 59, 59, 999);
                                            const matchesDate = (!start || bDate >= start) && (!end || bDate <= end);

                                            return matchesSearch && matchesDate;
                                        }).forEach(b => {
                                            const key = `VENDOR-${b.vendorId}`;
                                            if (!groupedMap[key]) {
                                                groupedMap[key] = {
                                                    id: key,
                                                    vendor: b.vendor,
                                                    bills: [],
                                                    returns: [],
                                                    totalBillAmount: 0,
                                                    totalReturnAmount: 0,
                                                    balanceAmount: 0,
                                                    earliestDate: b.date,
                                                    latestDueDate: b.dueDate
                                                };
                                            }
                                            const rate = getSyncRate(b.currency || 'USD', companySettings?.currency || 'INR');
                                            groupedMap[key].bills.push(b);
                                            groupedMap[key].totalBillAmount += b.totalAmount * rate;
                                            groupedMap[key].balanceAmount += b.balanceAmount * rate;

                                            const curr = b.currency || companySettings?.currency || 'INR';
                                            if (!groupedMap[key].currencyTotals) {
                                                groupedMap[key].currencyTotals = {};
                                            }
                                            if (!groupedMap[key].currencyTotals[curr]) {
                                                groupedMap[key].currencyTotals[curr] = 0;
                                            }
                                            groupedMap[key].currencyTotals[curr] += b.balanceAmount;

                                            if (b.purchasereturn) {
                                                b.purchasereturn.forEach(ret => {
                                                    groupedMap[key].returns.push(ret);
                                                    const retRate = getSyncRate(ret.currency || b.currency || 'USD', companySettings?.currency || 'INR');
                                                    groupedMap[key].totalReturnAmount += (ret.totalAmount || 0) * retRate;
                                                });
                                            }

                                            if (new Date(b.date) < new Date(groupedMap[key].earliestDate)) groupedMap[key].earliestDate = b.date;
                                            if (b.dueDate && (!groupedMap[key].latestDueDate || new Date(b.dueDate) > new Date(groupedMap[key].latestDueDate))) {
                                                groupedMap[key].latestDueDate = b.dueDate;
                                            }
                                        });

                                        if (Object.keys(groupedMap).length === 0) {
                                            return <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>No records found</td></tr>;
                                        }

                                        return Object.values(groupedMap).map(group => (
                                            <React.Fragment key={group.id}>
                                                <tr className="PBILL-group-row">
                                                    <td className="px-4 py-3">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button
                                                                className={`PBILL-toggle-btn ${expandedGroups[group.id] ? 'expanded' : ''}`}
                                                                onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.2s', transform: expandedGroups[group.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                                            >
                                                                <ChevronDown size={14} />
                                                            </button>
                                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                                                <span className="font-bold text-blue-600">
                                                                    {group.vendor?.name}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                                                                    ({group.bills.length} Total Bills)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>-</td>
                                                    <td>{group.vendor?.name}</td>
                                                    <td>{new Date(group.earliestDate).toLocaleDateString()}</td>
                                                    <td> {group.latestDueDate ? new Date(group.latestDueDate).toLocaleDateString() : 'N/A'}</td>
                                                    <td className="font-bold">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {(() => {
                                                                const currs = Object.keys(group.currencyTotals || {});
                                                                const baseCurr = companySettings?.currency || 'INR';
                                                                if (currs.length === 1) {
                                                                    const curr = currs[0];
                                                                    const originalAmount = group.currencyTotals[curr];
                                                                    if (curr !== baseCurr) {
                                                                        return (
                                                                            <span>
                                                                                {formatDocCurrency(originalAmount, curr)}
                                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b', marginLeft: '6px' }}>
                                                                                    ({formatDocCurrency(group.balanceAmount, baseCurr)})
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    }
                                                                } else if (currs.length > 1) {
                                                                    return (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            {currs.map(curr => (
                                                                                <span key={curr} style={{ fontSize: '0.85rem', color: '#475569' }}>
                                                                                    {formatDocCurrency(group.currencyTotals[curr], curr)}
                                                                                </span>
                                                                            ))}
                                                                            <span style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '2px', marginTop: '2px' }}>
                                                                                Total: {formatDocCurrency(group.balanceAmount, baseCurr)}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return <span>{formatCurrency(group.balanceAmount)}</span>;
                                                            })()}
                                                            {group.totalReturnAmount > 0 && (
                                                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                                                    Return Impact: -{formatCurrency(group.totalReturnAmount)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {group.bills.length === 1 ? (
                                                            <select
                                                                value={group.bills[0].manualStatus ? group.bills[0].status : 'AUTO'}
                                                                onChange={(e) => handleStatusChange(group.bills[0].id, e.target.value)}
                                                                className="PBILL-status-pill"
                                                                style={getStatusStyle(group.bills[0].manualStatus ? group.bills[0].status : 'AUTO')}
                                                            >
                                                                <option value="AUTO">Auto ({group.bills[0].status})</option>
                                                                <option value="UNPAID">UNPAID</option>
                                                                <option value="PARTIAL">PARTIAL</option>
                                                                <option value="PAID">PAID</option>
                                                                <option value="OVERDUE">OVERDUE</option>
                                                                <option value="CANCELLED">CANCELLED</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`PBILL-status-pill ${group.balanceAmount === 0 ? 'paid' : 'pending'}`}>
                                                                {group.balanceAmount === 0 ? 'Paid' : 'Vendor Account'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="PBILL-action-group">
                                                            <button className="PBILL-btn-icon view" onClick={() => handleVendorView(group)} title="View Vendor Statement"><Eye size={16} /></button>
                                                            {hasPermission('edit purchase bill') && (
                                                                <button className="PBILL-btn-icon edit" onClick={() => handleEdit(group.bills[0].id)} title="Quick Edit First"><Pencil size={16} /></button>
                                                            )}
                                                            {(group.bills[0].paidAmount > 0 || group.bills[0].status === 'PAID' || group.bills[0].status === 'PARTIAL') && hasPermission('edit purchase bill') && (
                                                                <button
                                                                    className="PBILL-btn-icon"
                                                                    onClick={() => handleUnpay(group.bills[0])}
                                                                    title="Mark as Unpaid & Revert Payments"
                                                                    style={{ color: '#ef4444' }}
                                                                >
                                                                    <RotateCcw size={16} />
                                                                </button>
                                                            )}
                                                            {hasPermission('delete purchase bill') && (
                                                                <button className="PBILL-btn-icon delete" onClick={() => handleDelete(group.bills[0].id)} title="Quick Delete First"><Trash2 size={16} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {expandedGroups[group.id] && (
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '0', backgroundColor: '#ffffff' }}>
                                                            <div style={{ padding: '20px 30px' }}>
                                                                <div className="PBILL-sub-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                        <thead style={{ background: '#f8fafc' }}>
                                                                            <tr>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '10%' }}>TYPE</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '15%' }}>DOC #</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '15%' }}>DATE</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '15%' }}>TOTAL</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '15%' }}>DUE</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '20%' }}>STATUS</th>
                                                                                <th style={{ padding: '10px', fontSize: '0.75rem', textAlign: 'left', width: '10%' }}>ACTION</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {group.bills.map(pb => {
                                                                                const subRate = getSyncRate(pb.currency || 'USD', companySettings?.currency || 'INR');
                                                                                return (
                                                                                    <tr key={`pb-${pb.id}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#64748b' }}>BILL</td>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{pb.billNumber}</td>
                                                                                        <td style={{ padding: '10px' }}>{new Date(pb.date).toLocaleDateString()}</td>
                                                                                        <td style={{ padding: '10px' }}>
                                                                                            {formatDocCurrency(pb.totalAmount, pb.currency)}
                                                                                            {pb.currency && pb.currency !== (companySettings?.currency || 'INR') && (
                                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                    ({formatDocCurrency(pb.totalAmount * subRate, companySettings?.currency || 'INR')})
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                                                                            {formatDocCurrency(pb.balanceAmount, pb.currency)}
                                                                                            {pb.currency && pb.currency !== (companySettings?.currency || 'INR') && (
                                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                    ({formatDocCurrency(pb.balanceAmount * subRate, companySettings?.currency || 'INR')})
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px' }}>
                                                                                            <select
                                                                                                value={pb.manualStatus ? pb.status : 'AUTO'}
                                                                                                onChange={(e) => handleStatusChange(pb.id, e.target.value)}
                                                                                                className="PBILL-status-pill"
                                                                                                style={getStatusStyle(pb.manualStatus ? pb.status : 'AUTO')}
                                                                                            >
                                                                                                <option value="AUTO">Auto ({pb.status})</option>
                                                                                                <option value="UNPAID">UNPAID</option>
                                                                                                <option value="PARTIAL">PARTIAL</option>
                                                                                                <option value="PAID">PAID</option>
                                                                                                <option value="OVERDUE">OVERDUE</option>
                                                                                                <option value="CANCELLED">CANCELLED</option>
                                                                                            </select>
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                                                                            <div className="PBILL-action-group" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                                                                                {pb.balanceAmount > 0 && hasPermission('create purchase payment') && (
                                                                                                    <button
                                                                                                        className="PBILL-btn-icon"
                                                                                                        style={{
                                                                                                            display: 'inline-flex',
                                                                                                            alignItems: 'center',
                                                                                                            justifyContent: 'center',
                                                                                                            width: '28px',
                                                                                                            height: '28px',
                                                                                                            borderRadius: '6px',
                                                                                                            border: '1px solid #334155',
                                                                                                            color: '#334155',
                                                                                                            background: 'transparent',
                                                                                                            cursor: 'pointer',
                                                                                                            transition: 'all 0.2s'
                                                                                                        }}
                                                                                                        onClick={() => handleMakePayment(pb)}
                                                                                                        title="Record Payment"
                                                                                                    >
                                                                                                        <CreditCard size={14} />
                                                                                                    </button>
                                                                                                )}
                                                                                                <button className="PBILL-btn-icon view" onClick={() => handleView(pb)}><Eye size={14} /></button>
                                                                                                {hasPermission('edit purchase bill') && (
                                                                                                    <button className="PBILL-btn-icon edit" onClick={() => handleEdit(pb.id)}><Pencil size={14} /></button>
                                                                                                )}
                                                                                                {(pb.paidAmount > 0 || pb.status === 'PAID' || pb.status === 'PARTIAL') && hasPermission('edit purchase bill') && (
                                                                                                    <button
                                                                                                        className="PBILL-btn-icon"
                                                                                                        onClick={() => handleUnpay(pb)}
                                                                                                        title="Mark as Unpaid & Revert Payments"
                                                                                                        style={{ color: '#ef4444' }}
                                                                                                    >
                                                                                                        <RotateCcw size={14} />
                                                                                                    </button>
                                                                                                )}
                                                                                                {hasPermission('delete purchase bill') && (
                                                                                                    <button className="PBILL-btn-icon delete" onClick={() => handleDelete(pb.id)}><Trash2 size={14} /></button>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                            {group.returns.map(pr => (
                                                                                <tr key={`pr-${pr.id}`} style={{ borderTop: '1px solid #f1f5f9', background: '#fff1f2' }}>
                                                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#be123c' }}>RETURN</td>
                                                                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{pr.returnNumber}</td>
                                                                                    <td style={{ padding: '10px' }}>{new Date(pr.date).toLocaleDateString()}</td>
                                                                                    <td style={{ padding: '10px', color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(pr.totalAmount)}</td>
                                                                                    <td style={{ padding: '10px' }}>-</td>
                                                                                    <td style={{ padding: '10px' }}><span className="PBILL-status-pill" style={{ background: '#be123c', color: 'white' }}>Credited</span></td>
                                                                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                                                                        <button className="PBILL-btn-icon view" onClick={() => handleView(pr)}><Eye size={14} /></button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Premium Create Full Page View */}
            {showAddModal && !isViewMode && (
                <div className="PBILL-bill-full-page-create">
                    <div className="PBILL-view-page-header PBILL-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {companyDetails.logo && (
                                    <img src={companyDetails.logo} alt="Company Logo" className="PBILL-modal-logo-img" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {editingId ? 'Edit Purchase Bill' : 'New Purchase Bill'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div>
                            <button className="PBILL-btn-back" onClick={() => { setShowAddModal(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Bills
                            </button>
                        </div>
                    </div>

                    <div className="PBILL-modal-content PBILL-invoice-form-modal">
                        <div className="PBILL-modal-body-scrollable">
                            {/* Optional Fields Toggle Bar */}
                            <div style={{
                                display: 'flex',
                                gap: '16px',
                                marginBottom: '12px',
                                padding: '8px 12px',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Optional Fields:</span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={showSalespersonField} onChange={(e) => setShowSalespersonField(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#1e293b' }} />
                                    Show Agent / Salesperson
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={showCurrencyField} onChange={(e) => setShowCurrencyField(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#1e293b' }} />
                                    Show Currency
                                </label>
                            </div>

                            {/* 2-Column Voucher Header Grid */}
                            <div className="PBILL-voucher-header-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(240px, 300px) minmax(240px, 300px)',
                                justifyContent: 'space-between',
                                gap: '3rem',
                                background: '#ffffff',
                                padding: '18px 24px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                marginBottom: '50px'
                            }}>
                                {/* LEFT COLUMN */}
                                <div className="PBILL-header-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>BILL NUMBER *</label>
                                        <input type="text"
                                            value={billMeta.manualNo}
                                            onChange={(e) => setBillMeta({ ...billMeta, manualNo: e.target.value })}
                                            placeholder="Bill Number"
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="PBILL-compact-input" />
                                    </div>

                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>MANUAL REF</label>
                                        <input type="text"
                                            value={manualReference}
                                            onChange={(e) => setManualReference(e.target.value)}
                                            placeholder="e.g. REF-001"
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="PBILL-compact-input" />
                                    </div>

                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DATE</label>
                                        <input type="date"
                                            value={billMeta.date} onChange={(e) => {
                                                const newDate = e.target.value;
                                                const newDueDate = calculateDueDate(newDate, selectedVendorCreditPeriod);
                                                setBillMeta({ ...billMeta, date: newDate, dueDate: newDueDate });
                                            }}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="PBILL-compact-input" />
                                    </div>

                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>VENDOR / CASH *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '280px' }}>
                                            <select className="PBILL-compact-select-large" style={{ flex: 1, height: '34px' }} value={vendorId} onChange={async (e) => {
                                                const vId = e.target.value;
                                                setVendorId(vId);
                                                if (!vId) {
                                                    setSelectedVendorCreditPeriod(0);
                                                    setAvailablePayments([]);
                                                    setAdjustments([]);
                                                    return;
                                                }
                                                const vendorObj = vendors.find(v => v.id == vId);
                                                const creditDays = vendorObj?.creditPeriod || 0;
                                                setSelectedVendorCreditPeriod(creditDays);

                                                const newDueDate = calculateDueDate(billMeta.date, creditDays);
                                                setBillMeta(prev => ({ ...prev, dueDate: newDueDate }));
                                                await fetchVendorPayments(vId);
                                            }} disabled={!!sourceData}>
                                                <option value="">Choose a Vendor...</option>
                                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            {creationMode === 'direct' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddVendorModal(true)}
                                                    title="Add New Vendor"
                                                    style={{
                                                        backgroundColor: '#1e293b',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '0',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '34px',
                                                        width: '34px',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="PBILL-header-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                                    {showSalespersonField && (
                                        <div className="PBILL-meta-col">
                                            <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>AGENT / SALESPERSON</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '280px' }}>
                                                <SearchableSelect
                                                    options={salespersonsList}
                                                    value={salespersonId}
                                                    onChange={(val) => setSalespersonId(val)}
                                                    onDeleteOption={handleDeleteSalesperson}
                                                    placeholder="-- Select Agent --"
                                                    groupKey=""
                                                    clearable={true}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSalespersonFormData({ name: '', phone: '', email: '' });
                                                        setShowAddSalespersonModal(true);
                                                    }}
                                                    style={{
                                                        backgroundColor: '#1e293b',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '0',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '34px',
                                                        width: '34px',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DUE DATE</label>
                                        <input type="date"
                                            value={billMeta.dueDate} onChange={(e) => setBillMeta({ ...billMeta, dueDate: e.target.value })}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="PBILL-compact-input" />
                                    </div>

                                    {showCurrencyField && (
                                        <>
                                            <div className="PBILL-meta-col">
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>CURRENCY</label>
                                                <select
                                                    value={selectedCurrency}
                                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                                    style={{ width: '100%', maxWidth: '280px' }}
                                                    className="PBILL-compact-select"
                                                >
                                                    {availableCurrencies.map((curr) => (
                                                        <option key={curr.code} value={curr.code}>
                                                            {curr.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedCurrency !== (companySettings?.currency || 'INR') && (
                                                <div className="PBILL-meta-col">
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>EXCHANGE RATE</label>
                                                    <input type="number"
                                                        step="0.0001"
                                                        value={exchangeRate}
                                                        onChange={(e) => setExchangeRate(e.target.value)}
                                                        style={{ width: '100%', maxWidth: '280px' }}
                                                        className="PBILL-compact-input" />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {!shippingSameAsBilling && vendorShippingAddresses.length > 0 && (
                                        <div className="PBILL-meta-col">
                                            <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>SHIPPING ADDRESS</label>
                                            <select
                                                className="PBILL-mini-select"
                                                style={{ width: '100%', maxWidth: '280px', height: '34px' }}
                                                onChange={(e) => {
                                                    const addrId = e.target.value;
                                                    if (!addrId) return;
                                                    const addr = vendorShippingAddresses.find(a => a.id === parseInt(addrId));
                                                    if (addr) {
                                                        setShippingAddress({
                                                            name: addr.name || '',
                                                            address: addr.address || '',
                                                            city: addr.city || '',
                                                            state: addr.state || '',
                                                            zipCode: addr.zipCode || '',
                                                            country: addr.country || ''
                                                        });
                                                    }
                                                }}
                                            >
                                                <option value="">Choose Shipping Address...</option>
                                                {vendorShippingAddresses.map(addr => (
                                                    <option key={addr.id} value={addr.id}>
                                                        {addr.name} {addr.city ? `- ${addr.city}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Fields Section */}
                            {getCustomFieldsForType('purchasebill').length > 0 && (
                                <div className="PBILL-custom-fields-section-compact">
                                    <h4 className="PBILL-compact-section-header">Custom Fields</h4>
                                    <div className="PBILL-custom-fields-grid-compact">
                                        {getCustomFieldsForType('purchasebill').map(field => (
                                            <div key={field.id} className="flex flex-col gap-0.5">
                                                <label className="PBILL-mini-label">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        value={customFieldValues[field.label] || ''}
                                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                        className="PBILL-compact-select"
                                                        required={field.required}
                                                    >
                                                        <option value="">Select...</option>
                                                        {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        placeholder={`Enter ${field.label}`}
                                                        value={customFieldValues[field.label] || ''}
                                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                        className="PBILL-compact-input"
                                                        required={field.required}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items Table Section Header */}
                            <div className="PBILL-items-section-compact" style={{ marginBottom: '50px' }}>
                                <div className="PBILL-items-header-compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '320px' }}>
                                        <h4 className="PBILL-compact-section-header m-0" style={{ whiteSpace: 'nowrap' }}>Line Items</h4>
                                        <div style={{ flex: 1, maxWidth: '300px' }}>
                                            <SearchableSelect
                                                options={products.map(p => ({
                                                    ...p,
                                                    id: String(p.id),
                                                    name: `${p.name} (Stock: ${p.totalQuantity ?? 0})`
                                                }))}
                                                value=""
                                                onChange={(val) => {
                                                    if (val) {
                                                        const p = products.find(x => String(x.id) === String(val));
                                                        if (p) {
                                                            let autoWarehouseId = '';
                                                            if (p.stock && p.stock.length > 0) {
                                                                const bestStock = p.stock.filter(s => s.quantity > 0).sort((a, b) => b.quantity - a.quantity)[0];
                                                                if (bestStock) autoWarehouseId = String(bestStock.warehouseId);
                                                                else if (p.stock[0]) autoWarehouseId = String(p.stock[0].warehouseId);
                                                            }
                                                            const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                                                            const convertedPrice = p.purchasePrice ? (p.purchasePrice / conversionRate) : 0;
                                                            const newItem = {
                                                                id: Date.now() + Math.random(),
                                                                productId: String(p.id),
                                                                warehouseId: autoWarehouseId,
                                                                qty: 1,
                                                                uomId: p.purchaseUomId || p.uomId || '',
                                                                rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                tax: p.taxRate || 0,
                                                                discount: 0,
                                                                total: Number((convertedPrice + ((convertedPrice * (p.taxRate || 0)) / 100)).toFixed(2)) || 0,
                                                                description: p.description || p.name
                                                            };
                                                            setItems(prev => {
                                                                const last = prev[prev.length - 1];
                                                                if (last && !last.productId) {
                                                                    return prev.map((it, idx) => idx === prev.length - 1 ? { ...it, ...newItem, id: it.id } : it);
                                                                }
                                                                return [...prev, newItem];
                                                            });
                                                        }
                                                    }
                                                }}
                                                placeholder="Type item name/SKU & press Enter..."
                                                searchPlaceholder="Search product..."
                                                labelKey="name"
                                                valueKey="id"
                                                groupKey=""
                                                clearable={true}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductWarehouseRows(warehouses.map(wh => ({
                                                    id: wh.id,
                                                    warehouseId: wh.id,
                                                    quantity: 0,
                                                    minOrderQty: 0,
                                                    initialQty: 0
                                                })));
                                                setShowAddProductModal(true);
                                            }}
                                            title="Add Product"
                                            style={{
                                                backgroundColor: '#1e293b',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '34px',
                                                width: '34px',
                                                minWidth: '34px',
                                                flexShrink: 0,
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <Plus size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                                <div className="PBILL-table-responsive-compact">
                                    <table className="PBILL-compact-items-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '34%' }}>{getTableHeader('item', 'Item Details').toUpperCase()}</th>
                                                {getInvoiceLabel('showWarehouse') !== false && <th style={{ width: '13%' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                {getInvoiceLabel('showQty') !== false && <th style={{ width: '8%', textAlign: 'center' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                                {getInvoiceLabel('showQty') !== false && <th style={{ width: '8%' }}>{getTableHeader('uom', 'UoM').toUpperCase()}</th>}
                                                {getInvoiceLabel('showRate') !== false && <th style={{ width: '9%', textAlign: 'right' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                                {getInvoiceLabel('showTax') !== false && <th style={{ width: '7%', textAlign: 'center' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                                {getInvoiceLabel('showDiscount') !== false && <th style={{ width: '7%', textAlign: 'right' }}>{getTableHeader('discount', 'Disc.').toUpperCase()}</th>}
                                                <th style={{ width: '11%', textAlign: 'right' }}>{getTableHeader('price', 'Amount').toUpperCase()}</th>
                                                <th style={{ width: '3%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <SearchableSelect
                                                            options={products.map(p => ({
                                                                ...p,
                                                                id: String(p.id),
                                                                name: `${p.name} (${p.totalQuantity ?? 0})`
                                                            }))}
                                                            value={item.productId ? String(item.productId) : ''}
                                                            onChange={(val) => updateItem(item.id, 'productId', val)}
                                                            placeholder="Select Product..."
                                                            searchPlaceholder="Search product..."
                                                            labelKey="name"
                                                            valueKey="id"
                                                            groupKey=""
                                                            clearable={false}
                                                            onEnterPress={() => handleAutoAddNextRow(item.id)}
                                                        />
                                                    </td>
                                                    {getInvoiceLabel('showWarehouse') !== false && (
                                                        <td>
                                                            <SearchableSelect
                                                                options={warehouses.map(w => {
                                                                    const prod = products.find(p => p.id === parseInt(item.productId));
                                                                    const stockItem = prod?.stock?.find(s => Number(s.warehouseId) === Number(w.id));
                                                                    const count = stockItem ? stockItem.quantity : 0;
                                                                    return {
                                                                        id: String(w.id),
                                                                        name: `${w.name} (${count})`
                                                                    };
                                                                })}
                                                                value={item.warehouseId ? String(item.warehouseId) : ''}
                                                                onChange={(val) => updateItem(item.id, 'warehouseId', val)}
                                                                placeholder="Select Warehouse..."
                                                                searchPlaceholder="Search warehouse..."
                                                                labelKey="name"
                                                                valueKey="id"
                                                                groupKey=""
                                                                disabled={!!linkedSource?.grnId}
                                                                clearable={false}
                                                            />
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showQty') !== false && (
                                                        <td>
                                                            <input type="number" className="PBILL-compact-input text-center" value={item.qty}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'qty', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showQty') !== false && (
                                                        <td>
                                                            {item.productId ? (
                                                                <select disabled className="PBILL-compact-select" value={item.uomId} onChange={(e) => updateItem(item.id, 'uomId', e.target.value)}>
                                                                    <option value="">Select UOM...</option>
                                                                    {allUoms
                                                                        .filter(u => {
                                                                            const prod = products.find(p => p.id === parseInt(item.productId));
                                                                            return u.category === prod?.uom?.category || u.baseUnitId === prod?.uomId;
                                                                        })
                                                                        .map(u => (
                                                                            <option key={u.id} value={u.id}>
                                                                                {u.unitName}
                                                                            </option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs flex justify-center items-center h-full">N/A</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showRate') !== false && (
                                                        <td>
                                                            <input type="number" className="PBILL-compact-input text-right" value={item.rate}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'rate', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showTax') !== false && (
                                                        <td>
                                                            <input type="number" className="PBILL-compact-input text-center" value={item.tax}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'tax', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showDiscount') !== false && (
                                                        <td>
                                                            <input type="number" className="PBILL-compact-input text-right" value={item.discount}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'discount', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}
                                                    <td>
                                                        <input type="text" className="PBILL-compact-input PBILL-disabled text-right" value={formatDocCurrency(item.total, selectedCurrency)} readOnly />
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="PBILL-btn-delete-row-compact" onClick={() => removeItem(item.id)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer Toolbar / Section for Other Charges & Dispatch Details */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                marginTop: '16px',
                                marginBottom: '50px',
                                background: '#ffffff',
                                padding: '14px 18px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {/* Checkboxes row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={showOtherCharges}
                                            onChange={(e) => {
                                                setShowOtherCharges(e.target.checked);
                                                if (e.target.checked && otherCharges.length === 0) {
                                                    setOtherCharges([{ id: Date.now(), accountId: '', accountName: '', chargeType: 'fixed', value: '', amount: '' }]);
                                                }
                                            }}
                                            style={{ accentColor: '#1e293b', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Other Charges
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={showDeliveryFields}
                                            onChange={(e) => setShowDeliveryFields(e.target.checked)}
                                            style={{ accentColor: '#1e293b', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Dispatch / Delivery Details
                                    </label>
                                </div>

                                {/* OTHER CHARGES PANEL */}
                                {showOtherCharges && (
                                    <div style={{
                                        padding: '10px 14px',
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' }}>Other Charges</span>
                                            <button
                                                type="button"
                                                onClick={() => setOtherCharges(prev => [...prev, { id: Date.now(), accountId: '', accountName: '', chargeType: 'fixed', value: '', amount: '' }])}
                                                style={{
                                                    background: '#334155', color: '#fff', border: 'none',
                                                    borderRadius: '4px', padding: '3px 10px',
                                                    fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
                                                + Add Charge
                                            </button>
                                        </div>
                                        {otherCharges.map((charge, idx) => {
                                            const isPct = charge.chargeType === 'percentage' || charge.type === 'percentage';
                                            const rawVal = parseFloat(charge.value !== undefined ? charge.value : charge.amount) || 0;
                                            const netBase = Math.max(0, totals.total - (totals.otherChargesTotal || 0));
                                            const computedPreview = isPct ? (netBase * rawVal) / 100 : rawVal;

                                            return (
                                                <div key={charge.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <select
                                                        value={charge.accountId}
                                                        onChange={(e) => {
                                                            const sel = otherChargesAccounts.find(a => String(a.id) === String(e.target.value));
                                                            setOtherCharges(prev => prev.map((c, i) => i === idx
                                                                ? { ...c, accountId: e.target.value, accountName: sel ? sel.name : '' }
                                                                : c
                                                            ));
                                                        }}
                                                        style={{ flex: 2, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '0.78rem', background: '#fff', color: '#1e293b' }}
                                                    >
                                                        <option value="">-- Select Account --</option>
                                                        {otherChargesAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </select>

                                                    <select
                                                        value={charge.chargeType || (charge.type === 'percentage' ? 'percentage' : 'fixed')}
                                                        onChange={(e) => {
                                                            const newType = e.target.value;
                                                            setOtherCharges(prev => prev.map((c, i) => i === idx
                                                                ? { ...c, chargeType: newType }
                                                                : c
                                                            ));
                                                        }}
                                                        style={{ width: '95px', padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '0.78rem', background: '#fff', color: '#1e293b', fontWeight: '600' }}
                                                    >
                                                        <option value="fixed">Fixed</option>
                                                        <option value="percentage">%</option>
                                                    </select>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        placeholder={isPct ? "% Value" : "Amount"}
                                                        value={charge.value !== undefined ? charge.value : (charge.amount || '')}
                                                        onChange={(e) => {
                                                            const valStr = e.target.value;
                                                            setOtherCharges(prev => prev.map((c, i) => i === idx
                                                                ? { ...c, value: valStr, amount: valStr }
                                                                : c
                                                            ));
                                                        }}
                                                        style={{ flex: 1, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '5px', fontSize: '0.78rem', background: '#fff', color: '#1e293b', textAlign: 'right' }}
                                                    />

                                                    {isPct && (
                                                        <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', minWidth: '70px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                            ({formatDocCurrency(computedPreview, selectedCurrency)})
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setOtherCharges(prev => prev.filter((_, i) => i !== idx))}
                                                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', padding: '5px 9px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* DISPATCH / DELIVERY DETAILS PANEL */}
                                {showDeliveryFields && (
                                    <div style={{
                                        padding: '12px 14px',
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px'
                                    }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Dispatch / Delivery Details</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Driver / Delivery Person</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <SearchableSelect
                                                        options={deliverypersonsList}
                                                        value={selectedDeliveryPersonId}
                                                        onChange={handleDeliveryPersonChange}
                                                        onDeleteOption={handleDeleteDeliveryPerson}
                                                        placeholder="-- Select Delivery Person --"
                                                        groupKey=""
                                                        clearable={true}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDeliverypersonFormData({ name: '', phone: '', email: '' });
                                                            setShowAddDeliveryPersonModal(true);
                                                        }}
                                                        style={{
                                                            backgroundColor: '#1e293b', color: '#ffffff', border: 'none',
                                                            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            height: '34px', width: '34px', minWidth: '34px'
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Mobile / Phone</label>
                                                <input
                                                    type="text"
                                                    value={billMeta.deliveryPersonMobile || ''}
                                                    onChange={(e) => setBillMeta({ ...billMeta, deliveryPersonMobile: e.target.value })}
                                                    placeholder="Driver Phone"
                                                    className="PBILL-compact-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Email</label>
                                                <input
                                                    type="text"
                                                    value={billMeta.deliveryPersonEmail || ''}
                                                    onChange={(e) => setBillMeta({ ...billMeta, deliveryPersonEmail: e.target.value })}
                                                    placeholder="Driver Email"
                                                    className="PBILL-compact-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Car / Gaadi Number</label>
                                                <input
                                                    type="text"
                                                    value={carNumber}
                                                    onChange={(e) => setCarNumber(e.target.value)}
                                                    placeholder="e.g. MH-12-AB-1234"
                                                    className="PBILL-compact-input"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Grid containing Bank Details, Notes & Totals side-by-side */}
                            <div className="PBILL-compact-footer-grid">
                                <div className="PBILL-compact-footer-col">
                                    <h4 className="PBILL-compact-section-header">Bank Details &amp; Attachments</h4>
                                    <div className="PBILL-compact-bank-details">
                                        <input type="text" className="PBILL-compact-input mb-1" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                                        <input type="text" className="PBILL-compact-input mb-1" placeholder="Account No" value={bankDetails.accountNo} onChange={(e) => setBankDetails({ ...bankDetails, accountNo: e.target.value })} />
                                        <input type="text" className="PBILL-compact-input mb-1" placeholder="Account Holder" value={bankDetails.accountName} onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })} />
                                        <input type="text" className="PBILL-compact-input" placeholder="IFSC / Swift" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="file"
                                            ref={photoInputRef}
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleAttachmentUpload(e, 'photo')}
                                        />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleAttachmentUpload(e, 'file')}
                                        />
                                        <button
                                            type="button"
                                            className="PBILL-btn-upload-small-compact flex-1"
                                            onClick={() => photoInputRef.current?.click()}
                                            disabled={uploadingPhotos}
                                        >
                                            <span>📷</span> {uploadingPhotos ? 'Uploading...' : 'Photos'}
                                        </button>
                                        <button
                                            type="button"
                                            className="PBILL-btn-upload-small-compact flex-1"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingFiles}
                                        >
                                            <span>📎</span> {uploadingFiles ? 'Uploading...' : 'Files'}
                                        </button>
                                    </div>
                                    {/* Uploaded attachments list */}
                                    {(selectedPhotos.length > 0 || selectedFiles.length > 0) && (
                                        <div className="PBILL-attachments-list mt-2 flex flex-col gap-1" style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px', background: '#f8fafc' }}>
                                            {selectedPhotos.map((item, idx) => (
                                                <div key={`photo-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '2px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                                        <span style={{ fontSize: '10px' }}>🖼️</span>
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '11px', fontWeight: '500' }} title={item.name}>{item.name}</a>
                                                    </div>
                                                    <button type="button" onClick={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>×</button>
                                                </div>
                                            ))}
                                            {selectedFiles.map((item, idx) => (
                                                <div key={`file-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '2px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                                        <span style={{ fontSize: '10px' }}>📎</span>
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '11px', fontWeight: '500' }} title={item.name}>{item.name}</a>
                                                    </div>
                                                    <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="PBILL-compact-footer-col">
                                    <h4 className="PBILL-compact-section-header">Notes &amp; Conditions</h4>
                                    <div className="PBILL-notes-terms-stack">
                                        <div>
                                            <label className="PBILL-mini-label mb-0.5">Notes</label>
                                            <textarea className="PBILL-compact-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter notes..."></textarea>
                                        </div>
                                        <div>
                                            <label className="PBILL-mini-label mb-0.5">Terms &amp; Conditions</label>
                                            <textarea className="PBILL-compact-textarea" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms & conditions..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="PBILL-compact-totals-box">
                                    <div className="PBILL-compact-totals-top">
                                        <div className="PBILL-compact-t-row">
                                            <span>Sub Total:</span>
                                            <span>{formatDocCurrency(totals.subTotal, selectedCurrency)}</span>
                                        </div>
                                        {showOtherCharges && otherCharges.filter(c => c.accountId && parseFloat(c.value !== undefined ? c.value : c.amount) > 0).map((charge) => {
                                            const isPct = charge.chargeType === 'percentage' || charge.type === 'percentage';
                                            const val = parseFloat(charge.value !== undefined ? charge.value : charge.amount) || 0;
                                            const netBase = Math.max(0, totals.total - (totals.otherChargesTotal || 0));
                                            const computedAmt = isPct ? (netBase * val) / 100 : val;
                                            return (
                                                <div className="PBILL-compact-t-row" key={charge.id} style={{ color: '#1e293b' }}>
                                                    <span>Other Charges{charge.accountName ? ` (${charge.accountName}${isPct ? ` - ${val}%` : ''})` : ''}:</span>
                                                    <span>+{formatDocCurrency(computedAmt, selectedCurrency)}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="PBILL-compact-t-row text-red-500">
                                            <span>Total Discount:</span>
                                            <span>-{formatDocCurrency(totals.discount, selectedCurrency)}</span>
                                        </div>
                                        <div className="PBILL-compact-t-row">
                                            <span>Tax Amount:</span>
                                            <span>{formatDocCurrency(totals.tax, selectedCurrency)}</span>
                                        </div>
                                        <div className="PBILL-compact-t-row PBILL-totals-discount-row">
                                            <div className="PBILL-totals-discount-label-row">
                                                <span>Overall Disc:</span>
                                                <div className="PBILL-compact-discount-input-group">
                                                    <input
                                                        type="number"
                                                        className="PBILL-compact-discount-number-input"
                                                        value={overallDiscount}
                                                        min="0"
                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                        onChange={(e) => setOverallDiscount(e.target.value.replace(/-/g, ''))}
                                                    />
                                                    <select
                                                        className="PBILL-compact-discount-type-select"
                                                        value={overallDiscountType}
                                                        onChange={(e) => setOverallDiscountType(e.target.value)}
                                                    >
                                                        <option value="percentage">%</option>
                                                        <option value="fixed">Amt</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <span className="text-red-500">-{formatDocCurrency(totals.ovDiscountAmt || 0, selectedCurrency)}</span>
                                        </div>
                                        {adjustments.reduce((sum, a) => sum + a.amount, 0) > 0 && (
                                            <div className="PBILL-compact-t-row text-green-600 font-semibold">
                                                <span>Credits Adjusted:</span>
                                                <span>-{formatDocCurrency(adjustments.reduce((sum, a) => sum + a.amount, 0), selectedCurrency)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="PBILL-compact-t-row PBILL-compact-total font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1 text-sm">
                                        <span>Grand Total:</span>
                                        <span>{formatDocCurrency(totals.total, selectedCurrency)}</span>
                                    </div>
                                    {adjustments.reduce((sum, a) => sum + a.amount, 0) > 0 && (
                                        <div className="PBILL-compact-t-row PBILL-compact-total font-bold text-red-500 border-t border-gray-200 pt-1 mt-1 text-sm">
                                            <span>Balance Due:</span>
                                            <span>{formatDocCurrency(Math.max(0, totals.total - adjustments.reduce((sum, a) => sum + a.amount, 0)), selectedCurrency)}</span>
                                        </div>
                                    )}
                                    {selectedCurrency !== (companySettings?.currency || 'INR') && (
                                        <div className="PBILL-compact-t-row text-xs text-gray-500 font-medium border-t border-gray-100">
                                            <span>Base Total ({companySettings?.currency || 'INR'}):</span>
                                            <span>{formatDocCurrency(totals.total * (parseFloat(exchangeRate) || 1.0), companySettings?.currency || 'INR')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="PBILL-form-actions">
                                <button className="PBILL-btn-cancel" onClick={() => setShowAddModal(false)}>Discard changes</button>
                                <button className="PBILL-btn-primary" onClick={() => handleSave(false)}>
                                    {editingId ? 'Update Bill' : 'Confirm & Save Bill'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDuplicateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '400px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        textAlign: 'center',
                        fontFamily: 'inherit'
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            marginBottom: '16px'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 'bold', color: '#1f2937' }}>
                            Duplicate Manual Number
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5' }}>
                            This is a duplicate manual number. Do you want to change it?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button
                                onClick={async () => {
                                    setShowDuplicateModal(false);
                                    await handleSave(true, duplicateRefToRetry);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: '#ffffff',
                                    color: '#374151',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => {
                                    setShowDuplicateModal(false);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#10b981',
                                    color: '#ffffff',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#334155'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Source Selection Modal */}
            {
                showSourceModal && (
                    <div className="PBILL-modal-overlay">
                        <div className="PBILL-source-modal">
                            <div className="PBILL-source-header">
                                <h2 className="PBILL-source-title">{sourceStep === 'type' ? 'Select Invoice Source' : (selectedSourceType === 'po' ? 'Pick a Purchase Order' : 'Pick a Goods Receipt')}</h2>
                                <button className="PBILL-close-btn" onClick={() => setShowSourceModal(false)}><X size={18} /></button>
                            </div>
                            <div className="PBILL-source-body">
                                {sourceStep === 'type' ? (
                                    <div className="PBILL-source-grid">
                                        <div className="PBILL-src-card PBILL-manual" onClick={() => handleSourceTypeSelect('manual')}>
                                            <div className="PBILL-src-icon"><FilePlus size={24} /></div>
                                            <div className="PBILL-src-text">
                                                <h4>Direct Billing</h4>
                                                <p>Create a bill from scratch manually</p>
                                            </div>
                                        </div>
                                        <div className="PBILL-src-card PBILL-po" onClick={() => handleSourceTypeSelect('po')}>
                                            <div className="PBILL-src-icon"><ShoppingCart size={24} /></div>
                                            <div className="PBILL-src-text">
                                                <h4>From Purchase Order</h4>
                                                <p>Pull details from an existing PO</p>
                                            </div>
                                        </div>
                                        <div className="PBILL-src-card PBILL-grn" onClick={() => handleSourceTypeSelect('grn')}>
                                            <div className="PBILL-src-icon"><Truck size={24} /></div>
                                            <div className="PBILL-src-text">
                                                <h4>From Goods Receipt</h4>
                                                <p>Pull details from received goods</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="PBILL-doc-list-wrapper">
                                        <div className="PBILL-source-filters flex gap-3 mb-4">
                                            <div className="PBILL-doc-search-mini flex-grow">
                                                <select
                                                    className="PBILL-vendor-filter-select w-full"
                                                    value={billFilterVendorId}
                                                    onChange={(e) => setBillFilterVendorId(e.target.value)}
                                                >
                                                    <option value="">All Vendors</option>
                                                    {vendors.map(v => {
                                                        const count = sourceDocs.filter(d => d.vendorId === v.id).length;
                                                        return (
                                                            <option key={v.id} value={v.id}>
                                                                {v.name} ({count} {selectedSourceType === 'po' ? 'Orders' : 'Receipts'})
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="PBILL-doc-search-mini flex-grow">
                                                <Search size={14} className="PBILL-doc-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by vendor, reference..."
                                                    value={sourceSearchTerm}
                                                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        {filteredSourceDocs.length === 0 ? (
                                            <div className="PBILL-empty-state">
                                                {sourceSearchTerm ? `No documents matching "${sourceSearchTerm}"` : 'No available documents found.'}
                                            </div>
                                        ) : (
                                            <div className="PBILL-doc-scroll">
                                                {filteredSourceDocs.map(doc => (
                                                    <div key={doc.id} className="PBILL-doc-item" onClick={() => handleSourceDocSelect(doc)}>
                                                        <div className="PBILL-doc-main">
                                                            <span className="PBILL-doc-ref">{doc.poNumber || doc.grnNumber || doc.billNumber || doc.id}</span>
                                                            <span className="PBILL-doc-date">{new Date(doc.createdAt || doc.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="PBILL-doc-sub">
                                                            <span>{doc.vendor?.name || 'Unknown Vendor'}</span>
                                                            <span className="PBILL-doc-price">{formatCurrency(doc.totalAmount || 0)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <button className="PBILL-back-link" onClick={() => {
                                            setSourceStep('type');
                                            setSourceSearchTerm('');
                                        }}>
                                            <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Selection
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="PBILL-modal-overlay">
                        <div className="PBILL-delete-card">
                            <div className="PBILL-delete-icon"><Trash2 size={32} /></div>
                            <h3>Permanently Delete Bill?</h3>
                            <p>This action will remove the record and cannot be reversed. Linked ledger entries will be updated accordingly.</p>
                            <div className="PBILL-delete-actions">
                                <button className="PBILL-btn-alt" onClick={() => setShowDeleteConfirm(false)}>Keep it</button>
                                <button className="PBILL-btn-danger" onClick={confirmDelete}>Yes, Delete Bill</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showUnpayModal && (
                    <div className="PBILL-modal-overlay">
                        <div className="PBILL-delete-card">
                            <div className="PBILL-delete-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><RotateCcw size={32} /></div>
                            <h3>Mark Bill as Unpaid?</h3>
                            <p>You are about to revert all payments for Purchase Bill #{billToUnpay?.billNumber || billToUnpay?.id}.</p>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.4' }}>
                                This will permanently delete associated payment transactions, revert ledger balances in your Chart of Accounts, and restore the vendor's balance.
                            </p>
                            <div className="PBILL-delete-actions">
                                <button className="PBILL-btn-alt" onClick={() => setShowUnpayModal(false)}>Cancel</button>
                                <button
                                    className="PBILL-btn-danger"
                                    onClick={confirmUnpay}
                                    style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                                >
                                    Revert & Unpaid
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Add New Vendor Modal */}
            {showAddVendorModal && (
                <div className="Vendors-modal-overlay" style={{ zIndex: 20000 }}>
                    <div className="Vendors-modal-content Vendors-modal-large" style={{ textAlign: 'left' }}>
                        <div className="Vendors-modal-header">
                            <h2 className="Vendors-modal-title">Add Vendor</h2>
                            <button className="Vendors-close-btn" onClick={() => setShowAddVendorModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleFullVendorSubmit}>
                            <div className="Vendors-modal-body">
                                {/* Basic Information */}
                                <div className="Vendors-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                                    <h3 className="Vendors-section-subtitle">Basic Information</h3>
                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Name (English) <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="name"
                                                value={vendorFormData.name}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter Name"
                                                required
                                            />
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Name (Arabic)</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="nameArabic"
                                                value={vendorFormData.nameArabic}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter Name (Arabic)"
                                            />
                                        </div>
                                    </div>

                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Company Name</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="companyName"
                                                value={vendorFormData.companyName}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter company name"
                                            />
                                        </div>
                                        <div className="Vendors-form-group Vendors-google-loc">
                                            <label className="Vendors-form-label">Company Google Location</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="companyLocation"
                                                value={vendorFormData.companyLocation}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter Google Maps link"
                                            />
                                        </div>
                                    </div>

                                    {/* File Uploads */}
                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-profile-img">
                                            <label className="Vendors-form-label">Profile Image</label>
                                            {vendorFormData.profileImage ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <img
                                                        src={vendorFormData.profileImage}
                                                        alt="Profile"
                                                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setVendorFormData(prev => ({ ...prev, profileImage: '' })); }}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        x Remove
                                                    </button>
                                                </div>
                                            ) : null}
                                            {!vendorFormData.profileImage && (
                                                <>
                                                    <input
                                                        type="file"
                                                        ref={profileImageRef}
                                                        accept="image/jpeg,image/png,image/jpg"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => handleVendorFileUpload(e.target.files[0], 'profileImage', 'vendors')}
                                                    />
                                                    <div className="Vendors-file-input-wrapper" onClick={() => profileImageRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                        <div className="Vendors-file-label">
                                                            <span className="Vendors-file-btn">{uploadingProfileImage ? 'Uploading...' : 'Choose File'}</span>
                                                            <span className="Vendors-file-name">{vendorFormData.profileImage ? 'Image uploaded ✓' : 'No file chosen'}</span>
                                                        </div>
                                                    </div>
                                                    <span className="Vendors-file-note">JPEG, PNG or JPG (max 5MB)</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="Vendors-form-group Vendors-any-file">
                                            <label className="Vendors-form-label">Any File</label>
                                            {vendorFormData.anyFile ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <a
                                                        href={vendorFormData.anyFile}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: '#2563eb', fontSize: '0.8rem', textDecoration: 'underline', wordBreak: 'break-all', maxWidth: '200px' }}
                                                    >
                                                        View File
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVendorFormData(prev => ({ ...prev, anyFile: '' }))}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        x Remove
                                                    </button>
                                                </div>
                                            ) : null}
                                            {!vendorFormData.anyFile && (
                                                <>
                                                    <input
                                                        type="file"
                                                        ref={anyFileRef}
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => handleVendorFileUpload(e.target.files[0], 'anyFile', 'vendors')}
                                                    />
                                                    <div className="Vendors-file-input-wrapper" onClick={() => anyFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                        <div className="Vendors-file-label">
                                                            <span className="Vendors-file-btn">{uploadingAnyFile ? 'Uploading...' : 'Choose File'}</span>
                                                            <span className="Vendors-file-name">{vendorFormData.anyFile ? 'File uploaded ✓' : 'No file chosen'}</span>
                                                        </div>
                                                    </div>
                                                    <span className="Vendors-file-note">Any file type. Max 10MB</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Account Information */}
                                <div className="Vendors-form-section">
                                    <h3 className="Vendors-section-subtitle">Account Information</h3>
                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Account Type <span className="Vendors-text-red">*</span></label>
                                            <select
                                                className="Vendors-form-select"
                                                name="accountType"
                                                value={vendorFormData.accountType}
                                                onChange={handleVendorInputChange}
                                            >
                                                {accountTypes
                                                    .flatMap(group => group.accounts)
                                                    .filter(acc => acc.accountTypeName === 'Accounts Payable')
                                                    .map((acc, j) => (
                                                        <option key={j} value={acc.accountTypeId}>{acc.accountTypeName}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Balance Type</label>
                                            <select
                                                className="Vendors-form-select"
                                                name="balanceType"
                                                value={vendorFormData.balanceType}
                                                onChange={handleVendorInputChange}
                                            >
                                                <option value="Credit">Credit</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <div className="Vendors-input-with-note">
                                                <label className="Vendors-form-label">Account Name <span className="Vendors-text-red">*</span></label>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    value={vendorFormData.name}
                                                    readOnly
                                                    disabled
                                                    style={{ backgroundColor: '#f3f4f6' }}
                                                />
                                                <span className="Vendors-input-note">This will auto-fill from selection above</span>
                                            </div>
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Account Balance <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="number"
                                                className="Vendors-form-input"
                                                name="accountBalance"
                                                value={vendorFormData.accountBalance}
                                                onChange={handleVendorInputChange}
                                                placeholder="0.00"
                                                min="0"
                                                onKeyDown={(e) => {
                                                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Creation Date <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="date"
                                                className="Vendors-form-input"
                                                name="creationDate"
                                                value={vendorFormData.creationDate}
                                                onChange={handleVendorInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div className="Vendors-form-section">
                                    <h3 className="Vendors-section-subtitle">Bank Details</h3>
                                    <div className="Vendors-form-row Vendors-three-col">
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Bank Account Number</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="bankAccountNumber"
                                                value={vendorFormData.bankAccountNumber}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter bank account number"
                                            />
                                        </div>
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Bank IFSC</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="bankIFSC"
                                                value={vendorFormData.bankIFSC}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter bank IFSC"
                                            />
                                        </div>
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Bank Name & Branch</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="bankNameBranch"
                                                value={vendorFormData.bankNameBranch}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter bank name & branch"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & GST */}
                                <div className="Vendors-form-section">
                                    <h3 className="Vendors-section-subtitle">Contact & Status</h3>
                                    <div className="Vendors-form-row Vendors-mixed-col">
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Phone <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="phone"
                                                value={vendorFormData.phone}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter Phone"
                                            />
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Email <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="email"
                                                className="Vendors-form-input"
                                                name="email"
                                                value={vendorFormData.email}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter Email"
                                            />
                                        </div>
                                        <div className="Vendors-form-group Vendors-half-width">
                                            <label className="Vendors-form-label">Credit Period (days)</label>
                                            <input
                                                type="number"
                                                className="Vendors-form-input"
                                                name="creditPeriod"
                                                value={vendorFormData.creditPeriod}
                                                onChange={handleVendorInputChange}
                                                placeholder="Enter credit period"
                                            />
                                        </div>
                                    </div>

                                    <div className="Vendors-form-row" style={{ alignItems: 'center' }}>
                                        <label className="Vendors-switch" style={{ marginRight: '10px' }}>
                                            <input
                                                type="checkbox"
                                                name="gstEnabled"
                                                checked={vendorFormData.gstEnabled}
                                                onChange={handleVendorInputChange}
                                            />
                                            <span className="Vendors-slider Vendors-round"></span>
                                        </label>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable GST</span>

                                        {vendorFormData.gstEnabled && (
                                            <div className="Vendors-form-group" style={{ marginLeft: '2rem', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="gstNumber"
                                                    value={vendorFormData.gstNumber}
                                                    onChange={handleVendorInputChange}
                                                    placeholder="Enter GSTIN"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Addresses */}
                                <div className="Vendors-form-section">
                                    <div className="Vendors-form-row">
                                        {/* Billing Address */}
                                        <div style={{ flex: 1 }}>
                                            <h3 className="Vendors-section-subtitle">Billing Address</h3>
                                            <div className="Vendors-form-group">
                                                <label className="Vendors-form-label">Name</label>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingName"
                                                    value={vendorFormData.billingName}
                                                    onChange={handleVendorInputChange}
                                                    placeholder="Enter Name"
                                                />
                                            </div>
                                            <div className="Vendors-form-group">
                                                <label className="Vendors-form-label">Phone</label>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingPhone"
                                                    value={vendorFormData.billingPhone}
                                                    onChange={handleVendorInputChange}
                                                    placeholder="Enter Phone"
                                                />
                                            </div>
                                            <div className="Vendors-form-group">
                                                <label className="Vendors-form-label">Address</label>
                                                <textarea
                                                    className="Vendors-form-textarea"
                                                    name="billingAddress"
                                                    value={vendorFormData.billingAddress}
                                                    onChange={handleVendorInputChange}
                                                    placeholder="Enter Address"
                                                    rows="3"
                                                />
                                            </div>
                                            <div className="Vendors-form-row">
                                                <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        name="billingCity"
                                                        value={vendorFormData.billingCity}
                                                        onChange={handleVendorInputChange}
                                                        placeholder="City"
                                                    />
                                                </div>
                                                <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        name="billingState"
                                                        value={vendorFormData.billingState}
                                                        onChange={handleVendorInputChange}
                                                        placeholder="State"
                                                    />
                                                </div>
                                            </div>
                                            <div className="Vendors-form-row">
                                                <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        name="billingCountry"
                                                        value={vendorFormData.billingCountry}
                                                        onChange={handleVendorInputChange}
                                                        placeholder="Country"
                                                    />
                                                </div>
                                                <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        name="billingZipCode"
                                                        value={vendorFormData.billingZipCode}
                                                        onChange={handleVendorInputChange}
                                                        placeholder="Zip Code"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shipping Address */}
                                        <div style={{ flex: 1, paddingLeft: '2rem', borderLeft: '1px solid #edf2f7' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h3 className="Vendors-section-subtitle">Shipping Addresses</h3>
                                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="shippingSameAsBilling"
                                                            checked={vendorFormData.shippingSameAsBilling}
                                                            onChange={handleVendorInputChange}
                                                            style={{ marginRight: '5px' }}
                                                        />
                                                        Apply Billing to First Shipping
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="Vendors-voucher-badge text-blue-600 border border-blue-600 bg-white hover:bg-blue-50"
                                                        onClick={addVendorShippingAddress}
                                                        style={{ padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                                                    >
                                                        + Add More
                                                    </button>
                                                </div>
                                            </div>

                                            {vendorFormData.shippingSameAsBilling && (
                                                <div style={{ marginBottom: '1.5rem', padding: '15px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0369a1' }}>First Shipping Address (Same as Billing)</h4>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
                                                        <strong>Address:</strong> {vendorFormData.billingAddress || 'N/A'}<br />
                                                        {vendorFormData.billingCity && `${vendorFormData.billingCity}, `}{vendorFormData.billingState && `${vendorFormData.billingState}, `}{vendorFormData.billingZipCode}
                                                    </p>
                                                </div>
                                            )}

                                            {vendorFormData.shippingAddresses.length === 0 && !vendorFormData.shippingSameAsBilling && (
                                                <div className="Vendors-form-group" style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>
                                                        No shipping addresses added.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={addVendorShippingAddress}
                                                        className="Vendors-voucher-badge text-blue-600"
                                                    >
                                                        Click here to add one
                                                    </button>
                                                </div>
                                            )}

                                            {vendorFormData.shippingAddresses.map((addr, index) => (
                                                <div key={index} style={{ marginBottom: '1.5rem', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', position: 'relative' }}>
                                                    {vendorFormData.shippingAddresses.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVendorShippingAddress(index)}
                                                            style={{ position: 'absolute', top: '10px', right: '10px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>Shipping Address #{index + 1}</h4>

                                                    <div className="Vendors-form-group">
                                                        <label className="Vendors-form-label">Name</label>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.name}
                                                            onChange={(e) => handleVendorShippingAddressChange(index, 'name', e.target.value)}
                                                            placeholder="Enter Name"
                                                        />
                                                    </div>
                                                    <div className="Vendors-form-group">
                                                        <label className="Vendors-form-label">Phone</label>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.phone}
                                                            onChange={(e) => handleVendorShippingAddressChange(index, 'phone', e.target.value)}
                                                            placeholder="Enter Phone"
                                                        />
                                                    </div>
                                                    <div className="Vendors-form-group">
                                                        <label className="Vendors-form-label">Address</label>
                                                        <textarea
                                                            className="Vendors-form-textarea"
                                                            value={addr.address}
                                                            onChange={(e) => handleVendorShippingAddressChange(index, 'address', e.target.value)}
                                                            placeholder="Enter Address"
                                                            rows="2"
                                                        />
                                                    </div>
                                                    <div className="Vendors-form-row">
                                                        <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                            <input
                                                                type="text"
                                                                className="Vendors-form-input"
                                                                value={addr.city}
                                                                onChange={(e) => handleVendorShippingAddressChange(index, 'city', e.target.value)}
                                                                placeholder="City"
                                                            />
                                                        </div>
                                                        <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                            <input
                                                                type="text"
                                                                className="Vendors-form-input"
                                                                value={addr.state}
                                                                onChange={(e) => handleVendorShippingAddressChange(index, 'state', e.target.value)}
                                                                placeholder="State"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="Vendors-form-row">
                                                        <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                            <input
                                                                type="text"
                                                                className="Vendors-form-input"
                                                                value={addr.country}
                                                                onChange={(e) => handleVendorShippingAddressChange(index, 'country', e.target.value)}
                                                                placeholder="Country"
                                                            />
                                                        </div>
                                                        <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                            <input
                                                                type="text"
                                                                className="Vendors-form-input"
                                                                value={addr.zipCode}
                                                                onChange={(e) => handleVendorShippingAddressChange(index, 'zipCode', e.target.value)}
                                                                placeholder="Zip Code"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="Vendors-modal-footer">
                                <button type="button" className="Vendors-btn-cancel" onClick={() => setShowAddVendorModal(false)}>Cancel</button>
                                <button type="submit" className="Vendors-btn-submit" disabled={uploadingAnyFile || uploadingProfileImage}>Save Vendor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add New Product Modal */}
            {showAddProductModal && (
                <div className="Zirak-Inventory-modal-overlay" style={{ zIndex: 20000 }}>
                    <div className="Zirak-Inventory-modal-content Zirak-Inventory-modal" style={{ textAlign: 'left' }}>
                        <div className="Zirak-Inventory-modal-header">
                            <h2 className="Zirak-Inventory-modal-title">Add Product</h2>
                            <button className="Zirak-Inventory-close-btn" onClick={() => setShowAddProductModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleFullProductSubmit}>
                            <div className="Zirak-Inventory-modal-body">
                                <div className="Zirak-Inventory-form-grid">
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Item Name *</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="name"
                                            placeholder="Enter item name"
                                            value={productFormData.name}
                                            onChange={handleProductInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">HSN</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="hsn"
                                            placeholder="Enter HSN code"
                                            value={productFormData.hsn}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Barcode</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="barcode"
                                            placeholder="Enter barcode"
                                            value={productFormData.barcode}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Item Image</label>
                                        <div className="Zirak-Inventory-file-input-wrapper">
                                            <label className="Zirak-Inventory-file-input-label">
                                                {uploadingImage ? (
                                                    <>
                                                        <Loader2 size={16} className="Zirak-Inventory-animate-spin" style={{ display: 'inline-block', marginRight: '6px' }} />
                                                        <span>Uploading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={16} style={{ display: 'inline-block', marginRight: '6px' }} />
                                                        <span>Choose File</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    className="Zirak-Inventory-hidden-file-input"
                                                    onChange={handleProductImageChange}
                                                    accept="image/*"
                                                    disabled={uploadingImage}
                                                />
                                            </label>
                                            <span className="Zirak-Inventory-file-name">
                                                {productFormData.image ? (
                                                    <a href={productFormData.image} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                        View Image
                                                    </a>
                                                ) : 'No file chosen'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Item Category (Optional)</label>
                                        <div className="Zirak-Inventory-input-with-action">
                                            <select
                                                name="categoryId" className="Zirak-Inventory-form-input"
                                                value={productFormData.categoryId} onChange={handleProductInputChange}
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                            <button type="button" className="Zirak-Inventory-btn-inline-add" onClick={() => setShowCategoryModal(true)}><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Base Unit (Tracking Unit)*</label>
                                        <div className="Zirak-Inventory-input-with-action">
                                            <select
                                                name="uomId" className="Zirak-Inventory-form-input"
                                                value={productFormData.uomId} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setProductFormData(prev => ({
                                                        ...prev,
                                                        uomId: val,
                                                        purchaseUomId: val,
                                                        salesUomId: val
                                                    }));
                                                }}
                                                required
                                            >
                                                <option value="">Select Base UOM</option>
                                                {allUoms.filter(u => u.uomType === 'Simple').map(uom => (
                                                    <option key={uom.id} value={uom.id}>{uom.unitName} ({uom.category})</option>
                                                ))}
                                            </select>
                                            <button type="button" className="Zirak-Inventory-btn-inline-add" onClick={() => setShowUomModal(true)}>
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Purchase Unit</label>
                                        <select
                                            name="purchaseUomId" className="Zirak-Inventory-form-input"
                                            value={productFormData.purchaseUomId} onChange={handleProductInputChange}
                                            disabled={!productFormData.uomId}
                                        >
                                            <option value="">Select Purchase UOM</option>
                                            {productFormData.uomId && (() => {
                                                const base = allUoms.find(u => u.id === parseInt(productFormData.uomId));
                                                if (!base) return null;
                                                return allUoms.filter(u => u.category === base.category).map(uom => (
                                                    <option key={uom.id} value={uom.id}>{uom.unitName} ({uom.uomType})</option>
                                                ));
                                            })()}
                                        </select>
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Sales Unit</label>
                                        <select
                                            name="salesUomId" className="Zirak-Inventory-form-input"
                                            value={productFormData.salesUomId} onChange={handleProductInputChange}
                                            disabled={!productFormData.uomId}
                                        >
                                            <option value="">Select Sales UOM</option>
                                            {productFormData.uomId && (() => {
                                                const base = allUoms.find(u => u.id === parseInt(productFormData.uomId));
                                                if (!base) return null;
                                                return allUoms.filter(u => u.category === base.category).map(uom => (
                                                    <option key={uom.id} value={uom.id}>{uom.unitName} ({uom.uomType})</option>
                                                ));
                                            })()}
                                        </select>
                                    </div>

                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">SKU *</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="sku"
                                            placeholder="Enter SKU"
                                            value={productFormData.sku}
                                            onChange={handleProductInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="Zirak-Inventory-section-title-row">
                                    <h3 className="Zirak-Inventory-section-title">Warehouse Information</h3>
                                    <button type="button" className="Zirak-Inventory-btn-inline-add" onClick={addProductWarehouseRow}>+ Add Warehouse</button>
                                </div>

                                <div className="Zirak-Inventory-warehouse-table-container">
                                    <table className="Zirak-Inventory-warehouse-input-table">
                                        <thead>
                                            <tr>
                                                <th>WAREHOUSE</th>
                                                <th>QUANTITY</th>
                                                <th>MINIMUM ORDER QUANTITY</th>
                                                <th>INITIAL QUANTITY ON HAND</th>
                                                <th>ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productWarehouseRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        <select
                                                            className="Zirak-Inventory-form-input Zirak-Inventory-mini"
                                                            value={row.warehouseId}
                                                            onChange={(e) => handleProductWhRowChange(row.id, 'warehouseId', e.target.value)}
                                                        >
                                                            <option value="">Select Warehouse</option>
                                                            {warehouses.map(wh => (
                                                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td><input type="number" className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.quantity} onChange={(e) => handleProductWhRowChange(row.id, 'quantity', e.target.value)} /></td>
                                                    <td><input type="number" className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.minOrderQty} onChange={(e) => handleProductWhRowChange(row.id, 'minOrderQty', e.target.value)} /></td>
                                                    <td><input type="number" className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.initialQty} onChange={(e) => handleProductWhRowChange(row.id, 'initialQty', e.target.value)} /></td>
                                                    <td>
                                                        <button type="button" className="Zirak-Inventory-btn-remove" onClick={() => removeProductWarehouseRow(row.id)}>Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="Zirak-Inventory-form-group Zirak-Inventory-full-width" style={{ marginTop: '1rem' }}>
                                    <label className="Zirak-Inventory-form-label">Item Description</label>
                                    <textarea
                                        name="description" className="Zirak-Inventory-form-input Zirak-Inventory-textarea"
                                        placeholder="Enter item description" rows={3}
                                        value={productFormData.description} onChange={handleProductInputChange}
                                    ></textarea>
                                </div>

                                <div className="Zirak-Inventory-form-grid" style={{ marginTop: '15px' }}>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">As of Date</label>
                                        <input
                                            type="date"
                                            className="Zirak-Inventory-form-input"
                                            name="asOfDate"
                                            value={productFormData.asOfDate}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Tax Account</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="taxAccount"
                                            placeholder="e.g. GST 18%"
                                            value={productFormData.taxAccount}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Initial Cost Price</label>
                                        <input
                                            type="number"
                                            className="Zirak-Inventory-form-input"
                                            name="initialCost"
                                            step="0.01"
                                            value={productFormData.initialCost}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Sale Price</label>
                                        <input
                                            type="number"
                                            className="Zirak-Inventory-form-input"
                                            name="salePrice"
                                            step="0.01"
                                            value={productFormData.salePrice}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Purchase Price</label>
                                        <input
                                            type="number"
                                            className="Zirak-Inventory-form-input"
                                            name="purchasePrice"
                                            step="0.01"
                                            value={productFormData.purchasePrice}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Discount (%)</label>
                                        <input
                                            type="number"
                                            className="Zirak-Inventory-form-input"
                                            name="discount"
                                            value={productFormData.discount}
                                            onChange={handleProductInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="Zirak-Inventory-form-group" style={{ marginTop: '15px' }}>
                                    <label className="Zirak-Inventory-form-label">Remarks</label>
                                    <textarea
                                        className="Zirak-Inventory-form-textarea"
                                        name="remarks"
                                        placeholder="Enter remarks"
                                        value={productFormData.remarks}
                                        onChange={handleProductInputChange}
                                        rows="2"
                                    />
                                </div>


                            </div>
                            <div className="Zirak-Inventory-modal-footer">
                                <button type="button" className="Zirak-Inventory-btn-cancel" onClick={() => setShowAddProductModal(false)}>Cancel</button>
                                <button type="submit" className="Zirak-Inventory-btn-submit" disabled={uploadingImage}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add New Category Modal */}
            {showCategoryModal && (
                <div className="Zirak-Inventory-modal-overlay Zirak-Inventory-sub-modal" style={{ zIndex: 100000 }}>
                    <div className="Zirak-Inventory-modal-content Zirak-Inventory-category-modal" style={{ textAlign: 'left' }}>
                        <div className="Zirak-Inventory-modal-header">
                            <h2 className="Zirak-Inventory-modal-title">Add New Category</h2>
                            <button className="Zirak-Inventory-close-btn" onClick={() => setShowCategoryModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Inventory-modal-body">
                            <div className="Zirak-Inventory-form-group">
                                <label className="Zirak-Inventory-form-label">Category Name</label>
                                <input
                                    type="text"
                                    className="Zirak-Inventory-form-input"
                                    placeholder="Enter new category name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="Zirak-Inventory-modal-footer">
                            <button className="Zirak-Inventory-btn-cancel" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                            <button className="Zirak-Inventory-btn-submit" onClick={handleProductAddCategorySubmit}>Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New UOM Modal */}
            {showUomModal && (
                <div className="Zirak-UOM-modal-overlay" style={{ zIndex: 100000 }}>
                    <div className="Zirak-UOM-modal" style={{ textAlign: 'left' }}>
                        <div className="Zirak-UOM-modal-header">
                            <h2>Unit Details</h2>
                            <button className="Zirak-UOM-close-btn" onClick={() => setShowUomModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUomSubmit}>
                            <div className="Zirak-UOM-modal-body">
                                <div className="Zirak-UOM-form-group">
                                    <label>Measurement Category*</label>
                                    <input
                                        list="category-suggestions"
                                        name="category"
                                        placeholder="Select or type category"
                                        value={uomFormData.category}
                                        onChange={handleUomInputChange}
                                        required
                                        className="Zirak-UOM-form-input"
                                    />
                                    <datalist id="category-suggestions">
                                        {measurementCategories.map(cat => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="Zirak-UOM-form-group">
                                    <label>UOM Type*</label>
                                    <select
                                        name="uomType"
                                        value={uomFormData.uomType}
                                        onChange={handleUomInputChange}
                                        required
                                        className="Zirak-UOM-form-select"
                                    >
                                        <option value="Simple">Simple (Single Standalone Unit)</option>
                                        <option value="Compound">Compound (Pack of Simple Unit)</option>
                                    </select>
                                </div>
                                <div className="Zirak-UOM-form-group">
                                    <label>Unit of Measurement (UOM)*</label>
                                    <div className="Zirak-UOM-input-with-button">
                                        <input
                                            list="unit-suggestions"
                                            name="unitName"
                                            placeholder="Select or type UOM"
                                            value={uomFormData.unitName}
                                            onChange={handleUomInputChange}
                                            required
                                            className="Zirak-UOM-form-input"
                                        />
                                        <datalist id="unit-suggestions">
                                            {uomFormData.category && unitsByCategory[uomFormData.category] && unitsByCategory[uomFormData.category].map(unit => (
                                                <option key={unit} value={unit} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                {uomFormData.uomType === 'Compound' && (
                                    <>
                                        <div className="Zirak-UOM-form-group">
                                            <label>Base Unit* (Simple Unit to convert to)</label>
                                            <select
                                                name="baseUnitId"
                                                value={uomFormData.baseUnitId}
                                                onChange={handleUomInputChange}
                                                required
                                                className="Zirak-UOM-form-select"
                                            >
                                                <option value="">-- Select Base Unit --</option>
                                                {getUniqueCategories().map(cat => {
                                                    const unitsInCat = getAvailableBaseUnitsForCategory(cat);
                                                    if (unitsInCat.length === 0) return null;
                                                    return (
                                                        <optgroup key={cat} label={cat}>
                                                            {unitsInCat.map(u => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.unitName} {u.isStandard ? ' - Standard' : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className="Zirak-UOM-form-group">
                                            <label>Conversion Rate* (Multiplier)</label>
                                            <div className="UOM-compound-formula-preview">
                                                <span>1 {uomFormData.unitName || 'Compound Unit'} = </span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="conversionRate"
                                                    placeholder="Multiplier e.g. 24"
                                                    value={uomFormData.conversionRate}
                                                    onChange={handleUomInputChange}
                                                    required
                                                    min="0.0001"
                                                    style={{ width: '100px', display: 'inline-block', margin: '0 8px', padding: '6px' }}
                                                />
                                                <span> {
                                                    isNaN(uomFormData.baseUnitId)
                                                        ? uomFormData.baseUnitId
                                                        : (allUoms.find(u => u.id === parseInt(uomFormData.baseUnitId))?.unitName || 'Base Unit')
                                                }</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="Zirak-UOM-modal-footer">
                                <button type="button" className="Zirak-UOM-footer-close-btn" onClick={() => setShowUomModal(false)}>Close</button>
                                <button type="submit" className="Zirak-UOM-save-btn">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddSalespersonModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '350px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>Add New Salesperson</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Name *</label>
                                <input
                                    type="text"
                                    value={salespersonFormData.name}
                                    onChange={(e) => setSalespersonFormData({ ...salespersonFormData, name: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Salesperson Name"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Phone / Number</label>
                                <input
                                    type="text"
                                    value={salespersonFormData.phone}
                                    onChange={(e) => setSalespersonFormData({ ...salespersonFormData, phone: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Phone number"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Email</label>
                                <input
                                    type="email"
                                    value={salespersonFormData.email}
                                    onChange={(e) => setSalespersonFormData({ ...salespersonFormData, email: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Email address"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddSalespersonModal(false)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    backgroundColor: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!salespersonFormData.name.trim()) {
                                        toast.error("Name is required");
                                        return;
                                    }
                                    try {
                                        const companyId = GetCompanyId();
                                        const res = await salespersonService.create({
                                            ...salespersonFormData,
                                            companyId: parseInt(companyId)
                                        });
                                        if (res.success) {
                                            toast.success("Salesperson added successfully");
                                            setSalespersonId(res.data.id);
                                            // Refresh list
                                            const listRes = await salespersonService.getAll(companyId);
                                            if (listRes.success) setSalespersonsList(listRes.data);
                                            setShowAddSalespersonModal(false);
                                        } else {
                                            toast.error(res.message || "Failed to create salesperson");
                                        }
                                    } catch (e) {
                                        toast.error(e.message || "Failed to create salesperson");
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#1e293b',
                                    color: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddDeliveryPersonModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '350px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#1f2937' }}>Add New Delivery Person</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Name *</label>
                                <input
                                    type="text"
                                    value={deliverypersonFormData.name}
                                    onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, name: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Delivery Person Name"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Phone / Number</label>
                                <input
                                    type="text"
                                    value={deliverypersonFormData.phone}
                                    onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, phone: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Phone number"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#4b5563', marginBottom: '4px' }}>Email</label>
                                <input
                                    type="email"
                                    value={deliverypersonFormData.email}
                                    onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, email: e.target.value })}
                                    className="PBILL-compact-input"
                                    style={{ width: '100%' }}
                                    placeholder="Email address"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddDeliveryPersonModal(false)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    backgroundColor: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!deliverypersonFormData.name.trim()) {
                                        toast.error("Name is required");
                                        return;
                                    }
                                    try {
                                        const companyId = GetCompanyId();
                                        const res = await deliverypersonService.create({
                                            ...deliverypersonFormData,
                                            companyId: parseInt(companyId)
                                        });
                                        if (res.success) {
                                            toast.success("Delivery person added successfully");
                                            setSelectedDeliveryPersonId(res.data.id);
                                            setBillMeta(prev => ({
                                                ...prev,
                                                deliveryPersonName: res.data.name,
                                                deliveryPersonMobile: res.data.phone || '',
                                                deliveryPersonEmail: res.data.email || ''
                                            }));
                                            // Refresh list
                                            const listRes = await deliverypersonService.getAll(companyId);
                                            if (listRes.success) setDeliverypersonsList(listRes.data);
                                            setShowAddDeliveryPersonModal(false);
                                        } else {
                                            toast.error(res.message || "Failed to create delivery person");
                                        }
                                    } catch (e) {
                                        toast.error(e.message || "Failed to create delivery person");
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#1e293b',
                                    color: '#ffffff',
                                    cursor: 'pointer'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Universal Excel Import Modal */}
            <ExcelImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="purchaseBills"
                onSuccess={() => {
                    fetchData();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default PurchaseBill;
