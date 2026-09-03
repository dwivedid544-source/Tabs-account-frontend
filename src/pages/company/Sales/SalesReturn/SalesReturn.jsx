import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Plus, Filter, Download,
    Eye, Pencil, Trash2, X, AlertCircle,
    FileText, CheckCircle2, Clock, Receipt,
    AlertTriangle, Calendar, User, MapPin, Printer,
    Package, Layers
} from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import toast from 'react-hot-toast';
import SearchableSelect from '../../../../components/SearchableSelect/SearchableSelect';
import './SalesReturn.css';
import salesReturnService from '../../../../api/salesReturnService';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import posService from '../../../../services/posService';
import customerService from '../../../../api/customerService';
import productService from '../../../../api/productService';
import warehouseService from '../../../../api/warehouseService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';

const SalesReturn = () => {
    // --- State Management ---
    const { companySettings, formatCurrency, getDocumentTitle, getSyncRate } = useContext(CompanyContext);
    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || companySettings?.currency || 'USD';
        const localeMap = {
            'INR': 'en-IN', 'AED': 'ar-AE', 'SAR': 'ar-SA', 'EUR': 'de-DE', 'GBP': 'en-GB',
            'JPY': 'ja-JP', 'CNY': 'zh-CN', 'RUB': 'ru-RU', 'BRL': 'pt-BR', 'CAD': 'en-CA',
            'AUD': 'en-AU', 'PKR': 'en-PK', 'BDT': 'en-BD'
        };
        const locale = localeMap[docCurrency] || 'en-US';
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: docCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            return `${docCurrency} ${(amount || 0).toFixed(2)}`;
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
        if (cfReason && !cfReason.toLowerCase().startsWith('sales return')) return cfReason;
        if (row.reason && !row.reason.toLowerCase().startsWith('sales return')) {
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
        if (row.reason && row.reason.toLowerCase().startsWith('sales return')) {
            return row.reason;
        }
        return '-';
    };
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
    const [returns, setReturns] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
    const [invoiceProducts, setInvoiceProducts] = useState([]); // Products from selected invoice
    const [customers, setCustomers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allWarehouses, setAllWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

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
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const retNo = (item.returnNumber || '').toLowerCase();
            const custName = (item.customer?.name || '').toLowerCase();
            const reason = (item.reason || '').toLowerCase();
            const autoVch = (item.autoVoucherNo || '').toLowerCase();

            if (!retNo.includes(q) && !custName.includes(q) && !reason.includes(q) && !autoVch.includes(q)) {
                return false;
            }
        }
        return true;
    });

    const totalReturns = filteredReturns.length;
    const totalAmount = filteredReturns.reduce((sum, r) => {
        const baseCurr = companySettings?.currency || 'INR';
        const invCurr = r.invoice?.currency;
        const isForeign = invCurr && invCurr !== baseCurr;
        if (isForeign) {
            const liveRate = getSyncRate(invCurr, baseCurr) || 1;
            return sum + (r.totalAmount || 0) * liveRate;
        }
        return sum + (r.totalAmount || 0);
    }, 0);
    const pendingReturns = filteredReturns.filter(r => r.status === 'Pending').length;

    const summaryCards = [
        { id: 1, label: 'Total Returns', value: totalReturns, icon: FileText, color: 'blue' },
        { id: 2, label: 'Total Amount', value: formatCurrency(totalAmount), icon: Receipt, color: 'green' },
        { id: 3, label: 'Pending Approval', value: pendingReturns, icon: Clock, color: 'orange' },
        { id: 4, label: 'Rejected', value: filteredReturns.filter(r => r.status === 'Rejected').length, icon: X, color: 'red' },
    ];

    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);

    // Initial Fetch
    React.useEffect(() => {
        fetchData();
        fetchDropdowns();
        fetchCompanyDetails();
    }, []);

    const [companyDetails, setCompanyDetails] = useState({
        name: 'Tab Accounts', address: '', email: 'info@tabaccounts.com', phone: ''
    });

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
                    terms: data.terms || '',
                    termsCreditNote: data.termsCreditNote || '',
                    notes: data.notes || ''
                });
                setNotes(data.notes || '');
                setTerms(data.termsCreditNote || data.terms || '');
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await salesReturnService.getAll(companyId);
            if (response.data.success) {
                setReturns(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching returns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();

            const [custRes, prodRes, whRes, invRes, posRes] = await Promise.all([
                customerService.getAll(companyId),
                productService.getAll(companyId),
                warehouseService.getAll(companyId),
                salesInvoiceService.getAll(companyId),
                posService.getPOSInvoices(companyId)
            ]);
            if (custRes.data.success) setCustomers(custRes.data.data);
            if (prodRes.data.success) setAllProducts(prodRes.data.data);
            if (whRes.data.success) setAllWarehouses(whRes.data.data);

            // Combine regular invoices + POS invoices in one list, tagged with invoiceType
            const regularInvoices = (invRes.data.success ? invRes.data.data : []).map(inv => ({
                ...inv,
                invoiceType: 'TAX_INVOICE'
            }));
            const posInvoices = (posRes.data.success ? posRes.data.data : []).map(inv => ({
                ...inv,
                invoiceType: 'POS_INVOICE'
            }));
            setInvoices([...regularInvoices, ...posInvoices]);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        manualVoucherNo: '',
        customerId: '',
        returnNo: '',
        invoiceId: '',
        date: new Date().toISOString().split('T')[0],
        returnType: 'Sales Return',
        warehouseId: '',
        reason: '',
        narration: '',
        items: []
    });

    const resetForm = () => {
        setFormData({
            manualVoucherNo: '',
            customerId: '',
            returnNo: '',
            invoiceId: '',
            date: new Date().toISOString().split('T')[0],
            returnType: 'Sales Return',
            warehouseId: '',
            reason: '',
            narration: '',
            items: []
        });
        setSelectedInvoiceDetails(null);
        setInvoiceProducts([]);
        setFilteredInvoices([]);
        setCustomFieldValues({});
        setNotes(companyDetails.notes || '');
        setTerms(companyDetails.termsCreditNote || companyDetails.terms || '');
    }

    // Filter invoices when customer is selected
    React.useEffect(() => {
        if (formData.customerId) {
            const customerInvoices = invoices.filter(inv => inv.customerId === parseInt(formData.customerId));
            setFilteredInvoices(customerInvoices);
            // Reset invoice selection when customer changes
            if (formData.invoiceId) {
                const currentInvoice = customerInvoices.find(inv => inv.id === parseInt(formData.invoiceId));
                if (!currentInvoice) {
                    setFormData(prev => ({ ...prev, invoiceId: '', items: [] }));
                    setSelectedInvoiceDetails(null);
                    setInvoiceProducts([]);
                }
            }
        } else {
            setFilteredInvoices([]);
            setFormData(prev => ({ ...prev, invoiceId: '', items: [] }));
            setSelectedInvoiceDetails(null);
            setInvoiceProducts([]);
        }
    }, [formData.customerId, invoices]);

    // Handle invoice selection - load invoice details and items
    const handleInvoiceSelect = async (invoiceId, isEditMode = false) => {
        if (!invoiceId) {
            setSelectedInvoiceDetails(null);
            setInvoiceProducts([]);
            if (!isEditMode) setFormData(prev => ({ ...prev, items: [], narration: '' }));
            return;
        }

        try {
            const companyId = GetCompanyId();
            // Determine if this is a POS invoice
            const matchedInvoice = invoices.find(inv => inv.id === parseInt(invoiceId));
            const isPosInvoice = matchedInvoice?.invoiceType === 'POS_INVOICE';

            // Fetch invoice with items (route to correct API)
            let response;
            if (isPosInvoice) {
                const posData = await posService.getPOSInvoiceById(invoiceId, companyId);
                response = { data: posData };
                // Normalize POS invoice structure
                if (response.data.success) {
                    response.data.data.invoiceitem = response.data.data.posinvoiceitem || [];
                    response.data.data.invoiceType = 'POS_INVOICE';
                }
            } else {
                response = await salesInvoiceService.getById(invoiceId, companyId);
            }
            if (response.data.success) {
                const invoice = response.data.data;
                // Normalize items from backend relation (invoiceitem) to items
                invoice.items = invoice.invoiceitem || invoice.items || [];
                setSelectedInvoiceDetails(invoice);

                // Construct auto narration text with invoice ID / number and invoice narration
                const invRefNo = invoice.invoiceNumber || (invoice.id ? `#INV${String(invoice.id).padStart(6, '0')}` : `#${invoiceId}`);
                const invNarration = invoice.narration || invoice.notes || invoice.reason || '';
                const autoNarration = invNarration
                    ? `Sales Return against Invoice ${invRefNo} - ${invNarration}`
                    : `Sales Return against Invoice ${invRefNo}`;

                // Extract products from invoice items
                if (invoice.items && invoice.items.length > 0) {
                    const productsFromInvoice = invoice.items
                        .map(invItem => {
                            // First try to use the product/service relation if available
                            if (invItem.product) {
                                return invItem.product;
                            }
                            if (invItem.service) {
                                // Services might not be in allProducts, so create a mock product object
                                return {
                                    id: invItem.service.id,
                                    name: invItem.service.name,
                                    salePrice: invItem.rate || 0,
                                    taxRate: invItem.taxRate || 0
                                };
                            }
                            // Fallback: find in allProducts by ID
                            const prodId = invItem.productId || invItem.serviceId;
                            if (prodId) {
                                return allProducts.find(p => p.id === parseInt(prodId));
                            }
                            return null;
                        })
                        .filter(p => p !== null && p !== undefined);

                    // Remove duplicates
                    const uniqueProducts = productsFromInvoice.filter((product, index, self) =>
                        index === self.findIndex(p => p.id === product.id)
                    );
                    setInvoiceProducts(uniqueProducts);
                } else {
                    setInvoiceProducts([]);
                }

                // Auto-populate return items from invoice items
                if (!isEditMode && invoice.items && invoice.items.length > 0) {
                    const returnItems = invoice.items.map((item, idx) => {
                        // Calculate amount: (qty * rate - discount) * (1 + taxRate/100)
                        const qty = parseFloat(item.quantity || 0);
                        const rate = parseFloat(item.rate || 0);
                        const discount = parseFloat(item.discount || 0);
                        const taxRate = parseFloat(item.taxRate || 0);
                        const taxableAmount = (qty * rate) - discount;
                        const taxAmount = taxableAmount * (taxRate / 100);
                        const itemAmount = taxableAmount + taxAmount;

                        // Get productId - try multiple sources and ensure it's a string
                        let finalProductId = '';
                        if (item.productId) {
                            finalProductId = String(item.productId);
                        } else if (item.product?.id) {
                            finalProductId = String(item.product.id);
                        } else if (item.serviceId) {
                            finalProductId = String(item.serviceId);
                        } else if (item.service?.id) {
                            finalProductId = String(item.service.id);
                        }

                        // Verify product exists in allProducts
                        if (finalProductId) {
                            const productExists = allProducts.some(p => String(p.id) === finalProductId);
                            if (!productExists) {
                                console.warn(`Product with ID ${finalProductId} not found in allProducts`);
                                // Try to find by matching name if ID doesn't match
                                const productName = item.product?.name || item.service?.name || item.description;
                                if (productName) {
                                    const matchedProduct = allProducts.find(p =>
                                        p.name?.toLowerCase() === productName.toLowerCase()
                                    );
                                    if (matchedProduct) {
                                        finalProductId = String(matchedProduct.id);
                                    }
                                }
                            }
                        }

                        return {
                            id: Date.now() + idx,
                            productId: finalProductId,
                            warehouseId: item.warehouseId
                                ? String(item.warehouseId)
                                : (item.warehouse?.id ? String(item.warehouse.id) : (formData.warehouseId ? String(formData.warehouseId) : '')),
                            qty: qty,
                            rate: rate,
                            tax: taxRate,
                            discount: discount,
                            amount: itemAmount,
                            description: item.description || item.product?.name || item.service?.name || ''
                        };
                    });

                    // Set warehouse from first item if not already set
                    const warehouseId = invoice.items[0]?.warehouseId || invoice.items[0]?.warehouse?.id || formData.warehouseId;

                    setFormData(prev => ({
                        ...prev,
                        invoiceId: invoiceId,
                        items: returnItems,
                        warehouseId: warehouseId || prev.warehouseId,
                        narration: autoNarration
                    }));
                } else if (!isEditMode) {
                    setFormData(prev => ({
                        ...prev,
                        invoiceId: invoiceId,
                        items: [],
                        narration: autoNarration
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            setSelectedInvoiceDetails(null);
            setInvoiceProducts([]);
        }
    }

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now(), name: '', qty: 1, amount: 0 }]
        });
    };

    const removeItem = (id) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    // Helper for status styles
    const getStatusClass = (status) => {
        switch (status) {
            case 'Processed': return 'SalesReturn-status-success';
            case 'Pending': return 'SalesReturn-status-warning';
            case 'Rejected': return 'SalesReturn-status-danger';
            case 'Draft': return 'SalesReturn-status-draft';
            default: return 'SalesReturn-status-warning'; // Default to Pending style
        }
    };

    // --- Actions Handlers ---
    const handleAdd = async () => {
        resetForm();
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'salesreturn');
                if (res.data.success) {
                    setFormData(prev => ({ ...prev, returnNo: res.data.nextNumber }));
                }
            }
        } catch (error) {
            console.error('Error fetching next salesreturn number:', error);
        }
        setShowAddModal(true);
    };

    const handleEdit = async (ret) => {
        try {
            const companyId = GetCompanyId();
            // Fetch full details by ID
            const response = await salesReturnService.getById(ret.id, companyId);
            if (response.data.success) {
                const returnData = response.data.data;
                setSelectedReturn(returnData);

                const displayReason = getDisplayReason(returnData);
                const displayNarration = getDisplayNarration(returnData);

                // Populate form data
                setFormData({
                    manualVoucherNo: returnData.manualVoucherNo || '',
                    customerId: String(returnData.customerId || ''),
                    returnNo: returnData.returnNumber || '',
                    invoiceId: returnData.invoiceId ? String(returnData.invoiceId) : '',
                    date: returnData.date ? returnData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                    returnType: 'Sales Return',
                    warehouseId: (returnData.salesreturnitem || returnData.items || []).length > 0
                        ? String((returnData.salesreturnitem || returnData.items || [])[0].warehouseId || '')
                        : '',
                    reason: displayReason === '-' ? '' : displayReason,
                    narration: displayNarration === '-' ? '' : displayNarration,
                    items: (returnData.salesreturnitem || returnData.items || []).map(item => ({
                        id: item.id || Date.now() + Math.random(),
                        productId: String(item.productId || ''),
                        warehouseId: String(item.warehouseId || ''),
                        qty: item.quantity || 0,
                        rate: item.rate || 0,
                        tax: parseFloat(item.taxRate || 0),
                        discount: parseFloat(item.discount || 0),
                        amount: item.amount || 0
                    }))
                });

                // If invoice is linked, load invoice details
                if (returnData.invoiceId) {
                    await handleInvoiceSelect(returnData.invoiceId, true);
                }

                // Filter invoices for the customer
                if (returnData.customerId) {
                    const customerInvoices = invoices.filter(inv => inv.customerId === parseInt(returnData.customerId));
                    setFilteredInvoices(customerInvoices);
                }

                let fieldValues = {};
                if (returnData.customFields) {
                    try {
                        fieldValues = typeof returnData.customFields === 'string'
                            ? JSON.parse(returnData.customFields)
                            : returnData.customFields;
                        setNotes(fieldValues.notes !== undefined ? fieldValues.notes : (companyDetails.notes || ''));
                        setTerms(fieldValues.terms !== undefined ? fieldValues.terms : (companyDetails.termsCreditNote || companyDetails.terms || ''));
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                } else {
                    setNotes(companyDetails.notes || '');
                    setTerms(companyDetails.termsCreditNote || companyDetails.terms || '');
                }
                setCustomFieldValues(fieldValues);

                setShowEditModal(true);
            } else {
                toast.error('Error fetching sales return details');
            }
        } catch (error) {
            console.error('Error fetching sales return:', error);
            toast.error('Error loading sales return for editing');
        }
    };

    const handleView = async (ret) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesReturnService.getById(ret.id, companyId);
            if (response.data.success) {
                setSelectedReturn(response.data.data);
            } else {
                setSelectedReturn(ret);
            }
        } catch (error) {
            console.error('Error fetching return details:', error);
            setSelectedReturn(ret);
        }
        setShowViewModal(true);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('sales-return-print-content');
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
            .SalesReturn-receipt-document { background: white; }
            .SalesReturn-receipt-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; margin-bottom: 1.5rem; }
            .SalesReturn-receipt-company-info { display: flex; align-items: flex-start; gap: 1rem; }
            .SalesReturn-receipt-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
            .SalesReturn-receipt-company-name { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin-bottom: 0.2rem; }
            .SalesReturn-receipt-company-address { font-size: 0.85rem; color: #64748b; margin-bottom: 0.2rem; }
            .SalesReturn-receipt-company-contact { font-size: 0.82rem; color: #64748b; }
            .SalesReturn-receipt-title-block { text-align: right; flex-shrink: 0; }
            .SalesReturn-receipt-title { font-size: 2rem; font-weight: 900; color: #ef4444; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
            .SalesReturn-receipt-meta { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem; color: #475569; }
            .SalesReturn-receipt-meta-label { font-weight: 600; color: #94a3b8; margin-right: 4px; }
            .SalesReturn-receipt-divider { border: none; border-top: 2px solid #e2e8f0; margin: 1.25rem 0; }
            .SalesReturn-receipt-address-row { display: flex; justify-content: space-between; gap: 2rem; margin-bottom: 2rem; }
            .SalesReturn-receipt-section-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem; }
            .SalesReturn-receipt-customer-name { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.2rem; }
            .SalesReturn-receipt-customer-addr { font-size: 0.85rem; color: #64748b; margin-bottom: 0.15rem; }
            .SalesReturn-receipt-items-section { margin-bottom: 2rem; }
            .SalesReturn-receipt-items-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
            .SalesReturn-receipt-items-table thead tr { background: #1e293b; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .SalesReturn-receipt-items-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
            .SalesReturn-receipt-items-table td { padding: 0.7rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .SalesReturn-receipt-items-table tbody tr:nth-child(even) { background: #f8fafc; }
            .SalesReturn-receipt-total-row td { padding: 0.85rem 1rem; background: #fef2f2; border-top: 2px solid #fca5a5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .SalesReturn-receipt-reason-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 0.75rem 1rem; border-radius: 0 6px 6px 0; font-size: 0.875rem; color: #475569; margin-bottom: 2rem; }
            .SalesReturn-receipt-signature-row { display: flex; justify-content: space-between; gap: 3rem; margin: 2.5rem 0 1.5rem; padding-top: 1rem; }
            .SalesReturn-receipt-sig-box { flex: 1; text-align: center; }
            .SalesReturn-receipt-sig-line { border-top: 2px solid #94a3b8; margin-bottom: 0.5rem; height: 40px; }
            .SalesReturn-receipt-sig-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .SalesReturn-receipt-footer { border-top: 1px dashed #e2e8f0; padding-top: 1rem; text-align: center; font-size: 0.78rem; color: #94a3b8; }
            .SalesReturn-receipt-footer p { margin: 0.2rem 0; }
            hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.25rem 0; }
            .SalesReturn-sales-return-status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-block; }
            .SalesReturn-status-success { background: #f1f5f9; color: #334155; }
            .SalesReturn-status-warning { background: #fef3c7; color: #d97706; }
            .SalesReturn-status-draft { background: #eff6ff; color: #3b82f6; }
            .SalesReturn-status-danger { background: #fee2e2; color: #dc2626; }
            .SalesReturn-status-neutral { background: #f1f5f9; color: #64748b; }
            @media print {
                body { padding: 0.5rem; }
                .SalesReturn-receipt-items-table thead tr { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .SalesReturn-receipt-total-row td { background: #fef2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <title>Sales Return - ${selectedReturn?.returnNumber || ''}</title>
                <style>${styles}</style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleDelete = (ret) => {
        setSelectedReturn(ret);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (selectedReturn) {
            try {
                const companyId = GetCompanyId();
                await salesReturnService.delete(selectedReturn.id, companyId);
                fetchData();
                setShowDeleteModal(false);
                setSelectedReturn(null);
            } catch (error) {
                console.error('Error deleting sales return:', error);
            }
        }
    };

    const handleUpdate = async () => {
        if (!selectedReturn) return;

        try {
            const companyId = GetCompanyId();
            // Calculate totals
            let totalAmount = 0;
            const returnItems = formData.items.map(item => {
                const qty = parseFloat(item.qty || 0);
                const rate = parseFloat(item.rate || 0);
                const discount = parseFloat(item.discount || 0);
                const taxRate = parseFloat(item.tax || 0);
                const taxableAmount = (qty * rate) - discount;
                const taxAmount = taxableAmount * (taxRate / 100);
                const itemAmount = taxableAmount + taxAmount;

                totalAmount += itemAmount;

                return {
                    productId: parseInt(item.productId),
                    warehouseId: parseInt(item.warehouseId || formData.warehouseId),
                    quantity: qty,
                    rate: rate,
                    taxRate: taxRate,
                    discount: discount,
                    amount: itemAmount
                };
            });

            const data = {
                returnNumber: formData.returnNo || selectedReturn.returnNumber,
                date: formData.date,
                customerId: parseInt(formData.customerId),
                invoiceId: formData.invoiceId ? parseInt(formData.invoiceId) : null,
                reason: formData.reason || '',
                narration: formData.narration || '',
                manualVoucherNo: formData.manualVoucherNo || null,
                items: returnItems,
                totalAmount: totalAmount,
                customFields: JSON.stringify({
                    ...customFieldValues,
                    notes: notes,
                    terms: terms,
                    narration: formData.narration || '',
                    reason: formData.reason || ''
                })
            };

            const response = await salesReturnService.update(selectedReturn.id, data, companyId);
            if (response.data.success) {
                fetchData();
                setShowEditModal(false);
                resetForm();
                setSelectedReturn(null);
                toast.success('Sales return updated successfully!');
            }
        } catch (error) {
            console.error('Error updating return:', error);
            toast.error('Error updating sales return: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleSave = async () => {
        try {
            // Validate required fields
            if (!formData.customerId) {
                toast.error('Please select a customer');
                return;
            }
            if (!formData.returnNo) {
                toast.error('Please enter a return number');
                return;
            }
            if (formData.items.length === 0) {
                toast.error('Please add at least one item to return');
                return;
            }

            // Determine if the selected invoice is a POS invoice
            const matchedInvoice = formData.invoiceId
                ? invoices.find(inv => inv.id === parseInt(formData.invoiceId))
                : null;
            const selectedInvoiceType = matchedInvoice?.invoiceType || 'TAX_INVOICE';

            // Calculate total amount
            let totalAmount = 0;
            const returnItems = formData.items.map(item => {
                const qty = parseFloat(item.qty || 0);
                const rate = parseFloat(item.rate || 0);
                const taxRate = parseFloat(item.tax || 0);
                const discount = parseFloat(item.discount || 0);

                const taxableAmount = Math.max(0, (qty * rate) - discount);
                const taxAmount = taxableAmount * (taxRate / 100);
                const itemAmount = taxableAmount + taxAmount;

                totalAmount += itemAmount;

                return {
                    productId: parseInt(item.productId),
                    warehouseId: parseInt(item.warehouseId || formData.warehouseId),
                    quantity: qty,
                    rate: rate,
                    taxRate: taxRate,
                    discount: discount,
                    amount: itemAmount
                };
            });

            const data = {
                returnNumber: formData.returnNo || `RET-${Date.now()}`,
                date: formData.date,
                customerId: parseInt(formData.customerId),
                invoiceId: formData.invoiceId ? parseInt(formData.invoiceId) : null,
                invoiceType: selectedInvoiceType,
                reason: formData.reason || '',
                narration: formData.narration || '',
                manualVoucherNo: formData.manualVoucherNo || null,
                items: returnItems,
                totalAmount: totalAmount,
                customFields: JSON.stringify({
                    ...customFieldValues,
                    notes: notes,
                    terms: terms,
                    narration: formData.narration || '',
                    reason: formData.reason || ''
                })
            };

            const response = await salesReturnService.create(data);
            if (response.data.success) {
                fetchData();
                setShowAddModal(false);
                resetForm();
                toast.success('Sales return created successfully!');
            }
        } catch (error) {
            console.error('Error saving return:', error);
            toast.error('Error creating sales return: ' + (error.response?.data?.message || error.message));
        }
    };

    // Deep Link Effect
    useEffect(() => {
        if (location.state && location.state.targetReturnId) {
            const retObj = { id: location.state.targetReturnId };
            if (location.state.isEdit || location.state.autoEdit) {
                handleEdit(retObj);
            } else {
                handleView(retObj);
            }
            // Clear location state after handling to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, fetchData, navigate]);

    return (
        <div className="SalesReturn-sales-return-page">
            {/* Page Header */}
            <div className="SalesReturn-page-header">
                <div>
                    <h1 className="SalesReturn-page-title">Sales Return</h1>
                    <p className="SalesReturn-page-subtitle">Manage customer returns and credits</p>
                </div>
                <div className="SalesReturn-header-actions">
                    {hasPermission('create sales return') && (
                        <button className="SalesReturn-btn-add" onClick={handleAdd}>
                            <Plus size={18} className="mr-2" /> CREATE RETURN
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="SalesReturn-summary-grid">
                {summaryCards.map((card) => (
                    <div key={card.id} className={`summary-card card-${card.color}`}>
                        <div className="SalesReturn-card-content">
                            <span className="SalesReturn-card-label">{card.label}</span>
                            <h3 className="SalesReturn-card-value">{card.value}</h3>
                        </div>
                        <div className={`card-icon icon-${card.color}`}>
                            <card.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="SalesReturn-table-card">
                {/* Table Controls (Search/Filter) */}
                <div className="SalesReturn-table-controls" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="SalesReturn-search-wrapper" style={{ flex: '1 1 200px' }}>
                        <Search size={18} className="SalesReturn-search-icon" />
                        <input
                            type="text"
                            placeholder="Search returns..."
                            className="SalesReturn-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</label>
                            <input
                                type="date"
                                className="SalesReturn-search-input"
                                style={{ padding: '0.375rem 0.75rem', width: 'auto' }}
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</label>
                            <input
                                type="date"
                                className="SalesReturn-search-input"
                                style={{ padding: '0.375rem 0.75rem', width: 'auto' }}
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                            />
                        </div>
                        {(filterFromDate || filterToDate || searchQuery) && (
                            <button
                                onClick={() => { setFilterFromDate(''); setFilterToDate(''); setSearchQuery(''); }}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                <div className="SalesReturn-table-container">
                    <table className="SalesReturn-sales-return-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Return No</th>
                                {/* <th>Manual Voucher No</th> */}
                                <th>Auto Voucher No</th>
                                <th>Invoice No / Status</th>
                                <th>Customer</th>
                                <th>Warehouse</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Amount (₹)</th>
                                <th>Return Type</th>
                                <th>Reason</th>
                                <th>Narration</th>
                                <th className="SalesReturn-text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReturns.map((row, index) => {
                                // Get warehouse name from first item
                                const returnItems = row.salesreturnitem || row.items || [];
                                const warehouseName = (returnItems.length > 0)
                                    ? (returnItems[0]?.warehouse?.name || '-')
                                    : '-';

                                // Get invoice number - format as #INV000001
                                const invoiceNumber = row.invoice?.invoiceNumber
                                    ? (row.invoice.invoiceNumber.startsWith('#') ? row.invoice.invoiceNumber : `#${row.invoice.invoiceNumber}`)
                                    : (row.invoiceId ? `#INV${String(row.invoiceId).padStart(6, '0')}` : null);
                                const displayStatus = row.status || 'Pending';

                                return (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>
                                        <td><span className="SalesReturn-fw-600 SalesReturn-text-primary">{row.returnNumber}</span></td>
                                        {/* <td>{row.manualVoucherNo || '-'}</td> */}
                                        {/* <td>{row.manualVoucherNo || '-'}</td> */}
                                        <td>{row.autoVoucherNo || row.returnNumber || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {invoiceNumber && (
                                                    <span className="SalesReturn-invoice-number-badge">
                                                        #{invoiceNumber}
                                                    </span>
                                                )}
                                                <span className={`SalesReturn-sales-return-status-badge ${getStatusClass(displayStatus)}`}>
                                                    {displayStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="SalesReturn-fw-600">{row.customer?.name || '-'}</td>
                                        <td>{warehouseName}</td>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td className="SalesReturn-text-center">{(row.salesreturnitem || row.items || []).length}</td>
                                        <td className="SalesReturn-fw-700">
                                            {(() => {
                                                const invCurr = row.invoice?.currency;
                                                const baseCurr = companySettings?.currency || 'INR';
                                                const isForeign = invCurr && invCurr !== baseCurr;
                                                if (isForeign) {
                                                    // totalAmount is stored in document currency (e.g. EUR)
                                                    // multiply by live rate to get base currency (INR)
                                                    const liveRate = getSyncRate(invCurr, baseCurr) || 1;
                                                    const baseAmt = (row.totalAmount || 0) * liveRate;
                                                    return (
                                                        <>
                                                            <div>{formatDocCurrency(row.totalAmount || 0, invCurr)}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency(baseAmt)})</div>
                                                        </>
                                                    );
                                                }
                                                return formatCurrency(row.totalAmount || 0);
                                            })()}
                                        </td>
                                        <td>Sales Return</td>
                                        <td><span className="SalesReturn-reason-text" title={getDisplayReason(row)}>{getDisplayReason(row)}</span></td>
                                        <td><span className="SalesReturn-narration-text" title={getDisplayNarration(row)}>{getDisplayNarration(row)}</span></td>
                                        <td className="SalesReturn-text-right">
                                            <div className="SalesReturn-action-buttons">
                                                <button className="SalesReturn-sales-return-action-btn SalesReturn-view" title="View" onClick={() => handleView(row)}><Eye size={16} /></button>
                                                {hasPermission('edit sales return') && (
                                                    <button className="SalesReturn-sales-return-action-btn SalesReturn-edit" title="Edit" onClick={() => handleEdit(row)}><Pencil size={16} /></button>
                                                )}
                                                {hasPermission('delete sales return') && (
                                                    <button className="SalesReturn-sales-return-action-btn SalesReturn-delete" title="Delete" onClick={() => handleDelete(row)}><Trash2 size={16} /></button>
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

            {/* CREATE RETURN MODAL */}
            {showAddModal && (
                <div className="SalesReturn-modal-overlay">
                    <div className="SalesReturn-modal-content SalesReturn-return-modal">
                        <div className="SalesReturn-modal-header">
                            <h2>Add New Sales Return</h2>
                            <button className="SalesReturn-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="SalesReturn-modal-body">
                            <div className="SalesReturn-form-container">
                                <div className="SalesReturn-two-col-grid SalesReturn-mb-6">
                                    {/* Left Column */}
                                    <div className="SalesReturn-col">
                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Reference ID (Auto)</label>
                                            <input type="text" disabled placeholder="Assigned after save" className="SalesReturn-form-input SalesReturn-disabled-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Manual Voucher No</label>
                                            <input type="text" placeholder="Optional"
                                                value={formData.manualVoucherNo}
                                                onChange={(e) => setFormData({ ...formData, manualVoucherNo: e.target.value })}
                                                className="SalesReturn-form-input"
                                            />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Return No <span className="SalesReturn-text-red">*</span></label>
                                            <input type="text"
                                                value={formData.returnNo}
                                                onChange={(e) => setFormData({ ...formData, returnNo: e.target.value })}
                                                className="SalesReturn-form-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Return Type</label>
                                            <select className="SalesReturn-form-select" value={formData.returnType} onChange={(e) => setFormData({ ...formData, returnType: e.target.value })}>
                                                <option>Sales Return</option>
                                                <option>Damaged Goods</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="SalesReturn-col">
                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Customer <span className="SalesReturn-text-red">*</span></label>
                                            <select className="SalesReturn-form-select"
                                                value={formData.customerId}
                                                onChange={(e) => {
                                                    const customerId = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        customerId: customerId,
                                                        invoiceId: '', // Reset invoice when customer changes
                                                        items: [] // Reset items when customer changes
                                                    });
                                                    setSelectedInvoiceDetails(null);
                                                }}>
                                                <option value="">Select Customer...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Invoice No <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span></label>
                                            <select
                                                className="SalesReturn-form-select"
                                                value={formData.invoiceId}
                                                onChange={(e) => handleInvoiceSelect(e.target.value)}
                                                disabled={!formData.customerId}>
                                                <option value="">
                                                    {formData.customerId ? 'Without Invoice (None)' : 'Select Customer First'}
                                                </option>
                                                {filteredInvoices.map(inv => (
                                                    <option key={`${inv.invoiceType}-${inv.id}`} value={inv.id}>
                                                        [{inv.invoiceType === 'POS_INVOICE' ? 'POS' : 'INV'}] {inv.invoiceNumber} {inv.date ? `(${new Date(inv.date).toLocaleDateString()})` : ''}
                                                        {(() => {
                                                            if (!inv.totalAmount) return '';
                                                            const baseCurr = companySettings?.currency || 'INR';
                                                            const invCurr = inv.currency;
                                                            const isForeign = invCurr && invCurr !== baseCurr;
                                                            if (isForeign) {
                                                                const docAmt = inv.totalAmount;
                                                                const rate = getSyncRate(invCurr, baseCurr) || parseFloat(inv.exchangeRate || 1.0);
                                                                const baseAmt = docAmt * rate;
                                                                return ` - ${formatDocCurrency(docAmt, invCurr)} (${formatCurrency(baseAmt)})`;
                                                            }
                                                            return ` - ${formatCurrency(inv.totalAmount)}`;
                                                        })()}
                                                    </option>
                                                ))}
                                            </select>

                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Date <span className="SalesReturn-text-red">*</span></label>
                                            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="SalesReturn-form-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Warehouse <span className="SalesReturn-text-red">*</span></label>
                                            <select className="SalesReturn-form-select"
                                                value={formData.warehouseId}
                                                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}>
                                                <option value="">Select Warehouse...</option>
                                                {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Returned Items Section */}
                                <div className="SalesReturn-items-card SalesReturn-mb-6">
                                    <div className="SalesReturn-items-header-bar">
                                        <div className="SalesReturn-items-header-left">
                                            <div className="SalesReturn-items-header-icon">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <h4 className="SalesReturn-items-title">Returned Items</h4>
                                                {selectedInvoiceDetails ? (
                                                    <div className="SalesReturn-invoice-meta-badges">
                                                        <span className="SalesReturn-badge SalesReturn-badge-invoice">
                                                            <Receipt size={13} />
                                                            Invoice: <strong>{selectedInvoiceDetails.invoiceNumber}</strong>
                                                        </span>
                                                        <span className="SalesReturn-badge SalesReturn-badge-count">
                                                            <Layers size={13} />
                                                            Items in Inv: <strong>{selectedInvoiceDetails.items?.length || 0}</strong>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="SalesReturn-items-subtitle">Add products and quantities to return</span>
                                                )}
                                            </div>
                                        </div>
                                        <button type="button" className="SalesReturn-btn-add-item-primary" onClick={addItem}>
                                            <Plus size={16} />
                                            <span>Add Item</span>
                                        </button>
                                    </div>

                                    {formData.items.length > 0 ? (
                                        <div className="SalesReturn-items-table-wrapper">
                                            <div className="SalesReturn-items-table-header">
                                                <div className="SalesReturn-item-col-name">Product</div>
                                                <div className="SalesReturn-item-col-wh">Warehouse</div>
                                                <div className="SalesReturn-item-col-qty SalesReturn-text-center">Qty</div>
                                                <div className="SalesReturn-item-col-rate SalesReturn-text-right">Rate</div>
                                                <div className="SalesReturn-item-col-tax SalesReturn-text-center">Tax %</div>
                                                <div className="SalesReturn-item-col-amount SalesReturn-text-right">Amount</div>
                                                <div className="SalesReturn-item-col-action SalesReturn-text-center">Action</div>
                                            </div>
                                            <div className="SalesReturn-items-table-body">
                                                {formData.items.map((item, idx) => {
                                                    const productIdNum = item.productId ? parseInt(item.productId) : null;
                                                    const product = productIdNum ? allProducts.find(p => p.id === productIdNum) : null;
                                                    const warehouse = allWarehouses.find(w => w.id === parseInt(item.warehouseId));
                                                    const calculatedAmount = (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)) * (1 + parseFloat(item.tax || 0) / 100) - parseFloat(item.discount || 0);

                                                    const availableProducts = invoiceProducts.length > 0 ? invoiceProducts : allProducts;

                                                    return (
                                                        <div key={item.id} className="SalesReturn-item-row">
                                                            <div className="SalesReturn-item-col-name">
                                                                <SearchableSelect
                                                                    options={availableProducts.map(p => {
                                                                        const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                                        const isForeign = invCurr !== (companySettings?.currency || 'INR');
                                                                        const rate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                                        const priceStr = p.salePrice ? (
                                                                            isForeign
                                                                                ? `(${formatDocCurrency(p.salePrice / rate, invCurr)} / ${formatCurrency(p.salePrice)})`
                                                                                : `(${formatCurrency(p.salePrice)})`
                                                                        ) : '';
                                                                        return {
                                                                            ...p,
                                                                            id: String(p.id),
                                                                            name: `${p.name} ${priceStr}`
                                                                        };
                                                                    })}
                                                                    value={String(item.productId) || ''}
                                                                    onChange={(val) => {
                                                                        const pId = val;
                                                                        const p = allProducts.find(x => x.id === parseInt(pId));
                                                                        const newItems = [...formData.items];
                                                                        newItems[idx] = {
                                                                            ...newItems[idx],
                                                                            productId: pId,
                                                                            rate: p?.salePrice || item.rate || 0,
                                                                            tax: p?.taxRate || item.tax || 0
                                                                        };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                    placeholder="Select Product..."
                                                                    searchPlaceholder="Search product..."
                                                                    labelKey="name"
                                                                    valueKey="id"
                                                                    groupKey=""
                                                                    clearable={false}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-wh">
                                                                <SearchableSelect
                                                                    options={allWarehouses.map(w => {
                                                                        const stockItem = product?.stock?.find(s => Number(s.warehouseId) === Number(w.id));
                                                                        const count = stockItem ? stockItem.quantity : 0;
                                                                        return {
                                                                            id: String(w.id),
                                                                            name: `${w.name} (${count})`
                                                                        };
                                                                    })}
                                                                    value={String(item.warehouseId || '')}
                                                                    onChange={(val) => {
                                                                        const newItems = [...formData.items];
                                                                        newItems[idx] = { ...newItems[idx], warehouseId: val };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                    placeholder="Select Warehouse..."
                                                                    searchPlaceholder="Search warehouse..."
                                                                    labelKey="name"
                                                                    valueKey="id"
                                                                    groupKey=""
                                                                    clearable={false}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-qty">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Qty"
                                                                    value={item.qty}
                                                                    className="SalesReturn-form-input SalesReturn-input-center"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const qty = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], qty: qty };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-rate">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Rate"
                                                                    value={item.rate}
                                                                    className="SalesReturn-form-input SalesReturn-input-right"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const rate = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], rate: rate };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-tax">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Tax %"
                                                                    value={item.tax}
                                                                    className="SalesReturn-form-input SalesReturn-input-center"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const tax = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], tax: tax };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-amount SalesReturn-text-right">
                                                                {(() => {
                                                                    const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                                    const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                                    const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                                    return isInvForeign ? (
                                                                        <>
                                                                            <div className="SalesReturn-amount-main">{formatDocCurrency(calculatedAmount, invCurr)}</div>
                                                                            <div className="SalesReturn-amount-sub">({formatCurrency(calculatedAmount * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="SalesReturn-amount-main">{formatCurrency(calculatedAmount)}</div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="SalesReturn-item-col-action SalesReturn-text-center">
                                                                <button type="button" className="SalesReturn-btn-remove-item" onClick={() => removeItem(item.id)} title="Remove Item">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="SalesReturn-items-summary-bar">
                                                <div className="SalesReturn-items-summary-left">
                                                    <span>Total Items: <strong>{formData.items.length}</strong></span>
                                                    <span className="SalesReturn-summary-dot">•</span>
                                                    <span>Total Returned Qty: <strong>{formData.items.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0)}</strong></span>
                                                </div>
                                                <div className="SalesReturn-items-summary-right">
                                                    <span className="SalesReturn-summary-label">Net Return Value:</span>
                                                    <span className="SalesReturn-summary-value">
                                                        {(() => {
                                                            const totalVal = formData.items.reduce((acc, curr) => {
                                                                return acc + ((parseFloat(curr.qty || 0) * parseFloat(curr.rate || 0)) * (1 + parseFloat(curr.tax || 0) / 100) - parseFloat(curr.discount || 0));
                                                            }, 0);
                                                            const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                            const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                            const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                            return isInvForeign
                                                                ? `${formatDocCurrency(totalVal, invCurr)} (${formatCurrency(totalVal * invRate)})`
                                                                : formatCurrency(totalVal);
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="SalesReturn-items-empty-state">
                                            <div className="SalesReturn-empty-icon">
                                                <Package size={32} />
                                            </div>
                                            <h5>No Returned Items Added</h5>
                                            <p>
                                                {selectedInvoiceDetails
                                                    ? 'No items found in the selected invoice. Click below to add a returned item.'
                                                    : 'Click the button below to start adding returned items.'}
                                            </p>
                                            <button type="button" className="SalesReturn-btn-add-item-empty" onClick={addItem}>
                                                <Plus size={16} />
                                                <span>Add Returned Item</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Fields Section */}
                                {getCustomFieldsForType('salesreturn').length > 0 && (
                                    <div className="SalesReturn-form-group SalesReturn-mb-4" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                            Custom Fields
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                            {getCustomFieldsForType('salesreturn').map(field => (
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

                                {/* Reason & Narration */}
                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Reason for Return</label>
                                    <input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="SalesReturn-form-input" />
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Narration</label>
                                    <textarea className="SalesReturn-form-textarea" rows="3" value={formData.narration} onChange={(e) => setFormData({ ...formData, narration: e.target.value })}></textarea>
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Notes</label>
                                    <textarea className="SalesReturn-form-textarea" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Credit note notes..."></textarea>
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Terms & Conditions</label>
                                    <textarea className="SalesReturn-form-textarea" rows="2" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Credit note terms..."></textarea>
                                </div>
                            </div>

                        </div>

                        <div className="SalesReturn-modal-footer">
                            <button className="SalesReturn-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="SalesReturn-btn-submit-green" onClick={handleSave}>Add Return</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT RETURN MODAL */}
            {showEditModal && selectedReturn && (
                <div className="SalesReturn-modal-overlay">
                    <div className="SalesReturn-modal-content SalesReturn-return-modal">
                        <div className="SalesReturn-modal-header">
                            <h2>Edit Sales Return</h2>
                            <button className="SalesReturn-close-btn" onClick={() => {
                                setShowEditModal(false);
                                resetForm();
                                setSelectedReturn(null);
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="SalesReturn-modal-body">
                            <div className="SalesReturn-form-container">
                                <div className="SalesReturn-two-col-grid SalesReturn-mb-6">
                                    {/* Left Column */}
                                    <div className="SalesReturn-col">
                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Reference ID (Auto)</label>
                                            <input type="text" disabled value={selectedReturn.returnNumber || ''} className="SalesReturn-form-input SalesReturn-disabled-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Manual Voucher No</label>
                                            <input type="text" placeholder="Optional"
                                                value={formData.manualVoucherNo}
                                                onChange={(e) => setFormData({ ...formData, manualVoucherNo: e.target.value })}
                                                className="SalesReturn-form-input"
                                            />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Return No <span className="SalesReturn-text-red">*</span></label>
                                            <input type="text"
                                                value={formData.returnNo}
                                                onChange={(e) => setFormData({ ...formData, returnNo: e.target.value })}
                                                className="SalesReturn-form-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Return Type</label>
                                            <select className="SalesReturn-form-select" value={formData.returnType} onChange={(e) => setFormData({ ...formData, returnType: e.target.value })}>
                                                <option>Sales Return</option>
                                                <option>Damaged Goods</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="SalesReturn-col">
                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Customer <span className="SalesReturn-text-red">*</span></label>
                                            <select className="SalesReturn-form-select"
                                                value={formData.customerId}
                                                onChange={(e) => {
                                                    const customerId = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        customerId: customerId,
                                                        invoiceId: '', // Reset invoice when customer changes
                                                        items: [] // Reset items when customer changes
                                                    });
                                                    setSelectedInvoiceDetails(null);
                                                }}>
                                                <option value="">Select Customer...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Invoice No <span className="SalesReturn-text-red">*</span></label>
                                            <select
                                                className="SalesReturn-form-select"
                                                value={formData.invoiceId}
                                                onChange={(e) => handleInvoiceSelect(e.target.value)}
                                                disabled={!formData.customerId}>
                                                <option value="">
                                                    {formData.customerId ? 'Select Invoice...' : 'Select Customer First'}
                                                </option>
                                                {filteredInvoices.map(inv => (
                                                    <option key={inv.id} value={inv.id}>
                                                        {inv.invoiceNumber} {inv.date ? `(${new Date(inv.date).toLocaleDateString()})` : ''}
                                                        {(() => {
                                                            if (!inv.totalAmount) return '';
                                                            const baseCurr = companySettings?.currency || 'INR';
                                                            const invCurr = inv.currency;
                                                            const isForeign = invCurr && invCurr !== baseCurr;
                                                            if (isForeign) {
                                                                const docAmt = inv.totalAmount;
                                                                const rate = getSyncRate(invCurr, baseCurr) || parseFloat(inv.exchangeRate || 1.0);
                                                                const baseAmt = docAmt * rate;
                                                                return ` - ${formatDocCurrency(docAmt, invCurr)} (${formatCurrency(baseAmt)})`;
                                                            }
                                                            return ` - ${formatCurrency(inv.totalAmount)}`;
                                                        })()}
                                                    </option>
                                                ))}
                                            </select>
                                            {formData.customerId && filteredInvoices.length === 0 && (
                                                <p className="SalesReturn-text-xs SalesReturn-text-gray-500 SalesReturn-mt-1">No invoices found for this customer</p>
                                            )}
                                            {selectedInvoiceDetails && (
                                                <div className="SalesReturn-invoice-linked-indicator SalesReturn-mt-2">
                                                    <span className="SalesReturn-text-xs text-blue-600 SalesReturn-font-semibold">
                                                        ✓ Invoice {selectedInvoiceDetails.invoiceNumber} loaded - {selectedInvoiceDetails.items?.length || 0} items
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Date <span className="SalesReturn-text-red">*</span></label>
                                            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="SalesReturn-form-input" />
                                        </div>

                                        <div className="SalesReturn-form-group SalesReturn-mb-4">
                                            <label>Warehouse <span className="SalesReturn-text-red">*</span></label>
                                            <select className="SalesReturn-form-select"
                                                value={formData.warehouseId}
                                                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}>
                                                <option value="">Select Warehouse...</option>
                                                {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Returned Items Section - Same as Add Modal */}
                                <div className="SalesReturn-items-card SalesReturn-mb-6">
                                    <div className="SalesReturn-items-header-bar">
                                        <div className="SalesReturn-items-header-left">
                                            <div className="SalesReturn-items-header-icon">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <h4 className="SalesReturn-items-title">Returned Items</h4>
                                                {selectedInvoiceDetails ? (
                                                    <div className="SalesReturn-invoice-meta-badges">
                                                        <span className="SalesReturn-badge SalesReturn-badge-invoice">
                                                            <Receipt size={13} />
                                                            Invoice: <strong>{selectedInvoiceDetails.invoiceNumber}</strong>
                                                        </span>
                                                        <span className="SalesReturn-badge SalesReturn-badge-count">
                                                            <Layers size={13} />
                                                            Items in Inv: <strong>{selectedInvoiceDetails.items?.length || 0}</strong>
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="SalesReturn-items-subtitle">Add products and quantities to return</span>
                                                )}
                                            </div>
                                        </div>
                                        <button type="button" className="SalesReturn-btn-add-item-primary" onClick={addItem}>
                                            <Plus size={16} />
                                            <span>Add Item</span>
                                        </button>
                                    </div>

                                    {formData.items.length > 0 ? (
                                        <div className="SalesReturn-items-table-wrapper">
                                            <div className="SalesReturn-items-table-header">
                                                <div className="SalesReturn-item-col-name">Product</div>
                                                <div className="SalesReturn-item-col-wh">Warehouse</div>
                                                <div className="SalesReturn-item-col-qty SalesReturn-text-center">Qty</div>
                                                <div className="SalesReturn-item-col-rate SalesReturn-text-right">Rate</div>
                                                <div className="SalesReturn-item-col-tax SalesReturn-text-center">Tax %</div>
                                                <div className="SalesReturn-item-col-amount SalesReturn-text-right">Amount</div>
                                                <div className="SalesReturn-item-col-action SalesReturn-text-center">Action</div>
                                            </div>
                                            <div className="SalesReturn-items-table-body">
                                                {formData.items.map((item, idx) => {
                                                    const productIdNum = item.productId ? parseInt(item.productId) : null;
                                                    const product = productIdNum ? allProducts.find(p => p.id === productIdNum) : null;
                                                    const warehouse = allWarehouses.find(w => w.id === parseInt(item.warehouseId));
                                                    const calculatedAmount = (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)) * (1 + parseFloat(item.tax || 0) / 100) - parseFloat(item.discount || 0);

                                                    const availableProducts = invoiceProducts.length > 0 ? invoiceProducts : allProducts;

                                                    return (
                                                        <div key={item.id} className="SalesReturn-item-row">
                                                            <div className="SalesReturn-item-col-name">
                                                                <SearchableSelect
                                                                    options={availableProducts.map(p => {
                                                                        const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                                        const isForeign = invCurr !== (companySettings?.currency || 'INR');
                                                                        const rate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                                        const priceStr = p.salePrice ? (
                                                                            isForeign
                                                                                ? `(${formatDocCurrency(p.salePrice / rate, invCurr)} / ${formatCurrency(p.salePrice)})`
                                                                                : `(${formatCurrency(p.salePrice)})`
                                                                        ) : '';
                                                                        return {
                                                                            ...p,
                                                                            id: String(p.id),
                                                                            name: `${p.name} ${priceStr}`
                                                                        };
                                                                    })}
                                                                    value={String(item.productId) || ''}
                                                                    onChange={(val) => {
                                                                        const pId = val;
                                                                        const p = allProducts.find(x => x.id === parseInt(pId));
                                                                        const newItems = [...formData.items];
                                                                        newItems[idx] = {
                                                                            ...newItems[idx],
                                                                            productId: pId,
                                                                            rate: p?.salePrice || item.rate || 0,
                                                                            tax: p?.taxRate || item.tax || 0
                                                                        };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                    placeholder="Select Product..."
                                                                    searchPlaceholder="Search product..."
                                                                    labelKey="name"
                                                                    valueKey="id"
                                                                    groupKey=""
                                                                    clearable={false}
                                                                />
                                                                {product && (
                                                                    <div className="SalesReturn-product-subinfo">
                                                                        <span className="SalesReturn-product-sku">ID: #{product.id}</span>
                                                                        {product.totalQuantity !== undefined && (
                                                                            <span className="SalesReturn-product-stock">• Stock: {product.totalQuantity}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="SalesReturn-item-col-wh">
                                                                <SearchableSelect
                                                                    options={allWarehouses.map(w => {
                                                                        const stockItem = product?.stock?.find(s => Number(s.warehouseId) === Number(w.id));
                                                                        const count = stockItem ? stockItem.quantity : 0;
                                                                        return {
                                                                            id: String(w.id),
                                                                            name: `${w.name} (${count})`
                                                                        };
                                                                    })}
                                                                    value={String(item.warehouseId || '')}
                                                                    onChange={(val) => {
                                                                        const newItems = [...formData.items];
                                                                        newItems[idx] = { ...newItems[idx], warehouseId: val };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                    placeholder="Select Warehouse..."
                                                                    searchPlaceholder="Search warehouse..."
                                                                    labelKey="name"
                                                                    valueKey="id"
                                                                    groupKey=""
                                                                    clearable={false}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-qty">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Qty"
                                                                    value={item.qty}
                                                                    className="SalesReturn-form-input SalesReturn-input-center"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const qty = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], qty: qty };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-rate">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Rate"
                                                                    value={item.rate}
                                                                    className="SalesReturn-form-input SalesReturn-input-right"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const rate = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], rate: rate };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-tax">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Tax %"
                                                                    value={item.tax}
                                                                    className="SalesReturn-form-input SalesReturn-input-center"
                                                                    min="0"
                                                                    step="0.01"
                                                                    onChange={(e) => {
                                                                        const newItems = [...formData.items];
                                                                        const tax = parseFloat(e.target.value) || 0;
                                                                        newItems[idx] = { ...newItems[idx], tax: tax };
                                                                        setFormData({ ...formData, items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="SalesReturn-item-col-amount SalesReturn-text-right">
                                                                {(() => {
                                                                    const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                                    const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                                    const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                                    return isInvForeign ? (
                                                                        <>
                                                                            <div className="SalesReturn-amount-main">{formatDocCurrency(calculatedAmount, invCurr)}</div>
                                                                            <div className="SalesReturn-amount-sub">({formatCurrency(calculatedAmount * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="SalesReturn-amount-main">{formatCurrency(calculatedAmount)}</div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="SalesReturn-item-col-action SalesReturn-text-center">
                                                                <button type="button" className="SalesReturn-btn-remove-item" onClick={() => removeItem(item.id)} title="Remove Item">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="SalesReturn-items-summary-bar">
                                                <div className="SalesReturn-items-summary-left">
                                                    <span>Total Items: <strong>{formData.items.length}</strong></span>
                                                    <span className="SalesReturn-summary-dot">•</span>
                                                    <span>Total Returned Qty: <strong>{formData.items.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0)}</strong></span>
                                                </div>
                                                <div className="SalesReturn-items-summary-right">
                                                    <span className="SalesReturn-summary-label">Net Return Value:</span>
                                                    <span className="SalesReturn-summary-value">
                                                        {(() => {
                                                            const totalVal = formData.items.reduce((acc, curr) => {
                                                                return acc + ((parseFloat(curr.qty || 0) * parseFloat(curr.rate || 0)) * (1 + parseFloat(curr.tax || 0) / 100) - parseFloat(curr.discount || 0));
                                                            }, 0);
                                                            const invCurr = selectedInvoiceDetails?.currency || companySettings?.currency || 'INR';
                                                            const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                            const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                            return isInvForeign
                                                                ? `${formatDocCurrency(totalVal, invCurr)} (${formatCurrency(totalVal * invRate)})`
                                                                : formatCurrency(totalVal);
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="SalesReturn-items-empty-state">
                                            <div className="SalesReturn-empty-icon">
                                                <Package size={32} />
                                            </div>
                                            <h5>No Returned Items Added</h5>
                                            <p>
                                                {selectedInvoiceDetails
                                                    ? 'No items found in the selected invoice. Click below to add a returned item.'
                                                    : 'Click the button below to start adding returned items.'}
                                            </p>
                                            <button type="button" className="SalesReturn-btn-add-item-empty" onClick={addItem}>
                                                <Plus size={16} />
                                                <span>Add Returned Item</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Fields Section */}
                                {getCustomFieldsForType('salesreturn').length > 0 && (
                                    <div className="SalesReturn-form-group SalesReturn-mb-4" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                            Custom Fields
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                            {getCustomFieldsForType('salesreturn').map(field => (
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

                                {/* Reason & Narration */}
                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Reason for Return</label>
                                    <input type="text" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="SalesReturn-form-input" />
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Narration</label>
                                    <textarea className="SalesReturn-form-textarea" rows="3" value={formData.narration} onChange={(e) => setFormData({ ...formData, narration: e.target.value })}></textarea>
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Notes</label>
                                    <textarea className="SalesReturn-form-textarea" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Credit note notes..."></textarea>
                                </div>

                                <div className="SalesReturn-form-group SalesReturn-mb-4">
                                    <label>Terms & Conditions</label>
                                    <textarea className="SalesReturn-form-textarea" rows="2" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Credit note terms..."></textarea>
                                </div>
                            </div>

                        </div>

                        <div className="SalesReturn-modal-footer">
                            <button className="SalesReturn-btn-cancel" onClick={() => {
                                setShowEditModal(false);
                                resetForm();
                                setSelectedReturn(null);
                            }}>Cancel</button>
                            <button className="SalesReturn-btn-submit-green" onClick={handleUpdate}>Update Return</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && (
                <div className="SalesReturn-modal-overlay SalesReturn-delete-overlay">
                    <div className="SalesReturn-confirmation-modal">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#ef4444' }}>
                            <AlertTriangle size={48} />
                        </div>
                        <h3>Delete Return?</h3>
                        <p>Are you sure you want to delete this return? This action cannot be undone.</p>
                        <div className="SalesReturn-confirmation-actions">
                            <button className="SalesReturn-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="SalesReturn-btn-delete-confirm" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW MODAL - Professional Receipt */}
            {showViewModal && selectedReturn && (
                <div className="SalesReturn-modal-overlay">
                    <div className="SalesReturn-modal-content SalesReturn-return-modal">
                        <div className="SalesReturn-modal-header SalesReturn-no-print">
                            <h2>Sales Return — <span style={{ color: '#3b82f6' }}>#{selectedReturn.returnNumber}</span></h2>
                            <button className="SalesReturn-close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="SalesReturn-modal-body" style={{ padding: '1rem 1.25rem', background: '#f8fafc' }}>
                            <div id="sales-return-print-content" className="SalesReturn-receipt-document">

                                {/* Company Header */}
                                <div className="SalesReturn-receipt-header">
                                    <div className="SalesReturn-receipt-company-info">
                                        {companyDetails.logo && (
                                            <img src={companyDetails.logo} alt="Company Logo" className="SalesReturn-receipt-logo" />
                                        )}
                                        <div>
                                            <div className="SalesReturn-receipt-company-name">{companyDetails.name}</div>
                                            <div className="SalesReturn-receipt-company-address">{companyDetails.address}</div>
                                            {companyDetails.phone && <div className="SalesReturn-receipt-company-contact">{companyDetails.phone}</div>}
                                            {companyDetails.email && <div className="SalesReturn-receipt-company-contact">{companyDetails.email}</div>}
                                        </div>
                                    </div>
                                    <div className="SalesReturn-receipt-title-block">
                                        <div className="SalesReturn-receipt-title-badge">{getDocumentTitle('salesreturn')}</div>
                                        <div className="SalesReturn-receipt-meta">
                                            <div><span className="SalesReturn-receipt-meta-label">Return No:</span> <strong>{selectedReturn.returnNumber}</strong></div>
                                            <div><span className="SalesReturn-receipt-meta-label">Date:</span> {new Date(selectedReturn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                            {selectedReturn.invoice?.invoiceNumber && (
                                                <div><span className="SalesReturn-receipt-meta-label">Inv Ref:</span> <strong>{selectedReturn.invoice.invoiceNumber}</strong></div>
                                            )}
                                            {selectedReturn.manualVoucherNo && (
                                                <div><span className="SalesReturn-receipt-meta-label">Voucher No:</span> <strong>{selectedReturn.manualVoucherNo}</strong></div>
                                            )}
                                            <div style={{ marginTop: '4px' }}>
                                                <span className={`SalesReturn-sales-return-status-badge ${getStatusClass(selectedReturn.status || 'Pending')}`}>
                                                    {selectedReturn.status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer & Warehouse Cards Row */}
                                <div className="SalesReturn-receipt-info-cards" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '1.5rem' }}>
                                    <div className="SalesReturn-receipt-card SalesReturn-receipt-card-customer" style={{ width: '48%', textAlign: 'left', flex: '1', maxWidth: '48%' }}>
                                        <div className="SalesReturn-receipt-card-header">
                                            <span className="SalesReturn-receipt-card-title">RETURN FROM (CUSTOMER)</span>
                                        </div>
                                        <div className="SalesReturn-receipt-customer-name">{selectedReturn.customer?.name || '—'}</div>
                                        {(selectedReturn.customer?.billingAddress || selectedReturn.customer?.address || selectedReturn.customer?.shippingAddress) && (
                                            <div className="SalesReturn-receipt-customer-addr">
                                                {selectedReturn.customer.billingAddress || selectedReturn.customer.address || selectedReturn.customer.shippingAddress}
                                            </div>
                                        )}
                                        {(selectedReturn.customer?.city || selectedReturn.customer?.state || selectedReturn.customer?.zipCode) && (
                                            <div className="SalesReturn-receipt-customer-addr">
                                                {[selectedReturn.customer?.city, selectedReturn.customer?.state, selectedReturn.customer?.zipCode].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {(selectedReturn.customer?.phone || selectedReturn.customer?.mobile || selectedReturn.customer?.contactNumber) && (
                                            <div className="SalesReturn-receipt-customer-addr">
                                                {selectedReturn.customer.phone || selectedReturn.customer.mobile || selectedReturn.customer.contactNumber}
                                            </div>
                                        )}
                                        {selectedReturn.customer?.email && (
                                            <div className="SalesReturn-receipt-customer-addr">
                                                {selectedReturn.customer.email}
                                            </div>
                                        )}
                                        {(selectedReturn.customer?.gstin || selectedReturn.customer?.taxNumber || selectedReturn.customer?.vatNumber) && (
                                            <div className="SalesReturn-receipt-customer-addr" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                <strong>GSTIN/TAX:</strong> {selectedReturn.customer.gstin || selectedReturn.customer.taxNumber || selectedReturn.customer.vatNumber}
                                            </div>
                                        )}
                                    </div>

                                    <div className="SalesReturn-receipt-card SalesReturn-receipt-card-warehouse" style={{ width: '48%', textAlign: 'right', flex: '1', maxWidth: '48%' }}>
                                        <div className="SalesReturn-receipt-card-header">
                                            <span className="SalesReturn-receipt-card-title">RETURN TO (WAREHOUSE)</span>
                                        </div>
                                        <div className="SalesReturn-receipt-customer-name">
                                            {(selectedReturn.salesreturnitem || [])[0]?.warehouse?.name || '—'}
                                        </div>
                                        <div className="SalesReturn-receipt-meta-subgroup" style={{ marginTop: '10px' }}>
                                            <span className="SalesReturn-receipt-card-title">RETURN TYPE</span>
                                            <div className="SalesReturn-receipt-type-pill">{selectedReturn.returnType || 'Sales Return'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="SalesReturn-receipt-items-section">
                                    <table className="SalesReturn-receipt-items-table">
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
                                            {(selectedReturn.salesreturnitem || []).map((item, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td><strong>{item.product?.name || '—'}</strong></td>
                                                    <td>{item.warehouse?.name || '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {selectedReturn.invoice?.currency && selectedReturn.invoice?.currency !== (companySettings?.currency || 'INR') ? (
                                                            (() => {
                                                                const liveRate = getSyncRate(selectedReturn.invoice.currency, companySettings?.currency || 'INR') || 1;
                                                                return (
                                                                    <>
                                                                        <div>{formatDocCurrency(item.rate || 0, selectedReturn.invoice.currency)}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency((item.rate || 0) * liveRate)})</div>
                                                                    </>
                                                                );
                                                            })()
                                                        ) : (
                                                            formatCurrency(item.rate || 0)
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {selectedReturn.invoice?.currency && selectedReturn.invoice?.currency !== (companySettings?.currency || 'INR') ? (
                                                            (() => {
                                                                const liveRate = getSyncRate(selectedReturn.invoice.currency, companySettings?.currency || 'INR') || 1;
                                                                return (
                                                                    <>
                                                                        <div>{formatDocCurrency(item.amount || 0, selectedReturn.invoice.currency)}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((item.amount || 0) * liveRate)})</div>
                                                                    </>
                                                                );
                                                            })()
                                                        ) : (
                                                            formatCurrency(item.amount || 0)
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="SalesReturn-receipt-total-row">
                                                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '1rem' }}>TOTAL AMOUNT</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#ef4444' }}>
                                                    {selectedReturn.invoice?.currency && selectedReturn.invoice?.currency !== (companySettings?.currency || 'INR') ? (
                                                        (() => {
                                                            const liveRate = getSyncRate(selectedReturn.invoice.currency, companySettings?.currency || 'INR') || 1;
                                                            return (
                                                                <>
                                                                    <div>{formatDocCurrency(selectedReturn.totalAmount || 0, selectedReturn.invoice.currency)}</div>
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
                                            console.error('Error parsing sales return custom fields for view:', e);
                                        }
                                    }
                                    const fieldsList = getCustomFieldsForType('salesreturn');
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
                                        <div className="SalesReturn-receipt-reason-box" style={{ marginBottom: '8px' }}>
                                            <span className="SalesReturn-receipt-section-label">Reason for Return: </span>
                                            <span>{dispReason}</span>
                                        </div>
                                    );
                                })()}

                                {/* Narration */}
                                {(() => {
                                    const dispNarration = getDisplayNarration(selectedReturn);
                                    if (dispNarration === '-') return null;
                                    return (
                                        <div className="SalesReturn-receipt-reason-box">
                                            <span className="SalesReturn-receipt-section-label">Narration: </span>
                                            <span>{dispNarration}</span>
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
                                        } catch (e) { }
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
                                    let docTerms = companyDetails.termsCreditNote || companyDetails.terms;
                                    if (selectedReturn.customFields) {
                                        try {
                                            const parsed = typeof selectedReturn.customFields === 'string' ? JSON.parse(selectedReturn.customFields) : selectedReturn.customFields;
                                            if (parsed.terms !== undefined) docTerms = parsed.terms;
                                        } catch (e) { }
                                    }
                                    if (!docTerms) return null;
                                    return (
                                        <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Terms & Conditions</div>
                                            <div style={{ whiteSpace: 'pre-line' }}>{docTerms}</div>
                                        </div>
                                    );
                                })()}

                                {/* Signature */}
                                <div className="SalesReturn-receipt-signature-row">
                                    <div className="SalesReturn-receipt-sig-box">
                                        <div className="SalesReturn-receipt-sig-line"></div>
                                        <div className="SalesReturn-receipt-sig-label">Customer Signature</div>
                                    </div>
                                    <div className="SalesReturn-receipt-sig-box">
                                        <div className="SalesReturn-receipt-sig-line"></div>
                                        <div className="SalesReturn-receipt-sig-label">Authorized Signature</div>
                                    </div>
                                </div>

                                <div className="SalesReturn-receipt-footer">
                                    <p>This is a computer generated document. No signature is required.</p>
                                    <p>Printed on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        </div>
                        <div className="SalesReturn-modal-footer SalesReturn-no-print">
                            <button className="SalesReturn-btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
                            <button
                                className="SalesReturn-btn-print"
                                onClick={handlePrint}
                            >
                                <Printer size={16} style={{ marginRight: '6px' }} /> Print Return
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesReturn;
