import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { employeeId, password });
      const { token, user, role, mustChangePassword } = res.data.data;
      if (role !== 'admin') { setError('Admin access only'); return; }
      setAuth(token, { ...user, role });
      navigate(mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card max-w-md">
        <div className="mb-6">
          <p className="page-kicker">Head office access</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-gray-900">Admin Portal</h1>
          <p className="page-subtitle">Sign in to manage registrations, configurations, users, and reporting controls.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Employee ID</label><input value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field w-full" required /></div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div className="mt-6 text-center border-t border-gray-200 pt-5">
          <Link to="/signup" className="text-sm text-primary hover:underline">Need an admin account? Sign up here</Link>
        </div>
      </div>
    </div>
  );
}
