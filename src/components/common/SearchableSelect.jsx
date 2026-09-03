import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Plus, Check } from 'lucide-react';
import './SearchableSelect.css';

const SearchableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = 'Search & select...',
    disabled = false,
    onAddNew = null,
    addNewLabel = '+ Add New',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Selected item label
    const selectedOption = options.find(o => String(o.value) === String(value));

    // Filter options
    const filteredOptions = options.filter(opt => {
        const text = `${opt.label || ''} ${opt.subLabel || ''} ${opt.email || ''} ${opt.phone || ''}`.toLowerCase();
        return text.includes(searchTerm.toLowerCase());
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option.value, option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => (prev + 1) % (filteredOptions.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions[highlightIndex]) {
                handleSelect(filteredOptions[highlightIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className={`searchable-select-wrapper ${className} ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
            <div 
                className={`searchable-select-trigger ${isOpen ? 'open' : ''}`} 
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }
                }}
            >
                <span className={`searchable-select-val ${!selectedOption ? 'placeholder' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`searchable-select-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="searchable-select-dropdown">
                    <div className="searchable-select-search-box">
                        <Search size={14} />
                        <input 
                            ref={inputRef}
                            type="text" 
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setHighlightIndex(0); }}
                            onKeyDown={handleKeyDown}
                        />
                        {searchTerm && (
                            <button type="button" className="searchable-select-clear" onClick={() => setSearchTerm('')}>
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div className="searchable-select-list">
                        {filteredOptions.length === 0 ? (
                            <div className="searchable-select-empty">No results matching "{searchTerm}"</div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = String(opt.value) === String(value);
                                const isHighlighted = idx === highlightIndex;
                                return (
                                    <div 
                                        key={opt.value}
                                        className={`searchable-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                        onClick={() => handleSelect(opt)}
                                        onMouseEnter={() => setHighlightIndex(idx)}
                                    >
                                        <div className="searchable-select-option-content">
                                            <div className="searchable-select-option-label">{opt.label}</div>
                                            {opt.subLabel && (
                                                <div className="searchable-select-option-sub">{opt.subLabel}</div>
                                            )}
                                        </div>
                                        {isSelected && <Check size={14} className="searchable-select-check" />}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {onAddNew && (
                        <div className="searchable-select-footer">
                            <button 
                                type="button" 
                                className="searchable-select-add-btn"
                                onClick={() => { setIsOpen(false); onAddNew(); }}
                            >
                                <Plus size={14} /> {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
