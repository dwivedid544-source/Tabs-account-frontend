import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Download, Send, Printer, Eye, AlertTriangle, ArrowLeft,
    User, MapPin, Mail, Phone
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './Quotation.css';
import '../Invoice/Invoice.css';
import salesQuotationService from '../../../../api/salesQuotationService';
import customerService from '../../../../api/customerService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import servicesService from '../../../../api/servicesService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { useReactToPrint } from 'react-to-print';
import { CompanyContext } from '../../../../context/CompanyContext';
import uomService from '../../../../services/uomService';
import '../../Customers/Customers.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import customerServiceFromServices from '../../../../services/customerService';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import axiosInstance from '../../../../api/axiosInstance';
import { Upload, Loader2 } from 'lucide-react';

const Quotation = () => {
    // --- State Management ---
    const { formatCurrency, getTableHeader, getInvoiceLabel, companySettings, getDocumentTitle } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
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
    const [quotations, setQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allWarehouses, setAllWarehouses] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Full Add Customer & Product Modal States
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [showAddProductModal, setShowAddProductModal] = useState(false);

    // Customer Modal States
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
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [uploadingAnyFile, setUploadingAnyFile] = useState(false);
    const profileImageRef = useRef();
    const anyFileRef = useRef();

    // Product Modal States
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
        category: '',
        unitName: '',
        weightPerUnit: '',
        uomType: 'Simple',
        baseUnitId: '',
        conversionRate: ''
    });

    const measurementCategories = ['Weight', 'Area', 'Volume', 'Length', 'Count'];

    const unitsByCategory = {
        'Weight': [
            'Microgram', 'Milligram', 'Gram', 'Kilogram (KG)', 'Metric Ton (Tonne)',
            'Quintal', 'Pound (lb)', 'Ounce (oz)', 'Stone', 'Carat'
        ],
        'Area': [
            'Square Millimeter', 'Square Centimeter', 'Square Meter', 'Square Kilometer',
            'Square Inch', 'Square Foot', 'Square Yard', 'Acre', 'Hectare', 'Bigha',
            'Kanal', 'Cent'
        ],
        'Volume': [
            'Millilitre (mL)', 'Litre (L)', 'Cubic Centimeter (cc)', 'Cubic Meter',
            'Cubic Inch', 'Cubic Foot', 'Gallon', 'Barrel', 'Pint', 'Quart', 'Fluid Ounce'
        ],
        'Length': [
            'Nanometer', 'Micrometer', 'Millimeter', 'Centimeter', 'Meter',
            'Kilometer', 'Inch', 'Foot', 'Yard', 'Mile'
        ],
        'Count': [
            'Piece', 'Unit', 'Dozen', 'Pair', 'Set', 'Box', 'Packet', 'Carton',
            'Bundle', 'Roll', 'Strip', 'Bottle', 'Bag', 'Can', 'Jar', 'Tube'
        ]
    };

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: 'Tab Accounts', address: '', email: 'info@tabaccounts.com', phone: '', notes: '', terms: ''
    });
    const [quotationMeta, setQuotationMeta] = useState({
        manualNo: '', date: new Date().toISOString().split('T')[0], validTill: ''
    });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRefToRetry, setDuplicateRefToRetry] = useState('');
    const [quotationNumber, setQuotationNumber] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerDetails, setCustomerDetails] = useState({ address: '', email: '', phone: '' });
    const [items, setItems] = useState([
        { id: Date.now(), productId: '', serviceId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
    ]);
    const [allUoms, setAllUoms] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();
    const [bankDetails, setBankDetails] = useState({
        bankName: '', accNo: '', holderName: '', ifsc: ''
    });
    const [notes, setNotes] = useState('Thank you for your business!');
    const [terms, setTerms] = useState('"Payment is due within 15 days.",\n"Goods once sold will not be taken back."');
    const [attachments, setAttachments] = useState([]);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('amount'); // 'amount' | 'percent'
    const [manualStatus, setManualStatus] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState('DRAFT');
    const fileInputRef = useRef(null);

    // Initial Fetch
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
                    termsQuotation: data.termsQuotation || ''
                });
                setBankDetails({
                    bankName: data.bankName || 'HDFC Bank',
                    accNo: data.accountNumber || '50200012345678',
                    holderName: data.accountHolder || 'ABC Accounting Solutions Pvt. Ltd.',
                    ifsc: data.ifsc || 'HDFC0000456'
                });
                setNotes(data.notes || 'Thank you for your business!');
                setTerms(data.termsQuotation || data.terms || '"Payment is due within 15 days.",\n"Goods once sold will not be taken back."');
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await salesQuotationService.getAll(companyId);
            if (response.data.success) {
                setQuotations(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching quotations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();
            const [custRes, prodRes, whRes, servRes, uomRes, catRes] = await Promise.all([
                customerService.getAll(companyId),
                productService.getAll(companyId),
                warehouseService.getAll(companyId),
                servicesService.getAll(companyId),
                uomService.getUOMs(companyId),
                categoryService.getCategories(companyId).catch(() => ({ success: false, data: [] }))
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data);
            if (prodRes.data.success) setAllProducts(prodRes.data.data);
            if (whRes.data.success) setAllWarehouses(whRes.data.data);
            if (servRes.data.success) setAllServices(servRes.data.data);
            if (uomRes.data) setAllUoms(uomRes.data);
            if (catRes && catRes.success) setCategories(catRes.data);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    // Full Customer Submit and handlers
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

    const handleFullCustomerSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!customerFormData.name || !customerFormData.email) {
            toast.error('Please fill in required fields (Name and Email)');
            return;
        }

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
        payload.companyId = parseInt(GetCompanyId());

        try {
            const res = await customerServiceFromServices.createCustomer(payload);
            toast.success('Customer created successfully!');
            setShowAddCustomerModal(false);

            // Refresh customer selection dropdown
            const companyId = GetCompanyId();
            const custRes = await customerService.getAll(companyId);
            if (custRes?.data?.success) {
                setCustomers(custRes.data.data);
            } else if (custRes?.data) {
                setCustomers(custRes.data);
            }

            const added = res?.data || res;
            if (added && added.id) {
                setCustomerId(added.id);
                setCustomerDetails({
                    address: added.billingAddress || '',
                    email: added.email || '',
                    phone: added.phone || ''
                });
            }

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
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Failed to save customer');
        }
    };

    // Full Product Submit and handlers
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
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }

            try {
                setUploadingImage(true);
                toast.loading('Uploading image...', { id: 'image-upload' });
                const imageUrl = await uploadToCloudinary(file);
                setProductFormData(prev => ({ ...prev, image: imageUrl }));
                toast.success('Image uploaded successfully', { id: 'image-upload' });
            } catch (error) {
                console.error('Error uploading image:', error);
                toast.error('Failed to upload image', { id: 'image-upload' });
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
                // Reload list of uoms
                const uomsRes = await uomService.getUOMs(companyId);
                if (uomsRes.success) {
                    setAllUoms(uomsRes.data || []);
                }
                // Pre-select newly created UOM in the form
                setProductFormData(prev => ({
                    ...prev,
                    uomId: res.data?.id || prev.uomId,
                    purchaseUomId: res.data?.id || prev.purchaseUomId,
                    salesUomId: res.data?.id || prev.salesUomId
                }));
                setShowUomModal(false);
                // Reset form
                setUomFormData({
                    category: '',
                    unitName: '',
                    weightPerUnit: '',
                    uomType: 'Simple',
                    baseUnitId: '',
                    conversionRate: ''
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

            // Reset product form
            setProductFormData({
                name: '', sku: '', hsn: '', barcode: '', categoryId: '',
                uomId: '', purchaseUomId: '', salesUomId: '', unit: '', description: '', asOfDate: new Date().toISOString().split('T')[0],
                taxAccount: '', initialCost: 0, salePrice: 0, purchasePrice: 0,
                discount: 0, remarks: '', image: null
            });
            setProductWarehouseRows([]);
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(error.message || 'Failed to save product');
        }
    };

    // --- Actions ---
    const resetForm = () => {
        setEditingId(null);
        setCustomerId('');
        setCustomerDetails({ address: '', email: '', phone: '' });
        setQuotationMeta({ manualNo: '', date: new Date().toISOString().split('T')[0], validTill: '' });

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
        setNotes(companyDetails.notes || 'Thank you for your business!');
        setTerms(companyDetails.termsQuotation || companyDetails.terms || '"Payment is due within 15 days.",\n"Goods once sold will not be taken back."');
        setAttachments([]);
        setOverallDiscount(0);
        setOverallDiscountType('amount');
        setManualStatus(false);
        setOverrideStatus('DRAFT');
        setQuotationNumber('');
        setCustomFieldValues({});
        setShowAddModal(false);
    };

    const handleAddNew = async () => {
        resetForm();
        setEditingId(null);
        setIsViewMode(false);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'salesquotation');
                if (res.data.success) {
                    setQuotationNumber(res.data.nextNumber);
                    const nextRef = res.data.nextManualReference || res.data.details?.nextManualReference || '';
                    if (nextRef) {
                        setQuotationMeta(prev => ({ ...prev, manualNo: nextRef }));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching next quotation number:', error);
        }
        setShowAddModal(true);
    };

    const handleEdit = async (id) => {
        await populateQuotation(id, false);
    };

    const handleView = async (id) => {
        await populateQuotation(id, true);
    };

    const populateQuotation = async (id, viewOnly) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesQuotationService.getById(id, companyId);
            if (response.data.success) {
                const quoteToEdit = response.data.data;
                resetForm();
                setEditingId(id);
                setIsViewMode(viewOnly);
                setCustomerId(quoteToEdit.customerId);
                setCustomerDetails({
                    address: quoteToEdit.customer?.billingAddress || '',
                    email: quoteToEdit.customer?.email || '',
                    phone: quoteToEdit.customer?.phone || ''
                });
                let fieldValues = {};
                if (quoteToEdit.customFields) {
                    try {
                        fieldValues = typeof quoteToEdit.customFields === 'string'
                            ? JSON.parse(quoteToEdit.customFields)
                            : quoteToEdit.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }

                setQuotationMeta({
                    manualNo: quoteToEdit.manualReference || '',
                    date: quoteToEdit.date.split('T')[0],
                    validTill: quoteToEdit.expiryDate ? quoteToEdit.expiryDate.split('T')[0] : ''
                });
                setManualStatus(quoteToEdit.manualStatus || false);
                setOverrideStatus(quoteToEdit.status || 'DRAFT');
                setQuotationNumber(quoteToEdit.quotationNumber || '');
                setItems((quoteToEdit.salesquotationitem || quoteToEdit.items || []).map(item => ({
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
                setNotes(quoteToEdit.notes || '');
                setTerms(quoteToEdit.terms || '');
                setOverallDiscount(quoteToEdit.overallDiscount || 0);
                setOverallDiscountType(quoteToEdit.overallDiscountType || 'amount');

                setCustomFieldValues(fieldValues);

                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error loading quotation:', error);
        }
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            const response = await salesQuotationService.delete(deleteId, companyId);
            if (response.data.success) {
                fetchData();
                setShowDeleteConfirm(false);
                setDeleteId(null);
            }
        } catch (error) {
            console.error('Error deleting quotation:', error);
        }
    };

    const handleConvert = async (id) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesQuotationService.convert(id, companyId);
            if (response.data.success) {
                toast.success('Converted to Sales Order successfully');
                setShowAddModal(false);
                navigate('/company/sales/order', { state: { targetOrderId: response.data.data.id } });
            } else {
                toast.error(response.data.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting quotation:', error);
            toast.error(error.response?.data?.message || 'Error converting quotation');
        }
    };

    const handleStatusChange = async (quotationId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const response = await salesQuotationService.update(quotationId, payload, companyId);
            if (response.data?.success || response.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    // --- Filter Logic ---
    const filteredQuotations = React.useMemo(() => {
        return quotations.filter(q => {
            const query = searchTerm.toLowerCase();
            const matchesSearch = !query ||
                q.quotationNumber?.toLowerCase().includes(query) ||
                q.customer?.name?.toLowerCase().includes(query);

            const qDate = new Date(q.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || qDate >= start) && (!end || qDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [quotations, searchTerm, startDate, endDate]);

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
                quotationNumber: editingId ? (quotations.find(q => q.id === editingId)?.quotationNumber) : (quotationNumber || `QUO-${Date.now()}`),
                manualReference: overrideManualRef !== null ? overrideManualRef : (quotationMeta.manualNo || ''),
                date: quotationMeta.date,
                expiryDate: quotationMeta.validTill,
                customerId: parseInt(customerId),
                companyId: companyId,
                notes: notes,
                terms: terms,
                overallDiscount: overallDiscount,
                overallDiscountType: overallDiscountType,
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
                customFields: JSON.stringify(customFieldValues),
                manualStatus,
                status: manualStatus ? overrideStatus : undefined,
                allowDuplicateManualNo: allowDuplicate === true
            };

            let response;
            try {
                if (editingId) {
                    response = await salesQuotationService.update(editingId, data, companyId);
                } else {
                    response = await salesQuotationService.create(data);
                }

                if (response.data.success) {
                    toast.success(editingId ? 'Quotation updated successfully' : 'Quotation created successfully');
                    fetchData();
                    setShowAddModal(false);
                }
            } catch (err) {
                if (err.response?.data?.isDuplicateWarning || err.response?.data?.isDuplicate) {
                    const currentRef = overrideManualRef !== null ? overrideManualRef : (quotationMeta.manualNo || '');
                    setDuplicateRefToRetry(currentRef);
                    setShowDuplicateModal(true);
                } else {
                    toast.error(err.response?.data?.message || 'Error saving quotation');
                    console.error('Error saving quotation:', err);
                }
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
        }
    };

    // --- Calculation Helpers ---
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
        setItems(prevItems => [...prevItems, { id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
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
                    return [...prevItems, { id: Date.now(), productId: '', serviceId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }];
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
                    let sanitizedField = { ...field };
                    ['qty', 'rate', 'tax', 'discount'].forEach(k => {
                        if (sanitizedField[k] !== undefined) {
                            let val = sanitizedField[k];
                            if (typeof val === 'string') {
                                val = val.replace(/-/g, '');
                                if (val !== '') {
                                    const parsed = parseFloat(val);
                                    if (!isNaN(parsed) && parsed < 0) {
                                        val = '0';
                                    }
                                }
                            } else if (typeof val === 'number') {
                                if (val < 0) {
                                    val = 0;
                                }
                            }
                            sanitizedField[k] = val;
                        }
                    });
                    updatedItem = { ...item, ...sanitizedField };
                } else {
                    let processedValue = value;
                    if (['qty', 'rate', 'tax', 'discount'].includes(field)) {
                        if (typeof value === 'string') {
                            processedValue = value.replace(/-/g, '');
                            if (processedValue !== '') {
                                const parsed = parseFloat(processedValue);
                                if (!isNaN(parsed) && parsed < 0) {
                                    processedValue = '0';
                                }
                            }
                        } else if (typeof value === 'number') {
                            if (value < 0) {
                                processedValue = 0;
                            }
                        }
                    }
                    updatedItem = { ...item, [field]: processedValue };
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

    // --- Attachment Helpers ---
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setAttachments([...attachments, ...newFiles]);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const removeAttachment = (indexToRemove) => {
        setAttachments(attachments.filter((_, index) => index !== indexToRemove));
    };

    const calculateTotals = () => {
        const itemTotals = items.reduce((acc, item) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const discount = parseFloat(item.discount) || 0;
            const subtotal = qty * rate;

            acc.subTotal += subtotal;
            acc.itemDiscount += discount;
            acc.total += item.total;
            acc.tax += (item.total - (subtotal - discount));
            return acc;
        }, { subTotal: 0, tax: 0, itemDiscount: 0, total: 0 });

        // Apply overall discount
        const odVal = parseFloat(overallDiscount) || 0;
        const overallDiscountAmount = overallDiscountType === 'percent'
            ? (itemTotals.subTotal - itemTotals.itemDiscount) * odVal / 100
            : odVal;

        const grandTotal = itemTotals.total - overallDiscountAmount;

        return {
            subTotal: itemTotals.subTotal,
            discount: itemTotals.itemDiscount,
            overallDiscountAmount,
            tax: itemTotals.tax,
            total: grandTotal
        };
    };

    const totals = calculateTotals();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Quotation_${quotationMeta.manualNo || 'New'}`,
    });

    const salesProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'active' },
        { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart, status: 'pending' },
        { id: 'delivery', label: 'Delivery', icon: Truck, status: 'pending' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, status: 'pending' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (location.state && location.state.targetQuotationId) {
            if (location.state.isEdit || location.state.autoEdit) {
                handleEdit(location.state.targetQuotationId);
            } else {
                handleView(location.state.targetQuotationId);
            }
            // Clear location state after handling to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, fetchData, navigate]);

    return (
        <div className="Quotation-quotation-page">
            {!showAddModal && !isViewMode && (
                <>
                    <div className="Quotation-page-header">
                        <div>
                            <h1 className="Quotation-page-title">Quotation</h1>
                            <p className="Quotation-page-subtitle">Create and manage customer quotations</p>
                        </div>
                        {hasPermission('create sales quotation') && (
                            <button className="Quotation-btn-add" onClick={handleAddNew}>
                                <Plus size={18} className="mr-2" /> Create Quotation
                            </button>
                        )}
                    </div>

                    <div className="Quotation-process-tracker-card">
                        <div className="Quotation-tracker-wrapper">
                            {salesProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`Quotation-tracker-step ${step.status}`}>
                                        <div className="Quotation-step-icon-wrapper">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="Quotation-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="Quotation-status-badge" size={14} />}
                                        </div>
                                        <span className="Quotation-step-label">{step.label}</span>
                                    </div>
                                    {index < salesProcess.length - 1 && (
                                        <div className={`Quotation-tracker-divider ${salesProcess[index + 1].status !== 'pending' ? 'Quotation-active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="Quotation-table-card mt-6">
                        <div className="Quotation-table-controls p-4 border-b flex justify-between items-center gap-4 flex-wrap">
                            <div className="Quotation-search-wrapper">
                                <Search className="Quotation-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by ID or Customer..."
                                    className="Quotation-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="Quotation-date-filters flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input
                                        type="date"
                                        className="Quotation-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input
                                        type="date"
                                        className="Quotation-date-input"
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
                        <div className="Quotation-table-container">
                            <table className="Quotation-quotation-table">
                                <thead>
                                    <tr>
                                        <th>QUOTATION ID</th>
                                        <th>CUSTOMER</th>
                                        <th>DATE</th>
                                        <th>VALID TILL</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th className="text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuotations.map(q => {
                                        const isConverted = q.status === 'CONVERTED' || (Array.isArray(q.salesorder) ? q.salesorder.length > 0 : !!q.salesorder);
                                        return (
                                            <tr key={q.id}>
                                                <td className="font-bold text-blue-600">{q.quotationNumber}</td>
                                                <td>{q.customer?.name}</td>
                                                <td>{new Date(q.date).toLocaleDateString()}</td>
                                                <td>{q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                                <td>{formatCurrency(q.totalAmount)}</td>
                                                <td>
                                                    <select
                                                        value={q.manualStatus ? q.status : 'AUTO'}
                                                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                                                        className="Quotation-quotation-status-pill"
                                                        style={getStatusStyle(q.manualStatus ? q.status : 'AUTO')}
                                                    >
                                                        <option value="AUTO">Auto ({q.status || 'Pending'})</option>
                                                        <option value="DRAFT">DRAFT</option>
                                                        <option value="SENT">SENT</option>
                                                        <option value="ACCEPTED">ACCEPTED</option>
                                                        <option value="DECLINED">DECLINED</option>
                                                        <option value="EXPIRED">EXPIRED</option>
                                                        <option value="CONVERTED">CONVERTED</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <div className="Quotation-quotation-action-buttons">
                                                        <button className="Quotation-quotation-action-btn Quotation-view" onClick={() => handleView(q.id)} title="View"><Eye size={16} /></button>
                                                        {!isConverted ? (
                                                            <button className="Quotation-quotation-action-btn Quotation-convert" onClick={() => handleConvert(q.id)} title="Convert to Sales Order" style={{ backgroundColor: '#4f46e5', color: 'white' }}><ShoppingCart size={16} /></button>
                                                        ) : (
                                                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1" title="Converted to Sales Order">
                                                                <CheckCircle2 size={12} /> Converted
                                                            </span>
                                                        )}
                                                        {hasPermission('edit sales quotation') && (
                                                            <button className="Quotation-quotation-action-btn Quotation-edit" onClick={() => handleEdit(q.id)} title="Edit"><Pencil size={16} /></button>
                                                        )}
                                                        {hasPermission('delete sales quotation') && (
                                                            <button className="Quotation-quotation-action-btn Quotation-delete" onClick={() => handleDelete(q.id)} title="Delete"><Trash2 size={16} /></button>
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
                <div className="Quotation-quotation-full-page-create">
                    <div className="Quotation-view-page-header Quotation-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" className="Quotation-modal-logo-img" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {isViewMode ? 'View Quotation' : editingId ? 'Edit Quotation' : 'New Quotation'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div>
                            <button className="Quotation-btn-back" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Quotations
                            </button>
                        </div>
                    </div>

                    <div className="Quotation-modal-content Quotation-quotation-form-modal">
                        <div className="Quotation-modal-body-scrollable">
                            {isViewMode ? (
                                <div className="Quotation-view-document">
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
                                                        <div className="invoice-title-large" style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0' }}>{getDocumentTitle('salesquotation') || 'SALES QUOTATION'}</div>
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
                                                                <span className="invoice-label">{getInvoiceLabel('number') || 'Quotation No:'}</span>
                                                                <span>#{editingId ? quotations.find(q => q.id === editingId)?.quotationNumber : ""}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Manual Ref:</span>
                                                                <span>{quotationMeta.manualNo || 'N/A'}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">{getInvoiceLabel('issue') || 'Quotation Date:'}</span>
                                                                <span>{quotationMeta.date}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Valid Till:</span>
                                                                <span>{quotationMeta.validTill || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', width: '100% !important', marginTop: '2.5rem', gap: '3rem' }}>
                                            <div className="invoice-bill-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                <div className="invoice-section-header">{getInvoiceLabel('billTo') || 'BILL TO'}</div>
                                                <div className="font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                                                    {customers.find(c => c.id === parseInt(customerId))?.name || 'N/A'}
                                                </div>
                                                <div style={{ marginTop: '8px', color: '#475569', fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                                    {customerDetails.address || 'N/A'}
                                                </div>
                                                <div style={{ color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>
                                                    {customerDetails.email} | {customerDetails.phone}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Custom Fields Print View */}
                                        {(() => {
                                            const quoteToView = editingId ? quotations.find(q => q.id === editingId) : null;
                                            let customFieldVals = {};
                                            if (quoteToView?.customFields) {
                                                try {
                                                    customFieldVals = typeof quoteToView.customFields === 'string'
                                                        ? JSON.parse(quoteToView.customFields)
                                                        : quoteToView.customFields;
                                                } catch (e) {
                                                    console.error('Error parsing sales quotation custom fields for view:', e);
                                                }
                                            }
                                            const fieldsList = getCustomFieldsForType('salesquotation');
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
                                                    <span>{getInvoiceLabel('subTotal') || 'Sub Total'}</span>
                                                    <span>{formatCurrency(totals.subTotal)}</span>
                                                </div>
                                                <div className="invoice-total-row text-red-600">
                                                    <span>Discount</span>
                                                    <span>-{formatCurrency(totals.discount + totals.overallDiscountAmount)}</span>
                                                </div>
                                                {getInvoiceLabel('showTax') !== false && (
                                                    <div className="invoice-total-row">
                                                        <span>{getInvoiceLabel('tax') || 'Tax Total'}</span>
                                                        <span>{formatCurrency(totals.tax)}</span>
                                                    </div>
                                                )}
                                                <div className="invoice-final-total">
                                                    <span>{getInvoiceLabel('total') || 'Grand Total'}</span>
                                                    <span>{formatCurrency(totals.total)}</span>
                                                </div>
                                            </div>
                                        </div>

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
                                <div className="Quotation-create-edit-form">
                                    {/* 2-Column Voucher Header Grid (Left: Voucher Metadata, Right: Customer Info) */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(240px, 320px) minmax(320px, 480px)',
                                        justifyContent: 'space-between',
                                        gap: '3rem',
                                        marginBottom: '30px'
                                    }}>
                                        {/* LEFT COLUMN: Quotation Voucher Fields */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                    QUOTATION NO. <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quotationNumber}
                                                    onChange={(e) => setQuotationNumber(e.target.value)}
                                                    disabled={isViewMode || !!editingId}
                                                    style={{ width: '100%', maxWidth: '280px' }}
                                                    className={`Quotation-meta-input ${isViewMode || editingId ? 'Quotation-disabled' : ''}`}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                    MANUAL REF
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. REF-001"
                                                    disabled={isViewMode}
                                                    value={quotationMeta.manualNo}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, manualNo: e.target.value })}
                                                    style={{ width: '100%', maxWidth: '280px' }}
                                                    className="Quotation-meta-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                    DATE
                                                </label>
                                                <input
                                                    type="date"
                                                    disabled={isViewMode}
                                                    value={quotationMeta.date}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, date: e.target.value })}
                                                    style={{ width: '100%', maxWidth: '280px' }}
                                                    className="Quotation-meta-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                    VALID TILL
                                                </label>
                                                <input
                                                    type="date"
                                                    disabled={isViewMode}
                                                    value={quotationMeta.validTill}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, validTill: e.target.value })}
                                                    style={{ width: '100%', maxWidth: '280px' }}
                                                    className="Quotation-meta-input"
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: Customer Details */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <User size={14} className="text-indigo-500" /> QUOTATION TO <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                    <select
                                                        className="Quotation-form-select-compact Quotation-customer-select"
                                                        disabled={isViewMode}
                                                        value={customerId}
                                                        onChange={(e) => {
                                                            const id = e.target.value;
                                                            setCustomerId(id);
                                                            const c = customers.find(cust => String(cust.id) === String(id));
                                                            if (c) {
                                                                const fullAddr = [c.billingAddress, c.billingCity, c.billingState, c.billingZipCode, c.billingCountry].filter(Boolean).join(', ');
                                                                setCustomerDetails({
                                                                    address: fullAddr || c.address || '',
                                                                    email: c.email || '',
                                                                    phone: c.phone || ''
                                                                });
                                                            } else {
                                                                setCustomerDetails({ address: '', email: '', phone: '' });
                                                            }
                                                        }}
                                                        style={{ flex: 1, height: '38px', padding: '4px 12px', fontSize: '0.875rem', lineHeight: '1.4', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                                    >
                                                        <option value="">Select Customer...</option>
                                                        {customers.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} {c.companyName ? `(${c.companyName})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {!isViewMode && (
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

                                            {customerId && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                            <MapPin size={13} className="text-indigo-500" /> Billing Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="Billing Address"
                                                            className="Quotation-detail-input-compact"
                                                            disabled={isViewMode}
                                                            value={customerDetails.address}
                                                            onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                                                            style={{ width: '100%', padding: '6px 10px',  borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                        />
                                                    </div>
                                                    <div style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem',  fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <Mail size={13} className="text-emerald-500" /> Email Address
                                                            </label>
                                                            <input
                                                                type="email"
                                                                placeholder="Email Address"
                                                                className="Quotation-detail-input-compact"
                                                                disabled={isViewMode}
                                                                value={customerDetails.email}
                                                                onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                                                style={{ width: '100%',  padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', marginBlockStart: '15px' , color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <Phone size={13} className="text-amber-500" /> Phone Number
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                placeholder="Phone Number"
                                                                className="Quotation-detail-input-compact"
                                                                disabled={isViewMode}
                                                                value={customerDetails.phone}
                                                                onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {getCustomFieldsForType('salesquotation').length > 0 && (
                                        <div className="Quotation-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                                Custom Fields
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                {getCustomFieldsForType('salesquotation').map(field => (
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

                                    <div className="Quotation-items-section-new">
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
                                                        onClick={() => setShowAddProductModal(true)}
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
                                        <div className="Quotation-table-responsive">
                                            <table className="Quotation-new-items-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '20%' }}>{getTableHeader('item', 'Item Detail').toUpperCase()}</th>
                                                        {getInvoiceLabel('showWarehouse') !== false && <th style={{ width: '12%' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showQty') !== false && <th style={{ width: '8%' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showUom') !== false && <th style={{ width: '10%' }}>UOM</th>}
                                                        {getInvoiceLabel('showRate') !== false && <th style={{ width: '12%' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showTax') !== false && <th style={{ width: '10%' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showDiscount') !== false && <th style={{ width: '10%' }}>{getTableHeader('discount', 'Disc.').toUpperCase()}</th>}
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
                                                                    disabled={isViewMode}
                                                                    clearable={false}
                                                                    onEnterPress={() => handleAutoAddNextRow(item.id)}
                                                                />
                                                            </td>
                                                            {getInvoiceLabel('showWarehouse') !== false && (
                                                                <td>
                                                                    <SearchableSelect
                                                                        options={allWarehouses.map(w => {
                                                                            const prodId = item.productId ? (String(item.productId).startsWith('p-') ? parseInt(String(item.productId).replace('p-', '')) : parseInt(item.productId)) : null;
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
                                                                        disabled={isViewMode}
                                                                        clearable={false}
                                                                        onEnterPress={() => handleAutoAddNextRow(item.id)}
                                                                    />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showQty') !== false && (
                                                                <td>
                                                                    <input type="number" className="Quotation-qty-input" value={item.qty}
                                                                        disabled={isViewMode}
                                                                        min="0"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                                e.preventDefault();
                                                                            }
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAutoAddNextRow(item.id);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showUom') !== false && (
                                                                <td>
                                                                    {item.productId || item.serviceId ? (
                                                                        <select className="Quotation-full-width-input" value={item.uomId}
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
                                                                    <input type="number" className="Quotation-rate-input" value={item.rate}
                                                                        disabled={isViewMode}
                                                                        min="0"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                                e.preventDefault();
                                                                            }
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAutoAddNextRow(item.id);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showTax') !== false && (
                                                                <td>
                                                                    <input type="number" className="Quotation-tax-input" value={item.tax}
                                                                        disabled={isViewMode}
                                                                        min="0"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                                e.preventDefault();
                                                                            }
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAutoAddNextRow(item.id);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => updateItem(item.id, 'tax', e.target.value)} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showDiscount') !== false && (
                                                                <td>
                                                                    <input type="number" className="Quotation-discount-input" value={item.discount}
                                                                        disabled={isViewMode}
                                                                        min="0"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                                e.preventDefault();
                                                                            }
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAutoAddNextRow(item.id);
                                                                            }
                                                                        }}
                                                                        onChange={(e) => updateItem(item.id, 'discount', e.target.value)} />
                                                                </td>
                                                            )}
                                                            <td>
                                                                <input type="text" className="Quotation-amount-input Quotation-disabled" value={formatCurrency(item.total || 0)} disabled />
                                                            </td>
                                                            <td className="text-center">
                                                                <button className="Quotation-btn-delete-row" onClick={() => removeItem(item.id)}>
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="Quotation-bottom-layout-grid">
                                        <div className="Quotation-bottom-left-col">
                                            <div className="Quotation-bank-section">
                                                <label className="Quotation-section-label">Bank Details</label>
                                                <div className="Quotation-bank-details-box">
                                                    <input type="text" className="Quotation-bank-input" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                                                    <input type="text" className="Quotation-bank-input" placeholder="Account No" value={bankDetails.accNo} onChange={(e) => setBankDetails({ ...bankDetails, accNo: e.target.value })} />
                                                    <input type="text" className="Quotation-bank-input" placeholder="Account Holder" value={bankDetails.holderName} onChange={(e) => setBankDetails({ ...bankDetails, holderName: e.target.value })} />
                                                    <input type="text" className="Quotation-bank-input" placeholder="IFSC / Swift" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
                                                </div>
                                                <div className="Quotation-attachments-section mt-4">
                                                    <label className="Quotation-section-label">Attachments</label>
                                                    <div className="Quotation-attachments-row">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            ref={fileInputRef}
                                                            style={{ display: 'none' }}
                                                            onChange={handleFileChange}
                                                        />
                                                        <button className="Quotation-btn-upload-small" onClick={triggerFileInput}>
                                                            <span className="Quotation-icon">📎</span> Attach Files
                                                        </button>
                                                    </div>
                                                    {attachments.length > 0 && (
                                                        <div className="Quotation-attachment-list">
                                                            {attachments.map((file, index) => (
                                                                <div key={index} className="Quotation-attachment-item">
                                                                    <span className="Quotation-attachment-name">{file.name}</span>
                                                                    <button onClick={() => removeAttachment(index)} className="Quotation-btn-remove-file">
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="Quotation-bottom-right-col">
                                            <div className="Quotation-totals-box-container">
                                                <div className="Quotation-totals-box">
                                                    <div className="Quotation-t-row">
                                                        <span>Sub Total:</span>
                                                        <span>{formatCurrency(totals.subTotal)}</span>
                                                    </div>
                                                    <div className="Quotation-t-row">
                                                        <span>Item Discount:</span>
                                                        <span className="text-red-500">-{formatCurrency(totals.discount)}</span>
                                                    </div>
                                                    {/* Overall Discount row */}
                                                    <div className="Quotation-t-row" style={{ alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ whiteSpace: 'nowrap' }}>Overall Discount:</span>
                                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
                                                            <select
                                                                disabled={isViewMode}
                                                                value={overallDiscountType}
                                                                onChange={(e) => setOverallDiscountType(e.target.value)}
                                                                style={{ padding: '2px 4px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', background: '#f8fafc', cursor: 'pointer' }}
                                                            >
                                                                <option value="amount">£</option>
                                                                <option value="percent">%</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                disabled={isViewMode}
                                                                value={overallDiscount}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                                onChange={(e) => {
                                                                    let val = e.target.value;
                                                                    if (typeof val === 'string') {
                                                                        val = val.replace(/-/g, '');
                                                                        if (val !== '') {
                                                                            const parsed = parseFloat(val);
                                                                            if (!isNaN(parsed) && parsed < 0) {
                                                                                val = '0';
                                                                            }
                                                                        }
                                                                    }
                                                                    setOverallDiscount(val);
                                                                }}
                                                                style={{ width: '80px', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', textAlign: 'right' }}
                                                            />
                                                            <span className="text-red-500" style={{ minWidth: '70px', textAlign: 'right', fontSize: '13px' }}>
                                                                -{formatCurrency(totals.overallDiscountAmount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="Quotation-t-row">
                                                        <span>Tax Total:</span>
                                                        <span>{formatCurrency(totals.tax)}</span>
                                                    </div>
                                                    <div className="Quotation-t-row Quotation-total">
                                                        <span>Grand Total:</span>
                                                        <span>{formatCurrency(totals.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="Quotation-bottom-textareas-row">
                                        <div className="Quotation-notes-section my-4">
                                            <label className="Quotation-section-label">Notes</label>
                                            <textarea className="Quotation-notes-area"
                                                disabled={isViewMode}
                                                value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                                        </div>

                                        <div className="Quotation-terms-section my-4">
                                            <label className="Quotation-section-label">Terms & Conditions</label>
                                            <textarea className="Quotation-terms-area"
                                                disabled={isViewMode}
                                                value={terms} onChange={(e) => setTerms(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="Quotation-thank-you-note">
                                        <p>Thank you for your business!</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="Quotation-modal-footer-simple">
                            <button className="Quotation-btn-plain" onClick={() => setShowAddModal(false)}>Close</button>
                            {isViewMode && (
                                <>
                                    {quotations.find(q => q.id === editingId)?.status !== 'CONVERTED' ? (
                                        <button className="Quotation-btn-primary-green" onClick={() => handleConvert(editingId)} style={{ backgroundColor: '#4f46e5' }}>
                                            <ShoppingCart size={18} className="mr-2" /> Convert to Sales Order
                                        </button>
                                    ) : (
                                        <span className="text-sm font-semibold px-3 py-2 bg-gray-100 text-gray-500 rounded mr-2">Already Converted</span>
                                    )}
                                    <button className="Quotation-btn-primary-green" onClick={handlePrint}>
                                        <Printer size={18} className="mr-2" /> Print Quotation
                                    </button>
                                </>
                            )}
                            {!isViewMode && (
                                <button className="Quotation-btn-primary-green" onClick={handleSave}>
                                    {editingId ? 'Update Quotation' : 'Save Quotation'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal - User Design Match */}
            {showDeleteConfirm && (
                <div className="Quotation-modal-overlay">
                    <div className="Quotation-delete-confirmation-box">
                        <div className="Quotation-delete-modal-header">
                            <h3 className="Quotation-delete-modal-title">Delete Quotation?</h3>
                            <button className="Quotation-delete-close-btn" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Quotation-delete-modal-body">
                            <p>Are you sure you want to delete this quotation? This action cannot be undone.</p>
                        </div>
                        <div className="Quotation-delete-modal-footer">
                            <button className="Quotation-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="Quotation-btn-delete-confirm" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Full Add Customer Modal */}
            {showAddCustomerModal && (
                <div className="Customers-modal-overlay">
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
                            <button type="button" className="Customers-btn-save" onClick={handleFullCustomerSubmit}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Add Product Modal */}
            {showAddProductModal && (
                <div className="Zirak-Inventory-modal-overlay">
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
                                        <label className="Zirak-Inventory-form-label">Item Name <span className="Zirak-Inventory-text-red">*</span></label>
                                        <input
                                            name="name" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter item name" required
                                            value={productFormData.name} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">HSN</label>
                                        <input
                                            name="hsn" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter HSN code"
                                            value={productFormData.hsn} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Barcode</label>
                                        <input
                                            name="barcode" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter barcode"
                                            value={productFormData.barcode} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Item Image</label>
                                        <div className="Zirak-Inventory-file-input-wrapper">
                                            <label className="Zirak-Inventory-file-label" style={{ opacity: uploadingImage ? 0.6 : 1, cursor: uploadingImage ? 'not-allowed' : 'pointer' }}>
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
                                        {productFormData.image && (
                                            <div style={{ marginTop: '10px' }}>
                                                <img
                                                    src={productFormData.image}
                                                    alt="Product preview"
                                                    style={{
                                                        maxWidth: '200px',
                                                        maxHeight: '200px',
                                                        objectFit: 'contain',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e5e7eb'
                                                    }}
                                                />
                                            </div>
                                        )}
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
                                                return allUoms
                                                    .filter(u => (u.id === base?.id || u.baseUnitId === base?.id))
                                                    .map(uom => (
                                                        <option key={uom.id} value={uom.id}>
                                                            {uom.unitName} {uom.uomType === 'Compound' ? `(1 ${uom.symbol || uom.unitName} = ${uom.conversionRate} ${base?.symbol || base?.unitName})` : ''}
                                                        </option>
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
                                                return allUoms
                                                    .filter(u => (u.id === base?.id || u.baseUnitId === base?.id))
                                                    .map(uom => (
                                                        <option key={uom.id} value={uom.id}>
                                                            {uom.unitName} {uom.uomType === 'Compound' ? `(1 ${uom.symbol || uom.unitName} = ${uom.conversionRate} ${base?.symbol || base?.unitName})` : ''}
                                                        </option>
                                                    ));
                                            })()}
                                        </select>
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">SKU <span className="Zirak-Inventory-text-red">*</span> </label>
                                        <input
                                            name="sku" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter SKU" required
                                            value={productFormData.sku} onChange={handleProductInputChange}
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

                                <div className="Zirak-Inventory-form-grid">
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">As Of Date</label>
                                        <input
                                            name="asOfDate" type="date" className="Zirak-Inventory-form-input"
                                            value={productFormData.asOfDate} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Tax Account</label>
                                        <input
                                            name="taxAccount" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter tax account"
                                            value={productFormData.taxAccount} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Initial Cost/Unit</label>
                                        <input
                                            name="initialCost" type="number" className="Zirak-Inventory-form-input"
                                            step="0.01" value={productFormData.initialCost} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Sale Price (Exclusive)</label>
                                        <input
                                            name="salePrice" type="number" className="Zirak-Inventory-form-input"
                                            step="0.01" value={productFormData.salePrice} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Purchase Price (Inclusive)</label>
                                        <input
                                            name="purchasePrice" type="number" className="Zirak-Inventory-form-input"
                                            step="0.01" value={productFormData.purchasePrice} onChange={handleProductInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Discount %</label>
                                        <input
                                            name="discount" type="number" className="Zirak-Inventory-form-input"
                                            value={productFormData.discount} onChange={handleProductInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="Zirak-Inventory-form-group Zirak-Inventory-full-width">
                                    <label className="Zirak-Inventory-form-label">Remarks</label>
                                    <input
                                        name="remarks" type="text" className="Zirak-Inventory-form-input"
                                        placeholder="Enter remarks"
                                        value={productFormData.remarks} onChange={handleProductInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Inventory-modal-footer">
                                <button type="button" className="Zirak-Inventory-btn-cancel" onClick={() => setShowAddProductModal(false)}>Cancel</button>
                                <button type="submit" className="Zirak-Inventory-btn-submit">Add</button>
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
        </div>
    );
};

export default Quotation;
