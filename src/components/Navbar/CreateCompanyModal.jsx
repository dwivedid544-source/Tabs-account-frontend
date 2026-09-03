import React, { useState, useContext } from 'react';
import { Building2, X, Upload, Loader2, DollarSign, Phone, MapPin, Globe, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import companyService from '../../api/companyService';
import { AuthContext } from '../../context/AuthContext';
import { ALLOWED_CURRENCIES } from '../../context/CompanyContext';

const CreateCompanyModal = ({ isOpen, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const { switchCompany, refreshCompanies } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        name: '',
        currency: 'EUR',
        phone: '',
        website: '',
        address: '',
        defaultVatRate: '23'
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Company name is required');
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('name', formData.name.trim());
            data.append('currency', formData.currency);
            data.append('defaultVatRate', formData.defaultVatRate);
            if (formData.phone) data.append('phone', formData.phone.trim());
            if (formData.website) data.append('website', formData.website.trim());
            if (formData.address) data.append('address', formData.address.trim());
            if (logoFile) data.append('logo', logoFile);

            const res = await companyService.createUserCompany(data);
            toast.success(`Company "${formData.name.trim()}" created successfully!`);

            if (res.data?.company?.id) {
                // Switch immediately to the new company
                await switchCompany(res.data.company.id);
            } else {
                await refreshCompanies();
            }

            if (onSuccess) onSuccess(res.data?.company);
            onClose();
            window.location.href = '/company/dashboard';
        } catch (error) {
            console.error('Create company error:', error);
            const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to create company';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                maxWidth: '560px',
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: '#0ea5e9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                        }}>
                            <Building2 size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>
                                Add New Company
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                Set up an additional company linked to your account
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Company Name */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Company Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Acme Trading Ltd"
                            required
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                color: '#1e293b',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Currency & VAT Rate Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Base Currency
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#1e293b',
                                    backgroundColor: '#ffffff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {ALLOWED_CURRENCIES.map(curr => (
                                    <option key={curr.code} value={curr.code}>
                                        {curr.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Default VAT Rate
                            </label>
                            <select
                                name="defaultVatRate"
                                value={formData.defaultVatRate}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#1e293b',
                                    backgroundColor: '#ffffff',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="23">Standard (23%)</option>
                                <option value="13.5">Reduced (13.5%)</option>
                                <option value="9">Second Reduced (9%)</option>
                                <option value="0">Zero Rated (0%)</option>
                            </select>
                        </div>
                    </div>

                    {/* Phone & Website Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Phone Number
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+1 234 567 890"
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Website
                            </label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://example.com"
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#1e293b',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Business Address
                        </label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Street, City, State, ZIP..."
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                color: '#1e293b',
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Company Logo (Optional)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {logoPreview && (
                                <img
                                    src={logoPreview}
                                    alt="Preview"
                                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{
                                    fontSize: '0.85rem',
                                    color: '#64748b'
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div style={{
                        marginTop: '12px',
                        paddingTop: '16px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            style={{
                                padding: '9px 18px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontSize: '0.88rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '9px 22px',
                                borderRadius: '8px',
                                border: 'none',
                                background: submitting ? '#94a3b8' : '#0284c7',
                                color: '#ffffff',
                                fontSize: '0.88rem',
                                fontWeight: '600',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Creating...
                                </>
                            ) : (
                                'Create & Switch Company'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCompanyModal;
