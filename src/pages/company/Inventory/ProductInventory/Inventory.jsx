import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, Upload, Loader2, Eye, Download, FileSpreadsheet } from 'lucide-react';
import './Inventory.css';
import productService from '../../../../services/productService';
import categoryService from '../../../../services/categoryService';
import inventoryService from '../../../../services/inventoryService';
import uomService from '../../../../services/uomService';
import { toast } from 'react-hot-toast';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';
import { useNavigate } from 'react-router-dom';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import '../UOM/UOM.css';
import ExcelImportModal from '../../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../../utils/excelService';

import { AuthContext } from '../../../../context/AuthContext';

const Inventory = () => {
    const navigate = useNavigate();
    const { formatCurrency } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [uoms, setUoms] = useState([]);

    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);

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

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        hsn: '',
        barcode: '',
        categoryId: '',
        uomId: '',
        purchaseUomId: '',
        salesUomId: '',
        unit: '',
        description: '',
        asOfDate: new Date().toISOString().split('T')[0],
        taxAccount: '',
        initialCost: 0,
        salePrice: 0,
        purchasePrice: 0,
        discount: 0,
        remarks: '',
        image: null // File or null
    });

    const [warehouseRows, setWarehouseRows] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const [prodRes, catRes, whRes, uomRes] = await Promise.all([
                productService.getProducts(companyId),
                categoryService.getCategories(companyId),
                inventoryService.getWarehouses(companyId),
                uomService.getUOMs(companyId)
            ]);

            if (prodRes.success) setProducts(prodRes.data);
            if (catRes.success) setCategories(catRes.data);
            if (whRes.success) setWarehouses(whRes.data);
            if (uomRes.success) setUoms(uomRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    const addWarehouseRow = () => {
        const firstWhId = warehouses.length > 0 ? warehouses[0].id : '';
        setWarehouseRows([...warehouseRows, {
            id: Date.now(),
            warehouseId: firstWhId,
            quantity: 0,
            minOrderQty: 0,
            initialQty: 0
        }]);
    };

    const removeWarehouseRow = (id) => {
        setWarehouseRows(warehouseRows.filter(row => row.id !== id));
    };

    const handleWhRowChange = (id, field, value) => {
        setWarehouseRows(warehouseRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let processedVal = value;
        if (['initialCost', 'salePrice', 'purchasePrice', 'discount'].includes(name)) {
            if (typeof processedVal === 'string') {
                processedVal = processedVal.replace(/-/g, '');
                if (processedVal !== '') {
                    const parsed = parseFloat(processedVal);
                    if (!isNaN(parsed) && parsed < 0) {
                        processedVal = '0';
                    }
                }
            }
        }
        setFormData(prev => ({ ...prev, [name]: processedVal }));
    };

    const handleImageChange = async (e) => {
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
                setFormData(prev => ({ ...prev, image: imageUrl }));
                toast.success('Image uploaded successfully', { id: 'image-upload' });
            } catch (error) {
                console.error('Error uploading image:', error);
                toast.error('Failed to upload image', { id: 'image-upload' });
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', sku: '', hsn: '', barcode: '', categoryId: '',
            uomId: '', purchaseUomId: '', salesUomId: '', unit: '', description: '', asOfDate: new Date().toISOString().split('T')[0],
            taxAccount: '', initialCost: 0, salePrice: 0, purchasePrice: 0,
            discount: 0, remarks: '', image: null
        });
        setWarehouseRows([]);
    };

    // Build payload - now sending JSON as we have image URL
    const buildPayload = () => {
        const companyId = GetCompanyId();
        return {
            ...formData,
            companyId,
            warehouseInfo: warehouseRows
        };
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (uploadingImage) {
            toast.error('Please wait for image upload to complete');
            return;
        }

        try {
            const payload = buildPayload();
            // Assuming productService handles JSON correctly (axios default)
            const res = await productService.createProduct(payload);
            if (res.success) {
                toast.success('Product added successfully');
                setShowAddModal(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add product');
        }
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();

        if (uploadingImage) {
            toast.error('Please wait for image upload to complete');
            return;
        }

        try {
            const payload = buildPayload();
            const res = await productService.updateProduct(selectedProduct.id, payload);
            if (res.success) {
                toast.success('Product updated successfully');
                setShowEditModal(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update product');
        }
    };

    const handleDeleteProduct = async () => {
        try {
            const companyId = GetCompanyId();
            const res = await productService.deleteProduct(selectedProduct.id, companyId);
            if (res.success) {
                toast.success('Product deleted successfully');
                setShowDeleteModal(false);
                fetchData();
            }
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const openEditModal = (product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku || '',
            hsn: product.hsn || '',
            barcode: product.barcode || '',
            categoryId: product.categoryId || '',
            uomId: product.uomId || '',
            purchaseUomId: product.purchaseUomId || '',
            salesUomId: product.salesUomId || '',
            unit: product.unit || '',
            description: product.description || '',
            asOfDate: product.asOfDate ? product.asOfDate.split('T')[0] : new Date().toISOString().split('T')[0],
            taxAccount: product.taxAccount || '',
            initialCost: product.initialCost || 0,
            salePrice: product.salePrice || 0,
            purchasePrice: product.purchasePrice || 0,
            discount: product.discount || 0,
            remarks: product.remarks || '',
            image: product.image || null // This is a URL string for existing products
        });
        setWarehouseRows(product.stock.map(s => ({
            id: s.id,
            warehouseId: s.warehouseId,
            quantity: s.quantity,
            minOrderQty: s.minOrderQty,
            initialQty: s.initialQty
        })));
        setShowEditModal(true);
    };

    const handleAddCategory = async () => {
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
        return [...new Set(uoms.map(u => u.category))];
    };

    const getAvailableBaseUnitsForCategory = (category) => {
        return uoms.filter(u => u.category === category && u.uomType === 'Simple');
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
                    setUoms(uomsRes.data || []);
                }
                // Pre-select newly created UOM in the form
                setFormData(prev => ({
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

    const handleExportExcel = () => {
        if (!products.length) {
            toast.error('No products available to export');
            return;
        }
        const exportData = products.map(p => ({
            'Product Name': p.name,
            'SKU / Code': p.sku || '',
            'Category': p.category?.name || '',
            'Sale Price': p.salePrice || 0,
            'Purchase Price': p.purchasePrice || 0,
            'Base Unit': p.uom?.unitName || p.unit || '',
            'Current Quantity': p.totalQuantity || 0,
            'Barcode': p.barcode || '',
            'Description': p.description || ''
        }));
        exportToExcel(exportData, 'Products_Inventory_Export.xlsx', 'Products');
        toast.success(`Exported ${exportData.length} products to Excel.`);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="Zirak-Inventory-page">
            <div className="Zirak-Inventory-page-header">
                <h1 className="Zirak-Inventory-page-title">Product Inventory</h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                        className="Zirak-Inventory-btn-add" 
                        style={{ background: '#334155' }}
                        onClick={handleExportExcel}
                    >
                        <Download size={18} />
                        Export Excel
                    </button>
                    {hasPermission('create products') && (
                        <button 
                            className="Zirak-Inventory-btn-add" 
                            style={{ background: '#334155' }}
                            onClick={() => setShowImportModal(true)}
                        >
                            <FileSpreadsheet size={18} />
                            Import Excel
                        </button>
                    )}
                    {hasPermission('create products') && (
                        <button className="Zirak-Inventory-btn-add" onClick={() => { resetForm(); setShowAddModal(true); }}>
                            <Plus size={18} />
                            Add Product
                        </button>
                    )}
                </div>
            </div>

            <div className="Zirak-Inventory-card">
                <div className="Zirak-Inventory-controls-row">
                    <div className="Zirak-Inventory-entries-control">
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="Zirak-Inventory-entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="Zirak-Inventory-entries-text">entries per page</span>
                    </div>
                    <div className="Zirak-Inventory-search-control">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="Zirak-Inventory-search-input"
                        />
                    </div>
                </div>

                <div className="Zirak-Inventory-table-container">
                    <table className="Zirak-Inventory-table">
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>SKU</th>
                                <th>SALE PRICE</th>
                                <th>PURCHASE PRICE</th>
                                <th>CATEGORY</th>
                                <th>UNIT</th>
                                <th>QUANTITY</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="Zirak-Inventory-text-center Zirak-Inventory-py-8">
                                        <div className="Zirak-Inventory-loading-container">
                                            <Loader2 className="Zirak-Inventory-animate-spin" size={20} />
                                            <span>Loading products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map((p) => (
                                    <tr key={p.id}>
                                        <td className="Zirak-Inventory-font-semibold">{p.name}</td>
                                        <td>{p.sku || '-'}</td>
                                        <td>{formatCurrency(p.salePrice)}</td>
                                        <td>{formatCurrency(p.purchasePrice)}</td>
                                        <td>{p.category?.name || 'Uncategorized'}</td>
                                        <td>{p.uom?.unitName || p.unit || '-'}</td>
                                        <td>{p.totalQuantity}</td>
                                        <td>
                                            <div className="Zirak-Inventory-product-action-buttons">
                                                <button className="Zirak-Inventory-action-btn Zirak-Inventory-btn-view" onClick={() => navigate(`/company/inventory/products/${p.id}`)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit products') && (
                                                    <button className="Zirak-Inventory-action-btn Zirak-Inventory-btn-edit" data-tooltip="Edit" onClick={() => openEditModal(p)}>
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete products') && (
                                                    <button className="Zirak-Inventory-action-btn Zirak-Inventory-btn-delete" data-tooltip="Delete" onClick={() => { setSelectedProduct(p); setShowDeleteModal(true); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="Zirak-Inventory-empty-state">No products found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="Zirak-Inventory-pagination-row">
                    <p className="Zirak-Inventory-pagination-info">Showing 1 to {filteredProducts.length} of {filteredProducts.length} entries</p>
                    <div className="Zirak-Inventory-pagination-controls">
                        <button className="Zirak-Inventory-pagination-btn Zirak-Inventory-disabled">Previous</button>
                        <button className="Zirak-Inventory-pagination-btn Zirak-Inventory-active">1</button>
                        <button className="Zirak-Inventory-pagination-btn Zirak-Inventory-disabled">Next</button>
                    </div>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div className="Zirak-Inventory-modal-overlay">
                    <div className="Zirak-Inventory-modal-content Zirak-Inventory-modal">
                        <div className="Zirak-Inventory-modal-header">
                            <h2 className="Zirak-Inventory-modal-title">{showAddModal ? 'Add Product' : 'Edit Product'}</h2>
                            <button className="Zirak-Inventory-close-btn" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showAddModal ? handleAddProduct : handleEditProduct}>
                            <div className="Zirak-Inventory-modal-body">
                                <div className="Zirak-Inventory-form-grid">
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Item Name <span className="Zirak-Inventory-text-red">*</span></label>
                                        <input
                                            name="name" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter item name" required
                                            value={formData.name} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">HSN</label>
                                        <input
                                            name="hsn" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter HSN code"
                                            value={formData.hsn} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Barcode</label>
                                        <input
                                            name="barcode" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter barcode"
                                            value={formData.barcode} onChange={handleInputChange}
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
                                                    onChange={handleImageChange}
                                                    accept="image/*"
                                                    disabled={uploadingImage}
                                                />
                                            </label>
                                            <span className="Zirak-Inventory-file-name">
                                                {formData.image ? (
                                                    <a href={formData.image} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                                        View Image
                                                    </a>
                                                ) : 'No file chosen'}
                                            </span>
                                        </div>
                                        {formData.image && (
                                            <div style={{ marginTop: '10px' }}>
                                                <img
                                                    src={formData.image}
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
                                                value={formData.categoryId} onChange={handleInputChange}
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
                                                value={formData.uomId} onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        uomId: val,
                                                        purchaseUomId: val,
                                                        salesUomId: val
                                                    }));
                                                }}
                                                required
                                            >
                                                <option value="">Select Base UOM</option>
                                                {uoms.filter(u => u.uomType === 'Simple').map(uom => (
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
                                            value={formData.purchaseUomId} onChange={handleInputChange}
                                            disabled={!formData.uomId}
                                        >
                                            <option value="">Select Purchase UOM</option>
                                            {formData.uomId && (() => {
                                                const base = uoms.find(u => u.id === parseInt(formData.uomId));
                                                return uoms
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
                                            value={formData.salesUomId} onChange={handleInputChange}
                                            disabled={!formData.uomId}
                                        >
                                            <option value="">Select Sales UOM</option>
                                            {formData.uomId && (() => {
                                                const base = uoms.find(u => u.id === parseInt(formData.uomId));
                                                return uoms
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
                                            value={formData.sku} onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="Zirak-Inventory-section-title-row">
                                    <h3 className="Zirak-Inventory-section-title">Warehouse Information</h3>
                                    <button type="button" className="Zirak-Inventory-btn-inline-add" onClick={addWarehouseRow}>+ Add Warehouse</button>
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
                                            {warehouseRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        <select
                                                            className="Zirak-Inventory-form-input Zirak-Inventory-mini"
                                                            value={row.warehouseId}
                                                            onChange={(e) => handleWhRowChange(row.id, 'warehouseId', e.target.value)}
                                                        >
                                                            <option value="">Select Warehouse</option>
                                                            {warehouses.map(wh => (
                                                                <option key={wh.id} value={wh.id}>{wh.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td><input type="number" min="0" onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.quantity} onChange={(e) => handleWhRowChange(row.id, 'quantity', e.target.value)} /></td>
                                                    <td><input type="number" min="0" onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.minOrderQty} onChange={(e) => handleWhRowChange(row.id, 'minOrderQty', e.target.value)} /></td>
                                                    <td><input type="number" min="0" onWheel={(e) => e.target.blur()} onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }} className="Zirak-Inventory-form-input Zirak-Inventory-mini" value={row.initialQty} onChange={(e) => handleWhRowChange(row.id, 'initialQty', e.target.value)} /></td>
                                                    <td>
                                                        <button type="button" className="Zirak-Inventory-btn-remove" onClick={() => removeWarehouseRow(row.id)}>Remove</button>
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
                                        value={formData.description} onChange={handleInputChange}
                                    ></textarea>
                                </div>

                                <div className="Zirak-Inventory-form-grid">
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">As Of Date</label>
                                        <input
                                            name="asOfDate" type="date" className="Zirak-Inventory-form-input"
                                            value={formData.asOfDate} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Tax Account</label>
                                        <input
                                            name="taxAccount" type="text" className="Zirak-Inventory-form-input"
                                            placeholder="Enter tax account"
                                            value={formData.taxAccount} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Initial Cost/Unit</label>
                                        <input
                                            name="initialCost" type="number" min="0" className="Zirak-Inventory-form-input"
                                            onWheel={(e) => e.target.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            value={formData.initialCost} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Sale Price (Exclusive)</label>
                                        <input
                                            name="salePrice" type="number" min="0" className="Zirak-Inventory-form-input"
                                            onWheel={(e) => e.target.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            step="0.01" value={formData.salePrice} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Purchase Price (Inclusive)</label>
                                        <input
                                            name="purchasePrice" type="number" min="0" className="Zirak-Inventory-form-input"
                                            onWheel={(e) => e.target.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            step="0.01" value={formData.purchasePrice} onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="Zirak-Inventory-form-group">
                                        <label className="Zirak-Inventory-form-label">Default Discount %</label>
                                        <input
                                            name="discount" type="number" min="0" className="Zirak-Inventory-form-input"
                                            onWheel={(e) => e.target.blur()}
                                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                                            value={formData.discount} onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="Zirak-Inventory-form-group Zirak-Inventory-full-width">
                                    <label className="Zirak-Inventory-form-label">Remarks</label>
                                    <input
                                        name="remarks" type="text" className="Zirak-Inventory-form-input"
                                        placeholder="Enter remarks"
                                        value={formData.remarks} onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Inventory-modal-footer">
                                <button type="button" className="Zirak-Inventory-btn-cancel" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancel</button>
                                <button type="submit" className="Zirak-Inventory-btn-submit">
                                    {showAddModal ? 'Add' : 'Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div className="Zirak-Inventory-modal-overlay">
                        <div className="Zirak-Inventory-modal-content" style={{ maxWidth: '430px' }}>
                            <div className="Zirak-Inventory-modal-header">
                                <h2 className="Zirak-Inventory-modal-title">Delete Product</h2>
                                <button className="Zirak-Inventory-close-btn" onClick={() => setShowDeleteModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="Zirak-Inventory-modal-body" style={{ padding: '1.5rem' }}>
                                <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5' }}>
                                    Are you sure you want to delete product <strong>{selectedProduct?.name}</strong>?
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="Zirak-Inventory-modal-footer" style={{ padding: '1.25rem', backgroundColor: '#f9fafb', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                <button className="Zirak-Inventory-btn-cancel" onClick={() => setShowDeleteModal(false)} style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>Cancel</button>
                                <button className="Zirak-Inventory-btn-submit" onClick={handleDeleteProduct} style={{ backgroundColor: '#ef4444' }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add New Category Modal */}
            {
                showCategoryModal && (
                    <div className="Zirak-Inventory-modal-overlay Zirak-Inventory-sub-modal">
                        <div className="Zirak-Inventory-modal-content Zirak-Inventory-category-modal">
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
                                <button className="Zirak-Inventory-btn-submit" onClick={handleAddCategory}>Add</button>
                            </div>
                        </div>
                    </div>
                )
            }
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
                                                        : (uoms.find(u => u.id === parseInt(uomFormData.baseUnitId))?.unitName || 'Base Unit')
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
            {/* Universal Excel Import Modal */}
            <ExcelImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="products"
                onSuccess={() => {
                    fetchData();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default Inventory;