import * as XLSX from 'xlsx';

/**
 * Predefined Entity Schemas for Excel Import / Export & Sample Templates
 */
export const ENTITY_SCHEMAS = {
    products: {
        name: 'Products & Inventory',
        fileName: 'Products_Template.xlsx',
        fields: [
            { key: 'name', label: 'Product Name', required: true, example: 'Dell XPS 15 Laptop' },
            { key: 'sku', label: 'SKU / Code', required: false, example: 'DELL-XPS-15' },
            { key: 'type', label: 'Item Type (Goods / Service)', required: false, example: 'Goods' },
            { key: 'categoryName', label: 'Category', required: false, example: 'Electronics' },
            { key: 'purchasePrice', label: 'Purchase Price', required: true, example: 1200.00, type: 'number' },
            { key: 'sellingPrice', label: 'Selling Price', required: true, example: 1550.00, type: 'number' },
            { key: 'taxRate', label: 'Tax Rate %', required: false, example: 23, type: 'number' },
            { key: 'openingStock', label: 'Opening Stock Qty', required: false, example: 10, type: 'number' },
            { key: 'warehouseName', label: 'Warehouse / Location', required: false, example: 'Main Warehouse' },
            { key: 'uomName', label: 'Unit of Measure', required: false, example: 'PCS' },
            { key: 'barcode', label: 'Barcode', required: false, example: '890123456789' },
            { key: 'description', label: 'Description', required: false, example: 'Intel i7, 16GB RAM, 512GB SSD' }
        ],
        sampleData: [
            {
                'Product Name': 'Dell XPS 15 Laptop',
                'SKU / Code': 'DELL-XPS-15',
                'Item Type (Goods / Service)': 'Goods',
                'Category': 'Computers & Laptops',
                'Purchase Price': 1200.00,
                'Selling Price': 1550.00,
                'Tax Rate %': 23,
                'Opening Stock Qty': 10,
                'Warehouse / Location': 'Main Warehouse',
                'Unit of Measure': 'PCS',
                'Barcode': '890123456789',
                'Description': '15.6 inch OLED, 16GB RAM, 512GB SSD'
            },
            {
                'Product Name': 'Logitech MX Master 3S Mouse',
                'SKU / Code': 'LOGI-MX3S',
                'Item Type (Goods / Service)': 'Goods',
                'Category': 'Accessories',
                'Purchase Price': 75.00,
                'Selling Price': 110.00,
                'Tax Rate %': 23,
                'Opening Stock Qty': 25,
                'Warehouse / Location': 'Main Warehouse',
                'Unit of Measure': 'PCS',
                'Barcode': '890987654321',
                'Description': 'Wireless ergonomic mouse'
            },
            {
                'Product Name': 'Annual Cloud Backup Support',
                'SKU / Code': 'SERV-CLOUD-01',
                'Item Type (Goods / Service)': 'Service',
                'Category': 'IT Services',
                'Purchase Price': 0.00,
                'Selling Price': 350.00,
                'Tax Rate %': 23,
                'Opening Stock Qty': 0,
                'Warehouse / Location': '',
                'Unit of Measure': 'YEAR',
                'Barcode': '',
                'Description': 'Cloud storage & daily automated backup service'
            }
        ]
    },

    customers: {
        name: 'Customers & Clients',
        fileName: 'Customers_Template.xlsx',
        fields: [
            { key: 'name', label: 'Customer Name', required: true, example: 'Apex Technologies Ltd' },
            { key: 'companyName', label: 'Company / Business Name', required: false, example: 'Apex Technologies Ltd' },
            { key: 'email', label: 'Email Address', required: false, example: 'billing@apextech.com' },
            { key: 'phone', label: 'Phone Number', required: false, example: '+353 1 234 5678' },
            { key: 'taxNumber', label: 'TRN / VAT Number', required: false, example: 'IE987654321' },
            { key: 'address', label: 'Billing Address', required: false, example: '12 Innovation Way, Tech Park' },
            { key: 'city', label: 'City', required: false, example: 'Dublin' },
            { key: 'state', label: 'State / County', required: false, example: 'Dublin 2' },
            { key: 'zipCode', label: 'Zip / Postal Code', required: false, example: 'D02 X285' },
            { key: 'country', label: 'Country', required: false, example: 'Ireland' },
            { key: 'creditPeriod', label: 'Credit Period (Days)', required: false, example: 30, type: 'number' },
            { key: 'creditLimit', label: 'Credit Limit', required: false, example: 10000.00, type: 'number' },
            { key: 'openingBalance', label: 'Opening Balance', required: false, example: 0.00, type: 'number' },
            { key: 'balanceType', label: 'Balance Type (Debit / Credit)', required: false, example: 'Debit' }
        ],
        sampleData: [
            {
                'Customer Name': 'Apex Technologies Ltd',
                'Company / Business Name': 'Apex Tech International',
                'Email Address': 'accounts@apextech.com',
                'Phone Number': '+353 1 234 5678',
                'TRN / VAT Number': 'IE987654321',
                'Billing Address': '12 Innovation Way, Silicon Docks',
                'City': 'Dublin',
                'State / County': 'Dublin 2',
                'Zip / Postal Code': 'D02 X285',
                'Country': 'Ireland',
                'Credit Period (Days)': 30,
                'Credit Limit': 15000.00,
                'Opening Balance': 1250.00,
                'Balance Type (Debit / Credit)': 'Debit'
            },
            {
                'Customer Name': 'Horizon Trading Co',
                'Company / Business Name': 'Horizon Trading LLC',
                'Email Address': 'finance@horizontrading.com',
                'Phone Number': '+971 4 888 9999',
                'TRN / VAT Number': '100234567800003',
                'Billing Address': 'Business Bay Tower, Office 402',
                'City': 'Dubai',
                'State / County': 'Dubai',
                'Zip / Postal Code': '00000',
                'Country': 'United Arab Emirates',
                'Credit Period (Days)': 15,
                'Credit Limit': 50000.00,
                'Opening Balance': 0.00,
                'Balance Type (Debit / Credit)': 'Debit'
            }
        ]
    },

    vendors: {
        name: 'Vendors & Suppliers',
        fileName: 'Vendors_Template.xlsx',
        fields: [
            { key: 'name', label: 'Vendor Name', required: true, example: 'Global Components Supplier' },
            { key: 'companyName', label: 'Company Name', required: false, example: 'Global Components Inc' },
            { key: 'email', label: 'Email Address', required: false, example: 'sales@globalcomponents.com' },
            { key: 'phone', label: 'Phone Number', required: false, example: '+44 20 7946 0912' },
            { key: 'taxNumber', label: 'TRN / VAT Number', required: false, example: 'GB123456789' },
            { key: 'address', label: 'Address', required: false, example: '88 Logistics Blvd, Distribution Center' },
            { key: 'city', label: 'City', required: false, example: 'London' },
            { key: 'state', label: 'State / County', required: false, example: 'Greater London' },
            { key: 'zipCode', label: 'Zip / Postal Code', required: false, example: 'EC1A 1BB' },
            { key: 'country', label: 'Country', required: false, example: 'United Kingdom' },
            { key: 'creditPeriod', label: 'Payment Terms (Days)', required: false, example: 30, type: 'number' },
            { key: 'openingBalance', label: 'Opening Balance', required: false, example: 0.00, type: 'number' },
            { key: 'balanceType', label: 'Balance Type (Debit / Credit)', required: false, example: 'Credit' }
        ],
        sampleData: [
            {
                'Vendor Name': 'Global Components Supplier',
                'Company Name': 'Global Components UK Ltd',
                'Email Address': 'orders@globalcomponents.com',
                'Phone Number': '+44 20 7946 0912',
                'TRN / VAT Number': 'GB123456789',
                'Address': '88 Logistics Blvd',
                'City': 'London',
                'State / County': 'Greater London',
                'Zip / Postal Code': 'EC1A 1BB',
                'Country': 'United Kingdom',
                'Payment Terms (Days)': 30,
                'Opening Balance': 2500.00,
                'Balance Type (Debit / Credit)': 'Credit'
            }
        ]
    },

    chartOfAccounts: {
        name: 'Chart of Accounts',
        fileName: 'Chart_Of_Accounts_Template.xlsx',
        fields: [
            { key: 'code', label: 'Account Code', required: true, example: '1010' },
            { key: 'name', label: 'Account Name', required: true, example: 'Petty Cash' },
            { key: 'accountType', label: 'Account Type (Asset / Liability / Equity / Income / Expense)', required: true, example: 'Asset' },
            { key: 'parentAccountCode', label: 'Parent Account Code', required: false, example: '1000' },
            { key: 'openingBalance', label: 'Opening Balance', required: false, example: 500.00, type: 'number' },
            { key: 'balanceType', label: 'Balance Type (Debit / Credit)', required: false, example: 'Debit' },
            { key: 'description', label: 'Description', required: false, example: 'Main office petty cash' }
        ],
        sampleData: [
            {
                'Account Code': '1010',
                'Account Name': 'Petty Cash - Main Office',
                'Account Type (Asset / Liability / Equity / Income / Expense)': 'Asset',
                'Parent Account Code': '1000',
                'Opening Balance': 500.00,
                'Balance Type (Debit / Credit)': 'Debit',
                'Description': 'Petty cash for office day-to-day expenses'
            },
            {
                'Account Code': '2010',
                'Account Name': 'VAT Payable (Output VAT)',
                'Account Type (Asset / Liability / Equity / Income / Expense)': 'Liability',
                'Parent Account Code': '2000',
                'Opening Balance': 0.00,
                'Balance Type (Debit / Credit)': 'Credit',
                'Description': 'Sales VAT collected on invoices'
            },
            {
                'Account Code': '4010',
                'Account Name': 'Software Development Revenue',
                'Account Type (Asset / Liability / Equity / Income / Expense)': 'Income',
                'Parent Account Code': '4000',
                'Opening Balance': 0.00,
                'Balance Type (Debit / Credit)': 'Credit',
                'Description': 'Revenue from custom software contracts'
            },
            {
                'Account Code': '5010',
                'Account Name': 'Office Rent Expense',
                'Account Type (Asset / Liability / Equity / Income / Expense)': 'Expense',
                'Parent Account Code': '5000',
                'Opening Balance': 0.00,
                'Balance Type (Debit / Credit)': 'Debit',
                'Description': 'Monthly premises rent'
            }
        ]
    },

    salesInvoices: {
        name: 'Sales Invoices',
        fileName: 'Sales_Invoices_Template.xlsx',
        fields: [
            { key: 'invoiceNumber', label: 'Invoice #', required: true, example: 'INV-2026-001' },
            { key: 'customerName', label: 'Customer Name / Email', required: true, example: 'Apex Technologies Ltd' },
            { key: 'date', label: 'Invoice Date (YYYY-MM-DD)', required: true, example: '2026-09-01' },
            { key: 'dueDate', label: 'Due Date (YYYY-MM-DD)', required: false, example: '2026-10-01' },
            { key: 'productName', label: 'Product Name / SKU', required: true, example: 'Dell XPS 15 Laptop' },
            { key: 'quantity', label: 'Quantity', required: true, example: 2, type: 'number' },
            { key: 'unitRate', label: 'Unit Rate', required: true, example: 1550.00, type: 'number' },
            { key: 'discountPercent', label: 'Discount %', required: false, example: 5, type: 'number' },
            { key: 'taxRate', label: 'Tax Rate %', required: false, example: 23, type: 'number' },
            { key: 'currency', label: 'Currency', required: false, example: 'EUR' },
            { key: 'notes', label: 'Notes', required: false, example: 'Delivered to headquarters' }
        ],
        sampleData: [
            {
                'Invoice #': 'INV-2026-001',
                'Customer Name / Email': 'Apex Technologies Ltd',
                'Invoice Date (YYYY-MM-DD)': '2026-09-01',
                'Due Date (YYYY-MM-DD)': '2026-10-01',
                'Product Name / SKU': 'Dell XPS 15 Laptop',
                'Quantity': 2,
                'Unit Rate': 1550.00,
                'Discount %': 5,
                'Tax Rate %': 23,
                'Currency': 'EUR',
                'Notes': 'Standard sales invoice'
            },
            {
                'Invoice #': 'INV-2026-001',
                'Customer Name / Email': 'Apex Technologies Ltd',
                'Invoice Date (YYYY-MM-DD)': '2026-09-01',
                'Due Date (YYYY-MM-DD)': '2026-10-01',
                'Product Name / SKU': 'Logitech MX Master 3S Mouse',
                'Quantity': 2,
                'Unit Rate': 110.00,
                'Discount %': 0,
                'Tax Rate %': 23,
                'Currency': 'EUR',
                'Notes': 'Accessories on same invoice'
            }
        ]
    },

    purchaseBills: {
        name: 'Purchase Bills',
        fileName: 'Purchase_Bills_Template.xlsx',
        fields: [
            { key: 'billNumber', label: 'Bill / Ref #', required: true, example: 'BILL-SUP-8801' },
            { key: 'vendorName', label: 'Vendor Name / Email', required: true, example: 'Global Components Supplier' },
            { key: 'date', label: 'Bill Date (YYYY-MM-DD)', required: true, example: '2026-09-01' },
            { key: 'dueDate', label: 'Due Date (YYYY-MM-DD)', required: false, example: '2026-10-01' },
            { key: 'productName', label: 'Product Name / SKU', required: true, example: 'Dell XPS 15 Laptop' },
            { key: 'quantity', label: 'Quantity', required: true, example: 5, type: 'number' },
            { key: 'unitRate', label: 'Unit Rate', required: true, example: 1200.00, type: 'number' },
            { key: 'taxRate', label: 'Tax Rate %', required: false, example: 23, type: 'number' },
            { key: 'currency', label: 'Currency', required: false, example: 'EUR' },
            { key: 'notes', label: 'Notes', required: false, example: 'Supplier batch delivery' }
        ],
        sampleData: [
            {
                'Bill / Ref #': 'BILL-SUP-8801',
                'Vendor Name / Email': 'Global Components Supplier',
                'Bill Date (YYYY-MM-DD)': '2026-09-01',
                'Due Date (YYYY-MM-DD)': '2026-10-01',
                'Product Name / SKU': 'Dell XPS 15 Laptop',
                'Quantity': 5,
                'Unit Rate': 1200.00,
                'Tax Rate %': 23,
                'Currency': 'EUR',
                'Notes': 'Stock replenishment'
            }
        ]
    },

    manualJournals: {
        name: 'Manual Journal Entries',
        fileName: 'Journal_Entries_Template.xlsx',
        fields: [
            { key: 'entryNumber', label: 'Entry #', required: true, example: 'JV-2026-001' },
            { key: 'date', label: 'Entry Date (YYYY-MM-DD)', required: true, example: '2026-09-01' },
            { key: 'accountCode', label: 'Account Code / Name', required: true, example: '5010' },
            { key: 'debit', label: 'Debit Amount', required: false, example: 1500.00, type: 'number' },
            { key: 'credit', label: 'Credit Amount', required: false, example: 0.00, type: 'number' },
            { key: 'description', label: 'Line Description / Memo', required: false, example: 'September Office Rent' },
            { key: 'reference', label: 'Reference / Voucher', required: false, example: 'RENT-SEP-26' }
        ],
        sampleData: [
            {
                'Entry #': 'JV-2026-001',
                'Entry Date (YYYY-MM-DD)': '2026-09-01',
                'Account Code / Name': '5010 - Office Rent Expense',
                'Debit Amount': 1500.00,
                'Credit Amount': 0.00,
                'Line Description / Memo': 'September Rent Expense',
                'Reference / Voucher': 'RENT-SEP-26'
            },
            {
                'Entry #': 'JV-2026-001',
                'Entry Date (YYYY-MM-DD)': '2026-09-01',
                'Account Code / Name': '1020 - Main Bank Account',
                'Debit Amount': 0.00,
                'Credit Amount': 1500.00,
                'Line Description / Memo': 'Direct Debit Payment for Rent',
                'Reference / Voucher': 'RENT-SEP-26'
            }
        ]
    }
};

