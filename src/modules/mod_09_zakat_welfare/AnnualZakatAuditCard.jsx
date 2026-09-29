import React from 'react';
import { PieChart, DollarSign, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function AnnualZakatAuditCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-emerald-600"/>
          Annual Zakat Audit Summary (سالانہ زکوٰۃ آڈٹ)
        </h2>
        <p className="text-sm text-slate-500 mt-1">Summary of total welfare allocations and ledger balances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Fund Allocation</span>
            <DollarSign className="w-5 h-5 text-emerald-600"/>
          </div>
          <p className="text-2xl font-bold text-slate-800">Rs. 500,000</p>
          <p className="text-xs text-slate-400 mt-1">Annual Budget Pool</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Disbursed (YTD)</span>
            <HeartHandshake className="w-5 h-5 text-blue-600"/>
          </div>
          <p className="text-2xl font-bold text-slate-800">Rs. 333,000</p>
          <p className="text-xs text-slate-400 mt-1">Disbursed to Beneficiaries</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Remaining Balance</span>
            <ShieldCheck className="w-5 h-5 text-amber-600"/>
          </div>
          <p className="text-2xl font-bold text-slate-800">Rs. 167,000</p>
          <p className="text-xs text-slate-400 mt-1">Available Fund Pool</p>
        </div>
      </div>
    </div>
  );
}