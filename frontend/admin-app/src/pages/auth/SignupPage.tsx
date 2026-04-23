import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function SignupPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('HQ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/admin-signup', {
        employeeId,
        name,
        branchId,
        password,
      });

      const { token, user, role } = res.data.data;
      setAuth(token, { ...user, role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell py-8">
      <div className="auth-card max-w-md">
        <div className="mb-6">
          <p className="page-kicker">System bootstrap</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-gray-900">Admin Signup</h1>
          <p className="page-subtitle">Create an admin account to access the admin console.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee ID</label>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Branch ID</label>
            <input value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-field w-full" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field w-full" minLength={8} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field w-full" minLength={8} required />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-200 pt-5">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}