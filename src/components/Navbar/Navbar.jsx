import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import GetCompanyId from '../../api/GetCompanyId';
import {
    Menu, Globe, Bell, Plus, ChevronDown, LogOut, User as UserIcon,
    Search, X, Loader2, FileText, ShoppingCart, Users, Package, FileClock,
    Home, Building2, Ticket, ClipboardList, CreditCard, Key, Calculator,
    Box, Truck, BarChart3, UserCog, Settings, Receipt
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { useTranslation } from '../../context/LanguageContext';
import './Navbar.css';

const SUPERADMIN_MENUS = [
    { label: 'Dashboard', path: '/superadmin/dashboard', category: 'Dashboard', icon: Home },
    { label: 'Company', path: '/superadmin/company', category: 'Company', icon: Building2 },
    { label: 'Plans & Pricing', path: '/superadmin/plan', category: 'Plans & Pricing', icon: Ticket },
    { label: 'Request Plan', path: '/superadmin/plan-requests', category: 'Request Plan', icon: ClipboardList },
    { label: 'Payments', path: '/superadmin/payments', category: 'Payments', icon: CreditCard },
    { label: 'Passwords', path: '/superadmin/passwords', category: 'Passwords', icon: Key }
];

const COMPANY_MENUS = [
    // Dashboard & Overview
    { label: 'Dashboard', path: '/company/dashboard', category: 'Dashboard', perm: 'view dashboard', icon: Home },

    // Accounts & Finance
    { label: 'Chart of Accounts', path: '/company/accounts/charts', category: 'Accounts', perm: 'view charts of accounts', icon: Calculator },
    { label: 'Customers', path: '/company/accounts/customers', category: 'Accounts', perm: 'view customers', icon: Users },
    { label: 'Vendors', path: '/company/accounts/vendors', category: 'Accounts', perm: 'view vendors', icon: UserCog },
    { label: 'Transactions', path: '/company/accounts/transactions', category: 'Accounts', perm: 'view transactions', icon: CreditCard },
    { label: 'Income', path: '/company/voucher/income', category: 'Accounts', perm: 'view vouchers', icon: FileText },
    { label: 'Contra Voucher', path: '/company/voucher/contra', category: 'Accounts', perm: 'view vouchers', icon: FileText },

    // Inventory & Warehousing
    { label: 'Warehouses', path: '/company/inventory/warehouse', category: 'Inventory', perm: 'view warehouses', icon: Box },
    { label: 'Unit of Measure (UOM)', path: '/company/inventory/uom', category: 'Inventory', perm: 'view UOM', icon: Package },
    { label: 'Products Inventory', path: '/company/inventory/products', category: 'Inventory', perm: 'view products', icon: Package },
    { label: 'Services Inventory', path: '/company/inventory/services', category: 'Inventory', perm: 'view products', icon: Package },
    { label: 'Stock Transfer', path: '/company/inventory/transfer', category: 'Inventory', perm: 'view stock transfers', icon: Truck },
    { label: 'Inventory Adjustment', path: '/company/inventory/adjustment', category: 'Inventory', perm: 'view stock adjustments', icon: Box },

    // Sales & Revenue
    { label: 'Quotations', path: '/company/sales/quotation', category: 'Sales', perm: 'view quotations', icon: FileText },
    { label: 'Sales Orders', path: '/company/sales/order', category: 'Sales', perm: 'view sales orders', icon: ShoppingCart },
    { label: 'Delivery Challans', path: '/company/sales/challan', category: 'Sales', perm: 'view delivery challans', icon: Truck },
    { label: 'Invoices', path: '/company/sales/invoice', category: 'Sales', perm: 'view invoices', icon: FileText },
    { label: 'Payments Received', path: '/company/sales/payment', category: 'Sales', perm: 'view payments', icon: CreditCard },
    { label: 'Sales Returns', path: '/company/sales/return', category: 'Sales', perm: 'view sales returns', icon: FileClock },

    // Purchases & Expenses
    { label: 'Purchase Quotations', path: '/company/purchases/quotation', category: 'Purchases', perm: 'view purchase quotations', icon: FileText },
    { label: 'Purchase Orders', path: '/company/purchases/order', category: 'Purchases', perm: 'view purchase orders', icon: ShoppingCart },
    { label: 'Goods Receipts (GRN)', path: '/company/purchases/receipt', category: 'Purchases', perm: 'view goods receipts', icon: Box },
    { label: 'Purchase Bills', path: '/company/purchases/bill', category: 'Purchases', perm: 'view purchase bills', icon: Receipt },
    { label: 'Purchase Returns', path: '/company/purchases/return', category: 'Purchases', perm: 'view purchase returns', icon: FileClock },
    { label: 'Expenses', path: '/company/voucher/expenses', category: 'Purchases', perm: 'view vouchers', icon: CreditCard },

    // Point of Sale (POS)
    { label: 'POS Billing', path: '/company/pos', category: 'POS', perm: 'create pos invoices', icon: ShoppingCart },
    { label: 'POS Invoices List', path: '/company/pos/all-invoices', category: 'POS', perm: 'view pos invoices', icon: FileText },

    // Vouchers & Accounting Entries
    { label: 'Create Voucher', path: '/company/voucher/create', category: 'Vouchers', perm: 'view vouchers', icon: Plus },
    { label: 'Add Capital', path: '/company/voucher/add-capital', category: 'Vouchers', perm: 'view vouchers', icon: FileText },
    { label: 'Drawing Capital', path: '/company/voucher/drawing-capital', category: 'Vouchers', perm: 'view vouchers', icon: FileText },

    // Users & Access Control
    { label: 'User List', path: '/company/users/list', category: 'Users', perm: 'view users', icon: Users },
    { label: 'Role & Permissions', path: '/company/users/roles', category: 'Users', perm: 'view roles', icon: UserCog },

    // Reports & Analytics
    { label: 'Sales Report', path: '/company/reports/sales', category: 'Reports', perm: 'view sales report', icon: BarChart3 },
    { label: 'Purchase Report', path: '/company/reports/purchase', category: 'Reports', perm: 'view purchase report', icon: BarChart3 },
    { label: 'POS Sales Report', path: '/company/reports/pos', category: 'Reports', perm: 'view pos sales report', icon: BarChart3 },
    { label: 'Tax Report', path: '/company/reports/tax', category: 'Reports', perm: 'view tax report', icon: BarChart3 },
    { label: 'Inventory Summary Report', path: '/company/reports/inventory-summary', category: 'Reports', perm: 'view inventory report', icon: BarChart3 },
    { label: 'Cash Flow Statement', path: '/company/reports/cash-flow', category: 'Reports', perm: 'view cash flow report', icon: BarChart3 },
    { label: 'Profit & Loss Statement', path: '/company/reports/profit-loss', category: 'Reports', perm: 'view profit loss report', icon: BarChart3 },
    { label: 'Balance Sheet', path: '/company/reports/balance-sheet', category: 'Reports', perm: 'view balance sheet report', icon: BarChart3 },
    { label: 'VAT Return Report', path: '/company/reports/vat', category: 'Reports', perm: 'view vat report', icon: BarChart3 },
    { label: 'Day Book Register', path: '/company/reports/daybook', category: 'Reports', perm: 'view daybook report', icon: BarChart3 },
    { label: 'Journal Entries Report', path: '/company/reports/journal', category: 'Reports', perm: 'view journal report', icon: BarChart3 },
    { label: 'Ledger Statement Report', path: '/company/reports/ledger', category: 'Reports', perm: 'view ledger report', icon: BarChart3 },
    { label: 'Trial Balance Register', path: '/company/reports/trial-balance', category: 'Reports', perm: 'view trial balance report', icon: BarChart3 },
    { label: 'Agent Performance Report', path: '/company/reports/agent-performance', category: 'Reports', perm: 'view agent performance report', icon: BarChart3 },

    // Settings
    { label: 'Company Info', path: '/company/settings/info', category: 'Settings', perm: 'view settings', icon: Settings },
    { label: 'Password Requests', path: '/company/settings/password-requests', category: 'Settings', perm: 'view settings', icon: Key },
    { label: 'Audit Logs', path: '/company/settings/audit-logs', category: 'Settings', perm: 'view settings', icon: ClipboardList }
];

const Navbar = ({ toggleSidebar }) => {
    const { currentUser, logout, hasPermission } = useContext(AuthContext);
    const { language, changeLanguage, supportedLanguages } = useTranslation();
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);

    const currentLangObj = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

    // Global Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({
        invoices: [],
        purchaseBills: [],
        customers: [],
        vendors: [],
        products: [],
        vouchers: [],
        salesQuotations: [],
        salesOrders: [],
        deliveryChallans: [],
        salesReceipts: [],
        salesReturns: [],
        purchaseQuotations: [],
        purchaseOrders: [],
        goodsReceiptNotes: [],
        purchasePayments: [],
        purchaseReturns: [],
        posInvoices: [],
        journalVouchers: [],
        expenses: [],
        incomes: [],
        contras: [],
        addCapitals: [],
        drawingCapitals: [],
        journalEntries: [],
        allTransactions: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const searchInputRef = useRef(null);

    const handleLangSelect = (lang) => {
        changeLanguage(lang.code);
        setIsLangOpen(false);
        toast.success(`Language changed to ${lang.name}`);
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    // Handle Ctrl+K and Esc Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus Search Input when Modal Opens
    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, 50);
        } else {
            setSearchQuery('');
            setSearchResults({
                invoices: [],
                purchaseBills: [],
                customers: [],
                vendors: [],
                products: [],
                vouchers: [],
                salesQuotations: [],
                salesOrders: [],
                deliveryChallans: [],
                salesReceipts: [],
                salesReturns: [],
                purchaseQuotations: [],
                purchaseOrders: [],
                goodsReceiptNotes: [],
                purchasePayments: [],
                purchaseReturns: [],
                posInvoices: [],
                journalVouchers: [],
                expenses: [],
                incomes: [],
                contras: [],
                addCapitals: [],
                drawingCapitals: [],
                journalEntries: [],
                allTransactions: []
            });
        }
    }, [isSearchOpen]);

    // Debounced API Search Query Fetch
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({
                invoices: [],
                purchaseBills: [],
                customers: [],
                vendors: [],
                products: [],
                vouchers: [],
                salesQuotations: [],
                salesOrders: [],
                deliveryChallans: [],
                salesReceipts: [],
                salesReturns: [],
                purchaseQuotations: [],
                purchaseOrders: [],
                goodsReceiptNotes: [],
                purchasePayments: [],
                purchaseReturns: [],
                posInvoices: [],
                journalVouchers: [],
                expenses: [],
                incomes: [],
                contras: [],
                addCapitals: [],
                drawingCapitals: [],
                journalEntries: [],
                allTransactions: []
            });
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsLoading(true);
            try {
                const companyId = currentUser?.companyId || GetCompanyId();
                const response = await axiosInstance.get(`/search?q=${encodeURIComponent(searchQuery)}&companyId=${companyId || ''}`, {
                    headers: { 'X-No-Loader': 'true' }
                });
                if (response.data && response.data.success) {
                    setSearchResults(response.data.data);
                }
            } catch (error) {
                console.error('Search API error:', error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Handle Search Result Clicking & Navigation
    const handleResultClick = (category, item) => {
        setIsSearchOpen(false);

        switch (category) {
            case 'invoices':
                navigate('/company/sales/invoice', {
                    state: { targetInvoiceId: item.id, type: 'TAX_INVOICE' }
                });
                break;
            case 'purchaseBills':
                navigate('/company/purchases/bill', {
                    state: { targetBillId: item.id }
                });
                break;
            case 'customers':
                navigate(`/company/accounts/customers/${item.id}`);
                break;
            case 'vendors':
                navigate(`/company/accounts/vendors/${item.id}`);
                break;
            case 'products':
                navigate(`/company/inventory/products/${item.id}`);
                break;
            case 'vouchers':
                if (item.voucherType === 'EXPENSE') {
                    navigate('/company/voucher/expenses', { state: { targetExpenseId: item.id } });
                } else if (item.voucherType === 'INCOME') {
                    navigate('/company/voucher/income', { state: { targetIncomeId: item.id } });
                } else if (item.voucherType === 'CONTRA') {
                    navigate('/company/voucher/contra', { state: { targetContraId: item.id } });
                } else if (item.voucherType === 'JOURNAL') {
                    navigate('/company/voucher/create', { state: { targetJournalId: item.id } });
                }
                break;
            // Sales transaction types
            case 'salesQuotations':
                navigate('/company/sales/quotation', { state: { targetQuotationId: item.id } });
                break;
            case 'salesOrders':
                navigate('/company/sales/order', { state: { targetOrderId: item.id } });
                break;
            case 'deliveryChallans':
                navigate('/company/sales/challan', { state: { targetChallanId: item.id } });
                break;
            case 'salesReceipts':
                navigate('/company/sales/payment', { state: { targetReceiptId: item.id } });
                break;
            case 'salesReturns':
                navigate('/company/sales/return', { state: { targetReturnId: item.id } });
                break;
            // Purchase transaction types
            case 'purchaseQuotations':
                navigate('/company/purchases/quotation', { state: { targetQuotationId: item.id } });
                break;
            case 'purchaseOrders':
                navigate('/company/purchases/order', { state: { targetOrderId: item.id } });
                break;
            case 'goodsReceiptNotes':
                navigate('/company/purchases/receipt', { state: { targetGrnId: item.id } });
                break;
            case 'purchasePayments':
                navigate('/company/purchases/payment', { state: { targetPaymentId: item.id } });
                break;
            case 'purchaseReturns':
                navigate('/company/purchases/return', { state: { targetReturnId: item.id } });
                break;
            // POS
            case 'posInvoices':
                navigate('/company/sales/invoice', { state: { targetInvoiceId: item.id, type: 'POS_INVOICE' } });
                break;
            // Voucher types
            case 'journalVouchers':
                navigate('/company/voucher/create', { state: { targetJournalId: item.id } });
                break;
            case 'expenses':
                navigate('/company/voucher/expenses', { state: { targetExpenseId: item.id } });
                break;
            case 'incomes':
                navigate('/company/voucher/income', { state: { targetIncomeId: item.id } });
                break;
            case 'contras':
                navigate('/company/voucher/contra', { state: { targetContraId: item.id } });
                break;
            case 'addCapitals':
                navigate('/company/voucher/add-capital', { state: { targetCapitalId: item.id } });
                break;
            case 'drawingCapitals':
                navigate('/company/voucher/drawing-capital', { state: { targetDrawingId: item.id } });
                break;
            case 'journalEntries':
                // Journal entries - navigate to journal voucher page
                navigate('/company/voucher/create', { state: { targetJournalId: item.id } });
                break;
            case 'allTransactions':
                // Route based on voucherType in the transaction record
                if (item.voucherType === 'SALES') {
                    navigate('/company/sales/invoice', { state: { targetInvoiceId: item.invoiceId || item.id, type: 'TAX_INVOICE' } });
                } else if (item.voucherType === 'PURCHASE') {
                    navigate('/company/purchases/bill', { state: { targetBillId: item.purchaseBillId || item.id } });
                } else if (item.voucherType === 'RECEIPT') {
                    navigate('/company/sales/payment', { state: { targetReceiptId: item.receiptId || item.id } });
                } else if (item.voucherType === 'PAYMENT') {
                    navigate('/company/purchases/payment', { state: { targetPaymentId: item.paymentId || item.id } });
                } else if (item.voucherType === 'EXPENSE') {
                    navigate('/company/voucher/expenses', { state: { targetExpenseId: item.id } });
                } else if (item.voucherType === 'INCOME') {
                    navigate('/company/voucher/income', { state: { targetIncomeId: item.id } });
                } else if (item.voucherType === 'CONTRA') {
                    navigate('/company/voucher/contra', { state: { targetContraId: item.id } });
                } else if (item.voucherType === 'JOURNAL') {
                    navigate('/company/voucher/create', { state: { targetJournalId: item.id } });
                } else if (item.voucherType === 'POS') {
                    navigate('/company/sales/invoice', { state: { targetInvoiceId: item.posInvoiceId || item.id, type: 'POS_INVOICE' } });
                } else {
                    navigate('/company/reports/journal');
                }
                break;
            default:
                break;
        }
    };

    // Filter menus based on search query and permissions
    const searchableMenus = currentUser?.role === 'SUPERADMIN'
        ? SUPERADMIN_MENUS
        : COMPANY_MENUS.filter(menu => !menu.perm || hasPermission(menu.perm));

    const filteredMenus = searchQuery.trim()
        ? searchableMenus.filter(menu =>
            menu.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            menu.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const hasResults = Object.values(searchResults).some(arr => arr && arr.length > 0) || filteredMenus.length > 0;

    return (
        <header className="navbar">
            <div className="navbar-left">
                <button onClick={toggleSidebar} className="icon-btn toggle-btn">
                    <Menu size={20} />
                </button>
                {/* <span className="navbar-title">Dashboard</span> */}

                {/* Search Trigger Button */}
                <div className="navbar-search-trigger" onClick={() => setIsSearchOpen(true)}>
                    <Search size={16} className="search-trigger-icon" />
                    <span className="search-trigger-text">Search...</span>
                    <kbd className="search-kbd">Ctrl+K</kbd>
                </div>
            </div>

            <div className="navbar-right">
                <div className="lang-selector-container notranslate">
                    <button className="icon-btn notranslate" onClick={() => setIsLangOpen(!isLangOpen)}>
                        <Globe size={18} />
                        <span className="lang-text notranslate">{currentLangObj.flag} {currentLangObj.name}</span>
                        <ChevronDown size={14} className={isLangOpen ? 'rotate-180' : ''} />
                    </button>

                    {isLangOpen && (
                        <div className="lang-dropdown notranslate">
                            {supportedLanguages.map((lang) => (
                                <div
                                    key={lang.code}
                                    className={`lang-item notranslate ${language === lang.code ? 'active' : ''}`}
                                    onClick={() => handleLangSelect(lang)}
                                >
                                    <div className="lang-flag-name notranslate">
                                        <span className="lang-flag notranslate">{lang.flag}</span>
                                        <span className="notranslate">{lang.name}</span>
                                    </div>
                                    {language === lang.code && <div className="active-dot"></div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="user-profile-container">
                    <div
                        className="user-profile"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        {currentUser?.avatar ? (
                            <img
                                src={currentUser.avatar}
                                alt="User"
                                className="avatar"
                            />
                        ) : (
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                                alt="User"
                                className="avatar"
                            />
                        )}
                        <div className="user-info">
                            <span className="user-name">Hi, {currentUser?.name || 'User'}!</span>
                            <ChevronDown size={14} className="App-text-muted" />
                        </div>
                    </div>

                    {isProfileOpen && (
                        <div className="profile-dropdown">
                            <div
                                className="dropdown-item"
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    navigate('/company/settings/profile');
                                }}
                            >
                                <UserIcon size={16} />
                                <span>My Profile</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item text-danger" onClick={handleLogout}>
                                <LogOut size={16} />
                                <span>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Search Modal Overlay */}
            {isSearchOpen && createPortal(
                <div className="search-modal-overlay" onClick={() => setIsSearchOpen(false)}>
                    <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="search-input-container">
                            <Search size={20} className="search-icon" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search invoices, quotations, orders, POS, payments, vouchers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {isLoading && <Loader2 className="animate-spin text-muted" size={20} />}
                            <button className="search-close-btn" onClick={() => setIsSearchOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="search-results-container">
                            {!searchQuery.trim() && (
                                <div className="search-results-empty">
                                    <span>Type to start searching...</span>
                                    <div className="search-results-empty-subtitle">
                                        Search invoices, bills, customers, vendors, products, and vouchers
                                    </div>
                                </div>
                            )}

                            {searchQuery.trim() && !isLoading && !hasResults && (
                                <div className="search-results-empty">
                                    No results found for "{searchQuery}"
                                </div>
                            )}

                            {searchQuery.trim() && hasResults && (
                                <>
                                    {/* Menus & Pages Section */}
                                    {filteredMenus.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Menus & Pages</div>
                                            <div className="search-results-list">
                                                {filteredMenus.map((menu, idx) => {
                                                    const MenuIcon = menu.icon || Globe;
                                                    return (
                                                        <div
                                                            key={`menu-${idx}`}
                                                            className="search-result-item"
                                                            onClick={() => {
                                                                setIsSearchOpen(false);
                                                                navigate(menu.path);
                                                            }}
                                                        >
                                                            <div className="search-result-icon-wrapper">
                                                                <MenuIcon size={18} />
                                                            </div>
                                                            <div className="search-result-content">
                                                                <div className="search-result-header">
                                                                    <span className="search-result-title">{menu.label}</span>
                                                                    <span className="search-result-meta">{menu.category}</span>
                                                                </div>
                                                                <div className="search-result-subtitle">
                                                                    Navigate to {menu.label}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Invoices Section */}
                                    {searchResults.invoices?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Invoices</div>
                                            <div className="search-results-list">
                                                {searchResults.invoices.map((inv) => (
                                                    <div
                                                        key={inv.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('invoices', inv)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{inv.invoiceNumber}</span>
                                                                <span className="search-result-meta">{new Date(inv.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                Customer: {inv.customer?.name || 'Walk-in'} • Amount: {(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Bills Section */}
                                    {searchResults.purchaseBills?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Purchase Bills</div>
                                            <div className="search-results-list">
                                                {searchResults.purchaseBills.map((bill) => (
                                                    <div
                                                        key={bill.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('purchaseBills', bill)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <ShoppingCart size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{bill.billNumber}</span>
                                                                <span className="search-result-meta">{new Date(bill.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                Vendor: {bill.vendor?.name} • Amount: {(bill.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Customers Section */}
                                    {searchResults.customers?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Customers</div>
                                            <div className="search-results-list">
                                                {searchResults.customers.map((cust) => (
                                                    <div
                                                        key={cust.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('customers', cust)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <Users size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{cust.name}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                Email: {cust.email || 'N/A'} • Phone: {cust.phone || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Vendors Section */}
                                    {searchResults.vendors?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Vendors</div>
                                            <div className="search-results-list">
                                                {searchResults.vendors.map((vend) => (
                                                    <div
                                                        key={vend.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('vendors', vend)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <Users size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{vend.name}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                Email: {vend.email || 'N/A'} • Phone: {vend.phone || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Products Section */}
                                    {searchResults.products?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Products</div>
                                            <div className="search-results-list">
                                                {searchResults.products.map((prod) => (
                                                    <div
                                                        key={prod.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('products', prod)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <Package size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{prod.name}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                SKU: {prod.sku || 'N/A'} • Barcode: {prod.barcode || 'N/A'} • Stock: {prod.openingStock || 0}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Vouchers Section (legacy) */}
                                    {searchResults.vouchers?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Vouchers</div>
                                            <div className="search-results-list">
                                                {searchResults.vouchers.map((vouch) => (
                                                    <div
                                                        key={vouch.id}
                                                        className="search-result-item"
                                                        onClick={() => handleResultClick('vouchers', vouch)}
                                                    >
                                                        <div className="search-result-icon-wrapper">
                                                            <FileClock size={18} />
                                                        </div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{vouch.voucherNumber} ({vouch.voucherType})</span>
                                                                <span className="search-result-meta">{new Date(vouch.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">
                                                                Party/Ledger: {vouch.paidToParty || vouch.paidFromAccount || 'N/A'} • Amount: {(vouch.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sales Quotations */}
                                    {searchResults.salesQuotations?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Sales Quotations</div>
                                            <div className="search-results-list">
                                                {searchResults.salesQuotations.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('salesQuotations', item)}>
                                                        <div className="search-result-icon-wrapper"><ShoppingCart size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.quotationNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sales Orders */}
                                    {searchResults.salesOrders?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Sales Orders</div>
                                            <div className="search-results-list">
                                                {searchResults.salesOrders.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('salesOrders', item)}>
                                                        <div className="search-result-icon-wrapper"><ShoppingCart size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.orderNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Delivery Challans */}
                                    {searchResults.deliveryChallans?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Delivery Challans</div>
                                            <div className="search-results-list">
                                                {searchResults.deliveryChallans.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('deliveryChallans', item)}>
                                                        <div className="search-result-icon-wrapper"><Truck size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.challanNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sales Receipts (Customer Payments) */}
                                    {searchResults.salesReceipts?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Sales Payments</div>
                                            <div className="search-results-list">
                                                {searchResults.salesReceipts.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('salesReceipts', item)}>
                                                        <div className="search-result-icon-wrapper"><CreditCard size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.receiptNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'N/A'} • Amount: {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sales Returns */}
                                    {searchResults.salesReturns?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Sales Returns</div>
                                            <div className="search-results-list">
                                                {searchResults.salesReturns.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('salesReturns', item)}>
                                                        <div className="search-result-icon-wrapper"><ShoppingCart size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.returnNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Quotations */}
                                    {searchResults.purchaseQuotations?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Purchase Quotations</div>
                                            <div className="search-results-list">
                                                {searchResults.purchaseQuotations.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('purchaseQuotations', item)}>
                                                        <div className="search-result-icon-wrapper"><Truck size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.quotationNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Vendor: {item.vendor?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Orders */}
                                    {searchResults.purchaseOrders?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Purchase Orders</div>
                                            <div className="search-results-list">
                                                {searchResults.purchaseOrders.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('purchaseOrders', item)}>
                                                        <div className="search-result-icon-wrapper"><Truck size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.orderNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Vendor: {item.vendor?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Goods Receipt Notes */}
                                    {searchResults.goodsReceiptNotes?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Goods Receipts (GRN)</div>
                                            <div className="search-results-list">
                                                {searchResults.goodsReceiptNotes.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('goodsReceiptNotes', item)}>
                                                        <div className="search-result-icon-wrapper"><ClipboardList size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.grnNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Vendor: {item.vendor?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Payments */}
                                    {searchResults.purchasePayments?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Purchase Payments</div>
                                            <div className="search-results-list">
                                                {searchResults.purchasePayments.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('purchasePayments', item)}>
                                                        <div className="search-result-icon-wrapper"><CreditCard size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.paymentNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Vendor: {item.vendor?.name || 'N/A'} • Amount: {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase Returns */}
                                    {searchResults.purchaseReturns?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Purchase Returns</div>
                                            <div className="search-results-list">
                                                {searchResults.purchaseReturns.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('purchaseReturns', item)}>
                                                        <div className="search-result-icon-wrapper"><Truck size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.returnNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Vendor: {item.vendor?.name || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* POS Invoices */}
                                    {searchResults.posInvoices?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">POS Invoices</div>
                                            <div className="search-results-list">
                                                {searchResults.posInvoices.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('posInvoices', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.invoiceNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Customer: {item.customer?.name || 'Walk-in'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Journal Vouchers */}
                                    {searchResults.journalVouchers?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Journal Vouchers</div>
                                            <div className="search-results-list">
                                                {searchResults.journalVouchers.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('journalVouchers', item)}>
                                                        <div className="search-result-icon-wrapper"><FileClock size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Notes: {item.notes || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Expenses */}
                                    {searchResults.expenses?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Expenses</div>
                                            <div className="search-results-list">
                                                {searchResults.expenses.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('expenses', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">{item.narration || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Incomes */}
                                    {searchResults.incomes?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Income</div>
                                            <div className="search-results-list">
                                                {searchResults.incomes.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('incomes', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">{item.narration || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contra Vouchers */}
                                    {searchResults.contras?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Contra Vouchers</div>
                                            <div className="search-results-list">
                                                {searchResults.contras.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('contras', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">{item.narration || 'N/A'} • Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Capital */}
                                    {searchResults.addCapitals?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Add Capital</div>
                                            <div className="search-results-list">
                                                {searchResults.addCapitals.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('addCapitals', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Drawing Capital */}
                                    {searchResults.drawingCapitals?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Drawing Capital</div>
                                            <div className="search-results-list">
                                                {searchResults.drawingCapitals.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('drawingCapitals', item)}>
                                                        <div className="search-result-icon-wrapper"><Receipt size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">Amount: {(item.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Journal Entries */}
                                    {searchResults.journalEntries?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Journal Entries</div>
                                            <div className="search-results-list">
                                                {searchResults.journalEntries.map((item) => (
                                                    <div key={item.id} className="search-result-item" onClick={() => handleResultClick('journalEntries', item)}>
                                                        <div className="search-result-icon-wrapper"><FileClock size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">{item.narration || 'Journal Entry'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* All Transactions - Voucher No. catch-all */}
                                    {searchResults.allTransactions?.length > 0 && (
                                        <div className="search-category-section">
                                            <div className="search-category-title">Transactions (Voucher No.)</div>
                                            <div className="search-results-list">
                                                {searchResults.allTransactions.map((item) => (
                                                    <div key={`txn-${item.id}`} className="search-result-item" onClick={() => handleResultClick('allTransactions', item)}>
                                                        <div className="search-result-icon-wrapper"><FileClock size={18} /></div>
                                                        <div className="search-result-content">
                                                            <div className="search-result-header">
                                                                <span className="search-result-title">{item.voucherNumber}</span>
                                                                <span className="search-result-meta">{item.voucherType} • {new Date(item.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className="search-result-subtitle">{item.narration || 'Transaction'} • {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </header>
    );
};

export default Navbar;
