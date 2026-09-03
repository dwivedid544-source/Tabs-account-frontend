import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    Home, Building2, Ticket, CreditCard, Key,
    Users, ShoppingCart, Truck, FileText, ClipboardList,
    BarChart3, Settings, ChevronDown, ChevronRight, Box,
    Calculator, Receipt, UserCog, X, Landmark
} from 'lucide-react';
import './Sidebar.css';
import logo from '../../assets/tab-accounts-logo.png';

const Sidebar = ({ isOpen, role = 'superadmin', permissions = [], planModules = [], isAdmin = false, onClose }) => {
    const location = useLocation();
    const [expandedGroups, setExpandedGroups] = useState({});

    const [expandedSubGroups, setExpandedSubGroups] = useState({});

    const getItemSubItems = (item) => {
        if (item.subItems) return item.subItems;
        if (item.subSections) return item.subSections.flatMap(sec => sec.items);
        return [];
    };

    // Automatically expand the group that contains the active path
    useEffect(() => {
        Object.keys(menuItems).forEach(roleKey => {
            menuItems[roleKey].forEach(item => {
                const subItemsList = getItemSubItems(item);
                if (subItemsList.length > 0) {
                    const isActive = subItemsList.some(sub => location.pathname.startsWith(sub.path));
                    if (isActive) {
                        setExpandedGroups(prev => ({
                            ...prev,
                            [item.label]: true
                        }));
                    }
                }
                if (item.subSections) {
                    item.subSections.forEach(sec => {
                        const isSubActive = sec.items.some(sub => location.pathname.startsWith(sub.path));
                        if (isSubActive) {
                            setExpandedSubGroups(prev => ({
                                ...prev,
                                [`${item.label}:${sec.category}`]: true
                            }));
                        }
                    });
                }
            });
        });
    }, [location.pathname]);

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const toggleSubGroup = (key) => {
        setExpandedSubGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const menuItems = {
        superadmin: [
            { path: '/superadmin/dashboard', label: 'Dashboard', icon: Home },
            { path: '/superadmin/company', label: 'Company', icon: Building2 },
            { path: '/superadmin/plan', label: 'Plans & Pricing', icon: Ticket },
            { path: '/superadmin/plan-requests', label: 'Request Plan', icon: ClipboardList },
            { path: '/superadmin/payments', label: 'Payments', icon: CreditCard },
            { path: '/superadmin/passwords', label: 'Manage Passwords', icon: Key },
        ],
        company: [
            {
                path: isAdmin ? '/company/dashboard' : '/user/dashboard',
                label: isAdmin ? 'Dashboard' : 'User Dashboard',
                icon: Home
            },
            {
                label: 'Accounts',
                icon: Calculator,
                moduleName: 'Account',
                subItems: [
                    { path: '/company/accounts/charts', label: 'Charts of Accounts', perm: 'view charts of accounts' },
                    { path: '/company/accounts/customers', label: 'Customers/Debtors', perm: 'view customers' },
                    { path: '/company/accounts/vendors', label: 'Vendors/Creditors', perm: 'view vendors' },
                    { path: '/company/bank-transfer', label: 'Bank Transfer', perm: 'view charts of accounts' },
                    { path: '/company/accounts/currency-revaluation', label: 'Currency Revaluation', perm: 'view charts of accounts' },
                    { path: '/company/accounts/fiscal-year-rollover', label: 'Fiscal Year Rollover', perm: 'view charts of accounts' },
                    { path: '/company/accounts/fixed-assets', label: 'Fixed Assets', perm: 'view charts of accounts' },
                    { path: '/company/accounts/budgets', label: 'Budgets & Forecasts', perm: 'view charts of accounts' },
                    { path: '/company/accounts/recurring', label: 'Recurring Transactions', perm: 'view charts of accounts' },
                ]
            },
            {
                label: 'Banking',
                icon: Landmark,
                moduleName: 'Account',
                subItems: [
                    { path: '/company/banking/overview', label: 'Bank Accounts', perm: 'view charts of accounts' },
                    { path: '/company/banking/import', label: 'Statement Import', perm: 'view charts of accounts' },
                    { path: '/company/banking/matching', label: 'Transaction Matching', perm: 'view charts of accounts' },
                    { path: '/company/banking/reconcile', label: 'Bank Reconciliation', perm: 'view charts of accounts' },
                    { path: '/company/bank-transfer', label: 'Bank Transfer', perm: 'view charts of accounts' },
                ]
            },
            {
                label: 'Inventory',
                icon: Box,
                moduleName: 'Inventory',
                subItems: [
                    { path: '/company/inventory/warehouse', label: 'Warehouse', perm: 'view warehouse' },
                    { path: '/company/inventory/uom', label: 'Unit of measure', perm: 'view uom' },
                    { path: '/company/inventory/products', label: 'Product & Inventory', perm: 'view products' },
                    { path: '/company/inventory/services', label: 'Service', perm: 'view services' },
                    { path: '/company/inventory/transfer', label: 'StockTransfer', perm: 'view stock transfer' },
                    { path: '/company/inventory/adjustment', label: 'Inventory Adjustment', perm: 'view inventory adjustment' },
                ]
            },
            {
                label: 'Sales',
                icon: ShoppingCart,
                moduleName: 'Sales',
                subItems: [
                    { path: '/company/sales/quotation', label: 'Quotation', perm: 'view sales quotation' },
                    { path: '/company/sales/order', label: 'Sales Order', perm: 'view sales order' },
                    { path: '/company/sales/challan', label: 'Delivery Challan', perm: 'view delivery challan' },
                    { path: '/company/sales/invoice', label: 'Invoice', perm: 'view sales invoice' },
                    { path: '/company/sales/payment', label: 'Payment', perm: 'view sales payment' },
                    { path: '/company/sales/return', label: 'Sales Return', perm: 'view sales return' },
                ]
            },
            {
                label: 'Purchases',
                icon: Truck,
                moduleName: 'Purchase',
                subItems: [
                    { path: '/company/purchases/quotation', label: 'Purchase Quotation', perm: 'view purchase quotation' },
                    { path: '/company/purchases/order', label: 'Purchase Order', perm: 'view purchase order' },
                    { path: '/company/purchases/receipt', label: 'Goods Receipt', perm: 'view goods receipt' },
                    { path: '/company/purchases/bill', label: 'Bill', perm: 'view purchase bill' },
                    { path: '/company/purchases/payment', label: 'Payment', perm: 'view purchase payment' },
                    { path: '/company/purchases/return', label: 'Purchase Return', perm: 'view purchase return' },
                ]
            },
            {
                path: '/company/pos',
                label: 'POS Screen',
                icon: ShoppingCart,
                moduleName: 'POS',
                perm: 'view pos'
            },
            {
                label: 'Voucher',
                icon: Receipt,
                subItems: [
                    { path: '/company/voucher/create', label: 'Journal Voucher', perm: 'view journal voucher' },
                    { path: '/company/voucher/expenses', label: 'Expenses', perm: 'view expenses' },
                    { path: '/company/voucher/income', label: 'Income', perm: 'view income' },
                    { path: '/company/voucher/contra', label: 'Contra Voucher', perm: 'view contra voucher' },
                    { path: '/company/voucher/add-capital', label: 'Add Capital', perm: 'view journal voucher' },
                    { path: '/company/voucher/drawing-capital', label: 'Drawing Capital', perm: 'view journal voucher' },
                ]
            },
            {
                label: 'Reports',
                icon: BarChart3,
                subSections: [
                    {
                        category: 'Sales & Purchase',
                        icon: ShoppingCart,
                        items: [
                            { path: '/company/reports/sales', label: 'Sales Report', perm: 'view reports', moduleName: 'Sales' },
                            { path: '/company/reports/purchase', label: 'Purchase Report', perm: 'view reports', moduleName: 'Purchase' },
                            { path: '/company/reports/agent-performance', label: 'Agent Report', perm: 'view reports', moduleName: 'Sales' },
                            { path: '/company/reports/pos', label: 'POS Report', perm: 'view reports', moduleName: 'POS' },
                            { path: '/company/reports/vat', label: 'VAT Report', perm: 'view reports', moduleName: 'Sales' },
                        ]
                    },
                    {
                        category: 'Inventory',
                        icon: Box,
                        items: [
                            { path: '/company/reports/inventory-summary', label: 'Inventory Summary', perm: 'view reports', moduleName: 'Inventory' },
                        ]
                    },
                    {
                        category: 'Financial Reports',
                        icon: Calculator,
                        items: [
                            { path: '/company/reports/balance-sheet', label: 'Balance Sheet', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/cash-flow', label: 'Cash Flow', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/profit-loss', label: 'Profit & Loss', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/departmental-pnl', label: 'Departmental P&L', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/aging', label: 'Aging Summary (AR/AP)', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/trial-balance', label: 'Trial Balance', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/ledger', label: 'Ledger', perm: 'view reports', moduleName: 'Account' },
                        ]
                    },
                    {
                        category: 'Accounting Reports',
                        icon: FileText,
                        items: [
                            { path: '/company/reports/daybook', label: 'Day Book', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/reports/journal', label: 'Journal Entries', perm: 'view reports', moduleName: 'Account' },
                            { path: '/company/accounts/transactions', label: 'All Transactions', perm: 'view reports', moduleName: 'Account' },
                        ]
                    }
                ]
            },
            {
                label: 'User Management',
                icon: Users,
                moduleName: 'User Management',
                subItems: [
                    { path: '/company/users/roles', label: 'Roles & Permissions', perm: 'view role' },
                    { path: '/company/users/list', label: 'Users', perm: 'view user' },
                ]
            },
            {
                label: 'Settings',
                icon: Settings,
                subItems: [
                    { path: '/company/settings/info', label: 'Company Info', perm: 'view settings' },
                    { path: '/company/settings/integrations', label: 'CRM Integrations', perm: 'view settings' },
                    { path: '/company/settings/password-requests', label: 'Password Requests', perm: 'view settings' },
                    { path: '/company/settings/audit-logs', label: 'Audit Logs', perm: 'view settings' },
                ]
            }
        ]
    };

    const checkPerm = (perm) => {
        if (!perm) return true;

        // Direct match
        if (permissions.includes(perm)) return true;

        // Manage fallback & View fallback
        const parts = perm.split(' ');
        if (parts.length >= 2) {
            const action = parts[0];
            const moduleName = parts.slice(1).join(' ');

            const manageKey = `manage ${moduleName}`;
            if (permissions.includes(manageKey)) return true;

            if (action === 'view' || action === 'show') {
                const hasAnyAccess = permissions.some(p => p.endsWith(` ${moduleName}`));
                if (hasAnyAccess) return true;
            }
        }

        // Backward compatibility
        if (perm === 'show sales' && (permissions.includes('view sales') || permissions.includes('manage sales'))) return true;

        return false;
    };

    const hasPermission = (item) => {
        if (role === 'superadmin') return true;

        if (item.moduleName) {
            const module = planModules.find(m =>
                (m.name || m.module_name || "").toLowerCase() === item.moduleName.toLowerCase()
            );
            if (module && !module.enabled) return false;
        }

        if (isAdmin) return true;

        const subItemsList = getItemSubItems(item);
        if (!item.perm && subItemsList.length === 0) return true;

        if (subItemsList.length > 0) {
            if (item.perm && !checkPerm(item.perm)) return false;

            const visibleChildren = subItemsList.filter(sub => {
                if (sub.moduleName) {
                    const module = planModules.find(m =>
                        (m.name || m.module_name || "").toLowerCase() === sub.moduleName.toLowerCase()
                    );
                    if (module && !module.enabled) return false;
                }
                return !sub.perm || checkPerm(sub.perm);
            });
            return visibleChildren.length > 0;
        }

        return checkPerm(item.perm);
    };

    const handleItemClick = () => {
        if (window.innerWidth <= 991 && onClose) {
            onClose();
        }
    };

    const renderMenu = (items) => {
        return items.map((item, index) => {
            if (!hasPermission(item)) return null;

            if (item.subSections) {
                const visibleSections = item.subSections.map(sec => {
                    const filteredItems = sec.items.filter(sub => {
                        if (sub.moduleName) {
                            const module = planModules.find(m =>
                                (m.name || m.module_name || "").toLowerCase() === sub.moduleName.toLowerCase()
                            );
                            if (module && !module.enabled) return false;
                        }
                        return isAdmin || !sub.perm || checkPerm(sub.perm);
                    });
                    return { ...sec, items: filteredItems };
                }).filter(sec => sec.items.length > 0);

                if (visibleSections.length === 0) return null;

                const allVisibleItems = visibleSections.flatMap(sec => sec.items);
                const isExpanded = expandedGroups[item.label];
                const isActive = allVisibleItems.some(sub => location.pathname.startsWith(sub.path));

                return (
                    <div key={index} className="menu-group">
                        <div
                            className={`menu-item has-submenu ${isActive ? 'active-parent' : ''}`}
                            onClick={() => toggleGroup(item.label)}
                        >
                            <div className="icon-label">
                                <div className="menu-icon-wrapper">
                                    {item.icon && <item.icon size={18} />}
                                </div>
                                <span className="menu-text">{item.label}</span>
                            </div>
                            <div className="chevron-wrapper">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </div>

                        <div className={`submenu ${isExpanded ? 'expanded' : ''}`}>
                            {visibleSections.map((sec, secIndex) => {
                                const subKey = `${item.label}:${sec.category}`;
                                const isSubExpanded = Boolean(expandedSubGroups[subKey]);
                                const isSubActive = sec.items.some(sub => location.pathname.startsWith(sub.path));

                                return (
                                    <div key={secIndex} className="submenu-section mb-1">
                                        <div
                                            className={`submenu-item reports-sub-header d-flex align-items-center justify-content-between ${isSubActive ? 'active-parent-sub' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubGroup(subKey);
                                            }}
                                        >
                                            <span>{sec.category}</span>
                                            {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>

                                        {isSubExpanded && (
                                            <div className="submenu-nested-list ps-3 my-1">
                                                {sec.items.map((sub, subIndex) => (
                                                    <NavLink
                                                        key={subIndex}
                                                        to={sub.path}
                                                        className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
                                                        onClick={handleItemClick}
                                                    >
                                                        {sub.label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            if (item.subItems) {
                // Filter subItems again for rendering
                const visibleSubItems = item.subItems.filter(sub => {
                    // Check module gating for sub-item
                    if (sub.moduleName) {
                        const module = planModules.find(m =>
                            (m.name || m.module_name || "").toLowerCase() === sub.moduleName.toLowerCase()
                        );
                        if (module && !module.enabled) return false;
                    }
                    return isAdmin || !sub.perm || checkPerm(sub.perm);
                });

                if (visibleSubItems.length === 0) return null;

                const isExpanded = expandedGroups[item.label];
                const isActive = visibleSubItems.some(sub => location.pathname.startsWith(sub.path));

                return (
                    <div key={index} className="menu-group">
                        <div
                            className={`menu-item has-submenu ${isActive ? 'active-parent' : ''}`}
                            onClick={() => toggleGroup(item.label)}
                        >
                            <div className="icon-label">
                                <div className="menu-icon-wrapper">
                                    {item.icon && <item.icon size={18} />}
                                </div>
                                <span className="menu-text">{item.label}</span>
                            </div>
                            <div className="chevron-wrapper">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </div>

                        <div className={`submenu ${isExpanded ? 'expanded' : ''}`}>
                            {visibleSubItems.map((sub, subIndex) => (
                                <NavLink
                                    key={subIndex}
                                    to={sub.path}
                                    className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
                                    onClick={handleItemClick}
                                >
                                    {sub.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                );
            }

            return (
                <NavLink
                    key={index}
                    to={item.path}
                    className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                    onClick={handleItemClick}
                >
                    <div className="menu-icon-wrapper">
                        {item.icon && <item.icon size={18} />}
                    </div>
                    <span className="menu-text">{item.label}</span>
                </NavLink>
            );
        });
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
            <div className="sidebar-header d-flex justify-content-between align-items-center notranslate" translate="no" style={{ height: 'auto', overflow: 'visible' }}>
                <div className="logo mb-0 pb-0 notranslate" translate="no">
                    <span className="logo-short notranslate" translate="no">T<span className="logo-accent notranslate">A</span></span>

                    <span className="logo-full notranslate" translate="no">
                        <img src={logo} alt="TAB ACCOUNTS" id="tab-accounts-logo" className="notranslate" style={{ height: '48px', maxHeight: '52px', objectFit: 'contain' }} />
                    </span>
                </div>
                {/* Close Button for Mobile */}
                <button
                    className="btn btn-link text-dark d-lg-none p-0"
                    onClick={onClose}
                    style={{ fontSize: '1.5rem', lineHeight: 1 }}
                >
                    <X size={24} />
                </button>
            </div>

            <div className="sidebar-menu">
                {renderMenu(menuItems[role] || [])}
            </div>
        </div>
    );
};

export default Sidebar;
