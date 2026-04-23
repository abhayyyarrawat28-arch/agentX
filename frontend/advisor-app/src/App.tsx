import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import RegisterPage from './pages/auth/RegisterPage';
import AgentDashboard from './pages/dashboard/AgentDashboard';
import ForwardCalculator from './pages/calculators/ForwardCalculator';
import ReverseCalculator from './pages/calculators/ReverseCalculator';
import MDRTTracker from './pages/calculators/MDRTTracker';
import ActivityPredictor from './pages/calculators/ActivityPredictor';
import MyPoliciesPage from './pages/policies/MyPoliciesPage';
import CreatePolicyPage from './pages/policies/CreatePolicyPage';
import PolicyDetailPage from './pages/policies/PolicyDetailPage';
import MyCustomersPage from './pages/customers/MyCustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import CreateCustomerPage from './pages/customers/CreateCustomerPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AgentDashboard />} />
          <Route path="/calculator/forward" element={<ForwardCalculator />} />
          <Route path="/calculator/reverse" element={<ReverseCalculator />} />
          <Route path="/calculator/mdrt" element={<MDRTTracker />} />
          <Route path="/calculator/activity" element={<ActivityPredictor />} />
          <Route path="/policies" element={<MyPoliciesPage />} />
          <Route path="/policies/create" element={<CreatePolicyPage />} />
          <Route path="/policies/:id" element={<PolicyDetailPage />} />
          <Route path="/customers" element={<MyCustomersPage />} />
          <Route path="/customers/create" element={<CreateCustomerPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
