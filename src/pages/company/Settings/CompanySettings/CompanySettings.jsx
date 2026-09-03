import React, { useState, useRef, useEffect } from 'react';
import {
    Building2, Mail, Phone, MapPin, Globe,
    Save, Upload, Image as ImageIcon,
    Landmark, FileText, StickyNote, Check, Lock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './CompanySettings.css';
import axiosInstance from '../../../../api/axiosInstance';
import companyService from '../../../../api/companyService';
import passwordRequestService from '../../../../api/passwordRequestService';
import GetCompanyId from '../../../../api/GetCompanyId';
import warehouseService from '../../../../api/warehouseService';
import { AuthContext } from '../../../../context/AuthContext';
import { CompanyContext } from '../../../../context/CompanyContext';
import { useTranslation } from '../../../../context/LanguageContext';
const salesTypes = ['invoice', 'salesquotation', 'salesorder', 'deliverychallan', 'salesreturn', 'posinvoice', 'receipt'];
const purchaseTypes = ['purchasequotation', 'purchaseorder', 'purchasebill', 'purchasereturn', 'payment'];
const otherTypes = ['goodsreceiptnote', 'voucher', 'stocktransfer', 'adjustment'];

const salesTitlesList = [
    { key: 'invoice', label: 'Sales Invoice', placeholder: 'INVOICE' },
    { key: 'posinvoice', label: 'POS Invoice', placeholder: 'INVOICE' },
    { key: 'receipt', label: 'Customer Receipt', placeholder: 'RECEIPT' },
    { key: 'salesreturn', label: 'Credit Note (Sales Return)', placeholder: 'SALES RETURN' },
    { key: 'salesorder', label: 'Sales Order', placeholder: 'SALES ORDER' },
    { key: 'quotation', label: 'Quotation', placeholder: 'QUOTATION' },
    { key: 'deliverychallan', label: 'Delivery Challan', placeholder: 'DELIVERY CHALLAN' },
];

const purchaseTitlesList = [
    { key: 'purchasequotation', label: 'Purchase Quotation', placeholder: 'PURCHASE QUOTATION' },
    { key: 'purchaseorder', label: 'Purchase Order', placeholder: 'PURCHASE ORDER' },
    { key: 'purchasebill', label: 'Purchase Bill', placeholder: 'PURCHASE BILL' },
    { key: 'purchasereturn', label: 'Debit Note (Purchase Return)', placeholder: 'PURCHASE RETURN' },
    { key: 'payment', label: 'Purchase Payment', placeholder: 'PAYMENT VOUCHER' },
    { key: 'purchasepayment', label: 'Purchase Payment Receipt', placeholder: 'PAYMENT' },
];

const otherTitlesList = [
    { key: 'goodsreceipt', label: 'Goods Receipt Note', placeholder: 'GOODS RECEIPT NOTE' },
    { key: 'journalvoucher', label: 'Journal Voucher', placeholder: 'JOURNAL VOUCHER' },
    { key: 'expense', label: 'Expense Voucher', placeholder: 'EXPENSE VOUCHER' },
    { key: 'income', label: 'Income Voucher', placeholder: 'INCOME VOUCHER' },
    { key: 'contravoucher', label: 'Contra Voucher', placeholder: 'CONTRA VOUCHER' },
    { key: 'addcapital', label: 'Add Capital Voucher', placeholder: 'ADD CAPITAL' },
    { key: 'drawingcapital', label: 'Drawing Capital Voucher', placeholder: 'DRAWING CAPITAL' }
];

const WORLD_COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

const CountrySelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCountries = WORLD_COUNTRIES.filter(c =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="custom-country-select-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div
                className="custom-country-select-header"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    minHeight: '38px',
                    userSelect: 'none'
                }}
            >
                <span style={{ color: value ? '#1f2937' : '#9ca3af', fontWeight: value ? '500' : '400' }}>
                    {value || 'Select Country...'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </div>

            {isOpen && (
                <div
                    className="custom-country-select-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 9999,
                        maxHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search country..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '7px 10px',
                                fontSize: '0.85rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map(country => {
                                const isSelected = value === country;
                                return (
                                    <div
                                        key={country}
                                        onClick={() => {
                                            onChange(country);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'rgba(30, 41, 59, 0.2)' : 'transparent',
                                            color: isSelected ? '#1f2937' : '#374151',
                                            fontWeight: isSelected ? '600' : '400',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f3f4f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {country}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                                No country found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CompanySettings = () => {
    const { fetchCompanySettings } = React.useContext(CompanyContext);
    const { hasPermission } = React.useContext(AuthContext);
    const { changeLanguageByCountry } = useTranslation();
    const [activeTab, setActiveTab] = useState('general');
    const [logoPreview, setLogoPreview] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [customFieldsConfig, setCustomFieldsConfig] = useState([]);
    const [numberingSettings, setNumberingSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [paymentPreviewType, setPaymentPreviewType] = useState('receipt');

    // Invoice Settings State
    const [invoiceSettings, setInvoiceSettings] = useState({
        template: 'New York',
        color: '#004aad',
        showQr: true,
        logo: null,
        logoPreview: null
    });

    // Custom Table Headers State
    const [tableHeaders, setTableHeaders] = useState({
        item: 'Item',
        quantity: 'Quantity',
        rate: 'Rate',
        discount: 'Discount',
        tax: 'Tax (%)',
        price: 'Price',
        warehouse: 'Warehouse',
        uom: 'UOM'
    });

    // Custom Document Labels State
    const [invoiceLabels, setInvoiceLabels] = useState({
        billTo: 'Bill To:',
        shipTo: 'Ship To:',
        subTotal: 'Sub Total',
        tax: 'Tax',
        total: 'Total',
        number: 'Number:',
        issue: 'Issue:',
        dueDate: 'Due Date:',
        showHeader: true,
        showFooter: true,
        showWarehouse: true,
        showQty: true,
        showUom: true,
        showRate: true,
        showTax: true,
        showDiscount: true
    });

    // Receipt Settings State
    const [receiptSettings, setReceiptSettings] = useState({
        template: 'New York',
        color: '#004aad',
        showQr: true,
        logo: null,
        logoPreview: null
    });

    // Receipt Table Headers State
    const [receiptTableHeaders, setReceiptTableHeaders] = useState({
        invoiceNumber: 'Invoice Number',
        invoiceDate: 'Invoice Date',
        invoiceAmount: 'Invoice Amount',
        allocatedAmount: 'Allocated Amount',
        balanceDue: 'Balance Due'
    });

    // Receipt Custom Labels State
    const [receiptLabels, setReceiptLabels] = useState({
        number: 'Receipt No:',
        date: 'Payment Date:',
        invoiceRef: 'Invoice Ref:',
        receivedFrom: 'Received From:',
        receivedInto: 'Received Into:',
        mode: 'Payment Mode:',
        refNo: 'Ref No:',
        discount: 'Discount Allowed:',
        discountAccount: 'Discount Account:',
        notes: 'Remarks / Notes:',
        signature: 'Authorized Signature',
        satisfaction: 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.'
    });

    // Payment Settings State
    const [paymentSettings, setPaymentSettings] = useState({
        template: 'New York',
        color: '#004aad',
        showQr: true,
        logo: null,
        logoPreview: null
    });

    // Payment Table Headers State
    const [paymentTableHeaders, setPaymentTableHeaders] = useState({
        billNumber: 'Bill Number',
        billDate: 'Bill Date',
        billAmount: 'Bill Amount',
        allocatedAmount: 'Allocated Amount',
        balanceDue: 'Balance Due'
    });

    // Payment Custom Labels State
    const [paymentLabels, setPaymentLabels] = useState({
        number: 'Receipt No:',
        date: 'Payment Date:',
        invoiceRef: 'Invoice Ref:',
        receivedFrom: 'RECEIVED FROM:',
        paidFrom: 'Paid From:',
        mode: 'Payment Mode:',
        refNo: 'Ref No:',
        discount: 'Discount Received:',
        discountAccount: 'Discount Account:',
        notes: 'Remarks / Notes:',
        signature: 'AUTHORIZED SIGNATURE',
        satisfaction: 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.'
    });

    // Inventory Settings State
    const [inventorySettings, setInventorySettings] = useState({
        reserveOnQuotation: false,
        reserveOnSO: false,
        challanAction: 'ISSUE',
        valuationMethod: 'WAC',
        negativeStockAllow: true,
        batchTracking: false,
        expiryTracking: false,
        autoCogsEntry: true,
        multiWarehouse: false,
        defaultSalesWarehouseId: '',
        defaultPurchaseWarehouseId: ''
    });

    // Document Titles Custom Settings State
    const [documentTitles, setDocumentTitles] = useState({
        invoice: '',
        receipt: '',
        payment: '',
        salesreturn: '',
        purchasebill: '',
        purchasepayment: '',
        purchasereturn: '',
        salesorder: '',
        quotation: '',
        purchasequotation: '',
        purchaseorder: '',
        deliverychallan: '',
        goodsreceipt: '',
        posinvoice: '',
        journalvoucher: '',
        expense: '',
        income: '',
        contravoucher: '',
        addcapital: '',
        drawingcapital: ''
    });

    const fileInputRef = useRef(null);
    const invoiceLogoInputRef = useRef(null);
    const receiptLogoInputRef = useRef(null);
    const paymentLogoInputRef = useRef(null);

    // Form data state
    const [formData, setFormData] = useState({
        name: 'Kiaan Solutions',
        email: 'info@kiaan.com',
        phone: '+1 234 567 890',
        website: '',
        address: '',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'United States',
        currency: 'USD',
        bankName: '',
        accountHolder: '',
        accountName: '',
        accountNumber: '',
        iban: '',
        bic: '',
        sortCode: '',
        ifsc: '',
        vatNumber: '',
        defaultVatRateId: '',
        isVatRegistered: true,
        terms: '',
        termsInvoice: '',
        termsReceipt: '',
        termsPurchase: '',
        termsSalesOrder: '',
        termsQuotation: '',
        termsCreditNote: '',
        notes: ''
    });

    const colors = [
        '#004aad', '#4b5563', '#6366f1', '#ef4444', '#f59e0b', '#eab308', '#475569',
        '#06b6d4', '#8b5cf6', '#1e293b', '#0f172a', '#3b82f6', '#10b981', '#f43f5e', '#000000'
    ];

    const currencies = [
        { code: 'USD', name: 'USD ($)' },
        { code: 'EUR', name: 'EUR (€)' },
        { code: 'INR', name: 'INR (₹)' },
        { code: 'GBP', name: 'GBP (£)' },
        { code: 'JPY', name: 'JPY (¥)' },
        { code: 'CAD', name: 'CAD ($)' },
        { code: 'AUD', name: 'AUD ($)' },
        { code: 'CHF', name: 'CHF (CHF)' },
        { code: 'CNY', name: 'CNY (¥)' },
        { code: 'NZD', name: 'NZD ($)' },
        { code: 'ZAR', name: 'ZAR (R)' },
        { code: 'AED', name: 'AED (د.إ)' },
        { code: 'SAR', name: 'SAR (ر.س)' },
        { code: 'QAR', name: 'QAR (ر.ق)' },
        { code: 'KWD', name: 'KWD (د.ك)' },
        { code: 'BHD', name: 'BHD (.د.ب)' },
        { code: 'OMR', name: 'OMR (ر.ع.)' },
        { code: 'SGD', name: 'SGD ($)' },
        { code: 'HKD', name: 'HKD ($)' },
        { code: 'MYR', name: 'MYR (RM)' },
        { code: 'THB', name: 'THB (฿)' },
        { code: 'IDR', name: 'IDR (Rp)' },
        { code: 'PHP', name: 'PHP (₱)' },
        { code: 'VND', name: 'VND (₫)' },
        { code: 'KRW', name: 'KRW (₩)' },
        { code: 'RUB', name: 'RUB (₽)' },
        { code: 'TRY', name: 'TRY (₺)' },
        { code: 'BRL', name: 'BRL (R$)' },
        { code: 'MXN', name: 'MXN ($)' },
        { code: 'AFN', name: 'AFN (؋)' },
        { code: 'ALL', name: 'ALL (L)' },
        { code: 'AMD', name: 'AMD (֏)' },
        { code: 'ANG', name: 'ANG (ƒ)' },
        { code: 'AOA', name: 'AOA (Kz)' },
        { code: 'ARS', name: 'ARS ($)' },
        { code: 'AWG', name: 'AWG (ƒ)' },
        { code: 'AZN', name: 'AZN (₼)' },
        { code: 'BAM', name: 'BAM (KM)' },
        { code: 'BBD', name: 'BBD ($)' },
        { code: 'BDT', name: 'BDT (৳)' },
        { code: 'BGN', name: 'BGN (лв)' },
        { code: 'BIF', name: 'BIF (FBu)' },
        { code: 'BMD', name: 'BMD ($)' },
        { code: 'BND', name: 'BND ($)' },
        { code: 'BOB', name: 'BOB ($b)' },
        { code: 'BSD', name: 'BSD ($)' },
        { code: 'BTN', name: 'BTN (Nu.)' },
        { code: 'BWP', name: 'BWP (P)' },
        { code: 'BYN', name: 'BYN (Br)' },
        { code: 'BZD', name: 'BZD (BZ$)' },
        { code: 'CDF', name: 'CDF (FC)' },
        { code: 'CLP', name: 'CLP ($)' },
        { code: 'COP', name: 'COP ($)' },
        { code: 'CRC', name: 'CRC (₡)' },
        { code: 'CUP', name: 'CUP (₱)' },
        { code: 'CVE', name: 'CVE ($)' },
        { code: 'CZK', name: 'CZK (Kč)' },
        { code: 'DJF', name: 'DJF (Fdj)' },
        { code: 'DKK', name: 'DKK (kr)' },
        { code: 'DOP', name: 'DOP (RD$)' },
        { code: 'DZD', name: 'DZD (دج)' },
        { code: 'EGP', name: 'EGP (£)' },
        { code: 'ERN', name: 'ERN (Nfk)' },
        { code: 'ETB', name: 'ETB (Br)' },
        { code: 'FJD', name: 'FJD ($)' },
        { code: 'FKP', name: 'FKP (£)' },
        { code: 'GEL', name: 'GEL (₾)' },
        { code: 'GGP', name: 'GGP (£)' },
        { code: 'GHS', name: 'GHS (¢)' },
        { code: 'GIP', name: 'GIP (£)' },
        { code: 'GMD', name: 'GMD (D)' },
        { code: 'GNF', name: 'GNF (FG)' },
        { code: 'GTQ', name: 'GTQ (Q)' },
        { code: 'GYD', name: 'GYD ($)' },
        { code: 'HNL', name: 'HNL (L)' },
        { code: 'HRK', name: 'HRK (kn)' },
        { code: 'HTG', name: 'HTG (G)' },
        { code: 'HUF', name: 'HUF (Ft)' },
        { code: 'ILS', name: 'ILS (₪)' },
        { code: 'IMP', name: 'IMP (£)' },
        { code: 'IQD', name: 'IQD (ع.د)' },
        { code: 'IRR', name: 'IRR (﷼)' },
        { code: 'ISK', name: 'ISK (kr)' },
        { code: 'JEP', name: 'JEP (£)' },
        { code: 'JMD', name: 'JMD (J$)' },
        { code: 'JOD', name: 'JOD (د.ا)' },
        { code: 'KES', name: 'KES (KSh)' },
        { code: 'KGS', name: 'KGS (лв)' },
        { code: 'KHR', name: 'KHR (៛)' },
        { code: 'KMF', name: 'KMF (CF)' },
        { code: 'KPW', name: 'KPW (₩)' },
        { code: 'KYD', name: 'KYD ($)' },
        { code: 'KZT', name: 'KZT (₸)' },
        { code: 'LAK', name: 'LAK (₭)' },
        { code: 'LBP', name: 'LBP (£)' },
        { code: 'LKR', name: 'LKR (₨)' },
        { code: 'LRD', name: 'LRD ($)' },
        { code: 'LSL', name: 'LSL (L)' },
        { code: 'LYD', name: 'LYD (ل.د)' },
        { code: 'MAD', name: 'MAD (د.م.)' },
        { code: 'MDL', name: 'MDL (L)' },
        { code: 'MGA', name: 'MGA (Ar)' },
        { code: 'MKD', name: 'MKD (ден)' },
        { code: 'MMK', name: 'MMK (K)' },
        { code: 'MNT', name: 'MNT (₮)' },
        { code: 'MOP', name: 'MOP (MOP$)' },
        { code: 'MRU', name: 'MRU (UM)' },
        { code: 'MUR', name: 'MUR (₨)' },
        { code: 'MVR', name: 'MVR (.ރ)' },
        { code: 'MWK', name: 'MWK (MK)' },
        { code: 'MZN', name: 'MZN (MT)' },
        { code: 'NAD', name: 'NAD ($)' },
        { code: 'NGN', name: 'NGN (₦)' },
        { code: 'NIO', name: 'NIO (C$)' },
        { code: 'NOK', name: 'NOK (kr)' },
        { code: 'NPR', name: 'NPR (₨)' },
        { code: 'PAB', name: 'PAB (B/.)' },
        { code: 'PEN', name: 'PEN (S/.)' },
        { code: 'PGK', name: 'PGK (K)' },
        { code: 'PKR', name: 'PKR (₨)' },
        { code: 'PLN', name: 'PLN (zł)' },
        { code: 'PYG', name: 'PYG (Gs)' },
        { code: 'RON', name: 'RON (lei)' },
        { code: 'RSD', name: 'RSD (Дин.)' },
        { code: 'RWF', name: 'RWF (Rf)' },
        { code: 'SBD', name: 'SBD ($)' },
        { code: 'SCR', name: 'SCR (₨)' },
        { code: 'SDG', name: 'SDG (ج.س.)' },
        { code: 'SEK', name: 'SEK (kr)' },
        { code: 'SHP', name: 'SHP (£)' },
        { code: 'SLL', name: 'SLL (Le)' },
        { code: 'SOS', name: 'SOS (S)' },
        { code: 'SRD', name: 'SRD ($)' },
        { code: 'SSP', name: 'SSP (£)' },
        { code: 'STN', name: 'STN (Db)' },
        { code: 'SYP', name: 'SYP (£)' },
        { code: 'SZL', name: 'SZL (L)' },
        { code: 'TJS', name: 'TJS (SM)' },
        { code: 'TMT', name: 'TMT (T)' },
        { code: 'TND', name: 'TND (د.ت)' },
        { code: 'TOP', name: 'TOP (T$)' },
        { code: 'TTD', name: 'TTD (TT$)' },
        { code: 'TWD', name: 'TWD (NT$)' },
        { code: 'TZS', name: 'TZS (TSh)' },
        { code: 'UAH', name: 'UAH (₴)' },
        { code: 'UGX', name: 'UGX (USh)' },
        { code: 'UYU', name: 'UYU ($U)' },
        { code: 'UZS', name: 'UZS (лв)' },
        { code: 'VES', name: 'VES (Bs.S)' },
        { code: 'WST', name: 'WST (WS$)' },
        { code: 'XAF', name: 'XAF (FCFA)' },
        { code: 'XCD', name: 'XCD ($)' },
        { code: 'XOF', name: 'XOF (CFAF)' },
        { code: 'XPF', name: 'XPF (CFPF)' },
        { code: 'YER', name: 'YER (﷼)' },
        { code: 'ZMW', name: 'ZMW (ZK)' },
        { code: 'ZWL', name: 'ZWL ($)' }
    ];

    const templates = ['New York', 'Toronto', 'Rio', 'London', 'Istanbul', 'Mumbai', 'Hong Kong', 'Tokyo', 'Sydney', 'Paris', 'Dubai', 'Berlin'];

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const companyIdFromStorage = GetCompanyId();
                if (!companyIdFromStorage) {
                    toast.error('Company ID not found. Please login again.');
                    return;
                }
                setCompanyId(companyIdFromStorage);

                // Fetch warehouses
                try {
                    const whRes = await warehouseService.getWarehouses(companyIdFromStorage);
                    if (whRes && whRes.success) {
                        setWarehouses(whRes.data);
                    } else if (Array.isArray(whRes)) {
                        setWarehouses(whRes);
                    }
                } catch (err) {
                    console.error('Error fetching warehouses in CompanySettings:', err);
                }

                const res = await companyService.getById(companyIdFromStorage);
                const data = res.data;

                setFormData({
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    website: data.website || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    zip: data.zip || '',
                    country: data.country || 'United States',
                    currency: data.currency || 'USD',
                    bankName: data.bankName || '',
                    accountHolder: data.accountHolder || data.accountName || '',
                    accountName: data.accountName || data.accountHolder || '',
                    accountNumber: data.accountNumber || '',
                    iban: data.iban || '',
                    bic: data.bic || '',
                    sortCode: data.sortCode || '',
                    ifsc: data.ifsc || '',
                    vatNumber: data.vatNumber || data.gstNumber || '',
                    defaultVatRateId: data.defaultVatRateId || '',
                    isVatRegistered: data.isVatRegistered !== undefined ? data.isVatRegistered : true,
                    terms: data.terms || '',
                    termsInvoice: data.termsInvoice || '',
                    termsReceipt: data.termsReceipt || '',
                    termsPurchase: data.termsPurchase || '',
                    termsSalesOrder: data.termsSalesOrder || '',
                    termsQuotation: data.termsQuotation || '',
                    termsCreditNote: data.termsCreditNote || '',
                    notes: data.notes || ''
                });

                setInvoiceSettings({
                    template: data.invoiceTemplate || 'New York',
                    color: data.invoiceColor || '#004aad',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true,
                    logo: null,
                    logoPreview: data.invoiceLogo || null
                });

                if (data.invoiceTableHeaders) {
                    try {
                        const headers = typeof data.invoiceTableHeaders === 'string'
                            ? JSON.parse(data.invoiceTableHeaders)
                            : data.invoiceTableHeaders;
                        setTableHeaders({
                            item: headers.item || 'Item',
                            quantity: headers.quantity || 'Quantity',
                            rate: headers.rate || 'Rate',
                            discount: headers.discount || 'Discount',
                            tax: headers.tax || 'Tax (%)',
                            price: headers.price || 'Price',
                            warehouse: headers.warehouse || 'Warehouse',
                            uom: headers.uom || 'UOM'
                        });
                    } catch (e) {
                        console.error('Error parsing table headers:', e);
                    }
                }

                if (data.invoiceLabels) {
                    try {
                        const labels = typeof data.invoiceLabels === 'string'
                            ? JSON.parse(data.invoiceLabels)
                            : data.invoiceLabels;
                        setInvoiceLabels({
                            billTo: labels.billTo || 'Bill To:',
                            shipTo: labels.shipTo || 'Ship To:',
                            subTotal: labels.subTotal || 'Sub Total',
                            tax: labels.tax || 'Tax',
                            total: labels.total || 'Total',
                            number: labels.number || 'Number:',
                            issue: labels.issue || 'Issue:',
                            dueDate: labels.dueDate || 'Due Date:',
                            showHeader: labels.showHeader !== undefined ? labels.showHeader : true,
                            showFooter: labels.showFooter !== undefined ? labels.showFooter : true,
                            showWarehouse: labels.showWarehouse !== undefined ? labels.showWarehouse : true,
                            showQty: labels.showQty !== undefined ? labels.showQty : true,
                            showUom: labels.showUom !== undefined ? labels.showUom : true,
                            showRate: labels.showRate !== undefined ? labels.showRate : true,
                            showTax: labels.showTax !== undefined ? labels.showTax : true,
                            showDiscount: labels.showDiscount !== undefined ? labels.showDiscount : true
                        });
                    } catch (e) {
                        console.error('Error parsing invoice labels:', e);
                    }
                }

                // Receipt Settings
                setReceiptSettings({
                    template: data.receiptTemplate || 'New York',
                    color: data.receiptColor || '#004aad',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true,
                    logo: null,
                    logoPreview: data.receiptLogo || null
                });

                if (data.receiptTableHeaders) {
                    try {
                        const headers = typeof data.receiptTableHeaders === 'string'
                            ? JSON.parse(data.receiptTableHeaders)
                            : data.receiptTableHeaders;
                        setReceiptTableHeaders({
                            invoiceNumber: headers.invoiceNumber || 'Invoice Number',
                            invoiceDate: headers.invoiceDate || 'Invoice Date',
                            invoiceAmount: headers.invoiceAmount || 'Invoice Amount',
                            allocatedAmount: headers.allocatedAmount || 'Allocated Amount',
                            balanceDue: headers.balanceDue || 'Balance Due'
                        });
                    } catch (e) {
                        console.error('Error parsing receipt table headers:', e);
                    }
                }

                if (data.receiptLabels) {
                    try {
                        const labels = typeof data.receiptLabels === 'string'
                            ? JSON.parse(data.receiptLabels)
                            : data.receiptLabels;
                        setReceiptLabels({
                            number: labels.number || 'Receipt No:',
                            date: labels.date || 'Payment Date:',
                            invoiceRef: labels.invoiceRef || 'Invoice Ref:',
                            receivedFrom: labels.receivedFrom || 'Received From:',
                            receivedInto: labels.receivedInto || 'Received Into:',
                            mode: labels.mode || 'Payment Mode:',
                            refNo: labels.refNo || 'Ref No:',
                            discount: labels.discount || 'Discount Allowed:',
                            discountAccount: labels.discountAccount || 'Discount Account:',
                            notes: labels.notes || 'Remarks / Notes:',
                            signature: labels.signature || 'Authorized Signature',
                            satisfaction: labels.satisfaction || 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.'
                        });
                    } catch (e) {
                        console.error('Error parsing receipt labels:', e);
                    }
                }

                // Payment Settings
                setPaymentSettings({
                    template: data.paymentTemplate || 'New York',
                    color: data.paymentColor || '#004aad',
                    showQr: data.showQrCode !== undefined ? data.showQrCode : true,
                    logo: null,
                    logoPreview: data.paymentLogo || null
                });

                if (data.paymentTableHeaders) {
                    try {
                        const headers = typeof data.paymentTableHeaders === 'string'
                            ? JSON.parse(data.paymentTableHeaders)
                            : data.paymentTableHeaders;
                        setPaymentTableHeaders({
                            billNumber: headers.billNumber || 'Bill Number',
                            billDate: headers.billDate || 'Bill Date',
                            billAmount: headers.billAmount || 'Bill Amount',
                            allocatedAmount: headers.allocatedAmount || 'Allocated Amount',
                            balanceDue: headers.balanceDue || 'Balance Due'
                        });
                    } catch (e) {
                        console.error('Error parsing payment table headers:', e);
                    }
                }

                if (data.paymentLabels) {
                    try {
                        const labels = typeof data.paymentLabels === 'string'
                            ? JSON.parse(data.paymentLabels)
                            : data.paymentLabels;
                        setPaymentLabels({
                            number: labels.number || 'Receipt No:',
                            date: labels.date || 'Payment Date:',
                            invoiceRef: labels.invoiceRef || 'Invoice Ref:',
                            receivedFrom: labels.receivedFrom || 'RECEIVED FROM:',
                            paidFrom: labels.paidFrom || 'Paid From:',
                            mode: labels.mode || 'Payment Mode:',
                            refNo: labels.refNo || 'Ref No:',
                            discount: labels.discount || 'Discount Received:',
                            discountAccount: labels.discountAccount || 'Discount Account:',
                            notes: labels.notes || 'Remarks / Notes:',
                            signature: labels.signature || 'AUTHORIZED SIGNATURE',
                            satisfaction: labels.satisfaction || 'The sum of {amount} {discountText} was received in full satisfaction of the mentioned account.'
                        });
                    } catch (e) {
                        console.error('Error parsing payment labels:', e);
                    }
                }

                if (data.inventoryConfig) {
                    const invCfg = typeof data.inventoryConfig === 'string'
                        ? JSON.parse(data.inventoryConfig)
                        : data.inventoryConfig;
                    setInventorySettings({
                        reserveOnQuotation: invCfg.reserveOnQuotation || false,
                        reserveOnSO: invCfg.reserveOnSO || false,
                        challanAction: invCfg.challanAction || 'ISSUE',
                        valuationMethod: invCfg.valuationMethod || 'WAC',
                        negativeStockAllow: invCfg.negativeStockAllow !== false,
                        batchTracking: invCfg.batchTracking || false,
                        expiryTracking: invCfg.expiryTracking || false,
                        autoCogsEntry: invCfg.autoCogsEntry !== false,
                        multiWarehouse: invCfg.multiWarehouse || false,
                        defaultSalesWarehouseId: invCfg.defaultSalesWarehouseId || '',
                        defaultPurchaseWarehouseId: invCfg.defaultPurchaseWarehouseId || ''
                    });
                }

                if (data.logo) {
                    setLogoPreview(data.logo);
                }
                if (data.customFieldsConfig) {
                    try {
                        const parsed = typeof data.customFieldsConfig === 'string'
                            ? JSON.parse(data.customFieldsConfig)
                            : data.customFieldsConfig;
                        setCustomFieldsConfig(Array.isArray(parsed) ? parsed : []);
                    } catch (e) {
                        console.error('Error parsing customFieldsConfig:', e);
                        setCustomFieldsConfig([]);
                    }
                } else {
                    setCustomFieldsConfig([]);
                }

                if (data.documentTitles) {
                    try {
                        const parsedTitles = typeof data.documentTitles === 'string'
                            ? JSON.parse(data.documentTitles)
                            : data.documentTitles;
                        setDocumentTitles(prev => ({
                            ...prev,
                            ...parsedTitles
                        }));
                    } catch (e) {
                        console.error('Error parsing documentTitles:', e);
                    }
                }

                // Fetch Serial Numbering Settings
                try {
                    const numberingRes = await axiosInstance.get(`/companies/${companyIdFromStorage}/numbering-settings`);
                    if (numberingRes.data && numberingRes.data.success) {
                        setNumberingSettings(numberingRes.data.data);
                    }
                } catch (e) {
                    console.error('Error fetching numbering settings:', e);
                }
            } catch (error) {
                console.error('Failed to fetch company data:', error);
                toast.error('Failed to load company data: ' + (error.response?.data?.message || error.message));
            }
        };
        fetchCompany();
    }, []);

    const handleLogoChange = (e, type = 'company') => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'company') {
                    setLogoPreview(reader.result);
                    setFormData(prev => ({ ...prev, logoFile: file }));
                } else if (type === 'invoice') {
                    setInvoiceSettings(prev => ({
                        ...prev,
                        logo: file,
                        logoPreview: reader.result
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = (ref) => {
        ref.current.click();
    };

    const handleSave = async () => {
        if (!companyId) {
            toast.error('Company ID not found. Please refresh the page.');
            return;
        }

        setLoading(true);
        try {
            const formDataToSend = new FormData();

            Object.keys(formData).forEach(key => {
                if (key !== 'logoFile' && formData[key] !== null && formData[key] !== undefined) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            if (formData.logoFile) {
                formDataToSend.append('logo', formData.logoFile);
            }
            if (invoiceSettings.logo) {
                formDataToSend.append('invoiceLogo', invoiceSettings.logo);
            }

            formDataToSend.append('invoiceTemplate', invoiceSettings.template);
            formDataToSend.append('invoiceColor', invoiceSettings.color);
            formDataToSend.append('showQrCode', invoiceSettings.showQr);
            formDataToSend.append('inventoryConfig', JSON.stringify(inventorySettings));
            formDataToSend.append('invoiceTableHeaders', JSON.stringify(tableHeaders));
            formDataToSend.append('invoiceLabels', JSON.stringify(invoiceLabels));

            // Save the synchronized receipt & payment settings to DB
            formDataToSend.append('receiptTemplate', receiptSettings.template);
            formDataToSend.append('receiptColor', receiptSettings.color);
            formDataToSend.append('receiptTableHeaders', JSON.stringify(receiptTableHeaders));
            formDataToSend.append('receiptLabels', JSON.stringify(receiptLabels));

            formDataToSend.append('paymentTemplate', paymentSettings.template);
            formDataToSend.append('paymentColor', paymentSettings.color);
            formDataToSend.append('paymentTableHeaders', JSON.stringify(paymentTableHeaders));
            formDataToSend.append('paymentLabels', JSON.stringify(paymentLabels));
            formDataToSend.append('customFieldsConfig', JSON.stringify(customFieldsConfig));
            formDataToSend.append('documentTitles', JSON.stringify(documentTitles));

            await companyService.update(companyId, formDataToSend);

            // Save serial numbering settings if loaded
            if (numberingSettings.length > 0) {
                await axiosInstance.put(`/companies/${companyId}/numbering-settings`, {
                    settings: numberingSettings
                });
            }

            await fetchCompanySettings();
            if (formData.country) {
                changeLanguageByCountry(formData.country);
            }
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Save Error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
            toast.error('Failed to save settings: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChangeRequest = async () => {
        try {
            const response = await passwordRequestService.create();
            toast.success(response.message || 'Password change request submitted successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit request: ' + (error.response?.data?.message || error.message));
        }
    };

    const getContrastColor = (hexcolor) => {
        if (!hexcolor || hexcolor === 'transparent') return '#ffffff';
        const hex = hexcolor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 150) ? '#1e293b' : '#ffffff';
    };

    const previewStyle = {
        '--header-bg': invoiceSettings.color,
        '--header-text': getContrastColor(invoiceSettings.color)
    };

    // Synchronization logic to update both customer receipt and vendor payment states simultaneously
    const handleLabelChange = (key, value) => {
        setReceiptLabels(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'receivedInto') next.paidFrom = value;
            if (key === 'receivedFrom') next.receivedFrom = value;
            return next;
        });
        setPaymentLabels(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'receivedInto') next.paidFrom = value;
            if (key === 'receivedFrom') next.receivedFrom = value;
            return next;
        });
    };

    const handleHeaderChange = (key, value) => {
        setReceiptTableHeaders(prev => {
            const next = { ...prev };
            if (key === 'number') next.invoiceNumber = value;
            if (key === 'date') next.invoiceDate = value;
            if (key === 'amount') next.invoiceAmount = value;
            if (key === 'allocatedAmount') next.allocatedAmount = value;
            if (key === 'balanceDue') next.balanceDue = value;
            return next;
        });
        setPaymentTableHeaders(prev => {
            const next = { ...prev };
            if (key === 'number') next.billNumber = value;
            if (key === 'date') next.billDate = value;
            if (key === 'amount') next.billAmount = value;
            if (key === 'allocatedAmount') next.allocatedAmount = value;
            if (key === 'balanceDue') next.balanceDue = value;
            return next;
        });
    };

    const getTransactionTypeDisplayName = (type) => {
        const names = {
            invoice: 'Invoice',
            receipt: 'Customer Receipt',
            payment: 'Vendor Payment',
            purchaseorder: 'Purchase Order',
            purchasebill: 'Purchase Bill',
            purchasequotation: 'Purchase Quotation',
            salesorder: 'Sales Order',
            salesquotation: 'Sales Quotation',
            salesreturn: 'Credit Note (Sales Return)',
            purchasereturn: 'Debit Note (Purchase Return)',
            deliverychallan: 'Delivery Challan',
            goodsreceiptnote: 'Goods Receipt Note',
            voucher: 'Voucher (Exp/Inc/Contra/Journal)',
            posinvoice: 'POS Invoice',
            stocktransfer: 'Stock Transfer',
            adjustment: 'Stock Adjustment'
        };
        return names[type] || type;
    };

    const handleNumberingFieldChange = (index, field, value) => {
        setNumberingSettings(prev => {
            const updated = [...prev];
            const targetSetting = { ...updated[index] };

            if (field === 'pattern') {
                if (value === 'custom') {
                    const currentPrefix = targetSetting.prefix || '';
                    if (!currentPrefix.includes('{YYYY}') && !currentPrefix.includes('{YY}') && !currentPrefix.includes('{MM}') && !currentPrefix.includes('{DD}')) {
                        let newPrefix = currentPrefix;
                        if (newPrefix.endsWith('-')) {
                            newPrefix = newPrefix.slice(0, -1);
                        }
                        targetSetting.prefix = `${newPrefix}-{YYYY}{MM}{DD}-`;
                    }
                } else {
                    const currentPrefix = targetSetting.prefix || '';
                    let newPrefix = currentPrefix
                        .replace(/{YYYY}/g, '')
                        .replace(/{YY}/g, '')
                        .replace(/{MM}/g, '')
                        .replace(/{DD}/g, '')
                        .replace(/--+/g, '-')
                        .replace(/^-|-$/g, '');

                    if (newPrefix && !newPrefix.endsWith('-')) {
                        newPrefix = `${newPrefix}-`;
                    }
                    targetSetting.prefix = newPrefix;
                }
            }

            targetSetting[field] = value;
            updated[index] = targetSetting;
            return updated;
        });
    };


    const previewNextNumber = (setting) => {
        const { prefix = '', currentNumber = 1, paddingLength = 4, pattern = 'numeric' } = setting;
        let finalPrefix = prefix || '';

        if (pattern === 'custom') {
            const date = new Date();
            const yyyy = date.getFullYear().toString();
            const yy = yyyy.slice(-2);
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            finalPrefix = finalPrefix
                .replace(/{YYYY}/g, yyyy)
                .replace(/{YY}/g, yy)
                .replace(/{MM}/g, mm)
                .replace(/{DD}/g, dd);
        }

        let sequenceStr = '';
        if (pattern === 'alphanumeric') {
            const b36 = currentNumber.toString(36).toUpperCase();
            sequenceStr = b36.padStart(paddingLength, '0');
        } else {
            sequenceStr = String(currentNumber).padStart(paddingLength, '0');
        }

        return `${finalPrefix}${sequenceStr}`;
    };

    return (
        <div className="companySetting-settings-page">
            <div className="companySetting-page-header">
                <div>
                    <h1 className="companySetting-page-title">Company Settings</h1>
                    <p className="companySetting-page-subtitle">Manage your company profile and preferences</p>
                </div>
                {hasPermission('edit settings') && (
                    <button className="companySetting-btn-primary" onClick={handleSave} disabled={loading}>
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="companySetting-settings-container">
                {/* Tabs */}
                <div className="companySetting-settings-tabs">
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General Info
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'salesSection' ? 'active' : ''}`}
                        onClick={() => setActiveTab('salesSection')}
                    >
                        Sale Section
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'purchaseSection' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchaseSection')}
                    >
                        Purches Section
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'otherSection' ? 'active' : ''}`}
                        onClick={() => setActiveTab('otherSection')}
                    >
                        Voucher Section
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'invoice' ? 'active' : ''}`}
                        onClick={() => setActiveTab('invoice')}
                    >
                        Invoice Setting
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payment')}
                    >
                        Receipt/Payment Labels
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        Inventory
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                    <button
                        className={`companySetting-tab-btn ${activeTab === 'customFields' ? 'active' : ''}`}
                        onClick={() => setActiveTab('customFields')}
                    >
                        Custom Fields
                    </button>
                </div>

                {/* Content */}
                <div className="companySetting-settings-content">
                    {activeTab === 'general' && (
                        <div className="companySetting-form-section companySetting-fade-in general-info-wrapper">
                            {/* Card 1: General Details & Logo */}
                            <div className="general-card">
                                <div className="general-card-header">
                                    <div className="general-card-icon-badge">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <h3 className="general-card-title">General Information</h3>
                                        <p className="general-card-subtitle">Manage company name, contact details, and branding logo</p>
                                    </div>
                                </div>
                                <div className="companySetting-form-grid">
                                    <div className="companySetting-form-group">
                                        <label>Company Name <span className="companySetting-required">*</span></label>
                                        <div className="companySetting-icon-wrapper">
                                            <Building2 size={18} className="companySetting-icon" />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Enter company name"
                                            />
                                        </div>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Company Email <span className="companySetting-required">*</span></label>
                                        <div className="companySetting-icon-wrapper">
                                            <Mail size={18} className="companySetting-icon" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="Enter company email"
                                            />
                                        </div>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Phone Number</label>
                                        <div className="companySetting-icon-wrapper">
                                            <Phone size={18} className="companySetting-icon" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="Enter phone number"
                                            />
                                        </div>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Website</label>
                                        <div className="companySetting-icon-wrapper">
                                            <Globe size={18} className="companySetting-icon" />
                                            <input
                                                type="url"
                                                value={formData.website}
                                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://www.example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="companySetting-logo-section">
                                    <label>Company Branding Logo</label>
                                    <div className="companySetting-logo-uploader">
                                        <div className="companySetting-preview-box">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Company Logo" className="companySetting-logo-preview-img" />
                                            ) : (
                                                <ImageIcon size={32} />
                                            )}
                                        </div>
                                        <div className="companySetting-upload-controls">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={(e) => handleLogoChange(e, 'company')}
                                                accept="image/jpeg, image/png, image/gif"
                                                style={{ display: 'none' }}
                                            />
                                            <button className="companySetting-btn-upload" onClick={() => handleUploadClick(fileInputRef)}>
                                                <Upload size={16} /> Upload New Logo
                                            </button>
                                            <p className="companySetting-upload-hint">Allowed JPG, GIF or PNG. Max size of 800KB</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Company Address */}
                            <div className="general-card">
                                <div className="general-card-header">
                                    <div className="general-card-icon-badge">
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <h3 className="general-card-title">Company Address</h3>
                                        <p className="general-card-subtitle">Official registered and billing location</p>
                                    </div>
                                </div>
                                <div className="companySetting-form-grid">
                                    <div className="companySetting-form-group full-width">
                                        <label>Street Address</label>
                                        <div className="companySetting-icon-wrapper">
                                            <MapPin size={18} className="companySetting-icon" />
                                            <textarea rows="2" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Business St, Tech Park"></textarea>
                                        </div>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>City</label>
                                        <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Enter city" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>State / Province</label>
                                        <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="Enter state" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Postal Code</label>
                                        <input type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} placeholder="Enter zip code" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Country</label>
                                        <CountrySelect
                                            value={formData.country}
                                            onChange={(selectedCountry) => {
                                                setFormData(prev => ({ ...prev, country: selectedCountry }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Business & Financial Settings */}
                            <div className="general-card">
                                <div className="general-card-header">
                                    <div className="general-card-icon-badge">
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <h3 className="general-card-title">Business &amp; Tax Settings</h3>
                                        <p className="general-card-subtitle">Set primary accounting currency and VAT tax registration details</p>
                                    </div>
                                </div>
                                <div className="companySetting-form-grid">
                                    <div className="companySetting-form-group">
                                        <label>Base Currency</label>
                                        <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                                            {currencies.map(curr => (
                                                <option key={curr.code} value={curr.code}>{curr.name} ({curr.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>VAT Registration Number</label>
                                        <input
                                            type="text"
                                            value={formData.vatNumber}
                                            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                                            placeholder="e.g. IE1234567T / GB123456789"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Bank Details */}
                            <div className="general-card">
                                <div className="general-card-header">
                                    <div className="general-card-icon-badge">
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <h3 className="general-card-title">Bank &amp; Settlement Details</h3>
                                        <p className="general-card-subtitle">Official bank account information displayed on customer invoices &amp; PDF templates</p>
                                    </div>
                                </div>
                                <div className="companySetting-form-grid">
                                    <div className="companySetting-form-group">
                                        <label>Bank Name</label>
                                        <div className="companySetting-icon-wrapper">
                                            <Landmark size={18} className="companySetting-icon" />
                                            <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="e.g. Allied Irish Banks / Barclays" />
                                        </div>
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Account Name / Holder</label>
                                        <input type="text" value={formData.accountHolder || formData.accountName} onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value, accountName: e.target.value })} placeholder="Enter account holder name" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Account Number</label>
                                        <input type="text" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} placeholder="e.g. 12345678" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>IBAN</label>
                                        <input type="text" value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} placeholder="e.g. IE29 AIBK 9311 5212 3456 78" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>BIC / SWIFT Code</label>
                                        <input type="text" value={formData.bic} onChange={(e) => setFormData({ ...formData, bic: e.target.value })} placeholder="e.g. AIBKIE2D" />
                                    </div>
                                    <div className="companySetting-form-group">
                                        <label>Sort Code / IFSC</label>
                                        <input type="text" value={formData.sortCode || formData.ifsc} onChange={(e) => setFormData({ ...formData, sortCode: e.target.value, ifsc: e.target.value })} placeholder="e.g. 93-11-52" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'invoice' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <div className="invoice-settings-layout">
                                {/* Left Controls */}
                                <div className="invoice-controls">
                                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Invoice Print Settings</h3>

                                    <div className="companySetting-form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Invoice Template</label>
                                        <select
                                            value={invoiceSettings.template}
                                            onChange={(e) => setInvoiceSettings({ ...invoiceSettings, template: e.target.value })}
                                            style={{ padding: '0.8rem', borderColor: '#1e293b' }}
                                        >
                                            {templates.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    <div className="companySetting-form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>QR Display?</label>
                                        <label className="switch-label">
                                            <input
                                                type="checkbox"
                                                className="switch-input"
                                                checked={invoiceSettings.showQr}
                                                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showQr: e.target.checked })}
                                            />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>

                                    <div className="companySetting-form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Color Input</label>
                                        <div className="color-swatches">
                                            {colors.map(c => (
                                                <div
                                                    key={c}
                                                    className={`color-swatch ${invoiceSettings.color === c ? 'active' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setInvoiceSettings({ ...invoiceSettings, color: c })}
                                                >
                                                    {invoiceSettings.color === c && <Check size={14} className="color-swatch-check" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0 }}>
                                        <label>Invoice Logo</label>
                                        <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>Overhead content if different from company logo</p>

                                        <input
                                            type="file"
                                            ref={invoiceLogoInputRef}
                                            onChange={(e) => handleLogoChange(e, 'invoice')}
                                            accept="image/jpeg, image/png"
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            className="companySetting-btn-upload"
                                            style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', width: '100%', justifyContent: 'center' }}
                                            onClick={() => handleUploadClick(invoiceLogoInputRef)}
                                        >
                                            <Upload size={16} /> Choose file here
                                        </button>
                                    </div>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0, marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem' }}>Document Terms &amp; Labels</h4>
                                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>Customize text labels that appear on invoices &amp; bills.</p>
                                        <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            {[
                                                { key: 'billTo', label: 'Bill To Label' },
                                                { key: 'shipTo', label: 'Ship To Label' },
                                                { key: 'subTotal', label: 'Sub Total Label' },
                                                { key: 'tax', label: 'Tax Label' },
                                                { key: 'total', label: 'Total Label' },
                                                { key: 'number', label: 'Number Label' },
                                                { key: 'issue', label: 'Issue Date Label' },
                                                { key: 'dueDate', label: 'Due Date Label' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#475569' }}>{label}</label>
                                                    <input
                                                        type="text"
                                                        value={invoiceLabels[key]}
                                                        onChange={(e) => setInvoiceLabels({ ...invoiceLabels, [key]: e.target.value })}
                                                        style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0, marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem' }}>Invoice Table Headers</h4>
                                        <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Item Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.item}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, item: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Quantity Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.quantity}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, quantity: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Rate Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.rate}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, rate: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Discount Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.discount}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, discount: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Tax Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.tax}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, tax: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Price Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.price}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, price: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Warehouse Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.warehouse || ''}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, warehouse: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                            <div className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>UOM Col</label>
                                                <input
                                                    type="text"
                                                    value={tableHeaders.uom || ''}
                                                    onChange={(e) => setTableHeaders({ ...tableHeaders, uom: e.target.value })}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0, marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem' }}>Show / Hide Sections &amp; Fields</h4>
                                        <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            {[
                                                { key: 'showHeader', label: 'Show Company Header' },
                                                { key: 'showFooter', label: 'Show Notes/Terms Footer' },
                                                { key: 'showWarehouse', label: 'Show Warehouse Col' },
                                                { key: 'showQty', label: 'Show Quantity Col' },
                                                { key: 'showUom', label: 'Show UOM Col' },
                                                { key: 'showRate', label: 'Show Rate Col' },
                                                { key: 'showTax', label: 'Show Tax Col' },
                                                { key: 'showDiscount', label: 'Show Discount Col' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="companySetting-form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>{label}</label>
                                                    <label className="switch-label" style={{ margin: 0 }}>
                                                        <input
                                                            type="checkbox"
                                                            className="switch-input"
                                                            checked={invoiceLabels[key] !== false}
                                                            onChange={(e) => setInvoiceLabels({ ...invoiceLabels, [key]: e.target.checked })}
                                                        />
                                                        <div className="switch-toggle" />
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {hasPermission('edit settings') && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <button
                                                className="companySetting-btn-primary"
                                                onClick={handleSave}
                                                style={{ backgroundColor: '#1e293b', width: '100%', justifyContent: 'center' }}
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Preview */}
                                <div
                                    className={`invoice-preview-container template-${invoiceSettings.template.toLowerCase().replace(' ', '')}`}
                                    style={previewStyle}
                                >
                                    {invoiceLabels.showHeader !== false && (
                                        <div className="invoice-header-wrapper">
                                            <div className="invoice-preview-header">
                                                <div className="invoice-header-left">
                                                    {invoiceSettings.logoPreview || logoPreview ? (
                                                        <img src={invoiceSettings.logoPreview || logoPreview} alt="Logo" className="invoice-logo-large" />
                                                    ) : (
                                                        <h2 style={{ color: invoiceSettings.color, margin: 0 }}>ACCOUNTGO</h2>
                                                    )}

                                                    <div className="invoice-company-details">
                                                        <strong>{formData.name}</strong><br />
                                                        {formData.email}<br />
                                                        {formData.phone}<br />
                                                        {formData.address}, {formData.city}<br />
                                                        {formData.country} - {formData.zip}<br />
                                                    </div>
                                                </div>
                                                <div className="invoice-header-right">
                                                    <div className="invoice-title-large">{documentTitles.invoice || 'INVOICE'}</div>
                                                    <div className="invoice-meta-info">
                                                        <div className="invoice-meta-row">
                                                            <span className="invoice-label">{invoiceLabels.number}</span> #INVO00001
                                                        </div>
                                                        <div className="invoice-meta-row">
                                                            <span className="invoice-label">{invoiceLabels.issue}</span> Jan 17, 2026
                                                        </div>
                                                        <div className="invoice-meta-row">
                                                            <span className="invoice-label">{invoiceLabels.dueDate}</span> Jan 17, 2026
                                                        </div>
                                                    </div>
                                                    {invoiceSettings.showQr && (
                                                        <div className="invoice-qr-box">
                                                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=InvoiceDemo" alt="QR" className="invoice-qr-code" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="invoice-addresses">
                                        <div className="invoice-bill-to">
                                            <div className="invoice-section-header">{invoiceLabels.billTo}</div>
                                            <div>&lt;Customer Name&gt;</div>
                                            <div>&lt;Address&gt;</div>
                                            <div>&lt;City&gt;, &lt;State&gt; &lt;Zip&gt;</div>
                                        </div>
                                        <div className="invoice-ship-to" style={{ textAlign: 'right' }}>
                                            <div className="invoice-section-header">{invoiceLabels.shipTo}</div>
                                            <div>&lt;Customer Name&gt;</div>
                                            <div>&lt;Address&gt;</div>
                                            <div>&lt;City&gt;, &lt;State&gt; &lt;Zip&gt;</div>
                                        </div>
                                    </div>

                                    <table className="invoice-table-preview">
                                        <thead>
                                            <tr>
                                                <th>{tableHeaders.item}</th>
                                                {invoiceLabels.showWarehouse !== false && <th>{tableHeaders.warehouse || 'Warehouse'}</th>}
                                                {invoiceLabels.showQty !== false && <th>{tableHeaders.quantity}</th>}
                                                {invoiceLabels.showUom !== false && <th>{tableHeaders.uom || 'UOM'}</th>}
                                                {invoiceLabels.showRate !== false && <th>{tableHeaders.rate}</th>}
                                                {invoiceLabels.showDiscount !== false && <th>{tableHeaders.discount}</th>}
                                                {invoiceLabels.showTax !== false && <th>{tableHeaders.tax}</th>}
                                                <th style={{ textAlign: 'right' }}>{tableHeaders.price}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Item 1</td>
                                                {invoiceLabels.showWarehouse !== false && <td>Main Warehouse</td>}
                                                {invoiceLabels.showQty !== false && <td>1</td>}
                                                {invoiceLabels.showUom !== false && <td>pcs</td>}
                                                {invoiceLabels.showRate !== false && <td>$100.00</td>}
                                                {invoiceLabels.showDiscount !== false && <td>$50.00</td>}
                                                {invoiceLabels.showTax !== false && <td>Tax 10%</td>}
                                                <td style={{ textAlign: 'right' }}>$50.00</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div className="invoice-total-section">
                                        <div className="invoice-totals">
                                            <div className="invoice-total-row">
                                                <span>{invoiceLabels.subTotal}</span>
                                                <span>$50.00</span>
                                            </div>
                                            {invoiceLabels.showTax !== false && (
                                                <div className="invoice-total-row">
                                                    <span>{invoiceLabels.tax}</span>
                                                    <span>$5.00</span>
                                                </div>
                                            )}
                                            <div className="invoice-final-total">
                                                <span>{invoiceLabels.total}</span>
                                                <span>{invoiceLabels.showTax !== false ? '$55.00' : '$50.00'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {invoiceLabels.showFooter !== false && (
                                        <div className="invoice-footer-notes" style={{ marginTop: '1.5rem', borderTop: '1px solid #edf2f7', paddingTop: '1rem' }}>
                                            <div className="invoice-section-header">Notes &amp; Terms</div>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Thank you for your business!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <div className="invoice-settings-layout">
                                {/* Left Controls */}
                                <div className="invoice-controls">
                                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Receipt/Payment Labels</h3>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
                                        Customize the text labels and table headers for both Customer Payments (Receipts) and Vendor Payments (Bills).
                                    </p>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0 }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: 'bold' }}>Document Labels</h4>
                                        <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            {[
                                                { key: 'number', label: 'Receipt/Payment No Label' },
                                                { key: 'date', label: 'Payment Date Label' },
                                                { key: 'invoiceRef', label: 'Invoice/Bill Ref Label' },
                                                { key: 'receivedFrom', label: 'Received From / Paid To Label' },
                                                { key: 'receivedInto', label: 'Received Into / Paid From Label' },
                                                { key: 'mode', label: 'Payment Mode Label' },
                                                { key: 'refNo', label: 'Ref No Label' },
                                                { key: 'discount', label: 'Discount Allowed/Received Label' },
                                                { key: 'discountAccount', label: 'Discount Account Label' },
                                                { key: 'notes', label: 'Remarks/Notes Label' },
                                                { key: 'signature', label: 'Signature Label' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#475569' }}>{label}</label>
                                                    <input
                                                        type="text"
                                                        value={receiptLabels[key] || ''}
                                                        onChange={(e) => handleLabelChange(key, e.target.value)}
                                                        style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                    />
                                                </div>
                                            ))}
                                            <div className="companySetting-form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.8rem', color: '#475569' }}>Satisfaction Text Description</label>
                                                <textarea
                                                    rows="2"
                                                    value={receiptLabels.satisfaction || ''}
                                                    onChange={(e) => handleLabelChange('satisfaction', e.target.value)}
                                                    style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="companySetting-logo-section" style={{ border: 'none', padding: 0, marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: 'bold' }}>Table Headers</h4>
                                        <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
                                            {[
                                                { key: 'number', label: 'Invoice/Bill Number Col' },
                                                { key: 'date', label: 'Invoice/Bill Date Col' },
                                                { key: 'amount', label: 'Invoice/Bill Amount Col' },
                                                { key: 'allocatedAmount', label: 'Allocated Amount Col' },
                                                { key: 'balanceDue', label: 'Balance Due Col' }
                                            ].map(({ key, label }) => (
                                                <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#475569' }}>{label}</label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            key === 'number' ? receiptTableHeaders.invoiceNumber :
                                                                key === 'date' ? receiptTableHeaders.invoiceDate :
                                                                    key === 'amount' ? receiptTableHeaders.invoiceAmount :
                                                                        receiptTableHeaders[key] || ''
                                                        }
                                                        onChange={(e) => handleHeaderChange(key, e.target.value)}
                                                        style={{ padding: '0.5rem', fontSize: '0.9rem', width: '100%' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {hasPermission('edit settings') && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <button
                                                className="companySetting-btn-primary"
                                                onClick={handleSave}
                                                style={{ backgroundColor: '#1e293b', width: '100%', justifyContent: 'center' }}
                                            >
                                                Save Changes
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Preview Panel with Toggle */}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '1rem' }}>
                                    <div className="preview-type-toggle" style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentPreviewType('receipt')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                backgroundColor: paymentPreviewType === 'receipt' ? 'white' : 'transparent',
                                                color: paymentPreviewType === 'receipt' ? '#1e293b' : '#64748b',
                                                boxShadow: paymentPreviewType === 'receipt' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Customer Receipt Preview
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentPreviewType('payment')}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                backgroundColor: paymentPreviewType === 'payment' ? 'white' : 'transparent',
                                                color: paymentPreviewType === 'payment' ? '#1e293b' : '#64748b',
                                                boxShadow: paymentPreviewType === 'payment' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Vendor Payment Preview
                                        </button>
                                    </div>

                                    {paymentPreviewType === 'receipt' ? (
                                        <div className="invoice-preview-container">
                                            <div className="invoice-header-wrapper">
                                                <div className="invoice-preview-header">
                                                    <div className="invoice-header-left">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo" className="invoice-logo-large" />
                                                        ) : (
                                                            <h2 style={{ color: '#004aad', margin: 0 }}>ZB</h2>
                                                        )}

                                                        <div className="invoice-company-details">
                                                            <strong>{formData.name}</strong><br />
                                                            {formData.email}<br />
                                                            {formData.phone}<br />
                                                            {formData.address}, {formData.city}<br />
                                                            {formData.country} - {formData.zip}<br />
                                                        </div>
                                                    </div>
                                                    <div className="invoice-header-right">
                                                        <div className="invoice-title-large" style={{ color: '#004aad' }}>{documentTitles.receipt || 'RECEIPT'}</div>
                                                        <div className="invoice-meta-info">
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{receiptLabels.number}</span> #REC-17806493
                                                            </div>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{receiptLabels.date}</span> Jan 17, 2026
                                                            </div>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{receiptLabels.invoiceRef}</span> #INVO00001
                                                            </div>
                                                        </div>
                                                        {invoiceSettings.showQr && (
                                                            <div className="invoice-qr-box">
                                                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ReceiptDemo" alt="QR" className="invoice-qr-code" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="invoice-addresses">
                                                <div className="invoice-bill-to">
                                                    <div className="invoice-section-header">{receiptLabels.receivedFrom}</div>
                                                    <div>&lt;Customer Name&gt;</div>
                                                    <div>&lt;Address&gt;</div>
                                                    <div>&lt;City&gt;, &lt;State&gt; &lt;Zip&gt;</div>
                                                </div>
                                                <div className="invoice-ship-to" style={{ textAlign: 'right' }}>
                                                    <div className="invoice-section-header">Payment Summary</div>
                                                    <div><span className="invoice-label">{receiptLabels.receivedInto}</span> Cash on Hand</div>
                                                    <div><span className="invoice-label">{receiptLabels.mode}</span> Cash</div>
                                                    <div><span className="invoice-label">{receiptLabels.refNo}</span> TRN-0001</div>
                                                </div>
                                            </div>

                                            <div className="pp-receipt-satisfaction-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '20px 0' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                    {receiptLabels.satisfaction ? receiptLabels.satisfaction.replace('{amount}', '$2,500.00').replace('{discountText}', '') : ''}
                                                </span>
                                                <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>$2,500.00</strong>
                                            </div>

                                            <table className="invoice-table-preview">
                                                <thead>
                                                    <tr>
                                                        <th>{receiptTableHeaders.invoiceNumber}</th>
                                                        <th>{receiptTableHeaders.invoiceDate}</th>
                                                        <th>{receiptTableHeaders.invoiceAmount}</th>
                                                        <th>{receiptTableHeaders.allocatedAmount}</th>
                                                        <th style={{ textAlign: 'right' }}>{receiptTableHeaders.balanceDue}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>#INVO00001</td>
                                                        <td>Jan 17, 2026</td>
                                                        <td>$5,000.00</td>
                                                        <td>$2,500.00</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>$2,500.00</td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <div className="invoice-total-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '3rem' }}>
                                                <div style={{ maxWidth: '60%', fontSize: '0.8rem', color: '#64748b' }}>
                                                    <strong>{receiptLabels.notes}</strong><br />
                                                    No additional remarks.
                                                </div>
                                                <div className="pp-receipt-signature-section" style={{ textAlign: 'center' }}>
                                                    <div className="pp-receipt-signature-line" style={{ borderTop: '1px solid #1e293b', width: '180px', margin: '0 auto 8px auto' }}></div>
                                                    <div className="pp-receipt-signature-label" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{receiptLabels.signature}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="invoice-preview-container">
                                            <div className="invoice-header-wrapper">
                                                <div className="invoice-preview-header">
                                                    <div className="invoice-header-left">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo" className="invoice-logo-large" />
                                                        ) : (
                                                            <h2 style={{ color: '#004aad', margin: 0 }}>ZB</h2>
                                                        )}

                                                        <div className="invoice-company-details">
                                                            <strong>{formData.name}</strong><br />
                                                            {formData.email}<br />
                                                            {formData.phone}<br />
                                                            {formData.address}, {formData.city}<br />
                                                            {formData.country} - {formData.zip}<br />
                                                        </div>
                                                    </div>
                                                    <div className="invoice-header-right">
                                                        <div className="invoice-title-large" style={{ color: '#004aad' }}>{documentTitles.payment || 'PAYMENT VOUCHER'}</div>
                                                        <div className="invoice-meta-info">
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{paymentLabels.number}</span> #PAY-17806493
                                                            </div>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{paymentLabels.date}</span> Jan 17, 2026
                                                            </div>
                                                            <div className="invoice-meta-row">
                                                                <span className="invoice-label">{paymentLabels.invoiceRef}</span> #BILL-0001
                                                            </div>
                                                        </div>
                                                        {invoiceSettings.showQr && (
                                                            <div className="invoice-qr-box">
                                                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PaymentDemo" alt="QR" className="invoice-qr-code" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="invoice-addresses">
                                                <div className="invoice-bill-to">
                                                    <div className="invoice-section-header">{paymentLabels.receivedFrom}</div>
                                                    <div>&lt;Vendor Name&gt;</div>
                                                    <div>&lt;Address&gt;</div>
                                                    <div>&lt;City&gt;, &lt;State&gt; &lt;Zip&gt;</div>
                                                </div>
                                                <div className="invoice-ship-to" style={{ textAlign: 'right' }}>
                                                    <div className="invoice-section-header">Payment Summary</div>
                                                    <div><span className="invoice-label">{paymentLabels.paidFrom}</span> Chase Checking</div>
                                                    <div><span className="invoice-label">{paymentLabels.mode}</span> Bank Transfer</div>
                                                    <div><span className="invoice-label">{paymentLabels.refNo}</span> TRN-0001</div>
                                                </div>
                                            </div>

                                            <div className="pp-receipt-satisfaction-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '20px 0' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                                    {paymentLabels.satisfaction ? paymentLabels.satisfaction.replace('{amount}', '$3,200.00').replace('{discountText}', '') : ''}
                                                </span>
                                                <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>$3,200.00</strong>
                                            </div>

                                            <table className="invoice-table-preview">
                                                <thead>
                                                    <tr>
                                                        <th>{paymentTableHeaders.billNumber}</th>
                                                        <th>{paymentTableHeaders.billDate}</th>
                                                        <th>{paymentTableHeaders.billAmount}</th>
                                                        <th>{paymentTableHeaders.allocatedAmount}</th>
                                                        <th style={{ textAlign: 'right' }}>{paymentTableHeaders.balanceDue}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>#BILL-0001</td>
                                                        <td>Jan 17, 2026</td>
                                                        <td>$4,000.00</td>
                                                        <td>$3,200.00</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>$800.00</td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <div className="invoice-total-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '3rem' }}>
                                                <div style={{ maxWidth: '60%', fontSize: '0.8rem', color: '#64748b' }}>
                                                    <strong>{paymentLabels.notes}</strong><br />
                                                    Payment sent in full settlement.
                                                </div>
                                                <div className="pp-receipt-signature-section" style={{ textAlign: 'center' }}>
                                                    <div className="pp-receipt-signature-line" style={{ borderTop: '1px solid #1e293b', width: '180px', margin: '0 auto 8px auto' }}></div>
                                                    <div className="pp-receipt-signature-label" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{paymentLabels.signature}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <h3 className="companySetting-section-title" style={{ marginBottom: '0.3rem' }}>Inventory Valuation Method</h3>
                            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.5rem' }}>Choose how the cost of goods sold (COGS) and inventory value are calculated when products are sold.</p>

                            {/* Valuation Method */}
                            <div className="companySetting-form-group full-width" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                                    {[
                                        { value: 'FIFO', label: 'FIFO', desc: 'First In First Out — Oldest stock sold first. Exact batch-level cost tracking.' },
                                        { value: 'WAC', label: 'Weighted Average Cost', desc: 'Averages purchase costs. Simpler and suitable for most businesses.' }
                                    ].map(opt => (
                                        <label key={opt.value} onClick={() => setInventorySettings({ ...inventorySettings, valuationMethod: opt.value })} style={{
                                            flex: '1 1 220px',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '1rem',
                                            cursor: 'pointer',
                                            backgroundColor: inventorySettings.valuationMethod === opt.value ? '#f8fafc' : '#f9fafb',
                                            border: inventorySettings.valuationMethod === opt.value ? '2px solid #1e293b' : '1px solid #e5e7eb',
                                            padding: '1.3rem 1.5rem',
                                            borderRadius: '0.8rem',
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                name="valuationMethod"
                                                value={opt.value}
                                                checked={inventorySettings.valuationMethod === opt.value}
                                                onChange={() => setInventorySettings({ ...inventorySettings, valuationMethod: opt.value })}
                                                style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.15rem', accentColor: '#1e293b' }}
                                            />
                                            <div>
                                                <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#1e293b' }}>{opt.label}</strong>
                                                <span style={{ fontSize: '0.82rem', color: '#666' }}>{opt.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginBottom: '1rem' }}>Stock Management Logic</h3>

                            <div className="companySetting-form-grid" style={{ gap: '1.2rem' }}>

                                {/* Negative Stock Allow */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Allow Negative Stock</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Allow sales even when stock is zero or negative</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.negativeStockAllow} onChange={(e) => setInventorySettings({ ...inventorySettings, negativeStockAllow: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Auto COGS Entry */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Auto COGS Journal Entry</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Automatically post Dr COGS / Cr Inventory Asset on every sale</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.autoCogsEntry} onChange={(e) => setInventorySettings({ ...inventorySettings, autoCogsEntry: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Batch Tracking */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Batch / Lot Tracking</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Track products by batch or lot number (Pharmaceutical, Food, etc.)</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.batchTracking} onChange={(e) => setInventorySettings({ ...inventorySettings, batchTracking: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Expiry Tracking */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Expiry Date Tracking</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Track expiry dates on purchase batches and alert on near-expiry stock</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.expiryTracking} onChange={(e) => setInventorySettings({ ...inventorySettings, expiryTracking: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Reserve on Quotation */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Reserve on Quotation</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Automatically reserve stock when a quotation is created</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.reserveOnQuotation} onChange={(e) => setInventorySettings({ ...inventorySettings, reserveOnQuotation: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Reserve on Sales Order */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <h4 style={{ margin: 0, marginBottom: '0.2rem' }}>Reserve on Sales Order</h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>Automatically reserve stock when a sales order is created</p>
                                        </div>
                                        <label className="switch-label">
                                            <input type="checkbox" className="switch-input" checked={inventorySettings.reserveOnSO} onChange={(e) => setInventorySettings({ ...inventorySettings, reserveOnSO: e.target.checked })} />
                                            <div className="switch-toggle" />
                                        </label>
                                    </div>
                                </div>

                                {/* Delivery Challan */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ margin: 0, marginBottom: '1rem' }}>Delivery Challan Behavior</h4>
                                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                            {[
                                                { value: 'ISSUE', label: 'Issue Stock', desc: 'Decrement total stock immediately (Default)' },
                                                { value: 'RESERVE', label: 'Reserve Stock', desc: 'Move stock to reserved but remain in total stock' }
                                            ].map(opt => (
                                                <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="challanAction"
                                                        value={opt.value}
                                                        checked={inventorySettings.challanAction === opt.value}
                                                        onChange={(e) => setInventorySettings({ ...inventorySettings, challanAction: e.target.value })}
                                                        style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem', accentColor: '#1e293b' }}
                                                    />
                                                    <div>
                                                        <strong style={{ display: 'block' }}>{opt.label}</strong>
                                                        <div style={{ fontSize: '0.82rem', color: '#666' }}>{opt.desc}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Default Warehouses */}
                                <div className="companySetting-form-group full-width">
                                    <div style={{ backgroundColor: '#f9fafb', padding: '1.2rem 1.5rem', borderRadius: '0.8rem', border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ margin: 0, marginBottom: '1rem' }}>Default Warehouse Settings</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                                                    Default Warehouse (Sales Section)
                                                </label>
                                                <select
                                                    value={inventorySettings.defaultSalesWarehouseId || ''}
                                                    onChange={(e) => setInventorySettings({ ...inventorySettings, defaultSalesWarehouseId: e.target.value })}
                                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                                >
                                                    <option value="">-- Select default warehouse --</option>
                                                    {warehouses.map(w => (
                                                        <option key={w.id} value={w.id}>{w.name}</option>
                                                    ))}
                                                </select>
                                                <p style={{ margin: 0, marginTop: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                                    Auto-populated when creating quotations, sales orders, delivery challans, and invoices
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                                                    Default Warehouse (Purchase Section)
                                                </label>
                                                <select
                                                    value={inventorySettings.defaultPurchaseWarehouseId || ''}
                                                    onChange={(e) => setInventorySettings({ ...inventorySettings, defaultPurchaseWarehouseId: e.target.value })}
                                                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0.4rem', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                                >
                                                    <option value="">-- Select default warehouse --</option>
                                                    {warehouses.map(w => (
                                                        <option key={w.id} value={w.id}>{w.name}</option>
                                                    ))}
                                                </select>
                                                <p style={{ margin: 0, marginTop: '0.3rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                                    Auto-populated when creating purchase quotations, purchase orders, GRNs, and purchase bills
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'salesSection' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <h3 className="companySetting-section-title" style={{ marginTop: 0 }}>Sales Policies, Terms &amp; Default Notes</h3>
                            <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                <div className="companySetting-form-group">
                                    <label>Invoice Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsInvoice} onChange={(e) => setFormData({ ...formData, termsInvoice: e.target.value })} placeholder="e.g. Payment due in 30 days"></textarea>
                                    </div>
                                </div>
                                <div className="companySetting-form-group">
                                    <label>Receipt Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsReceipt} onChange={(e) => setFormData({ ...formData, termsReceipt: e.target.value })} placeholder="e.g. No refunds after 7 days"></textarea>
                                    </div>
                                </div>
                                <div className="companySetting-form-group">
                                    <label>Quotation Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsQuotation} onChange={(e) => setFormData({ ...formData, termsQuotation: e.target.value })} placeholder="e.g. Valid for 15 days"></textarea>
                                    </div>
                                </div>
                                <div className="companySetting-form-group">
                                    <label>Sales Order Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsSalesOrder} onChange={(e) => setFormData({ ...formData, termsSalesOrder: e.target.value })} placeholder="Enter sales order default terms..."></textarea>
                                    </div>
                                </div>
                                <div className="companySetting-form-group">
                                    <label>Credit Note Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsCreditNote} onChange={(e) => setFormData({ ...formData, termsCreditNote: e.target.value })} placeholder="Enter credit note default terms..."></textarea>
                                    </div>
                                </div>
                                <div className="companySetting-form-group full-width" style={{ gridColumn: 'span 2' }}>
                                    <label>Default Notes</label>
                                    <div className="companySetting-icon-wrapper">
                                        <StickyNote size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Enter default notes for customers..."></textarea>
                                    </div>
                                </div>
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginTop: '1.5rem' }}>Sales Document Titles</h3>
                            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.5rem' }}>
                                Customize main document titles printed on Sales invoices, quotations, orders, and receipts.
                            </p>
                            <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                {salesTitlesList.map(({ key, label, placeholder }) => (
                                    <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>{label}</label>
                                        <input
                                            type="text"
                                            value={documentTitles[key] || ''}
                                            onChange={(e) => setDocumentTitles({ ...documentTitles, [key]: e.target.value })}
                                            placeholder={`Default: ${placeholder}`}
                                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginTop: '2rem' }}>Sales Serial Numbering</h3>
                            <p className="companySetting-page-subtitle" style={{ marginBottom: '1.5rem' }}>
                                Configure custom prefixes, sequence numbers, padding formats, and generation patterns for Sales transactions.
                            </p>
                            <div className="numbering-settings-grid">
                                <table className="numbering-settings-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction Type</th>
                                            <th>Prefix</th>
                                            <th>Starting Suffix</th>
                                            <th>Padding Length</th>
                                            <th>Pattern Type</th>
                                            <th>Next Number (Preview)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {numberingSettings
                                            .filter(s => salesTypes.includes(s.transactionType))
                                            .map((setting) => {
                                                const index = numberingSettings.findIndex(ns => ns.transactionType === setting.transactionType);
                                                const displayName = getTransactionTypeDisplayName(setting.transactionType);
                                                const preview = previewNextNumber(setting);
                                                return (
                                                    <tr key={setting.transactionType}>
                                                        <td className="transaction-type-cell">
                                                            <strong>{displayName}</strong>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={setting.prefix || ''}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'prefix', e.target.value)}
                                                                className="numbering-input-prefix"
                                                                placeholder="e.g. INV-"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={setting.currentNumber}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'currentNumber', parseInt(e.target.value) || 1)}
                                                                className="numbering-input-number"
                                                                min="1"
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.paddingLength}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'paddingLength', parseInt(e.target.value) || 4)}
                                                                className="numbering-select-padding"
                                                            >
                                                                <option value="2">2 (01)</option>
                                                                <option value="3">3 (001)</option>
                                                                <option value="4">4 (0001)</option>
                                                                <option value="5">5 (00001)</option>
                                                                <option value="6">6 (000001)</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.pattern}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'pattern', e.target.value)}
                                                                className="numbering-select-pattern"
                                                            >
                                                                <option value="numeric">Numeric (0001)</option>
                                                                <option value="alphanumeric">Alphanumeric (000A)</option>
                                                                <option value="custom">Custom</option>
                                                            </select>
                                                        </td>
                                                        <td className="numbering-preview-cell">
                                                            <span className="numbering-preview-tag">{preview}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'purchaseSection' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <h3 className="companySetting-section-title" style={{ marginTop: 0 }}>Purchase Policies &amp; Terms</h3>
                            <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                <div className="companySetting-form-group">
                                    <label>Purchase Terms &amp; Conditions</label>
                                    <div className="companySetting-icon-wrapper">
                                        <FileText size={18} className="companySetting-icon" />
                                        <textarea rows="3" value={formData.termsPurchase} onChange={(e) => setFormData({ ...formData, termsPurchase: e.target.value })} placeholder="e.g. Net 45 days"></textarea>
                                    </div>
                                </div>
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginTop: '1.5rem' }}>Purchase Document Titles</h3>
                            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.5rem' }}>
                                Customize main document titles printed on Purchase orders, bills, quotations, GRNs, and payments.
                            </p>
                            <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                {purchaseTitlesList.map(({ key, label, placeholder }) => (
                                    <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>{label}</label>
                                        <input
                                            type="text"
                                            value={documentTitles[key] || ''}
                                            onChange={(e) => setDocumentTitles({ ...documentTitles, [key]: e.target.value })}
                                            placeholder={`Default: ${placeholder}`}
                                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginTop: '2rem' }}>Purchase Serial Numbering</h3>
                            <p className="companySetting-page-subtitle" style={{ marginBottom: '1.5rem' }}>
                                Configure custom prefixes, sequence numbers, padding formats, and generation patterns for Purchase transactions.
                            </p>
                            <div className="numbering-settings-grid">
                                <table className="numbering-settings-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction Type</th>
                                            <th>Prefix</th>
                                            <th>Starting Suffix</th>
                                            <th>Padding Length</th>
                                            <th>Pattern Type</th>
                                            <th>Next Number (Preview)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {numberingSettings
                                            .filter(s => purchaseTypes.includes(s.transactionType))
                                            .map((setting) => {
                                                const index = numberingSettings.findIndex(ns => ns.transactionType === setting.transactionType);
                                                const displayName = getTransactionTypeDisplayName(setting.transactionType);
                                                const preview = previewNextNumber(setting);
                                                return (
                                                    <tr key={setting.transactionType}>
                                                        <td className="transaction-type-cell">
                                                            <strong>{displayName}</strong>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={setting.prefix || ''}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'prefix', e.target.value)}
                                                                className="numbering-input-prefix"
                                                                placeholder="e.g. PO-"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={setting.currentNumber}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'currentNumber', parseInt(e.target.value) || 1)}
                                                                className="numbering-input-number"
                                                                min="1"
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.paddingLength}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'paddingLength', parseInt(e.target.value) || 4)}
                                                                className="numbering-select-padding"
                                                            >
                                                                <option value="2">2 (01)</option>
                                                                <option value="3">3 (001)</option>
                                                                <option value="4">4 (0001)</option>
                                                                <option value="5">5 (00001)</option>
                                                                <option value="6">6 (000001)</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.pattern}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'pattern', e.target.value)}
                                                                className="numbering-select-pattern"
                                                            >
                                                                <option value="numeric">Numeric (0001)</option>
                                                                <option value="alphanumeric">Alphanumeric (000A)</option>
                                                                <option value="custom">Custom</option>
                                                            </select>
                                                        </td>
                                                        <td className="numbering-preview-cell">
                                                            <span className="numbering-preview-tag">{preview}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'otherSection' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <h3 className="companySetting-section-title" style={{ marginTop: 0 }}>Voucher &amp; Capital Document Titles</h3>
                            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.5rem' }}>
                                Customize main document titles printed on GRN, Journal, Expense, Income, Contra, and Capital vouchers.
                            </p>
                            <div className="companySetting-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                {otherTitlesList.map(({ key, label, placeholder }) => (
                                    <div key={key} className="companySetting-form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#374151' }}>{label}</label>
                                        <input
                                            type="text"
                                            value={documentTitles[key] || ''}
                                            onChange={(e) => setDocumentTitles({ ...documentTitles, [key]: e.target.value })}
                                            placeholder={`Default: ${placeholder}`}
                                            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <h3 className="companySetting-section-title" style={{ marginTop: '2rem' }}>Voucher &amp; Inventory Serial Numbering</h3>
                            <p className="companySetting-page-subtitle" style={{ marginBottom: '1.5rem' }}>
                                Configure custom prefixes, sequence numbers, padding formats, and generation patterns for GRN, Vouchers, Stock Transfer &amp; Adjustments.
                            </p>
                            <div className="numbering-settings-grid">
                                <table className="numbering-settings-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction Type</th>
                                            <th>Prefix</th>
                                            <th>Starting Suffix</th>
                                            <th>Padding Length</th>
                                            <th>Pattern Type</th>
                                            <th>Next Number (Preview)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {numberingSettings
                                            .filter(s => otherTypes.includes(s.transactionType))
                                            .map((setting) => {
                                                const index = numberingSettings.findIndex(ns => ns.transactionType === setting.transactionType);
                                                const displayName = getTransactionTypeDisplayName(setting.transactionType);
                                                const preview = previewNextNumber(setting);
                                                return (
                                                    <tr key={setting.transactionType}>
                                                        <td className="transaction-type-cell">
                                                            <strong>{displayName}</strong>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={setting.prefix || ''}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'prefix', e.target.value)}
                                                                className="numbering-input-prefix"
                                                                placeholder="e.g. VCH-"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={setting.currentNumber}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'currentNumber', parseInt(e.target.value) || 1)}
                                                                className="numbering-input-number"
                                                                min="1"
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.paddingLength}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'paddingLength', parseInt(e.target.value) || 4)}
                                                                className="numbering-select-padding"
                                                            >
                                                                <option value="2">2 (01)</option>
                                                                <option value="3">3 (001)</option>
                                                                <option value="4">4 (0001)</option>
                                                                <option value="5">5 (00001)</option>
                                                                <option value="6">6 (000001)</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={setting.pattern}
                                                                onChange={(e) => handleNumberingFieldChange(index, 'pattern', e.target.value)}
                                                                className="numbering-select-pattern"
                                                            >
                                                                <option value="numeric">Numeric (0001)</option>
                                                                <option value="alphanumeric">Alphanumeric (000A)</option>
                                                                <option value="custom">Custom</option>
                                                            </select>
                                                        </td>
                                                        <td className="numbering-preview-cell">
                                                            <span className="numbering-preview-tag">{preview}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="companySetting-form-section companySetting-fade-in">
                            <h3 className="companySetting-section-title">Password Management</h3>
                            <div className="companySetting-form-grid">
                                <div className="companySetting-form-group full-width">
                                    <label>Request Password Change</label>
                                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                                        Submit a request to change your password. Your administrator will review and approve the request.
                                    </p>
                                    <button
                                        className="companySetting-btn-upload"
                                        onClick={handlePasswordChangeRequest}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Lock size={16} /> Request Password Change
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'customFields' && (
                        <CustomFieldsTab
                            customFieldsConfig={customFieldsConfig}
                            setCustomFieldsConfig={setCustomFieldsConfig}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const CustomFieldsTab = ({ customFieldsConfig, setCustomFieldsConfig }) => {
    const transactionTypes = [
        { id: 'invoice', label: 'Sales Invoice' },
        { id: 'receipt', label: 'Sales Receipt' },
        { id: 'salesreturn', label: 'Credit Note (Sales Return)' },
        { id: 'purchasereturn', label: 'Debit Note (Purchase Return)' },
        { id: 'purchasebill', label: 'Purchase Bill' },
        { id: 'payment', label: 'Purchase Payment' },
        { id: 'expense', label: 'Expense' },
        { id: 'income', label: 'Income' },
        { id: 'posinvoice', label: 'POS Invoice' },
        { id: 'salesorder', label: 'Sales Order' },
        { id: 'salesquotation', label: 'Sales Quotation' },
        { id: 'purchaseorder', label: 'Purchase Order' },
        { id: 'purchasequotation', label: 'Purchase Quotation' },
        { id: 'deliverychallan', label: 'Delivery Challan' },
        { id: 'goodsreceiptnote', label: 'Goods Receipt Note' },
        { id: 'voucher', label: 'Voucher' }
    ];

    const [selectedType, setSelectedType] = useState('invoice');

    // Find fields for the selected transaction type
    const activeFields = customFieldsConfig.find(item => item.transactionType === selectedType)?.fields || [];

    const handleAddField = () => {
        const newField = {
            id: Date.now().toString(),
            label: '',
            type: 'text',
            required: false,
            options: ''
        };

        setCustomFieldsConfig(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const typeConfig = copy.find(item => item.transactionType === selectedType);
            if (typeConfig) {
                typeConfig.fields = [...typeConfig.fields, newField];
            } else {
                copy.push({
                    transactionType: selectedType,
                    fields: [newField]
                });
            }
            return copy;
        });
    };

    const handleUpdateField = (fieldId, updatedProps) => {
        setCustomFieldsConfig(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const typeConfig = copy.find(item => item.transactionType === selectedType);
            if (typeConfig) {
                typeConfig.fields = typeConfig.fields.map(f => f.id === fieldId ? { ...f, ...updatedProps } : f);
            }
            return copy;
        });
    };

    const handleDeleteField = (fieldId) => {
        setCustomFieldsConfig(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const typeConfig = copy.find(item => item.transactionType === selectedType);
            if (typeConfig) {
                typeConfig.fields = typeConfig.fields.filter(f => f.id !== fieldId);
            }
            return copy;
        });
    };

    return (
        <div className="companySetting-form-section companySetting-fade-in custom-fields-tab-content">
            <h3 className="companySetting-section-title" style={{ marginBottom: '0.3rem' }}>Custom Fields &amp; Taxonomy</h3>
            <p style={{ fontSize: '0.88rem', color: '#666', marginBottom: '1.5rem' }}>
                Define custom input fields for each transaction type. These fields will appear in entry forms and show up in invoice PDFs.
            </p>

            <div className="custom-fields-selector-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div className="companySetting-form-group" style={{ marginBottom: 0, minWidth: '280px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>Select Transaction Type</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                    >
                        {transactionTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={handleAddField}
                    className="companySetting-btn-upload"
                    style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', height: 'fit-content', marginTop: '1.8rem', padding: '0.8rem 1.2rem', fontWeight: '600' }}
                >
                    + Add Field
                </button>
            </div>

            <div className="custom-fields-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeFields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8' }}>
                        No custom fields configured for this transaction type. Click "+ Add Field" to create one.
                    </div>
                ) : (
                    activeFields.map((field) => (
                        <div
                            key={field.id}
                            className="custom-field-row-card"
                            style={{
                                display: 'flex',
                                gap: '1rem',
                                padding: '1.2rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                backgroundColor: '#f8fafc',
                                flexWrap: 'wrap',
                                alignItems: 'flex-start',
                                position: 'relative',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div className="companySetting-form-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Field Label Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Delivery Mode, Payment Method"
                                    value={field.label}
                                    onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                    style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div className="companySetting-form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Field Type</label>
                                <select
                                    value={field.type}
                                    onChange={(e) => handleUpdateField(field.id, { type: e.target.value })}
                                    style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                                >
                                    <option value="text">Text Input</option>
                                    <option value="select">Dropdown Select</option>
                                </select>
                            </div>

                            {field.type === 'select' && (
                                <div className="companySetting-form-group" style={{ flex: '3 1 250px', marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>Dropdown Options (Comma separated)</label>
                                    <input
                                        type="text"
                                        placeholder="Option 1, Option 2, Option 3"
                                        value={field.options || ''}
                                        onChange={(e) => handleUpdateField(field.id, { options: e.target.value })}
                                        style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            )}

                            <div className="companySetting-form-group" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', marginBottom: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.6rem' }}>Required?</label>
                                <label className="switch-label" style={{ margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        className="switch-input"
                                        checked={field.required || false}
                                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                    />
                                    <div className="switch-toggle" />
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleDeleteField(field.id)}
                                style={{
                                    alignSelf: 'center',
                                    backgroundColor: '#fee2e2',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.6rem 1rem',
                                    fontSize: '0.88rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginTop: '1.2rem'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CompanySettings;
