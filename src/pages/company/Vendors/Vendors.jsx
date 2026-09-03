import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Filter, ArrowLeft, ArrowRight, Search, X, Download, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import vendorService from '../../../services/vendorService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import axiosInstance from '../../../api/axiosInstance';
import './Vendors.css';
import ExcelImportModal from '../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../utils/excelService';

const Vendors = () => {
    const { companySettings, formatCurrency } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const [vendors, setVendors] = useState([]);
    const navigate = useNavigate();
    const [accountTypes, setAccountTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
    const [currentVendor, setCurrentVendor] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState(null);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [uploadingAnyFile, setUploadingAnyFile] = useState(false);
    const profileImageRef = useRef();
    const anyFileRef = useRef();
    const [searchTerm, setSearchTerm] = useState('');

    // Initial Form State
    const initialFormState = {
        name: '',
        nameArabic: '',
        companyName: '',
        companyLocation: '',
        profileImage: '',
        anyFile: '',
        accountType: '',
        balanceType: 'Credit', // Default to Credit for Vendors
        accountBalance: '0.00',
        creationDate: new Date().toISOString().split('T')[0],
        bankAccountNumber: '',
        bankIFSC: '',
        bankNameBranch: '',
        phone: '',
        email: '',
        creditPeriod: '',
        gstNumber: '',
        gstEnabled: false,
        billingName: '',
        billingPhone: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingCountry: '',
        billingZipCode: '',
        shippingSameAsBilling: false,
        shippingName: '',
        shippingPhone: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingCountry: '',
        shippingZipCode: '',
        shippingAddresses: []
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [vendorsRes, typesRes] = await Promise.all([
                vendorService.getAllVendors(),
                chartOfAccountsService.getAccountTypes()
            ]);

            if (vendorsRes.success) {
                setVendors(vendorsRes.data);
            }
            if (typesRes.success) {
                setAccountTypes(typesRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            let processedValue = type === 'checkbox' ? checked : value;

            if (type !== 'checkbox' && typeof processedValue === 'string') {
                if (name === 'phone' || name === 'billingPhone' || name === 'shippingPhone') {
                    processedValue = processedValue.replace(/\D/g, '');
                } else if (name === 'accountBalance') {
                    processedValue = processedValue.replace(/-/g, '');
                    if (processedValue !== '') {
                        const parsed = parseFloat(processedValue);
                        if (!isNaN(parsed) && parsed < 0) {
                            processedValue = '0';
                        }
                    }
                }
            }

            const newData = {
                ...prev,
                [name]: processedValue
            };

            // Auto-fill shipping address if "same as billing" is checked
            if (name === 'shippingSameAsBilling' && checked) {
                newData.shippingName = prev.billingName;
                newData.shippingPhone = prev.billingPhone;
                newData.shippingAddress = prev.billingAddress;
                newData.shippingCity = prev.billingCity;
                newData.shippingState = prev.billingState;
                newData.shippingCountry = prev.billingCountry;
                newData.shippingZipCode = prev.billingZipCode;
            }

            return newData;
        });
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setCurrentVendor(null);
    };

    // ─── File Upload Handler ───────────────────────────────────────────────────
    const handleFileUpload = async (file, field, folder) => {
        if (!file) return;
        const setUploading = field === 'profileImage' ? setUploadingProfileImage : setUploadingAnyFile;
        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            const res = await axiosInstance.post(`/upload?folder=${folder}`, formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setFormData(prev => ({ ...prev, [field]: res.data.url }));
                toast.success(`${field === 'profileImage' ? 'Profile image' : 'File'} uploaded!`);
            }
        } catch (err) {
            toast.error('Upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const openCreateModal = () => {
        resetForm();
        setModalMode('create');
        setShowModal(true);
    };

    const openEditModal = (vendor) => {
        setCurrentVendor(vendor);
        const rawBal = vendor.ledger?.currentBalance !== undefined && vendor.ledger?.currentBalance !== null
            ? vendor.ledger.currentBalance
            : (vendor.accountBalance !== undefined && vendor.accountBalance !== null ? vendor.accountBalance : 0);
        const numericBal = parseFloat(rawBal) || 0;
        const formattedBal = Math.abs(numericBal).toFixed(2);
        const determinedType = numericBal >= 0 ? 'Credit' : 'Debit';

        setFormData({
            ...vendor,
            accountBalance: formattedBal,
            balanceType: determinedType,
            creationDate: vendor.creationDate ? new Date(vendor.creationDate).toISOString().split('T')[0] : initialFormState.creationDate,
            shippingSameAsBilling: vendor.shippingSameAsBilling || false,
            gstEnabled: vendor.gstEnabled || false,
            shippingAddresses: vendor.shippingaddress || []
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const openViewModal = (vendor) => {
        setCurrentVendor(vendor);
        const rawBal = vendor.ledger?.currentBalance !== undefined && vendor.ledger?.currentBalance !== null
            ? vendor.ledger.currentBalance
            : (vendor.accountBalance !== undefined && vendor.accountBalance !== null ? vendor.accountBalance : 0);
        const numericBal = parseFloat(rawBal) || 0;
        const formattedBal = Math.abs(numericBal).toFixed(2);
        const determinedType = numericBal >= 0 ? 'Credit' : 'Debit';

        setFormData({
            ...vendor,
            accountBalance: formattedBal,
            balanceType: determinedType,
            creationDate: vendor.creationDate ? new Date(vendor.creationDate).toISOString().split('T')[0] : initialFormState.creationDate,
            shippingSameAsBilling: vendor.shippingSameAsBilling || false,
            gstEnabled: vendor.gstEnabled || false,
            shippingAddresses: vendor.shippingaddress || []
        });
        setModalMode('view');
        setShowModal(true);
    };

    const handleShippingAddressChange = (index, field, value) => {
        setFormData(prev => {
            const newAddresses = [...prev.shippingAddresses];
            let processedValue = value;
            if (field === 'phone' && typeof value === 'string') {
                processedValue = value.replace(/\D/g, '');
            }
            newAddresses[index] = { ...newAddresses[index], [field]: processedValue };
            return { ...prev, shippingAddresses: newAddresses };
        });
    };

    const addShippingAddress = () => {
        setFormData(prev => ({
            ...prev,
            shippingAddresses: [
                ...prev.shippingAddresses,
                { name: '', phone: '', address: '', city: '', state: '', country: '', zipCode: '', isDefault: false }
            ]
        }));
    };

    const removeShippingAddress = (index) => {
        setFormData(prev => ({
            ...prev,
            shippingAddresses: prev.shippingAddresses.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email) {
            toast.error('Please fill in required fields (Name and Email)');
            return;
        }

        const payload = { ...formData };
        let shippingAddresses = [...formData.shippingAddresses];

        if (formData.shippingSameAsBilling) {
            const billingAsShipping = {
                name: formData.billingName || formData.name,
                phone: formData.billingPhone || formData.phone,
                address: formData.billingAddress,
                city: formData.billingCity,
                state: formData.billingState,
                country: formData.billingCountry,
                zipCode: formData.billingZipCode,
                isDefault: true
            };
            shippingAddresses = [billingAsShipping, ...formData.shippingAddresses];
        }

        payload.shippingAddresses = shippingAddresses;

        try {
            if (modalMode === 'create') {
                await vendorService.createVendor(payload);
                toast.success('Vendor created successfully!');
            } else if (modalMode === 'edit') {
                await vendorService.updateVendor(currentVendor.id, payload);
                toast.success('Vendor updated successfully!');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving vendor:', error);
            toast.error(error.message || 'Failed to save vendor');
        }
    };

    const handleDelete = (vendor) => {
        setVendorToDelete(vendor);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!vendorToDelete) return;
        try {
            await vendorService.deleteVendor(vendorToDelete.id);
            toast.success('Vendor deleted successfully!');
            fetchData();
        } catch (error) {
            console.error('Error deleting vendor:', error);
            toast.error(error.message || 'Failed to delete vendor');
        } finally {
            setShowDeleteConfirm(false);
            setVendorToDelete(null);
        }
    };

    const filteredVendors = vendors.filter(vendor => {
        const name = (vendor.name || '').toLowerCase();
        const email = (vendor.email || '').toLowerCase();
        const phone = (vendor.phone || '').toLowerCase();
        const companyName = (vendor.companyName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term) || companyName.includes(term);
    });

    if (loading) return <div className="p-8">Loading vendors...</div>;

    const handleExportExcel = () => {
        if (!vendors.length) {
            toast.error('No vendors available to export');
            return;
        }
        const exportData = vendors.map(v => ({
            'Vendor Name': v.name,
            'Arabic Name': v.nameArabic || '',
            'Company Name': v.companyName || '',
            'Email Address': v.email || '',
            'Phone Number': v.phone || '',
            'TRN / VAT Number': v.gstNumber || '',
            'Address': v.billingAddress || '',
            'City': v.billingCity || '',
            'State / County': v.billingState || '',
            'Country': v.billingCountry || '',
            'Payment Terms (Days)': v.creditPeriod || 0,
            'Balance Type': v.balanceType || 'Credit',
            'Current Balance': v.accountBalance || 0
        }));
        exportToExcel(exportData, 'Vendors_List_Export.xlsx', 'Vendors');
        toast.success(`Exported ${exportData.length} vendors to Excel.`);
    };

    return (
        <div className="Vendors-page">
            <div className="Vendors-page-header">
                <h1 className="Vendors-page-title">Vendors / Suppliers</h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        style={{
                            padding: '8px 14px',
                            background: '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onClick={handleExportExcel}
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                    {hasPermission('create vendors') && (
                        <button
                            style={{
                                padding: '8px 14px',
                                background: '#334155',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onClick={() => setShowImportModal(true)}
                        >
                            <FileSpreadsheet size={16} />
                            Import Excel
                        </button>
                    )}
                    <button
                        title="Recalculate all vendor balances from transaction history"
                        style={{
                            padding: '8px 14px',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onClick={async () => {
                            try {
                                toast.loading('Recalculating balances...');
                                const result = await vendorService.recalculateAllBalances();
                                toast.dismiss();
                                toast.success(result.message || 'Balances recalculated!');
                                fetchData();
                            } catch (err) {
                                toast.dismiss();
                                toast.error(err.message || 'Failed to recalculate balances');
                            }
                        }}
                    >
                        ⟳ Fix Balances
                    </button>
                    {hasPermission('create vendors') && (
                        <button className="Vendors-btn-add" onClick={openCreateModal}>
                            <Plus size={18} />
                            Add Vendor
                        </button>
                    )}
                </div>
            </div>

            <div className="Vendors-card">
                <div className="Vendors-controls-row">
                    <div className="Vendors-entries-control">
                        <span className="Vendors-entries-text">Show</span>
                        <select className="Vendors-entries-select">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                        <span className="Vendors-entries-text">entries</span>
                    </div>
                    <div className="Vendors-search-control">
                        <input
                            type="text"
                            className="Vendors-search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="Vendors-table-container">
                    <table className="Vendors-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Company</th>
                                <th>Email / Phone</th>
                                <th>Balance & Credit</th>
                                {/* <th>Linked Ledger</th> */}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVendors.length > 0 ? (
                                filteredVendors.map((vendor) => (
                                    <tr key={vendor.id}>
                                        <td>
                                            <div
                                                style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb' }}
                                                className="hover:underline"
                                                onClick={() => navigate(`/company/accounts/vendors/${vendor.id}`)}
                                            >
                                                {vendor.name}
                                            </div>
                                            {vendor.nameArabic && <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>{vendor.nameArabic}</div>}
                                        </td>
                                        <td>{vendor.companyName || '-'}</td>
                                        <td>
                                            <div>{vendor.email}</div>
                                            <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{vendor.phone}</div>
                                        </td>
                                        <td>
                                            <div className={`Vendors-text-${(vendor.ledger?.currentBalance || 0) >= 0 ? 'success' : 'danger'}`}>
                                                {formatCurrency(Math.abs(vendor.ledger?.currentBalance || 0))}
                                                {(vendor.ledger?.currentBalance || 0) >= 0 ? ' Cr' : ' Dr'}
                                            </div>
                                            {vendor.creditPeriod && <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Credit: {vendor.creditPeriod} days</div>}
                                        </td>
                                        {/* <td>
                                            {vendor.ledger ? (
                                                <button
                                                    className="Vendors-badge p-2 border-0 bg-transparent text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/company/accounts/vendors/${vendor.id}`);
                                                    }}
                                                >
                                                    {vendor.ledger.name} <ArrowRight size={14} />
                                                </button>
                                            ) : (
                                                <span className="Vendors-text-danger">Not Linked</span>
                                            )}
                                        </td> */}
                                        <td>
                                            <div className="Vendors-action-buttons">
                                                <button className="Vendors-action-btn Vendors-btn-view" onClick={() => openViewModal(vendor)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit vendors') && (
                                                    <button className="Vendors-action-btn Vendors-btn-edit" onClick={() => openEditModal(vendor)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete vendors') && (
                                                    <button className="Vendors-action-btn Vendors-btn-delete" onClick={() => handleDelete(vendor)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center p-4">No vendors found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="Vendors-modal-overlay">
                    <div className={`Vendors-modal-content Vendors-modal-large`}>
                        <div className="Vendors-modal-header">
                            <h2 className="Vendors-modal-title">
                                {modalMode === 'create' && 'Add Vendor'}
                                {modalMode === 'edit' && 'Edit Vendor'}
                                {modalMode === 'view' && 'Vendor Details'}
                            </h2>
                            <button className="Vendors-close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="Vendors-modal-body">
                            {/* Basic Information */}
                            <div className="Vendors-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                                <h3 className="Vendors-section-subtitle">Basic Information</h3>
                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Name (English) <span className="Vendors-text-red">*</span></label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Name"
                                        />
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Name (Arabic)</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="nameArabic"
                                            value={formData.nameArabic}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Name (Arabic)"
                                        />
                                    </div>
                                </div>

                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Company Name</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div className="Vendors-form-group Vendors-google-loc">
                                        <label className="Vendors-form-label">Company Google Location</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="companyLocation"
                                            value={formData.companyLocation}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Google Maps link"
                                        />
                                    </div>
                                </div>

                                {/* File Uploads */}
                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-profile-img">
                                        <label className="Vendors-form-label">Profile Image</label>
                                        {formData.profileImage ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <img
                                                    src={formData.profileImage}
                                                    alt="Profile"
                                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                />
                                                {modalMode !== 'view' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setFormData(prev => ({ ...prev, profileImage: '' })); }}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        x Remove
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                        {modalMode !== 'view' && (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={profileImageRef}
                                                    accept="image/jpeg,image/png,image/jpg"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleFileUpload(e.target.files[0], 'profileImage', 'vendors')}
                                                />
                                                <div className="Vendors-file-input-wrapper" onClick={() => profileImageRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Vendors-file-label">
                                                        <span className="Vendors-file-btn">{uploadingProfileImage ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Vendors-file-name">{formData.profileImage ? 'Image uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Vendors-file-note">JPEG, PNG or JPG (max 5MB)</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="Vendors-form-group Vendors-any-file">
                                        <label className="Vendors-form-label">Any File</label>
                                        {formData.anyFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                <a
                                                    href={formData.anyFile}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#2563eb', fontSize: '0.8rem', textDecoration: 'underline', wordBreak: 'break-all', maxWidth: '200px' }}
                                                >
                                                    View File
                                                </a>
                                                {modalMode !== 'view' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, anyFile: '' }))}
                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                    >
                                                        x Remove
                                                    </button>
                                                )}
                                            </div>
                                        ) : null}
                                        {modalMode !== 'view' && (
                                            <>
                                                <input
                                                    type="file"
                                                    ref={anyFileRef}
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleFileUpload(e.target.files[0], 'anyFile', 'vendors')}
                                                />
                                                <div className="Vendors-file-input-wrapper" onClick={() => anyFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Vendors-file-label">
                                                        <span className="Vendors-file-btn">{uploadingAnyFile ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Vendors-file-name">{formData.anyFile ? 'File uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Vendors-file-note">Any file type. Max 10MB</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="Vendors-form-section">
                                <h3 className="Vendors-section-subtitle">Account Information</h3>
                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Account Type <span className="Vendors-text-red">*</span></label>
                                        <select
                                            className="Vendors-form-select"
                                            name="accountType"
                                            value={formData.accountType}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        >
                                            {/* <option value="">-- Select Account --</option> */}
                                            {accountTypes
                                                .flatMap(group => group.accounts)
                                                .filter(acc => acc.accountTypeName === 'Accounts Payable')
                                                .map((acc, j) => (
                                                    <option key={j} value={acc.accountTypeId}>{acc.accountTypeName}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Balance Type</label>
                                        <select
                                            className="Vendors-form-select"
                                            name="balanceType"
                                            value={formData.balanceType}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        >
                                            <option value="Credit">Credit</option>
                                            <option value="Debit">Debit</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <div className="Vendors-input-with-note">
                                            <label className="Vendors-form-label">Account Name <span className="Vendors-text-red">*</span></label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                value={formData.name}
                                                readOnly
                                                disabled
                                                style={{ backgroundColor: '#f3f4f6' }}
                                            />
                                            <span className="Vendors-input-note">This will auto-fill from selection above</span>
                                        </div>
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">
                                            Account Balance ({companySettings?.currency || 'USD'}) <span className="Vendors-text-red">*</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '8px 12px',
                                                backgroundColor: '#f1f5f9',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontWeight: '600',
                                                color: '#475569',
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {companySettings?.currency || 'USD'}
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="Vendors-form-input"
                                                name="accountBalance"
                                                value={formData.accountBalance}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="0.00"
                                                min="0"
                                                onKeyDown={(e) => {
                                                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Creation Date <span className="Vendors-text-red">*</span></label>
                                        <input
                                            type="date"
                                            className="Vendors-form-input"
                                            name="creationDate"
                                            value={formData.creationDate}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="Vendors-form-section">
                                <h3 className="Vendors-section-subtitle">Bank Details</h3>
                                <div className="Vendors-form-row Vendors-three-col">
                                    <div className="Vendors-form-group">
                                        <label className="Vendors-form-label">Bank Account Number</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="bankAccountNumber"
                                            value={formData.bankAccountNumber}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter bank account number"
                                        />
                                    </div>
                                    <div className="Vendors-form-group">
                                        <label className="Vendors-form-label">Bank IFSC</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="bankIFSC"
                                            value={formData.bankIFSC}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter bank IFSC"
                                        />
                                    </div>
                                    <div className="Vendors-form-group">
                                        <label className="Vendors-form-label">Bank Name & Branch</label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="bankNameBranch"
                                            value={formData.bankNameBranch}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter bank name & branch"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact & GST */}
                            <div className="Vendors-form-section">
                                <h3 className="Vendors-section-subtitle">Contact & Status</h3>
                                <div className="Vendors-form-row Vendors-mixed-col">
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Phone <span className="Vendors-text-red">*</span></label>
                                        <input
                                            type="text"
                                            className="Vendors-form-input"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Phone"
                                        />
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Email <span className="Vendors-text-red">*</span></label>
                                        <input
                                            type="email"
                                            className="Vendors-form-input"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Email"
                                        />
                                    </div>
                                    <div className="Vendors-form-group Vendors-half-width">
                                        <label className="Vendors-form-label">Credit Period (days)</label>
                                        <input
                                            type="number"
                                            className="Vendors-form-input"
                                            name="creditPeriod"
                                            value={formData.creditPeriod}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter credit period"
                                        />
                                    </div>
                                </div>

                                <div className="Vendors-form-row" style={{ alignItems: 'center' }}>
                                    <label className="Vendors-switch" style={{ marginRight: '10px' }}>
                                        <input
                                            type="checkbox"
                                            name="gstEnabled"
                                            checked={formData.gstEnabled}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        />
                                        <span className="Vendors-slider Vendors-round"></span>
                                    </label>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable GST</span>

                                    {formData.gstEnabled && (
                                        <div className="Vendors-form-group" style={{ marginLeft: '2rem', flex: 1 }}>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="gstNumber"
                                                value={formData.gstNumber}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter GSTIN"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Addresses */}
                            <div className="Vendors-form-section">
                                <div className="Vendors-form-row">
                                    {/* Billing Address */}
                                    <div style={{ flex: 1 }}>
                                        <h3 className="Vendors-section-subtitle">Billing Address</h3>
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Name</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="billingName"
                                                value={formData.billingName}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Name"
                                            />
                                        </div>
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Phone</label>
                                            <input
                                                type="text"
                                                className="Vendors-form-input"
                                                name="billingPhone"
                                                value={formData.billingPhone}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Phone"
                                            />
                                        </div>
                                        <div className="Vendors-form-group">
                                            <label className="Vendors-form-label">Address</label>
                                            <textarea
                                                className="Vendors-form-textarea"
                                                name="billingAddress"
                                                value={formData.billingAddress}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Address"
                                                rows="3"
                                            />
                                        </div>
                                        <div className="Vendors-form-row">
                                            <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingCity"
                                                    value={formData.billingCity}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="City"
                                                />
                                            </div>
                                            <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingState"
                                                    value={formData.billingState}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="State"
                                                />
                                            </div>
                                        </div>
                                        <div className="Vendors-form-row">
                                            <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingCountry"
                                                    value={formData.billingCountry}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="Country"
                                                />
                                            </div>
                                            <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Vendors-form-input"
                                                    name="billingZipCode"
                                                    value={formData.billingZipCode}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="Zip Code"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shipping Address */}
                                    <div style={{ flex: 1, paddingLeft: '2rem', borderLeft: '1px solid #edf2f7' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 className="Vendors-section-subtitle">Shipping Addresses</h3>
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        name="shippingSameAsBilling"
                                                        checked={formData.shippingSameAsBilling}
                                                        onChange={handleInputChange}
                                                        disabled={modalMode === 'view'}
                                                        style={{ marginRight: '5px' }}
                                                    />
                                                    Apply Billing to First Shipping
                                                </label>
                                                {modalMode !== 'view' && (
                                                    <button
                                                        type="button"
                                                        className="Vendors-voucher-badge text-blue-600 border border-blue-600 bg-white hover:bg-blue-50"
                                                        onClick={addShippingAddress}
                                                        style={{ padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                                                    >
                                                        + Add More
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {formData.shippingSameAsBilling && (
                                            <div style={{ marginBottom: '1.5rem', padding: '15px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0369a1' }}>First Shipping Address (Same as Billing)</h4>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#0c4a6e' }}>
                                                    <strong>Address:</strong> {formData.billingAddress || 'N/A'}<br />
                                                    {formData.billingCity && `${formData.billingCity}, `}{formData.billingState && `${formData.billingState}, `}{formData.billingZipCode}
                                                </p>
                                            </div>
                                        )}

                                        {formData.shippingAddresses.length === 0 && !formData.shippingSameAsBilling && (
                                            <div className="Vendors-form-group" style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>
                                                    No shipping addresses added.
                                                </p>
                                                {modalMode !== 'view' && (
                                                    <button
                                                        type="button"
                                                        onClick={addShippingAddress}
                                                        className="Vendors-voucher-badge text-blue-600"
                                                    >
                                                        Click here to add one
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {formData.shippingAddresses.map((addr, index) => (
                                            <div key={index} style={{ marginBottom: '1.5rem', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', position: 'relative' }}>
                                                {modalMode !== 'view' && formData.shippingAddresses.length > 1 && (
                                                    <button
                                                        onClick={() => removeShippingAddress(index)}
                                                        style={{ position: 'absolute', top: '10px', right: '10px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>Shipping Address #{index + 1}</h4>

                                                <div className="Vendors-form-group">
                                                    <label className="Vendors-form-label">Name</label>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        value={addr.name}
                                                        onChange={(e) => handleShippingAddressChange(index, 'name', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Name"
                                                    />
                                                </div>
                                                <div className="Vendors-form-group">
                                                    <label className="Vendors-form-label">Phone</label>
                                                    <input
                                                        type="text"
                                                        className="Vendors-form-input"
                                                        value={addr.phone}
                                                        onChange={(e) => handleShippingAddressChange(index, 'phone', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Phone"
                                                    />
                                                </div>
                                                <div className="Vendors-form-group">
                                                    <label className="Vendors-form-label">Address</label>
                                                    <textarea
                                                        className="Vendors-form-textarea"
                                                        value={addr.address}
                                                        onChange={(e) => handleShippingAddressChange(index, 'address', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Address"
                                                        rows="2"
                                                    />
                                                </div>
                                                <div className="Vendors-form-row">
                                                    <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.city}
                                                            onChange={(e) => handleShippingAddressChange(index, 'city', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="City"
                                                        />
                                                    </div>
                                                    <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.state}
                                                            onChange={(e) => handleShippingAddressChange(index, 'state', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="State"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="Vendors-form-row">
                                                    <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.country}
                                                            onChange={(e) => handleShippingAddressChange(index, 'country', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="Country"
                                                        />
                                                    </div>
                                                    <div className="Vendors-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Vendors-form-input"
                                                            value={addr.zipCode}
                                                            onChange={(e) => handleShippingAddressChange(index, 'zipCode', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="Zip Code"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="Vendors-modal-footer">
                            <button className="Vendors-btn-cancel" onClick={() => setShowModal(false)}>
                                {modalMode === 'view' ? 'Close' : 'Cancel'}
                            </button>
                            {modalMode !== 'view' && (
                                <button className="Vendors-btn-save" onClick={handleSubmit}>
                                    {modalMode === 'create' ? 'Create' : 'Update'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="VEND-unique-delete-overlay">
                    <div className="VEND-unique-delete-modal">
                        <div className="VEND-unique-delete-header">
                            <h2 className="VEND-unique-delete-title">Delete Vendor?</h2>
                            <button className="VEND-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="VEND-unique-delete-body">
                            <p className="VEND-unique-delete-message">
                                Are you sure you want to delete <strong>{vendorToDelete?.name}</strong>? This action cannot be undone and will permanently remove all associated data.
                            </p>
                        </div>
                        <div className="VEND-unique-delete-footer">
                            <button className="VEND-unique-delete-btn VEND-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="VEND-unique-delete-btn VEND-unique-delete-confirm" onClick={confirmDelete}>
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Universal Excel Import Modal */}
            <ExcelImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="vendors"
                onSuccess={() => {
                    fetchData();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default Vendors;
