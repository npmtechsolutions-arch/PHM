import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import ToastContainer from './components/Toast';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WarehouseList from './pages/WarehouseList';
import WarehouseStockEntry from './pages/WarehouseStockEntry';
import ShopList from './pages/ShopList';
import MedicineList from './pages/MedicineList';
import MedicineDetails from './pages/MedicineDetails';
import MedicineAdd from './pages/MedicineAdd';
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
import AttendanceManagement from './pages/AttendanceManagement';
import SalaryManagement from './pages/SalaryManagement';
import InvoicesList from './pages/InvoicesList';
import DispatchesList from './pages/DispatchesList';
import PurchaseRequestsList from './pages/PurchaseRequestsList';
import POSBilling from './pages/POSBilling';
import NotificationsPage from './pages/NotificationsPage';
import InventoryPage from './pages/InventoryPage';
import WarehouseAdd from './pages/WarehouseAdd';
import WarehouseEdit from './pages/WarehouseEdit';

// Auth guard component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <UserProvider>
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
            <Route index element={<Dashboard />} />

            {/* Users */}
            <Route path="users" element={<UsersList />} />

            {/* Warehouses */}
            <Route path="warehouses" element={<WarehouseList />} />
            <Route path="warehouses/add" element={<WarehouseAdd />} />
            <Route path="warehouses/edit/:id" element={<WarehouseEdit />} />
            <Route path="warehouses/stock" element={<WarehouseStockEntry />} />

            {/* Shops */}
            <Route path="shops" element={<ShopList />} />
            <Route path="shops/add" element={<ShopAdd />} />
            <Route path="shops/:id/edit" element={<EditMedicalShop />} />

            {/* Medicines */}
            <Route path="medicines" element={<MedicineList />} />
            <Route path="medicines/add" element={<MedicineAdd />} />
            <Route path="medicines/:id" element={<MedicineDetails />} />


            {/* Inventory */}
            <Route path="inventory" element={<InventoryPage />} />

            {/* Customers */}
            <Route path="customers" element={<CustomersList />} />

            {/* Employees & HR */}
            <Route path="employees" element={<EmployeesList />} />
            <Route path="employees/attendance" element={<AttendanceManagement />} />
            <Route path="employees/salary" element={<SalaryManagement />} />

            {/* Dispatches */}
            <Route path="dispatches" element={<DispatchesList />} />

            {/* Purchase Requests */}
            <Route path="purchase-requests" element={<PurchaseRequestsList />} />

            {/* Sales & Billing */}
            <Route path="sales" element={<InvoicesList />} />
            <Route path="sales/pos" element={<POSBilling />} />
            <Route path="sales/invoices" element={<InvoicesList />} />
            <Route path="sales/returns" element={<ReturnRefund />} />

            {/* Reports */}
            <Route path="reports" element={<SalesReports />} />
            <Route path="reports/sales" element={<SalesReports />} />
            <Route path="reports/expiry" element={<ExpiryLossReport />} />
            <Route path="reports/tax" element={<TaxReports />} />

            {/* Notifications */}
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Settings */}
            <Route path="settings" element={<ApplicationSettings />} />
            <Route path="settings/application" element={<ApplicationSettings />} />
            <Route path="settings/system" element={<SystemSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;



