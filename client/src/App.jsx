import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import PublicLayout from './components/layouts/PublicLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
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
import EmployeeLogin from './portals/employee/EmployeeLogin';
import AdminProducts from './portals/admin/AdminProducts';
import AdminOrders from './portals/admin/AdminOrders';
import AdminCustomers from './portals/admin/AdminCustomers';
import AdminSuppliers from './portals/admin/AdminSuppliers';
import AdminEmployees from './portals/admin/AdminEmployees';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/me" element={<Profile />} />
            </Route>

            {/* Admin Login (standalone, no dashboard layout) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Employee Login */}
            <Route path="/employee/login" element={<EmployeeLogin />} />

            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={<DashboardLayout allowedRoles={['admin', 'employee']} />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="employees" element={<AdminEmployees />} />
            </Route>
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
