import React, { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, Eye } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import servicesApi from '../../../../api/servicesService';
import uomService from '../../../../services/uomService';
import { toast } from 'react-hot-toast';
import './Services.css';
import GetCompanyId from '../../../../api/GetCompanyId';
import { CompanyContext } from '../../../../context/CompanyContext';

const Services = () => {
    const { formatCurrency } = useContext(CompanyContext);
    const { hasPermission } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        uomId: '',
        price: '',
        taxRate: '',
        allowInInvoices: true,
        remarks: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const [servicesRes, uomsRes] = await Promise.all([
                servicesApi.getServices(companyId),
                uomService.getUOMs(companyId)
            ]);
            if (servicesRes.success) setServices(servicesRes.data);
            if (uomsRes.success) setUoms(uomsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            description: '',
            uomId: '',
            price: '',
            taxRate: '',
            allowInInvoices: true,
            remarks: ''
        });
    };

    const handleView = (service) => {
        setSelectedService(service);
        setShowViewModal(true);
    };

    const handleEdit = (service) => {
        setSelectedService(service);
        setFormData({
            name: service.name,
            sku: service.sku || '',
            description: service.description || '',
            uomId: service.uomId,
            price: service.price,
            taxRate: service.taxRate,
            allowInInvoices: service.allowInInvoices,
            remarks: service.remarks || ''
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = (service) => {
        setSelectedService(service);
        setShowDeleteModal(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const companyId = GetCompanyId();
            const payload = { ...formData, companyId };
            const res = await servicesApi.createService(payload);
            if (res.success) {
                toast.success('Service created successfully');
                setShowAddModal(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            console.error('Error creating service:', error);
            toast.error(error.response?.data?.message || 'Failed to create service');
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const companyId = GetCompanyId();
            const payload = { ...formData, companyId };
            const res = await servicesApi.updateService(selectedService.id, payload, companyId);
            if (res.success) {
                toast.success('Service updated successfully');
                setShowEditModal(false);
                setSelectedService(null);
                resetForm();
                fetchData();
            }
        } catch (error) {
            console.error('Error updating service:', error);
            toast.error(error.response?.data?.message || 'Failed to update service');
        }
    };

    const confirmDelete = async () => {
        try {
            const companyId = GetCompanyId();
            const res = await servicesApi.deleteService(selectedService.id, companyId);
            if (res.success) {
                toast.success('Service deleted successfully');
                setShowDeleteModal(false);
                setSelectedService(null);
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            toast.error('Failed to delete service');
        }
    };

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="Zirak-Services-page">
            <div className="Zirak-Services-page-header">
                <h1 className="Zirak-Services-page-title">Services</h1>
                {hasPermission('create services') && (
                    <button className="Zirak-Services-btn-add" style={{ backgroundColor: '#1e293b' }} onClick={() => { resetForm(); setShowAddModal(true); }}>
                        <Plus size={18} />
                        Add Service
                    </button>
                )}
            </div>

            <div className="Zirak-Services-card">
                <div className="Zirak-Services-controls-row">
                    <div className="Zirak-Services-entries-control">
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="Zirak-Services-entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="Zirak-Services-entries-text">entries per page</span>
                    </div>
                    <div className="Zirak-Services-search-control">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="Zirak-Services-search-input"
                        />
                    </div>
                </div>

                <div className="Zirak-Services-table-container">
                    <table className="Zirak-Services-table">
                        <thead>
                            <tr>
                                <th>SERVICE NAME</th>
                                <th>SERVICE DESCRIPTION</th>
                                <th>UNIT OF MEASURE</th>
                                <th>PRICE</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
                            ) : filteredServices.length > 0 ? (
                                filteredServices.map((s) => (
                                    <tr key={s.id}>
                                        <td className="Zirak-Services-font-semibold">{s.name}</td>
                                        <td>{s.description || '-'}</td>
                                        <td>{s.uom?.unitName}</td>
                                        <td>{formatCurrency(s.price)}</td>
                                        <td>
                                             <div className="Zirak-Services-action-buttons">
                                                <button className="Zirak-Services-action-btn Zirak-Services-btn-view" data-tooltip="View" onClick={() => handleView(s)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit services') && (
                                                    <button className="Zirak-Services-action-btn Zirak-Services-btn-edit" data-tooltip="Edit" onClick={() => handleEdit(s)}>
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete services') && (
                                                    <button className="Zirak-Services-action-btn Zirak-Services-btn-delete" data-tooltip="Delete" onClick={() => handleDeleteClick(s)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No services found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="Zirak-Services-pagination-row">
                    <p className="Zirak-Services-pagination-info">Showing {filteredServices.length} entries</p>
                </div>
            </div>

            {/* Add Service Modal */}
            {showAddModal && (
                <div className="Zirak-Services-modal-overlay">
                    <div className="Zirak-Services-modal-content Zirak-Services-modal-large">
                        <div className="Zirak-Services-modal-header">
                            <h2 className="Zirak-Services-modal-title">Add Service</h2>
                            <button className="Zirak-Services-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit}>
                            <div className="Zirak-Services-modal-body">
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Service Name <span className="Zirak-Services-text-red">*</span></label>
                                    <input name="name" type="text" className="Zirak-Services-form-input" placeholder="Enter service name" required value={formData.name} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">SKU</label>
                                    <input name="sku" type="text" className="Zirak-Services-form-input" placeholder="Enter SKU (optional)" value={formData.sku} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Service Description</label>
                                    <textarea name="description" className="Zirak-Services-form-input Zirak-Services-textarea" placeholder="Describe the service" rows={3} value={formData.description} onChange={handleInputChange}></textarea>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Unit of Measure <span className="Zirak-Services-text-red">*</span></label>
                                    <select name="uomId" className="Zirak-Services-form-input" required value={formData.uomId} onChange={handleInputChange}>
                                        <option value="">Select UOM</option>
                                        {uoms.map(uom => (
                                            <option key={uom.id} value={uom.id}>{uom.unitName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Price <span className="Zirak-Services-text-red">*</span></label>
                                    <input name="price" type="number" step="0.01" className="Zirak-Services-form-input" placeholder="Enter price" required value={formData.price} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Default Tax %</label>
                                    <input name="taxRate" type="number" className="Zirak-Services-form-input" placeholder="e.g. 18" value={formData.taxRate} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-checkbox-group">
                                    <input name="allowInInvoices" type="checkbox" id="allowInvoices" checked={formData.allowInInvoices} onChange={handleInputChange} />
                                    <label htmlFor="allowInInvoices" className="Zirak-Services-checkbox-label">Allow this service to be added in invoices</label>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Remarks</label>
                                    <textarea name="remarks" className="Zirak-Services-form-input Zirak-Services-textarea" placeholder="Internal notes (not visible to customers)" rows={3} value={formData.remarks} onChange={handleInputChange}></textarea>
                                    <p className="Zirak-Services-form-help-text">Remarks are for internal use only; they do not display anywhere.</p>
                                </div>
                            </div>
                            <div className="Zirak-Services-modal-footer">
                                <button type="button" className="Zirak-Services-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="Zirak-Services-btn-submit" style={{ backgroundColor: '#1e293b' }}>Save Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Service Modal */}
            {showViewModal && (
                <div className="Zirak-Services-modal-overlay">
                    <div className="Zirak-Services-modal-content Zirak-Services-modal-large">
                        <div className="Zirak-Services-modal-header">
                            <h2 className="Zirak-Services-modal-title">Service Details</h2>
                            <button className="Zirak-Services-close-btn" onClick={() => setShowViewModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Services-modal-body">
                            <div className="Zirak-Services-view-grid">
                                <div className="Zirak-Services-view-item">
                                    <label>Service Name</label>
                                    <p>{selectedService?.name}</p>
                                </div>
                                <div className="Zirak-Services-view-item">
                                    <label>SKU</label>
                                    <p>{selectedService?.sku || 'N/A'}</p>
                                </div>
                                <div className="Zirak-Services-view-item Zirak-Services-view-item-full">
                                    <label>Description</label>
                                    <p>{selectedService?.description || 'No description'}</p>
                                </div>
                                <div className="Zirak-Services-view-item">
                                    <label>Unit of Measure</label>
                                    <p>{selectedService?.uom?.unitName}</p>
                                </div>
                                <div className="Zirak-Services-view-item">
                                    <label>Price</label>
                                    <p>{formatCurrency(selectedService?.price)}</p>
                                </div>
                                <div className="Zirak-Services-view-item">
                                    <label>Tax Rate</label>
                                    <p>{selectedService?.taxRate}%</p>
                                </div>
                                <div className="Zirak-Services-view-item Zirak-Services-view-item-full">
                                    <label>Remarks</label>
                                    <p>{selectedService?.remarks || 'No remarks'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="Zirak-Services-modal-footer">
                            <button className="Zirak-Services-btn-cancel" onClick={() => setShowViewModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Service Modal */}
            {showEditModal && (
                <div className="Zirak-Services-modal-overlay">
                    <div className="Zirak-Services-modal-content Zirak-Services-modal-large">
                        <div className="Zirak-Services-modal-header">
                            <h2 className="Zirak-Services-modal-title">Edit Service</h2>
                            <button className="Zirak-Services-close-btn" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="Zirak-Services-modal-body">
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Service Name <span className="Zirak-Services-text-red">*</span></label>
                                    <input name="name" type="text" className="Zirak-Services-form-input" required value={formData.name} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">SKU</label>
                                    <input name="sku" type="text" className="Zirak-Services-form-input" value={formData.sku} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Service Description</label>
                                    <textarea name="description" className="Zirak-Services-form-input Zirak-Services-textarea" rows={3} value={formData.description} onChange={handleInputChange}></textarea>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Unit of Measure <span className="Zirak-Services-text-red">*</span></label>
                                    <select name="uomId" className="Zirak-Services-form-input" required value={formData.uomId} onChange={handleInputChange}>
                                        <option value="">Select UOM</option>
                                        {uoms.map(uom => (
                                            <option key={uom.id} value={uom.id}>{uom.unitName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Price <span className="Zirak-Services-text-red">*</span></label>
                                    <input name="price" type="number" step="0.01" className="Zirak-Services-form-input" required value={formData.price} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Default Tax %</label>
                                    <input name="taxRate" type="number" className="Zirak-Services-form-input" value={formData.taxRate} onChange={handleInputChange} />
                                </div>
                                <div className="Zirak-Services-form-checkbox-group">
                                    <input name="allowInInvoices" type="checkbox" id="editAllowInvoices" checked={formData.allowInInvoices} onChange={handleInputChange} />
                                    <label htmlFor="editAllowInvoices" className="Zirak-Services-checkbox-label">Allow this service to be added in invoices</label>
                                </div>
                                <div className="Zirak-Services-form-group">
                                    <label className="Zirak-Services-form-label">Remarks</label>
                                    <textarea name="remarks" className="Zirak-Services-form-input Zirak-Services-textarea" rows={3} value={formData.remarks} onChange={handleInputChange}></textarea>
                                </div>
                            </div>
                            <div className="Zirak-Services-modal-footer">
                                <button type="button" className="Zirak-Services-btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="Zirak-Services-btn-submit" style={{ backgroundColor: '#1e293b' }}>Update Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="Zirak-Services-modal-overlay">
                    <div className="Zirak-Services-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="Zirak-Services-modal-header">
                            <h2 className="Zirak-Services-modal-title">Delete Service</h2>
                            <button className="Zirak-Services-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Services-modal-body">
                            <p>Are you sure you want to delete service <strong>{selectedService?.name}</strong>?</p>
                        </div>
                        <div className="Zirak-Services-modal-footer">
                            <button className="Zirak-Services-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="Zirak-Services-btn-submit" style={{ backgroundColor: '#ff4d4d' }} onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
