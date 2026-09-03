import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useReactToPrint } from 'react-to-print';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Printer, Eye, AlertTriangle, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './PurchaseOrder.css';
import '../../Sales/Invoice/Invoice.css';
import purchaseOrderService from '../../../../services/purchaseOrderService';
import vendorService from '../../../../services/vendorService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import companyService from '../../../../api/companyService';
import purchaseQuotationService from '../../../../services/purchaseQuotationService';
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
import chartOfAccountsService from '../../../../services/chartOfAccountsService';


const PurchaseOrder = () => {
    const { hasPermission } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const targetOrderId = location.state?.targetOrderId;
    const sourceData = location.state?.sourceData; // content from Quotation if applicable
    const { formatCurrency, getTableHeader, getInvoiceLabel, companySettings, getDocumentTitle } = useContext(CompanyContext);

    // --- State Management ---
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [quotations, setQuotations] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);

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

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: '', address: '', email: '', phone: '', logo: '', notes: '', terms: ''
    });
    const [orderMeta, setOrderMeta] = useState({
        orderNumber: '', date: new Date().toISOString().split('T')[0], deliveryDate: '', manualReference: ''
    });
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRefToRetry, setDuplicateRefToRetry] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [items, setItems] = useState([
        { id: Date.now(), productId: '', warehouseId: '', qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }
    ]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('percentage');
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

    // Toggle State
    const [orderType, setOrderType] = useState('direct'); // 'direct' | 'quotation'
    const [selectedQuotationId, setSelectedQuotationId] = useState('');
    const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
    const [isQuotationDropdownOpen, setIsQuotationDropdownOpen] = useState(false);
    const quotationDropdownRef = useRef(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const printRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `PurchaseOrder_${orderMeta.orderNumber || 'New'}`,
    });

    useEffect(() => {
        fetchInitialData();
        fetchOrders();
    }, []);

    useEffect(() => {
        if (targetOrderId && orders.length > 0) {
            if (location.state?.isEdit || location.state?.autoEdit) {
                handleEdit(targetOrderId);
            } else {
                handleView(targetOrderId);
            }
            // Clear navigation state to prevent re-opening on refresh
            navigate(location.pathname, { replace: true, state: { ...location.state, targetOrderId: undefined } });
        }
    }, [targetOrderId, orders]);

    // Handle Source Data (Auto-fill from Quotation)
    useEffect(() => {
        if (sourceData && !editingId && vendors.length > 0) {
            setVendorId(sourceData.vendorId); // ensuring vendorId is passed
            setNotes(sourceData.notes || '');
            if (sourceData.items) {
                const mappedItems = sourceData.items.map(i => ({
                    id: Date.now() + Math.random(),
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
            setShowAddModal(true);
        }
    }, [sourceData, editingId, vendors]);

    // Fetch next PO number when modal opens
    useEffect(() => {
        const loadNextNo = async () => {
            if (showAddModal && !editingId) {
                try {
                    const companyId = GetCompanyId();
                    if (companyId) {
                        const res = await companyService.getNextNumber(companyId, 'purchaseorder');
                        if (res.data.success) {
                            const nextRef = res.data.nextManualReference || res.data.details?.nextManualReference || '';
                            setOrderMeta(prev => ({
                                ...prev,
                                orderNumber: res.data.nextNumber,
                                manualReference: nextRef || prev.manualReference || ''
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error fetching next PO number:', error);
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
                uomService.getUOMs(companyId)
            ];
            if (companyId) {
                promises.push(companyService.getById(companyId));
            }

            const results = await Promise.all(promises);
            const vendorRes = results[0];
            const productRes = results[1];
            const warehouseRes = results[2];
            const uomRes = results[3];
            const companyRes = results[4];

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
            }

            // Handle UOMs
            if (uomRes?.data) setAllUoms(uomRes.data);

            // Click outside to close dropdown
            const handleClickOutside = (event) => {
                if (quotationDropdownRef.current && !quotationDropdownRef.current.contains(event.target)) {
                    setIsQuotationDropdownOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);

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
                // Only set notes if not already populated from source data
                if (data.notes && !sourceData) setNotes(data.notes);
            }

        } catch (error) {
            console.error("Error fetching dropdowns", error);
            // toast.error("Failed to load dropdown data");
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

    const fetchQuotations = async () => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseQuotationService.getQuotations(companyId);
            if (res.success || Array.isArray(res)) {
                const allQuotes = res.data || res;
                // Only show quotations that are still pending/sent
                setQuotations(allQuotes.filter(q => q.status !== 'ACCEPTED' && q.status !== 'CONVERTED'));
            }
        } catch (error) {
            console.error("Error fetching quotations", error);
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const query = searchTerm.toLowerCase();
            const orderNo = o.orderNumber || `PO-${o.id}`;
            const vendorName = o.vendor?.name || '';

            const matchesSearch = !query ||
                orderNo.toLowerCase().includes(query) ||
                vendorName.toLowerCase().includes(query);

            const oDate = new Date(o.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || oDate >= start) && (!end || oDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [orders, searchTerm, startDate, endDate]);

    const filteredQuotationList = useMemo(() => {
        return quotations.filter(q => {
            const isUsed = orders.some(o => o.quotationId === q.id || o.quotationId === q._id);
            if (isUsed) return false;

            const query = quotationSearchTerm.toLowerCase();
            const qAmount = q.totalAmount?.toString() || '';
            const qNo = q.quotationNumber?.toLowerCase() || '';
            const vName = q.vendor?.name?.toLowerCase() || '';

            return !query ||
                qNo.includes(query) ||
                vName.includes(query) ||
                qAmount.includes(query);
        });
    }, [quotations, orders, quotationSearchTerm]);

    const handleSelectQuotation = (quote) => {
        setSelectedQuotationId(quote.id);
        setVendorId(quote.vendorId);
        setNotes(quote.notes || '');
        if (quote.terms) setTerms(quote.terms);

        const sourceItems = quote.purchasequotationitem || quote.items || [];
        const mappedItems = sourceItems.map(i => ({
            id: Date.now() + Math.random(),
            productId: i.productId,
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
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await purchaseOrderService.getOrders(companyId);
            if (res.success) {
                setOrders(res.data);
            }
        } catch (error) {
            console.error("Error fetching orders", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setVendorId('');
        // Auto-generate PO Number: PO-8digitRandom
        const autoPO = `PO-${Math.floor(10000000 + Math.random() * 90000000)}`;
        setOrderMeta({ orderNumber: autoPO, date: new Date().toISOString().split('T')[0], deliveryDate: '', manualReference: '' });
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
        setOrderType('direct');
        setSelectedQuotationId('');
        setQuotationSearchTerm('');
        setIsQuotationDropdownOpen(false);
        setOverallDiscount(0);
        setOverallDiscountType('percentage');
        setCustomFieldValues({});
        setIsViewMode(false);
        setShowAddModal(false);
    };

    const handleView = async (id) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseOrderService.getOrderById(id, companyId);
            if (res.success && res.data) {
                const order = res.data;
                setEditingId(id);
                setVendorId(order.vendorId);
                setOrderMeta({
                    orderNumber: order.orderNumber,
                    date: order.date.split('T')[0],
                    deliveryDate: order.expectedDate ? order.expectedDate.split('T')[0] : '',
                    manualReference: order.manualReference || ''
                });
                setNotes(order.notes || '');
                const itemsData = order.purchaseorderitem || order.items;
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
                setOverallDiscount(order.overallDiscount || 0);
                setOverallDiscountType(order.overallDiscountType || 'percentage');
                let fieldValues = {};
                if (order.customFields) {
                    try {
                        fieldValues = typeof order.customFields === 'string'
                            ? JSON.parse(order.customFields)
                            : order.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on view:', e);
                    }
                }
                setCustomFieldValues(fieldValues);
                setIsViewMode(true);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error("Error fetching order details", error);
            toast.error("Failed to fetch order details");
        }
    };

    const handleAddNew = () => {
        resetForm();
        setEditingId(null);
        setIsViewMode(false);
        fetchInitialData();
        setShowAddModal(true);
    };

    const handleOrderTypeChange = (type) => {
        setOrderType(type);
        if (type === 'quotation') {
            fetchQuotations();
        } else {
            setSelectedQuotationId('');
            setQuotationSearchTerm('');
        }
    };

    const handleQuotationSelect = (qId) => {
        setSelectedQuotationId(qId);
        if (!qId) return;

        const quote = quotations.find(q => q.id === parseInt(qId));
        if (quote) {
            setVendorId(quote.vendorId);
            setNotes(quote.notes || '');
            if (quote.terms) setTerms(quote.terms);

            const sourceItems = quote.purchasequotationitem || quote.items || [];
            const mappedItems = sourceItems.map(i => ({
                id: Date.now() + Math.random(),
                productId: i.productId,
                warehouseId: i.warehouseId || '',
                qty: i.quantity,
                rate: i.rate,
                discount: i.discount,
                tax: i.taxRate,
                total: i.amount,
                description: i.description
            }));
            setItems(mappedItems);
        }
    };

    const handleEdit = async (id) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchaseOrderService.getOrderById(id, companyId);
            if (res.success && res.data) {
                const orderToEdit = res.data;
                setEditingId(id);
                setIsViewMode(false);
                setVendorId(orderToEdit.vendorId);
                setOrderMeta({
                    orderNumber: orderToEdit.orderNumber,
                    date: orderToEdit.date.split('T')[0],
                    deliveryDate: orderToEdit.expectedDate ? orderToEdit.expectedDate.split('T')[0] : '',
                    manualReference: orderToEdit.manualReference || ''
                });
                setNotes(orderToEdit.notes || '');

                const itemsData = orderToEdit.purchaseorderitem || orderToEdit.items;
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
                setOverallDiscount(orderToEdit.overallDiscount || 0);
                setOverallDiscountType(orderToEdit.overallDiscountType || 'percentage');
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
            console.error("Error fetching order details", error);
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
            await purchaseOrderService.deleteOrder(deleteId, companyId);
            toast.success("Order deleted");
            fetchOrders();
        } catch (error) {
            toast.error(error.message || "Failed to delete");
        } finally {
            setShowDeleteConfirm(false);
            setDeleteId(null);
        }
    };

    const handleConvert = async (id) => {
        try {
            const companyId = GetCompanyId();
            const response = await purchaseOrderService.convertOrder(id, companyId);
            if (response.success) {
                toast.success('Converted to GRN successfully');
                setShowAddModal(false);
                navigate('/company/purchases/receipt', { state: { targetGrnId: response.data.id } });
            } else {
                toast.error(response.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting order:', error);
            toast.error(error.response?.data?.message || error.message || 'Error converting order');
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
            const response = await purchaseOrderService.updateOrder(orderId, payload, companyId);
            if (response?.success || response?.data?.success) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    const handleCreateGRN = (order) => {
        navigate('/company/purchases/goods-receipt', {
            state: {
                sourceData: {
                    vendorId: order.vendorId,
                    purchaseOrderId: order.id,
                    items: order.purchaseorderitem || order.items,
                    notes: order.notes
                }
            }
        });
    };

    const handleCreateBill = (order) => {
        navigate('/company/purchases/bill', {
            state: {
                sourceData: {
                    sourceType: 'po',
                    vendorId: order.vendorId,
                    purchaseOrderId: order.id,
                    items: order.purchaseorderitem || order.items || [],
                    notes: order.notes,
                    terms: order.terms,
                    totalAmount: order.totalAmount
                }
            }
        });
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

    const handleSave = async (allowDuplicate = false, overrideManualRef = null) => {
        const totals = calculateTotals();

        if (!vendorId) {
            toast.error("Please select a vendor");
            return;
        }

        if (!orderMeta.orderNumber) {
            toast.error("Purchase Order Number is required (PO No.)");
            return;
        }

        const companyId = GetCompanyId();
        const payload = {
            companyId,
            orderNumber: orderMeta.orderNumber,
            manualReference: overrideManualRef !== null ? overrideManualRef : (orderMeta.manualReference || ''),
            date: orderMeta.date,
            expectedDate: orderMeta.deliveryDate,
            vendorId: parseInt(vendorId),
            customFields: JSON.stringify(customFieldValues),
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
            quotationId: selectedQuotationId || sourceData?.quotationId, // Link if from quotation
            allowDuplicateManualNo: allowDuplicate === true
        };

        try {
            if (editingId) {
                await purchaseOrderService.updateOrder(editingId, { ...payload, status: 'OPEN' });
                toast.success("Order updated");
            } else {
                await purchaseOrderService.createOrder(payload);
                toast.success("Order created");
            }
            setShowAddModal(false);
            fetchOrders();
        } catch (error) {
            if (error.response?.data?.isDuplicateWarning || error.response?.data?.isDuplicate) {
                const currentRef = overrideManualRef !== null ? overrideManualRef : (orderMeta.manualReference || '');
                setDuplicateRefToRetry(currentRef);
                setShowDuplicateModal(true);
            } else {
                console.error(error);
                toast.error(error.response?.data?.message || error.message || "Failed to save");
            }
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
                if (parsed.defaultPurchaseWarehouseId) {
                    defWarehouseId = parseInt(parsed.defaultPurchaseWarehouseId);
                }
            } catch (e) {
                console.error(e);
            }
        }
        setItems([...items, { id: Date.now(), productId: '', warehouseId: defWarehouseId, qty: 1, uomId: '', rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
    };

    const handleTopItemSelect = (productId) => {
        if (!productId) return;
        const cleanId = String(productId).replace(/^p-/, '');
        const prod = products.find(p => String(p.id) === cleanId);
        if (!prod) return;

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
            id: Date.now() + Math.random(),
            productId: String(prod.id),
            warehouseId: defWarehouseId ? String(defWarehouseId) : (warehouses[0]?.id ? String(warehouses[0].id) : ''),
            qty: 1,
            uomId: prod.purchaseUomId ? String(prod.purchaseUomId) : prod.uomId ? String(prod.uomId) : '',
            rate: prod.purchasePrice || prod.costPrice || 0,
            tax: prod.taxRate || 0,
            discount: prod.discount || 0,
            total: prod.purchasePrice || prod.costPrice || 0,
            description: prod.description || ''
        };

        setItems(prevItems => {
            const hasEmpty = prevItems.length === 1 && !prevItems[0].productId;
            if (hasEmpty) {
                return [newItem];
            }
            return [...prevItems, newItem];
        });
    };

    const handleOpenAddProductModal = () => {
        setProductWarehouseRows(warehouses.map(wh => ({
            id: wh.id,
            warehouseId: wh.id,
            quantity: 0,
            minOrderQty: 0,
            initialQty: 0
        })));
        setShowAddProductModal(true);
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
                    const discountAmount = discount;
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
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'purchase-order', label: 'Purchase Order', icon: ShoppingCart, status: 'active' },
        { id: 'grn', label: 'Goods Receipt', icon: Truck, status: 'pending' },
        { id: 'bill', label: 'Bill', icon: Receipt, status: 'pending' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    return (
        <div className="PurchaseOrder-page">
            {!showAddModal && !isViewMode && (
                <><div className="PurchaseOrder-header">
                    <div>
                        <h1 className="PurchaseOrder-title">Purchase Order</h1>
                        <p className="PurchaseOrder-subtitle">Manage purchase orders to vendors</p>
                    </div>
                    {hasPermission('create purchase order') && (
                        <button className="PurchaseOrder-btn-add" onClick={handleAddNew}>
                            <Plus size={18} className="mr-2" /> Create Order
                        </button>
                    )}
                </div>

                    <div className="PurchaseOrder-tracker-card">
                        <div className="PurchaseOrder-tracker-wrapper">
                            {purchaseProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`purchase-module-tracker-step ${step.status}`}>
                                        <div className="PurchaseOrder-step-icon">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="PurchaseOrder-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="PurchaseOrder-status-badge" size={14} />}
                                        </div>
                                        <span className="PurchaseOrder-step-label">{step.label}</span>
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

                    <div className="PurchaseOrder-table-card mt-6">
                        <div className="PurchaseOrder-table-controls p-4 border-b flex justify-between items-center gap-4 flex-wrap">
                            <div className="PurchaseOrder-search-wrapper">
                                <Search className="PurchaseOrder-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by ID or Vendor..."
                                    className="PurchaseOrder-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="PurchaseOrder-date-filters flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input
                                        type="date"
                                        className="PurchaseOrder-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input
                                        type="date"
                                        className="PurchaseOrder-date-input"
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
                        <div className="table-container">
                            <table className="PurchaseOrder-table">
                                <thead>
                                    <tr>
                                        <th>ORDER ID</th>
                                        <th>QUO REF</th>
                                        <th>VENDOR</th>
                                        <th>DATE</th>
                                        <th>DELIVERY DATE</th>
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th className="text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="9" className="text-center p-4">Loading...</td></tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr><td colSpan="9" className="text-center p-4">No orders found</td></tr>
                                    ) : (
                                        filteredOrders.map(o => {
                                            const isConverted = o.status === 'CONVERTED' || (Array.isArray(o.goodsreceiptnote) ? o.goodsreceiptnote.length > 0 : !!o.goodsreceiptnote) || (Array.isArray(o.purchasebill) ? o.purchasebill.length > 0 : !!o.purchasebill);
                                            return (
                                                <tr key={o.id}>
                                                    <td className="font-bold text-blue-600">{o.orderNumber || `PO-${o.id}`}</td>
                                                    <td>{o.purchasequotation?.quotationNumber || '-'}</td>
                                                    <td>{o.vendor?.name || 'Unknown'}</td>
                                                    <td>{new Date(o.date).toLocaleDateString()}</td>
                                                    <td>{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '-'}</td>
                                                    <td>{formatCurrency(o.totalAmount || 0)}</td>
                                                    <td>
                                                        <select
                                                            value={o.manualStatus ? o.status : 'AUTO'}
                                                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                                            className="purchase-module-status-pill"
                                                            style={getStatusStyle(o.manualStatus ? o.status : 'AUTO')}
                                                        >
                                                            <option value="AUTO">Auto ({o.status})</option>
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="PARTIAL">PARTIAL</option>
                                                            <option value="COMPLETED">COMPLETED</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                            <option value="CONVERTED">CONVERTED</option>
                                                        </select>
                                                    </td>
                                                    <td className="">
                                                        <div className="po-action-buttons">
                                                            <button className="PurchaseOrder-action-btn view" onClick={() => handleView(o.id)} title="View"><Eye size={16} /></button>
                                                            {!isConverted ? (
                                                                <button className="PurchaseOrder-action-btn convert" onClick={() => handleConvert(o.id)} title="Convert to GRN" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '6px', borderRadius: '4px' }}><Truck size={16} /></button>
                                                            ) : (
                                                                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1" title="Converted to Goods Receipt Note / Purchase Bill" style={{ alignSelf: 'center' }}>
                                                                    <CheckCircle2 size={12} /> Converted
                                                                </span>
                                                            )}
                                                            {hasPermission('edit purchase order') && (
                                                                <button className="PurchaseOrder-action-btn edit" onClick={() => handleEdit(o.id)} title="Edit"><Pencil size={16} /></button>
                                                            )}
                                                            {hasPermission('delete purchase order') && (
                                                                <button className="PurchaseOrder-action-btn delete" onClick={() => handleDelete(o.id)} title="Delete"><Trash2 size={16} /></button>
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
                </>)}

            {/* Premium Create Full Page View - Same as SalesOrder */}
            {(showAddModal || isViewMode) && (
                <div className="PurchaseOrder-sales-order-full-page-create">
                    <div className="PurchaseOrder-view-page-header PurchaseOrder-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {isViewMode ? 'View Purchase Order' : editingId ? 'Edit Purchase Order' : 'New Purchase Order'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button className="PurchaseOrder-btn-back" onClick={handlePrint} style={{ backgroundColor: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}>
                                    <Printer size={16} /> Print Order
                                </button>
                            )}
                            <button className="PurchaseOrder-btn-back" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); setEditingId(null); }}>
                                <ArrowLeft size={16} /> Back to Purchase Orders
                            </button>
                        </div>
                    </div>

                    <div className="PurchaseOrder-modal-content PurchaseOrder-form-modal">

                        <div className="PurchaseOrder-body-scrollable" ref={printRef}>
                            {isViewMode ? (
                                <div className="PurchaseOrder-view-document">
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
                                                        <div className="invoice-title-large" style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0' }}>{getDocumentTitle('purchaseorder')}</div>
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
                                                                <span>#{orderMeta.orderNumber}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Date:</span>
                                                                <span>{orderMeta.date}</span>
                                                            </div>
                                                            <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                <span className="invoice-label">Expected Date:</span>
                                                                <span>{orderMeta.deliveryDate || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Vendor Details & Shipping Details Row */}
                                        <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', width: '100% !important', marginTop: '2.5rem', gap: '3rem' }}>
                                            {/* BILL TO / VENDOR */}
                                            <div className="invoice-bill-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                <div className="invoice-section-header">{getInvoiceLabel('billTo', 'BILL TO / VENDOR')}</div>
                                                <div className="font-bold text-gray-800" style={{ fontSize: '1.1rem', marginBottom: '5px' }}>
                                                    {vendors.find(v => String(v.id) === String(vendorId))?.name || 'N/A'}
                                                </div>
                                                <div className="invoice-company-details">
                                                    <p style={{ margin: '2px 0' }}>
                                                        <strong>Address:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.billingAddress || vendors.find(v => String(v.id) === String(vendorId))?.address || 'N/A'}
                                                    </p>
                                                    <p style={{ margin: '2px 0' }}>
                                                        <strong>Email:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.email || 'N/A'}
                                                    </p>
                                                    <p style={{ margin: '2px 0' }}>
                                                        <strong>Phone:</strong> {vendors.find(v => String(v.id) === String(vendorId))?.phone || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* SHIP TO / SHIPPING DETAILS (Company Details) */}
                                            <div className="invoice-ship-to" style={{ flex: 1, textAlign: 'right', minWidth: '0' }}>
                                                <div className="invoice-section-header">{getInvoiceLabel('shipTo', 'SHIP TO')}</div>
                                                <div className="font-bold text-gray-800" style={{ fontSize: '1.1rem', marginBottom: '5px' }}>
                                                    {companyDetails?.name || companySettings?.companyName || 'Company Warehouse'}
                                                </div>
                                                <div className="invoice-company-details">
                                                    <p style={{ margin: '2px 0' }}>
                                                        <strong>Address:</strong> {companyDetails?.shippingAddress || companyDetails?.address || companySettings?.companyAddress || 'N/A'}
                                                    </p>
                                                    {(companyDetails?.city || companyDetails?.state || companySettings?.city || companySettings?.state) && (
                                                        <p style={{ margin: '2px 0' }}>
                                                            <strong>City / State:</strong> {[
                                                                companyDetails?.city || companySettings?.city,
                                                                companyDetails?.state || companySettings?.state
                                                            ].filter(Boolean).join(', ')}
                                                        </p>
                                                    )}
                                                    <p style={{ margin: '2px 0' }}>
                                                        <strong>Phone:</strong> {companyDetails?.phone || companySettings?.companyPhone || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Custom Fields Print View */}
                                        {(() => {
                                            const order = orders.find(o => o.id === editingId);
                                            let customFieldVals = {};
                                            if (order?.customFields) {
                                                try {
                                                    customFieldVals = typeof order.customFields === 'string'
                                                        ? JSON.parse(order.customFields)
                                                        : order.customFields;
                                                } catch (e) {
                                                    console.error('Error parsing purchase order custom fields for view:', e);
                                                }
                                            }
                                            const fieldsList = getCustomFieldsForType('purchaseorder');
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
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', padding: '6px 0' }}>
                                                                    <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#1e293b', display: 'block', lineHeight: '1.2' }}>
                                                                        {item.productId ? products.find(p => String(p.id) === String(item.productId))?.name : 'N/A'}
                                                                    </span>
                                                                    {item.description && (
                                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', fontStyle: 'normal', lineHeight: '1.3' }}>
                                                                            {item.description}
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                    <div className="invoice-section-header" style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Bank Details</div>
                                                    {vendorId ? (
                                                        <>
                                                            <p style={{ margin: '2px 0' }}><strong>Bank Name:</strong> {vendors.find(v => v.id === parseInt(vendorId))?.bankNameBranch || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>Account No:</strong> {vendors.find(v => v.id === parseInt(vendorId))?.bankAccountNumber || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>IFSC / Swift:</strong> {vendors.find(v => v.id === parseInt(vendorId))?.bankIFSC || 'N/A'}</p>
                                                            <p style={{ margin: '2px 0' }}><strong>Account Holder:</strong> {vendors.find(v => v.id === parseInt(vendorId))?.accountName || 'N/A'}</p>
                                                        </>
                                                    ) : (
                                                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No vendor selected</p>
                                                    )}
                                                </div>

                                                {(() => {
                                                     const order = orders.find(o => o.id === editingId);
                                                     let displayNotes = notes || '';
                                                     const linkedQuotationNo = order?.purchasequotation?.quotationNumber;
                                                     if (linkedQuotationNo && !displayNotes.includes(linkedQuotationNo)) {
                                                         displayNotes = `Purchase Quotation No: ${linkedQuotationNo}${displayNotes ? '\n' + displayNotes : ''}`;
                                                     }
                                                     return displayNotes ? (
                                                         <div className="invoice-notes" style={{ marginBottom: '1.5rem' }}>
                                                             <div className="invoice-section-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Notes</div>
                                                             <p style={{ color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{displayNotes}</p>
                                                         </div>
                                                     ) : null;
                                                 })()}
                                                
                                                {terms && (
                                                    <div className="invoice-terms">
                                                        <div className="invoice-section-header" style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Terms & Conditions</div>
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
                                <div className="PurchaseOrder-create-edit-form">
                                    {/* Order Type Toggle hidden for strict source workflow */}

                                    {orderType === 'quotation' && !selectedQuotationId && (
                                        <div className="PurchaseOrder-searchable-dropdown-container" ref={quotationDropdownRef}>
                                            <div
                                                className={`PurchaseOrder-dropdown-selector ${isQuotationDropdownOpen ? 'active' : ''}`}
                                                onClick={() => setIsQuotationDropdownOpen(!isQuotationDropdownOpen)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-gray-400" />
                                                    <span className="text-gray-600">Select Quotation...</span>
                                                </div>
                                                <ChevronDown size={18} className={`transition-transform ${isQuotationDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            {isQuotationDropdownOpen && (
                                                <div className="PurchaseOrder-dropdown-menu">
                                                    <div className="PurchaseOrder-dropdown-search-wrapper">
                                                        <Search size={14} className="PurchaseOrder-dropdown-search-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search by vendor, ID or amount..."
                                                            className="PurchaseOrder-dropdown-search-input"
                                                            value={quotationSearchTerm}
                                                            autoFocus
                                                            onChange={(e) => setQuotationSearchTerm(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="PurchaseOrder-dropdown-options-list">
                                                        {filteredQuotationList.length === 0 ? (
                                                            <div className="PurchaseOrder-dropdown-empty">
                                                                No matching quotations found
                                                            </div>
                                                        ) : (
                                                            filteredQuotationList.map(q => (
                                                                <div
                                                                    key={q.id}
                                                                    className="PurchaseOrder-dropdown-option-card"
                                                                    onClick={() => {
                                                                        handleSelectQuotation(q);
                                                                        setIsQuotationDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <div className="text-sm font-bold text-blue-600">{q.quotationNumber}</div>
                                                                            <div className="text-xs font-semibold text-gray-800">{q.vendor?.name}</div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-sm font-bold text-green-600">{formatCurrency(q.totalAmount)}</div>
                                                                            <div className="text-[10px] text-gray-400">{new Date(q.date).toLocaleDateString()}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedQuotationId && orderType === 'quotation' && (
                                        <div className="PurchaseOrder-selected-quote-badge mb-4">
                                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-green-800">Linked to {quotations.find(q => q.id === parseInt(selectedQuotationId))?.quotationNumber || 'linked'}</div>
                                                        <div className="text-xs text-green-600">{quotations.find(q => q.id === parseInt(selectedQuotationId))?.vendor?.name}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    onClick={() => {
                                                        setSelectedQuotationId('');
                                                        setVendorId('');
                                                        setQuotationSearchTerm('');
                                                        setItems([{ id: Date.now(), productId: '', warehouseId: '', qty: 1, rate: 0, tax: 0, discount: 0, total: 0, description: '' }]);
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Section: 2-Column Header (Meta left, Vendor right) */}
                                    <div className="PurchaseOrder-form-header-grid">
                                        {/* LEFT COLUMN: Order Meta Fields */}
                                        <div className="PurchaseOrder-meta-column">
                                            <div className="PurchaseOrder-meta-item">
                                                <label className="PurchaseOrder-meta-label">PO NO. <span style={{ color: '#ef4444' }}>*</span></label>
                                                <input
                                                    type="text"
                                                    value={orderMeta.orderNumber || ''}
                                                    onChange={(e) => setOrderMeta({ ...orderMeta, orderNumber: e.target.value })}
                                                    disabled={isViewMode || !!editingId}
                                                    className={`PurchaseOrder-meta-input ${isViewMode || editingId ? 'PurchaseOrder-disabled' : ''}`}
                                                />
                                            </div>
                                            <div className="PurchaseOrder-meta-item">
                                                <label className="PurchaseOrder-meta-label">MANUAL REF</label>
                                                <input
                                                    type="text"
                                                    value={orderMeta.manualReference || ''}
                                                    onChange={(e) => setOrderMeta({ ...orderMeta, manualReference: e.target.value })}
                                                    disabled={isViewMode}
                                                    placeholder="e.g. REF-001"
                                                    className="PurchaseOrder-meta-input"
                                                />
                                            </div>
                                            <div className="PurchaseOrder-meta-item">
                                                <label className="PurchaseOrder-meta-label">DATE</label>
                                                <input
                                                    type="date"
                                                    value={orderMeta.date}
                                                    onChange={(e) => setOrderMeta({ ...orderMeta, date: e.target.value })}
                                                    className="PurchaseOrder-meta-input"
                                                />
                                            </div>
                                            <div className="PurchaseOrder-meta-item">
                                                <label className="PurchaseOrder-meta-label">DELIVERY DATE</label>
                                                <input
                                                    type="date"
                                                    value={orderMeta.deliveryDate}
                                                    onChange={(e) => setOrderMeta({ ...orderMeta, deliveryDate: e.target.value })}
                                                    className="PurchaseOrder-meta-input"
                                                />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN: Vendor Details & Card */}
                                        <div className="PurchaseOrder-vendor-column">
                                            <div className="PurchaseOrder-vendor-select-group">
                                                <label className="PurchaseOrder-meta-label" style={{ marginBottom: '4px', display: 'block' }}>
                                                    ORDER TO / VENDOR <span style={{ color: '#ef4444' }}>*</span>
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                    <select
                                                        className="PurchaseOrder-form-select-compact"
                                                        style={{ flex: 1, height: '38px' }}
                                                        value={vendorId}
                                                        onChange={(e) => setVendorId(e.target.value)}
                                                        disabled={!!sourceData}
                                                    >
                                                        <option value="">Select Vendor...</option>
                                                        {vendors.map(v => (
                                                            <option key={v.id} value={v.id}>{v.name} {v.companyName ? `(${v.companyName})` : ''}</option>
                                                        ))}
                                                    </select>
                                                    {!isViewMode && !sourceData && (
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
                                            </div>

                                            {/* Vendor Details Card */}
                                            <div className="">
                                                
                                                <div className="PurchaseOrder-card-field">
                                                    <label className="PurchaseOrder-card-label">Billing Address</label>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        className="PurchaseOrder-card-input PurchaseOrder-disabled"
                                                        placeholder="Billing Address"
                                                        value={vendors.find(v => String(v.id) === String(vendorId))?.billingAddress || vendors.find(v => String(v.id) === String(vendorId))?.address || ''}
                                                    />
                                                </div>
                                                <div className="PurchaseOrder-card-row-2col">
                                                    <div className="PurchaseOrder-card-field">
                                                        <label className="PurchaseOrder-card-label">Email Address</label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            className="PurchaseOrder-card-input PurchaseOrder-disabled"
                                                            placeholder="Email Address"
                                                            value={vendors.find(v => String(v.id) === String(vendorId))?.email || ''}
                                                        />
                                                    </div>
                                                    <div className="PurchaseOrder-card-field">
                                                        <label className="PurchaseOrder-card-label">Phone Number</label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            className="PurchaseOrder-card-input PurchaseOrder-disabled"
                                                            placeholder="Phone Number"
                                                            value={vendors.find(v => String(v.id) === String(vendorId))?.phone || ''}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Fields Section */}
                                    {getCustomFieldsForType('purchaseorder').length > 0 && (
                                        <div className="PurchaseOrder-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Custom Fields
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                {getCustomFieldsForType('purchaseorder').map(field => (
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

                                    {/* Items Section */}
                                    <div className="PurchaseOrder-items-section-new">
                                        <div className="PurchaseOrder-items-header-bar">
                                            <div className="PurchaseOrder-items-title-group">
                                                <h3 className="PurchaseOrder-items-heading">LINE ITEMS</h3>
                                                {!isViewMode && (
                                                    <div className="PurchaseOrder-inline-search-group">
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
                                                                groupKey=""
                                                                clearable={false}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="PurchaseOrder-btn-add-icon"
                                                            onClick={handleOpenAddProductModal}
                                                            title="Add Product"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                           
                                        </div>
                                        <div className="PurchaseOrder-table-responsive">
                                            <table className="PurchaseOrder-new-items-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '20%' }}>{getTableHeader('item', 'Item Name').toUpperCase()}</th>
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
                                                                    <input type="number" className="PurchaseOrder-qty-input" value={item.qty}
                                                                        min="0"
                                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                        onChange={(e) => updateItem(item.id, 'qty', e.target.value.replace(/-/g, ''))} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showUom') !== false && (
                                                                <td>
                                                                    {item.productId ? (
                                                                        <select className="PurchaseOrder-full-width-input" value={item.uomId}
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
                                                                    <input type="number" className="PurchaseOrder-rate-input" value={item.rate}
                                                                        min="0"
                                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                        onChange={(e) => updateItem(item.id, 'rate', e.target.value.replace(/-/g, ''))} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showTax') !== false && (
                                                                <td>
                                                                    <input type="number" className="PurchaseOrder-tax-input" value={item.tax}
                                                                        min="0"
                                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                        onChange={(e) => updateItem(item.id, 'tax', e.target.value.replace(/-/g, ''))} />
                                                                </td>
                                                            )}
                                                            {getInvoiceLabel('showDiscount') !== false && (
                                                                <td>
                                                                    <input type="number" className="PurchaseOrder-discount-input" value={item.discount}
                                                                        min="0"
                                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                        onChange={(e) => updateItem(item.id, 'discount', e.target.value.replace(/-/g, ''))} />
                                                                </td>
                                                            )}
                                                            <td>
                                                                <input type="text" className="PurchaseOrder-amount-input PurchaseOrder-disabled" value={formatCurrency(item.total)} disabled />
                                                            </td>
                                                            <td className="PurchaseOrder-text-center">
                                                                <button className="PurchaseOrder-btn-delete-row" onClick={() => removeItem(item.id)}>
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
                                    <div className="PurchaseOrder-footer-grid">
                                        <div className="PurchaseOrder-bank-details-box">
                                            <h4 className="PurchaseOrder-section-label">Bank Details</h4>
                                            {vendorId ? (
                                                <div className="PurchaseOrder-bank-info-content">
                                                    <p className="PurchaseOrder-bank-row">
                                                        <span className="font-semibold">Bank Name:</span>
                                                        <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankNameBranch || 'N/A'}</span>
                                                    </p>
                                                    <p className="PurchaseOrder-bank-row">
                                                        <span className="font-semibold">Account No:</span>
                                                        <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankAccountNumber || 'N/A'}</span>
                                                    </p>
                                                    <p className="PurchaseOrder-bank-row">
                                                        <span className="font-semibold">IFSC / Swift:</span>
                                                        <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.bankIFSC || 'N/A'}</span>
                                                    </p>
                                                    <p className="PurchaseOrder-bank-row">
                                                        <span className="font-semibold">Account Holder:</span>
                                                        <span className="value">{vendors.find(v => v.id === parseInt(vendorId))?.accountName || 'N/A'}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No vendor selected</p>
                                            )}
                                        </div>
                                        <div className="PurchaseOrder-totals-box">
                                            <div className="PurchaseOrder-t-row">
                                                <span>Sub Total:</span>
                                                <span>{formatCurrency(totalsData.subTotal)}</span>
                                            </div>
                                            <div className="PurchaseOrder-t-row">
                                                <span>Discount:</span>
                                                <span className="PurchaseOrder-text-red-500">-{formatCurrency(totalsData.discount)}</span>
                                            </div>
                                            <div className="PurchaseOrder-t-row">
                                                <span>Tax Total:</span>
                                                <span>{formatCurrency(totalsData.tax)}</span>
                                            </div>

                                            <div className="PurchaseOrder-t-row PurchaseOrder-overall-discount-row">
                                                <span>Overall Discount:</span>
                                                <div className="PurchaseOrder-discount-group">
                                                    <input
                                                        type="number"
                                                        value={overallDiscount}
                                                        min="0"
                                                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                        onChange={(e) => setOverallDiscount(e.target.value.replace(/-/g, ''))}
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

                                            <div className="PurchaseOrder-t-row PurchaseOrder-total">
                                                <span>Grand Total:</span>
                                                <span>{formatCurrency(totalsData.finalTotal)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes & Terms at bottom */}
                                    <div className="PurchaseOrder-bottom-textareas-row">
                                        <div className="PurchaseOrder-notes-section">
                                            <label className="PurchaseOrder-section-label">Notes</label>
                                            <textarea className="PurchaseOrder-notes-area" placeholder="Enter notes..."
                                                value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                                        </div>

                                        <div className="PurchaseOrder-terms-section">
                                            <label className="PurchaseOrder-section-label">Terms & Conditions</label>
                                            <textarea className="PurchaseOrder-terms-area" placeholder="Enter terms..."
                                                value={terms} onChange={(e) => setTerms(e.target.value)}></textarea>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="PurchaseOrder-footer-simple">
                            <button className="PurchaseOrder-btn-plain" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); setEditingId(null); }}>
                                {isViewMode ? 'Close' : 'Cancel'}
                            </button>
                            {isViewMode && (
                                <>
                                    {orders.find(o => o.id === editingId)?.status !== 'CONVERTED' ? (
                                        <button className="PurchaseOrder-btn-primary-green" onClick={() => handleConvert(editingId)} style={{ backgroundColor: '#4f46e5' }}>
                                            <Truck size={18} className="mr-2" /> Convert to GRN
                                        </button>
                                    ) : (
                                        <span className="text-sm font-semibold px-3 py-2 bg-gray-100 text-gray-500 rounded mr-2">Already Converted</span>
                                    )}
                                    <button className="PurchaseOrder-btn-primary-green" onClick={handlePrint}>
                                        <Printer size={18} className="mr-2" /> Print Order
                                    </button>
                                </>
                            )}
                            {!isViewMode && (
                                <button className="PurchaseOrder-btn-primary-green" onClick={handleSave}>
                                    {editingId ? 'Update Order' : 'Save Order'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="PO-unique-delete-overlay">
                        <div className="PO-unique-delete-modal">
                            <div className="PO-unique-delete-header">
                                <h2 className="PO-unique-delete-title">Delete Order?</h2>
                                <button className="PO-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="PO-unique-delete-body">
                                <p className="PO-unique-delete-message">
                                    Are you sure you want to delete this purchase order? This action cannot be undone and will permanently remove the record from your system.
                                </p>
                            </div>
                            <div className="PO-unique-delete-footer">
                                <button className="PO-unique-delete-btn PO-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </button>
                                <button className="PO-unique-delete-btn PO-unique-delete-confirm" onClick={confirmDelete}>
                                    <Trash2 size={18} /> Delete
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

export default PurchaseOrder;
