import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import inventoryService from '../../../../services/inventoryService';
import GetCompanyId from '../../../../api/GetCompanyId';
import './Warehouse.css';

const Warehouse = () => {
    const { hasPermission } = useContext(AuthContext);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
    });

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const companyId = GetCompanyId();
            const res = await inventoryService.getWarehouses(companyId);
            if (res.success) {
                setWarehouses(res.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch warehouses');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreate = async () => {
        try {
            if (!formData.name || !formData.location) {
                toast.error('Name and Location are required');
                return;
            }
            const companyId = GetCompanyId();
            await inventoryService.createWarehouse(formData, companyId);
            toast.success('Warehouse created successfully');
            setShowAddModal(false);
            fetchWarehouses();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create warehouse');
        }
    };

    const handleUpdate = async () => {
        try {
            if (!formData.name || !formData.location) {
                toast.error('Name and Location are required');
                return;
            }
            const companyId = GetCompanyId();
            await inventoryService.updateWarehouse(selectedWarehouse.id, formData, companyId);
            toast.success('Warehouse updated successfully');
            setShowEditModal(false);
            fetchWarehouses();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to update warehouse');
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            const companyId = GetCompanyId();
            await inventoryService.deleteWarehouse(selectedWarehouse.id, companyId);
            toast.success('Warehouse deleted successfully');
            setShowDeleteModal(false);
            fetchWarehouses();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete warehouse');
        }
    };

    const openEditModal = (wh) => {
        setSelectedWarehouse(wh);
        setFormData({
            name: wh.name,
            location: wh.location,
            addressLine1: wh.addressLine1 || '',
            addressLine2: wh.addressLine2 || '',
            city: wh.city || '',
            state: wh.state || '',
            postalCode: wh.postalCode || '',
            country: wh.country || ''
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (wh) => {
        setSelectedWarehouse(wh);
        setShowDeleteModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
        });
        setSelectedWarehouse(null);
    };

    // Filter
    const filteredWarehouses = warehouses.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="Zirak-Warehouse-page">
            <div className="Zirak-Warehouse-page-header">
                <h1 className="Zirak-Warehouse-page-title">Warehouse</h1>
                {hasPermission('create warehouse') && (
                    <button className="Zirak-Warehouse-btn-add" onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}>
                        <Plus size={18} />
                        Create Warehouse
                    </button>
                )}
            </div>

            <div className="Zirak-Warehouse-card">
                <div className="Zirak-Warehouse-controls-row">
                    <div className="Zirak-Warehouse-entries-control">
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="Zirak-Warehouse-entries-select"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="Zirak-Warehouse-entries-text">entries per page</span>
                    </div>
                    <div className="Zirak-Warehouse-search-control">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="Zirak-Warehouse-search-input"
                        />
                    </div>
                </div>

                <div className="Zirak-Warehouse-table-container">
                    <table className="Zirak-Warehouse-table">
                        <thead>
                            <tr>
                                <th>S.NO</th>
                                <th>WAREHOUSE NAME</th>
                                <th>TOTAL STOCKS</th>
                                <th>LOCATION</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="Zirak-Warehouse-text-center Zirak-Warehouse-p-4">Loading...</td></tr>
                            ) : filteredWarehouses.length > 0 ? (
                                filteredWarehouses.slice(0, entriesPerPage).map((wh, index) => (
                                    <tr key={wh.id}>
                                        <td>{index + 1}</td>
                                        <td>{wh.name}</td>
                                        <td>{wh.totalStock || 0}</td>
                                        <td>{wh.location}</td>
                                        <td>
                                             <div className="Zirak-Warehouse-action-buttons">
                                                <button className="Zirak-Warehouse-action-btn Zirak-Warehouse-btn-view" data-tooltip="View" onClick={() => navigate(`/company/inventory/warehouse/${wh.id}`)}>
                                                    <Eye size={16} />
                                                </button>
                                                {hasPermission('edit warehouse') && (
                                                    <button className="Zirak-Warehouse-action-btn Zirak-Warehouse-btn-edit" data-tooltip="Edit" onClick={() => openEditModal(wh)}>
                                                        <Pencil size={16} />
                                                    </button>
                                                )}
                                                {hasPermission('delete warehouse') && (
                                                    <button className="Zirak-Warehouse-action-btn Zirak-Warehouse-btn-delete" data-tooltip="Delete" onClick={() => openDeleteModal(wh)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="Zirak-Warehouse-text-center Zirak-Warehouse-p-4">No warehouses found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="Zirak-Warehouse-pagination-row">
                    <p className="Zirak-Warehouse-pagination-info">Showing 1 to {Math.min(filteredWarehouses.length, entriesPerPage)} of {filteredWarehouses.length} entries</p>
                    <div className="Zirak-Warehouse-pagination-controls">
                        <button className="Zirak-Warehouse-pagination-btn Zirak-Warehouse-disabled">Previous</button>
                        <button className="Zirak-Warehouse-pagination-btn Zirak-Warehouse-active">1</button>
                        <button className="Zirak-Warehouse-pagination-btn Zirak-Warehouse-disabled">Next</button>
                    </div>
                </div>
            </div>

            {/* Create Warehouse Modal */}
            {showAddModal && (
                <div className="Zirak-Warehouse-modal-overlay">
                    <div className="Zirak-Warehouse-modal-content Zirak-Warehouse-modal">
                        <div className="Zirak-Warehouse-modal-header">
                            <h2 className="Zirak-Warehouse-modal-title">Create Warehouse</h2>
                            <button className="Zirak-Warehouse-close-btn" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Warehouse-modal-body">
                            <div className="Zirak-Warehouse-form-row Zirak-Warehouse-two-col">
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Warehouse Name <span className="Zirak-Warehouse-text-red">*</span></label>
                                    <input
                                        type="text" name="name" className="Zirak-Warehouse-form-input"
                                        placeholder="Enter warehouse name"
                                        value={formData.name} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Location <span className="Zirak-Warehouse-text-red">*</span></label>
                                    <input
                                        type="text" name="location" className="Zirak-Warehouse-form-input"
                                        placeholder="Enter location"
                                        value={formData.location} onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Address Line 1</label>
                                <input
                                    type="text" name="addressLine1" className="Zirak-Warehouse-form-input"
                                    placeholder="Street address, P.O. box, company name, etc."
                                    value={formData.addressLine1} onChange={handleInputChange}
                                />
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Address Line 2</label>
                                <input
                                    type="text" name="addressLine2" className="Zirak-Warehouse-form-input"
                                    placeholder="Apartment, suite, unit, building, floor, etc."
                                    value={formData.addressLine2} onChange={handleInputChange}
                                />
                            </div>

                            <div className="Zirak-Warehouse-form-row Zirak-Warehouse-three-col">
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">City</label>
                                    <input
                                        type="text" name="city" className="Zirak-Warehouse-form-input"
                                        placeholder="City"
                                        value={formData.city} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">State / Province</label>
                                    <input
                                        type="text" name="state" className="Zirak-Warehouse-form-input"
                                        placeholder="State"
                                        value={formData.state} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Postal Code</label>
                                    <input
                                        type="text" name="postalCode" className="Zirak-Warehouse-form-input"
                                        placeholder="Pincode"
                                        value={formData.postalCode} onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Country</label>
                                <input
                                    type="text" name="country" className="Zirak-Warehouse-form-input"
                                    placeholder="Country"
                                    value={formData.country} onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div className="Zirak-Warehouse-modal-footer">
                            <button className="Zirak-Warehouse-btn-close-modal" onClick={() => setShowAddModal(false)}>Close</button>
                            <button className="Zirak-Warehouse-btn-create-modal" onClick={handleCreate}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Warehouse Modal */}
            {showEditModal && (
                <div className="Zirak-Warehouse-modal-overlay">
                    <div className="Zirak-Warehouse-modal-content Zirak-Warehouse-modal">
                        <div className="Zirak-Warehouse-modal-header">
                            <h2 className="Zirak-Warehouse-modal-title">Edit Warehouse</h2>
                            <button className="Zirak-Warehouse-close-btn" onClick={() => setShowEditModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Warehouse-modal-body">
                            <div className="Zirak-Warehouse-form-row Zirak-Warehouse-two-col">
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Warehouse Name <span className="Zirak-Warehouse-text-red">*</span></label>
                                    <input
                                        type="text" name="name" className="Zirak-Warehouse-form-input"
                                        placeholder="Enter warehouse name"
                                        value={formData.name} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Location <span className="Zirak-Warehouse-text-red">*</span></label>
                                    <input
                                        type="text" name="location" className="Zirak-Warehouse-form-input"
                                        placeholder="Enter location"
                                        value={formData.location} onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Address Line 1</label>
                                <input
                                    type="text" name="addressLine1" className="Zirak-Warehouse-form-input"
                                    placeholder="Street address, P.O. box, company name, etc."
                                    value={formData.addressLine1} onChange={handleInputChange}
                                />
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Address Line 2</label>
                                <input
                                    type="text" name="addressLine2" className="Zirak-Warehouse-form-input"
                                    placeholder="Apartment, suite, unit, building, floor, etc."
                                    value={formData.addressLine2} onChange={handleInputChange}
                                />
                            </div>

                            <div className="Zirak-Warehouse-form-row Zirak-Warehouse-three-col">
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">City</label>
                                    <input
                                        type="text" name="city" className="Zirak-Warehouse-form-input"
                                        placeholder="City"
                                        value={formData.city} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">State / Province</label>
                                    <input
                                        type="text" name="state" className="Zirak-Warehouse-form-input"
                                        placeholder="State"
                                        value={formData.state} onChange={handleInputChange}
                                    />
                                </div>
                                <div className="Zirak-Warehouse-form-group">
                                    <label className="Zirak-Warehouse-form-label">Postal Code</label>
                                    <input
                                        type="text" name="postalCode" className="Zirak-Warehouse-form-input"
                                        placeholder="Pincode"
                                        value={formData.postalCode} onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="Zirak-Warehouse-form-group">
                                <label className="Zirak-Warehouse-form-label">Country</label>
                                <input
                                    type="text" name="country" className="Zirak-Warehouse-form-input"
                                    placeholder="Country"
                                    value={formData.country} onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div className="Zirak-Warehouse-modal-footer">
                            <button className="Zirak-Warehouse-btn-close-modal" onClick={() => setShowEditModal(false)}>Close</button>
                            <button className="Zirak-Warehouse-btn-create-modal" style={{ backgroundColor: '#4dd0e1' }} onClick={handleUpdate}>Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="Zirak-Warehouse-modal-overlay">
                    <div className="Zirak-Warehouse-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="Zirak-Warehouse-modal-header">
                            <h2 className="Zirak-Warehouse-modal-title">Delete Warehouse</h2>
                            <button className="Zirak-Warehouse-close-btn" onClick={() => setShowDeleteModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="Zirak-Warehouse-modal-body">
                            <p>Are you sure you want to delete warehouse <strong>{selectedWarehouse?.name}</strong>?</p>
                        </div>
                        <div className="Zirak-Warehouse-modal-footer">
                            <button className="Zirak-Warehouse-btn-close-modal" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="Zirak-Warehouse-btn-create-modal" style={{ backgroundColor: '#f06292' }} onClick={handleDeleteConfirm}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Warehouse;
