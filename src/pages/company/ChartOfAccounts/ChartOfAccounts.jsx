import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Activity, Edit2, Trash2, Plus, FileText, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import './ChartOfAccounts.css';
import axiosInstance from '../../../api/axiosInstance';
import chartOfAccountsService from '../../../services/chartOfAccountsService';
import GetCompanyId from '../../../api/GetCompanyId';
import ExcelImportModal from '../../../components/common/ExcelImportModal/ExcelImportModal';
import { exportToExcel } from '../../../utils/excelService';

import { CompanyContext } from '../../../context/CompanyContext'; // Import Context
import { AuthContext } from '../../../context/AuthContext';

const ChartOfAccounts = () => {
    const navigate = useNavigate();
    const { formatCurrency } = React.useContext(CompanyContext); // Consume Context
    const { hasPermission } = React.useContext(AuthContext);
    const [chartData, setChartData] = useState([]);
    const [accountTypes, setAccountTypes] = useState([]); // Dynamic Types
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'list' or 'grid'

    // Filter States
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        searchName: ''
    });

    // Group Expansion State
    const [expandedGroups, setExpandedGroups] = useState({});
    const [expandedAccounts, setExpandedAccounts] = useState({});

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form States
    const [currentAccount, setCurrentAccount] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        accountType: '',
        isSubAccount: false,
        parentAccount: '',
        isEnabled: true,
        description: '',
        category: '',
        newCategoryName: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchChartOfAccounts = async () => {
        try {
            setLoading(true);
            const companyId = GetCompanyId();

            // Build query params for filtering
            const params = {
                companyId,
                startDate: filters.startDate,
                endDate: filters.endDate,
                search: filters.searchName
            };

            const [chartResponse, typesResponse] = await Promise.all([
                axiosInstance.get('/chart-of-accounts', { params }),
                chartOfAccountsService.getAccountTypes()
            ]);

            if (chartResponse.data.success) {
                setChartData(chartResponse.data.data);
            }
            if (typesResponse.success) {
                setAccountTypes(typesResponse.data);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch Chart of Accounts');
            toast.error(err.message || 'Failed to fetch accounts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChartOfAccounts();
    }, []);

    const toggleGroup = (typeName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [typeName]: !prev[typeName]
        }));
    };

    const toggleAccount = (accountId) => {
        setExpandedAccounts(prev => ({
            ...prev,
            [accountId]: !prev[accountId]
        }));
    };

    // --- Search & Filters ---

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSearch = () => {
        fetchChartOfAccounts();
        toast.success('Chart of Accounts updated');
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: '',
            searchName: ''
        });
        fetchChartOfAccounts();
        toast.success('Filters reset');
    };

    // --- Data processing ---

    const filterAccounts = (accounts) => {
        if (!filters.searchName) return accounts;
        return accounts.filter(acc =>
            acc.name.toLowerCase().includes(filters.searchName.toLowerCase())
        );
    };

    const buildAccountTree = (accounts) => {
        const map = {};
        // First pass: Create map entries
        accounts.forEach(acc => {
            map[acc.id] = { ...acc, children: [], parentName: '-' };
        });

        const roots = [];
        // Second pass: Build hierarchy and assign parent names
        accounts.forEach(acc => {
            const current = map[acc.id];
            if (acc.parentLedgerId && map[acc.parentLedgerId]) {
                const parent = map[acc.parentLedgerId];
                current.parentName = parent.name;
                parent.children.push(current);
            } else {
                roots.push(current);
            }
        });
        return roots;
    };

    const getGroupedAccounts = (groupType) => {
        if (!chartData) return { directLedgers: [], subGroups: {} };
        const group = chartData.find(g => g.type === groupType);
        if (!group) return { directLedgers: [], subGroups: {} };

        const directLedgers = (group.ledger && group.ledger.length > 0)
            ? buildAccountTree(filterAccounts(group.ledger.map(l => ({
                ...l,
                groupName: group.name,
                typeName: group.name
            }))))
            : [];

        const subGroups = {};
        // SubGroup Ledgers
        if (group.accountsubgroup) {
            group.accountsubgroup.forEach(sub => {
                if (sub.ledger && sub.ledger.length > 0) {
                    subGroups[sub.name] = buildAccountTree(filterAccounts(sub.ledger.map(l => ({
                        ...l,
                        groupName: group.name,
                        typeName: sub.name
                    }))));
                }
            });
        }
        return { directLedgers, subGroups };
    };

    const getAllFlattenedAccounts = () => {
        let all = [];
        chartData.forEach(group => {
            if (group.ledger) {
                all = [...all, ...group.ledger.map(l => ({ ...l, groupId: group.id, subGroupId: null }))];
            }
            if (group.accountsubgroup) {
                group.accountsubgroup.forEach(sub => {
                    if (sub.ledger) {
                        all = [...all, ...sub.ledger.map(l => ({ ...l, groupId: group.id, subGroupId: sub.id }))];
                    }
                });
            }
        });
        return all;
    };

    // --- Form Handlers ---

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
            code: '',
            accountType: '',
            isSubAccount: false,
            parentAccount: '',
            isEnabled: true,
            description: '',
            category: '',
            newCategoryName: '',
            date: new Date().toISOString().split('T')[0]
        });
        setCurrentAccount(null);
    };

    const handleCreateAccount = async () => {
        if (!formData.name || !formData.accountType) {
            toast.error('Please fill in required fields');
            return;
        }

        if (formData.category === 'new' && !formData.newCategoryName) {
            toast.error('Please enter a name for the new category');
            return;
        }

        const groupId = parseInt(formData.accountType);
        let subGroupId = formData.category && formData.category !== 'new' ? parseInt(formData.category) : null;
        let parentLedgerId = null;

        try {
            // Handle new category creation
            if (formData.category === 'new') {
                const subRes = await chartOfAccountsService.createSubGroup({
                    name: formData.newCategoryName,
                    groupId: groupId
                });
                if (subRes.success) {
                    subGroupId = subRes.data.id;
                } else {
                    throw new Error(subRes.message || 'Failed to create category');
                }
            }

            if (formData.isSubAccount && formData.parentAccount) {
                const parentVal = formData.parentAccount;
                if (parentVal.startsWith('subgroup-')) {
                    subGroupId = parseInt(parentVal.replace('subgroup-', ''));
                } else if (parentVal.startsWith('ledger-')) {
                    parentLedgerId = parseInt(parentVal.replace('ledger-', ''));
                    // Find this ledger to get its subGroupId
                    const allLedgers = getAllFlattenedAccounts();
                    const parentLedger = allLedgers.find(l => l.id === parentLedgerId);
                    if (parentLedger) {
                        subGroupId = parentLedger.subGroupId;
                    }
                }
            }

            const payload = {
                name: formData.name,
                groupId: groupId,
                subGroupId: subGroupId,
                openingBalance: 0,
                isControlAccount: false,
                isEnabled: formData.isEnabled,
                description: formData.description,
                parentLedgerId: parentLedgerId,
                date: formData.date
            };

            await chartOfAccountsService.createLedger(payload);
            toast.success('Account created successfully');
            setShowAddModal(false);
            resetForm();
            fetchChartOfAccounts();
        } catch (error) {
            console.error('Error creating account/category', error);
            toast.error(error.message || 'Failed to create account');
        }
    };

    const openEditModal = (account) => {
        setCurrentAccount(account);
        let parentAccountVal = '';
        if (account.parentLedgerId) {
            parentAccountVal = `ledger-${account.parentLedgerId}`;
        } else if (account.subGroupId) {
            parentAccountVal = `subgroup-${account.subGroupId}`;
        } else {
            parentAccountVal = `group-${account.groupId}`;
        }

        setFormData({
            name: account.name,
            code: account.id.toString(),
            accountType: account.groupId.toString(),
            isSubAccount: !!(account.parentLedgerId || account.subGroupId),
            parentAccount: parentAccountVal,
            isEnabled: account.isEnabled,
            description: account.description || '',
            category: account.subGroupId ? account.subGroupId.toString() : '',
            newCategoryName: '',
            date: (account.date || account.createdAt) ? new Date(account.date || account.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setShowEditModal(true);
    };

    const handleUpdateAccount = async () => {
        if (!currentAccount) return;

        if (formData.category === 'new' && !formData.newCategoryName) {
            toast.error('Please enter a name for the new category');
            return;
        }

        const groupId = parseInt(formData.accountType) || currentAccount.groupId;
        let subGroupId = formData.category && formData.category !== 'new' ? parseInt(formData.category) : null;
        let parentLedgerId = null;

        try {
            // Handle new category creation
            if (formData.category === 'new') {
                const subRes = await chartOfAccountsService.createSubGroup({
                    name: formData.newCategoryName,
                    groupId: groupId
                });
                if (subRes.success) {
                    subGroupId = subRes.data.id;
                } else {
                    throw new Error(subRes.message || 'Failed to create category');
                }
            }

            if (formData.isSubAccount && formData.parentAccount) {
                const parentVal = formData.parentAccount;
                if (parentVal.startsWith('subgroup-')) {
                    subGroupId = parseInt(parentVal.replace('subgroup-', ''));
                } else if (parentVal.startsWith('ledger-')) {
                    parentLedgerId = parseInt(parentVal.replace('ledger-', ''));
                    const allLedgers = getAllFlattenedAccounts();
                    const parentLedger = allLedgers.find(l => l.id === parentLedgerId);
                    if (parentLedger) {
                        subGroupId = parentLedger.subGroupId;
                    }
                }
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                isEnabled: formData.isEnabled,
                groupId: groupId,
                subGroupId: subGroupId,
                parentLedgerId: parentLedgerId,
                date: formData.date
            };

            await chartOfAccountsService.updateLedger(currentAccount.id, payload);
            toast.success('Account updated successfully');
            setShowEditModal(false);
            resetForm();
            fetchChartOfAccounts();
        } catch (error) {
            console.error('Error updating account/category', error);
            toast.error(error.message || 'Failed to update account');
        }
    };

    const handleDeleteAccount = async () => {
        if (!currentAccount) return;
        try {
            await chartOfAccountsService.deleteLedger(currentAccount.id);
            toast.success('Account deleted successfully');
            setShowDeleteModal(false);
            setCurrentAccount(null);
            fetchChartOfAccounts();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to delete account');
        }
    };

    const getParentAccountOptions = () => {
        if (!formData.accountType) return [];
        const targetGroupId = parseInt(formData.accountType);

        const group = chartData.find(g => g.id === targetGroupId);
        if (!group) return [];

        const options = [];

        // 1. The Group itself
        options.push({
            id: `group-${group.id}`,
            name: `${group.name} (Directly Under Group)`,
            level: 0
        });

        // 2. Sub-groups and their ledgers
        if (group.accountsubgroup) {
            group.accountsubgroup.forEach(sub => {
                options.push({
                    id: `subgroup-${sub.id}`,
                    name: `${sub.name} (Sub-group)`,
                    level: 1
                });

                // Ledgers under this sub-group
                const subLedgers = getAllFlattenedAccounts().filter(acc =>
                    acc.subGroupId === sub.id && acc.id !== currentAccount?.id
                );

                const buildSubTree = (ledgers) => {
                    const map = {};
                    ledgers.forEach(acc => { map[acc.id] = { ...acc, children: [] }; });
                    const roots = [];
                    ledgers.forEach(acc => {
                        if (acc.parentLedgerId && map[acc.parentLedgerId]) {
                            map[acc.parentLedgerId].children.push(map[acc.id]);
                        } else {
                            roots.push(map[acc.id]);
                        }
                    });
                    return roots;
                };

                const subTree = buildSubTree(subLedgers);
                const flatten = (nodes, level) => {
                    nodes.forEach(node => {
                        options.push({ id: `ledger-${node.id}`, name: node.name, level: level });
                        if (node.children && node.children.length > 0) { flatten(node.children, level + 1); }
                    });
                };
                flatten(subTree, 2);
            });
        }

        // 3. Ledgers directly under group (no sub-group)
        const directLedgers = getAllFlattenedAccounts().filter(acc =>
            acc.groupId === targetGroupId && !acc.subGroupId && acc.id !== currentAccount?.id
        );

        const buildDirectTree = (ledgers) => {
            const map = {};
            ledgers.forEach(acc => { map[acc.id] = { ...acc, children: [] }; });
            const roots = [];
            ledgers.forEach(acc => {
                if (acc.parentLedgerId && map[acc.parentLedgerId]) {
                    map[acc.parentLedgerId].children.push(map[acc.id]);
                } else {
                    roots.push(map[acc.id]);
                }
            });
            return roots;
        };

        const directTree = buildDirectTree(directLedgers);
        const flattenDirect = (nodes, level) => {
            nodes.forEach(node => {
                options.push({ id: `ledger-${node.id}`, name: node.name, level: level });
                if (node.children && node.children.length > 0) { flattenDirect(node.children, level + 1); }
            });
        };
        flattenDirect(directTree, 1);

        return options;
    };

    const AccountRow = ({ account, level = 0 }) => {
        const hasChildren = account.children && account.children.length > 0;
        const isExpanded = !!expandedAccounts[account.id];

        return (
            <>
                <tr className={level > 0 ? `indent-level-${level}` : ''}>
                    <td className={`Charts-of-Account-text-green indent-level-${level}`}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {hasChildren ? (
                                <ChevronRight
                                    size={14}
                                    style={{
                                        marginRight: '8px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                    }}
                                    onClick={() => toggleAccount(account.id)}
                                    className="no-select"
                                />
                            ) : (
                                <div style={{ width: '22px' }}></div>
                            )}
                            <span>{account.name}</span>
                        </div>
                    </td>
                    <td>{account.typeName || account.groupName}</td>
                    <td>{(account.date || account.createdAt) ? new Date(account.date || account.createdAt).toLocaleDateString() : '-'}</td>
                    {/* <td>{account.parentName || '-'}</td> */}
                    <td>{formatCurrency(account.currentBalance)}</td>
                    <td>
                        <span className={`Charts-of-Account-status-badge ${account.isEnabled ? 'Charts-of-Account-status-enabled' : 'Charts-of-Account-status-disabled'}`}>
                            {account.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </td>
                    <td>
                        <div className="Charts-of-Account-actions-cell">
                            <button
                                className="Charts-of-Account-action-btn-small Charts-of-Account-btn-warning"
                                data-tooltip="View Ledger"
                                onClick={() => navigate('/company/reports/ledger', { state: { accountId: account.id } })}
                            >
                                <FileText size={16} />
                            </button>
                {hasPermission('edit chart of accounts') && (
                                <button className="Charts-of-Account-action-btn-small Charts-of-Account-btn-info" data-tooltip="Edit" onClick={() => openEditModal(account)}>
                                    <Edit2 size={16} />
                                </button>
                            )}
                            {hasPermission('delete chart of accounts') && (
                                <button className="Charts-of-Account-action-btn-small Charts-of-Account-btn-danger" data-tooltip="Delete" onClick={() => { setCurrentAccount(account); setShowDeleteModal(true); }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </td>
                </tr>
                {hasChildren && isExpanded && account.children.map(child => (
                    <AccountRow key={child.id} account={child} level={level + 1} />
                ))}
            </>
        );
    };

    const AccountTable = ({ title, groupType }) => {
        const { directLedgers, subGroups } = getGroupedAccounts(groupType);
        const hasDirectData = directLedgers.length > 0;
        const hasSubGroupData = Object.keys(subGroups).length > 0;

        return (
            <div className={`Charts-of-Account-account-section-card group-${groupType.toLowerCase()}`}>
                <div className="Charts-of-Account-section-header">
                    <h3 className="Charts-of-Account-section-title">{title}</h3>
                </div>
                <div className="Charts-of-Account-table-responsive">
                    <table className="Charts-of-Account-accounts-table">
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>TYPE</th>
                                <th>DATE</th>
                                {/* <th>PARENT ACCOUNT NAME</th> */}
                                <th>BALANCE</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hasDirectData || hasSubGroupData ? (
                                <>
                                    {/* Direct Ledgers - shown directly without group row */}
                                    {directLedgers.map(account => (
                                        <AccountRow key={account.id} account={account} />
                                    ))}

                                    {/* Sub-groups - shown with toggleable group rows */}
                                    {Object.entries(subGroups).map(([typeName, accounts]) => (
                                        <React.Fragment key={typeName}>
                                            <tr
                                                className="Charts-of-Account-group-header-row"
                                                onClick={() => toggleGroup(typeName)}
                                            >
                                                <td colSpan="6">
                                                    <div className="Charts-of-Account-group-name-cell">
                                                        <ChevronRight
                                                            size={18}
                                                            className={`Charts-of-Account-chevron-icon ${expandedGroups[typeName] ? 'expanded' : ''}`}
                                                        />
                                                        {typeName}
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedGroups[typeName] && accounts.map(account => (
                                                <AccountRow key={account.id} account={account} />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                <tr>
                                                                    <td colSpan="6" className="text-center p-4">No accounts found</td>
                                                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const AccountGridView = () => {
        return (
            <div className="Charts-of-Account-grid-view">
                <div className="Charts-of-Account-group-section group-assets">
                    <h2 className="Charts-of-Account-group-main-title">Assets</h2>
                    <div className="Charts-of-Account-subgroups-container">
                        {renderGridGroup('ASSETS')}
                    </div>
                </div>
                <div className="Charts-of-Account-group-section group-liabilities">
                    <h2 className="Charts-of-Account-group-main-title">Liabilities</h2>
                    <div className="Charts-of-Account-subgroups-container">
                        {renderGridGroup('LIABILITIES')}
                    </div>
                </div>
                <div className="Charts-of-Account-group-section group-equity">
                    <h2 className="Charts-of-Account-group-main-title">Equity</h2>
                    <div className="Charts-of-Account-subgroups-container">
                        {renderGridGroup('EQUITY')}
                    </div>
                </div>
                <div className="Charts-of-Account-group-section group-income">
                    <h2 className="Charts-of-Account-group-main-title">Income</h2>
                    <div className="Charts-of-Account-subgroups-container">
                        {renderGridGroup('INCOME')}
                    </div>
                </div>
                <div className="Charts-of-Account-group-section group-expenses">
                    <h2 className="Charts-of-Account-group-main-title">Expenses</h2>
                    <div className="Charts-of-Account-subgroups-container">
                        {renderGridGroup('EXPENSES')}
                    </div>
                </div>
            </div>
        );
    };

    const renderGridGroup = (groupType) => {
        const { directLedgers, subGroups } = getGroupedAccounts(groupType);

        return (
            <>
                {/* Direct Ledgers as General */}
                {directLedgers.length > 0 && (
                    <div className="Charts-of-Account-grid-subgroup">
                          {/* <h3 className="Charts-of-Account-grid-subgroup-title">General</h3> */}
                        <h3 className="Charts-of-Account-grid-subgroup-title">{groupType}</h3>
                        <div className="Charts-of-Account-grid-cards">
                            {directLedgers.map(acc => <RecursiveAccountCard key={acc.id} account={acc} />)}
                        </div>
                    </div>
                )}

                {Object.entries(subGroups).map(([subName, accounts]) => (
                    <div key={subName} className="Charts-of-Account-grid-subgroup">
                        <h3 className="Charts-of-Account-grid-subgroup-title">{subName}</h3>
                        <div className="Charts-of-Account-grid-cards">
                            {accounts.map(acc => <RecursiveAccountCard key={acc.id} account={acc} />)}
                        </div>
                    </div>
                ))}
            </>
        );
    };

    const RecursiveAccountCard = ({ account, level = 0 }) => {
        return (
            <>
                <AccountCard account={account} level={level} />
                {account.children && account.children.length > 0 && (
                    account.children.map(child => (
                        <RecursiveAccountCard key={child.id} account={child} level={level + 1} />
                    ))
                )}
            </>
        );
    };

    const AccountCard = ({ account, level = 0 }) => (
        <div
            className="Charts-of-Account-card"
            onClick={() => openEditModal(account)}
            style={{
                marginLeft: `${level * 20}px`,
                width: level > 0 ? `calc(100% - ${level * 20}px)` : '100%',
                opacity: level > 0 ? 0.9 : 1
            }}
        >
            <div
                className="Charts-of-Account-card-accent"
                style={{
                    backgroundColor: level === 0 
                        ? 'var(--section-color)' 
                        : level === 1 
                            ? 'var(--section-color-dark)' 
                            : 'var(--section-color-darkest)'
                }}
            ></div>
            <div className="Charts-of-Account-card-content">
                <div className="Charts-of-Account-card-top">
                    <span className="Charts-of-Account-card-code">{account.id}</span>
                    <span className="Charts-of-Account-card-balance">{formatCurrency(account.balance || account.currentBalance || 0)}</span>
                </div>
                <h4 className="Charts-of-Account-card-name" style={{ fontSize: level > 0 ? '0.95rem' : '1.05rem' }}>
                    {account.name}
                </h4>
                {(account.date || account.createdAt) && (
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                        Created: {new Date(account.date || account.createdAt).toLocaleDateString()}
                    </div>
                )}
            </div>
            <div className="Charts-of-Account-card-actions">
                <button
                    className="Charts-of-Account-card-action-btn view"
                    onClick={(e) => { e.stopPropagation(); navigate('/company/reports/ledger', { state: { accountId: account.id } }); }}
                    title="View Ledger"
                >
                    <FileText size={14} />
                </button>
                {hasPermission('edit chart of accounts') && (
                    <button
                        className="Charts-of-Account-card-action-btn edit"
                        onClick={(e) => { e.stopPropagation(); openEditModal(account); }}
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                )}
                {hasPermission('delete chart of accounts') && (
                    <button
                        className="Charts-of-Account-card-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); setCurrentAccount(account); setShowDeleteModal(true); }}
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );

    if (loading) return <div className="p-8">Loading Chart of Accounts...</div>

    const handleExportExcel = () => {
        const allAccounts = getAllFlattenedAccounts();
        if (!allAccounts.length) {
            toast.error('No accounts available to export');
            return;
        }
        const exportData = allAccounts.map(a => ({
            'Account Code': a.id,
            'Account Name': a.name,
            'Group / Type': a.typeName || a.groupName || '',
            'Sub-Group / Category': a.subGroupName || '',
            'Status': a.isEnabled ? 'Enabled' : 'Disabled',
            'Current Balance': a.currentBalance || 0,
            'Description': a.description || ''
        }));
        exportToExcel(exportData, 'Chart_Of_Accounts_Export.xlsx', 'ChartOfAccounts');
        toast.success(`Exported ${exportData.length} accounts to Excel.`);
    };

    return (
        <div className="Charts-of-Account-chart-of-accounts-page">
            <div className="Charts-of-Account-page-header">
                <h1 className="Charts-of-Account-page-title">Charts of Account</h1>
                <div className="d-flex align-items-center gap-2">
                    <button
                        style={{
                            padding: '8px 14px',
                            background: '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onClick={handleExportExcel}
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                    {hasPermission('create chart of accounts') && (
                        <button
                            style={{
                                padding: '8px 14px',
                                background: '#334155',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onClick={() => setShowImportModal(true)}
                        >
                            <FileSpreadsheet size={16} />
                            Import Accounts
                        </button>
                    )}
                    <div className="Charts-of-Account-view-toggle">
                        <button
                            className={`Charts-of-Account-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <FileText size={18} />
                        </button>
                        <button
                            className={`Charts-of-Account-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <Activity size={18} />
                        </button>
                    </div>
                    {hasPermission('create chart of accounts') && (
                        <button className="Charts-of-Account-btn-add" onClick={() => { resetForm(); setShowAddModal(true); }}>
                            <Plus size={18} />
                            Add new account
                        </button>
                    )}
                </div>
            </div>

            <div className="Charts-of-Account-filter-card">
                <div className="Charts-of-Account-filter-group">
                    <label className="Charts-of-Account-filter-label">Start Date</label>
                    <input
                        type="date"
                        className="Charts-of-Account-filter-input"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="Charts-of-Account-filter-group">
                    <label className="Charts-of-Account-filter-label">End Date</label>
                    <input
                        type="date"
                        className="Charts-of-Account-filter-input"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="Charts-of-Account-filter-group search-group">
                    <label className="Charts-of-Account-filter-label">Search by Name</label>
                    <input
                        type="text"
                        className="Charts-of-Account-filter-input"
                        placeholder="Type account name..."
                        name="searchName"
                        value={filters.searchName}
                        onChange={handleFilterChange}
                    />
                </div>
                <div className="d-flex gap-2 w-100-mobile" style={{ alignSelf: 'flex-end', paddingBottom: '5px' }}>
                    <button
                        className="Charts-of-Account-filter-btn Charts-of-Account-btn-search"
                        data-tooltip="Search"
                        onClick={handleSearch}
                    >
                        <Search size={20} />
                    </button>
                    <button
                        className="Charts-of-Account-filter-btn Charts-of-Account-btn-reset"
                        style={{ backgroundColor: '#ff5252' }}
                        data-tooltip="Reset"
                        onClick={handleReset}
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    <AccountTable title="Assets" groupType="ASSETS" />
                    <AccountTable title="Liabilities" groupType="LIABILITIES" />
                    <AccountTable title="Equity" groupType="EQUITY" />
                    <AccountTable title="Income" groupType="INCOME" />
                    <AccountTable title="Expenses" groupType="EXPENSES" />
                </>
            ) : (
                <AccountGridView />
            )}

            {/* Create Account Modal */}
            {showAddModal && (
                <div className="Charts-of-Account-modal-overlay">
                    <div className="Charts-of-Account-modal-content">
                        <div className="Charts-of-Account-modal-header">
                            <h2 className="Charts-of-Account-modal-title">Create New Account</h2>
                            <button className="Charts-of-Account-close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="Charts-of-Account-modal-body">
                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Name<span className="Charts-of-Account-text-red">*</span></label>
                                <input
                                    type="text"
                                    className="Charts-of-Account-form-input"
                                    placeholder="Enter Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="Charts-of-Account-form-row">
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width">
                                    <label className="Charts-of-Account-form-label">Account Type<span className="Charts-of-Account-text-red">*</span></label>
                                    <select
                                        className="Charts-of-Account-form-select"
                                        name="accountType"
                                        value={formData.accountType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select</option>
                                        {accountTypes.map((group, index) => (
                                            <option key={index} value={group.groupId}>{group.groupName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width">
                                    <label className="Charts-of-Account-form-label">Category</label>
                                    <select
                                        className="Charts-of-Account-form-select"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        disabled={!formData.accountType}
                                    >
                                        <option value="">Select Category</option>
                                        {formData.accountType && accountTypes.find(g => g.groupId === parseInt(formData.accountType))?.accounts.map((sub, i) => (
                                            <option key={i} value={sub.accountTypeId}>{sub.accountTypeName}</option>
                                        ))}
                                        <option value="new">+ Add New Category</option>
                                    </select>
                                </div>
                            </div>

                            {formData.category === 'new' && (
                                <div className="Charts-of-Account-form-group">
                                    <label className="Charts-of-Account-form-label">New Category Name<span className="Charts-of-Account-text-red">*</span></label>
                                    <input
                                        type="text"
                                        className="Charts-of-Account-form-input"
                                        placeholder="Enter New Category Name"
                                        name="newCategoryName"
                                        value={formData.newCategoryName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            )}

                            <div className="Charts-of-Account-form-row" style={{ alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width" style={{ marginBottom: 0 }}>
                                    <label className="Charts-of-Account-checkbox-container">
                                        <input
                                            type="checkbox"
                                            name="isSubAccount"
                                            checked={formData.isSubAccount}
                                            onChange={handleInputChange}
                                        />
                                        <span className="Charts-of-Account-checkmark"></span>
                                        Make this a sub-account
                                    </label>
                                </div>
                                {formData.isSubAccount && (
                                    <div className="Charts-of-Account-form-group Charts-of-Account-half-width" style={{ marginBottom: 0 }}>
                                        <label className="Charts-of-Account-form-label">Parent Account</label>
                                        <select
                                            className="Charts-of-Account-form-select"
                                            name="parentAccount"
                                            value={formData.parentAccount}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select Parent Account</option>
                                            {getParentAccountOptions().map((opt, i) => (
                                                <option key={i} value={opt.id}>
                                                    {'\u00A0'.repeat(opt.level * 4)}{opt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Is Enabled</label>
                                <label className="Charts-of-Account-switch">
                                    <input
                                        type="checkbox"
                                        name="isEnabled"
                                        checked={formData.isEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <span className="Charts-of-Account-slider Charts-of-Account-round"></span>
                                </label>
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Date</label>
                                <input
                                    type="date"
                                    className="Charts-of-Account-form-input"
                                    name="date"
                                    value={formData.date || ''}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Description</label>
                                <textarea
                                    className="Charts-of-Account-form-textarea"
                                    placeholder="Enter Description"
                                    rows="3"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                        <div className="Charts-of-Account-modal-footer">
                            <button className="Charts-of-Account-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="Charts-of-Account-btn-save" onClick={handleCreateAccount}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Account Modal */}
            {showEditModal && (
                <div className="Charts-of-Account-modal-overlay">
                    <div className="Charts-of-Account-modal-content">
                        <div className="Charts-of-Account-modal-header">
                            <h2 className="Charts-of-Account-modal-title">Edit Account</h2>
                            <button className="Charts-of-Account-close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="Charts-of-Account-modal-body">
                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Name<span className="Charts-of-Account-text-red">*</span></label>
                                <input
                                    type="text"
                                    className="Charts-of-Account-form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="Charts-of-Account-form-row">
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width">
                                    <label className="Charts-of-Account-form-label">Account Type<span className="Charts-of-Account-text-red">*</span></label>
                                    <select
                                        className="Charts-of-Account-form-select"
                                        name="accountType"
                                        value={formData.accountType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select</option>
                                        {accountTypes.map((group, index) => (
                                            <option key={index} value={group.groupId}>{group.groupName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width">
                                    <label className="Charts-of-Account-form-label">Category</label>
                                    <select
                                        className="Charts-of-Account-form-select"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        disabled={!formData.accountType}
                                    >
                                        <option value="">Select Category</option>
                                        {formData.accountType && accountTypes.find(g => g.groupId === parseInt(formData.accountType))?.accounts.map((sub, i) => (
                                            <option key={i} value={sub.accountTypeId}>{sub.accountTypeName}</option>
                                        ))}
                                        <option value="new">+ Add New Category</option>
                                    </select>
                                </div>
                            </div>

                            {formData.category === 'new' && (
                                <div className="Charts-of-Account-form-group">
                                    <label className="Charts-of-Account-form-label">New Category Name<span className="Charts-of-Account-text-red">*</span></label>
                                    <input
                                        type="text"
                                        className="Charts-of-Account-form-input"
                                        placeholder="Enter New Category Name"
                                        name="newCategoryName"
                                        value={formData.newCategoryName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            )}

                            <div className="Charts-of-Account-form-row" style={{ alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div className="Charts-of-Account-form-group Charts-of-Account-half-width" style={{ marginBottom: 0 }}>
                                    <label className="Charts-of-Account-checkbox-container">
                                        <input
                                            type="checkbox"
                                            name="isSubAccount"
                                            checked={formData.isSubAccount}
                                            onChange={handleInputChange}
                                        />
                                        <span className="Charts-of-Account-checkmark"></span>
                                        Make this a sub-account
                                    </label>
                                </div>
                                {formData.isSubAccount && (
                                    <div className="Charts-of-Account-form-group Charts-of-Account-half-width" style={{ marginBottom: 0 }}>
                                        <label className="Charts-of-Account-form-label">Parent Account</label>
                                        <select
                                            className="Charts-of-Account-form-select"
                                            name="parentAccount"
                                            value={formData.parentAccount}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select Parent Account</option>
                                            {getParentAccountOptions().map((opt, i) => (
                                                <option key={i} value={opt.id}>
                                                    {'\u00A0'.repeat(opt.level * 4)}{opt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Is Enabled</label>
                                <label className="Charts-of-Account-switch">
                                    <input
                                        type="checkbox"
                                        name="isEnabled"
                                        checked={formData.isEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <span className="Charts-of-Account-slider Charts-of-Account-round"></span>
                                </label>
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Date</label>
                                <input
                                    type="date"
                                    className="Charts-of-Account-form-input"
                                    name="date"
                                    value={formData.date || ''}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="Charts-of-Account-form-group">
                                <label className="Charts-of-Account-form-label">Description</label>
                                <textarea
                                    className="Charts-of-Account-form-textarea"
                                    rows="3"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                        <div className="Charts-of-Account-modal-footer">
                            <button className="Charts-of-Account-btn-cancel" style={{ backgroundColor: '#6c757d', color: 'white' }} onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="Charts-of-Account-btn-save" onClick={handleUpdateAccount}>Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="Charts-of-Account-modal-overlay">
                    <div className="Charts-of-Account-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="Charts-of-Account-modal-header">
                            <h2 className="Charts-of-Account-modal-title">Delete Account</h2>
                            <button className="Charts-of-Account-close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="Charts-of-Account-modal-body">
                            <p>Are you sure you want to delete this account?</p>
                            {currentAccount && <p className="font-bold">{currentAccount.name}</p>}
                        </div>
                        <div className="Charts-of-Account-modal-footer">
                            <button className="Charts-of-Account-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="Charts-of-Account-btn-save" style={{ backgroundColor: '#ff5252' }} onClick={handleDeleteAccount}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Universal Excel Import Modal */}
            <ExcelImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                entityType="chartOfAccounts"
                onSuccess={() => {
                    fetchChartOfAccounts();
                    setShowImportModal(false);
                }}
            />
        </div>
    );
};

export default ChartOfAccounts;