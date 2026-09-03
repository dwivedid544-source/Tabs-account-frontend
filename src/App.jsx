import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { LanguageProvider } from './context/LanguageContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import UserDashboard from './pages/user/UserDashboard';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Company from './pages/superadmin/Company/Company';
import { Toaster } from 'react-hot-toast';
import './index.css';

import Plans from './pages/superadmin/Plans/Plans';
import RequestPlan from './pages/superadmin/RequestPlan/RequestPlan';
import PlanRequests from './pages/superadmin/PlanRequests/PlanRequests';
import Payments from './pages/superadmin/Payments/Payments';
import ManagePasswords from './pages/superadmin/ManagePasswords/ManagePasswords';
import CompanyDashboard from './pages/company/Dashboard/CompanyDashboard';
import ChartOfAccounts from './pages/company/ChartOfAccounts/ChartOfAccounts';
import Customers from './pages/company/Customers/Customers';
import Vendors from './pages/company/Vendors/Vendors';
import VendorDetail from './pages/company/Vendors/VendorDetail';
import Transactions from './pages/company/Accounts/Transactions/Transactions';
import Warehouse from './pages/company/Inventory/WarehouseDetails/Warehouse';
import WarehouseDetails from './pages/company/Inventory/WarehouseDetails/WarehouseDetails';
import UOM from './pages/company/Inventory/UOM/UOM';
import Inventory from './pages/company/Inventory/ProductInventory/Inventory';
import ProductDetails from './pages/company/Inventory/ProductInventory/ProductDetails';
import Services from './pages/company/Inventory/Services/Services';
import StockTransfer from './pages/company/Inventory/StockTransfer/StockTransfer';
import InventoryAdjustment from './pages/company/Inventory/InventoryAdjustment/InventoryAdjustment';
import CreateVoucher from './pages/company/Voucher/CreateVoucher';
import Expenses from './pages/company/Expenses/Expenses';
import Income from './pages/company/Accounts/Income/Income';
import ContraVoucher from './pages/company/Accounts/ContraVoucher/ContraVoucher';
import AddCapital from './pages/company/Voucher/AddCapital';
import DrawingCapital from './pages/company/Voucher/DrawingCapital';
import UserList from './pages/company/Users/UserList';
import RoleList from './pages/company/Users/RoleList';
import Quotation from './pages/company/Sales/Quotation/Quotation';
import SalesOrder from './pages/company/Sales/SalesOrder/SalesOrder';
import DeliveryChallan from './pages/company/Sales/DeliveryChallan/DeliveryChallan';
import Invoice from './pages/company/Sales/Invoice/Invoice';
import Payment from './pages/company/Sales/Payment/Payment';

