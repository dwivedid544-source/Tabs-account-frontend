import React, { useState, useEffect } from 'react';
import {
    Plus, Search, RotateCcw, Edit, Trash2, ChevronRight, X, Calendar, Save, Trash, Eye
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import chartOfAccountsService from '../../../../services/chartOfAccountsService';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';
import { AuthContext } from '../../../../context/AuthContext';
import './Income.css';

const Income = () => {
    const { formatCurrency, companySettings, getDocumentTitle } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [incomes, setIncomes] = useState([]);
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

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedIncome, setSelectedIncome] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    const filteredIncomes = incomes.filter(row => {
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

        // Search Filter
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            const voucherNo = String(row.voucherNumber || '').toLowerCase();
            const manualNo = String(row.manualReceiptNo || '').toLowerCase();
            const receivedIn = String(row.receivedIn?.name || '').toLowerCase();
            const accountsList = String(row.accounts || '').toLowerCase();
            const narration = String(row.mainNarration || '').toLowerCase();
            const amount = String(row.totalAmount || '').toLowerCase();
            const dateStr = new Date(row.date).toLocaleDateString().toLowerCase();

            return (
                voucherNo.includes(query) ||
                manualNo.includes(query) ||
                receivedIn.includes(query) ||
                accountsList.includes(query) ||
                narration.includes(query) ||
                amount.includes(query) ||
                dateStr.includes(query)
            );
        }

        return true;
    });

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        manualReceiptNo: '',
        receivedInAccountId: '',
        items: [
            { accountId: '', amount: '', narration: '' }
        ],
        mainNarration: '',
        signature: null,
        logo: null
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

        // Fetch Incomes
        try {
            const incomesRes = await chartOfAccountsService.getIncome(companyId);
            if (incomesRes.success) {
                setIncomes(incomesRes.data);
            }
        } catch (error) {
            console.error('Error fetching income:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle deep-linking of a specific income voucher
    useEffect(() => {
        if (location.state && location.state.targetIncomeId && incomes.length > 0) {
            const targetId = parseInt(location.state.targetIncomeId);
            const incomeObj = incomes.find(i => i.id === targetId);
            if (incomeObj) {
                handleView(incomeObj);
            }
            // Clear state so re-renders don't re-trigger modal opening
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, incomes, navigate]);

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            manualReceiptNo: '',
            receivedInAccountId: '',
            items: [{ accountId: '', amount: '', narration: '' }],
            mainNarration: '',
            signature: null,
            logo: null
        });
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

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, signature: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrint = () => {
        if (!selectedIncome) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const itemsHtml = selectedIncome.items.map(item => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px;">${accounts.find(a => a.id === item.accountId)?.name || item.accountId}</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${item.narration || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${formatCurrency(item.amount)}</td>
            </tr>
        `).join('');

        const content = `
            <html>
                <head>
                    <title>Income Voucher - ${selectedIncome.voucherNumber}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
                        .logo { max-height: 70px; max-width: 150px; object-fit: contain; }
                        .company-details { font-size: 12px; color: #475569; line-height: 1.4; }
                        .company-name { font-size: 18px; font-weight: 700; color: #1a5f7a; margin: 0 0 5px 0; text-transform: uppercase; }
                        .voucher-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #444; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .detail-item { font-size: 14px; margin-bottom: 5px; }
                        .detail-label { font-weight: bold; color: #666; width: 120px; display: inline-block; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background: #f8fafc; border: 1px solid #ddd; padding: 12px 10px; text-align: left; font-size: 13px; color: #444; }
                        .total-section { display: flex; justify-content: flex-end; margin-top: -10px; }
                        .total-box { width: 250px; }
                        .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .grand-total { font-weight: bold; font-size: 18px; color: #1a5f7a; border-bottom: 2px solid #1a5f7a; }
                        .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .signature-container { text-align: center; width: 200px; }
                        .signature-box { border-bottom: 1px solid #333; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
                        .signature-img { max-height: 70px; max-width: 180px; }
                        .signature-label { font-size: 13px; font-weight: bold; color: #444; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
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
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: bold; color: #1a5f7a;">${getDocumentTitle('income')}</div>
                            <div style="font-family: monospace; font-size: 12px; margin-top: 5px;">NO: ${selectedIncome.voucherNumber}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 3px;">Date: ${new Date(selectedIncome.date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="voucher-title">${getDocumentTitle('income')}</div>

                    <div class="details-grid">
                        <div>
                            <div class="detail-item"><span class="detail-label">Voucher No:</span> ${selectedIncome.voucherNumber}</div>
                            <div class="detail-item"><span class="detail-label">Date:</span> ${new Date(selectedIncome.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div class="detail-item"><span class="detail-label">Manual Ref:</span> ${selectedIncome.manualReceiptNo || '-'}</div>
                            <div class="detail-item"><span class="detail-label">Received In:</span> ${selectedIncome.receivedIn?.name || '-'}</div>
                        </div>
                    </div>

                    <!-- Custom Fields in Print -->
                    ${(() => {
                        let customFieldVals = {};
                        if (selectedIncome.customFields) {
                            try {
                                customFieldVals = typeof selectedIncome.customFields === 'string'
                                    ? JSON.parse(selectedIncome.customFields)
                                    : selectedIncome.customFields;
                            } catch (e) {
                                console.error('Error parsing custom fields for print:', e);
                            }
                        }
                        const fieldsList = getCustomFieldsForType('incomeentry');
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
                                <th>Account Name</th>
                                <th>Description / Narration</th>
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
                                <span>${formatCurrency(selectedIncome.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 30px;">
                        <p style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Narration:</p>
                        <p style="font-size: 14px; color: #555; background: #f9f9f9; padding: 10px; border-radius: 4px;">${selectedIncome.mainNarration || 'No narration provided.'}</p>
                    </div>

                    ${(companySettings?.notes || companySettings?.terms) ? `
                    <div class="company-footer-print" style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; color: #555;">
                        <div>
                            ${companySettings?.notes ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Notes & Privacy Policy</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.notes}</div>
                            ` : ''}
                        </div>
                        <div>
                            ${companySettings?.terms ? `
                                <div style="font-weight: 700; text-transform: uppercase; color: #333; margin-bottom: 5px; font-size: 10px;">Terms & Conditions</div>
                                <div style="white-space: pre-line; line-height: 1.4; color: #666;">${companySettings.terms}</div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <div class="footer">
                        <div style="font-size: 12px; color: #888;">
                            Generated on ${new Date().toLocaleString()}
                        </div>
                        <div class="signature-container">
                            <div class="signature-box">
                                ${selectedIncome.signature ? `<img src="${selectedIncome.signature}" class="signature-img" />` : ''}
                            </div>
                            <div class="signature-label">Authorized Signature</div>
                        </div>
                    </div>
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

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const handleSave = async () => {
        try {
            if (!formData.receivedInAccountId || !formData.date) {
                toast.error("Please fill required fields (Date, Received In)");
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
                customFields: JSON.stringify(customFieldValues)
            };

            if (selectedIncome) {
                await chartOfAccountsService.updateIncome(selectedIncome.voucherNumber, payload, companyId);
                toast.success('Income updated successfully');
            } else {
                await chartOfAccountsService.createIncome(payload, companyId);
                toast.success('Income voucher created successfully');
            }

            setIsCreateOpen(false);
            fetchData();
            setSelectedIncome(null); // Reset selection
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save income');
        }
    };

    const handleEdit = (row) => {
        setSelectedIncome(row);
        setFormData({
            date: new Date(row.date).toISOString().split('T')[0],
            manualReceiptNo: row.manualReceiptNo || '',
            receivedInAccountId: row.receivedInAccountId,
            items: row.items.map(i => ({
                accountId: i.accountId,
                amount: i.amount,
                narration: i.narration
            })),
            mainNarration: row.mainNarration || '',
            signature: row.signature || null,
            logo: row.logo || null
        });

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
        setSelectedIncome(row);
        setIsViewOpen(true);
    };

    const openDelete = (income) => {
        setSelectedIncome(income);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        try {
            await chartOfAccountsService.deleteIncome(selectedIncome.voucherNumber);
            toast.success('Income deleted successfully');
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete income');
        }
    };



    return (
        <div className="Income-expenses-page">
            <div className="Income-page-header">
                <div>
                    <h1 className="Income-page-title">Income</h1>
                </div>
                {hasPermission('create income') && (
                    <button className="Income-expenses-btn-dark" onClick={() => { resetForm(); setSelectedIncome(null); setIsCreateOpen(true); }}>
                        <Plus size={18} /> Create Voucher
                    </button>
                )}
            </div>

            <div className="Income-table-card">
                <div className="Income-table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="entries-control" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <select defaultValue="10">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                        <span>entries per page</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-control" style={{ margin: 0, position: 'relative' }}>
                            <Search size={18} className="search-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                style={{ paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                onChange={(e) => setFilterFromDate(e.target.value)}
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
                    <table className="Income-data-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>AUTO RECEIPT NO</th>
                                <th>MANUAL RECEIPT NO</th>
                                <th>RECEIVED IN</th>
                                <th>ACCOUNTS</th>
                                <th>TOTAL AMOUNT</th>
                                <th>NARRATION</th>
                                <th className="text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center p-4">Loading...</td></tr>
                            ) : incomes.length === 0 ? (
                                <tr><td colSpan="8" className="text-center p-4">No data available</td></tr>
                            ) : filteredIncomes.length === 0 ? (
                                <tr><td colSpan="8" className="text-center p-4">No data match the selected filters</td></tr>
                            ) : (
                                filteredIncomes.map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td>{row.voucherNumber}</td>
                                        <td>{row.manualReceiptNo || '-'}</td>
                                        <td>{row.receivedIn?.name || '-'}</td>
                                        <td>{row.accounts}</td>
                                        <td>{formatCurrency(row.totalAmount)}</td>
                                        <td>{row.mainNarration || '-'}</td>
                                        <td className="text-left">
                                            <div className="Income-action-buttons1">
                                                <button className="Income-expenses-btn-icon Income-view" onClick={() => handleView(row)} title="View">
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit income') && (
                                                    <button className="Income-expenses-btn-icon Income-edit" onClick={() => handleEdit(row)} title="Edit">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete income') && (
                                                    <button className="Income-expenses-btn-icon Income-delete" onClick={() => openDelete(row)} title="Delete">
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

            {/* View Modal */}
            {isViewOpen && selectedIncome && (
                <div className="Income-modal-overlay">
                    <div className="Income-modal-content Income-large-modal">
                        <div className="Income-modal-header">
                            <h2>View Voucher Details</h2>
                            <button className="Income-close-btn" onClick={() => setIsViewOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Income-modal-body">
                            <div className="Income-form-row">
                                <div className="Income-form-group Income-half">
                                    <label>Voucher No</label>
                                    <input type="text" value={selectedIncome.voucherNumber} disabled className="bg-gray-100" />
                                </div>
                                <div className="Income-form-group Income-half">
                                    <label>Date</label>
                                    <input type="text" value={new Date(selectedIncome.date).toLocaleDateString()} disabled className="bg-gray-100" />
                                </div>
                            </div>
                            <div className="Income-form-row">
                                <div className="Income-form-group Income-half">
                                    <label>Manual Ref</label>
                                    <input type="text" value={selectedIncome.manualReceiptNo || '-'} disabled className="bg-gray-100" />
                                </div>
                                <div className="Income-form-group Income-half">
                                    <label>Received In</label>
                                    <input type="text" value={selectedIncome.receivedIn?.name || '-'} disabled className="bg-gray-100" />
                                </div>
                            </div>

                            {/* Custom Fields View */}
                            {(() => {
                                let customFieldVals = {};
                                if (selectedIncome?.customFields) {
                                    try {
                                        customFieldVals = typeof selectedIncome.customFields === 'string'
                                            ? JSON.parse(selectedIncome.customFields)
                                            : selectedIncome.customFields;
                                    } catch (e) {
                                        console.error('Error parsing income custom fields for view:', e);
                                    }
                                }
                                const fieldsList = getCustomFieldsForType('incomeentry');
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

                            <div className="Income-items-table-wrapper mt-4">
                                <table className="Income-items-table view-table">
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th>Narration</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedIncome.items.map((item, index) => (
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
                                            <td className="text-right font-bold">{formatCurrency(selectedIncome.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="Income-form-group mt-4">
                                <label>Main Narration</label>
                                <textarea rows="2" value={selectedIncome.mainNarration || '-'} disabled className="bg-gray-100"></textarea>
                            </div>
                            {selectedIncome.signature && (
                                <div className="Income-view-signature mt-4">
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>Authorized Signature</label>
                                    <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', display: 'inline-block' }}>
                                        <img src={selectedIncome.signature} alt="Signature" style={{ maxHeight: '80px' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="Income-modal-footer">
                            <button className="Income-btn-print" onClick={handlePrint} style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Search size={18} /> Print Voucher
                            </button>
                            <div style={{ flex: 1 }}></div>
                            <button className="Income-btn-cancel" onClick={() => setIsViewOpen(false)}>Close</button>
                            {hasPermission('edit income') && (
                                <button className="Income-btn-save" onClick={() => { setIsViewOpen(false); handleEdit(selectedIncome); }}>Edit</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="Income-modal-overlay">
                    <div className="Income-modal-content Income-large-modal">
                        <div className="Income-modal-header">
                            <h2>{selectedIncome ? 'Edit Voucher' : 'Create Voucher'}</h2>
                            <button className="Income-close-btn" onClick={() => setIsCreateOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Income-modal-body">
                            <div className="Income-form-row">
                                <div className="Income-form-group Income-half">
                                    <label>Auto Receipt No</label>
                                    <input type="text" value={selectedIncome ? selectedIncome.voucherNumber : "AUTO-GENERATED"} disabled className="bg-gray-100" />
                                </div>
                                <div className="Income-form-group Income-half">
                                    <label>Manual Receipt No</label>
                                    <input
                                        type="text"
                                        placeholder="Enter manual number"
                                        value={formData.manualReceiptNo}
                                        onChange={(e) => setFormData({ ...formData, manualReceiptNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="Income-form-row">
                                <div className="Income-form-group Income-half">
                                    <label>Voucher Date<span className="Income-required">*</span></label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="Income-form-group Income-half">
                                    <label>Received In<span className="Income-required">*</span></label>
                                    <select
                                        value={formData.receivedInAccountId}
                                        onChange={(e) => setFormData({ ...formData, receivedInAccountId: e.target.value })}
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.filter(a => {
                                            const sub = a.groupName?.toLowerCase() || '';
                                            const name = a.name?.toLowerCase() || '';
                                            return a.type === 'ASSETS' && (sub.includes('cash') || sub.includes('bank') || name.includes('cash') || name.includes('bank'));
                                        }).map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Custom Fields Section */}
                            {getCustomFieldsForType('incomeentry').length > 0 && (
                                <div className="Income-custom-fields-section" style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Custom Fields
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '15px' }}>
                                        {getCustomFieldsForType('incomeentry').map(field => (
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
                            <div className="Income-items-table-wrapper">
                                <table className="Income-items-table">
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
                                                    <select
                                                        value={item.accountId}
                                                        onChange={(e) => handleItemChange(index, 'accountId', e.target.value)}
                                                    >
                                                        <option value="">Search account...</option>
                                                        {accounts.filter(a => a.type === 'INCOME' || a.vendorId !== null || ['Sundry Creditors', 'Accounts Payable', 'Account Payable'].includes(a.groupName)).map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </select>
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
                                                    <button className="Income-expenses-btn-icon-red" onClick={() => handleRemoveItem(index)}>
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
                                <button className="Income-btn-add-row" onClick={handleAddItem}>
                                    + Add Row
                                </button>
                            </div>

                            <div className="Income-form-group mt-4">
                                <label>Voucher Narration</label>
                                <textarea
                                    rows="3"
                                    placeholder="Enter narration for this voucher..."
                                    value={formData.mainNarration}
                                    onChange={(e) => setFormData({ ...formData, mainNarration: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Signature and Logo Upload */}
                            <div className="Income-form-row mt-4">
                                {/* <div className="Income-form-group Income-half">
                                    <label>Company Logo</label>
                                    <div className="logo-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} id="income-logo-upload" style={{ display: 'none' }} />
                                        <label htmlFor="income-logo-upload" style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                                            {formData.logo ? (
                                                <img src={formData.logo} alt="Logo Preview" style={{ maxHeight: '60px', maxWidth: '100%' }} />
                                            ) : (
                                                <div style={{ color: '#64748b' }}>Click to upload Logo</div>
                                            )}
                                        </label>
                                        {formData.logo && <button onClick={() => setFormData(prev => ({ ...prev, logo: null }))} style={{ color: '#ef4444', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Remove Logo</button>}
                                    </div>
                                </div> */}
                                <div className="Income-form-group Income-half">
                                    <label>Authorized Signature</label>
                                    <div className="signature-upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <input type="file" accept="image/*" onChange={handleSignatureUpload} id="income-sig-upload" style={{ display: 'none' }} />
                                        <label htmlFor="income-sig-upload" style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                                            {formData.signature ? (
                                                <img src={formData.signature} alt="Signature Preview" style={{ maxHeight: '60px', maxWidth: '100%' }} />
                                            ) : (
                                                <div style={{ color: '#64748b' }}>Click to upload Signature</div>
                                            )}
                                        </label>
                                        {formData.signature && <button onClick={() => setFormData(prev => ({ ...prev, signature: null }))} style={{ color: '#ef4444', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Remove Signature</button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="Income-modal-footer">
                            <button className="Income-btn-cancel" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                            <button className="Income-btn-save" onClick={handleSave}>{selectedIncome ? 'Update' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="Income-modal-overlay">
                    <div className="Income-modal-content Income-small-modal">
                        <div className="Income-modal-header">
                            <h2>Delete Income</h2>
                            <button className="Income-close-btn" onClick={() => setIsDeleteOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Income-modal-body">
                            <p>Are you sure you want to delete voucher <b>{selectedIncome?.voucherNumber}</b>?</p>
                        </div>
                        <div className="Income-modal-footer">
                            <button className="Income-btn-cancel" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
                            <button className="Income-btn-delete-confirm" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Income;
