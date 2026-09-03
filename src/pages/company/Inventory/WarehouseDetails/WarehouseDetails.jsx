import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin } from 'lucide-react';
import inventoryService from '../../../../services/inventoryService';
import GetCompanyId from '../../../../api/GetCompanyId';
import './WarehouseDetails.css';

const WarehouseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const companyId = GetCompanyId();
                const res = await inventoryService.getWarehouseById(id, companyId);
                if (res.success) {
                    setWarehouse(res.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    if (loading) return <div className="p-6">Loading...</div>;
    if (!warehouse) return <div className="p-6">Warehouse not found</div>;

    const { stats, inventory } = warehouse;

    // Get unique categories
    const categoriesList = ['All', ...new Set(inventory.map(item => item.category))];

    // Filtered inventory: Apply category filter
    const filteredInventory = inventory.filter(item => {
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        return matchesCategory;
    });

    return (
        <div className="warehouse-details-page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} /> Back
                </button>
                <div className="header-info">
                    <h1 className="page-title">{warehouse.name}</h1>
                    <div className="location-tag">
                        <MapPin size={16} />
                        <span>Location: {warehouse.location}</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="top-row">
                    <div className="info-mini-card">
                        <div className="label">Location</div>
                        <div className="value">{warehouse.city}, {warehouse.state || 'N/A'}</div>
                        <div className="sub-value">{warehouse.addressLine1}</div>
                    </div>
                    
                    <div className="stats-container-grid">
                        <div className="stat-card-compact">
                            <span className="s-label">Total Categories</span>
                            <span className="s-value">{stats?.totalCategories || 0}</span>
                        </div>
                        <div className="stat-card-compact">
                            <span className="s-label">Total Products</span>
                            <span className="s-value">{stats?.totalProducts || 0}</span>
                        </div>
                        <div className="stat-card-compact">
                            <span className="s-label">Total Stock Units</span>
                            <span className="s-value">{stats?.totalStockUnits || 0}</span>
                        </div>
                        <div className="stat-card-compact green-border">
                            <span className="s-label">Highest Stock</span>
                            <span className="s-value truncate">{stats?.highestStockProduct || '-'}</span>
                        </div>
                        <div className="stat-card-compact red-border">
                            <span className="s-label">Lowest Stock</span>
                            <span className="s-value truncate">{stats?.lowestStockProduct || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Inventory List */}
                <div className="inventory-section">
                    <div className="inventory-card-modern">
                        <div className="card-header-compact">
                            <h2>Inventory List</h2>
                            <div className="header-controls">
                                <select
                                    className="compact-select"
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    {categoriesList.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <span className="item-count">{filteredInventory.length} Items</span>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Category</th>
                                        <th>Product</th>
                                        <th>Measurement</th>
                                        <th>Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory && filteredInventory.length > 0 ? (
                                        filteredInventory.map((item, index) => (
                                            <tr key={item.id}>
                                                <td>{index + 1}</td>
                                                <td>{item.category}</td>
                                                <td>{item.product}</td>
                                                <td>{item.unit}</td>
                                                <td className={`stock-cell ${item.quantity < 0 ? 'negative' : 'positive'}`}>
                                                    {item.quantity}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center p-4 text-gray-500">No inventory found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default WarehouseDetails;