import SalesReturn from './pages/company/Sales/SalesReturn/SalesReturn';
import PurchaseQuotation from './pages/company/Purchases/PurchaseQuotation/PurchaseQuotation';
import PurchaseOrder from './pages/company/Purchases/PurchaseOrder/PurchaseOrder';
import GoodsReceipt from './pages/company/Purchases/GoodsReceipt/GoodsReceipt';
import PurchaseBill from './pages/company/Purchases/PurchaseBill/PurchaseBill';
import PurchaseReturn from './pages/company/Purchases/PurchaseReturn/PurchaseReturn';
import PurchasePayment from './pages/company/Purchases/Payment/Payment';
import POS from './pages/company/POS/POS';
import AllPOSInvoice from './pages/company/POS/AllPOSInvoice';
import CustomerDetail from './pages/company/Customers/CustomerDetail';
import SalesReport from './pages/company/Reports/SalesReport/SalesReport';
import PurchaseReport from './pages/company/Reports/PurchaseReport/PurchaseReport';
import POSReport from './pages/company/Reports/POSReport/POSReport';
import TaxReport from './pages/company/Reports/TaxReport/TaxReport';
import InventorySummary from './pages/company/Reports/InventorySummary/InventorySummary';
import CashFlow from './pages/company/Reports/CashFlow/CashFlow';
import ProfitLoss from './pages/company/Reports/ProfitLoss/ProfitLoss';
import BalanceSheet from './pages/company/Reports/BalanceSheet/BalanceSheet';
import VatReport from './pages/company/Reports/VatReport/VatReport';
import DayBook from './pages/company/Reports/DayBook/DayBook';
import JournalEntries from './pages/company/Reports/JournalEntries/JournalEntries';
import LedgerReport from './pages/company/Reports/LedgerReport/LedgerReport';
import TrialBalance from './pages/company/Reports/TrialBalance/TrialBalance';
import AgentReport from './pages/company/Reports/AgentReport/AgentReport';
import CompanySettings from './pages/company/Settings/CompanySettings/CompanySettings';
import PasswordRequests from './pages/company/Settings/PasswordRequests/PasswordRequests';
import ProfileSettings from './pages/company/Settings/ProfileSettings/ProfileSettings';
import AuditLogs from './pages/company/Settings/AuditLogs';
import BankTransfer from './pages/company/Banking/BankTransfer/BankTransfer';
import PublicInvoiceView from './pages/company/Sales/Invoice/PublicInvoiceView';
import CurrencyRevaluation from './pages/company/Accounts/CurrencyRevaluation/CurrencyRevaluation';
import FiscalYearRollover from './pages/company/Accounts/FiscalYearRollover/FiscalYearRollover';
import FixedAssets from './pages/company/Accounts/FixedAssets/FixedAssets';
import Budgets from './pages/company/Accounts/Budgets/Budgets';
import RecurringTransactions from './pages/company/Accounts/RecurringTransactions/RecurringTransactions';
import AgingReport from './pages/company/Reports/AgingReport/AgingReport';
import DepartmentalReport from './pages/company/Reports/DepartmentalReport/DepartmentalReport';
import Integrations from './pages/company/Settings/Integrations/Integrations';
import PeriodLock from './pages/company/Settings/PeriodLock/PeriodLock';
import BankingOverview from './pages/company/Banking/BankingOverview';
import StatementImport from './pages/company/Banking/StatementImport';
import TransactionMatching from './pages/company/Banking/TransactionMatching';
import BankReconciliation from './pages/company/Banking/BankReconciliation';

// Website Components
import WebsiteLayout from './components/Website/Layout/WebsiteLayout';
import Overview from './components/Website/Pages/Overview';
import Features from './components/Website/Pages/Features';
import Pricing from './components/Website/Pages/Pricing';
import Aboutus from './components/Website/Pages/Aboutus';
import Contact from './components/Website/Pages/Contact';
import Careers from './components/Website/Pages/Careers';
import HowItWorks from './components/Website/Pages/HowItWorks';
import PrivacyPolicy from './components/Website/Pages/PrivacyPolicy';
import TermsConditions from './components/Website/Pages/TermsConditions';

