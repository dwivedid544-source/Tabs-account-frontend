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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import tabAccountsLogo from '../../../../assets/tab-accounts-logo.png';
import ceaArchitectsLogo from '../../../../assets/cea-architects-logo.png';
import ceaArchitectsLogoBase64 from '../../../../assets/ceaArchitectsLogoBase64';
import { BASE_URL } from '../../../../api/axiosInstance';
import { resolveLogoUrl, getCompanyLogoSrc } from '../../../../utils/logoUrl';

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

const getTintBg = (hexColor, alpha = 0.08) => {
    if (!hexColor) return '#f8fafc';
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#f8fafc';
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToRgb = (hex) => {
    if (!hex) return [0, 74, 173];
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return [0, 74, 173];
    return [
        parseInt(cleanHex.substr(0, 2), 16),
        parseInt(cleanHex.substr(2, 2), 16),
        parseInt(cleanHex.substr(4, 2), 16)
    ];
};

const safeAutoTable = (doc, options) => {
    if (typeof doc.autoTable === 'function') {
        return doc.autoTable(options);
    }
    if (typeof autoTable === 'function') {
        return autoTable(doc, options);
    }
    if (autoTable && typeof autoTable.default === 'function') {
        return autoTable.default(doc, options);
    }
    throw new Error('PDF AutoTable generator is not available');
};

const safeSavePdf = (doc, fileName) => {
    const rawName = (fileName || 'PurchaseBill.pdf').replace(/[\\/:*?"<>|#]/g, '_');
    const finalName = rawName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;
    try {
        const arrayBuffer = doc.output('arraybuffer');
        const uint8 = new Uint8Array(arrayBuffer);

        // Sanitize any invalid PDF syntax such as '/Predictor null' -> '/Predictor 1   '
        const needle = [47, 80, 114, 101, 100, 105, 99, 116, 111, 114, 32, 110, 117, 108, 108]; // '/Predictor null'
        const repl = [47, 80, 114, 101, 100, 105, 99, 116, 111, 114, 32, 49, 32, 32, 32];     // '/Predictor 1   '
        for (let i = 0; i <= uint8.length - needle.length; i++) {
            let match = true;
            for (let j = 0; j < needle.length; j++) {
                if (uint8[i + j] !== needle[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                for (let j = 0; j < repl.length; j++) {
                    uint8[i + j] = repl[j];
                }
                i += needle.length - 1;
            }
        }

        const pdfBlob = new Blob([uint8], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);

        // Trigger file download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();

        // Also open in new browser tab so user can immediately view all content
        window.open(url, '_blank');

        setTimeout(() => {
            try {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url);
            } catch {}
        }, 60000);
    } catch (saveErr) {
        console.warn('Sanitized PDF save failed, trying standard doc.save fallback:', saveErr);
        try {
            doc.save(finalName);
        } catch (fallbackErr) {
            console.error('All PDF download mechanisms failed:', fallbackErr);
            toast.error('Failed to download PDF. Please use browser print.');
        }
    }
};

const formatCeaDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const ALL_CURRENCIES = [
    { code: 'EUR', name: 'EUR (€)' },
    { code: 'GBP', name: 'GBP (£)' },
    { code: 'USD', name: 'USD ($)' },
    { code: 'INR', name: 'INR (₹)' }
];

const PurchaseBill = () => {
    const { companySettings, formatCurrency, getTableHeader, getInvoiceLabel, getDocumentTitle, getExchangeRateFor, getSyncRate, currencies: dynamicCurrencies } = useContext(CompanyContext);
    const defaultVat = companySettings?.defaultVatRate !== undefined ? parseFloat(companySettings.defaultVatRate) : 23;
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

    const [selectedCurrency, setSelectedCurrency] = useState(() => companySettings?.currency || 'EUR');
    const [exchangeRate, setExchangeRate] = useState(1.0);

    useEffect(() => {
        if (companySettings?.currency) {
            setSelectedCurrency(companySettings.currency);
        }
    }, [companySettings]);

    const handleCurrencyChange = async (cur) => {
        setSelectedCurrency(cur);
        let rateVal = 1.0;
        if (cur === (companySettings?.currency || 'EUR')) {
            setExchangeRate(1.0);
        } else {
            try {
                rateVal = await getExchangeRateFor(cur, companySettings?.currency || 'EUR');
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
                const prevConversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'EUR') || 1.0;
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
        const docCurrency = currencyCode || selectedCurrency || companySettings?.currency || 'EUR';

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
    const viewRate = getSyncRate(viewBill?.currency || 'USD', companySettings?.currency || 'EUR');
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
    const [paymentTerm, setPaymentTerm] = useState('0');

    const handlePaymentTermChange = (term) => {
        setPaymentTerm(term);
        if (term !== 'custom') {
            const days = parseInt(term, 10) || 0;
            const newDueDate = calculateDueDate(billMeta.date, days);
            setBillMeta(prev => ({ ...prev, dueDate: newDueDate }));
        }
    };

    const handleCustomDueDateChange = (newDate) => {
        setPaymentTerm('custom');
        setBillMeta(prev => ({ ...prev, dueDate: newDate }));
    };

    const [items, setItems] = useState([
        { id: Date.now(), productId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 23, discount: 0, total: 0, description: '' }
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
            setSelectedCurrency(companySettings?.currency || 'EUR');
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
            val = value.replace(/\D/g, '').slice(0, 10);
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
                processedValue = value.replace(/\D/g, '').slice(0, 10);
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
        setPaymentTerm('0');
        setSelectedCurrency(companySettings?.currency || 'EUR');
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
        setItems([{ id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }]);
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
        if (creditDays === 0) setPaymentTerm('0');
        else if (creditDays === 7) setPaymentTerm('7');
        else if (creditDays === 30) setPaymentTerm('30');
        else if (creditDays === 60) setPaymentTerm('60');
        else setPaymentTerm('custom');
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
                setSelectedCurrency(billData.currency || companySettings?.currency || 'EUR');
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

        // If the vendor has only 1 bill, viewing it directly views that specific bill
        if (group.bills && group.bills.length === 1) {
            handleView(group.bills[0]);
            return;
        }

        const allPayments = [];
        group.bills.forEach(bill => {
            const curr = bill.currency || companySettings?.currency || 'EUR';
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

        // Aggregate all items across all constituent bills
        const allItems = group.bills.flatMap(b => b.purchasebillitem || b.items || []);

        const isSingleBill = group.bills && group.bills.length === 1;
        const firstBill = (group.bills && group.bills[0]) || {};

        setViewBill({
            ...group,
            ...(isSingleBill ? firstBill : {}),
            isStatement: !isSingleBill,
            billNumber: isSingleBill ? firstBill.billNumber : `Statement (${group.bills.length} Bills)`,
            date: isSingleBill ? firstBill.date : (group.earliestDate || group.date),
            dueDate: isSingleBill ? firstBill.dueDate : (group.latestDueDate || group.dueDate),
            paymentTerms: isSingleBill ? firstBill.paymentTerms : 'Net 30',
            manualReference: isSingleBill ? firstBill.manualReference : undefined,
            currency: isSingleBill ? firstBill.currency : (companySettings?.currency || 'EUR'),
            subtotal: group.subtotal !== undefined ? group.subtotal : (isSingleBill ? firstBill.subtotal : 0),
            discountAmount: group.discountAmount !== undefined ? group.discountAmount : (isSingleBill ? firstBill.discountAmount : 0),
            taxAmount: group.taxAmount !== undefined ? group.taxAmount : (isSingleBill ? firstBill.taxAmount : 0),
            roundOffAmount: group.roundOffAmount !== undefined ? group.roundOffAmount : (isSingleBill ? firstBill.roundOffAmount : 0),
            totalAmount: group.totalAmount || group.totalBillAmount || (isSingleBill ? firstBill.totalAmount : 0),
            paidAmount: group.paidAmount !== undefined ? group.paidAmount : (isSingleBill ? firstBill.paidAmount : 0),
            balanceAmount: group.balanceAmount !== undefined ? group.balanceAmount : (isSingleBill ? firstBill.balanceAmount : 0),
            purchasebillitem: allItems,
            items: allItems,
            payment: allPayments,
            billingName: group.vendor?.billingName || group.vendor?.name || firstBill.billingName || '',
            billingAddress: group.vendor?.billingAddress || firstBill.billingAddress || '',
            billingCity: group.vendor?.billingCity || firstBill.billingCity || '',
            billingState: group.vendor?.billingState || firstBill.billingState || '',
            billingZipCode: group.vendor?.billingZipCode || firstBill.billingZipCode || '',
            billingCountry: group.vendor?.billingCountry || firstBill.billingCountry || '',
            shippingName: group.vendor?.shippingName || group.vendor?.name || firstBill.shippingName || '',
            shippingAddress: group.vendor?.shippingAddress || group.vendor?.billingAddress || firstBill.shippingAddress || '',
            shippingCity: group.vendor?.city || firstBill.shippingCity || '',
            shippingState: group.vendor?.state || firstBill.shippingState || '',
            shippingZipCode: group.vendor?.zipCode || firstBill.shippingZipCode || '',
            shippingCountry: group.vendor?.country || firstBill.shippingCountry || ''
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
                const creditDays = vendorObj?.creditPeriod || 0;
                setSelectedVendorCreditPeriod(creditDays);
                if (creditDays === 0) setPaymentTerm('0');
                else if (creditDays === 7) setPaymentTerm('7');
                else if (creditDays === 30) setPaymentTerm('30');
                else if (creditDays === 60) setPaymentTerm('60');
                else setPaymentTerm('custom');
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
                setShowCurrencyField(!!billToEdit.currency && billToEdit.currency !== (companySettings?.currency || 'EUR'));
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
                setSelectedCurrency(billToEdit.currency || companySettings?.currency || 'EUR');
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
        setItems(prevItems => [...prevItems, { id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }]);
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
                    return [...prevItems, { id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }];
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
                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'EUR') || 1.0;
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
                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'EUR') || 1.0;
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

    async function buildPurchaseBillPdfDoc(billInput) {
        if (!billInput) return null;
        const tol = 0.01;
        let bill = billInput;
        const companyId = GetCompanyId();

        // If items or full vendor details are missing, fetch them
        if (!bill.items && !bill.purchasebillitem && !bill.bills) {
            try {
                const res = await purchaseBillService.getBillById(bill.id, companyId);
                if (res?.data?.success && res.data.data) {
                    bill = res.data.data;
                } else if (res?.success && res.data) {
                    bill = res.data;
                }
            } catch (e) {
                console.warn('Could not fetch single purchase bill details:', e);
            }
        }

        const comp = companySettings || companyDetails || {};
        const currency = bill.currency || comp.currency || 'EUR';

        // Resolve company logo (flattened to JPEG on white background to prevent PNG alpha stream corruption)
        let logoBase64 = null;
        const logoRaw = getCompanyLogoSrc(comp.invoiceLogo || comp.logo || companySettings?.invoiceLogo || companySettings?.logo) || ceaArchitectsLogoBase64;
        if (logoRaw && logoRaw !== tabAccountsLogo && typeof window !== 'undefined') {
            try {
                const fetched = await new Promise((resolve) => {
                    const timer = setTimeout(() => resolve(null), 1500);
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        clearTimeout(timer);
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth || img.width || 177;
                            canvas.height = img.naturalHeight || img.height || 76;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL('image/jpeg', 0.95));
                        } catch (err) {
                            resolve(null);
                        }
                    };
                    img.onerror = () => {
                        clearTimeout(timer);
                        resolve(null);
                    };
                    img.src = logoRaw;
                });
                if (fetched) logoBase64 = fetched;
            } catch (e) {
                console.warn('Could not flatten logo to JPEG:', e);
            }
        }

        // Vendor details
        const targetVendor = bill.vendor || (vendors && vendors.find(v => String(v.id) === String(bill.vendorId))) || {};
        const vendorName = targetVendor.name || bill.billingName || 'Vendor';
        const vendorAddr = targetVendor.address || bill.billingAddress || '';
        const vendorCityStateZip = [
            targetVendor.city || bill.billingCity,
            targetVendor.state ? (targetVendor.state.includes('Co') ? targetVendor.state : `Co, ${targetVendor.state}`) : '',
            targetVendor.zipCode || targetVendor.zip || bill.billingZipCode
        ].filter(Boolean).join(' ');
        const vendorPhone = targetVendor.phone || bill.billingPhone || '';
        const vendorEmail = targetVendor.email || bill.billingEmail || '';
        const vendorVat = targetVendor.taxNumber || targetVendor.vatNumber || targetVendor.gstin || '';

        // Financial calculations
        let cfData = {};
        if (bill.customFields) {
            try {
                cfData = typeof bill.customFields === 'string' ? JSON.parse(bill.customFields) : bill.customFields;
            } catch (e) {
                cfData = {};
            }
        }

        const rawItems = bill.purchasebillitem || bill.items || [];
        const lineItems = rawItems.length > 0 ? rawItems : (bill.bills ? bill.bills.flatMap(b => b.purchasebillitem || b.items || []) : []);

        const parsedOtherCharges = Array.isArray(cfData?._otherCharges) ? cfData._otherCharges : [];
        const otherChargesTotal = parsedOtherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

        // Process line items & compute fallback totals
        let computedItemsGross = 0;
        let computedItemsDisc = 0;
        let computedItemsTax = 0;
        const vatSummaryMap = {};

        const processedItems = lineItems.map((item) => {
            const actName = item.product?.name || item.itemName || item.name || 'Product';
            const desc = item.description || (item.product?.name ? item.product.name : actName) || '';
            const uom = item.uom?.unitName || (allUoms.find(u => u.id === item.uomId)?.unitName) || item.unit || '';
            const qty = parseFloat(item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty || 1)) || 0;
            const rate = parseFloat(item.rate || 0) || 0;
            const gross = qty * rate;

            const itemTax = parseFloat(item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : (item.tax || 0)) || 0;
            const isZeroTax = itemTax === 0;
            const taxDisplay = isZeroTax ? 'No VAT' : `${parseFloat(itemTax.toFixed(2))}%`;

            let lineDisc = 0;
            const rawDisc = parseFloat(item.discount || 0) || 0;
            if (rawDisc > 0) {
                if (item.discountType === 'percentage' || (rawDisc <= 100 && !item.discountType && rawDisc > 0 && Math.abs((gross * rawDisc) / 100 - (item.discountAmount || 0)) < 0.01)) {
                    lineDisc = (gross * rawDisc) / 100;
                } else {
                    lineDisc = rawDisc;
                }
            } else if (item.discountAmount) {
                lineDisc = parseFloat(item.discountAmount) || 0;
            }
            lineDisc = Math.min(gross, Math.max(0, lineDisc));

            const discText = rawDisc > 0 ? (item.discountType === 'percentage' ? `${rawDisc}%` : `-${rawDisc.toFixed(2)}`) : '0%';
            const net = Math.max(0, gross - lineDisc);
            const lineVat = itemTax > 0 ? (net * itemTax) / 100 : 0;
            const amt = parseFloat(item.amount !== undefined && item.amount !== null && parseFloat(item.amount) > 0 ? item.amount : (net + lineVat));

            computedItemsGross += gross;
            computedItemsDisc += lineDisc;
            computedItemsTax += lineVat;

            const rateKey = parseFloat(itemTax.toFixed(2));
            if (!vatSummaryMap[rateKey]) {
                vatSummaryMap[rateKey] = { rate: rateKey, vatAmount: 0, netAmount: 0 };
            }
            vatSummaryMap[rateKey].netAmount += net;
            vatSummaryMap[rateKey].vatAmount += lineVat;

            return {
                actName,
                desc,
                uom,
                qty,
                rate,
                discText,
                taxDisplay,
                amt,
                taxRate: itemTax
            };
        });

        const subtotalVal = (bill.subtotal !== undefined && bill.subtotal !== null && parseFloat(bill.subtotal) > 0)
            ? parseFloat(bill.subtotal)
            : (computedItemsGross > 0 ? computedItemsGross : (parseFloat(bill.totalAmount || 0) - parseFloat(bill.taxAmount || 0) + parseFloat(bill.discountAmount || 0) - otherChargesTotal));

        const getOverallDiscountAmt = () => {
            if (bill.overallDiscount > 0) {
                if (bill.overallDiscountType === 'percentage') {
                    const F = (parseFloat(bill.overallDiscount) || 0) / 100;
                    if (F >= 1) return parseFloat(bill.discountAmount || 0);
                    const sub = parseFloat(subtotalVal) || 0;
                    const totDisc = parseFloat(bill.discountAmount || 0);
                    const tax = parseFloat(bill.taxAmount || 0);
                    return ((sub - totDisc + tax) * F) / (1 - F);
                }
                return parseFloat(bill.overallDiscount) || 0;
            }
            return 0;
        };

        const overallDiscountAmt = getOverallDiscountAmt();
        const discountVal = (bill.discountAmount !== undefined && bill.discountAmount !== null && parseFloat(bill.discountAmount) > 0)
            ? parseFloat(bill.discountAmount)
            : (overallDiscountAmt > 0 ? overallDiscountAmt : computedItemsDisc);

        const taxableVal = Math.max(0, subtotalVal - discountVal);

        const taxVal = (bill.taxAmount !== undefined && bill.taxAmount !== null && parseFloat(bill.taxAmount) > 0)
            ? parseFloat(bill.taxAmount)
            : computedItemsTax;

        const roundOffVal = parseFloat(bill.roundOffAmount || bill.roundOff || 0);

        const totalVal = (bill.totalAmount !== undefined && bill.totalAmount !== null && parseFloat(bill.totalAmount) > 0)
            ? parseFloat(bill.totalAmount)
            : (bill.totalBillAmount && parseFloat(bill.totalBillAmount) > 0 ? parseFloat(bill.totalBillAmount) : (taxableVal + taxVal + otherChargesTotal + roundOffVal));

        const paidVal = parseFloat(bill.paidAmount || 0);
        const balanceVal = bill.balanceAmount !== undefined && bill.balanceAmount !== null ? parseFloat(bill.balanceAmount) : Math.max(0, totalVal - paidVal);

        const vatSummaryList = Object.values(vatSummaryMap).sort((a, b) => b.rate - a.rate);
        if (vatSummaryList.length === 0 && (taxVal > 0 || taxableVal > 0)) {
            const defaultRate = taxableVal > 0 ? (taxVal / taxableVal) * 100 : 23;
            vatSummaryList.push({ rate: defaultRate, vatAmount: taxVal, netAmount: taxableVal });
        }

        const isDuePassedDate = Boolean(bill.dueDate && new Date(bill.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0));
        const rawStatus = String(bill.status || '').toUpperCase();

        const currentStatus = (() => {
            if (rawStatus === 'CANCELLED') return 'CANCELLED';
            if (balanceVal <= tol && (totalVal > 0 || paidVal > 0)) return 'PAID';
            if (balanceVal <= tol && totalVal === 0) return 'PAID';
            if (rawStatus === 'PAID' && balanceVal <= tol) return 'PAID';
            if (paidVal > tol && balanceVal > tol) return 'PARTIALLY PAID';
            if (rawStatus === 'PARTIAL' || rawStatus === 'PARTIALLY PAID') return 'PARTIALLY PAID';
            if (balanceVal > tol && isDuePassedDate) return 'OVERDUE';
            if (rawStatus === 'OVERDUE' && balanceVal > tol) return 'OVERDUE';
            if (rawStatus && rawStatus !== 'UNPAID' && rawStatus !== 'DUE') return rawStatus;
            return 'UNPAID';
        })();

        // Bank details
        const bankAccountName = comp.accountName || comp.accountHolder || comp.name || 'CEAC LTD';
        const bankIban = comp.iban || 'IE03BOFI90290116673832';
        const bankBic = comp.bic || 'BOFIIE2D';
        const bankAccount = comp.accountNumber || '16673832';
        const bankSortCode = comp.sortCode || '902901';
        const bankName = comp.bankName || 'Bank Of Ireland';
        const bankAddress = comp.bankAddress || '97 Main Street, Midleton, Co. Cork';

        const doc = new jsPDF('p', 'mm', 'a4');

        // --- 1. HEADER (Top Left: Company Details, Top Right: Logo) ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(17, 24, 39);
        doc.text(comp.name || 'CEAC Ltd', 14, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        let compY = 22.5;
        doc.text(comp.address || '17 South Mall', 14, compY);
        compY += 4.2;

        const compCityLine = (comp.city && comp.zip)
            ? `${comp.city.replace(/,\s*$/, '')}, ${comp.state ? (comp.state.includes('Co') ? comp.state : `Co, ${comp.state}`) : 'Co, Cork'} ${comp.zip || comp.zipCode || ''}`.trim()
            : 'Cork, Co, Cork T12VCY2';
        if (compCityLine) {
            doc.text(compCityLine, 14, compY);
            compY += 4.2;
        }
        doc.text(comp.phone || '+353214272000', 14, compY);
        compY += 4.2;

        doc.text(comp.email || 'accounts@ceaarchitects.com', 14, compY);
        compY += 4.2;

        const vatId = comp.vatNumber || comp.taxNumber || comp.gstNumber || '4120278GH';
        doc.text(`VAT ID: ${vatId}`, 14, compY);
        compY += 4.2;

        // Top Right Logo Image
        if (logoBase64) {
            try {
                const logoWidth = 36;
                const logoHeight = 36 / (177 / 76);
                const fmt = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(logoBase64, fmt, 196 - logoWidth, 12, logoWidth, logoHeight);
            } catch (imgErr) {
                console.warn('Could not add image to PDF:', imgErr);
            }
        }

        // --- 2. MIDDLE (Left: PURCHASE BILL & BILL FROM / VENDOR, Right: METADATA GRID) ---
        const themeColorHex = comp.invoiceColor || companySettings?.invoiceColor || '#dedede';
        const _isLight = isLightColor(themeColorHex);
        const themeRgb = hexToRgb(themeColorHex);
        const _combinedTitleRgb = _isLight ? [30, 41, 59] : themeRgb;
        const tableHeaderBgRgb = _isLight ? [222, 222, 222] : themeRgb;
        const tableHeaderTextRgb = _isLight ? [85, 85, 85] : [255, 255, 255];

        let midY = Math.max(50, compY + 3);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(_combinedTitleRgb[0], _combinedTitleRgb[1], _combinedTitleRgb[2]);
        doc.text(bill.isStatement ? 'VENDOR STATEMENT' : 'PURCHASE BILL', 14, midY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(136, 136, 136);
        doc.text('BILL FROM / VENDOR', 14, midY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(vendorName, 14, midY + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(55, 65, 81);
        let billY = midY + 15.5;
        if (vendorAddr) {
            doc.text(vendorAddr, 14, billY);
            billY += 4.2;
        }
        if (vendorCityStateZip && vendorCityStateZip !== vendorAddr) {
            doc.text(vendorCityStateZip, 14, billY);
            billY += 4.2;
        }
        if (vendorPhone) {
            doc.text(vendorPhone, 14, billY);
            billY += 4.2;
        }
        if (vendorEmail) {
            doc.text(vendorEmail, 14, billY);
            billY += 4.2;
        }
        if (vendorVat) {
            doc.text(`VAT ID: ${vendorVat}`, 14, billY);
            billY += 4.2;
        }

        // Right Metadata Grid
        const metaKeyX = 118;
        const metaValX = 196;
        const metaRows = [
            { key: bill.isStatement ? 'STATEMENT #' : 'BILL #', val: String(bill.billNumber || (bill.isStatement ? 'Statement' : 'N/A')).replace(/^#/, '') },
            { key: 'DATE', val: formatCeaDate(bill.date || bill.earliestDate) },
            ...(bill.manualReference && typeof bill.manualReference === 'string' && bill.manualReference.trim() ? [{ key: 'MANUAL REF', val: bill.manualReference.trim() }] : []),
            { key: 'TERMS', val: bill.paymentTerms || 'Net 30' },
            { key: 'DUE DATE', val: formatCeaDate(bill.dueDate || bill.latestDueDate || bill.date || bill.earliestDate) },
            ...(bill.purchaseorder?.orderNumber ? [{ key: 'P.O. #', val: bill.purchaseorder.orderNumber }] : []),
            ...(bill.goodsreceiptnote?.grnNumber ? [{ key: 'G.R.N. #', val: bill.goodsreceiptnote.grnNumber }] : [])
        ];

        let metaY = midY + 5;
        metaRows.forEach((m) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(m.key, metaKeyX, metaY);

            const keyW = doc.getTextWidth(m.key);
            const maxValW = (metaValX - metaKeyX) - keyW - 3;

            doc.setFont('helvetica', 'bold');
            let valFontSize = 8.5;
            doc.setFontSize(valFontSize);
            while (doc.getTextWidth(m.val) > maxValW && valFontSize > 6) {
                valFontSize -= 0.5;
                doc.setFontSize(valFontSize);
            }
            doc.setTextColor(15, 23, 42);
            doc.text(m.val, metaValX, metaY, { align: 'right' });
            metaY += 4.6;
        });

        // --- 3. ITEMS TABLE ---
        const tableStartY = Math.max(billY + 3, metaY + 3);

        const showUom = true;
        const cols = [
            { key: 'activity', header: 'ACTIVITY', fixedWidth: 36, align: 'left', fontStyle: 'bold', getData: it => it.actName },
            { key: 'description', header: 'DESCRIPTION', isFlex: true, align: 'left', fontStyle: 'normal', getData: it => it.desc },
            ...(showUom ? [{ key: 'uom', header: 'UOM', fixedWidth: 14, align: 'center', fontStyle: 'normal', getData: it => it.uom || 'Units' }] : []),
            { key: 'quantity', header: 'QUANTITY', fixedWidth: 18, align: 'right', fontStyle: 'normal', getData: it => String(it.qty) },
            { key: 'rate', header: 'RATE', fixedWidth: 20, align: 'right', fontStyle: 'normal', getData: it => Number(it.rate).toFixed(2) },
            { key: 'discount', header: 'DISCOUNT', fixedWidth: 22, align: 'center', fontStyle: 'normal', getData: it => it.discText },
            { key: 'tax', header: 'TAX', fixedWidth: 18, align: 'center', fontStyle: 'normal', getData: it => it.taxDisplay },
            { key: 'price', header: 'PRICE', fixedWidth: 24, align: 'right', fontStyle: 'normal', getData: it => Number(it.amt).toFixed(2) }
        ];

        const totalPrintableWidth = 182;
        const fixedWidthSum = cols.filter(c => !c.isFlex).reduce((sum, c) => sum + c.fixedWidth, 0);
        const flexWidth = Math.max(30, totalPrintableWidth - fixedWidthSum);

        const tableHead = [
            cols.map(c => ({
                content: c.header,
                styles: { halign: c.align }
            }))
        ];
        const tableBody = processedItems.map(it => cols.map(c => c.getData(it)));

        const columnStyles = {};
        cols.forEach((c, idx) => {
            columnStyles[idx] = {
                cellWidth: c.isFlex ? flexWidth : c.fixedWidth,
                halign: c.align,
                valign: 'middle',
                ...(c.fontStyle === 'bold' ? { fontStyle: 'bold' } : {})
            };
        });

        safeAutoTable(doc, {
            startY: tableStartY,
            head: tableHead,
            body: tableBody,
            theme: 'plain',
            tableWidth: totalPrintableWidth,
            styles: {
                overflow: 'linebreak',
                valign: 'middle',
                fontSize: 7.8,
                lineColor: [226, 232, 240],
                lineWidth: { bottom: 0.1 }
            },
            headStyles: {
                fillColor: tableHeaderBgRgb,
                textColor: tableHeaderTextRgb,
                fontStyle: 'bold',
                fontSize: 7.8,
                cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
                valign: 'middle'
            },
            bodyStyles: {
                textColor: [15, 23, 42],
                fontSize: 7.8,
                cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
                valign: 'middle',
                overflow: 'linebreak',
                lineHeight: 1.2
            },
            columnStyles: columnStyles,
            didParseCell: (data) => {
                const col = cols[data.column.index];
                if (col && col.align) {
                    data.cell.styles.halign = col.align;
                }
            },
            rowPageBreak: 'avoid',
            margin: { left: 14, right: 14 }
        });

        // --- 4. DIVIDER & TOTALS SECTION ---
        let postTableY = (doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY : tableStartY + 30) + 2.5;
        if (postTableY + 45 > 275) {
            doc.addPage();
            postTableY = 20;
        }
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(14, postTableY, 196, postTableY);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('We appreciate your business.', 14, postTableY + 4);

        const totLabelX = 138;
        const totValX = 196;
        let totY = postTableY + 4;

        const printTotalLine = (label, val, isBold = false, isDiscount = false) => {
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setFontSize(8);
            if (isDiscount && discountVal > 0) {
                doc.setTextColor(220, 38, 38);
            } else {
                doc.setTextColor(isBold ? 15 : 100, isBold ? 23 : 116, isBold ? 42 : 139);
            }
            doc.text(label, totLabelX, totY);
            doc.text(val, totValX, totY, { align: 'right' });
            totY += 4.0;
        };

        printTotalLine('SUBTOTAL', Number(subtotalVal).toFixed(2));
        printTotalLine('DISCOUNT', discountVal > 0 ? `-${Number(discountVal).toFixed(2)}` : Number(0).toFixed(2), false, true);
        printTotalLine('TAXABLE AMOUNT', Number(taxableVal).toFixed(2));
        if (otherChargesTotal > 0) {
            printTotalLine('OTHER CHARGES', Number(otherChargesTotal).toFixed(2));
        }
        if (bill.roundOff !== undefined && bill.roundOff !== 0) {
            printTotalLine('ROUND OFF', Number(bill.roundOff).toFixed(2));
        }
        printTotalLine('VAT', Number(taxVal).toFixed(2));
        printTotalLine('TOTAL', Number(totalVal).toFixed(2), true);
        const billPayList = bill.payment || [];
        if (billPayList.length > 0) {
            billPayList.forEach(pmt => {
                const pmtD = pmt.date ? new Date(pmt.date) : null;
                const pmtLabel = pmtD && !isNaN(pmtD.getTime())
                    ? `Payment on ${String(pmtD.getDate()).padStart(2, '0')}-${String(pmtD.getMonth() + 1).padStart(2, '0')}-${pmtD.getFullYear()}`
                    : (pmt.paymentNumber ? `Payment (${pmt.paymentNumber})` : 'Payment');
                printTotalLine(pmtLabel, `-${Number(parseFloat(pmt.amount || 0)).toFixed(2)}`);
            });
        } else if (paidVal > 0) {
            printTotalLine('PAYMENT', `-${Number(paidVal).toFixed(2)}`);
        }

        // Dotted divider before Balance Due
        doc.setDrawColor(203, 213, 225);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(14, totY + 1, 196, totY + 1);
        doc.setLineDashPattern([], 0);

        totY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('BALANCE DUE', totLabelX, totY);

        doc.setFontSize(10.5);
        doc.setTextColor(17, 24, 39);
        doc.text(`${currency} ${Number(balanceVal).toFixed(2)}`, totValX, totY, { align: 'right' });

        // Status Clean Text Display (Unboxed)
        totY += 4.5;
        const isStatusPaid = currentStatus === 'PAID' || currentStatus === 'COMPLETED';
        const statusTextColor = isStatusPaid ? [22, 163, 74]
            : currentStatus === 'OVERDUE' ? [220, 38, 38]
            : (currentStatus === 'PARTIAL' || currentStatus === 'PARTIALLY PAID') ? [234, 88, 12]
            : currentStatus === 'CANCELLED' ? [100, 116, 139]
            : [220, 38, 38];

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(statusTextColor[0], statusTextColor[1], statusTextColor[2]);
        doc.text(currentStatus, totValX, totY, { align: 'right' });

        // --- 5. VAT SUMMARY TABLE ---
        let vatSectionY = totY + 5.5;
        const vatEstHeight = 8 + (vatSummaryList.length * 5);
        if (vatSectionY + vatEstHeight > 275) {
            doc.addPage();
            vatSectionY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(_combinedTitleRgb[0], _combinedTitleRgb[1], _combinedTitleRgb[2]);
        doc.text('VAT SUMMARY', 14, vatSectionY);

        const vatTableHead = [[
            { content: '', styles: { halign: 'left' } },
            { content: 'RATE', styles: { halign: 'left' } },
            { content: 'VAT', styles: { halign: 'right' } },
            { content: 'NET', styles: { halign: 'right' } }
        ]];
        const vatTableBody = vatSummaryList.map(v => [
            '',
            parseFloat(v.rate) === 0 ? 'No VAT' : `VAT @ ${parseFloat(Number(v.rate !== undefined ? v.rate : 23).toFixed(2))}%`,
            Number(v.vatAmount).toFixed(2),
            Number(v.netAmount).toFixed(2)
        ]);

        safeAutoTable(doc, {
            startY: vatSectionY + 2,
            head: vatTableHead,
            body: vatTableBody,
            theme: 'plain',
            headStyles: {
                fillColor: tableHeaderBgRgb,
                textColor: tableHeaderTextRgb,
                fontStyle: 'bold',
                fontSize: 7.2,
                cellPadding: { top: 1.6, bottom: 1.6, left: 2.5, right: 2.5 }
            },
            bodyStyles: {
                textColor: [15, 23, 42],
                fontSize: 7.2,
                cellPadding: { top: 1.6, bottom: 1.6, left: 2.5, right: 2.5 }
            },
            columnStyles: {
                0: { cellWidth: 70, halign: 'left' },
                1: { cellWidth: 40, halign: 'left' },
                2: { cellWidth: 36, halign: 'right' },
                3: { cellWidth: 36, halign: 'right' }
            },
            didParseCell: (data) => {
                if (data.column.index === 0) data.cell.styles.halign = 'left';
                if (data.column.index === 1) data.cell.styles.halign = 'left';
                if (data.column.index === 2) data.cell.styles.halign = 'right';
                if (data.column.index === 3) data.cell.styles.halign = 'right';
            },
            margin: { left: 14, right: 14 }
        });

        // --- 6. BANK DETAILS ROUNDED BOX ---
        let bankY = (doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY : vatSectionY + 20) + 3.5;
        if (bankY + 21 > 275) {
            doc.addPage();
            bankY = 20;
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, bankY, 182, 20, 2, 2, 'FD');

        const bankBarRgb = _isLight ? [148, 163, 184] : themeRgb;
        doc.setFillColor(bankBarRgb[0], bankBarRgb[1], bankBarRgb[2]);
        doc.rect(14, bankY, 2, 20, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Name: ${bankAccountName}`, 18, bankY + 4.5);
        doc.text(`IBAN:${bankIban}`, 18, bankY + 8.5);
        doc.text(`BIC: ${bankBic}`, 18, bankY + 12.5);
        doc.text(`Account: ${bankAccount}`, 18, bankY + 16.5);

        doc.text(`NSC (SORT CODE): ${bankSortCode || '902901'}`, 108, bankY + 4.5);
        doc.text(String(bankName || 'Bank Of Ireland'), 108, bankY + 8.5);
        if (comp.bankAddress && comp.bankAddress !== '97 Main Street, Midleton, Co. Cork') {
            doc.text(String(comp.bankAddress), 108, bankY + 12.5);
        }

        // --- 7. PAYMENT HISTORY TABLE ---
        const paymentList = bill.payment || [];
        if (paymentList.length > 0) {
            let pmtSectionY = bankY + 20 + 3.5;
            const pmtEstHeight = 8 + (paymentList.length * 5.2);
            if (pmtSectionY + pmtEstHeight > 275) {
                doc.addPage();
                pmtSectionY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(_combinedTitleRgb[0], _combinedTitleRgb[1], _combinedTitleRgb[2]);
            doc.text('PAYMENT HISTORY', 14, pmtSectionY);

            const pmtTableHead = [[
                { content: 'Payment Date', styles: { halign: 'left' } },
                { content: 'Reference / Voucher', styles: { halign: 'left' } },
                { content: 'Paid From', styles: { halign: 'left' } },
                { content: 'Amount', styles: { halign: 'right' } }
            ]];

            const pmtTableBody = paymentList.map(p => {
                const d = p.date ? new Date(p.date) : null;
                const dateStr = d && !isNaN(d.getTime())
                    ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                    : '-';
                const amtStr = `${currency === 'EUR' ? '€' : `${currency} `}${Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return [
                    dateStr,
                    p.paymentNumber || '-',
                    p.bankLedger?.name || 'Bank',
                    amtStr
                ];
            });

            safeAutoTable(doc, {
                startY: pmtSectionY + 2,
                head: pmtTableHead,
                body: pmtTableBody,
                theme: 'plain',
                headStyles: {
                    fillColor: tableHeaderBgRgb,
                    textColor: tableHeaderTextRgb,
                    fontStyle: 'bold',
                    fontSize: 7.2,
                    cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 }
                },
                bodyStyles: {
                    textColor: [15, 23, 42],
                    fontSize: 7.2,
                    cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 }
                },
                columnStyles: {
                    0: { cellWidth: 38, halign: 'left' },
                    1: { cellWidth: 50, halign: 'left' },
                    2: { cellWidth: 50, halign: 'left' },
                    3: { cellWidth: 44, halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 }
            });
        }

        // --- 8. FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
        }

        const fileName = `Purchase_Bill_${String(bill.billNumber || bill.id || 'document').replace(/[\\/:*?"<>|#]/g, '_')}.pdf`;
        safeSavePdf(doc, fileName);
        toast.success(`Downloaded ${fileName}`);
        return doc;
    }

    if (isViewMode && viewBill) {
        const comp = companySettings || companyDetails || {};
        const themeColor = comp.invoiceColor || '#dedede';
        const _isLight = isLightColor(themeColor);
        const headingColor = _isLight ? '#1e293b' : themeColor;
        const tableHeaderBg = _isLight ? '#dedede' : themeColor;
        const tableHeaderText = _isLight ? '#555555' : '#ffffff';

        // Vendor details
        const targetVendor = viewBill.vendor || (vendors && vendors.find(v => String(v.id) === String(viewBill.vendorId))) || {};
        const vendorName = targetVendor.name || viewBill.billingName || 'Vendor';
        const vendorAddr = targetVendor.address || viewBill.billingAddress || '';
        const vendorCityStateZip = [
            targetVendor.city || viewBill.billingCity,
            targetVendor.state ? (targetVendor.state.includes('Co') ? targetVendor.state : `Co, ${targetVendor.state}`) : '',
            targetVendor.zipCode || targetVendor.zip || viewBill.billingZipCode
        ].filter(Boolean).join(' ');
        const vendorPhone = targetVendor.phone || viewBill.billingPhone || '';
        const vendorEmail = targetVendor.email || viewBill.billingEmail || '';
        const vendorVat = targetVendor.taxNumber || targetVendor.vatNumber || targetVendor.gstin || '';

        // Company Logo
        const companyLogoSrc = getCompanyLogoSrc(comp.invoiceLogo || comp.logo);

        // Custom Fields
        let cfData = {};
        if (viewBill.customFields) {
            try {
                cfData = typeof viewBill.customFields === 'string' ? JSON.parse(viewBill.customFields) : viewBill.customFields;
            } catch (e) {
                cfData = {};
            }
        }
        const parsedOtherCharges = Array.isArray(cfData?._otherCharges) ? cfData._otherCharges : [];
        const otherChargesTotal = parsedOtherCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

        const rawItems = viewBill.purchasebillitem || viewBill.items || [];
        const lineItems = rawItems.length > 0 ? rawItems : (viewBill.bills ? viewBill.bills.flatMap(b => b.purchasebillitem || b.items || []) : []);

        // Compute items gross, discount, and VAT
        let computedItemsGross = 0;
        let computedItemsDisc = 0;
        let computedItemsTax = 0;
        const vatSummaryMap = {};

        lineItems.forEach(item => {
            const qty = parseFloat(item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty !== undefined && item.qty !== null ? item.qty : 1)) || 0;
            const rate = parseFloat(item.rate !== undefined && item.rate !== null ? item.rate : (item.price || 0)) || 0;
            const gross = qty * rate;

            const r = parseFloat(item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : (item.tax || 0)) || 0;

            let lineDisc = 0;
            const rawDisc = parseFloat(item.discount || 0) || 0;
            if (rawDisc > 0) {
                if (item.discountType === 'percentage' || (rawDisc <= 100 && !item.discountType && rawDisc > 0 && Math.abs((gross * rawDisc) / 100 - (item.discountAmount || 0)) < 0.01)) {
                    lineDisc = (gross * rawDisc) / 100;
                } else {
                    lineDisc = rawDisc;
                }
            } else if (item.discountAmount) {
                lineDisc = parseFloat(item.discountAmount) || 0;
            }
            lineDisc = Math.min(gross, Math.max(0, lineDisc));
            const net = Math.max(0, gross - lineDisc);
            const lineVat = r > 0 ? (net * r) / 100 : 0;

            computedItemsGross += gross;
            computedItemsDisc += lineDisc;
            computedItemsTax += lineVat;

            const rateKey = parseFloat(r.toFixed(2));
            if (!vatSummaryMap[rateKey]) {
                vatSummaryMap[rateKey] = { rate: rateKey, vatAmount: 0, netAmount: 0 };
            }
            vatSummaryMap[rateKey].netAmount += net;
            vatSummaryMap[rateKey].vatAmount += lineVat;
        });

        const subtotalVal = (viewBill.subtotal !== undefined && viewBill.subtotal !== null && parseFloat(viewBill.subtotal) > 0)
            ? parseFloat(viewBill.subtotal)
            : (computedItemsGross > 0 ? computedItemsGross : (parseFloat(viewBill.totalAmount || 0) - parseFloat(viewBill.taxAmount || 0) + parseFloat(viewBill.discountAmount || 0) - otherChargesTotal));

        const getOverallDiscountAmt = () => {
            if (viewBill.overallDiscount > 0) {
                if (viewBill.overallDiscountType === 'percentage') {
                    const F = (parseFloat(viewBill.overallDiscount) || 0) / 100;
                    if (F >= 1) return parseFloat(viewBill.discountAmount || 0);
                    const sub = parseFloat(subtotalVal) || 0;
                    const totDisc = parseFloat(viewBill.discountAmount || 0);
                    const tax = parseFloat(viewBill.taxAmount || 0);
                    return ((sub - totDisc + tax) * F) / (1 - F);
                }
                return parseFloat(viewBill.overallDiscount) || 0;
            }
            return 0;
        };

        const overallDiscountAmt = getOverallDiscountAmt();
        const discountVal = (viewBill.discountAmount !== undefined && viewBill.discountAmount !== null && parseFloat(viewBill.discountAmount) > 0)
            ? parseFloat(viewBill.discountAmount)
            : (overallDiscountAmt > 0 ? overallDiscountAmt : computedItemsDisc);

        const taxableVal = Math.max(0, subtotalVal - discountVal);

        const taxVal = (viewBill.taxAmount !== undefined && viewBill.taxAmount !== null && parseFloat(viewBill.taxAmount) > 0)
            ? parseFloat(viewBill.taxAmount)
            : computedItemsTax;

        const roundOffVal = parseFloat(viewBill.roundOffAmount || viewBill.roundOff || 0);

        const totalVal = (viewBill.totalAmount !== undefined && viewBill.totalAmount !== null && parseFloat(viewBill.totalAmount) > 0)
            ? parseFloat(viewBill.totalAmount)
            : (viewBill.totalBillAmount && parseFloat(viewBill.totalBillAmount) > 0 ? parseFloat(viewBill.totalBillAmount) : (taxableVal + taxVal + otherChargesTotal + roundOffVal));

        const paidVal = parseFloat(viewBill.paidAmount || 0);
        const balanceVal = viewBill.balanceAmount !== undefined && viewBill.balanceAmount !== null
            ? parseFloat(viewBill.balanceAmount)
            : Math.max(0, totalVal - paidVal);

        const vatSummaryList = Object.values(vatSummaryMap).sort((a, b) => b.rate - a.rate);
        if (vatSummaryList.length === 0 && (taxVal > 0 || taxableVal > 0)) {
            const defaultRate = taxableVal > 0 ? (taxVal / taxableVal) * 100 : 23;
            vatSummaryList.push({ rate: defaultRate, vatAmount: taxVal, netAmount: taxableVal });
        }

        const isDuePassedDate = Boolean(viewBill.dueDate && new Date(viewBill.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0));
        const rawStatus = String(viewBill.status || '').toUpperCase();
        const tol = 0.01;
        const currentStatus = (() => {
            if (rawStatus === 'CANCELLED') return 'CANCELLED';
            if (balanceVal <= tol && (totalVal > 0 || paidVal > 0)) return 'PAID';
            if (balanceVal <= tol && totalVal === 0) return 'PAID';
            if (rawStatus === 'PAID' && balanceVal <= tol) return 'PAID';
            if (paidVal > tol && balanceVal > tol) return 'PARTIALLY PAID';
            if (rawStatus === 'PARTIAL' || rawStatus === 'PARTIALLY PAID') return 'PARTIALLY PAID';
            if (balanceVal > tol && isDuePassedDate) return 'OVERDUE';
            if (rawStatus === 'OVERDUE' && balanceVal > tol) return 'OVERDUE';
            if (rawStatus && rawStatus !== 'UNPAID' && rawStatus !== 'DUE') return rawStatus;
            return 'UNPAID';
        })();

        // Bank details
        const bankAccountName = comp.accountName || comp.accountHolder || comp.name || 'CEAC LTD';
        const bankIban = comp.iban || 'IE03BOFI90290116673832';
        const bankBic = comp.bic || 'BOFIIE2D';
        const bankAccount = comp.accountNumber || '16673832';
        const bankSortCode = comp.sortCode || '902901';
        const bankName = comp.bankName || 'Bank Of Ireland';
        const bankAddress = comp.bankAddress || '97 Main Street, Midleton, Co. Cork';

        const billCurrency = viewBill.currency || comp.currency || 'EUR';

        // Density class based on item count
        const effectiveItemCount = lineItems.length;
        const densityClass = effectiveItemCount <= 3
            ? 'cea-density-normal'
            : effectiveItemCount <= 6
                ? 'cea-density-moderate'
                : effectiveItemCount <= 11
                    ? 'cea-density-compact'
                    : 'cea-density-ultra-compact';

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
                    <div className="PBILL-view-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!viewBill.isStatement && (viewBill.status === 'UNPAID' || viewBill.status === 'PARTIAL' || (parseFloat(viewBill.balanceAmount) > 0)) && hasPermission('create purchase payment') && (
                            <button
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
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                                title="Record Payment for this Bill"
                            >
                                <CreditCard size={16} /> Record Payment
                            </button>
                        )}
                        <button
                            onClick={() => buildPurchaseBillPdfDoc(viewBill)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#0f172a',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                            title="Download PDF"
                        >
                            <Download size={16} /> Download PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#475569',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                            title="Print"
                        >
                            <Printer size={16} /> Print
                        </button>
                    </div>
                </div>

                <div className="PBILL-view-content-pane printable-area">
                    <div
                        className={`invoice-preview-container invoice-cea-container ${densityClass}`}
                        id="invoice-print-content"
                        style={{
                            '--header-bg': tableHeaderBg,
                            '--header-text': tableHeaderText
                        }}
                    >
                        {/* 1. HEADER: Company Details (Left) and Logo (Right) */}
                        <div className="invoice-cea-header">
                            <div className="invoice-cea-company">
                                <div className="invoice-cea-company-name">{comp.name || 'CEAC Ltd'}</div>
                                <div className="invoice-cea-company-line">{comp.address || '17 South Mall'}</div>
                                <div className="invoice-cea-company-line">
                                    {comp.city && comp.zip
                                        ? `${comp.city}, ${comp.state ? (comp.state.includes('Co') ? comp.state : `Co, ${comp.state}`) : 'Co, Cork'} ${comp.zip}`
                                        : 'Cork, Co, Cork T12VCY2'}
                                </div>
                                <div className="invoice-cea-company-line">{comp.phone || '+353214272000'}</div>
                                <div className="invoice-cea-company-line">{comp.email || 'accounts@ceaarchitects.com'}</div>
                                <div className="invoice-cea-company-line">VAT ID: {comp.vatNumber || comp.taxNumber || '4120278GH'}</div>
                            </div>
                            <div className="invoice-cea-logo-container">
                                <img
                                    src={companyLogoSrc}
                                    alt={comp.name || "Company Logo"}
                                    className="invoice-cea-logo-img"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = ceaArchitectsLogo;
                                    }}
                                />
                            </div>
                        </div>

                        {/* 2. MIDDLE: Document Title & BILL FROM / VENDOR (Left) and Metadata Grid (Right) */}
                        <div className="invoice-cea-middle">
                            <div className="invoice-cea-middle-left">
                                <div className="invoice-cea-doc-heading" style={{ color: headingColor }}>
                                    {viewBill.isStatement ? 'VENDOR STATEMENT' : 'PURCHASE BILL'}
                                </div>
                                <div className="invoice-cea-bill-label">BILL FROM / VENDOR</div>
                                <div className="invoice-cea-client-name">{vendorName}</div>
                                {vendorAddr && <div className="invoice-cea-client-line">{vendorAddr}</div>}
                                {vendorCityStateZip && vendorCityStateZip !== vendorAddr && (
                                    <div className="invoice-cea-client-line">{vendorCityStateZip}</div>
                                )}
                                {vendorPhone && <div className="invoice-cea-client-line">{vendorPhone}</div>}
                                {vendorEmail && <div className="invoice-cea-client-line">{vendorEmail}</div>}
                                {vendorVat && <div className="invoice-cea-client-line">VAT ID: {vendorVat}</div>}
                            </div>
                            <div className="invoice-cea-middle-right">
                                <div className="invoice-cea-meta-grid">
                                    <span className="invoice-cea-kv-key">{viewBill.isStatement ? 'STATEMENT #' : 'BILL #'}</span>
                                    <span className="invoice-cea-kv-val">{viewBill.billNumber ? String(viewBill.billNumber).replace(/^#/, '') : (viewBill.isStatement ? 'Statement' : 'N/A')}</span>

                                    <span className="invoice-cea-kv-key">DATE</span>
                                    <span className="invoice-cea-kv-val">{viewBill.date ? formatCeaDate(viewBill.date) : (viewBill.earliestDate ? formatCeaDate(viewBill.earliestDate) : '')}</span>

                                    {viewBill.manualReference && (
                                        <>
                                            <span className="invoice-cea-kv-key">MANUAL REF</span>
                                            <span className="invoice-cea-kv-val">{viewBill.manualReference}</span>
                                        </>
                                    )}

                                    <span className="invoice-cea-kv-key">TERMS</span>
                                    <span className="invoice-cea-kv-val">{viewBill.paymentTerms || 'Net 30'}</span>

                                    <span className="invoice-cea-kv-key">DUE DATE</span>
                                    <span className="invoice-cea-kv-val">{viewBill.dueDate ? formatCeaDate(viewBill.dueDate) : (viewBill.latestDueDate ? formatCeaDate(viewBill.latestDueDate) : (viewBill.date ? formatCeaDate(viewBill.date) : ''))}</span>

                                    {viewBill.purchaseorder?.orderNumber && (
                                        <>
                                            <span className="invoice-cea-kv-key">P.O. #</span>
                                            <span className="invoice-cea-kv-val">{viewBill.purchaseorder.orderNumber}</span>
                                        </>
                                    )}

                                    {viewBill.goodsreceiptnote?.grnNumber && (
                                        <>
                                            <span className="invoice-cea-kv-key">G.R.N. #</span>
                                            <span className="invoice-cea-kv-val">{viewBill.goodsreceiptnote.grnNumber}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. ITEMS TABLE */}
                        <table className="invoice-cea-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ backgroundColor: tableHeaderBg }}>
                                    <th style={{ width: '18%', textAlign: 'left', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('item', 'ACTIVITY')}
                                    </th>
                                    <th style={{ width: '25%', textAlign: 'left', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('warehouse', 'DESCRIPTION')}
                                    </th>
                                    <th style={{ width: '7%', textAlign: 'center', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('uom', 'UOM')}
                                    </th>
                                    <th style={{ width: '9%', textAlign: 'right', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('quantity', 'QUANTITY')}
                                    </th>
                                    <th style={{ width: '11%', textAlign: 'right', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('rate', 'RATE')}
                                    </th>
                                    <th style={{ width: '12%', textAlign: 'center', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('discount', 'DISCOUNT')}
                                    </th>
                                    <th style={{ width: '10%', textAlign: 'center', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('tax', 'TAX')}
                                    </th>
                                    <th style={{ width: '11%', textAlign: 'right', color: tableHeaderText, backgroundColor: tableHeaderBg }}>
                                        {getTableHeader('price', 'PRICE')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, idx) => {
                                    const productName = item.product?.name || item.itemName || item.name || 'Product';
                                    const itemDesc = item.description || (item.product?.name ? item.product.name : productName) || '';
                                    const itemUom = item.uom?.unitName || (allUoms.find(u => u.id === item.uomId)?.unitName) || item.unit || 'Units';
                                    const itemQty = parseFloat(item.quantity !== undefined && item.quantity !== null ? item.quantity : (item.qty || 1)) || 0;
                                    const itemRate = parseFloat(item.rate || 0) || 0;
                                    const gross = itemQty * itemRate;

                                    const rawDisc = parseFloat(item.discount || 0) || 0;
                                    let lineDisc = 0;
                                    if (rawDisc > 0) {
                                        lineDisc = item.discountType === 'percentage' || (rawDisc <= 100 && !item.discountType && Math.abs((gross * rawDisc) / 100 - (item.discountAmount || 0)) < 0.01)
                                            ? (gross * rawDisc) / 100
                                            : rawDisc;
                                    } else if (item.discountAmount) {
                                        lineDisc = parseFloat(item.discountAmount) || 0;
                                    }
                                    lineDisc = Math.min(gross, Math.max(0, lineDisc));

                                    const itemTax = parseFloat(item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : (item.tax || 0)) || 0;
                                    const net = Math.max(0, gross - lineDisc);
                                    const lineVat = itemTax > 0 ? (net * itemTax) / 100 : 0;
                                    const itemAmt = parseFloat(item.amount !== undefined && item.amount !== null && parseFloat(item.amount) > 0 ? item.amount : (net + lineVat));

                                    const isZeroTax = itemTax === 0;
                                    const taxDisplay = isZeroTax ? 'No VAT' : `${parseFloat(itemTax.toFixed(2))}%`;
                                    const discDisplay = rawDisc > 0
                                        ? (item.discountType === 'percentage' ? `${rawDisc}%` : `-${Number(rawDisc).toFixed(2)}`)
                                        : '0%';

                                    return (
                                        <tr key={idx}>
                                            <td className="invoice-cea-activity-cell" style={{ textAlign: 'left', wordBreak: 'break-word' }}>{productName}</td>
                                            <td className="invoice-cea-desc-cell" style={{ textAlign: 'left', wordBreak: 'break-word' }}>{itemDesc}</td>
                                            <td style={{ textAlign: 'center' }}>{itemUom}</td>
                                            <td style={{ textAlign: 'right' }}>{itemQty}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(itemRate).toFixed(2)}</td>
                                            <td style={{ textAlign: 'center' }}>{discDisplay}</td>
                                            <td style={{ textAlign: 'center' }}>{taxDisplay}</td>
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
                                <span className="invoice-cea-total-val" style={{ color: discountVal > 0 ? '#dc2626' : undefined }}>
                                    {discountVal > 0 ? `-${Number(discountVal).toFixed(2)}` : Number(0).toFixed(2)}
                                </span>

                                <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>

                                {otherChargesTotal > 0 && (
                                    <>
                                        <span className="invoice-cea-total-label">OTHER CHARGES</span>
                                        <span className="invoice-cea-total-val">{Number(otherChargesTotal).toFixed(2)}</span>
                                    </>
                                )}

                                {viewBill.roundOff !== undefined && viewBill.roundOff !== 0 && (
                                    <>
                                        <span className="invoice-cea-total-label">ROUND OFF</span>
                                        <span className="invoice-cea-total-val">{Number(viewBill.roundOff).toFixed(2)}</span>
                                    </>
                                )}

                                <span className="invoice-cea-total-label">{getInvoiceLabel('tax') || 'VAT'}</span>
                                <span className="invoice-cea-total-val">
                                    {Number(taxVal).toFixed(2)}
                                </span>

                                <span className="invoice-cea-total-label">{getInvoiceLabel('total') || 'GRAND TOTAL'}</span>
                                <span className="invoice-cea-total-val" style={{ fontWeight: '700', color: '#111827' }}>
                                    {Number(totalVal).toFixed(2)}
                                </span>

                                {(() => {
                                    const billPayHistory = viewBill.payment || [];
                                    if (billPayHistory.length > 0) {
                                        return billPayHistory.map((pmt, pIdx) => {
                                            const pmtD = pmt.date ? new Date(pmt.date) : null;
                                            const pmtLabel = pmtD && !isNaN(pmtD.getTime())
                                                ? `Payment on ${String(pmtD.getDate()).padStart(2, '0')}-${String(pmtD.getMonth() + 1).padStart(2, '0')}-${pmtD.getFullYear()}`
                                                : (pmt.paymentNumber ? `Payment (${pmt.paymentNumber})` : 'Payment');
                                            const pmtAmt = parseFloat(pmt.amount || 0);
                                            const tooltipText = [
                                                pmt.paymentNumber ? `Ref: ${pmt.paymentNumber}` : '',
                                                pmt.bankLedger?.name ? `From: ${pmt.bankLedger.name}` : ''
                                            ].filter(Boolean).join(' | ');
                                            return (
                                                <React.Fragment key={`bill-pmt-inline-${pIdx}`}>
                                                    <span
                                                        className="invoice-cea-total-label"
                                                        title={tooltipText}
                                                        style={{ color: '#2563eb', fontStyle: 'normal' }}
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

                        {/* 5. DOTTED DIVIDER 2 & BALANCE DUE / STATUS */}
                        <div className="invoice-cea-divider-dotted" style={{ borderColor: '#9ca3af', opacity: 0.5 }} />

                        <div className="invoice-cea-balance-section">
                            <div className="invoice-cea-balance-box">
                                <div className="invoice-cea-balance-line">
                                    <span className="invoice-cea-balance-label">BALANCE DUE</span>
                                    <span className="invoice-cea-balance-amount" style={{ color: '#111827' }}>
                                        {billCurrency} {Number(balanceVal).toFixed(2)}
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
                                        <th style={{ width: '40%', textAlign: 'left', color: tableHeaderText, backgroundColor: tableHeaderBg }}>RATE</th>
                                        <th style={{ width: '30%', textAlign: 'right', color: tableHeaderText, backgroundColor: tableHeaderBg }}>VAT</th>
                                        <th style={{ width: '30%', textAlign: 'right', color: tableHeaderText, backgroundColor: tableHeaderBg }}>NET</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vatSummaryList.map((vat, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'left' }}>
                                                {parseFloat(vat.rate) === 0 ? 'No VAT' : `VAT @ ${parseFloat(Number(vat.rate !== undefined ? vat.rate : 23).toFixed(2))}%`}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{Number(vat.vatAmount).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(vat.netAmount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 7. BANK DETAILS BOX */}
                        <div className="invoice-cea-bank-box" style={{ borderLeft: `3px solid ${_isLight ? '#94a3b8' : themeColor}`, backgroundColor: getTintBg(themeColor, 0.04) }}>
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

                        {/* 8. PAYMENT HISTORY SECTION */}
                        {/* {(() => {
                            const paymentList = viewBill.payment || [];
                            if (paymentList.length === 0) return null;

                            return (
                                <div className="invoice-cea-payment-history-section" style={{ marginTop: '24px', marginBottom: '20px' }}>
                                    <div className="invoice-cea-vat-title" style={{ color: headingColor, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                        Payment History
                                    </div>
                                    <table className="invoice-cea-vat-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: tableHeaderBg }}>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', color: tableHeaderText, fontWeight: '600', backgroundColor: tableHeaderBg }}>Payment Date</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', color: tableHeaderText, fontWeight: '600', backgroundColor: tableHeaderBg }}>Reference / Voucher</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', color: tableHeaderText, fontWeight: '600', backgroundColor: tableHeaderBg }}>Paid From</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right', color: tableHeaderText, fontWeight: '600', backgroundColor: tableHeaderBg }}>Payment Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentList.map((pmt, pIdx) => {
                                                const d = pmt.date ? new Date(pmt.date) : null;
                                                const pmtDate = d && !isNaN(d.getTime())
                                                    ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                                                    : '-';
                                                const amtStr = formatDocCurrency(pmt.amount || 0, billCurrency);

                                                return (
                                                    <tr key={pIdx} style={{ borderBottom: '1px solid #e2e8f0', background: pIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                                        <td style={{ padding: '9px 12px', textAlign: 'left', color: '#334155' }}>{pmtDate}</td>
                                                        <td style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '600', color: '#0f172a' }}>{pmt.paymentNumber || '-'}</td>
                                                        <td style={{ padding: '9px 12px', textAlign: 'left', color: '#475569' }}>{pmt.bankLedger?.name || 'Bank'}</td>
                                                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{amtStr}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()} */}

                        {/* 9. NOTES & TERMS */}
                        {(() => {
                            let displayNotes = viewBill?.notes || comp.notes || '';
                            const linkedGrnNo = viewBill?.goodsreceiptnote?.grnNumber;
                            const linkedPoNo = viewBill?.purchaseorder?.orderNumber;

                            if (linkedGrnNo && !displayNotes.includes(linkedGrnNo)) {
                                displayNotes = `GRN No: ${linkedGrnNo}${displayNotes ? '\n' + displayNotes : ''}`;
                            }
                            if (linkedPoNo && !displayNotes.includes(linkedPoNo)) {
                                displayNotes = `Purchase Order No: ${linkedPoNo}${displayNotes ? '\n' + displayNotes : ''}`;
                            }

                            if (!displayNotes && !comp.termsPurchase && !comp.terms) return null;

                            return (
                                <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', textAlign: 'left' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Notes &amp; Terms</div>
                                    {displayNotes && (
                                        <p style={{ color: '#475569', fontSize: '12px', whiteSpace: 'pre-line', marginBottom: '6px' }}>{displayNotes}</p>
                                    )}
                                    {(comp.termsPurchase || comp.terms) && (
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            <strong>Terms &amp; Conditions:</strong> {comp.termsPurchase || comp.terms}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 10. ATTACHMENTS */}
                        {(() => {
                            const atts = cfData?._attachments;
                            const photos = atts?.photos || [];
                            const files = atts?.files || [];
                            if (photos.length === 0 && files.length === 0) return null;

                            return (
                                <div className="PBILL-no-print no-print" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', textAlign: 'left' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Attachments</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {photos.map((item, idx) => (
                                            <a key={`p-${idx}`} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                                                <span>🖼️</span> {item.name}
                                            </a>
                                        ))}
                                        {files.map((item, idx) => (
                                            <a key={`f-${idx}`} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>
                                                <span>📎</span> {item.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 11. PAGE FOOTER */}
                        <div className="invoice-cea-page-footer" style={{ marginTop: '24px', textAlign: 'right', fontSize: '11px', color: '#94a3b8' }}>
                            Page 1 of 1
                        </div>
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
                                                    subtotal: 0,
                                                    discountAmount: 0,
                                                    taxAmount: 0,
                                                    roundOffAmount: 0,
                                                    totalBillAmount: 0,
                                                    totalAmount: 0,
                                                    paidAmount: 0,
                                                    totalReturnAmount: 0,
                                                    balanceAmount: 0,
                                                    earliestDate: b.date,
                                                    latestDueDate: b.dueDate
                                                };
                                            }
                                            const rate = getSyncRate(b.currency || 'USD', companySettings?.currency || 'EUR');
                                            groupedMap[key].bills.push(b);

                                            const bSubtotal = (b.subtotal !== undefined && b.subtotal !== null && parseFloat(b.subtotal) > 0)
                                                ? parseFloat(b.subtotal)
                                                : (parseFloat(b.totalAmount || 0) - parseFloat(b.taxAmount || 0) + parseFloat(b.discountAmount || 0));
                                            const bDiscount = parseFloat(b.discountAmount || 0);
                                            const bTax = parseFloat(b.taxAmount || 0);
                                            const bRoundOff = parseFloat(b.roundOffAmount || b.roundOff || 0);
                                            const bTotal = parseFloat(b.totalAmount || 0);
                                            const bPaid = parseFloat(b.paidAmount || 0);
                                            const bBalance = parseFloat(b.balanceAmount !== undefined ? b.balanceAmount : (bTotal - bPaid));

                                            groupedMap[key].subtotal += bSubtotal * rate;
                                            groupedMap[key].discountAmount += bDiscount * rate;
                                            groupedMap[key].taxAmount += bTax * rate;
                                            groupedMap[key].roundOffAmount += bRoundOff * rate;
                                            groupedMap[key].totalBillAmount += bTotal * rate;
                                            groupedMap[key].totalAmount += bTotal * rate;
                                            groupedMap[key].paidAmount += bPaid * rate;
                                            groupedMap[key].balanceAmount += bBalance * rate;

                                            const curr = b.currency || companySettings?.currency || 'EUR';
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
                                                    const retRate = getSyncRate(ret.currency || b.currency || 'USD', companySettings?.currency || 'EUR');
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
                                                                const baseCurr = companySettings?.currency || 'EUR';
                                                                if (currs.length === 1) {
                                                                    const curr = currs[0];
                                                                    const originalAmount = group.currencyTotals[curr];
                                                                    if (curr !== baseCurr) {
                                                                        return (
                                                                            <span>
                                                                                {formatDocCurrency(group.balanceAmount, baseCurr)}
                                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b', marginLeft: '6px' }}>
                                                                                    ({formatDocCurrency(originalAmount, curr)})
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    }
                                                                } else if (currs.length > 1) {
                                                                    return (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            <span style={{ fontWeight: '700' }}>
                                                                                Total: {formatDocCurrency(group.balanceAmount, baseCurr)}
                                                                            </span>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                                {currs.map(curr => (
                                                                                    <span key={curr} style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                                        ({formatDocCurrency(group.currencyTotals[curr], curr)})
                                                                                    </span>
                                                                                ))}
                                                                            </div>
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
                                                                                const subRate = getSyncRate(pb.currency || 'USD', companySettings?.currency || 'EUR');
                                                                                return (
                                                                                    <tr key={`pb-${pb.id}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#64748b' }}>BILL</td>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{pb.billNumber}</td>
                                                                                        <td style={{ padding: '10px' }}>{new Date(pb.date).toLocaleDateString()}</td>
                                                                                        <td style={{ padding: '10px' }}>
                                                                                            {pb.currency && pb.currency !== (companySettings?.currency || 'EUR') ? (
                                                                                                <>
                                                                                                    {formatDocCurrency(pb.totalAmount * subRate, companySettings?.currency || 'EUR')}
                                                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                        ({formatDocCurrency(pb.totalAmount, pb.currency)})
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                formatDocCurrency(pb.totalAmount, companySettings?.currency || 'EUR')
                                                                                            )}
                                                                                        </td>
                                                                                        <td style={{ padding: '10px', fontWeight: 'bold' }}>
                                                                                            {pb.currency && pb.currency !== (companySettings?.currency || 'EUR') ? (
                                                                                                <>
                                                                                                    {formatDocCurrency(pb.balanceAmount * subRate, companySettings?.currency || 'EUR')}
                                                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                        ({formatDocCurrency(pb.balanceAmount, pb.currency)})
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                formatDocCurrency(pb.balanceAmount, companySettings?.currency || 'EUR')
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
                                                                                                <button className="PBILL-btn-icon view" onClick={() => handleView(pb)} title="View"><Eye size={14} /></button>
                                                                    <button className="PBILL-btn-icon download" onClick={() => buildPurchaseBillPdfDoc(pb)} title="Download PDF"><Download size={14} /></button>
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
                                {(() => { const lSrc = getCompanyLogoSrc(companyDetails?.invoiceLogo || companyDetails?.logo || companySettings?.invoiceLogo || companySettings?.logo); return lSrc ? <img src={lSrc} alt="Company Logo" className="PBILL-modal-logo-img" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} /> : null; })()}
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
                                gridTemplateColumns: '1fr 1fr',
                                justifyContent: 'space-between',
                                gap: '2rem',
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
                                                let newDueDate = billMeta.dueDate;
                                                if (paymentTerm !== 'custom') {
                                                    const days = parseInt(paymentTerm, 10) || 0;
                                                    newDueDate = calculateDueDate(newDate, days);
                                                }
                                                setBillMeta({ ...billMeta, date: newDate, dueDate: newDueDate });
                                            }}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="PBILL-compact-input" />
                                    </div>

                                    <div className="PBILL-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>VENDOR / CASH *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '280px' }}>
                                            <SearchableSelect
                                                options={vendors}
                                                value={vendorId}
                                                onChange={async (vId) => {
                                                    setVendorId(vId);
                                                    if (!vId) {
                                                        setSelectedVendorCreditPeriod(0);
                                                        setPaymentTerm('0');
                                                        setAvailablePayments([]);
                                                        setAdjustments([]);
                                                        return;
                                                    }
                                                    const vendorObj = vendors.find(v => v.id == vId);
                                                    const creditDays = vendorObj?.creditPeriod || 0;
                                                    setSelectedVendorCreditPeriod(creditDays);

                                                    let matchedTerm = 'custom';
                                                    if (creditDays === 0) matchedTerm = '0';
                                                    else if (creditDays === 7) matchedTerm = '7';
                                                    else if (creditDays === 30) matchedTerm = '30';
                                                    else if (creditDays === 60) matchedTerm = '60';
                                                    setPaymentTerm(matchedTerm);

                                                    const newDueDate = calculateDueDate(billMeta.date, creditDays);
                                                    setBillMeta(prev => ({ ...prev, dueDate: newDueDate }));
                                                    await fetchVendorPayments(vId);
                                                }}
                                                placeholder="Choose a Vendor..."
                                                disabled={!!sourceData}
                                            />
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
                                <div className="PBILL-header-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
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
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.04em' }}>
                                            DUE DATE &amp; TERMS
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <select
                                                value={paymentTerm}
                                                onChange={(e) => handlePaymentTermChange(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    height: '36px',
                                                    fontSize: '0.825rem',
                                                    fontWeight: '500',
                                                    color: '#334155',
                                                    borderRadius: '6px',
                                                    border: '1.5px solid #cbd5e1',
                                                    backgroundColor: '#fff',
                                                    padding: '0 32px 0 10px',
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 10px center',
                                                    backgroundSize: '12px',
                                                    boxSizing: 'border-box',
                                                    cursor: 'pointer'
                                                }}
                                                title="Select payment terms or due date offset"
                                            >
                                                <option value="0">Due upon receipt (0 days)</option>
                                                <option value="7">Net 7 (7 days from bill date)</option>
                                                <option value="30">Net 30 (30 days from bill date)</option>
                                                <option value="60">Net 60 (60 days from bill date)</option>
                                                <option value="custom">Custom Date</option>
                                            </select>
                                            <input
                                                type="date"
                                                value={billMeta.dueDate}
                                                onChange={(e) => handleCustomDueDateChange(e.target.value)}
                                                style={{ width: '100%', height: '36px', fontSize: '0.825rem', boxSizing: 'border-box' }}
                                                className="PBILL-compact-input"
                                            />
                                        </div>
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
                                            {selectedCurrency !== (companySettings?.currency || 'EUR') && (
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
                                                            const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'EUR') || 1.0;
                                                            const convertedPrice = p.purchasePrice ? (p.purchasePrice / conversionRate) : 0;
                                                            const newItem = {
                                                                id: Date.now() + Math.random(),
                                                                productId: String(p.id),
                                                                warehouseId: autoWarehouseId,
                                                                qty: 1,
                                                                uomId: p.purchaseUomId || p.uomId || '',
                                                                rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                tax: p.taxRate !== undefined && p.taxRate !== null && p.taxRate !== '' ? parseFloat(p.taxRate) : defaultVat,
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
                                                {getInvoiceLabel('showTax') !== false && <th style={{ width: '8%', textAlign: 'center' }}>{getTableHeader('tax', 'VAT %').toUpperCase()}</th>}
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
                                                            <select
                                                                className="PBILL-compact-input text-center"
                                                                value={item.tax !== undefined && item.tax !== null ? item.tax : defaultVat}
                                                                onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                                                style={{ fontWeight: 600, cursor: 'pointer', appearance: 'auto', padding: '2px 4px' }}
                                                            >
                                                                <option value="23">23% (Std)</option>
                                                                <option value="13.5">13.5% (Red)</option>
                                                                <option value="0">No VAT</option>
                                                                {![23, 13.5, 0, '23', '13.5', '0'].includes(item.tax) && item.tax !== undefined && item.tax !== '' && (
                                                                    <option value={item.tax}>{parseFloat(item.tax) === 0 ? 'No VAT' : `${item.tax}%`}</option>
                                                                )}
                                                            </select>
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
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '7px 14px',
                                            background: '#f1f5f9',
                                            color: '#0f172a',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            fontSize: '0.825rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    >
                                        <Plus size={15} /> Add Line Item
                                    </button>
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
                                                    onChange={(e) => setBillMeta({ ...billMeta, deliveryPersonMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                                    maxLength={10}
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
                                        <div className="PBILL-compact-t-row font-semibold text-slate-700 bg-slate-50 py-0.5 px-1 rounded">
                                            <span>Taxable Amount:</span>
                                            <span>{formatDocCurrency(Math.max(0, totals.subTotal - totals.discount), selectedCurrency)}</span>
                                        </div>
                                        <div className="PBILL-compact-t-row">
                                            <span>{getInvoiceLabel('tax', 'VAT Amount')}:</span>
                                            <span>{formatDocCurrency(totals.tax, selectedCurrency)}</span>
                                        </div>
                                        {/* Overall Discount removed from creation UI */}
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
                                    {selectedCurrency !== (companySettings?.currency || 'EUR') && (
                                        <div className="PBILL-compact-t-row text-xs text-gray-500 font-medium border-t border-gray-100">
                                            <span>Base Total ({companySettings?.currency || 'EUR'}):</span>
                                            <span>{formatDocCurrency(totals.total * (parseFloat(exchangeRate) || 1.0), companySettings?.currency || 'EUR')}</span>
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
                                                maxLength={10}
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
                                                    maxLength={10}
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
                                                            maxLength={10}
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
                                        <label className="Zirak-Inventory-form-label">Item Code / SKU</label>
                                        <input
                                            type="text"
                                            className="Zirak-Inventory-form-input"
                                            name="hsn"
                                            placeholder="Enter Item Code / SKU"
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
                                        <label className="Zirak-Inventory-form-label">Base Unit (Tracking Unit)</label>
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
                                    onChange={(e) => setSalespersonFormData({ ...salespersonFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    maxLength={10}
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
                                    onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    maxLength={10}
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
