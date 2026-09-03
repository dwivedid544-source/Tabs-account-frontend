import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Trash2, Pencil } from 'lucide-react';
import './SearchableSelect.css';

const SearchableSelect = ({
    options = [],
    value = '',
    onChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    labelKey = 'name',
    valueKey = 'id',
    groupKey = 'type',
    disabled = false,
    clearable = true,
    className = '',
    onEditOption,
    onDeleteOption,
    onEnterPress
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const optionsListRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Reset search & highlighted index when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
        setHighlightedIndex(0);
    }, [isOpen, searchTerm]);

    // Auto-scroll highlighted option into view
    useEffect(() => {
        if (isOpen && optionsListRef.current) {
            const highlightedEl = optionsListRef.current.querySelector('.is-highlighted');
            if (highlightedEl) {
                highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const selectedOption = options.find(opt => String(opt[valueKey]) === String(value));

    // Filtered options based on search input
    const filteredOptions = options.filter(opt => {
        const query = searchTerm.toLowerCase();
        if (!query) return true;

        // 1. Standard search using labelKey & groupKey
        const label = String(opt[labelKey] || '').toLowerCase();
        const group = groupKey ? String(opt[groupKey] || '').toLowerCase() : '';
        if (label.includes(query) || group.includes(query)) return true;

        // 2. Extra search fields for products/items: HSN, Barcode, SKU, Category
        const extraFields = ['hsn', 'barcode', 'sku', 'skuCode'];
        for (const field of extraFields) {
            const val = opt[field];
            if (val && String(val).toLowerCase().includes(query)) {
                return true;
            }
        }

        // Check category (could be string, object, or nested)
        if (opt.category) {
            if (typeof opt.category === 'object' && opt.category.name) {
                if (String(opt.category.name).toLowerCase().includes(query)) return true;
            } else if (typeof opt.category === 'string') {
                if (opt.category.toLowerCase().includes(query)) return true;
            }
        }
        if (opt.itemCategory) {
            if (typeof opt.itemCategory === 'object' && opt.itemCategory.name) {
                if (String(opt.itemCategory.name).toLowerCase().includes(query)) return true;
            } else if (typeof opt.itemCategory === 'string') {
                if (opt.itemCategory.toLowerCase().includes(query)) return true;
            }
        }
        if (opt.categoryName && String(opt.categoryName).toLowerCase().includes(query)) {
            return true;
        }

        return false;
    });

    // Map options to index in filteredOptions for keyboard navigation
    const optionIndexMap = React.useMemo(() => {
        const map = new Map();
        filteredOptions.forEach((opt, idx) => {
            map.set(String(opt[valueKey]), idx);
        });
        return map;
    }, [filteredOptions, valueKey]);

    // Group options if groupKey is specified
    const groupedOptions = React.useMemo(() => {
        if (!groupKey) return { '': filteredOptions };

        const groups = {};
        filteredOptions.forEach(opt => {
            const groupName = opt[groupKey] || 'Other';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(opt);
        });
        return groups;
    }, [filteredOptions, groupKey]);

    const handleToggle = (e) => {
        e.preventDefault();
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            if (filteredOptions.length > 0) {
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (filteredOptions.length > 0) {
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (filteredOptions.length > 0) {
                const targetOpt = (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length)
                    ? filteredOptions[highlightedIndex]
                    : filteredOptions[0];
                if (targetOpt) {
                    const optVal = targetOpt[valueKey];
                    handleSelect(optVal);
                    if (onEnterPress) {
                        onEnterPress(optVal);
                    }
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (disabled) return;
        onChange('');
        setIsOpen(false);
    };

    return (
        <div
            className={`searchable-select-container ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
            ref={containerRef}
        >
            <button
                type="button"
                className="searchable-select-trigger"
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
                        e.preventDefault();
                        if (!isOpen && !disabled) {
                            setIsOpen(true);
                        }
                    }
                }}
                disabled={disabled}
            >
                <span className={`searchable-select-value ${!selectedOption ? 'is-placeholder' : ''}`}>
                    {selectedOption ? selectedOption[labelKey] : placeholder}
                </span>
                <span className="searchable-select-actions">
                    {clearable && selectedOption && !disabled && (
                        <span className="searchable-select-clear" onClick={handleClear}>
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={16} className="searchable-select-chevron" />
                </span>
            </button>

            {isOpen && (
                <div className="searchable-select-dropdown">
                    <div className="searchable-select-search-wrapper">
                        <Search size={14} className="searchable-select-search-icon" />
                        <input
                            type="text"
                            className="searchable-select-search-input"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="searchable-select-options-list" ref={optionsListRef}>
                        {filteredOptions.length === 0 ? (
                            <div className="searchable-select-no-results">No options found</div>
                        ) : (
                            Object.entries(groupedOptions).map(([groupName, items]) => (
                                <div key={groupName} className="searchable-select-group">
                                    {groupName && (
                                        <div className="searchable-select-group-header">
                                            {groupName.toUpperCase()}
                                        </div>
                                    )}
                                    {items.map(opt => {
                                        const optVal = opt[valueKey];
                                        const optIndex = optionIndexMap.get(String(optVal));
                                        const isHighlighted = optIndex === highlightedIndex;
                                        const isSelected = String(optVal) === String(value);
                                        return (
                                            <div
                                                key={optVal}
                                                className={`searchable-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                                                onClick={() => handleSelect(optVal)}
                                                onMouseEnter={() => typeof optIndex === 'number' && setHighlightedIndex(optIndex)}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span className="option-label">{opt[labelKey]}</span>
                                                    {opt.groupName && opt.groupName !== groupName && (
                                                        <span className="option-subtext">({opt.groupName})</span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                                    {onEditOption && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEditOption(opt);
                                                            }}
                                                            className="searchable-select-option-edit"
                                                            title="Edit option"
                                                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    )}
                                                    {onDeleteOption && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteOption(optVal);
                                                            }}
                                                            className="searchable-select-option-delete"
                                                            title="Delete option"
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
