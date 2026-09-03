import React, { useState, useEffect } from 'react';
import {
    Plus, Search, RotateCcw, Edit, Trash2, ChevronRight, X, Calendar, Save, Trash, Eye, Upload, Printer
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import GetCompanyId from '../../../api/GetCompanyId';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import SearchableSelect from '../../../components/SearchableSelect/SearchableSelect';
import './Expenses.css';

const Expenses = () => {
    const { formatCurrency, companySettings } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const [selectedFilterAccount, setSelectedFilterAccount] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [signature, setSignature] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        manualReceiptNo: '',
        paidFromAccountId: '',
        items: [
            { accountId: '', amount: '', narration: '' }
        ],
        mainNarration: '',
        signature: null
    });

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        const companyId = GetCompanyId();

        // Fetch COA for dropdowns (Critical)
        try {
            const coaRes = await chartOfAccountsService.getChartOfAccounts(companyId);
            if (coaRes.success) {
                // Flatten COA
                let flatAccounts = [];
                const traverse = (groups, parentType = null) => {
                    groups.forEach(group => {
                        const currentType = group.type || parentType;
                        if (group.ledger) {
                            group.ledger.forEach(l => flatAccounts.push({ ...l, groupName: group.name, type: currentType }));
                        }
                        if (group.accountsubgroup) {
                            traverse(group.accountsubgroup, currentType);
                        }
                    });
                };
                traverse(coaRes.data);
                setAccounts(flatAccounts);
            }
        } catch (error) {
            console.error('Error fetching COA:', error);
            toast.error('Failed to load accounts');
        }

        // Fetch Expenses
        try {
            const expensesRes = await chartOfAccountsService.getExpenses(companyId);
            if (expensesRes.success) {
                setExpenses(expensesRes.data);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle deep-linking of a specific expense voucher
    useEffect(() => {
        if (location.state && location.state.targetExpenseId && expenses.length > 0) {
            const targetId = parseInt(location.state.targetExpenseId);
            const expenseObj = expenses.find(e => e.id === targetId);
            if (expenseObj) {
                if (location.state.isEdit || location.state.autoEdit) {
                    handleEdit(expenseObj);
                } else {
                    handleView(expenseObj);
                }
            }
            // Clear state so re-renders don't re-trigger modal opening
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, expenses, navigate]);

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            manualReceiptNo: '',
            paidFromAccountId: '',
            items: [{ accountId: '', amount: '', narration: '' }],
            mainNarration: '',
            signature: null
        });
        setSignature(null);
        setCustomFieldValues({});
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { accountId: '', amount: '', narration: '' }]
        }));
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const handleSave = async () => {
        try {
            if (!formData.paidFromAccountId || !formData.date) {
                toast.error("Please fill required fields (Date, Paid From)");
                return;
            }
            if (formData.items.some(item => !item.accountId || !item.amount)) {
                toast.error("Please fill all item rows (Account and Amount)");
                return;
            }

            const companyId = GetCompanyId();
            const payload = {
                ...formData,
                companyId,
                items: formData.items.map(item => ({
                    ...item,
                    amount: parseFloat(item.amount)
                })),
                signature: signature,
                customFields: JSON.stringify(customFieldValues)
            };

            if (selectedExpense) {
                await chartOfAccountsService.updateExpense(selectedExpense.voucherNumber, payload, companyId);
                toast.success('Expense updated successfully');
            } else {
                await chartOfAccountsService.createExpense(payload, companyId);
                toast.success('Expense voucher created successfully');
            }

            setIsCreateOpen(false);
            fetchData();
            setSelectedExpense(null); // Reset selection
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save expense');
        }
    };

    const handleEdit = (row) => {
        setSelectedExpense(row);
        setFormData({
            date: new Date(row.date).toISOString().split('T')[0],
            manualReceiptNo: row.manualReceiptNo || '',
            paidFromAccountId: row.paidFromAccountId,
            items: row.items.map(i => ({
                accountId: i.accountId,
                amount: i.amount,
                narration: i.narration
            })),
            mainNarration: row.mainNarration || '',
            signature: row.signature || null
        });
        setSignature(row.signature || null);

        let fieldValues = {};
        if (row.customFields) {
            try {
                fieldValues = typeof row.customFields === 'string'
                    ? JSON.parse(row.customFields)
                    : row.customFields;
            } catch (e) {
                console.error('Error parsing custom fields on edit:', e);
            }
        }
        setCustomFieldValues(fieldValues);

        setIsCreateOpen(true);
    };

    const handleView = (row) => {
        setSelectedExpense(row);
        setIsViewOpen(true);
    };

    const openDelete = (expense) => {
        setSelectedExpense(expense);
        setIsDeleteOpen(true);
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

    const handlePrint = () => {
        if (!selectedExpense) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'absolute';
        printFrame.style.top = '-1000px';
        printFrame.style.left = '-1000px';
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow.document;
        
        const styles = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                .print-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
                .logo { max-height: 80px; }
                .voucher-info { text-align: right; }
                .voucher-title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 5px; }
                .voucher-no { font-family: monospace; font-weight: 700; color: #64748b; }
                .v-date { color: #64748b; font-size: 14px; margin-top: 5px; }
                
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 6px; }
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
                            <h1 class="company-name">${companySettings?.name || 'Your Company'}</h1>
                            <p style="margin: 0; font-size: 12px; color: #475569;">${companySettings?.address || ''}</p>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">
                                ${companySettings?.phone ? `Phone: ${companySettings.phone}` : ''}
                                ${companySettings?.email ? ` | Email: ${companySettings.email}` : ''}
                            </p>
                            ${companySettings?.gstNumber ? `<p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600;">GSTIN: ${companySettings.gstNumber}</p>` : ''}
                        </div>
                    </div>
                    <div class="voucher-info">
                        <div class="voucher-title">EXPENSE VOUCHER</div>
                        <div class="voucher-no">NO: ${selectedExpense.voucherNumber}</div>
                        <div class="v-date">Date: ${new Date(selectedExpense.date).toLocaleDateString()}</div>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="detail-group">
                        <label>PAID FROM</label>
                        <p>${selectedExpense.paidFrom?.name || '-'}</p>
                    </div>
                    <div class="detail-group">
                        <label>MANUAL REF</label>
                        <p>${selectedExpense.manualReceiptNo || '-'}</p>
                    </div>
                </div>

                <!-- Custom Fields in Print -->
                ${(() => {
                    let customFieldVals = {};
                    if (selectedExpense.customFields) {
                        try {
                            customFieldVals = typeof selectedExpense.customFields === 'string'
                                ? JSON.parse(selectedExpense.customFields)
                                : selectedExpense.customFields;
                        } catch (e) {
                            console.error('Error parsing custom fields for print:', e);
                        }
                    }
                    const fieldsList = getCustomFieldsForType('expense');
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
                            <th>ACCOUNT DESCRIPTION</th>
                            <th>NARRATION</th>
                            <th style="width: 150px" class="text-right">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selectedExpense.items?.map(item => `
                            <tr>
                                <td>${accounts.find(a => a.id === item.accountId)?.name || item.accountId}</td>
                                <td>${item.narration || '-'}</td>
                                <td class="text-right">${formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div class="notes-box">
                        <div class="notes-title">VOUCHER NARRATION</div>
                        <div class="notes-content">${selectedExpense.mainNarration || "No additional notes provided."}</div>
                    </div>
                    <div class="totals">
                        <div class="total-row grand-total">
                            <span>Grand Total</span>
                            <span>${formatCurrency(selectedExpense.totalAmount || 0)}</span>
                        </div>
                    </div>
                </div>

                <div class="signature-section">
                    ${selectedExpense.signature ? `
                        <img src="${selectedExpense.signature}" class="signature-img" />
                        <span class="sig-label">AUTHORIZED SIGNATURE</span>
                    ` : `
                        <div style="height: 60px"></div>
                        <span class="sig-label">AUTHORIZED SIGNATURE</span>
                    `}
                </div>

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

    const handleDelete = async () => {
        try {
            await chartOfAccountsService.deleteExpense(selectedExpense.voucherNumber);
            toast.success('Expense deleted successfully');
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete expense');
        }
    };



    // Filtered Expenses
    const filteredExpenses = expenses.filter(row => {
        // Date range filter
        if (row.date) {
            const rowDate = new Date(row.date);
            rowDate.setHours(0, 0, 0, 0);

            if (filterFromDate) {
                const from = new Date(filterFromDate);
                from.setHours(0, 0, 0, 0);
                if (rowDate < from) return false;
            }
            if (filterToDate) {
                const to = new Date(filterToDate);
                to.setHours(23, 59, 59, 999);
                if (rowDate > to) return false;
            }
        }

        // 1. Account Filter
        if (selectedFilterAccount) {
            const matchesPaidFrom = String(row.paidFromAccountId) === String(selectedFilterAccount);
            const matchesItems = row.items?.some(item => String(item.accountId) === String(selectedFilterAccount));
            if (!matchesPaidFrom && !matchesItems) return false;
        }

        // 2. Search Filter
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            const voucherNo = String(row.voucherNumber || '').toLowerCase();
            const manualNo = String(row.manualReceiptNo || '').toLowerCase();
            const paidFrom = String(row.paidFrom?.name || '').toLowerCase();
            const accountsList = String(row.accounts || '').toLowerCase();
            const narration = String(row.mainNarration || '').toLowerCase();
            const amount = String(row.totalAmount || '').toLowerCase();
            const dateStr = new Date(row.date).toLocaleDateString().toLowerCase();

            return (
                voucherNo.includes(query) ||
                manualNo.includes(query) ||
                paidFrom.includes(query) ||
                accountsList.includes(query) ||
                narration.includes(query) ||
                amount.includes(query) ||
                dateStr.includes(query)
            );
        }

        return true;
    });

    const totalPages = Math.ceil(filteredExpenses.length / pageSize);
    const paginatedExpenses = filteredExpenses.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <div className="Expenses-expenses-page">
            <div className="Expenses-page-header">
                <div>
                    <h1 className="Expenses-page-title">Expense</h1>
                </div>
                {hasPermission('create expenses') && (
                    <button className="Expenses-expenses-btn-dark" onClick={() => { resetForm(); setSelectedExpense(null); setIsCreateOpen(true); }}>
                        <Plus size={18} /> Create Voucher
                    </button>
                )}
            </div>

            <div className="Expenses-table-card">
                <div className="Expenses-table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="entries-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <select 
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entries per page</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="Expenses-filter-wrapper" style={{ margin: 0 }}>
                            <label className="Expenses-filter-label">Account Filter:</label>
                            <div className="Expenses-filter-dropdown-container">
                                <SearchableSelect
                                    options={accounts}
                                    value={selectedFilterAccount}
                                    onChange={(val) => {
                                        setSelectedFilterAccount(val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter by Account..."
                                    searchPlaceholder="Search account types..."
                                    clearable={true}
                                />
                            </div>
                        </div>

                        <div className="search-control" style={{ margin: 0, position: 'relative' }}>
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>From:</label>
                            <input 
                                type="date" 
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    width: 'auto'
                                }}
                                value={filterFromDate}
                                onChange={(e) => { setFilterFromDate(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>To:</label>
                            <input 
                                type="date" 
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    fontSize: '0.9rem',
                                    width: 'auto'
                                }}
                                value={filterToDate}
                                onChange={(e) => { setFilterToDate(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        {(filterFromDate || filterToDate || selectedFilterAccount || searchTerm) && (
                            <button 
                                onClick={() => { setFilterFromDate(''); setFilterToDate(''); setSelectedFilterAccount(''); setSearchTerm(''); setCurrentPage(1); }}
                                style={{
                                    padding: '8px 16px',
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

                <div className="table-responsive">
                    <table className="Expenses-data-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>AUTO RECEIPT NO</th>
                                <th>MANUAL RECEIPT NO</th>
                                <th>PAID FROM</th>
                                <th>ACCOUNTS</th>
                                <th>TOTAL AMOUNT</th>
                                <th>NARRATION</th>
                                <th className="text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center p-4">Loading...</td></tr>
                            ) : paginatedExpenses.length > 0 ? (
                                paginatedExpenses.map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td>{row.voucherNumber}</td>
                                        <td>{row.manualReceiptNo || '-'}</td>
                                        <td>{row.paidFrom?.name || '-'}</td>
                                        <td>{row.accounts}</td>
                                        <td>{formatCurrency(row.totalAmount)}</td>
                                        <td>{row.mainNarration || '-'}</td>
                                        <td className="text-left">
                                            <div className="Expenses-action-buttons1">
                                                <button className="Expenses-expenses-btn-icon view" onClick={() => handleView(row)} title="View">
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit expenses') && (
                                                    <button className="Expenses-expenses-btn-icon Expenses-edit" onClick={() => handleEdit(row)} title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete expenses') && (
                                                    <button className="Expenses-expenses-btn-icon Expenses-delete" onClick={() => openDelete(row)} title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="8" className="text-center p-4">No data available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Custom Pagination Controls Footer */}
                <div className="Expenses-pagination-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: 'white', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                        Showing {filteredExpenses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredExpenses.length)} of {filteredExpenses.length} entries
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', background: currentPage === page ? '#3b82f6' : '#fff', color: currentPage === page ? '#fff' : '#334155', fontWeight: currentPage === page ? '600' : 'normal', cursor: 'pointer' }}
                            >
                                {page}
                            </button>
                        ))}
                        <button 
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', background: (currentPage === totalPages || totalPages === 0) ? '#f1f5f9' : '#fff', color: (currentPage === totalPages || totalPages === 0) ? '#94a3b8' : '#334155', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {isViewOpen && selectedExpense && (
                <div className="Expenses-modal-overlay">
                    <div className="Expenses-modal-content Expenses-large-modal">
                        <div className="Expenses-modal-header">
                            <h2>View Voucher Details</h2>
                            <button className="Expenses-close-btn" onClick={() => setIsViewOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Expenses-modal-body">
                            <div className="Expenses-form-row">
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Voucher No</label>
                                    <input type="text" value={selectedExpense.voucherNumber} disabled className="bg-gray-100" />
                                </div>
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Date</label>
                                    <input type="text" value={new Date(selectedExpense.date).toLocaleDateString()} disabled className="bg-gray-100" />
                                </div>
                            </div>
                            <div className="Expenses-form-row">
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Manual Ref</label>
                                    <input type="text" value={selectedExpense.manualReceiptNo || '-'} disabled className="bg-gray-100" />
                                </div>
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Paid From</label>
                                    <input type="text" value={selectedExpense.paidFrom?.name || '-'} disabled className="bg-gray-100" />
                                </div>
                            </div>

                            {/* Custom Fields View */}
                            {(() => {
                                let customFieldVals = {};
                                if (selectedExpense?.customFields) {
                                    try {
                                        customFieldVals = typeof selectedExpense.customFields === 'string'
                                            ? JSON.parse(selectedExpense.customFields)
                                            : selectedExpense.customFields;
                                    } catch (e) {
                                        console.error('Error parsing expense custom fields for view:', e);
                                    }
                                }
                                const fieldsList = getCustomFieldsForType('expense');
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

                            <div className="Expenses-items-table-wrapper mt-4">
                                <table className="Expenses-items-table view-table">
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th>Narration</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedExpense.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{accounts.find(a => a.id === item.accountId)?.name || item.accountId}</td>
                                                <td>{item.narration || '-'}</td>
                                                <td>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="2" className="text-right font-bold">Total:</td>
                                            <td className="text-right font-bold">{formatCurrency(selectedExpense.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="Expenses-form-group mt-4">
                                <label>Main Narration</label>
                                <textarea rows="2" value={selectedExpense.mainNarration || '-'} disabled className="bg-gray-100"></textarea>
                            </div>

                            {selectedExpense.signature && (
                                <div className="Expenses-signature-view mt-4 text-right">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Authorized Signature</label>
                                    <img src={selectedExpense.signature} alt="Signature" style={{ maxHeight: '80px', marginLeft: 'auto' }} />
                                </div>
                            )}
                        </div>
                        <div className="Expenses-modal-footer">
                            <button className="Expenses-btn-cancel" onClick={() => setIsViewOpen(false)}>Close</button>
                            <button className="Expenses-expenses-btn-dark" style={{ backgroundColor: '#f59e0b', color: 'white' }} onClick={handlePrint}>
                                <Printer size={16} /> Print
                            </button>
                            {hasPermission('edit expenses') && (
                                <button className="Expenses-btn-save" onClick={() => { setIsViewOpen(false); handleEdit(selectedExpense); }}>Edit</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="Expenses-modal-overlay">
                    <div className="Expenses-modal-content Expenses-large-modal">
                        <div className="Expenses-modal-header">
                            <h2>{selectedExpense ? 'Edit Voucher' : 'Create Voucher'}</h2>
                            <button className="Expenses-close-btn" onClick={() => setIsCreateOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Expenses-modal-body">
                            <div className="Expenses-form-row">
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Auto Receipt No</label>
                                    <input type="text" value={selectedExpense ? selectedExpense.voucherNumber : "AUTO-GENERATED"} disabled className="bg-gray-100" />
                                </div>
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Manual Receipt No</label>
                                    <input
                                        type="text"
                                        placeholder="Enter manual number"
                                        value={formData.manualReceiptNo}
                                        onChange={(e) => setFormData({ ...formData, manualReceiptNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="Expenses-form-row">
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Voucher Date<span className="Expenses-required">*</span></label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="Expenses-form-group Expenses-half">
                                    <label>Paid From<span className="Expenses-required">*</span></label>
                                    <SearchableSelect
                                        options={accounts}
                                        value={formData.paidFromAccountId}
                                        onChange={(val) => setFormData({ ...formData, paidFromAccountId: val })}
                                        placeholder="Select Paid From Account"
                                        searchPlaceholder="Search all account types..."
                                        clearable={false}
                                    />
                                </div>
                            </div>

                            {/* Custom Fields Section */}
                            {getCustomFieldsForType('expense').length > 0 && (
                                <div className="Expenses-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Custom Fields
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                        {getCustomFieldsForType('expense').map(field => (
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

                            {/* Items Table */}
                            <div className="Expenses-items-table-wrapper">
                                <table className="Expenses-items-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>ACCOUNT</th>
                                            <th style={{ width: '20%' }}>AMOUNT</th>
                                            <th style={{ width: '30%' }}>NARRATION</th>
                                            <th style={{ width: '10%' }}>ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <SearchableSelect
                                                        options={accounts}
                                                        value={item.accountId}
                                                        onChange={(val) => handleItemChange(index, 'accountId', val)}
                                                        placeholder="Select Account"
                                                        searchPlaceholder="Search account types..."
                                                        clearable={false}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={item.narration}
                                                        onChange={(e) => handleItemChange(index, 'narration', e.target.value)}
                                                        placeholder="Narration for this item"
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button className="Expenses-expenses-btn-icon-red" onClick={() => handleRemoveItem(index)}>
                                                        <Trash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td className="text-right font-bold">Total:</td>
                                            <td className="font-bold pl-2">{formatCurrency(calculateTotal())}</td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <button className="Expenses-btn-add-row" onClick={handleAddItem}>
                                    + Add Row
                                </button>
                            </div>

                            <div className="Expenses-form-group mt-4">
                                <label>Voucher Narration</label>
                                <textarea
                                    rows="3"
                                    placeholder="Enter narration for this voucher..."
                                    value={formData.mainNarration}
                                    onChange={(e) => setFormData({ ...formData, mainNarration: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="Expenses-signature-section mt-4">
                                <label className="Expenses-form-label font-bold block mb-2">Authorized Signature</label>
                                <div className="Expenses-signature-upload-box p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                                    {signature ? (
                                        <div className="relative inline-block">
                                            <button 
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                                onClick={() => setSignature(null)}
                                            >
                                                <X size={12} />
                                            </button>
                                            <img src={signature} alt="Signature Preview" style={{ maxHeight: '100px' }} className="mx-auto" />
                                        </div>
                                    ) : (
                                        <button 
                                            className="Expenses-expenses-btn-dark mx-auto" 
                                            style={{ backgroundColor: '#1e293b' }}
                                            onClick={handleSignatureUpload}
                                        >
                                            <Upload size={16} /> Upload Signature
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="Expenses-modal-footer">
                            <button className="Expenses-btn-cancel" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                            <button className="Expenses-btn-save" onClick={handleSave}>{selectedExpense ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="Expenses-modal-overlay">
                    <div className="Expenses-modal-content Expenses-small-modal">
                        <div className="Expenses-modal-header">
                            <h2>Delete Expense</h2>
                            <button className="Expenses-close-btn" onClick={() => setIsDeleteOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Expenses-modal-body">
                            <p>Are you sure you want to delete voucher <b>{selectedExpense?.voucherNumber}</b>?</p>
                        </div>
                        <div className="Expenses-modal-footer">
                            <button className="Expenses-btn-cancel" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
                            <button className="Expenses-btn-delete-confirm" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
