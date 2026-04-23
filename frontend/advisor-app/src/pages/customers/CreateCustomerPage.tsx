import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../services/policy.service';

export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    panNumber: '',
    aadhaarLast4: '',
    mobile: '',
    email: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    relationToProposer: 'self',
    isPriorityCustomer: false,
    fixedMonthlyReturn: false,
    monthlyRenewalAmount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const nextValue = type === 'checkbox' && event.target instanceof HTMLInputElement ? event.target.checked : value;
    setForm(prev => ({
      ...prev,
      [name]: nextValue,
      ...(name === 'fixedMonthlyReturn' && !nextValue ? { monthlyRenewalAmount: '' } : {}),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await customerService.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        panNumber: form.panNumber.toUpperCase(),
        aadhaarLast4: form.aadhaarLast4,
        mobile: form.mobile,
        email: form.email ? form.email.toLowerCase() : null,
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode,
        },
        relationToProposer: form.relationToProposer,
        isPriorityCustomer: form.isPriorityCustomer,
        fixedMonthlyReturn: form.fixedMonthlyReturn,
        monthlyRenewalAmount: form.fixedMonthlyReturn && form.monthlyRenewalAmount ? Number(form.monthlyRenewalAmount) : null,
      });

      navigate(`/customers/${response.data.data._id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Customer management</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Add New Customer</h1>
          <p className="page-subtitle">Create a policy holder profile before recording a sale so customer and policy ownership stay linked.</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} className="input-field" required />
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
            <label className="block text-sm font-medium mb-1">PAN Number</label>
            <input name="panNumber" value={form.panNumber} onChange={handleChange} className="input-field uppercase" pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Aadhaar Last 4</label>
            <input name="aadhaarLast4" value={form.aadhaarLast4} onChange={handleChange} className="input-field" pattern="[0-9]{4}" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile</label>
            <input name="mobile" value={form.mobile} onChange={handleChange} className="input-field" pattern="[6-9][0-9]{9}" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Relation to Proposer</label>
            <select name="relationToProposer" value={form.relationToProposer} onChange={handleChange} className="input-field">
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Street Address</label>
            <input name="street" value={form.street} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input name="city" value={form.city} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input name="state" value={form.state} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pincode</label>
            <input name="pincode" value={form.pincode} onChange={handleChange} className="input-field" pattern="[0-9]{6}" required />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">Renewal Watch Settings</p>
          <p className="mt-1 text-xs text-gray-500">Use these flags to manually include customers in the priority renewal list surfaced on the dashboard.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 rounded-xl bg-white px-3 py-3 border border-gray-200">
              <input type="checkbox" name="isPriorityCustomer" checked={form.isPriorityCustomer} onChange={handleChange} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-gray-900">Manually track this customer</span>
                <span className="block text-xs text-gray-500 mt-1">Adds the customer to the priority renewal queue even if no risk rule has triggered yet.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-white px-3 py-3 border border-gray-200 md:col-span-2">
              <input type="checkbox" name="fixedMonthlyReturn" checked={form.fixedMonthlyReturn} onChange={handleChange} className="mt-1" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-900">Fixed return every month</span>
                <span className="block text-xs text-gray-500 mt-1">Marks this relationship as a monthly renewal-return account and optionally stores the expected monthly amount.</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  name="monthlyRenewalAmount"
                  value={form.monthlyRenewalAmount}
                  onChange={handleChange}
                  className="input-field mt-3 max-w-xs"
                  placeholder="Expected monthly renewal amount"
                  disabled={!form.fixedMonthlyReturn}
                />
              </span>
            </label>
          </div>
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/customers')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Customer'}</button>
        </div>
      </form>
    </div>
  );
}