import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../../../../context/AuthContext';
import uomService from '../../../../services/uomService';
import toast from 'react-hot-toast';
import GetCompanyId from '../../../../api/GetCompanyId';
import './UOM.css';

const UOM = () => {
    const { hasPermission } = useContext(AuthContext);
    const [uoms, setUoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUom, setEditingUom] = useState(null);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [uomToDelete, setUomToDelete] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        category: '',
        unitName: '',
        weightPerUnit: '',
        uomType: 'Simple',
        baseUnitId: '',
        conversionRate: ''
    });

    const measurementCategories = ['Weight', 'Area', 'Volume', 'Length', 'Count'];

    const unitsByCategory = {
       'Weight': [
        'Microgram',
        'Milligram',
        'Gram',
        'Kilogram (KG)',
        'Metric Ton (Tonne)',
        'Quintal',
        'Pound (lb)',
        'Ounce (oz)',
        'Stone',
        'Carat'
    ],

    'Area': [
        'Square Millimeter',
        'Square Centimeter',
        'Square Meter',
        'Square Kilometer',
        'Square Inch',
        'Square Foot',
        'Square Yard',
        'Acre',
        'Hectare',
        'Bigha',
        'Kanal',
        'Cent'
    ],

    'Volume': [
        'Millilitre (mL)',
        'Litre (L)',
        'Cubic Centimeter (cc)',
        'Cubic Meter',
        'Cubic Inch',
        'Cubic Foot',
        'Gallon',
        'Barrel',
        'Pint',
        'Quart',
        'Fluid Ounce'
    ],

    'Length': [
        'Nanometer',
        'Micrometer',
        'Millimeter',
        'Centimeter',
        'Meter',
        'Kilometer',
        'Inch',
        'Foot',
        'Yard',
        'Mile'
    ],

    'Count': [
        'Piece',
        'Unit',
        'Dozen',
        'Pair',
        'Set',
        'Box',
        'Packet',
        'Carton',
        'Bundle',
        'Roll',
        'Strip',
        'Bottle',
        'Bag',
        'Can',
        'Jar',
        'Tube'
    ]
    };

    useEffect(() => {
        fetchUOMs();
    }, []);

    const fetchUOMs = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();
            const res = await uomService.getUOMs(companyId);
            if (res.success) {
                setUoms(res.data);
            }
        } catch (error) {
            console.error('Error fetching UOMs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            // Optional: Only reset unit if category is strictly different and from the known list
            // For now, let's keep it simple to allow custom typing without annoying resets
            return newState;
        });
    };

    const getAvailableBaseUnitsForCategory = (cat) => {
        // 1. Get all custom created Simple UOMs in this category
        const customSimpleUnits = uoms.filter(u => 
            u.uomType === 'Simple' && 
            u.category.toLowerCase() === cat.toLowerCase() &&
            u.id !== editingUom?.id
        );
        
        // 2. Get standard units for this category that are not already created
        const standardUnits = [];
        if (unitsByCategory[cat]) {
            unitsByCategory[cat].forEach(stdUnitName => {
                const alreadyExists = uoms.some(u => 
                    u.uomType === 'Simple' && 
                    u.unitName.toLowerCase() === stdUnitName.toLowerCase() &&
                    u.category.toLowerCase() === cat.toLowerCase()
                );
                if (!alreadyExists) {
                    standardUnits.push({
                        id: stdUnitName, // Use standard name as value
                        unitName: stdUnitName,
                        category: cat,
                        isStandard: true
                    });
                }
            });
        }
        
        return [...customSimpleUnits, ...standardUnits];
    };

    const getUniqueCategories = () => {
        return Array.from(new Set([
            ...measurementCategories,
            ...uoms.map(u => u.category)
        ])).filter(Boolean);
    };

    // Group UOMs by category for summary
    const categorySummary = uoms.reduce((acc, uom) => {
        acc[uom.category] = (acc[uom.category] || 0) + 1;
        return acc;
    }, {});

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const companyId = GetCompanyId();
            const payload = {
                category: formData.category,
                unitName: formData.unitName,
                weightPerUnit: formData.weightPerUnit,
                uomType: formData.uomType,
                baseUnitId: formData.uomType === 'Compound' && formData.baseUnitId 
                    ? (isNaN(formData.baseUnitId) ? formData.baseUnitId : parseInt(formData.baseUnitId)) 
                    : null,
                conversionRate: formData.uomType === 'Compound' && formData.conversionRate ? parseFloat(formData.conversionRate) : null,
                companyId: parseInt(companyId)
            };

            let res;
            if (editingUom) {
                res = await uomService.updateUOM(editingUom.id, payload, companyId);
            } else {
                res = await uomService.createUOM(payload);
            }

            if (res.success) {
                fetchUOMs();
                closeModal();
            }
        } catch (error) {
            console.error('Error saving UOM:', error);
            toast.error(error.response?.data?.message || 'Failed to save UOM');
        }
    };

    const handleEdit = (uom) => {
        setEditingUom(uom);
        setFormData({
            category: uom.category,
            unitName: uom.unitName,
            weightPerUnit: uom.weightPerUnit || '',
            uomType: uom.uomType || 'Simple',
            baseUnitId: uom.baseUnitId || '',
            conversionRate: uom.conversionRate || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        setUomToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!uomToDelete) return;
        try {
            const companyId = GetCompanyId();
            const res = await uomService.deleteUOM(uomToDelete, companyId);
            if (res.success) {
                fetchUOMs();
            }
        } catch (error) {
            console.error('Error deleting UOM:', error);
            toast.error(error.response?.data?.message || 'Failed to delete UOM');
        } finally {
            setShowDeleteConfirm(false);
            setUomToDelete(null);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUom(null);
        setFormData({
            category: '',
            unitName: '',
            weightPerUnit: '',
            uomType: 'Simple',
            baseUnitId: '',
            conversionRate: ''
        });
    };

    const filteredUoms = uoms.filter(uom =>
        uom.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uom.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredUoms.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredUoms.length / entriesPerPage);

    return (
        <div className="Zirak-UOM-page">
            <div className="Zirak-UOM-header">
                <h1>Unit of Measure</h1>
                {hasPermission('create uom') && (
                    <button className="Zirak-UOM-add-btn" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Add New Unit
                    </button>
                )}
            </div>

            <div className="Zirak-UOM-summary-grid">
                {Object.entries(categorySummary).map(([cat, count]) => (
                    <div key={cat} className="Zirak-UOM-summary-card">
                        <span className="Zirak-UOM-summary-label">{cat}</span>
                        <span className="Zirak-UOM-summary-count">{count} Units</span>
                    </div>
                ))}
                {uoms.length === 0 && !loading && (
                    <div className="Zirak-UOM-summary-card">
                        <span className="Zirak-UOM-summary-label">Total</span>
                        <span className="Zirak-UOM-summary-count">0 Units</span>
                    </div>
                )}
            </div>

            <div className="Zirak-UOM-container">
                <div className="Zirak-UOM-table-controls">
                    <div className="Zirak-UOM-entries-select">
                        <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span>entries per page</span>
                    </div>
                    <div className="Zirak-UOM-search-box">
                        <Search size={18} className="Zirak-UOM-search-icon" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="Zirak-UOM-table-wrapper">
                    <table className="Zirak-UOM-table">
                        <thead>
                            <tr>
                                <th>S.NO</th>
                                <th>UNIT NAME</th>
                                <th>CATEGORY</th>
                                <th>TYPE</th>
                                <th>FORMULA / RELATION</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="Zirak-UOM-text-center">Loading...</td></tr>
                            ) : currentEntries.length > 0 ? (
                                currentEntries.map((uom, index) => (
                                    <tr key={uom.id}>
                                        <td>{indexOfFirstEntry + index + 1}</td>
                                        <td>{uom.unitName}</td>
                                        <td>
                                            <span className={`Zirak-UOM-category-badge Zirak-UOM-${uom.category.toLowerCase()}`}>
                                                {uom.category.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`UOM-type-badge UOM-type-${uom.uomType?.toLowerCase() || 'simple'}`}>
                                                {uom.uomType || 'Simple'}
                                            </span>
                                        </td>
                                        <td>
                                            {uom.uomType === 'Compound' && uom.baseUnit ? (
                                                <span className="UOM-relation-formula">
                                                    1 {uom.unitName} = {uom.conversionRate} {uom.baseUnit.unitName}
                                                </span>
                                            ) : (
                                                <span className="UOM-relation-standalone">Standalone</span>
                                            )}
                                        </td>
                                    
                                        <td className="Zirak-UOM-actions-cell">
                                            {hasPermission('edit uom') && (
                                                <button className="Zirak-UOM-edit-btn" onClick={() => handleEdit(uom)}>
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {hasPermission('delete uom') && (
                                                <button className="Zirak-UOM-delete-btn" onClick={() => handleDelete(uom.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="Zirak-UOM-text-center">No units found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="Zirak-UOM-table-footer">
                    <div className="Zirak-UOM-footer-info">
                        Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredUoms.length)} of {filteredUoms.length} entries
                    </div>
                    <div className="Zirak-UOM-pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="Zirak-UOM-page-btn"
                        >
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`Zirak-UOM-page-btn ${currentPage === i + 1 ? 'Zirak-UOM-active' : ''}`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="Zirak-UOM-page-btn"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="Zirak-UOM-modal-overlay">
                    <div className="Zirak-UOM-modal">
                        <div className="Zirak-UOM-modal-header">
                            <h2>Unit Details</h2>
                            <button className="Zirak-UOM-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="Zirak-UOM-modal-body">
                                <div className="Zirak-UOM-form-group">
                                    <label>Measurement Category*</label>
                                    <input
                                        list="category-suggestions"
                                        name="category"
                                        placeholder="Select or type category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <datalist id="category-suggestions">
                                        {measurementCategories.map(cat => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="Zirak-UOM-form-group">
                                    <label>UOM Type*</label>
                                    <select
                                        name="uomType"
                                        value={formData.uomType}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="Simple">Simple (Single Standalone Unit)</option>
                                        <option value="Compound">Compound (Pack of Simple Unit)</option>
                                    </select>
                                </div>
                                <div className="Zirak-UOM-form-group">
                                    <label>Unit of Measurement (UOM)*</label>
                                    <div className="Zirak-UOM-input-with-button">
                                        <input
                                            list="unit-suggestions"
                                            name="unitName"
                                            placeholder="Select or type UOM"
                                            value={formData.unitName}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <datalist id="unit-suggestions">
                                            {formData.category && unitsByCategory[formData.category] && unitsByCategory[formData.category].map(unit => (
                                                <option key={unit} value={unit} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                {formData.uomType === 'Compound' && (
                                    <>
                                        <div className="Zirak-UOM-form-group">
                                            <label>Base Unit* (Simple Unit to convert to)</label>
                                            <select
                                                name="baseUnitId"
                                                value={formData.baseUnitId}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">-- Select Base Unit --</option>
                                                {getUniqueCategories().map(cat => {
                                                    const unitsInCat = getAvailableBaseUnitsForCategory(cat);
                                                    if (unitsInCat.length === 0) return null;
                                                    return (
                                                        <optgroup key={cat} label={cat}>
                                                            {unitsInCat.map(u => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.unitName} {u.isStandard ? ' - Standard' : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className="Zirak-UOM-form-group">
                                            <label>Conversion Rate* (Multiplier)</label>
                                            <div className="UOM-compound-formula-preview">
                                                <span>1 {formData.unitName || 'Compound Unit'} = </span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="conversionRate"
                                                    placeholder="Multiplier e.g. 24"
                                                    value={formData.conversionRate}
                                                    onChange={handleInputChange}
                                                    required
                                                    min="0.0001"
                                                    style={{ width: '100px', display: 'inline-block', margin: '0 8px', padding: '6px' }}
                                                />
                                                <span> {
                                                    isNaN(formData.baseUnitId) 
                                                        ? formData.baseUnitId 
                                                        : (uoms.find(u => u.id === parseInt(formData.baseUnitId))?.unitName || 'Base Unit')
                                                }</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                               
                            </div>
                            <div className="Zirak-UOM-modal-footer">
                                <button type="button" className="Zirak-UOM-footer-close-btn" onClick={closeModal}>Close</button>
                                <button type="submit" className="Zirak-UOM-save-btn">{editingUom ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Unique Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="UOM-unique-delete-overlay">
                    <div className="UOM-unique-delete-modal">
                        <div className="UOM-unique-delete-header">
                            <h2 className="UOM-unique-delete-title">Delete Unit?</h2>
                            <button className="UOM-unique-delete-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="UOM-unique-delete-body">
                            <p className="UOM-unique-delete-message">
                                Are you sure you want to delete this Unit of Measure? This action cannot be undone and will permanently remove this unit from your inventory records.
                            </p>
                        </div>
                        <div className="UOM-unique-delete-footer">
                            <button className="UOM-unique-delete-btn UOM-unique-delete-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="UOM-unique-delete-btn UOM-unique-delete-confirm" onClick={confirmDelete}>
                                <Trash2 size={18} /> Delete Unit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UOM;