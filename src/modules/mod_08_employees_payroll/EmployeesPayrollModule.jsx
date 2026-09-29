import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  DollarSign,
  UserCheck,
  Calendar,
  FileText,
  X,
  CheckCircle,
  CreditCard,
  User,
  Briefcase
} from "lucide-react";
import { db } from "../../db/index";
import { useLanguage } from "../../context/LanguageContext";

export default function EmployeesPayrollModule() {
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("EMPLOYEES"); // 'EMPLOYEES' | 'PAYROLL'

  // Modals state
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  // Form States - Employee
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Marble Cutter");
  const [empPhone, setEmpPhone] = useState("");
  const [salaryType, setSalaryType] = useState("Monthly"); // 'Monthly' | 'Daily'
  const [baseSalary, setBaseSalary] = useState("");

  // Form States - Payroll
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [notes, setNotes] = useState("Monthly Salary");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allEmployees = await db.employees?.toArray() || [];
      const allPayrolls = await db.payrolls?.toArray() || [];
      
      setEmployees(allEmployees);
      setPayrolls(
        allPayrolls.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      );
    } catch (err) {
      console.error("Error loading payroll data:", err);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!empName || !baseSalary) {
      alert("Please fill required fields!");
      return;
    }

    try {
      if (db.employees) {
        await db.employees.add({
          name: empName,
          role: empRole,
          phone: empPhone,
          salaryType,
          baseSalary: parseFloat(baseSalary) || 0,
          status: "Active",
          createdAt: new Date().toISOString()
        });
      }
      setIsEmpModalOpen(false);
      setEmpName("");
      setEmpPhone("");
      setBaseSalary("");
      loadData();
    } catch (err) {
      alert("Error saving employee: " + err.message);
    }
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !paidAmount) {
      alert("Please select employee and enter amount!");
      return;
    }

    const emp = employees.find((e) => e.id === parseInt(selectedEmpId, 10));

    try {
      if (db.payrolls) {
        await db.payrolls.add({
          employeeId: parseInt(selectedEmpId, 10),
          employeeName: emp ? emp.name : "Unknown",
          month: payMonth,
          amount: parseFloat(paidAmount) || 0,
          paymentMode,
          notes,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
      setIsPayrollModalOpen(false);
      setPaidAmount("");
      loadData();
    } catch (err) {
      alert("Error saving payroll: " + err.message);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone?.includes(searchTerm)
  );

  const filteredPayrolls = payrolls.filter(
    (p) =>
      p.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.month?.includes(searchTerm)
  );

  const totalMonthlyPayroll = payrolls.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Filter & Action Bar */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "EMPLOYEES" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("EMPLOYEES")}
            >
              <Users size={15} /> All Employees ({employees.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "PAYROLL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("PAYROLL")}
            >
              <DollarSign size={15} /> Salary History
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ position: "relative", width: "260px" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                type="text"
                className="input-search"
                style={{ paddingLeft: "34px", fontSize: "0.88rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employees or salary..."
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEmpModalOpen(true)}
            >
              <Plus size={15} /> Add Employee
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (employees.length > 0) setSelectedEmpId(employees[0].id.toString());
                setIsPayrollModalOpen(true);
              }}
            >
              <CreditCard size={15} /> Pay Salary
            </button>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div
        className="card"
        style={{
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          <Briefcase size={14} style={{ verticalAlign: "middle", marginRight: "6px", color: "#2563eb" }} />
          Total Paid Payroll Disbursements
        </span>
        <span className="font-mono" style={{ fontWeight: 800 }}>
          Rs. {totalMonthlyPayroll.toLocaleString()}
        </span>
      </div>

      {/* Content Section: Employees List */}
      {activeTab === "EMPLOYEES" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={18} className="text-gold" /> Employee Records ({filteredEmployees.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Designation / Role</th>
                  <th>Phone Number</th>
                  <th>Salary Type</th>
                  <th>Base Rate / Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      No employee records found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{emp.name}</td>
                      <td>{emp.role}</td>
                      <td className="font-mono" style={{ fontSize: "0.85rem" }}>{emp.phone || "-"}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: "rgba(37, 99, 235, 0.12)",
                            color: "#2563eb",
                          }}
                        >
                          {emp.salaryType}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        Rs. {Number(emp.baseSalary || 0).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 600 }}>
                          {emp.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Section: Salary History */}
      {activeTab === "PAYROLL" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <DollarSign size={18} className="text-gold" /> Salary Payment History ({filteredPayrolls.length})
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee Name</th>
                  <th>Month</th>
                  <th>Payment Mode</th>
                  <th>Amount Paid</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      No salary payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredPayrolls.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {new Date(p.date || p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.employeeName}</td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>{p.month}</td>
                      <td>{p.paymentMode}</td>
                      <td className="font-mono text-accent" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        Rs. {Number(p.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{p.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Employee */}
      {isEmpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Add New Employee</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEmpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Employee Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Designation / Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      placeholder="e.g. Cutter / Helper"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control font-mono"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Salary Terms</label>
                    <select
                      className="form-control"
                      value={salaryType}
                      onChange={(e) => setSalaryType(e.target.value)}
                    >
                      <option value="Monthly">Monthly Fixed</option>
                      <option value="Daily">Daily Wage</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Base Salary / Rate (Rs.) *</label>
                    <input
                      type="number"
                      required
                      className="form-control font-mono"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="e.g. 35000"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEmpModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={16} /> Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pay Salary */}
      {isPayrollModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Process Salary Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsPayrollModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayroll}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role}) - Rs. {emp.baseSalary}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Salary Month</label>
                    <input
                      type="month"
                      className="form-control font-mono"
                      value={payMonth}
                      onChange={(e) => setPayMonth(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-control"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Paid (Rs.) *</label>
                  <input
                    type="number"
                    required
                    className="form-control font-mono"
                    style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "1.1rem" }}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Salary for current month"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayrollModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={16} /> Confirm Salary Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}