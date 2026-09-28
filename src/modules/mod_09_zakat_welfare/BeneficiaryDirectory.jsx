import React, { useState } from 'react';
import { Users, Plus, Search, CheckCircle, XCircle } from 'lucide-react';

const INITIAL_BENEFICIARIES = [
  { id: 1, name: 'Muhammad Yasin', category: 'Widow/Family Support', monthlyAmount: 15000, status: 'Active', contact: '0300-1234567' },
  { id: 2, name: 'Rashida Bibi', category: 'Medical Assistance', monthlyAmount: 12000, status: 'Active', contact: '0301-7654321' },
  { id: 3, name: 'Tariq Mehmood', category: 'Education Support', monthlyAmount: 10000, status: 'Active', contact: '0322-9876543' }
];

export default function BeneficiaryDirectory() {
  const [beneficiaries, setBeneficiaries] = useState(INITIAL_BENEFICIARIES);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'Family Support', monthlyAmount: '', contact: '' });

  const filtered = beneficiaries.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.monthlyAmount) return;
    const newEntry = {
      id: Date.now(),
      name: formData.name,
      category: formData.category,
      monthlyAmount: Number(formData.monthlyAmount),
      status: 'Active',
      contact: formData.contact || 'N/A'
    };
    setBeneficiaries([...beneficiaries, newEntry]);
    setFormData({ name: '', category: 'Family Support', monthlyAmount: '', contact: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600"/>
            Beneficiary Directory (مستحقین ڈائریکٹری)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage fixed monthly Zakat beneficiaries</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4"/>
          Add Beneficiary
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input
          type="text"
          placeholder="Search beneficiaries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Monthly Allowance (PKR)</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">{b.name}</td>
                <td className="py-3 px-4">{b.category}</td>
                <td className="py-3 px-4 font-semibold text-emerald-700">Rs. {b.monthlyAmount.toLocaleString()}</td>
                <td className="py-3 px-4">{b.contact}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3"/> {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Beneficiary</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Family Support">Family Support</option>
                  <option value="Medical Assistance">Medical Assistance</option>
                  <option value="Education Support">Education Support</option>
                  <option value="Widow Support">Widow Support</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monthly Amount (PKR)</label>
                <input
                  type="number"
                  required
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}