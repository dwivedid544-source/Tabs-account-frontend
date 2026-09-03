import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, Eye, Calendar, ArrowRight, Loader2, Save, Printer } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './StockTransfer.css';
import stockTransferService from '../../../../api/stockTransferService';
import warehouseService from '../../../../api/warehouseService';
import productService from '../../../../api/productService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import companyService from '../../../../api/companyService';

const StockTransfer = () => {
    const { formatCurrency, companySettings } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterItemId, setFilterItemId] = useState('');
    const [filterWarehouseId, setFilterWarehouseId] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingTransfer, setEditingTransfer] = useState(null);

    // Form State
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [transferItems, setTransferItems] = useState([]);
    const [formData, setFormData] = useState({
        voucherNo: '',
        manualVoucherNo: '',
        date: new Date().toISOString().split('T')[0],
        toWarehouseId: '',
        narration: ''
    });

    useEffect(() => {
        fetchTransfers();
        fetchInitialData();
    }, []);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await stockTransferService.getStockTransfers(companyId);
            if (response.success) {
                setTransfers(response.data);
            }
        } catch (error) {
            console.error('Error fetching transfers:', error);
            toast.error('Failed to load transfers');
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const companyId = GetCompanyId();
            const [whRes, prodRes] = await Promise.all([
                warehouseService.getWarehouses(companyId),
                productService.getProducts(companyId)
            ]);
            if (whRes.success) setWarehouses(whRes.data);
            if (prodRes.success) setProducts(prodRes.data);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const generateVoucherNo = () => {
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
        const randomStr = Math.floor(100 + Math.random() * 900);
        return `VCH-${dateStr}-${randomStr}`;
    };

    const handleOpenAdd = async () => {
        setIsEdit(false);
        setEditingTransfer(null);
        let nextVoucherNo = '';
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'stocktransfer');
                if (res.data && res.data.success) {
                    nextVoucherNo = res.data.nextNumber;
                }
            }
        } catch (error) {
            console.error('Error fetching next stocktransfer number:', error);
            nextVoucherNo = generateVoucherNo();
        }

        setFormData({
            voucherNo: nextVoucherNo,
            manualVoucherNo: '',
            date: new Date().toISOString().split('T')[0],
            toWarehouseId: '',
            narration: ''
        });
        setTransferItems([]);
        setProductSearchTerm('');
        setShowAddModal(true);
    };

    const handleEdit = async (transferId) => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await stockTransferService.getStockTransferById(transferId, companyId);
            if (response.success) {
                const transfer = response.data;
                setIsEdit(true);
                setEditingTransfer(transfer);
                setFormData({
                    voucherNo: transfer.voucherNo,
                    manualVoucherNo: transfer.manualVoucherNo || '',
                    date: new Date(transfer.date).toISOString().split('T')[0],
                    toWarehouseId: transfer.toWarehouseId,
                    narration: transfer.narration || ''
                });

                const items = transfer.stocktransferitem.map(item => ({
                    productId: item.productId,
                    name: item.product?.name,
                    sku: item.product?.sku,
                    fromWarehouseId: item.fromWarehouseId,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: item.amount,
                    narration: item.narration || ''
                }));

                setTransferItems(items);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error loading transfer for edit:', error);
            toast.error('Failed to load transfer details');
        } finally {
            setLoading(false);
        }
    };

    const handleProductSearch = (value) => {
        setProductSearchTerm(value);
        if (value.trim() === '') {
            setSearchResults([]);
            return;
        }
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(value.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(value.toLowerCase())) ||
            (p.barcode && p.barcode.toLowerCase().includes(value.toLowerCase()))
        ).slice(0, 5);
        setSearchResults(filtered);
    };

    const addProductToTransfer = (product) => {
        // Check if product already added
        if (transferItems.find(item => item.productId === product.id)) {
            toast.error('Product already added');
            return;
        }

        // Default source warehouse from product's stocks or first available
        const defaultSource = product.stock && product.stock.length > 0 ? product.stock[0].warehouseId : '';

        setTransferItems([...transferItems, {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            fromWarehouseId: defaultSource,
            quantity: 1,
            rate: product.purchasePrice || 0,
            amount: product.purchasePrice || 0,
            narration: ''
        }]);
        setProductSearchTerm('');
        setSearchResults([]);
    };

    const removeProductFromTransfer = (index) => {
        const newItems = [...transferItems];
        newItems.splice(index, 1);
        setTransferItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...transferItems];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].rate || 0);
        }
        setTransferItems(newItems);
    };

    const calculateTotal = () => {
        return transferItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const handleView = async (transfer) => {
        try {
            const companyId = GetCompanyId();
            const response = await stockTransferService.getStockTransferById(transfer.id, companyId);
            if (response.success) {
                setSelectedTransfer(response.data);
                setShowViewModal(true);
            }
        } catch (error) {
            toast.error('Failed to load transfer details');
        }
    };

    const handlePrint = () => {
        if (!selectedTransfer) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const itemsHtml = selectedTransfer.stocktransferitem?.map(item => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">${item.product?.name || '-'}${item.product?.sku ? ` <span style="font-size:11px;color:#888;">(${item.product.sku})</span>` : ''}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${item.warehouse?.name || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(item.rate)}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(item.amount)}</td>
            </tr>
        `).join('');

        const content = `
            <html>
                <head>
                    <title>Stock Transfer - ${selectedTransfer.voucherNo}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
                        .logo { max-height: 70px; max-width: 150px; object-fit: contain; }
                        .company-details { font-size: 12px; color: #475569; line-height: 1.4; }
                        .company-name { font-size: 18px; font-weight: 700; color: #1a5f7a; margin: 0 0 5px 0; text-transform: uppercase; }
                        .voucher-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #444; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .detail-item { font-size: 14px; margin-bottom: 5px; }
                        .detail-label { font-weight: bold; color: #666; width: 150px; display: inline-block; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background: #f8fafc; border: 1px solid #ddd; padding: 12px 10px; text-align: left; font-size: 13px; color: #444; }
                        .total-section { display: flex; justify-content: flex-end; margin-top: -10px; }
                        .total-box { width: 250px; }
                        .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .grand-total { font-weight: bold; font-size: 18px; color: #1a5f7a; border-bottom: 2px solid #1a5f7a; }
                        .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${companySettings?.logo ? `<img src="${companySettings.logo}" class="logo" />` : ''}
                            <div class="company-details">
                                <h1 class="company-name">${companySettings?.name || 'Your Company'}</h1>
                                <p style="margin: 0;">${companySettings?.address || ''}</p>
                                <p style="margin: 2px 0 0 0;">
                                    ${companySettings?.phone ? `Phone: ${companySettings.phone}` : ''}
                                    ${companySettings?.email ? ` | Email: ${companySettings.email}` : ''}
                                </p>
                                ${companySettings?.gstNumber ? `<p style="margin: 2px 0 0 0; font-weight: 600;">GSTIN: ${companySettings.gstNumber}</p>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: bold; color: #6366f1;">STOCK TRANSFER</div>
                            <div style="font-family: monospace; font-size: 12px; margin-top: 5px;">NO: ${selectedTransfer.voucherNo}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 3px;">Date: ${new Date(selectedTransfer.date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="voucher-title">STOCK TRANSFER VOUCHER</div>

                    <div class="details-grid">
                        <div>
                            <div class="detail-item"><span class="detail-label">Voucher No:</span> ${selectedTransfer.voucherNo}</div>
                            <div class="detail-item"><span class="detail-label">Manual No:</span> ${selectedTransfer.manualVoucherNo || '-'}</div>
                        </div>
                        <div>
                            <div class="detail-item"><span class="detail-label">Date:</span> ${new Date(selectedTransfer.date).toLocaleDateString()}</div>
                            <div class="detail-item"><span class="detail-label">Destination:</span> ${selectedTransfer.warehouse?.name || '-'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Item (SKU)</th>
                                <th>From Warehouse</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Rate</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div class="total-box">
                            <div class="total-row grand-total">
                                <span>Grand Total:</span>
                                <span>${formatCurrency(selectedTransfer.totalAmount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    ${selectedTransfer.narration ? `
                    <div style="margin-top: 20px;">
                        <p style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Narration:</p>
                        <p style="font-size: 14px; color: #555; background: #f9f9f9; padding: 10px; border-radius: 4px;">${selectedTransfer.narration}</p>
                    </div>
                    ` : ''}

                    ${(companySettings?.notes || companySettings?.terms) ? `
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; color: #555;">
                        <div>
                            ${companySettings?.notes ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Notes &amp; Privacy Policy</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.notes}</div>
                            ` : ''}
                        </div>
                        <div>
                            ${companySettings?.terms ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Terms &amp; Conditions</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.terms}</div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <div class="footer">Generated on ${new Date().toLocaleString()}</div>
                </body>
            </html>
        `;

        printFrame.contentDocument.write(content);
        printFrame.contentDocument.close();

        printFrame.onload = () => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(printFrame);
            }, 1000);
        };
    };

    const handleDeleteClick = (transfer) => {
        setSelectedTransfer(transfer);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            setSubmitting(true);
            const companyId = GetCompanyId();
            const response = await stockTransferService.deleteStockTransfer(selectedTransfer.id, companyId);
            if (response.success) {
                toast.success('Transfer deleted successfully');
                fetchTransfers();
                setShowDeleteModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete transfer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddSubmit = async () => {
        if (!formData.toWarehouseId) return toast.error('Please select destination warehouse');
        if (transferItems.length === 0) return toast.error('Please add at least one item');

        // Validation for each item
        for (const item of transferItems) {
            if (!item.fromWarehouseId) return toast.error(`Please select source warehouse for ${item.name}`);
            if (item.fromWarehouseId === formData.toWarehouseId) return toast.error(`Source and destination cannot be same for ${item.name}`);
            if (!item.quantity || item.quantity <= 0) return toast.error(`Please enter valid quantity for ${item.name}`);
        }

        try {
            setSubmitting(true);
            const payload = {
                ...formData,
                items: transferItems
            };
            const response = isEdit
                ? await stockTransferService.updateStockTransfer(editingTransfer.id, payload)
                : await stockTransferService.createStockTransfer(payload);

            if (response.success) {
                toast.success(isEdit ? 'Stock transfer updated' : 'Stock transfer successful');
                fetchTransfers();
                setShowAddModal(false);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to transfer stock');
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterItemId, filterWarehouseId, filterCategoryId, startDate, endDate]);

    const filteredTransfers = transfers.filter(t => {
        const q = searchTerm.toLowerCase().trim();
        let matchesSearch = true;
        if (q) {
            const voucherMatch = (t.voucherNo || '').toLowerCase().includes(q) ||
                                 (t.manualVoucherNo || '').toLowerCase().includes(q) ||
                                 (t.narration || '').toLowerCase().includes(q);

            const itemsMatch = t.stocktransferitem?.some(item => {
                const localProd = products.find(p => p.id === item.productId) || item.product;
                const nameMatch = (localProd?.name || '').toLowerCase().includes(q);
                const skuMatch = (localProd?.sku || '').toLowerCase().includes(q);
                const hsnMatch = (localProd?.hsn || '').toLowerCase().includes(q);
                const barcodeMatch = (localProd?.barcode || '').toLowerCase().includes(q);
                const catMatch = (localProd?.category?.name || '').toLowerCase().includes(q);
                const fromWhMatch = (item.warehouse?.name || '').toLowerCase().includes(q);
                const toWhMatch = (t.warehouse?.name || '').toLowerCase().includes(q);

                return nameMatch || skuMatch || hsnMatch || barcodeMatch || catMatch || fromWhMatch || toWhMatch;
            });

            matchesSearch = voucherMatch || itemsMatch;
        }

        let matchesDate = true;
        const transferDate = new Date(t.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && transferDate < start) matchesDate = false;
        if (end && transferDate > end) matchesDate = false;

        let matchesItem = true;
        if (filterItemId) {
            matchesItem = t.stocktransferitem?.some(item => item.productId === parseInt(filterItemId));
        }

        let matchesWarehouse = true;
        if (filterWarehouseId) {
            matchesWarehouse = t.stocktransferitem?.some(item => item.fromWarehouseId === parseInt(filterWarehouseId)) || t.toWarehouseId === parseInt(filterWarehouseId);
        }

        let matchesCategory = true;
        if (filterCategoryId) {
            matchesCategory = t.stocktransferitem?.some(item => {
                const localProd = products.find(p => p.id === item.productId) || item.product;
                return localProd?.categoryId === parseInt(filterCategoryId);
            });
        }

        return matchesSearch && matchesDate && matchesItem && matchesWarehouse && matchesCategory;
    });

    const totalEntries = filteredTransfers.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
    const paginatedTransfers = filteredTransfers.slice(startIndex, startIndex + entriesPerPage);

    return (
        <div className="Zirak-Transfer-page">
            <div className="Zirak-Transfer-page-header">
                <h1 className="Zirak-Transfer-page-title">Stock Transfer</h1>
                {hasPermission('create stock transfer') && (
                    <button className="Zirak-Transfer-btn-add" style={{ backgroundColor: '#1e293b' }} onClick={handleOpenAdd}>
                        <Plus size={18} />
                        Add Stock Transfer
                    </button>
                )}
            </div>

            <div className="Zirak-Transfer-card">
                <div className="Zirak-Transfer-controls-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    
                    {/* First row of filters: Search & Date Range */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', width: '100%' }}>
                        
                        <div className="Zirak-Transfer-search-control" style={{ flex: '2', minWidth: '280px', position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search by Voucher, Item, SKU, HSN, Barcode, Category, Warehouse..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="Zirak-Transfer-search-input"
                                style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                        </div>

                        {/* From Date Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', flex: '1' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                        </div>

                        {/* To Date Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', flex: '1' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                        </div>

                    </div>

                    {/* Second row of filters: Dropdowns (Items, Warehouses, Categories, Clear Button) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', width: '100%' }}>
                        
                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select 
                                value={filterItemId} 
                                onChange={(e) => setFilterItemId(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- All Items --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select 
                                value={filterWarehouseId} 
                                onChange={(e) => setFilterWarehouseId(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- All Warehouses --</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ minWidth: '180px', flex: '1' }}>
                            <select 
                                value={filterCategoryId} 
                                onChange={(e) => setFilterCategoryId(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.875rem' }}
                            >
                                <option value="">-- All Categories --</option>
                                {[...new Map(products.filter(p => p.category).map(p => [p.category.id, p.category])).values()].map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {(searchTerm || filterItemId || filterWarehouseId || filterCategoryId || startDate || endDate) && (
                            <button 
                                onClick={() => { setSearchTerm(''); setFilterItemId(''); setFilterWarehouseId(''); setFilterCategoryId(''); setStartDate(''); setEndDate(''); }}
                                style={{ height: '40px', padding: '0 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                </div>

                <div className="Zirak-Transfer-table-container">
                    {loading ? (
                        <div className="Zirak-Transfer-loading-state">
                            <Loader2 className="Zirak-Transfer-spinner" size={40} />
                            <p>Loading transfers...</p>
                        </div>
                    ) : (
                        <table className="Zirak-Transfer-table">
                            <thead>
                                <tr>
                                    <th>VOUCHER NO</th>
                                    <th>DATE</th>
                                    <th>DESTINATION</th>
                                    <th>ITEMS</th>
                                    <th>TOTAL</th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTransfers.length > 0 ? (
                                    paginatedTransfers.map((t) => (
                                        <tr key={t.id}>
                                            <td className="Zirak-Transfer-voucher-no">
                                                {t.voucherNo}
                                                {t.manualVoucherNo && <p className="Zirak-Transfer-manual-no">Ref: {t.manualVoucherNo}</p>}
                                            </td>
                                            <td>{new Date(t.date).toLocaleDateString()}</td>
                                            <td>{t.warehouse?.name}</td>
                                            <td>{t.stocktransferitem?.length} Items</td>
                                            <td>{formatCurrency(t.totalAmount || 0)}</td>
                                            <td>
                                                 <div className="Zirak-Transfer-action-buttons">
                                                    <button className="Zirak-Transfer-action-btn Zirak-Transfer-btn-view" data-tooltip="View" onClick={() => handleView(t)}>
                                                        <Eye size={16} />
                                                    </button>
                                                    {hasPermission('edit stock transfer') && (
                                                        <button className="Zirak-Transfer-action-btn Zirak-Transfer-btn-edit" style={{ backgroundColor: '#59d5e0', color: 'white' }} data-tooltip="Edit" onClick={() => handleEdit(t.id)}>
                                                            <Pencil size={16} />
                                                        </button>
                                                    )}
                                                    {hasPermission('delete stock transfer') && (
                                                        <button className="Zirak-Transfer-action-btn Zirak-Transfer-btn-delete" data-tooltip="Delete" onClick={() => handleDeleteClick(t)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">No transfers found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalEntries > 0 && (
                    <div className="Zirak-Transfer-pagination-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                            <p className="Zirak-Transfer-pagination-info" style={{ margin: 0 }}>
                                Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
                            </p>
                            <div className="Zirak-Transfer-entries-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <select 
                                    value={entriesPerPage} 
                                    onChange={(e) => {
                                        setEntriesPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }} 
                                    className="Zirak-Transfer-entries-select"
                                    style={{ height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="Zirak-Transfer-entries-text">entries per page</span>
                            </div>
                        </div>
                        <div className="Zirak-Transfer-pagination-controls">
                            <button 
                                className={`Zirak-Transfer-pagination-btn ${currentPage === 1 ? 'Zirak-Transfer-disabled' : ''}`}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={`Zirak-Transfer-pagination-btn ${currentPage === page ? 'Zirak-Transfer-active' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button 
                                className={`Zirak-Transfer-pagination-btn ${currentPage === totalPages ? 'Zirak-Transfer-disabled' : ''}`}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="Zirak-Transfer-modal-overlay">
                    <div className="Zirak-Transfer-modal-content Zirak-Transfer-modal">
                        <div className="Zirak-Transfer-modal-header">
                            <h2 className="Zirak-Transfer-modal-title">{isEdit ? 'Edit Stock Transfer' : 'New Stock Transfer'}</h2>
                            <button className="Zirak-Transfer-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Transfer-modal-body">
                            <div className="Zirak-Transfer-form-grid">
                                <div className="Zirak-Transfer-form-group">
                                    <label className="Zirak-Transfer-form-label">System Voucher No</label>
                                    <input 
                                        type="text" 
                                        className="Zirak-Transfer-form-input" 
                                        value={formData.voucherNo} 
                                        onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })} 
                                    />
                                </div>
                                <div className="Zirak-Transfer-form-group">
                                    <label className="Zirak-Transfer-form-label">Manual Voucher No</label>
                                    <input
                                        type="text"
                                        className="Zirak-Transfer-form-input"
                                        placeholder="Manual Voucher No"
                                        value={formData.manualVoucherNo}
                                        onChange={(e) => setFormData({ ...formData, manualVoucherNo: e.target.value })}
                                    />
                                </div>
                                <div className="Zirak-Transfer-form-group">
                                    <label className="Zirak-Transfer-form-label">Voucher Date <span className="Zirak-Transfer-text-red">*</span></label>
                                    <input
                                        type="date"
                                        className="Zirak-Transfer-form-input"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Transfer-form-group Zirak-Transfer-full-width">
                                <label className="Zirak-Transfer-form-label">Destination Warehouse <span className="Zirak-Transfer-text-red">*</span></label>
                                <SearchableSelect
                                    options={warehouses.map(w => ({ id: String(w.id), name: w.name }))}
                                    value={formData.toWarehouseId ? String(formData.toWarehouseId) : ''}
                                    onChange={(val) => setFormData({ ...formData, toWarehouseId: val })}
                                    placeholder="Select destination warehouse"
                                    searchPlaceholder="Search warehouse..."
                                    labelKey="name"
                                    valueKey="id"
                                    groupKey=""
                                    clearable={false}
                                />
                            </div>

                            <div className="Zirak-Transfer-form-group Zirak-Transfer-full-width">
                                <label className="Zirak-Transfer-form-label">Select Item</label>
                                <div className="Zirak-Transfer-search-wrapper">
                                    <Search size={16} className="Zirak-Transfer-search-icon-inline" />
                                    <input
                                        type="text"
                                        className="Zirak-Transfer-form-input Zirak-Transfer-with-icon"
                                        placeholder="Search by name, SKU, or barcode"
                                        value={productSearchTerm}
                                        onChange={(e) => handleProductSearch(e.target.value)}
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="Zirak-Transfer-product-search-results">
                                            {searchResults.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="Zirak-Transfer-search-result-item"
                                                    onClick={() => addProductToTransfer(p)}
                                                >
                                                    <span className="Zirak-Transfer-p-name">{p.name}</span>
                                                    <span className="Zirak-Transfer-p-sku">{p.sku || ''}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="Zirak-Transfer-items-table-container">
                                <table className="Zirak-Transfer-items-input-table">
                                    <thead>
                                        <tr>
                                            <th>ITEM</th>
                                            <th>SOURCE WH</th>
                                            <th>QTY</th>
                                            <th>RATE</th>
                                            <th>AMOUNT</th>
                                            <th>NARRATION</th>
                                            <th>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferItems.length > 0 ? (
                                            transferItems.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="Zirak-Transfer-item-name-cell">{item.name}</td>
                                                    <td>
                                                        <SearchableSelect
                                                            options={warehouses.map(w => {
                                                                const product = products.find(p => p.id === item.productId);
                                                                const stockItem = product?.stock?.find(s => s.warehouseId === w.id);
                                                                const count = stockItem ? stockItem.quantity : 0;
                                                                return {
                                                                    id: String(w.id),
                                                                    name: `${w.name} (${count})`
                                                                };
                                                            })}
                                                            value={item.fromWarehouseId ? String(item.fromWarehouseId) : ''}
                                                            onChange={(val) => updateItem(index, 'fromWarehouseId', val)}
                                                            placeholder="Source"
                                                            searchPlaceholder="Search warehouse..."
                                                            labelKey="name"
                                                            valueKey="id"
                                                            groupKey=""
                                                            clearable={false}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="Zirak-Transfer-table-input Zirak-Transfer-qty-input"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="Zirak-Transfer-table-input Zirak-Transfer-rate-input"
                                                            value={item.rate}
                                                            onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="Zirak-Transfer-amount-cell">{formatCurrency(item.amount)}</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="Zirak-Transfer-table-input Zirak-Transfer-narration-input"
                                                            placeholder="..."
                                                            value={item.narration}
                                                            onChange={(e) => updateItem(index, 'narration', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button className="Zirak-Transfer-row-delete-btn" onClick={() => removeProductFromTransfer(index)}>
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="Zirak-Transfer-empty-row">
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                                    No items added
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="Zirak-Transfer-form-group Zirak-Transfer-full-width">
                                <label className="Zirak-Transfer-form-label">Narration (Overall)</label>
                                <textarea
                                    className="Zirak-Transfer-form-input Zirak-Transfer-textarea"
                                    rows={3}
                                    placeholder="Enter narration here..."
                                    value={formData.narration}
                                    onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="Zirak-Transfer-modal-summary">
                                <span className="Zirak-Transfer-total-label">Total:</span>
                                <span className="Zirak-Transfer-total-amount">{formatCurrency(calculateTotal())}</span>
                            </div>
                        </div>
                        <div className="Zirak-Transfer-modal-footer">
                            <button className="Zirak-Transfer-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button
                                className="Zirak-Transfer-btn-submit"
                                style={{ backgroundColor: '#1e293b' }}
                                onClick={handleAddSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="Zirak-Transfer-spinner" size={18} /> : <Save size={18} />}
                                {submitting ? 'Processing...' : 'Save Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {showViewModal && (
                <div className="Zirak-Transfer-modal-overlay">
                    <div className="Zirak-Transfer-modal-content Zirak-Transfer-modal">
                        <div className="Zirak-Transfer-modal-header">
                            <h2 className="Zirak-Transfer-modal-title">Stock Transfer Details</h2>
                            <button className="Zirak-Transfer-close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Transfer-modal-body">
                            <div className="Zirak-Transfer-view-header-info">
                                <div className="Zirak-Transfer-view-chip">
                                    <label>Voucher No</label>
                                    <p>{selectedTransfer?.voucherNo}</p>
                                </div>
                                <div className="Zirak-Transfer-view-chip">
                                    <label>Manual No</label>
                                    <p>{selectedTransfer?.manualVoucherNo || 'N/A'}</p>
                                </div>
                                <div className="Zirak-Transfer-view-chip">
                                    <label>Date</label>
                                    <p>{new Date(selectedTransfer?.date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="Zirak-Transfer-destination-info">
                                <label>Destination Warehouse:</label>
                                <p><strong>{selectedTransfer?.warehouse?.name}</strong></p>
                            </div>

                            <div className="Zirak-Transfer-view-items-section">
                                <h3 className="Zirak-Transfer-section-subtitle">Transferred Items</h3>
                                <table className="Zirak-Transfer-view-items-table">
                                    <thead>
                                        <tr>
                                            <th>Item (SKU)</th>
                                            <th>From</th>
                                            <th>Qty</th>
                                            <th>Rate</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransfer?.stocktransferitem?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {item.product?.name}
                                                    {item.product?.sku && <span className="Zirak-Transfer-sku-tag">({item.product.sku})</span>}
                                                </td>
                                                <td>{item.warehouse?.name}</td>
                                                <td>{item.quantity}</td>
                                                <td>{formatCurrency(item.rate)}</td>
                                                <td>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedTransfer?.narration && (
                                <div className="Zirak-Transfer-view-narration-section">
                                    <label>Narration:</label>
                                    <p>{selectedTransfer.narration}</p>
                                </div>
                            )}

                            <div className="Zirak-Transfer-view-total-row">
                                <span>Total Amount:</span>
                                <strong>{formatCurrency(selectedTransfer?.totalAmount || 0)}</strong>
                            </div>
                        </div>
                        <div className="Zirak-Transfer-modal-footer">
                            <button className="Zirak-Transfer-btn-print" style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handlePrint}>
                                <Printer size={18} />
                                Print Details
                            </button>
                            <button className="Zirak-Transfer-btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="Zirak-Transfer-modal-overlay">
                    <div className="Zirak-Transfer-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="Zirak-Transfer-modal-header">
                            <h2 className="Zirak-Transfer-modal-title">Delete Transfer</h2>
                            <button className="Zirak-Transfer-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Transfer-modal-body">
                            <p>Are you sure you want to delete transfer <strong>{selectedTransfer?.voucherNo}</strong>?</p>
                            <p className="Zirak-Transfer-text-red mt-2" style={{ fontSize: '0.85rem' }}>Note: This will reverse the stock quantities in the respective warehouses.</p>
                        </div>
                        <div className="Zirak-Transfer-modal-footer">
                            <button className="Zirak-Transfer-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button
                                className="Zirak-Transfer-btn-submit"
                                style={{ backgroundColor: '#ff4d4d' }}
                                onClick={confirmDelete}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="Zirak-Transfer-spinner" size={18} /> : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockTransfer;
