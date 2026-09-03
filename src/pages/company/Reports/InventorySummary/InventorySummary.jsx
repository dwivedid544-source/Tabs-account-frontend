import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Filter, Download,
    Eye, X, MapPin, Package, AlertCircle, ChevronRight
} from 'lucide-react';
import './InventorySummary.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useContext } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import warehouseService from '../../../../api/warehouseService';

const InventorySummary = () => {
    const { formatCurrency, fetchCompanySettings } = useContext(CompanyContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [sortBy, setSortBy] = useState('productName'); // productName, closing
    const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
    const [showFinishedOnly, setShowFinishedOnly] = useState(false); // Finished stock = Out of Stock
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');
    const [reportType, setReportType] = useState('item-wise'); // item-wise, warehouse-wise
    const [hideZeroStock, setHideZeroStock] = useState(false);
    const [itemWiseData, setItemWiseData] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});

    useEffect(() => {
        fetchCompanySettings();
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await warehouseService.getWarehouses(companyId);
                if (res.data?.success) {
                    setWarehouses(res.data.data || []);
                } else if (res.success) {
                    setWarehouses(res.data || []);
                }
            }
        } catch (error) {
            console.error("Error fetching warehouses:", error);
        }
    };

    useEffect(() => {
        fetchInventorySummary();
    }, [startDate, endDate, selectedWarehouseId]);

    const fetchInventorySummary = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const response = await axiosInstance.get(`/reports/inventory-summary`, {
                    params: { companyId, startDate, endDate, warehouseId: selectedWarehouseId }
                });
                if (response.data.success) {
                    setInventoryData(response.data.data || []);
                    setItemWiseData(response.data.itemWise || []);
                }
            }
        } catch (error) {
            console.error("Error fetching inventory summary:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setShowViewModal(true);
    };

    // Calculate Summary KPIs
    const kpis = useMemo(() => {
        const uniqueProductIds = new Set(inventoryData.map(i => i.productId));
        const totalClosing = inventoryData.reduce((sum, i) => sum + (i.closing || 0), 0);
        const totalCostVal = inventoryData.reduce((sum, i) => sum + (i.totalValue || 0), 0);
        const totalRetailVal = inventoryData.reduce((sum, i) => sum + (i.salesValue || 0), 0);
        const totalSales = inventoryData.reduce((sum, i) => sum + (i.salesInvoiceQty || 0) + (i.posQty || 0), 0);
        const totalPurchased = inventoryData.reduce((sum, i) => sum + (i.purchaseBillQty || 0), 0);

        return {
            uniqueProducts: uniqueProductIds.size,
            totalClosing,
            totalCostVal,
            totalRetailVal,
            totalSales,
            totalPurchased
        };
    }, [inventoryData]);

    const preFilteredData = useMemo(() => {
        if (selectedWarehouseId === 'ALL') return inventoryData;
        return inventoryData.filter(item => Number(item.warehouseId) === Number(selectedWarehouseId));
    }, [inventoryData, selectedWarehouseId]);

    const stockFilteredData = useMemo(() => {
        if (!hideZeroStock) return preFilteredData;
        return preFilteredData.filter(item => item.closing !== 0);
    }, [preFilteredData, hideZeroStock]);

    const searchFilteredData = useMemo(() => {
        return stockFilteredData.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.warehouse && item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesFinished = showFinishedOnly ? item.closing <= 0 : true;
            return matchesSearch && matchesFinished;
        });
    }, [stockFilteredData, searchTerm, showFinishedOnly]);

    // Grouping
    const groupedData = useMemo(() => {
        if (reportType === 'item-wise') {
            const grouped = {};
            searchFilteredData.forEach(item => {
                const key = item.productId;
                if (!grouped[key]) {
                    grouped[key] = {
                        productId: item.productId,
                        productName: item.productName,
                        sku: item.sku,
                        hsn: item.hsn,
                        barcode: item.barcode,
                        unit: item.unit,
                        price: item.price,
                        salePrice: item.salePrice || item.price,
                        purchasePrice: item.purchasePrice,
                        averageCost: item.averageCost,
                        initialCost: item.initialCost,
                        costPrice: item.costPrice,
                        category: item.category,
                        opening: 0,
                        openingValue: 0,
                        inward: 0,
                        inwardValue: 0,
                        outward: 0,
                        outwardValue: 0,
                        closing: 0,
                        totalValue: 0,
                        salesValue: 0,
                        salesInvoiceQty: 0,
                        posQty: 0,
                        purchaseBillQty: 0,
                        salesReturnQty: 0,
                        purchaseReturnQty: 0,
                        adjustmentQty: 0,
                        breakdown: []
                    };
                }
                grouped[key].opening += item.opening || 0;
                grouped[key].openingValue += item.openingValue || 0;
                grouped[key].inward += item.inward || 0;
                grouped[key].inwardValue += item.inwardValue || 0;
                grouped[key].outward += item.outward || 0;
                grouped[key].outwardValue += item.outwardValue || 0;
                grouped[key].closing += item.closing || 0;
                grouped[key].totalValue += item.totalValue || 0;
                grouped[key].salesValue += item.salesValue || 0;
                grouped[key].salesInvoiceQty += item.salesInvoiceQty || 0;
                grouped[key].posQty += item.posQty || 0;
                grouped[key].purchaseBillQty += item.purchaseBillQty || 0;
                grouped[key].salesReturnQty += item.salesReturnQty || 0;
                grouped[key].purchaseReturnQty += item.purchaseReturnQty || 0;
                grouped[key].adjustmentQty += item.adjustmentQty || 0;
                grouped[key].breakdown.push(item);
            });

            return Object.values(grouped).map(item => {
                let status = 'In Stock';
                if (item.closing <= 0) status = 'Out of Stock';
                else if (item.closing < 10) status = 'Low Stock';
                return { ...item, status };
            });
        } else {
            const grouped = {};
            searchFilteredData.forEach(item => {
                const key = item.warehouse || 'Unknown Warehouse';
                if (!grouped[key]) {
                    grouped[key] = {
                        warehouse: key,
                        warehouseId: item.warehouseId,
                        opening: 0,
                        openingValue: 0,
                        inward: 0,
                        inwardValue: 0,
                        outward: 0,
                        outwardValue: 0,
                        closing: 0,
                        totalValue: 0,
                        salesValue: 0,
                        breakdown: []
                    };
                }
                grouped[key].opening += item.opening || 0;
                grouped[key].openingValue += item.openingValue || 0;
                grouped[key].inward += item.inward || 0;
                grouped[key].inwardValue += item.inwardValue || 0;
                grouped[key].outward += item.outward || 0;
                grouped[key].outwardValue += item.outwardValue || 0;
                grouped[key].closing += item.closing || 0;
                grouped[key].totalValue += item.totalValue || 0;
                grouped[key].salesValue += item.salesValue || 0;
                grouped[key].breakdown.push(item);
            });

            return Object.values(grouped).map(item => {
                let status = 'In Stock';
                if (item.closing <= 0) status = 'Out of Stock';
                else if (item.closing < 10) status = 'Low Stock';
                return { ...item, status };
            });
        }
    }, [searchFilteredData, reportType]);

    // Sorting the top-level groups
    const sortedGroupedData = useMemo(() => {
        return [...groupedData].sort((a, b) => {
            let valA = reportType === 'item-wise' ? a[sortBy] : a.warehouse;
            let valB = reportType === 'item-wise' ? b[sortBy] : b.warehouse;

            if (sortBy === 'closing') {
                valA = a.closing;
                valB = b.closing;
            }

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [groupedData, reportType, sortBy, sortOrder]);

    const selectedItemBreakdown = useMemo(() => {
        if (!selectedItem) return [];
        return inventoryData.filter(item => item.productId === selectedItem.productId);
    }, [selectedItem, inventoryData]);

    const exportToExcel = () => {
        const worksheetData = sortedGroupedData.flatMap(row => {
            const mainRow = {
                'Group Label': reportType === 'item-wise' ? row.productName : row.warehouse,
                'SKU': reportType === 'item-wise' ? row.sku : '',
                'Warehouse/Product Details': 'TOTAL/SUMMARY',
                'Opening': row.opening,
                'Inward': row.inward,
                'Outward': row.outward,
                'Closing': row.closing,
                'Price': reportType === 'item-wise' ? row.price : '',
                'Total Value': row.totalValue,
                'Status': row.status
            };

            const subRows = row.breakdown.map(breakdown => ({
                'Group Label': '',
                'SKU': reportType === 'item-wise' ? '' : breakdown.sku,
                'Warehouse/Product Details': reportType === 'item-wise' ? breakdown.warehouse : breakdown.productName,
                'Opening': breakdown.opening,
                'Inward': breakdown.inward,
                'Outward': breakdown.outward,
                'Closing': breakdown.closing,
                'Price': breakdown.price,
                'Total Value': breakdown.totalValue,
                'Status': breakdown.status
            }));

            return [mainRow, ...subRows];
        });

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory Summary");
        XLSX.writeFile(wb, `Inventory_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');

        // --- Register Arabic Font (Amiri TTF) from CDN ---
        let arabicFontLoaded = false;
        try {
            const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf';
            const fontResponse = await fetch(fontUrl);
            if (fontResponse.ok) {
                const fontBuffer = await fontResponse.arrayBuffer();
                const uint8Array = new Uint8Array(fontBuffer);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
                }
                const base64Font = btoa(binary);
                doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
                doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
                arabicFontLoaded = true;
            }
        } catch (e) {
            console.warn('Could not load Amiri Arabic font, PDF will render without Arabic:', e);
        }

        // Helper: check if text has Arabic characters
        const hasArabic = (text) => {
            if (!text) return false;
            return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
        };

        // Helper: build cell with Arabic font if needed
        const makeCell = (text) => {
            if (!arabicFontLoaded || !hasArabic(text)) return text || '-';
            return { content: text, styles: { font: 'Amiri', fontSize: 7 } };
        };

        doc.setFontSize(18);
        doc.text('Inventory Summary Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
        doc.text(`Report Type: ${reportType === 'item-wise' ? 'Item-wise Warehouse Summary' : 'Warehouse-wise Item Summary'}`, 14, 28);
        if (startDate || endDate) {
            doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, 14, 34);
        }

        const tableColumn = reportType === 'item-wise'
            ? ["Product/Warehouse", "SKU", "Opening", "Inward", "Outward", "Closing", "Price", "Value", "Status"]
            : ["Warehouse/Product", "SKU", "Opening", "Inward", "Outward", "Closing", "Value", "Status"];

        const tableRows = [];
        sortedGroupedData.forEach(row => {
            if (reportType === 'item-wise') {
                tableRows.push([
                    makeCell(row.productName),
                    row.sku,
                    row.opening,
                    `+${row.inward}`,
                    `-${row.outward}`,
                    row.closing,
                    formatCurrency(row.price),
                    formatCurrency(row.totalValue),
                    row.status
                ]);
                row.breakdown.forEach(breakdown => {
                    tableRows.push([
                        makeCell(`  ↳ ${breakdown.warehouse}`),
                        '',
                        breakdown.opening,
                        `+${breakdown.inward}`,
                        `-${breakdown.outward}`,
                        breakdown.closing,
                        formatCurrency(breakdown.price),
                        formatCurrency(breakdown.totalValue),
                        breakdown.status
                    ]);
                });
            } else {
                tableRows.push([
                    makeCell(row.warehouse),
                    '',
                    row.opening,
                    `+${row.inward}`,
                    `-${row.outward}`,
                    row.closing,
                    formatCurrency(row.totalValue),
                    row.status
                ]);
                row.breakdown.forEach(breakdown => {
                    tableRows.push([
                        makeCell(`  ↳ ${breakdown.productName}`),
                        breakdown.sku,
                        breakdown.opening,
                        `+${breakdown.inward}`,
                        `-${breakdown.outward}`,
                        breakdown.closing,
                        formatCurrency(breakdown.totalValue),
                        breakdown.status
                    ]);
                });
            }
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 7 },
            headStyles: { fillColor: [44, 62, 80] },
            didParseCell: (data) => {
                if (!arabicFontLoaded && data.cell.styles.font === 'Amiri') {
                    data.cell.styles.font = 'helvetica';
                }
            }
        });

        doc.save(`Inventory_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'In Stock': return 'status-success';
            case 'Low Stock': return 'status-warning';
            case 'Out of Stock': return 'status-danger';
            default: return 'status-neutral';
        }
    };

    return (
        <div className="inventory-summary-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory Summary</h1>
                    <p className="page-subtitle">Track stock movements and current status</p>
                </div>
                <div className="header-actions">
                    <div className="report-filters-group">
                        <div className="filter-item">
                            <label>From:</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label>To:</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label>Warehouse:</label>
                            <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)}>
                                <option value="ALL">All Warehouses</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        {(startDate || endDate || selectedWarehouseId !== 'ALL') && (
                            <button className="btn-clear-filters" onClick={() => { setStartDate(''); setEndDate(''); setSelectedWarehouseId('ALL'); }}>Clear</button>
                        )}
                    </div>
                    <div className="export-dropdown-wrapper">
                        <button className="btn-export" onClick={() => setShowExportOptions(!showExportOptions)}>
                            <Download size={16} /> Export
                        </button>
                        {showExportOptions && (
                            <div className="export-menu">
                                <button onClick={() => { exportToExcel(); setShowExportOptions(false); }}>Excel File (.xlsx)</button>
                                <button onClick={() => { exportToPDF(); setShowExportOptions(false); }}>PDF Document (.pdf)</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unique Items</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{kpis.uniqueProducts}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Total catalog products</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closing Stock</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>{kpis.totalClosing.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b' }}>units</span></div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Current live stock</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost Valuation</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#334155', marginTop: '4px' }}>{formatCurrency(kpis.totalCostVal)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Stock value at cost</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retail Valuation</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#7c3aed', marginTop: '4px' }}>{formatCurrency(kpis.totalRetailVal)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Potential sale value</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales Qty</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{kpis.totalSales.toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Invoices + POS</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Purchased Qty</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0891b2', marginTop: '4px' }}>{kpis.totalPurchased.toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Bills & GRNs</div>
                </div>
            </div>

            {/* Toggle Report View Type */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#e2e8f0', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                <button 
                    onClick={() => { setReportType('item-wise'); setExpandedRows({}); }} 
                    style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: reportType === 'item-wise' ? 'white' : 'transparent',
                        color: reportType === 'item-wise' ? '#1e293b' : '#64748b',
                        boxShadow: reportType === 'item-wise' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    Item-wise Warehouse Summary
                </button>
                <button 
                    onClick={() => { setReportType('warehouse-wise'); setExpandedRows({}); }} 
                    style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: reportType === 'warehouse-wise' ? 'white' : 'transparent',
                        color: reportType === 'warehouse-wise' ? '#1e293b' : '#64748b',
                        boxShadow: reportType === 'warehouse-wise' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    Warehouse-wise Item Summary
                </button>
            </div>

            <div className="report-table-card">
                {/* Controls */}
                <div className="table-controls">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="report-secondary-filters">
                        {reportType === 'item-wise' && (
                            <div className="filter-group">
                                <label><Filter size={14} /> Sort By:</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="productName">Product Name</option>
                                    <option value="closing">Quantity (Closing)</option>
                                </select>
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                            </div>
                        )}
                        <div className="filter-group checkbox-filter">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={hideZeroStock}
                                    onChange={(e) => setHideZeroStock(e.target.checked)}
                                />
                                <span>Hide Zero Stock Items</span>
                            </label>
                        </div>
                        <div className="filter-group checkbox-filter">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showFinishedOnly}
                                    onChange={(e) => setShowFinishedOnly(e.target.checked)}
                                />
                                <span>Finished Stock Only (Zero Qty)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="table-container">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading inventory data...</div>
                    ) : sortedGroupedData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No inventory records found.</div>
                    ) : reportType === 'item-wise' ? (
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>#</th>
                                    <th>Product & Identifiers</th>
                                    <th>SKU / Barcode</th>
                                    <th className="text-center">Channel Breakdown (Inv / POS / Bill)</th>
                                    <th className="text-center">Opening (Qty / Val)</th>
                                    <th className="text-center">Inward (Qty / Val)</th>
                                    <th className="text-center">Outward (Qty / Val)</th>
                                    <th className="text-center">Closing (Qty / Val)</th>
                                    <th className="text-right">Unit Price (Cost / Sale)</th>
                                    <th className="text-right">Valuation (Cost / Sale)</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGroupedData.map((row, index) => {
                                    const isExpanded = !!expandedRows[row.productId];
                                    return (
                                        <React.Fragment key={row.productId}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : 'transparent', borderLeft: isExpanded ? '4px solid #3b82f6' : 'none' }}>
                                                <td className="text-center">
                                                    <button 
                                                        onClick={() => setExpandedRows(prev => ({ ...prev, [row.productId]: !prev[row.productId] }))}
                                                        className={`btn-row-expand ${isExpanded ? 'expanded' : ''}`}
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </td>
                                                <td>{index + 1}</td>
                                                <td className="font-medium">
                                                    <div style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.9rem' }}>{row.productName}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                        <span>Cat: {row.category || 'Uncategorized'}</span>
                                                        {row.hsn && row.hsn !== 'N/A' && <span>| HSN: <strong style={{ color: '#334155' }}>{row.hsn}</strong></span>}
                                                        <span>| Unit: <strong style={{ color: '#0284c7' }}>{row.unit || 'Pcs'}</strong></span>
                                                    </div>
                                                </td>
                                                <td className="font-mono text-sm">
                                                    <div style={{ fontWeight: '600', color: '#334155' }}>{row.sku}</div>
                                                    {row.barcode && row.barcode !== 'N/A' && (
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>BC: {row.barcode}</div>
                                                    )}
                                                </td>
                                                {/* Channel Breakdown Column */}
                                                <td className="text-center">
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', fontSize: '0.72rem' }}>
                                                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }} title="Sales Invoices">
                                                            Sales Inv: {row.salesInvoiceQty || 0}
                                                        </span>
                                                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }} title="POS Counter Sales">
                                                            POS Qty: {row.posQty || 0}
                                                        </span>
                                                        <span style={{ background: '#f1f5f9', color: '#1e293b', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }} title="Purchase Bills / GRNs">
                                                            Purchases: {row.purchaseBillQty || 0}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-center text-gray-500">
                                                    <div style={{ fontWeight: '600' }}>{row.opening}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatCurrency(row.openingValue || 0)}</div>
                                                </td>
                                                <td className="text-center text-green-600">
                                                    <div style={{ fontWeight: '600' }}>+{row.inward}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#334155' }}>{formatCurrency(row.inwardValue || 0)}</div>
                                                </td>
                                                <td className="text-center text-red-500">
                                                    <div style={{ fontWeight: '600' }}>-{row.outward}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>{formatCurrency(row.outwardValue || 0)}</div>
                                                </td>
                                                <td className="text-center font-bold" style={{ color: row.closing < 0 ? '#ef4444' : '#1e293b' }}>
                                                    <div style={{ fontSize: '0.95rem' }}>{row.closing}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 'normal' }}>{formatCurrency(row.totalValue || 0)}</div>
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ fontSize: '0.78rem', color: '#1e293b' }}>Cost: {formatCurrency(row.costPrice || 0)}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600' }}>Sale: {formatCurrency(row.price || row.salePrice || 0)}</div>
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Val: {formatCurrency(row.totalValue || 0)}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>Sale Val: {formatCurrency(row.salesValue || 0)}</div>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${getStatusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        className="btn-icon-view"
                                                        title="View Full Details"
                                                        onClick={() => handleView(row)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && row.breakdown.map((breakdown, bIdx) => (
                                                <tr key={`breakdown-${bIdx}`} style={{ background: '#f8fafc' }}>
                                                    <td></td>
                                                    <td></td>
                                                    <td colSpan={2} style={{ paddingLeft: '2rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                        ↳ <span className="font-medium text-gray-700">{breakdown.warehouse}</span>
                                                    </td>
                                                    <td className="text-center text-xs">
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Inv: {breakdown.salesInvoiceQty || 0} | POS: {breakdown.posQty || 0}</span>
                                                    </td>
                                                    <td className="text-center text-gray-400 text-sm">
                                                        <div>{breakdown.opening}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{formatCurrency(breakdown.openingValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center text-green-500 text-sm">
                                                        <div>+{breakdown.inward}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#475569' }}>{formatCurrency(breakdown.inwardValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center text-red-400 text-sm">
                                                        <div>-{breakdown.outward}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#f87171' }}>{formatCurrency(breakdown.outwardValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center font-bold text-sm" style={{ color: breakdown.closing < 0 ? '#ef4444' : '#64748b' }}>
                                                        <div>{breakdown.closing}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'normal' }}>{formatCurrency(breakdown.totalValue || 0)}</div>
                                                    </td>
                                                    <td className="text-right text-sm">
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cost: {formatCurrency(breakdown.costPrice || 0)}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Sale: {formatCurrency(breakdown.price || 0)}</div>
                                                    </td>
                                                    <td className="text-right font-bold text-sm">
                                                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Val: {formatCurrency(breakdown.totalValue || 0)}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'normal' }}>Sale: {formatCurrency(breakdown.salesValue || 0)}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${getStatusClass(breakdown.status)}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                                            {breakdown.status}
                                                        </span>
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>#</th>
                                    <th>Warehouse</th>
                                    <th className="text-center">Opening (Qty / Val)</th>
                                    <th className="text-center">Inward (Qty / Val)</th>
                                    <th className="text-center">Outward (Qty / Val)</th>
                                    <th className="text-center">Closing (Qty / Val)</th>
                                    <th className="text-right">Valuation (Cost / Sale)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGroupedData.map((row, index) => {
                                    const isExpanded = !!expandedRows[row.warehouse];
                                    return (
                                        <React.Fragment key={row.warehouse}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : 'transparent', borderLeft: isExpanded ? '4px solid #3b82f6' : 'none' }}>
                                                <td className="text-center">
                                                    <button 
                                                        onClick={() => setExpandedRows(prev => ({ ...prev, [row.warehouse]: !prev[row.warehouse] }))}
                                                        className={`btn-row-expand ${isExpanded ? 'expanded' : ''}`}
                                                    >
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </td>
                                                <td>{index + 1}</td>
                                                <td className="font-medium text-slate-800" style={{ fontWeight: '700' }}>{row.warehouse}</td>
                                                <td className="text-center text-gray-500">
                                                    <div style={{ fontWeight: '600' }}>{row.opening}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatCurrency(row.openingValue || 0)}</div>
                                                </td>
                                                <td className="text-center text-green-600">
                                                    <div style={{ fontWeight: '600' }}>+{row.inward}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#334155' }}>{formatCurrency(row.inwardValue || 0)}</div>
                                                </td>
                                                <td className="text-center text-red-500">
                                                    <div style={{ fontWeight: '600' }}>-{row.outward}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>{formatCurrency(row.outwardValue || 0)}</div>
                                                </td>
                                                <td className="text-center font-bold" style={{ color: row.closing < 0 ? '#ef4444' : '#1e293b' }}>
                                                    <div style={{ fontSize: '0.95rem' }}>{row.closing}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 'normal' }}>{formatCurrency(row.totalValue || 0)}</div>
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Val: {formatCurrency(row.totalValue || 0)}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>Sale Val: {formatCurrency(row.salesValue || 0)}</div>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${getStatusClass(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                            </tr>
                                            {isExpanded && row.breakdown.map((breakdown, bIdx) => (
                                                <tr key={`breakdown-${bIdx}`} style={{ background: '#f8fafc' }}>
                                                    <td></td>
                                                    <td></td>
                                                    <td style={{ paddingLeft: '2rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>↳ {breakdown.productName}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '6px', marginTop: '2px' }}>
                                                            <span>SKU: {breakdown.sku}</span>
                                                            {breakdown.hsn && breakdown.hsn !== 'N/A' && <span>| HSN: {breakdown.hsn}</span>}
                                                            <span>| Unit: {breakdown.unit || 'Pcs'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center text-gray-400 text-sm">
                                                        <div>{breakdown.opening}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{formatCurrency(breakdown.openingValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center text-green-500 text-sm">
                                                        <div>+{breakdown.inward}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#475569' }}>{formatCurrency(breakdown.inwardValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center text-red-400 text-sm">
                                                        <div>-{breakdown.outward}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#f87171' }}>{formatCurrency(breakdown.outwardValue || 0)}</div>
                                                    </td>
                                                    <td className="text-center font-bold text-sm" style={{ color: breakdown.closing < 0 ? '#ef4444' : '#64748b' }}>
                                                        <div>{breakdown.closing}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'normal' }}>{formatCurrency(breakdown.totalValue || 0)}</div>
                                                    </td>
                                                    <td className="text-right font-bold text-sm">
                                                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Val: {formatCurrency(breakdown.totalValue || 0)}</div>
                                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'normal' }}>Sale Val: {formatCurrency(breakdown.salesValue || 0)}</div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className={`status-pill ${getStatusClass(breakdown.status)}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                                                {breakdown.status}
                                                            </span>
                                                            <button
                                                                className="btn-icon-view"
                                                                title="View Full Details"
                                                                style={{ width: '22px', height: '22px', padding: 0 }}
                                                                onClick={() => handleView(breakdown)}
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedItem && (
                <div className="inventory-view-modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="inventory-view-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="inventory-view-modal-header">
                            <div className="inventory-view-modal-title">
                                <Package size={20} />
                                <h2>Inventory Details</h2>
                            </div>
                            <button className="inventory-view-modal-close-icon" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="inventory-view-modal-body">
                            <div className="inventory-view-modal-hero">
                                <div className="inventory-view-modal-hero-left">
                                    <div className="inventory-view-modal-icon-box">
                                        <Package size={28} />
                                    </div>
                                    <div className="inventory-view-modal-hero-text">
                                        <h3>{selectedItem.productName}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                            <span className="inventory-view-modal-sku">SKU: {selectedItem.sku}</span>
                                            <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>HSN: {selectedItem.hsn || 'N/A'}</span>
                                            <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>Barcode: {selectedItem.barcode || 'N/A'}</span>
                                            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>Unit: {selectedItem.unit || 'Pcs'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="inventory-view-modal-status">
                                    <span className={`inventory-view-modal-pill ${getStatusClass(selectedItem.status)}`}>
                                        {selectedItem.status}
                                    </span>
                                </div>
                            </div>

                            {/* Pricing & Costing Grid */}
                            <div className="inventory-view-modal-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '16px' }}>
                                <div className="inventory-view-modal-info-card">
                                    <label>Sale Price</label>
                                    <div className="inventory-view-modal-val" style={{ color: '#2563eb' }}>
                                        {formatCurrency(selectedItem.salePrice || selectedItem.price || 0)}
                                    </div>
                                </div>
                                <div className="inventory-view-modal-info-card">
                                    <label>Purchase Price</label>
                                    <div className="inventory-view-modal-val">
                                        {formatCurrency(selectedItem.purchasePrice || 0)}
                                    </div>
                                </div>
                                <div className="inventory-view-modal-info-card">
                                    <label>Avg / Cost Price</label>
                                    <div className="inventory-view-modal-val">
                                        {formatCurrency(selectedItem.averageCost || selectedItem.costPrice || 0)}
                                    </div>
                                </div>
                                <div className="inventory-view-modal-info-card">
                                    <label>Cost Valuation</label>
                                    <div className="inventory-view-modal-val inventory-view-modal-highlight">
                                        {formatCurrency(selectedItem.totalValue || 0)}
                                    </div>
                                </div>
                                <div className="inventory-view-modal-info-card">
                                    <label>Retail Valuation</label>
                                    <div className="inventory-view-modal-val" style={{ color: '#7c3aed' }}>
                                        {formatCurrency(selectedItem.salesValue || 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Stock Movement Summary */}
                            <div className="inventory-view-modal-movement-box" style={{ marginTop: '16px' }}>
                                <h4 className="inventory-view-modal-section-title">Stock Movement Analysis</h4>
                                <div className="inventory-view-modal-stats-row">
                                    <div className="inventory-view-modal-stat-item">
                                        <span className="inventory-view-modal-stat-label">Opening</span>
                                        <span className="inventory-view-modal-stat-val">{selectedItem.opening || 0}</span>
                                    </div>
                                    <div className="inventory-view-modal-stat-item inventory-view-modal-inward">
                                        <span className="inventory-view-modal-stat-label">Inward</span>
                                        <span className="inventory-view-modal-stat-val">+{selectedItem.inward || 0}</span>
                                    </div>
                                    <div className="inventory-view-modal-stat-item inventory-view-modal-outward">
                                        <span className="inventory-view-modal-stat-label">Outward</span>
                                        <span className="inventory-view-modal-stat-val">-{selectedItem.outward || 0}</span>
                                    </div>
                                    <div className="inventory-view-modal-stat-item inventory-view-modal-closing">
                                        <span className="inventory-view-modal-stat-label">Closing</span>
                                        <span className="inventory-view-modal-stat-val">{selectedItem.closing || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Channel Breakdown Grid */}
                            <div className="inventory-view-modal-movement-box" style={{ marginTop: '16px', background: '#faf5ff', borderColor: '#e9d5ff' }}>
                                <h4 className="inventory-view-modal-section-title" style={{ color: '#6b21a8' }}>Sales & Purchase Channel Breakdown</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
                                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '600' }}>Sales Invoices Qty</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#9333ea', marginTop: '2px' }}>{selectedItem.salesInvoiceQty || 0}</div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '600' }}>POS Counter Qty</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>{selectedItem.posQty || 0}</div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '600' }}>Purchase Bills Qty</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155', marginTop: '2px' }}>{selectedItem.purchaseBillQty || 0}</div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '600' }}>Sales Returns Qty</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#dc2626', marginTop: '2px' }}>{selectedItem.salesReturnQty || 0}</div>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #f3e8ff' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#6b21a8', fontWeight: '600' }}>Purchase Returns Qty</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>{selectedItem.purchaseReturnQty || 0}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Warehouse Breakdown Table */}
                            {((selectedItem.warehouses && selectedItem.warehouses.length > 0) || (selectedItem.breakdown && selectedItem.breakdown.length > 0)) && (
                                <div className="inventory-view-modal-movement-box" style={{ marginTop: '16px' }}>
                                    <h4 className="inventory-view-modal-section-title">Warehouse Distribution Matrix</h4>
                                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', marginTop: '10px' }}>
                                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                                                <tr>
                                                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Warehouse</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>Opening</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>Inward</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>Outward</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>Closing</th>
                                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>Valuation</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedItem.warehouses || selectedItem.breakdown || []).map((w, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: '500', color: '#1e293b' }}>{w.warehouseName || w.warehouse}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{w.opening || 0}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#334155' }}>+{w.inward || 0}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>-{w.outward || 0}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{w.closing || 0}</td>
                                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>{formatCurrency(w.totalValue || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventorySummary;
