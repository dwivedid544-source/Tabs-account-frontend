import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Download, Send, Printer,
    FileSearch, Eye, AlertTriangle, ArrowLeft, User, MapPin, Mail, Phone
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './SalesOrder.css';
import '../Invoice/Invoice.css';
import salesOrderService from '../../../../api/salesOrderService';
import salesQuotationService from '../../../../api/salesQuotationService';
import customerService from '../../../../api/customerService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import servicesService from '../../../../api/servicesService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import uomService from '../../../../services/uomService';
import '../../Customers/Customers.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import customerServiceFromServices from '../../../../services/customerService';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { Upload, Loader2 } from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';

const SalesOrder = () => {
    // --- State Management ---
    const { formatCurrency, getTableHeader, getInvoiceLabel, companySettings, getDocumentTitle } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
    const [salesOrders, setSalesOrders] = useState([]);
    const [activeQuotations, setActiveQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allWarehouses, setAllWarehouses] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);

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
    const [allUoms, setAllUoms] = useState([]);

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [creationMode, setCreationMode] = useState('direct'); // 'direct' or 'linked'
    const [showQuotationSelect, setShowQuotationSelect] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
    const [quotationFilterCustomerId, setQuotationFilterCustomerId] = useState('');

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: 'Tab Accounts', address: '', email: 'info@tabaccounts.com', phone: '', notes: '', terms: ''
    });
    const [orderMeta, setOrderMeta] = useState({
        manualNo: '', date: new Date().toISOString().split('T')[0], deliveryDate: ''
    });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRefToRetry, setDuplicateRefToRetry] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerDetails, setCustomerDetails] = useState({
        billingName: '', billingAddress: '', billingCity: '', billingState: '', billingZipCode: '', billingCountry: '',
        email: '', phone: '',
        shippingName: '', shippingAddress: '', shippingCity: '', shippingState: '', shippingZipCode: '', shippingCountry: ''
    });
    const [items, setItems] = useState([
        { id: Date.now(), productId: '', serviceId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
    ]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('percentage');
    const [customerShippingAddresses, setCustomerShippingAddresses] = useState([]);
    const [bankDetails, setBankDetails] = useState({
        bankName: '', accNo: '', holderName: '', ifsc: ''
    });
    const [customFieldValues, setCustomFieldValues] = useState({});
    const [manualStatus, setManualStatus] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState('PENDING');
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

    const location = useLocation();
    const navigate = useNavigate();

    // Fetch Initial Data
    useEffect(() => {
        fetchData();
        fetchDropdowns();
        fetchCompanyDetails();
    }, []);

    const fetchCompanyDetails = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getById(companyId);
                const data = res.data;
                setCompanyDetails({
                    name: data.name || 'Tab Accounts',
                    address: data.address || '',
                    email: data.email || 'info@tabaccounts.com',
                    phone: data.phone || '',
                    logo: data.logo || null,
                    notes: data.notes || '',
                    terms: data.terms || '',
                    termsSalesOrder: data.termsSalesOrder || ''
                });
                setBankDetails({
                    bankName: data.bankName || 'HDFC Bank',
                    accNo: data.accountNumber || '50200012345678',
                    holderName: data.accountHolder || 'ABC Accounting Solutions Pvt. Ltd.',
                    ifsc: data.ifsc || 'HDFC0000456'
                });
                setNotes(data.notes || '');
                setTerms(data.termsSalesOrder || data.terms || '');
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await salesOrderService.getAll(companyId);
            if (response.data.success) {
                setSalesOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sales orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();
            const [custRes, prodRes, whRes, servRes, quoRes, uomRes] = await Promise.all([
                customerService.getAll(companyId),
                productService.getAll(companyId),
                warehouseService.getAll(companyId),
                servicesService.getAll(companyId),
                salesQuotationService.getAll(companyId),
                uomService.getUOMs(companyId)
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data);
            if (prodRes.data.success) setAllProducts(prodRes.data.data);
            if (whRes.data.success) setAllWarehouses(whRes.data.data);
            if (servRes.data.success) setAllServices(servRes.data.data);
            if (quoRes.data.success) {
                // Only show quotations that are ACTIVE or SENT (not yet Order/Invoice)
                setActiveQuotations(quoRes.data.data.filter(q => q.status !== 'ACCEPTED'));
            }
            if (uomRes.data) setAllUoms(uomRes.data);
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
                        phone: c.phone || ''
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

    const salesProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart, status: 'active' },
        { id: 'delivery', label: 'Delivery', icon: Truck, status: 'pending' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, status: 'pending' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    const sampleQuotations = [
        {
            id: 'QUO-2024-001', customer: 'Acme Corp', date: '2024-01-10', items: [
                { id: 101, name: 'Web Dev Package', warehouse: 'Main', qty: 1, rate: 3000, tax: 18, discount: 0, total: 3540 },
                { id: 102, name: 'SEO Setup', warehouse: 'Service', qty: 1, rate: 1000, tax: 18, discount: 0, total: 1180 }
            ]
        }
    ];

    // --- Actions ---
    const resetForm = () => {
        setEditingId(null);
        setIsViewMode(false);
        setSelectedQuotation(null);
        setCustomerId('');
        setCustomerDetails({
            billingName: '', billingAddress: '', billingCity: '', billingState: '', billingZipCode: '', billingCountry: '',
            email: '', phone: '',
            shippingName: '', shippingAddress: '', shippingCity: '', shippingState: '', shippingZipCode: '', shippingCountry: ''
        });
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
        setItems([{ id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
        setOrderMeta({ manualNo: '', date: new Date().toISOString().split('T')[0], deliveryDate: '' });
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsSalesOrder || companyDetails.terms || '');
        setCreationMode('direct');
        setQuotationSearchTerm('');
        setQuotationFilterCustomerId('');
        setOverallDiscount(0);
        setOverallDiscountType('percentage');
        setManualStatus(false);
        setOverrideStatus('PENDING');
        setOrderNumber('');
        setCustomerShippingAddresses([]);
        setCustomFieldValues({});
        setShowAddModal(false);
    };

    const handleAddNew = async () => {
        resetForm();
        setIsViewMode(false);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'salesorder');
                if (res.data.success) {
                    setOrderNumber(res.data.nextNumber);
                    const nextRef = res.data.nextManualReference || res.data.details?.nextManualReference || '';
                    if (nextRef) {
                        setOrderMeta(prev => ({ ...prev, manualNo: nextRef }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching next order number:', error);
        }
        setShowAddModal(true);
    };

    const handleEdit = async (id) => {
        await populateOrder(id, false);
    };

    const handleView = async (id) => {
        await populateOrder(id, true);
    };

    const populateOrder = async (id, viewOnly) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesOrderService.getById(id, companyId);
            if (response.data.success) {
                const orderToEdit = response.data.data;
                resetForm();
                setEditingId(id);
                setIsViewMode(viewOnly);
                setCustomerId(orderToEdit.customerId);
                setCustomerDetails({
                    billingName: orderToEdit.billingName || '',
                    billingAddress: orderToEdit.billingAddress || '',
                    billingCity: orderToEdit.billingCity || '',
                    billingState: orderToEdit.billingState || '',
                    billingZipCode: orderToEdit.billingZipCode || '',
                    billingCountry: orderToEdit.billingCountry || '',
                    email: orderToEdit.customer?.email || '',
                    phone: orderToEdit.customer?.phone || '',
                    shippingName: orderToEdit.shippingName || '',
                    shippingAddress: orderToEdit.shippingAddress || '',
                    shippingCity: orderToEdit.shippingCity || '',
                    shippingState: orderToEdit.shippingState || '',
                    shippingZipCode: orderToEdit.shippingZipCode || '',
                    shippingCountry: orderToEdit.shippingCountry || ''
                });
                setCustomerShippingAddresses(orderToEdit.customer?.shippingaddress || []);
                setOrderMeta({
                    manualNo: orderToEdit.manualReference || '',
                    date: orderToEdit.date.split('T')[0],
                    deliveryDate: orderToEdit.expectedDate ? orderToEdit.expectedDate.split('T')[0] : ''
                });
                setManualStatus(orderToEdit.manualStatus || false);
                setOverrideStatus(orderToEdit.status || 'PENDING');
                setOrderNumber(orderToEdit.orderNumber || '');
                setItems((orderToEdit.salesorderitem || orderToEdit.items || []).map(item => ({
                    id: item.id,
                    productId: item.productId || '',
                    serviceId: item.serviceId || '',
                    warehouseId: item.warehouseId || '',
                    description: item.description,
                    qty: item.quantity,
                    uomId: item.uomId || '',
                    rate: item.rate,
                    tax: item.taxRate,
                    discount: item.discount || 0,
                    total: item.amount
                })));
                setCreationMode(orderToEdit.quotationId ? 'linked' : 'direct');
                setOverallDiscount(orderToEdit.overallDiscount || 0);
                setOverallDiscountType(orderToEdit.overallDiscountType || 'percentage');
                setNotes(orderToEdit.notes || '');
                setTerms(orderToEdit.terms || '');
                let fieldValues = {};
                if (orderToEdit.customFields) {
                    try {
                        fieldValues = typeof orderToEdit.customFields === 'string'
                            ? JSON.parse(orderToEdit.customFields)
                            : orderToEdit.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }
                setCustomFieldValues(fieldValues);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error loading order:', error);
        }
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            const response = await salesOrderService.delete(deleteId, companyId);
            if (response.data.success) {
                fetchData();
                setShowDeleteConfirm(false);
                setDeleteId(null);
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const handleConvert = async (id) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesOrderService.convert(id, companyId);
            if (response.data.success) {
                toast.success('Converted to Delivery Challan successfully');
                fetchData();
                setShowAddModal(false);
                navigate('/company/sales/challan', { state: { targetChallanId: response.data.data.id } });
            } else {
                toast.error(response.data.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting order:', error);
            toast.error(error.response?.data?.message || 'Error converting order');
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const response = await salesOrderService.update(orderId, payload, companyId);
            if (response.data?.success || response.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    // --- Filter Logic ---
    const filteredOrders = React.useMemo(() => {
        return salesOrders.filter(o => {
            const query = searchTerm.toLowerCase();
            const matchesSearch = !query ||
                o.orderNumber?.toLowerCase().includes(query) ||
                o.customer?.name?.toLowerCase().includes(query);

            const oDate = new Date(o.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || oDate >= start) && (!end || oDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [salesOrders, searchTerm, startDate, endDate]);

    const filteredQuotationList = React.useMemo(() => {
        return activeQuotations.filter(q => {
            const query = quotationSearchTerm.toLowerCase();
            const matchesSearch = !query ||
                q.quotationNumber?.toLowerCase().includes(query) ||
                q.customer?.name?.toLowerCase().includes(query);

            const matchesCustomer = !quotationFilterCustomerId || q.customerId === parseInt(quotationFilterCustomerId);

            return matchesSearch && matchesCustomer;
        });
    }, [activeQuotations, quotationSearchTerm, quotationFilterCustomerId]);

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

    const handleSave = async (allowDuplicate = false, overrideManualRef = null) => {
        try {
            const companyId = GetCompanyId();
            const data = {
                orderNumber: editingId ? (salesOrders.find(o => o.id === editingId)?.orderNumber) : (orderNumber || `SO-${Date.now()}`),
                manualReference: overrideManualRef !== null ? overrideManualRef : (orderMeta.manualNo || ''),
                date: orderMeta.date,
                expectedDate: orderMeta.deliveryDate,
                customerId: parseInt(customerId),
                companyId: companyId,
                quotationId: selectedQuotation ? parseInt(selectedQuotation.id) : null,
                customFields: JSON.stringify(customFieldValues),
                manualStatus,
                status: manualStatus ? overrideStatus : undefined,
                overallDiscount: overallDiscount,
                overallDiscountType: overallDiscountType,
                notes: notes,
                terms: terms,
                billingName: customerDetails.billingName,
                billingAddress: customerDetails.billingAddress,
                billingCity: customerDetails.billingCity,
                billingState: customerDetails.billingState,
                billingZipCode: customerDetails.billingZipCode,
                billingCountry: customerDetails.billingCountry,
                shippingName: customerDetails.shippingName,
                shippingAddress: customerDetails.shippingAddress,
                shippingCity: customerDetails.shippingCity,
                shippingState: customerDetails.shippingState,
                shippingZipCode: customerDetails.shippingZipCode,
                shippingCountry: customerDetails.shippingCountry,
                items: items.map(item => ({
                    productId: item.productId ? parseInt(item.productId) : null,
                    serviceId: item.serviceId ? parseInt(item.serviceId) : null,
                    warehouseId: item.warehouseId ? parseInt(item.warehouseId) : null,
                    description: item.description || (item.productId ? allProducts.find(p => p.id === parseInt(item.productId))?.name : ''),
                    quantity: parseFloat(item.qty),
                    rate: parseFloat(item.rate),
                    discount: parseFloat(item.discount) || 0,
                    taxRate: parseFloat(item.tax),
                    uomId: item.uomId ? parseInt(item.uomId) : null
                })),
                allowDuplicateManualNo: allowDuplicate === true
            };

            let response;
            try {
                if (editingId) {
                    response = await salesOrderService.update(editingId, data, companyId);
                } else {
                    response = await salesOrderService.create(data);
                }

                if (response.data.success) {
                    toast.success(editingId ? 'Sales Order updated successfully' : 'Sales Order created successfully');
                    fetchData();
                    setShowAddModal(false);
                }
            } catch (err) {
                if (err.response?.data?.isDuplicateWarning || err.response?.data?.isDuplicate) {
                    const currentRef = overrideManualRef !== null ? overrideManualRef : (orderMeta.manualNo || '');
                    setDuplicateRefToRetry(currentRef);
                    setShowDuplicateModal(true);
                } else {
                    toast.error(err.response?.data?.message || 'Error saving sales order');
                    console.error('Error saving sales order:', err);
                }
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
        }
    };


    const handleCreationModeToggle = (mode) => {
        setCreationMode(mode);
        if (mode === 'linked') {
            setShowQuotationSelect(true);
        } else {
            // Reset items but keep customer info if already filled manually? 
            // Ideally reset to clean slate for direct
            if (!editingId) resetForm();
            setCreationMode('direct');
        }
    };

    const handleSelectQuotation = (quo) => {
        setSelectedQuotation(quo);
        setCustomerId(quo.customerId);
        setCustomerDetails({
            billingName: quo.billingName || quo.customer?.billingName || quo.customer?.name || '',
            billingAddress: quo.billingAddress || quo.customer?.billingAddress || '',
            billingCity: quo.billingCity || quo.customer?.billingCity || '',
            billingState: quo.billingState || quo.customer?.billingState || '',
            billingZipCode: quo.billingZipCode || quo.customer?.billingZipCode || '',
            billingCountry: quo.billingCountry || quo.customer?.billingCountry || '',
            email: quo.customer?.email || '',
            phone: quo.customer?.phone || '',
            shippingName: quo.shippingName || quo.customer?.shippingName || '',
            shippingAddress: quo.shippingAddress || quo.customer?.shippingAddress || '',
            shippingCity: quo.shippingCity || quo.customer?.shippingCity || '',
            shippingState: quo.shippingState || quo.customer?.shippingState || '',
            shippingZipCode: quo.shippingZipCode || quo.customer?.shippingZipCode || '',
            shippingCountry: quo.shippingCountry || quo.customer?.shippingCountry || ''
        });
        setCustomerShippingAddresses(quo.customer?.shippingaddress || []);
        setOverallDiscount(quo.overallDiscount || 0);
        setOverallDiscountType(quo.overallDiscountType || 'percentage');
        const sourceItems = quo.salesquotationitem || quo.items || [];
        setItems(sourceItems.map(item => ({
            id: Date.now() + Math.random(),
            productId: item.productId || '',
            serviceId: item.serviceId || '',
            warehouseId: item.warehouseId || '',
            description: item.description,
            qty: item.quantity,
            uomId: item.uomId || '',
            rate: item.rate,
            tax: item.taxRate,
            total: item.amount
        })));
        setShowQuotationSelect(false);
    };

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
        setItems([...items, { id: Date.now(), productId: '', serviceId: '', description: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0 }]);
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
                } else {
                    updatedItem = { ...item, [field]: value };
                }

                const qty = parseFloat(updatedItem.qty) || 0;
                const rate = parseFloat(updatedItem.rate) || 0;
                const tax = parseFloat(updatedItem.tax) || 0;
                const discount = parseFloat(updatedItem.discount) || 0;

                const subtotal = qty * rate;
                const discountAmount = discount;
                const taxable = subtotal - discountAmount;
                const taxAmount = (taxable * tax) / 100;

                updatedItem.total = taxable + taxAmount;
                return updatedItem;
            }
            return item;
        }));
    };

    const handleTopItemSelect = (val) => {
        if (!val) return;
        let selectedProduct = null;
        let selectedService = null;
        if (val.startsWith('p-')) {
            const pId = val.split('-')[1];
            selectedProduct = allProducts.find(x => String(x.id) === String(pId));
        } else if (val.startsWith('s-')) {
            const sId = val.split('-')[1];
            selectedService = allServices.find(x => String(x.id) === String(sId));
        }
        if (!selectedProduct && !selectedService) return;

        const newItem = {
            id: Date.now(),
            productId: selectedProduct ? selectedProduct.id : '',
            serviceId: selectedService ? selectedService.id : '',
            warehouseId: selectedProduct ? (allWarehouses[0]?.id || '') : '',
            qty: 1,
            uomId: selectedProduct ? (selectedProduct.salesUomId || selectedProduct.uomId || '') : '',
            rate: selectedProduct ? (selectedProduct.salePrice || 0) : (selectedService?.price || 0),
            tax: selectedProduct ? (selectedProduct.taxRate || 0) : (selectedService?.taxRate || 0),
            discount: 0,
            description: selectedProduct ? selectedProduct.name : selectedService?.name || '',
            total: selectedProduct ? (selectedProduct.salePrice || 0) : (selectedService?.price || 0)
        };

        setItems(prev => {
            if (prev.length === 1 && !prev[0].productId && !prev[0].serviceId) {
                return [newItem];
            }
            return [...prev, newItem];
        });
    };

    const handleAutoAddNextRow = (itemId) => {
        setItems(prevItems => {
            const index = prevItems.findIndex(i => i.id === itemId);
            if (index === prevItems.length - 1) {
                return [
                    ...prevItems,
                    { id: Date.now(), productId: '', serviceId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
                ];
            }
            return prevItems;
        });
    };
    const calculateTotals = () => {
        const totals = items.reduce((acc, item) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const discount = parseFloat(item.discount) || 0;
            const subtotal = qty * rate;

            acc.subTotal += subtotal;
            acc.discount += discount;
            acc.total += item.total;
            acc.tax += (item.total - (subtotal - discount));
            return acc;
        }, { subTotal: 0, tax: 0, discount: 0, total: 0 });

        const baseTotal = (totals.subTotal - totals.discount) + totals.tax;
        let finalTotal = baseTotal;
        let ovDiscountAmt = 0;

        if (overallDiscount && overallDiscountType === 'percentage') {
            ovDiscountAmt = (baseTotal * overallDiscount / 100);
            finalTotal = baseTotal - ovDiscountAmt;
        } else if (overallDiscount) {
            ovDiscountAmt = parseFloat(overallDiscount);
            finalTotal = baseTotal - ovDiscountAmt;
        }

        return { ...totals, ovDiscountAmt, finalTotal };
    };

    const totalsData = calculateTotals();
    const printRef = useRef();
    const modalBodyRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `SalesOrder_${orderMeta.manualNo || 'New'}`,
    });

    // Scroll modal to top whenever it opens
    useEffect(() => {
        if (showAddModal && modalBodyRef.current) {
            modalBodyRef.current.scrollTop = 0;
        }
    }, [showAddModal]);

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (location.state && location.state.targetOrderId) {
            if (location.state.isEdit || location.state.autoEdit) {
                handleEdit(location.state.targetOrderId);
            } else {
                handleView(location.state.targetOrderId);
            }
            // Clear location state after handling to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, fetchData, navigate]);

    return (
        <div className="SalesOrder-wrapper SalesOrder-quotation-page">
            {!showAddModal && !isViewMode && (
                <>
                    <div className="SalesOrder-page-header">
                        <div>
                            <h1 className="SalesOrder-page-title">Sales Order</h1>
                            <p className="SalesOrder-page-subtitle">Track and confirm customer orders</p>
                        </div>
                        {hasPermission('create sales order') && (
                            <button className="SalesOrder-btn-add" onClick={handleAddNew}>
                                <Plus size={18} className="SalesOrder-mr-2" /> New Sales Order
                            </button>
                        )}
                    </div>

                    <div className="SalesOrder-process-tracker-card">
                        <div className="SalesOrder-tracker-wrapper">
                            {salesProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`SalesOrder-tracker-step SalesOrder-${step.status}`}>
                                        <div className="SalesOrder-step-icon-wrapper">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="SalesOrder-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="SalesOrder-status-badge" size={14} />}
                                        </div>
                                        <span className="SalesOrder-step-label">{step.label}</span>
                                    </div>
                                    {index < salesProcess.length - 1 && (
                                        <div className={`SalesOrder-tracker-divider ${salesProcess[index + 1].status !== 'pending' ? 'SalesOrder-active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div >

                    <div className="SalesOrder-table-card mt-6">
                        <div className="SalesOrder-table-controls p-4 border-b flex justify-between items-center gap-4 flex-wrap">
                            <div className="SalesOrder-search-wrapper">
                                <Search className="SalesOrder-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by Order ID or Customer..."
                                    className="SalesOrder-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="SalesOrder-date-filters flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input
                                        type="date"
                                        className="SalesOrder-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input
                                        type="date"
                                        className="SalesOrder-date-input"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                {(searchTerm || startDate || endDate) && (
                                    <button
                                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                                        onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="SalesOrder-table-container">
                            <table className="SalesOrder-quotation-table">
                                <thead>
                                    <tr>
                                        <th>ORDER ID</th>
                                        <th>CUSTOMER</th>
                                        <th>DATE</th>
                                        <th>DELIVERY DATE</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th className="text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map(order => {
                                        const isConverted = order.status === 'CONVERTED' || (Array.isArray(order.deliverychallan) ? order.deliverychallan.length > 0 : !!order.deliverychallan) || (Array.isArray(order.invoice) ? order.invoice.length > 0 : !!order.invoice) || (Array.isArray(order.salesinvoice) ? order.salesinvoice.length > 0 : !!order.salesinvoice);
                                        return (
                                            <tr key={order.id}>
                                                <td className="SalesOrder-font-bold SalesOrder-text-blue-600">{order.orderNumber}</td>
                                                <td>{order.customer?.name}</td>
                                                <td>{new Date(order.date).toLocaleDateString()}</td>
                                                <td>{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="SalesOrder-font-bold">{formatCurrency(order.totalAmount)}</td>
                                                <td>
                                                    <select
                                                        value={order.manualStatus ? order.status : 'AUTO'}
                                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                        className="SalesOrder-sales-order-status-pill"
                                                        style={getStatusStyle(order.manualStatus ? order.status : 'AUTO')}
                                                    >
                                                        <option value="AUTO">Auto ({order.status || 'Pending'})</option>
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="PARTIAL">PARTIAL</option>
                                                        <option value="COMPLETED">COMPLETED</option>
                                                        <option value="CANCELLED">CANCELLED</option>
                                                        <option value="CONVERTED">CONVERTED</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <div className="SalesOrder-sales-action-buttons">
                                                        <button className="SalesOrder-sales-order-action-btn SalesOrder-view" onClick={() => handleView(order.id)} title="View"><Eye size={16} /></button>
                                                        {!isConverted ? (
                                                            <button className="SalesOrder-sales-order-action-btn SalesOrder-convert" onClick={() => handleConvert(order.id)} title="Convert to Delivery Challan" style={{ backgroundColor: '#4f46e5', color: 'white' }}><Truck size={16} /></button>
                                                        ) : (
                                                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1" title="Converted to Delivery Challan">
                                                                <CheckCircle2 size={12} /> Converted
                                                            </span>
                                                        )}
                                                        {hasPermission('edit sales order') && (
                                                            <button className="SalesOrder-sales-order-action-btn SalesOrder-edit" onClick={() => handleEdit(order.id)} title="Edit"><Pencil size={16} /></button>
                                                        )}
                                                        {hasPermission('delete sales order') && (
                                                            <button className="SalesOrder-sales-order-action-btn SalesOrder-delete" onClick={() => handleDelete(order.id)} title="Delete"><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Premium Create Full Page View */}
            {(showAddModal || isViewMode) && (
                <div className="SalesOrder-sales-order-full-page-create">
                    <div className="SalesOrder-view-page-header SalesOrder-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" className="SalesOrder-modal-logo-img" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {isViewMode ? 'View Sales Order' : editingId ? 'Edit Sales Order' : 'New Sales Order'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button className="SalesOrder-btn-back" onClick={handlePrint} style={{ backgroundColor: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}>
                                    <Printer size={16} /> Print Order
                                </button>
                            )}
                            <button className="SalesOrder-btn-back" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Sales Orders
                            </button>
                        </div>
                    </div>

                    <div className="SalesOrder-modal-content SalesOrder-quotation-form-modal">
                            <div className="SalesOrder-modal-body-scrollable" ref={(el) => { printRef.current = el; modalBodyRef.current = el; }}>
                                {isViewMode ? (
                                    <div className="SalesOrder-view-document">
                                        <div
                                            className={`invoice-preview-container template-${(companySettings?.invoiceTemplate || 'New York').toLowerCase().replace(' ', '').replace('invoice-', '')}`}
                                            style={{
                                                '--header-bg': companySettings?.invoiceColor || '#004aad',
                                                '--header-text': (() => {
                                                    const hex = (companySettings?.invoiceColor || '#004aad').replace('#', '');
                                                    const r = parseInt(hex.substr(0, 2), 16);
                                                    const g = parseInt(hex.substr(2, 2), 16);
                                                    const b = parseInt(hex.substr(4, 2), 16);
                                                    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                                                    return (yiq >= 150) ? '#1e293b' : '#ffffff';
                                                })()
                                            }}
                                        >
                                            {getInvoiceLabel('showHeader') !== false && (
                                                <div className="invoice-header-wrapper" style={{ border: 'none', padding: '0', margin: '0' }}>
                                                    <div className="invoice-preview-header" style={{ marginBottom: '10px' }}>
                                                        <div className="invoice-header-left">
                                                            {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                                                <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" className="invoice-logo-large" style={{ margin: '0' }} />
                                                            )}
                                                        </div>
                                                        <div className="invoice-header-right">
                                                            <div className="invoice-title-large" style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0' }}>{getDocumentTitle('salesorder')}</div>
                                                        </div>
                                                    </div>

                                                    <div className="invoice-preview-header" style={{ alignItems: 'flex-start' }}>
                                                        <div className="invoice-header-left">
                                                            <div className="invoice-company-details">
                                                                <h2 style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0 0 5px 0', fontSize: '1.6rem', fontWeight: '900' }}>
                                                                    {companyDetails.name}
                                                                </h2>
                                                                <p>{companyDetails.address}</p>
                                                                <p>{companyDetails.email} | {companyDetails.phone}</p>
                                                            </div>
                                                        </div>
                                                        <div className="invoice-header-right">
                                                            <div className="invoice-meta-info">
                                                                <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                    <span className="invoice-label">Order No:</span>
                                                                    <span>#{editingId ? salesOrders.find(o => o.id === editingId)?.orderNumber : ""}</span>
                                                                </div>
                                                                <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                    <span className="invoice-label">Manual Ref:</span>
                                                                    <span>{orderMeta.manualNo || 'N/A'}</span>
                                                                </div>
                                                                <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                    <span className="invoice-label">Order Date:</span>
                                                                    <span>{orderMeta.date}</span>
                                                                </div>
                                                                <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                    <span className="invoice-label">Delivery Due:</span>
                                                                    <span>{orderMeta.deliveryDate || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', width: '100% !important', marginTop: '2.5rem', gap: '3rem' }}>
                                                <div className="invoice-bill-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                    <div className="invoice-section-header">BILL TO</div>
                                                    <div className="font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                                                        {customerDetails.billingName || customers.find(c => c.id === parseInt(customerId))?.name || 'N/A'}
                                                    </div>
                                                    <div style={{ marginTop: '8px', color: '#475569', fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                                        {customerDetails.billingAddress || 'N/A'}
                                                    </div>
                                                    <div style={{ color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>
                                                        {customerDetails.email} | {customerDetails.phone}
                                                    </div>
                                                </div>

                                                <div className="invoice-ship-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                    <div className="invoice-section-header">SHIP TO</div>
                                                    <div className="font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                                                        {customerDetails.shippingName || 'N/A'}
                                                    </div>
                                                    <div style={{ marginTop: '8px', color: '#475569', fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                                        {customerDetails.shippingAddress || 'N/A'}
                                                    </div>
                                                    {(customerDetails.shippingCity || customerDetails.shippingState || customerDetails.shippingZipCode || customerDetails.shippingCountry) && (
                                                        <div style={{ color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>
                                                            {customerDetails.shippingCity && `${customerDetails.shippingCity}, `}
                                                            {customerDetails.shippingState && `${customerDetails.shippingState} - `}
                                                            {customerDetails.shippingZipCode && `${customerDetails.shippingZipCode}, `}
                                                            {customerDetails.shippingCountry && `${customerDetails.shippingCountry}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Custom Fields Print View */}
                                            {(() => {
                                                const order = salesOrders.find(o => o.id === editingId);
                                                let customFieldVals = {};
                                                if (order?.customFields) {
                                                    try {
                                                        customFieldVals = typeof order.customFields === 'string'
                                                            ? JSON.parse(order.customFields)
                                                            : order.customFields;
                                                    } catch (e) {
                                                        console.error('Error parsing sales order custom fields for view:', e);
                                                    }
                                                }
                                                const fieldsList = getCustomFieldsForType('salesorder');
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

                                            <table className="invoice-table-preview" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('item', 'Item Detail').toUpperCase()}</th>
                                                        {getInvoiceLabel('showWarehouse') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showQty') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showUom') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>UOM</th>}
                                                        {getInvoiceLabel('showRate') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showTax') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showDiscount') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('discount', 'Discount').toUpperCase()}</th>}
                                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right' }}>{getTableHeader('price', 'Amount').toUpperCase()}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((item, idx) => (
                                                        <tr key={item.id}>
                                                            <td style={{ width: '35%' }}>
                                                                <span className="font-bold text-sm text-gray-800 block">
                                                                    {item.productId ? allProducts.find(p => p.id === parseInt(item.productId))?.name :
                                                                        item.serviceId ? allServices.find(s => s.id === parseInt(item.serviceId))?.name :
                                                                            'N/A'}
                                                                </span>
                                                                {item.description && <span className="text-xs text-gray-500 block mt-0.5">{item.description}</span>}
                                                            </td>
                                                            {getInvoiceLabel('showWarehouse') !== false && <td>{allWarehouses.find(w => w.id === parseInt(item.warehouseId))?.name || 'N/A'}</td>}
                                                            {getInvoiceLabel('showQty') !== false && <td>{item.qty}</td>}
                                                            {getInvoiceLabel('showUom') !== false && <td>{allUoms.find(u => u.id === parseInt(item.uomId))?.unitName || ''}</td>}
                                                            {getInvoiceLabel('showRate') !== false && <td>{formatCurrency(item.rate)}</td>}
                                                            {getInvoiceLabel('showTax') !== false && <td>{item.tax}%</td>}
                                                            {getInvoiceLabel('showDiscount') !== false && <td>{formatCurrency(item.discount)}</td>}
                                                            <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatCurrency(item.total || 0)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            <div className="invoice-total-section">
                                                <div className="invoice-totals">
                                                    <div className="invoice-total-row">
                                                        <span>Sub Total</span>
                                                        <span>{formatCurrency(totalsData.subTotal)}</span>
                                                    </div>
                                                    <div className="invoice-total-row text-red-600">
                                                        <span>Discount</span>
                                                        <span>-{formatCurrency(totalsData.discount + totalsData.ovDiscountAmt)}</span>
                                                    </div>
                                                    {getInvoiceLabel('showTax') !== false && (
                                                        <div className="invoice-total-row">
                                                            <span>Tax Total</span>
                                                            <span>{formatCurrency(totalsData.tax)}</span>
                                                        </div>
                                                    )}
                                                    <div className="invoice-final-total">
                                                        <span>Grand Total</span>
                                                        <span>{formatCurrency(totalsData.finalTotal)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bank Details Section - View Mode Only */}
                                            {isViewMode && (bankDetails.bankName || bankDetails.accNo) && (
                                                <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                                    <h3 className="invoice-section-header" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</h3>
                                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {bankDetails.bankName && <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: '0.95rem' }}>{bankDetails.bankName}</span>}
                                                        {bankDetails.accNo && <span style={{ color: '#334155', fontSize: '0.9rem' }}>{bankDetails.accNo}</span>}
                                                        {bankDetails.holderName && <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: '0.9rem' }}>{bankDetails.holderName}</span>}
                                                        {bankDetails.ifsc && <span style={{ color: '#0ea5e9', fontWeight: '600', fontSize: '0.9rem' }}>{bankDetails.ifsc}</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {getInvoiceLabel('showFooter') !== false && (notes || terms) && (
                                                <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                                    <h3 className="invoice-section-header">Notes &amp; Terms</h3>
                                                    {notes && <p style={{ color: '#64748b', fontSize: '0.9rem', whiteSpace: 'pre-line', marginBottom: '8px' }}>{notes}</p>}
                                                    {terms && (
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                            <strong>Terms &amp; Conditions:</strong> {terms}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="SalesOrder-create-edit-form">
                                        {/* Mode Selection hidden to enforce direct creation in-module */}

                                        {/* Quotation Selection List (Conditional) */}
                                        {creationMode === 'linked' && showQuotationSelect && !selectedQuotation && (
                                            <div className="SalesOrder-quotation-link-container">
                                                <div className="SalesOrder-quotation-controls-row">
                                                    <div className="SalesOrder-form-group">
                                                        <label className="SalesOrder-form-label-sm">Select Customer First</label>
                                                        <select
                                                            className="SalesOrder-form-select-compact"
                                                            value={quotationFilterCustomerId}
                                                            onChange={(e) => setQuotationFilterCustomerId(e.target.value)}
                                                        >
                                                            <option value="">Choose Customer...</option>
                                                            {customers.map(c => {
                                                                const quoteCount = activeQuotations.filter(q => q.customerId === c.id).length;
                                                                return (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.name} ({quoteCount} Quotations)
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>

                                                    <div className="SalesOrder-form-group">
                                                        <label className="SalesOrder-form-label-sm">Search Quotations</label>
                                                        <div className="SalesOrder-quotation-search-mini">
                                                            <Search size={14} className="SalesOrder-q-search-icon-mini" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search quotes..."
                                                                className="SalesOrder-q-search-input-mini"
                                                                value={quotationSearchTerm}
                                                                onChange={(e) => setQuotationSearchTerm(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <h4 className="SalesOrder-form-label-sm SalesOrder-mb-2">
                                                    {quotationFilterCustomerId
                                                        ? `Available Quotations (${filteredQuotationList.length})`
                                                        : 'All Available Quotations'}
                                                </h4>
                                                <div className="SalesOrder-quote-grid">
                                                    {filteredQuotationList.length === 0 ? (
                                                        <div className="SalesOrder-text-center SalesOrder-py-8 SalesOrder-text-gray-400 SalesOrder-col-span-full">
                                                            No matching quotations found
                                                        </div>
                                                    ) : (
                                                        filteredQuotationList.map(quo => (
                                                            <div key={quo.id} className="SalesOrder-quote-link-card" onClick={() => handleSelectQuotation(quo)}>
                                                                <div className="SalesOrder-q-card-header">
                                                                    <span className="SalesOrder-q-id SalesOrder-text-blue-600 SalesOrder-font-bold">{quo.quotationNumber}</span>
                                                                    <span className="SalesOrder-q-date SalesOrder-text-gray-400 SalesOrder-text-xs">{new Date(quo.date).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="SalesOrder-q-card-body SalesOrder-mt-2">
                                                                    <span className="SalesOrder-q-customer SalesOrder-font-semibold">{quo.customer?.name}</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 2-Column Voucher Header Grid (Left: Voucher Metadata, Right: Customer Info) */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(240px, 320px) minmax(320px, 480px)',
                                            justifyContent: 'space-between',
                                            gap: '3rem',
                                            marginBottom: '30px'
                                        }}>
                                            {/* LEFT COLUMN: Sales Order Voucher Fields */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        ORDER NO. <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={orderNumber}
                                                        onChange={(e) => setOrderNumber(e.target.value)}
                                                        disabled={isViewMode || !!editingId}
                                                        style={{ width: '100%', maxWidth: '280px' }}
                                                        className={`SalesOrder-meta-input ${isViewMode || editingId ? 'SalesOrder-disabled' : ''}`}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        MANUAL REF
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. PO-REF-001"
                                                        disabled={isViewMode}
                                                        value={orderMeta.manualNo}
                                                        onChange={(e) => setOrderMeta({ ...orderMeta, manualNo: e.target.value })}
                                                        style={{ width: '100%', maxWidth: '280px' }}
                                                        className="SalesOrder-meta-input"
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        ORDER DATE
                                                    </label>
                                                    <input
                                                        type="date"
                                                        disabled={isViewMode}
                                                        value={orderMeta.date}
                                                        onChange={(e) => setOrderMeta({ ...orderMeta, date: e.target.value })}
                                                        style={{ width: '100%', maxWidth: '280px' }}
                                                        className="SalesOrder-meta-input"
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        DELIVERY DUE
                                                    </label>
                                                    <input
                                                        type="date"
                                                        disabled={isViewMode}
                                                        value={orderMeta.deliveryDate}
                                                        onChange={(e) => setOrderMeta({ ...orderMeta, deliveryDate: e.target.value })}
                                                        style={{ width: '100%', maxWidth: '280px' }}
                                                        className="SalesOrder-meta-input"
                                                    />
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: Customer Details */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                        <User size={14} className="text-indigo-500" /> ORDER TO / CUSTOMER <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                        <select
                                                            className="SalesOrder-form-select-compact SalesOrder-customer-select"
                                                            disabled={isViewMode || creationMode === 'linked'}
                                                            value={customerId}
                                                            onChange={(e) => {
                                                                const id = e.target.value;
                                                                setCustomerId(id);
                                                                const c = customers.find(cust => cust.id === parseInt(id));
                                                                if (c) {
                                                                    setCustomerDetails({
                                                                        billingName: c.billingName || c.name || '',
                                                                        billingAddress: c.billingAddress || '',
                                                                        billingCity: c.billingCity || '',
                                                                        billingState: c.billingState || '',
                                                                        billingZipCode: c.billingZipCode || '',
                                                                        billingCountry: c.billingCountry || '',
                                                                        email: c.email || '',
                                                                        phone: c.phone || '',
                                                                        shippingName: c.shippingName || '',
                                                                        shippingAddress: c.shippingAddress || '',
                                                                        shippingCity: c.shippingCity || '',
                                                                        shippingState: c.shippingState || '',
                                                                        shippingZipCode: c.shippingZipCode || '',
                                                                        shippingCountry: c.shippingCountry || ''
                                                                    });
                                                                    setCustomerShippingAddresses(c.shippingaddress || []);
                                                                }
                                                            }}
                                                            style={{ flex: 1, height: '38px', padding: '4px 12px', fontSize: '0.875rem', lineHeight: '1.4', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                                        >
                                                            <option value="">Select Customer...</option>
                                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                        {!isViewMode && creationMode === 'direct' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowAddCustomerModal(true)}
                                                                style={{
                                                                    backgroundColor: '#1e293b',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    width: '38px',
                                                                    height: '38px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    flexShrink: 0,
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                }}
                                                                title="Add Customer"
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {customerId && !isViewMode && (
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Shipping Address Selector</label>
                                                        <select
                                                            className="SalesOrder-form-select-compact"
                                                            style={{ width: '100%', height: '38px', padding: '4px 12px', fontSize: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'primary') {
                                                                    const c = customers.find(cust => cust.id === parseInt(customerId));
                                                                    if (c) {
                                                                        setCustomerDetails({
                                                                            ...customerDetails,
                                                                            shippingName: c.shippingName || '',
                                                                            shippingAddress: c.shippingAddress || '',
                                                                            shippingCity: c.shippingCity || '',
                                                                            shippingState: c.shippingState || '',
                                                                            shippingZipCode: c.shippingZipCode || '',
                                                                            shippingCountry: c.shippingCountry || ''
                                                                        });
                                                                    }
                                                                } else {
                                                                    const addr = customerShippingAddresses.find(a => a.id === parseInt(val));
                                                                    if (addr) {
                                                                        setCustomerDetails({
                                                                            ...customerDetails,
                                                                            shippingName: addr.name || '',
                                                                            shippingAddress: addr.address || '',
                                                                            shippingCity: addr.city || '',
                                                                            shippingState: addr.state || '',
                                                                            shippingZipCode: addr.zipCode || '',
                                                                            shippingCountry: addr.country || ''
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Choose Shipping Address...</option>
                                                            <option value="primary">Primary Address</option>
                                                            {customerShippingAddresses.map(addr => (
                                                                <option key={addr.id} value={addr.id}>
                                                                    {addr.name} - {addr.city}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {customerId && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <User size={13} className="text-indigo-500" /> Billing Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="Billing Name"
                                                                disabled={true}
                                                                readOnly
                                                                value={customerDetails.billingName}
                                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#334155' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <MapPin size={13} className="text-indigo-500" /> Billing Address
                                                            </label>
                                                            <textarea
                                                                placeholder="Billing Address"
                                                                disabled={true}
                                                                readOnly
                                                                rows="2"
                                                                value={customerDetails.billingAddress}
                                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#334155', resize: 'vertical' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                    <Mail size={13} className="text-emerald-500" /> Email Address
                                                                </label>
                                                                <input
                                                                    type="email"
                                                                    placeholder="Email Address"
                                                                    disabled={true}
                                                                    readOnly
                                                                    value={customerDetails.email}
                                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#334155' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                    <Phone size={13} className="text-amber-500" /> Phone Number
                                                                </label>
                                                                <input
                                                                    type="tel"
                                                                    placeholder="Phone Number"
                                                                    disabled={true}
                                                                    readOnly
                                                                    value={customerDetails.phone}
                                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff', color: '#334155' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Custom Fields Section */}
                                        {getCustomFieldsForType('salesorder').length > 0 && (
                                            <div className="SalesOrder-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Custom Fields
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                    {getCustomFieldsForType('salesorder').map(field => (
                                                        <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', textAlign: 'left' }}>
                                                                {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                            </label>
                                                            {field.type === 'select' ? (
                                                                <select
                                                                    value={customFieldValues[field.label] || ''}
                                                                    onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%', backgroundColor: 'white' }}
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
                                                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%' }}
                                                                    required={field.required}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {creationMode === 'linked' && selectedQuotation && (
                                            <div className="SalesOrder-linked-indicator mb-6">
                                                <FileSearch size={14} /> Linked to Quotation: <strong>{selectedQuotation.quotationNumber || selectedQuotation.id}</strong>
                                                <button className="SalesOrder-change-link-btn" onClick={() => setShowQuotationSelect(true)}>Change</button>
                                            </div>
                                        )}
                                        {/* Items Table */}
                                        <div className="SalesOrder-items-section-new">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
                                                <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', letterSpacing: '0.05em', margin: 0 }}>
                                                    LINE ITEMS
                                                </h3>
                                                {!isViewMode && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '260px' }}>
                                                            <SearchableSelect
                                                                options={[
                                                                    ...allProducts.map(p => ({ ...p, id: `p-${p.id}`, name: `${p.name} (${p.totalQuantity ?? 0})`, type: 'Products' })),
                                                                    ...allServices.map(s => ({ ...s, id: `s-${s.id}`, name: s.name, type: 'Services' }))
                                                                ]}
                                                                value=""
                                                                onChange={(val) => handleTopItemSelect(val)}
                                                                placeholder="Type item name/SKU & press Enter..."
                                                                searchPlaceholder="Search product or service..."
                                                                labelKey="name"
                                                                valueKey="id"
                                                                groupKey="type"
                                                                clearable={false}
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
                                                            style={{
                                                                backgroundColor: '#1e293b',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                width: '34px',
                                                                height: '34px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                flexShrink: 0
                                                            }}
                                                            title="Add Product"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="SalesOrder-table-responsive">
                                                <table className="SalesOrder-new-items-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '20%' }}>{getTableHeader('item', 'Item Name').toUpperCase()}</th>
                                                            {getInvoiceLabel('showWarehouse') !== false && <th style={{ width: '12%' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                            {getInvoiceLabel('showQty') !== false && <th style={{ width: '8%' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                                            {getInvoiceLabel('showUom') !== false && <th style={{ width: '10%' }}>UOM</th>}
                                                            {getInvoiceLabel('showRate') !== false && <th style={{ width: '12%' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                                            {getInvoiceLabel('showTax') !== false && <th style={{ width: '10%' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                                            {getInvoiceLabel('showDiscount') !== false && <th style={{ width: '10%' }}>{getTableHeader('discount', 'Discount').toUpperCase()}</th>}
                                                            <th style={{ width: '12%' }}>{getTableHeader('price', 'Amount').toUpperCase()}</th>
                                                            <th style={{ width: '6%' }}></th>
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
                                                                                updateItem(item.id, {
                                                                                    productId: pId,
                                                                                    serviceId: '',
                                                                                    rate: p.salePrice || 0,
                                                                                    tax: p.taxRate || 0,
                                                                                    description: item.description || p.name,
                                                                                    uomId: p.salesUomId || p.uomId || ''
                                                                                });
                                                                            }
                                                                        } else if (eventValue.startsWith('s-')) {
                                                                            const sId = eventValue.split('-')[1];
                                                                            const s = allServices.find(x => x.id === parseInt(sId));
                                                                            if (s) {
                                                                                updateItem(item.id, {
                                                                                    serviceId: sId,
                                                                                    productId: '',
                                                                                    rate: s.price || 0,
                                                                                    tax: s.taxRate || 0,
                                                                                    description: item.description || s.name,
                                                                                    uomId: s.uomId || ''
                                                                                });
                                                                            }
                                                                        } else {
                                                                            updateItem(item.id, {
                                                                                productId: '',
                                                                                serviceId: '',
                                                                                rate: 0,
                                                                                tax: 0,
                                                                                description: '',
                                                                                uomId: ''
                                                                            });
                                                                        }
                                                                    }}
                                                                    placeholder="Select Product/Service..."
                                                                    searchPlaceholder="Search product/service..."
                                                                    labelKey="name"
                                                                    valueKey="id"
                                                                    groupKey="type"
                                                                    disabled={isViewMode || creationMode === 'linked'}
                                                                    clearable={false}
                                                                />
                                                            </td>
                                                                    {getInvoiceLabel('showWarehouse') !== false && (
                                                                        <td>
                                                                            <SearchableSelect
                                                                                options={allWarehouses.map(w => {
                                                                                    const prodId = item.productId ? (String(item.productId).startsWith('p-' ? parseInt(String(item.productId).replace('p-', '')) : parseInt(item.productId))) : null;
                                                                                    const prod = prodId ? allProducts.find(p => p.id === prodId) : null;
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
                                                                                clearable={false}
                                                                            />
                                                                        </td>
                                                                    )}
                                                                {getInvoiceLabel('showQty') !== false && (
                                                                    <td>
                                                                        <input type="number" value={item.qty} disabled={creationMode === 'linked'}
                                                                            min="0"
                                                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                            onChange={(e) => updateItem(item.id, 'qty', e.target.value.replace(/-/g, ''))}
                                                                            className="SalesOrder-qty-input" />
                                                                    </td>
                                                                )}
                                                                {getInvoiceLabel('showUom') !== false && (
                                                                    <td>
                                                                        {item.productId || item.serviceId ? (
                                                                            <select className="SalesOrder-full-width-input" value={item.uomId}
                                                                                disabled={isViewMode}
                                                                                onChange={(e) => updateItem(item.id, 'uomId', e.target.value)}>
                                                                                <option value="">Select UOM...</option>
                                                                                {allUoms
                                                                                    .filter(u => {
                                                                                        const prod = allProducts.find(p => p.id === (String(item.productId).startsWith('p-') ? parseInt(String(item.productId).replace('p-', '')) : parseInt(item.productId)));
                                                                                        const serv = allServices.find(s => s.id === (String(item.serviceId).startsWith('s-') ? parseInt(String(item.serviceId).replace('s-', '')) : parseInt(item.serviceId)));
                                                                                        const category = prod?.uom?.category || prod?.salesUom?.category || serv?.uom?.category;
                                                                                        const baseUnitId = prod?.uomId || prod?.salesUomId || serv?.uomId;
                                                                                        return u.category === category || u.baseUnitId === baseUnitId || u.id === baseUnitId;
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
                                                                        <input type="number" value={item.rate} disabled={creationMode === 'linked'}
                                                                            min="0"
                                                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                            onChange={(e) => updateItem(item.id, 'rate', e.target.value.replace(/-/g, ''))}
                                                                            className="SalesOrder-rate-input" />
                                                                    </td>
                                                                )}
                                                                {getInvoiceLabel('showTax') !== false && (
                                                                    <td>
                                                                        <input type="number" value={item.tax} disabled={creationMode === 'linked'}
                                                                            min="0"
                                                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                            onChange={(e) => updateItem(item.id, 'tax', e.target.value.replace(/-/g, ''))}
                                                                            className="SalesOrder-tax-input" />
                                                                    </td>
                                                                )}
                                                                {getInvoiceLabel('showDiscount') !== false && (
                                                                    <td>
                                                                        <input type="number" value={item.discount} disabled={creationMode === 'linked'}
                                                                            min="0"
                                                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                            onChange={(e) => updateItem(item.id, 'discount', e.target.value.replace(/-/g, ''))}
                                                                            className="SalesOrder-discount-input" />
                                                                    </td>
                                                                )}
                                                                <td>
                                                                    <input type="text" value={formatCurrency(item.total || 0)} disabled className="SalesOrder-amount-input SalesOrder-disabled" />
                                                                </td>
                                                                <td className="SalesOrder-text-center">
                                                                    {creationMode === 'direct' && !isViewMode && (
                                                                        <button className="SalesOrder-btn-delete-row" onClick={() => removeItem(item.id)}>
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Totals Section */}
                                        <div className="SalesOrder-totals-layout">
                                            <div className="SalesOrder-totals-spacer"></div>
                                            <div className="SalesOrder-totals-box">
                                                <div className="SalesOrder-t-row">
                                                    <span>Sub Total:</span>
                                                    <span>{formatCurrency(totalsData.subTotal)}</span>
                                                </div>
                                                <div className="SalesOrder-t-row">
                                                    <span>Discount:</span>
                                                    <span className="SalesOrder-text-red-500">-{formatCurrency(totalsData.discount)}</span>
                                                </div>
                                                <div className="SalesOrder-t-row">
                                                    <span>Tax Total:</span>
                                                    <span>{formatCurrency(totalsData.tax)}</span>
                                                </div>

                                                <div className="SalesOrder-t-row items-center gap-2 mt-4 pt-4 border-t border-dashed">
                                                    <span className="flex-1">Overall Discount:</span>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            className="SalesOrder-rate-input w-20 text-xs"
                                                            value={overallDiscount}
                                                            min="0"
                                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                            onChange={(e) => setOverallDiscount(e.target.value.replace(/-/g, ''))}
                                                        />
                                                        <select
                                                            className="SalesOrder-shipping-selector text-xs p-1"
                                                            value={overallDiscountType}
                                                            onChange={(e) => setOverallDiscountType(e.target.value)}
                                                        >
                                                            <option value="percentage">%</option>
                                                            <option value="fixed">Fixed</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="SalesOrder-t-row SalesOrder-total">
                                                    <span>Grand Total:</span>
                                                    <span>{formatCurrency(totalsData.finalTotal)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes & Terms at bottom */}
                                        <div className="SalesOrder-bottom-textareas-row">
                                            <div className="SalesOrder-notes-section my-4">
                                                <label className="SalesOrder-section-label">Notes</label>
                                                <textarea className="SalesOrder-notes-area"
                                                    value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                                            </div>

                                            <div className="SalesOrder-terms-section my-4">
                                                <label className="SalesOrder-section-label">Terms & Conditions</label>
                                                <textarea className="SalesOrder-terms-area"
                                                    value={terms} onChange={(e) => setTerms(e.target.value)}></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="SalesOrder-modal-footer-simple">
                                <button className="SalesOrder-btn-plain" onClick={() => setShowAddModal(false)}>Close</button>
                                {isViewMode && (
                                    <>
                                        {salesOrders.find(o => o.id === editingId)?.status !== 'CONVERTED' ? (
                                            <button className="SalesOrder-btn-primary-green" onClick={() => handleConvert(editingId)} style={{ backgroundColor: '#4f46e5' }}>
                                                <Truck size={18} className="mr-2" /> Convert to Delivery Challan
                                            </button>
                                        ) : (
                                            <span className="text-sm font-semibold px-3 py-2 bg-gray-100 text-gray-500 rounded mr-2">Already Converted</span>
                                        )}
                                        <button className="SalesOrder-btn-primary-green" onClick={handlePrint}>
                                            <Printer size={18} className="mr-2" /> Print Order
                                        </button>
                                    </>
                                )}
                                {!isViewMode && (
                                    <button className="SalesOrder-btn-primary-green" onClick={handleSave}>
                                        {editingId ? 'Update Order' : 'Confirm Order'}
                                    </button>
                                )}
                            </div >
                        </div >
                    </div >
                )
            }

            {/* Delete Confirmation Modal - User Design Match */}
            {
                showDeleteConfirm && (
                    <div className="SalesOrder-modal-overlay">
                        <div className="SalesOrder-delete-confirmation-box">
                            <div className="SalesOrder-delete-modal-header">
                                <h3 className="SalesOrder-delete-modal-title">Delete Order?</h3>
                                <button className="SalesOrder-delete-close-btn" onClick={() => setShowDeleteConfirm(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="SalesOrder-delete-modal-body">
                                <p>Are you sure you want to delete this sales order? This action cannot be undone.</p>
                            </div>
                            <div className="SalesOrder-delete-modal-footer">
                                <button className="SalesOrder-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="SalesOrder-btn-delete-confirm" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }
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

                                <div style={{ marginTop: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Warehouse Information</h3>
                                        <button type="button" className="Zirak-Inventory-btn-add-warehouse" onClick={addProductWarehouseRow}>
                                            + Add Warehouse
                                        </button>
                                    </div>
                                    <table className="Zirak-Inventory-warehouse-table">
                                        <thead>
                                            <tr>
                                                <th>Warehouse</th>
                                                <th>Quantity</th>
                                                <th>Min Order Qty</th>
                                                <th>Initial Qty</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productWarehouseRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        <select
                                                            className="Zirak-Inventory-form-input"
                                                            value={row.warehouseId}
                                                            onChange={(e) => handleProductWhRowChange(row.id, 'warehouseId', e.target.value)}
                                                        >
                                                            {allWarehouses.map(w => (
                                                                <option key={w.id} value={w.id}>{w.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="Zirak-Inventory-form-input"
                                                            value={row.quantity}
                                                            onChange={(e) => handleProductWhRowChange(row.id, 'quantity', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="Zirak-Inventory-form-input"
                                                            value={row.minOrderQty}
                                                            onChange={(e) => handleProductWhRowChange(row.id, 'minOrderQty', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="Zirak-Inventory-form-input"
                                                            value={row.initialQty}
                                                            onChange={(e) => handleProductWhRowChange(row.id, 'initialQty', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button type="button" className="Zirak-Inventory-btn-delete-row" onClick={() => removeProductWarehouseRow(row.id)}>
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
        </div >
    );
};

export default SalesOrder;
