import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { OperationalProvider } from './contexts/OperationalContext';
import ToastContainer from './components/Toast';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WarehouseList from './pages/WarehouseList';
import StockEntry from './pages/StockEntry';
import ShopList from './pages/ShopList';
import MedicineList from './pages/MedicineList';
import MedicineDetails from './pages/MedicineDetails';
import MedicineAdd from './pages/MedicineAdd';
import MedicineEdit from './pages/MedicineEdit';
import EditMedicalShop from './pages/EditMedicalShop';
import ShopAdd from './pages/ShopAdd';
import ApplicationSettings from './pages/ApplicationSettings';
import SystemSettings from './pages/SystemSettings';
import ExpiryLossReport from './pages/ExpiryLossReport';
import SalesReports from './pages/SalesReports';
import TaxReports from './pages/TaxReports';
import ReturnRefund from './pages/ReturnRefund';
import UsersList from './pages/UsersList';
import CustomersList from './pages/CustomersList';
import EmployeesList from './pages/EmployeesList';
import AttendanceMarker from './pages/attendance/AttendanceMarker';
import AttendanceReport from './pages/attendance/AttendanceReport';
import SalaryManagement from './pages/SalaryManagement';
import InvoicesList from './pages/InvoicesList';
import DispatchesList from './pages/DispatchesList';
import DispatchCreate from './pages/DispatchCreate';
import DispatchDetails from './pages/DispatchDetails';
import PurchaseRequestsList from './pages/PurchaseRequestsList';
import POSBilling from './pages/POSBilling';
import NotificationsPage from './pages/NotificationsPage';
import InventoryPage from './pages/InventoryPage';
import WarehouseAdd from './pages/WarehouseAdd';
import WarehouseEdit from './pages/WarehouseEdit';

// New Super Admin Dashboard Pages
import WarehouseShopMapping from './pages/WarehouseShopMapping';
import RackMaster from './pages/RackMaster';
import InventoryOversight from './pages/InventoryOversight';
import StockAdjustment from './pages/StockAdjustment'; // New page
import AuditLogsPage from './pages/AuditLogsPage';
import LoginActivityPage from './pages/LoginActivityPage';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import CategoriesPage from './pages/CategoriesPage';
import UnitsPage from './pages/UnitsPage';
import HSNCodesPage from './pages/HSNCodesPage';
import GSTVATPage from './pages/GSTVATPage';
import GSTSlabsPage from './pages/GSTSlabsPage';
import SuppliersPage from './pages/SuppliersPage';
import AdjustmentReasonsPage from './pages/AdjustmentReasonsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import MedicineTypesPage from './pages/MedicineTypesPage';
import BrandsPage from './pages/BrandsPage';
import ManufacturersPage from './pages/ManufacturersPage';

// Auth guard component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();


  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  // If we have a user (loaded successfully) OR a token (optimistic check while loading was true),
  // but here loading is false, so user should be set if token was valid.
  // Checking user is safer than checking token after loading is finished.
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Role-based home page: 
// SAME features for all roles - difference is entity context resolution
// Super Admin: Dashboard with entity selector (explicit selection)
// Other roles: Dashboard filtered by their assigned entity (auto-applied)
function RoleBasedHome() {
  // All roles see Dashboard - entity context is handled inside each module
  return <Dashboard />;
}

import SessionExpiredModal from './components/SessionExpiredModal';

