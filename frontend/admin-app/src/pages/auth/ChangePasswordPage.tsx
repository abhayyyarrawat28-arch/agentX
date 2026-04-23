import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      if (user) setAuth(localStorage.getItem('admin_token')!, { ...user, mustChangePassword: false });
      navigate('/dashboard');
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card max-w-md">
        <p className="page-kicker">Security step</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-gray-900 mb-2">Change Password</h1>
        <p className="page-subtitle mb-6">Update your temporary credential before accessing the admin console.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field w-full" required minLength={8} /></div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Updating...' : 'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}
