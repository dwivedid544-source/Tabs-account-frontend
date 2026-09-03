import React, { useState, useEffect } from 'react';
import {
    Plus, Search, RotateCcw, Edit, Trash2, ChevronRight, X, Calendar, Save, Trash, Eye, Printer, Upload
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import voucherService from '../../../services/voucherService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import GetCompanyId from '../../../api/GetCompanyId';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import './DrawingCapital.css';

const DrawingCapital = () => {
    const { formatCurrency, companySettings, getDocumentTitle } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [vouchers, setVouchers] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        voucherNumber: '',
        equityAccountId: '',
        cashBankAccountId: '',
        amount: '',
        notes: '',
        signature: null,
        logo: null
    });

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        const companyId = GetCompanyId();

        // Fetch Accounts
        try {
            const coaRes = await chartOfAccountsService.getChartOfAccounts(companyId);
            if (coaRes.success) {
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
                setAccountList(flatAccounts);
            }
        } catch (error) {
            console.error('Error fetching COA:', error);
            toast.error('Failed to load accounts');
        }

        // Fetch Capital Drawings Vouchers
        try {
            const res = await voucherService.getVouchers(companyId);
            if (res.success) {
                // Filter only Capital Drawings
                const filtered = res.data.filter(v => v.paidFromAccount === 'CAPITAL_DRAWING');
                setVouchers(filtered);
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (location.state && location.state.targetDrawingId && vouchers.length > 0) {
            const targetId = parseInt(location.state.targetDrawingId);
            const targetVoucher = vouchers.find(v => v.id === targetId);
            if (targetVoucher) {
                handleView(targetVoucher);
            }
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, vouchers, navigate]);

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            voucherNumber: `CAP-DRW-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
            equityAccountId: '',
            cashBankAccountId: '',
            amount: '',
            notes: '',
            signature: null,
            logo: null
        });
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

    const handleSave = async () => {
        try {
            const { date, voucherNumber, equityAccountId, cashBankAccountId, amount, notes, logo, signature } = formData;

            if (!equityAccountId || !cashBankAccountId || !amount || !date || !voucherNumber) {
                toast.error("Please fill all required fields");
                return;
            }

            if (parseFloat(amount) <= 0) {
                toast.error("Amount must be greater than zero");
                return;
            }

            const companyId = GetCompanyId();
            
            // Build Journal Rows for Drawing Capital
            // DR Equity Account (Equity)
            // CR Cash/Bank Account (Asset)
            const journalRows = [
                {
                    type: 'Dr',
                    accountId: parseInt(equityAccountId),
                    debit: parseFloat(amount),
                    credit: 0,
                    narration: notes || 'Capital withdrawn from business'
                },
                {
                    type: 'Cr',
                    accountId: parseInt(cashBankAccountId),
                    debit: 0,
                    credit: parseFloat(amount),
                    narration: notes || 'Capital withdrawn from business'
                }
            ];

            const payload = {
                voucherNumber,
                voucherType: 'JOURNAL',
                date,
                notes,
                isJournal: true,
                paidFromAccount: 'CAPITAL_DRAWING',
                journalRows,
                companyId,
                logo,
                signature
            };

            if (selectedVoucher) {
                await voucherService.updateVoucher(selectedVoucher.id, payload);
                toast.success('Capital drawing updated successfully');
            } else {
                await voucherService.createVoucher(payload);
                toast.success('Capital drawing saved successfully');
            }

            setIsCreateOpen(false);
            fetchData();
            setSelectedVoucher(null);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save capital drawing');
        }
    };

    const handleEdit = (row) => {
        setSelectedVoucher(row);

        // Find Debit (Equity) and Credit (Cash/Bank) rows from voucher items
        const drRow = row.voucheritem?.find(item => item.debit > 0);
        const crRow = row.voucheritem?.find(item => item.credit > 0);

        setFormData({
            date: new Date(row.date).toISOString().split('T')[0],
            voucherNumber: row.voucherNumber,
            equityAccountId: drRow ? drRow.ledgerId : '',
            cashBankAccountId: crRow ? crRow.ledgerId : '',
            amount: drRow ? drRow.debit : (crRow ? crRow.credit : 0),
            notes: row.notes || '',
            signature: row.signature || null,
            logo: row.logo || null
        });
        setIsCreateOpen(true);
    };

    const handleView = (row) => {
        setSelectedVoucher(row);
        setIsViewOpen(true);
    };

    const openDelete = (row) => {
        setSelectedVoucher(row);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        try {
            await voucherService.deleteVoucher(selectedVoucher.id);
            toast.success('Capital drawing voucher deleted successfully');
            setIsDeleteOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete capital drawing');
        }
    };

    const handlePrint = () => {
        if (!selectedVoucher) return;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const drRow = selectedVoucher.voucheritem?.find(item => item.debit > 0);
        const crRow = selectedVoucher.voucheritem?.find(item => item.credit > 0);

        const content = `
            <html>
                <head>
                    <title>Drawing Capital Voucher - ${selectedVoucher.voucherNumber}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #ef4444; padding-bottom: 15px; }
                        .logo { max-width: 150px; max-height: 80px; }
                        .company-info h1 { margin: 0; color: #7f1d1d; font-size: 24px; }
                        .voucher-title { text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #444; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .detail-item { font-size: 14px; margin-bottom: 5px; }
                        .detail-label { font-weight: bold; color: #666; width: 180px; display: inline-block; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background: #f8fafc; border: 1px solid #ddd; padding: 12px 10px; text-align: left; font-size: 13px; color: #444; }
                        td { padding: 12px 10px; border: 1px solid #ddd; font-size: 13px; }
                        .total-section { display: flex; justify-content: flex-end; margin-top: -10px; }
                        .total-box { width: 250px; }
                        .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .grand-total { font-weight: bold; font-size: 18px; color: #7f1d1d; border-bottom: 2px solid #7f1d1d; }
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
                            <div class="company-info">
                                <h1>${companySettings?.name || 'Your Company'}</h1>
                                <p style="margin: 5px 0; color: #666; font-size: 13px;">${companySettings?.address || ''}</p>
                                <p style="margin: 2px 0; color: #666; font-size: 12px;">
                                    ${companySettings?.phone ? `Phone: ${companySettings.phone}` : ''}
                                    ${companySettings?.email ? ` | Email: ${companySettings.email}` : ''}
                                </p>
                                ${companySettings?.gstNumber ? `<p style="margin: 2px 0; font-size: 12px; font-weight: 600;">GSTIN: ${companySettings.gstNumber}</p>` : ''}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: bold; color: #7f1d1d;">${getDocumentTitle('drawingcapital')}</div>
                            <div style="font-family: monospace; font-size: 12px; margin-top: 5px;">NO: ${selectedVoucher.voucherNumber}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 3px;">Date: ${new Date(selectedVoucher.date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="voucher-title">${getDocumentTitle('drawingcapital')}</div>

                    <div class="details-grid">
                        <div>
                            <div class="detail-item"><span class="detail-label">Voucher Number:</span> ${selectedVoucher.voucherNumber}</div>
                            <div class="detail-item"><span class="detail-label">Date:</span> ${new Date(selectedVoucher.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div class="detail-item"><span class="detail-label">Equity Account (Debit):</span> ${drRow ? drRow.ledgerName : '-'}</div>
                            <div class="detail-item"><span class="detail-label">Cash/Bank Account (Credit):</span> ${crRow ? crRow.ledgerName : '-'}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Debit (DR)</th>
                                <th>Credit (CR)</th>
                                <th>Narration</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${drRow ? drRow.ledgerName : '-'}</td>
                                <td>${drRow ? formatCurrency(drRow.debit) : '-'}</td>
                                <td>-</td>
                                <td>Capital debit to Equity</td>
                            </tr>
                            <tr>
                                <td>${crRow ? crRow.ledgerName : '-'}</td>
                                <td>-</td>
                                <td>${crRow ? formatCurrency(crRow.credit) : '-'}</td>
                                <td>Capital withdrawn from Cash/Bank</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div class="total-box">
                            <div class="total-row grand-total">
                                <span>Total Capital Withdrawn:</span>
                                <span>${formatCurrency(selectedVoucher.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 30px;">
                        <p style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Narration / Notes:</p>
                        <p style="font-size: 14px; color: #555; background: #f9f9f9; padding: 10px; border-radius: 4px;">${selectedVoucher.notes || 'No notes provided.'}</p>
                    </div>

                    <div class="footer">
                        <div style="font-size: 12px; color: #888;">
                            Generated on ${new Date().toLocaleString()}
                        </div>
                        <div class="signature-container">
                            <div class="signature-box">
                                ${selectedVoucher.signature ? `<img src="${selectedVoucher.signature}" class="signature-img" />` : ''}
                            </div>
                            <div class="signature-label">Owner Signature</div>
                        </div>
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

    // Filters
    const equityAccounts = accountList.filter(acc => acc.type === 'EQUITY');
    const cashBankAccounts = accountList.filter(acc => {
        const sub = acc.accountsubgroup?.name?.toLowerCase() || '';
        const name = acc.name?.toLowerCase() || '';
        return sub.includes('cash') || sub.includes('bank') || name.includes('cash') || name.includes('bank');
    });

    const filteredVouchers = vouchers.filter(v => {
        if (v.date) {
            const vDate = new Date(v.date);
            vDate.setHours(0, 0, 0, 0);

            if (filterFromDate) {
                const from = new Date(filterFromDate);
                from.setHours(0, 0, 0, 0);
                if (vDate < from) return false;
            }
            if (filterToDate) {
                const to = new Date(filterToDate);
                to.setHours(23, 59, 59, 999);
                if (vDate > to) return false;
            }
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const vchNo = (v.voucherNumber || '').toLowerCase();
            const notes = (v.notes || '').toLowerCase();
            if (!vchNo.includes(term) && !notes.includes(term)) {
                return false;
            }
        }
        return true;
    });

    return (
        <div className="Drawing-page-wrapper">
            <div className="Drawing-page-header">
                <div>
                    <h1 className="Drawing-page-title">Capital Drawings</h1>
                    <p className="Drawing-page-subtitle">Record and track business capital withdrawals (DR Equity, CR Cash/Bank)</p>
                </div>
                {hasPermission('create journal voucher') && (
                    <button className="Drawing-btn-add" onClick={() => { resetForm(); setSelectedVoucher(null); setIsCreateOpen(true); }}>
                        <Plus size={18} /> Record Capital Drawing
                    </button>
                )}
            </div>

            <div className="Drawing-table-card">
                <div className="Drawing-table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="Drawing-search-control" style={{ margin: 0, position: 'relative' }}>
                        <Search size={18} className="Drawing-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by Voucher No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

                <div className="Drawing-table-responsive">
                    <table className="Drawing-data-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>VOUCHER NO</th>
                                <th>EQUITY ACCOUNT (DR)</th>
                                <th>CASH/BANK ACCOUNT (CR)</th>
                                <th>AMOUNT</th>
                                <th>NOTES</th>
                                <th className="text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center p-4">Loading drawings...</td></tr>
                            ) : filteredVouchers.length > 0 ? (
                                filteredVouchers.map((row) => {
                                    const drRow = row.voucheritem?.find(item => item.debit > 0);
                                    const crRow = row.voucheritem?.find(item => item.credit > 0);
                                    return (
                                        <tr key={row.id}>
                                            <td>{new Date(row.date).toLocaleDateString()}</td>
                                            <td>{row.voucherNumber}</td>
                                            <td>{drRow ? drRow.ledgerName : '-'}</td>
                                            <td>{crRow ? crRow.ledgerName : '-'}</td>
                                            <td className="font-bold text-red-600">{formatCurrency(row.totalAmount)}</td>
                                            <td>{row.notes || '-'}</td>
                                            <td>
                                                <div className="Drawing-action-buttons">
                                                    <button className="Drawing-btn-icon view" onClick={() => handleView(row)} title="View">
                                                        <Eye size={16} />
                                                    </button>
                                                    {hasPermission('edit journal voucher') && (
                                                        <button className="Drawing-btn-icon edit" onClick={() => handleEdit(row)} title="Edit">
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    {hasPermission('delete journal voucher') && (
                                                        <button className="Drawing-btn-icon delete" onClick={() => openDelete(row)} title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : vouchers.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-4">No capital drawings recorded</td></tr>
                            ) : (
                                <tr><td colSpan="7" className="text-center p-4">No capital drawings match the selected filters</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {isViewOpen && selectedVoucher && (() => {
                const drRow = selectedVoucher.voucheritem?.find(item => item.debit > 0);
                const crRow = selectedVoucher.voucheritem?.find(item => item.credit > 0);
                return (
                    <div className="Drawing-modal-overlay">
                        <div className="Drawing-modal-content">
                            <div className="Drawing-modal-header">
                                <h2>Capital Drawing Details</h2>
                                <button className="Drawing-close-btn" onClick={() => setIsViewOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="Drawing-modal-body">
                                <div className="Drawing-form-row">
                                    <div className="Drawing-form-group Drawing-half">
                                        <label>Voucher Number</label>
                                        <input type="text" value={selectedVoucher.voucherNumber} disabled className="bg-gray-100" />
                                    </div>
                                    <div className="Drawing-form-group Drawing-half">
                                        <label>Date</label>
                                        <input type="text" value={new Date(selectedVoucher.date).toLocaleDateString()} disabled className="bg-gray-100" />
                                    </div>
                                </div>
                                <div className="Drawing-form-row">
                                    <div className="Drawing-form-group Drawing-half">
                                        <label>Equity Account (Debit)</label>
                                        <input type="text" value={drRow ? drRow.ledgerName : '-'} disabled className="bg-gray-100" />
                                    </div>
                                    <div className="Drawing-form-group Drawing-half">
                                        <label>Cash/Bank Account (Credit)</label>
                                        <input type="text" value={crRow ? crRow.ledgerName : '-'} disabled className="bg-gray-100" />
                                    </div>
                                </div>
                                <div className="Drawing-form-group mt-3">
                                    <label>Amount Withdrawn</label>
                                    <input type="text" value={formatCurrency(selectedVoucher.totalAmount)} disabled className="bg-gray-100 font-bold text-red-600" />
                                </div>
                                <div className="Drawing-form-group mt-3">
                                    <label>Notes / Narration</label>
                                    <textarea rows="3" value={selectedVoucher.notes || '—'} disabled className="bg-gray-100"></textarea>
                                </div>

                                {selectedVoucher.signature && (
                                    <div className="Drawing-signature-preview-box mt-3">
                                        <label>Owner Signature</label>
                                        <div>
                                            <img src={selectedVoucher.signature} alt="Owner Signature" style={{ maxHeight: '80px' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="Drawing-modal-footer">
                                <button className="Drawing-btn-print-action" onClick={handlePrint}>
                                    <Printer size={16} /> Print Voucher
                                </button>
                                <div style={{ flex: 1 }}></div>
                                <button className="Drawing-btn-close" onClick={() => setIsViewOpen(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Create / Edit Modal */}
            {isCreateOpen && (
                <div className="Drawing-modal-overlay">
                    <div className="Drawing-modal-content">
                        <div className="Drawing-modal-header">
                            <h2>{selectedVoucher ? 'Edit Capital Entry' : 'Record Capital Drawing'}</h2>
                            <button className="Drawing-close-btn" onClick={() => setIsCreateOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Drawing-modal-body">
                            <div className="Drawing-form-row">
                                <div className="Drawing-form-group Drawing-half">
                                    <label>Voucher Number <span className="required">*</span></label>
                                    <input type="text" value={formData.voucherNumber} onChange={(e) => setFormData({ ...formData, voucherNumber: e.target.value })} />
                                </div>
                                <div className="Drawing-form-group Drawing-half">
                                    <label>Date <span className="required">*</span></label>
                                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>
                            <div className="Drawing-form-row">
                                <div className="Drawing-form-group Drawing-half">
                                    <label>Equity Account <span className="required">*</span></label>
                                    <select
                                        value={formData.equityAccountId}
                                        onChange={(e) => setFormData({ ...formData, equityAccountId: e.target.value })}
                                    >
                                        <option value="">Select Equity Account</option>
                                        {equityAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="Drawing-form-group Drawing-half">
                                    <label>Withdraw To (Cash/Bank Account) <span className="required">*</span></label>
                                    <select
                                        value={formData.cashBankAccountId}
                                        onChange={(e) => setFormData({ ...formData, cashBankAccountId: e.target.value })}
                                    >
                                        <option value="">Select Cash/Bank Account</option>
                                        {cashBankAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="Drawing-form-group mt-3">
                                <label>Amount Withdrawn <span className="required">*</span></label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="Drawing-form-group mt-3">
                                <label>Narration / Notes</label>
                                <textarea
                                    rows="3"
                                    placeholder="Describe the drawings details..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Logo and Signature Uploads */}
                            <div className="Drawing-form-row mt-3">
                                <div className="Drawing-form-group Drawing-half">
                                    <label>Authorized Signature</label>
                                    <div className="Drawing-upload-box">
                                        <input type="file" accept="image/*" onChange={handleSignatureUpload} id="drawing-sig-upload" style={{ display: 'none' }} />
                                        <label htmlFor="drawing-sig-upload" className="Drawing-upload-btn">
                                            {formData.signature ? (
                                                <img src={formData.signature} alt="Signature Preview" style={{ maxHeight: '50px' }} />
                                            ) : (
                                                <div>Click to upload Signature</div>
                                            )}
                                        </label>
                                        {formData.signature && (
                                            <button onClick={() => setFormData(prev => ({ ...prev, signature: null }))} className="Drawing-remove-btn">
                                                Remove Signature
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="Drawing-modal-footer">
                            <button className="Drawing-btn-cancel" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                            <button className="Drawing-btn-save" onClick={handleSave}>{selectedVoucher ? 'Update' : 'Save Entry'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && (
                <div className="Drawing-modal-overlay">
                    <div className="Drawing-modal-content Drawing-small-modal">
                        <div className="Drawing-modal-header">
                            <h2>Delete Capital Drawing</h2>
                            <button className="Drawing-close-btn" onClick={() => setIsDeleteOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Drawing-modal-body">
                            <p>Are you sure you want to delete capital drawing voucher <b>{selectedVoucher?.voucherNumber}</b>?</p>
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px' }}>Warning: This will reverse all ledger balances associated with this capital drawing entry.</p>
                        </div>
                        <div className="Drawing-modal-footer">
                            <button className="Drawing-btn-cancel" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
                            <button className="Drawing-btn-delete-confirm" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DrawingCapital;