function App() {
  return (
    <UserProvider>
      <PermissionProvider>
        <MasterDataProvider>
          <OperationalProvider>
            <ToastContainer />
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }>
                  <Route index element={<RoleBasedHome />} />

                  {/* Users & Access */}
                  <Route path="users" element={<UsersList />} />
                  <Route path="roles" element={<RolesPermissionsPage />} />
                  <Route path="login-activity" element={<LoginActivityPage />} />

                  {/* Warehouses */}
                  <Route path="warehouses" element={<WarehouseList />} />
                  <Route path="warehouses/add" element={<WarehouseAdd />} />
                  <Route path="warehouses/edit/:id" element={<WarehouseEdit />} />
                  <Route path="warehouses/stock" element={<StockEntry />} />

                  {/* Shops */}
                  <Route path="shops" element={<ShopList />} />
                  <Route path="shops/add" element={<ShopAdd />} />
                  <Route path="shops/:id/edit" element={<EditMedicalShop />} />
                  <Route path="shops/stock" element={<StockEntry />} />

                  {/* Warehouse-Shop Mapping */}
                  <Route path="warehouse-mapping" element={<WarehouseShopMapping />} />

                  {/* Medicines (Medicine Master) */}
                  <Route path="medicines" element={<MedicineList />} />
                  <Route path="medicines/add" element={<MedicineAdd />} />
                  <Route path="medicines/:id" element={<MedicineDetails />} />
                  <Route path="medicines/:id/edit" element={<MedicineEdit />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="units" element={<UnitsPage />} />
                  <Route path="hsn" element={<HSNCodesPage />} />
                  <Route path="gst" element={<GSTVATPage />} />
                  <Route path="gst-slabs" element={<GSTSlabsPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="adjustment-reasons" element={<AdjustmentReasonsPage />} />
                  <Route path="payment-methods" element={<PaymentMethodsPage />} />
                  <Route path="medicine-types" element={<MedicineTypesPage />} />
                  <Route path="brands" element={<BrandsPage />} />
                  <Route path="manufacturers" element={<ManufacturersPage />} />

                  {/* Rack Master (Physical storage locations) */}
                  <Route path="racks" element={<RackMaster />} />
                  {/* Note: Batch is NOT a master - it's created implicitly during Stock Entry */}

                  {/* Inventory Oversight (Read-Only for Super Admin) */}
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/adjust" element={<StockAdjustment />} />
                  <Route path="inventory-oversight" element={<InventoryOversight />} />
                  <Route path="inventory-oversight/warehouse" element={<InventoryOversight />} />
                  <Route path="inventory-oversight/shop" element={<InventoryOversight />} />
                  <Route path="inventory-oversight/expiry" element={<InventoryOversight />} />
                  <Route path="inventory-oversight/dead-stock" element={<InventoryOversight />} />

                  {/* Supply Chain Analytics */}
                  <Route path="analytics/dispatch" element={<DispatchesList />} /> {/* Placeholder */}
                  <Route path="analytics/demand" element={<SalesReports />} /> {/* Placeholder */}

                  {/* Customers */}
                  <Route path="customers" element={<CustomersList />} />

                  {/* Employees & HR */}
                  <Route path="employees" element={<EmployeesList />} />
                  <Route path="employees/attendance" element={<AttendanceMarker />} />
                  <Route path="employees/attendance/report" element={<AttendanceReport />} />
                  <Route path="employees/salary" element={<SalaryManagement />} />

                  {/* Dispatches (Operational) */}
                  <Route path="dispatches" element={<DispatchesList />} />
                  <Route path="dispatches/create" element={<DispatchCreate />} />
                  <Route path="dispatches/:id" element={<DispatchDetails />} />

                  {/* Purchase Requests */}
                  <Route path="purchase-requests" element={<PurchaseRequestsList />} />

                  {/* Sales & Billing (Operational - Not for Super Admin) */}
                  <Route path="sales" element={<InvoicesList />} />
                  <Route path="sales/pos" element={<POSBilling />} />
                  <Route path="sales/invoices" element={<InvoicesList />} />
                  <Route path="sales/returns" element={<ReturnRefund />} />

                  {/* Reports */}
                  <Route path="reports" element={<SalesReports />} />
                  <Route path="reports/sales" element={<SalesReports />} />
                  <Route path="reports/expiry" element={<ExpiryLossReport />} />
                  <Route path="reports/tax" element={<TaxReports />} />
                  <Route path="reports/inventory" element={<InventoryPage />} />
                  <Route path="reports/inventory-aging" element={<InventoryPage />} /> {/* Placeholder */}
                  <Route path="reports/compliance" element={<SalesReports />} /> {/* Placeholder */}

                  {/* Notifications */}
                  <Route path="notifications" element={<NotificationsPage />} />

                  {/* System */}
                  <Route path="settings" element={<ApplicationSettings />} />
                  <Route path="settings/application" element={<ApplicationSettings />} />
                  <Route path="settings/system" element={<SystemSettings />} />
                  <Route path="feature-flags" element={<SystemSettings />} /> {/* Placeholder */}
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="backup-restore" element={<SystemSettings />} /> {/* Placeholder */}
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              <SessionExpiredModal />
            </Router>
          </OperationalProvider>
        </MasterDataProvider>
      </PermissionProvider>
    </UserProvider>
  );
}

export default App;
