import React, { useState, useEffect } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Plus, Eye, Pencil, Trash2, X, ChevronDown,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Download, Send, Printer, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './Payment.css';
import salesReceiptService from '../../../../api/salesReceiptService';
import salesInvoiceService from '../../../../api/salesInvoiceService';
import customerService from '../../../../api/customerService';
import ledgerService from '../../../../api/ledgerService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import posService from '../../../../services/posService';

const Payment = () => {

    const { hasPermission } = useContext(AuthContext);
    const { companySettings, formatCurrency, getReceiptPaymentLabel, getReceiptPaymentHeader, getDocumentTitle, getSyncRate } = useContext(CompanyContext);
    const [receipts, setReceipts] = useState([]);
    const [customFieldValues, setCustomFieldValues] = useState({});

    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || companySettings?.currency || 'EUR';
        const localeMap = {
            'INR': 'en-IN',
            'AED': 'ar-AE',
            'SAR': 'ar-SA',
            'EUR': 'en-IE',
            'GBP': 'en-GB',
            'JPY': 'ja-JP',
            'CNY': 'zh-CN',
            'RUB': 'ru-RU',
            'BRL': 'pt-BR',
            'CAD': 'en-CA',
            'AUD': 'en-AU',
            'PKR': 'en-PK',
            'BDT': 'en-BD'
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
    const [invoices, setInvoices] = useState([]);
    const [allLedgers, setAllLedgers] = useState([]); // Store all fetched ledgers
    const [ledgers, setLedgers] = useState([]); // Filtered ledgers for dropdown
    const [loading, setLoading] = useState(true);

    // List Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showInvoiceSelect, setShowInvoiceSelect] = useState(false);
    const [showCustomerSelect, setShowCustomerSelect] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

    // Edit & Delete State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [currentPayment, setCurrentPayment] = useState(null);

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [customerLedgerId, setCustomerLedgerId] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [receiptNumber, setReceiptNumber] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('BANK');
    const [amountReceived, setAmountReceived] = useState(0);
    const [exchangeRate, setExchangeRate] = useState(1.0);
    const [reference, setReference] = useState('');
    const [bankLedgerId, setBankLedgerId] = useState('');

    useEffect(() => {
        const invoiceCurrency = selectedInvoice?.currency || companySettings?.currency || 'INR';
        const baseCurrency = companySettings?.currency || 'INR';
        if (invoiceCurrency !== baseCurrency) {
            const liveRate = getSyncRate(invoiceCurrency, baseCurrency) || 1.0;
            setExchangeRate(liveRate);
        } else {
            setExchangeRate(1.0);
        }
    }, [selectedInvoice, companySettings]);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountType, setDiscountType] = useState('PERCENT'); // 'PERCENT' | 'AMOUNT'
    const [discountLedgerId, setDiscountLedgerId] = useState('');
    const [showDiscount, setShowDiscount] = useState(false);
    const [showTaxDeducted, setShowTaxDeducted] = useState(false);
    const [taxDeductedType, setTaxDeductedType] = useState('AMOUNT'); // 'PERCENT' | 'AMOUNT'
    const [taxDeductedPercent, setTaxDeductedPercent] = useState('');
    const [taxDeductedAmount, setTaxDeductedAmount] = useState(0);
    const [taxDeductedLedgerId, setTaxDeductedLedgerId] = useState('');
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const [showAdvance, setShowAdvance] = useState(false);
    const [discountLedgers, setDiscountLedgers] = useState([]);
    const [allocations, setAllocations] = useState({}); // Stores { [invoiceId]: allocatedAmount }
    // Tracks invoice type for each invoice in the list: { [invoiceId]: 'TAX_INVOICE' | 'POS_INVOICE' }
    const [invoiceTypeMap, setInvoiceTypeMap] = useState({});

    // Fetch and combine customer invoices
    const customerInvoices = React.useMemo(() => {
        if (!customerId) return [];
        let list = invoices.filter(inv => inv.customerId === customerId);

        // If editing, include any invoices that are already allocated in this receipt
        if (isEditMode && currentPayment?.receiptinvoiceallocation) {
            currentPayment.receiptinvoiceallocation.forEach(alloc => {
                const alreadyInList = list.some(item => item.id === alloc.invoiceId);
                if (!alreadyInList && alloc.invoice) {
                    list.push(alloc.invoice);
                }
            });
        }
        return list;
    }, [invoices, customerId, isEditMode, currentPayment]);

    // Sync selectedInvoice with selectedInvoiceIds
    useEffect(() => {
        if (selectedInvoiceIds.length > 0) {
            const firstInv = customerInvoices.find(inv => selectedInvoiceIds.includes(inv.id));
            if (firstInv) setSelectedInvoice(firstInv);
        } else {
            setSelectedInvoice(null);
        }
    }, [selectedInvoiceIds, customerInvoices]);

    const getInvoiceAvailableBalance = (invoiceId, baseBalance) => {
        let balance = parseFloat(baseBalance || 0);
        if (isEditMode && currentPayment?.receiptinvoiceallocation) {
            const alloc = currentPayment.receiptinvoiceallocation.find(a => a.invoiceId === invoiceId);
            if (alloc) {
                balance += parseFloat(alloc.amount || 0);
            }
        }
        return balance;
    };

    const totalAllocated = React.useMemo(() => {
        return Object.values(allocations).reduce((sum, val) => sum + parseFloat(val || 0), 0);
    }, [allocations]);

    const remainingAmount = React.useMemo(() => {
        const received = parseFloat(amountReceived || 0);
        const discount = parseFloat(discountAmount || 0);
        return Math.max(0, (received + discount) - totalAllocated);
    }, [amountReceived, discountAmount, totalAllocated]);

    const dueAmount = React.useMemo(() => {
        if (!selectedInvoice) return 0;
        let due = parseFloat(selectedInvoice.balanceAmount || 0);
        if (isEditMode && currentPayment) {
            due += parseFloat(currentPayment.amount || 0) + parseFloat(currentPayment.discountAmount || 0);
        }
        return due;
    }, [selectedInvoice, isEditMode, currentPayment]);

    const location = useLocation();
    const navigate = useNavigate();

    // Initial Fetch
    useEffect(() => {
        fetchData();
        fetchDropdowns();
        fetchCompanyDetails();
    }, []);



    const [companyDetails, setCompanyDetails] = useState({
        name: 'Zirak Books', address: '', email: '', phone: '', logo: null, notes: '', terms: '', termsReceipt: '', showQr: true
    });

    const companyDetailsRef = React.useRef(companyDetails);
    useEffect(() => {
        companyDetailsRef.current = companyDetails;
    }, [companyDetails]);

    const fetchCompanyDetails = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getById(companyId);
                const data = res.data;
                const updatedDetails = {
                    name: data.name || 'Zirak Books',
                    address: data.address || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    logo: data.logo || null,
                    notes: data.notes || '',
                    terms: data.terms || '',
                    termsReceipt: data.termsReceipt || '',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true
                };
                setCompanyDetails(updatedDetails);
                companyDetailsRef.current = updatedDetails;
                setNotes(data.notes || '');
                setTerms(data.termsReceipt || data.terms || '');
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const response = await salesReceiptService.getAll(companyId);
            if (response.data.success) {
                setReceipts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching receipts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const companyId = GetCompanyId();
            const [invRes, ledgerRes, custRes, posRes] = await Promise.all([
                salesInvoiceService.getAll(companyId),
                ledgerService.getAll(companyId),
                customerService.getAll(companyId),
                posService.getPOSInvoices(companyId).catch(() => null)
            ]);

            // Build type map and combined invoice list
            const typeMap = {};
            const combinedInvoices = [];

            if (invRes.data.success) {
                const taxInvoices = invRes.data.data.filter(inv => inv.balanceAmount > 0);
                taxInvoices.forEach(inv => { typeMap[inv.id] = 'TAX_INVOICE'; });
                combinedInvoices.push(...taxInvoices);
            }

            if (posRes && posRes.success && posRes.data) {
                const posInvoices = (Array.isArray(posRes.data) ? posRes.data : [])
                    .filter(inv => parseFloat(inv.balanceAmount || 0) > 0)
                    .map(inv => ({ ...inv, invoiceType: 'POS_INVOICE' }));
                posInvoices.forEach(inv => { typeMap[inv.id] = 'POS_INVOICE'; });
                combinedInvoices.push(...posInvoices);
            }

            setInvoices(combinedInvoices);
            setInvoiceTypeMap(typeMap);

            if (ledgerRes.data.success) {
                setAllLedgers(ledgerRes.data.data);
                setLedgers(ledgerRes.data.data); // Default show all
            }
            if (custRes.data.success) {
                setCustomers(custRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    React.useEffect(() => {
        if (allLedgers.length > 0) {
            // Show Cash/Bank accounts (Assets) and Equity accounts
            const filteredLedgers = allLedgers.filter(l =>
                (l.accountgroup?.type === 'ASSETS' &&
                    !l.customerId &&
                    !l.vendorId &&
                    (l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank'))) ||
                l.accountgroup?.type === 'EQUITY'
            );
            setLedgers(filteredLedgers);

            // Filter Expenses for Discount (prioritize Direct Expenses & Discount, fallback to all Expenses)
            let filteredExpenses = allLedgers.filter(l =>
                l.accountgroup?.type === 'EXPENSES' &&
                (l.accountsubgroup?.name?.toLowerCase().includes('direct') ||
                    l.name.toLowerCase().includes('direct') ||
                    l.name.toLowerCase().includes('cost of goods sold') ||
                    l.name.toLowerCase().includes('discount'))
            );
            if (filteredExpenses.length === 0) {
                filteredExpenses = allLedgers.filter(l => l.accountgroup?.type === 'EXPENSES');
            }
            if (filteredExpenses.length === 0) {
                filteredExpenses = allLedgers; // Fallback if no expense group defined
            }
            setDiscountLedgers(filteredExpenses);

            // Auto-select if only one option is available
            if (filteredLedgers.length === 1) {
                setBankLedgerId(filteredLedgers[0].id);
            }
        }
    }, [allLedgers]);

    const filteredReceipts = receipts.filter(rec => {
        const matchesSearch = !searchTerm ||
            rec.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const dateObj = new Date(rec.date);
        const matchesStart = !startDate || dateObj >= new Date(startDate);
        const matchesEnd = !endDate || dateObj <= new Date(endDate);

        return matchesSearch && matchesStart && matchesEnd;
    });

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const groupedLedgers = React.useMemo(() => {
        return ledgers.reduce((acc, ledger) => {
            const groupName = ledger.accountgroup?.name || 'Other Accounts';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(ledger);
            return acc;
        }, {});
    }, [ledgers]);

    const salesProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart, status: 'completed' },
        { id: 'delivery', label: 'Delivery', icon: Truck, status: 'completed' },
        { id: 'invoice', label: 'Invoice', icon: Receipt, status: 'completed' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'active' },
    ];

    const handleSelectCustomer = (cust) => {
        setCustomerId(cust.id);
        setCustomerName(cust.name);
        setCustomerLedgerId(cust.ledgerId);
        setShowCustomerSelect(false);
        setShowInvoiceSelect(false);
        setSelectedInvoiceIds([]);
        setAllocations({});
    };

    const handleSelectInvoice = (inv) => {
        setSelectedInvoice(inv);
        setCustomerId(inv.customerId);
        setCustomerLedgerId(inv.customer?.ledgerId);
        setCustomerName(inv.customer?.name || '');
        setAmountReceived(inv.balanceAmount);
        setAllocations({ [inv.id]: inv.balanceAmount });
        setSelectedInvoiceIds([inv.id]);
        // Track the invoice type for this selection
        const iType = inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE';
        setInvoiceTypeMap(prev => ({ ...prev, [inv.id]: iType }));
        setShowInvoiceSelect(false);
    };

    const resetForm = () => {
        setIsEditMode(false);
        setIsViewMode(false);
        setEditId(null);
        setCurrentPayment(null);
        setSelectedInvoice(null);
        setCustomerId('');
        setSelectedInvoiceIds([]);
        setCustomerLedgerId(null);
        setCustomerName('');
        setAmountReceived(0);
        setExchangeRate(1.0);
        setDiscountAmount(0);
        setDiscountPercent('');
        setDiscountType('PERCENT');
        setDiscountLedgerId('');
        setReceiptNumber('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMode('BANK');
        setReference('');
        setBankLedgerId('');
        setNotes(companyDetailsRef.current.notes || '');
        setTerms(companyDetailsRef.current.termsReceipt || companyDetailsRef.current.terms || '');
        setAllocations({});
        setInvoiceTypeMap({});
        setCustomFieldValues({});
        setShowInvoiceSelect(false);
        setShowCustomerSelect(false);
        setCustomerSearch('');
        setShowDiscount(false);
        setShowTaxDeducted(false);
        setTaxDeductedAmount(0);
        setTaxDeductedPercent('');
        setTaxDeductedType('AMOUNT');
        setTaxDeductedLedgerId('');
        setAdvanceAmount(0);
        setShowAdvance(false);
    };

    const handleAllocationChange = (invoiceId, valueInBase) => {
        setAllocations(prev => {
            const updated = { ...prev };
            if (valueInBase === '' || parseFloat(valueInBase) === 0) {
                delete updated[invoiceId];
                setSelectedInvoiceIds(prevIds => prevIds.filter(id => id !== invoiceId));
            } else {
                const roundedVal = parseFloat(parseFloat(valueInBase).toFixed(2));
                updated[invoiceId] = roundedVal;
                setSelectedInvoiceIds(prevIds => prevIds.includes(invoiceId) ? prevIds : [...prevIds, invoiceId]);
            }
            const newTotalAllocatedBase = Object.values(updated).reduce((s, v) => s + (parseFloat(v) || 0), 0);
            const totalLimit = parseFloat(amountReceived || 0) + parseFloat(discountAmount || 0) - parseFloat(taxDeductedAmount || 0);
            if (newTotalAllocatedBase > totalLimit) {
                const cashNeeded = Math.max(0, newTotalAllocatedBase - parseFloat(discountAmount || 0) + parseFloat(taxDeductedAmount || 0));
                setAmountReceived(cashNeeded.toFixed(2));
            }
            return updated;
        });
    };

    const handleToggleInvoiceSelection = (inv, isChecked) => {
        const invId = inv.id;
        const iType = inv.invoiceType || inv.type || invoiceTypeMap[invId] || 'TAX_INVOICE';
        setInvoiceTypeMap(prev => ({ ...prev, [invId]: iType }));

        const invCurr = inv.currency || companySettings?.currency || 'INR';
        const baseCurr = companySettings?.currency || 'INR';
        const syncRate = getSyncRate(invCurr, baseCurr) || 1.0;
        const maxDueRaw = getInvoiceAvailableBalance(invId, inv.balanceAmount);
        const maxDueBase = parseFloat((maxDueRaw * syncRate).toFixed(2));

        if (isChecked) {
            setSelectedInvoiceIds(prev => [...prev, invId]);
            setAllocations(prev => {
                const updated = { ...prev, [invId]: maxDueBase };
                const newTotalAllocatedBase = Object.values(updated).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                const discountVal = parseFloat(discountAmount || 0);
                const taxVal = parseFloat(taxDeductedAmount || 0);
                setAmountReceived(Math.max(0, newTotalAllocatedBase - discountVal + taxVal).toFixed(2));
                return updated;
            });
        } else {
            setSelectedInvoiceIds(prev => prev.filter(id => id !== invId));
            setAllocations(prev => {
                const updated = { ...prev };
                delete updated[invId];
                const newTotalAllocatedBase = Object.values(updated).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                const discountVal = parseFloat(discountAmount || 0);
                const taxVal = parseFloat(taxDeductedAmount || 0);
                setAmountReceived(Math.max(0, newTotalAllocatedBase - discountVal + taxVal).toFixed(2));
                return updated;
            });
        }
    };

    const handleToggleSelectAll = (isChecked) => {
        if (isChecked) {
            const allIds = customerInvoices.map(inv => inv.id);
            setSelectedInvoiceIds(allIds);

            const newAllocs = {};
            const newTypeMap = {};
            let totalDueBase = 0;

            customerInvoices.forEach(inv => {
                const invCurr = inv.currency || companySettings?.currency || 'INR';
                const baseCurr = companySettings?.currency || 'INR';
                const syncRate = getSyncRate(invCurr, baseCurr) || 1.0;
                const maxDueRaw = getInvoiceAvailableBalance(inv.id, inv.balanceAmount);
                const maxDueBase = parseFloat((maxDueRaw * syncRate).toFixed(2));

                newAllocs[inv.id] = maxDueBase;
                totalDueBase += maxDueBase;
                newTypeMap[inv.id] = inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE';
            });

            setInvoiceTypeMap(prev => ({ ...prev, ...newTypeMap }));
            setAllocations(newAllocs);
            const discountVal = parseFloat(discountAmount || 0);
            const taxVal = parseFloat(taxDeductedAmount || 0);
            setAmountReceived(Math.max(0, totalDueBase - discountVal + taxVal).toFixed(2));
        } else {
            setSelectedInvoiceIds([]);
            setAllocations({});
            setAmountReceived(0);
        }
    };

    const handleAmountReceivedChange = (val) => {
        const numVal = parseFloat(val) || 0;
        setAmountReceived(val);

        if (selectedInvoiceIds.length > 0) {
            setAllocations(prev => {
                const updated = { ...prev };
                let remainingBase = numVal + parseFloat(discountAmount || 0) - parseFloat(taxDeductedAmount || 0);

                const selectedInvs = customerInvoices.filter(inv => selectedInvoiceIds.includes(inv.id));
                selectedInvs.sort((a, b) => new Date(a.date) - new Date(b.date));

                selectedInvs.forEach(inv => {
                    const invCurr = inv.currency || companySettings?.currency || 'INR';
                    const baseCurr = companySettings?.currency || 'INR';
                    const syncRate = getSyncRate(invCurr, baseCurr) || 1.0;
                    const maxDueRaw = getInvoiceAvailableBalance(inv.id, inv.balanceAmount);
                    const maxDueBase = parseFloat((maxDueRaw * syncRate).toFixed(2));

                    if (remainingBase >= maxDueBase) {
                        updated[inv.id] = maxDueBase;
                        remainingBase -= maxDueBase;
                    } else if (remainingBase > 0) {
                        updated[inv.id] = parseFloat(remainingBase.toFixed(2));
                        remainingBase = 0;
                    } else {
                        updated[inv.id] = 0;
                    }
                });
                return updated;
            });
        }
    };

    const handleSave = async () => {
        try {
            if (!customerId) {
                toast.error('Please select a Customer (Received From)');
                return;
            }
            if (!bankLedgerId) {
                toast.error('Please select a Deposit To / Credit To account');
                return;
            }

            const advanceVal = showAdvance ? parseFloat(advanceAmount || 0) : 0;
            const totalAmount = parseFloat(amountReceived || 0) + advanceVal;

            if (totalAmount <= 0) {
                toast.error('Please enter a valid received or advance amount');
                return;
            }

            if (showDiscount && parseFloat(discountAmount || 0) > 0 && !discountLedgerId) {
                toast.error('Please select a Discount Account');
                return;
            }

            const companyId = GetCompanyId();
            const discountVal = parseFloat(discountAmount || 0);
            const allocationsArray = Object.entries(allocations)
                .filter(([invoiceId]) => selectedInvoiceIds.includes(parseInt(invoiceId)))
                .map(([invoiceId, amountInBase], index) => {
                    const inv = customerInvoices.find(i => String(i.id) === String(invoiceId));
                    const invCurr = inv?.currency || companySettings?.currency || 'INR';
                    const baseCurr = companySettings?.currency || 'INR';
                    const syncRate = getSyncRate(invCurr, baseCurr) || 1.0;

                    let allocBase = parseFloat(amountInBase || 0);
                    if (index === 0) {
                        allocBase = Math.max(0, allocBase - discountVal);
                    }
                    const allocInDocCurr = parseFloat((allocBase / syncRate).toFixed(2));

                    const iType = invoiceTypeMap[parseInt(invoiceId)] ||
                        (selectedInvoice && parseInt(selectedInvoice.id) === parseInt(invoiceId)
                            ? (selectedInvoice.invoiceType || selectedInvoice.type || 'TAX_INVOICE')
                            : 'TAX_INVOICE');
                    return {
                        invoiceId: parseInt(invoiceId),
                        invoiceType: iType,
                        amount: allocInDocCurr
                    };
                });

            // Determine top-level invoiceType (for single-invoice receipts without allocations)
            const topLevelInvoiceType = selectedInvoice
                ? (invoiceTypeMap[selectedInvoice.id] || selectedInvoice.invoiceType || selectedInvoice.type || 'TAX_INVOICE')
                : 'TAX_INVOICE';

            // For POS invoices, don't set invoiceId at top level (no FK in receipt table)
            const topLevelInvoiceId = selectedInvoice && topLevelInvoiceType !== 'POS_INVOICE'
                ? parseInt(selectedInvoice.id)
                : null;

            const data = {
                receiptNumber: editId ? undefined : (receiptNumber || `REC-${Date.now()}`),
                date: paymentDate,
                customerId: parseInt(customerId),
                invoiceId: topLevelInvoiceId,
                invoiceType: topLevelInvoiceType,
                cashBankAccountId: parseInt(bankLedgerId),
                amount: totalAmount,
                discountAmount: parseFloat(discountAmount || 0),
                discountLedgerId: discountLedgerId ? parseInt(discountLedgerId) : null,
                taxDeductedAmount: parseFloat(taxDeductedAmount || 0),
                taxDeductedLedgerId: taxDeductedLedgerId ? parseInt(taxDeductedLedgerId) : null,
                advanceAmount: advanceVal,
                paymentMode: paymentMode,
                referenceNumber: reference,
                notes: notes,
                companyId: parseInt(companyId),
                allocations: allocationsArray,
                customFields: JSON.stringify({
                    ...customFieldValues,
                    terms: terms
                }),
                exchangeRate: (selectedInvoice?.currency !== companySettings?.currency) ? parseFloat(exchangeRate) : 1.0
            };

            let response;
            if (isEditMode && editId) {
                response = await salesReceiptService.update(editId, data, companyId);
            } else {
                response = await salesReceiptService.create(data);
            }

            if (response.data && response.data.success) {
                toast.success(isEditMode ? 'Payment receipt updated' : 'Payment receipt recorded');
                fetchData();
                fetchDropdowns();
                setShowAddModal(false);
                resetForm();
            } else {
                toast.error(response.data?.message || 'Failed to save receipt');
            }
        } catch (error) {
            console.error('Error saving receipt:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to save receipt');
        }
    };

    const handleOpenModal = async () => {
        resetForm();
        setIsViewMode(false);
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'receipt');
                if (res.data.success) {
                    setReceiptNumber(res.data.nextNumber);
                }
            }
        } catch (error) {
            console.error('Error fetching next receipt number:', error);
        }
        setShowCustomerSelect(false); // Start directly in full-page create form
        setShowAddModal(true);
    };

    const handleEdit = async (paymentId) => {
        await populatePayment(paymentId, false);
    };

    const handleView = async (paymentId) => {
        await populatePayment(paymentId, true);
    };

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (location.state && location.state.targetReceiptId) {
            const receiptId = location.state.targetReceiptId;
            const isEdit = location.state.isEdit || location.state.autoEdit;
            // Clear location state immediately to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });
            if (isEdit) {
                handleEdit(receiptId);
            } else {
                handleView(receiptId);
            }
        } else if (location.state && location.state.targetInvoiceId) {
            const targetInvoiceId = location.state.targetInvoiceId;
            const targetInvoiceType = location.state.invoiceType || 'TAX_INVOICE';
            // Clear location state immediately to prevent re-opening on re-renders
            navigate(location.pathname, { replace: true, state: {} });

            const autoPopulatePaymentForInvoice = async () => {
                try {
                    const invId = targetInvoiceId;
                    const companyId = GetCompanyId();

                    // Fetch next receipt number (common step)
                    let nextNo = '';
                    try {
                        const res = await companyService.getNextNumber(companyId, 'receipt');
                        if (res.data.success) nextNo = res.data.nextNumber;
                    } catch (e) {
                        console.error('Error fetching next receipt number:', e);
                    }

                    if (String(invId).startsWith('combined-')) {
                        // Combined/grouped invoice
                        const custIdStr = invId.replace('combined-CUST-', '');
                        const custId = parseInt(custIdStr);

                        resetForm();

                        // Fetch customer details, all invoices in parallel
                        const [custRes, allInvsRes] = await Promise.all([
                            customerService.getById(custId),
                            salesInvoiceService.getAll(companyId)
                        ]);

                        if (custRes.data.success && allInvsRes.data.success) {
                            const cust = custRes.data.data;

                            setReceiptNumber(nextNo);
                            setCustomerId(cust.id);
                            setCustomerLedgerId(cust.ledgerId);
                            setCustomerName(cust.name || '');

                            // Find all unpaid/partial invoices for this customer
                            const custInvs = allInvsRes.data.data.filter(inv => inv.customerId === cust.id && inv.balanceAmount > 0);
                            const totalDue = custInvs.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

                            setAmountReceived(totalDue);

                            // Auto-allocate the due amounts
                            const autoAllocs = {};
                            const newTypeMap = {};
                            const autoIds = [];
                            custInvs.forEach(inv => {
                                autoAllocs[inv.id] = inv.balanceAmount;
                                newTypeMap[inv.id] = 'TAX_INVOICE';
                                autoIds.push(inv.id);
                            });
                            setAllocations(autoAllocs);
                            setSelectedInvoiceIds(autoIds);
                            setInvoiceTypeMap(prev => ({ ...prev, ...newTypeMap }));

                            setShowCustomerSelect(false);
                            setShowInvoiceSelect(false);
                            setShowAddModal(true);
                        }
                    } else if (targetInvoiceType === 'POS_INVOICE') {
                        // POS Invoice deep link
                        const posRes = await posService.getPOSInvoiceById(invId, companyId);
                        if (posRes && posRes.success && posRes.data) {
                            const inv = { ...posRes.data, invoiceType: 'POS_INVOICE' };
                            resetForm();
                            setReceiptNumber(nextNo);
                            setSelectedInvoice(inv);
                            setCustomerId(inv.customerId);
                            setCustomerLedgerId(inv.customer?.ledgerId);
                            setCustomerName(inv.customer?.name || '');
                            setAmountReceived(inv.balanceAmount);
                            setAllocations({ [inv.id]: inv.balanceAmount });
                            setSelectedInvoiceIds([parseInt(inv.id)]);
                            setInvoiceTypeMap(prev => ({ ...prev, [inv.id]: 'POS_INVOICE' }));
                            setShowCustomerSelect(false);
                            setShowInvoiceSelect(false);
                            setShowAddModal(true);
                        }
                    } else {
                        // Standard Tax Invoice deep link
                        const invRes = await salesInvoiceService.getById(invId, companyId);
                        if (invRes.data.success) {
                            const inv = invRes.data.data;
                            resetForm();
                            setReceiptNumber(nextNo);
                            setSelectedInvoice(inv);
                            setCustomerId(inv.customerId);
                            setCustomerLedgerId(inv.customer?.ledgerId);
                            setCustomerName(inv.customer?.name || '');
                            setAmountReceived(inv.balanceAmount);
                            setAllocations({ [inv.id]: inv.balanceAmount });
                            setSelectedInvoiceIds([parseInt(inv.id)]);
                            setInvoiceTypeMap(prev => ({ ...prev, [inv.id]: 'TAX_INVOICE' }));
                            setShowCustomerSelect(false);
                            setShowInvoiceSelect(false);
                            setShowAddModal(true);
                        }
                    }
                } catch (error) {
                    console.error("Error setting up payment from invoice deep link:", error);
                }
            };
            autoPopulatePaymentForInvoice();
        }
    }, [location.state, navigate]);

    const populatePayment = async (paymentId, viewOnly) => {
        try {
            const companyId = GetCompanyId();
            const response = await salesReceiptService.getById(paymentId, companyId);
            if (response.data.success) {
                const rec = response.data.data;
                resetForm();
                setCurrentPayment(rec);
                setIsEditMode(!viewOnly);
                setIsViewMode(viewOnly);
                setEditId(paymentId);

                let fieldValues = {};
                if (rec.customFields) {
                    try {
                        fieldValues = typeof rec.customFields === 'string'
                            ? JSON.parse(rec.customFields)
                            : rec.customFields;
                        if (fieldValues.terms !== undefined) {
                            setTerms(fieldValues.terms || '');
                        } else {
                            setTerms(companyDetails.termsReceipt || companyDetails.terms || '');
                        }
                    } catch (e) {
                        console.error('Error parsing custom fields on edit:', e);
                    }
                } else {
                    setTerms(companyDetails.termsReceipt || companyDetails.terms || '');
                }
                setCustomFieldValues(fieldValues);

                // Fetch invoice with items if invoice exists
                let invoiceWithItems = rec.invoice;
                if (rec.invoice?.id) {
                    try {
                        const invoiceResponse = await salesInvoiceService.getById(rec.invoice.id, companyId);
                        if (invoiceResponse.data.success) {
                            invoiceWithItems = invoiceResponse.data.data;
                        }
                    } catch (err) {
                        console.error('Error fetching invoice details:', err);
                    }
                }

                setSelectedInvoice(invoiceWithItems);
                setCustomerId(rec.customerId);
                setCustomerLedgerId(rec.customer?.ledgerId);
                setCustomerName(rec.customer?.name || '');
                setAmountReceived(rec.amount);
                setDiscountAmount(rec.discountAmount || 0);
                setDiscountLedgerId(rec.discountLedgerId || '');
                setPaymentDate(rec.date.split('T')[0]);
                setPaymentMode(rec.paymentMode || 'Bank');
                setReference(rec.referenceNumber || '');
                setBankLedgerId(rec.cashBankAccountId || ''); // Ensure backend returns this or we need to check receipt schema
                setNotes(rec.notes || '');
                setReceiptNumber(rec.receiptNumber || '');
                setShowDiscount(parseFloat(rec.discountAmount || 0) > 0);
                setTaxDeductedAmount(rec.taxDeductedAmount || 0);
                setTaxDeductedLedgerId(rec.taxDeductedLedgerId || '');
                setShowTaxDeducted(parseFloat(rec.taxDeductedAmount || 0) > 0);
                setAdvanceAmount(rec.advanceAmount || 0);
                setShowAdvance(parseFloat(rec.advanceAmount || 0) > 0);

                const newAllocs = {};
                const discAmount = parseFloat(rec.discountAmount || 0);
                const loadedInvoiceIds = [];
                if (rec.allocations && rec.allocations.length > 0) {
                    rec.allocations.forEach((a, idx) => {
                        newAllocs[a.invoiceId] = parseFloat(a.amount) + (idx === 0 ? discAmount : 0);
                        loadedInvoiceIds.push(a.invoiceId);
                    });
                } else if (rec.invoiceId && rec.amount) {
                    newAllocs[rec.invoiceId] = parseFloat(rec.amount) + discAmount;
                    loadedInvoiceIds.push(rec.invoiceId);
                }
                setAllocations(newAllocs);
                setSelectedInvoiceIds(loadedInvoiceIds);

                setShowInvoiceSelect(false);
                setShowAddModal(true);
            }
        } catch (error) {
            console.error('Error fetching payment details:', error);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            await salesReceiptService.delete(deleteId, companyId);
            fetchData();
            fetchDropdowns();
            setShowDeleteModal(false);
            setDeleteId(null);
        } catch (error) {
            console.error('Error deleting receipt:', error);
        }
    };

    const handleStatusChange = async (receiptId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const response = await salesReceiptService.update(receiptId, payload, companyId);
            if (response.data?.success || response.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    const handlePrintReceipt = () => {
        const companyName = companySettings?.name || companyDetails?.name || 'Tab Accounts';
        const companyAddress = companySettings?.address || companyDetails?.address || '';
        const companyPhone = companySettings?.phone || companyDetails?.phone || '';
        const companyEmail = companySettings?.email || companyDetails?.email || '';
        const companyLogo = companySettings?.logo || companyDetails?.logo || '';
        const companyWebsite = companySettings?.website || '';
        const companyTax = companySettings?.taxNumber || '';

        const allocatedRows = Object.entries(allocations)
            .filter(([, val]) => parseFloat(val) > 0)
            .map(([invId, val]) => {
                const inv = customerInvoices.find(i => String(i.id) === String(invId));
                return `
                    <tr>
                        <td>${inv?.invoiceNumber || invId}</td>
                        <td>${inv?.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                        <td style="text-align:right">${formatCurrency(inv?.totalAmount || 0)}</td>
                        <td style="text-align:right">${formatCurrency(parseFloat(val))}</td>
                    </tr>`;
            }).join('');

        const currentNotes = notes || '';
        const currentTerms = terms || '';
        const unallocated = Math.max(0, parseFloat(amountReceived || 0) - totalAllocated);

        const receiptHTML = `
            <div id="payment-receipt-print" style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:32px;max-width:720px;margin:0 auto;">

                <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #1e293b;margin-bottom:20px;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        ${companyLogo
                ? `<img src="${companyLogo}" alt="Logo" style="max-height:72px;max-width:140px;object-fit:contain;" />`
                : `<div style="width:56px;height:56px;background:linear-gradient(135deg,#1e293b,#475569);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;font-weight:800;">${companyName.charAt(0).toUpperCase()}</div>`}
                        <div>
                            <div style="font-size:1.2rem;font-weight:700;color:#1e293b;">${companyName}</div>
                            <div style="font-size:0.78rem;color:#64748b;margin-top:4px;line-height:1.6;">
                                ${companyAddress ? companyAddress + '<br>' : ''}
                                ${companyPhone ? '📞 ' + companyPhone + '&nbsp;&nbsp;' : ''}${companyEmail ? '✉️ ' + companyEmail : ''}
                                ${companyWebsite ? '<br>🌐 ' + companyWebsite : ''}
                                ${companyTax ? '<br>Tax No: ' + companyTax : ''}
                            </div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.25rem;font-weight:700;color:#1e293b;">Payment Receipt</div>
                        <div style="font-size:0.82rem;color:#475569;margin-top:4px;"><strong>${receiptNumber || 'Draft'}</strong></div>
                        <div style="font-size:0.82rem;color:#64748b;">Date: ${paymentDate}</div>
                    </div>
                </div>

                <div style="margin-bottom:18px;">
                    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:10px;">Payment Details</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;">
                        <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Customer</div><div style="font-weight:500;">${customerName || '-'}</div></div>
                        <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Payment Mode</div><div style="font-weight:500;">${paymentMode || '-'}</div></div>
                        <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Amount Received</div><div style="font-weight:600;">${formatCurrency(amountReceived || 0)}</div></div>
                        <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Reference No</div><div style="font-weight:500;">${reference || '-'}</div></div>
                        ${parseFloat(discountAmount || 0) > 0 ? `<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Discount Given</div><div style="font-weight:500;">${formatCurrency(discountAmount)}</div></div>` : ''}
                    </div>
                </div>

                ${allocatedRows ? `
                <div style="margin-bottom:18px;">
                    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:10px;">Invoice Allocations</div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                        <thead>
                            <tr style="background:#1e293b;color:#fff;">
                                <th style="padding:8px 12px;text-align:left;font-size:0.78rem;">Invoice No</th>
                                <th style="padding:8px 12px;text-align:left;font-size:0.78rem;">Date</th>
                                <th style="padding:8px 12px;text-align:right;font-size:0.78rem;">Total Amount</th>
                                <th style="padding:8px 12px;text-align:right;font-size:0.78rem;">Allocated</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allocatedRows}
                        </tbody>
                    </table>
                </div>` : ''}

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;display:flex;justify-content:space-between;margin-bottom:18px;font-size:0.85rem;">
                    <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Total Received</div><div style="font-weight:700;">${formatCurrency(amountReceived || 0)}</div></div>
                    <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Total Allocated</div><div style="font-weight:700;color:#2563eb;">${formatCurrency(totalAllocated)}</div></div>
                    <div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;">Unallocated</div><div style="font-weight:700;color:#334155;">${formatCurrency(unallocated)}</div></div>
                </div>

                ${currentNotes ? `
                <div style="margin-bottom:14px;">
                    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:6px;">Notes</div>
                    <div style="background:#fafafa;border-left:3px solid #cbd5e1;border-radius:4px;padding:10px 14px;font-size:0.82rem;color:#475569;white-space:pre-wrap;line-height:1.6;">${currentNotes}</div>
                </div>` : ''}

                ${currentTerms ? `
                <div style="margin-bottom:14px;">
                    <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:6px;">Terms &amp; Conditions</div>
                    <div style="background:#fafafa;border-left:3px solid #cbd5e1;border-radius:4px;padding:10px 14px;font-size:0.82rem;color:#475569;white-space:pre-wrap;line-height:1.6;">${currentTerms}</div>
                </div>` : ''}

                <div style="border-top:1px solid #e2e8f0;padding-top:14px;margin-top:6px;text-align:center;font-size:0.75rem;color:#94a3b8;">
                    Thank you for your payment! &nbsp;|&nbsp; Generated by ${companyName} &nbsp;|&nbsp; ${new Date().toLocaleString()}
                </div>
            </div>`;

        // Inject into DOM and print (avoids popup blocker)
        const printContainer = document.createElement('div');
        printContainer.id = 'sp-print-wrapper';
        printContainer.innerHTML = receiptHTML;

        const styleEl = document.createElement('style');
        styleEl.id = 'sp-print-style';
        styleEl.innerHTML = `
            @media print {
                body > *:not(#sp-print-wrapper) { display: none !important; }
                #sp-print-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: #fff; z-index: 99999; }
            }
            @media screen {
                #sp-print-wrapper { display: none !important; }
            }
        `;

        document.head.appendChild(styleEl);
        document.body.appendChild(printContainer);
        window.print();

        setTimeout(() => {
            const el = document.getElementById('sp-print-wrapper');
            const st = document.getElementById('sp-print-style');
            if (el) el.remove();
            if (st) st.remove();
        }, 1500);
    };

    const handlePrint = () => {
        // Add print class to body to trigger print styles
        document.body.classList.add('printing');

        // Trigger print dialog
        window.print();

        // Remove print class after printing
        setTimeout(() => {
            document.body.classList.remove('printing');
        }, 1000);
    };

    return (
        <div className="SalesPayment-payment-page">
            {!showAddModal && !isViewMode && (
                <>
                    <div className="SalesPayment-page-header">
                        <div className="SalesPayment-header-left">
                            <h1 className="SalesPayment-page-title">Received Payments</h1>
                            <p className="SalesPayment-page-subtitle">Record and track customer payments</p>
                        </div>
                        <div className="SalesPayment-header-actions">
                            {hasPermission('create sales payment') && (
                                <button className="SalesPayment-btn-add" onClick={handleOpenModal}>
                                    <Plus size={18} className="mr-2" /> Record Payment
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sales Process Tracker */}
                    <div className="SalesPayment-process-tracker-card">
                        <div className="SalesPayment-tracker-wrapper">
                            {salesProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`SalesPayment-tracker-step ${step.status}`}>
                                        <div className="SalesPayment-step-icon-wrapper">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="SalesPayment-status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="SalesPayment-status-badge" size={14} />}
                                        </div>
                                        <span className="SalesPayment-step-label">{step.label}</span>
                                    </div>
                                    {index < salesProcess.length - 1 && (
                                        <div className={`SalesPayment-tracker-divider ${salesProcess[index + 1].status !== 'pending' ? 'SalesPayment-active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="SalesPayment-table-card mt-6">
                        <div className="SalesPayment-table-controls">
                            <div className="SalesPayment-search-control">
                                <Search size={18} className="SalesPayment-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search payments..."
                                    className="SalesPayment-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="SalesPayment-filter-group">
                                <div className="SalesPayment-filter-item">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input
                                        type="date"
                                        className="SalesPayment-filter-date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="SalesPayment-filter-item">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input
                                        type="date"
                                        className="SalesPayment-filter-date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="SalesPayment-table-container">
                            <table className="SalesPayment-payment-table">
                                <thead>
                                    <tr>
                                        <th>PAYMENT ID</th>
                                        <th>INVOICE</th>
                                        <th>CUSTOMER</th>
                                        <th>DATE</th>
                                        <th>RECEIVED INTO</th>
                                        {/* <th>MODE</th> */}
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th className="text-right">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReceipts.map(rec => (
                                        <tr key={rec.id}>
                                            <td className="font-bold text-blue-600">{rec.receiptNumber}</td>
                                            <td><span className="SalesPayment-source-link">{rec.invoice?.invoiceNumber || 'No Link'}</span></td>
                                            <td>{rec.customer?.name}</td>
                                            <td>{new Date(rec.date).toLocaleDateString()}</td>
                                            <td>{rec.cashBankAccount?.name || '-'}</td>
                                            {/* <td>{rec.paymentMode}</td> */}
                                            <td className="font-bold SalesPayment-text-green-600">
                                                {(() => {
                                                    const recCurr = rec.allocations?.[0]?.invoice?.currency || rec.invoice?.currency || companySettings?.currency || 'INR';
                                                    const recRate = getSyncRate(recCurr, companySettings?.currency || 'INR') || 1.0;
                                                    const isForeignRec = recCurr !== (companySettings?.currency || 'INR');
                                                    return isForeignRec ? (
                                                        <>
                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(rec.amount, recCurr)}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency(rec.amount * recRate)})</div>
                                                        </>
                                                    ) : (
                                                        formatCurrency(rec.amount)
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <select
                                                    value={rec.manualStatus ? rec.status : 'AUTO'}
                                                    onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                                                    className="SalesPayment-payment-status-badge"
                                                    style={getStatusStyle(rec.manualStatus ? rec.status : 'AUTO')}
                                                >
                                                    <option value="AUTO">Auto ({rec.status || 'Completed'})</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="COMPLETED">COMPLETED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            </td>
                                            <td className="text-right">
                                                <div className="SalesPayment-payment-action-buttons">
                                                    <button className="SalesPayment-payment-action-btn SalesPayment-view" onClick={() => handleView(rec.id)} title="View"><Eye size={16} /></button>
                                                    {hasPermission('edit sales payment') && (
                                                        <button className="SalesPayment-payment-action-btn SalesPayment-edit" onClick={() => handleEdit(rec.id)} title="Edit"><Pencil size={16} /></button>
                                                    )}
                                                    {hasPermission('delete sales payment') && (
                                                        <button className="SalesPayment-payment-action-btn SalesPayment-delete" onClick={() => handleDeleteClick(rec.id)} title="Delete"><Trash2 size={16} /></button>
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

            {/* Full-Page Create/Edit/View Container */}
            {(showAddModal || isViewMode) && (
                <div className="SalesPayment-sales-order-full-page-create">
                    {/* Header Bar matching Sales Invoice */}
                    <div className="SalesPayment-view-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(companySettings?.invoiceLogo || companyDetails.logo) ? (
                                    <img src={companySettings?.invoiceLogo || companyDetails.logo} alt="Company Logo" style={{ height: '26px', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1e293b', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                        {companyDetails.name ? companyDetails.name.charAt(0).toUpperCase() : 'Z'}
                                    </div>
                                )}
                                <h2 className="text-lg font-bold text-gray-800" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#1e293b' }}>
                                    {isViewMode ? `Payment Receipt #${receiptNumber}` : (isEditMode ? 'Edit Sales Payment' : 'New Sales Payment')}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name || 'Company Name'} {companyDetails.phone ? `• ${companyDetails.phone}` : ''} {companyDetails.email ? `• ${companyDetails.email}` : ''}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button type="button" onClick={handlePrint} className="SalesPayment-btn-action print" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Printer size={16} /> Print Receipt
                                </button>
                            )}
                            {!isViewMode && (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="SalesPayment-btn-action save"
                                    style={{ backgroundColor: '#1e293b', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                    disabled={!customerId || !bankLedgerId || amountReceived <= 0 || (parseFloat(discountAmount || 0) > 0 && !discountLedgerId) || totalAllocated > (parseFloat(amountReceived || 0) + parseFloat(discountAmount || 0))}
                                >
                                    {isEditMode ? 'Update Payment' : 'Save Payment'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setIsViewMode(false);
                                    setIsEditMode(false);
                                    setCurrentPayment(null);
                                    resetForm();
                                }}
                                className="SalesPayment-btn-action cancel"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <X size={16} /> Back to Payments
                            </button>
                        </div>
                    </div>

                    <div className={`SalesPayment-modal-body ${isViewMode ? 'SalesPayment-view-mode-body' : ''}`}>
                        {isViewMode ? (
                            // --- VIEW MODE: INVOICE TEMPLATE ---
                            <div className="SalesPayment-invoice-view-template" id="invoice-print-content">
                                {/* Header */}
                                <div className="SalesPayment-invoice-header-section">
                                    <div className="SalesPayment-invoice-company-info">
                                        {companyDetails.logo ? (
                                            <img src={companyDetails.logo} alt="Company Logo" className="SalesPayment-invoice-logo" />
                                        ) : (
                                            <div className="SalesPayment-invoice-logo-placeholder">ZB</div>
                                        )}
                                        <h2 className="SalesPayment-invoice-company-name">{companyDetails.name}</h2>
                                        <div className="SalesPayment-invoice-company-details">
                                            <p>{companyDetails.email}</p>
                                            <p>{companyDetails.phone}</p>
                                            <p>{companyDetails.address}</p>
                                        </div>
                                    </div>
                                    <div className="SalesPayment-invoice-meta-section">
                                        <h1 className="SalesPayment-invoice-title">{getDocumentTitle('receipt')}</h1>
                                        <div className="SalesPayment-invoice-meta-details">
                                            <p><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('number', 'Receipt No:')}</span> {currentPayment?.receiptNumber || 'N/A'}</p>
                                            <p><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('date', 'Payment Date:')}</span> {currentPayment?.date ? new Date(currentPayment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                                            {currentPayment?.invoice?.invoiceNumber && (
                                                <p><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('invoiceRef', 'Invoice Ref:')}</span> #{currentPayment.invoice.invoiceNumber}</p>
                                            )}
                                        </div>
                                        {companyDetails.showQr && (
                                            <div className="SalesPayment-invoice-qr-code">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${currentPayment?.receiptNumber || 'Receipt'}`} alt="QR Code" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address Section */}
                                <div className="SalesPayment-invoice-addresses-section">
                                    <div className="SalesPayment-invoice-bill-to-section">
                                        <h3 className="SalesPayment-invoice-section-title">{getReceiptPaymentLabel('receivedFrom', 'Received From:')}</h3>
                                        <p className="SalesPayment-invoice-customer-name">{currentPayment?.customer?.name || customerName || 'Valued Customer'}</p>
                                        <p className="SalesPayment-invoice-customer-address">{currentPayment?.customer?.billingAddress || 'N/A'}</p>
                                        <p className="SalesPayment-invoice-customer-city">
                                            {currentPayment?.customer?.billingCity} {currentPayment?.customer?.billingState}
                                        </p>
                                    </div>
                                    <div className="pp-receipt-ship-to" style={{ textAlign: 'right' }}>
                                        <h3 className="SalesPayment-invoice-section-title" style={{ textAlign: 'right' }}>Payment Summary:</h3>
                                        <p className="SalesPayment-invoice-meta-details" style={{ textAlign: 'right' }}><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('receivedInto', 'Received Into:')}</span> {currentPayment?.cashBankAccount?.name || 'N/A'}</p>
                                        <p className="SalesPayment-invoice-meta-details" style={{ textAlign: 'right' }}><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('mode', 'Payment Mode:')}</span> {currentPayment?.paymentMode || 'N/A'}</p>
                                        {currentPayment?.referenceNumber && (
                                            <p className="SalesPayment-invoice-meta-details" style={{ textAlign: 'right' }}><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('refNo', 'Ref No:')}</span> {currentPayment.referenceNumber}</p>
                                        )}
                                        {currentPayment?.discountAmount > 0 && (() => {
                                            const recCurr = currentPayment?.allocations?.[0]?.invoice?.currency || currentPayment?.invoice?.currency || companySettings?.currency || 'INR';
                                            const recRate = getSyncRate(recCurr, companySettings?.currency || 'INR') || 1.0;
                                            const isForeignRec = recCurr !== (companySettings?.currency || 'INR');
                                            return (
                                                <>
                                                    <p className="SalesPayment-invoice-meta-details" style={{ textAlign: 'right' }}>
                                                        <span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('discount', 'Discount Allowed:')}</span>{' '}
                                                        {isForeignRec ? (
                                                            <>
                                                                {formatDocCurrency(currentPayment.discountAmount, recCurr)}
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '6px' }}>({formatCurrency(currentPayment.discountAmount * recRate)})</span>
                                                            </>
                                                        ) : (
                                                            formatCurrency(currentPayment.discountAmount)
                                                        )}
                                                    </p>
                                                    <p className="SalesPayment-invoice-meta-details" style={{ textAlign: 'right' }}><span className="SalesPayment-invoice-meta-label">{getReceiptPaymentLabel('discountAccount', 'Discount Account:')}</span> {currentPayment.discountLedger?.name || 'N/A'}</p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Amount Box */}
                                {(() => {
                                    const recCurr = currentPayment?.allocations?.[0]?.invoice?.currency || currentPayment?.invoice?.currency || companySettings?.currency || 'INR';
                                    const recRate = getSyncRate(recCurr, companySettings?.currency || 'INR') || 1.0;
                                    const isForeignRec = recCurr !== (companySettings?.currency || 'INR');

                                    const amountText = isForeignRec
                                        ? `${formatDocCurrency(currentPayment?.amount || 0, recCurr)} (${formatCurrency((currentPayment?.amount || 0) * recRate)})`
                                        : formatCurrency(currentPayment?.amount || 0);

                                    const discountText = currentPayment?.discountAmount > 0
                                        ? (isForeignRec
                                            ? ` (with ${formatDocCurrency(currentPayment.discountAmount, recCurr)} (${formatCurrency(currentPayment.discountAmount * recRate)}) discount)`
                                            : ` (with ${formatCurrency(currentPayment.discountAmount)} discount)`)
                                        : '';

                                    return (
                                        <div className="SalesPayment-receipt-amount-box">
                                            <div className="SalesPayment-receipt-amount-text">
                                                {getReceiptPaymentLabel('satisfaction', 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.')
                                                    .replace('{amount}', amountText)
                                                    .replace('{discountText}', discountText)
                                                }
                                            </div>
                                            <div className="SalesPayment-receipt-amount-value">
                                                {isForeignRec ? (
                                                    <>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 'normal', color: '#64748b' }}>{formatDocCurrency(currentPayment?.amount || 0, recCurr)}</div>
                                                        <div>{formatCurrency((currentPayment?.amount || 0) * recRate)}</div>
                                                    </>
                                                ) : (
                                                    formatCurrency(currentPayment?.amount || 0)
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Custom Fields Print View */}
                                {(() => {
                                    let customFieldVals = {};
                                    if (currentPayment?.customFields) {
                                        try {
                                            customFieldVals = typeof currentPayment.customFields === 'string'
                                                ? JSON.parse(currentPayment.customFields)
                                                : currentPayment.customFields;
                                        } catch (e) {
                                            console.error('Error parsing payment custom fields for view:', e);
                                        }
                                    }
                                    const fieldsList = getCustomFieldsForType('receipt');
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

                                {/* Linked Invoices (if any) */}
                                {((currentPayment?.allocations && currentPayment.allocations.length > 0) || currentPayment?.invoice) && (
                                    <div className="SalesPayment-invoice-items-section">
                                        <h3 className="SalesPayment-invoice-section-title">Applied To Invoices:</h3>
                                        <table className="SalesPayment-invoice-items-table">
                                            <thead>
                                                <tr>
                                                    <th>{getReceiptPaymentHeader('invoiceNumber', 'Invoice Number')}</th>
                                                    <th>{getReceiptPaymentHeader('invoiceDate', 'Invoice Date')}</th>
                                                    <th className="text-right">{getReceiptPaymentHeader('invoiceAmount', 'Invoice Amount')}</th>
                                                    <th className="text-right">{getReceiptPaymentHeader('allocatedAmount', 'Allocated Amount')}</th>
                                                    <th className="text-right">{getReceiptPaymentHeader('balanceDue', 'Balance Due')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPayment.allocations && currentPayment.allocations.length > 0 ? (
                                                    currentPayment.allocations.map((alloc, index) => {
                                                        const invCurr = alloc.invoice?.currency || companySettings?.currency || 'INR';
                                                        const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                        const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                        const allocSum = parseFloat(alloc.amount || 0) + (index === 0 ? parseFloat(currentPayment.discountAmount || 0) : 0);
                                                        return (
                                                            <tr key={alloc.id}>
                                                                <td>{alloc.invoice?.invoiceNumber || `ID: ${alloc.invoiceId}`}</td>
                                                                <td>{alloc.invoice?.date ? new Date(alloc.invoice.date).toLocaleDateString() : 'N/A'}</td>
                                                                <td className="text-right">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(alloc.invoice?.totalAmount || 0, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency((alloc.invoice?.totalAmount || 0) * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(alloc.invoice?.totalAmount || 0)
                                                                    )}
                                                                </td>
                                                                <td className="text-right">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(allocSum, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(allocSum * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(allocSum)
                                                                    )}
                                                                </td>
                                                                <td className="text-right font-bold text-red-500">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div>{formatDocCurrency(alloc.invoice?.balanceAmount || 0, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((alloc.invoice?.balanceAmount || 0) * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(alloc.invoice?.balanceAmount || 0)
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    // Fallback to legacy single invoice link
                                                    (() => {
                                                        const invCurr = currentPayment?.invoice?.currency || companySettings?.currency || 'INR';
                                                        const invRate = getSyncRate(invCurr, companySettings?.currency || 'INR') || 1.0;
                                                        const isInvForeign = invCurr !== (companySettings?.currency || 'INR');
                                                        const allocSum = parseFloat(currentPayment?.amount || 0) + parseFloat(currentPayment?.discountAmount || 0);
                                                        return (
                                                            <tr>
                                                                <td>{currentPayment?.invoice?.invoiceNumber}</td>
                                                                <td>{currentPayment?.invoice?.date ? new Date(currentPayment.invoice.date).toLocaleDateString() : 'N/A'}</td>
                                                                <td className="text-right">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(currentPayment?.invoice?.totalAmount || 0, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency((currentPayment?.invoice?.totalAmount || 0) * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(currentPayment?.invoice?.totalAmount || 0)
                                                                    )}
                                                                </td>
                                                                <td className="text-right">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(allocSum, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(allocSum * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(allocSum)
                                                                    )}
                                                                </td>
                                                                <td className="text-right font-bold text-red-500">
                                                                    {isInvForeign ? (
                                                                        <>
                                                                            <div>{formatDocCurrency(currentPayment?.invoice?.balanceAmount || 0, invCurr)}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency((currentPayment?.invoice?.balanceAmount || 0) * invRate)})</div>
                                                                        </>
                                                                    ) : (
                                                                        formatCurrency(currentPayment?.invoice?.balanceAmount || 0)
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Footer Info */}
                                <div className="SalesPayment-invoice-payment-info-section">
                                    <div className="SalesPayment-invoice-payment-details">
                                        <div className="SalesPayment-payment-detail-row">
                                            <span className="SalesPayment-payment-detail-label">{getReceiptPaymentLabel('notes', 'Remarks / Notes:')}</span>
                                            <span className="SalesPayment-payment-detail-value">{currentPayment?.notes || 'No additional notes.'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Terms & Conditions */}
                                {(() => {
                                    let docTerms = companyDetails.termsReceipt || companyDetails.terms;
                                    if (currentPayment?.customFields) {
                                        try {
                                            const parsed = typeof currentPayment.customFields === 'string' ? JSON.parse(currentPayment.customFields) : currentPayment.customFields;
                                            if (parsed.terms !== undefined) docTerms = parsed.terms;
                                        } catch (e) { }
                                    }
                                    if (!docTerms) return null;
                                    return (
                                        <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', fontSize: '0.85rem', color: '#64748b', border: '1px solid #e2e8f0', textAlign: 'left', width: '100%' }}>
                                            <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Terms & Conditions</div>
                                            <div style={{ whiteSpace: 'pre-line' }}>{docTerms}</div>
                                        </div>
                                    );
                                })()}

                                {/* Signature Section */}
                                <div className="SalesPayment-receipt-signature-section">
                                    <div className="SalesPayment-receipt-signature-box">
                                        <div className="SalesPayment-receipt-signature-line"></div>
                                        <div className="SalesPayment-receipt-signature-label">{getReceiptPaymentLabel('signature', 'Authorized Signature')}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- EDIT / CREATE MODE ---
                            <>
                                {/* Customer Selection Step */}
                                {showCustomerSelect && (
                                    <div className="SalesPayment-selection-container">
                                        <div className="SalesPayment-modal-section-header">
                                            <h3 className="SalesPayment-text-sm font-bold SalesPayment-text-gray-700">Select Customer</h3>
                                            <div className="SalesPayment-selection-search">
                                                <Search size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search customer..."
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="SalesPayment-customer-grid">
                                            {filteredCustomers.map(cust => (
                                                <div key={cust.id} className="SalesPayment-selection-card" onClick={() => handleSelectCustomer(cust)}>
                                                    <div className="SalesPayment-selection-card-icon">
                                                        <Eye size={20} />
                                                    </div>
                                                    <div className="SalesPayment-selection-card-info">
                                                        <div className="SalesPayment-selection-card-title">{cust.name}</div>
                                                        <div className="SalesPayment-selection-card-subtitle">{cust.email || cust.phone || 'No contact info'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredCustomers.length === 0 && <div className="SalesPayment-no-results">No customers found</div>}
                                        </div>
                                    </div>
                                )}

                                {/* Invoice Selection Step */}
                                {showInvoiceSelect && (
                                    <div className="SalesPayment-selection-container">
                                        <div className="SalesPayment-modal-section-header">
                                            <h3 className="SalesPayment-text-sm font-bold SalesPayment-text-gray-700">
                                                Select Unpaid Invoice for {customerName}
                                            </h3>
                                            <button className="SalesPayment-btn-text" onClick={() => setShowCustomerSelect(true)}>Change Customer</button>
                                        </div>
                                        <div className="SalesPayment-invoice-grid">
                                            {invoices.filter(inv => inv.customerId === customerId).map(inv => (
                                                <div key={inv.id} className="SalesPayment-selection-card SalesPayment-invoice-card" onClick={() => handleSelectInvoice(inv)}>
                                                    <div className="SalesPayment-selection-card-info">
                                                        <div className="SalesPayment-selection-card-title">{inv.invoiceNumber}</div>
                                                        <div className="SalesPayment-selection-card-subtitle">Date: {new Date(inv.date).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="SalesPayment-selection-card-action text-right">
                                                        <div className="SalesPayment-amount-label">Due</div>
                                                        <div className="SalesPayment-amount-value">
                                                            {inv.currency && inv.currency !== (companySettings?.currency || 'INR') ? (
                                                                <>
                                                                    <div style={{ fontWeight: '600' }}>{formatDocCurrency(inv.balanceAmount, inv.currency)}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                        ({formatCurrency(inv.balanceAmount * getSyncRate(inv.currency, companySettings?.currency || 'INR'))})
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                formatCurrency(inv.balanceAmount)
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {invoices.filter(inv => inv.customerId === customerId).length === 0 && (
                                                <div className="SalesPayment-no-results">No unpaid invoices for this customer</div>
                                            )}
                                        </div>
                                        <div className="SalesPayment-selection-footer mt-4">
                                            <button className="SalesPayment-btn-secondary w-full" onClick={() => setShowInvoiceSelect(false)}>
                                                Continue without linking to invoice
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!showCustomerSelect && !showInvoiceSelect && (
                                    <div className="SalesPayment-form-container">
                                        {/* Company Info - Read Only (Dynamic) */}
                                      

                                      

                                        {/* Top Form Header Grid (2-Column Layout matching Invoice) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '35rem', marginTop: '1.5rem', marginBottom: '2.5rem' }}>
                                            {/* LEFT COLUMN: Receipt Number, Date, Customer Name */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                                        RECEIPT NUMBER <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="SalesPayment-form-input"
                                                        disabled={isViewMode || !!editId}
                                                        value={receiptNumber}
                                                        onChange={(e) => setReceiptNumber(e.target.value)}
                                                        placeholder="Auto-generated"
                                                    />
                                                </div>

                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                                        REFERENCE ID / CHECK NO.
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="SalesPayment-form-input"
                                                        disabled={isViewMode}
                                                        placeholder="e.g. TRN-12345678"
                                                        value={reference}
                                                        onChange={(e) => setReference(e.target.value)}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                                        PAYMENT DATE <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="SalesPayment-form-input"
                                                        disabled={isViewMode}
                                                        value={paymentDate}
                                                        onChange={(e) => setPaymentDate(e.target.value)}
                                                    />
                                                </div>

                                               
                                            </div>

                                            {/* RIGHT COLUMN: Deposit Account, Reference ID, Exchange Rate */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                                                        RECEIVED FROM (CUSTOMER) <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <select
                                                        className="SalesPayment-form-input"
                                                        disabled={isViewMode}
                                                        value={customerId || ''}
                                                        onChange={(e) => {
                                                            const selectedCustId = e.target.value;
                                                            const cust = customers.find(c => String(c.id) === String(selectedCustId));
                                                            if (cust) {
                                                                handleSelectCustomer(cust);
                                                            } else {
                                                                setCustomerId('');
                                                                setCustomerName('');
                                                                setCustomerLedgerId(null);
                                                                setSelectedInvoiceIds([]);
                                                                setAllocations({});
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Select Customer (Received From)...</option>
                                                        {customers.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name} {c.phone ? `(${c.phone})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                                        DEPOSIT TO / CREDIT TO (ACCOUNT) <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <select
                                                        className="SalesPayment-form-input"
                                                        disabled={isViewMode}
                                                        value={bankLedgerId}
                                                        onChange={(e) => setBankLedgerId(e.target.value)}
                                                    >
                                                        <option value="">Select Account...</option>
                                                        {Object.entries(groupedLedgers).sort().map(([groupName, groupLedgers]) => (
                                                            <optgroup key={groupName} label={groupName}>
                                                                {groupLedgers.map(l => (
                                                                    <option key={l.id} value={l.id}>
                                                                        {l.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                        Select the account where the payment will be credited.
                                                    </div>
                                                </div>

                                             

                                                {(() => {
                                                    const invoiceCurrency = selectedInvoice?.currency || companySettings?.currency || 'INR';
                                                    const baseCurrency = companySettings?.currency || 'INR';
                                                    if (invoiceCurrency !== baseCurrency) {
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                                                                    EXCHANGE RATE ({invoiceCurrency} to {baseCurrency})
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    step="0.000001"
                                                                    className="SalesPayment-form-input"
                                                                    disabled={isViewMode}
                                                                    value={exchangeRate}
                                                                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>


                                        {/* Custom Fields Section */}
                                        {getCustomFieldsForType('receipt').length > 0 && (
                                            <div className="SalesPayment-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Custom Fields
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                    {getCustomFieldsForType('receipt').map(field => (
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
                                                                    disabled={isViewMode}
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
                                                                    disabled={isViewMode}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Inline allocations table */}
                                        <div className="SalesPayment-allocations-section" style={{ marginTop: '24px' }}>
                                            <h3 className="SalesPayment-form-label" style={{ fontWeight: '700', color: '#475569', marginBottom: '10px' }}>Invoice Allocations</h3>
                                            {customerInvoices.length > 0 ? (
                                                <div className="SalesPayment-allocations-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                                                    <table className="SalesPayment-allocations-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                            <tr>
                                                                <th style={{ padding: '8px 16px', width: '50px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={isViewMode}
                                                                        checked={customerInvoices.length > 0 && selectedInvoiceIds.length === customerInvoices.length}
                                                                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                                                                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1e293b' }}
                                                                    />
                                                                </th>
                                                                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Invoice No</th>
                                                                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Date</th>
                                                                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>Total Amount</th>
                                                                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>Due Balance</th>
                                                                <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b', width: '180px' }}>Allocation</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {customerInvoices.map(inv => {
                                                                const invCurr = inv.currency || companySettings?.currency || 'INR';
                                                                const baseCurr = companySettings?.currency || 'INR';
                                                                const syncRate = getSyncRate(invCurr, baseCurr) || 1.0;
                                                                const maxDueRaw = getInvoiceAvailableBalance(inv.id, inv.balanceAmount);
                                                                const maxDueBase = parseFloat((maxDueRaw * syncRate).toFixed(2));
                                                                const rawAlloc = allocations[inv.id];
                                                                const allocatedVal = rawAlloc !== undefined && rawAlloc !== '' ? parseFloat(parseFloat(rawAlloc).toFixed(2)) : '';

                                                                return (
                                                                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: selectedInvoiceIds.includes(inv.id) ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s' }}>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'center', width: '50px' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                disabled={isViewMode}
                                                                                checked={selectedInvoiceIds.includes(inv.id)}
                                                                                onChange={(e) => handleToggleInvoiceSelection(inv, e.target.checked)}
                                                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1e293b' }}
                                                                            />
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1e293b' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <span>{inv.invoiceNumber}</span>
                                                                                <span style={{
                                                                                    fontSize: '10px',
                                                                                    fontWeight: '700',
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '4px',
                                                                                    backgroundColor: (inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE') === 'POS_INVOICE' ? '#eff6ff' : '#f1f5f9',
                                                                                    color: (inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE') === 'POS_INVOICE' ? '#1e40af' : '#475569',
                                                                                    border: '1px solid',
                                                                                    borderColor: (inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE') === 'POS_INVOICE' ? '#bfdbfe' : '#e2e8f0',
                                                                                }}>
                                                                                    {(inv.invoiceType || inv.type || invoiceTypeMap[inv.id] || 'TAX_INVOICE') === 'POS_INVOICE' ? 'POS' : 'Tax'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(inv.date).toLocaleDateString()}</td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1e293b' }}>
                                                                            {invCurr !== baseCurr ? (
                                                                                <>
                                                                                    <div style={{ fontWeight: '600' }}>{formatDocCurrency(inv.totalAmount, invCurr)}</div>
                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(inv.totalAmount * syncRate)})</div>
                                                                                </>
                                                                            ) : (
                                                                                formatCurrency(inv.totalAmount)
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#d97706' }}>
                                                                            {invCurr !== baseCurr ? (
                                                                                <>
                                                                                    <div>{formatDocCurrency(maxDueRaw, invCurr)}</div>
                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency(maxDueBase)})</div>
                                                                                </>
                                                                            ) : (
                                                                                formatCurrency(maxDueRaw)
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>{baseCurr}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    className="SalesPayment-form-input"
                                                                                    disabled={isViewMode || !selectedInvoiceIds.includes(inv.id)}
                                                                                    style={{
                                                                                        margin: 0,
                                                                                        padding: '6px 10px',
                                                                                        textAlign: 'right',
                                                                                        width: '120px',
                                                                                        display: 'inline-block',
                                                                                        borderColor: selectedInvoiceIds.includes(inv.id) ? '#1e293b' : '#e2e8f0',
                                                                                        backgroundColor: selectedInvoiceIds.includes(inv.id) ? 'white' : '#f8fafc',
                                                                                        boxShadow: selectedInvoiceIds.includes(inv.id) ? '0 0 0 2px rgba(30, 41, 59, 0.1)' : 'none',
                                                                                        transition: 'all 0.2s ease'
                                                                                    }}
                                                                                    value={allocatedVal !== undefined && allocatedVal !== null ? allocatedVal : ''}
                                                                                    placeholder="0.00"
                                                                                    min="0"
                                                                                    max={maxDueBase}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const num = parseFloat(val) || 0;
                                                                                        const capped = num > maxDueBase ? maxDueBase : num;
                                                                                        handleAllocationChange(inv.id, val === '' ? '' : capped);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            {allocatedVal !== '' && invCurr !== baseCurr && (
                                                                                <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px', fontWeight: '500' }}>
                                                                                    ({formatDocCurrency(parseFloat((parseFloat(allocatedVal || 0) / syncRate).toFixed(2)), invCurr)})
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div style={{ color: '#64748b', fontSize: '0.875rem', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                                                    {!customerId ? (
                                                        <span>📋 Please select a Customer (Received From) in the header above to load unpaid & partially paid invoices.</span>
                                                    ) : (
                                                        <span>No unpaid invoices found for this customer. Any payment received will be recorded as advance/on account.</span>
                                                    )}
                                                </div>
                                            )}



                                            {/* --- FOOTER CONTROLS MATCHING SPECIFICATION IMAGE --- */}
                                            <div style={{ marginTop: '35px', paddingTop: '16px' }}>

                                                {/* 1. Checkboxes & Extra Controls Row */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    
                                                    {/* Receipt against invoice Checkbox */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            id="receiptAgainstInvoice"
                                                            disabled={isViewMode}
                                                            checked={selectedInvoiceIds.length > 0}
                                                            onChange={() => {}}
                                                            style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                        />
                                                        <label htmlFor="receiptAgainstInvoice" style={{ fontWeight: '700', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '4px', background: '#ffffff' }}>
                                                            Receipt against invoice
                                                        </label>
                                                    </div>

                                                    {/* Discount Row */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#1e293b', fontSize: '0.875rem', minWidth: '110px' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isViewMode}
                                                                checked={showDiscount}
                                                                onChange={e => {
                                                                    setShowDiscount(e.target.checked);
                                                                    if (!e.target.checked) {
                                                                        setDiscountAmount(0);
                                                                        setDiscountPercent('');
                                                                        setDiscountLedgerId('');
                                                                    }
                                                                }}
                                                                style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                            />
                                                            Discount
                                                        </label>

                                                        {showDiscount && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Discount Given:</span>
                                                                    <select
                                                                        className="SalesPayment-form-input"
                                                                        disabled={isViewMode}
                                                                        style={{ minWidth: '220px', height: '34px', padding: '2px 8px', fontSize: '0.85rem', color: '#1e293b', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                                                        value={discountLedgerId || ''}
                                                                        onChange={(e) => setDiscountLedgerId(e.target.value)}
                                                                    >
                                                                        <option value="">Select Account (Direct Expenses)...</option>
                                                                        {(discountLedgers && discountLedgers.length > 0 ? discountLedgers : allLedgers).map(l => (
                                                                            <option key={l.id} value={l.id}>
                                                                                {l.name} {l.accountgroup?.name ? `(${l.accountgroup.name})` : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Mode:</span>
                                                                    <select
                                                                        className="SalesPayment-form-input"
                                                                        disabled={isViewMode}
                                                                        style={{ width: '90px', height: '34px', padding: '2px 6px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontWeight: '600' }}
                                                                        value={discountType}
                                                                        onChange={(e) => setDiscountType(e.target.value)}
                                                                    >
                                                                        <option value="PERCENT">%</option>
                                                                        <option value="AMOUNT">Amount</option>
                                                                    </select>
                                                                </div>

                                                                {discountType === 'PERCENT' ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Discount %:</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="SalesPayment-form-input"
                                                                            style={{ width: '70px', height: '34px', padding: '2px 8px', textAlign: 'right', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                                            disabled={isViewMode}
                                                                            placeholder="0"
                                                                            value={discountPercent}
                                                                            onChange={(e) => {
                                                                                const pctVal = e.target.value;
                                                                                setDiscountPercent(pctVal);
                                                                                const pct = parseFloat(pctVal) || 0;
                                                                                const subTot = totalAllocated || parseFloat(amountReceived || 0);
                                                                                const calcAmt = ((subTot * pct) / 100).toFixed(2);
                                                                                setDiscountAmount(calcAmt);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                                                                            onClick={() => {
                                                                                const pct = parseFloat(discountPercent) || 0;
                                                                                const subTot = totalAllocated || parseFloat(amountReceived || 0);
                                                                                const calcAmt = ((subTot * pct) / 100).toFixed(2);
                                                                                setDiscountAmount(calcAmt);
                                                                            }}
                                                                        >
                                                                            Calculate
                                                                        </button>
                                                                    </div>
                                                                ) : null}

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Discount Value:</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        className="SalesPayment-form-input"
                                                                        style={{ width: '110px', height: '34px', padding: '2px 8px', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                                        disabled={isViewMode}
                                                                        value={discountAmount !== undefined && discountAmount !== null ? discountAmount : ''}
                                                                        onChange={(e) => {
                                                                            const rawVal = e.target.value;
                                                                            if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
                                                                                setDiscountAmount(rawVal);
                                                                                const subTot = totalAllocated || parseFloat(amountReceived || 0);
                                                                                if (subTot > 0 && rawVal !== '') {
                                                                                    const calcPct = ((parseFloat(rawVal) / subTot) * 100).toFixed(2);
                                                                                    setDiscountPercent(calcPct);
                                                                                }
                                                                            }
                                                                        }}
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tax Deducted Row */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#1e293b', fontSize: '0.875rem', minWidth: '110px' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isViewMode}
                                                                checked={showTaxDeducted}
                                                                onChange={e => {
                                                                    setShowTaxDeducted(e.target.checked);
                                                                    if (!e.target.checked) {
                                                                        setTaxDeductedAmount(0);
                                                                        setTaxDeductedPercent('');
                                                                        setTaxDeductedLedgerId('');
                                                                    }
                                                                }}
                                                                style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                            />
                                                            Tax Deducted <span style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 'normal', marginLeft: '4px' }}>(tax if applicable)</span>
                                                        </label>

                                                        {showTaxDeducted && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Tax / TDS Account:</span>
                                                                    <select
                                                                        className="SalesPayment-form-input"
                                                                        disabled={isViewMode}
                                                                        style={{ minWidth: '220px', height: '34px', padding: '2px 8px', fontSize: '0.85rem', color: '#1e293b', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                                                                        value={taxDeductedLedgerId || ''}
                                                                        onChange={(e) => setTaxDeductedLedgerId(e.target.value)}
                                                                    >
                                                                        <option value="">Select Tax Account...</option>
                                                                        {(() => {
                                                                            const taxOptions = allLedgers.filter(l => l.accountgroup?.type === 'ASSETS' || l.name.toLowerCase().includes('tax') || l.name.toLowerCase().includes('tds'));
                                                                            const listToRender = taxOptions.length > 0 ? taxOptions : allLedgers;
                                                                            return listToRender.map(l => (
                                                                                <option key={l.id} value={l.id}>
                                                                                    {l.name} {l.accountgroup?.name ? `(${l.accountgroup.name})` : ''}
                                                                                </option>
                                                                            ));
                                                                        })()}
                                                                    </select>
                                                                </div>

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Mode:</span>
                                                                    <select
                                                                        className="SalesPayment-form-input"
                                                                        disabled={isViewMode}
                                                                        style={{ width: '90px', height: '34px', padding: '2px 6px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontWeight: '600' }}
                                                                        value={taxDeductedType}
                                                                        onChange={(e) => setTaxDeductedType(e.target.value)}
                                                                    >
                                                                        <option value="AMOUNT">Amount</option>
                                                                        <option value="PERCENT">%</option>
                                                                    </select>
                                                                </div>

                                                                {taxDeductedType === 'PERCENT' && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Tax %:</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="SalesPayment-form-input"
                                                                            style={{ width: '70px', height: '34px', padding: '2px 8px', textAlign: 'right', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                                            disabled={isViewMode}
                                                                            placeholder="0"
                                                                            value={taxDeductedPercent}
                                                                            onChange={(e) => {
                                                                                const pctVal = e.target.value;
                                                                                setTaxDeductedPercent(pctVal);
                                                                                const pct = parseFloat(pctVal) || 0;
                                                                                const subTot = totalAllocated || parseFloat(amountReceived || 0);
                                                                                const calcAmt = ((subTot * pct) / 100).toFixed(2);
                                                                                setTaxDeductedAmount(calcAmt);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}

                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Tax Amount:</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        className="SalesPayment-form-input"
                                                                        style={{ width: '110px', height: '34px', padding: '2px 8px', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                                        disabled={isViewMode}
                                                                        value={taxDeductedAmount || ''}
                                                                        onChange={(e) => {
                                                                            const rawVal = e.target.value;
                                                                            if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
                                                                                setTaxDeductedAmount(rawVal);
                                                                                const subTot = totalAllocated || parseFloat(amountReceived || 0);
                                                                                if (subTot > 0 && rawVal !== '') {
                                                                                    const calcPct = ((parseFloat(rawVal) / subTot) * 100).toFixed(2);
                                                                                    setTaxDeductedPercent(calcPct);
                                                                                }
                                                                            }
                                                                        }}
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Advance Payment Row */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#1e293b', fontSize: '0.875rem', minWidth: '110px' }}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={isViewMode}
                                                                checked={showAdvance}
                                                                onChange={e => {
                                                                    setShowAdvance(e.target.checked);
                                                                    if (!e.target.checked) {
                                                                        setAdvanceAmount(0);
                                                                    }
                                                                }}
                                                                style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                            />
                                                            Advance Payment <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 'normal', marginLeft: '4px' }}>(on account)</span>
                                                        </label>

                                                        {showAdvance && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Advance Amount:</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        className="SalesPayment-form-input"
                                                                        style={{ width: '120px', height: '34px', padding: '2px 8px', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem', boxSizing: 'border-box' }}
                                                                        disabled={isViewMode}
                                                                        value={advanceAmount !== undefined && advanceAmount !== null ? advanceAmount : ''}
                                                                        onChange={(e) => {
                                                                            const rawVal = e.target.value;
                                                                            if (rawVal === '' || /^\d*\.?\d*$/.test(rawVal)) {
                                                                                setAdvanceAmount(rawVal);
                                                                            }
                                                                        }}
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 2. Bottom Section: Narration on Left, Totals & Actions on Right */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem', alignItems: 'flex-start', marginTop: '50px' }}>
                                                    
                                                    {/* Left: Narration Notes */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
                                                            Narration
                                                        </label>
                                                       
                                                        <textarea
                                                            className="SalesPayment-form-textarea"
                                                            style={{ height: '90px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: '0.875rem' }}
                                                            disabled={isViewMode}
                                                            placeholder="Enter narration / notes..."
                                                            value={notes}
                                                            onChange={(e) => setNotes(e.target.value)}
                                                        ></textarea>
                                                    </div>

                                                    {/* Right: Sub Total, Total Amount & Actions */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                                            <span style={{ color: '#64748b', fontWeight: '600' }}>Sub Total:</span>
                                                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
                                                                {formatCurrency(totalAllocated || parseFloat(amountReceived || 0))}
                                                            </span>
                                                        </div>

                                                        {showDiscount && parseFloat(discountAmount || 0) > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                                                <span style={{ color: '#d97706', fontWeight: '600' }}>Discount:</span>
                                                                <span style={{ fontWeight: '700', color: '#d97706' }}>
                                                                    - {formatCurrency(parseFloat(discountAmount || 0))}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {showTaxDeducted && parseFloat(taxDeductedAmount || 0) > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                                                <span style={{ color: '#9333ea', fontWeight: '600' }}>Tax:</span>
                                                                <span style={{ fontWeight: '700', color: '#9333ea' }}>
                                                                    + {formatCurrency(parseFloat(taxDeductedAmount || 0))}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {showAdvance && parseFloat(advanceAmount || 0) > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                                                <span style={{ color: '#2563eb', fontWeight: '600' }}>Advance Payment:</span>
                                                                <span style={{ fontWeight: '700', color: '#2563eb' }}>
                                                                    + {formatCurrency(parseFloat(advanceAmount || 0))}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '1.05rem' }}>
                                                            <span style={{ fontWeight: '800', color: '#0f172a' }}>Total Amount:</span>
                                                            <span style={{ fontWeight: '800', color: '#334155', fontSize: '1.2rem' }}>
                                                                {formatCurrency(Math.max(0, (totalAllocated || parseFloat(amountReceived || 0)) - parseFloat(discountAmount || 0) + parseFloat(taxDeductedAmount || 0) + parseFloat(advanceAmount || 0)))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {!isViewMode && (
                        <div className="SalesPayment-modal-footer">
                            <div className="SalesPayment-footer-left">
                                <button className="SalesPayment-btn-secondary">
                                    <Printer size={16} /> Print Receipt
                                </button>
                            </div>
                            <div className="SalesPayment-footer-right">
                               
                                <button className="SalesPayment-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button className="SalesPayment-btn-submit" style={{ backgroundColor: '#1e293b' }}  onClick={handleSave}>
                                    {isEditMode ? 'Update Payment' : 'Save Payment'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="SalesPayment-modal-overlay">
                    <div className="SalesPayment-delete-modal-content">
                        <div className="SalesPayment-delete-modal-header">
                            <h2 className="SalesPayment-text-lg font-bold SalesPayment-text-red-600">Delete Payment?</h2>
                            <button className="SalesPayment-close-btn-simple" onClick={() => setShowDeleteModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="SalesPayment-delete-modal-body">
                            <p className="SalesPayment-text-gray-600">
                                Are you sure you want to delete this Payment Record? This will revert the Invoice balance.
                            </p>
                        </div>
                        <div className="SalesPayment-delete-modal-footer">
                            <button className="SalesPayment-btn-plain" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="SalesPayment-btn-delete-confirm" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payment;
