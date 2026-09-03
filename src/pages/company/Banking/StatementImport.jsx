import React, { useState, useEffect, useContext } from 'react';
import {
    Upload, FileSpreadsheet, ArrowLeft, CheckCircle2, AlertCircle,
    Calendar, DollarSign, Download, RefreshCw, Trash2, ArrowRight
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompanyContext } from '../../../context/CompanyContext';
import bankingService from '../../../services/bankingService';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import './StatementImport.css';

const StatementImport = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { formatCurrency } = useContext(CompanyContext);

    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(searchParams.get('bankAccountId') || '');
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [rawHeaders, setRawHeaders] = useState([]);
    const [rawRows, setRawRows] = useState([]);
    const [parsedPreview, setParsedPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    // Column Mapping states
    const [dateCol, setDateCol] = useState('');
    const [descCol, setDescCol] = useState('');
    const [refCol, setRefCol] = useState('');
    const [amountMode, setAmountMode] = useState('single'); // 'single' or 'split'
    const [amountCol, setAmountCol] = useState('');
    const [debitCol, setDebitCol] = useState('');
    const [creditCol, setCreditCol] = useState('');

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const res = await bankingService.getBankAccounts();
                if (res?.success) {
                    setAccounts(res.data || []);
                    if (!selectedAccountId && res.data.length > 0) {
                        setSelectedAccountId(res.data[0].id.toString());
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load bank accounts');
            }
        };
        loadAccounts();
    }, []);

    // File upload handler
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setFileName(uploadedFile.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                if (data.length < 2) {
                    toast.error('File appears to be empty or missing header rows.');
                    return;
                }

                // Find header row (first non-empty row)
                let headerRowIndex = 0;
                while (headerRowIndex < data.length && (!data[headerRowIndex] || data[headerRowIndex].length === 0 || !data[headerRowIndex].some(c => c))) {
                    headerRowIndex++;
                }

                const headers = data[headerRowIndex].map(h => (h || '').toString().trim());
                setRawHeaders(headers);

                // Convert remaining rows into objects
                const rowsData = [];
                for (let i = headerRowIndex + 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.every(cell => cell === '')) continue;
                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        if (h) rowObj[h] = row[idx];
                    });
                    rowsData.push(rowObj);
                }

                setRawRows(rowsData);
                autoDetectColumns(headers, rowsData);
                toast.success(`Loaded ${rowsData.length} rows from file!`);
            } catch (err) {
                console.error('File parsing error:', err);
                toast.error('Error parsing file: ' + err.message);
            }
        };
        reader.readAsBinaryString(uploadedFile);
    };

    // Auto-detect columns intelligently based on typical banking headers
    const autoDetectColumns = (headers, rows) => {
        const lowerHeaders = headers.map(h => h.toLowerCase());

        // Date
        const dateIdx = lowerHeaders.findIndex(h => h.includes('date') || h.includes('time'));
        if (dateIdx !== -1) setDateCol(headers[dateIdx]);

        // Description
        const descIdx = lowerHeaders.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('detail') || h.includes('payee') || h.includes('memo') || h.includes('particular'));
        if (descIdx !== -1) setDescCol(headers[descIdx]);

        // Reference
        const refIdx = lowerHeaders.findIndex(h => h.includes('ref') || h.includes('chq') || h.includes('cheque') || h.includes('trans id') || h.includes('number'));
        if (refIdx !== -1) setRefCol(headers[refIdx]);

        // Debit / Credit vs Single Amount
        const debitIdx = lowerHeaders.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('spent') || h.includes('paid') || h.includes('dr'));
        const creditIdx = lowerHeaders.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('received') || h.includes('cr'));

        if (debitIdx !== -1 && creditIdx !== -1) {
            setAmountMode('split');
            setDebitCol(headers[debitIdx]);
            setCreditCol(headers[creditIdx]);
        } else {
            const amtIdx = lowerHeaders.findIndex(h => h.includes('amount') || h.includes('total') || h.includes('sum'));
            setAmountMode('single');
            if (amtIdx !== -1) setAmountCol(headers[amtIdx]);
        }
    };

    // Recalculate parsed preview whenever mapping changes
    useEffect(() => {
        if (!rawRows || rawRows.length === 0 || !dateCol) {
            setParsedPreview([]);
            return;
        }

        const preview = rawRows.slice(0, 100).map((r, idx) => {
            const rawDate = r[dateCol];
            let dateStr = '';
            if (rawDate instanceof Date) {
                dateStr = rawDate.toISOString().slice(0, 10);
            } else if (rawDate) {
                const parsed = new Date(rawDate);
                dateStr = !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : String(rawDate);
            }

            const description = descCol ? (r[descCol] || '').toString().trim() : 'Bank Transaction';
            const reference = refCol ? (r[refCol] || '').toString().trim() : '';

            let amount = 0;
            let type = 'DEPOSIT';

            if (amountMode === 'split') {
                const d = parseFloat(r[debitCol]) || 0;
                const c = parseFloat(r[creditCol]) || 0;
                if (d > 0) {
                    amount = d;
                    type = 'WITHDRAWAL';
                } else {
                    amount = c;
                    type = 'DEPOSIT';
                }
            } else {
                const a = parseFloat(r[amountCol]) || 0;
                amount = Math.abs(a);
                type = a < 0 ? 'WITHDRAWAL' : 'DEPOSIT';
            }

            return {
                id: idx + 1,
                date: dateStr,
                description,
                reference,
                amount,
                type
            };
        });

        setParsedPreview(preview);
    }, [rawRows, dateCol, descCol, refCol, amountMode, amountCol, debitCol, creditCol]);

    const handleImportSubmit = async () => {
        if (!selectedAccountId) {
            toast.error('Please select a target Bank Account');
            return;
        }

        if (!dateCol || (amountMode === 'single' && !amountCol) || (amountMode === 'split' && (!debitCol || !creditCol))) {
            toast.error('Please complete required column mapping (Date & Amount)');
            return;
        }

        try {
            setImporting(true);
            // Prepare all rows
            const payloadRows = rawRows.map(r => {
                const rawDate = r[dateCol];
                let dateStr = new Date().toISOString();
                if (rawDate instanceof Date) {
                    dateStr = rawDate.toISOString();
                } else if (rawDate) {
                    const parsed = new Date(rawDate);
                    if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString();
                }

                const description = descCol ? (r[descCol] || '').toString().trim() : '';
                const reference = refCol ? (r[refCol] || '').toString().trim() : '';

                let debit = 0;
                let credit = 0;
                let amount = 0;

                if (amountMode === 'split') {
                    debit = parseFloat(r[debitCol]) || 0;
                    credit = parseFloat(r[creditCol]) || 0;
                } else {
                    const a = parseFloat(r[amountCol]) || 0;
                    amount = a;
                }

                return {
                    date: dateStr,
                    description,
                    reference,
                    debit,
                    credit,
                    amount
                };
            });

            const res = await bankingService.importBankStatement(selectedAccountId, payloadRows);
            if (res.success) {
                toast.success(res.message);
                navigate(`/company/banking/matching?bankAccountId=${selectedAccountId}`);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error importing statement');
        } finally {
            setImporting(false);
        }
    };

    // Download Sample CSV
    const downloadSampleCSV = () => {
        const sampleData = [
            ['Date', 'Description', 'Reference', 'Debit (Outflow)', 'Credit (Inflow)'],
            ['2026-09-01', 'Client Wire Transfer - ABC Corp', 'REF-9021', '', '2500.00'],
            ['2026-09-02', 'Office Supplies Depot', 'POS-4412', '145.50', ''],
            ['2026-09-03', 'Monthly Cloud Server Hosting', 'ACH-1102', '350.00', ''],
            ['2026-09-04', 'Consulting Fee Deposit', 'REF-9088', '', '1850.00'],
            ['2026-09-05', 'Electric Utilities Payment', 'DD-8821', '210.30', '']
        ];
        const ws = XLSX.utils.aoa_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sample_Statement');
        XLSX.writeFile(wb, 'Sample_Bank_Statement.csv');
    };

    // Preview calculations
    const totalDepositsPreview = parsedPreview.filter(r => r.type === 'DEPOSIT').reduce((s, r) => s + r.amount, 0);
    const totalWithdrawalsPreview = parsedPreview.filter(r => r.type === 'WITHDRAWAL').reduce((s, r) => s + r.amount, 0);

    return (
        <div className="statement-import-page">
            {/* Header */}
            <div className="page-header-ribbon">
                <div className="title-left">
                    <button className="btn btn-icon btn-secondary" onClick={() => navigate('/company/banking/overview')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            <Upload size={24} className="title-icon" />
                            Import Bank Statement
                        </h1>
                        <p className="page-subtitle">Upload CSV or Excel statements to automatically populate bank feeds for matching and reconciliation.</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={downloadSampleCSV}>
                        <Download size={16} /> Download Sample CSV
                    </button>
                </div>
            </div>

            {/* Step 1: Select Account & Upload */}
            <div className="import-grid">
                <div className="import-card account-card">
                    <h3>1. Destination Account & File</h3>
                    <div className="form-group">
                        <label>Select Bank Account *</label>
                        <select 
                            value={selectedAccountId} 
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                        >
                            <option value="">-- Choose Bank Account --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.accountName} ({acc.bankName} ••••{acc.accountNumber?.slice(-4)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="upload-dropzone">
                        <input 
                            type="file" 
                            id="statementFile" 
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUpload} 
                        />
                        <label htmlFor="statementFile" className="dropzone-label">
                            <FileSpreadsheet size={36} className="upload-icon" />
                            {fileName ? (
                                <>
                                    <span className="file-name">{fileName}</span>
                                    <span className="file-hint">Click or drop to replace file</span>
                                </>
                            ) : (
                                <>
                                    <span className="drop-title">Drop your bank statement here</span>
                                    <span className="file-hint">Supports .CSV, .XLSX, .XLS (Up to 10MB)</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Step 2: Column Mapping */}
                <div className="import-card mapping-card">
                    <h3>2. Column Mapping</h3>
                    <p className="text-muted text-sm">We automatically detected standard bank columns. Adjust below if needed.</p>

                    {rawHeaders.length === 0 ? (
                        <div className="empty-mapping">
                            <span>Upload a statement file to map headers</span>
                        </div>
                    ) : (
                        <div className="mapping-form">
                            <div className="form-row">
                                <div className="form-group col-6">
                                    <label>Date Column *</label>
                                    <select value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
                                        <option value="">-- Select Column --</option>
                                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div className="form-group col-6">
                                    <label>Description / Payee Column</label>
                                    <select value={descCol} onChange={(e) => setDescCol(e.target.value)}>
                                        <option value="">-- Select Column --</option>
                                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Reference / Cheque # Column (Optional)</label>
                                <select value={refCol} onChange={(e) => setRefCol(e.target.value)}>
                                    <option value="">-- None --</option>
                                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>

                            <div className="amount-mode-switch">
                                <label>Amount Format:</label>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input 
                                            type="radio" 
                                            name="amtMode" 
                                            checked={amountMode === 'single'} 
                                            onChange={() => setAmountMode('single')}
                                        />
                                        Single Column (+ Inflows / - Outflows)
                                    </label>
                                    <label className="radio-label">
                                        <input 
                                            type="radio" 
                                            name="amtMode" 
                                            checked={amountMode === 'split'} 
                                            onChange={() => setAmountMode('split')}
                                        />
                                        Separate Debit & Credit Columns
                                    </label>
                                </div>
                            </div>

                            {amountMode === 'single' ? (
                                <div className="form-group">
                                    <label>Amount Column *</label>
                                    <select value={amountCol} onChange={(e) => setAmountCol(e.target.value)}>
                                        <option value="">-- Select Column --</option>
                                        {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="form-row">
                                    <div className="form-group col-6">
                                        <label>Debit (Withdrawal / Spent) Column *</label>
                                        <select value={debitCol} onChange={(e) => setDebitCol(e.target.value)}>
                                            <option value="">-- Select Column --</option>
                                            {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group col-6">
                                        <label>Credit (Deposit / Received) Column *</label>
                                        <select value={creditCol} onChange={(e) => setCreditCol(e.target.value)}>
                                            <option value="">-- Select Column --</option>
                                            {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Step 3: Preview Table */}
            {parsedPreview.length > 0 && (
                <div className="preview-card">
                    <div className="preview-header">
                        <div>
                            <h3>3. Parsed Statement Preview</h3>
                            <span className="text-muted text-sm">
                                Showing preview of first {parsedPreview.length} of {rawRows.length} transactions
                            </span>
                        </div>
                        <div className="preview-stats">
                            <span className="stat-badge green">
                                Inflows: +{formatCurrency(totalDepositsPreview)}
                            </span>
                            <span className="stat-badge red">
                                Outflows: -{formatCurrency(totalWithdrawalsPreview)}
                            </span>
                            <button 
                                className="btn btn-primary"
                                onClick={handleImportSubmit}
                                disabled={importing}
                            >
                                {importing ? 'Importing Transactions...' : `Import ${rawRows.length} Transactions`} 
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="preview-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Description / Payee</th>
                                    <th>Reference</th>
                                    <th>Type</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedPreview.map((r, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{r.date}</td>
                                        <td><strong>{r.description || '-'}</strong></td>
                                        <td>{r.reference || '-'}</td>
                                        <td>
                                            <span className={`type-badge ${r.type.toLowerCase()}`}>
                                                {r.type}
                                            </span>
                                        </td>
                                        <td className={`text-right font-semibold ${r.type === 'DEPOSIT' ? 'text-success' : 'text-danger'}`}>
                                            {r.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(r.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementImport;
