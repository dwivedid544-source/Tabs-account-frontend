import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, X, Eye, Receipt, Upload, Trash, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import voucherService from '../../../services/voucherService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import vendorService from '../../../services/vendorService';
import customerService from '../../../services/customerService';
import productService from '../../../services/productService';
import inventoryService from '../../../services/inventoryService';
import GetCompanyId from '../../../api/GetCompanyId';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import './CreateVoucher.css';
import './PrintVoucher.css';

const CreateVoucher = () => {
    const { formatCurrency, companySettings, getDocumentTitle } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
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
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [vouchers, setVouchers] = useState([]);
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    const filteredVouchers = vouchers.filter(item => {
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
            const vchNo = (item.voucherNumber || '').toLowerCase();
            const notes = (item.notes || '').toLowerCase();
            const party = (item.paidToParty || '').toLowerCase();
            if (!vchNo.includes(q) && !notes.includes(q) && !party.includes(q)) {
                return false;
            }
        }
        return true;
    });
    const [isLoading, setIsLoading] = useState(false);

    // Dropdown Data State
    const [accountList, setAccountList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [productList, setProductList] = useState([]);
    const [warehouseList, setWarehouseList] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        voucherNumber: '',
        voucherType: 'JOURNAL',
        date: new Date().toISOString().split('T')[0],
        companyName: '',
        paidFromAccount: '',
        paidToParty: '',
        notes: ''
    });

    const [items, setItems] = useState([{ id: Date.now(), name: '', rate: 0, qty: 1, amount: 0 }]);
    const [logo, setLogo] = useState(null);
    const [signature, setSignature] = useState(null);

    // Fetch vouchers on component mount
    useEffect(() => {
        fetchVouchers();
        fetchDropdownData();
    }, []);

    // Handle deep-linking of a specific journal voucher
    useEffect(() => {
        if (location.state && location.state.targetJournalId && vouchers.length > 0) {
            const targetId = parseInt(location.state.targetJournalId);
            const voucherObj = vouchers.find(v => v.id === targetId);
            if (voucherObj) {
                if (location.state.isEdit || location.state.autoEdit) {
                    handleEdit(voucherObj);
                } else {
                    handleView(voucherObj);
                }
            }
            // Clear state so re-renders don't re-trigger modal opening
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, vouchers, navigate]);

    const fetchDropdownData = async () => {
        try {
            const companyId = GetCompanyId();
            const [
                ledgersResponse,
                vendorsResponse,
                customersResponse,
                productsResponse,
                warehousesResponse
            ] = await Promise.allSettled([
                chartOfAccountsService.getAllLedgers(companyId),
                vendorService.getAllVendors(companyId),
                customerService.getAllCustomers(companyId),
                productService.getProducts(companyId),
                inventoryService.getWarehouses(companyId)
            ]);

            const getArray = (res) => {
                if (!res) return [];
                if (Array.isArray(res)) return res;
                if (res.data && Array.isArray(res.data)) return res.data;
                return [];
            };

            if (ledgersResponse.status === 'fulfilled') setAccountList(getArray(ledgersResponse.value));
            if (vendorsResponse.status === 'fulfilled') setVendorList(getArray(vendorsResponse.value));
            if (customersResponse.status === 'fulfilled') setCustomerList(getArray(customersResponse.value));
            if (productsResponse.status === 'fulfilled') setProductList(getArray(productsResponse.value));
            if (warehousesResponse.status === 'fulfilled') setWarehouseList(getArray(warehousesResponse.value));

        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            toast.error('Failed to load some dropdown data');
        }
    };

    const fetchVouchers = async () => {
        setIsLoading(true);
        try {
            const companyId = GetCompanyId();
            const response = await voucherService.getVouchers(companyId);
            if (response.success) {
                // Exclude Capital Add and Capital Drawing vouchers — they have their own dedicated pages
                const journalOnly = response.data.filter(v =>
                    v.paidFromAccount !== 'CAPITAL_ADD' && v.paidFromAccount !== 'CAPITAL_DRAWING'
                );
                setVouchers(journalOnly);
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            toast.error('Failed to fetch vouchers');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        if (!selectedVoucher) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'absolute';
        printFrame.style.top = '-1000px';
        printFrame.style.left = '-1000px';
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow.document;

        // Define the styles within the iframe
        const styles = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                .print-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                .logo { max-height: 70px; max-width: 150px; object-fit: contain; }
                .company-details { font-size: 12px; color: #475569; line-height: 1.4; }
                .company-name { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 5px 0; text-transform: uppercase; }
                .voucher-info { text-align: right; }
                .voucher-title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 5px; }
                .voucher-no { font-family: monospace; font-weight: 700; color: #64748b; }
                .v-date { color: #64748b; font-size: 14px; margin-top: 5px; }
                
                .details-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 6px; }
                .detail-group label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
                .detail-group p { margin: 0; font-weight: 600; font-size: 14px; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 12px; font-weight: 700; border: 1px solid #e2e8f0; }
                td { padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; }
                .text-right { text-align: right; }
                
                .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
                .notes-box { flex: 1; margin-right: 40px; }
                .notes-title { font-size: 12px; font-weight: 700; margin-bottom: 5px; }
                .notes-content { font-size: 13px; color: #64748b; border: 1px solid #f1f5f9; padding: 10px; border-radius: 4px; min-height: 60px; }
                
                .totals { width: 220px; }
                .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
                .grand-total { border-top: 2px solid #1e293b; margin-top: 10px; padding-top: 10px; font-weight: 700; font-size: 18px; }
                
                .signature-section { margin-top: 40px; text-align: right; }
                .signature-img { max-height: 60px; margin-bottom: 5px; }
                .sig-label { display: block; font-size: 10px; font-weight: 700; color: #1e293b; border-top: 1px solid #333; width: 180px; margin-left: auto; padding-top: 5px; text-align: center; }
                
                @media print {
                    body { padding: 0; }
                    .print-container { border: none; padding: 0; }
                }
            </style>
        `;

        const content = `
            <div class="print-container">
                <div class="header">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        ${companySettings?.logo ? `<img src="${companySettings.logo}" class="logo" />` : ''}
                        <div class="company-details">
                            <h1 class="company-name">${companySettings?.name || 'Your Company Name'}</h1>
                            <p style="margin: 0;">${companySettings?.address || ''}</p>
                            <p style="margin: 2px 0 0 0;">
                                ${companySettings?.phone ? `Phone: ${companySettings.phone}` : ''}
                                ${companySettings?.email ? ` | Email: ${companySettings.email}` : ''}
                                ${companySettings?.website ? ` | Web: ${companySettings.website}` : ''}
                            </p>
                            ${companySettings?.gstNumber ? `<p style="margin: 2px 0 0 0; font-weight: 600;">GSTIN: ${companySettings.gstNumber}</p>` : ''}
                        </div>
                    </div>
                    <div class="voucher-info">
                        <div class="voucher-title">${(() => {
                            const vt = (selectedVoucher?.voucherType || '').toLowerCase();
                            const key = (vt === 'journal' || vt === 'contra') ? (vt + 'voucher') : vt;
                            return getDocumentTitle(key);
                        })()}</div>
                        <div class="voucher-no">NO: ${selectedVoucher.voucherNumber}</div>
                        <div class="v-date">Date: ${selectedVoucher.date ? new Date(selectedVoucher.date).toLocaleDateString() : ''}</div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="detail-group">
                        <label>VOUCHER TYPE</label>
                        <p>${selectedVoucher.voucherType}</p>
                    </div>
                </div>

                ${(() => {
                    let customFieldVals = {};
                    if (selectedVoucher.customFields) {
                        try {
                            customFieldVals = typeof selectedVoucher.customFields === 'string'
                                ? JSON.parse(selectedVoucher.customFields)
                                : selectedVoucher.customFields;
                        } catch (e) {
                            console.error('Error parsing custom fields for print:', e);
                        }
                    }
                    const fieldsList = getCustomFieldsForType('voucher');
                    const activeCustomFields = fieldsList.filter(f => customFieldVals[f.label]);
                    if (activeCustomFields.length === 0) return '';
                    return `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; text-align: left;">
                            ${activeCustomFields.map(field => `
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">${field.label}</span>
                                    <span style="font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px;">${customFieldVals[field.label] || ''}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                })()}

                <table>
                    <thead>
                        <tr>
                            <th>ACCOUNT / DESCRIPTION</th>
                            <th style="width: 120px" class="text-right">DEBIT</th>
                            <th style="width: 120px" class="text-right">CREDIT</th>
                            <th>NARRATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selectedVoucher.voucheritem?.map(item => `
                            <tr>
                                <td>${item.ledger?.name || item.ledgerName || item.product?.name || item.productName || '-'}</td>
                                <td class="text-right">${item.debit ? formatCurrency(item.debit) : '-'}</td>
                                <td class="text-right">${item.credit ? formatCurrency(item.credit) : '-'}</td>
                                <td>${item.narration || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div class="notes-box">
                        <div class="notes-title">NOTES</div>
                        <div class="notes-content">${selectedVoucher.notes || "No additional notes provided."}</div>
                    </div>
                    <div class="totals">
                        <div class="total-row grand-total">
                            <span>Total Amount</span>
                            <span>${formatCurrency(selectedVoucher.totalAmount || 0)}</span>
                        </div>
                    </div>
                </div>

                ${(companySettings?.notes || companySettings?.terms) ? `
                <div class="company-footer-print" style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; color: #475569;">
                    <div>
                        ${companySettings?.notes ? `
                            <div style="font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 5px; font-size: 10px; letter-spacing: 0.5px;">Notes & Privacy Policy</div>
                            <div style="white-space: pre-line; line-height: 1.4; color: #64748b;">${companySettings.notes}</div>
                        ` : ''}
                    </div>
                    <div>
                        ${companySettings?.terms ? `
                            <div style="font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 5px; font-size: 10px; letter-spacing: 0.5px;">Terms & Conditions</div>
                            <div style="white-space: pre-line; line-height: 1.4; color: #64748b;">${companySettings.terms}</div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                <div class="signature-section">
                    ${selectedVoucher.signature ? `
                        <img src="${selectedVoucher.signature}" class="signature-img" />
                        <span class="sig-label">AUTHORIZED SIGNATURE</span>
                    ` : `
                        <div style="height: 60px"></div>
                        <span class="sig-label">AUTHORIZED SIGNATURE</span>
                    `}
                </div>
            </div>
        `;

        doc.write(`<html><head>${styles}</head><body>${content}</body></html>`);
        doc.close();

        printFrame.contentWindow.focus();
        setTimeout(() => {
            printFrame.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(printFrame);
            }, 500);
        }, 500);
    };

    const handleSubmit = async (allowDuplicate = false) => {
        try {
            if (formData.voucherType === 'JOURNAL') {
                // Journal Validation
                if (Math.abs(journalTotals.dr - journalTotals.cr) > 0.01) {
                    toast.error('Total Debit must equal Total Credit');
                    return;
                }
                if (journalRows.some(r => !r.accountId || !r.type)) {
                    toast.error('All rows must have an Account and Type');
                    return;
                }

                // Payload for Journal
                const voucherData = {
                    ...formData,
                    isJournal: true,
                    journalRows: journalRows.map(r => ({
                        type: r.type,
                        accountId: parseInt(r.accountId),
                        debit: parseFloat(r.debit) || 0,
                        credit: parseFloat(r.credit) || 0,
                        narration: r.narration
                    })),
                    companyId: GetCompanyId(),
                    totalAmount: journalTotals.dr,
                    items: [],
                    logo,
                    signature,
                    customFields: JSON.stringify(customFieldValues),
                    allowDuplicateManualNo: allowDuplicate === true
                };

                try {
                    if (selectedVoucher && showEditModal) {
                        const response = await voucherService.updateVoucher(selectedVoucher.id, voucherData);
                        if (response.success) {
                            toast.success('Journal Voucher updated successfully');
                            fetchVouchers();
                            handleCloseModal();
                        }
                    } else {
                        const response = await voucherService.createVoucher(voucherData);
                        if (response.success) {
                            toast.success('Journal Voucher created successfully');
                            fetchVouchers();
                            handleCloseModal();
                        }
                    }
                } catch (err) {
                    if (err.response?.data?.isDuplicateWarning) {
                        const confirmUse = window.confirm(err.response.data.message);
                        if (confirmUse) {
                            await handleSubmit(true);
                        }
                    } else {
                        toast.error(err.response?.data?.message || 'Error saving journal voucher');
                    }
                }
                return;
            }

            // Calculate total
            const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

            const voucherData = {
                ...formData,
                items: items.map(item => ({
                    productName: item.name,
                    quantity: item.qty,
                    rate: item.rate,
                    amount: item.amount
                })),
                totalAmount,
                companyId: GetCompanyId(),
                logo,
                signature,
                customFields: JSON.stringify(customFieldValues),
                allowDuplicateManualNo: allowDuplicate === true
            };

            try {
                if (selectedVoucher && showEditModal) {
                    // Update existing voucher
                    const response = await voucherService.updateVoucher(selectedVoucher.id, voucherData);
                    if (response.success) {
                        toast.success('Voucher updated successfully');
                        fetchVouchers();
                        handleCloseModal();
                    }
                } else {
                    // Create new voucher
                    const response = await voucherService.createVoucher(voucherData);
                    if (response.success) {
                        toast.success('Voucher created successfully');
                        fetchVouchers();
                        handleCloseModal();
                    }
                }
            } catch (err) {
                if (err.response?.data?.isDuplicateWarning) {
                    const confirmUse = window.confirm(err.response.data.message);
                    if (confirmUse) {
                        await handleSubmit(true);
                    }
                } else {
                    toast.error(err.response?.data?.message || 'Error saving voucher');
                }
            }
        } catch (error) {
            console.error('Error saving voucher:', error);
            toast.error(error.response?.data?.message || 'Failed to save voucher');
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await voucherService.deleteVoucher(selectedVoucher.id);
            if (response.success) {
                toast.success('Voucher deleted successfully');
                fetchVouchers();
                setShowDeleteModal(false);
                setSelectedVoucher(null);
            }
        } catch (error) {
            console.error('Error deleting voucher:', error);
            toast.error('Failed to delete voucher');
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedVoucher(null);
        setFormData({
            voucherNumber: '',
            voucherType: 'JOURNAL',
            date: new Date().toISOString().split('T')[0],
            companyName: '',
            paidFromAccount: '',
            paidToParty: '',
            notes: ''
        });
        setItems([{ id: Date.now(), name: '', rate: 0, qty: 1, amount: 0 }]);
        setLogo(null);
        setSignature(null);
        setCustomFieldValues({});
    };

    const handleAddNewVoucher = async () => {
        try {
            const companyId = GetCompanyId();
            if (companyId) {
                const res = await voucherService.getNextNumber(companyId);
                if (res.success) {
                    setFormData(prev => ({ ...prev, voucherNumber: res.nextNumber }));
                }
            }
        } catch (error) {
            console.error('Error fetching next voucher number:', error);
        }
        setShowAddModal(true);
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), name: '', rate: 0, qty: 1, amount: 0 }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleLogoUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    setLogo(readerEvent.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleSignatureUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    setSignature(readerEvent.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleView = async (v) => {
        try {
            const response = await voucherService.getVoucher(v.id);
            if (response.success) {
                setSelectedVoucher(response.data);
                setShowViewModal(true);
            }
        } catch (error) {
            console.error('Error fetching voucher for view:', error);
            toast.error('Failed to load voucher details');
        }
    };

    const handleEdit = async (v) => {
        try {
            // Fetch detailed record from server
            const response = await voucherService.getVoucher(v.id);
            if (!response.success) return;
            const det = response.data;
            setSelectedVoucher(det);

            setFormData({
                voucherNumber: det.voucherNumber,
                voucherType: det.voucherType,
                date: new Date(det.date).toISOString().split('T')[0],
                companyName: det.companyName || '',
                paidFromAccount: det.paidFromAccount || '',
                paidFromLedgerId: det.paidFromLedgerId || '',
                paidToParty: det.paidToParty || det.vendor?.name || det.customer?.name || '',
                paidToLedgerId: det.paidToLedgerId || '',
                vendorId: det.vendorId || null,
                customerId: det.customerId || null,
                notes: det.notes || '',
                manualReceiptNo: det.manualVoucherNo || ''
            });

            setItems(det.voucheritem?.map(item => ({
                id: item.id,
                productId: item.productId,
                name: item.productName || item.product?.name,
                rate: item.rate,
                qty: item.quantity,
                amount: item.amount
            })) || [{ id: Date.now(), name: '', rate: 0, qty: 1, amount: 0 }]);

            // If it's a journal, fill journalRows
            if (det.voucherType === 'JOURNAL' && det.voucheritem?.length > 0) {
                setJournalRows(det.voucheritem.map(item => ({
                    id: item.id,
                    type: (item.debit > 0) ? 'Dr' : 'Cr',
                    accountId: item.ledgerId || '',
                    debit: item.debit || '',
                    credit: item.credit || '',
                    narration: item.narration || ''
                })));
            } else {
                setJournalRows([
                    { id: '1', type: 'Dr', accountId: '', debit: '', credit: '', narration: '' },
                    { id: '2', type: 'Cr', accountId: '', debit: '', credit: '', narration: '' }
                ]);
            }
            setLogo(det.logo);
            setSignature(det.signature);

            let fieldValues = {};
            if (det.customFields) {
                try {
                    fieldValues = typeof det.customFields === 'string'
                        ? JSON.parse(det.customFields)
                        : det.customFields;
                } catch (e) {
                    console.error('Error parsing custom fields on edit:', e);
                }
            }
            setCustomFieldValues(fieldValues);

            setShowEditModal(true);
        } catch (err) {
            console.error('Edit error:', err);
            toast.error('Failed to load edit details');
        }
    };

    const [journalRows, setJournalRows] = useState([
        { id: '1', type: 'Dr', accountId: '', debit: '', credit: '', narration: '' },
        { id: '2', type: 'Cr', accountId: '', debit: '', credit: '', narration: '' }
    ]);

    const handleJournalRowChange = (id, field, value) => {
        setJournalRows(prev => prev.map(row => {
            if (row.id === id) {
                const newRow = { ...row, [field]: value };
                if (field === 'type') {
                    newRow.debit = '';
                    newRow.credit = '';
                }
                return newRow;
            }
            return row;
        }));
    };

    const addJournalRow = () => {
        setJournalRows([...journalRows, { id: Date.now().toString(), type: 'Dr', accountId: '', debit: '', credit: '', narration: '' }]);
    };

    const removeJournalRow = (id) => {
        if (journalRows.length > 2) {
            setJournalRows(journalRows.filter(r => r.id !== id));
        } else {
            toast.error("Journal must have at least 2 rows");
        }
    };

    const journalTotals = React.useMemo(() => {
        return journalRows.reduce((acc, row) => ({
            dr: acc.dr + (parseFloat(row.debit) || 0),
            cr: acc.cr + (parseFloat(row.credit) || 0)
        }), { dr: 0, cr: 0 });
    }, [journalRows]);

    const handleDelete = (v) => {
        setSelectedVoucher(v);
        setShowDeleteModal(true);
    };

    // Filtered lists for Dropdowns
    const cashBankLedgers = accountList.filter(acc => {
        const sub = acc.accountsubgroup?.name?.toLowerCase() || '';
        return sub.includes('cash') || sub.includes('bank');
    });

    const payableLedgers = accountList.filter(acc => {
        const sub = acc.accountsubgroup?.name?.toLowerCase() || '';
        return sub.includes('payable');
    });

    const availableProducts = formData.warehouseId
        ? productList.filter(p => p.stock?.some(s => s.warehouseId === parseInt(formData.warehouseId)))
        : productList;

    return (
        <div className="Voucher-voucher-page">
            <div className="Voucher-page-header">
                <h1 className="Voucher-page-title">Journal Vouchers</h1>
                {hasPermission('create journal voucher') && (
                    <button className="Voucher-btn-add" style={{ backgroundColor: '#1e293b' }} onClick={handleAddNewVoucher}>
                        <Plus size={18} />
                        Create Journal Voucher
                    </button>
                )}
            </div>

            <div className="Voucher-voucher-card">
                <div className="Voucher-controls-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="Voucher-entries-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="Voucher-entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="Voucher-entries-text">entries per page</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="Voucher-search-control" style={{ margin: 0, position: 'relative' }}>
                            <Search size={18} className="Voucher-search-icon" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="Voucher-search-input"
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</label>
                            <input 
                                type="date" 
                                className="Voucher-search-input" 
                                style={{ padding: '0.375rem 0.75rem', width: 'auto' }}
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</label>
                            <input 
                                type="date" 
                                className="Voucher-search-input" 
                                style={{ padding: '0.375rem 0.75rem', width: 'auto' }}
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                            />
                        </div>
                        {(filterFromDate || filterToDate || searchTerm) && (
                            <button 
                                onClick={() => { setFilterFromDate(''); setFilterToDate(''); setSearchTerm(''); }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '6px',
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

                <div className="Voucher-table-container">
                    <table className="Voucher-voucher-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>DATE</th>
                                <th>VOUCHER NO</th>
                                <th>AMOUNT</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                             {isLoading ? (
                                 <tr>
                                     <td colSpan="7" className="Voucher-text-center py-4">Loading vouchers...</td>
                                 </tr>
                             ) : vouchers.length === 0 ? (
                                 <tr>
                                     <td colSpan="7" className="Voucher-text-center py-4">No vouchers found</td>
                                 </tr>
                             ) : filteredVouchers.length === 0 ? (
                                 <tr>
                                     <td colSpan="7" className="Voucher-text-center py-4">No vouchers match the selected filters</td>
                                 </tr>
                             ) : filteredVouchers.map((v, index) => (
                                 <tr key={v.id}>
                                     <td>{index + 1}</td>
                                     <td>{new Date(v.date).toLocaleDateString()}</td>
                                     <td className="Voucher-voucher-no-text">{v.voucherNumber}</td>
                                     <td className="font-semibold Voucher-text-green-600">{formatCurrency(v.totalAmount || 0)}</td>
                                     <td>
                                         <div className="Voucher-voucher-action-buttons">
                                             <button className="Voucher-action-btn Voucher-btn-view" data-tooltip="View" onClick={() => handleView(v)}>
                                                 <Eye size={18} />
                                             </button>
                                             {hasPermission('edit journal voucher') && (
                                                 <button className="Voucher-action-btn Voucher-btn-edit" data-tooltip="Edit" onClick={() => handleEdit(v)}>
                                                     <Pencil size={18} />
                                                 </button>
                                             )}
                                             {hasPermission('delete journal voucher') && (
                                                 <button className="Voucher-action-btn Voucher-btn-delete" data-tooltip="Delete" onClick={() => handleDelete(v)}>
                                                     <Trash2 size={18} />
                                                 </button>
                                             )}
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                        </tbody>
                    </table>
                </div>

                <div className="Voucher-pagination-row">
                    <p className="Voucher-pagination-info">Showing 1 to {filteredVouchers.length} of {filteredVouchers.length} entries</p>
                    <div className="Voucher-pagination-controls">
                        <button className="Voucher-pagination-btn disabled">Previous</button>
                        <button className="Voucher-pagination-btn active">1</button>
                        <button className="Voucher-pagination-btn disabled">Next</button>
                    </div>
                </div>
            </div>

            {/* Create/Edit Voucher Modal */}
            {(showAddModal || showEditModal) && (
                <div className="Voucher-modal-overlay">
                    <div className="Voucher-modal-content Voucher-voucher-modal">
                        <div className="Voucher-modal-header">
                            <h2 className="Voucher-modal-title">{showEditModal ? 'Edit Journal Voucher' : 'Create Journal Voucher'}</h2>
                            <button className="Voucher-close-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Voucher-modal-body">
                            <div className="journal-mode-content">
                                <div className="Voucher-form-grid Voucher-mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div className="Voucher-form-group">
                                        <label className="Voucher-form-label">Voucher No</label>
                                        <input className="Voucher-form-input" value={formData.voucherNumber} onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })} />
                                    </div>
                                    <div className="Voucher-form-group">
                                        <label className="Voucher-form-label">Date <span className="Voucher-text-red">*</span></label>
                                        <input type="date" className="Voucher-form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                    <div className="Voucher-form-group">
                                        <label className="Voucher-form-label">Ref No</label>
                                        <input className="Voucher-form-input" value={formData.manualReceiptNo} onChange={(e) => setFormData({ ...formData, manualReceiptNo: e.target.value })} placeholder="Optional" />
                                    </div>
                                </div>

                                {/* Custom Fields Section */}
                                {getCustomFieldsForType('voucher').length > 0 && (
                                    <div className="Voucher-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Custom Fields
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                            {getCustomFieldsForType('voucher').map(field => (
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

                                <div className="Voucher-table-container Voucher-thin-border Voucher-mb-4">
                                    <table className="Voucher-voucher-items-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '80px' }}>TYPE</th>
                                                <th>ACCOUNT</th>
                                                <th style={{ width: '150px' }}>DEBIT</th>
                                                <th style={{ width: '150px' }}>CREDIT</th>
                                                <th>NARRATION</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {journalRows.map((row) => (
                                                <tr key={row.id}>
                                                    <td>
                                                        <select className="Voucher-form-input" value={row.type} onChange={(e) => handleJournalRowChange(row.id, 'type', e.target.value)}>
                                                            <option value="Dr">Dr</option>
                                                            <option value="Cr">Cr</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select className="Voucher-form-input" value={row.accountId} onChange={(e) => handleJournalRowChange(row.id, 'accountId', e.target.value)}>
                                                            <option value="">Select Account</option>
                                                            {accountList.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className="Voucher-form-input Voucher-text-right" disabled={row.type === 'Cr'} value={row.debit} onChange={(e) => handleJournalRowChange(row.id, 'debit', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input className="Voucher-form-input Voucher-text-right" disabled={row.type === 'Dr'} value={row.credit} onChange={(e) => handleJournalRowChange(row.id, 'credit', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input className="Voucher-form-input" value={row.narration} onChange={(e) => handleJournalRowChange(row.id, 'narration', e.target.value)} />
                                                    </td>
                                                    <td className="Voucher-text-center">
                                                        <button onClick={() => removeJournalRow(row.id)} className="Voucher-action-btn Voucher-btn-delete"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="Voucher-p-3 Voucher-bg-gray-50 Voucher-flex Voucher-justify-between Voucher-items-center Voucher-border-t">
                                        <button onClick={addJournalRow} className="Voucher-flex Voucher-items-center Voucher-text-blue-600"><Plus size={16} className="Voucher-mr-1" /> Add Line</button>
                                        <div className="Voucher-flex Voucher-gap-6 Voucher-font-bold Voucher-text-sm">
                                            <span>Total Dr: {formatCurrency(journalTotals.dr)}</span>
                                            <span>Total Cr: {formatCurrency(journalTotals.cr)}</span>
                                            <span className={Math.abs(journalTotals.dr - journalTotals.cr) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                                                DIFF: {formatCurrency(Math.abs(journalTotals.dr - journalTotals.cr))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="Voucher-form-group">
                                    <label className="Voucher-form-label">Master Narration</label>
                                    <textarea className="Voucher-form-input Voucher-h-20" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Enter journal description..." />
                                </div>
                            </div>
                            <div className="Voucher-signature-section">
                                <span className="Voucher-signature-label">Signature</span>
                                <div className="Voucher-signature-upload-wrapper">
                                    {signature && (
                                        <div className="Voucher-signature-preview mb-3">
                                            <button className="Voucher-remove-sig" onClick={() => setSignature(null)}><X size={12} /></button>
                                            <img src={signature} alt="Signature" style={{ maxHeight: '80px', borderBottom: '1px solid #eee' }} />
                                        </div>
                                    )}
                                    <button className="Voucher-btn-upload-signature" onClick={handleSignatureUpload} style={{ backgroundColor: '#1e293b' }}>
                                        <Upload size={16} /> Upload Signature
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="Voucher-modal-footer">
                            <button className="Voucher-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                            <button className="Voucher-btn-submit" onClick={handleSubmit}>
                                {showEditModal ? 'Update Voucher' : 'Save Voucher'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Voucher Modal */}
            {showViewModal && (
                <div className="Voucher-modal-overlay">
                    <div className="Voucher-modal-content Voucher-voucher-modal">
                        <div className="Voucher-modal-header">
                            <div className="Voucher-flex Voucher-items-center Voucher-gap-4">
                                <h2 className="Voucher-modal-title">View Voucher</h2>
                                <button className="Voucher-action-btn Voucher-btn-view no-print" onClick={handlePrint} title="Print Voucher">
                                    <Printer size={18} />
                                </button>
                            </div>
                            <button className="Voucher-close-btn no-print" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Voucher-modal-body print-section">
                            {companySettings && (
                                <div className="company-modal-header-section" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    borderBottom: '1px solid #f1f5f9',
                                    background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                                    marginBottom: '20px',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {companySettings.logo && (
                                            <img 
                                                src={companySettings.logo} 
                                                alt="Company Logo" 
                                                style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }} 
                                            />
                                        )}
                                        <div style={{ textAlign: 'left' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                                                {companySettings.name}
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                                {companySettings.address}
                                            </p>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {companySettings.phone && `Phone: ${companySettings.phone}`}
                                                {companySettings.email && ` | Email: ${companySettings.email}`}
                                                {companySettings.website && ` | Web: ${companySettings.website}`}
                                            </p>
                                        </div>
                                    </div>
                                    {companySettings.gstNumber && (
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', background: '#e2e8f0', padding: '6px 12px', borderRadius: '6px' }}>
                                            GSTIN: {companySettings.gstNumber}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="Voucher-view-header-grid">
                                <div className="Voucher-view-group">
                                    <label>VOUCHER TYPE</label>
                                    <span className={`type-badge ${(selectedVoucher?.voucherType || '').toLowerCase()}`}>
                                        {selectedVoucher?.voucherType}
                                    </span>
                                </div>
                                <div className="Voucher-view-group">
                                    <label>VOUCHER NO</label>
                                    <p className="Voucher-voucher-no-text">{selectedVoucher?.voucherNumber}</p>
                                </div>
                                <div className="Voucher-view-group">
                                    <label>DATE</label>
                                    <p>{selectedVoucher?.date ? new Date(selectedVoucher.date).toLocaleDateString() : ''}</p>
                                </div>
                            </div>

                            {/* Custom Fields View */}
                            {(() => {
                                let customFieldVals = {};
                                if (selectedVoucher?.customFields) {
                                    try {
                                        customFieldVals = typeof selectedVoucher.customFields === 'string'
                                            ? JSON.parse(selectedVoucher.customFields)
                                            : selectedVoucher.customFields;
                                    } catch (e) {
                                        console.error('Error parsing voucher custom fields for view:', e);
                                    }
                                }
                                const fieldsList = getCustomFieldsForType('voucher');
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

                            {/* <div className="view-party-info mt-4">
                                <div className="Voucher-view-group">
                                    <label>CUSTOMER/VENDOR</label>
                                    <p className="Voucher-font-bold text-lg">{selectedVoucher?.paidToParty}</p>
                                </div>
                            </div> */}

                            <div className="Voucher-product-details-header mt-5">
                                <h3 className="Voucher-product-details-title">Product Details</h3>
                            </div>

                            <table className="Voucher-voucher-items-table Voucher-view-mode">
                                <thead>
                                    <tr>
                                        <th>ACCOUNT</th>
                                        <th style={{ width: '120px' }}>DEBIT</th>
                                        <th style={{ width: '120px' }}>CREDIT</th>
                                        <th>NARRATION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedVoucher?.voucheritem?.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.ledger?.name || item.ledgerName || item.product?.name || item.productName || '-'}</td>
                                            <td className="Voucher-text-right">{item.debit ? formatCurrency(item.debit) : '-'}</td>
                                            <td className="Voucher-text-right">{item.credit ? formatCurrency(item.credit) : '-'}</td>
                                            <td>{item.narration || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="Voucher-voucher-footer-grid mt-4">
                                <div className="notes-section">
                                    <label className="Voucher-form-label">Notes</label>
                                    <p className="text-gray-600 Voucher-bg-gray-50 Voucher-p-3 rounded-lg min-h-[80px]">
                                        {selectedVoucher?.notes || "No additional notes provided."}
                                    </p>
                                </div>
                                <div className="Voucher-totals-section">
                                    <div className="Voucher-total-row Voucher-grand-total">
                                        <span>Total</span>
                                        <span>{formatCurrency(selectedVoucher?.totalAmount || 0)}</span>
                                    </div>
                                    {selectedVoucher?.signature && (
                                        <div className="view-signature mt-4">
                                            <label className="Voucher-signature-label text-xs">AUTHORIZED SIGNATURE</label>
                                            <img src={selectedVoucher.signature} alt="Signature" style={{ maxHeight: '60px', marginTop: '5px' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {companySettings && (companySettings.notes || companySettings.terms) && (
                                <div className="company-modal-footer-section" style={{
                                    marginTop: '24px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #e2e8f0',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '20px',
                                    fontSize: '0.8rem',
                                    color: '#475569',
                                    textAlign: 'left',
                                    clear: 'both'
                                }}>
                                    {companySettings.notes && (
                                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                            <span style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                Notes & Privacy Policy
                                            </span>
                                            <p style={{ margin: 0, whiteSpace: 'pre-line', color: '#64748b', lineHeight: 1.4 }}>
                                                {companySettings.notes}
                                            </p>
                                        </div>
                                    )}
                                    {companySettings.terms && (
                                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                            <span style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                Terms & Conditions
                                            </span>
                                            <p style={{ margin: 0, whiteSpace: 'pre-line', color: '#64748b', lineHeight: 1.4 }}>
                                                {companySettings.terms}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="Voucher-modal-footer no-print">
                            <button className="Voucher-btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
                            <button className="Voucher-btn-print" onClick={handlePrint}>
                                <Printer size={16} className="mr-2" /> Print
                            </button>
                            <button className="Voucher-btn-submit" style={{ backgroundColor: '#4dd0e1' }} onClick={() => { setShowViewModal(false); setShowEditModal(true); }}>Edit Voucher</button>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteModal && (
                <div className="Voucher-modal-overlay">
                    <div className="Voucher-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="Voucher-modal-header">
                            <h2 className="Voucher-modal-title">Delete Voucher</h2>
                            <button className="Voucher-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Voucher-modal-body">
                            <p>Are you sure you want to delete voucher <strong>{selectedVoucher?.voucherNo}</strong>?</p>
                        </div>
                        <div className="Voucher-modal-footer">
                            <button className="Voucher-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="Voucher-btn-submit" style={{ backgroundColor: '#ef4444' }} onClick={handleDeleteConfirm}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateVoucher;
