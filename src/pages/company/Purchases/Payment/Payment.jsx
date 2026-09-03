import React, { useState, useEffect, useMemo } from 'react';
import { getStatusStyle } from '../../../../utils/statusStyle';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, Plus, Pencil, Trash2, X,
    FileText, ShoppingCart, Truck, Receipt, CreditCard,
    CheckCircle2, Clock, ArrowRight, Printer, Eye, Wallet, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import './Payment.css';
import './PaymentReceiptView.css';
import './PaymentActionButtons.css';
import purchasePaymentService from '../../../../services/purchasePaymentService';
import purchaseBillService from '../../../../services/purchaseBillService';
import vendorService from '../../../../services/vendorService';
import ledgerService from '../../../../api/ledgerService';
import companyService from '../../../../api/companyService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { BASE_URL } from '../../../../api/axiosInstance';

const Payment = () => {
    const { hasPermission } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const sourceData = location.state?.sourceData;
    const targetPaymentId = location.state?.targetPaymentId;

    const { companySettings, formatCurrency, getSyncRate, getReceiptPaymentLabel, getReceiptPaymentHeader, getDocumentTitle } = useContext(CompanyContext);

    const formatDocCurrency = (amount, currencyCode) => {
        const docCurrency = currencyCode || companySettings?.currency || 'USD';
        const localeMap = {
            'INR': 'en-IN', 'AED': 'ar-AE', 'SAR': 'ar-SA', 'EUR': 'de-DE',
            'GBP': 'en-GB', 'JPY': 'ja-JP', 'CNY': 'zh-CN', 'RUB': 'ru-RU',
            'BRL': 'pt-BR', 'CAD': 'en-CA', 'AUD': 'en-AU', 'PKR': 'en-PK', 'BDT': 'en-BD', 'USD': 'en-US'
        };
        const locale = localeMap[docCurrency] || 'en-US';
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency', currency: docCurrency,
                minimumFractionDigits: 2, maximumFractionDigits: 2
            }).format(amount || 0);
        } catch (e) {
            return `${docCurrency} ${(amount || 0).toFixed(2)}`;
        }
    };

    // â”€â”€ List state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [payments, setPayments] = useState([]);
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

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // â”€â”€ Dropdown data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [vendors, setVendors] = useState([]);
    const [allBills, setAllBills] = useState([]);   // all unpaid bills
    const [accounts, setAccounts] = useState([]);   // all ledger accounts

    // â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [showAddModal, setShowAddModal] = useState(false);
    const [showVendorSelect, setShowVendorSelect] = useState(false);
    const [showBillSelect, setShowBillSelect] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [viewPayment, setViewPayment] = useState(null);

    // â”€â”€ Vendor / Bill selection searches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [vendorSearch, setVendorSearch] = useState('');
    const [billSearch, setBillSearch] = useState('');

    // â”€â”€ Company details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [companyDetails, setCompanyDetails] = useState({
        name: 'My Company', address: '', email: '', phone: '', logo: null
    });

    const companyDetailsRef = React.useRef(companyDetails);
    useEffect(() => {
        companyDetailsRef.current = companyDetails;
    }, [companyDetails]);


    // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [selectedVendorName, setSelectedVendorName] = useState('');
    const [selectedBill, setSelectedBill] = useState(null);
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState(0);
    const [paymentMeta, setPaymentMeta] = useState({
        manualNo: '', date: new Date().toISOString().split('T')[0], mode: 'Bank Transfer'
    });
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [discountLedgerId, setDiscountLedgerId] = useState('');
    const [discountLedgers, setDiscountLedgers] = useState([]);
    const [allocations, setAllocations] = useState({}); // Stores { [billId]: allocatedAmount }
    const [exchangeRate, setExchangeRate] = useState(1.0);
    const [selectedBillIds, setSelectedBillIds] = useState([]);
    const [showDiscount, setShowDiscount] = useState(false);

    // Footer options state matching requested UI
    const [receiptAgainstInvoice, setReceiptAgainstInvoice] = useState(true);
    const [discountMode, setDiscountMode] = useState('%');
    const [discountPercent, setDiscountPercent] = useState('0');
    const [showTaxDeducted, setShowTaxDeducted] = useState(false);
    const [taxLedgerId, setTaxLedgerId] = useState('');
    const [taxMode, setTaxMode] = useState('Amount');
    const [taxAmount, setTaxAmount] = useState(0);
    const [showAdvance, setShowAdvance] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState(0);

    useEffect(() => {
        const baseCurrency = companySettings?.currency || 'USD';
        const billCurrency = selectedBill?.currency || baseCurrency;
        if (billCurrency !== baseCurrency) {
            const liveRate = getSyncRate(billCurrency, baseCurrency) || 1.0;
            setExchangeRate(liveRate);
        } else {
            setExchangeRate(1.0);
        }
    }, [selectedBill, companySettings]);

    const getBillAvailableBalance = (billId, baseBalance) => {
        let balance = parseFloat(baseBalance || 0);
        if (editingId && viewPayment?.allocations) {
            const alloc = viewPayment.allocations.find(a => a.purchaseBillId === billId);
            if (alloc) {
                balance += parseFloat(alloc.amount || 0);
            }
        }
        return parseFloat(balance.toFixed(2));
    };

    const getBillRate = (bill) => {
        if (!bill) return 1.0;
        const baseCurr = companySettings?.currency || 'USD';
        const billCurr = bill.currency || baseCurr;
        if (billCurr === baseCurr) return 1.0;
        return getSyncRate(billCurr, baseCurr) || 1.0;
    };

    const totalAllocatedBase = useMemo(() => {
        return Object.entries(allocations).reduce((sum, [billId, val]) => {
            const num = parseFloat(val || 0);
            if (!num) return sum;
            const bill = allBills.find(b => b.id === parseInt(billId));
            const rate = getBillRate(bill);
            return sum + (num * rate);
        }, 0);
    }, [allocations, allBills, companySettings]);

    const totalAllocated = totalAllocatedBase;

    const remainingAmount = useMemo(() => {
        const received = parseFloat(amount || 0);
        const discount = parseFloat(discountAmount || 0);
        return Math.max(0, (received + discount) - totalAllocatedBase);
    }, [amount, discountAmount, totalAllocatedBase]);

    const dueAmount = useMemo(() => {
        if (!selectedBill) return 0;
        let due = parseFloat(selectedBill.balanceAmount || 0);
        if (editingId) {
            const p = payments.find(pay => pay.id === editingId);
            if (p) {
                due += parseFloat(p.amount || 0) + parseFloat(p.discountAmount || 0);
            }
        }
        return due;
    }, [selectedBill, editingId, payments]);

    // â”€â”€ Initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        fetchInitialData();
        fetchPayments();
    }, []);

    useEffect(() => {
        if (targetPaymentId && payments.length > 0) {
            const p = payments.find(pay => pay.id === targetPaymentId);
            if (p) {
                handleView(p);
                // Clear navigation state
                navigate(location.pathname, { replace: true, state: { ...location.state, targetPaymentId: undefined } });
            }
        }
    }, [targetPaymentId, payments]);

    // Handle source data auto-fill (from Bill page)
    useEffect(() => {
        if (sourceData && !editingId && allBills.length > 0) {
            const bill = allBills.find(b => b.id === parseInt(sourceData.billId));
            if (bill) {
                const vendor = vendors.find(v => v.id === bill.vendorId);
                setSelectedVendorId(bill.vendorId);
                setSelectedVendorName(vendor?.name || '');
                setSelectedBill(bill);
                const roundedBal = parseFloat(Number(bill.balanceAmount || 0).toFixed(2));
                setAmount(roundedBal);
                setSelectedBillIds([parseInt(bill.id)]);
                setAllocations({ [bill.id]: roundedBal });
            }
            setShowAddModal(true);
        }
    }, [sourceData, editingId, allBills]);

    // Auto-fetch next Payment Number when opening create modal
    useEffect(() => {
        if (showAddModal && !editingId && !paymentMeta.manualNo) {
            const companyId = GetCompanyId();
            if (companyId) {
                purchasePaymentService.getNextNumber(companyId)
                    .then(res => {
                        const nextNum = res?.nextNumber || res?.data?.nextNumber;
                        if (nextNum) {
                            setPaymentMeta(prev => ({
                                ...prev,
                                manualNo: nextNum
                            }));
                        }
                    })
                    .catch(err => console.error('Error fetching next payment number:', err));
            }
        }
    }, [showAddModal, editingId, paymentMeta.manualNo]);

    const fetchInitialData = async () => {
        try {
            const companyId = GetCompanyId();
            const [vendorRes, billRes, ledgerRes, companyRes] = await Promise.all([
                vendorService.getAllVendors(companyId),
                purchaseBillService.getBills(companyId),
                ledgerService.getAll(companyId),
                companyId ? companyService.getById(companyId) : Promise.resolve(null)
            ]);

            setVendors(vendorRes.data || vendorRes || []);

            if (billRes.success) {
                setAllBills(billRes.data.filter(b => b.balanceAmount > 0));
            }

            if (ledgerRes.data) {
                const allLeds = ledgerRes.data.data || ledgerRes.data || [];
                // Show Cash/Bank accounts and Equity accounts
                setAccounts(allLeds.filter(l =>
                    (l.accountgroup?.type === 'ASSETS' &&
                        !l.customerId &&
                        !l.vendorId &&
                        (l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank'))) ||
                    l.accountgroup?.type === 'EQUITY'
                ));

                // Direct Income filter
                setDiscountLedgers(allLeds.filter(l =>
                    l.accountgroup?.type === 'INCOME' &&
                    (l.accountsubgroup?.name?.toLowerCase().includes('sales') ||
                        l.accountsubgroup?.name?.toLowerCase().includes('direct') ||
                        l.name.toLowerCase().includes('sales') ||
                        l.name.toLowerCase().includes('direct') ||
                        l.name.toLowerCase().includes('discount received') ||
                        l.name.toLowerCase().includes('other income'))
                ));
            }

            if (companyRes?.data) {
                setCompanyDetails(companyRes.data);
                companyDetailsRef.current = companyRes.data;
                if (!editingId) {
                    setNotes(companyRes.data.notes || '');
                    setTerms(companyRes.data.termsReceipt || companyRes.data.terms || '');
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load data');
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await purchasePaymentService.getPayments(companyId);
            setPayments(res.data || res || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle Deep Link from Navigation State
    useEffect(() => {
        if (targetPaymentId && payments.length > 0) {
            if (location.state?.isEdit || location.state?.autoEdit) {
                setIsViewMode(false);
                setViewPayment(null);
                handleEdit(parseInt(targetPaymentId));
            } else {
                setShowAddModal(false);
                const payObj = payments.find(p => p.id === parseInt(targetPaymentId)) || { id: parseInt(targetPaymentId) };
                handleView(payObj);
            }
            navigate(location.pathname, { replace: true, state: { ...location.state, targetPaymentId: undefined } });
        }
    }, [targetPaymentId, payments]);

    const handleStatusChange = async (paymentId, newStatus) => {
        try {
            const companyId = GetCompanyId();
            const payload = {
                onlyUpdateStatus: true,
                manualStatus: newStatus !== 'AUTO',
                status: newStatus === 'AUTO' ? undefined : newStatus
            };
            const res = await purchasePaymentService.updatePayment(paymentId, payload, companyId);
            if (res?.success || res?.data?.success) {
                toast.success('Status updated');
                fetchPayments();
            }
        } catch (error) {
            console.error('Error changing status:', error);
            toast.error('Failed to update status');
        }
    };

    // â”€â”€ Filtered / derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const q = searchTerm.toLowerCase();
            const matchSearch = !q ||
                p.paymentNumber?.toLowerCase().includes(q) ||
                p.vendor?.name?.toLowerCase().includes(q) ||
                p.purchasebill?.billNumber?.toLowerCase().includes(q);
            const dateObj = new Date(p.date);
            const matchStart = !startDate || dateObj >= new Date(startDate);
            const matchEnd = !endDate || dateObj <= new Date(endDate);
            return matchSearch && matchStart && matchEnd;
        });
    }, [payments, searchTerm, startDate, endDate]);

    const filteredVendors = useMemo(() =>
        vendors.filter(v =>
            v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
            v.email?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
            v.phone?.toLowerCase().includes(vendorSearch.toLowerCase())
        ),
        [vendors, vendorSearch]);

    // Bills for the selected vendor
    const vendorBills = useMemo(() => {
        if (!selectedVendorId) return [];
        let list = allBills.filter(b => b.vendorId === parseInt(selectedVendorId));

        // If editing, include any bills that are already allocated in this payment
        if (editingId && viewPayment?.allocations) {
            viewPayment.allocations.forEach(alloc => {
                const alreadyInList = list.some(item => item.id === alloc.purchaseBillId);
                if (!alreadyInList && alloc.purchasebill) {
                    list.push(alloc.purchasebill);
                }
            });
        }
        return list;
    }, [allBills, selectedVendorId, editingId, viewPayment]);

    // Sync selectedBill with selectedBillIds
    useEffect(() => {
        if (selectedBillIds.length > 0) {
            const firstBill = vendorBills.find(b => selectedBillIds.includes(b.id));
            if (firstBill) setSelectedBill(firstBill);
        } else {
            setSelectedBill(null);
        }
    }, [selectedBillIds, vendorBills]);

    // Filtered by search term
    const filteredVendorBills = useMemo(() => {
        if (!billSearch.trim()) return vendorBills;
        const q = billSearch.toLowerCase();
        return vendorBills.filter(b =>
            b.billNumber?.toLowerCase().includes(q)
        );
    }, [vendorBills, billSearch]);

    // Group all ledger accounts by account group
    const groupedAccounts = useMemo(() => {
        return accounts.reduce((acc, ledger) => {
            const group = ledger.accountgroup?.name || 'Other Accounts';
            if (!acc[group]) acc[group] = [];
            acc[group].push(ledger);
            return acc;
        }, {});
    }, [accounts]);

    // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const resetForm = () => {
        setEditingId(null);
        setSelectedVendorId('');
        setSelectedVendorName('');
        setSelectedBill(null);
        setSelectedBillIds([]);
        setAccountId('');
        setAmount(0);
        setExchangeRate(1.0);
        setDiscountAmount(0);
        setDiscountLedgerId('');
        setVendorSearch('');
        setBillSearch('');
        setAllocations({});
        setPaymentMeta({ manualNo: '', date: new Date().toISOString().split('T')[0], mode: 'Bank Transfer' });
        setNotes(companyDetailsRef.current.notes || '');
        setTerms(companyDetailsRef.current.termsReceipt || companyDetailsRef.current.terms || '');
        setCustomFieldValues({});
        setShowDiscount(false);
        setReceiptAgainstInvoice(true);
        setDiscountMode('%');
        setDiscountPercent('0');
        setShowTaxDeducted(false);
        setTaxLedgerId('');
        setTaxMode('Amount');
        setTaxAmount(0);
        setShowAdvance(false);
        setAdvanceAmount(0);
        setIsViewMode(false);
        setViewPayment(null);
    };

    const calcAllocationsTotalBase = (allocMap) => {
        return Object.entries(allocMap).reduce((sum, [bId, val]) => {
            const num = parseFloat(val || 0);
            if (!num) return sum;
            const b = allBills.find(x => x.id === parseInt(bId));
            const rate = getBillRate(b);
            return sum + (num * rate);
        }, 0);
    };

    const handleAllocationChange = (billId, value) => {
        setAllocations(prev => {
            const updated = { ...prev };
            if (value === '' || parseFloat(value) === 0) {
                delete updated[billId];
                setSelectedBillIds(prevIds => prevIds.filter(id => id !== billId));
            } else {
                const rawNum = parseFloat(value) || 0;
                const b = allBills.find(x => x.id === parseInt(billId));
                const maxDue = getBillAvailableBalance(billId, b?.balanceAmount);
                const capped = rawNum > maxDue ? maxDue : rawNum;
                updated[billId] = parseFloat(capped.toFixed(2));
                setSelectedBillIds(prevIds => prevIds.includes(billId) ? prevIds : [...prevIds, billId]);
            }
            const newTotalAllocatedBase = calcAllocationsTotalBase(updated);
            const totalLimitBase = parseFloat(amount || 0) + parseFloat(discountAmount || 0);
            if (newTotalAllocatedBase > totalLimitBase) {
                const cashNeededBase = Math.max(0, newTotalAllocatedBase - parseFloat(discountAmount || 0));
                setAmount(parseFloat(cashNeededBase.toFixed(2)));
            }
            return updated;
        });
    };

    const handleToggleBillSelection = (bill, isChecked) => {
        const billId = bill.id;
        if (isChecked) {
            setSelectedBillIds(prev => [...prev, billId]);
            const maxDueBill = getBillAvailableBalance(billId, bill.balanceAmount);
            const roundedMaxDue = parseFloat(maxDueBill.toFixed(2));
            setAllocations(prev => {
                const updated = { ...prev, [billId]: roundedMaxDue };
                const newTotalAllocatedBase = calcAllocationsTotalBase(updated);
                const discountVal = parseFloat(discountAmount || 0);
                setAmount(parseFloat(Math.max(0, newTotalAllocatedBase - discountVal).toFixed(2)));
                return updated;
            });
        } else {
            setSelectedBillIds(prev => prev.filter(id => id !== billId));
            setAllocations(prev => {
                const updated = { ...prev };
                delete updated[billId];
                const newTotalAllocatedBase = calcAllocationsTotalBase(updated);
                const discountVal = parseFloat(discountAmount || 0);
                setAmount(parseFloat(Math.max(0, newTotalAllocatedBase - discountVal).toFixed(2)));
                return updated;
            });
        }
    };

    const handleToggleSelectAll = (isChecked) => {
        if (isChecked) {
            const allIds = vendorBills.map(b => b.id);
            setSelectedBillIds(allIds);

            const newAllocs = {};
            let totalDueBase = 0;

            vendorBills.forEach(b => {
                const maxDueBill = parseFloat(getBillAvailableBalance(b.id, b.balanceAmount).toFixed(2));
                newAllocs[b.id] = maxDueBill;
                const rate = getBillRate(b);
                totalDueBase += maxDueBill * rate;
            });

            setAllocations(newAllocs);
            const discountVal = parseFloat(discountAmount || 0);
            setAmount(parseFloat(Math.max(0, totalDueBase - discountVal).toFixed(2)));
        } else {
            setSelectedBillIds([]);
            setAllocations({});
            setAmount(0);
        }
    };

    const handleAmountChange = (val) => {
        const numVal = parseFloat(val) || 0;
        setAmount(val);

        if (selectedBillIds.length > 0) {
            setAllocations(prev => {
                const updated = { ...prev };
                let remainingBase = numVal + parseFloat(discountAmount || 0);

                const selectedInvs = vendorBills.filter(b => selectedBillIds.includes(b.id));
                selectedInvs.sort((a, b) => new Date(a.date) - new Date(b.date));

                selectedInvs.forEach(b => {
                    const maxDueBill = parseFloat(getBillAvailableBalance(b.id, b.balanceAmount).toFixed(2));
                    const rate = getBillRate(b);
                    const maxDueBase = maxDueBill * rate;

                    if (remainingBase >= maxDueBase - 0.001) {
                        updated[b.id] = maxDueBill;
                        remainingBase -= maxDueBase;
                    } else if (remainingBase > 0) {
                        const allocInBill = parseFloat(Math.min(maxDueBill, remainingBase / rate).toFixed(2));
                        updated[b.id] = allocInBill;
                        remainingBase = 0;
                    } else {
                        updated[b.id] = 0;
                    }
                });
                return updated;
            });
        }
    };

    const handleAddNew = async () => {
        resetForm();
        let nextPayNo = '';
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await companyService.getNextNumber(companyId, 'payment');
                if (res.data && res.data.success) {
                    nextPayNo = res.data.nextNumber;
                }
            }
        } catch (error) {
            console.error('Error fetching next payment number:', error);
        }
        setPaymentMeta(prev => ({
            ...prev,
            manualNo: nextPayNo
        }));
        setShowVendorSelect(false);
        setShowBillSelect(false);
        setShowAddModal(true);
    };

    const handleSelectVendor = (vendor) => {
        setSelectedVendorId(vendor.id);
        setSelectedVendorName(vendor.name);
        setSelectedBill(null);
        setAmount(0);
        setVendorSearch('');
        setBillSearch('');
        setShowVendorSelect(false);
        setShowBillSelect(false);
        setSelectedBillIds([]);
        setAllocations({});
    };

    const handleSelectBill = (bill) => {
        setSelectedBill(bill);
        const roundedBal = parseFloat(Number(bill.balanceAmount || 0).toFixed(2));
        setAmount(roundedBal);
        setAllocations({ [bill.id]: roundedBal });
        setSelectedBillIds([bill.id]);
        setNotes(`Payment for Bill #${bill.billNumber}${companyDetails.notes ? '\n\n' + companyDetails.notes : ''}`);
        setShowBillSelect(false);
    };

    const handleEdit = (id) => {
        const p = payments.find(pay => pay.id === id);
        if (p) {
            resetForm();
            setEditingId(id);
            setSelectedVendorId(p.vendorId);
            setSelectedVendorName(p.vendor?.name || '');
            setSelectedBill(p.purchasebill || null);
            setAmount(p.amount);
            setDiscountAmount(p.discountAmount || 0);
            setDiscountLedgerId(p.discountLedgerId || '');
            setAccountId(p.cashBankAccountId || '');
            setShowDiscount(parseFloat(p.discountAmount || 0) > 0);
            setPaymentMeta({
                manualNo: p.paymentNumber,
                date: p.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                mode: p.paymentMode || 'Bank Transfer'
            });
            setNotes(p.notes || '');

            const newAllocs = {};
            const discAmount = parseFloat(p.discountAmount || 0);
            const loadedBillIds = [];
            if (p.allocations && p.allocations.length > 0) {
                p.allocations.forEach((a, idx) => {
                    newAllocs[a.purchaseBillId] = parseFloat(a.amount) + (idx === 0 ? discAmount : 0);
                    loadedBillIds.push(a.purchaseBillId);
                });
            } else if (p.purchaseBillId && p.amount) {
                newAllocs[p.purchaseBillId] = parseFloat(p.amount) + discAmount;
                loadedBillIds.push(p.purchaseBillId);
            }
            setAllocations(newAllocs);
            setSelectedBillIds(loadedBillIds);

            let fieldValues = {};
            if (p.customFields) {
                try {
                    fieldValues = typeof p.customFields === 'string'
                        ? JSON.parse(p.customFields)
                        : p.customFields;
                    if (fieldValues.terms !== undefined) {
                        setTerms(fieldValues.terms || '');
                    } else {
                        setTerms(companyDetails.termsReceipt || companyDetails.terms || '');
                    }
                } catch (e) {
                    console.error('Error parsing custom fields on edit:', e);
                    setTerms(companyDetails.termsReceipt || companyDetails.terms || '');
                }
            } else {
                setTerms(companyDetails.termsReceipt || companyDetails.terms || '');
            }
            setCustomFieldValues(fieldValues);

            setShowVendorSelect(false);
            setShowBillSelect(false);
            setShowAddModal(true);
        }
    };

    const handleView = async (payment) => {
        try {
            const companyId = GetCompanyId();
            const res = await purchasePaymentService.getPaymentById(payment.id, companyId);
            setViewPayment(res?.data || payment);
            setIsViewMode(true);
        } catch {
            setViewPayment(payment);
            setIsViewMode(true);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDelete = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            await purchasePaymentService.deletePayment(deleteId, companyId);
            toast.success('Payment deleted');
            fetchPayments();
            fetchInitialData();
        } catch (e) { console.error(e); }
        setShowDeleteConfirm(false);
        setDeleteId(null);
    };

    const handleSave = async () => {
        if (!selectedVendorId) { toast.error('Please select a vendor'); return; }
        const advanceVal = showAdvance ? parseFloat(advanceAmount || 0) : 0;
        const totalAmount = parseFloat(amount || 0) + advanceVal;
        if (totalAmount <= 0) { toast.error('Please enter a valid payment or advance amount'); return; }
        if (!accountId) { toast.error('Please select a payment account'); return; }
        if (parseFloat(discountAmount || 0) > 0 && !discountLedgerId) { toast.error('Please select a Discount Account'); return; }

        const companyId = GetCompanyId();
        const discountVal = parseFloat(discountAmount || 0);
        const allocationsArray = Object.entries(allocations)
            .filter(([billId]) => selectedBillIds.includes(parseInt(billId)))
            .map(([billId, amountVal], index) => {
                let allocAmount = parseFloat(amountVal);
                if (index === 0) {
                    allocAmount = Math.max(0, allocAmount - discountVal);
                }
                return {
                    purchaseBillId: parseInt(billId),
                    amount: allocAmount
                };
            });

        const payload = {
            paymentNumber: paymentMeta.manualNo || `PAY-${Date.now()}`,
            vendorId: parseInt(selectedVendorId),
            purchaseBillId: selectedBill ? parseInt(selectedBill.id) : null,
            cashBankAccountId: accountId ? parseInt(accountId) : null,
            date: paymentMeta.date,
            // advanceAmount is added to the total so backend books DR Vendor / CR Bank for the full amount
            amount: totalAmount,
            advanceAmount: advanceVal,
            discountAmount: showDiscount ? parseFloat(discountAmount || 0) : 0,
            discountLedgerId: showDiscount && discountLedgerId ? parseInt(discountLedgerId) : null,
            taxAmount: showTaxDeducted ? parseFloat(taxAmount || 0) : 0,
            taxLedgerId: showTaxDeducted && taxLedgerId ? parseInt(taxLedgerId) : null,
            paymentMode: paymentMeta.mode,
            companyId,
            notes,
            allocations: allocationsArray,
            customFields: JSON.stringify({
                ...customFieldValues,
                terms: terms
            }),
            exchangeRate: (selectedBill?.currency !== companySettings?.currency) ? parseFloat(exchangeRate) : 1.0
        };


        try {
            if (editingId) {
                await purchasePaymentService.updatePayment(editingId, payload, companyId);
                toast.success('Payment updated');
            } else {
                await purchasePaymentService.createPayment(payload);
                toast.success('Payment recorded');
            }
            setShowAddModal(false);
            resetForm();
            fetchPayments();
            fetchInitialData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to save payment');
        }
    };

    const purchaseProcess = [
        { id: 'quotation', label: 'Quotation', icon: FileText, status: 'completed' },
        { id: 'purchase-order', label: 'Purchase Order', icon: ShoppingCart, status: 'completed' },
        { id: 'grn', label: 'Goods Receipt', icon: Truck, status: 'completed' },
        { id: 'bill', label: 'Bill', icon: Receipt, status: 'completed' },
        { id: 'payment', label: 'Payment', icon: CreditCard, status: 'active' },
    ];

    const selectedVendorObj = vendors.find(v => v.id === parseInt(selectedVendorId));

    return (
        <div className="PurchasePayment-page">

            {!showAddModal && !isViewMode && (
                <React.Fragment>
                    {/* â”€â”€ Page Header â”€â”€ */}
                    <div className="PurchasePayment-header">
                        <div>
                            <h1 className="PurchasePayment-title">Purchase Payments</h1>
                            <p className="PurchasePayment-subtitle">Record and track vendor payments</p>
                        </div>
                        {hasPermission('create purchase payment') && (
                            <button className="PurchasePayment-btn-add" onClick={handleAddNew}>
                                <Plus size={18} /> Record Payment
                            </button>
                        )}
                    </div>

                    {/* â”€â”€ Process Tracker â”€â”€ */}
                    <div className="PurchasePayment-tracker-card">
                        <div className="PurchasePayment-tracker-wrapper">
                            {purchaseProcess.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className={`tracker-step ${step.status}`}>
                                        <div className="PurchasePayment-step-icon">
                                            <step.icon size={20} />
                                            {step.status === 'completed' && <CheckCircle2 className="status-badge" size={14} />}
                                            {step.status === 'active' && <Clock className="status-badge" size={14} />}
                                        </div>
                                        <span className="PurchasePayment-step-label">{step.label}</span>
                                    </div>
                                    {index < purchaseProcess.length - 1 && (
                                        <div className={`tracker-divider ${purchaseProcess[index + 1].status !== 'pending' ? 'active' : ''}`}>
                                            <ArrowRight size={16} />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* â”€â”€ Table Card â”€â”€ */}
                    <div className="PurchasePayment-table-card">

                        {/* Search + Date Filters */}
                        <div className="SalesPayment-table-controls">
                            <div className="SalesPayment-search-control">
                                <Search size={18} className="SalesPayment-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by payment no, vendor, bill.."
                                    className="SalesPayment-search-input"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="SalesPayment-filter-group">
                                <div className="SalesPayment-filter-item">
                                    <span className="text-sm text-gray-500">From:</span>
                                    <input type="date" className="SalesPayment-filter-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="SalesPayment-filter-item">
                                    <span className="text-sm text-gray-500">To:</span>
                                    <input type="date" className="SalesPayment-filter-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="PurchasePayment-table-container">
                            <table className="PurchasePayment-table">
                                <thead>
                                    <tr>
                                        <th>PAYMENT ID</th>
                                        <th>VENDOR</th>
                                        <th>BILL REF</th>
                                        <th>DATE</th>
                                        <th>PAID FROM</th>
                                        {/* <th>MODE</th> */}
                                        <th>AMOUNT</th>
                                        <th>STATUS</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="8" className="text-center p-4">Loading...</td></tr>
                                    ) : filteredPayments.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center p-4">No payments found</td></tr>
                                    ) : (
                                        filteredPayments.map(p => (
                                            <tr key={p.id}>
                                                <td className="PurchasePayment-id-text">#{p.paymentNumber}</td>
                                                <td className="PurchasePayment-vendor-text">{p.vendor?.name}</td>
                                                <td>{p.purchasebill?.billNumber || '-'}</td>
                                                <td>{new Date(p.date).toLocaleDateString()}</td>
                                                <td>{p.bankLedger?.name || '-'}</td>
                                                {/* <td><span className="PurchasePayment-mode-badge">{p.paymentMode}</span></td> */}
                                                <td className="PurchasePayment-amount-text font-semibold">
                                                    {(() => {
                                                        const baseCurr = companySettings?.currency || 'USD';
                                                        const billCurr = p.purchasebill?.currency || (p.allocations && p.allocations[0]?.purchasebill?.currency) || baseCurr;
                                                        const isForeign = billCurr !== baseCurr;
                                                        const liveRate = isForeign ? exchangeRate : 1.0;
                                                        return isForeign ? (
                                                            <>
                                                                <div>{formatDocCurrency(p.amount, billCurr)}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                                                                    ({formatCurrency(p.amount * liveRate)})
                                                                </div>
                                                            </>
                                                        ) : (
                                                            formatCurrency(p.amount)
                                                        );
                                                    })()}
                                                </td>
                                                <td>
                                                    <select
                                                        value={p.manualStatus ? p.status : 'AUTO'}
                                                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                                        className="PurchasePayment-status-pill"
                                                        style={getStatusStyle(p.manualStatus ? p.status : 'AUTO')}
                                                    >
                                                        <option value="AUTO">Auto ({p.status || 'Completed'})</option>
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="COMPLETED">COMPLETED</option>
                                                        <option value="CANCELLED">CANCELLED</option>
                                                    </select>
                                                </td>
                                                <td className="text-right">
                                                    <div className="PurchasePayment-action-buttons">
                                                        <button className="PurchasePayment-btn-icon view" title="View" onClick={() => handleView(p)}><Eye size={16} /></button>
                                                        {hasPermission('edit purchase payment') && (
                                                            <button className="PurchasePayment-btn-icon edit" title="Edit" onClick={() => handleEdit(p.id)}><Pencil size={16} /></button>
                                                        )}
                                                        {hasPermission('delete purchase payment') && (
                                                            <button className="PurchasePayment-btn-icon delete" title="Delete" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
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
                </React.Fragment>
            )}


            {/* FULL PAGE CREATE / EDIT / VIEW CONTAINER */}
            {(showAddModal || isViewMode) && (
                <div className="PurchasePayment-sales-order-full-page-create">
                    {/* Header Bar matching Sales Payment */}
                    <div className="PurchasePayment-view-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
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
                                    {isViewMode ? `Payment Receipt #${viewPayment?.paymentNumber || ''}` : (editingId ? 'Edit Purchase Payment' : 'New Purchase Payment')}
                                </h2>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                {companyDetails.name || 'Company Name'} {companyDetails.phone ? `• ${companyDetails.phone}` : ''} {companyDetails.email ? `• ${companyDetails.email}` : ''}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isViewMode && (
                                <button type="button" onClick={handlePrint} className="PurchasePayment-btn-action print" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                    <Printer size={16} /> Print Receipt
                                </button>
                            )}
                            {!isViewMode && (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="PurchasePayment-btn-action save"
                                    style={{ backgroundColor: '#1e293b', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                // disabled={!selectedVendorId || !accountId || amount <= 0 || (parseFloat(discountAmount || 0) > 0 && !discountLedgerId) || totalAllocated > (parseFloat(amount || 0) + parseFloat(discountAmount || 0))}
                                >
                                    {editingId ? 'Update Payment' : 'Save Payment'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setShowAddModal(false); setIsViewMode(false); setViewPayment(null); resetForm(); }}
                                className="PurchasePayment-btn-action cancel"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <X size={16} /> Back to Payments
                            </button>
                        </div>
                    </div>

                    <div className={`PurchasePayment-modal-body ${isViewMode ? 'PurchasePayment-view-mode-body' : ''}`} style={{ padding: 0 }}>
                        {!isViewMode ? (
                            <React.Fragment>

                                {/* â”€â”€ STEP 1: Vendor Selection â”€â”€ */}
                                {showVendorSelect && (
                                    <div className="SalesPayment-selection-container">
                                        <div className="SalesPayment-modal-section-header">
                                            <h3 className="SalesPayment-text-sm font-bold SalesPayment-text-gray-700">Select Vendor</h3>
                                            <div className="SalesPayment-selection-search">
                                                <Search size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search vendor.."
                                                    value={vendorSearch}
                                                    onChange={e => setVendorSearch(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="SalesPayment-customer-grid">
                                            {filteredVendors.map(v => (
                                                <div key={v.id} className="SalesPayment-selection-card" onClick={() => handleSelectVendor(v)}>
                                                    <div className="SalesPayment-selection-card-icon">
                                                        <User size={20} />
                                                    </div>
                                                    <div className="SalesPayment-selection-card-info">
                                                        <div className="SalesPayment-selection-card-title">{v.name}</div>
                                                        <div className="SalesPayment-selection-card-subtitle">{v.email || v.phone || 'No contact info'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredVendors.length === 0 && <div className="SalesPayment-no-results">No vendors found</div>}
                                        </div>
                                    </div>
                                )}

                                {/* â”€â”€ STEP 2: Bill Selection â”€â”€ */}
                                {showBillSelect && (
                                    <div className="SalesPayment-selection-container">
                                        <div className="SalesPayment-modal-section-header">
                                            <h3 className="SalesPayment-text-sm font-bold SalesPayment-text-gray-700">
                                                Select Unpaid Bill for <span style={{ color: '#3b82f6' }}>{selectedVendorName}</span>
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div className="SalesPayment-selection-search">
                                                    <Search size={14} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search bill no.."
                                                        value={billSearch}
                                                        onChange={e => setBillSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <button className="SalesPayment-btn-text" onClick={() => { setShowVendorSelect(true); setShowBillSelect(false); setBillSearch(''); }}>Change Vendor</button>
                                            </div>
                                        </div>
                                        <div className="SalesPayment-invoice-grid">
                                            {filteredVendorBills.map(bill => {
                                                const baseCurr = companySettings?.currency || 'USD';
                                                const billCurr = bill.currency || baseCurr;
                                                const isForeign = billCurr !== baseCurr;
                                                const liveRate = isForeign ? exchangeRate : 1.0;
                                                return (
                                                    <div key={bill.id} className="SalesPayment-selection-card SalesPayment-invoice-card" onClick={() => handleSelectBill(bill)}>
                                                        <div className="SalesPayment-selection-card-info">
                                                            <div className="SalesPayment-selection-card-title">{bill.billNumber}</div>
                                                            <div className="SalesPayment-selection-card-subtitle">Date: {new Date(bill.date).toLocaleDateString()}</div>
                                                        </div>
                                                        <div className="SalesPayment-selection-card-action text-right">
                                                            <div className="SalesPayment-amount-label">Due</div>
                                                            <div className="SalesPayment-amount-value">
                                                                {isForeign ? (
                                                                    <>
                                                                        <span style={{ color: '#ef4444' }}>{formatDocCurrency(bill.balanceAmount, billCurr)}</span>
                                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px', fontWeight: 'normal' }}>
                                                                            ({formatCurrency(bill.balanceAmount * liveRate)})
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    formatCurrency(bill.balanceAmount)
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredVendorBills.length === 0 && (
                                                <div className="SalesPayment-no-results">
                                                    {billSearch ? `No bills matching "${billSearch}"` : 'No unpaid bills for this vendor'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="SalesPayment-selection-footer mt-4">
                                            <button className="SalesPayment-btn-secondary w-full" onClick={() => setShowBillSelect(false)}>
                                                Continue without linking to a bill
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* â”€â”€ FORM (after vendor/bill chosen or editing) â”€â”€ */}
                                {!showVendorSelect && !showBillSelect && (
                                    <div className="PurchasePayment-form-body">

                                        {/* ——— Form Grid matching Image 1 ——— */}
                                        <div className="PurchasePayment-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>

                                            {/* Left Column */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div className="PurchasePayment-form-group">
                                                    <label className="PurchasePayment-label">RECEIPT NUMBER / PAYMENT NUMBER *</label>
                                                    <input
                                                        type="text"
                                                        value={paymentMeta.manualNo}
                                                        placeholder="e.g. RCV-0008"
                                                        onChange={e => setPaymentMeta({ ...paymentMeta, manualNo: e.target.value })}
                                                        className="PurchasePayment-input font-medium"
                                                    />
                                                </div>

                                                <div className="PurchasePayment-form-group">
                                                    <label className="PurchasePayment-label">REFERENCE ID / CHECK NO.</label>
                                                    <input
                                                        type="text"
                                                        value={paymentMeta.reference || ''}
                                                        placeholder="e.g. TRN-12345678"
                                                        onChange={e => setPaymentMeta({ ...paymentMeta, reference: e.target.value })}
                                                        className="PurchasePayment-input font-medium"
                                                    />
                                                </div>

                                                <div className="PurchasePayment-form-group">
                                                    <label className="PurchasePayment-label">PAYMENT DATE *</label>
                                                    <input
                                                        type="date"
                                                        value={paymentMeta.date}
                                                        onChange={e => setPaymentMeta({ ...paymentMeta, date: e.target.value })}
                                                        className="PurchasePayment-input font-medium"
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div className="PurchasePayment-form-group">
                                                    <label className="PurchasePayment-label">PAID TO (VENDOR) *</label>
                                                    <select
                                                        className="PurchasePayment-select font-medium"
                                                        value={selectedVendorId}
                                                        onChange={(e) => {
                                                            const vId = e.target.value;
                                                            setSelectedVendorId(vId);
                                                            const vObj = vendors.find(v => String(v.id) === String(vId));
                                                            setSelectedVendorName(vObj ? vObj.name : '');
                                                            setSelectedBill(null);
                                                            setSelectedBillIds([]);
                                                            setAllocations({});
                                                        }}
                                                    >
                                                        <option value="">Select Vendor (Paid To)...</option>
                                                        {vendors.map(v => (
                                                            <option key={v.id} value={v.id}>{v.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="PurchasePayment-form-group">
                                                    <label className="PurchasePayment-label">DEPOSIT TO / CREDIT TO (ACCOUNT) *</label>
                                                    <select
                                                        className="PurchasePayment-select font-medium"
                                                        value={accountId}
                                                        onChange={e => setAccountId(e.target.value)}
                                                    >
                                                        <option value="">Select Account...</option>
                                                        {Object.entries(groupedAccounts).sort().map(([groupName, groupLedgers]) => (
                                                            <optgroup key={groupName} label={groupName}>
                                                                {groupLedgers.map(acc => (
                                                                    <option key={acc.id} value={acc.id}>
                                                                        {acc.name} ({formatCurrency(acc.currentBalance)})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                                        Select the account where the payment will be credited.
                                                    </div>
                                                    <div className="PurchasePayment-form-group">
                                                        {(() => {
                                                            const baseCurr = companySettings?.currency || 'USD';
                                                            const billCurr = selectedBill?.currency || baseCurr;
                                                            const isForeign = billCurr !== baseCurr;
                                                            const liveRate = isForeign ? exchangeRate : 1.0;
                                                            return (
                                                                <>
                                                                    <label className="PurchasePayment-label">
                                                                        Amount Paid ({billCurr})
                                                                        {isForeign && (
                                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>
                                                                                ≈ {formatCurrency((parseFloat(amount) || 0) * liveRate)}
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        className="PurchasePayment-input font-bold text-lg"
                                                                        value={(() => {
                                                                            if (amount === undefined || amount === null || amount === '') return '';
                                                                            const num = parseFloat(amount);
                                                                            if (isNaN(num)) return amount;
                                                                            const str = String(amount);
                                                                            if (str.includes('.') && str.split('.')[1].length > 4) {
                                                                                return num.toFixed(2);
                                                                            }
                                                                            return amount;
                                                                        })()}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                                handleAmountChange(val);
                                                                            }
                                                                        }}
                                                                        onBlur={e => {
                                                                            const num = parseFloat(e.target.value);
                                                                            if (!isNaN(num) && num >= 0) {
                                                                                setAmount(num.toFixed(2));
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                                                                e.preventDefault();
                                                                            }
                                                                        }}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        placeholder="0.00"
                                                                    />
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const baseCurr = companySettings?.currency || 'USD';
                                                    const billCurr = selectedBill?.currency || baseCurr;
                                                    if (billCurr !== baseCurr) {
                                                        return (
                                                            <div className="PurchasePayment-form-group">
                                                                <label className="PurchasePayment-label">Exchange Rate ({billCurr} to {baseCurr})</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.000001"
                                                                    className="PurchasePayment-input font-medium"
                                                                    value={exchangeRate}
                                                                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* Custom Fields Section */}
                                            {getCustomFieldsForType('payment').length > 0 && (
                                                <div className="PurchasePayment-form-group full-width" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>
                                                        Custom Fields
                                                    </h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                                        {getCustomFieldsForType('payment').map(field => (
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

                                            {/* Inline allocations table */}
                                            {receiptAgainstInvoice && (
                                                <div className="SalesPayment-allocations-section" style={{ marginTop: '24px', gridColumn: 'span 2' }}>
                                                    <h3 className="SalesPayment-form-label" style={{ fontWeight: '700', color: '#475569', marginBottom: '10px' }}>Bill Allocations</h3>
                                                    {vendorBills.length > 0 ? (
                                                        <div className="SalesPayment-allocations-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                                                            <table className="SalesPayment-allocations-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                    <tr>
                                                                        <th style={{ padding: '8px 16px', width: '50px', textAlign: 'center' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={vendorBills.length > 0 && selectedBillIds.length === vendorBills.length}
                                                                                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                                                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1e293b' }}
                                                                            />
                                                                        </th>
                                                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Bill No</th>
                                                                        <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: '600', color: '#64748b' }}>Date</th>
                                                                        <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>Total Amount</th>
                                                                        <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b' }}>Due Balance</th>
                                                                        <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: '600', color: '#64748b', width: '180px' }}>Allocation</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {vendorBills.map(bill => {
                                                                        const maxDue = getBillAvailableBalance(bill.id, bill.balanceAmount);
                                                                        const rawAlloc = allocations[bill.id];
                                                                        const allocatedVal = (() => {
                                                                            if (rawAlloc === undefined || rawAlloc === null || rawAlloc === '') return '';
                                                                            const num = parseFloat(rawAlloc);
                                                                            if (isNaN(num)) return rawAlloc;
                                                                            const str = String(rawAlloc);
                                                                            if (str.includes('.') && str.split('.')[1].length > 4) {
                                                                                return num.toFixed(2);
                                                                            }
                                                                            return rawAlloc;
                                                                        })();
                                                                        const baseCurr = companySettings?.currency || 'USD';
                                                                        const billCurr = bill.currency || baseCurr;
                                                                        const isForeign = billCurr !== baseCurr;
                                                                        const liveRate = isForeign ? exchangeRate : 1.0;
                                                                        return (
                                                                            <tr key={bill.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: selectedBillIds.includes(bill.id) ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s' }}>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'center', width: '50px' }}>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedBillIds.includes(bill.id)}
                                                                                        onChange={(e) => handleToggleBillSelection(bill, e.target.checked)}
                                                                                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#1e293b' }}
                                                                                    />
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1e293b' }}>{bill.billNumber}</td>
                                                                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(bill.date).toLocaleDateString()}</td>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#1e293b' }}>
                                                                                    {isForeign ? (
                                                                                        <>
                                                                                            <div style={{ fontWeight: '600' }}>{formatDocCurrency(bill.totalAmount, billCurr)}</div>
                                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(bill.totalAmount * liveRate)})</div>
                                                                                        </>
                                                                                    ) : formatCurrency(bill.totalAmount)}
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#d97706' }}>
                                                                                    {isForeign ? (
                                                                                        <>
                                                                                            <div>{formatDocCurrency(maxDue, billCurr)}</div>
                                                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(maxDue * liveRate)})</div>
                                                                                        </>
                                                                                    ) : formatCurrency(maxDue)}
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{billCurr}</span>
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            className="PurchasePayment-input"
                                                                                            disabled={!selectedBillIds.includes(bill.id)}
                                                                                            style={{
                                                                                                margin: 0,
                                                                                                padding: '6px 10px',
                                                                                                textAlign: 'right',
                                                                                                width: '120px',
                                                                                                display: 'inline-block',
                                                                                                borderColor: selectedBillIds.includes(bill.id) ? '#1e293b' : '#e2e8f0',
                                                                                                backgroundColor: selectedBillIds.includes(bill.id) ? 'white' : '#f8fafc',
                                                                                                boxShadow: selectedBillIds.includes(bill.id) ? '0 0 0 2px rgba(30, 41, 59, 0.1)' : 'none',
                                                                                                transition: 'all 0.2s ease'
                                                                                            }}
                                                                                            value={allocatedVal}
                                                                                            placeholder="0.00"
                                                                                            min="0"
                                                                                            max={maxDue}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value;
                                                                                                const num = parseFloat(val) || 0;
                                                                                                const capped = num > maxDue ? maxDue : num;
                                                                                                handleAllocationChange(bill.id, val === '' ? '' : capped);
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                    {isForeign && parseFloat(allocatedVal) > 0 && (
                                                                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                                            ≈ {formatCurrency(parseFloat(allocatedVal) * liveRate)}
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
                                                        <div style={{ color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                                                            No unpaid bills found for this vendor. Any payment made will be recorded as advance/on account.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Allocation Summary Info */}
                                            {(() => {
                                                const baseCurr = companySettings?.currency || 'USD';
                                                const billCurr = selectedBill?.currency || baseCurr;
                                                const isForeign = billCurr !== baseCurr;
                                                const liveRate = isForeign ? exchangeRate : 1.0;
                                                const totalPaid = parseFloat(amount || 0);
                                                const totalLimit = totalPaid + parseFloat(discountAmount || 0);
                                                return (
                                                    <>

                                                        {/* ——— ADVANCED FOOTER OPTIONS CARD (MATCHING USER SCREENSHOT) ——— */}
                                                        <div style={{
                                                            gridColumn: 'span 2',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '10px',
                                                            padding: '16px 20px',
                                                            backgroundColor: '#ffffff',
                                                            marginTop: '20px',
                                                            marginBottom: '24px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '14px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                                        }}>
                                                            {/* Receipt / Payment against invoice checkbox */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    id="receiptAgainstInvoice"
                                                                    checked={receiptAgainstInvoice}
                                                                    onChange={(e) => setReceiptAgainstInvoice(e.target.checked)}
                                                                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                                                />
                                                                <label htmlFor="receiptAgainstInvoice" style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', backgroundColor: '#fff', display: 'inline-block' }}>
                                                                    Receipt against invoice
                                                                </label>
                                                            </div>

                                                            {/* Discount Row */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justify: 'space-between',
                                                                padding: showDiscount ? '10px 14px' : '4px 0',
                                                                backgroundColor: showDiscount ? '#f8fafc' : 'transparent',
                                                                borderRadius: '8px',
                                                                border: showDiscount ? '1px solid #e2e8f0' : 'none',
                                                                flexWrap: 'wrap',
                                                                gap: '12px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        id="showDiscount"
                                                                        checked={showDiscount}
                                                                        onChange={(e) => {
                                                                            setShowDiscount(e.target.checked);
                                                                            if (!e.target.checked) {
                                                                                setDiscountAmount(0);
                                                                                setDiscountPercent('0');
                                                                                setDiscountLedgerId('');
                                                                            }
                                                                        }}
                                                                        style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                                    />
                                                                    <label htmlFor="showDiscount" style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                                                                        Discount
                                                                    </label>
                                                                </div>

                                                                {showDiscount && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Discount Given:</span>
                                                                        <select
                                                                            className="PurchasePayment-select"
                                                                            value={discountLedgerId}
                                                                            onChange={(e) => setDiscountLedgerId(e.target.value)}
                                                                            style={{ width: '220px', padding: '6px 10px', fontSize: '0.85rem' }}
                                                                        >
                                                                            <option value="">Select Account (Direct Expenses)...</option>
                                                                            {discountLedgers.map(acc => (
                                                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                                            ))}
                                                                        </select>

                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Mode:</span>
                                                                        <select
                                                                            className="PurchasePayment-select"
                                                                            value={discountMode}
                                                                            onChange={(e) => setDiscountMode(e.target.value)}
                                                                            style={{ width: '80px', padding: '6px 8px', fontSize: '0.85rem' }}
                                                                        >
                                                                            <option value="%">%</option>
                                                                            <option value="Amount">Amount</option>
                                                                        </select>

                                                                        {discountMode === '%' && (
                                                                            <>
                                                                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Discount %:</span>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={discountPercent}
                                                                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                                                                    style={{ width: '70px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const baseAmt = parseFloat(amount || 0);
                                                                                        const pct = parseFloat(discountPercent || 0);
                                                                                        const calcVal = (baseAmt * pct) / 100;
                                                                                        setDiscountAmount(calcVal.toFixed(2));
                                                                                    }}
                                                                                    style={{ padding: '6px 14px', backgroundColor: '#fef08a', border: '1px solid #fde047', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', color: '#854d0e', cursor: 'pointer' }}
                                                                                >
                                                                                    Calculate
                                                                                </button>
                                                                            </>
                                                                        )}

                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Discount Value:</span>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={discountAmount !== undefined && discountAmount !== null ? discountAmount : ''}
                                                                                onChange={(e) => setDiscountAmount(e.target.value)}
                                                                                placeholder="0"
                                                                                style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '600', backgroundColor: '#fff' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Tax Deducted Row */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justify: 'space-between',
                                                                padding: showTaxDeducted ? '10px 14px' : '4px 0',
                                                                backgroundColor: showTaxDeducted ? '#f8fafc' : 'transparent',
                                                                borderRadius: '8px',
                                                                border: showTaxDeducted ? '1px solid #e2e8f0' : 'none',
                                                                flexWrap: 'wrap',
                                                                gap: '12px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        id="showTaxDeducted"
                                                                        checked={showTaxDeducted}
                                                                        onChange={(e) => {
                                                                            setShowTaxDeducted(e.target.checked);
                                                                            if (!e.target.checked) {
                                                                                setTaxAmount(0);
                                                                                setTaxLedgerId('');
                                                                            }
                                                                        }}
                                                                        style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                                    />
                                                                    <label htmlFor="showTaxDeducted" style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                                                                        Tax Deducted <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 'normal' }}>(tax if applicable)</span>
                                                                    </label>
                                                                </div>

                                                                {showTaxDeducted && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Tax / TDS Account:</span>
                                                                        <select
                                                                            className="PurchasePayment-select"
                                                                            value={taxLedgerId}
                                                                            onChange={(e) => setTaxLedgerId(e.target.value)}
                                                                            style={{ width: '220px', padding: '6px 10px', fontSize: '0.85rem' }}
                                                                        >
                                                                            <option value="">Select Tax Account...</option>
                                                                            {discountLedgers.map(acc => (
                                                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                                            ))}
                                                                        </select>

                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Mode:</span>
                                                                        <select
                                                                            className="PurchasePayment-select"
                                                                            value={taxMode}
                                                                            onChange={(e) => setTaxMode(e.target.value)}
                                                                            style={{ width: '90px', padding: '6px 8px', fontSize: '0.85rem' }}
                                                                        >
                                                                            <option value="Amount">Amount</option>
                                                                            <option value="%">%</option>
                                                                        </select>

                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Tax Amount:</span>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={taxAmount !== undefined && taxAmount !== null ? taxAmount : ''}
                                                                                onChange={(e) => setTaxAmount(e.target.value)}
                                                                                placeholder="0"
                                                                                style={{ width: '90px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '600', backgroundColor: '#fff' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Advance Payment Row */}
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justify: 'space-between',
                                                                padding: showAdvance ? '10px 14px' : '4px 0',
                                                                backgroundColor: showAdvance ? '#f8fafc' : 'transparent',
                                                                borderRadius: '8px',
                                                                border: showAdvance ? '1px solid #e2e8f0' : 'none',
                                                                flexWrap: 'wrap',
                                                                gap: '12px'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        id="showAdvance"
                                                                        checked={showAdvance}
                                                                        onChange={(e) => {
                                                                            setShowAdvance(e.target.checked);
                                                                            if (!e.target.checked) setAdvanceAmount(0);
                                                                        }}
                                                                        style={{ width: '16px', height: '16px', accentColor: '#1e293b', cursor: 'pointer' }}
                                                                    />
                                                                    <label htmlFor="showAdvance" style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                                                                        Advance Payment <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'normal' }}>(on account)</span>
                                                                    </label>
                                                                </div>

                                                                {showAdvance && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Advance Amount:</span>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={advanceAmount !== undefined && advanceAmount !== null ? advanceAmount : ''}
                                                                            onChange={(e) => setAdvanceAmount(e.target.value)}
                                                                            placeholder="0"
                                                                            style={{ width: '110px', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #1e293b', textAlign: 'right', fontWeight: '700', color: '#1e293b', backgroundColor: '#fff' }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* ——— NARRATION & SUMMARY SECTION (IMAGE FOOTER LAYOUT) ——— */}
                                                        <div style={{
                                                            gridColumn: 'span 2',
                                                            display: 'grid',
                                                            gridTemplateColumns: '1fr 340px',
                                                            gap: '24px',
                                                            marginTop: '10px',
                                                            alignItems: 'start'
                                                        }}>
                                                            {/* Left Column: Narration / Notes */}
                                                            <div>
                                                                <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#334155', marginBottom: '8px', display: 'block' }}>
                                                                    Narration
                                                                </label>
                                                                <textarea
                                                                    className="PurchasePayment-textarea"
                                                                    style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '12px', fontSize: '0.875rem', color: '#334155' }}
                                                                    placeholder="Thank you for choosing our company. We appreciate your business. Please contact our support team if you have any questions regarding your order or invoice."
                                                                    value={notes}
                                                                    onChange={e => setNotes(e.target.value)}
                                                                />
                                                                <div className="PurchasePayment-form-group full-width" style={{ marginTop: '12px' }}>
                                                                    <label className="PurchasePayment-label">Terms & Conditions</label>
                                                                    <textarea
                                                                        className="PurchasePayment-textarea"
                                                                        placeholder="Add payment terms.."
                                                                        value={terms}
                                                                        onChange={e => setTerms(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>


                                                            {/* Right Column: Total Summary Box */}
                                                            <div style={{
                                                                backgroundColor: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '10px',
                                                                padding: '16px 20px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b' }}>
                                                                    <span>Sub Total:</span>
                                                                    <span style={{ fontWeight: '700', color: '#1e293b' }}>
                                                                        {formatCurrency(totalAllocatedBase || parseFloat(amount || 0))}
                                                                    </span>
                                                                </div>

                                                                {showDiscount && parseFloat(discountAmount || 0) > 0 && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#d97706' }}>
                                                                        <span>Discount:</span>
                                                                        <span style={{ fontWeight: '700' }}>
                                                                            - {formatCurrency(parseFloat(discountAmount || 0))}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {showTaxDeducted && parseFloat(taxAmount || 0) > 0 && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#9333ea' }}>
                                                                        <span>Tax:</span>
                                                                        <span style={{ fontWeight: '700' }}>
                                                                            + {formatCurrency(parseFloat(taxAmount || 0))}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {showAdvance && parseFloat(advanceAmount || 0) > 0 && (
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#2563eb' }}>
                                                                        <span>Advance Payment:</span>
                                                                        <span style={{ fontWeight: '700' }}>
                                                                            + {formatCurrency(parseFloat(advanceAmount || 0))}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Total Amount:</span>
                                                                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#334155' }}>
                                                                        {formatCurrency(
                                                                            Math.max(0, (totalAllocatedBase + parseFloat(advanceAmount || 0) + parseFloat(taxAmount || 0)) - parseFloat(discountAmount || 0))
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ——— BOTTOM ACTION BUTTONS ——— */}
                                                        <div style={{
                                                            gridColumn: 'span 2',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginTop: '28px',
                                                            paddingTop: '16px',
                                                            borderTop: '1px solid #e2e8f0'
                                                        }}>
                                                            <button
                                                                type="button"
                                                                onClick={handlePrint}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                            >
                                                                <Printer size={16} /> Print Receipt
                                                            </button>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setShowAddModal(false); setIsViewMode(false); setViewPayment(null); resetForm(); }}
                                                                    style={{ border: 'none', backgroundColor: 'transparent', color: '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
                                                                >
                                                                    Cancel
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={handleSave}
                                                                    disabled={!selectedVendorId || !accountId || (amount <= 0 && advanceAmount <= 0) || (parseFloat(discountAmount || 0) > 0 && !discountLedgerId)}
                                                                    style={{
                                                                        padding: '10px 24px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        backgroundColor: '#1e293b',
                                                                        color: '#ffffff',
                                                                        fontWeight: '700',
                                                                        fontSize: '0.95rem',
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 2px 4px rgba(30, 41, 59, 0.3)'
                                                                    }}
                                                                >
                                                                    {editingId ? 'Update Payment' : 'Save Payment'}
                                                                </button>
                                                            </div>
                                                        </div>

                                                    </>
                                                );
                                            })()}
                                        </div>


                                    </div>

                                )}
                            </React.Fragment>
                        ) : (
                            viewPayment && (
                                <div className="pp-receipt-view-container" id="payment-print-area">


                                    <div className="pp-receipt-header">
                                        <div className="pp-receipt-company-section">
                                            {companyDetails.logo && (
                                                <div className="pp-receipt-logo">
                                                    <img src={companyDetails.logo} alt="Company Logo" />
                                                </div>
                                            )}
                                            <div className="pp-receipt-company-details">
                                                <h2 className="pp-receipt-company-name">{companyDetails.name || 'Your Company'}</h2>
                                                {companyDetails.email && <p className="pp-receipt-company-text">{companyDetails.email}</p>}
                                                {companyDetails.phone && <p className="pp-receipt-company-text">{companyDetails.phone}</p>}
                                                {companyDetails.address && <p className="pp-receipt-company-text">{companyDetails.address}</p>}
                                            </div>
                                        </div>
                                        <div className="pp-receipt-meta-section">
                                            <h1 className="pp-receipt-title">{getDocumentTitle('purchasepayment')}</h1>
                                            <div className="pp-receipt-meta-details">
                                                <p>
                                                    <span className="pp-receipt-meta-label">{getReceiptPaymentLabel('number', 'Receipt No:')}</span>
                                                    {viewPayment.paymentNumber}
                                                </p>
                                                <p>
                                                    <span className="pp-receipt-meta-label">{getReceiptPaymentLabel('date', 'Payment Date:')}</span>
                                                    {new Date(viewPayment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                                {viewPayment.purchasebill?.billNumber && (
                                                    <p>
                                                        <span className="pp-receipt-meta-label">{getReceiptPaymentLabel('invoiceRef', 'Invoice Ref:')}</span>
                                                        #{viewPayment.purchasebill.billNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="pp-receipt-qr-code">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(viewPayment.paymentNumber || 'Payment')}`}
                                                    alt="QR"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="PurchasePayment-divider" style={{ margin: '20px 0', borderTop: '1px solid #e2e8f0' }}></div>

                                    {/* ——— Vendor + Payment Summary ——— */}
                                    <div className="pp-receipt-addresses">
                                        <div className="pp-receipt-bill-to">
                                            <h3 className="pp-receipt-section-title">{getReceiptPaymentLabel('receivedFrom', 'RECEIVED FROM:')}</h3>
                                            <p className="pp-receipt-vendor-name">{viewPayment.vendor?.name || '—'}</p>
                                            {viewPayment.vendor?.city && <p className="pp-receipt-vendor-address">{viewPayment.vendor.city}</p>}
                                            {[viewPayment.vendor?.city, viewPayment.vendor?.state].filter(Boolean).length > 0 && (
                                                <p className="pp-receipt-vendor-city">
                                                    {[viewPayment.vendor?.city, viewPayment.vendor?.state].filter(Boolean).join(' ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="pp-receipt-ship-to" style={{ textAlign: 'right' }}>
                                            <h3 className="pp-receipt-section-title" style={{ textAlign: 'right' }}>PAYMENT SUMMARY:</h3>
                                            <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#64748b' }}>{getReceiptPaymentLabel('receivedInto', 'Paid From:')}</span> {viewPayment.bankLedger?.name || 'N/A'}
                                            </p>
                                            <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#64748b' }}>{getReceiptPaymentLabel('mode', 'Payment Mode:')}</span> {viewPayment.paymentMode || 'BANK'}
                                            </p>
                                            <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#64748b' }}>{getReceiptPaymentLabel('refNo', 'Ref No:')}</span> {viewPayment.referenceNo || '1200'}
                                            </p>
                                            {viewPayment.discountAmount > 0 && (
                                                <>
                                                    <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                        <span style={{ color: '#64748b' }}>{getReceiptPaymentLabel('discount', 'Discount Received:')}</span> {formatCurrency(viewPayment.discountAmount)}
                                                    </p>
                                                    <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                        <span style={{ color: '#64748b' }}>{getReceiptPaymentLabel('discountAccount', 'Discount Account:')}</span> {viewPayment.discountLedger?.name || 'N/A'}
                                                    </p>
                                                </>
                                            )}
                                            {(() => {
                                                try {
                                                    const cf = typeof viewPayment.customFields === 'string'
                                                        ? JSON.parse(viewPayment.customFields)
                                                        : (viewPayment.customFields || {});
                                                    const advAmt = parseFloat(cf.advanceAmount || 0);
                                                    if (advAmt > 0) {
                                                        return (
                                                            <p className="pp-receipt-vendor-address" style={{ textAlign: 'right' }}>
                                                                <span style={{ color: '#2563eb', fontWeight: '600' }}>Advance Payment:</span>{' '}
                                                                <span style={{ color: '#2563eb', fontWeight: '700' }}>{formatCurrency(advAmt)}</span>
                                                            </p>
                                                        );
                                                    }
                                                } catch (e) { }
                                                return null;
                                            })()}
                                        </div>
                                    </div>

                                    {/* —— Satisfaction Banner —— */}
                                    <div className="pp-receipt-satisfaction-banner">
                                        <p className="pp-receipt-satisfaction-text">
                                            {(() => {
                                                const baseCurr = companySettings?.currency || 'USD';
                                                const billCurr = viewPayment.purchasebill?.currency || (viewPayment.allocations && viewPayment.allocations[0]?.purchasebill?.currency) || baseCurr;
                                                const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                const isForeign = billCurr !== baseCurr;
                                                const amtStr = isForeign
                                                    ? `${formatDocCurrency(viewPayment.amount, billCurr)} (${formatCurrency(viewPayment.amount * liveRate)})`
                                                    : formatCurrency(viewPayment.amount);
                                                const discStr = viewPayment.discountAmount > 0
                                                    ? (isForeign
                                                        ? `(with ${formatDocCurrency(viewPayment.discountAmount, billCurr)} (${formatCurrency(viewPayment.discountAmount * liveRate)}) discount received)`
                                                        : `(with ${formatCurrency(viewPayment.discountAmount)} discount received)`)
                                                    : '';
                                                return getReceiptPaymentLabel('satisfaction', 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.')
                                                    .replace('{amount}', amtStr)
                                                    .replace('{discountText}', discStr);
                                            })()}
                                        </p>
                                        <span className="pp-receipt-satisfaction-amount">
                                            {(() => {
                                                const baseCurr = companySettings?.currency || 'USD';
                                                const billCurr = viewPayment.purchasebill?.currency || (viewPayment.allocations && viewPayment.allocations[0]?.purchasebill?.currency) || baseCurr;
                                                const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                const isForeign = billCurr !== baseCurr;
                                                return isForeign ? (
                                                    <>
                                                        <div>{formatDocCurrency(viewPayment.amount, billCurr)}</div>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'normal' }}>({formatCurrency(viewPayment.amount * liveRate)})</div>
                                                    </>
                                                ) : formatCurrency(viewPayment.amount);
                                            })()}
                                        </span>
                                    </div>

                                    {/* —— Applied To Bill Section —— */}
                                    {((viewPayment.allocations && viewPayment.allocations.length > 0) || viewPayment.purchasebill) && (
                                        <div className="pp-receipt-applied-section">
                                            <h3 className="pp-receipt-section-title">APPLIED TO BILLS:</h3>
                                            <table className="pp-receipt-table">
                                                <thead>
                                                    <tr>
                                                        <th>{getReceiptPaymentHeader('billNumber', 'Bill Number')}</th>
                                                        <th>{getReceiptPaymentHeader('billDate', 'Bill Date')}</th>
                                                        <th>{getReceiptPaymentHeader('billAmount', 'Bill Amount')}</th>
                                                        <th>{getReceiptPaymentHeader('allocatedAmount', 'Allocated Amount')}</th>
                                                        <th style={{ textAlign: 'right' }}>{getReceiptPaymentHeader('balanceDue', 'Balance Due')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewPayment.allocations && viewPayment.allocations.length > 0 ? (
                                                        viewPayment.allocations.map((alloc, index) => {
                                                            const baseCurr = companySettings?.currency || 'USD';
                                                            const billCurr = alloc.purchasebill?.currency || baseCurr;
                                                            const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                            const isForeign = billCurr !== baseCurr;
                                                            const billTotal = alloc.purchasebill?.totalAmount || 0;
                                                            const allocAmt = parseFloat(alloc.amount || 0) + (index === 0 ? parseFloat(viewPayment.discountAmount || 0) : 0);
                                                            const billBal = alloc.purchasebill?.balanceAmount || 0;
                                                            return (
                                                                <tr key={alloc.id}>
                                                                    <td>{alloc.purchasebill?.billNumber || `ID: ${alloc.purchaseBillId}`}</td>
                                                                    <td>
                                                                        {alloc.purchasebill?.date
                                                                            ? new Date(alloc.purchasebill.date).toLocaleDateString()
                                                                            : '—'
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(billTotal, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(billTotal * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(billTotal)}
                                                                    </td>
                                                                    <td>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(allocAmt, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(allocAmt * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(allocAmt)}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(billBal, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(billBal * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(billBal)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        // Fallback to legacy single bill link
                                                        (() => {
                                                            const baseCurr = companySettings?.currency || 'USD';
                                                            const billCurr = viewPayment.purchasebill?.currency || baseCurr;
                                                            const liveRate = getSyncRate(billCurr, baseCurr) || 1.0;
                                                            const isForeign = billCurr !== baseCurr;
                                                            const billTotal = viewPayment.purchasebill?.totalAmount || (parseFloat(viewPayment.amount || 0) + parseFloat(viewPayment.discountAmount || 0));
                                                            const allocAmt = parseFloat(viewPayment.amount || 0) + parseFloat(viewPayment.discountAmount || 0);
                                                            const billBal = viewPayment.purchasebill?.balanceAmount || 0;
                                                            return (
                                                                <tr>
                                                                    <td>{viewPayment.purchasebill?.billNumber || '—'}</td>
                                                                    <td>
                                                                        {viewPayment.purchasebill?.date
                                                                            ? new Date(viewPayment.purchasebill.date).toLocaleDateString()
                                                                            : '—'
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(billTotal, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(billTotal * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(billTotal)}
                                                                    </td>
                                                                    <td>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(allocAmt, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(allocAmt * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(allocAmt)}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        {isForeign ? (
                                                                            <>
                                                                                <div>{formatDocCurrency(billBal, billCurr)}</div>
                                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({formatCurrency(billBal * liveRate)})</div>
                                                                            </>
                                                                        ) : formatCurrency(billBal)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })()
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Custom Fields View */}
                                    {(() => {
                                        let customFieldVals = {};
                                        if (viewPayment?.customFields) {
                                            try {
                                                customFieldVals = typeof viewPayment.customFields === 'string'
                                                    ? JSON.parse(viewPayment.customFields)
                                                    : viewPayment.customFields;
                                            } catch (e) {
                                                console.error('Error parsing payment custom fields for view:', e);
                                            }
                                        }
                                        const fieldsList = getCustomFieldsForType('payment');
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

                                    {/* ── Footer Section with Remarks and Signature ── */}
                                    <div className="pp-receipt-footer-details">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div className="pp-receipt-remarks" style={{ flex: 1, paddingRight: '2rem' }}>
                                                {viewPayment?.notes && (
                                                    <>
                                                        <div className="pp-receipt-remarks-title">{getReceiptPaymentLabel('notes', 'Remarks / Notes:')}</div>
                                                        <div className="pp-receipt-remarks-content" style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                                                            {viewPayment.notes}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="pp-receipt-signature-section">
                                                <div className="pp-receipt-signature-line"></div>
                                                <div className="pp-receipt-signature-label">{getReceiptPaymentLabel('signature', 'AUTHORIZED SIGNATURE')}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms & Conditions */}
                                    {(() => {
                                        let docTerms = companyDetails.termsReceipt || companyDetails.terms;
                                        if (viewPayment?.customFields) {
                                            try {
                                                const parsed = typeof viewPayment.customFields === 'string' ? JSON.parse(viewPayment.customFields) : viewPayment.customFields;
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
                                </div>
                            )
                        )}
                    </div>
                </div >
            )}

            {/* â”€â”€ Delete Confirmation â”€â”€ */}
            {
                showDeleteConfirm && (
                    <div className="PurchasePayment-delete-modal-overlay">
                        <div className="PurchasePayment-delete-box">
                            <div className="PurchasePayment-delete-header">
                                <h3 className="PurchasePayment-delete-title"><Trash2 size={20} /> Delete Payment?</h3>
                                <button className="PurchasePayment-delete-close-x" onClick={() => setShowDeleteConfirm(false)}><X size={20} /></button>
                            </div>
                            <div className="PurchasePayment-delete-body">
                                <p>Are you sure you want to delete this payment record? This action cannot be undone and will affect your ledger balances.</p>
                            </div>
                            <div className="PurchasePayment-delete-footer">
                                <button className="PurchasePayment-delete-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="PurchasePayment-delete-btn-confirm" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Payment;
