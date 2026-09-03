import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, X, Printer, Package, Layers, Receipt } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import './PurchaseReturn.css';
import './PurchaseReturnView.css';
import purchaseReturnService from '../../../../services/purchaseReturnService';
import purchaseBillService from '../../../../services/purchaseBillService';
import goodsReceiptNoteService from '../../../../services/goodsReceiptNoteService';
import vendorService from '../../../../services/vendorService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import companyService from '../../../../api/companyService';

const PurchaseReturn = () => {
    const { formatCurrency, companySettings, getDocumentTitle, getSyncRate } = useContext(CompanyContext);
    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || companySettings?.currency || 'EUR';
        const localeMap = {
            'INR': 'en-IN', 'AED': 'ar-AE', 'SAR': 'ar-SA', 'EUR': 'en-IE', 'GBP': 'en-GB',
            'JPY': 'ja-JP', 'CNY': 'zh-CN', 'RUB': 'ru-RU', 'BRL': 'pt-BR', 'CAD': 'en-CA',
            'AUD': 'en-AU', 'PKR': 'en-PK', 'BDT': 'en-BD'
        };
        const locale = localeMap[docCurrency] || 'en-IE';
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: docCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            const sym = docCurrency === 'EUR' ? '€' : (docCurrency === 'GBP' ? '£' : (docCurrency === 'USD' ? '$' : '₹'));
            return `${sym}${(amount || 0).toFixed(2)}`;
        }
    };

    const getDisplayReason = (row) => {
        if (!row) return '-';
        let cfReason = '';
        if (row.customFields) {
            try {
                const parsed = typeof row.customFields === 'string' ? JSON.parse(row.customFields) : row.customFields;
                if (parsed.reason) cfReason = parsed.reason;
            } catch (e) { }
        }
        if (cfReason && !cfReason.toLowerCase().startsWith('purchase return')) return cfReason;
        if (row.reason && !row.reason.toLowerCase().startsWith('purchase return')) {
            return row.reason;
        }
        return '-';
    };

    const getDisplayNarration = (row) => {
        if (!row) return '-';
        let cfNarration = '';
        if (row.customFields) {
            try {
                const parsed = typeof row.customFields === 'string' ? JSON.parse(row.customFields) : row.customFields;
                if (parsed.narration) cfNarration = parsed.narration;
            } catch (e) { }
        }
        if (cfNarration) return cfNarration;
        if (row.narration) return row.narration;
        if (row.reason && row.reason.toLowerCase().startsWith('purchase return')) {
            return row.reason;
        }
        return '-';
    };
    const { hasPermission } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const targetReturnId = location.state?.targetReturnId;
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
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');

    // Data State
    const [isLoading, setIsLoading] = useState(true);
    const [returns, setReturns] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [bills, setBills] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

    const filteredReturns = returns.filter(item => {
        if (item.date) {
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            if (filterFromDate) {
                const from = new Date(filterFromDate);
                from.setHours(0, 0, 0, 0);
                if (itemDate < from) return false;
            }
            if (filterToDate) {
                const to = new Date(filterToDate);
                to.setHours(23, 59, 59, 999);
                if (itemDate > to) return false;
            }
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const retNo = (item.returnNumber || '').toLowerCase();
            const vendName = (item.vendor?.name || '').toLowerCase();
            const reason = (item.reason || '').toLowerCase();
            
            if (!retNo.includes(q) && !vendName.includes(q) && !reason.includes(q)) {
                return false;
            }
        }
        return true;
    });

    // Form State
    const [formData, setFormData] = useState({
        returnNumber: '',
        manualVoucherNo: '',
        vendorId: '',
        purchaseBillId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Processed',
        returnType: 'Purchase Return',
        warehouseId: '',
        reason: '',
        narration: '',
        items: []
    });

    useEffect(() => {
        fetchInitialData();
        fetchReturns();
    }, []);

    useEffect(() => {
        if (targetReturnId && returns.length > 0) {
            const item = returns.find(r => r.id === targetReturnId);
            if (item) {
                handleView(item);
                // Clear state
                navigate(location.pathname, { replace: true, state: { ...location.state, targetReturnId: undefined } });
            }
        }
    }, [targetReturnId, returns]);

    const fetchInitialData = async () => {
        try {
            const companyId = GetCompanyId();
            const [vendorRes, productRes, warehouseRes, billRes] = await Promise.all([
                vendorService.getAllVendors(companyId),
                productService.getProducts(companyId),
                warehouseService.getWarehouses(companyId),
                purchaseBillService.getBills(companyId)
            ]);

            if (vendorRes.success) setVendors(vendorRes.data);
            if (productRes.success) setProducts(productRes.data);
            if (warehouseRes.success) setWarehouses(warehouseRes.data);
            if (billRes.success) setBills(billRes.data);
        } catch (error) {
            console.error("Error fetching dependencies:", error);
        }
    };

    const fetchReturns = async () => {
        setIsLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await purchaseReturnService.getReturns(companyId);
            if (res.success) setReturns(res.data);
        } catch (error) {
            console.error("Error fetching returns:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (targetReturnId && returns.length > 0) {
            const retItem = returns.find(r => r.id === parseInt(targetReturnId)) || { id: parseInt(targetReturnId) };
            if (location.state?.isEdit || location.state?.autoEdit) {
                handleEdit(retItem);
            } else {
                handleView(retItem);
            }
            navigate(location.pathname, { replace: true, state: { ...location.state, targetReturnId: undefined } });
        }
    }, [targetReturnId, returns]);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'vendorId') {
            setFormData(prev => ({ ...prev, purchaseBillId: '', items: [] }));
        }

        if (name === 'purchaseBillId') {
            if (!value) {
                setFormData(prev => ({ ...prev, items: [] }));
                return;
            }

            try {
                // 1. Fetch the bill
                const companyId = GetCompanyId();
                const billRes = await purchaseBillService.getBillById(value, companyId);
                if (billRes.success) {
                    const bill = billRes.data;
                    const billItems = bill.purchasebillitem || bill.items || [];

                    let itemsToSet = [];
                    // 2. Try detailed lookup if GRN exists (Highest Accuracy)
                    if (bill.grnId) {
                        try {
                            const companyId = GetCompanyId();
                            const grnRes = await goodsReceiptNoteService.getGRNById(bill.grnId, companyId);
                            const grnItems = grnRes.data.goodsreceiptnoteitem || grnRes.data.items || [];
                            if (grnRes.success && grnItems.length > 0) {
                                itemsToSet = grnItems.map(gi => {
                                    const matchingBillItem = billItems.find(bi =>
                                        bi.productId === gi.productId || bi.description === gi.product?.name
                                    );
                                    return {
                                        id: Date.now() + Math.random(),
                                        productId: gi.productId.toString(),
                                        warehouseId: gi.warehouseId.toString(),
                                        quantity: gi.quantity,
                                        rate: parseFloat((matchingBillItem?.rate || 0).toFixed(2)),
                                        tax: matchingBillItem?.taxRate || 0,
                                        total: gi.quantity * parseFloat((matchingBillItem?.rate || 0).toFixed(2))
                                    };
                                });
                            }
                        } catch (grnErr) {
                            console.warn("GRN fetch failed.", grnErr);
                        }
                    }

                    // 3. Fallback: Lookup Purchase Order if no items yet (Medium Accuracy)
                    if (itemsToSet.length === 0 && bill.purchaseOrderId) {
                        try {
                            const companyId = GetCompanyId();
                            const { default: poService } = await import('../../../../services/purchaseOrderService');
                            const poRes = await poService.getOrderById(bill.purchaseOrderId, companyId);
                            const poItems = poRes.data.purchaseorderitem || poRes.data.items || [];
                            if (poRes.success && poItems.length > 0) {
                                itemsToSet = poItems.map(pi => {
                                    const matchingBillItem = billItems.find(bi =>
                                        (bi.productId && bi.productId === pi.productId) || (bi.description === pi.description)
                                    );
                                    return {
                                        id: Date.now() + Math.random(),
                                        productId: (pi.productId || '').toString(),
                                        warehouseId: (bill.warehouseId || (warehouses.length > 0 ? warehouses[0].id.toString() : '')).toString(),
                                        quantity: matchingBillItem?.quantity || pi.quantity,
                                        rate: parseFloat((matchingBillItem?.rate || pi.rate || 0).toFixed(2)),
                                        tax: matchingBillItem?.taxRate || pi.taxRate || 0,
                                        total: matchingBillItem?.amount || pi.amount
                                    };
                                });
                            }
                        } catch (poErr) {
                            console.warn("PO fetch failed.", poErr);
                        }
                    }

                    // 4. Final Fallback: bill items only (Fuzzy match by description)
                    if (itemsToSet.length === 0) {
                        itemsToSet = billItems.map(i => {
                            const matchedProduct = products.find(p =>
                                (i.productId && p.id === parseInt(i.productId)) ||
                                (p.name.toLowerCase().trim() === i.description.toLowerCase().trim())
                            );

                            return {
                                id: Date.now() + Math.random(),
                                productId: matchedProduct ? matchedProduct.id.toString() : (i.productId || '').toString(),
                                warehouseId: (bill.warehouseId || (warehouses.length > 0 ? warehouses[0].id.toString() : '')).toString(),
                                quantity: i.quantity,
                                rate: parseFloat((i.rate || 0).toFixed(2)),
                                tax: i.taxRate || 0,
                                total: i.amount
                            };
                        });
                    }

                    const billRefNo = bill.billNumber || `#BILL-${bill.id}`;
                    const billNarration = bill.narration || bill.notes || '';
                    const autoNarration = billNarration
                        ? `Purchase Return against Bill ${billRefNo} - ${billNarration}`
                        : `Purchase Return against Bill ${billRefNo}`;

                    setFormData(prev => ({
                        ...prev,
                        vendorId: bill.vendorId.toString(),
                        items: itemsToSet,
                        warehouseId: (bill.warehouseId || itemsToSet[0]?.warehouseId || (warehouses.length > 0 ? warehouses[0].id.toString() : '')).toString(),
                        narration: autoNarration
                    }));
                }
            } catch (error) {
                console.error("Error auto-filling from bill:", error);
                toast.error("Failed to load bill details. Please check connection.");
            }
        }
    };

    const handleCreate = async () => {
        let returnNumber = `PR-${Date.now().toString().slice(-6)}`;
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'purchasereturn');
                if (res.data && res.data.success) {
                    returnNumber = res.data.nextNumber;
                }
            }
        } catch (error) {
            console.error('Error fetching next purchasereturn number:', error);
        }

        setFormData({
            returnNumber: returnNumber,
            manualVoucherNo: '',
            vendorId: '',
            purchaseBillId: '',
            date: new Date().toISOString().split('T')[0],
            status: 'Processed',
            returnType: 'Purchase Return',
            warehouseId: '',
            reason: '',
            narration: '',
            items: [{ id: Date.now(), productId: '', warehouseId: '', quantity: 1, rate: 0, tax: 0, total: 0 }]
        });
        setNotes(companySettings?.notes || '');
        setTerms(companySettings?.termsPurchase || companySettings?.terms || '');
        setCustomFieldValues({});
        setIsEditMode(false);
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            returnNumber: item.returnNumber,
            manualVoucherNo: item.manualVoucherNo || '',
            vendorId: item.vendorId.toString(),
            purchaseBillId: item.purchaseBillId ? item.purchaseBillId.toString() : '',
            date: item.date.split('T')[0],
            status: item.status || 'Processed',
            returnType: item.returnType || 'Purchase Return',
            warehouseId: (item.warehouseId || (item.items && item.items[0]?.warehouseId) || '').toString(),
            reason: item.reason || '',
            narration: item.narration || '',
            items: item.items.map(i => ({
                id: i.id || Date.now() + Math.random(),
                productId: i.productId.toString(),
                warehouseId: i.warehouseId.toString(),
                quantity: i.quantity,
                rate: i.rate,
                tax: 0,
                total: i.amount
            }))
        });

        let fieldValues = {};
        if (item.customFields) {
            try {
                fieldValues = typeof item.customFields === 'string'
                    ? JSON.parse(item.customFields)
                    : item.customFields;
                setNotes(fieldValues.notes !== undefined ? fieldValues.notes : (companySettings?.notes || ''));
                setTerms(fieldValues.terms !== undefined ? fieldValues.terms : (companySettings?.termsPurchase || companySettings?.terms || ''));
            } catch (e) {
                console.error('Error parsing custom fields on edit:', e);
                setNotes(companySettings?.notes || '');
                setTerms(companySettings?.termsPurchase || companySettings?.terms || '');
            }
        } else {
            setNotes(companySettings?.notes || '');
            setTerms(companySettings?.termsPurchase || companySettings?.terms || '');
        }
        setCustomFieldValues(fieldValues);

        setIsEditMode(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.vendorId) {
            toast.error("Please select a vendor");
            return;
        }
        if (formData.items.length === 0 || formData.items.some(i => !i.productId || i.quantity <= 0)) {
            toast.error("Please add valid items and quantities");
            return;
        }

        const totalAmount = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

        const companyId = GetCompanyId();
        const payload = {
            companyId,
            returnNumber: formData.returnNumber || `PR-${Date.now()}`,
            manualVoucherNo: formData.manualVoucherNo,
            vendorId: parseInt(formData.vendorId),
            purchaseBillId: formData.purchaseBillId ? parseInt(formData.purchaseBillId) : null,
            date: formData.date,
            reason: formData.reason,
            narration: formData.narration,
            totalAmount: totalAmount,
            warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : null,
            items: formData.items.map(i => ({
                productId: parseInt(i.productId),
                warehouseId: parseInt(i.warehouseId || formData.warehouseId),
                quantity: parseFloat(i.quantity),
                rate: parseFloat(i.rate),
                amount: parseFloat(i.total)
            })),
            customFields: JSON.stringify({
                ...customFieldValues,
                notes: notes,
                terms: terms,
                narration: formData.narration || '',
                reason: formData.reason || ''
            })
        };

        try {
            if (isEditMode && editingId) {
                await purchaseReturnService.updateReturn(editingId, payload, companyId);
                toast.success("Purchase Return Updated");
            } else {
                await purchaseReturnService.createReturn(payload);
                toast.success("Purchase Return Created");
            }
            setShowModal(false);
            fetchReturns();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to process return");
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), productId: '', warehouseId: '', quantity: 1, rate: 0, tax: 0, total: 0 }]
        }));
    };

    const removeItem = (id) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== id)
        }));
    };

    const updateItem = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id === id) {
                    const newItem = { ...item, [field]: value };
                    if (field === 'productId') {
                        const prod = products.find(p => p.id === parseInt(value));
                        if (prod) {
                            const selectedBillId = prev.purchaseBillId;
                            const selectedBill = bills.find(b => b.id === parseInt(selectedBillId));
                            const billCurr = selectedBill?.currency || companySettings?.currency || 'INR';
                            const baseCurr = companySettings?.currency || 'INR';
                            const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                            newItem.rate = parseFloat(((prod.purchasePrice || 0) / liveRate).toFixed(2));
                        }
                    }
                    if (['quantity', 'rate', 'productId'].includes(field)) {
                        newItem.total = (parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.rate) || 0);
                    }
                    return newItem;
                }
                return item;
            })
        }));
    };

    const handleView = async (item) => {
        try {
            // Fetch full details with relationships
            const companyId = GetCompanyId();
            const res = await purchaseReturnService.getReturnById(item.id, companyId);
            if (res.success && res.data) {
                setSelectedReturn(res.data);
            } else {
                // Fallback to the item from list
                setSelectedReturn(item);
            }
            setShowViewModal(true);
        } catch (error) {
            console.error('Error fetching return details:', error);
            // Fallback to the item from list
            setSelectedReturn(item);
            setShowViewModal(true);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('purchase-return-print-content');
        if (!printContent) {
            toast.error('Print content not found. Please try again.');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            toast.error('Please allow popups to print.');
            return;
        }

        const styles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; padding: 2rem; }
            .pr-receipt-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; margin-bottom: 1.5rem; }
            .pr-receipt-company-info { display: flex; align-items: flex-start; gap: 1rem; }
            .pr-receipt-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
            .pr-receipt-company-name { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin-bottom: 0.2rem; }
            .pr-receipt-company-address { font-size: 0.85rem; color: #64748b; margin-bottom: 0.2rem; }
            .pr-receipt-company-contact { font-size: 0.82rem; color: #64748b; }
            .pr-receipt-title-block { text-align: right; flex-shrink: 0; }
            .pr-receipt-title { font-size: 2rem; font-weight: 900; color: #f59e0b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
            .pr-receipt-meta { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem; color: #475569; }
            .pr-receipt-meta-label { font-weight: 600; color: #94a3b8; margin-right: 4px; }
            hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.25rem 0; }
            .pr-receipt-address-row { display: flex; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
            .pr-receipt-section-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; display: block; }
            .pr-receipt-vendor-name { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.2rem; }
            .pr-receipt-vendor-addr { font-size: 0.85rem; color: #64748b; margin-bottom: 0.15rem; }
            .pr-receipt-items-section { margin-bottom: 2rem; }
            table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
            thead tr { background: #1e293b; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 0.7rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .pr-total-row td { padding: 0.85rem 1rem; background: #fffbeb; border-top: 2px solid #fcd34d; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pr-reason-box { background: #f8fafc; border-left: 4px solid #f59e0b; padding: 0.75rem 1rem; border-radius: 0 6px 6px 0; font-size: 0.875rem; color: #475569; margin-bottom: 2rem; }
            .pr-sig-row { display: flex; justify-content: space-between; gap: 3rem; margin: 2.5rem 0 1.5rem; padding-top: 1rem; }
            .pr-sig-box { flex: 1; text-align: center; }
            .pr-sig-line { border-top: 2px solid #94a3b8; margin-bottom: 0.5rem; height: 40px; }
            .pr-sig-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .pr-footer { border-top: 1px dashed #e2e8f0; padding-top: 1rem; text-align: center; font-size: 0.78rem; color: #94a3b8; }
            .pr-footer p { margin: 0.2rem 0; }
            .pr-status-badge { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-block; background: #f1f5f9; color: #334155; }
            @media print { body { padding: 0.5rem; } thead tr { background: #1e293b !important; } .pr-total-row td { background: #fffbeb !important; } }
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>Purchase Return - ${selectedReturn?.returnNumber || ''}</title>
                <style>${styles}</style>
            </head>
            <body>${printContent.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="pretn-container">
            <div className="pretn-header">
                <div>
                    <h1 className="pretn-title">Purchase Returns</h1>
                    <p className="pretn-subtitle">Manage purchase returns and debit notes efficiently</p>
                </div>
                {hasPermission('create purchase return') && (
                    <button className="pretn-btn-add" onClick={handleCreate}>
                        <Plus size={18} className="mr-2" /> Record Return
                    </button>
                )}
            </div>

            <div className="pretn-table-card">
                <div className="pretn-table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="pretn-search-wrapper" style={{ flex: '1 1 200px', margin: 0 }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search returns..."
                            className="pretn-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</label>
                            <input 
                                type="date" 
                                className="pretn-search-input" 
                                style={{ padding: '8px 12px', width: 'auto' }}
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</label>
                            <input 
                                type="date" 
                                className="pretn-search-input" 
                                style={{ padding: '8px 12px', width: 'auto' }}
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                            />
                        </div>
                        {(filterFromDate || filterToDate || searchTerm) && (
                            <button 
                                onClick={() => { setFilterFromDate(''); setFilterToDate(''); setSearchTerm(''); }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="pretn-table-container">
                    <table className="pretn-table">
                        <thead>
                            <tr>
                                <th>RETURN #</th>
                                <th>REF BILL</th>
                                <th>VENDOR</th>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>REASON</th>
                                <th>NARRATION</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="7" className="text-center p-8">Loading Returns...</td></tr>
                            ) : returns.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8">No purchase returns recorded yet.</td></tr>
                            ) : filteredReturns.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8">No purchase returns match the selected filters.</td></tr>
                            ) : (
                                filteredReturns.map((item) => (
                                    <tr key={item.id}>
                                        <td className="pretn-id-text">
                                            <span className="cursor-pointer hover:underline" onClick={() => handleView(item)}>
                                                {item.returnNumber}
                                            </span>
                                        </td>
                                        <td>{item.purchasebill?.billNumber || item.purchaseBill?.billNumber || '-'}</td>
                                        <td>{item.vendor?.name}</td>
                                        <td>{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="pretn-amount-text">
                                             {item.purchasebill?.currency && item.purchasebill?.currency !== (companySettings?.currency || 'INR') ? (
                                                 (() => {
                                                     const liveRate = getSyncRate(item.purchasebill.currency, companySettings?.currency || 'INR') || 1;
                                                     return (
                                                         <>
                                                             <div>{formatDocCurrency(item.totalAmount || 0, item.purchasebill.currency)}</div>
                                                             <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((item.totalAmount || 0) * liveRate)})</div>
                                                         </>
                                                     );
                                                 })()
                                             ) : (
                                                 formatCurrency(item.totalAmount || 0)
                                             )}
                                         </td>
                                        <td>
                                          <span className="pretn-reason-text" title={getDisplayReason(item)}>{getDisplayReason(item)}</span>
                                        </td>
                                        <td><span className="pretn-narration-text" title={getDisplayNarration(item)}>{getDisplayNarration(item)}</span></td>
                                        <td> <span className={`pretn-status ${item.status?.toLowerCase() || 'pending'}`}>
                                                {item.status}
                                            </span></td>
                                        <td>
                                            <div className="pretn-actions">
                                                <button className="pretn-btn-icon" title="View" onClick={() => handleView(item)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit purchase return') && (
                                                    <button className="pretn-btn-icon edit" title="Edit" onClick={() => handleEdit(item)}>
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete purchase return') && (
                                                    <button className="pretn-btn-icon delete" title="Delete" onClick={() => { setSelectedReturn(item); setShowDeleteModal(true); }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="pretn-modal-overlay">
                    <div className="pretn-modal-card">
                        <div className="pretn-modal-header">
                            <h2 className="text-xl font-bold" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                                {isEditMode ? 'Edit Purchase Return' : 'Add New Purchase Return'}
                            </h2>
                            <button className="cursor-pointer" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="pretn-modal-body">
                            <div className="pretn-form-container">
                                <div className="pretn-top-grid">
                                    {/* Left Column */}
                                    <div className="pretn-col">
                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Reference ID (Auto)</label>
                                            <input type="text" className="pretn-input pretn-input-readonly" value={isEditMode ? formData.returnNumber : 'Assigned after save'} readOnly />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Manual Voucher No</label>
                                            <input type="text" name="manualVoucherNo" className="pretn-input" value={formData.manualVoucherNo} placeholder="Optional" onChange={handleInputChange} />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Return No <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="text" name="returnNumber" className="pretn-input" value={formData.returnNumber} onChange={handleInputChange} />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Return Type</label>
                                            <select name="returnType" className="pretn-select" value={formData.returnType} onChange={handleInputChange}>
                                                <option value="Purchase Return">Purchase Return</option>
                                                <option value="Debit Note">Debit Note</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="pretn-col">
                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Vendor <span style={{ color: '#ef4444' }}>*</span></label>
                                            <SearchableSelect
                                                options={vendors.map(v => ({ id: String(v.id), name: v.name }))}
                                                value={formData.vendorId ? String(formData.vendorId) : ''}
                                                onChange={(val) => {
                                                    handleInputChange({ target: { name: 'vendorId', value: val } });
                                                }}
                                                placeholder="Select Vendor..."
                                                searchPlaceholder="Search vendor..."
                                                labelKey="name"
                                                valueKey="id"
                                                groupKey=""
                                                clearable={false}
                                            />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Ref Bill <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span></label>
                                            <SearchableSelect
                                                options={bills.filter(b => b.vendorId === parseInt(formData.vendorId)).map(b => {
                                                    const baseCurr = companySettings?.currency || 'INR';
                                                    const isForeign = b.currency && b.currency !== baseCurr;
                                                    let priceStr = '';
                                                    if (b.totalAmount) {
                                                        if (isForeign) {
                                                            const liveRate = getSyncRate(b.currency, baseCurr) || 1.0;
                                                            priceStr = ` - ${formatDocCurrency(b.totalAmount, b.currency)} (${formatCurrency(b.totalAmount * liveRate)})`;
                                                        } else {
                                                            priceStr = ` - ${formatCurrency(b.totalAmount)}`;
                                                        }
                                                    }
                                                    return {
                                                        id: String(b.id),
                                                        name: `${b.billNumber}${priceStr}`
                                                    };
                                                })}
                                                value={formData.purchaseBillId ? String(formData.purchaseBillId) : ''}
                                                onChange={(val) => {
                                                    handleInputChange({ target: { name: 'purchaseBillId', value: val } });
                                                }}
                                                disabled={!formData.vendorId}
                                                placeholder={formData.vendorId ? 'Select Bill...' : 'Select Vendor First'}
                                                searchPlaceholder="Search bill..."
                                                labelKey="name"
                                                valueKey="id"
                                                groupKey=""
                                                clearable={false}
                                            />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Date <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input type="date" name="date" className="pretn-input" value={formData.date} onChange={handleInputChange} />
                                        </div>

                                        <div className="pretn-form-group">
                                            <label className="pretn-label">Main Warehouse <span style={{ color: '#ef4444' }}>*</span></label>
                                            <SearchableSelect
                                                options={warehouses.map(w => ({ id: String(w.id), name: w.name }))}
                                                value={formData.warehouseId ? String(formData.warehouseId) : ''}
                                                onChange={(val) => handleInputChange({ target: { name: 'warehouseId', value: val } })}
                                                placeholder="Select Warehouse..."
                                                searchPlaceholder="Search warehouse..."
                                                labelKey="name"
                                                valueKey="id"
                                                groupKey=""
                                                clearable={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Returned Items Section */}
                            <div className="pretn-items-section mb-6">
                                {(() => {
                                    const selectedBill = bills.find(b => b.id === parseInt(formData.purchaseBillId));
                                    return (
                                        <div className="pretn-items-card">
                                            <div className="pretn-items-header-bar">
                                                <div className="pretn-items-header-title-group">
                                                    <h4 className="pretn-section-title">Returned Items</h4>
                                                    {selectedBill && (
                                                        <span className="pretn-badge-bill-info">
                                                            📄 Bill: <strong>{selectedBill.billNumber}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                                <button type="button" className="pretn-btn-add-item-green" onClick={addItem}>
                                                    <Plus size={16} style={{ marginRight: '6px' }} /> Add Item
                                                </button>
                                            </div>

                                            {formData.items.length > 0 && (
                                                <>
                                                    <div className="pretn-items-table-header">
                                                        <div>Product</div>
                                                        <div>Warehouse</div>
                                                        <div>Qty</div>
                                                        <div>Rate</div>
                                                        <div>Tax %</div>
                                                        <div style={{ textAlign: 'right' }}>Amount</div>
                                                        <div style={{ textAlign: 'center' }}>Action</div>
                                                    </div>
                                                    <div className="pretn-items-list-body">
                                                        {formData.items.map((item) => {
                                                            const selectedBillId = formData.purchaseBillId;
                                                            const selectedBillObj = bills.find(b => b.id === parseInt(selectedBillId));
                                                            const billCurr = selectedBillObj?.currency || companySettings?.currency || 'INR';
                                                            const baseCurr = companySettings?.currency || 'INR';
                                                            const isForeign = billCurr !== baseCurr;
                                                            const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                            const prod = products.find(p => p.id === parseInt(item.productId));

                                                            return (
                                                                <div key={item.id} className="pretn-item-row">
                                                                    <div className="pretn-item-col-name">
                                                                        <SearchableSelect
                                                                            options={products.map(p => {
                                                                                const priceStr = p.purchasePrice ? (
                                                                                    isForeign
                                                                                        ? `(${formatDocCurrency(p.purchasePrice / liveRate, billCurr)} / ${formatCurrency(p.purchasePrice)})`
                                                                                        : `(${formatCurrency(p.purchasePrice)})`
                                                                                ) : '';
                                                                                return {
                                                                                    ...p,
                                                                                    id: String(p.id),
                                                                                    name: `${p.name} ${priceStr}`
                                                                                };
                                                                            })}
                                                                            value={item.productId ? String(item.productId) : ''}
                                                                            onChange={(val) => updateItem(item.id, 'productId', val)}
                                                                            placeholder="Select Product..."
                                                                            searchPlaceholder="Search product..."
                                                                            labelKey="name"
                                                                            valueKey="id"
                                                                            groupKey=""
                                                                            clearable={false}
                                                                        />
                                                                       
                                                                          
                                                                    
                                                                    </div>
                                                                    <div className="pretn-item-col-wh">
                                                                        <SearchableSelect
                                                                            options={warehouses.map(w => {
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
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        className="pretn-input"
                                                                        value={item.quantity}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="pretn-input"
                                                                        value={item.rate}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="pretn-input"
                                                                        value={item.tax || 0}
                                                                        min="0"
                                                                        step="0.01"
                                                                        onChange={(e) => updateItem(item.id, 'tax', e.target.value)}
                                                                    />
                                                                    <div className="pretn-item-amount">
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div style={{ fontWeight: '700' }}>{formatDocCurrency(item.total || 0, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency((item.total || 0) * liveRate)})</div>
                                                                            </>
                                                                        ) : (
                                                                            formatCurrency(item.total || 0)
                                                                        )}
                                                                    </div>
                                                                    <button type="button" className="pretn-btn-remove-item" onClick={() => removeItem(item.id)} title="Remove Item">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="pretn-items-summary-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 11px 11px', flexWrap: 'wrap', gap: '10px' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                                                             <span>Total Items: <strong style={{ color: '#0f172a' }}>{formData.items.length}</strong></span>
                                                             <span style={{ color: '#cbd5e1' }}>•</span>
                                                             <span>Total Qty: <strong style={{ color: '#0f172a' }}>{formData.items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0)}</strong></span>
                                                         </div>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                                                             <span>Total Return Amount:</span>
                                                             <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                                                 {(() => {
                                                                     const selectedBillId = formData.purchaseBillId;
                                                                     const selectedBillObj = bills.find(b => b.id === parseInt(selectedBillId));
                                                                     const billCurr = selectedBillObj?.currency || companySettings?.currency || 'INR';
                                                                     const baseCurr = companySettings?.currency || 'INR';
                                                                     const isForeign = billCurr !== baseCurr;
                                                                     const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                                     const computedTotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                                                                     return isForeign
                                                                         ? `${formatDocCurrency(computedTotal, billCurr)} (${formatCurrency(computedTotal * liveRate)})`
                                                                         : formatCurrency(computedTotal);
                                                                 })()}
                                                             </span>
                                                         </div>
                                                     </div>
                                                </>
                                            )}

                                            {formData.items.length === 0 && (
                                                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                                    <p style={{ margin: 0, fontWeight: 500 }}>No items added yet. Click <strong>+ Add Item</strong> above to add products to return.</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Custom Fields Section */}
                            {getCustomFieldsForType('purchasereturn').length > 0 && (
                                <div className="pretn-form-group" style={{ margin: '20px 0', padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                        Custom Fields
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                        {getCustomFieldsForType('purchasereturn').map(field => (
                                            <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label className="pretn-label" style={{ textAlign: 'left' }}>
                                                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                </label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        className="pretn-select"
                                                        value={customFieldValues[field.label] || ''}
                                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                        style={{ backgroundColor: 'white' }}
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
                                                        className="pretn-input"
                                                        placeholder={`Enter ${field.label}`}
                                                        value={customFieldValues[field.label] || ''}
                                                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value }))}
                                                        required={field.required}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reason & Narration */}
                            <div className="pretn-bottom-grid" style={{ marginBottom: '1rem' }}>
                                <div className="pretn-form-group">
                                    <label className="pretn-label">Reason for Return</label>
                                    <input type="text" name="reason" className="pretn-input" placeholder="e.g., Damaged items" value={formData.reason} onChange={handleInputChange} />
                                </div>
                                <div className="pretn-form-group">
                                    <label className="pretn-label">Narration (Accounts)</label>
                                    <textarea name="narration" className="pretn-input" style={{ height: 'auto', minHeight: '40px' }} rows="2" value={formData.narration} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div className="pretn-bottom-grid">
                                <div className="pretn-form-group">
                                    <label className="pretn-label">Notes</label>
                                    <textarea className="pretn-input" style={{ height: 'auto', minHeight: '40px' }} rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter notes..." />
                                </div>
                                <div className="pretn-form-group">
                                    <label className="pretn-label">Terms & Conditions</label>
                                    <textarea className="pretn-input" style={{ height: 'auto', minHeight: '40px' }} rows="2" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms..." />
                                </div>
                            </div>
                        </div>

                        <div className="pretn-modal-footer">
                            <button
                                type="button"
                                className="pretn-btn-cancel"
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '8px',
                                    border: '1.5px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontWeight: '600',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="pretn-btn-save"
                                onClick={handleSave}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    background: '#1e293b',
                                    color: '#0f172a',
                                    border: '1.5px solid #1e293b',
                                    fontWeight: '700',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(30, 41, 59, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isEditMode ? 'Update Record' : 'Record Return'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal - Professional Receipt */}
            {showViewModal && selectedReturn && (
                <div className="pretn-modal-overlay">
                    <div className="pretn-view-modal-container">
                        {/* Modal Header - hidden on print */}
                        <div className="pretn-view-modal-header pretn-no-print">
                            <h2 className="pretn-view-modal-title">
                                Purchase Return &mdash; <span style={{ color: '#f59e0b' }}>#{selectedReturn.returnNumber || selectedReturn.id}</span>
                            </h2>
                            <button className="pretn-view-close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="pretn-view-modal-body" style={{ padding: 0 }}>
                            {/* ===== PRINTABLE RECEIPT DOCUMENT ===== */}
                            <div id="purchase-return-print-content" className="pr-receipt-document">

                                {/* Company Header */}
                                <div className="pr-receipt-header">
                                    <div className="pr-receipt-company-info">
                                        {companySettings?.logo && (
                                            <img src={companySettings.logo} alt="Company Logo" className="pr-receipt-logo" />
                                        )}
                                        <div>
                                            <div className="pr-receipt-company-name">{companySettings?.name || 'Company Name'}</div>
                                            <div className="pr-receipt-company-address">{companySettings?.address || ''}{companySettings?.city ? `, ${companySettings.city}` : ''}</div>
                                            {companySettings?.phone && <div className="pr-receipt-company-contact">{companySettings.phone}</div>}
                                            {companySettings?.email && <div className="pr-receipt-company-contact">{companySettings.email}</div>}
                                        </div>
                                    </div>
                                    <div className="pr-receipt-title-block">
                                        <div className="pr-receipt-title">{getDocumentTitle('purchasereturn')}</div>
                                        <div className="pr-receipt-meta">
                                            <div><span className="pr-receipt-meta-label">Return No:</span> <strong>{selectedReturn.returnNumber}</strong></div>
                                            <div><span className="pr-receipt-meta-label">Date:</span> {new Date(selectedReturn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                            {(selectedReturn.purchasebill?.billNumber || selectedReturn.purchaseBill?.billNumber) && (
                                                <div><span className="pr-receipt-meta-label">Bill Ref:</span> {selectedReturn.purchasebill?.billNumber || selectedReturn.purchaseBill?.billNumber}</div>
                                            )}
                                            {selectedReturn.manualVoucherNo && (
                                                <div><span className="pr-receipt-meta-label">Voucher:</span> {selectedReturn.manualVoucherNo}</div>
                                            )}
                                            <div>
                                                <span className="pr-status-badge">{selectedReturn.status || 'Processed'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr />

                                {/* Vendor & Warehouse Cards Row */}
                                <div className="pr-receipt-info-cards" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '1.5rem' }}>
                                    <div className="pr-receipt-card pr-receipt-card-vendor" style={{ width: '48%', textAlign: 'left', flex: '1', maxWidth: '48%' }}>
                                        <div className="pr-receipt-card-header">
                                            <span className="pr-receipt-section-label">RETURN TO (VENDOR)</span>
                                        </div>
                                        <div className="pr-receipt-vendor-name">{selectedReturn.vendor?.name || '—'}</div>
                                        {(selectedReturn.vendor?.address || selectedReturn.vendor?.billingAddress) && (
                                            <div className="pr-receipt-vendor-addr">{selectedReturn.vendor.address || selectedReturn.vendor.billingAddress}</div>
                                        )}
                                        {(selectedReturn.vendor?.city || selectedReturn.vendor?.state || selectedReturn.vendor?.zipCode) && (
                                            <div className="pr-receipt-vendor-addr">
                                                {[selectedReturn.vendor?.city, selectedReturn.vendor?.state, selectedReturn.vendor?.zipCode].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {(selectedReturn.vendor?.phone || selectedReturn.vendor?.mobile) && (
                                            <div className="pr-receipt-vendor-addr">{selectedReturn.vendor.phone || selectedReturn.vendor.mobile}</div>
                                        )}
                                        {selectedReturn.vendor?.email && (
                                            <div className="pr-receipt-vendor-addr">{selectedReturn.vendor.email}</div>
                                        )}
                                        {(selectedReturn.vendor?.gstin || selectedReturn.vendor?.taxNumber) && (
                                            <div className="pr-receipt-vendor-addr" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                <strong>GSTIN/TAX:</strong> {selectedReturn.vendor.gstin || selectedReturn.vendor.taxNumber}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pr-receipt-card pr-receipt-card-warehouse" style={{ width: '48%', textAlign: 'right', flex: '1', maxWidth: '48%' }}>
                                        <div className="pr-receipt-card-header">
                                            <span className="pr-receipt-section-label">RETURNED FROM (WAREHOUSE)</span>
                                        </div>
                                        <div className="pr-receipt-vendor-name">
                                            {selectedReturn.warehouse?.name || selectedReturn.items?.[0]?.warehouse?.name || '—'}
                                        </div>
                                        <div style={{ marginTop: '10px' }}>
                                            <span className="pr-receipt-section-label">RETURN TYPE</span>
                                            <div className="pr-receipt-type-pill">{selectedReturn.returnType || 'Purchase Return'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="pr-receipt-items-section">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Product / Item</th>
                                                <th>Warehouse</th>
                                                <th style={{ textAlign: 'center' }}>Qty</th>
                                                <th style={{ textAlign: 'right' }}>Rate</th>
                                                <th style={{ textAlign: 'right' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReturn.items && selectedReturn.items.length > 0 ? (
                                                selectedReturn.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{idx + 1}</td>
                                                        <td><strong>{item.product?.name || item.productName || 'Unknown Product'}</strong></td>
                                                        <td>{item.warehouse?.name || selectedReturn.warehouse?.name || '—'}</td>
                                                        <td style={{ textAlign: 'center' }}>{item.quantity || 0}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {selectedReturn.purchasebill?.currency && selectedReturn.purchasebill?.currency !== (companySettings?.currency || 'INR') ? (
                                                                (() => {
                                                                    const liveRate = getSyncRate(selectedReturn.purchasebill.currency, companySettings?.currency || 'INR') || 1;
                                                                    return (
                                                                        <>
                                                                            <div>{formatDocCurrency(item.rate || 0, selectedReturn.purchasebill.currency)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency((item.rate || 0) * liveRate)})</div>
                                                                        </>
                                                                    );
                                                                })()
                                                            ) : (
                                                                formatCurrency(item.rate || 0)
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                            {selectedReturn.purchasebill?.currency && selectedReturn.purchasebill?.currency !== (companySettings?.currency || 'INR') ? (
                                                                (() => {
                                                                    const liveRate = getSyncRate(selectedReturn.purchasebill.currency, companySettings?.currency || 'INR') || 1;
                                                                    return (
                                                                        <>
                                                                            <div>{formatDocCurrency(item.amount || 0, selectedReturn.purchasebill.currency)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((item.amount || 0) * liveRate)})</div>
                                                                        </>
                                                                    );
                                                                })()
                                                            ) : (
                                                                formatCurrency(item.amount || 0)
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>No items found</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                             <tr className="pr-total-row">
                                                 <td colSpan={5} style={{ textAlign: 'right', paddingRight: '1rem' }}>TOTAL AMOUNT</td>
                                                 <td style={{ textAlign: 'right', fontSize: '1.1rem', color: '#d97706', fontWeight: 800 }}>
                                                     {selectedReturn.purchasebill?.currency && selectedReturn.purchasebill?.currency !== (companySettings?.currency || 'INR') ? (
                                                         (() => {
                                                             const liveRate = getSyncRate(selectedReturn.purchasebill.currency, companySettings?.currency || 'INR') || 1;
                                                             return (
                                                                 <>
                                                                     <div>{formatDocCurrency(selectedReturn.totalAmount || 0, selectedReturn.purchasebill.currency)}</div>
                                                                     <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((selectedReturn.totalAmount || 0) * liveRate)})</div>
                                                                 </>
                                                             );
                                                         })()
                                                     ) : (
                                                         formatCurrency(selectedReturn.totalAmount || 0)
                                                     )}
                                                 </td>
                                             </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Custom Fields View */}
                                {(() => {
                                    let customFieldVals = {};
                                    if (selectedReturn?.customFields) {
                                        try {
                                            customFieldVals = typeof selectedReturn.customFields === 'string'
                                                ? JSON.parse(selectedReturn.customFields)
                                                : selectedReturn.customFields;
                                        } catch (e) {
                                            console.error('Error parsing purchase return custom fields for view:', e);
                                        }
                                    }
                                    const fieldsList = getCustomFieldsForType('purchasereturn');
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

                                {/* Reason for Return */}
                                {(() => {
                                     const dispReason = getDisplayReason(selectedReturn);
                                     if (dispReason === '-') return null;
                                     return (
                                         <div className="pr-reason-box" style={{ marginBottom: '8px' }}>
                                             <strong>Reason for Return: </strong>{dispReason}
                                         </div>
                                     );
                                 })()}

                                 {/* Narration */}
                                 {(() => {
                                     const dispNarration = getDisplayNarration(selectedReturn);
                                     if (dispNarration === '-') return null;
                                     return (
                                         <div className="pr-reason-box" style={{ borderLeftColor: '#64748b' }}>
                                             <strong>Narration: </strong>{dispNarration}
                                         </div>
                                     );
                                 })()}

                                {/* Notes */}
                                {(() => {
                                    let docNotes = '';
                                    if (selectedReturn.customFields) {
                                        try {
                                            const parsed = typeof selectedReturn.customFields === 'string' ? JSON.parse(selectedReturn.customFields) : selectedReturn.customFields;
                                            if (parsed.notes) docNotes = parsed.notes;
                                        } catch (e) {}
                                    }
                                    if (!docNotes) return null;
                                    return (
                                        <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'left' }}>
                                            <strong>Notes:</strong> <span style={{ whiteSpace: 'pre-line' }}>{docNotes}</span>
                                        </div>
                                    );
                                })()}

                                {/* Terms & Conditions */}
                                {(() => {
                                    let docTerms = companySettings?.termsPurchase || companySettings?.terms;
                                    if (selectedReturn.customFields) {
                                        try {
                                            const parsed = typeof selectedReturn.customFields === 'string' ? JSON.parse(selectedReturn.customFields) : selectedReturn.customFields;
                                            if (parsed.terms !== undefined) docTerms = parsed.terms;
                                        } catch (e) {}
                                    }
                                    if (!docTerms) return null;
                                    return (
                                        <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Terms & Conditions</div>
                                            <div style={{ whiteSpace: 'pre-line' }}>{docTerms}</div>
                                        </div>
                                    );
                                })()}

                                {/* Signature Row */}
                                <div className="pr-sig-row">
                                    <div className="pr-sig-box">
                                        <div className="pr-sig-line"></div>
                                        <div className="pr-sig-label">Vendor Signature</div>
                                    </div>
                                    <div className="pr-sig-box">
                                        <div className="pr-sig-line"></div>
                                        <div className="pr-sig-label">Authorized Signature</div>
                                    </div>
                                </div>

                                <div className="pr-footer">
                                    <p>This is a computer generated document. No signature is required.</p>
                                    <p>Printed on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                            {/* ===== END PRINTABLE CONTENT ===== */}
                        </div>

                        <div className="pretn-view-modal-footer pretn-no-print">
                            <button className="pretn-view-btn-close" onClick={() => setShowViewModal(false)}>Close</button>
                            <button className="pretn-view-btn-print" onClick={handlePrint}>
                                <Printer size={16} style={{ marginRight: '6px', display: 'inline' }} /> Print Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteModal && selectedReturn && (
                <div className="PR-unique-delete-overlay">
                    <div className="PR-unique-delete-modal">
                        <div className="PR-unique-delete-header">
                            <h2 className="PR-unique-delete-title">Delete Confirmation</h2>
                            <button className="PR-unique-delete-close" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="PR-unique-delete-body">
                            <p className="PR-unique-delete-message">
                                Are you sure you want to delete return <strong>{selectedReturn.returnNumber}</strong>? This action cannot be undone and will also revert any associated stock items.
                            </p>
                        </div>
                        <div className="PR-unique-delete-footer">
                            <button className="PR-unique-delete-btn PR-unique-delete-cancel" onClick={() => setShowDeleteModal(false)}>
                                No, Cancel
                            </button>
                            <button className="PR-unique-delete-btn PR-unique-delete-confirm"
                                onClick={async () => {
                                    try {
                                        const companyId = GetCompanyId();
                                        await purchaseReturnService.deleteReturn(selectedReturn.id, companyId);
                                        toast.success("Return deleted successfully");
                                        fetchReturns();
                                        setShowDeleteModal(false);
                                    } catch (e) { toast.error("Failed to delete"); }
                                }}>
                                <Trash2 size={18} /> Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseReturn;
