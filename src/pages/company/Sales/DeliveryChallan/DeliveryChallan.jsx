import React, { useState, useRef, useEffect } from 'react';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    Search, Plus, Pencil, Trash2, X, ChevronDown, Eye,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Download, Send, Printer,
    PackageCheck, Container, User, MapPin, ArrowLeft, Mail, Phone
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';
import './DeliveryChallan.css';
import '../Invoice/Invoice.css';
import deliveryChallanService from '../../../../api/deliveryChallanService';
import salesOrderService from '../../../../api/salesOrderService';
import customerService from '../../../../api/customerService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import '../../Customers/Customers.css';
import '../../Inventory/ProductInventory/Inventory.css';
import '../../Inventory/UOM/UOM.css';
import customerServiceFromServices from '../../../../services/customerService';
import productServiceFromServices from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import uomService from '../../../../services/uomService';
import deliverypersonService from '../../../../services/deliverypersonService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { Upload, Loader2 } from 'lucide-react';
import axiosInstance from '../../../../api/axiosInstance';

const DeliveryChallan = () => {
    const { hasPermission } = useContext(AuthContext);
    const { formatCurrency, getTableHeader, getInvoiceLabel, companySettings, getDocumentTitle } = useContext(CompanyContext);
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [selectedChallanIds, setSelectedChallanIds] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allWarehouses, setAllWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [creationMode, setCreationMode] = useState('linked'); // 'direct' or 'linked'
    const [showOrderSelect, setShowOrderSelect] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [challanFilterCustomerId, setChallanFilterCustomerId] = useState('');

    // Edit & Delete State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Form State
    const [companyDetails, setCompanyDetails] = useState({
        name: 'Zirak Books', address: '123 Business Avenue, Suite 404', email: 'info@zirakbooks.com', phone: '123-456-7890', notes: '', terms: ''
    });
    const [challanMeta, setChallanMeta] = useState({
        challanNo: '', manualNo: '', date: new Date().toISOString().split('T')[0], carrier: '', vehicleNo: '', transportNote: '', remarks: '',
        deliveryPersonName: '', deliveryPersonMobile: '', deliveryPersonEmail: ''
    });
    const [customerId, setCustomerId] = useState('');
    const [customerDetails, setCustomerDetails] = useState({
        address: '', email: '', phone: '', city: '', state: '', zipCode: ''
    });
    const [billingDetails, setBillingDetails] = useState({
        address: '', city: '', state: '', zipCode: ''
    });
    const [items, setItems] = useState([]);
    const navigate = useNavigate();
    const [activeModalStep, setActiveModalStep] = useState(1);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

    const getDefaultSalesWarehouseId = () => {
        if (companySettings?.inventoryConfig) {
            try {
                const parsed = typeof companySettings.inventoryConfig === 'string'
                    ? JSON.parse(companySettings.inventoryConfig)
                    : companySettings.inventoryConfig;
                if (parsed.defaultSalesWarehouseId) {
                    return parseInt(parsed.defaultSalesWarehouseId);
                }
            } catch (e) {
                console.error('Error parsing defaultSalesWarehouseId:', e);
            }
        }
        return allWarehouses.length > 0 ? allWarehouses[0].id : '';
    };

    const location = useLocation();

    // Initial Fetch
    useEffect(() => {
        fetchData();
        fetchDropdowns();
        fetchCompanyDetails();
    }, []);

    useEffect(() => {
        const defWhId = getDefaultSalesWarehouseId();
        if (defWhId) {
            if (!selectedWarehouseId) {
                setSelectedWarehouseId(defWhId);
            }
            if (showAddModal && !isEditMode && !isViewMode) {
                setItems(prev => prev.map(item => ({
                    ...item,
                    warehouseId: item.warehouseId || defWhId
                })));
            }
        }
    }, [companySettings, allWarehouses]);

    const fetchCompanyDetails = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getById(companyId);
                const data = res.data;
                setCompanyDetails({
                    name: data.name || 'Zirak Books',
                    address: data.address || '123 Business Avenue, Suite 404',
                    email: data.email || 'info@zirakbooks.com',
                    phone: data.phone || '123-456-7890',
                    logo: data.logo || null,
                    notes: data.notes || '',
                    terms: data.terms || ''
                });
                setChallanMeta(prev => ({
                    ...prev,
                    transportNote: data.notes || '',
                    remarks: data.terms || ''
                }));
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.getAll(companyId);
            if (response.data.success) {
                setDeliveryChallans(response.data.data);
                setSelectedChallanIds([]);
            }
        } catch (error) {
            console.error('Error fetching challans:', error);
        } finally {
            setLoading(false);
        }
    };

    const [deliverypersonsList, setDeliverypersonsList] = useState([]);
    const [showAddDeliveryPersonModal, setShowAddDeliveryPersonModal] = useState(false);
    const [editingDeliveryPersonId, setEditingDeliveryPersonId] = useState(null);
    const [deliverypersonFormData, setDeliverypersonFormData] = useState({ name: '', phone: '', email: '' });
    const [deliverypersonSubmitting, setDeliverypersonSubmitting] = useState(false);

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();
            const [custRes, prodRes, whRes, orderRes, uomRes, dpRes] = await Promise.all([
                customerService.getAll(companyId),
                productService.getAll(companyId),
                warehouseService.getAll(companyId),
                salesOrderService.getAll(companyId),
                uomService.getUOMs(companyId),
                deliverypersonService.getAll(companyId)
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data);
            if (prodRes.data.success) setAllProducts(prodRes.data.data);
            if (whRes.data.success) setAllWarehouses(whRes.data.data);
            if (orderRes.data.success) {
                setActiveOrders(orderRes.data.data.filter(o => o.status !== 'COMPLETED'));
            }
            if (uomRes.success) {
                setAllUoms(uomRes.data || []);
            }
            if (dpRes && dpRes.success) {
                setDeliverypersonsList(dpRes.data || []);
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

    const handleEditDeliveryPerson = (dp) => {
        setEditingDeliveryPersonId(dp.id);
        setDeliverypersonFormData({
            name: dp.name || '',
            phone: dp.phone || '',
            email: dp.email || ''
        });
        setShowAddDeliveryPersonModal(true);
    };

    const handleDeleteDeliveryPerson = async (dpId) => {
        if (!window.confirm('Are you sure you want to delete this delivery person?')) return;
        try {
            const companyId = GetCompanyId();
            const res = await deliverypersonService.delete(dpId, companyId);
            if (res.success) {
                toast.success('Delivery person deleted successfully');
                const listRes = await deliverypersonService.getAll(companyId);
                if (listRes.success) setDeliverypersonsList(listRes.data || []);
                const deletedDp = deliverypersonsList.find(dp => String(dp.id) === String(dpId));
                if (deletedDp && challanMeta.deliveryPersonName === deletedDp.name) {
                    setChallanMeta(prev => ({
                        ...prev,
                        deliveryPersonName: '',
                        deliveryPersonMobile: '',
                        deliveryPersonEmail: ''
                    }));
                }
            } else {
                toast.error(res.message || 'Failed to delete delivery person');
            }
        } catch (err) {
            console.error('Error deleting delivery person:', err);
            toast.error('Error deleting delivery person');
        }
    };

    const handleAddDeliveryPersonSubmit = async (e) => {
        e.preventDefault();
        if (!deliverypersonFormData.name) {
            toast.error('Delivery person name is required');
            return;
        }
        try {
            setDeliverypersonSubmitting(true);
            const companyId = GetCompanyId();
            let res;
            if (editingDeliveryPersonId) {
                res = await deliverypersonService.update(editingDeliveryPersonId, {
                    ...deliverypersonFormData,
                    companyId
                });
            } else {
                res = await deliverypersonService.create({
                    ...deliverypersonFormData,
                    companyId
                });
            }
            if (res.success) {
                toast.success(editingDeliveryPersonId ? 'Delivery person updated successfully' : 'Delivery person created successfully');
                setShowAddDeliveryPersonModal(false);
                setEditingDeliveryPersonId(null);
                setDeliverypersonFormData({ name: '', phone: '', email: '' });
                const listRes = await deliverypersonService.getAll(companyId);
                if (listRes.success) setDeliverypersonsList(listRes.data || []);
                const updatedDp = res.data;
                if (updatedDp) {
                    setChallanMeta(prev => ({
                        ...prev,
                        deliveryPersonName: updatedDp.name || '',
                        deliveryPersonMobile: updatedDp.phone || '',
                        deliveryPersonEmail: updatedDp.email || ''
                    }));
                }
            } else {
                toast.error(res.message || 'Failed to save delivery person');
            }
        } catch (err) {
            console.error('Error saving delivery person:', err);
            toast.error('Error saving delivery person');
        } finally {
            setDeliverypersonSubmitting(false);
        }
    };

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
                    setCustomerId(c.id);
                    setCustomerDetails({
                        address: c.shippingAddress || c.billingAddress || '',
                        email: c.email || '',
                        phone: c.phone || '',
                        city: c.shippingCity || c.billingCity || '',
                        state: c.shippingState || c.billingState || '',
                        zipCode: c.shippingZip || c.billingZip || c.shippingZipCode || c.billingZipCode || ''
                    });
                    setBillingDetails({
                        address: c.billingAddress || '',
                        city: c.billingCity || '',
                        state: c.billingState || '',
                        zipCode: c.billingZip || c.billingZipCode || ''
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
        { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart, status: 'completed' },
        { id: 'delivery', label: 'Delivery', icon: Truck, status: 'active' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, status: 'pending' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'pending' },
    ];

    const resetForm = () => {
        setSelectedOrder(null);
        setCustomerId('');
        setCustomerDetails({ address: '', email: '', phone: '', city: '', state: '', zipCode: '' });
        setBillingDetails({ address: '', city: '', state: '', zipCode: '' });
        setItems([]);
        setSelectedChallanIds([]);
        const autoDC = `DC-${Math.floor(10000000 + Math.random() * 90000000)}`;
        setChallanMeta({
            challanNo: autoDC,
            manualNo: '',
            date: new Date().toISOString().split('T')[0],
            carrier: '',
            vehicleNo: '',
            transportNote: companyDetails.notes || '',
            remarks: companyDetails.terms || '',
            deliveryPersonName: '',
            deliveryPersonMobile: '',
            deliveryPersonEmail: ''
        });
        setIsEditMode(false);
        setIsViewMode(false);
        setEditId(null);
        setActiveModalStep(1);
        setSelectedWarehouseId(getDefaultSalesWarehouseId());
        setOrderSearchTerm('');
        setChallanFilterCustomerId('');
        setCustomFieldValues({});
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const nonConvertedIds = deliveryChallans
                .filter(dc => dc.status !== 'CONVERTED')
                .map(dc => dc.id);
            setSelectedChallanIds(nonConvertedIds);
        } else {
            setSelectedChallanIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedChallanIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkConvert = async () => {
        if (selectedChallanIds.length === 0) return;

        try {
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.convertMultiple(selectedChallanIds, companyId);
            if (response.data.success) {
                toast.success("Successfully converted selected Delivery Challans to Invoice!");
                setSelectedChallanIds([]);
                fetchData();
            } else {
                toast.error(response.data.message || "Failed to convert selected Delivery Challans.");
            }
        } catch (error) {
            console.error("Bulk convert error:", error);
            toast.error(error.response?.data?.message || "Error converting selected Delivery Challans.");
        }
    };

    const handleAddNew = async () => {
        resetForm();
        const defWhId = getDefaultSalesWarehouseId();
        setItems([{ id: Date.now(), productId: '', warehouseId: defWhId, description: '', ordered: 0, delivered: 0, unit: 'pcs' }]);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'deliverychallan');
                if (res.data.success) {
                    const nextRef = res.data.nextManualReference || res.data.details?.nextManualReference || '';
                    setChallanMeta(prev => ({
                        ...prev,
                        challanNo: res.data.nextNumber,
                        manualNo: nextRef || prev.manualNo || ''
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching next deliverychallan number:', error);
        }
        setShowAddModal(true);
        setShowOrderSelect(false);
        setCreationMode('direct');
        setActiveModalStep(2);
    };

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        setCustomerId(order.customerId);

        const c = order.customer || {};
        setCustomerDetails({
            address: c.shippingAddress || c.billingAddress || '',
            email: c.email || '',
            phone: c.phone || '',
            city: c.shippingCity || c.billingCity || '',
            state: c.shippingState || c.billingState || '',
            zipCode: c.shippingZipCode || c.billingZipCode || ''
        });
        setBillingDetails({
            address: c.billingAddress || '',
            city: c.billingCity || '',
            state: c.billingState || '',
            zipCode: c.billingZipCode || ''
        });
        const sourceItems = order.salesorderitem || order.items || [];
        const productItems = sourceItems
            .filter(item => item.productId) // ONLY physical products can be delivered
            .map(item => {
                // Find product to get unit
                const product = allProducts.find(p => p.id === item.productId);
                return {
                    id: Date.now() + Math.random(),
                    productId: item.productId, // Keep as ID from backend
                    warehouseId: item.warehouseId || getDefaultSalesWarehouseId(),
                    description: item.description || '',
                    ordered: item.quantity,
                    delivered: item.quantity,
                    unit: product?.uom?.unitName || product?.salesUom?.unitName || product?.unit || 'NA'
                };
            });

        if (productItems.length === 0) {
            toast.error("This Sales Order contains no physical products to deliver.");
            return;
        }

        setNotes(`Sales Order No: ${order.orderNumber}${order.notes ? '\n' + order.notes : ''}`);
        setChallanMeta(prev => ({ ...prev, remarks: `Sales Order No: ${order.orderNumber}${order.notes ? '\n' + order.notes : ''}` }));
        setItems(productItems);
        setShowOrderSelect(false);
        setActiveModalStep(2); // Proceed directly to Challan Details
    };

    const handleSelectWarehouse = (wId) => {
        setSelectedWarehouseId(wId);
        // Apply global warehouse to all items
        setItems(prev => prev.map(item => ({ ...item, warehouseId: wId })));
        setActiveModalStep(3); // Proceed to main form
    };

    const updateItem = (id, field, value) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleView = async (challanId) => {
        try {
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.getById(challanId, companyId);
            if (response.data.success) {
                const challan = response.data.data;
                resetForm();
                setIsViewMode(true);
                setEditId(challanId);

                setCustomerId(challan.customerId);

                // Fallback to customer data if challan shipping fields are empty
                const custFallback = challan.customer || {};
                setCustomerDetails({
                    address: challan.shippingAddress || custFallback.shippingAddress || custFallback.billingAddress || '',
                    email: challan.shippingEmail || custFallback.email || '',
                    phone: challan.shippingPhone || custFallback.phone || '',
                    city: challan.shippingCity || custFallback.shippingCity || custFallback.billingCity || '',
                    state: challan.shippingState || custFallback.shippingState || custFallback.billingState || '',
                    zipCode: challan.shippingZipCode || custFallback.shippingZipCode || custFallback.billingZipCode || ''
                });

                if (challan.customer) {
                    setBillingDetails({
                        address: challan.customer.billingAddress || '',
                        city: challan.customer.billingCity || '',
                        state: challan.customer.billingState || '',
                        zipCode: challan.customer.billingZipCode || ''
                    });
                }



                if (challan.salesorder) {
                    setSelectedOrder(challan.salesorder);
                }

                setItems((challan.deliverychallanitem || challan.items || []).map(item => ({
                    id: item.id,
                    productId: item.productId,
                    warehouseId: item.warehouseId,
                    description: item.description || '',
                    ordered: item.quantity,
                    delivered: item.quantity,
                    unit: item.product?.uom?.unitName || item.product?.salesUom?.unitName || item.product?.unit || 'pcs'
                })));

                let fieldValues = {};
                if (challan.customFields) {
                    try {
                        fieldValues = typeof challan.customFields === 'string'
                            ? JSON.parse(challan.customFields)
                            : challan.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on view:', e);
                    }
                }
                setCustomFieldValues(fieldValues);

                let initialRemarks = challan.remarks || challan.notes || '';
                if (challan.salesorder?.orderNumber && !initialRemarks.includes(challan.salesorder.orderNumber)) {
                    initialRemarks = `Sales Order No: ${challan.salesorder.orderNumber}${initialRemarks ? '\n' + initialRemarks : ''}`;
                }

                setChallanMeta({
                    challanNo: challan.challanNumber,
                    manualNo: challan.manualReference || '',
                    date: new Date(challan.date).toISOString().split('T')[0],
                    carrier: challan.carrier || '',
                    vehicleNo: challan.vehicleNo || '',
                    transportNote: challan.transportNote || '',
                    remarks: initialRemarks,
                    deliveryPersonName: fieldValues.deliveryPersonName || '',
                    deliveryPersonMobile: fieldValues.deliveryPersonMobile || '',
                    deliveryPersonEmail: fieldValues.deliveryPersonEmail || ''
                });

                if (challan.salesorder) {
                    setSelectedOrder(challan.salesorder);
                }

                setActiveModalStep(2);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error fetching challan for view:', error);
        }
    };

    const handleEdit = async (challanId) => {
        try {
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.getById(challanId, companyId);
            if (response.data.success) {
                const challan = response.data.data;
                resetForm();
                setIsEditMode(true);
                setEditId(challanId);

                setCustomerId(challan.customerId);
                setCustomerDetails({
                    address: challan.shippingAddress || '',
                    email: challan.shippingEmail || '',
                    phone: challan.shippingPhone || '',
                    city: challan.shippingCity || '',
                    state: challan.shippingState || '',
                    zipCode: challan.shippingZipCode || ''
                });

                if (challan.customer) {
                    setBillingDetails({
                        address: challan.customer.billingAddress || '',
                        city: challan.customer.billingCity || '',
                        state: challan.customer.billingState || '',
                        zipCode: challan.customer.billingZipCode || ''
                    });
                }

                let fieldValues = {};
                if (challan.customFields) {
                    try {
                        fieldValues = typeof challan.customFields === 'string'
                            ? JSON.parse(challan.customFields)
                            : challan.customFields;
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                }
                setCustomFieldValues(fieldValues);

                setChallanMeta({
                    challanNo: challan.challanNumber,
                    manualNo: challan.manualReference || '',
                    date: new Date(challan.date).toISOString().split('T')[0],
                    carrier: challan.carrier || '',
                    vehicleNo: challan.vehicleNo || '',
                    transportNote: challan.transportNote || '',
                    remarks: challan.remarks || '',
                    deliveryPersonName: fieldValues.deliveryPersonName || '',
                    deliveryPersonMobile: fieldValues.deliveryPersonMobile || '',
                    deliveryPersonEmail: fieldValues.deliveryPersonEmail || ''
                });

                if (challan.salesorder) {
                    setSelectedOrder(challan.salesorder);
                }

                setItems((challan.deliverychallanitem || challan.items || []).map(item => ({
                    id: item.id,
                    productId: item.productId,
                    warehouseId: item.warehouseId,
                    description: item.description || '',
                    ordered: item.quantity,
                    delivered: item.quantity,
                    unit: item.product?.uom?.unitName || item.product?.salesUom?.unitName || item.product?.unit || 'pcs'
                })));

                setActiveModalStep(2);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error fetching challan for edit:', error);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const handleConvert = async (id) => {
        try {
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.convert(id, companyId);
            if (response.data.success) {
                toast.success('Converted to Invoice successfully');
                setShowAddModal(false);
                navigate('/company/sales/invoice', { state: { targetInvoiceId: response.data.data.id } });
            } else {
                toast.error(response.data.message || 'Conversion failed');
            }
        } catch (error) {
            console.error('Error converting challan:', error);
            toast.error(error.response?.data?.message || 'Error converting challan');
        }
    };

    const handleStatusChange = async (challanId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const response = await deliveryChallanService.update(challanId, payload, companyId);
            if (response.data?.success || response.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    const addItem = () => {
        const defWarehouseId = getDefaultSalesWarehouseId();
        setItems([...items, { id: Date.now(), productId: '', warehouseId: defWarehouseId, description: '', ordered: 0, delivered: 0, unit: 'pcs' }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    // --- Filter Logic ---
    const filteredChallans = React.useMemo(() => {
        return deliveryChallans.filter(c => {
            const query = searchTerm.toLowerCase();
            const matchesSearch = !query ||
                c.challanNumber?.toLowerCase().includes(query) ||
                c.customer?.name?.toLowerCase().includes(query);

            const cDate = new Date(c.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || cDate >= start) && (!end || cDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [deliveryChallans, searchTerm, startDate, endDate]);

    const filteredActiveOrders = React.useMemo(() => {
        return activeOrders.filter(o => {
            const query = orderSearchTerm.toLowerCase();
            const matchesSearch = !query ||
                o.orderNumber?.toLowerCase().includes(query) ||
                o.customer?.name?.toLowerCase().includes(query);

            const matchesCustomer = !challanFilterCustomerId || o.customerId === parseInt(challanFilterCustomerId);

            return matchesSearch && matchesCustomer;
        });
    }, [activeOrders, orderSearchTerm, challanFilterCustomerId]);

    const handleTopItemSelect = (val) => {
        if (!val) return;
        let selectedProduct = null;
        if (val.startsWith('p-')) {
            const pId = val.split('-')[1];
            selectedProduct = allProducts.find(x => String(x.id) === String(pId));
        }
        if (!selectedProduct) return;

        const newItem = {
            id: Date.now(),
            productId: selectedProduct.id,
            warehouseId: getDefaultSalesWarehouseId(),
            delivered: 1,
            description: selectedProduct.name || ''
        };

        setItems(prev => {
            if (prev.length === 1 && !prev[0].productId) {
                return [newItem];
            }
            return [...prev, newItem];
        });
    };

    const handleSave = async (allowDuplicate = false) => {
        try {
            if (!customerId) {
                toast.error("Please select a customer.");
                return;
            }
            if (!challanMeta.challanNo || !challanMeta.challanNo.trim()) {
                toast.error("Please enter a Challan Number.");
                return;
            }
            if (!challanMeta.date) {
                toast.error("Please select a Date.");
                return;
            }
            if (!challanMeta.vehicleNo || !challanMeta.vehicleNo.trim()) {
                toast.error("Please enter a Vehicle Number.");
                return;
            }
            if (!challanMeta.deliveryPersonName || !challanMeta.deliveryPersonName.trim()) {
                toast.error("Please enter the Delivery Person Name.");
                return;
            }
            if (!challanMeta.deliveryPersonMobile || !challanMeta.deliveryPersonMobile.trim()) {
                toast.error("Please enter the Delivery Person Mobile.");
                return;
            }
            if (items.some(i => !i.productId || !i.warehouseId)) {
                toast.error("All items must have a product and a warehouse");
                return;
            }
            if (!challanMeta.deliveryPersonName?.trim()) {
                toast.error("Delivery Person Name is required.");
                return;
            }
            if (!challanMeta.deliveryPersonMobile?.trim()) {
                toast.error("Delivery Person Mobile is required.");
                return;
            }
            if (!challanMeta.deliveryPersonEmail?.trim()) {
                toast.error("Delivery Person Email is required.");
                return;
            }

            const companyId = GetCompanyId();
            const data = {
                challanNumber: challanMeta.challanNo,
                manualReference: challanMeta.manualNo,
                date: challanMeta.date,
                customerId: parseInt(customerId),
                companyId: companyId,
                salesOrderId: selectedOrder ? parseInt(selectedOrder.id) : null,
                customFields: JSON.stringify({
                    ...customFieldValues,
                    deliveryPersonName: challanMeta.deliveryPersonName,
                    deliveryPersonMobile: challanMeta.deliveryPersonMobile,
                    deliveryPersonEmail: challanMeta.deliveryPersonEmail
                }),
                vehicleNo: challanMeta.vehicleNo,
                carrier: challanMeta.carrier,
                transportNote: challanMeta.transportNote,
                remarks: challanMeta.remarks,
                shippingAddress: customerDetails.address,
                shippingCity: customerDetails.city,
                shippingState: customerDetails.state,
                shippingZipCode: customerDetails.zipCode,
                shippingPhone: customerDetails.phone,
                shippingEmail: customerDetails.email,
                items: items.map(item => ({
                    productId: parseInt(item.productId),
                    warehouseId: parseInt(item.warehouseId),
                    quantity: parseFloat(item.delivered),
                    description: item.description || (allProducts.find(p => p.id === parseInt(item.productId))?.name || '')
                })),
                allowDuplicateManualNo: allowDuplicate === true
            };

            let response;
            try {
                if (isEditMode) {
                    response = await deliveryChallanService.update(editId, data, companyId);
                } else {
                    response = await deliveryChallanService.create(data);
                }

                if (response.data.success) {
                    toast.success(isEditMode ? 'Challan updated successfully' : 'Challan created successfully');
                    fetchData();
                    setShowAddModal(false);
                    resetForm();
                }
            } catch (err) {
                if (err.response?.data?.isDuplicateWarning) {
                    const confirmUse = window.confirm(err.response.data.message);
                    if (confirmUse) {
                        await handleSave(true);
                    }
                } else {
                    toast.error(err.response?.data?.message || 'Error saving delivery challan');
                    console.error('Error saving challan:', err);
                }
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
        }
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            const response = await deliveryChallanService.delete(deleteId, companyId);
            if (response.data.success) {
                fetchData();
                setShowDeleteModal(false);
                setDeleteId(null);
            }
        } catch (error) {
            console.error('Error deleting challan:', error);
        }
    };

    const printRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `DeliveryChallan_${challanMeta.challanNo || 'New'}`,
    });

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (location.state && location.state.targetChallanId) {
            if (location.state.isEdit || location.state.autoEdit) {
                handleEdit(location.state.targetChallanId);
            } else {
                handleView(location.state.targetChallanId);
            }
            // Clear location state after handling to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, fetchData, navigate]);

    return (
        <div className="Zirak-DC-wrapper Zirak-DC-delivery-page">
            {!showAddModal && !isViewMode && (
                <>
                    <div className="Zirak-DC-page-header">
                        <div>
                            <h1 className="Zirak-DC-page-title">Delivery Challan</h1>
                            <p className="Zirak-DC-page-subtitle">Manage product deliveries and shipments</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {selectedChallanIds.length > 0 && (
                                <button className="Zirak-DC-btn-add" onClick={handleBulkConvert} style={{ backgroundColor: '#4f46e5' }}>
                                    <Receipt size={18} className="mr-2" /> Convert Selected ({selectedChallanIds.length})
                                </button>
                            )}
                            {hasPermission('create delivery challan') && (
                                <button className="Zirak-DC-btn-add" onClick={handleAddNew}>
                                    <Plus size={18} className="mr-2" /> Create Challan
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="Zirak-DC-process-tracker-card">
                        <div className="Zirak-DC-tracker-wrapper">
                            {salesProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`Zirak-DC-tracker-step ${step.status}`}>
                                        <div className="Zirak-DC-step-icon-wrapper">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="Zirak-DC-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="Zirak-DC-status-badge" size={14} />}
                                        </div>
                                        <span className="Zirak-DC-step-label">{step.label}</span>
                                    </div>
                                    {index < salesProcess.length - 1 && (
                                        <div className={`Zirak-DC-tracker-divider ${salesProcess[index + 1].status !== 'pending' ? 'active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="Zirak-DC-table-card mt-6">
                        <div className="Zirak-DC-table-controls p-4 border-b flex justify-between items-center gap-4 flex-wrap">
                            <div className="Zirak-DC-search-wrapper">
                                <Search className="Zirak-DC-search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by Challan ID or Customer..."
                                    className="Zirak-DC-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="Zirak-DC-date-filters flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input
                                        type="date"
                                        className="Zirak-DC-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input
                                        type="date"
                                        className="Zirak-DC-date-input"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="Zirak-DC-table-container">
                            <table className="Zirak-DC-challan-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={
                                                    deliveryChallans.length > 0 &&
                                                    deliveryChallans.filter(dc => dc.status !== 'CONVERTED').length > 0 &&
                                                    deliveryChallans.filter(dc => dc.status !== 'CONVERTED').every(dc => selectedChallanIds.includes(dc.id))
                                                }
                                            />
                                        </th>
                                        <th>CHALLAN ID</th>
                                        <th>CUSTOMER</th>
                                        <th>LINKED ORDER</th>
                                        <th>DATE</th>
                                        <th>STATUS</th>
                                        <th className="text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryChallans.map(dc => (
                                        <tr key={dc.id}>
                                            <td style={{ textAlign: 'center' }}>
                                                {dc.status !== 'CONVERTED' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedChallanIds.includes(dc.id)}
                                                        onChange={() => handleSelectRow(dc.id)}
                                                    />
                                                ) : (
                                                    <input type="checkbox" disabled />
                                                )}
                                            </td>
                                            <td className="font-bold Zirak-DC-text-blue-600">{dc.challanNumber}</td>
                                            <td>{dc.customer?.name}</td>
                                            <td><span className="Zirak-DC-source-link">{dc.salesOrder?.orderNumber || 'Direct'}</span></td>
                                            <td>{new Date(dc.date).toLocaleDateString()}</td>
                                            <td>
                                                <select
                                                    value={dc.manualStatus ? dc.status : 'AUTO'}
                                                    onChange={(e) => handleStatusChange(dc.id, e.target.value)}
                                                    className="Zirak-DC-challan-status-pill"
                                                    style={getStatusStyle(dc.manualStatus ? dc.status : 'AUTO')}
                                                >
                                                    <option value="AUTO">Auto ({dc.status || 'Pending'})</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="PARTIAL">PARTIAL</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            </td>
                                            <td className="text-right">
                                                <div className="Zirak-DC-delivery-action-buttons">
                                                    <button className="Zirak-DC-challan-action-btn Zirak-DC-view" onClick={() => handleView(dc.id)} title="View"><Eye size={16} /></button>
                                                    {dc.status !== 'CONVERTED' ? (
                                                        <button className="Zirak-DC-challan-action-btn Zirak-DC-convert" onClick={() => handleConvert(dc.id)} title="Convert to Invoice" style={{ backgroundColor: '#4f46e5', color: 'white' }}><Receipt size={16} /></button>
                                                    ) : (
                                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded" style={{ alignSelf: 'center' }}>Converted</span>
                                                    )}
                                                    {hasPermission('edit delivery challan') && (
                                                        <button className="Zirak-DC-challan-action-btn Zirak-DC-edit" onClick={() => handleEdit(dc.id)} title="Edit"><Pencil size={16} /></button>
                                                    )}
                                                    {hasPermission('delete delivery challan') && (
                                                        <button className="Zirak-DC-challan-action-btn Zirak-DC-delete" onClick={() => handleDeleteClick(dc.id)} title="Delete"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Enhanced Create Full Page View */}
            {(showAddModal || isViewMode) && (
                <div className="Zirak-DC-delivery-challan-full-page-create">
                    <div className="Zirak-DC-view-page-header Zirak-DC-no-print" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) && (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" className="Zirak-DC-modal-logo-img" style={{ height: '26px', objectFit: 'contain' }} />
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0 }}>
                                    {isViewMode ? 'View Delivery Challan' : isEditMode ? 'Edit Delivery Challan' : 'New Delivery Challan'}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.725rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name} • {companyDetails.phone} • {companyDetails.email}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button className="Zirak-DC-btn-back" onClick={handlePrint} style={{ backgroundColor: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}>
                                    <Printer size={16} /> Print Challan
                                </button>
                            )}
                            <button className="Zirak-DC-btn-back" onClick={() => { setShowAddModal(false); setIsViewMode(false); resetForm(); }}>
                                <ArrowLeft size={16} /> Back to Delivery Challans
                            </button>
                        </div>
                    </div>

                    <div className="Zirak-DC-modal-content Zirak-DC-delivery-modal-premium">
                        <div className="Zirak-DC-modal-body-scrollable" ref={printRef}>
                            {/* Modal Step Indicator - Only for Create/Edit */}
                            {!isViewMode && (
                                <div className="Zirak-DC-modal-step-stepper">
                                    <div className={`Zirak-DC-m-step ${activeModalStep >= 1 ? 'active' : ''} ${activeModalStep > 1 ? 'done' : ''}`}>
                                        <div className="Zirak-DC-m-step-num">{activeModalStep > 1 ? '✓' : '1'}</div>
                                        <span>Select Order</span>
                                    </div>
                                    <div className={`Zirak-DC-m-step-line ${activeModalStep >= 2 ? 'active' : ''}`}></div>
                                    <div className={`Zirak-DC-m-step ${activeModalStep >= 2 ? 'active' : ''}`}>
                                        <div className="Zirak-DC-m-step-num">2</div>
                                        <span>Challan Details</span>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Order Selection List (Conditional) */}
                            {activeModalStep === 1 && (
                                <div className="Zirak-DC-order-link-container-premium">
                                    <div className="Zirak-DC-section-header-flex mb-6">
                                        <div className="Zirak-DC-form-group-mini">
                                            <label className="Zirak-DC-form-label-sm">Select Customer First</label>
                                            <select
                                                className="Zirak-DC-purchase-module-select-large"
                                                style={{ width: '300px' }}
                                                value={challanFilterCustomerId}
                                                onChange={(e) => setChallanFilterCustomerId(e.target.value)}
                                            >
                                                <option value="">Choose Customer...</option>
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

                                        <div className="flex items-center gap-4">
                                            <div className="Zirak-DC-order-search-mini">
                                                <Search size={14} className="Zirak-DC-o-search-icon-mini" />
                                                <input
                                                    type="text"
                                                    placeholder="Search orders..."
                                                    className="Zirak-DC-o-search-input-mini"
                                                    value={orderSearchTerm}
                                                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                                                />
                                            </div>
                                            <button className="Zirak-DC-btn-direct-entry" onClick={() => { setCreationMode('direct'); setActiveModalStep(2); }}>
                                                Direct Delivery (No Order) <ArrowRight size={14} className="ml-1" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="Zirak-DC-section-header-flex mb-4">
                                        <h3 className="text-md Zirak-DC-font-extrabold Zirak-DC-text-slate-700 flex items-center gap-2">
                                            <ShoppingCart size={18} className="Zirak-DC-text-indigo-500" />
                                            {challanFilterCustomerId
                                                ? `Available Orders (${filteredActiveOrders.length})`
                                                : 'All Pending Sales Orders'}
                                        </h3>
                                    </div>
                                    <div className="Zirak-DC-order-grid-premium">
                                        {filteredActiveOrders.length > 0 ? (
                                            filteredActiveOrders.map(order => (
                                                <div key={order.id} className="Zirak-DC-order-link-card-premium" onClick={() => handleSelectOrder(order)}>
                                                    <div className="Zirak-DC-o-card-header-premium">
                                                        <div className="Zirak-DC-o-id-badge">
                                                            <FileText size={12} />
                                                            <span>{order.orderNumber}</span>
                                                        </div>
                                                        <div className="Zirak-DC-o-date-premium">
                                                            <Clock size={12} />
                                                            <span>{new Date(order.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                        </div>
                                                    </div>
                                                    <div className="Zirak-DC-o-card-body-premium">
                                                        <div className="Zirak-DC-o-customer-flex">
                                                            <div className="Zirak-DC-cust-avatar">{order.customer?.name?.charAt(0) || 'C'}</div>
                                                            <div className="Zirak-DC-cust-info">
                                                                <span className="Zirak-DC-cust-name">{order.customer?.name}</span>
                                                                <span className="Zirak-DC-cust-location">{order.customer?.billingCity || 'No Location'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="Zirak-DC-o-items-summary">
                                                            {(order.salesorderitem?.length || order.items?.length || 0)} items to deliver
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="Zirak-DC-empty-orders-state">
                                                <PackageCheck size={40} className="Zirak-DC-text-slate-200" />
                                                <p>No pending sales orders found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Main Form */}
                            {activeModalStep === 2 && (
                                <>
                                    {/* ========== VIEW MODE: Challan Document ========== */}
                                    {isViewMode ? (
                                        <div className="Zirak-DC-view-challan-doc">
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
                                                                <div className="invoice-title-large" style={{ color: companySettings?.invoiceColor || '#004aad', margin: '0' }}>{getDocumentTitle('deliverychallan')}</div>
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
                                                                        <span className="invoice-label">Challan No:</span>
                                                                        <span>#{challanMeta?.challanNo || '—'}</span>
                                                                    </div>
                                                                    <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                        <span className="invoice-label">Date:</span>
                                                                        <span>{challanMeta.date ? new Date(challanMeta.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                                                                    </div>
                                                                    {challanMeta.manualNo && (
                                                                        <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                            <span className="invoice-label">Manual Ref:</span>
                                                                            <span>{challanMeta.manualNo}</span>
                                                                        </div>
                                                                    )}
                                                                    {challanMeta.vehicleNo && (
                                                                        <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                            <span className="invoice-label">Vehicle No:</span>
                                                                            <span>{challanMeta.vehicleNo}</span>
                                                                        </div>
                                                                    )}
                                                                    {challanMeta.deliveryPersonName && (
                                                                        <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                            <span className="invoice-label">Del. Person:</span>
                                                                            <span>{challanMeta.deliveryPersonName}</span>
                                                                        </div>
                                                                    )}
                                                                    {challanMeta.deliveryPersonMobile && (
                                                                        <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                            <span className="invoice-label">Del. Mobile:</span>
                                                                            <span>{challanMeta.deliveryPersonMobile}</span>
                                                                        </div>
                                                                    )}
                                                                    {challanMeta.deliveryPersonEmail && (
                                                                        <div className="invoice-meta-row flex justify-between gap-8 py-1 text-sm">
                                                                            <span className="invoice-label">Del. Email:</span>
                                                                            <span>{challanMeta.deliveryPersonEmail}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="invoice-addresses" style={{ display: 'flex', justifyContent: 'space-between', width: '100% !important', marginTop: '2.5rem', gap: '3rem' }}>
                                                    <div className="invoice-bill-to" style={{ flex: 1, textAlign: 'left', minWidth: '0' }}>
                                                        <div className="invoice-section-header">BILL TO</div>
                                                        <div className="font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                                                            {customers.find(c => c.id === parseInt(customerId))?.name || '—'}
                                                        </div>
                                                        {billingDetails.address && <div style={{ marginTop: '8px', color: '#475569', fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.4' }}>{billingDetails.address}</div>}
                                                        {[billingDetails.city, billingDetails.state, billingDetails.zipCode].filter(Boolean).length > 0 && (
                                                            <div style={{ color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>{[billingDetails.city, billingDetails.state, billingDetails.zipCode].filter(Boolean).join(', ')}</div>
                                                        )}
                                                        {(() => {
                                                            const cust = customers.find(c => c.id === parseInt(customerId));
                                                            return (<>
                                                                {cust?.phone && <div style={{ color: '#475569', fontSize: '0.95rem' }}>{cust.phone}</div>}
                                                                {cust?.email && <div style={{ color: '#475569', fontSize: '0.95rem' }}>{cust.email}</div>}
                                                            </>);
                                                        })()}
                                                    </div>

                                                    <div className="invoice-ship-to" style={{ flex: 1, textAlign: 'right', minWidth: '0' }}>
                                                        <div className="invoice-section-header">SHIP TO / DESTINATION</div>
                                                        <div className="font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                                                            {customers.find(c => c.id === parseInt(customerId))?.name || '—'}
                                                        </div>
                                                        {customerDetails.address && <div style={{ marginTop: '8px', color: '#475569', fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.4' }}>{customerDetails.address}</div>}
                                                        {[customerDetails.city, customerDetails.state, customerDetails.zipCode].filter(Boolean).length > 0 && (
                                                            <div style={{ color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>{[customerDetails.city, customerDetails.state, customerDetails.zipCode].filter(Boolean).join(', ')}</div>
                                                        )}
                                                        {customerDetails.phone && <div style={{ color: '#475569', fontSize: '0.95rem' }}>{customerDetails.phone}</div>}
                                                        {customerDetails.email && <div style={{ color: '#475569', fontSize: '0.95rem' }}>{customerDetails.email}</div>}
                                                    </div>
                                                </div>

                                                {/* Custom Fields Print View */}
                                                {(() => {
                                                    const dc = deliveryChallans.find(c => c.id === editId);
                                                    let customFieldVals = {};
                                                    if (dc?.customFields) {
                                                        try {
                                                            customFieldVals = typeof dc.customFields === 'string'
                                                                ? JSON.parse(dc.customFields)
                                                                : dc.customFields;
                                                        } catch (e) {
                                                            console.error('Error parsing delivery challan custom fields for view:', e);
                                                        }
                                                    }
                                                    const fieldsList = getCustomFieldsForType('deliverychallan');
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
                                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>#</th>
                                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('item', 'Product / Description').toUpperCase()}</th>
                                                            {getInvoiceLabel('showWarehouse') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>{getTableHeader('warehouse', 'Warehouse').toUpperCase()}</th>}
                                                            <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'center' }}>DELIVERED</th>
                                                            {getInvoiceLabel('showUom') !== false && <th style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)', textAlign: 'center' }}>{getTableHeader('uom', 'Unit').toUpperCase()}</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item, idx) => {
                                                            const prod = allProducts.find(p => p.id === Number(item.productId));
                                                            return (
                                                                <tr key={item.id}>
                                                                    <td style={{ width: '5%' }}>{idx + 1}</td>
                                                                    <td style={{ width: '35%' }}>
                                                                        <div className="font-bold text-sm text-gray-800">{prod?.name || 'Unknown Product'}</div>
                                                                        {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                                                                    </td>
                                                                    {getInvoiceLabel('showWarehouse') !== false && <td>{allWarehouses.find(w => w.id === parseInt(item.warehouseId))?.name || 'N/A'}</td>}
                                                                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.delivered}</td>
                                                                    {getInvoiceLabel('showUom') !== false && <td style={{ textAlign: 'center' }}>{item.unit || 'pcs'}</td>}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>

                                                {getInvoiceLabel('showFooter') !== false && (
                                                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                                        <div className="Zirak-DC-vcd-notes-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', margin: '0 0 2rem 0' }}>
                                                            {challanMeta.transportNote && (
                                                                <div>
                                                                    <strong style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Transport / Logistics Note</strong>
                                                                    <p style={{ color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-line', marginTop: '4px' }}>{challanMeta.transportNote}</p>
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                let displayRemarks = challanMeta.remarks || '';
                                                                const currentChallan = editId ? deliveryChallans.find(c => c.id === editId) : null;
                                                                const soNum = selectedOrder?.orderNumber || currentChallan?.salesorder?.orderNumber;
                                                                const notesText = currentChallan?.notes || '';
                                                                if (soNum && !displayRemarks.includes(soNum)) {
                                                                    displayRemarks = `Sales Order No: ${soNum}${displayRemarks ? '\n' + displayRemarks : ''}`;
                                                                } else if (!displayRemarks && notesText) {
                                                                    displayRemarks = notesText;
                                                                }
                                                                if (!displayRemarks) return null;
                                                                return (
                                                                    <div>
                                                                        <strong style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Remarks</strong>
                                                                        <p style={{ color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-line', marginTop: '4px' }}>{displayRemarks}</p>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        <div className="Zirak-DC-vcd-sig-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                                                            <div className="Zirak-DC-vcd-sig-box" style={{ width: '200px', textAlign: 'center' }}>
                                                                <div className="Zirak-DC-vcd-sig-line" style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '8px' }}></div>
                                                                <div className="Zirak-DC-vcd-sig-label" style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Authorized Signatory</div>
                                                            </div>
                                                            <div className="Zirak-DC-vcd-sig-box" style={{ width: '200px', textAlign: 'center' }}>
                                                                <div className="Zirak-DC-vcd-sig-line" style={{ borderBottom: '1px solid #cbd5e1', marginBottom: '8px' }}></div>
                                                                <div className="Zirak-DC-vcd-sig-label" style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Received By</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* ========== CREATE/EDIT MODE: Form ========== */
                                        <>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(340px, 480px) minmax(280px, 360px)',
                                            justifyContent: 'space-between',
                                            gap: '2.5rem',
                                            marginBottom: '30px'
                                        }}>
                                            {/* LEFT COLUMN: Challan Metadata & Customer Select */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        CHALLAN NO. <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={challanMeta.challanNo || ''}
                                                        onChange={(e) => setChallanMeta({ ...challanMeta, challanNo: e.target.value })}
                                                        disabled={isViewMode || !!editId}
                                                        style={{ width: '100%', maxWidth: '320px' }}
                                                        className={`DeliveryChallan-meta-input ${isViewMode || editId ? 'DeliveryChallan-disabled' : ''}`}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        MANUAL REF
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. DC-MAN-01"
                                                        value={challanMeta.manualNo}
                                                        onChange={(e) => setChallanMeta({ ...challanMeta, manualNo: e.target.value })}
                                                        style={{ width: '100%', maxWidth: '320px' }}
                                                        className="DeliveryChallan-meta-input"
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        DATE <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={challanMeta.date}
                                                        onChange={(e) => setChallanMeta({ ...challanMeta, date: e.target.value })}
                                                        style={{ width: '100%', maxWidth: '320px' }}
                                                        className="DeliveryChallan-meta-input"
                                                        required
                                                    />
                                                </div>
                                                 <div>
                                                    <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                        <User size={14} className="text-indigo-500" /> DELIVERY TO / CUSTOMER <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
                                                        <select
                                                            className="DeliveryChallan-customer-select"
                                                            style={{ flex: 1, width: '100%', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '4px 12px', fontSize: '0.875rem', lineHeight: '1.4', boxSizing: 'border-box' }}
                                                            value={customerId}
                                                            disabled={selectedOrder}
                                                            onChange={(e) => {
                                                                const cId = parseInt(e.target.value);
                                                                setCustomerId(cId);
                                                                const c = customers.find(cust => cust.id === cId);
                                                                if (c) {
                                                                    setCustomerDetails({
                                                                        address: c.shippingAddress || c.billingAddress || '',
                                                                        email: c.email || '',
                                                                        phone: c.phone || '',
                                                                        city: c.shippingCity || c.billingCity || '',
                                                                        state: c.shippingState || c.billingState || '',
                                                                        zipCode: c.shippingZipCode || c.billingZipCode || ''
                                                                    });
                                                                    setBillingDetails({
                                                                        address: c.billingAddress || '',
                                                                        city: c.billingCity || '',
                                                                        state: c.billingState || '',
                                                                        zipCode: c.billingZipCode || ''
                                                                    });
                                                                }
                                                            }}>
                                                            <option value="">Select Customer...</option>
                                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                        {!selectedOrder && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowAddCustomerModal(true)}
                                                                title="Add New Customer"
                                                                style={{
                                                                    backgroundColor: '#1e293b',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    width: '38px',
                                                                    height: '38px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                <Plus size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: Customer Details + Vehicle & Delivery Person Fields */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                               

                                                {/* Customer Details Card */}
                                                                                      {/* Vehicle & Delivery Person Details (1 Field Per Row) */}
                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                                     <div>
                                                         <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                             VEHICLE NO <span style={{ color: '#ef4444' }}>*</span>
                                                         </label>
                                                         <input
                                                             type="text"
                                                             value={challanMeta.vehicleNo}
                                                             onChange={(e) => setChallanMeta({ ...challanMeta, vehicleNo: e.target.value })}
                                                             style={{ width: '100%', maxWidth: '320px' }}
                                                             className="DeliveryChallan-meta-input font-mono"
                                                             placeholder='MH-12-XX-9999'
                                                             required
                                                         />
                                                     </div>

                                                     <div>
                                                         <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                             DEL. PERSON NAME <span style={{ color: '#ef4444' }}>*</span>
                                                         </label>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
                                                             <div style={{ flex: 1 }}>
                                                                 <SearchableSelect
                                                                     options={deliverypersonsList}
                                                                     value={deliverypersonsList.find(dp => dp.name === challanMeta.deliveryPersonName)?.id || ''}
                                                                     onChange={(selectedId) => {
                                                                         const matchedDp = deliverypersonsList.find(dp => String(dp.id) === String(selectedId));
                                                                         if (matchedDp) {
                                                                             setChallanMeta(prev => ({
                                                                                 ...prev,
                                                                                 deliveryPersonName: matchedDp.name || '',
                                                                                 deliveryPersonMobile: matchedDp.phone || '',
                                                                                 deliveryPersonEmail: matchedDp.email || ''
                                                                             }));
                                                                         } else {
                                                                             setChallanMeta(prev => ({
                                                                                 ...prev,
                                                                                 deliveryPersonName: '',
                                                                                 deliveryPersonMobile: '',
                                                                                 deliveryPersonEmail: ''
                                                                             }));
                                                                         }
                                                                     }}
                                                                     onEditOption={(opt) => handleEditDeliveryPerson(opt)}
                                                                     onDeleteOption={(dpId) => handleDeleteDeliveryPerson(dpId)}
                                                                     placeholder="Select Delivery Person..."
                                                                     groupKey=""
                                                                     clearable={true}
                                                                 />
                                                             </div>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => {
                                                                     setEditingDeliveryPersonId(null);
                                                                     setDeliverypersonFormData({ name: '', phone: '', email: '' });
                                                                     setShowAddDeliveryPersonModal(true);
                                                                 }}
                                                                 title="Add New Delivery Person"
                                                                 style={{
                                                                     backgroundColor: '#1e293b',
                                                                     color: '#ffffff',
                                                                     border: 'none',
                                                                     borderRadius: '6px',
                                                                     width: '38px',
                                                                     height: '38px',
                                                                     display: 'flex',
                                                                     alignItems: 'center',
                                                                     justifyContent: 'center',
                                                                     cursor: 'pointer',
                                                                     flexShrink: 0
                                                                 }}
                                                             >
                                                                 <Plus size={18} />
                                                             </button>
                                                         </div>
                                                     </div>

                                                     <div>
                                                         <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                             DEL. PERSON MOBILE <span style={{ color: '#ef4444' }}>*</span>
                                                         </label>
                                                         <input
                                                             type="text"
                                                             value={challanMeta.deliveryPersonMobile || ''}
                                                             onChange={(e) => setChallanMeta({ ...challanMeta, deliveryPersonMobile: e.target.value })}
                                                             style={{ width: '100%', maxWidth: '320px' }}
                                                             className="DeliveryChallan-meta-input"
                                                             placeholder='Enter mobile'
                                                             required
                                                         />
                                                     </div>

                                                     <div>
                                                         <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                             DEL. PERSON EMAIL <span style={{ color: '#ef4444' }}>*</span>
                                                         </label>
                                                         <input
                                                             type="text"
                                                             required
                                                             value={challanMeta.deliveryPersonEmail || ''}
                                                             onChange={(e) => setChallanMeta({ ...challanMeta, deliveryPersonEmail: e.target.value })}
                                                             style={{ width: '100%', maxWidth: '320px' }}
                                                             className="DeliveryChallan-meta-input"
                                                             placeholder='Enter email'
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                        </div>
                                

                                            {/* Custom Fields Section */}
                                            {getCustomFieldsForType('deliverychallan').length > 0 && (
                                                <div className="DeliveryChallan-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Custom Fields
                                                    </h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                        {getCustomFieldsForType('deliverychallan').map(field => (
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

                                             {/* Items Section Header */}
                                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', marginTop: '60px' }}>
                                                 <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                     LINE ITEMS
                                                 </h3>

                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '500px', marginLeft: 'auto' }}>
                                                     <div style={{ flex: 1 }}>
                                                         <SearchableSelect
                                                             placeholder="Type item name/SKU & press Enter..."
                                                             options={allProducts.map(p => ({
                                                                 ...p,
                                                                 id: `p-${p.id}`,
                                                                 name: `${p.name} ${p.sku ? `(${p.sku})` : ''}`,
                                                                 type: 'Products'
                                                             }))}
                                                             value=""
                                                             onChange={(val) => handleTopItemSelect(val)}
                                                             searchPlaceholder="Search product..."
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
                                                         title="Add Product Warehouse"
                                                         style={{
                                                             backgroundColor: '#1e293b',
                                                             color: '#ffffff',
                                                             border: 'none',
                                                             borderRadius: '6px',
                                                             width: '34px',
                                                             height: '34px',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             cursor: 'pointer',
                                                             flexShrink: 0
                                                         }}
                                                     >
                                                         <Plus size={18} />
                                                     </button>
                                                 </div>
                                             </div>

                                            <div className="Zirak-DC-items-section-new">
                                                <div className="Zirak-DC-table-responsive">
                                                    <table className="Zirak-DC-new-items-table">
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: '35%' }}>{getTableHeader('item', 'Product').toUpperCase()}</th>
                                                                {getInvoiceLabel('showWarehouse') !== false && <th style={{ width: '25%' }}>{getTableHeader('warehouse', 'WH / Location').toUpperCase()}</th>}
                                                                <th style={{ width: '20%', textAlign: 'center' }}>DELIVERY QTY</th>
                                                                {getInvoiceLabel('showUom') !== false && <th style={{ width: '10%', textAlign: 'center' }}>{getTableHeader('uom', 'Unit').toUpperCase()}</th>}
                                                                <th style={{ width: '10%', textAlign: 'center' }}>ACTION</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {items.map(item => (
                                                                <React.Fragment key={item.id}>
                                                                    <tr className="Zirak-DC-main-item-row Zirak-DC-hover:bg-slate-50">
                                                                        <td>
                                                                            <select className="Zirak-DC-full-width-input font-bold"
                                                                                value={Number(item.productId) || ''}
                                                                                onChange={(e) => {
                                                                                    const pId = Number(e.target.value);
                                                                                    const product = allProducts.find(p => p.id === pId);
                                                                                    updateItem(item.id, 'productId', pId);
                                                                                    if (product) {
                                                                                        updateItem(item.id, 'unit', product.uom?.unitName || product.salesUom?.unitName || product.unit || 'pcs');
                                                                                        if (!item.description) updateItem(item.id, 'description', product.name);
                                                                                    }
                                                                                }}>
                                                                                <option value="">Select Product...</option>
                                                                                {allProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.totalQuantity ?? 0})</option>)}
                                                                            </select>
                                                                        </td>
                                                                        {getInvoiceLabel('showWarehouse') !== false && (
                                                                            <td>
                                                                                <select className="Zirak-DC-full-width-input"
                                                                                    value={item.warehouseId || getDefaultSalesWarehouseId() || ''}
                                                                                    onChange={(e) => updateItem(item.id, 'warehouseId', e.target.value)}>
                                                                                    <option value="">Select Warehouse...</option>
                                                                                    {allWarehouses.map(w => {
                                                                                        const prod = allProducts.find(p => p.id === Number(item.productId));
                                                                                        const stockItem = prod?.stock?.find(s => Number(s.warehouseId) === Number(w.id));
                                                                                        const count = stockItem ? stockItem.quantity : 0;
                                                                                        return <option key={w.id} value={w.id}>{w.name} ({count})</option>;
                                                                                    })}
                                                                                </select>
                                                                            </td>
                                                                        )}
                                                                        <td className="text-center">
                                                                            <input type="number" value={item.delivered}
                                                                                min="0"
                                                                                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                                                                onChange={(e) => updateItem(item.id, 'delivered', e.target.value.replace(/-/g, ''))}
                                                                                className="Zirak-DC-qty-input-premium success" />
                                                                        </td>
                                                                        {getInvoiceLabel('showUom') !== false && (
                                                                            <td className="text-center">
                                                                                <span className="text-sm Zirak-DC-font-extrabold Zirak-DC-text-slate-600">{item.unit || 'pcs'}</span>
                                                                            </td>
                                                                        )}
                                                                        <td className="text-center">
                                                                            <button
                                                                                type="button"
                                                                                className="Zirak-DC-btn-delete-row"
                                                                                onClick={() => removeItem(item.id)}
                                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                                                disabled={items.length <= 1}
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                    <tr className="Zirak-DC-description-row">
                                                                        <td colSpan={3 + (getInvoiceLabel('showWarehouse') !== false ? 1 : 0) + (getInvoiceLabel('showUom') !== false ? 1 : 0)}>
                                                                            <input
                                                                                type="text"
                                                                                className="Zirak-DC-description-input-minimal"
                                                                                placeholder="Item description..."
                                                                                value={item.description || ''}
                                                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                </React.Fragment>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Footer Sections */}
                                            <div className="Zirak-DC-form-footer-grid mt-6">
                                                <div className="Zirak-DC-notes-col">
                                                    <label className="Zirak-DC-section-label-premium">Transport / Logistics Note</label>
                                                    <textarea className="Zirak-DC-notes-area-premium Zirak-DC-h-32"
                                                        value={challanMeta.transportNote}
                                                        onChange={(e) => setChallanMeta({ ...challanMeta, transportNote: e.target.value })}
                                                        placeholder="Driver contact, Courier name, Airway bill no..."></textarea>
                                                </div>
                                                <div className="Zirak-DC-notes-col">
                                                    <label className="Zirak-DC-section-label-premium">Delivery Remarks</label>
                                                    <textarea className="Zirak-DC-notes-area-premium Zirak-DC-h-32"
                                                        value={challanMeta.remarks}
                                                        onChange={(e) => setChallanMeta({ ...challanMeta, remarks: e.target.value })}
                                                        placeholder="Add any specific instructions or remarks..."></textarea>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                        </div>
                        <div className="Zirak-DC-modal-footer-simple">
                            <button className="Zirak-DC-btn-plain" onClick={() => setShowAddModal(false)}>Cancel</button>
                            {isViewMode && (
                                <>
                                    {deliveryChallans.find(c => c.id === editId)?.status !== 'CONVERTED' ? (
                                        <button className="Zirak-DC-btn-primary-green" onClick={() => handleConvert(editId)} style={{ backgroundColor: '#4f46e5' }}>
                                            <Receipt size={18} className="mr-2" /> Convert to Invoice
                                        </button>
                                    ) : (
                                        <span className="text-sm font-semibold px-3 py-2 bg-gray-100 text-gray-500 rounded mr-2">Already Converted</span>
                                    )}
                                    <button className="Zirak-DC-btn-primary-green" onClick={handlePrint}>
                                        <Printer size={18} className="mr-2" /> Print Challan
                                    </button>
                                </>
                            )}
                            {!isViewMode && (
                                <button className="Zirak-DC-btn-primary-green" onClick={handleSave}>
                                    {isEditMode ? 'Update Delivery' : 'Confirm Delivery'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="Zirak-DC-unique-delete-overlay">
                    <div className="Zirak-DC-unique-delete-modal">
                        <div className="Zirak-DC-unique-delete-header">
                            <h2 className="Zirak-DC-unique-delete-title">Delete Challan?</h2>
                            <button className="Zirak-DC-unique-delete-close" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-DC-unique-delete-body">
                            <p className="Zirak-DC-unique-delete-message">
                                Are you sure you want to delete this Delivery Challan? This action cannot be undone and will permanently remove the record.
                            </p>
                        </div>
                        <div className="Zirak-DC-unique-delete-footer">
                            <button className="Zirak-DC-unique-delete-btn Zirak-DC-unique-delete-cancel" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="Zirak-DC-unique-delete-btn Zirak-DC-unique-delete-confirm" onClick={confirmDelete}>
                                <Trash2 size={18} /> Delete
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

            {/* Add Delivery Person Modal */}
            {showAddDeliveryPersonModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(3px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '440px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: '#ffffff'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                                {editingDeliveryPersonId ? 'Edit Delivery Person' : 'Add New Delivery Person'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddDeliveryPersonModal(false);
                                    setEditingDeliveryPersonId(null);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddDeliveryPersonSubmit}>
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Name <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter delivery person name"
                                        value={deliverypersonFormData.name}
                                        onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, name: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.875rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Phone / Mobile
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter mobile number"
                                        value={deliverypersonFormData.phone}
                                        onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, phone: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.875rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={deliverypersonFormData.email}
                                        onChange={(e) => setDeliverypersonFormData({ ...deliverypersonFormData, email: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.875rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{
                                padding: '16px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                borderTop: '1px solid #f1f5f9',
                                backgroundColor: '#f8fafc'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddDeliveryPersonModal(false)}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deliverypersonSubmitting}
                                    style={{
                                        padding: '9px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#1e293b',
                                        color: '#ffffff',
                                        fontWeight: '700',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {deliverypersonSubmitting ? 'Saving...' : 'Save Delivery Person'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryChallan;