function App() {
  React.useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <CompanyProvider>
          <Router>
            <Toaster position="top-right" containerStyle={{ zIndex: 9999999 }} />
            <Routes>
              {/* Website Routes */}
              <Route path="/" element={<WebsiteLayout />}>
                <Route index element={<Overview />} />
                <Route path="overview" element={<Overview />} />
                <Route path="features" element={<Features />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="aboutus" element={<Aboutus />} />
                <Route path="contact" element={<Contact />} />
                <Route path="careers" element={<Careers />} />
                <Route path="how-it-works" element={<HowItWorks />} />
                <Route path="privacy-policy" element={<PrivacyPolicy />} />
                <Route path="terms-conditions" element={<TermsConditions />} />
              </Route>

              <Route path="/login" element={<Login />} />

              {/* Public Viewing Routes */}
              <Route path="/view/invoice/:id" element={<PublicInvoiceView type="invoice" />} />
              <Route path="/view/pos/:id" element={<PublicInvoiceView type="pos" />} />

              {/* Super Admin Layout & Nested Routes */}
              <Route path="/superadmin/*" element={<SuperAdminLayout />}>
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="company" element={<Company />} />
                <Route path="plan" element={<Plans />} />
                <Route path="plan-requests" element={<PlanRequests />} />
                <Route path="payments" element={<Payments />} />
                <Route path="passwords" element={<ManagePasswords />} />
              </Route>

              <Route path="/user/*" element={<SuperAdminLayout />}>
                <Route path="dashboard" element={<UserDashboard />} />
              </Route>

              {/* Company Dashboard Routes */}
              <Route path="/company/*" element={<SuperAdminLayout />}>
                <Route path="dashboard" element={<CompanyDashboard />} />
                <Route path="accounts/charts" element={<ChartOfAccounts />} />
                <Route path="accounts/customers" element={<Customers />} />
                <Route path="accounts/customers/:id" element={<CustomerDetail />} />
                <Route path="accounts/vendors" element={<Vendors />} />
                <Route path="accounts/vendors/:id" element={<VendorDetail />} />
                <Route path="accounts/transactions" element={<Transactions />} />
                <Route path="accounts/currency-revaluation" element={<CurrencyRevaluation />} />
                <Route path="accounts/fiscal-year-rollover" element={<FiscalYearRollover />} />
                <Route path="accounts/fixed-assets" element={<FixedAssets />} />
                <Route path="accounts/budgets" element={<Budgets />} />
                <Route path="accounts/recurring" element={<RecurringTransactions />} />
                <Route path="inventory/warehouse" element={<Warehouse />} />
                <Route path="inventory/warehouse/:id" element={<WarehouseDetails />} />
                <Route path="inventory/uom" element={<UOM />} />
                <Route path="inventory/products" element={<Inventory />} />
                <Route path="inventory/products/:id" element={<ProductDetails />} />
                <Route path="inventory/services" element={<Services />} />
                <Route path="inventory/transfer" element={<StockTransfer />} />
                <Route path="inventory/adjustment" element={<InventoryAdjustment />} />
                <Route path="sales/quotation" element={<Quotation />} />
                <Route path="sales/order" element={<SalesOrder />} />
                <Route path="sales/challan" element={<DeliveryChallan />} />
                <Route path="sales/invoice" element={<Invoice />} />
                <Route path="sales/payment" element={<Payment />} />
                <Route path="sales/return" element={<SalesReturn />} />
                <Route path="purchases/quotation" element={<PurchaseQuotation />} />
                <Route path="purchases/order" element={<PurchaseOrder />} />
                <Route path="purchases/receipt" element={<GoodsReceipt />} />
                <Route path="purchases/bill" element={<PurchaseBill />} />
                <Route path="purchases/return" element={<PurchaseReturn />} />
                <Route path="purchases/payment" element={<PurchasePayment />} />
                <Route path="pos" element={<POS />} />
                <Route path="pos/edit/:id" element={<POS />} />
                <Route path="pos/all-invoices" element={<AllPOSInvoice />} />
                <Route path="voucher/create" element={<CreateVoucher />} />
                <Route path="voucher/expenses" element={<Expenses />} />
                <Route path="voucher/income" element={<Income />} />
                <Route path="voucher/contra" element={<ContraVoucher />} />
                <Route path="voucher/add-capital" element={<AddCapital />} />
                <Route path="voucher/drawing-capital" element={<DrawingCapital />} />
                <Route path="users/list" element={<UserList />} />
                <Route path="users/roles" element={<RoleList />} />
                <Route path="reports/sales" element={<SalesReport />} />
                <Route path="reports/purchase" element={<PurchaseReport />} />
                <Route path="reports/pos" element={<POSReport />} />
                <Route path="reports/tax" element={<TaxReport />} />
                <Route path="reports/inventory-summary" element={<InventorySummary />} />
                <Route path="reports/cash-flow" element={<CashFlow />} />
                <Route path="reports/profit-loss" element={<ProfitLoss />} />
                <Route path="reports/balance-sheet" element={<BalanceSheet />} />
                <Route path="reports/vat" element={<VatReport />} />
                <Route path="reports/aging" element={<AgingReport />} />
                <Route path="reports/departmental-pnl" element={<DepartmentalReport />} />
                <Route path="reports/daybook" element={<DayBook />} />
                <Route path="reports/journal" element={<JournalEntries />} />
                <Route path="reports/ledger" element={<LedgerReport />} />
                <Route path="reports/trial-balance" element={<TrialBalance />} />
                <Route path="reports/agent-performance" element={<AgentReport />} />
                <Route path="settings/info" element={<CompanySettings />} />
                <Route path="settings/password-requests" element={<PasswordRequests />} />
                <Route path="settings/profile" element={<ProfileSettings />} />
                <Route path="settings/audit-logs" element={<AuditLogs />} />
                <Route path="settings/period-lock" element={<PeriodLock />} />
                <Route path="settings/integrations" element={<Integrations />} />
                <Route path="banking" element={<BankingOverview />} />
                <Route path="banking/overview" element={<BankingOverview />} />
                <Route path="banking/import" element={<StatementImport />} />
                <Route path="banking/matching" element={<TransactionMatching />} />
                <Route path="banking/reconcile" element={<BankReconciliation />} />
                <Route path="bank-transfer" element={<BankTransfer />} />
              </Route>
            </Routes>
          </Router>
        </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;