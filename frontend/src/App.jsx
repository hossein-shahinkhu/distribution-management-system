import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Distributors from './pages/Distributors';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import Users from './pages/Users';
import RoutesPage from './pages/Routes';
import Treasury from './pages/Treasury';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseInvoices from './pages/PurchaseInvoices';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route
        path="/products"
        element={
          <ProtectedRoute roles={['admin', 'warehouse_keeper']}>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute roles={['admin', 'salesperson']}>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distributors"
        element={
          <ProtectedRoute roles={['admin']}>
            <Distributors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute roles={['admin', 'salesperson']}>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute roles={['admin', 'salesperson', 'warehouse_keeper']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute roles={['admin']}>
            <RoutesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/treasury"
        element={
          <ProtectedRoute roles={['admin', 'salesperson']}>
            <Treasury />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute roles={['admin', 'warehouse_keeper']}>
            <Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute roles={['admin', 'warehouse_keeper']}>
            <PurchaseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-invoices"
        element={
          <ProtectedRoute roles={['admin', 'warehouse_keeper']}>
            <PurchaseInvoices />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
