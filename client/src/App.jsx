import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import PublicLayout from './components/layouts/PublicLayout';
import AdminLayout from './components/layouts/AdminLayout';
import EmployeeDashboardLayout from './components/layouts/EmployeeDashboardLayout';
import EmployeeDashboardView from './portals/employee/EmployeeDashboardView';
import SocialProducts from './portals/employee/SocialProducts';
import SocialPostConfirmation from './portals/employee/SocialPostConfirmation';
import SalesReport from './portals/common/SalesReport';
import CompetitorAnalysis from './portals/common/CompetitorAnalysis';
import { useEmployeeAuth } from './context/EmployeeAuthContext';
import ScrollToTop from './components/common/ScrollToTop';

// Public pages
import Home from './portals/public/Home';
import Login from './portals/public/Login';
import Register from './portals/public/Register';
import Products from './portals/public/Products';
import ProductDetails from './portals/public/ProductDetails';
import Cart from './portals/customer/Cart';
import Profile from './portals/customer/Profile';

// Admin pages
import AdminLogin from './portals/admin/AdminLogin';
import AdminDashboard from './portals/admin/AdminDashboard';
import AdminProducts from './portals/admin/AdminProducts';
import AdminOrders from './portals/admin/AdminOrders';
import AdminCustomers from './portals/admin/AdminCustomers';
import AdminSuppliers from './portals/admin/AdminSuppliers';
import AdminEmployees from './portals/admin/AdminEmployees';

// Employee pages
import EmployeeLogin from './portals/employee/EmployeeLogin';
import EmployeeCustomers from './portals/employee/EmployeeCustomers';

// Component to render appropriate products view based on employee role
const EmployeeProductsRoute = () => {
  const { employee } = useEmployeeAuth();
  if (employee?.roleName === 'Social Media Manager') {
    return <SocialProducts />;
  }
  return <AdminProducts />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <EmployeeAuthProvider>
            <CartProvider>
              <Router>
                <ScrollToTop />
                <Routes>
                  {/* Public Customer Routes */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetails />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/me" element={<Profile />} />
                  </Route>

                  {/* Admin Portal (Completely Isolated) */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products-posting" element={<SocialProducts />} />
                    <Route path="post-confirmation" element={<SocialPostConfirmation />} />
                    <Route path="competitor-trends" element={<CompetitorAnalysis />} />
                    <Route path="competitors" element={<Navigate to="/admin/competitor-trends" replace />} />
                    <Route path="social-products" element={<Navigate to="/admin/products-posting" replace />} />
                    <Route path="sales-report" element={<SalesReport />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="suppliers" element={<AdminSuppliers />} />
                    <Route path="employees" element={<AdminEmployees />} />
                  </Route>

                  {/* Employee Portal (Common Login + Dynamic Username Routes) */}
                  <Route path="/employee/login" element={<EmployeeLogin />} />
                  <Route path="/employee/:username" element={<EmployeeDashboardLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<EmployeeDashboardView />} />
                    <Route path="products" element={<EmployeeProductsRoute />} />
                    <Route path="competitor-trends" element={<CompetitorAnalysis />} />
                    <Route path="competitors" element={<Navigate to="competitor-trends" replace />} />
                    <Route path="sales-report" element={<SalesReport />} />
                    <Route path="post-confirmation" element={<SocialPostConfirmation />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="customers" element={<EmployeeCustomers />} />
                    <Route path="suppliers" element={<AdminSuppliers />} />
                  </Route>

                  {/* Catch-all fallback */}
                  <Route path="/employee" element={<Navigate to="/employee/login" replace />} />
                </Routes>
              </Router>
            </CartProvider>
          </EmployeeAuthProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
