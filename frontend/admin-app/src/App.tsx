import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AgentOverviewPage from './pages/agents/AgentOverviewPage';
import AgentDetailPage from './pages/agents/AgentDetailPage';
import RegistrationsPage from './pages/registrations/RegistrationsPage';
import UserManagementPage from './pages/users/UserManagementPage';
import ProductManagementPage from './pages/products/ProductManagementPage';
import CommissionConfigPage from './pages/config/CommissionConfigPage';
import AuditLogsPage from './pages/logs/AuditLogsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/agents" element={<AgentOverviewPage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/products" element={<ProductManagementPage />} />
          <Route path="/config" element={<CommissionConfigPage />} />
          <Route path="/logs" element={<AuditLogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
