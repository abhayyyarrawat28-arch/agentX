import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', dateOfBirth: '', gender: 'male', employeeId: '', branchId: '',
    mobile: '', email: '', panNumber: '', licenseNumber: '', licenseExpiry: '', yearsOfExperience: 0,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [registrationId, setRegistrationId] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await authService.register(form);
      setStatus('success');
      setMessage(res.data.data.message);
      setRegistrationId(res.data.data.registrationId);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error?.message || 'Registration failed');
    }
  };

  if (status === 'success') {
    return (
      <div className="auth-shell">
        <div className="auth-card max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="page-kicker">Registration received</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-[-0.04em]">Application Submitted</h2>
          <p className="text-outline text-sm mb-4">{message}</p>
          <p className="text-xs text-outline">Registration ID: <strong>{registrationId}</strong></p>
          <Link to="/login" className="mt-6 inline-block text-primary font-medium hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell py-8">
      <div className="auth-card max-w-4xl">
        <div className="mb-6">
          <p className="page-kicker">Agent onboarding</p>
          <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-gray-900">Agent Registration</h2>
          <p className="page-subtitle">Submit your application for review. Approval, credentials, and first-login reset remain unchanged.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Desired Employee ID</label>
            <input name="employeeId" value={form.employeeId} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Branch ID</label>
            <input name="branchId" value={form.branchId} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile</label>
            <input name="mobile" value={form.mobile} onChange={handleChange} pattern="[6-9]\d{9}" className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PAN Number</label>
            <input name="panNumber" value={form.panNumber} onChange={handleChange} pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" className="input-field uppercase" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IRDAI License Number</label>
            <input name="licenseNumber" value={form.licenseNumber} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">License Expiry</label>
            <input type="date" name="licenseExpiry" value={form.licenseExpiry} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Years of Experience</label>
            <input type="number" name="yearsOfExperience" value={form.yearsOfExperience} onChange={handleChange} min={0} className="input-field" required />
          </div>

          {status === 'error' && <p className="col-span-2 text-error text-sm">{message}</p>}

          <div className="col-span-2 flex gap-4 mt-2">
            <button type="submit" disabled={status === 'loading'} className="btn-primary flex-1">
              {status === 'loading' ? 'Submitting...' : 'Submit Application'}
            </button>
            <Link to="/login" className="btn-secondary flex-1 text-center">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
