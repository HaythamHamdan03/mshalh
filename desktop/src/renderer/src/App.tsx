import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import BranchDashboard from './pages/BranchDashboard';
import NewOrderPage from './pages/NewOrderPage';
import CustomersPage from './pages/CustomersPage';
import OrderDetailsPage from './pages/OrderDetailsPage';
import FactoryDashboard from './pages/FactoryDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && user && !roles.includes(user.role)) {
    if (user.role === 'FACTORY') return <Navigate to="/factory" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/branch" replace />;
  }

  return <>{children}</>;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'FACTORY') return <Navigate to="/factory" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/branch" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <RoleRedirect /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRedirect />} />

          {/* Branch routes */}
          <Route
            path="branch"
            element={
              <ProtectedRoute roles={['BRANCH', 'ADMIN']}>
                <BranchDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="branch/new-order"
            element={
              <ProtectedRoute roles={['BRANCH', 'ADMIN']}>
                <NewOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="branch/customers"
            element={
              <ProtectedRoute roles={['BRANCH', 'ADMIN']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          {/* Shared order details */}
          <Route
            path="orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Factory routes */}
          <Route
            path="factory"
            element={
              <ProtectedRoute roles={['FACTORY', 'ADMIN']}>
                <FactoryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="factory/new-order"
            element={
              <ProtectedRoute roles={['FACTORY', 'ADMIN']}>
                <NewOrderPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
