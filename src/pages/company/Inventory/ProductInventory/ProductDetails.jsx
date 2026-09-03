import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Printer, Settings, Calendar, Share, Loader2, 
    Package, Tag, Layers, MapPin, Activity, DollarSign, 
    Barcode, ClipboardList, Info, ChevronRight, Hash, Boxes
} from 'lucide-react';
import toast from 'react-hot-toast';
import productService from '../../../../services/productService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import './ProductDetails.css';

const parseReason = (reason) => {
    if (!reason) return { particulars: '-', vchNo: '-' };

    // 1. Check for old format: "Voucher: VCH-123. Narration text"
    const oldMatch = reason.match(/Voucher:\s*(.*?)\.\s*(.*)/);
    if (oldMatch) {
        return {
            vchNo: oldMatch[1].trim(),
            particulars: oldMatch[2].trim()
        };
    }

    // 2. Check for "Voucher: VCH-123" (no dot)
    const oldMatchNoDot = reason.match(/Voucher:\s*(.*)/);
    if (oldMatchNoDot) {
        return {
            vchNo: oldMatchNoDot[1].trim(),
            particulars: 'Journal Entry'
        };
    }

    // 3. Check for standard format: "Prefix: Number"
    // e.g., "Direct Invoice: INV-10000", "POS Sale: POS-0003", "GRN: GRN-001"
    const colonIndex = reason.indexOf(':');
    if (colonIndex !== -1) {
        const prefix = reason.substring(0, colonIndex).trim();
        const value = reason.substring(colonIndex + 1).trim();
        // Ensure the value looks like a voucher number (not arbitrary text with lots of spaces)
        if (value && value.length < 30 && !value.includes('  ')) {
            return {
                particulars: reason, // keep full reason for particulars (e.g. "Direct Invoice: INV-10000")
                vchNo: value
            };
        }
    }

    // Default fallback
    return {
        particulars: reason,
        vchNo: '-'
    };
};

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatCurrency } = React.useContext(CompanyContext);
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [filterVchNo, setFilterVchNo] = useState('');
    const [filterType, setFilterType] = useState('All Types');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: '',
        toDate: '',
        vchNo: '',
        type: 'All Types',
        warehouse: ''
    });

    const handleApplyFilters = () => {
        setAppliedFilters({
            fromDate: filterFromDate,
            toDate: filterToDate,
            vchNo: filterVchNo,
            type: filterType,
            warehouse: filterWarehouse
        });
    };

    const handleResetFilters = () => {
        setFilterFromDate('');
        setFilterToDate('');
        setFilterVchNo('');
        setFilterType('All Types');
        setFilterWarehouse('');
        setAppliedFilters({
            fromDate: '',
            toDate: '',
            vchNo: '',
            type: 'All Types',
            warehouse: ''
        });
    };

    useEffect(() => {
        fetchProductDetails();
    }, [id]);

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const res = await productService.getProductById(id, companyId);
            if (res.success) {
                setProduct(res.data);
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            toast.error('Failed to load product details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="pd-loading">
                <Loader2 className="animate-spin" style={{ color: '#1e293b' }} size={32} />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="pd-not-found">
                <h2 className="text-xl font-bold text-gray-700">Product not found</h2>
                <button onClick={() => navigate('/company/inventory/products')} className="mt-4 hover:underline" style={{ color: '#1e293b' }}>
                    Back to Inventory
                </button>
            </div>
        );
    }

    const totalStock = product.stock ? product.stock.reduce((sum, s) => sum + s.quantity, 0) : 0;
    const itemValue = totalStock * (product.initialCost || 0);

    const buildTransactionTableHTML = (type, label) => {
        const filtered = getFilteredTransactions(type);

        if (filtered.length === 0) return `<h2 style="margin-top:30px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">${label}</h2><p style="color:#94a3b8;font-style:italic;">No records found.</p>`;

        let runningBalance = 0;
        const rowsHTML = filtered.map(t => {
            let inwards = 0, outwards = 0;
            if (t.type === 'TRANSFER') { inwards = t.quantity; outwards = t.quantity; }
            else if (t.toWarehouseId) inwards = t.quantity;
            else if (t.fromWarehouseId) outwards = t.quantity;
            if (type === 'all' && t.type !== 'TRANSFER') runningBalance += (inwards - outwards);

            const fromWH = t.warehouse_inventorytransaction_fromWarehouseIdTowarehouse?.name;
            const toWH = t.warehouse_inventorytransaction_toWarehouseIdTowarehouse?.name;
            const whName = t.type === 'TRANSFER' ? `${fromWH || '?'} → ${toWH || '?'}` : (toWH || fromWH || '-');
            const { particulars, vchNo } = parseReason(t.reason);

            return `<tr>
                <td>${new Date(t.date).toLocaleString()}</td>
                <td>${t.type}</td>
                <td>${t.user?.name || t.user?.email || 'System'}</td>
                <td>${particulars}</td>
                <td>${vchNo}</td>
                <td>${whName}</td>
                <td style="color:#334155;font-weight:600;">${inwards > 0 ? '+' + inwards : '-'}</td>
                <td style="color:#dc2626;font-weight:600;">${outwards > 0 ? '-' + outwards : '-'}</td>
                ${type === 'all' ? `<td style="font-weight:700;">${runningBalance}</td>` : ''}
            </tr>`;
        }).join('');

        const closingCol = type === 'all' ? '<th>CLOSING</th>' : '';

        return `
            <h2 style="margin-top:30px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;page-break-before:always;">${label}</h2>
            <table>
                <thead><tr>
                    <th>DATE</th><th>TYPE</th><th>USER</th><th>PARTICULARS</th><th>VCH NO</th>
                    <th>WAREHOUSE</th><th>QTY (IN)</th><th>QTY (OUT)</th>${closingCol}
                </tr></thead>
                <tbody>${rowsHTML}</tbody>
            </table>`;
    };

    const handlePrint = () => {
        const allTrans = product.inventorytransaction || [];
        const totalStockVal = product.stock ? product.stock.reduce((sum, s) => sum + s.quantity, 0) : 0;
        const val = totalStockVal * (product.initialCost || 0);

        const warehouseRows = (product.stock || []).map(s => `
            <tr>
                <td>${s.warehouse.name}</td>
                <td>${s.warehouse.location || s.warehouse.city || '-'}</td>
                <td>${s.quantity} ${product.uom?.unitName || ''}</td>
                <td>${[s.warehouse.addressLine1, s.warehouse.city, s.warehouse.state].filter(Boolean).join(', ') || '-'}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <title>Product Report - ${product.name}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 24px; font-size: 13px; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; color: #0f172a; margin-bottom: 12px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
        .company { font-size: 11px; color: #64748b; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-item label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px; }
        .info-item span { font-size: 13px; font-weight: 600; }
        .price-bar { display: flex; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; }
        .price-bar .big { font-size: 18px; font-weight: 800; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; color: #475569; text-transform: uppercase; border: 1px solid #e2e8f0; }
        td { padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer-val { text-align: right; font-weight: 800; font-size: 15px; color: #1e293b; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 8px; }
        @media print { body { padding: 12px; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>${product.name}</h1>
            <div class="company">Inventory Item Report &nbsp;|&nbsp; SKU: ${product.sku || 'N/A'} &nbsp;|&nbsp; Category: ${product.category?.name || 'N/A'}</div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:12px;color:#64748b;">Printed: ${new Date().toLocaleString()}</div>
            <div style="font-size:11px;color:#94a3b8;">TAB ACCOUNTS</div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-item"><label>Item Code / SKU</label><span>${product.hsn || 'N/A'}</span></div>
        <div class="info-item"><label>Barcode</label><span>${product.barcode || 'N/A'}</span></div>
        <div class="info-item"><label>Unit</label><span>${product.uom?.unitName || 'N/A'}</span></div>
        <div class="info-item"><label>Current Stock</label><span>${totalStockVal} ${product.uom?.unitName || ''}</span></div>
        <div class="info-item"><label>Initial Cost</label><span>${product.initialCost || 0}</span></div>
        <div class="info-item"><label>Discount</label><span>${product.discount || 0}%</span></div>
        <div class="info-item"><label>Remarks</label><span>${product.remarks || '-'}</span></div>
        <div class="info-item"><label>As of Date</label><span>${product.asOfDate ? new Date(product.asOfDate).toLocaleDateString() : 'N/A'}</span></div>
    </div>

    <div class="price-bar">
        <span>Sale Price: <strong>${product.salePrice || 0}</strong></span>
        <span>Purchase Price: <strong>${product.purchasePrice || 0}</strong></span>
        <span class="big">Item Value: ${val}</span>
    </div>

    <h2>Warehouse Inventory Breakdown</h2>
    <table>
        <thead><tr><th>Warehouse</th><th>Location</th><th>Qty</th><th>Address</th></tr></thead>
        <tbody>${warehouseRows || '<tr><td colspan="4">No warehouse data</td></tr>'}</tbody>
    </table>

    ${buildTransactionTableHTML('all', 'All Transactions')}
    ${buildTransactionTableHTML('PURCHASE', 'Purchase History')}
    ${buildTransactionTableHTML('SALE', 'Sales History')}
    ${buildTransactionTableHTML('RETURN', 'Return History')}
    ${buildTransactionTableHTML('TRANSFER', 'Stock Transfer')}
    ${buildTransactionTableHTML('ADJUSTMENT', 'Adjustments')}

    <div class="footer-val">Closing Inventory: ${totalStockVal} ${product.uom?.unitName || ''} = ${val}</div>

    <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
</body>
</html>`;

        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    };

    const transactions = product.inventorytransaction || [];

    const getFilteredTransactions = (type) => {
        let filtered = [...transactions];

        // Apply Tab/Type Filter
        if (type !== 'all') {
            if (type === 'RETURN') {
                filtered = filtered.filter(t => t.type.includes('RETURN'));
            } else {
                filtered = filtered.filter(t => t.type === type);
            }
        }

        // Apply Advanced Filters
        if (appliedFilters.fromDate) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(appliedFilters.fromDate + 'T00:00:00'));
        }
        if (appliedFilters.toDate) {
            const end = new Date(appliedFilters.toDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }
        if (appliedFilters.vchNo) {
            filtered = filtered.filter(t => {
                const { vchNo } = parseReason(t.reason);
                return vchNo.toLowerCase().includes(appliedFilters.vchNo.toLowerCase());
            });
        }
        if (appliedFilters.type && appliedFilters.type !== 'All Types') {
            const selectType = appliedFilters.type.toUpperCase();
            filtered = filtered.filter(t => {
                if (selectType === 'RETURN') return t.type.includes('RETURN');
                return t.type === selectType;
            });
        }
        if (appliedFilters.warehouse) {
            filtered = filtered.filter(t => {
                const fromWH = t.warehouse_inventorytransaction_fromWarehouseIdTowarehouse?.name || '';
                const toWH = t.warehouse_inventorytransaction_toWarehouseIdTowarehouse?.name || '';
                const term = appliedFilters.warehouse.toLowerCase();
                return fromWH.toLowerCase().includes(term) || toWH.toLowerCase().includes(term);
            });
        }

        return filtered;
    };

    const HistoryTable = ({ type, hideClosing = false }) => {
        const filtered = getFilteredTransactions(type);
        if (filtered.length === 0) return <p className="pd-print-no-data">No {type} records found for this product.</p>;

        let runningBalance = 0;
        const rows = filtered.map((t) => {
            let inwards = 0;
            let outwards = 0;

            if (t.type === 'TRANSFER') {
                inwards = t.quantity;
                outwards = t.quantity;
            } else if (t.toWarehouseId) {
                inwards = t.quantity;
            } else if (t.fromWarehouseId) {
                outwards = t.quantity;
            }

            if (type === 'all') {
                if (t.type !== 'TRANSFER') {
                    runningBalance += (inwards - outwards);
                }
            }

            const fromWH = t.warehouse_inventorytransaction_fromWarehouseIdTowarehouse?.name;
            const toWH = t.warehouse_inventorytransaction_toWarehouseIdTowarehouse?.name;

            const { particulars, vchNo } = parseReason(t.reason);

            return (
                <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleString()}</td>
                    <td>{t.type}</td>
                    <td>{t.user?.name || t.user?.email || 'System'}</td>
                    <td style={{ maxWidth: '250px' }}>{particulars}</td>
                    <td><span className="pd-vch-no text-nowrap">{vchNo}</span></td>
                    <td>
                        {t.type === 'TRANSFER' ? `${fromWH || 'Unknown'} → ${toWH || 'Unknown'}` : (toWH || fromWH || '-')}
                    </td>
                    <td className="text-green-600">{inwards > 0 ? `+${inwards}` : '-'}</td>
                    <td className="text-red-600">{outwards > 0 ? `-${outwards}` : '-'}</td>
                    {type === 'all' && !hideClosing && <td className="font-bold">{runningBalance}</td>}
                </tr>
            );
        });

        return (
            <div className="pd-table-wrapper">
                <table className="pd-table">
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>TYPE</th>
                            <th>USER</th>
                            <th>PARTICULARS</th>
                            <th>VCH NO</th>
                            <th>WAREHOUSE</th>
                            <th>QTY (IN)</th>
                            <th>QTY (OUT)</th>
                            {type === 'all' && !hideClosing && <th>CLOSING</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {type === 'all' ? [...rows].reverse() : rows}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="pd-container">
            {/* Header */}
            <div className="pd-header no-print">
                <div className="pd-title-section">
                    <button onClick={() => navigate('/company/inventory/products')} className="pd-back-btn">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1>Inventory Item Details</h1>
                    <div className="pd-date">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                <div className="pd-action-group">
                    <button className="pd-icon-btn" onClick={handlePrint} title="Print Entire Product Report">
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Sections - Shared for screen and print */}
            <div className="pd-printable-area">
                {/* Main Info Card */}
                <div className="pd-main-card">
                    {/* Top Row: Image, Name, Status, and Pricing */}
                    <div className="pd-top-header-row">
                        <div className="pd-header-identity">
                            <div className="pd-image-wrapper no-print">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="pd-img" />
                                ) : (
                                    <div className="pd-no-img">No Image Available</div>
                                )}
                            </div>
                            <div className="pd-name-status-group">
                                <h2 className="pd-product-name">{product.name}</h2>
                                <span className={`pd-status-badge ${totalStock > 0 ? 'pd-status-in' : 'pd-status-out'}`}>
                                    {totalStock > 0 ? 'In Stock' : 'Out of Stock'}
                                </span>
                            </div>
                        </div>

                        <div className="pd-header-pricing">
                            <div className="pd-mini-value-card">
                                <div className="pd-mini-label">Item Value</div>
                                <div className="pd-mini-amt">{formatCurrency(itemValue)}</div>
                            </div>
                            <div className="pd-mini-prices">
                                <div className="pd-mini-price-item">
                                    <span className="pd-mini-price-label">Sale:</span>
                                    <span className="pd-mini-price-val">{formatCurrency(product.salePrice || 0)}</span>
                                </div>
                                <div className="pd-mini-price-item">
                                    <span className="pd-mini-price-label">Purchase:</span>
                                    <span className="pd-mini-price-val">{formatCurrency(product.purchasePrice || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Cards Grid - 5 per row */}
                    <div className="pd-info-cards-container">
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Hash size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">HSN Code</span>
                                <span className="pd-info-value">{product.hsn || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Barcode size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Barcode</span>
                                <span className="pd-info-value">{product.barcode || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Tag size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">SKU</span>
                                <span className="pd-info-value">{product.sku || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Layers size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Category</span>
                                <span className="pd-info-value">{product.category?.name || 'Uncategorized'}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Package size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Unit</span>
                                <span className="pd-info-value">{product.uom?.unitName || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><MapPin size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Warehouse(s)</span>
                                <span className="pd-info-value pd-text-blue">
                                    {product.stock?.length > 0
                                        ? product.stock.map(s => s.warehouse.name).join(', ')
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Boxes size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Stock</span>
                                <span className="pd-info-value">{totalStock} {product.uom?.unitName}</span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Activity size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Initial Qty</span>
                                <span className="pd-info-value">
                                    {product.stock?.reduce((sum, s) => sum + (s.initialQty || 0), 0) || '0'} {product.uom?.unitName}
                                </span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><ClipboardList size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">Min Order</span>
                                <span className="pd-info-value">
                                    {product.stock?.reduce((sum, s) => sum + (s.minOrderQty || 0), 0) || '0'} {product.uom?.unitName}
                                </span>
                            </div>
                        </div>
                        <div className="pd-info-card-item">
                            <div className="pd-icon-box"><Calendar size={16} /></div>
                            <div className="pd-info-content">
                                <span className="pd-info-label">As of Date</span>
                                <span className="pd-info-value">{product.asOfDate ? new Date(product.asOfDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Details Sections */}
                <div className="pd-section-card">
                    <div className="pd-section-header">
                        <Info size={20} className="pd-section-icon" />
                        <h3 className="pd-section-title">Additional Product Details</h3>
                    </div>
                    <div className="pd-details-grid">
                        <div className="pd-details-group">
                            <h4 className="pd-sub-title">Pricing & Financials</h4>
                            <div className="pd-compact-list">
                                <div className="pd-list-item">
                                    <span className="pd-list-label">Initial Cost</span>
                                    <span className="pd-list-value">{formatCurrency(product.initialCost || 0)}</span>
                                </div>
                                <div className="pd-list-item">
                                    <span className="pd-list-label">Discount</span>
                                    <span className="pd-list-value">{product.discount || 0}%</span>
                                </div>
                                <div className="pd-list-item">
                                    <span className="pd-list-label">Tax Account</span>
                                    <span className="pd-list-value">{product.taxAccount || '-'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="pd-details-group">
                            <h4 className="pd-sub-title">Description & Narrative</h4>
                            <div className="pd-compact-list">
                                <div className="pd-list-item">
                                    <span className="pd-list-label">Remarks</span>
                                    <span className="pd-list-value">{product.remarks || '-'}</span>
                                </div>
                                <div className="pd-list-item">
                                    <span className="pd-list-label">Description</span>
                                    <span className="pd-list-value">{product.description || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warehouse Table */}
                <div className="pd-section-card">
                    <div className="pd-section-header">
                        <MapPin size={20} className="pd-section-icon" />
                        <h3 className="pd-section-title">Warehouse Inventory Breakdown</h3>
                    </div>
                    <div className="pd-table-wrapper">
                        <table className="pd-table">
                            <thead>
                                <tr>
                                    <th>WAREHOUSE NAME</th>
                                    <th>LOCATION</th>
                                    <th>STOCK QUANTITY</th>
                                    <th>ADDRESS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {product.stock && product.stock.length > 0 ? (
                                    product.stock.map(stock => (
                                        <tr key={stock.id}>
                                            <td className="pd-text-blue">
                                                <div className="pd-cell-with-icon">
                                                    <div className="pd-small-icon"><MapPin size={14} /></div>
                                                    {stock.warehouse.name}
                                                </div>
                                            </td>
                                            <td>{stock.warehouse.location || stock.warehouse.city || '-'}</td>
                                            <td>
                                                <span className="pd-qty-badge">
                                                    {stock.quantity} {product.uom?.unitName}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="pd-address-text">
                                                    {[stock.warehouse.addressLine1, stock.warehouse.city, stock.warehouse.state]
                                                        .filter(Boolean)
                                                        .join(', ') || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-4">No warehouse stock data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transaction History Section - UI Version */}
                <div className="pd-section-card no-print">
                    <h3 className="pd-section-title">Product Transaction History</h3>

                    {/* Advanced Filters */}
                    <div className="pd-controls">
                        <div className="pd-control-item">
                            <label className="pd-control-label">From Date</label>
                            <input
                                type="date"
                                className="pd-input"
                                value={filterFromDate}
                                onChange={e => setFilterFromDate(e.target.value)}
                            />
                        </div>
                        <div className="pd-control-item">
                            <label className="pd-control-label">To Date</label>
                            <input
                                type="date"
                                className="pd-input"
                                value={filterToDate}
                                onChange={e => setFilterToDate(e.target.value)}
                            />
                        </div>
                        <div className="pd-control-item">
                            <label className="pd-control-label">VCH Number</label>
                            <input
                                type="text"
                                placeholder="e.g. INV-001"
                                className="pd-input"
                                value={filterVchNo}
                                onChange={e => setFilterVchNo(e.target.value)}
                            />
                        </div>
                        <div className="pd-control-item">
                            <label className="pd-control-label">Voucher Type</label>
                            <select
                                className="pd-input"
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                            >
                                <option>All Types</option>
                                <option>Sale</option>
                                <option>Purchase</option>
                                <option>Adjustment</option>
                            </select>
                        </div>
                        <div className="pd-control-item">
                            <label className="pd-control-label">Warehouse</label>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pd-input"
                                value={filterWarehouse}
                                onChange={e => setFilterWarehouse(e.target.value)}
                            />
                        </div>
                        <div className="pd-control-item pd-filter-actions">
                            <label className="pd-control-label">&nbsp;</label>
                            <div className="pd-filter-buttons">
                                <button className="pd-apply-btn" onClick={handleApplyFilters}>Apply</button>
                                <button className="pd-reset-btn" onClick={handleResetFilters}>Reset</button>
                            </div>
                        </div>
                    </div>

                    <div className="pd-tabs">
                        {[
                            { name: 'All Transactions', key: 'all' },
                            { name: 'Purchase History', key: 'PURCHASE' },
                            { name: 'Sales History', key: 'SALE' },
                            { name: 'Return History', key: 'RETURN' },
                            { name: 'Stock Transfer', key: 'TRANSFER' },
                            { name: 'Adjustments', key: 'ADJUSTMENT' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={`pd-tab ${activeTab === tab.key ? 'pd-tab-active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="pd-tab-content">
                        <HistoryTable type={activeTab} />
                        <div className="pd-footer-val">
                            Closing Inventory: {totalStock} {product.uom?.unitName} = {formatCurrency(itemValue)}
                        </div>
                    </div>
                </div>

                {/* Print Only History Sections - Sequential for Full Report */}
                <div className="pd-print-only">
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">All Transactions</h3>
                        <HistoryTable type="all" hideClosing={false} />
                    </div>
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">Purchase History</h3>
                        <HistoryTable type="PURCHASE" hideClosing={true} />
                    </div>
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">Sales History</h3>
                        <HistoryTable type="SALE" hideClosing={true} />
                    </div>
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">Return History</h3>
                        <HistoryTable type="RETURN" hideClosing={true} />
                    </div>
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">Stock Transfer</h3>
                        <HistoryTable type="TRANSFER" hideClosing={true} />
                    </div>
                    <div className="pd-print-history-block">
                        <h3 className="pd-section-title">Adjustments</h3>
                        <HistoryTable type="ADJUSTMENT" hideClosing={true} />
                    </div>

                    <div className="pd-footer-val" style={{ marginTop: '30px' }}>
                        Final Closing Inventory: {totalStock} {product.uom?.unitName} = {formatCurrency(itemValue)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;