/**
 * Download Pre-formatted Sample Template for Any Entity
 */
export const downloadSampleTemplate = (entityType) => {
    const schema = ENTITY_SCHEMAS[entityType];
    if (!schema) {
        console.error(`Unknown entity type for template: ${entityType}`);
        return;
    }

    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();

    // 2. Format Sample Data Sheet
    const ws = XLSX.utils.json_to_sheet(schema.sampleData);

    // 3. Set column widths automatically
    const colWidths = schema.fields.map(field => {
        const headerLen = field.label.length;
        const maxLen = Math.max(headerLen, 16);
        return { wch: maxLen + 4 };
    });
    ws['!cols'] = colWidths;

    // 4. Instructions Sheet
    const instructionsData = [
        { 'Step / Rule': '1. Required Columns', 'Details': 'Columns marked with an asterisk (*) in documentation are mandatory.' },
        { 'Step / Rule': '2. Date Format', 'Details': 'Please use YYYY-MM-DD format for all dates (e.g. 2026-09-01).' },
        { 'Step / Rule': '3. Numerical Values', 'Details': 'Do not include currency symbols ($, €, £) in price and quantity columns.' },
        { 'Step / Rule': '4. Duplicate Resolution', 'Details': 'During import, you can choose whether to update existing records or skip duplicates.' },
        { 'Step / Rule': '5. Multiple Lines', 'Details': 'For Invoices, Bills, and Journals, keep the same Document/Entry Number for multiple item lines.' }
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 70 }];

    // Append sheets
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Guidelines');

    // 5. Download file
    XLSX.writeFile(wb, schema.fileName);
};

/**
 * Universal Excel Exporter with Formatting & Metadata
 */
export const exportToExcel = (data, fileName = 'Export.xlsx', sheetName = 'Sheet1', options = {}) => {
    if (!data || !data.length) {
        console.warn('No data provided to exportToExcel');
        return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-calculate column widths
    const headers = Object.keys(data[0] || {});
    const colWidths = headers.map(header => {
        let maxLen = header.length;
        data.forEach(row => {
            const cellVal = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
            if (cellVal.length > maxLen) {
                maxLen = cellVal.length;
            }
        });
        return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Trigger file download
    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, finalFileName);
};

/**
 * Parse uploaded Excel or CSV File into Array of JSON Objects
 */
export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

                // Read the first data sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to array of objects
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
                resolve(rawJson);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);

        reader.readAsArrayBuffer(file);
    });
};
