import React, { useState, useEffect, useRef } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, ArrowLeft, Download, Send, Printer, Eye, AlertTriangle,
    User, MapPin, Mail, Phone, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './PurchaseQuotation.css';
import '../../Sales/Invoice/Invoice.css';
import purchaseQuotationService from '../../../../services/purchaseQuotationService';
import vendorService from '../../../../services/vendorService';
import productService from '../../../../api/productService'; // Adjust path if needed
import warehouseService from '../../../../api/warehouseService'; // Adjust path if needed
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { BASE_URL } from '../../../../api/axiosInstance';
import uomService from '../../../../services/uomService';
import '../../Vendors/Vendors.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import axiosInstance from '../../../../api/axiosInstance';
import { Upload, Loader2 } from 'lucide-react';

const PurchaseQuotation = () => {
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
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Full Add Vendor & Product Modal States
    const [showAddVendorModal, setShowAddVendorModal] = useState(false);
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    
    // Vendor Modal States
    const [vendorFormData, setVendorFormData] = useState({
        name: '',
        nameArabic: '',
        companyName: '',
        companyLocation: '',
        profileImage: '',
        anyFile: '',
        accountType: 'Credit',
        balanceType: 'Credit', // Default to Credit for Vendors
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
    const location = useLocation();
    const targetQuotationId = location.state?.targetQuotationId;
    const navigate = useNavigate();

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: '', address: '', email: '', phone: '', logo: '', notes: '', terms: '', termsPurchase: ''
    });
    const [quotationMeta, setQuotationMeta] = useState({
        quotationNumber: '', manualReference: '', date: new Date().toISOString().split('T')[0], expiryDate: ''
    });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRefToRetry, setDuplicateRefToRetry] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [vendorDetails, setVendorDetails] = useState({ address: '', email: '', phone: '' });
    const [items, setItems] = useState([
        { id: Date.now(), productId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
    ]);

    useEffect(() => {
        if (vendorId && vendors.length > 0) {
            const v = vendors.find(vend => String(vend.id) === String(vendorId));
            if (v) {
                const fullAddr = [v.billingAddress || v.address, v.billingCity || v.city, v.billingState || v.state, v.billingZipCode || v.zipCode, v.billingCountry || v.country].filter(Boolean).join(', ');
                setVendorDetails({
                    address: fullAddr || v.address || '',
                    email: v.email || '',
                    phone: v.phone || ''
                });
            }
        } else {
            setVendorDetails({ address: '', email: '', phone: '' });
        }
    }, [vendorId, vendors]);
    const [allUoms, setAllUoms] = useState([]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('percentage');
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PurchaseQuotation_${quotationMeta.quotationNumber || 'New'}`,
    });

    useEffect(() => {
        fetchInitialData();
        fetchQuotations();
    }, []);

    useEffect(() => {
        if (targetQuotationId && quotations.length > 0) {
            if (location.state?.isEdit || location.state?.autoEdit) {
                handleEdit(targetQuotationId);
            } else {
                handleView(targetQuotationId);
            }
            // Clear navigation state
            navigate(location.pathname, { replace: true, state: { ...location.state, targetQuotationId: undefined } });
        }
    }, [targetQuotationId, quotations]);

    // Fetch next PQ number when modal opens
    useEffect(() => {
        const loadNextNo = async () => {
            if (showAddModal && !editingId) {
                try {
                    const companyId = GetCompanyId();
                    if (companyId) {
                        const res = await companyService.getNextNumber(companyId, 'purchasequotation');
                        if (res.data.success) {
                            const nextRef = res.data.nextManualReference || res.data.details?.nextManualReference || '';
                            setQuotationMeta(prev => ({
                                ...prev,
                                quotationNumber: res.data.nextNumber,
                                manualReference: nextRef || prev.manualReference || ''
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error fetching next PQ number:', error);
                }
            }
        };
        loadNextNo();
    }, [showAddModal, editingId]);

    const fetchInitialData = async () => {
        try {
            const companyId = GetCompanyId();

            const promises = [
                vendorService.getAllVendors(companyId),
                productService.getProducts(companyId),
                warehouseService.getWarehouses(companyId),
                uomService.getUOMs(companyId),
                categoryService.getCategories(companyId).catch(() => ({ success: false, data: [] }))
            ];

            if (companyId) {
                promises.push(companyService.getById(companyId));
            }

            const results = await Promise.all(promises);
            const vendorRes = results[0];
            const productRes = results[1];
            const warehouseRes = results[2];
            const uomRes = results[3];
            const categoryRes = results[4];
            const companyRes = results[5];

            // Handle Vendors
            if (vendorRes.success && Array.isArray(vendorRes.data)) {
                setVendors(vendorRes.data);
            } else if (Array.isArray(vendorRes)) {
                setVendors(vendorRes);
            } else if (vendorRes.data && Array.isArray(vendorRes.data)) {
                setVendors(vendorRes.data);
            }

            // Handle Products
            if (productRes.success && Array.isArray(productRes.data)) {
                setProducts(productRes.data);
            } else if (Array.isArray(productRes)) {
                setProducts(productRes);
            } else if (productRes.data && Array.isArray(productRes.data)) {
                setProducts(productRes.data);
            }

            // Handle Warehouses
            if (warehouseRes.success && Array.isArray(warehouseRes.data)) {
                setWarehouses(warehouseRes.data);
            } else if (Array.isArray(warehouseRes)) {
                setWarehouses(warehouseRes);
            } else if (warehouseRes.data && Array.isArray(warehouseRes.data)) {
                setWarehouses(warehouseRes.data);
            }

            // Handle UOMs
            if (uomRes?.data) setAllUoms(uomRes.data);

            // Handle Categories
            if (categoryRes && categoryRes.success) {
                setCategories(categoryRes.data);
            }

            // Handle Company Details
            if (companyRes && (companyRes.data || companyRes.success)) {
                const data = companyRes.data?.data || companyRes.data || companyRes;
                setCompanyDetails({
                    name: data.companyName || data.name || '',
                    address: data.address || '',
                    email: data.companyEmail || data.email || '',
                    phone: data.phone || '',
                    logo: data.logo || null,
                    notes: data.notes || '',
                    terms: data.terms || '',
                    termsPurchase: data.termsPurchase || ''
                });

                setTerms(data.termsPurchase || data.terms || '');
                if (data.notes) setNotes(data.notes);
            }

        } catch (error) {
            console.error("Error fetching dropdowns", error);
            toast.error("Failed to load dropdown data");
        }
    };

    // Full Vendor handlers & submit
    const handleVendorInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setVendorFormData(prev => {
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
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            const res = await axiosInstance.post(`/upload?folder=${folder}`, formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setVendorFormData(prev => ({ ...prev, [field]: res.data.url }));
                toast.success(`${field === 'profileImage' ? 'Profile image' : 'File'} uploaded!`);
            }
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
                setVendorId(added.id);
            }
            
            // Reset vendor form
            setVendorFormData({
                name: '',
                nameArabic: '',
                companyName: '',
                companyLocation: '',
                profileImage: '',
                anyFile: '',
                accountType: 'Credit',
                balanceType: 'Credit',
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
            console.error('Error saving vendor:', error);
            toast.error(error.message || 'Failed to save vendor');
        }
    };

    // Full Product handlers & submit
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
            
            // Refresh products list
            const prodRes = await productService.getProducts(companyId);
            if (prodRes?.success && Array.isArray(prodRes.data)) {
                setProducts(prodRes.data);
            } else if (Array.isArray(prodRes)) {
                setProducts(prodRes);
            } else if (prodRes?.data && Array.isArray(prodRes.data)) {
                setProducts(prodRes.data);
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

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await purchaseQuotationService.getQuotations(companyId);
            if (res.success) {
                setQuotations(res.data);
            }
        } catch (error) {
            console.error("Error fetching quotations", error);
            toast.error("Failed to fetch quotations");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setVendorId('');
        setVendorDetails({ address: '', email: '', phone: '' });
        setQuotationMeta({ quotationNumber: '', manualReference: '', date: new Date().toISOString().split('T')[0], expiryDate: '' });
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
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsPurchase || companyDetails.terms || '');
        setOverallDiscount(0);
        setOverallDiscountType('percentage');
        setCustomFieldValues({});
        setIsViewMode(false);
        setShowAddModal(false);
    };

    const handleView = async (id) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseQuotationService.getQuotationById(id, companyId);
            if (res.success && res.data) {
                const quote = res.data;
                setEditingId(id);
                setVendorId(quote.vendorId);
                setQuotationMeta({
                    quotationNumber: quote.quotationNumber,
                    manualReference: quote.manualReference || '',
                    date: quote.date.split('T')[0],
                    expiryDate: quote.expiryDate ? quote.expiryDate.split('T')[0] : ''
                });
                setNotes(quote.notes || '');
                setTerms(quote.terms || '');
                setOverallDiscount(quote.overallDiscount || 0);
                setOverallDiscountType(quote.overallDiscountType || 'percentage');

                const itemsData = quote.purchasequotationitem || quote.items;
                if (itemsData) {
                    const mappedItems = itemsData.map(i => ({
                        id: i.id || Date.now() + Math.random(),
                        productId: i.productId || '',
                        warehouseId: i.warehouseId || '',
                        qty: i.quantity,
                        uomId: i.uomId || '',
                        rate: i.rate,
                        discount: i.discount,
                        tax: i.taxRate,
                        total: i.amount,
                        description: i.description
                    }));
                    setItems(mappedItems);
                }

                let fieldValues = {};
                if (quote.customFields) {
                    try {
                        fieldValues = typeof quote.customFields === 'string'
                            ? JSON.parse(quote.customFields)
                            : quote.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on view:', e);
                    }
                }
                setCustomFieldValues(fieldValues);

                setIsViewMode(true);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error("Error fetching quotation details", error);
            toast.error("Failed to fetch quotation details");
        }
    };

    const handleAddNew = () => {
        resetForm();
        setEditingId(null);
        setIsViewMode(false);
        setShowAddModal(true);
    };

    const handleEdit = async (id) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseQuotationService.getQuotationById(id, companyId);
            if (res.success && res.data) {
                const quoteToEdit = res.data;
                setEditingId(id);
                setIsViewMode(false);
                setVendorId(quoteToEdit.vendorId);
                setQuotationMeta({
                    quotationNumber: quoteToEdit.quotationNumber,
                    manualReference: quoteToEdit.manualReference || '',
                    date: quoteToEdit.date.split('T')[0],
                    expiryDate: quoteToEdit.expiryDate ? quoteToEdit.expiryDate.split('T')[0] : ''
                });
                setNotes(quoteToEdit.notes || '');
                setTerms(quoteToEdit.terms || '');
                setOverallDiscount(quoteToEdit.overallDiscount || 0);
                setOverallDiscountType(quoteToEdit.overallDiscountType || 'percentage');

                const itemsData = quoteToEdit.purchasequotationitem || quoteToEdit.items;
                if (itemsData) {
                    const mappedItems = itemsData.map(i => ({
                        id: i.id || Date.now() + Math.random(),
                        productId: i.productId || '',
                        warehouseId: i.warehouseId || '',
                        qty: i.quantity,
                        uomId: i.uomId || '',
                        rate: i.rate,
                        discount: i.discount,
                        tax: i.taxRate,
                        total: i.amount,
                        description: i.description
                    }));
                    setItems(mappedItems);
                }

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
                setCustomFieldValues(fieldValues);

                setShowAddModal(true);
            }
        } catch (error) {
            console.error("Error fetching quotation details", error);
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
            await purchaseQuotationService.deleteQuotation(deleteId, companyId);
            toast.success("Quotation deleted");
            fetchQuotations();
        } catch (error) {
            toast.error(error.message || "Failed to delete");
        } finally {
            setShowDeleteConfirm(false);
            setDeleteId(null);
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
            const response = await purchaseQuotationService.updateQuotation(quotationId, payload, companyId);
            if (response?.success || response?.data?.success) {
                fetchQuotations();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    

    const handleConvert = async (id) => {
        try {
            const companyId = GetCompanyId();
            const response = await purchaseQuotationService.convertQuotation(id, companyId);
            if (response.success) {
                toast.success('Converted to Purchase Order successfully');
                setShowAddModal(false);
                navigate('/company/purchases/order', { state: { targetOrderId: response.data.id } });
            } else {
                toast.error(response.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting quotation:', error);
            toast.error(error.response?.data?.message || error.message || 'Error converting quotation');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // --- Filter Logic ---
    const filteredQuotations = React.useMemo(() => {
        return quotations.filter(q => {
            const query = searchTerm.toLowerCase();
            const matchesSearch = !query ||
                q.quotationNumber?.toLowerCase().includes(query) ||
                q.vendor?.name?.toLowerCase().includes(query);

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
        const totals = calculateTotals();

        if (!vendorId) {
            toast.error("Please select a vendor");
            return;
        }

        const companyId = GetCompanyId();
        const payload = {
            companyId,
            quotationNumber: quotationMeta.quotationNumber || `PQ-${Date.now()}`,
            manualReference: overrideManualRef !== null ? overrideManualRef : (quotationMeta.manualReference || ''),
            date: quotationMeta.date,
            expiryDate: quotationMeta.expiryDate,
            vendorId: parseInt(vendorId),
            items: items.map(item => ({
                productId: parseInt(item.productId),
                warehouseId: item.warehouseId ? parseInt(item.warehouseId) : null,
                description: item.description,
                quantity: parseFloat(item.qty),
                rate: parseFloat(item.rate),
                discount: parseFloat(item.discount),
                taxRate: parseFloat(item.tax),
                uomId: item.uomId ? parseInt(item.uomId) : null
            })),
            notes,
            terms,
            overallDiscount: overallDiscount,
            overallDiscountType: overallDiscountType,
            attachments: '', // Placeholder for attachments string if implemented
            customFields: JSON.stringify(customFieldValues),
            allowDuplicateManualNo: allowDuplicate === true
        };

        try {
            if (editingId) {
                await purchaseQuotationService.updateQuotation(editingId, { ...payload, status: 'DRAFT' }); // Pass status if needed
                toast.success("Quotation updated");
            } else {
                await purchaseQuotationService.createQuotation(payload);
                toast.success("Quotation created");
            }
            setShowAddModal(false);
            fetchQuotations();
        } catch (error) {
            if (error.response?.data?.isDuplicateWarning || error.response?.data?.isDuplicate) {
                const currentRef = overrideManualRef !== null ? overrideManualRef : (quotationMeta.manualReference || '');
                setDuplicateRefToRetry(currentRef);
                setShowDuplicateModal(true);
            } else {
                console.error(error);
                toast.error(error.response?.data?.message || error.message || "Failed to save");
            }
        }
    };

    // --- Calculation Helpers ---
    const handleTopItemSelect = (val) => {
        if (!val) return;
        const cleanId = String(val).replace(/^[ps]-/, '');
        const product = products.find(p => String(p.id) === cleanId);
        if (!product) return;

        const emptyItemIndex = items.findIndex(i => !i.productId);
        if (emptyItemIndex !== -1) {
            updateItem(items[emptyItemIndex].id, 'productId', cleanId);
        } else {
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
            const newItem = {
                id: Date.now(),
                productId: cleanId,
                warehouseId: defWarehouseId,
                qty: 1,
                uomId: product.purchaseUomId || product.uomId || '',
                rate: product.purchasePrice || product.initialCost || 0,
                tax: product.tax || 0,
                discount: 0,
                total: product.purchasePrice || product.initialCost || 0,
                description: ''
            };
            setItems(prev => [...prev, newItem]);
        }
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

                let updatedItem = { ...item, [field]: processedValue };

                if (field === 'productId') {
                    const prod = products.find(p => p.id === parseInt(processedValue));
                    if (prod) {
                        updatedItem.rate = prod.purchasePrice || 0;
                        updatedItem.tax = 0;
                        updatedItem.description = prod.description || '';
                        updatedItem.uomId = prod.purchaseUomId || prod.uomId || '';
                    }
                }

                if (['qty', 'rate', 'tax', 'discount'].includes(field) || field === 'productId') {
                    const qty = parseFloat(updatedItem.qty) || 0;
                    const rate = parseFloat(updatedItem.rate) || 0;
                    const tax = parseFloat(updatedItem.tax) || 0;
                    const discount = parseFloat(updatedItem.discount) || 0;

                    const subtotal = qty * rate;
                    const discountAmount = discount; // assuming fixed discount, not percentage. logic can vary.
                    const taxable = subtotal - discountAmount;
                    const taxAmount = (taxable * tax) / 100;

                    updatedItem.total = taxable + taxAmount;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const calculateTotals = () => {
        const totals = items.reduce((acc, item) => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const discount = parseFloat(item.discount) || 0;
            const subtotal = qty * rate;
            const tax = parseFloat(item.tax) || 0;
            const taxable = subtotal - discount;
            const taxAmount = (taxable * tax) / 100;

            acc.subTotal += subtotal;
            acc.discount += discount;
            acc.total += item.total;
            acc.tax += taxAmount;
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

    const purchaseProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'active' },
        { id: 'purchase-order', label: 'Purchase Order', icon: ShoppingCart, status: 'pending' },
        { id: 'grn', label: 'Goods Receipt', icon: Truck, status: 'pending' },
        { id: 'bill', label: 'Bill', icon: Receipt, status: 'pending' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    return (
        <div className="PurchaseQuotation-page">
            {!(showAddModal || isViewMode) && (
                <>
                    <div className="PurchaseQuotation-header">
                        <div>
                            <h1 className="PurchaseQuotation-title">Purchase Quotation</h1>
                            <p className="PurchaseQuotation-subtitle">Manage purchase quotations from vendors</p>
                        </div>
                        {hasPermission('create purchase quotation') && (
                            <button className="PurchaseQuotation-btn-add" onClick={handleAddNew}>
                                <Plus size={18} className="mr-2" /> Create Quotation
                            </button>
                        )}
                    </div>

                    <div className="PurchaseQuotation-tracker-card">
                        <div className="PurchaseQuotation-tracker-wrapper">
                            {purchaseProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`purchase-module-tracker-step ${step.status}`}>
                                        <div className="PurchaseQuotation-step-icon">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="PurchaseQuotation-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="PurchaseQuotation-status-badge" size={14} />}
                                        </div>
                                        <span className="PurchaseQuotation-step-label">{step.label}</span>
                                    </div>
                                    {index < purchaseProcess.length - 1 && (
                                        <div className={`purchase-module-tracker-divider ${purchaseProcess[index + 1].status !== 'pending' ? 'active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="PurchaseQuotation-table-card mt-6">
                        <div className="PurchaseQuotation-table-controls p-4 border-b flex justify-between items-center gap-4 flex-wrap">
                            <div className="PurchaseQuotation-search-wrapper">
                                <Search className="PurchaseQuotation-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by vendor or quotation #..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="PurchaseQuotation-search-input"
                                />
                            </div>
                            <div className="PurchaseQuotation-date-filters flex items-center gap-4">
                                <div>
                                    <span className="text-xs text-gray-500 mr-2">From:</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="PurchaseQuotation-date-input"
                                    />
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 mr-2">To:</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="PurchaseQuotation-date-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="PurchaseQuotation-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Quotation #</th>
                                        <th>Manual Ref</th>
                                        <th>Vendor</th>
                                        <th>Valid Till</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuotations.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                No purchase quotations found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredQuotations.map((q) => {
                                            const isConverted = q.status === 'CONVERTED' || (Array.isArray(q.purchaseorder) ? q.purchaseorder.length > 0 : !!q.purchaseorder);
                                            return (
                                                <tr key={q.id}>
                                                    <td>{q.date ? new Date(q.date).toLocaleDateString() : 'N/A'}</td>
                                                    <td style={{ fontWeight: '600', color: '#1e293b' }}>{q.quotationNumber}</td>
                                                    <td>{q.manualReference || '-'}</td>
                                                    <td>{q.vendor?.name || 'N/A'}</td>
                                                    <td>{q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : '-'}</td>
                                                    <td style={{ fontWeight: '600' }}>{formatCurrency(q.totalAmount)}</td>
                                                    <td>
                                                        <span className={`PurchaseQuotation-status-pill ${(q.status || 'open').toLowerCase()}`}>
                                                            {q.status || 'OPEN'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                            <button className="PurchaseQuotation-action-btn view" onClick={() => handleView(q.id)} title="View"><Eye size={16} /></button>
                                                            {!isConverted ? (
                                                                <button className="PurchaseQuotation-action-btn convert" onClick={() => handleConvert(q.id)} title="Convert to Purchase Order" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '6px', borderRadius: '4px' }}><ShoppingCart size={16} /></button>
                                                            ) : (
                                                                <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1" title="Converted to Purchase Order" style={{ alignSelf: 'center' }}>
                                                                    <CheckCircle2 size={12} /> Converted
                                                                </span>
                                                            )}
                                                            {hasPermission('edit purchase quotation') && (
                                                                <button className="PurchaseQuotation-action-btn edit" onClick={() => handleEdit(q.id)}><Pencil size={16} /></button>
                                                            )}
                                                            {hasPermission('delete purchase quotation') && (
                                                                <button className="PurchaseQuotation-action-btn delete" onClick={() => handleDelete(q.id)}><Trash2 size={16} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Premium Create Full Page View */}
            {(showAddModal || isViewMode) && (
                <div className="PurchaseQuotation-full-page-create">
                    <div className="PurchaseQuotation-view-page-header PurchaseQuotation-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {isViewMode ? 'View Purchase Quotation' : editingId ? 'Edit Purchase Quotation' : 'New Purchase Quotation'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button className="PurchaseQuotation-btn-back" onClick={handlePrint} style={{ backgroundColor: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}>
                                    <Printer size={16} /> Print Quotation
                                </button>
                            )}
                            <button className="PurchaseQuotation-btn-back" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Purchase Quotations
                            </button>
                        </div>
                    </div>

                    <div className="PurchaseQuotation-modal-content PurchaseQuotation-form-modal">
                        <div className="PurchaseQuotation-body-scrollable" ref={printRef}>
                            {isViewMode ? (
                                <div className="PurchaseQuotation-view-document">
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
                                                            <img
                                                                src={companySettings?.invoiceLogo || (companyDetails.logo.startsWith('http') ? companyDetails.logo : `${BASE_URL}/${companyDetails.logo.replace(/\\/g, '/')}`)}
                                                                alt="Company Logo"
                                                                className="invoice-logo-large"
                                                                style={{ margin: '0' }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="invoice-header-right">
                                                        <div className="invoice-title-large" style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0' }}>{getDocumentTitle('purchasequotation')}</div>
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
                                                                <span className="invoice-label">Quotation No:</span>
                                                                <span>#{quotationMeta.quotationNumber}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Manual Ref:</span>
                                                                <span>{quotationMeta.manualReference || 'N/A'}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Date:</span>
                                                                <span>{quotationMeta.date}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Valid Till:</span>
                                                                <span>{quotationMeta.expiryDate || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Vendor Details Row (BILL TO & SHIP TO / DELIVERY ADDRESS) */}
                                        <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '2.5rem', gap: '3rem' }}>
                                            <div className="invoice-bill-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                <div className="invoice-section-header">{getInvoiceLabel('billTo')}</div>
                                                <div className="font-bold text-gray-800" style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{vendors.find(v => String(v.id) === String(vendorId))?.name || 'N/A'}</div>
                                                <div className="invoice-company-details">
                                                    <p style={{ margin: '2px 0' }}><strong>Address:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.billingAddress || vendors.find(v => String(v.id) === String(vendorId))?.address || 'N/A'}</p>
                                                    <p style={{ margin: '2px 0' }}><strong>Email:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.email || 'N/A'}</p>
                                                    <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.phone || 'N/A'}</p>
                                                </div>
                                            </div>

                                            <div className="invoice-ship-to" style={{ flex: 1, textAlign: 'right', minWidth: '0' }}>
                                                <div className="invoice-section-header">{getInvoiceLabel('shipTo') || 'SHIP TO:'}</div>
                                                <div className="font-bold text-gray-800" style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{vendors.find(v => String(v.id) === String(vendorId))?.name || 'N/A'}</div>
                                                <div className="invoice-company-details">
                                                    <p style={{ margin: '2px 0' }}><strong>Address:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.shippingAddress || vendors.find(v => String(v.id) === String(vendorId))?.billingAddress || vendors.find(v => String(v.id) === String(vendorId))?.address || 'N/A'}</p>
                                                    <p style={{ margin: '2px 0' }}><strong>Email:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.email || 'N/A'}</p>
                                                    <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.phone || 'N/A'}</p>
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
                                                    console.error('Error parsing purchase quotation custom fields for view:', e);
                                                }
                                            }
                                            const fieldsList = getCustomFieldsForType('purchasequotation');
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

                                        {/* Line Items Table */}
                                        <div className="invoice-table-container" style={{ marginTop: '2rem' }}>
                                            <table className="invoice-table-preview" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid var(--header-bg, #004aad)' }}>
                                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', width: '5%' }}>#</th>
                                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', width: '35%' }}>{getTableHeader('item', 'Item Detail').toUpperCase()}</th>
                                                        {getInvoiceLabel('showWarehouse') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', width: '12%' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showQty') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '8%' }}>{getTableHeader('quantity', 'Qty').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showUom') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '8%' }}>UOM</th>}
                                                        {getInvoiceLabel('showRate') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '12%' }}>{getTableHeader('rate', 'Rate').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showTax') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '10%' }}>{getTableHeader('tax', 'Tax %').toUpperCase()}</th>}
                                                        {getInvoiceLabel('showDiscount') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '10%' }}>{getTableHeader('discount', 'Discount').toUpperCase()}</th>}
                                                        <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'right', width: '12%' }}>{getTableHeader('price', 'Amount').toUpperCase()}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((item, idx) => (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                                                            <td>{idx + 1}</td>
                                                            <td>
                                                                <span className="font-bold text-sm text-gray-800 block">
                                                                    {item.productId ? products.find(p => p.id === parseInt(item.productId))?.name : 'N/A'}
                                                                </span>
                                                                {item.description && <span className="text-xs text-gray-500 block mt-0.5">{item.description}</span>}
                                                            </td>
                                                            {getInvoiceLabel('showWarehouse') !== false && <td>{warehouses.find(w => w.id === parseInt(item.warehouseId))?.name || 'N/A'}</td>}
                                                            {getInvoiceLabel('showQty') !== false && <td style={{ textAlign: 'right' }}>{item.qty}</td>}
                                                            {getInvoiceLabel('showUom') !== false && <td style={{ textAlign: 'right' }}>{allUoms.find(u => u.id === parseInt(item.uomId))?.unitName || ''}</td>}
                                                            {getInvoiceLabel('showRate') !== false && <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>}
                                                            {getInvoiceLabel('showTax') !== false && <td style={{ textAlign: 'right' }}>{item.tax}%</td>}
                                                            {getInvoiceLabel('showDiscount') !== false && <td style={{ textAlign: 'right' }}>{formatCurrency(item.discount)}</td>}
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.total || 0)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Bottom section (Bank Details, Notes & Totals) */}
                                        <div className="invoice-total-section" style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', marginTop: '2rem' }}>
                                            <div className="invoice-notes-bank" style={{ flex: 1 }}>
                                                <div className="invoice-bank-details" style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#1e293b' }}>
                                                    <div className="invoice-section-header" style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>BANK DETAILS</div>
                                                    {vendorId ? (
                                                        <>
                                                            <p style={{ margin: '2px 0' }}><strong>Bank Name:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.bankNameBranch || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>Account No:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.bankAccountNumber || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>IFSC / Swift:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.bankIFSC || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>Account Holder:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.accountName || 'N/A'}</p>
                                                        </>
                                                    ) : (
                                                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No vendor selected</p>
                                                    )}
                                                </div>

                                                {notes && (
                                                    <div className="invoice-notes" style={{ marginTop: '50px', marginBottom: '1.5rem' }}>
                                                        <div className="invoice-section-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>NOTES</div>
                                                        <p style={{ color: '#64748b', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{notes}</p>
                                                    </div>
                                                )}

                                                {terms && (
                                                    <div className="invoice-terms">
                                                        <div className="invoice-section-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>TERMS &amp; CONDITIONS</div>
                                                        <p style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{terms}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="invoice-totals" style={{ width: '320px', minWidth: '320px' }}>
                                                <div className="invoice-total-row">
                                                    <span className="invoice-label">Sub Total:</span>
                                                    <span>{formatCurrency(totalsData.subTotal)}</span>
                                                </div>
                                                <div className="invoice-total-row" style={{ color: '#ef4444' }}>
                                                    <span className="invoice-label">Discount:</span>
                                                    <span>-{formatCurrency(totalsData.discount + totalsData.ovDiscountAmt)}</span>
                                                </div>
                                                <div className="invoice-total-row">
                                                    <span className="invoice-label">Tax Total:</span>
                                                    <span>{formatCurrency(totalsData.tax)}</span>
                                                </div>
                                                <div className="invoice-final-total">
                                                    <span>Grand Total:</span>
                                                    <span>{formatCurrency(totalsData.finalTotal)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {getInvoiceLabel('showFooter') !== false && (
                                            <div className="invoice-thank-you" style={{ textAlign: 'center', marginTop: '3rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', fontStyle: 'italic', color: '#64748b' }}>
                                                Thank you for your business!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="PurchaseQuotation-create-edit-form">
                                    {/* 2-Column Voucher Header Grid (Left: Voucher Metadata, Right: Vendor Info) */}
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
                                                    value={quotationMeta.quotationNumber || ''}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, quotationNumber: e.target.value })}
                                                    disabled={isViewMode || !!editingId}
                                                    style={{ width: '100%', maxWidth: '320px' }}
                                                    className={`PurchaseQuotation-meta-input ${isViewMode || editingId ? 'PurchaseQuotation-disabled' : ''}`}
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
                                                    value={quotationMeta.manualReference}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, manualReference: e.target.value })}
                                                    style={{ width: '100%', maxWidth: '320px' }}
                                                    className="PurchaseQuotation-meta-input"
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
                                                    style={{ width: '100%', maxWidth: '320px' }}
                                                    className="PurchaseQuotation-meta-input"
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                    VALID TILL
                                                </label>
                                                <input
                                                    type="date"
                                                    disabled={isViewMode}
                                                    value={quotationMeta.expiryDate}
                                                    onChange={(e) => setQuotationMeta({ ...quotationMeta, expiryDate: e.target.value })}
                                                    style={{ width: '100%', maxWidth: '320px' }}
                                                    className="PurchaseQuotation-meta-input"
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: Vendor Details */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginLeft: 'auto', width: '100%', maxWidth: '320px' }}>
                                            <div>
                                                <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                    <Building2 size={14} className="text-indigo-500" /> QUOTATION FROM / VENDOR <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
                                                    <select
                                                        className="PurchaseQuotation-form-select-compact PurchaseQuotation-vendor-select"
                                                        disabled={isViewMode}
                                                        value={vendorId}
                                                        onChange={(e) => setVendorId(e.target.value)}
                                                        style={{ flex: 1, height: '38px', padding: '4px 12px', fontSize: '0.875rem', lineHeight: '1.4', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                                                    >
                                                        <option value="">Select Vendor...</option>
                                                        {vendors.map(v => (
                                                            <option key={v.id} value={v.id}>
                                                                {v.name} {v.companyName ? `(${v.companyName})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {!isViewMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddVendorModal(true)}
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
                                                            title="Add Vendor"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                                {vendorId && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.75rem', width: '100%', maxWidth: '320px' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <MapPin size={13} className="text-indigo-500" /> Billing / Shipping Address
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="Billing / Shipping Address"
                                                                className="PurchaseQuotation-detail-input-compact"
                                                                disabled={isViewMode}
                                                                value={vendorDetails.address}
                                                                onChange={(e) => setVendorDetails({ ...vendorDetails, address: e.target.value })}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <Mail size={13} className="text-emerald-500" /> Email Address
                                                            </label>
                                                            <input
                                                                type="email"
                                                                placeholder="Email Address"
                                                                className="PurchaseQuotation-detail-input-compact"
                                                                disabled={isViewMode}
                                                                value={vendorDetails.email}
                                                                onChange={(e) => setVendorDetails({ ...vendorDetails, email: e.target.value })}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                                <Phone size={13} className="text-amber-500" /> Phone Number
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                placeholder="Phone Number"
                                                                className="PurchaseQuotation-detail-input-compact"
                                                                disabled={isViewMode}
                                                                value={vendorDetails.phone}
                                                                onChange={(e) => setVendorDetails({ ...vendorDetails, phone: e.target.value })}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                      {/* Custom Fields Section */}
                                      {getCustomFieldsForType('purchasequotation').length > 0 && (
                                        <div className="PurchaseQuotation-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                                Custom Fields
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                {getCustomFieldsForType('purchasequotation').map(field => (
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

                                    {/* Items Table */}
                                     <div className="PurchaseQuotation-items-section-new">
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '60px' , marginBottom: '15px' }}>
                                             <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e293b', letterSpacing: '0.05em', margin: 0 }}>
                                                 LINE ITEMS
                                             </h3>
                                             {!isViewMode && (
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                     <div style={{ width: '260px' }}>
                                                         <SearchableSelect
                                                             options={products.map(p => ({
                                                                 ...p,
                                                                 id: `p-${p.id}`,
                                                                 name: `${p.name} (${p.totalQuantity ?? 0})`
                                                             }))}
                                                             value=""
                                                             onChange={(val) => handleTopItemSelect(val)}
                                                             placeholder="Type item name/SKU & press Enter..."
                                                             searchPlaceholder="Search product..."
                                                             labelKey="name"
                                                             valueKey="id"
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
                                         <div className="PurchaseQuotation-table-responsive">
                                             <table className="PurchaseQuotation-new-items-table">
                                                 <thead>
                                                     <tr>
                                                         <th style={{ width: '22%' }}>{getTableHeader('item', 'ITEM').toUpperCase()}</th>
                                                         {getInvoiceLabel('showWarehouse') !== false && <th style={{ width: '15%' }}>{getTableHeader('warehouse', 'WAREHOUSE').toUpperCase()}</th>}
                                                         {getInvoiceLabel('showQty') !== false && <th style={{ width: '8%' }}>{getTableHeader('quantity', 'QUANTITY').toUpperCase()}</th>}
                                                         {getInvoiceLabel('showUom') !== false && <th style={{ width: '8%' }}>UOM</th>}
                                                         {getInvoiceLabel('showRate') !== false && <th style={{ width: '12%' }}>{getTableHeader('rate', 'RATE').toUpperCase()}</th>}
                                                         {getInvoiceLabel('showTax') !== false && <th style={{ width: '10%' }}>{getTableHeader('tax', 'TAX (%)').toUpperCase()}</th>}
                                                         {getInvoiceLabel('showDiscount') !== false && <th style={{ width: '10%' }}>{getTableHeader('discount', 'DISCOUNT').toUpperCase()}</th>}
                                                         <th style={{ width: '12%' }}>{getTableHeader('price', 'PRICE').toUpperCase()}</th>
                                                         <th style={{ width: '5%' }}></th>
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
                                                                          clearable={false}
                                                                      />
                                                                  </td>
                                                              )}
                                                             {getInvoiceLabel('showQty') !== false && (
                                                                 <td>
                                                                     <input type="number" className="PurchaseQuotation-qty-input" value={item.qty}
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
                                                                     {item.productId ? (
                                                                         <select className="PurchaseQuotation-full-width-input" value={item.uomId}
                                                                             disabled={isViewMode}
                                                                             onChange={(e) => updateItem(item.id, 'uomId', e.target.value)}>
                                                                             <option value="">UOM...</option>
                                                                             {allUoms
                                                                                 .filter(u => {
                                                                                     const prod = products.find(p => p.id === parseInt(item.productId));
                                                                                     return u.category === prod?.uom?.category || u.category === prod?.purchaseUom?.category || u.id === prod?.uomId || u.id === prod?.purchaseUomId;
                                                                                 })
                                                                                 .map(u => (
                                                                                     <option key={u.id} value={u.id}>{u.unitName}</option>
                                                                                 ))
                                                                             }
                                                                         </select>
                                                                     ) : (
                                                                         <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>N/A</span>
                                                                     )}
                                                                 </td>
                                                             )}
                                                             {getInvoiceLabel('showRate') !== false && (
                                                                 <td>
                                                                     <input type="number" className="PurchaseQuotation-rate-input" value={item.rate}
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
                                                                     <input type="number" className="PurchaseQuotation-tax-input" value={item.tax}
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
                                                                     <input type="number" className="PurchaseQuotation-discount-input" value={item.discount}
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
                                                                 <input type="text" className="PurchaseQuotation-amount-input PurchaseQuotation-disabled" value={formatCurrency(item.total)} disabled />
                                                             </td>
                                                             <td className="PurchaseQuotation-text-center">
                                                                 <button className="PurchaseQuotation-btn-delete-row" onClick={() => removeItem(item.id)}>
                                                                     <Trash2 size={16} />
                                                                 </button>
                                                             </td>
                                                         </tr>
                                                     ))}
                                                 </tbody>
                                             </table>
                                         </div>
                                     </div>

                                     {/* Footer Section containing Bank Details & Totals side-by-side */}
                                     <div className="PurchaseQuotation-footer-grid">
                                         <div className="PurchaseQuotation-bank-details-box">
                                             <h4 className="PurchaseQuotation-section-label">Bank Details</h4>
                                             {vendorId ? (
                                                 <div className="PurchaseQuotation-bank-info-content">
                                                     <p className="PurchaseQuotation-bank-row">
                                                         <span className="font-semibold">Bank Name:</span>
                                                         <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankNameBranch || 'N/A'}</span>
                                                     </p>
                                                     <p className="PurchaseQuotation-bank-row">
                                                         <span className="font-semibold">Account No:</span>
                                                         <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankAccountNumber || 'N/A'}</span>
                                                     </p>
                                                     <p className="PurchaseQuotation-bank-row">
                                                         <span className="font-semibold">IFSC / Swift:</span>
                                                         <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankIFSC || 'N/A'}</span>
                                                     </p>
                                                     <p className="PurchaseQuotation-bank-row">
                                                         <span className="font-semibold">Account Holder:</span>
                                                         <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.accountName || 'N/A'}</span>
                                                     </p>
                                                 </div>
                                             ) : (
                                                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                                                     <p className="text-xs text-gray-400 italic" style={{ margin: 0 }}>No vendor selected</p>
                                                 </div>
                                             )}
                                         </div>
                                         <div className="PurchaseQuotation-totals-box">
                                             <div className="PurchaseQuotation-t-row">
                                                 <span>Sub Total:</span>
                                                 <span>{formatCurrency(totalsData.subTotal)}</span>
                                             </div>
                                             <div className="PurchaseQuotation-t-row">
                                                 <span>Discount:</span>
                                                 <span className="PurchaseQuotation-text-red-500">-{formatCurrency(totalsData.discount)}</span>
                                             </div>
                                             <div className="PurchaseQuotation-t-row">
                                                 <span>Tax Total:</span>
                                                 <span>{formatCurrency(totalsData.tax)}</span>
                                             </div>

                                             <div className="PurchaseQuotation-t-row PurchaseQuotation-overall-discount-row">
                                                 <span>Overall Discount:</span>
                                                 <div className="PurchaseQuotation-discount-group">
                                                     <input
                                                         type="number"
                                                         min="0"
                                                         onKeyDown={(e) => {
                                                             if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                 e.preventDefault();
                                                             }
                                                         }}
                                                         value={overallDiscount}
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
                                                     />
                                                     <select
                                                         value={overallDiscountType}
                                                         onChange={(e) => setOverallDiscountType(e.target.value)}
                                                     >
                                                         <option value="percentage">%</option>
                                                         <option value="fixed">Fixed</option>
                                                     </select>
                                                 </div>
                                             </div>

                                             <div className="PurchaseQuotation-t-row PurchaseQuotation-total">
                                                 <span>Grand Total:</span>
                                                 <span>{formatCurrency(totalsData.finalTotal)}</span>
                                             </div>
                                         </div>
                                     </div>

                                    {/* Notes & Terms at bottom */}
                                    <div className="PurchaseQuotation-bottom-textareas-row">
                                        <div className="PurchaseQuotation-notes-section my-4">
                                            <label className="PurchaseQuotation-section-label">Notes</label>
                                            <textarea className="PurchaseQuotation-notes-area" placeholder="Enter notes..."
                                                value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                                        </div>

                                        <div className="PurchaseQuotation-terms-section my-4">
                                            <label className="PurchaseQuotation-section-label">Terms & Conditions</label>
                                            <textarea className="PurchaseQuotation-terms-area" placeholder="Enter terms..."
                                                value={terms} onChange={(e) => setTerms(e.target.value)}></textarea>
                                        </div>
                                    </div>

                                    {/* Attachments Section */}
                                    <div className="PurchaseQuotation-attachments-section my-4">
                                        <label className="PurchaseQuotation-section-label">Attachments</label>
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleFileChange}
                                        />
                                        <button className="PurchaseQuotation-btn-upload-small" onClick={() => fileInputRef.current.click()}>
                                            <FileText size={14} /> Attach Files
                                        </button>

                                        {files.length > 0 && (
                                            <div className="PurchaseQuotation-attachment-list">
                                                {files.map((file, index) => (
                                                    <div key={index} className="PurchaseQuotation-attachment-item">
                                                        <span className="PurchaseQuotation-attachment-name">{file.name}</span>
                                                        <button onClick={() => removeFile(index)} className="PurchaseQuotation-btn-remove-file">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="PurchaseQuotation-footer-simple">
                            <button className="PurchaseQuotation-btn-plain" onClick={() => setShowAddModal(false)}>
                                {isViewMode ? 'Close' : 'Cancel'}
                            </button>
                            {isViewMode && (
                                <>
                                    {quotations.find(q => q.id === editingId)?.status !== 'CONVERTED' ? (
                                        <button className="PurchaseQuotation-btn-primary-green" onClick={() => handleConvert(editingId)} style={{ backgroundColor: '#4f46e5' }}>
                                            <ShoppingCart size={18} className="mr-2" /> Convert to Purchase Order
                                        </button>
                                    ) : (
                                        <span className="text-sm font-semibold px-3 py-2 bg-gray-100 text-gray-500 rounded mr-2">Already Converted</span>
                                    )}
                                    <button className="PurchaseQuotation-btn-primary-green" onClick={handlePrint}>
                                        <Printer size={18} className="mr-2" /> Print Quotation
                                    </button>
                                </>
                            )}
                            {!isViewMode && (
                                <button className="PurchaseQuotation-btn-primary-green" onClick={handleSave}>
                                    {editingId ? 'Update Quotation' : 'Save Quotation'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="PQ-unique-delete-overlay">
                    <div className="PQ-unique-delete-modal">
                        <div className="PQ-unique-delete-header">
                            <h2 className="PQ-unique-delete-title">Delete Quotation?</h2>
                            <button className="PQ-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="PQ-unique-delete-body">
                            <p className="PQ-unique-delete-message">
                                Are you sure you want to delete this Purchase Quotation? This action cannot be undone and will permanently remove the record.
                            </p>
                        </div>
                        <div className="PQ-unique-delete-footer">
                            <button className="PQ-unique-delete-btn PQ-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="PQ-unique-delete-btn PQ-unique-delete-confirm" onClick={confirmDelete}>
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Full Add Vendor Modal */}
            {showAddVendorModal && (
                <div className="Vendors-modal-overlay">
                    <div className="Vendors-modal-content Vendors-modal-large" style={{ textAlign: 'left' }}>
                        <div className="Vendors-modal-header">
                            <h2 className="Vendors-modal-title">Add Vendor</h2>
                            <button className="Vendors-close-btn" onClick={() => setShowAddVendorModal(false)}>×</button>
                        </div>

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
                                                    onClick={() => setVendorFormData(prev => ({ ...prev, profileImage: '' }))}
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
                                            onChange={(e) => handleVendorFileUpload(e.target.files[0], 'profileImage', 'vendors')}
                                        />
                                        <div className="Vendors-file-input-wrapper" onClick={() => profileImageRef.current?.click()} style={{ cursor: 'pointer' }}>
                                            <div className="Vendors-file-label">
                                                <span className="Vendors-file-btn">{uploadingProfileImage ? 'Uploading...' : 'Choose File'}</span>
                                                <span className="Vendors-file-name">{vendorFormData.profileImage ? 'Image uploaded ✓' : 'No file chosen'}</span>
                                            </div>
                                        </div>
                                        <span className="Vendors-file-note">JPEG, PNG or JPG (max 5MB)</span>
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
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="Vendors-form-section">
                                <h3 className="Vendors-section-subtitle">Account Information</h3>
                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Vendor Type <span className="Vendors-text-red">*</span></label>
                                        <select
                                            className="Vendors-form-select"
                                            name="accountType"
                                            value={vendorFormData.accountType || 'Credit'}
                                            onChange={handleVendorInputChange}
                                        >
                                            <option value="Credit">Credit Vendor</option>
                                            <option value="Cash">Cash Vendor</option>
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
                                            required
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
                                            required
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
                            <button type="button" className="Vendors-btn-save" onClick={handleFullVendorSubmit}>Create</button>
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
                                        <label className="Zirak-Inventory-form-label">Item Code / SKU</label>
                                        <input
                                            name="hsn" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter Item Code / SKU"
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

export default PurchaseQuotation;
