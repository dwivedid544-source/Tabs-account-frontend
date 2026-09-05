import React, { useState, useEffect, useContext, useRef } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import { CompanyContext } from '../../../../context/CompanyContext';
import { AuthContext } from '../../../../context/AuthContext';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Download, Send, Printer,
    Eye, Copy, ArrowLeft, AlertTriangle, RotateCcw, Mail, FileSpreadsheet, Shield
} from 'lucide-react';
import './Invoice.css';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import axiosInstance from '../../../../api/axiosInstance';
import salesOrderService from '../../../../api/salesOrderService';
import customerService from '../../../../api/customerService';
import salesReceiptService from '../../../../api/salesReceiptService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import servicesService from '../../../../api/servicesService';
import companyService from '../../../../api/companyService';
import deliveryChallanService from '../../../../api/deliveryChallanService';
import posService from '../../../../services/posService';
import uomService from '../../../../services/uomService';
import salespersonService from '../../../../services/salespersonService';
import deliverypersonService from '../../../../services/deliverypersonService';
import GetCompanyId from '../../../../api/GetCompanyId';
import smtpService from '../../../../api/smtpService';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import '../../Customers/Customers.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import customerServiceFromServices from '../../../../services/customerService';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { Upload, Loader2 } from 'lucide-react';
import tabAccountsLogo from '../../../../assets/tab-accounts-logo.png';
import ExcelImportModal from '../../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../../utils/excelService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BASE_URL } from '../../../../api/axiosInstance';

const getCompanyLogoSrc = (logoVal) => {
    if (!logoVal) return tabAccountsLogo;
    if (typeof logoVal === 'string') {
        if (logoVal.startsWith('data:') || logoVal.startsWith('http://') || logoVal.startsWith('https://')) {
            return logoVal;
        }
        const cleanPath = logoVal.startsWith('/') ? logoVal : `/${logoVal}`;
        const serverUrl = BASE_URL || 'http://localhost:8080';
        return `${serverUrl}${cleanPath}`;
    }
    return tabAccountsLogo;
};

