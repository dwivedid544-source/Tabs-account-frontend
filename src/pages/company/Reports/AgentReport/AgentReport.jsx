import React, { useState, useEffect, useContext } from 'react';
import {
    Search, Filter, Download, Calendar,
    User, Truck, CheckCircle2, AlertCircle,
    ChevronDown, ChevronUp, FileText, DollarSign,
    Layers, ShoppingBag, Eye
} from 'lucide-react';
import './AgentReport.css';
import axiosInstance from '../../../../api/axiosInstance';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AgentReport = () => {
    const { formatCurrency, companySettings, fetchCompanySettings } = useContext(CompanyContext);
    
    // UI Navigation State
    const [activeTab, setActiveTab] = useState('allsales'); // 'allsales', 'salesperson', or 'deliveryperson'
    const [viewMode, setViewMode] = useState('documents'); // 'documents' or 'items'
    const [expandedRows, setExpandedRows] = useState({}); // Tracks { [docNo]: boolean }
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExportOptions, setShowExportOptions] = useState(false);

    // Additional Detailed Filters
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'Sale', 'Purchase'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'unpaid', 'partial'
    const [itemFilter, setItemFilter] = useState('all'); // specific item name or 'all'
    const [warehouseFilter, setWarehouseFilter] = useState('all'); // specific warehouse name or 'all'

    // List of available agents
    const [salespersons, setSalespersons] = useState([]);
    const [deliverypersons, setDeliverypersons] = useState([]);

    // Raw report data
    const [invoices, setInvoices] = useState([]);
    const [purchaseBills, setPurchaseBills] = useState([]);

    // Aggregated / Filtered data for view
    const [aggregatedDocs, setAggregatedDocs] = useState([]);
    const [aggregatedItems, setAggregatedItems] = useState([]);

    useEffect(() => {
        fetchCompanySettings();
        fetchAgents();
    }, []);

    useEffect(() => {
        fetchDataAndAggregate();
    }, [activeTab, startDate, endDate, selectedAgentId]);

    const fetchAgents = async () => {
        try {
            const companyId = GetCompanyId();
            if (!companyId) return;

            const [spRes, dpRes] = await Promise.all([
                axiosInstance.get(`/salespersons?companyId=${companyId}`),
                axiosInstance.get(`/deliverypersons?companyId=${companyId}`)
            ]);

            if (spRes.data?.success && Array.isArray(spRes.data.data)) {
                setSalespersons(spRes.data.data);
            } else if (Array.isArray(spRes.data)) {
                setSalespersons(spRes.data);
            }

            if (dpRes.data?.success && Array.isArray(dpRes.data.data)) {
                setDeliverypersons(dpRes.data.data);
            } else if (Array.isArray(dpRes.data)) {
                setDeliverypersons(dpRes.data);
            }
        } catch (error) {
            console.error("Error fetching agents list:", error);
        }
    };

    const fetchDataAndAggregate = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            if (!companyId) return;

            // Fetch Invoices and Purchase Bills via Report endpoints
            const [invRes, pbRes] = await Promise.all([
                axiosInstance.get('/reports/sales', { params: { companyId, startDate, endDate } }),
                axiosInstance.get('/reports/purchase', { params: { companyId, startDate, endDate } })
            ]);

            const rawInvoices = invRes.data?.data || [];
            const rawPurchaseBills = pbRes.data?.data || [];

            setInvoices(rawInvoices);
            setPurchaseBills(rawPurchaseBills);

            const getDeliveryPersonName = (customFieldsStr) => {
                if (!customFieldsStr) return '';
                try {
                    const parsed = typeof customFieldsStr === 'string' ? JSON.parse(customFieldsStr) : customFieldsStr;
                    return parsed.deliveryPersonName || '';
                } catch (e) {
                    return '';
                }
            };

            const mapInvoiceToDoc = (inv, agentDisplay) => {
                const isRet = Boolean(inv.isReturn);
                const isPosRet = Boolean(inv.isPosReturn || inv.type === 'POS_RETURN');
                const docType = isPosRet ? 'POS Return' : (isRet ? 'Sales Return' : (inv.source === 'POS' || inv.type === 'POS_SALE' ? 'POS Sale' : 'Sale'));
                const docStatus = isRet ? 'Returned' : (inv.status || 'Unpaid');

                return {
                    id: inv.id,
                    docNumber: inv.invoiceNumber,
                    date: new Date(inv.date).toLocaleDateString('en-IN'),
                    type: docType,
                    isReturn: isRet,
                    agentName: agentDisplay,
                    partnerName: inv.customer?.name || 'Walk-in',
                    totalAmount: inv.totalAmount || 0,
                    paidAmount: inv.paidAmount || 0,
                    balanceAmount: inv.balanceAmount || 0,
                    status: docStatus,
                    items: (inv.invoiceitem || []).map(item => ({
                        productName: item.product?.name || item.description || 'Unknown Item',
                        qty: item.quantity || 0,
                        rate: item.rate || 0,
                        total: item.amount || 0,
                        warehouseName: item.warehouse?.name || 'Main Warehouse'
                    }))
                };
            };

            const mapBillToDoc = (bill, agentDisplay) => {
                const isRet = Boolean(bill.isReturn);
                const docType = isRet ? 'Purchase Return' : 'Purchase';
                const docStatus = isRet ? 'Returned' : (bill.balanceAmount === 0 ? 'Paid' : (bill.balanceAmount === bill.totalAmount ? 'Unpaid' : 'Partial'));

                return {
                    id: bill.id,
                    docNumber: bill.billNumber,
                    date: new Date(bill.date).toLocaleDateString('en-IN'),
                    type: docType,
                    isReturn: isRet,
                    agentName: agentDisplay,
                    partnerName: bill.vendor?.name || 'Unknown Vendor',
                    totalAmount: bill.totalAmount || 0,
                    paidAmount: (bill.totalAmount || 0) - (bill.balanceAmount || 0),
                    balanceAmount: bill.balanceAmount || 0,
                    status: docStatus,
                    items: (bill.purchasebillitem || []).map(item => ({
                        productName: item.product?.name || item.description || 'Unknown Item',
                        qty: item.quantity || 0,
                        rate: item.rate || 0,
                        total: item.amount || 0,
                        warehouseName: item.warehouse?.name || 'Main Warehouse'
                    }))
                };
            };

            // Run client-side filter and aggregation depending on Active Tab
            let filteredDocs = [];

            if (activeTab === 'allsales') {
                const isAll = selectedAgentId === 'all';
                const isNoAgent = selectedAgentId === 'no_agent';
                const isWithAgent = selectedAgentId === 'with_agent';

                const matchingInvoices = rawInvoices.filter(inv => {
                    const dpName = getDeliveryPersonName(inv.customFields);
                    const hasSp = !!inv.salespersonId;
                    const hasDp = !!dpName;
                    const hasAnyAgent = hasSp || hasDp;

                    if (isNoAgent) return !hasAnyAgent;
                    if (isWithAgent) return hasAnyAgent;
                    return true;
                }).map(inv => {
                    const dpName = getDeliveryPersonName(inv.customFields);
                    const spName = inv.salesperson?.name;
                    let agentDisplay = 'Direct / No Agent';
                    if (spName && dpName) agentDisplay = `${spName} / ${dpName}`;
                    else if (spName) agentDisplay = spName;
                    else if (dpName) agentDisplay = dpName;

                    return mapInvoiceToDoc(inv, agentDisplay);
                });

                const matchingPurchases = rawPurchaseBills.filter(bill => {
                    const dpName = getDeliveryPersonName(bill.customFields);
                    const hasSp = !!bill.salespersonId;
                    const hasDp = !!dpName;
                    const hasAnyAgent = hasSp || hasDp;

                    if (isNoAgent) return !hasAnyAgent;
                    if (isWithAgent) return hasAnyAgent;
                    return true;
                }).map(bill => {
                    const dpName = getDeliveryPersonName(bill.customFields);
                    const spName = bill.salesperson?.name;
                    let agentDisplay = 'Direct / No Agent';
                    if (spName && dpName) agentDisplay = `${spName} / ${dpName}`;
                    else if (spName) agentDisplay = spName;
                    else if (dpName) agentDisplay = dpName;

                    return mapBillToDoc(bill, agentDisplay);
                });

                filteredDocs = [...matchingInvoices, ...matchingPurchases];
            } else if (activeTab === 'salesperson') {
                const isAll = selectedAgentId === 'all';

                // Invoices with matching salesperson
                const matchingInvoices = rawInvoices.filter(inv => 
                    isAll ? !!inv.salespersonId : String(inv.salespersonId) === String(selectedAgentId)
                ).map(inv => mapInvoiceToDoc(inv, inv.salesperson?.name || ''));

                // Purchase bills with matching salesperson
                const matchingPurchases = rawPurchaseBills.filter(bill => 
                    isAll ? !!bill.salespersonId : String(bill.salespersonId) === String(selectedAgentId)
                ).map(bill => mapBillToDoc(bill, bill.salesperson?.name || ''));

                filteredDocs = [...matchingInvoices, ...matchingPurchases];
            } else {
                const isAll = selectedAgentId === 'all';
                const selectedDp = isAll ? null : deliverypersons.find(dp => String(dp.id) === String(selectedAgentId));
                const targetName = selectedDp?.name || '';

                const matchingInvoices = rawInvoices.filter(inv => {
                    const dpName = getDeliveryPersonName(inv.customFields);
                    return isAll ? !!dpName : dpName.toLowerCase() === targetName.toLowerCase();
                }).map(inv => mapInvoiceToDoc(inv, getDeliveryPersonName(inv.customFields)));

                const matchingPurchases = rawPurchaseBills.filter(bill => {
                    const dpName = getDeliveryPersonName(bill.customFields);
                    return isAll ? !!dpName : dpName.toLowerCase() === targetName.toLowerCase();
                }).map(bill => mapBillToDoc(bill, getDeliveryPersonName(bill.customFields)));

                filteredDocs = [...matchingInvoices, ...matchingPurchases];
            }

            setAggregatedDocs(filteredDocs);

            // Flatten for item-wise report
            const itemsList = filteredDocs.flatMap(doc => 
                doc.items.map(item => ({
                    docNumber: doc.docNumber,
                    date: doc.date,
                    type: doc.type,
                    agentName: doc.agentName,
                    partnerName: doc.partnerName,
                    productName: item.productName,
                    qty: item.qty,
                    rate: item.rate,
                    total: item.total,
                    warehouseName: item.warehouseName
                }))
            );
            setAggregatedItems(itemsList);

        } catch (error) {
            console.error("Error aggregating report data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
    };

    const handleResetFilters = () => {
        setTempStartDate('');
        setTempEndDate('');
        setStartDate('');
        setEndDate('');
        setSelectedAgentId('all');
        setSearchTerm('');
        setTypeFilter('all');
        setStatusFilter('all');
        setItemFilter('all');
        setWarehouseFilter('all');
    };

    const toggleRow = (docNumber) => {
        setExpandedRows(prev => ({
            ...prev,
            [docNumber]: !prev[docNumber]
        }));
    };

    // Filter calculations
    const getFilteredDocs = () => {
        return aggregatedDocs.filter(d => {
            const matchSearch = d.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.agentName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchType = typeFilter === 'all' || d.type === typeFilter;
            
            const matchStatus = statusFilter === 'all' || d.status.toLowerCase() === statusFilter.toLowerCase();
            
            const matchItem = itemFilter === 'all' || d.items.some(item => item.productName === itemFilter);
            
            const matchWarehouse = warehouseFilter === 'all' || d.items.some(item => item.warehouseName === warehouseFilter);

            return matchSearch && matchType && matchStatus && matchItem && matchWarehouse;
        });
    };

    const getFilteredItems = () => {
        return aggregatedItems.filter(i => {
            const matchSearch = i.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.warehouseName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchType = typeFilter === 'all' || i.type === typeFilter;
            
            const doc = aggregatedDocs.find(d => d.docNumber === i.docNumber);
            const docStatus = doc ? doc.status : '';
            const matchStatus = statusFilter === 'all' || docStatus.toLowerCase() === statusFilter.toLowerCase();
            
            const matchItem = itemFilter === 'all' || i.productName === itemFilter;
            
            const matchWarehouse = warehouseFilter === 'all' || i.warehouseName === warehouseFilter;

            return matchSearch && matchType && matchStatus && matchItem && matchWarehouse;
        });
    };

    // Compute unique items and warehouses from items list for drop-downs
    const uniqueItems = Array.from(new Set(aggregatedItems.map(item => item.productName))).filter(Boolean).sort();
    const uniqueWarehouses = Array.from(new Set(aggregatedItems.map(item => item.warehouseName))).filter(Boolean).sort();

    // Compute metrics based on currently filtered documents
    const filteredDocsList = getFilteredDocs();
    const filteredItemsList = getFilteredItems();

    let totalSales = 0;
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    filteredDocsList.forEach(d => {
        if (d.type === 'Sale') {
            totalSales += d.totalAmount;
        } else {
            totalPurchases += d.totalAmount;
        }
        totalPaid += d.paidAmount;
        totalUnpaid += d.balanceAmount;
    });

    const docCount = filteredDocsList.length;

    const exportToExcel = () => {
        const dataToExport = [];
        
        filteredDocsList.forEach(doc => {
            if (doc.items && doc.items.length > 0) {
                doc.items.forEach(item => {
                    dataToExport.push({
                        'Doc Number': doc.docNumber,
                        'Date': doc.date,
                        'Type': doc.type,
                        'Agent Name': doc.agentName,
                        'Customer/Vendor': doc.partnerName + ` (${doc.type === 'Sale' ? 'Customer' : 'Vendor'})`,
                        'Product / Item Name': item.productName,
                        'Quantity': item.qty,
                        'Rate': item.rate,
                        'Total': item.total,
                        'Warehouse Origin/Destination': item.warehouseName,
                        'Total Amount': doc.totalAmount,
                        'Paid': doc.paidAmount,
                        'Balance Due': doc.balanceAmount,
                        'Status': doc.status
                    });
                });
            } else {
                dataToExport.push({
                    'Doc Number': doc.docNumber,
                    'Date': doc.date,
                    'Type': doc.type,
                    'Agent Name': doc.agentName,
                    'Customer/Vendor': doc.partnerName,
                    'Product / Item Name': '',
                    'Quantity': '',
                    'Rate': '',
                    'Total': '',
                    'Warehouse Origin/Destination': '',
                    'Total Amount': doc.totalAmount,
                    'Paid': doc.paidAmount,
                    'Balance Due': doc.balanceAmount,
                    'Status': doc.status
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agent Report");
        XLSX.writeFile(wb, `${activeTab}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const companyName = companySettings?.name || 'Tab Accounts';
        const companyEmail = companySettings?.email || '';
        const companyPhone = companySettings?.phone || '';
        const companyAddress = companySettings?.address || '';

        const generatePDF = (logoBase64) => {
            const doc = new jsPDF('l', 'mm', 'a4');
            
            // Header Color Banner / Top Bar
            doc.setFillColor(140, 224, 67); // #1e293b theme green
            doc.rect(0, 0, 297, 8, 'F');

            // Draw Logo if available
            let textOffset = 14;
            if (logoBase64) {
                try {
                    doc.addImage(logoBase64, 'PNG', 14, 12, 18, 18);
                    textOffset = 36;
                } catch (e) {
                    console.error("Error drawing logo in PDF:", e);
                }
            }

            // Company Info Text
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59); // #1e293b
            doc.text(companyName, textOffset, 17);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139); // #64748b
            
            let contactInfo = [];
            if (companyEmail) contactInfo.push(companyEmail);
            if (companyPhone) contactInfo.push(companyPhone);
            
            doc.text(contactInfo.join('  |  '), textOffset, 23);
            if (companyAddress) {
                doc.text(companyAddress, textOffset, 28);
            }

            // Separator line
            doc.setDrawColor(226, 232, 240); // #e2e8f0
            doc.setLineWidth(0.3);
            doc.line(14, 33, 283, 33);

            // Report Details Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(30, 41, 59);
            const reportTitle = `${activeTab === 'allsales' ? 'All Sales' : (activeTab === 'salesperson' ? 'Salesperson Performance' : 'Delivery Person Tracking')} Report`;
            doc.text(reportTitle, 14, 40);

            // Table headers & content
            const headers = [["Doc Number", "Date", "Type", "Agent Name", "Customer/Vendor", "Product / Item Name", "Quantity", "Rate", "Total", "Warehouse Origin/Destination", "Total Amount", "Paid", "Balance Due", "Status"]];
            const body = [];

            filteredDocsList.forEach(docObj => {
                if (docObj.items && docObj.items.length > 0) {
                    docObj.items.forEach(item => {
                        body.push([
                            docObj.docNumber,
                            docObj.date,
                            docObj.type,
                            docObj.agentName,
                            `${docObj.partnerName} (${docObj.type === 'Sale' ? 'Customer' : 'Vendor'})`,
                            item.productName,
                            item.qty,
                            formatCurrency(item.rate),
                            formatCurrency(item.total),
                            item.warehouseName,
                            formatCurrency(docObj.totalAmount),
                            formatCurrency(docObj.paidAmount),
                            formatCurrency(docObj.balanceAmount),
                            docObj.status
                        ]);
                    });
                } else {
                    body.push([
                        docObj.docNumber,
                        docObj.date,
                        docObj.type,
                        docObj.agentName,
                        `${docObj.partnerName} (${docObj.type === 'Sale' ? 'Customer' : 'Vendor'})`,
                        '',
                        '',
                        '',
                        '',
                        '',
                        formatCurrency(docObj.totalAmount),
                        formatCurrency(docObj.paidAmount),
                        formatCurrency(docObj.balanceAmount),
                        docObj.status
                    ]);
                }
            });

            autoTable(doc, {
                head: headers,
                body: body,
                startY: 46,
                theme: 'striped',
                headStyles: {
                    fillColor: [140, 224, 67], // #1e293b theme green
                    textColor: [255, 255, 255],
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                bodyStyles: {
                    fontSize: 7
                },
                columnStyles: {
                    6: { halign: 'center' }, // Quantity
                    7: { halign: 'center' }, // Rate
                    8: { halign: 'center' }, // Total
                    10: { halign: 'center' }, // Total Amount
                    11: { halign: 'center' }, // Paid
                    12: { halign: 'center' }, // Balance Due
                    13: { halign: 'center' }  // Status
                },
                didParseCell: function(data) {
                    if (data.section === 'head') {
                        if (data.column.index === 6 || data.column.index === 7 || data.column.index === 8 || (data.column.index >= 10 && data.column.index <= 13)) {
                            data.cell.styles.halign = 'center';
                        }
                    }
                }
            });

            // Save Document
            doc.save(`${activeTab}_Report.pdf`);
        };

        // Try converting image URL to base64 for PDF inclusion
        if (companySettings?.logo) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(this, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                generatePDF(dataURL);
            };
            img.onerror = function() {
                generatePDF(null);
            };
            img.src = companySettings.logo;
        } else {
            generatePDF(null);
        }
    };

    return (
        <div className="agent-report-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Agent Performance & Tracking</h1>
                    <p className="page-subtitle">Track salespersons and deliverypersons performance, items transacted, and balances</p>
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

            {/* Unified Report Filter Bar */}
            <div className="unified-filter-card">
                <div className="filter-card-header">
                    <div className="filter-card-title">
                        <Filter size={18} style={{ color: '#1e293b' }} />
                        <span>Filter Options</span>
                    </div>
                    <div className="filter-card-actions">
                        <div className="date-picker-group">
                            <div className="date-input-box">
                                <Calendar size={14} className="date-icon" />
                                <span className="date-label">From:</span>
                                <input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} className="date-picker-input" />
                            </div>
                            <span className="date-arrow">→</span>
                            <div className="date-input-box">
                                <Calendar size={14} className="date-icon" />
                                <span className="date-label">To:</span>
                                <input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} className="date-picker-input" />
                            </div>
                            <button onClick={handleApplyFilters} className="btn-filter-apply">
                                Apply
                            </button>
                        </div>

                        {(startDate || endDate || selectedAgentId !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || itemFilter !== 'all' || warehouseFilter !== 'all') && (
                            <button onClick={handleResetFilters} className="btn-filter-reset">
                                Reset All
                            </button>
                        )}
                    </div>
                </div>

                <div className="filter-card-grid">
                    <div className="filter-field">
                        <label className="field-label">Agent / Employee</label>
                        <div className="select-with-icon">
                            <User size={15} className="select-icon" />
                            <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="styled-select">
                                <option value="all">All Agents / Employees</option>
                                {activeTab === 'allsales' && (
                                    <>
                                        <option value="with_agent">All Transactions With Agent Assigned</option>
                                        <option value="no_agent">Direct / No Agent Assigned</option>
                                    </>
                                )}
                                {(activeTab === 'allsales' || activeTab === 'salesperson') && salespersons.length > 0 && (
                                    <optgroup label="Salespersons">
                                        {salespersons.map(sp => (
                                            <option key={`sp-${sp.id}`} value={sp.id}>{sp.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                                {(activeTab === 'allsales' || activeTab === 'deliveryperson') && deliverypersons.length > 0 && (
                                    <optgroup label="Delivery Persons">
                                        {deliverypersons.map(dp => (
                                            <option key={`dp-${dp.id}`} value={dp.id}>{dp.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Transaction Type</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="styled-select">
                            <option value="all">All Types</option>
                            <option value="Sale">Sales (Invoices & POS)</option>
                            <option value="Purchase">Purchases (Bills)</option>
                            <option value="Return">Returns (Sales & Purchase)</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Payment Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="styled-select">
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Product / Item</label>
                        <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="styled-select">
                            <option value="all">All Products</option>
                            {uniqueItems.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>

                    <div className="filter-field">
                        <label className="field-label">Warehouse</label>
                        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="styled-select">
                            <option value="all">All Warehouses</option>
                            {uniqueWarehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tab Controllers */}
            <div className="report-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'allsales' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('allsales'); setSelectedAgentId('all'); }}
                >
                    <ShoppingBag size={18} /> All Sales
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'salesperson' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('salesperson'); setSelectedAgentId('all'); }}
                >
                    <User size={18} /> Salesperson Performance
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'deliveryperson' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('deliveryperson'); setSelectedAgentId('all'); }}
                >
                    <Truck size={18} /> Delivery Tracking
                </button>
            </div>

            {/* View Mode Toggle Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <div className="view-mode-toggle" style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px' }}>
                    <button 
                        onClick={() => setViewMode('documents')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: viewMode === 'documents' ? 'white' : 'transparent',
                            color: viewMode === 'documents' ? '#0f172a' : '#64748b',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: viewMode === 'documents' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <FileText size={16} /> Document View
                    </button>
                    <button 
                        onClick={() => setViewMode('items')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: viewMode === 'items' ? 'white' : 'transparent',
                            color: viewMode === 'items' ? '#0f172a' : '#64748b',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: viewMode === 'items' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Layers size={16} /> Transacted Items View
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                <div className="summary-card card-blue">
                    <div className="card-content">
                        <span className="card-label">Total Sales Volume</span>
                        <h3 className="card-value">{formatCurrency(totalSales)}</h3>
                    </div>
                    <div className="card-icon icon-blue"><ShoppingBag size={24} /></div>
                </div>
                <div className="summary-card card-purple">
                    <div className="card-content">
                        <span className="card-label">Total Purchase Volume</span>
                        <h3 className="card-value">{formatCurrency(totalPurchases)}</h3>
                    </div>
                    <div className="card-icon icon-purple"><FileText size={24} /></div>
                </div>
                <div className="summary-card card-green">
                    <div className="card-content">
                        <span className="card-label">Collected Amount</span>
                        <h3 className="card-value">{formatCurrency(totalPaid)}</h3>
                    </div>
                    <div className="card-icon icon-green"><CheckCircle2 size={24} /></div>
                </div>
                <div className="summary-card card-red">
                    <div className="card-content">
                        <span className="card-label">Outstanding Balance</span>
                        <h3 className="card-value">{formatCurrency(totalUnpaid)}</h3>
                    </div>
                    <div className="card-icon icon-red"><AlertCircle size={24} /></div>
                </div>
            </div>

            {/* Report Table Card */}
            <div className="report-table-card">
                <div className="table-controls">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search by doc #, agent, partner, product..." 
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading Agent Performance Data...</div>
                    ) : viewMode === 'documents' ? (
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>Doc Number</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Agent / Employee Name</th>
                                    <th>Customer / Vendor</th>
                                    <th className="text-right">Total Amount</th>
                                    <th className="text-right">Paid</th>
                                    <th className="text-right">Balance Due</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="p-8 text-center text-gray-500">No agent document records found matching your selection.</td>
                                    </tr>
                                ) : (
                                    filteredDocsList.map((doc) => (
                                        <React.Fragment key={doc.docNumber}>
                                            <tr>
                                                <td>
                                                    <button className="btn-details-toggle" onClick={() => toggleRow(doc.docNumber)}>
                                                        {expandedRows[doc.docNumber] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td className="font-mono font-medium">{doc.docNumber}</td>
                                                <td>{doc.date}</td>
                                                <td>
                                                    <span className={`type-badge ${doc.type.toLowerCase().replace(/\s+/g, '-')}`}>
                                                        {doc.type}
                                                    </span>
                                                </td>
                                                <td className="font-medium">{doc.agentName}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="font-medium">{doc.partnerName}</span>
                                                        <span style={doc.type.includes('Sale') ? {
                                                            background: '#f1f5f9',
                                                            color: '#475569',
                                                            fontSize: '0.65rem',
                                                            fontWeight: '700',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase',
                                                            border: '1px solid #cbd5e1'
                                                        } : {
                                                            background: '#eff6ff',
                                                            color: '#1d4ed8',
                                                            fontSize: '0.65rem',
                                                            fontWeight: '700',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase',
                                                            border: '1px solid #bfdbfe'
                                                        }}>
                                                            {doc.type.includes('Sale') ? 'Customer' : 'Vendor'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-right font-bold" style={{ color: doc.isReturn ? '#dc2626' : 'inherit' }}>
                                                    {doc.isReturn ? `-${formatCurrency(Math.abs(doc.totalAmount))}` : formatCurrency(doc.totalAmount)}
                                                </td>
                                                <td className="text-right text-green-600 font-medium">{formatCurrency(doc.paidAmount)}</td>
                                                <td className="text-right text-red-600 font-medium">{formatCurrency(doc.balanceAmount)}</td>
                                                <td>
                                                    <span className={`status-pill ${doc.isReturn ? 'returned' : doc.status.toLowerCase()}`}>
                                                        {doc.isReturn ? 'Returned' : doc.status}
                                                    </span>
                                                </td>
                                            </tr>
                                            
                                            {/* Expandable Items Details Row */}
                                            {expandedRows[doc.docNumber] && (
                                                <tr className="item-details-row">
                                                    <td colSpan="10">
                                                        <div className="item-details-box">
                                                            <div className="item-details-title">Transacted Products Breakdown</div>
                                                            <table className="inner-items-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Product / Item Name</th>
                                                                        <th className="text-center">Quantity</th>
                                                                        <th className="text-right">Rate</th>
                                                                        <th className="text-right">Total</th>
                                                                        <th>Warehouse Origin/Destination</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {doc.items.map((item, index) => (
                                                                        <tr key={index}>
                                                                            <td className="font-medium">{item.productName}</td>
                                                                            <td className="text-center font-bold">{item.qty}</td>
                                                                            <td className="text-right">{formatCurrency(item.rate)}</td>
                                                                            <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                                                                            <td>
                                                                                <span className="category-badge">
                                                                                    {item.warehouseName}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        // Items & Warehouses View
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Doc Number</th>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Agent Name</th>
                                    <th>Customer/Vendor</th>
                                    <th>Item / Product Name</th>
                                    <th className="text-center">Quantity</th>
                                    <th className="text-right">Rate</th>
                                    <th className="text-right">Total Amount</th>
                                    <th>Warehouse</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItemsList.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No transacted items found.</td>
                                    </tr>
                                ) : (
                                    filteredItemsList.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="font-mono font-medium">{item.docNumber}</td>
                                            <td>{item.date}</td>
                                            <td>
                                                <span className={`type-badge ${item.type.toLowerCase()}`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="font-medium">{item.agentName}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="font-medium">{item.partnerName}</span>
                                                    <span style={item.type === 'Sale' ? {
                                                        background: '#f1f5f9',
                                                        color: '#475569',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '700',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        textTransform: 'uppercase',
                                                        border: '1px solid #cbd5e1'
                                                    } : {
                                                        background: '#eff6ff',
                                                        color: '#1d4ed8',
                                                        fontSize: '0.65rem',
                                                        fontWeight: '700',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        textTransform: 'uppercase',
                                                        border: '1px solid #bfdbfe'
                                                    }}>
                                                        {item.type === 'Sale' ? 'Customer' : 'Vendor'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="font-medium" style={{ color: '#0f172a' }}>{item.productName}</td>
                                            <td className="text-center font-bold">{item.qty}</td>
                                            <td className="text-right">{formatCurrency(item.rate)}</td>
                                            <td className="text-right font-bold" style={{ color: '#1e293b' }}>{formatCurrency(item.total)}</td>
                                            <td>
                                                <span className="category-badge">
                                                    {item.warehouseName}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentReport;
