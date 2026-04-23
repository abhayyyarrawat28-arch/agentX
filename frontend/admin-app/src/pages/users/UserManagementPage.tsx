import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset } = useForm();

  const load = () => { setLoading(true); api.get('/admin/users').then(res => setUsers(res.data.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const onSubmit = async (data: any) => {
    setFormLoading(true); setError('');
    try {
      await api.post('/admin/users', data);
      reset(); setShowForm(false); load();
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Failed'); }
    finally { setFormLoading(false); }
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Access control</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">User Management</h1>
          <p className="page-subtitle">Create platform users, assign roles, and maintain the active operations roster.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="data-chip">{users.length} users</span>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ Add User'}</button>
        </div>
      </section>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="stat-card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Name</label><input {...register('name')} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Employee ID</label><input {...register('employeeId')} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Branch ID</label><input {...register('branchId')} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" {...register('password')} className="input-field w-full" required minLength={8} /></div>
          <div><label className="block text-sm font-medium mb-1">Role</label>
            <select {...register('role')} className="input-field w-full"><option value="agent">Agent</option><option value="admin">Admin</option></select>
          </div>
          {error && <p className="text-error text-sm col-span-2">{error}</p>}
          <div className="col-span-2"><button type="submit" disabled={formLoading} className="btn-primary">{formLoading ? 'Creating...' : 'Create User'}</button></div>
        </form>
      )}

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[32rem] table-fixed text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee ID</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b"><td className="p-3"><span className="block break-words">{u.name}</span></td><td className="p-3"><span className="block break-all">{u.employeeId}</span></td><td className="p-3 capitalize">{u.role}</td></tr>
            ))}
            {users.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