const Invoice = () => {
    const { companySettings, formatCurrency, getInvoiceLabel, getTableHeader, getDocumentTitle, getExchangeRateFor, getSyncRate } = useContext(CompanyContext);
    const defaultVat = companySettings?.defaultVatRate !== undefined ? parseFloat(companySettings.defaultVatRate) : 23;
    const { hasPermission } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const calculateDueDate = (dateStr, creditPeriod) => {
        if (!dateStr) return '';
        const days = parseInt(creditPeriod) || 0;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };
    // --- State Management ---
    const [invoices, setInvoices] = useState([]);
    const [customerViewOption, setCustomerViewOption] = useState('all'); // 'all' (Combined for all customers) | 'single' (For one selected customer only)
    const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportScope, setExportScope] = useState('filtered'); // 'filtered' | 'all'
    const [selectedCurrency, setSelectedCurrency] = useState(() => companySettings?.currency || 'EUR');
    const [exchangeRate, setExchangeRate] = useState(1.0);
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

    useEffect(() => {
        if (companySettings?.currency) {
            setSelectedCurrency(companySettings.currency);
        }
    }, [companySettings]);

    const handleCurrencyChange = async (cur) => {
        setSelectedCurrency(cur);
        let rateVal = 1.0;
        if (cur !== (companySettings?.currency || 'EUR')) {
            try {
                rateVal = await getExchangeRateFor(cur, companySettings?.currency || 'EUR');
            } catch (e) {
                rateVal = 1.0;
            }
        }
        setExchangeRate(rateVal.toFixed(6));

        // Convert existing items rates to the new currency
        setItems(prevItems => prevItems.map(item => {
            let basePrice = 0;
            if (item.productId) {
                const prodId = String(item.productId).startsWith('p-') ? parseInt(String(item.productId).replace('p-', '')) : parseInt(item.productId);
                const prod = allProducts.find(p => p.id === prodId);
                if (prod) {
                    basePrice = prod.salePrice || 0;
                    // Apply UOM multiplier if any
                    const uom = allUoms.find(u => u.id === item.uomId) || prod.uom || prod.salesUom || prod.purchaseUom;
                    const multiplier = uom?.uomType === 'Compound' ? parseFloat(uom.conversionRate) || 1 : 1;
                    basePrice = basePrice * multiplier;
                }
            } else if (item.serviceId) {
                const sId = String(item.serviceId).startsWith('s-') ? parseInt(String(item.serviceId).replace('s-', '')) : parseInt(item.serviceId);
                const s = allServices.find(x => x.id === sId);
                if (s) {
                    basePrice = s.price || 0;
                }
            } else {
                // If it's a custom line item with no product/service, convert the current rate directly
                const prevRate = parseFloat(item.rate) || 0;
                const prevConversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                const priceInBase = prevRate * prevConversionRate;
                const converted = priceInBase / rateVal;

                const qty = parseFloat(item.qty) || 0;
                const rate = Number(converted.toFixed(2)) || 0;
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
            const rate = Number(converted.toFixed(2)) || 0;
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
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
    const [activeOrders, setActiveOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allWarehouses, setAllWarehouses] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [allUoms, setAllUoms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sourceSearchTerm, setSourceSearchTerm] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Email Invoice Modal States
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInvoiceData, setEmailInvoiceData] = useState(null);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [emailAttachPdf, setEmailAttachPdf] = useState(true);
    const [emailSendBcc, setEmailSendBcc] = useState(true);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [smtpStatus, setSmtpStatus] = useState({ checking: false, isConfigured: true, fromEmail: '', fromName: '' });

    const handleOpenEmailModal = async (invoice) => {
        if (!invoice) return;
        const custEmail = invoice.customer?.email || invoice.billingEmail || '';
        const invNum = invoice.invoiceNumber || `INV-${invoice.id}`;
        const compName = companySettings?.name || 'Tab Accounts';
        const curr = invoice.currency || companySettings?.currency || 'EUR';
        const total = parseFloat(invoice.totalAmount || 0).toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const due = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Upon receipt';

        setEmailInvoiceData(invoice);
        setEmailRecipient(custEmail);
        setEmailSubject(`Invoice #${invNum} from ${compName} - ${curr} ${total}`);
        setEmailMessage(`Dear ${invoice.customer?.name || 'Customer'},\n\nPlease find attached your invoice #${invNum} for ${curr} ${total}, due on ${due}.\n\nYou can also review and pay your invoice online through our secure portal.\n\nThank you for your business.\n\nKind regards,\n${compName}`);
        setEmailAttachPdf(true);
        setEmailSendBcc(true);
        setShowEmailModal(true);

        // Fetch company SMTP status
        const companyId = GetCompanyId();
        try {
            setSmtpStatus(prev => ({ ...prev, checking: true }));
            const res = await smtpService.getSettings(companyId);
            if (res.data?.success && res.data?.data) {
                setSmtpStatus({
                    checking: false,
                    isConfigured: !!res.data.data.isConfigured,
                    fromEmail: res.data.data.fromEmail || '',
                    fromName: res.data.data.fromName || ''
                });
            } else {
                setSmtpStatus({ checking: false, isConfigured: false, fromEmail: '', fromName: '' });
            }
        } catch (err) {
            console.warn('Could not retrieve SMTP settings:', err);
            setSmtpStatus({ checking: false, isConfigured: false, fromEmail: '', fromName: '' });
        }
    };

    const handleSendInvoiceEmail = async () => {
        if (!emailRecipient || !emailRecipient.includes('@')) {
            toast.error('Please enter a valid recipient email address.');
            return;
        }

        if (!smtpStatus.isConfigured) {
            toast.error('SMTP is not configured for this company. Please configure outgoing email in Settings before sending.');
            return;
        }

        try {
            setSendingEmail(true);
            const companyId = GetCompanyId();
            const res = await salesInvoiceService.sendEmail(emailInvoiceData.id, {
                recipientEmail: emailRecipient,
                subject: emailSubject,
                message: emailMessage,
                attachPdf: emailAttachPdf,
                sendBcc: emailSendBcc,
                customerId: emailInvoiceData.customer?.id || emailInvoiceData.customerId,
                invoiceNumber: emailInvoiceData.invoiceNumber,
                companyId
            }, companyId);

            if (res.data?.success) {
                toast.success(res.data.message || `Invoice emailed successfully to ${emailRecipient}`);
                setShowEmailModal(false);
            } else {
                toast.error(res.data?.message || 'Failed to send invoice email');
            }
        } catch (error) {
            console.error('Error sending invoice email:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to send invoice email';
            toast.error(errorMsg);
        } finally {
            setSendingEmail(false);
        }
    };

    // Inline Modals States
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [customerFormData, setCustomerFormData] = useState({
        name: '',
        nameArabic: '',
        companyName: '',
        companyLocation: '',
        profileImage: '',
        anyFile: '',
        accountType: 'Credit',
        balanceType: 'Debit',
        accountBalance: 0,
        creationDate: new Date().toISOString().split('T')[0],
        bankAccountNumber: '',
        bankIFSC: '',
        bankNameBranch: '',
        phone: '',
        email: '',
        creditPeriod: '',
        gstNumber: '',
        gstEnabled: false,
        billingName: '',
        billingPhone: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingCountry: '',
        billingZipCode: '',
        shippingSameAsBilling: false,
        shippingName: '',
        shippingPhone: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingCountry: '',
        shippingZipCode: '',
        shippingAddresses: []
    });
    const [uploadingAnyFile, setUploadingAnyFile] = useState(false);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [customerSubmitting, setCustomerSubmitting] = useState(false);
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUnpayModal, setShowUnpayModal] = useState(false);
    const [invoiceToUnpay, setInvoiceToUnpay] = useState(null);

    // View Request State
    const [viewMode, setViewMode] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const viewRate = getSyncRate(selectedInvoice?.currency || 'USD', companySettings?.currency || 'EUR');
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [invoiceFilterCustomerId, setInvoiceFilterCustomerId] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    // POS Payment States
    const [accounts, setAccounts] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('CASH');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const [creationMode, setCreationMode] = useState('direct');
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('percentage');
    const [customerShippingAddresses, setCustomerShippingAddresses] = useState([]);
    const [availableReceipts, setAvailableReceipts] = useState([]);
    const [adjustments, setAdjustments] = useState([]);
    const [manualStatus, setManualStatus] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState('UNPAID');
    const [salespersonsList, setSalespersonsList] = useState([]);
    const [salespersonId, setSalespersonId] = useState('');
    const [carNumber, setCarNumber] = useState('');
    const [manualReference, setManualReference] = useState('');
    const [numberingMode, setNumberingMode] = useState('auto');
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
    const [showCurrencyField, setShowCurrencyField] = useState(false);
    // Other Charges state
    const [showOtherCharges, setShowOtherCharges] = useState(false);
    const [otherCharges, setOtherCharges] = useState([]);
    const [otherChargesAccounts, setOtherChargesAccounts] = useState([]);

    useEffect(() => {
        if (!showCurrencyField) {
            setSelectedCurrency(companySettings?.currency || 'EUR');
            setExchangeRate(1.0);
        }
    }, [showCurrencyField, companySettings]);

    // Attachments State & Refs
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const photoInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const handleUnpay = (invoice) => {
        setInvoiceToUnpay(invoice);
        setShowUnpayModal(true);
    };

    const confirmUnpay = async () => {
        if (!invoiceToUnpay) return;
        try {
            const companyId = GetCompanyId();
            const res = await salesInvoiceService.unpay(invoiceToUnpay.id, companyId);
            if (res.data.success) {
                toast.success('Invoice marked as unpaid and all payments reverted successfully.');
                setShowUnpayModal(false);
                fetchData();
                if (selectedInvoice?.id === invoiceToUnpay.id) {
                    refreshSelectedInvoice(invoiceToUnpay.id, invoiceToUnpay.type);
                }
                setInvoiceToUnpay(null);
            } else {
                toast.error(res.data.message || 'Failed to revert payments.');
            }
        } catch (error) {
            console.error('Error reverting payments:', error);
            toast.error(error.response?.data?.message || 'Failed to revert payments.');
        }
    };

    const handleEdit = async (invoice) => {
        if (invoice.paidAmount > 0 || invoice.status === 'PAID' || invoice.status === 'PARTIAL') {
            toast.error('A paid or partially paid invoice cannot be edited. Please mark it as unpaid first.');
            return;
        }
        try {
            const companyId = GetCompanyId();
            const response = await salesInvoiceService.getById(invoice.id, companyId);
            if (response.data.success) {
                const inv = response.data.data;
                setEditingId(inv.id);
                setCustomerId(inv.customerId);
                if (inv.customerId) {
                    const custRes = await customerService.getById(inv.customerId, companyId);
                    if (custRes.data.success) {
                        setSelectedCustomerCreditPeriod(custRes.data.data.creditPeriod || 0);
                    }
                }
                setBillingDetails({
                    name: inv.billingName || inv.customer?.billingName || inv.customer?.name || '',
                    address: inv.billingAddress || inv.customer?.billingAddress || '',
                    city: inv.billingCity || inv.customer?.billingCity || '',
                    state: inv.billingState || inv.customer?.billingState || '',
                    zipCode: inv.billingZipCode || inv.customer?.billingZipCode || '',
                    country: inv.billingCountry || inv.customer?.billingCountry || ''
                });
                setShippingDetails({
                    name: inv.shippingName || inv.customer?.shippingName || inv.customer?.name || '',
                    address: inv.shippingAddress || inv.customer?.shippingAddress || '',
                    city: inv.shippingCity || inv.customer?.shippingCity || '',
                    state: inv.shippingState || inv.customer?.shippingState || '',
                    zipCode: inv.shippingZipCode || inv.customer?.shippingZipCode || '',
                    country: inv.shippingCountry || inv.customer?.shippingCountry || ''
                });
                setOverallDiscount(inv.overallDiscount || 0);
                setOverallDiscountType(inv.overallDiscountType || 'percentage');
                setSelectedCurrency(inv.currency || companySettings?.currency || 'EUR');
                setExchangeRate(inv.exchangeRate || 1.0);
                setManualStatus(inv.manualStatus || false);
                setOverrideStatus(inv.status || 'UNPAID');
                setCustomerShippingAddresses(inv.customer?.shippingaddress || []);
                let fieldValues = {};
                if (inv.customFields) {
                    try {
                        fieldValues = typeof inv.customFields === 'string'
                            ? JSON.parse(inv.customFields)
                            : inv.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }
                setCustomFieldValues(fieldValues);

                setSalespersonId(inv.salespersonId || '');
                setShowSalespersonField(!!inv.salespersonId);
                setShowDeliveryFields(!!fieldValues.deliveryPersonName);
                setShowCurrencyField(!!inv.currency && inv.currency !== (companySettings?.currency || 'EUR'));

                // Match delivery person from list by name if possible
                const matchingDp = (deliverypersonsList || []).find(dp => dp.name === (fieldValues.deliveryPersonName || ''));
                setSelectedDeliveryPersonId(matchingDp ? String(matchingDp.id) : '');

                setCarNumber(inv.carNumber || '');
                setManualReference(inv.manualReference || '');
                setNumberingMode('manual');
                setInvoiceMeta({
                    manualNo: inv.invoiceNumber,
                    date: new Date(inv.date).toISOString().split('T')[0],
                    dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
                    deliveryPersonName: fieldValues.deliveryPersonName || '',
                    deliveryPersonMobile: fieldValues.deliveryPersonMobile || '',
                    deliveryPersonEmail: fieldValues.deliveryPersonEmail || ''
                });
                setNotes(inv.notes || '');
                setSelectedChallan(inv.deliveryChallanId ? { id: inv.deliveryChallanId } : null);
                setSelectedOrder(inv.salesOrderId ? { id: inv.salesOrderId } : null);
                setItems((inv.invoiceitem || inv.items || []).map(i => ({
                    id: i.id,
                    productId: i.productId,
                    serviceId: i.serviceId,
                    warehouseId: i.warehouseId,
                    uomId: i.uomId || '',
                    description: i.description,
                    qty: i.quantity,
                    rate: i.rate,
                    tax: i.taxRate,
                    discount: i.discount,
                    total: i.amount
                })));
                setSelectedPhotos(fieldValues?._attachments?.photos || []);
                setSelectedFiles(fieldValues?._attachments?.files || []);
                // Restore other charges from saved customFields
                const savedOtherCharges = fieldValues?._otherCharges || [];
                if (savedOtherCharges.length > 0) {
                    setOtherCharges(savedOtherCharges);
                    setShowOtherCharges(true);
                } else {
                    setOtherCharges([]);
                    setShowOtherCharges(false);
                }
                await loadCustomerReceiptsForEdit(inv.customerId, inv.id);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error fetching invoice for edit:', error);
        }
    };

    const handleUpdate = async () => {
        try {
            if (!editingId) return;

            const companyId = GetCompanyId();

            const netBase = Math.max(0, (totals.subTotal - totals.discount) + totals.tax - (totals.ovDiscountAmt || 0));
            // Build valid other charges for update
            const validOtherChargesUpdate = showOtherCharges
                ? otherCharges.filter(c => c.accountId && parseFloat(c.value !== undefined ? c.value : c.amount) > 0).map(c => {
                    const val = parseFloat(c.value !== undefined ? c.value : c.amount) || 0;
                    const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
                    const computedAmt = isPct ? (netBase * val) / 100 : val;
                    return {
                        id: c.id,
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
                deliveryPersonName: invoiceMeta.deliveryPersonName,
                deliveryPersonMobile: invoiceMeta.deliveryPersonMobile,
                deliveryPersonEmail: invoiceMeta.deliveryPersonEmail,
                _attachments: {
                    photos: selectedPhotos,
                    files: selectedFiles
                },
                _otherCharges: validOtherChargesUpdate
            };

            const data = {
                customFields: JSON.stringify(customFieldsPayload),
                invoiceNumber: invoiceMeta.manualNo,
                manualReference: manualReference || null,
                salespersonId: salespersonId ? parseInt(salespersonId) : null,
                carNumber: carNumber || null,
                salesOrderId: selectedOrder ? parseInt(selectedOrder.id) : null,
                deliveryChallanId: selectedChallan ? parseInt(selectedChallan.id) : null,
                date: invoiceMeta.date,
                dueDate: invoiceMeta.dueDate,
                customerId: parseInt(customerId),
                companyId: parseInt(companyId),
                notes: notes,
                manualStatus,
                status: manualStatus ? overrideStatus : undefined,
                billingName: billingDetails.name,
                billingAddress: billingDetails.address,
                billingCity: billingDetails.city,
                billingState: billingDetails.state,
                billingZipCode: billingDetails.zipCode,
                billingCountry: billingDetails.country,
                shippingName: shippingDetails.name,
                shippingAddress: shippingDetails.address,
                shippingCity: shippingDetails.city,
                shippingState: shippingDetails.state,
                shippingZipCode: shippingDetails.zipCode,
                shippingCountry: shippingDetails.country,
                overallDiscount: parseFloat(overallDiscount) || 0,
                overallDiscountType: overallDiscountType,
                currency: selectedCurrency,
                exchangeRate: parseFloat(exchangeRate) || 1.0,
                adjustments: adjustments.filter(adj => adj.amount > 0).map(adj => ({
                    receiptId: adj.receiptId,
                    amount: adj.amount
                })),
                otherCharges: validOtherChargesUpdate,
                items: items.map(item => ({
                    productId: item.productId ? parseInt(item.productId) : null,
                    serviceId: item.serviceId ? parseInt(item.serviceId) : null,
                    warehouseId: item.warehouseId ? parseInt(item.warehouseId) : null,
                    uomId: item.uomId ? parseInt(item.uomId) : null,
                    description: item.description,
                    quantity: parseFloat(item.qty),
                    rate: parseFloat(item.rate),
                    discount: parseFloat(item.discount) || 0,
                    taxRate: parseFloat(item.tax)
                }))
            };

            const response = await salesInvoiceService.update(editingId, data, companyId);
            if (response.data.success) {
                toast.success('Invoice updated successfully!');
                fetchData();
                setShowAddModal(false);
                if (selectedInvoice && selectedInvoice.id === editingId) {
                    refreshSelectedInvoice(editingId);
                }
                resetForm();
                setEditingId(null);
            } else {
                toast.error(response.data?.message || 'Failed to update invoice');
            }
        } catch (error) {
            console.error('Error updating invoice:', error);
            toast.error(error.response?.data?.message || 'Error updating invoice');
        }
    };
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedChallan, setSelectedChallan] = useState(null);
    const [activeChallans, setActiveChallans] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: 'Tab Accounts', address: '', email: '', phone: '', logo: null, invoiceLogo: null,
        vatNumber: '', bankName: '', accountName: '', accountNumber: '', iban: '', bic: '', sortCode: '',
        notes: '', terms: '', showQr: true
    });
    const [invoiceMeta, setInvoiceMeta] = useState({
        manualNo: '', date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0],
        deliveryPersonName: '', deliveryPersonMobile: '', deliveryPersonEmail: ''
    });
    const [customerId, setCustomerId] = useState('');
    const [selectedCustomerCreditPeriod, setSelectedCustomerCreditPeriod] = useState(0);

    const [items, setItems] = useState([
        { id: Date.now(), productId: '', serviceId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 23, discount: 0, total: 0, description: '' }
    ]);

    const [billingDetails, setBillingDetails] = useState({
        name: '', address: '', city: '', state: '', zipCode: '', country: ''
    });
    const [shippingDetails, setShippingDetails] = useState({
        name: '', address: '', city: '', state: '', zipCode: '', country: ''
    });
    const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);

    // Sync shipping when billing changes if "Same as Billing" is checked
    useEffect(() => {
        if (shippingSameAsBilling) {
            setShippingDetails({ ...billingDetails });
        }
    }, [billingDetails, shippingSameAsBilling]);

    // Initial Fetch
    useEffect(() => {
        fetchData();
        fetchDropdowns();
        fetchCompanyDetails();
        fetchAccounts();
    }, []);

    // Handle Deep Link from Navigation State
    const deepLinkHandledRef = useRef(null);
    useEffect(() => {
        const targetId = location.state?.targetInvoiceId ? parseInt(location.state.targetInvoiceId) : null;
        if (targetId && deepLinkHandledRef.current !== targetId) {
            deepLinkHandledRef.current = targetId;
            const fetchTarget = async () => {
                try {
                    const companyId = GetCompanyId();
                    let response;
                    let found = false;

                    if (location.state.type === 'POS_INVOICE') {
                        try {
                            response = await posService.getPOSInvoiceById(targetId, companyId);
                            if (response && response.success && response.data) {
                                setSelectedInvoice({ ...response.data, type: 'POS_INVOICE' });
                                setViewMode(true);
                                found = true;
                            }
                        } catch (e) {}
                    }

                    if (!found) {
                        try {
                            response = await salesInvoiceService.getById(targetId, companyId);
                            if (response.data && response.data.success) {
                                if (location.state.isEdit || location.state.autoEdit) {
                                    handleEdit({ ...response.data.data, type: 'TAX_INVOICE' });
                                } else {
                                    setSelectedInvoice({ ...response.data.data, type: 'TAX_INVOICE' });
                                    setViewMode(true);
                                }
                                found = true;
                            }
                        } catch (e) {}
                    }

                    if (!found && location.state.type !== 'POS_INVOICE') {
                        try {
                            response = await posService.getPOSInvoiceById(targetId, companyId);
                            if (response && response.success && response.data) {
                                setSelectedInvoice({ ...response.data, type: 'POS_INVOICE' });
                                setViewMode(true);
                                found = true;
                            }
                        } catch (e) {}
                    }
                } catch (error) {
                    console.error("Error loading target invoice", error);
                } finally {
                    navigate(location.pathname, { replace: true, state: {} });
                }
            };
            fetchTarget();
        }
    }, [location.state, navigate]);

    const fetchCompanyDetails = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getById(companyId);
                const data = res.data;
                setCompanyDetails({
                    name: data.name || 'Tab Accounts',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    zip: data.zip || '',
                    country: data.country || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    website: data.website || '',
                    vatNumber: data.vatNumber || data.gstNumber || '',
                    bankName: data.bankName || '',
                    accountHolder: data.accountHolder || data.accountName || '',
                    accountName: data.accountName || data.accountHolder || '',
                    accountNumber: data.accountNumber || '',
                    iban: data.iban || '',
                    bic: data.bic || '',
                    sortCode: data.sortCode || data.ifsc || '',
                    logo: data.logo || null,
                    invoiceLogo: data.invoiceLogo || data.logo || null,
                    notes: data.notes || '',
                    terms: data.terms || '',
                    termsInvoice: data.termsInvoice || '',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true,
                    template: data.invoiceTemplate || 'New York',
                    color: data.invoiceColor || '#1e293b'
                });
                setNotes(data.notes || '');
                setTerms(data.termsInvoice || data.terms || '');
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchAccounts = async () => {
        try {
            const companyId = GetCompanyId();
            console.log("🔍 fetchAccounts - CompanyId:", companyId);
            if (companyId) {
                const res = await chartOfAccountsService.getAllLedgers(companyId);
                console.log("🔍 fetchAccounts - getAllLedgers Response:", res);
                if (res && res.success) {
                    const assetAccounts = res.data.filter(a =>
                        a.accountgroup?.type === 'ASSETS' ||
                        a.group?.type === 'ASSETS' ||
                        a.name.toLowerCase().includes('cash') ||
                        a.name.toLowerCase().includes('bank')
                    );
                    console.log("🔍 fetchAccounts - Filtered Asset Accounts:", assetAccounts);
                    setAccounts(assetAccounts);
                    // Fetch EXPENSES + INCOME ledgers for Other Charges dropdown
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
            console.error('🔍 fetchAccounts - Error fetching accounts:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await salesInvoiceService.getAll(companyId);

            if (response.data.success) {
                setInvoices(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();
            const [custRes, prodRes, whRes, servRes, orderRes, challanRes, uomRes] = await Promise.all([
                customerService.getAll(companyId),
                productService.getAll(companyId),
                warehouseService.getAll(companyId),
                servicesService.getAll(companyId),
                salesOrderService.getAll(companyId),
                deliveryChallanService.getAll(companyId),
                uomService.getUOMs(companyId)
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data);
            if (prodRes.data.success) setAllProducts(prodRes.data.data);
            if (whRes.data.success) setAllWarehouses(whRes.data.data);
            if (servRes.data.success) setAllServices(servRes.data.data);
            if (orderRes.data.success) {
                setActiveOrders(orderRes.data.data.filter(o => o.status !== 'COMPLETED'));
            }
            if (challanRes.data.success) {
                setActiveChallans(challanRes.data.data.filter(c => c.status !== 'COMPLETED'));
            }
            if (uomRes.success) {
                setAllUoms(uomRes.data);
            }
            try {
                const salespersonsRes = await salespersonService.getAll(companyId);
                if (salespersonsRes.success) {
                    setSalespersonsList(salespersonsRes.data);
                }
            } catch (err) {
                console.error("Error fetching salespersons dropdown:", err);
            }
            try {
                const deliverypersonsRes = await deliverypersonService.getAll(companyId);
                if (deliverypersonsRes.success) {
                    setDeliverypersonsList(deliverypersonsRes.data);
                }
            } catch (err) {
                console.error("Error fetching delivery persons dropdown:", err);
            }
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
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

    // Inline Customer Handlers
    const handleCustomerInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setCustomerFormData(prev => {
            let processedValue = type === 'checkbox' ? checked : value;

            if (type !== 'checkbox' && typeof processedValue === 'string') {
                if (name === 'phone' || name === 'billingPhone' || name === 'shippingPhone') {
                    processedValue = processedValue.replace(/\D/g, '');
                } else if (name === 'accountBalance') {
                    processedValue = processedValue.replace(/-/g, '');
                    if (processedValue !== '') {
                        const parsed = parseFloat(processedValue);
                        if (!isNaN(parsed) && parsed < 0) {
                            processedValue = '0';
                        }
                    }
                }
            }

            const newData = {
                ...prev,
                [name]: processedValue
            };

            if (name === 'shippingSameAsBilling' && checked) {
                newData.shippingName = prev.billingName;
                newData.shippingPhone = prev.billingPhone;
                newData.shippingAddress = prev.billingAddress;
                newData.shippingCity = prev.billingCity;
                newData.shippingState = prev.billingState;
                newData.shippingCountry = prev.billingCountry;
                newData.shippingZipCode = prev.billingZipCode;
            }

            return newData;
        });
    };

    const handleCustomerShippingAddressChange = (index, field, value) => {
        setCustomerFormData(prev => {
            const newAddresses = [...prev.shippingAddresses];
            let processedValue = value;
            if (field === 'phone' && typeof value === 'string') {
                processedValue = value.replace(/\D/g, '');
            }
            newAddresses[index] = { ...newAddresses[index], [field]: processedValue };
            return { ...prev, shippingAddresses: newAddresses };
        });
    };

    const addCustomerShippingAddress = () => {
        setCustomerFormData(prev => ({
            ...prev,
            shippingAddresses: [
                ...prev.shippingAddresses,
                { name: '', phone: '', address: '', city: '', state: '', country: '', zipCode: '', isDefault: false }
            ]
        }));
    };

    const removeCustomerShippingAddress = (index) => {
        setCustomerFormData(prev => ({
            ...prev,
            shippingAddresses: prev.shippingAddresses.filter((_, i) => i !== index)
        }));
    };

    const handleCustomerFileUpload = async (file, field, folder) => {
        if (!file) return;
        const setUploading = field === 'profileImage' ? setUploadingProfileImage : setUploadingAnyFile;
        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            const res = await axiosInstance.post(`/upload?folder=${folder}`, formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setCustomerFormData(prev => ({ ...prev, [field]: res.data.url }));
                toast.success(`${field === 'profileImage' ? 'Profile image' : 'File'} uploaded!`);
            }
        } catch (err) {
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleCustomerSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!customerFormData.name || !customerFormData.email) {
            toast.error('Please fill in required fields (Name and Email)');
            return;
        }

        setCustomerSubmitting(true);

        const payload = { ...customerFormData };
        let shippingAddresses = [...customerFormData.shippingAddresses];

        if (customerFormData.shippingSameAsBilling) {
            const billingAsShipping = {
                name: customerFormData.billingName || customerFormData.name,
                phone: customerFormData.billingPhone || customerFormData.phone,
                address: customerFormData.billingAddress,
                city: customerFormData.billingCity,
                state: customerFormData.billingState,
                country: customerFormData.billingCountry,
                zipCode: customerFormData.billingZipCode,
                isDefault: true
            };
            shippingAddresses = [billingAsShipping, ...customerFormData.shippingAddresses];
        }

        payload.shippingAddresses = shippingAddresses;
        const companyId = GetCompanyId();
        payload.companyId = parseInt(companyId);

        try {
            const response = await customerServiceFromServices.createCustomer(payload);
            const success = response.success || (response.data && response.success !== false);

            if (success) {
                toast.success('Customer added successfully!');
                const c = response.data?.customer || response.data || response;

                // Pre-select newly created customer
                if (c && c.id) {
                    const cId = c.id.toString();
                    setCustomerId(cId);
                    setCustomerDetails({
                        billingName: c.billingName || c.name || '',
                        billingAddress: c.billingAddress || '',
                        billingCity: c.billingCity || '',
                        billingState: c.billingState || '',
                        billingZip: c.billingZipCode || c.billingZip || '',
                        billingCountry: c.billingCountry || '',
                        shippingName: c.shippingName || c.name || '',
                        shippingAddress: c.shippingAddress || '',
                        shippingCity: c.shippingCity || '',
                        shippingState: c.shippingState || '',
                        shippingZip: c.shippingZipCode || c.shippingZip || '',
                        shippingCountry: c.shippingCountry || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        gstin: c.vatNumber || c.gstNumber || c.gstin || '',
                        creditPeriod: c.creditPeriod || 0
                    });
                }

                // Reload list of customers
                const custRes = await customerService.getAll(companyId);
                if (custRes.data?.success) {
                    setCustomers(custRes.data.data);
                } else if (custRes.data) {
                    setCustomers(custRes.data);
                }

                setShowAddCustomerModal(false);

                // Reset customer form
                setCustomerFormData({
                    name: '',
                    nameArabic: '',
                    companyName: '',
                    companyLocation: '',
                    profileImage: '',
                    anyFile: '',
                    accountType: 'Credit',
                    balanceType: 'Debit',
                    accountBalance: 0,
                    creationDate: new Date().toISOString().split('T')[0],
                    bankAccountNumber: '',
                    bankIFSC: '',
                    bankNameBranch: '',
                    phone: '',
                    email: '',
                    creditPeriod: '',
                    gstNumber: '',
                    gstEnabled: false,
                    billingName: '',
                    billingPhone: '',
                    billingAddress: '',
                    billingCity: '',
                    billingState: '',
                    billingCountry: '',
                    billingZipCode: '',
                    shippingSameAsBilling: false,
                    shippingName: '',
                    shippingPhone: '',
                    shippingAddress: '',
                    shippingCity: '',
                    shippingState: '',
                    shippingCountry: '',
                    shippingZipCode: '',
                    shippingAddresses: []
                });
            } else {
                toast.error(response.message || 'Failed to create customer');
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Failed to save customer');
        } finally {
            setCustomerSubmitting(false);
        }
    };

    // Inline Product Handlers
    const handleProductInputChange = (e) => {
        const { name, value } = e.target;
        setProductFormData(prev => ({ ...prev, [name]: value }));
    };

    const addProductWarehouseRow = () => {
        const firstWhId = allWarehouses.length > 0 ? allWarehouses[0].id : '';
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
            const prodRes = await productService.getAll(companyId);
            if (prodRes?.data?.success) {
                setAllProducts(prodRes.data.data);
            } else if (prodRes?.data) {
                setAllProducts(prodRes.data);
            } else if (Array.isArray(prodRes)) {
                setAllProducts(prodRes);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create product');
        }
    };

    // Footer
    const [bankDetails, setBankDetails] = useState({
        bankName: 'HDFC Bank',
        accNo: '50200012345678',
        holderName: 'Zirak Trading Pvt Ltd',
        ifsc: 'HDFC0000456'
    });

    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('"Payment is due within 15 days.",\n"Late payments are subject to interest."');

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
            setInvoiceMeta(prev => ({
                ...prev,
                deliveryPersonName: '',
                deliveryPersonMobile: '',
                deliveryPersonEmail: ''
            }));
        } else {
            const selectedDp = deliverypersonsList.find(dp => String(dp.id) === String(id));
            if (selectedDp) {
                setInvoiceMeta(prev => ({
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
                    setInvoiceMeta(prev => ({
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

    const resetForm = () => {
        setCustomerId('');
        setSelectedCustomerCreditPeriod(0);
        setSelectedCurrency(companySettings?.currency || 'EUR');
        setExchangeRate(1.0);
        setBillingDetails({ name: '', address: '', city: '', state: '', zipCode: '', country: '' });
        setShippingDetails({ name: '', address: '', city: '', state: '', zipCode: '', country: '' });
        setOverallDiscount(0);
        setOverallDiscountType('percentage');
        setCustomerShippingAddresses([]);
        setShippingSameAsBilling(true);
        setInvoiceMeta({
            manualNo: '',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            deliveryPersonName: '',
            deliveryPersonMobile: '',
            deliveryPersonEmail: ''
        });
        setSalespersonId('');
        setSelectedDeliveryPersonId('');
        setShowSalespersonField(false);
        setShowDeliveryFields(false);
        setShowCurrencyField(false);
        setCarNumber('');
        setManualReference('');
        setNumberingMode('auto');
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsInvoice || companyDetails.terms || '');
        let defWarehouseId = '';
        if (companySettings?.inventoryConfig) {
            try {
                const parsed = typeof companySettings.inventoryConfig === 'string'
                    ? JSON.parse(companySettings.inventoryConfig)
                    : companySettings.inventoryConfig;
                if (parsed.defaultSalesWarehouseId) {
                    defWarehouseId = parseInt(parsed.defaultSalesWarehouseId);
                }
            } catch (e) {
                console.error(e);
            }
        }
        setItems([{ id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }]);
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsInvoice || companyDetails.terms || '');
        setAvailableReceipts([]);
        setAdjustments([]);
        setManualStatus(false);
        setOverrideStatus('UNPAID');
        setCustomFieldValues({});
        setSelectedPhotos([]);
        setSelectedFiles([]);
        setUploadingPhotos(false);
        setUploadingFiles(false);
        setCreationMode('direct');
        setSelectedOrder(null);
        setSelectedChallan(null);
        setSourceSearchTerm('');
        setInvoiceFilterCustomerId('');
        setShowSelectionModal(false);
        setShowAddModal(false);
        // Reset other charges
        setOtherCharges([]);
        setShowOtherCharges(false);
    };

    const fetchCustomerReceipts = async (custId) => {
        if (!custId) {
            setAvailableReceipts([]);
            setAdjustments([]);
            return;
        }
        try {
            const companyId = GetCompanyId();
            const res = await salesReceiptService.getAll(companyId, { customerId: custId });
            if (res.data.success) {
                const receipts = res.data.data.map(r => {
                    const allocatedAmount = r.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0;
                    const availableAdvance = r.amount - allocatedAmount;
                    return {
                        ...r,
                        availableAdvance
                    };
                }).filter(r => r.availableAdvance > 0.01);

                setAvailableReceipts(receipts);
                setAdjustments([]);
            }
        } catch (error) {
            console.error("Error fetching customer receipts:", error);
        }
    };

    const loadCustomerReceiptsForEdit = async (custId, invId) => {
        if (!custId) {
            setAvailableReceipts([]);
            setAdjustments([]);
            return;
        }
        try {
            const companyId = GetCompanyId();
            const receiptsRes = await salesReceiptService.getAll(companyId, { customerId: custId });
            if (receiptsRes.data.success) {
                const invRes = await salesInvoiceService.getById(invId, companyId);
                const currentAllocations = invRes.data.data.allocations || [];

                const receipts = receiptsRes.data.data.map(r => {
                    const otherAllocations = r.allocations?.filter(a => a.invoiceId !== invId) || [];
                    const otherAllocatedSum = otherAllocations.reduce((sum, a) => sum + a.amount, 0) || 0;
                    const availableAdvance = r.amount - otherAllocatedSum;

                    const currentAlloc = currentAllocations.find(a => a.receiptId === r.id);
                    const currentAllocAmount = currentAlloc ? currentAlloc.amount : 0;

                    return {
                        ...r,
                        availableAdvance,
                        currentAllocAmount
                    };
                }).filter(r => r.availableAdvance > 0.01 || r.currentAllocAmount > 0);

                setAvailableReceipts(receipts);

                const initialAdjustments = currentAllocations.map(a => {
                    const rObj = receiptsRes.data.data.find(r => r.id === a.receiptId);
                    return {
                        receiptId: a.receiptId,
                        receiptNumber: rObj ? rObj.receiptNumber : `Receipt #${a.receiptId}`,
                        amount: a.amount
                    };
                });
                setAdjustments(initialAdjustments);
            }
        } catch (error) {
            console.error("Error loading receipts for edit:", error);
        }
    };

    const handleAddNew = async () => {
        resetForm();
        setCreationMode('direct');
        setShowSelectionModal(false);
        setShowAddModal(true);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await salesInvoiceService.getNextNumber(companyId);
                if (res.data.success) {
                    setNextInvoiceNumber(res.data.nextNumber);
                    setInvoiceMeta(prev => ({ ...prev, manualNo: res.data.nextNumber }));
                    if (res.data.nextManualReference) {
                        setManualReference(res.data.nextManualReference);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching next invoice number:', error);
        }
    };

    const salesProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart, status: 'completed' },
        { id: 'delivery', label: 'Delivery', icon: Truck, status: 'completed' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, status: 'active' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    const addItem = () => {
        let defWarehouseId = '';
        if (companySettings?.inventoryConfig) {
            try {
                const parsed = typeof companySettings.inventoryConfig === 'string'
                    ? JSON.parse(companySettings.inventoryConfig)
                    : companySettings.inventoryConfig;
                if (parsed.defaultSalesWarehouseId) {
                    defWarehouseId = parseInt(parsed.defaultSalesWarehouseId);
                }
            } catch (e) {
                console.error(e);
            }
        }
        setItems(prevItems => [...prevItems, { id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }]);
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
                            if (parsed.defaultSalesWarehouseId) {
                                defWarehouseId = parseInt(parsed.defaultSalesWarehouseId);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return [...prevItems, { id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: defaultVat, discount: 0, total: 0, description: '' }];
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
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                let updatedItem;
                if (typeof field === 'object') {
                    updatedItem = { ...item, ...field };
                } else if (field === 'uomId') {
                    const newUomId = value ? parseInt(value) : '';
                    const prodId = item.productId ? (String(item.productId).startsWith('p-') ? parseInt(String(item.productId).replace('p-', '')) : parseInt(item.productId)) : null;
                    const prod = prodId ? allProducts.find(p => p.id === prodId) : null;
                    if (prod) {
                        const newUom = allUoms.find(u => u.id === newUomId) || prod.uom || prod.salesUom || prod.purchaseUom;
                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                        const basePrice = prod.salePrice ? (prod.salePrice / conversionRate) : 0;
                        const multiplier = newUom?.uomType === 'Compound' ? parseFloat(newUom.conversionRate) || 1 : 1;
                        updatedItem = {
                            ...item,
                            uomId: newUomId,
                            rate: Number((basePrice * multiplier).toFixed(2))
                        };
                    } else {
                        updatedItem = { ...item, uomId: newUomId };
                    }
                } else {
                    updatedItem = { ...item, [field]: value };
                }

                const qty = parseFloat(updatedItem.qty) || 0;
                const rate = parseFloat(updatedItem.rate) || 0;
                const tax = parseFloat(updatedItem.tax) || 0;
                const discount = parseFloat(updatedItem.discount) || 0;

                const subtotal = qty * rate;
                const taxable = subtotal - discount;
                const taxAmount = (taxable * tax) / 100;

                updatedItem.total = taxable + taxAmount;
                return updatedItem;
            }
            return item;
        }));
    };

    const calculateTotals = () => {
        let subTotal = 0;
        let lineDiscountSum = 0;

        const calculatedItems = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const itemDiscount = parseFloat(item.discount) || 0;
            const taxRate = parseFloat(item.tax) || 0;

            const lineGross = qty * rate;
            const lineTaxableBeforeOverall = Math.max(0, lineGross - itemDiscount);
            subTotal += lineGross;
            lineDiscountSum += itemDiscount;

            return {
                ...item,
                qty,
                rate,
                lineGross,
                itemDiscount,
                lineTaxableBeforeOverall,
                taxRate
            };
        });

        const netBeforeOverall = Math.max(0, subTotal - lineDiscountSum);
        let ovDiscountAmt = 0;
        const ovVal = parseFloat(overallDiscount) || 0;
        if (ovVal > 0) {
            if (overallDiscountType === 'percentage') {
                ovDiscountAmt = (netBeforeOverall * Math.min(100, Math.max(0, ovVal))) / 100;
            } else {
                ovDiscountAmt = Math.min(netBeforeOverall, Math.max(0, ovVal));
            }
        }

        const totalDiscount = lineDiscountSum + ovDiscountAmt;
        const discountedTaxable = Math.max(0, subTotal - totalDiscount);

        const overallDiscountRatio = netBeforeOverall > 0 ? (ovDiscountAmt / netBeforeOverall) : 0;

        let totalTax = 0;
        calculatedItems.forEach(item => {
            const lineDiscountedTaxable = item.lineTaxableBeforeOverall * (1 - overallDiscountRatio);
            const lineTax = (lineDiscountedTaxable * item.taxRate) / 100;
            totalTax += lineTax;
        });

        // Other charges total (added to Grand Total)
        const otherChargesTotal = showOtherCharges
            ? otherCharges.reduce((sum, c) => {
                const val = parseFloat(c.value !== undefined ? c.value : c.amount) || 0;
                const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
                const amt = isPct ? ((discountedTaxable + totalTax) * val) / 100 : val;
                return sum + amt;
            }, 0)
            : 0;

        const finalTotal = discountedTaxable + totalTax + otherChargesTotal;

        return {
            subTotal,
            discount: lineDiscountSum,
            lineDiscountSum,
            ovDiscountAmt,
            totalDiscount,
            discountedTaxable,
            tax: totalTax,
            otherChargesTotal,
            finalTotal,
            total: finalTotal
        };
    };

    const totals = calculateTotals();

    // Helper to get status class
    const getStatusClass = (status) => {
        if (!status) return 'Invoice-pending';
        const s = status.toLowerCase();
        if (s.includes('paid')) {
            if (s.includes('partial') || s.includes('partially')) return 'Invoice-partial';
            if (s.includes('fully') || s === 'paid') return 'Invoice-paid';
        }
        if (s.includes('linked')) return 'Invoice-sent';
        if (s.includes('return')) return 'Invoice-overdue';
        if (s.includes('sent')) return 'Invoice-sent';
        if (s.includes('overdue')) return 'Invoice-overdue';
        if (s.includes('unpaid')) return 'Invoice-overdue';
        return 'Invoice-pending';
    };

    // --- Actions Handlers ---

    const handleView = async (invoice) => {
        try {
            // POS invoices already have all data from the list fetch
            if (invoice.type === 'POS_INVOICE') {
                setSelectedInvoice(invoice);
                setViewMode(true);
                return;
            }
            const companyId = GetCompanyId();
            const response = await salesInvoiceService.getById(invoice.id, companyId);
            if (response.data.success) {
                setSelectedInvoice(response.data.data);
                setViewMode(true);
            } else {
                // Fallback to invoice data if fetch fails
                setSelectedInvoice(invoice);
                setViewMode(true);
            }
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            // Fallback to invoice data
            setSelectedInvoice(invoice);
            setViewMode(true);
        }
    };

    const handleCombinedView = (group) => {
        const allItems = [];
        const allReceipts = [];
        const currencyTotals = {};

        group.invoices.forEach(inv => {
            const items = inv.invoiceitem || inv.posinvoiceitem || inv.items || [];
            const curr = inv.currency || companySettings?.currency || 'EUR';

            if (!currencyTotals[curr]) {
                currencyTotals[curr] = {
                    subtotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                    paidAmount: 0,
                    balanceAmount: 0
                };
            }
            currencyTotals[curr].subtotal += inv.subtotal || 0;
            currencyTotals[curr].taxAmount += inv.taxAmount || 0;
            currencyTotals[curr].totalAmount += inv.totalAmount || 0;
            const effectivePaid = inv.paidAmount !== undefined ? inv.paidAmount : (inv.totalAmount - (inv.balanceAmount || 0));
            currencyTotals[curr].paidAmount += effectivePaid;
            currencyTotals[curr].balanceAmount += inv.balanceAmount !== undefined ? inv.balanceAmount : 0;

            items.forEach(item => {
                allItems.push({
                    ...item,
                    currency: curr,
                    exchangeRate: inv.exchangeRate || 1.0,
                    docPaidAmount: inv.paidAmount !== undefined ? inv.paidAmount : (inv.totalAmount - (inv.balanceAmount || 0)),
                    docNumber: inv.invoiceNumber
                });
            });

            if (inv.receipt && inv.receipt.length > 0) {
                inv.receipt.forEach(rec => {
                    allReceipts.push({
                        ...rec,
                        invoiceCurrency: curr
                    });
                });
            }
        });

        // Sort receipts by date ascending
        allReceipts.sort((a, b) => new Date(a.date) - new Date(b.date));

        const combinedInvoice = {
            id: `combined-${group.id}`,
            invoiceNumber: `COMBINED-${group.id}`,
            date: group.earliestDate,
            dueDate: group.latestDueDate,
            type: 'COMBINED',
            customer: group.customer,
            billingName: group.customer?.name,
            billingAddress: group.customer?.billingAddress,
            billingCity: group.customer?.billingCity,
            billingState: group.customer?.billingState,
            billingZipCode: group.customer?.billingZipCode,
            billingCountry: group.customer?.billingCountry,
            shippingName: group.customer?.name,
            shippingAddress: group.customer?.billingAddress,
            shippingCity: group.customer?.billingCity,
            shippingState: group.customer?.billingState,
            shippingZipCode: group.customer?.billingZipCode,
            shippingCountry: group.customer?.billingCountry,
            items: allItems,
            receipt: allReceipts,
            subtotal: group.totalInvoiceAmount - (group.invoices.reduce((acc, inv) => acc + (inv.taxAmount || 0), 0)),
            taxAmount: group.invoices.reduce((acc, inv) => acc + (inv.taxAmount || 0), 0),
            totalAmount: group.totalInvoiceAmount,
            paidAmount: group.totalPaidAmount,
            balanceAmount: group.balanceAmount,
            currencyTotals,
            notes: `Overall summary for ${group.customer?.name} - includes ${group.invoices.length} invoices.`,
            status: 'Partial'
        };
        setSelectedInvoice(combinedInvoice);
        setViewMode(true);
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
        try {
            const companyId = GetCompanyId();
            const netBase = totals.discountedTaxable + totals.tax;
            // Build valid other charges (only those with both account and amount)
            const validOtherCharges = showOtherCharges
                ? otherCharges.filter(c => c.accountId && parseFloat(c.value !== undefined ? c.value : c.amount) > 0).map(c => {
                    const val = parseFloat(c.value !== undefined ? c.value : c.amount) || 0;
                    const isPct = c.chargeType === 'percentage' || c.type === 'percentage';
                    const computedAmt = isPct ? (netBase * val) / 100 : val;
                    return {
                        id: c.id,
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
                deliveryPersonName: invoiceMeta.deliveryPersonName,
                deliveryPersonMobile: invoiceMeta.deliveryPersonMobile,
                deliveryPersonEmail: invoiceMeta.deliveryPersonEmail,
                _attachments: {
                    photos: selectedPhotos,
                    files: selectedFiles
                },
                _otherCharges: validOtherCharges
            };

            const data = {
                customFields: JSON.stringify(customFieldsPayload),
                invoiceNumber: invoiceMeta.manualNo || `INV-${Date.now()}`,
                manualReference: overrideManualRef !== null ? overrideManualRef : (manualReference || null),
                salespersonId: salespersonId ? parseInt(salespersonId) : null,
                carNumber: carNumber || null,
                date: invoiceMeta.date,
                dueDate: invoiceMeta.dueDate,
                customerId: parseInt(customerId),
                companyId: parseInt(companyId),
                salesOrderId: selectedOrder ? parseInt(selectedOrder.id) : null,
                deliveryChallanId: selectedChallan ? parseInt(selectedChallan.id) : null,
                notes: notes,
                manualStatus,
                status: manualStatus ? overrideStatus : undefined,
                billingName: billingDetails.name,
                billingAddress: billingDetails.address,
                billingCity: billingDetails.city,
                billingState: billingDetails.state,
                billingZipCode: billingDetails.zipCode,
                billingCountry: billingDetails.country,
                shippingName: shippingDetails.name,
                shippingAddress: shippingDetails.address,
                shippingCity: shippingDetails.city,
                shippingState: shippingDetails.state,
                shippingZipCode: shippingDetails.zipCode,
                shippingCountry: shippingDetails.country,
                overallDiscount: parseFloat(overallDiscount) || 0,
                overallDiscountType: overallDiscountType,
                currency: selectedCurrency,
                exchangeRate: parseFloat(exchangeRate) || 1.0,
                adjustments: adjustments.filter(adj => adj.amount > 0).map(adj => ({
                    receiptId: adj.receiptId,
                    amount: adj.amount
                })),
                otherCharges: validOtherCharges,
                items: items.map(item => ({
                    productId: item.productId ? parseInt(item.productId) : null,
                    serviceId: item.serviceId ? parseInt(item.serviceId) : null,
                    warehouseId: item.warehouseId ? parseInt(item.warehouseId) : null,
                    uomId: item.uomId ? parseInt(item.uomId) : null,
                    description: item.description || (item.productId ? allProducts.find(p => p.id === parseInt(item.productId))?.name : ''),
                    quantity: parseFloat(item.qty),
                    rate: parseFloat(item.rate),
                    discount: parseFloat(item.discount) || 0,
                    taxRate: parseFloat(item.tax)
                }))
            };

            let response;
            if (editingId) {
                response = await salesInvoiceService.update(editingId, data, companyId);
            } else {
                response = await salesInvoiceService.create(data, isForce);
            }

            if (response.data.success) {
                toast.success(editingId ? 'Invoice updated successfully!' : 'Invoice created successfully!');
                fetchData();
                fetchDropdowns();
                setShowAddModal(false);

                if (!editingId) {
                    const invId = response.data.data?.id || response.data.id;
                    if (invId) {
                        const fullInvRes = await salesInvoiceService.getById(invId, companyId);
                        if (fullInvRes.data.success) {
                            setSelectedInvoice(fullInvRes.data.data);
                            setViewMode(true);
                            setShouldAutoOpenNext(true);
                        }
                    }
                } else {
                    if (selectedInvoice && selectedInvoice.id === editingId) {
                        refreshSelectedInvoice(editingId);
                    }
                    setEditingId(null);
                }
                resetForm();
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            if (error.response?.data?.isDuplicate) {
                const currentRef = overrideManualRef !== null ? overrideManualRef : (manualReference || '');
                setDuplicateRefToRetry(currentRef);
                setShowDuplicateModal(true);
            } else {
                toast.error(error.response?.data?.message || 'Error saving invoice');
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
                const res = await axiosInstance.post('/upload?folder=invoices', formDataUpload, {
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

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        setCustomerId(order.customerId);
        setSelectedCustomerCreditPeriod(order.customer?.creditPeriod || 0);
        const newDueDate = calculateDueDate(invoiceMeta.date, order.customer?.creditPeriod || 0);
        setInvoiceMeta(prev => ({ ...prev, dueDate: newDueDate }));
        setBillingDetails({
            name: order.customer?.billingName || order.customer?.name || '',
            address: order.customer?.billingAddress || '',
            city: order.customer?.billingCity || '',
            state: order.customer?.billingState || '',
            zipCode: order.customer?.billingZipCode || '',
            country: order.customer?.billingCountry || ''
        });
        setCustomerShippingAddresses(order.customer?.shippingaddress || []);
        setShippingDetails({
            name: order.customer?.shippingName || order.customer?.name || '',
            address: order.customer?.shippingAddress || order.customer?.billingAddress || '',
            city: order.customer?.shippingCity || order.customer?.billingCity || '',
            state: order.customer?.shippingState || order.customer?.billingState || '',
            zipCode: order.customer?.shippingZipCode || order.customer?.billingZipCode || '',
            country: order.customer?.shippingCountry || order.customer?.billingCountry || ''
        });
        setShippingSameAsBilling(false); // If coming from order, we might want to preserve their specific shipping
        const sourceItems = order.salesorderitem || order.items || [];
        setItems(sourceItems.map(item => ({
            id: Date.now() + Math.random(),
            productId: item.productId || '',
            serviceId: item.serviceId || '',
            warehouseId: item.warehouseId || '',
            description: item.description,
            qty: item.quantity,
            rate: item.rate,
            tax: item.taxRate,
            discount: item.discount || 0,
            total: item.amount,
            uomId: item.uomId || ''
        })));
        setNotes(`Sales Order No: ${order.orderNumber}${order.notes ? '\n' + order.notes : ''}`);
        setCreationMode('salesorder');
        setShowSelectionModal(false);
    };

    const handleSelectChallan = (challan) => {
        setSelectedChallan(challan);
        setSelectedOrder(null);
        setCustomerId(challan.customerId);
        setSelectedCustomerCreditPeriod(challan.customer?.creditPeriod || 0);
        const newDueDate = calculateDueDate(invoiceMeta.date, challan.customer?.creditPeriod || 0);
        setInvoiceMeta(prev => ({ ...prev, dueDate: newDueDate }));
        setBillingDetails({
            name: challan.customer?.billingName || challan.customer?.name || '',
            address: challan.customer?.billingAddress || '',
            city: challan.customer?.billingCity || '',
            state: challan.customer?.billingState || '',
            zipCode: challan.customer?.billingZipCode || ''
        });
        setShippingDetails({
            name: challan.customer?.shippingName || challan.customer?.name || '',
            address: challan.shippingAddress || challan.customer?.shippingAddress || challan.customer?.billingAddress || '',
            city: challan.shippingCity || challan.customer?.shippingCity || challan.customer?.billingCity || '',
            state: challan.shippingState || challan.customer?.shippingState || challan.customer?.billingState || '',
            zipCode: challan.shippingZipCode || challan.customer?.shippingZipCode || challan.customer?.billingZipCode || '',
            country: challan.shippingCountry || challan.customer?.shippingCountry || challan.customer?.billingCountry || ''
        });
        setCustomerShippingAddresses(challan.customer?.shippingaddress || []);
        setShippingSameAsBilling(false); // Challan usually has specific shipping info

        // Match items with Sales Order to get rates/tax
        const soItems = challan.salesorder?.salesorderitem || [];

        const sourceChallanItems = challan.deliverychallanitem || challan.items || [];
        setItems(sourceChallanItems.map(item => {
            const matchedSOItem = soItems.find(soi => soi.productId === item.productId);
            const rate = matchedSOItem?.rate || 0;
            const tax = matchedSOItem?.taxRate || 0;
            const disc = matchedSOItem?.discount || 0;
            const qty = item.quantity;

            const taxable = (rate * qty) - disc;
            const total = taxable + (taxable * tax / 100);

            return {
                id: Date.now() + Math.random(),
                productId: item.productId || '',
                serviceId: '',
                warehouseId: item.warehouseId || '',
                description: item.description || matchedSOItem?.description || '',
                qty: qty,
                rate: rate,
                tax: tax,
                discount: disc,
                total: total,
                uomId: item.uomId || matchedSOItem?.uomId || ''
            };
        }));
        setNotes(`${challan.salesorder?.orderNumber ? `Sales Order No: ${challan.salesorder.orderNumber}\n` : ''}Challan No: ${challan.challanNumber}${challan.notes ? '\n' + challan.notes : ''}`);
        setCreationMode('challan');
        setShowSelectionModal(false);
    };

    const handleCollectPaymentClick = (inv, e) => {
        if (e) e.stopPropagation();
        console.log("💰 handleCollectPaymentClick - Inv:", inv);
        try {
            setSelectedInvoice(inv);
            const balance = parseFloat(inv.balanceAmount) || 0;
            setPaymentAmount(balance.toFixed(2));
            setPaymentMode(inv.paymentMode || 'CASH');

            const modeName = (inv.paymentMode || 'CASH') === 'CASH' ? 'cash' : 'bank';
            const defaultAcc = accounts?.find(a => a.name?.toLowerCase().includes(modeName)) || accounts?.[0];
            setSelectedAccountId(defaultAcc ? defaultAcc.id.toString() : '');

            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentNotes(`Payment received for POS ${inv.invoiceNumber || ''}`);
            setShowPaymentModal(true);
            console.log("💰 handleCollectPaymentClick - Modal opened successfully");
        } catch (err) {
            console.error("💰 handleCollectPaymentClick - Error:", err);
            toast.error("Failed to open payment modal: " + err.message);
        }
    };

    const handleConfirmPayment = async () => {
        if (!selectedInvoice) return;
        const amt = parseFloat(paymentAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        const balance = parseFloat(selectedInvoice.balanceAmount) || 0;
        if (amt > balance + 0.01) {
            toast.error(`Amount cannot exceed the balance due of ${formatCurrency(balance)}`);
            return;
        }

        try {
            setPaymentSubmitting(true);
            const companyId = GetCompanyId();
            const payload = {
                amount: amt,
                paymentMode,
                accountId: selectedAccountId ? parseInt(selectedAccountId) : null,
                date: paymentDate,
                notes: paymentNotes
            };
            console.log("💰 Sending POS Payment Payload:", payload);
            const res = await posService.recordPOSPayment(selectedInvoice.id, payload, companyId);
            console.log("💰 POS Payment Response:", res);
            if (res && res.success) {
                toast.success('Payment recorded successfully');
                setShowPaymentModal(false);
                await fetchData(); // Refresh main list
                if (viewMode) {
                    await refreshSelectedInvoice(selectedInvoice.id); // Refresh preview
                }
            } else {
                toast.error(res?.message || 'Failed to record payment');
            }
        } catch (error) {
            console.error("💰 POS Payment Error:", error);
            toast.error(error.response?.data?.message || error.message || 'Failed to record payment');
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const refreshSelectedInvoice = async (invoiceId, type) => {
        try {
            const companyId = GetCompanyId();
            const isPos = type === 'POS_INVOICE' || selectedInvoice?.type === 'POS_INVOICE';
            if (isPos) {
                const res = await posService.getPOSInvoiceById(invoiceId, companyId);
                if (res && res.success) {
                    setSelectedInvoice({
                        ...res.data,
                        type: 'POS_INVOICE',
                        invoiceitem: res.data.posinvoiceitem || [],
                        items: res.data.posinvoiceitem || []
                    });
                }
            } else {
                const res = await salesInvoiceService.getById(invoiceId, companyId);
                if (res?.data?.success) {
                    setSelectedInvoice(res.data.data);
                }
            }
        } catch (error) {
            console.error('Error refreshing selected invoice:', error);
        }
    };

    const handleDelete = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (invoiceToDelete) {
            try {
                const companyId = GetCompanyId();
                if (invoiceToDelete.type === 'POS_INVOICE') {
                    await posService.deletePOSInvoice(invoiceToDelete.id);
                } else {
                    await salesInvoiceService.delete(invoiceToDelete.id, companyId);
                }
                setInvoices(invoices.filter(inv => !(inv.id === invoiceToDelete.id && inv.type === invoiceToDelete.type)));
                setShowDeleteModal(false);
                setInvoiceToDelete(null);
                toast.success('Invoice deleted successfully');
                fetchData();
                if (viewMode) setViewMode(false);
            } catch (error) {
                console.error('Error deleting invoice:', error);
                toast.error(error.response?.data?.message || 'Error deleting invoice');
            }
        }
    };

    const handleStatusChange = async (invoiceId, isPos, newStatus) => {
        try {
            const companyId = GetCompanyId();
            let response;
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };

            if (isPos) {
                response = await posService.updatePOSInvoice(invoiceId, payload, companyId);
            } else {
                response = await salesInvoiceService.update(invoiceId, payload, companyId);
            }

            if (response.data?.success || response.success) {
                toast.success('Status updated successfully');
                fetchData();
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            console.error('Error changing status:', error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePrintInvoice = async (invoice) => {
        if (!invoice) return;
        try {
            const companyId = GetCompanyId();
            let target = invoice;
            if (invoice.type !== 'POS_INVOICE') {
                const res = await salesInvoiceService.getById(invoice.id, companyId);
                if (res?.data?.success) target = res.data.data;
            } else {
                const res = await posService.getPOSInvoiceById(invoice.id, companyId);
                if (res?.success) target = { ...res.data, type: 'POS_INVOICE' };
            }
            setSelectedInvoice(target);
            setViewMode(true);
            setTimeout(() => {
                window.print();
            }, 300);
        } catch (err) {
            console.error('Error preparing invoice for print:', err);
            setSelectedInvoice(invoice);
            setViewMode(true);
            setTimeout(() => {
                window.print();
            }, 300);
        }
    };

    const handleDownloadSingleInvoicePDF = async (invInput) => {
        if (!invInput) return;
        try {
            toast.loading('Generating invoice PDF...', { id: 'single-inv-pdf' });
            let inv = invInput;
            const companyId = GetCompanyId();
            if (inv.type !== 'POS_INVOICE' && (!inv.invoiceitem || inv.invoiceitem.length === 0)) {
                const res = await salesInvoiceService.getById(inv.id, companyId);
                if (res?.data?.success) {
                    inv = res.data.data;
                }
            } else if (inv.type === 'POS_INVOICE' && (!inv.posinvoiceitem || inv.posinvoiceitem.length === 0)) {
                const res = await posService.getPOSInvoiceById(inv.id, companyId);
                if (res?.success) {
                    inv = { ...res.data, type: 'POS_INVOICE' };
                }
            }

            const doc = new jsPDF('p', 'mm', 'a4');
            const comp = inv.company || companySettings || {};
            const currency = inv.currency || comp.currency || 'EUR';
            const items = inv.invoiceitem || inv.posinvoiceitem || inv.items || [];

            // Primary Header Banner
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 32, 'F');

            // Company Title
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text(comp.name || 'TAB ACCOUNTS', 14, 15);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(226, 232, 240);
            const compContact = [comp.address, comp.city, comp.state, comp.country].filter(Boolean).join(', ');
            if (compContact) doc.text(compContact, 14, 21);
            const compDetails = [
                comp.email ? `Email: ${comp.email}` : '',
                comp.phone ? `Phone: ${comp.phone}` : '',
                comp.taxNumber || comp.gstNumber || comp.trn || comp.vatNumber ? `VAT/Tax: ${comp.taxNumber || comp.gstNumber || comp.trn || comp.vatNumber}` : ''
            ].filter(Boolean).join(' | ');
            if (compDetails) doc.text(compDetails, 14, 26);

            // Invoice Title & Badges
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text(inv.type === 'POS_INVOICE' ? 'POS INVOICE' : 'TAX INVOICE', 196, 15, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(203, 213, 225);
            doc.text(`Doc #: ${inv.invoiceNumber || 'N/A'}`, 196, 21, { align: 'right' });
            doc.text(`Status: ${inv.status || 'UNPAID'}`, 196, 26, { align: 'right' });

            // Metadata / Bill To section
            let y = 42;
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'bold');
            doc.text('BILLED TO:', 14, y);
            doc.text('INVOICE DETAILS:', 125, y);

            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            const custName = inv.customer?.name || inv.billingName || 'Walk-in Customer';
            doc.text(custName, 14, y);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(`Date: ${inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}`, 125, y);

            y += 5;
            const custAddr = [inv.billingAddress || inv.customer?.billingAddress, inv.billingCity || inv.customer?.billingCity, inv.billingState || inv.customer?.billingState].filter(Boolean).join(', ');
            if (custAddr) {
                doc.text(custAddr, 14, y);
            }
            if (inv.dueDate) {
                doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 125, y);
            }

            y += 5;
            const custContact = [inv.customer?.phone || '', inv.customer?.email || ''].filter(Boolean).join(' | ');
            if (custContact) {
                doc.text(custContact, 14, y);
            }
            if (inv.manualReference) {
                doc.text(`Ref #: ${inv.manualReference}`, 125, y);
            }

            // Items Table
            const head = [['#', 'Item & Description', 'Qty', 'Rate', 'Disc', 'Tax %', 'Total']];
            const body = items.map((item, idx) => {
                const itemName = item.product?.name || item.service?.name || item.description || `Item #${idx + 1}`;
                const desc = item.description && item.description !== itemName ? `\n${item.description}` : '';
                return [
                    idx + 1,
                    `${itemName}${desc}`,
                    item.quantity || item.qty || 1,
                    formatDocCurrency(item.rate || 0, currency),
                    item.discount ? `${item.discount}` : '0',
                    item.taxRate !== undefined && item.taxRate !== null ? `${item.taxRate}%` : (item.tax ? `${item.tax}%` : '0%'),
                    formatDocCurrency(item.amount || item.total || 0, currency)
                ];
            });

            autoTable(doc, {
                startY: y + 8,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8.5
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [51, 65, 85]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 16, halign: 'center' },
                    3: { cellWidth: 26, halign: 'right' },
                    4: { cellWidth: 18, halign: 'right' },
                    5: { cellWidth: 18, halign: 'right' },
                    6: { cellWidth: 28, halign: 'right' }
                },
                margin: { left: 14, right: 14 }
            });

            let finalY = doc.lastAutoTable.finalY + 8;

            if (finalY > 230) {
                doc.addPage();
                finalY = 20;
            }

            if (inv.notes) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(100, 116, 139);
                doc.text('Notes / Instructions:', 14, finalY);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(51, 65, 85);
                doc.text(doc.splitTextToSize(inv.notes, 90), 14, finalY + 5);
            }

            const sumX = 130;
            const sumValX = 196;
            let sumY = finalY;

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);

            const addSummaryLine = (label, val, isBold = false, isAccent = false) => {
                if (isBold) doc.setFont('helvetica', 'bold');
                else doc.setFont('helvetica', 'normal');
                if (isAccent) doc.setTextColor(16, 185, 129);
                else doc.setTextColor(isBold ? 30 : 100, isBold ? 41 : 116, isBold ? 59 : 139);

                doc.text(label, sumX, sumY);
                doc.text(val, sumValX, sumY, { align: 'right' });
                sumY += 5.5;
            };

            const subTotal = inv.subtotal !== undefined && inv.subtotal !== null ? inv.subtotal : (inv.totalAmount || 0);
            addSummaryLine('Sub Total:', formatDocCurrency(subTotal, currency));
            if (inv.overallDiscount || inv.discount || inv.discountAmount) {
                addSummaryLine('Discount:', `-${formatDocCurrency(inv.overallDiscount || inv.discount || inv.discountAmount || 0, currency)}`);
            }
            if (inv.taxAmount) {
                addSummaryLine('VAT / Tax:', formatDocCurrency(inv.taxAmount, currency));
            }
            if (inv.roundOff) {
                addSummaryLine('Round Off:', formatDocCurrency(inv.roundOff, currency));
            }

            doc.setDrawColor(226, 232, 240);
            doc.line(sumX, sumY - 1, sumValX, sumY - 1);
            sumY += 2;

            addSummaryLine('Total Amount:', formatDocCurrency(inv.totalAmount || 0, currency), true);
            if (inv.paidAmount > 0) {
                addSummaryLine('Paid Amount:', formatDocCurrency(inv.paidAmount, currency), true, true);
            }
            const bal = inv.balanceAmount !== undefined ? inv.balanceAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
            addSummaryLine('Balance Due:', formatDocCurrency(bal, currency), true);

            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.text('Generated by TAB ACCOUNTS - Thank you for your business!', 105, pageHeight - 8, { align: 'center' });

            const fileName = `${inv.invoiceNumber || 'Invoice'}.pdf`;
            doc.save(fileName);
            toast.dismiss('single-inv-pdf');
            toast.success(`Invoice ${inv.invoiceNumber || ''} downloaded as PDF!`);
        } catch (error) {
            console.error('Error generating invoice PDF:', error);
            toast.dismiss('single-inv-pdf');
            toast.error('Failed to generate PDF. Please try again.');
        }
    };

    const renderSubModals = () => (
        <>
            {/* Email Invoice Modal */}
            {showEmailModal && emailInvoiceData && (
                <div className="Invoice-email-modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="Invoice-email-modal-container" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="Invoice-email-modal-header">
                            <div className="Invoice-email-modal-header-info">
                                <div className="Invoice-email-modal-icon-badge">
                                    <Mail size={22} />
                                </div>
                                <div className="Invoice-email-modal-title-wrap">
                                    <h2>
                                        Email Invoice
                                        <span className="Invoice-email-modal-invoice-tag">
                                            #{emailInvoiceData.invoiceNumber || `INV-${emailInvoiceData.id}`}
                                        </span>
                                    </h2>
                                    <p className="Invoice-email-modal-subtitle">
                                        <span>{emailInvoiceData.customer?.name || emailInvoiceData.customerName || 'Customer'}</span>
                                        <span>•</span>
                                        <strong style={{ color: '#ffffff' }}>
                                            {formatDocCurrency(emailInvoiceData.totalAmount, emailInvoiceData.currency)}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="Invoice-email-modal-close-btn"
                                onClick={() => setShowEmailModal(false)}
                                title="Close dialog"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="Invoice-email-modal-body">
                            {/* SMTP Status Notice */}
                            {smtpStatus.checking ? (
                                <div className="Invoice-email-smtp-banner loading">
                                    <div className="Invoice-email-smtp-left">
                                        <Loader2 size={18} className="animate-spin" color="#64748b" />
                                        <span style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500 }}>
                                            Checking outgoing mail (SMTP) configuration...
                                        </span>
                                    </div>
                                </div>
                            ) : !smtpStatus.isConfigured ? (
                                <div className="Invoice-email-smtp-banner warning">
                                    <div className="Invoice-email-smtp-left">
                                        <div className="Invoice-email-smtp-icon warning">
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <h4 className="Invoice-email-smtp-text-title">Outgoing Email Server (SMTP) Not Configured</h4>
                                            <p className="Invoice-email-smtp-text-desc">
                                                Configure company SMTP credentials to send invoice emails directly to your clients.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="Invoice-email-smtp-btn"
                                        onClick={() => {
                                            setShowEmailModal(false);
                                            navigate('/company/settings/smtp');
                                        }}
                                    >
                                        Configure SMTP <ArrowRight size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="Invoice-email-smtp-banner success">
                                    <div className="Invoice-email-smtp-left">
                                        <div className="Invoice-email-smtp-icon success">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 700, color: '#166534' }}>
                                                Verified SMTP Connection
                                            </h4>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#15803d' }}>
                                                Sending from: <strong>{smtpStatus.fromName ? `${smtpStatus.fromName} <${smtpStatus.fromEmail}>` : smtpStatus.fromEmail}</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recipient Email */}
                            <div className="Invoice-email-form-group">
                                <label className="Invoice-email-form-label">
                                    <span>Recipient Email (To:) <span style={{ color: '#e11d48' }}>*</span></span>
                                    {emailInvoiceData.customer?.email && emailRecipient === emailInvoiceData.customer.email && (
                                        <span style={{ fontSize: '0.72rem', color: '#059669', textTransform: 'none', fontWeight: 500 }}>
                                            ✓ Auto-filled from customer profile
                                        </span>
                                    )}
                                </label>
                                <div className="Invoice-email-input-wrap">
                                    <Mail size={16} className="Invoice-email-input-icon" />
                                    <input
                                        type="email"
                                        value={emailRecipient}
                                        onChange={(e) => setEmailRecipient(e.target.value)}
                                        placeholder="customer@example.com"
                                        className={`Invoice-email-input has-icon ${emailRecipient && !emailRecipient.includes('@') ? 'invalid' : ''}`}
                                        required
                                    />
                                </div>
                                {emailRecipient && !emailRecipient.includes('@') && (
                                    <p className="Invoice-email-error-text">
                                        <AlertTriangle size={12} /> Please enter a valid email address (e.g. name@domain.com)
                                    </p>
                                )}
                            </div>

                            {/* Subject Line */}
                            <div className="Invoice-email-form-group">
                                <label className="Invoice-email-form-label">
                                    <span>Subject Line</span>
                                </label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Invoice Subject..."
                                    className="Invoice-email-input"
                                />
                            </div>

                            {/* Message Body */}
                            <div className="Invoice-email-form-group">
                                <label className="Invoice-email-form-label">
                                    <span>Message Body</span>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'none', fontWeight: 500 }}>
                                        Plain text &amp; paragraphs supported
                                    </span>
                                </label>
                                <textarea
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    rows={5}
                                    placeholder="Type your message to the client here..."
                                    className="Invoice-email-textarea"
                                />
                            </div>

                            {/* Attachments & Options */}
                            <div className="Invoice-email-options-card">
                                <label className="Invoice-email-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={emailAttachPdf}
                                        onChange={(e) => setEmailAttachPdf(e.target.checked)}
                                    />
                                    <span>
                                        Attach PDF Invoice
                                        <span className="Invoice-email-attachment-pill" style={{ marginLeft: '8px' }}>
                                            <FileText size={13} color="#dc2626" />
                                            Invoice_{emailInvoiceData.invoiceNumber || emailInvoiceData.id}.pdf
                                        </span>
                                    </span>
                                </label>
                                <label className="Invoice-email-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={emailSendBcc}
                                        onChange={(e) => setEmailSendBcc(e.target.checked)}
                                    />
                                    <span>
                                        Send copy to company email (BCC)
                                        {companySettings?.email && (
                                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, marginLeft: '6px' }}>
                                                ({companySettings.email})
                                            </span>
                                        )}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer (Pinned & Guaranteed Visible!) */}
                        <div className="Invoice-email-modal-footer">
                            <div className="Invoice-email-footer-status">
                                {!smtpStatus.isConfigured ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                                        SMTP configuration required
                                    </span>
                                ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                                        Ready to dispatch
                                    </span>
                                )}
                            </div>

                            <div className="Invoice-email-footer-actions">
                                <button
                                    type="button"
                                    className="Invoice-email-cancel-btn"
                                    onClick={() => setShowEmailModal(false)}
                                >
                                    Cancel
                                </button>
                                {!smtpStatus.isConfigured ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEmailModal(false);
                                            navigate('/company/settings/smtp');
                                        }}
                                        className="Invoice-email-submit-btn"
                                        style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}
                                    >
                                        Configure SMTP Settings <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="Invoice-email-submit-btn"
                                        onClick={handleSendInvoiceEmail}
                                        disabled={sendingEmail || !emailRecipient || !emailRecipient.includes('@')}
                                    >
                                        {sendingEmail ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Sending Invoice...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} /> Send Invoice Now
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteModal && (
                <div className="Invoice-modal-overlay">
                    <div className="Invoice-modal-content Invoice-confirmation-modal">
                        <div className="Invoice-modal-header-simple">
                            <h2 className="text-xl font-bold">Confirm Delete</h2>
                            <button className="Invoice-close-btn-simple" onClick={() => setShowDeleteModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <p>Are you sure you want to delete this invoice? This action cannot be undone.</p>
                        <div className="Invoice-modal-actions">
                            <button className="Invoice-btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="Invoice-btn-danger" onClick={confirmDelete}>Delete</button>
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
                    zIndex: 9999
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
                                    className="Invoice-compact-input"
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
                                    className="Invoice-compact-input"
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
                                    className="Invoice-compact-input"
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
                                    className="Invoice-compact-input"
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
                                    className="Invoice-compact-input"
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
                                    className="Invoice-compact-input"
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
                                            setInvoiceMeta(prev => ({
                                                ...prev,
                                                deliveryPersonName: res.data.name,
                                                deliveryPersonMobile: res.data.phone || '',
                                                deliveryPersonEmail: res.data.email || ''
                                            }));
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

            {showSelectionModal && (
                <div className="Invoice-modal-overlay">
                    <div className="Invoice-modal-content Invoice-selection-modal-small">
                        <div className="Invoice-modal-header-simple">
                            <h2 className="text-xl font-bold">Select Invoice Source</h2>
                            <button className="Invoice-close-btn-simple" onClick={() => setShowSelectionModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="Invoice-selection-grid-p">
                            <button className="Invoice-sel-btn-p" onClick={() => { setCreationMode('direct'); setShowSelectionModal(false); setShowAddModal(true); }}>
                                <div className="Invoice-sel-icon-p"><FileText /></div>
                                <div className="Invoice-sel-text-p">
                                    <strong>Direct Invoice</strong>
                                    <span>Create manually without link</span>
                                </div>
                            </button>
                            <button className="Invoice-sel-btn-p" onClick={() => setCreationMode('select_so')}>
                                <div className="Invoice-sel-icon-p"><ShoppingCart /></div>
                                <div className="Invoice-sel-text-p">
                                    <strong>From Sales Order</strong>
                                    <span>Fetch data from existing order</span>
                                </div>
                            </button>
                            <button className="Invoice-sel-btn-p" onClick={() => setCreationMode('select_dc')}>
                                <div className="Invoice-sel-icon-p"><Truck /></div>
                                <div className="Invoice-sel-text-p">
                                    <strong>From Delivery Challan</strong>
                                    <span>Fetch data from delivery note</span>
                                </div>
                            </button>
                        </div>

                        {creationMode === 'select_so' && (
                            <div className="Invoice-source-list-container">
                                <h3 className="Invoice-section-title-s">Pick a Sales Order</h3>
                                <div className="Invoice-source-search-box flex gap-3 mb-4">
                                    <div className="Invoice-form-group-mini" style={{ flex: 1 }}>
                                        <select
                                            className="Invoice-full-width-input"
                                            value={invoiceFilterCustomerId}
                                            onChange={(e) => setInvoiceFilterCustomerId(e.target.value)}
                                        >
                                            <option value="">Select Customer First...</option>
                                            {customers.map(c => {
                                                const orderCount = activeOrders.filter(o => o.customerId === c.id).length;
                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} ({orderCount} Orders)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="Invoice-source-search-inner" style={{ flex: 1 }}>
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search Sales Order #..."
                                            value={sourceSearchTerm}
                                            onChange={(e) => setSourceSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="Invoice-source-items-list">
                                    {activeOrders.filter(order => {
                                        const matchesSearch = order.orderNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                            order.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase());
                                        const matchesCustomer = !invoiceFilterCustomerId || order.customerId === parseInt(invoiceFilterCustomerId);
                                        return matchesSearch && matchesCustomer;
                                    }).map(order => (
                                        <div key={order.id} className="Invoice-source-item-row" onClick={() => { handleSelectOrder(order); setShowAddModal(true); setSourceSearchTerm(''); }}>
                                            <div className="Invoice-source-info">
                                                <span className="Invoice-source-id">{order.orderNumber}</span>
                                                <span className="Invoice-source-cust">{order.customer?.name}</span>
                                            </div>
                                            <div className="Invoice-source-meta">
                                                <span>{new Date(order.date).toLocaleDateString()}</span>
                                                <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    ))}
                                    {activeOrders.filter(order =>
                                        order.orderNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                        order.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase())
                                    ).length === 0 && <div className="Invoice-no-source-found">No orders found</div>}
                                </div>
                                <button className="Invoice-btn-back-sel" onClick={() => { setCreationMode('direct'); setSourceSearchTerm(''); }}>Back</button>
                            </div>
                        )}

                        {creationMode === 'select_dc' && (
                            <div className="Invoice-source-list-container">
                                <h3 className="Invoice-section-title-s">Pick a Delivery Challan</h3>
                                <div className="Invoice-source-search-box flex gap-3 mb-4">
                                    <div className="Invoice-form-group-mini" style={{ flex: 1 }}>
                                        <select
                                            className="Invoice-full-width-input"
                                            value={invoiceFilterCustomerId}
                                            onChange={(e) => setInvoiceFilterCustomerId(e.target.value)}
                                        >
                                            <option value="">Select Customer First...</option>
                                            {customers.map(c => {
                                                const dcCount = activeChallans.filter(dc => dc.customerId === c.id).length;
                                                return (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} ({dcCount} Challans)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                    <div className="Invoice-source-search-inner" style={{ flex: 1 }}>
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search Challan #..."
                                            value={sourceSearchTerm}
                                            onChange={(e) => setSourceSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="Invoice-source-items-list">
                                    {activeChallans.filter(dc => {
                                        const matchesSearch = dc.challanNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                            dc.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase());
                                        const matchesCustomer = !invoiceFilterCustomerId || dc.customerId === parseInt(invoiceFilterCustomerId);
                                        return matchesSearch && matchesCustomer;
                                    }).map(dc => (
                                        <div key={dc.id} className="Invoice-source-item-row" onClick={() => { handleSelectChallan(dc); setShowAddModal(true); setSourceSearchTerm(''); }}>
                                            <div className="Invoice-source-info">
                                                <span className="Invoice-source-id">{dc.challanNumber}</span>
                                                <span className="Invoice-source-cust">{dc.customer?.name}</span>
                                            </div>
                                            <div className="Invoice-source-meta">
                                                <span>{new Date(dc.date).toLocaleDateString()}</span>
                                                <ArrowRight size={14} />
                                            </div>
                                        </div>
                                    ))}
                                    {activeChallans.filter(dc =>
                                        dc.challanNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                        dc.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase())
                                    ).length === 0 && <div className="Invoice-no-source-found">No challans found</div>}
                                </div>
                                <button className="Invoice-btn-back-sel" onClick={() => { setCreationMode('direct'); setSourceSearchTerm(''); }}>Back</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Export Format Selection Modal */}
            {showExportModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        maxWidth: '520px',
                        width: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #e2e8f0'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: '#1e293b',
                            color: '#ffffff',
                            padding: '18px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Download size={20} style={{ color: '#38bdf8' }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Export Invoices</h3>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Choose your preferred export file format</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExportModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px' }}>
                            {/* Scope Selector (if filters applied) */}
                            {(searchTerm || startDate || endDate || (customerViewOption === 'single' && selectedCustomerIdFilter)) && (
                                <div style={{
                                    marginBottom: '20px',
                                    padding: '12px 16px',
                                    background: '#f8fafc',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.025em',
                                        display: 'block',
                                        marginBottom: '8px'
                                    }}>
                                        Select Export Range
                                    </span>
                                    <div style={{ display: 'flex', gap: '18px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', color: '#1e293b', cursor: 'pointer', fontWeight: '500' }}>
                                            <input
                                                type="radio"
                                                name="invoiceExportScope"
                                                checked={exportScope === 'filtered'}
                                                onChange={() => setExportScope('filtered')}
                                            />
                                            <span>Current Filtered ({getInvoicesForExport().length} invoices)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', color: '#1e293b', cursor: 'pointer', fontWeight: '500' }}>
                                            <input
                                                type="radio"
                                                name="invoiceExportScope"
                                                checked={exportScope === 'all'}
                                                onChange={() => setExportScope('all')}
                                            />
                                            <span>All Invoices ({invoices.length} invoices)</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Format Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {/* Excel Card */}
                                <div
                                    onClick={() => handleExportExcel(exportScope)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 18px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#10b981';
                                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        background: '#dcfce7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#15803d',
                                        flexShrink: 0
                                    }}>
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.98rem', color: '#1e293b' }}>
                                                Excel Spreadsheet (.xlsx)
                                            </span>
                                            <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                                                XLSX
                                            </span>
                                        </div>
                                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                            Full data spreadsheet for accounting, analysis, and custom formulas.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleExportExcel(exportScope); }}
                                        style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.84rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Export Excel
                                    </button>
                                </div>

                                {/* PDF Card */}
                                <div
                                    onClick={() => handleExportPDF(exportScope)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 18px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0',
                                        background: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#ef4444';
                                        e.currentTarget.style.backgroundColor = '#fef2f2';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '10px',
                                        background: '#fee2e2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#b91c1c',
                                        flexShrink: 0
                                    }}>
                                        <FileText size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.98rem', color: '#1e293b' }}>
                                                PDF Document (.pdf)
                                            </span>
                                            <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c' }}>
                                                PDF
                                            </span>
                                        </div>
                                        <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                            Printable formal invoice register with headers, totals, and statuses.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleExportPDF(exportScope); }}
                                        style={{
                                            background: '#ef4444',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.84rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        Export PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowExportModal(false)}
                                style={{
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    fontSize: '0.86rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // --- RENDER FULL PAGE VIEW IF IN VIEW MODE ---
    if (viewMode && selectedInvoice) {
        return (
            <div className="Invoice-invoice-full-page-view">
                <div className="Invoice-view-page-header Invoice-no-print">
                    <button className="Invoice-btn-back" onClick={async () => {
                        setViewMode(false);
                        if (shouldAutoOpenNext) {
                            setShouldAutoOpenNext(false);
                            resetForm();
                            setEditingId(null);
                            try {
                                const companyId = GetCompanyId();
                                if (companyId) {
                                    const res = await salesInvoiceService.getNextNumber(companyId);
                                    if (res.data.success) {
                                        setNextInvoiceNumber(res.data.nextNumber);
                                        setInvoiceMeta(prev => ({ ...prev, manualNo: res.data.nextNumber }));
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching next invoice number:', error);
                            }
                            setCreationMode('direct');
                            setShowSelectionModal(false);
                            setShowAddModal(true);
                        }
                    }}>
                        <ArrowLeft size={18} /> Back to Invoices
                    </button>
                    <div className="Invoice-view-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedInvoice.type !== 'POS_INVOICE' && hasPermission('edit sales invoice') && (
                            <button
                                className="Invoice-btn-edit-preview"
                                onClick={() => {
                                    setViewMode(false);
                                    handleEdit(selectedInvoice);
                                }}
                                title="Edit Invoice"
                                style={{
                                    background: '#2563eb',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                <Pencil size={18} /> Edit
                            </button>
                        )}
                        {selectedInvoice.type !== 'POS_INVOICE' && selectedInvoice.balanceAmount > 0 && hasPermission('create sales payment') && (
                            <button
                                className="Invoice-btn-payment"
                                onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: selectedInvoice.id, customerId: selectedInvoice.customerId } })}
                                style={{
                                    background: '#1e293b',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(30, 41, 59, 0.2)'
                                }}
                            >
                                <CreditCard size={18} /> Receive Payment
                            </button>
                        )}
                        {selectedInvoice.type === 'POS_INVOICE' && selectedInvoice.balanceAmount > 0 && hasPermission('create sales payment') && (
                            <button
                                className="Invoice-btn-payment"
                                onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: selectedInvoice.id, invoiceType: 'POS_INVOICE', customerId: selectedInvoice.customerId } })}
                                style={{
                                    background: '#1e293b',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(30, 41, 59, 0.2)'
                                }}
                            >
                                <CreditCard size={18} /> Receive Payment
                            </button>
                        )}
                        <button
                            className="Invoice-btn-email"
                            onClick={() => handleOpenEmailModal(selectedInvoice)}
                            title="Email Invoice to Customer"
                            style={{
                                background: '#334155',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 6px -1px rgba(51, 65, 85, 0.2)'
                            }}
                        >
                            <Mail size={18} /> Email Invoice
                        </button>
                        <button
                            className="Invoice-btn-download-pdf"
                            onClick={() => handleDownloadSingleInvoicePDF(selectedInvoice)}
                            title="Download Invoice as PDF"
                            style={{
                                background: '#059669',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)'
                            }}
                        >
                            <Download size={18} /> Download PDF
                        </button>
                        <button className="Invoice-btn-print" onClick={handlePrint}>
                            <Printer size={18} /> Print
                        </button>
                        <button
                            className="Invoice-btn-email"
                            onClick={() => navigate(`/company/settings/audit-logs?entity=Invoice&search=${encodeURIComponent(selectedInvoice?.invoiceNumber || '')}`)}
                            title="View Invoice Audit Trail"
                            style={{
                                background: '#4f46e5',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                            }}
                        >
                            <Shield size={18} /> Audit Trail
                        </button>
                        <button
                            className="Invoice-btn-print"
                            onClick={() => setShowExportModal(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#ffffff', border: 'none' }}
                            title="Export Invoices"
                        >
                            <Download size={18} /> Export
                        </button>
                    </div>
                </div>

                {(() => {
                    const companyDetails = selectedInvoice?.company || companySettings || {};
                    const companyLogoSrc = getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo || companySettings?.invoiceLogo || companySettings?.logo);

                    const formatCeaDate = (dateVal) => {
                        if (!dateVal) return '';
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return String(dateVal);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                    };

                    const targetCust = customers.find(c => String(c.id) === String(selectedInvoice?.customerId || selectedInvoice?.customer?.id)) || selectedInvoice?.customer;
                    const billName = selectedInvoice?.billingName || targetCust?.billingName || targetCust?.name || 'Frank Sheridan';
                    const billAddr = selectedInvoice?.billingAddress || targetCust?.billingAddress || targetCust?.companyLocation || targetCust?.address || '56 New cork road, Midleton, Co. Cork';
                    const billCityStateZip = [
                        selectedInvoice?.billingCity || targetCust?.billingCity || targetCust?.city,
                        selectedInvoice?.billingState || targetCust?.billingState || targetCust?.state,
                        selectedInvoice?.billingZipCode || targetCust?.billingZipCode || targetCust?.zipCode,
                        selectedInvoice?.billingCountry || targetCust?.billingCountry || targetCust?.country
                    ].filter(Boolean).join(', ');
                    const billPhone = selectedInvoice?.billingPhone || targetCust?.billingPhone || targetCust?.phone;
                    const email = targetCust?.email;
                    const gstin = targetCust?.gstin || targetCust?.gstNumber || targetCust?.vatNumber;

                    const rawItems = selectedInvoice?.invoiceitem || selectedInvoice?.posinvoiceitem || selectedInvoice?.items || [];
                    const lineItems = rawItems.length > 0 ? rawItems : [
                        {
                            activity: 'Services',
                            description: billAddr || '56 New cork road, Midleton, Co. Cork',
                            taxRate: 23,
                            quantity: 1,
                            rate: 200,
                            amount: 200
                        }
                    ];

                    const groups = {};
                    lineItems.forEach(item => {
                        const rate = parseFloat(item.taxRate !== undefined ? item.taxRate : (item.tax || defaultVat || 23));
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
                    if (vatSummaryList.length === 0 && (selectedInvoice?.taxAmount > 0 || selectedInvoice?.subtotal > 0)) {
                        const sub = parseFloat(selectedInvoice?.subtotal || 0);
                        const tax = parseFloat(selectedInvoice?.taxAmount || 0);
                        const calcRate = sub > 0 ? (tax / sub) * 100 : (defaultVat || 23);
                        vatSummaryList = [{ rate: calcRate, vatAmount: tax, netAmount: sub }];
                    }

                    const subtotalVal = selectedInvoice?.subtotal !== undefined && selectedInvoice?.subtotal !== null
                        ? parseFloat(selectedInvoice.subtotal)
                        : lineItems.reduce((acc, it) => acc + ((parseFloat(it.quantity) || 1) * (parseFloat(it.rate) || 0)), 0);

                    // Calculate line discounts total
                    const lineDiscountsTotal = (rawItems || []).reduce((sum, it) => sum + (parseFloat(it.discount || 0) || 0), 0);

                    // Calculate overall discount
                    const ovDiscountValue = parseFloat(selectedInvoice?.overallDiscount || 0);
                    const ovDiscountType = selectedInvoice?.overallDiscountType || 'percentage';
                    let calculatedOvDiscountAmt = 0;
                    const netBeforeOv = Math.max(0, subtotalVal - lineDiscountsTotal);
                    if (ovDiscountValue > 0) {
                        calculatedOvDiscountAmt = ovDiscountType === 'percentage'
                            ? (netBeforeOv * Math.min(100, ovDiscountValue)) / 100
                            : Math.min(netBeforeOv, ovDiscountValue);
                    }

                    // Combined discount
                    let discountVal = parseFloat(selectedInvoice?.discountAmount || 0);
                    if (discountVal === 0 && (lineDiscountsTotal > 0 || calculatedOvDiscountAmt > 0)) {
                        discountVal = lineDiscountsTotal + calculatedOvDiscountAmt;
                    }
                    const taxableVal = Math.max(0, subtotalVal - discountVal);

                    const taxVal = selectedInvoice?.taxAmount !== undefined && selectedInvoice?.taxAmount !== null
                        ? parseFloat(selectedInvoice.taxAmount)
                        : vatSummaryList.reduce((acc, v) => acc + (v.vatAmount || 0), 0);

                    const totalVal = selectedInvoice?.totalAmount !== undefined && selectedInvoice?.totalAmount !== null
                        ? parseFloat(selectedInvoice.totalAmount)
                        : (taxableVal + taxVal);

                    const paidVal = selectedInvoice?.paidAmount !== undefined && selectedInvoice?.paidAmount !== null
                        ? parseFloat(selectedInvoice.paidAmount)
                        : totalVal;

                    const balanceVal = selectedInvoice?.balanceAmount !== undefined && selectedInvoice?.balanceAmount !== null
                        ? parseFloat(selectedInvoice.balanceAmount)
                        : Math.max(0, totalVal - paidVal);

                    const isFullyPaid = balanceVal === 0 || (paidVal >= totalVal && totalVal > 0) || selectedInvoice?.status === 'Paid';

                    const bankAccountName = companyDetails.accountName || companyDetails.accountHolder || companyDetails.name || 'CEAC LTD';
                    const bankIban = companyDetails.iban || 'IE03BOFI90290116673832';
                    const bankBic = companyDetails.bic || 'BOFIIE2D';
                    const bankAccount = companyDetails.accountNumber || '16673832';
                    const bankSortCode = companyDetails.sortCode || '902901';
                    const bankName = companyDetails.bankName || 'Bank Of Ireland';
                    const bankAddress = companyDetails.bankAddress || '97 Main Street, Midleton, Co. Cork';

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
                        <div className="Invoice-view-content-wrapper Invoice-printable-area">
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
                                        <div className="invoice-cea-doc-heading">INVOICE</div>
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
                                            <span className="invoice-cea-kv-val">{selectedInvoice?.invoiceNumber ? String(selectedInvoice.invoiceNumber).replace(/^#/, '') : '1550'}</span>

                                            <span className="invoice-cea-kv-key">DATE</span>
                                            <span className="invoice-cea-kv-val">{selectedInvoice?.date ? formatCeaDate(selectedInvoice.date) : '06-05-2026'}</span>

                                            <span className="invoice-cea-kv-key">TERMS</span>
                                            <span className="invoice-cea-kv-val">{selectedInvoice?.paymentTerms || 'Net 7'}</span>

                                            <span className="invoice-cea-kv-key">DUE DATE</span>
                                            <span className="invoice-cea-kv-val">{selectedInvoice?.dueDate ? formatCeaDate(selectedInvoice.dueDate) : (selectedInvoice?.date ? formatCeaDate(calculateDueDate(selectedInvoice.date, 7)) : '13-05-2026')}</span>
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
                                            const productName = item.service?.name || item.product?.name || item.activity || 'Services';
                                            const itemDesc = item.description || (item.product?.name ? item.description : billAddr) || '56 New cork road, Midleton, Co. Cork';
                                            const itemTax = item.taxRate !== undefined ? item.taxRate : (item.tax || defaultVat || 23);
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
                                        <span className="invoice-cea-total-val">{Number(subtotalVal).toFixed(2)}</span>

                                        {lineDiscountsTotal > 0 && calculatedOvDiscountAmt > 0 ? (
                                            <>
                                                <span className="invoice-cea-total-label">LINE DISCOUNT</span>
                                                <span className="invoice-cea-total-val">-{Number(lineDiscountsTotal).toFixed(2)}</span>

                                                <span className="invoice-cea-total-label">OVERALL DISCOUNT ({ovDiscountType === 'percentage' ? `${ovDiscountValue}%` : 'FIXED'})</span>
                                                <span className="invoice-cea-total-val">-{Number(calculatedOvDiscountAmt).toFixed(2)}</span>

                                                <span className="invoice-cea-total-label">TOTAL DISCOUNT</span>
                                                <span className="invoice-cea-total-val">-{Number(discountVal).toFixed(2)}</span>

                                                <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                                <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>
                                            </>
                                        ) : (calculatedOvDiscountAmt > 0 || ovDiscountValue > 0) ? (
                                            <>
                                                <span className="invoice-cea-total-label">TOTAL DISCOUNT ({ovDiscountType === 'percentage' ? `${ovDiscountValue}%` : 'FIXED'})</span>
                                                <span className="invoice-cea-total-val">-{Number(calculatedOvDiscountAmt || discountVal).toFixed(2)}</span>

                                                <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                                <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>
                                            </>
                                        ) : discountVal > 0 ? (
                                            <>
                                                <span className="invoice-cea-total-label">TOTAL DISCOUNT</span>
                                                <span className="invoice-cea-total-val">-{Number(discountVal).toFixed(2)}</span>

                                                <span className="invoice-cea-total-label">TAXABLE AMOUNT</span>
                                                <span className="invoice-cea-total-val">{Number(taxableVal).toFixed(2)}</span>
                                            </>
                                        ) : null}

                                        <span className="invoice-cea-total-label">TAX</span>
                                        <span className="invoice-cea-total-val">{Number(taxVal).toFixed(2)}</span>

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
                                                {selectedInvoice?.currency || companyDetails.currency || 'EUR'} {Number(balanceVal).toFixed(2)}
                                            </span>
                                        </div>
                                        {isFullyPaid && (
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
                                                    <td style={{ textAlign: 'left' }}>VAT @ {parseFloat(vat.rate || defaultVat || 23).toFixed(0)}%</td>
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
                        </div>
                    );
                })()}

                        {/* Attachments Section in View Mode */}
                        {(() => {
                            let customFieldVals = {};
                            if (selectedInvoice?.customFields) {
                                try {
                                    customFieldVals = typeof selectedInvoice.customFields === 'string'
                                        ? JSON.parse(selectedInvoice.customFields)
                                        : selectedInvoice.customFields;
                                } catch (e) {
                                    console.error('Error parsing invoice custom fields for view:', e);
                                }
                            }
                            const atts = customFieldVals?._attachments;
                            const photos = atts?.photos || [];
                            const files = atts?.files || [];
                            if (photos.length === 0 && files.length === 0) return null;
                            return (
                                <div className="Invoice-no-print" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', textAlign: 'left' }}>
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

                        {/* Collect Payment Modal */}
                        {showPaymentModal && selectedInvoice && (
                        <div className="POSINV-payment-overlay">
                            <div className="POSINV-payment-modal">
                                <div className="POSINV-payment-header">
                                    <h2 className="POSINV-payment-title">Collect Payment - {selectedInvoice.invoiceNumber}</h2>
                                    <button className="POSINV-payment-close" onClick={() => setShowPaymentModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="POSINV-payment-body">
                                    <div className="POSINV-payment-info-box">
                                        <span className="POSINV-payment-info-label">Outstanding Balance:</span>
                                        <span className="POSINV-payment-info-value">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Amount to Collect</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="POSINV-payment-input"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="Enter amount"
                                        />
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Payment Mode</label>
                                        <select
                                            className="POSINV-payment-select"
                                            value={paymentMode}
                                            onChange={(e) => {
                                                setPaymentMode(e.target.value);
                                                const modeName = e.target.value === 'CASH' ? 'cash' : 'bank';
                                                const matched = accounts.find(a => a.name.toLowerCase().includes(modeName));
                                                if (matched) setSelectedAccountId(matched.id.toString());
                                            }}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="BANK">Bank Transfer</option>
                                            <option value="CARD">Card Payment</option>
                                            <option value="UPI">UPI</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Received Into (Account)</label>
                                        <select
                                            className="POSINV-payment-select"
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id.toString()}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Payment Date</label>
                                        <input
                                            type="date"
                                            className="POSINV-payment-input"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Notes</label>
                                        <textarea
                                            className="POSINV-payment-input"
                                            rows={2}
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            placeholder="Add any payment notes..."
                                        />
                                    </div>
                                </div>
                                <div className="POSINV-payment-footer">
                                    <button className="POSINV-payment-btn-cancel" onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}>
                                        Cancel
                                    </button>
                                    <button className="POSINV-payment-btn-submit" onClick={handleConfirmPayment} disabled={paymentSubmitting}>
                                        {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {renderSubModals()}
                </div>
            );
        }

    const getInvoicesForExport = () => {
        return invoices.filter(inv => {
            const matchesSearch = (inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.totalAmount?.toString().includes(searchTerm));
            const invoiceDate = new Date(inv.date).setHours(0, 0, 0, 0);
            const matchStart = startDate ? invoiceDate >= new Date(startDate).setHours(0, 0, 0, 0) : true;
            const matchEnd = endDate ? invoiceDate <= new Date(endDate).setHours(0, 0, 0, 0) : true;
            const matchCust = (customerViewOption === 'single' && selectedCustomerIdFilter)
                ? inv.customerId === parseInt(selectedCustomerIdFilter)
                : true;
            return matchesSearch && matchStart && matchEnd && matchCust;
        });
    };

    const handleExportExcel = (scope = exportScope) => {
        const targetInvoices = (scope === 'all' || (!searchTerm && !startDate && !endDate && (customerViewOption !== 'single' || !selectedCustomerIdFilter)))
            ? invoices
            : getInvoicesForExport();

        if (!targetInvoices.length) {
            toast.error('No invoices available to export');
            return;
        }

        const exportData = targetInvoices.map(inv => ({
            'Invoice #': inv.invoiceNumber || 'N/A',
            'Type': inv.type === 'POS_INVOICE' ? 'POS' : 'Sales Invoice',
            'Customer Name': inv.customer?.name || inv.billingName || 'Walk-in Customer',
            'Date': inv.date ? new Date(inv.date).toLocaleDateString() : '',
            'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
            'Total Amount': inv.totalAmount || 0,
            'Paid Amount': inv.paidAmount || 0,
            'Balance Due': inv.balanceAmount !== undefined ? inv.balanceAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
            'Status': inv.status || 'UNPAID',
            'Payment Date': inv.paymentDate ? new Date(inv.paymentDate).toLocaleDateString() : 'N/A',
            'Currency': inv.currency || companySettings?.currency || 'EUR'
        }));

        const dateStr = new Date().toISOString().slice(0, 10);
        exportToExcel(exportData, `Sales_Invoices_${dateStr}.xlsx`, 'Invoices');
        toast.success(`Exported ${exportData.length} invoices to Excel.`);
        setShowExportModal(false);
    };

    const handleExportPDF = (scope = exportScope) => {
        const targetInvoices = (scope === 'all' || (!searchTerm && !startDate && !endDate && (customerViewOption !== 'single' || !selectedCustomerIdFilter)))
            ? invoices
            : getInvoicesForExport();

        if (!targetInvoices.length) {
            toast.error('No invoices available to export');
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4');
        const companyName = companySettings?.name || 'TAB ACCOUNTS';

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`${companyName} - Sales Invoices Register`, 14, 15);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        let filterSummary = `Export Date: ${new Date().toLocaleDateString()} | Total Records: ${targetInvoices.length}`;
        if (startDate || endDate) {
            filterSummary += ` | Period: ${startDate || 'Start'} to ${endDate || 'Current'}`;
        }
        if (customerViewOption === 'single' && selectedCustomerIdFilter) {
            const cust = customers.find(c => c.id === parseInt(selectedCustomerIdFilter));
            if (cust) filterSummary += ` | Customer: ${cust.name}`;
        }
        doc.text(filterSummary, 14, 22);

        const headers = [["Invoice #", "Type", "Customer", "Date", "Due Date", "Total Amount", "Paid", "Balance Due", "Status"]];
        const body = targetInvoices.map(inv => [
            inv.invoiceNumber || 'N/A',
            inv.type === 'POS_INVOICE' ? 'POS' : 'INV',
            inv.customer?.name || inv.billingName || 'Walk-in Customer',
            inv.date ? new Date(inv.date).toLocaleDateString() : '',
            inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A',
            formatDocCurrency(inv.totalAmount || 0, inv.currency),
            formatDocCurrency(inv.paidAmount || 0, inv.currency),
            formatDocCurrency(inv.balanceAmount !== undefined ? inv.balanceAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)), inv.currency),
            inv.paymentDate && (inv.paidAmount > 0 || inv.status === 'PAID')
                ? `${inv.status} (${new Date(inv.paymentDate).toLocaleDateString()})`
                : (inv.status || 'UNPAID')
        ]);

        autoTable(doc, {
            head: headers,
            body: body,
            startY: 26,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            margin: { top: 26, left: 14, right: 14 }
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`Sales_Invoices_${dateStr}.pdf`);
        toast.success(`Exported ${targetInvoices.length} invoices to PDF.`);
        setShowExportModal(false);
    };

    // --- DEFAULT RENDER (LIST) ---
    return (
        <div className="Invoice-invoice-page">
            {!showAddModal && (
                <>
                    <div className="Invoice-page-header">
                        <div>
                            <h1 className="Invoice-page-title">Invoices</h1>
                            <p className="Invoice-page-subtitle">Manage billing and payments</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                className="Invoice-btn-add"
                                style={{ background: '#334155' }}
                                onClick={() => setShowExportModal(true)}
                            >
                                <Download size={18} className="mr-2" /> Export
                            </button>
                            {hasPermission('create sales invoice') && (
                                <button
                                    className="Invoice-btn-add"
                                    style={{ background: '#334155' }}
                                    onClick={() => setShowImportModal(true)}
                                >
                                    <FileSpreadsheet size={18} className="mr-2" /> Import Invoices
                                </button>
                            )}
                            {hasPermission('create sales invoice') && (
                                <button className="Invoice-btn-add" onClick={handleAddNew}>
                                    <Plus size={18} className="mr-2" /> CREATE INVOICE
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="Invoice-filters-card mb-4">
                        <div className="Invoice-filters-grid">
                            <div className="Invoice-filter-group search">
                                <label>Search</label>
                                <div className="Invoice-search-inner">
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Invoice #, Customer..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="Invoice-filter-group date">
                                <label>From Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="Invoice-filter-group date">
                                <label>To Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="Invoice-filter-group select-view">
                                <label>Customer Invoices View</label>
                                <select
                                    className="Invoice-filter-select"
                                    value={customerViewOption}
                                    onChange={(e) => {
                                        const opt = e.target.value;
                                        setCustomerViewOption(opt);
                                        if (opt === 'all') {
                                            setSelectedCustomerIdFilter('');
                                        } else if (opt === 'single' && !selectedCustomerIdFilter && customers.length > 0) {
                                            setSelectedCustomerIdFilter(customers[0].id.toString());
                                        }
                                    }}
                                >
                                    <option value="all">Combined for all customers</option>
                                    <option value="single">For one selected customer only</option>
                                </select>
                            </div>
                            {customerViewOption === 'single' && (
                                <div className="Invoice-filter-group select-customer">
                                    <label>Select Customer</label>
                                    <select
                                        className="Invoice-filter-select"
                                        value={selectedCustomerIdFilter}
                                        onChange={(e) => setSelectedCustomerIdFilter(e.target.value)}
                                    >
                                        <option value="">-- Choose Customer --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="Invoice-filter-group actions">
                                <button className="Invoice-btn-reset" onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setCustomerViewOption('all'); setSelectedCustomerIdFilter(''); }}>
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="Invoice-process-tracker-card">
                        <div className="Invoice-tracker-wrapper">
                            {salesProcess.map((step, index) => {
                                const StepIcon = step.icon;
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className={`Invoice-tracker-step ${step.status}`}>
                                            <div className="Invoice-step-icon-wrapper">
                                                <StepIcon size={20} />
                                                {step.status === 'completed' && <CheckCircle2 className="Invoice-status-badge" size={14} />}
                                                {step.status === 'active' && <Clock className="Invoice-status-badge" size={14} />}
                                            </div>
                                            <span className="Invoice-step-label">{step.label}</span>
                                        </div>
                                        {index < salesProcess.length - 1 && (
                                            <div className={`Invoice-tracker-divider ${salesProcess[index + 1].status !== 'pending' ? 'Invoice-active' : ''}`}>
                                                <ArrowRight size={16} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <div className="Invoice-table-card mt-6">
                        <div className="Invoice-table-container">
                            <table className="Invoice-invoice-table">
                                <thead>
                                    <tr>
                                        <th>INVOICE</th>
                                        <th>CUSTOMER</th>
                                        <th>ISSUE DATE</th>
                                        <th>DUE DATE</th>
                                        <th>AMOUNT DUE</th>
                                        <th>STATUS</th>
                                        <th className="text-left">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        if (customerViewOption === 'single') {
                                            const singleCustInvoices = invoices.filter(inv => {
                                                const matchesSearch = (inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    inv.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    inv.totalAmount?.toString().includes(searchTerm));
                                                const invoiceDate = new Date(inv.date).setHours(0, 0, 0, 0);
                                                const matchStart = startDate ? invoiceDate >= new Date(startDate).setHours(0, 0, 0, 0) : true;
                                                const matchEnd = endDate ? invoiceDate <= new Date(endDate).setHours(0, 0, 0, 0) : true;
                                                const matchCust = selectedCustomerIdFilter ? inv.customerId === parseInt(selectedCustomerIdFilter) : true;
                                                return matchesSearch && matchStart && matchEnd && matchCust;
                                            });

                                            if (singleCustInvoices.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                                                            {selectedCustomerIdFilter ? 'No invoices found for the selected customer.' : 'Please select a customer from the dropdown above to view their invoices.'}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return singleCustInvoices.map(inv => {
                                                const invRate = getSyncRate(inv.currency || 'USD', companySettings?.currency || 'EUR');
                                                return (
                                                    <tr key={`single-inv-${inv.type || 'INV'}-${inv.id}`} className="Invoice-row">
                                                        <td className="px-4 py-3">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    background: inv.type === 'POS_INVOICE' ? '#f8fafc' : '#eff6ff',
                                                                    color: inv.type === 'POS_INVOICE' ? '#334155' : '#2563eb',
                                                                    fontWeight: '800',
                                                                    border: `1px solid ${inv.type === 'POS_INVOICE' ? '#e2e8f0' : '#bfdbfe'}`
                                                                }}>
                                                                    {inv.type === 'POS_INVOICE' ? 'POS' : 'INVOICE'}
                                                                </span>
                                                                <span 
                                                                    className="font-bold text-blue-600" 
                                                                    style={{ cursor: 'pointer' }} 
                                                                    onClick={() => handleView(inv)}
                                                                    title="Click to view invoice"
                                                                >
                                                                    {inv.invoiceNumber}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>{inv.customer?.name || 'Walk-in Customer'}</td>
                                                        <td>{new Date(inv.date).toLocaleDateString()}</td>
                                                        <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}</td>
                                                        <td className="font-bold">
                                                            <div>
                                                                {formatDocCurrency(inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount, inv.currency)}
                                                                {inv.currency && inv.currency !== (companySettings?.currency || 'EUR') && (
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                        ({formatDocCurrency((inv.balanceAmount !== undefined ? inv.balanceAmount : inv.totalAmount) * invRate, companySettings?.currency || 'EUR')})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <select
                                                                    value={inv.manualStatus ? inv.status : 'AUTO'}
                                                                    onChange={(e) => handleStatusChange(inv.id, inv.type === 'POS_INVOICE', e.target.value)}
                                                                    className="Invoice-invoice-status-pill"
                                                                    style={getStatusStyle(inv.manualStatus ? inv.status : 'AUTO')}
                                                                >
                                                                    <option value="AUTO">Auto ({inv.status})</option>
                                                                    <option value="UNPAID">UNPAID</option>
                                                                    <option value="PARTIAL">PARTIAL</option>
                                                                    <option value="PAID">PAID</option>
                                                                    <option value="CANCELLED">CANCELLED</option>
                                                                </select>
                                                                {inv.paymentDate && (inv.paidAmount > 0 || inv.status === 'PAID' || inv.status === 'PARTIAL') && (
                                                                    <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600' }}>
                                                                        Paid: {new Date(inv.paymentDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-right">
                                                            <div className="Invoice-invoice-action-buttons text-nowrap">
                                                                <button 
                                                                    className="Invoice-invoice-action-btn Invoice-view" 
                                                                    onClick={() => handleView(inv)}
                                                                    title="View Invoice"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                {inv.type !== 'POS_INVOICE' && hasPermission('edit sales invoice') && (
                                                                    <button 
                                                                        className="Invoice-invoice-action-btn Invoice-edit" 
                                                                        onClick={() => handleEdit(inv)}
                                                                        title="Edit Invoice"
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </button>
                                                                )}
                                                                {hasPermission('delete sales invoice') && (
                                                                    <button 
                                                                        className="Invoice-invoice-action-btn Invoice-delete" 
                                                                        onClick={() => handleDelete(inv)}
                                                                        title="Delete Invoice"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                                {inv.balanceAmount > 0 && hasPermission('create sales payment') && (
                                                                    <button
                                                                        className="Invoice-invoice-action-btn Invoice-payment"
                                                                        onClick={() => navigate('/company/sales/payment', { 
                                                                            state: { 
                                                                                targetInvoiceId: inv.id, 
                                                                                invoiceType: inv.type, 
                                                                                customerId: inv.customerId 
                                                                            } 
                                                                        })}
                                                                        title="Receive Payment"
                                                                        style={{ color: '#10b981' }}
                                                                    >
                                                                        <CreditCard size={16} />
                                                                    </button>
                                                                )}
                                                                {inv.type !== 'POS_INVOICE' && (inv.paidAmount > 0 || inv.status === 'PAID' || inv.status === 'PARTIAL') && hasPermission('edit sales invoice') && (
                                                                    <button
                                                                        className="Invoice-invoice-action-btn"
                                                                        onClick={() => handleUnpay(inv)}
                                                                        title="Mark as Unpaid & Revert Payments"
                                                                        style={{ color: '#ef4444' }}
                                                                    >
                                                                        <RotateCcw size={16} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="Invoice-invoice-action-btn"
                                                                    onClick={() => handleOpenEmailModal(inv)}
                                                                    title="Email Invoice to Customer"
                                                                    style={{ color: '#0284c7' }}
                                                                >
                                                                    <Mail size={16} />
                                                                </button>
                                                                <button
                                                                    className="Invoice-invoice-action-btn"
                                                                    onClick={() => handleDownloadSingleInvoicePDF(inv)}
                                                                    title="Download PDF"
                                                                    style={{ color: '#059669' }}
                                                                >
                                                                    <Download size={16} />
                                                                </button>
                                                                <button
                                                                    className="Invoice-invoice-action-btn"
                                                                    onClick={() => handlePrintInvoice(inv)}
                                                                    title="Print Invoice"
                                                                    style={{ color: '#334155' }}
                                                                >
                                                                    <Printer size={16} />
                                                                </button>
                                                                <button
                                                                    className="Invoice-invoice-action-btn"
                                                                    onClick={() => navigate(`/company/settings/audit-logs?entity=Invoice&search=${encodeURIComponent(inv.invoiceNumber)}`)}
                                                                    title="View Invoice Audit Trail"
                                                                    style={{ color: '#6366f1' }}
                                                                >
                                                                    <Shield size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        }

                                        // Grouping Logic (Now by Customer)
                                        const groupedMap = {};

                                        invoices.filter(inv => {
                                            const matchesSearch = (inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                inv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                inv.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                inv.totalAmount?.toString().includes(searchTerm));
                                            const invoiceDate = new Date(inv.date).setHours(0, 0, 0, 0);
                                            const matchStart = startDate ? invoiceDate >= new Date(startDate).setHours(0, 0, 0, 0) : true;
                                            const matchEnd = endDate ? invoiceDate <= new Date(endDate).setHours(0, 0, 0, 0) : true;
                                            return matchesSearch && matchStart && matchEnd;
                                        }).forEach(inv => {
                                            const key = inv.customerId ? `CUST-${inv.customerId}` : `WALKIN-${inv.type || 'NONE'}`;
                                            if (!groupedMap[key]) {
                                                groupedMap[key] = {
                                                    id: key,
                                                    isGroup: true,
                                                    invoices: [],
                                                    returns: [],
                                                    totalInvoiceAmount: 0,
                                                    totalReturnAmount: 0,
                                                    balanceAmount: 0,
                                                    totalPaidAmount: 0,
                                                    customer: inv.customer || { name: 'Walk-in Customer' },
                                                    earliestDate: inv.date,
                                                    latestDueDate: inv.dueDate,
                                                    isSingle: false
                                                };
                                            }
                                            const rate = getSyncRate(inv.currency || 'USD', companySettings?.currency || 'EUR');
                                            groupedMap[key].invoices.push(inv);
                                            groupedMap[key].totalInvoiceAmount += inv.totalAmount * rate;
                                            groupedMap[key].balanceAmount += (inv.balanceAmount || 0) * rate;
                                            const effectivePaid = inv.paidAmount !== undefined ? inv.paidAmount : (inv.totalAmount - (inv.balanceAmount || 0));
                                            groupedMap[key].totalPaidAmount += effectivePaid * rate;

                                            const curr = inv.currency || companySettings?.currency || 'EUR';
                                            if (!groupedMap[key].currencyTotals) {
                                                groupedMap[key].currencyTotals = {};
                                            }
                                            if (!groupedMap[key].currencyTotals[curr]) {
                                                groupedMap[key].currencyTotals[curr] = 0;
                                            }
                                            groupedMap[key].currencyTotals[curr] += (inv.balanceAmount || 0);

                                            if (inv.salesreturn) {
                                                inv.salesreturn.forEach(ret => {
                                                    groupedMap[key].returns.push(ret);
                                                    const retRate = getSyncRate(ret.currency || inv.currency || 'USD', companySettings?.currency || 'EUR');
                                                    groupedMap[key].totalReturnAmount += (ret.totalAmount || 0) * retRate;
                                                });
                                            }

                                            if (new Date(inv.date) < new Date(groupedMap[key].earliestDate)) groupedMap[key].earliestDate = inv.date;
                                            if (inv.dueDate && new Date(inv.dueDate) > new Date(groupedMap[key].latestDueDate)) groupedMap[key].latestDueDate = inv.dueDate;
                                        });

                                        Object.values(groupedMap).forEach(group => {
                                            if (group.invoices.length === 1 && group.returns.length === 0) {
                                                group.isSingle = true;
                                            }
                                        });

                                        return Object.values(groupedMap).map(group => (
                                            <React.Fragment key={group.id}>
                                                <tr className="Invoice-group-row">
                                                    <td className="px-4 py-3">
                                                        <div className="Invoice-flex Invoice-items-center Invoice-gap-2">
                                                            {!group.isSingle && (
                                                                <button
                                                                    className={`Invoice-toggle-btn ${expandedGroups[group.id] ? 'expanded' : ''}`}
                                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                                                    title="Click to expand/collapse invoices"
                                                                >
                                                                    <ChevronDown size={14} />
                                                                </button>
                                                            )}
                                                            {group.isSingle ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        background: group.invoices[0].type === 'POS_INVOICE' ? '#f8fafc' : '#eff6ff',
                                                                        color: group.invoices[0].type === 'POS_INVOICE' ? '#334155' : '#2563eb',
                                                                        fontWeight: '800',
                                                                        border: `1px solid ${group.invoices[0].type === 'POS_INVOICE' ? '#e2e8f0' : '#bfdbfe'}`
                                                                    }}>
                                                                        {group.invoices[0].type === 'POS_INVOICE' ? 'POS' : 'INVOICE'}
                                                                    </span>
                                                                    <span 
                                                                        className="font-bold text-blue-600" 
                                                                        style={{ cursor: 'pointer' }} 
                                                                        onClick={() => handleView(group.invoices[0])}
                                                                        title="Click to view invoice"
                                                                    >
                                                                        {group.invoices[0].invoiceNumber}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                                                        <span className="font-bold text-blue-600">
                                                                            {group.customer?.name}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                                                                            ({group.invoices.length} Invoices)
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                        {group.invoices.map(i => i.invoiceNumber).join(', ')}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{group.customer?.name}</td>
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
                                                        {(() => {
                                                            let statusVal = 'Combined';
                                                            if (group.isSingle) {
                                                                statusVal = group.invoices[0].status;
                                                            } else if (group.balanceAmount === 0) {
                                                                if (group.totalReturnAmount > 0) {
                                                                    const allReturned = group.invoices.every(inv => inv.status.toLowerCase().includes('returned') && !inv.status.toLowerCase().includes('partial'));
                                                                    statusVal = allReturned ? 'Returned' : 'Partially Returned';
                                                                } else {
                                                                    statusVal = 'Fully Paid';
                                                                }
                                                            }
                                                            if (group.isSingle) {
                                                                const singleInv = group.invoices[0];
                                                                return (
                                                                    <select
                                                                        value={singleInv.manualStatus ? singleInv.status : 'AUTO'}
                                                                        onChange={(e) => handleStatusChange(singleInv.id, singleInv.type === 'POS_INVOICE', e.target.value)}
                                                                        className="Invoice-invoice-status-pill"
                                                                        style={getStatusStyle(singleInv.manualStatus ? singleInv.status : 'AUTO')}
                                                                    >
                                                                        <option value="AUTO">Auto ({singleInv.status})</option>
                                                                        <option value="UNPAID">UNPAID</option>
                                                                        <option value="PARTIAL">PARTIAL</option>
                                                                        <option value="PAID">PAID</option>
                                                                        <option value="CANCELLED">CANCELLED</option>
                                                                    </select>
                                                                );
                                                            }
                                                            return (
                                                                <span className={`Invoice-invoice-status-pill ${getStatusClass(statusVal)}`}>
                                                                    {statusVal}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="Invoice-invoice-action-buttons text-nowrap">
                                                            {!group.isSingle ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <button
                                                                        className="Invoice-btn-combined-view"
                                                                        onClick={() => handleCombinedView(group)}
                                                                        title="View Combined Customer Statement"
                                                                        style={{
                                                                            background: '#f59e0b',
                                                                            color: 'white',
                                                                            padding: '6px 14px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: '700',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
                                                                        }}
                                                                    >
                                                                        View Combined
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={`Invoice-invoice-action-btn ${expandedGroups[group.id] ? 'active' : ''}`}
                                                                        onClick={() => toggleGroup(group.id)}
                                                                        title={expandedGroups[group.id] ? "Collapse Invoices" : "Expand to View / Edit / Delete Invoices"}
                                                                        style={{
                                                                            background: '#f1f5f9',
                                                                            color: '#1e293b',
                                                                            border: '1px solid #cbd5e1',
                                                                            padding: '5px 10px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: '600',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <Pencil size={12} />
                                                                        <Trash2 size={12} />
                                                                        <span>Invoices ({group.invoices.length})</span>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button className="Invoice-invoice-action-btn Invoice-view" onClick={() => handleView(group.invoices[0])} title="View Invoice"><Eye size={16} /></button>
                                                            )}
                                                            {group.isSingle && (
                                                                <>
                                                                    {group.invoices[0].type !== 'POS_INVOICE' && hasPermission('edit sales invoice') && (
                                                                        <button className="Invoice-invoice-action-btn Invoice-edit" onClick={() => handleEdit(group.invoices[0])} title="Edit Invoice"><Pencil size={16} /></button>
                                                                    )}
                                                                    {hasPermission('delete sales invoice') && (
                                                                        <button className="Invoice-invoice-action-btn Invoice-delete" onClick={() => handleDelete(group.invoices[0])} title="Delete Invoice"><Trash2 size={16} /></button>
                                                                    )}
                                                                    {group.invoices[0].type !== 'POS_INVOICE' && group.invoices[0].balanceAmount > 0 && hasPermission('create sales payment') && (
                                                                        <button
                                                                            className="Invoice-invoice-action-btn Invoice-payment"
                                                                            onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: group.invoices[0].id, customerId: group.invoices[0].customerId } })}
                                                                            title="Receive Payment"
                                                                            style={{ color: '#10b981' }}
                                                                        >
                                                                            <CreditCard size={16} />
                                                                        </button>
                                                                    )}
                                                                    {group.invoices[0].type === 'POS_INVOICE' && group.invoices[0].balanceAmount > 0 && hasPermission('create sales payment') && (
                                                                        <button
                                                                            className="Invoice-invoice-action-btn Invoice-payment"
                                                                            onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: group.invoices[0].id, invoiceType: 'POS_INVOICE', customerId: group.invoices[0].customerId } })}
                                                                            title="Receive Payment"
                                                                            style={{ color: '#10b981' }}
                                                                        >
                                                                            <CreditCard size={16} />
                                                                        </button>
                                                                    )}
                                                                    {group.invoices[0].type !== 'POS_INVOICE' && (group.invoices[0].paidAmount > 0 || group.invoices[0].status === 'PAID' || group.invoices[0].status === 'PARTIAL') && hasPermission('edit sales invoice') && (
                                                                        <button
                                                                            className="Invoice-invoice-action-btn"
                                                                            onClick={() => handleUnpay(group.invoices[0])}
                                                                            title="Mark as Unpaid & Revert Payments"
                                                                            style={{ color: '#ef4444' }}
                                                                        >
                                                                            <RotateCcw size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="Invoice-invoice-action-btn"
                                                                        onClick={() => handleOpenEmailModal(group.invoices[0])}
                                                                        title="Email Invoice to Customer"
                                                                        style={{ color: '#0284c7' }}
                                                                    >
                                                                        <Mail size={16} />
                                                                    </button>
                                                                    <button
                                                                        className="Invoice-invoice-action-btn"
                                                                        onClick={() => handleDownloadSingleInvoicePDF(group.invoices[0])}
                                                                        title="Download PDF"
                                                                        style={{ color: '#059669' }}
                                                                    >
                                                                        <Download size={16} />
                                                                    </button>
                                                                    <button
                                                                        className="Invoice-invoice-action-btn"
                                                                        onClick={() => handlePrintInvoice(group.invoices[0])}
                                                                        title="Print Invoice"
                                                                        style={{ color: '#334155' }}
                                                                    >
                                                                        <Printer size={16} />
                                                                    </button>
                                                                    <button
                                                                        className="Invoice-invoice-action-btn"
                                                                        onClick={() => navigate(`/company/settings/audit-logs?entity=Invoice&search=${encodeURIComponent(group.invoices[0].invoiceNumber)}`)}
                                                                        title="View Invoice Audit Trail"
                                                                        style={{ color: '#6366f1' }}
                                                                    >
                                                                        <Shield size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* EXPANDED CONTENT */}
                                                {group.isGroup && expandedGroups[group.id] && (
                                                    <tr>
                                                        <td colSpan="8" className="Invoice-expanded-cell">
                                                            <div className="Invoice-expanded-content">

                                                                {/* SUB-TABLE */}
                                                                <div className="Invoice-sub-table-wrapper">
                                                                    <table className="Invoice-sub-table-dropdown">
                                                                        <thead>
                                                                            <tr>
                                                                                <th style={{ width: '10%' }}>Type</th>
                                                                                <th style={{ width: '15%' }}>Doc #</th>
                                                                                <th style={{ width: '15%' }}>Date</th>
                                                                                <th style={{ width: '15%' }}>Total</th>
                                                                                <th style={{ width: '15%' }}>Due</th>
                                                                                <th style={{ width: '20%' }}>Status</th>
                                                                                <th className="text-left" style={{ width: '10%' }}>Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {group.invoices.map(si => {
                                                                                const subRate = getSyncRate(si.currency || 'USD', companySettings?.currency || 'INR');
                                                                                return (
                                                                                    <tr key={`si-${si.id}-${si.type}`}>
                                                                                        <td>
                                                                                            <span style={{
                                                                                                fontSize: '10px',
                                                                                                padding: '2px 8px',
                                                                                                borderRadius: '4px',
                                                                                                background: si.type === 'POS_INVOICE' ? '#f8fafc' : '#eff6ff',
                                                                                                color: si.type === 'POS_INVOICE' ? '#334155' : '#2563eb',
                                                                                                fontWeight: '800',
                                                                                                border: `1px solid ${si.type === 'POS_INVOICE' ? '#e2e8f0' : '#bfdbfe'}`
                                                                                            }}>
                                                                                                {si.type === 'POS_INVOICE' ? 'POS' : 'INVOICE'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="font-bold">{si.invoiceNumber}</td>
                                                                                        <td>{new Date(si.date).toLocaleDateString()}</td>
                                                                                        <td>
                                                                                            {formatDocCurrency(si.totalAmount, si.currency)}
                                                                                            {si.currency && si.currency !== (companySettings?.currency || 'INR') && (
                                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                    ({formatDocCurrency(si.totalAmount * subRate, companySettings?.currency || 'INR')})
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="font-bold">
                                                                                            {formatDocCurrency(si.balanceAmount, si.currency)}
                                                                                            {si.currency && si.currency !== (companySettings?.currency || 'INR') && (
                                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                                                                    ({formatDocCurrency(si.balanceAmount * subRate, companySettings?.currency || 'INR')})
                                                                                                </div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td>
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                                <select
                                                                                                    value={si.manualStatus ? si.status : 'AUTO'}
                                                                                                    onChange={(e) => handleStatusChange(si.id, si.type === 'POS_INVOICE', e.target.value)}
                                                                                                    className="Invoice-invoice-status-pill"
                                                                                                    style={getStatusStyle(si.manualStatus ? si.status : 'AUTO')}
                                                                                                >
                                                                                                    <option value="AUTO">Auto ({si.status})</option>
                                                                                                    <option value="UNPAID">UNPAID</option>
                                                                                                    <option value="PARTIAL">PARTIAL</option>
                                                                                                    <option value="PAID">PAID</option>
                                                                                                    <option value="CANCELLED">CANCELLED</option>
                                                                                                </select>
                                                                                                {si.paymentDate && (si.paidAmount > 0 || si.status === 'PAID' || si.status === 'PARTIAL') && (
                                                                                                    <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                                                                        Paid: {new Date(si.paymentDate).toLocaleDateString()}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="text-right">
                                                                                            <div className="Invoice-invoice-action-buttons">
                                                                                                <button className="Invoice-invoice-action-btn Invoice-view" onClick={() => handleView(si)}><Eye size={14} /></button>
                                                                                                {si.type === 'POS_INVOICE' ? (
                                                                                                    <>
                                                                                                        {si.balanceAmount > 0 && hasPermission('create sales payment') && (
                                                                                                            <button
                                                                                                                className="Invoice-invoice-action-btn Invoice-payment"
                                                                                                                onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: si.id, invoiceType: 'POS_INVOICE', customerId: si.customerId } })}
                                                                                                                title="Receive Payment"
                                                                                                                style={{ color: '#10b981' }}
                                                                                                            >
                                                                                                                <CreditCard size={14} />
                                                                                                            </button>
                                                                                                        )}
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => handleDownloadSingleInvoicePDF(si)}
                                                                                                            title="Download PDF"
                                                                                                            style={{ color: '#059669' }}
                                                                                                        >
                                                                                                            <Download size={14} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => handlePrintInvoice(si)}
                                                                                                            title="Print Invoice"
                                                                                                            style={{ color: '#334155' }}
                                                                                                        >
                                                                                                            <Printer size={14} />
                                                                                                        </button>
                                                                                                        {hasPermission('delete sales invoice') && (
                                                                                                            <button className="Invoice-invoice-action-btn Invoice-delete" onClick={() => handleDelete(si)}><Trash2 size={14} /></button>
                                                                                                        )}
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        {si.balanceAmount > 0 && hasPermission('create sales payment') && (
                                                                                                            <button
                                                                                                                className="Invoice-invoice-action-btn Invoice-payment"
                                                                                                                onClick={() => navigate('/company/sales/payment', { state: { targetInvoiceId: si.id, customerId: si.customerId } })}
                                                                                                                title="Receive Payment"
                                                                                                                style={{ color: '#10b981' }}
                                                                                                            >
                                                                                                                <CreditCard size={14} />
                                                                                                            </button>
                                                                                                        )}
                                                                                                        {hasPermission('edit sales invoice') && (
                                                                                                            <button className="Invoice-invoice-action-btn Invoice-edit" onClick={() => handleEdit(si)}><Pencil size={14} /></button>
                                                                                                        )}
                                                                                                        {(si.paidAmount > 0 || si.status === 'PAID' || si.status === 'PARTIAL') && hasPermission('edit sales invoice') && (
                                                                                                            <button
                                                                                                                className="Invoice-invoice-action-btn"
                                                                                                                onClick={() => handleUnpay(si)}
                                                                                                                title="Mark as Unpaid & Revert Payments"
                                                                                                                style={{ color: '#ef4444' }}
                                                                                                            >
                                                                                                                <RotateCcw size={14} />
                                                                                                            </button>
                                                                                                        )}
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => handleOpenEmailModal(si)}
                                                                                                            title="Email Invoice to Customer"
                                                                                                            style={{ color: '#0284c7' }}
                                                                                                        >
                                                                                                            <Mail size={14} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => handleDownloadSingleInvoicePDF(si)}
                                                                                                            title="Download PDF"
                                                                                                            style={{ color: '#059669' }}
                                                                                                        >
                                                                                                            <Download size={14} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => handlePrintInvoice(si)}
                                                                                                            title="Print Invoice"
                                                                                                            style={{ color: '#334155' }}
                                                                                                        >
                                                                                                            <Printer size={14} />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="Invoice-invoice-action-btn"
                                                                                                            onClick={() => navigate(`/company/settings/audit-logs?entity=Invoice&search=${encodeURIComponent(si.invoiceNumber)}`)}
                                                                                                            title="View Invoice Audit Trail"
                                                                                                            style={{ color: '#6366f1' }}
                                                                                                        >
                                                                                                            <Shield size={14} />
                                                                                                        </button>
                                                                                                        {hasPermission('delete sales invoice') && (
                                                                                                            <button className="Invoice-invoice-action-btn Invoice-delete" onClick={() => handleDelete(si)}><Trash2 size={14} /></button>
                                                                                                        )}
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                            {group.returns.map(sr => (
                                                                                <tr key={`sr-${sr.id}`} style={{ background: '#fff1f2' }}>
                                                                                    <td className="font-bold text-red-500">RETURN</td>
                                                                                    <td className="font-bold">{sr.returnNumber}</td>
                                                                                    <td>{new Date(sr.date).toLocaleDateString()}</td>
                                                                                    <td className="text-red-600 font-bold">-{formatCurrency(sr.totalAmount)}</td>
                                                                                    <td>-</td>
                                                                                    <td><span className="Invoice-invoice-status-pill" style={{ background: '#ef4444' }}>Credited</span></td>
                                                                                    <td className="text-right">
                                                                                        <button className="Invoice-invoice-action-btn Invoice-view" onClick={() => handleView(sr)}><Eye size={14} /></button>
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
            {showAddModal && (
                <div className="Invoice-invoice-full-page-create">
                    <div className="Invoice-view-page-header Invoice-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img
                                    src={getCompanyLogoSrc(companyDetails.invoiceLogo || companyDetails.logo || companySettings?.invoiceLogo || companySettings?.logo)}
                                    alt={companyDetails.name || "Company Logo"}
                                    className="Invoice-modal-logo-img"
                                    style={{ height: '32px', maxWidth: '140px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = tabAccountsLogo;
                                    }}
                                />
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {editingId ? 'Edit Invoice' : 'New Invoice'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div>
                            <button className="Invoice-btn-back" onClick={() => { setShowAddModal(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Invoices
                            </button>
                        </div>
                    </div>

                    <div className="Invoice-modal-content Invoice-invoice-form-modal">
                        <div className="Invoice-modal-body-scrollable">
                            {/* Visibility Settings for Optional Fields */}
                            <div className="Invoice-visibility-settings" style={{
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
                                    <input type="checkbox" checked={showCurrencyField} onChange={(e) => setShowCurrencyField(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#1e293b' }} />
                                    Show Currency
                                </label>
                            </div>

                            {/* 2-Column Voucher Header Grid */}
                            <div className="Invoice-voucher-header-grid" style={{
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
                                <div className="Invoice-header-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
                                    <div className="Invoice-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>INVOICE NO. *</label>
                                        <input type="text"
                                            value={invoiceMeta.manualNo}
                                            onChange={(e) => setInvoiceMeta({ ...invoiceMeta, manualNo: e.target.value })}
                                            placeholder="Invoice Number"
                                            disabled={numberingMode === 'auto'}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="Invoice-compact-input" />
                                    </div>

                                    <div className="Invoice-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DATE</label>
                                        <input type="date"
                                            value={invoiceMeta.date} onChange={(e) => {
                                                const newDate = e.target.value;
                                                const newDueDate = calculateDueDate(newDate, selectedCustomerCreditPeriod);
                                                setInvoiceMeta({ ...invoiceMeta, date: newDate, dueDate: newDueDate });
                                            }}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="Invoice-compact-input" />
                                    </div>

                                    <div className="Invoice-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>CUSTOMER / CASH *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '280px' }}>
                                            <SearchableSelect
                                                options={customers}
                                                value={customerId}
                                                onChange={async (val) => {
                                                    const id = val;
                                                    setCustomerId(id);
                                                    if (!id) {
                                                        setCustomerShippingAddresses([]);
                                                        return;
                                                    }

                                                    try {
                                                        const companyId = GetCompanyId();
                                                        const response = await customerService.getById(id, companyId);
                                                        if (response.data.success) {
                                                            const c = response.data.data;
                                                            const addresses = [];
                                                            if (c.shippingAddress) {
                                                                addresses.push({
                                                                    id: -1,
                                                                    name: c.shippingName || "Primary Address",
                                                                    address: c.shippingAddress,
                                                                    city: c.shippingCity,
                                                                    state: c.shippingState,
                                                                    country: c.shippingCountry,
                                                                    zipCode: c.shippingZipCode
                                                                });
                                                            }
                                                            if (c.shippingaddress && Array.isArray(c.shippingaddress)) {
                                                                addresses.push(...c.shippingaddress);
                                                            }

                                                            setCustomerShippingAddresses(addresses);
                                                            setSelectedCustomerCreditPeriod(c.creditPeriod || 0);
                                                            const newDueDate = calculateDueDate(invoiceMeta.date, c.creditPeriod || 0);
                                                            setInvoiceMeta(prev => ({ ...prev, dueDate: newDueDate }));
                                                            setBillingDetails({
                                                                name: c.billingName || c.name || '',
                                                                address: c.billingAddress || '',
                                                                city: c.billingCity || '',
                                                                state: c.billingState || '',
                                                                zipCode: c.billingZipCode || '',
                                                                country: c.billingCountry || ''
                                                            });
                                                            if (shippingSameAsBilling) {
                                                                setShippingDetails({
                                                                    name: c.shippingName || c.name || '',
                                                                    address: c.shippingAddress || c.billingAddress || '',
                                                                    city: c.shippingCity || c.billingCity || '',
                                                                    state: c.shippingState || c.billingState || '',
                                                                    zipCode: c.shippingZipCode || c.billingZipCode || '',
                                                                    country: c.shippingCountry || c.billingCountry || ''
                                                                });
                                                            }
                                                            await fetchCustomerReceipts(id);
                                                        }
                                                    } catch (error) {
                                                        console.error("Error fetching customer addresses", error);
                                                    }
                                                }}
                                                placeholder="Select Customer..."
                                                clearable={true}
                                            />
                                            {creationMode === 'direct' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddCustomerModal(true)}
                                                    title="Add New Customer"
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
                                <div className="Invoice-header-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>


                                    <div className="Invoice-meta-col">
                                        <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DUE DATE</label>
                                        <input type="date"
                                            value={invoiceMeta.dueDate} onChange={(e) => setInvoiceMeta({ ...invoiceMeta, dueDate: e.target.value })}
                                            style={{ width: '100%', maxWidth: '280px' }}
                                            className="Invoice-compact-input" />
                                    </div>

                                    {showCurrencyField && (
                                        <>
                                            <div className="Invoice-meta-col">
                                                <label style={{ fontWeight: '600', fontSize: '0.8rem', color: '#334155', marginBottom: '3px', display: 'block' }}>Currency</label>
                                                <select
                                                    value={selectedCurrency}
                                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                                    className="Invoice-compact-select"
                                                >
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="INR">INR (₹)</option>
                                                </select>
                                            </div>
                                            {selectedCurrency !== (companySettings?.currency || 'EUR') && (
                                                <div className="Invoice-meta-col">
                                                    <label style={{ fontWeight: '600', fontSize: '0.8rem', color: '#334155', marginBottom: '3px', display: 'block' }}>Exchange Rate</label>
                                                    <input type="number"
                                                        step="0.0001"
                                                        value={exchangeRate}
                                                        onChange={(e) => setExchangeRate(e.target.value)}
                                                        className="Invoice-compact-input" />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {customerShippingAddresses.length > 0 && (
                                        <div className="Invoice-shipping-col Invoice-address-card" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', background: '#f8fafc', width: '100%', maxWidth: '280px' }}>
                                            <div className="Invoice-address-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>SHIPPING ADDRESS</label>
                                            </div>
                                            <div className="Invoice-address-card-body">
                                                <select
                                                    className="Invoice-compact-select-large"
                                                    onChange={(e) => {
                                                        const addrId = e.target.value;
                                                        if (!addrId) return;
                                                        const addr = customerShippingAddresses.find(a => String(a.id) === String(addrId));
                                                        if (addr) {
                                                            setShippingDetails({
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
                                                    <option value="">-- Choose Shipping Address --</option>
                                                    {customerShippingAddresses.map((addr) => (
                                                        <option key={addr.id} value={addr.id}>
                                                            {addr.name} {addr.city ? `- ${addr.city}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Fields Section */}
                            {getCustomFieldsForType('invoice').length > 0 && (
                                <div className="Invoice-custom-fields-section-compact">
                                    <h4 className="Invoice-compact-section-header">Custom Fields</h4>
                                    <div className="Invoice-custom-fields-grid-compact">
                                        {getCustomFieldsForType('invoice').map(field => (
                                            <div key={field.id} className="flex flex-col gap-0.5">
                                                <label className="Invoice-mini-label">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        value={customFieldValues[field.label] || ''}
                                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                        className="Invoice-compact-select"
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
                                                        className="Invoice-compact-input"
                                                        required={field.required}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items Table Section Header */}
                            <div className="Invoice-items-section-compact">
                                <div className="Invoice-items-header-compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '320px' }}>
                                        <h4 className="Invoice-compact-section-header m-0" style={{ whiteSpace: 'nowrap' }}>Line Items</h4>
                                        <div style={{ flex: 1, maxWidth: '300px' }}>
                                            <SearchableSelect
                                                options={[
                                                    ...allProducts.map(p => ({ ...p, id: `p-${p.id}`, name: `${p.name} (Stock: ${p.totalQuantity ?? 0})`, type: 'Products' })),
                                                    ...allServices.map(s => ({ ...s, id: `s-${s.id}`, name: s.name, type: 'Services' }))
                                                ]}
                                                value=""
                                                onChange={(val) => {
                                                    if (val) {
                                                        const eventValue = val;
                                                        if (eventValue.startsWith('p-')) {
                                                            const pId = eventValue.split('-')[1];
                                                            const p = allProducts.find(x => x.id === parseInt(pId));
                                                            if (p) {
                                                                let autoWarehouseId = '';
                                                                if (p.stock && p.stock.length > 0) {
                                                                    const bestStock = p.stock.filter(s => s.quantity > 0).sort((a, b) => b.quantity - a.quantity)[0];
                                                                    if (bestStock) autoWarehouseId = String(bestStock.warehouseId);
                                                                    else if (p.stock[0]) autoWarehouseId = String(p.stock[0].warehouseId);
                                                                }
                                                                const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                                                                const convertedPrice = p.salePrice ? (p.salePrice / conversionRate) : 0;
                                                                const newItem = {
                                                                    id: Date.now(),
                                                                    productId: pId,
                                                                    serviceId: '',
                                                                    uomId: p.salesUomId || p.uomId || '',
                                                                    rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                    qty: 1,
                                                                    tax: p.taxRate || 0,
                                                                    discount: 0,
                                                                    total: Number(convertedPrice.toFixed(2)) || 0,
                                                                    description: p.name,
                                                                    warehouseId: autoWarehouseId
                                                                };
                                                                setItems(prev => {
                                                                    const last = prev[prev.length - 1];
                                                                    if (last && !last.productId && !last.serviceId) {
                                                                        return prev.map((it, idx) => idx === prev.length - 1 ? { ...it, ...newItem, id: it.id } : it);
                                                                    }
                                                                    return [...prev, newItem];
                                                                });
                                                            }
                                                        } else if (eventValue.startsWith('s-')) {
                                                            const sId = eventValue.split('-')[1];
                                                            const s = allServices.find(x => x.id === parseInt(sId));
                                                            if (s) {
                                                                const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                                                                const convertedPrice = s.price ? (s.price / conversionRate) : 0;
                                                                const newItem = {
                                                                    id: Date.now(),
                                                                    serviceId: sId,
                                                                    productId: '',
                                                                    uomId: '',
                                                                    rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                    qty: 1,
                                                                    tax: s.taxRate || 0,
                                                                    discount: 0,
                                                                    total: Number(convertedPrice.toFixed(2)) || 0,
                                                                    description: s.name
                                                                };
                                                                setItems(prev => {
                                                                    const last = prev[prev.length - 1];
                                                                    if (last && !last.productId && !last.serviceId) {
                                                                        return prev.map((it, idx) => idx === prev.length - 1 ? { ...it, ...newItem, id: it.id } : it);
                                                                    }
                                                                    return [...prev, newItem];
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                                placeholder="Type item name/SKU & press Enter..."
                                                searchPlaceholder="Search product/service..."
                                                labelKey="name"
                                                valueKey="id"
                                                groupKey="type"
                                                clearable={true}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductWarehouseRows(allWarehouses.map(wh => ({
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

                                <div className="Invoice-table-responsive-compact">
                                    <table className="Invoice-compact-items-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '34%' }}>{getTableHeader('item', 'ITEM DETAIL').toUpperCase()}</th>
                                                {getInvoiceLabel('showQty') !== false && <th style={{ width: '12%' }}>{getTableHeader('quantity', 'QTY').toUpperCase()}</th>}
                                                {getInvoiceLabel('showRate') !== false && <th style={{ width: '14%' }}>{getTableHeader('rate', 'RATE').toUpperCase()}</th>}
                                                {getInvoiceLabel('showTax') !== false && <th style={{ width: '14%' }}>{getTableHeader('tax', 'VAT %').toUpperCase()}</th>}
                                                {getInvoiceLabel('showDiscount') !== false && <th style={{ width: '10%' }}>{getTableHeader('discount', 'DISC.').toUpperCase()}</th>}
                                                <th style={{ width: '16%' }}>{getTableHeader('price', 'AMOUNT').toUpperCase()}</th>
                                                <th style={{ width: '4%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map(item => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <SearchableSelect
                                                            options={[
                                                                ...allProducts.map(p => ({ ...p, id: `p-${p.id}`, name: `${p.name} (${p.totalQuantity ?? 0})`, type: 'Products' })),
                                                                ...allServices.map(s => ({ ...s, id: `s-${s.id}`, name: s.name, type: 'Services' }))
                                                            ]}
                                                            value={
                                                                item.productId ? `p-${item.productId}` :
                                                                    item.serviceId ? `s-${item.serviceId}` : ''
                                                            }
                                                            onChange={(val) => {
                                                                const eventValue = val;
                                                                if (eventValue.startsWith('p-')) {
                                                                    const pId = eventValue.split('-')[1];
                                                                    const p = allProducts.find(x => x.id === parseInt(pId));
                                                                    if (p) {
                                                                        let autoWarehouseId = item.warehouseId || '';
                                                                        if (!autoWarehouseId && p.stock && p.stock.length > 0) {
                                                                            const bestStock = p.stock
                                                                                .filter(s => s.quantity > 0)
                                                                                .sort((a, b) => b.quantity - a.quantity)[0];
                                                                            if (bestStock) {
                                                                                autoWarehouseId = String(bestStock.warehouseId);
                                                                            } else if (p.stock[0]) {
                                                                                autoWarehouseId = String(p.stock[0].warehouseId);
                                                                            }
                                                                        }
                                                                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                                                                        const convertedPrice = p.salePrice ? (p.salePrice / conversionRate) : 0;
                                                                        updateItem(item.id, {
                                                                            productId: pId,
                                                                            serviceId: '',
                                                                            uomId: p.salesUomId || p.uomId || '',
                                                                            rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                            tax: p.taxRate !== undefined && p.taxRate !== null && p.taxRate !== '' ? parseFloat(p.taxRate) : defaultVat,
                                                                            description: item.description || p.name,
                                                                            warehouseId: autoWarehouseId
                                                                        });
                                                                    }
                                                                } else if (eventValue.startsWith('s-')) {
                                                                    const sId = eventValue.split('-')[1];
                                                                    const s = allServices.find(x => x.id === parseInt(sId));
                                                                    if (s) {
                                                                        const conversionRate = getSyncRate(selectedCurrency, companySettings?.currency || 'INR') || 1.0;
                                                                        const convertedPrice = s.price ? (s.price / conversionRate) : 0;
                                                                        updateItem(item.id, {
                                                                            serviceId: sId,
                                                                            productId: '',
                                                                            rate: Number(convertedPrice.toFixed(2)) || 0,
                                                                            tax: s.taxRate !== undefined && s.taxRate !== null && s.taxRate !== '' ? parseFloat(s.taxRate) : defaultVat,
                                                                            description: item.description || s.name
                                                                        });
                                                                    }
                                                                } else {
                                                                    updateItem(item.id, {
                                                                        productId: '',
                                                                        serviceId: '',
                                                                        rate: 0,
                                                                        tax: 0,
                                                                        description: ''
                                                                    });
                                                                }
                                                            }}
                                                            placeholder="Select Product/Service..."
                                                            searchPlaceholder="Search product/service..."
                                                            labelKey="name"
                                                            valueKey="id"
                                                            groupKey="type"
                                                            clearable={false}
                                                            onEnterPress={() => handleAutoAddNextRow(item.id)}
                                                        />
                                                    </td>
                                                    {getInvoiceLabel('showQty') !== false && (
                                                        <td>
                                                            <input type="number" className="Invoice-compact-input text-center" value={item.qty}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'qty', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}

                                                    {getInvoiceLabel('showRate') !== false && (
                                                        <td>
                                                            <input type="number" className="Invoice-compact-input text-right" value={item.rate}
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
                                                                className="Invoice-compact-input text-center"
                                                                value={item.tax !== undefined && item.tax !== null ? item.tax : defaultVat}
                                                                onChange={(e) => updateItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                                                style={{ fontWeight: 600, cursor: 'pointer', appearance: 'auto', padding: '2px 4px' }}
                                                            >
                                                                <option value="23">23% (Std)</option>
                                                                <option value="13.5">13.5% (Red)</option>
                                                                <option value="0">0% (Zero)</option>
                                                                {![23, 13.5, 0, '23', '13.5', '0'].includes(item.tax) && item.tax !== undefined && item.tax !== '' && (
                                                                    <option value={item.tax}>{item.tax}%</option>
                                                                )}
                                                            </select>
                                                        </td>
                                                    )}
                                                    {getInvoiceLabel('showDiscount') !== false && (
                                                        <td>
                                                            <input type="number" className="Invoice-compact-input text-right" value={item.discount}
                                                                min="0"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e') e.preventDefault();
                                                                    if (e.key === 'Enter') { e.preventDefault(); handleAutoAddNextRow(item.id); }
                                                                }}
                                                                onChange={(e) => updateItem(item.id, 'discount', e.target.value.replace(/-/g, ''))} />
                                                        </td>
                                                    )}
                                                    <td>
                                                        <input type="text" className="Invoice-compact-input Invoice-disabled text-right" value={formatDocCurrency(item.total || 0, selectedCurrency)} readOnly />
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="Invoice-btn-delete-row-compact" onClick={() => removeItem(item.id)}>
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

                            {/* FOOTER SECTION: OTHER CHARGES & DISPATCH DETAILS TOOLBAR */}
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
                                            const netBase = Math.max(0, (totals.subTotal - totals.discount) + totals.tax - (totals.ovDiscountAmt || 0));
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
                                                        <option value="fixed">Amount</option>
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
                                                        <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', minWidth: '70px', textAlign: 'right' }}>
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
                                        <h5 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase' }}>Dispatch &amp; Delivery Details</h5>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Driver / Delivery Person</label>
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
                                                        title="Add Delivery Person"
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

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Mobile / Phone</label>
                                                <input
                                                    type="text"
                                                    value={invoiceMeta.deliveryPersonMobile || ''}
                                                    onChange={(e) => setInvoiceMeta({ ...invoiceMeta, deliveryPersonMobile: e.target.value })}
                                                    placeholder="Enter mobile no."
                                                    style={{ width: '100%', height: '34px' }}
                                                    className="Invoice-compact-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Email</label>
                                                <input
                                                    type="text"
                                                    value={invoiceMeta.deliveryPersonEmail || ''}
                                                    onChange={(e) => setInvoiceMeta({ ...invoiceMeta, deliveryPersonEmail: e.target.value })}
                                                    placeholder="Enter email address"
                                                    style={{ width: '100%', height: '34px' }}
                                                    className="Invoice-compact-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '3px' }}>Car / Gaadi Number</label>
                                                <input
                                                    type="text"
                                                    value={carNumber}
                                                    onChange={(e) => setCarNumber(e.target.value)}
                                                    placeholder="e.g. MH-12-AB-1234"
                                                    style={{ width: '100%', height: '34px' }}
                                                    className="Invoice-compact-input"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Grid containing Bank Details, Notes & Totals side-by-side */}
                            <div className="Invoice-compact-footer-grid">
                                <div className="Invoice-compact-footer-col">
                                    <h4 className="Invoice-compact-section-header">Bank Details &amp; Attachments</h4>
                                    <div className="Invoice-compact-bank-details">
                                        <input type="text" className="Invoice-compact-input mb-1" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                                        <input type="text" className="Invoice-compact-input mb-1" placeholder="Account No" value={bankDetails.accNo} onChange={(e) => setBankDetails({ ...bankDetails, accNo: e.target.value })} />
                                        <input type="text" className="Invoice-compact-input mb-1" placeholder="Account Holder" value={bankDetails.holderName} onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })} />
                                        <input type="text" className="Invoice-compact-input" placeholder="IFSC / Swift" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
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
                                            className="Invoice-btn-upload-small-compact flex-1"
                                            onClick={() => photoInputRef.current?.click()}
                                            disabled={uploadingPhotos}
                                        >
                                            <span>📷</span> {uploadingPhotos ? 'Uploading...' : 'Photos'}
                                        </button>
                                        <button
                                            type="button"
                                            className="Invoice-btn-upload-small-compact flex-1"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingFiles}
                                        >
                                            <span>📎</span> {uploadingFiles ? 'Uploading...' : 'Files'}
                                        </button>
                                    </div>
                                    {/* Uploaded attachments list */}
                                    {(selectedPhotos.length > 0 || selectedFiles.length > 0) && (
                                        <div className="Invoice-attachments-list mt-2 flex flex-col gap-1" style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px', background: '#f8fafc' }}>
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

                                <div className="Invoice-compact-footer-col">
                                    <h4 className="Invoice-compact-section-header">Notes &amp; Conditions</h4>
                                    <div className="Invoice-notes-terms-stack">
                                        <div>
                                            <label className="Invoice-mini-label mb-0.5">Notes</label>
                                            <textarea className="Invoice-compact-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter notes..."></textarea>
                                        </div>
                                        <div>
                                            <label className="Invoice-mini-label mb-0.5">Terms &amp; Conditions</label>
                                            <textarea className="Invoice-compact-textarea" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms & conditions..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="Invoice-compact-totals-box">
                                    <div className="Invoice-compact-totals-top">
                                        <div className="Invoice-compact-t-row">
                                            <span>Sub Total:</span>
                                            <span>{formatDocCurrency(totals.subTotal, selectedCurrency)}</span>
                                        </div>
                                        {totals.lineDiscountSum > 0 && (
                                            <div className="Invoice-compact-t-row text-xs text-red-500">
                                                <span>Line Discounts:</span>
                                                <span>-{formatDocCurrency(totals.lineDiscountSum, selectedCurrency)}</span>
                                            </div>
                                        )}
                                        <div className="Invoice-compact-t-row Invoice-totals-discount-row">
                                            <div className="Invoice-totals-discount-label-row">
                                                <span>Overall Disc:</span>
                                                <div className="Invoice-compact-discount-input-group">
                                                    <input
                                                        type="number"
                                                        className="Invoice-compact-discount-number-input"
                                                        value={overallDiscount}
                                                        onChange={(e) => setOverallDiscount(e.target.value)}
                                                    />
                                                    <select
                                                        className="Invoice-compact-discount-type-select"
                                                        value={overallDiscountType}
                                                        onChange={(e) => setOverallDiscountType(e.target.value)}
                                                    >
                                                        <option value="percentage">%</option>
                                                        <option value="fixed">Amt</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <span className="text-red-500">-{formatDocCurrency(totals.ovDiscountAmt, selectedCurrency)}</span>
                                        </div>
                                        {totals.totalDiscount > 0 && (
                                            <div className="Invoice-compact-t-row text-xs font-semibold text-slate-700 bg-slate-50 py-0.5 px-1 rounded">
                                                <span>Taxable Amount:</span>
                                                <span>{formatDocCurrency(totals.discountedTaxable, selectedCurrency)}</span>
                                            </div>
                                        )}
                                        <div className="Invoice-compact-t-row">
                                            <span>{getInvoiceLabel('tax', 'VAT')}:</span>
                                            <span>{formatDocCurrency(totals.tax, selectedCurrency)}</span>
                                        </div>
                                        {showOtherCharges && otherCharges.filter(c => c.accountId && parseFloat(c.value !== undefined ? c.value : c.amount) > 0).map((charge) => {
                                            const isPct = charge.chargeType === 'percentage' || charge.type === 'percentage';
                                            const val = parseFloat(charge.value !== undefined ? charge.value : charge.amount) || 0;
                                            const netBase = totals.discountedTaxable + totals.tax;
                                            const computedAmt = isPct ? (netBase * val) / 100 : val;
                                            return (
                                                <div className="Invoice-compact-t-row" key={charge.id} style={{ color: '#1e293b' }}>
                                                    <span>Other Charges{charge.accountName ? ` (${charge.accountName}${isPct ? ` - ${val}%` : ''})` : ''}:</span>
                                                    <span>+{formatDocCurrency(computedAmt, selectedCurrency)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="Invoice-compact-t-row Invoice-compact-total font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1 text-sm">
                                        <span>Grand Total:</span>
                                        <span>{formatDocCurrency(totals.finalTotal, selectedCurrency)}</span>
                                    </div>
                                    {adjustments.reduce((sum, a) => sum + a.amount, 0) > 0 && (
                                        <>
                                            <div className="Invoice-compact-t-row text-green-600 font-semibold text-xs py-0.5">
                                                <span>Credits Adjusted:</span>
                                                <span>-{formatDocCurrency(adjustments.reduce((sum, a) => sum + a.amount, 0), selectedCurrency)}</span>
                                            </div>
                                            <div className="Invoice-compact-t-row Invoice-compact-total text-red-600 font-bold border-t border-dashed border-gray-200 pt-1 text-xs">
                                                <span>Balance Due:</span>
                                                <span>{formatDocCurrency(Math.max(0, totals.finalTotal - adjustments.reduce((sum, a) => sum + a.amount, 0)), selectedCurrency)}</span>
                                            </div>
                                        </>
                                    )}
                                    {selectedCurrency !== (companySettings?.currency || 'EUR') && (
                                        <div className="Invoice-compact-t-row text-gray-500 font-semibold text-xs border-t border-dashed border-gray-200 pt-1 text-right justify-end gap-1.5">
                                            <span>Base Total:</span>
                                            <span>{formatDocCurrency(totals.finalTotal * (parseFloat(exchangeRate) || 1.0), companySettings?.currency || 'EUR')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="Invoice-modal-footer-simple">
                            <button className="Invoice-btn-plain" onClick={() => { setShowAddModal(false); resetForm(); setEditingId(null); }}>Cancel</button>
                            <button className="Invoice-btn-primary-green" onClick={editingId ? handleUpdate : () => handleSave(false)}>
                                {editingId ? 'Update Invoice' : 'Generate Invoice'}
                            </button>
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
                            zIndex: 9999
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
                                            className="Invoice-compact-input"
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
                                            className="Invoice-compact-input"
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
                                            className="Invoice-compact-input"
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
                                            className="Invoice-compact-input"
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
                                            className="Invoice-compact-input"
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
                                            className="Invoice-compact-input"
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
                                                    setInvoiceMeta(prev => ({
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

                    {/* Selection Modal */}
                    {showSelectionModal && (
                        <div className="Invoice-modal-overlay">
                            <div className="Invoice-modal-content Invoice-selection-modal-small">
                                <div className="Invoice-modal-header-simple">
                                    <h2 className="text-xl font-bold">Select Invoice Source</h2>
                                    <button className="Invoice-close-btn-simple" onClick={() => setShowSelectionModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="Invoice-selection-grid-p">
                                    <button className="Invoice-sel-btn-p" onClick={() => { setCreationMode('direct'); setShowSelectionModal(false); setShowAddModal(true); }}>
                                        <div className="Invoice-sel-icon-p"><FileText /></div>
                                        <div className="Invoice-sel-text-p">
                                            <strong>Direct Invoice</strong>
                                            <span>Create manually without link</span>
                                        </div>
                                    </button>
                                    <button className="Invoice-sel-btn-p" onClick={() => setCreationMode('select_so')}>
                                        <div className="Invoice-sel-icon-p"><ShoppingCart /></div>
                                        <div className="Invoice-sel-text-p">
                                            <strong>From Sales Order</strong>
                                            <span>Fetch data from existing order</span>
                                        </div>
                                    </button>
                                    <button className="Invoice-sel-btn-p" onClick={() => setCreationMode('select_dc')}>
                                        <div className="Invoice-sel-icon-p"><Truck /></div>
                                        <div className="Invoice-sel-text-p">
                                            <strong>From Delivery Challan</strong>
                                            <span>Fetch data from delivery note</span>
                                        </div>
                                    </button>
                                </div>

                                {creationMode === 'select_so' && (
                                    <div className="Invoice-source-list-container">
                                        <h3 className="Invoice-section-title-s">Pick a Sales Order</h3>
                                        <div className="Invoice-source-search-box flex gap-3 mb-4">
                                            <div className="Invoice-form-group-mini" style={{ flex: 1 }}>
                                                <select
                                                    className="Invoice-full-width-input"
                                                    value={invoiceFilterCustomerId}
                                                    onChange={(e) => setInvoiceFilterCustomerId(e.target.value)}
                                                >
                                                    <option value="">Select Customer First...</option>
                                                    {customers.map(c => {
                                                        const orderCount = activeOrders.filter(o => o.customerId === c.id).length;
                                                        return (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} ({orderCount} Orders)
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="Invoice-source-search-inner" style={{ flex: 1 }}>
                                                <Search size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search Sales Order #..."
                                                    value={sourceSearchTerm}
                                                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="Invoice-source-items-list">
                                            {activeOrders.filter(order => {
                                                const matchesSearch = order.orderNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                                    order.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase());
                                                const matchesCustomer = !invoiceFilterCustomerId || order.customerId === parseInt(invoiceFilterCustomerId);
                                                return matchesSearch && matchesCustomer;
                                            }).map(order => (
                                                <div key={order.id} className="Invoice-source-item-row" onClick={() => { handleSelectOrder(order); setShowAddModal(true); setSourceSearchTerm(''); }}>
                                                    <div className="Invoice-source-info">
                                                        <span className="Invoice-source-id">{order.orderNumber}</span>
                                                        <span className="Invoice-source-cust">{order.customer?.name}</span>
                                                    </div>
                                                    <div className="Invoice-source-meta">
                                                        <span>{new Date(order.date).toLocaleDateString()}</span>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            ))}
                                            {activeOrders.filter(order =>
                                                order.orderNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                                order.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase())
                                            ).length === 0 && <div className="Invoice-no-source-found">No orders found</div>}
                                        </div>
                                        <button className="Invoice-btn-back-sel" onClick={() => { setCreationMode('direct'); setSourceSearchTerm(''); }}>Back</button>
                                    </div>
                                )}

                                {creationMode === 'select_dc' && (
                                    <div className="Invoice-source-list-container">
                                        <h3 className="Invoice-section-title-s">Pick a Delivery Challan</h3>
                                        <div className="Invoice-source-search-box flex gap-3 mb-4">
                                            <div className="Invoice-form-group-mini" style={{ flex: 1 }}>
                                                <select
                                                    className="Invoice-full-width-input"
                                                    value={invoiceFilterCustomerId}
                                                    onChange={(e) => setInvoiceFilterCustomerId(e.target.value)}
                                                >
                                                    <option value="">Select Customer First...</option>
                                                    {customers.map(c => {
                                                        const dcCount = activeChallans.filter(dc => dc.customerId === c.id).length;
                                                        return (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} ({dcCount} Challans)
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="Invoice-source-search-inner" style={{ flex: 1 }}>
                                                <Search size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search Challan #..."
                                                    value={sourceSearchTerm}
                                                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="Invoice-source-items-list">
                                            {activeChallans.filter(dc => {
                                                const matchesSearch = dc.challanNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                                    dc.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase());
                                                const matchesCustomer = !invoiceFilterCustomerId || dc.customerId === parseInt(invoiceFilterCustomerId);
                                                return matchesSearch && matchesCustomer;
                                            }).map(dc => (
                                                <div key={dc.id} className="Invoice-source-item-row" onClick={() => { handleSelectChallan(dc); setShowAddModal(true); setSourceSearchTerm(''); }}>
                                                    <div className="Invoice-source-info">
                                                        <span className="Invoice-source-id">{dc.challanNumber}</span>
                                                        <span className="Invoice-source-cust">{dc.customer?.name}</span>
                                                    </div>
                                                    <div className="Invoice-source-meta">
                                                        <span>{new Date(dc.date).toLocaleDateString()}</span>
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            ))}
                                            {activeChallans.filter(dc =>
                                                dc.challanNumber?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) ||
                                                dc.customer?.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase())
                                            ).length === 0 && <div className="Invoice-no-source-found">No challans found</div>}
                                        </div>
                                        <button className="Invoice-btn-back-sel" onClick={() => { setCreationMode('direct'); setSourceSearchTerm(''); }}>Back</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {showDeleteModal && (
                        <div className="InvDelete-modal-overlay">
                            <div className="InvDelete-modal-content">
                                <div className="InvDelete-modal-header">
                                    <h2>Delete Invoice</h2>
                                    <button className="InvDelete-close-btn" onClick={() => setShowDeleteModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="InvDelete-modal-body">
                                    <div className="InvDelete-icon-box">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <h3 className="InvDelete-title">Are you sure?</h3>
                                    <p className="InvDelete-desc">You are about to permanently delete invoice</p>
                                    <div className="InvDelete-invoice-no">#{invoiceToDelete?.invoiceNumber}</div>
                                    <p className="InvDelete-desc" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                        This action cannot be undone and will affect your ledger balances.
                                    </p>
                                </div>
                                <div className="InvDelete-modal-footer">
                                    <button className="InvDelete-btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                        Cancel
                                    </button>
                                    <button className="InvDelete-btn-confirm" onClick={confirmDelete}>
                                        Delete Permanently
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showUnpayModal && (
                        <div className="InvDelete-modal-overlay">
                            <div className="InvDelete-modal-content">
                                <div className="InvDelete-modal-header">
                                    <h2>Mark Invoice as Unpaid</h2>
                                    <button className="InvDelete-close-btn" onClick={() => setShowUnpayModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="InvDelete-modal-body">
                                    <div className="InvDelete-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                                        <RotateCcw size={32} />
                                    </div>
                                    <h3 className="InvDelete-title">Are you sure?</h3>
                                    <p className="InvDelete-desc">You are about to revert all payments for invoice</p>
                                    <div className="InvDelete-invoice-no">#{invoiceToUnpay?.invoiceNumber}</div>
                                    <p className="InvDelete-desc" style={{ fontSize: '0.85rem', marginTop: '0.5rem', padding: '0 10px', lineHeight: '1.4' }}>
                                        This will permanently delete associated payment receipts, revert ledger balances in your Chart of Accounts, and restore the customer's balance.
                                    </p>
                                </div>
                                <div className="InvDelete-modal-footer">
                                    <button className="InvDelete-btn-cancel" onClick={() => setShowUnpayModal(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="InvDelete-btn-confirm"
                                        onClick={confirmUnpay}
                                        style={{ background: '#f59e0b', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)' }}
                                    >
                                        Revert & Unpaid
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Collect Payment Modal */}
                    {showPaymentModal && selectedInvoice && (
                        <div className="POSINV-payment-overlay">
                            <div className="POSINV-payment-modal">
                                <div className="POSINV-payment-header">
                                    <h2 className="POSINV-payment-title">Collect Payment - {selectedInvoice.invoiceNumber}</h2>
                                    <button className="POSINV-payment-close" onClick={() => setShowPaymentModal(false)}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="POSINV-payment-body">
                                    <div className="POSINV-payment-info-box">
                                        <span className="POSINV-payment-info-label">Outstanding Balance:</span>
                                        <span className="POSINV-payment-info-value">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Amount to Collect</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="POSINV-payment-input"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="Enter amount"
                                        />
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Payment Mode</label>
                                        <select
                                            className="POSINV-payment-select"
                                            value={paymentMode}
                                            onChange={(e) => {
                                                setPaymentMode(e.target.value);
                                                const modeName = e.target.value === 'CASH' ? 'cash' : 'bank';
                                                const matched = accounts.find(a => a.name.toLowerCase().includes(modeName));
                                                if (matched) setSelectedAccountId(matched.id.toString());
                                            }}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="BANK">Bank Transfer</option>
                                            <option value="CARD">Card Payment</option>
                                            <option value="UPI">UPI</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Received Into (Account)</label>
                                        <select
                                            className="POSINV-payment-select"
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id.toString()}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Payment Date</label>
                                        <input
                                            type="date"
                                            className="POSINV-payment-input"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="POSINV-payment-field">
                                        <label>Notes</label>
                                        <textarea
                                            className="POSINV-payment-input"
                                            rows={2}
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            placeholder="Add any payment notes..."
                                        />
                                    </div>
                                </div>
                                <div className="POSINV-payment-footer">
                                    <button className="POSINV-payment-btn-cancel" onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}>
                                        Cancel
                                    </button>
                                    <button className="POSINV-payment-btn-submit" onClick={handleConfirmPayment} disabled={paymentSubmitting}>
                                        {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Full Add Customer Modal */}
                    {showAddCustomerModal && (
                        <div className="Customers-modal-overlay" style={{ zIndex: 20000 }}>
                            <div className="Customers-modal-content Customers-modal-large" style={{ textAlign: 'left' }}>
                                <div className="Customers-modal-header">
                                    <h2 className="Customers-modal-title">Add Customer</h2>
                                    <button className="Customers-close-btn" onClick={() => setShowAddCustomerModal(false)}>×</button>
                                </div>

                                <div className="Customers-modal-body">
                                    {/* Basic Information */}
                                    <div className="Customers-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                                        <h3 className="Customers-section-subtitle">Basic Information</h3>
                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Name (English) <span className="Customers-text-red">*</span></label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="name"
                                                    value={customerFormData.name}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter Name"
                                                    required
                                                />
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Name (Arabic)</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="nameArabic"
                                                    value={customerFormData.nameArabic}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter Name (Arabic)"
                                                />
                                            </div>
                                        </div>

                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Company Name</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="companyName"
                                                    value={customerFormData.companyName}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter company name"
                                                />
                                            </div>
                                            <div className="Customers-form-group Customers-google-loc">
                                                <label className="Customers-form-label">Company Google Location</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="companyLocation"
                                                    value={customerFormData.companyLocation}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter Google Maps link"
                                                />
                                            </div>
                                        </div>

                                        {/* File Uploads */}
                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-profile-img">
                                                <label className="Customers-form-label">Profile Image</label>
                                                {customerFormData.profileImage ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <img
                                                            src={customerFormData.profileImage}
                                                            alt="Profile"
                                                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomerFormData(prev => ({ ...prev, profileImage: '' }))}
                                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                        >
                                                            x Remove
                                                        </button>
                                                    </div>
                                                ) : null}
                                                <input
                                                    type="file"
                                                    ref={profileImageRef}
                                                    accept="image/jpeg,image/png,image/jpg"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleCustomerFileUpload(e.target.files[0], 'profileImage', 'customers')}
                                                />
                                                <div className="Customers-file-input-wrapper" onClick={() => profileImageRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Customers-file-label">
                                                        <span className="Customers-file-btn">{uploadingProfileImage ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Customers-file-name">{customerFormData.profileImage ? 'Image uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Customers-file-note">JPEG, PNG or JPG (max 5MB)</span>
                                            </div>
                                            <div className="Customers-form-group Customers-any-file">
                                                <label className="Customers-form-label">Any File</label>
                                                {customerFormData.anyFile ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                        <a
                                                            href={customerFormData.anyFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#2563eb', fontSize: '0.8rem', textDecoration: 'underline', wordBreak: 'break-all', maxWidth: '200px' }}
                                                        >
                                                            View File
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomerFormData(prev => ({ ...prev, anyFile: '' }))}
                                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                        >
                                                            x Remove
                                                        </button>
                                                    </div>
                                                ) : null}
                                                <input
                                                    type="file"
                                                    ref={anyFileRef}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleCustomerFileUpload(e.target.files[0], 'anyFile', 'customers')}
                                                />
                                                <div className="Customers-file-input-wrapper" onClick={() => anyFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Customers-file-label">
                                                        <span className="Customers-file-btn">{uploadingAnyFile ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Customers-file-name">{customerFormData.anyFile ? 'File uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Customers-file-note">Any file type. Max 10MB</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Account Information */}
                                    <div className="Customers-form-section">
                                        <h3 className="Customers-section-subtitle">Account Information</h3>
                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Customer Type <span className="Customers-text-red">*</span></label>
                                                <select
                                                    className="Customers-form-select"
                                                    name="accountType"
                                                    value={customerFormData.accountType || 'Credit'}
                                                    onChange={handleCustomerInputChange}
                                                >
                                                    <option value="Credit">Credit Customer</option>
                                                    <option value="Cash">Cash Customer</option>
                                                </select>
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Balance Type</label>
                                                <select
                                                    className="Customers-form-select"
                                                    name="balanceType"
                                                    value={customerFormData.balanceType}
                                                    onChange={handleCustomerInputChange}
                                                >
                                                    <option value="Debit">Debit</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-half-width">
                                                <div className="Customers-input-with-note">
                                                    <label className="Customers-form-label">Account Name <span className="Customers-text-red">*</span></label>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        value={customerFormData.name}
                                                        readOnly
                                                        disabled
                                                        style={{ backgroundColor: '#f3f4f6' }}
                                                    />
                                                    <span className="Customers-input-note">This will auto-fill from selection above</span>
                                                </div>
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Account Balance <span className="Customers-text-red">*</span></label>
                                                <input
                                                    type="number"
                                                    className="Customers-form-input"
                                                    name="accountBalance"
                                                    value={customerFormData.accountBalance}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="0.00"
                                                    min="0"
                                                    onKeyDown={(e) => {
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Creation Date <span className="Customers-text-red">*</span></label>
                                                <input
                                                    type="date"
                                                    className="Customers-form-input"
                                                    name="creationDate"
                                                    value={customerFormData.creationDate}
                                                    onChange={handleCustomerInputChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Details */}
                                    <div className="Customers-form-section">
                                        <h3 className="Customers-section-subtitle">Bank Details</h3>
                                        <div className="Customers-form-row Customers-three-col">
                                            <div className="Customers-form-group">
                                                <label className="Customers-form-label">Bank Account Number</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="bankAccountNumber"
                                                    value={customerFormData.bankAccountNumber}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter bank account number"
                                                />
                                            </div>
                                            <div className="Customers-form-group">
                                                <label className="Customers-form-label">Bank IFSC</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="bankIFSC"
                                                    value={customerFormData.bankIFSC}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter bank IFSC"
                                                />
                                            </div>
                                            <div className="Customers-form-group">
                                                <label className="Customers-form-label">Bank Name & Branch</label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="bankNameBranch"
                                                    value={customerFormData.bankNameBranch}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter bank name & branch"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & GST */}
                                    <div className="Customers-form-section">
                                        <h3 className="Customers-section-subtitle">Contact & Status</h3>
                                        <div className="Customers-form-row Customers-mixed-col">
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Phone <span className="Customers-text-red">*</span></label>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="phone"
                                                    value={customerFormData.phone}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter Phone"
                                                    required
                                                />
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Email <span className="Customers-text-red">*</span></label>
                                                <input
                                                    type="email"
                                                    className="Customers-form-input"
                                                    name="email"
                                                    value={customerFormData.email}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter Email"
                                                    required
                                                />
                                            </div>
                                            <div className="Customers-form-group Customers-half-width">
                                                <label className="Customers-form-label">Credit Period (days)</label>
                                                <input
                                                    type="number"
                                                    className="Customers-form-input"
                                                    name="creditPeriod"
                                                    value={customerFormData.creditPeriod}
                                                    onChange={handleCustomerInputChange}
                                                    placeholder="Enter credit period"
                                                />
                                            </div>
                                        </div>

                                        <div className="Customers-form-row" style={{ alignItems: 'center' }}>
                                            <label className="Customers-switch" style={{ marginRight: '10px' }}>
                                                <input
                                                    type="checkbox"
                                                    name="gstEnabled"
                                                    checked={customerFormData.gstEnabled}
                                                    onChange={handleCustomerInputChange}
                                                />
                                                <span className="Customers-slider Customers-round"></span>
                                            </label>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable GST</span>

                                            {customerFormData.gstEnabled && (
                                                <div className="Customers-form-group" style={{ marginLeft: '2rem', flex: 1 }}>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        name="gstNumber"
                                                        value={customerFormData.gstNumber}
                                                        onChange={handleCustomerInputChange}
                                                        placeholder="Enter GSTIN"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Addresses */}
                                    <div className="Customers-form-section">
                                        <div className="Customers-form-row">
                                            {/* Billing Address */}
                                            <div style={{ flex: 1 }}>
                                                <h3 className="Customers-section-subtitle">Billing Address</h3>
                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Name</label>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        name="billingName"
                                                        value={customerFormData.billingName}
                                                        onChange={handleCustomerInputChange}
                                                        placeholder="Enter Name"
                                                    />
                                                </div>
                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Phone</label>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        name="billingPhone"
                                                        value={customerFormData.billingPhone}
                                                        onChange={handleCustomerInputChange}
                                                        placeholder="Enter Phone"
                                                    />
                                                </div>
                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Address</label>
                                                    <textarea
                                                        className="Customers-form-textarea"
                                                        name="billingAddress"
                                                        value={customerFormData.billingAddress}
                                                        onChange={handleCustomerInputChange}
                                                        placeholder="Enter Address"
                                                        rows="3"
                                                    />
                                                </div>
                                                <div className="Customers-form-row">
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            name="billingCity"
                                                            value={customerFormData.billingCity}
                                                            onChange={handleCustomerInputChange}
                                                            placeholder="City"
                                                        />
                                                    </div>
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            name="billingState"
                                                            value={customerFormData.billingState}
                                                            onChange={handleCustomerInputChange}
                                                            placeholder="State"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="Customers-form-row">
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            name="billingCountry"
                                                            value={customerFormData.billingCountry}
                                                            onChange={handleCustomerInputChange}
                                                            placeholder="Country"
                                                        />
                                                    </div>
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            name="billingZipCode"
                                                            value={customerFormData.billingZipCode}
                                                            onChange={handleCustomerInputChange}
                                                            placeholder="Zip Code"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shipping Address */}
                                            <div style={{ flex: 1, paddingLeft: '2rem', borderLeft: '1px solid #edf2f7' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <h3 className="Customers-section-subtitle">Shipping Addresses</h3>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                name="shippingSameAsBilling"
                                                                checked={customerFormData.shippingSameAsBilling}
                                                                onChange={handleCustomerInputChange}
                                                                style={{ marginRight: '5px' }}
                                                            />
                                                            Apply Billing to First Shipping
                                                        </label>
                                                        <button
                                                            type="button"
                                                            className="Customers-voucher-badge text-blue-600 border border-blue-600 bg-white hover:bg-blue-50"
                                                            onClick={addCustomerShippingAddress}
                                                            style={{ padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                                                        >
                                                            + Add More
                                                        </button>
                                                    </div>
                                                </div>

                                                {customerFormData.shippingSameAsBilling && (
                                                    <div style={{ marginBottom: '1.5rem', padding: '15px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0369a1' }}>First Shipping Address (Same as Billing)</h4>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
                                                            <strong>Address:</strong> {customerFormData.billingAddress || 'N/A'}<br />
                                                            {customerFormData.billingCity && `${customerFormData.billingCity}, `}{customerFormData.billingState && `${customerFormData.billingState}, `}{customerFormData.billingZipCode}
                                                        </p>
                                                    </div>
                                                )}

                                                {customerFormData.shippingAddresses.length === 0 && !customerFormData.shippingSameAsBilling && (
                                                    <div className="Customers-form-group" style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>
                                                            No shipping addresses added.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={addCustomerShippingAddress}
                                                            className="Customers-voucher-badge text-blue-600"
                                                        >
                                                            Click here to add one
                                                        </button>
                                                    </div>
                                                )}

                                                {customerFormData.shippingAddresses.map((addr, index) => (
                                                    <div key={index} style={{ marginBottom: '1.5rem', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', position: 'relative' }}>
                                                        {customerFormData.shippingAddresses.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCustomerShippingAddress(index)}
                                                                style={{ position: 'absolute', top: '10px', right: '10px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>Shipping Address #{index + 1}</h4>

                                                        <div className="Customers-form-group">
                                                            <label className="Customers-form-label">Name</label>
                                                            <input
                                                                type="text"
                                                                className="Customers-form-input"
                                                                value={addr.name}
                                                                onChange={(e) => handleCustomerShippingAddressChange(index, 'name', e.target.value)}
                                                                placeholder="Enter Name"
                                                            />
                                                        </div>
                                                        <div className="Customers-form-group">
                                                            <label className="Customers-form-label">Phone</label>
                                                            <input
                                                                type="text"
                                                                className="Customers-form-input"
                                                                value={addr.phone}
                                                                onChange={(e) => handleCustomerShippingAddressChange(index, 'phone', e.target.value)}
                                                                placeholder="Enter Phone"
                                                            />
                                                        </div>
                                                        <div className="Customers-form-group">
                                                            <label className="Customers-form-label">Address</label>
                                                            <textarea
                                                                className="Customers-form-textarea"
                                                                value={addr.address}
                                                                onChange={(e) => handleCustomerShippingAddressChange(index, 'address', e.target.value)}
                                                                placeholder="Enter Address"
                                                                rows="2"
                                                            />
                                                        </div>
                                                        <div className="Customers-form-row">
                                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    className="Customers-form-input"
                                                                    value={addr.city}
                                                                    onChange={(e) => handleCustomerShippingAddressChange(index, 'city', e.target.value)}
                                                                    placeholder="City"
                                                                />
                                                            </div>
                                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    className="Customers-form-input"
                                                                    value={addr.state}
                                                                    onChange={(e) => handleCustomerShippingAddressChange(index, 'state', e.target.value)}
                                                                    placeholder="State"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="Customers-form-row">
                                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    className="Customers-form-input"
                                                                    value={addr.country}
                                                                    onChange={(e) => handleCustomerShippingAddressChange(index, 'country', e.target.value)}
                                                                    placeholder="Country"
                                                                />
                                                            </div>
                                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    className="Customers-form-input"
                                                                    value={addr.zipCode}
                                                                    onChange={(e) => handleCustomerShippingAddressChange(index, 'zipCode', e.target.value)}
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

                                <div className="Customers-modal-footer">
                                    <button type="button" className="Customers-btn-cancel" onClick={() => setShowAddCustomerModal(false)}>Cancel</button>
                                    <button type="button" className="Customers-btn-save" onClick={handleCustomerSubmit} disabled={customerSubmitting}>
                                        {customerSubmitting ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
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
                                                    <span className="Zirak-Inventory-file-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                        {productFormData.image ? (
                                                            <>
                                                                <img
                                                                    src={productFormData.image}
                                                                    alt="Preview"
                                                                    style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                />
                                                                <a href={productFormData.image} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
                                                                    View Image
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setProductFormData(prev => ({ ...prev, image: '' }))}
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
                                                                    title="Remove Image"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
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
                                                                    {allWarehouses.map(wh => (
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
                    {renderSubModals()}
            {/* Universal Excel Import Modal */}
            <ExcelImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="salesInvoices"
                onSuccess={() => {
                    fetchData();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default Invoice;