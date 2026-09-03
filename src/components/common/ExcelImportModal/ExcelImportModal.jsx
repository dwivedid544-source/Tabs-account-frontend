import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
    X, 
    UploadCloud, 
    Download, 
    CheckCircle2, 
    AlertTriangle, 
    FileSpreadsheet, 
    ArrowRight, 
    ArrowLeft, 
    Check, 
    RefreshCw,
    Layers
} from 'lucide-react';
import axiosInstance from '../../../api/axiosInstance';
import GetCompanyId from '../../../api/GetCompanyId';
import { ENTITY_SCHEMAS, downloadSampleTemplate, parseExcelFile } from '../../../utils/excelService';
import './ExcelImportModal.css';

const ENDPOINTS_MAP = {
    products: '/bulk-import/products',
    customers: '/bulk-import/customers',
    vendors: '/bulk-import/vendors',
    chartOfAccounts: '/bulk-import/chart-of-accounts',
    salesInvoices: '/bulk-import/sales-invoices',
    purchaseBills: '/bulk-import/purchase-bills',
    manualJournals: '/bulk-import/manual-journals'
};

const ExcelImportModal = ({
    isOpen,
    onClose,
    entityType = 'products',
    onSuccess
}) => {
    if (!isOpen) return null;

    const schema = ENTITY_SCHEMAS[entityType] || ENTITY_SCHEMAS.products;
    const fileInputRef = useRef(null);

    // Wizard Steps: 1: Upload, 2: Mapping, 3: Validation Preview, 4: Results
    const [currentStep, setCurrentStep] = useState(1);
    const [file, setFile] = useState(null);
    const [parsedRawData, setParsedRawData] = useState([]);
    const [fileHeaders, setFileHeaders] = useState([]);
    const [fieldMapping, setFieldMapping] = useState({});
    
    // Validation State
    const [validatedRows, setValidatedRows] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'valid', 'error'
    const [duplicateStrategy, setDuplicateStrategy] = useState('update'); // 'update' or 'skip'

    // Processing & Results
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResults, setImportResults] = useState(null);

    // ----------------------------------------------------
    // STEP 1: FILE HANDLING & DRAG-AND-DROP
    // ----------------------------------------------------
    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;

        const validExts = ['.xlsx', '.xls', '.csv'];
        const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
        if (!validExts.includes(fileExt)) {
            toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
            return;
        }

        try {
            setFile(selectedFile);
            const rawJson = await parseExcelFile(selectedFile);
            if (!rawJson || rawJson.length === 0) {
                toast.error('The selected file contains no data rows.');
                return;
            }

            setParsedRawData(rawJson);

            // Extract unique headers
            const headers = Object.keys(rawJson[0] || {});
            setFileHeaders(headers);

            // Auto-detect / intelligent mapping
            const initialMapping = {};
            schema.fields.forEach(field => {
                const targetLabel = field.label.toLowerCase();
                const targetKey = field.key.toLowerCase();

                // Look for exact or fuzzy match in headers
                const matchedHeader = headers.find(h => {
                    const normH = h.toLowerCase().trim();
                    return normH === targetLabel || 
                           normH === targetKey || 
                           normH.includes(targetLabel) || 
                           targetLabel.includes(normH);
                });

                if (matchedHeader) {
                    initialMapping[field.key] = matchedHeader;
                } else {
                    initialMapping[field.key] = '';
                }
            });

            setFieldMapping(initialMapping);
            setCurrentStep(2); // Proceed to Mapping Step
            toast.success(`Loaded ${rawJson.length} rows from file.`);
        } catch (err) {
            console.error('File parsing error:', err);
            toast.error('Failed to parse spreadsheet file: ' + err.message);
        }
    };

    // ----------------------------------------------------
    // STEP 2: FIELD MAPPING
    // ----------------------------------------------------
    const handleMappingChange = (fieldKey, selectedHeader) => {
        setFieldMapping(prev => ({
            ...prev,
            [fieldKey]: selectedHeader
        }));
    };

    const handleProceedToValidation = () => {
        // Validate required fields mapping
        const missingRequired = schema.fields.filter(f => f.required && !fieldMapping[f.key]);
        if (missingRequired.length > 0) {
            toast.error(`Please map required column: ${missingRequired[0].label}`);
            return;
        }

        // Transform and validate rows in memory
        const rows = parsedRawData.map((rawRow, idx) => {
            const transformed = {};
            const errors = [];

            schema.fields.forEach(f => {
                const mappedHeader = fieldMapping[f.key];
                const rawVal = mappedHeader ? rawRow[mappedHeader] : undefined;
                transformed[f.key] = rawVal !== undefined ? rawVal : '';

                // Required check
                if (f.required && (rawVal === undefined || rawVal === null || String(rawVal).trim() === '')) {
                    errors.push(`${f.label} is required`);
                }

                // Number check
                if (f.type === 'number' && rawVal !== undefined && rawVal !== '' && isNaN(Number(rawVal))) {
                    errors.push(`${f.label} must be a valid number`);
                }
            });

            return {
                rowIndex: idx + 1,
                data: transformed,
                isValid: errors.length === 0,
                errors
            };
        });

        setValidatedRows(rows);
        setCurrentStep(3); // Proceed to Validation Preview
    };

    // ----------------------------------------------------
    // STEP 3: SUBMIT BULK IMPORT
    // ----------------------------------------------------
    const handleExecuteImport = async () => {
        const validItems = validatedRows.filter(r => r.isValid).map(r => r.data);
        if (validItems.length === 0) {
            toast.error('No valid rows available to import.');
            return;
        }

        const endpoint = ENDPOINTS_MAP[entityType] || ENDPOINTS_MAP.products;
        const companyId = GetCompanyId();

        try {
            setIsSubmitting(true);
            setCurrentStep(4);
            setImportProgress(30);

            const payload = {
                rows: validItems,
                duplicateStrategy,
                companyId
            };

            setImportProgress(60);
            const res = await axiosInstance.post(endpoint, payload);

            setImportProgress(100);
            if (res.data?.success) {
                setImportResults(res.data.data || {
                    total: validItems.length,
                    created: validItems.length,
                    updated: 0,
                    skipped: 0,
                    errors: []
                });
                toast.success(res.data.message || 'Import completed successfully!');
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.data?.message || 'Import failed');
            }
        } catch (err) {
            console.error('Bulk Import Execution Error:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to complete import');
            setImportResults({
                total: validItems.length,
                created: 0,
                updated: 0,
                skipped: validItems.length,
                errors: [{ row: 'All', error: err.response?.data?.message || err.message }]
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setParsedRawData([]);
        setFileHeaders([]);
        setFieldMapping({});
        setValidatedRows([]);
        setImportResults(null);
        setCurrentStep(1);
    };

    const validCount = validatedRows.filter(r => r.isValid).length;
    const errorCount = validatedRows.filter(r => !r.isValid).length;
    const displayedRows = validatedRows.filter(r => {
        if (activeTab === 'valid') return r.isValid;
        if (activeTab === 'error') return !r.isValid;
        return true;
    });

    return (
        <div className="excel-import-overlay" onClick={onClose}>
            <div className="excel-import-container" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="excel-import-header">
                    <h3>
                        <FileSpreadsheet size={22} />
                        Bulk Excel Import — {schema.name}
                    </h3>
                    <button className="excel-import-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="excel-import-stepper">
                    <div className={`stepper-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
                        <div className="stepper-circle">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                        <span>Upload File</span>
                    </div>
                    <div className={`stepper-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
                        <div className="stepper-circle">{currentStep > 2 ? <Check size={14} /> : '2'}</div>
                        <span>Map Columns</span>
                    </div>
                    <div className={`stepper-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
                        <div className="stepper-circle">{currentStep > 3 ? <Check size={14} /> : '3'}</div>
                        <span>Validate Preview</span>
                    </div>
                    <div className={`stepper-item ${currentStep === 4 ? 'active' : ''}`}>
                        <div className="stepper-circle">4</div>
                        <span>Results</span>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="excel-import-body">
                    
                    {/* STEP 1: UPLOAD & DOWNLOAD TEMPLATE */}
                    {currentStep === 1 && (
                        <div>
                            <div className="template-download-box">
                                <div className="template-info">
                                    <h4>Download Sample Spreadsheet Template</h4>
                                    <p>Get the official Excel template with column formats and guidelines for {schema.name}.</p>
                                </div>
                                <button 
                                    className="btn-download-template"
                                    onClick={() => downloadSampleTemplate(entityType)}
                                >
                                    <Download size={16} />
                                    Download Template (.xlsx)
                                </button>
                            </div>

                            <div 
                                className="dropzone-area"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files?.[0]) {
                                        handleFileSelect(e.dataTransfer.files[0]);
                                    }
                                }}
                            >
                                <UploadCloud className="dropzone-icon" />
                                <div className="dropzone-text">Click to choose file or drag and drop here</div>
                                <div className="dropzone-subtext">Supported formats: .xlsx, .xls, .csv (Max 10MB)</div>
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    accept=".xlsx,.xls,.csv" 
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FIELD MAPPING */}
                    {currentStep === 2 && (
                        <div>
                            <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b' }}>
                                Match the columns from your uploaded file (<strong>{file?.name}</strong>) to the required fields in Tab Accounts.
                            </div>

                            <table className="mapping-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>System Field</th>
                                        <th style={{ width: '15%' }}>Requirement</th>
                                        <th style={{ width: '45%' }}>Spreadsheet Column Header</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schema.fields.map(field => (
                                        <tr key={field.key}>
                                            <td>
                                                <strong>{field.label}</strong>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>e.g. {field.example}</div>
                                            </td>
                                            <td>
                                                {field.required ? (
                                                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Required *</span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>Optional</span>
                                                )}
                                            </td>
                                            <td>
                                                <select 
                                                    className="mapping-select"
                                                    value={fieldMapping[field.key] || ''}
                                                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                >
                                                    <option value="">-- Do Not Import / Not In File --</option>
                                                    {fileHeaders.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* STEP 3: LIVE PREVIEW & VALIDATION */}
                    {currentStep === 3 && (
                        <div>
                            <div className="preview-summary-bar">
                                <div className="preview-tabs">
                                    <button 
                                        className={`preview-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('all')}
                                    >
                                        All Rows ({validatedRows.length})
                                    </button>
                                    <button 
                                        className={`preview-tab-btn ${activeTab === 'valid' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('valid')}
                                    >
                                        Valid Rows ({validCount})
                                    </button>
                                    <button 
                                        className={`preview-tab-btn ${activeTab === 'error' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('error')}
                                    >
                                        Errors ({errorCount})
                                    </button>
                                </div>

                                <div className="duplicate-strategy-box">
                                    <span>If Duplicate Exists:</span>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="dup_strategy" 
                                            value="update" 
                                            checked={duplicateStrategy === 'update'}
                                            onChange={() => setDuplicateStrategy('update')}
                                        />
                                        Update Existing
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="dup_strategy" 
                                            value="skip" 
                                            checked={duplicateStrategy === 'skip'}
                                            onChange={() => setDuplicateStrategy('skip')}
                                        />
                                        Skip Duplicate
                                    </label>
                                </div>
                            </div>

                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Status</th>
                                            {schema.fields.map(f => (
                                                <th key={f.key}>{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedRows.map(row => (
                                            <tr key={row.rowIndex}>
                                                <td>{row.rowIndex}</td>
                                                <td>
                                                    {row.isValid ? (
                                                        <span className="row-status-badge valid">Valid</span>
                                                    ) : (
                                                        <span className="row-status-badge error" title={row.errors.join(', ')}>
                                                            {row.errors[0]}
                                                        </span>
                                                    )}
                                                </td>
                                                {schema.fields.map(f => (
                                                    <td key={f.key}>
                                                        {row.data[f.key] !== undefined && row.data[f.key] !== null ? String(row.data[f.key]) : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PROGRESS & RESULTS */}
                    {currentStep === 4 && (
                        <div className="progress-card">
                            {isSubmitting ? (
                                <div>
                                    <RefreshCw className="spin" size={40} style={{ color: '#1e293b', marginBottom: 16 }} />
                                    <h4>Processing Bulk Import...</h4>
                                    <p style={{ color: '#64748b', fontSize: 13 }}>Please wait while rows are validated and committed to the database.</p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${importProgress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <CheckCircle2 size={52} style={{ color: '#10b981', marginBottom: 12 }} />
                                    <h3>Import Finished</h3>
                                    <p style={{ color: '#64748b', fontSize: 14 }}>
                                        {importResults?.created || 0} created, {importResults?.updated || 0} updated, {importResults?.skipped || 0} skipped.
                                    </p>

                                    <div className="results-stats-grid">
                                        <div className="stat-box">
                                            <div className="stat-num" style={{ color: '#10b981' }}>{importResults?.created || 0}</div>
                                            <div className="stat-label">New Records Created</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="stat-num" style={{ color: '#3b82f6' }}>{importResults?.updated || 0}</div>
                                            <div className="stat-label">Records Updated</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="stat-num" style={{ color: '#ef4444' }}>{importResults?.skipped || 0}</div>
                                            <div className="stat-label">Skipped / Failed</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="excel-import-footer">
                    {currentStep === 1 && (
                        <div></div>
                    )}

                    {currentStep === 2 && (
                        <>
                            <button className="btn-secondary-import" onClick={() => setCurrentStep(1)}>
                                <ArrowLeft size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Back
                            </button>
                            <button className="btn-primary-import" onClick={handleProceedToValidation}>
                                Continue to Preview
                                <ArrowRight size={16} />
                            </button>
                        </>
                    )}

                    {currentStep === 3 && (
                        <>
                            <button className="btn-secondary-import" onClick={() => setCurrentStep(2)}>
                                <ArrowLeft size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Back to Mapping
                            </button>
                            <button 
                                className="btn-primary-import" 
                                onClick={handleExecuteImport}
                                disabled={validCount === 0}
                            >
                                Import {validCount} {validCount === 1 ? 'Record' : 'Records'} Now
                                <ArrowRight size={16} />
                            </button>
                        </>
                    )}

                    {currentStep === 4 && (
                        <>
                            <button className="btn-secondary-import" onClick={handleReset}>
                                Import Another File
                            </button>
                            <button className="btn-primary-import" onClick={onClose}>
                                Done
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ExcelImportModal;
