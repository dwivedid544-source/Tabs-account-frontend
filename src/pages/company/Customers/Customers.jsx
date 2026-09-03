
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Eye, Filter, ArrowLeft, ArrowRight, Search, X, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import customerService from '../../../services/customerService';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import { CompanyContext } from '../../../context/CompanyContext';
import { AuthContext } from '../../../context/AuthContext';
import axiosInstance from '../../../api/axiosInstance';
import './Customers.css';
import ExcelImportModal from '../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../utils/excelService';

const Customers = () => {
    const navigate = useNavigate();
    const { companySettings, formatCurrency } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const [customers, setCustomers] = useState([]);
    const [accountTypes, setAccountTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [uploadingAnyFile, setUploadingAnyFile] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const profileImageRef = useRef();
    const anyFileRef = useRef();

    // Initial Form State
    const initialFormState = {
        name: '',
        nameArabic: '',
        companyName: '',
        companyLocation: '',
        profileImage: '',
        anyFile: '',
        accountType: 'Credit',
        balanceType: 'Debit',
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
            const [customersRes, typesRes] = await Promise.all([
                customerService.getAllCustomers(),
                chartOfAccountsService.getAccountTypes()
            ]);

            if (customersRes.success) {
                setCustomers(customersRes.data);
            }
            if (typesRes.success) {
                setAccountTypes(typesRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load customers');
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
        setCurrentCustomer(null);
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

    const openEditModal = (customer) => {
        setCurrentCustomer(customer);
        const rawBal = customer.ledger?.currentBalance !== undefined && customer.ledger?.currentBalance !== null
            ? customer.ledger.currentBalance
            : (customer.accountBalance !== undefined && customer.accountBalance !== null ? customer.accountBalance : 0);
        const numericBal = parseFloat(rawBal) || 0;

        setFormData({
            ...customer,
            accountBalance: Math.abs(numericBal).toFixed(2),
            balanceType: numericBal >= 0 ? 'Debit' : 'Credit',
            creationDate: customer.creationDate ? new Date(customer.creationDate).toISOString().split('T')[0] : initialFormState.creationDate,
            shippingSameAsBilling: customer.shippingSameAsBilling || false,
            gstEnabled: customer.gstEnabled || false,
            shippingAddresses: customer.shippingaddress || []
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const openViewModal = (customer) => {
        setCurrentCustomer(customer);
        const rawBal = customer.ledger?.currentBalance !== undefined && customer.ledger?.currentBalance !== null
            ? customer.ledger.currentBalance
            : (customer.accountBalance !== undefined && customer.accountBalance !== null ? customer.accountBalance : 0);
        const numericBal = parseFloat(rawBal) || 0;

        setFormData({
            ...initialFormState,
            ...customer,
            accountBalance: Math.abs(numericBal).toFixed(2),
            balanceType: numericBal >= 0 ? 'Debit' : 'Credit',
            creationDate: customer.creationDate ? new Date(customer.creationDate).toISOString().split('T')[0] : initialFormState.creationDate,
            shippingSameAsBilling: customer.shippingSameAsBilling || false,
            gstEnabled: customer.gstEnabled || false,
            shippingAddresses: customer.shippingaddress || []
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
            // Add billing address to the start if it's not already there by some logic
            shippingAddresses = [billingAsShipping, ...formData.shippingAddresses];
        }

        payload.shippingAddresses = shippingAddresses;

        try {
            if (modalMode === 'create') {
                await customerService.createCustomer(payload);
                toast.success('Customer created successfully!');
            } else if (modalMode === 'edit') {
                await customerService.updateCustomer(currentCustomer.id, payload);
                toast.success('Customer updated successfully!');
            }
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error(error.message || 'Failed to save customer');
        }
    };

    const handleDelete = (customer) => {
        setCustomerToDelete(customer);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await customerService.deleteCustomer(customerToDelete.id);
            toast.success('Customer deleted successfully!');
            fetchData();
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error(error.message || 'Failed to delete customer');
        } finally {
            setShowDeleteConfirm(false);
            setCustomerToDelete(null);
        }
    };

    const filteredCustomers = customers.filter(customer => {
        const name = (customer.name || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        const matchesSearch = name.includes(term) || email.includes(term) || phone.includes(term);
        if (!matchesSearch) return false;

        if (activeTab === 'credit') {
            return customer.accountType === 'Credit' || !customer.accountType || customer.accountType === '';
        }
        if (activeTab === 'cash') {
            return customer.accountType === 'Cash';
        }
        return true;
    });

    if (loading) return <div className="p-8">Loading customers...</div>;

    const handleExportExcel = () => {
        if (!customers.length) {
            toast.error('No customers available to export');
            return;
        }
        const exportData = customers.map(c => ({
            'Customer Name': c.name,
            'Arabic Name': c.nameArabic || '',
            'Company / Business Name': c.companyName || '',
            'Email Address': c.email || '',
            'Phone Number': c.phone || '',
            'TRN / VAT Number': c.gstNumber || '',
            'Billing Address': c.billingAddress || '',
            'City': c.billingCity || '',
            'State / County': c.billingState || '',
            'Country': c.billingCountry || '',
            'Credit Period (Days)': c.creditPeriod || 0,
            'Balance Type': c.balanceType || 'Debit',
            'Current Balance': c.accountBalance || 0
        }));
        exportToExcel(exportData, 'Customers_List_Export.xlsx', 'Customers');
        toast.success(`Exported ${exportData.length} customers to Excel.`);
    };

    return (
        <div className="Customers-customers-page">
            <div className="Customers-page-header">
                <h1 className="Customers-page-title">Customers</h1>
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
                    {hasPermission('create customers') && (
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
                        title="Recalculate all customer balances from transaction history"
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
                                const result = await customerService.recalculateAllBalances();
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
                    {hasPermission('create customers') && (
                        <button className="Customers-btn-add" onClick={openCreateModal}>
                            <Plus size={18} />
                            Add Customer
                        </button>
                    )}
                </div>
            </div>


            <div className="Customers-customers-card">
                {/* Customer Type Tabs */}
                <div className="Customers-tabs-container" style={{
                    display: 'flex',
                    borderBottom: '1px solid #e2e8f0',
                    marginBottom: '15px',
                    padding: '0 10px',
                    gap: '10px'
                }}>
                    <button
                        type="button"
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'all' ? '3px solid #1e293b' : '3px solid transparent',
                            color: activeTab === 'all' ? '#1e293b' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onClick={() => setActiveTab('all')}
                    >
                        All Customers
                    </button>
                    <button
                        type="button"
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'credit' ? '3px solid #1e293b' : '3px solid transparent',
                            color: activeTab === 'credit' ? '#1e293b' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onClick={() => setActiveTab('credit')}
                    >
                        Credit Customers
                    </button>
                    <button
                        type="button"
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'cash' ? '3px solid #1e293b' : '3px solid transparent',
                            color: activeTab === 'cash' ? '#1e293b' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onClick={() => setActiveTab('cash')}
                    >
                        Cash Customers
                    </button>
                </div>

                <div className="Customers-controls-row">
                    <div className="Customers-entries-control">
                        <span className="Customers-entries-text">Show</span>
                        <select className="Customers-entries-select">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                        <span className="Customers-entries-text">entries</span>
                    </div>
                    <div className="Customers-search-control">
                        <input
                            type="text"
                            className="Customers-search-input"
                            placeholder="Search name, phone or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="Customers-table-container">
                    <table className="Customers-customers-table">
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
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div
                                                style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb' }}
                                                className="hover:underline"
                                                onClick={() => navigate(`/company/accounts/customers/${customer.id}`)}
                                            >
                                                {customer.name}
                                            </div>
                                            {customer.nameArabic && <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>{customer.nameArabic}</div>}
                                        </td>
                                        <td>{customer.companyName || '-'}</td>
                                        <td>
                                            <div>{customer.email}</div>
                                            <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{customer.phone}</div>
                                        </td>
                                        <td>
                                            <div className={`Customers-text-${(customer.ledger?.currentBalance || 0) >= 0 ? 'success' : 'danger'}`}>
                                                {formatCurrency(Math.abs(customer.ledger?.currentBalance || 0))}
                                                {(customer.ledger?.currentBalance || 0) >= 0 ? ' Dr' : ' Cr'}
                                            </div>
                                            {customer.creditPeriod && <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Credit: {customer.creditPeriod} days</div>}
                                        </td>
                                        {/* <td>
                                            {customer.ledger ? (
                                                <button
                                                style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb' }}
                                                    className=""
                                                    onClick={() => navigate(`/company/accounts/customers/${customer.id}`)}
                                                >
                                                  {customer.ledger.name}  <ArrowRight size={16} /> 
                                                </button>
                                            ) : (
                                                <span className="Customers-text-danger">Not Linked</span>
                                            )}
                                        </td> */}
                                        <td>
                                            <div className="Customers-action-buttons">
                                                <button className="Customers-action-btn Customers-btn-view" onClick={() => openViewModal(customer)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit customers') && (
                                                    <button className="Customers-action-btn Customers-btn-edit" onClick={() => openEditModal(customer)}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete customers') && (
                                                    <button className="Customers-action-btn Customers-btn-delete" onClick={() => handleDelete(customer)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center p-4">No customers found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="Customers-modal-overlay">
                    <div className={`Customers-modal-content Customers-modal-large`}>
                        <div className="Customers-modal-header">
                            <h2 className="Customers-modal-title">
                                {modalMode === 'create' && 'Add Customer'}
                                {modalMode === 'edit' && 'Edit Customer'}
                                {modalMode === 'view' && 'Customer Details'}
                            </h2>
                            <button className="Customers-close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="Customers-modal-body">
                            {/* Basic Information */}
                            <div className="Customers-form-section" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                                <h3 className="Customers-section-subtitle">Basic Information</h3>
                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Name (English) <span className="Customers-text-red">*</span></label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Name"
                                        />
                                    </div>
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Name (Arabic)</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="nameArabic"
                                            value={formData.nameArabic}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Name (Arabic)"
                                        />
                                    </div>
                                </div>

                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Company Name</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div className="Customers-form-group Customers-google-loc">
                                        <label className="Customers-form-label">Company Google Location</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="companyLocation"
                                            value={formData.companyLocation}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Google Maps link"
                                        />
                                    </div>
                                </div>

                                {/* File Uploads */}
                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-profile-img">
                                        <label className="Customers-form-label">Profile Image</label>
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
                                                        onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))}
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
                                                    onChange={(e) => handleFileUpload(e.target.files[0], 'profileImage', 'customers')}
                                                />
                                                <div className="Customers-file-input-wrapper" onClick={() => profileImageRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Customers-file-label">
                                                        <span className="Customers-file-btn">{uploadingProfileImage ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Customers-file-name">{formData.profileImage ? 'Image uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Customers-file-note">JPEG, PNG or JPG (max 5MB)</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="Customers-form-group Customers-any-file">
                                        <label className="Customers-form-label">Any File</label>
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
                                                    onChange={(e) => handleFileUpload(e.target.files[0], 'anyFile', 'customers')}
                                                />
                                                <div className="Customers-file-input-wrapper" onClick={() => anyFileRef.current?.click()} style={{ cursor: 'pointer' }}>
                                                    <div className="Customers-file-label">
                                                        <span className="Customers-file-btn">{uploadingAnyFile ? 'Uploading...' : 'Choose File'}</span>
                                                        <span className="Customers-file-name">{formData.anyFile ? 'File uploaded ✓' : 'No file chosen'}</span>
                                                    </div>
                                                </div>
                                                <span className="Customers-file-note">Any file type. Max 10MB</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="Customers-form-section">
                                <h3 className="Customers-section-subtitle">Account Information</h3>
                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Customer Type <span className="Customers-text-red">*</span></label>
                                        <select
                                            className="Customers-form-select"
                                            name="accountType"
                                            value={formData.accountType || 'Credit'}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        >
                                            <option value="Credit">Credit Customer</option>
                                            <option value="Cash">Cash Customer</option>
                                        </select>
                                    </div>
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Balance Type</label>
                                        <select
                                            className="Customers-form-select"
                                            name="balanceType"
                                            value={formData.balanceType || 'Debit'}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        >
                                            <option value="Debit">Debit</option>
                                            <option value="Credit">Credit</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-half-width">
                                        <div className="Customers-input-with-note">
                                            <label className="Customers-form-label">Account Name <span className="Customers-text-red">*</span></label>
                                            <input
                                                type="text"
                                                className="Customers-form-input"
                                                value={formData.name}
                                                readOnly
                                                disabled
                                                style={{ backgroundColor: '#f3f4f6' }}
                                            />
                                            <span className="Customers-input-note">This will auto-fill from selection above</span>
                                        </div>
                                    </div>
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">
                                            Account Balance ({companySettings?.currency || 'USD'}) <span className="Customers-text-red">*</span>
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
                                                className="Customers-form-input"
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
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Creation Date <span className="Customers-text-red">*</span></label>
                                        <input
                                            type="date"
                                            className="Customers-form-input"
                                            name="creationDate"
                                            value={formData.creationDate}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="Customers-form-section">
                                <h3 className="Customers-section-subtitle">Bank Details</h3>
                                <div className="Customers-form-row Customers-three-col">
                                    <div className="Customers-form-group">
                                        <label className="Customers-form-label">Bank Account Number</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="bankAccountNumber"
                                            value={formData.bankAccountNumber}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter bank account number"
                                        />
                                    </div>
                                    <div className="Customers-form-group">
                                        <label className="Customers-form-label">Bank IFSC</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="bankIFSC"
                                            value={formData.bankIFSC}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter bank IFSC"
                                        />
                                    </div>
                                    <div className="Customers-form-group">
                                        <label className="Customers-form-label">Bank Name & Branch</label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
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
                            <div className="Customers-form-section">
                                <h3 className="Customers-section-subtitle">Contact & Status</h3>
                                <div className="Customers-form-row Customers-mixed-col">
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Phone <span className="Customers-text-red">*</span></label>
                                        <input
                                            type="text"
                                            className="Customers-form-input"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Phone"
                                        />
                                    </div>
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Email <span className="Customers-text-red">*</span></label>
                                        <input
                                            type="email"
                                            className="Customers-form-input"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter Email"
                                        />
                                    </div>
                                    <div className="Customers-form-group Customers-half-width">
                                        <label className="Customers-form-label">Credit Period (days)</label>
                                        <input
                                            type="number"
                                            className="Customers-form-input"
                                            name="creditPeriod"
                                            value={formData.creditPeriod}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                            placeholder="Enter credit period"
                                        />
                                    </div>
                                </div>

                                <div className="Customers-form-row" style={{ alignItems: 'center' }}>
                                    <label className="Customers-switch" style={{ marginRight: '10px' }}>
                                        <input
                                            type="checkbox"
                                            name="gstEnabled"
                                            checked={formData.gstEnabled}
                                            onChange={handleInputChange}
                                            disabled={modalMode === 'view'}
                                        />
                                        <span className="Customers-slider Customers-round"></span>
                                    </label>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Enable GST</span>

                                    {formData.gstEnabled && (
                                        <div className="Customers-form-group" style={{ marginLeft: '2rem', flex: 1 }}>
                                            <input
                                                type="text"
                                                className="Customers-form-input"
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
                            <div className="Customers-form-section">
                                <div className="Customers-form-row">
                                    {/* Billing Address */}
                                    <div style={{ flex: 1 }}>
                                        <h3 className="Customers-section-subtitle">Billing Address</h3>
                                        <div className="Customers-form-group">
                                            <label className="Customers-form-label">Name</label>
                                            <input
                                                type="text"
                                                className="Customers-form-input"
                                                name="billingName"
                                                value={formData.billingName}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Name"
                                            />
                                        </div>
                                        <div className="Customers-form-group">
                                            <label className="Customers-form-label">Phone</label>
                                            <input
                                                type="text"
                                                className="Customers-form-input"
                                                name="billingPhone"
                                                value={formData.billingPhone}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Phone"
                                            />
                                        </div>
                                        <div className="Customers-form-group">
                                            <label className="Customers-form-label">Address</label>
                                            <textarea
                                                className="Customers-form-textarea"
                                                name="billingAddress"
                                                value={formData.billingAddress}
                                                onChange={handleInputChange}
                                                disabled={modalMode === 'view'}
                                                placeholder="Enter Address"
                                                rows="3"
                                            />
                                        </div>
                                        <div className="Customers-form-row">
                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="billingCity"
                                                    value={formData.billingCity}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="City"
                                                />
                                            </div>
                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="billingState"
                                                    value={formData.billingState}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="State"
                                                />
                                            </div>
                                        </div>
                                        <div className="Customers-form-row">
                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
                                                    name="billingCountry"
                                                    value={formData.billingCountry}
                                                    onChange={handleInputChange}
                                                    disabled={modalMode === 'view'}
                                                    placeholder="Country"
                                                />
                                            </div>
                                            <div className="Customers-form-group" style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="Customers-form-input"
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
                                            <h3 className="Customers-section-subtitle">Shipping Addresses</h3>
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
                                                        className="Customers-voucher-badge text-blue-600 border border-blue-600 bg-white hover:bg-blue-50"
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
                                            <div className="Customers-form-group" style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                                <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>
                                                    No shipping addresses added.
                                                </p>
                                                {modalMode !== 'view' && (
                                                    <button
                                                        type="button"
                                                        onClick={addShippingAddress}
                                                        className="Customers-voucher-badge text-blue-600"
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

                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Name</label>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        value={addr.name}
                                                        onChange={(e) => handleShippingAddressChange(index, 'name', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Name"
                                                    />
                                                </div>
                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Phone</label>
                                                    <input
                                                        type="text"
                                                        className="Customers-form-input"
                                                        value={addr.phone}
                                                        onChange={(e) => handleShippingAddressChange(index, 'phone', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Phone"
                                                    />
                                                </div>
                                                <div className="Customers-form-group">
                                                    <label className="Customers-form-label">Address</label>
                                                    <textarea
                                                        className="Customers-form-textarea"
                                                        value={addr.address}
                                                        onChange={(e) => handleShippingAddressChange(index, 'address', e.target.value)}
                                                        disabled={modalMode === 'view'}
                                                        placeholder="Enter Address"
                                                        rows="2"
                                                    />
                                                </div>
                                                <div className="Customers-form-row">
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            value={addr.city}
                                                            onChange={(e) => handleShippingAddressChange(index, 'city', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="City"
                                                        />
                                                    </div>
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            value={addr.state}
                                                            onChange={(e) => handleShippingAddressChange(index, 'state', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="State"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="Customers-form-row">
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
                                                            value={addr.country}
                                                            onChange={(e) => handleShippingAddressChange(index, 'country', e.target.value)}
                                                            disabled={modalMode === 'view'}
                                                            placeholder="Country"
                                                        />
                                                    </div>
                                                    <div className="Customers-form-group" style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            className="Customers-form-input"
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

                        <div className="Customers-modal-footer">
                            <button className="Customers-btn-cancel" onClick={() => setShowModal(false)}>
                                {modalMode === 'view' ? 'Close' : 'Cancel'}
                            </button>
                            {modalMode !== 'view' && (
                                <button className="Customers-btn-save" onClick={handleSubmit}>
                                    {modalMode === 'create' ? 'Create' : 'Update'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="CUST-unique-delete-overlay">
                    <div className="CUST-unique-delete-modal">
                        <div className="CUST-unique-delete-header">
                            <h2 className="CUST-unique-delete-title">Delete Customer?</h2>
                            <button className="CUST-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="CUST-unique-delete-body">
                            <p className="CUST-unique-delete-message">
                                Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone and will permanently remove all associated data.
                            </p>
                        </div>
                        <div className="CUST-unique-delete-footer">
                            <button className="CUST-unique-delete-btn CUST-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="CUST-unique-delete-btn CUST-unique-delete-confirm" onClick={confirmDelete}>
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
                entityType="customers"
                onSuccess={() => {
                    fetchData();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default Customers;
