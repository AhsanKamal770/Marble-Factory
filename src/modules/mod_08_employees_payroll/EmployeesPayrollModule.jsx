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
  Briefcase,
  ChevronDown,
  Phone,
  Save,
  Info,
  TrendingUp,
  Pencil,
  Trash2,
  AlertCircle,
  Award,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Receipt
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { employeesPayrollService } from "./employeesPayrollService";

export default function EmployeesPayrollModule() {
  const { language } = useLanguage();
  const isUrdu = language === "ur";
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("EMPLOYEES"); // 'EMPLOYEES' | 'ADVANCES' | 'PAYROLL'
  const [selectedAdvFilterEmp, setSelectedAdvFilterEmp] = useState("ALL");

  // Modals state
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);

  // Form States - Employee
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Marble Cutter");
  const [empPhone, setEmpPhone] = useState("");
  const [empJoiningDate, setEmpJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [salaryType, setSalaryType] = useState("Monthly"); // 'Monthly' | 'Daily'
  const [baseSalary, setBaseSalary] = useState("");

  // Form States - Payroll (with Automatic Advance Deduction)
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payBaseSalary, setPayBaseSalary] = useState(0);
  const [payCurrentAdvance, setPayCurrentAdvance] = useState(0);
  const [payAdvanceDeduction, setPayAdvanceDeduction] = useState(0);
  const [payNetCash, setPayNetCash] = useState(0);
  const [payRemainingAdvance, setPayRemainingAdvance] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [payrollNotes, setPayrollNotes] = useState("Monthly Salary Settlement");

  // Form States - Advance Payment (Unlimited Advance)
  const [advEmpId, setAdvEmpId] = useState("");
  const [advAmount, setAdvAmount] = useState("");
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));
  const [advPaymentMode, setAdvPaymentMode] = useState("Cash");
  const [advNotes, setAdvNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allEmployees = await employeesPayrollService.getAllEmployees();
      const allPayrolls = await employeesPayrollService.getAllPayrolls();
      const allAdvances = await employeesPayrollService.getAllAdvances();

      setEmployees(allEmployees);
      setPayrolls(
        allPayrolls.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      );
      setAdvances(
        allAdvances.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      );
    } catch (err) {
      console.error("Error loading payroll data:", err);
    }
  };

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  // Helper: Anniversary and 10% Annual Increment Calculation (Strictly Integer)
  const getAnniversaryInfo = (emp) => {
    const joinDateStr = emp.joiningDate || (emp.createdAt ? emp.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const lastIncDateStr = emp.lastIncrementDate || joinDateStr;

    const lastIncDate = new Date(lastIncDateStr);
    const nextDueDate = new Date(lastIncDate);
    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

    const now = new Date();
    const isDue = now >= nextDueDate;

    const joinDate = new Date(joinDateStr);
    const totalMonths = Math.max(0, (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const currentSalary = Math.round(Number(emp.baseSalary || emp.basicSalary || 0));
    const incrementAmount = Math.round(currentSalary * 0.10); // Strictly integer 10%
    const newSalary = Math.round(currentSalary + incrementAmount); // Strictly integer new salary

    return {
      isDue,
      joinDateStr,
      lastIncDateStr,
      nextDueDateStr: nextDueDate.toISOString().slice(0, 10),
      years,
      months,
      serviceLabel: years > 0 ? `${years} ${isUrdu ? "سال" : "yr"}${months > 0 ? ` ${months} ${isUrdu ? "ماہ" : "mo"}` : ""}` : `${months} ${isUrdu ? "ماہ" : "mo"}`,
      currentSalary,
      incrementAmount,
      newSalary
    };
  };

  // Helper: Monthly Salary Completion Status
  const getMonthlySalaryStatus = (emp, targetMonthKey = currentMonthKey) => {
    const isPaid = payrolls.some((p) => p.employeeId === emp.id && p.month === targetMonthKey);
    const advanceBal = Math.max(0, Math.round(Number(emp.advanceBalance || emp.advanceDrawn || 0)));
    return {
      isPaid,
      targetMonthKey,
      advanceBal
    };
  };

  const dueAnniversaryEmployees = employees.filter((emp) => getAnniversaryInfo(emp).isDue);
  const dueSalaryEmployees = employees.filter((emp) => !getMonthlySalaryStatus(emp, currentMonthKey).isPaid);

  // ---------- Employee Modal Handlers ----------
  const handleOpenAddEmployee = () => {
    setEditingEmpId(null);
    setEmpName("");
    setEmpRole("Marble Cutter");
    setEmpPhone("");
    setEmpJoiningDate(new Date().toISOString().slice(0, 10));
    setSalaryType("Monthly");
    setBaseSalary("");
    setIsEmpModalOpen(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name || "");
    setEmpRole(emp.role || "Marble Cutter");
    setEmpPhone(emp.phone || "");
    setEmpJoiningDate(emp.joiningDate || (emp.createdAt ? emp.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)));
    setSalaryType(emp.salaryType || "Monthly");
    setBaseSalary(String(emp.baseSalary || emp.basicSalary || ""));
    setIsEmpModalOpen(true);
  };

  const handleDeleteEmployee = async (emp) => {
    const confirmMsg = isUrdu
      ? `کیا آپ واقعی ملازم "${emp.name}" کا ریکارڈ حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete employee "${emp.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await employeesPayrollService.deleteEmployee(emp.id);
      loadData();
    } catch (err) {
      alert("Error deleting employee: " + err.message);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!empName || !baseSalary) {
      alert(isUrdu ? "براہِ کرم تمام لازمی خانے پر کریں!" : "Please fill required fields!");
      return;
    }

    const roundedSalary = Math.round(parseFloat(baseSalary) || 0);

    try {
      if (editingEmpId) {
        const existing = employees.find((x) => x.id === editingEmpId);
        await employeesPayrollService.updateEmployee(editingEmpId, {
          ...existing,
          name: empName.trim(),
          role: empRole,
          phone: empPhone.trim(),
          joiningDate: empJoiningDate || new Date().toISOString().slice(0, 10),
          salaryType,
          baseSalary: roundedSalary,
          basicSalary: roundedSalary,
          updatedAt: new Date().toISOString()
        });
      } else {
        await employeesPayrollService.addEmployee({
          name: empName.trim(),
          role: empRole,
          phone: empPhone.trim(),
          joiningDate: empJoiningDate || new Date().toISOString().slice(0, 10),
          salaryType,
          baseSalary: roundedSalary,
          basicSalary: roundedSalary,
          advanceBalance: 0,
          advanceDrawn: 0,
          status: "Active",
          createdAt: new Date().toISOString()
        });
      }

      setIsEmpModalOpen(false);
      setEditingEmpId(null);
      setEmpName("");
      setEmpPhone("");
      setBaseSalary("");
      loadData();
    } catch (err) {
      alert("Error saving employee: " + err.message);
    }
  };

  // ---------- 10% Annual Increment ----------
  const handleApplyIncrement = async (emp) => {
    const info = getAnniversaryInfo(emp);
    const confirmMsg = isUrdu
      ? `کیا آپ ${emp.name} کی تنخواہ میں 10% سالانہ اضافہ لاگو کرنا چاہتے ہیں؟\n\nموجودہ تنخواہ: Rs. ${info.currentSalary.toLocaleString()}\nاضافہ رقم (+10%): Rs. ${info.incrementAmount.toLocaleString()}\nنئی تنخواہ: Rs. ${info.newSalary.toLocaleString()}`
      : `Apply 10% annual salary increment for ${emp.name}?\n\nCurrent Salary: Rs. ${info.currentSalary.toLocaleString()}\nIncrement (+10%): Rs. ${info.incrementAmount.toLocaleString()}\nNew Base Salary: Rs. ${info.newSalary.toLocaleString()}`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const history = emp.salaryHistory || [];
      const newHistory = [
        ...history,
        {
          date: today,
          oldSalary: info.currentSalary,
          increment: info.incrementAmount,
          newSalary: info.newSalary,
          type: "10% Annual Increment"
        }
      ];

      await employeesPayrollService.updateEmployee(emp.id, {
        ...emp,
        baseSalary: info.newSalary,
        basicSalary: info.newSalary,
        lastIncrementDate: today,
        salaryHistory: newHistory
      });

      alert(
        isUrdu
          ? `${emp.name} کی تنخواہ 10% اضافے کے ساتھ Rs. ${info.newSalary.toLocaleString()} مقرر کر دی گئی ہے!`
          : `10% annual increment applied successfully! New salary for ${emp.name} is Rs. ${info.newSalary.toLocaleString()}.`
      );
      loadData();
    } catch (err) {
      alert("Error applying increment: " + err.message);
    }
  };

  // ---------- Issue Advance Modal (Unlimited Advance Support) ----------
  const handleOpenAdvanceModal = (preselectedEmpId = null) => {
    if (employees.length === 0) {
      alert(isUrdu ? "پہلے ملازم کا اندراج کریں۔" : "Please add an employee first.");
      return;
    }
    const targetId = preselectedEmpId ? String(preselectedEmpId) : String(employees[0].id);
    setAdvEmpId(targetId);
    setAdvAmount("");
    setAdvDate(new Date().toISOString().slice(0, 10));
    setAdvPaymentMode("Cash");
    setAdvNotes("");
    setIsAdvModalOpen(true);
  };

  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    const amountNum = Math.round(parseFloat(advAmount) || 0);
    if (!advEmpId || amountNum <= 0) {
      alert(isUrdu ? "براہِ کرم درست ایڈوانس رقم درج کریں!" : "Please enter a valid advance amount!");
      return;
    }

    const emp = employees.find((x) => x.id === parseInt(advEmpId, 10));
    if (!emp) return;

    try {
      // 1. Record Advance in employee_advances
      await employeesPayrollService.addAdvance({
        employeeId: emp.id,
        employeeName: emp.name,
        amount: amountNum,
        date: advDate,
        paymentMode: advPaymentMode,
        notes: advNotes.trim() || "Cash Advance",
        type: "Advance Given",
        createdAt: new Date().toISOString()
      });

      // 2. Increase Employee's active advance balance (unlimited)
      const currentAdv = Math.round(Number(emp.advanceBalance || emp.advanceDrawn || 0));
      const updatedAdv = currentAdv + amountNum;
      await employeesPayrollService.updateEmployee(emp.id, {
        ...emp,
        advanceBalance: updatedAdv,
        advanceDrawn: updatedAdv
      });

      alert(
        isUrdu
          ? `${emp.name} کو Rs. ${amountNum.toLocaleString()} ایڈوانس کامیابی سے جاری کر دیا گیا ہے۔ کل ایڈوانس بقایا: Rs. ${updatedAdv.toLocaleString()}`
          : `Advance of Rs. ${amountNum.toLocaleString()} issued to ${emp.name}. New advance balance: Rs. ${updatedAdv.toLocaleString()}.`
      );

      setIsAdvModalOpen(false);
      setAdvAmount("");
      setAdvNotes("");
      loadData();
    } catch (err) {
      alert("Error issuing advance: " + err.message);
    }
  };

  // ---------- Pay Salary Modal (With Automatic Advance Adjustment) ----------
  const handleOpenPayrollModal = (preselectedEmpId = null) => {
    if (employees.length === 0) {
      alert(isUrdu ? "پہلے ملازم کا اندراج کریں۔" : "Please add an employee first.");
      return;
    }
    const targetEmp = preselectedEmpId
      ? employees.find((x) => x.id === parseInt(preselectedEmpId, 10)) || employees[0]
      : employees[0];

    setSelectedEmpId(String(targetEmp.id));
    setPayMonth(new Date().toISOString().slice(0, 7));
    setPaymentMode("Cash");
    setPayrollNotes("Monthly Salary Settlement");
    calculatePayrollValues(targetEmp.id);
    setIsPayrollModalOpen(true);
  };

  // Auto-calculation of Advance Deduction & Net Pay
  const calculatePayrollValues = (empId, customDeduction = null) => {
    const emp = employees.find((x) => x.id === parseInt(empId, 10));
    if (!emp) return;

    const base = Math.round(Number(emp.baseSalary || emp.basicSalary || 0));
    const currentAdv = Math.round(Number(emp.advanceBalance || emp.advanceDrawn || 0));

    // Default deduction absorbs as much advance as base salary allows
    const maxAutoDeduct = Math.min(base, currentAdv);
    const deduction = customDeduction !== null ? Math.min(currentAdv, Math.max(0, Math.round(customDeduction))) : maxAutoDeduct;

    const netCash = Math.max(0, base - deduction);
    const remAdv = Math.max(0, currentAdv - deduction);

    setPayBaseSalary(base);
    setPayCurrentAdvance(currentAdv);
    setPayAdvanceDeduction(deduction);
    setPayNetCash(netCash);
    setPayRemainingAdvance(remAdv);
  };

  const handleSelectEmpInPayroll = (empIdStr) => {
    setSelectedEmpId(empIdStr);
    calculatePayrollValues(empIdStr);
  };

  const handleDeductionChange = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) {
      setPayAdvanceDeduction(0);
      setPayNetCash(payBaseSalary);
      setPayRemainingAdvance(payCurrentAdvance);
    } else {
      calculatePayrollValues(selectedEmpId, num);
    }
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert(isUrdu ? "براہِ کرم ملازم منتخب کریں!" : "Please select an employee!");
      return;
    }

    const emp = employees.find((e) => e.id === parseInt(selectedEmpId, 10));
    if (!emp) return;

    try {
      // 1. Record in payrolls
      await employeesPayrollService.addPayroll({
        employeeId: emp.id,
        employeeName: emp.name,
        month: payMonth,
        baseSalary: payBaseSalary,
        advanceDeducted: payAdvanceDeduction,
        amount: payNetCash, // Net paid in cash/bank
        remainingAdvance: payRemainingAdvance,
        paymentMode,
        notes: payrollNotes.trim() || `Salary for ${payMonth}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 2. If advance was deducted, record a deduction entry in employee_advances
      if (payAdvanceDeduction > 0) {
        await employeesPayrollService.addAdvance({
          employeeId: emp.id,
          employeeName: emp.name,
          amount: -payAdvanceDeduction,
          date: new Date().toISOString().slice(0, 10),
          paymentMode,
          notes: isUrdu ? `تنخواہ سے کٹوتی (${payMonth})` : `Salary deduction for month ${payMonth}`,
          type: "Salary Deduction",
          createdAt: new Date().toISOString()
        });
      }

      // 3. Update employee's active advance balance
      await employeesPayrollService.updateEmployee(emp.id, {
        ...emp,
        advanceBalance: payRemainingAdvance,
        advanceDrawn: payRemainingAdvance,
        lastSalaryMonth: payMonth
      });

      alert(
        isUrdu
          ? `${emp.name} کی ماہانہ تنخواہ کامیابی سے ادا کر دی گئی!\n\nمقررہ تنخواہ: Rs. ${payBaseSalary.toLocaleString()}\nایڈوانس کٹوتی: Rs. ${payAdvanceDeduction.toLocaleString()}\nخالص نقد ادائیگی: Rs. ${payNetCash.toLocaleString()}\nاگلے ماہ کے لیے بقایا ایڈوانس: Rs. ${payRemainingAdvance.toLocaleString()}`
          : `Salary for ${emp.name} recorded!\nBase: Rs. ${payBaseSalary.toLocaleString()}\nAdvance Deducted: Rs. ${payAdvanceDeduction.toLocaleString()}\nNet Cash Paid: Rs. ${payNetCash.toLocaleString()}\nCarry-forward Advance: Rs. ${payRemainingAdvance.toLocaleString()}`
      );

      setIsPayrollModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error saving payroll: " + err.message);
    }
  };

  // Filtered lists
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

  const filteredAdvances = advances.filter((adv) => {
    const matchEmp = selectedAdvFilterEmp === "ALL" || String(adv.employeeId) === selectedAdvFilterEmp;
    const matchSearch =
      (adv.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adv.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchEmp && matchSearch;
  });

  // KPI Calculations
  const totalMonthlyPayrollDisbursed = payrolls.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalActiveAdvanceOutstanding = employees.reduce((acc, emp) => acc + (Number(emp.advanceBalance || emp.advanceDrawn || 0)), 0);
  const totalAdvancesGivenAllTime = advances.filter((a) => a.amount > 0).reduce((acc, a) => acc + Number(a.amount || 0), 0);
  const totalAdvanceDeductedAllTime = advances.filter((a) => a.amount < 0).reduce((acc, a) => acc + Math.abs(Number(a.amount || 0)), 0);

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
          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "EMPLOYEES" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("EMPLOYEES")}
            >
              <Users size={15} /> {isUrdu ? `تمام ملازمین (${employees.length})` : `All Employees (${employees.length})`}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "ADVANCES" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("ADVANCES")}
            >
              <Wallet size={15} /> {isUrdu ? `ایڈوانس کھاتہ (${advances.length})` : `Advance Ledger (${advances.length})`}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "PAYROLL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("PAYROLL")}
            >
              <Receipt size={15} /> {isUrdu ? `تنخواہ ریکارڈ (${payrolls.length})` : `Salary Records (${payrolls.length})`}
            </button>
          </div>

          {/* Search & Actions */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: "240px" }}>
              <Search
                size={16}
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
                style={{ paddingLeft: "38px", fontSize: "0.88rem" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isUrdu ? "ملازم تلاش کریں..." : "Search employee..."}
              />
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ color: "#d97706", borderColor: "#fde68a", background: "#fffbeb", fontWeight: 700 }}
              onClick={() => handleOpenAdvanceModal()}
              disabled={employees.length === 0}
            >
              <Wallet size={15} /> {isUrdu ? "+ ایڈوانس دیں" : "+ Issue Advance"}
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenPayrollModal()}
              disabled={employees.length === 0}
            >
              <CreditCard size={15} /> {isUrdu ? "تنخواہ ادا کریں" : "Pay Salary"}
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddEmployee}
            >
              <Plus size={15} /> {isUrdu ? "نیا ملازم" : "Add Employee"}
            </button>
          </div>
        </div>
      </div>

      {/* 1. Monthly Salary Due Notification Banner */}
      {dueSalaryEmployees.length > 0 && activeTab === "EMPLOYEES" && (
        <div
          className="card"
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1px solid #93c5fd",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.12)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "#2563eb", color: "#ffffff", padding: "6px", borderRadius: "8px", display: "flex" }}>
                <Calendar size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#1e3a8a" }}>
                  {isUrdu ? `ماہانہ تنخواہ واجب الادا — ${currentMonthLabel}` : `Monthly Salary Due — ${currentMonthLabel}`}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#1e40af" }}>
                  {isUrdu
                    ? `${dueSalaryEmployees.length} ملازمین کا مہینہ مکمل ہو چکا ہے اور تنخواہ واجب الادا ہے۔ ایڈوانس خودکار ایڈجسٹ ہو جائے گا۔`
                    : `${dueSalaryEmployees.length} employee(s) are due for monthly salary payment. Advances will auto-adjust.`}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dueSalaryEmployees.map((emp) => {
              const base = Math.round(Number(emp.baseSalary || emp.basicSalary || 0));
              const adv = Math.round(Number(emp.advanceBalance || emp.advanceDrawn || 0));
              const autoDeduct = Math.min(base, adv);
              const net = Math.max(0, base - autoDeduct);
              return (
                <div
                  key={emp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div>
                    <strong style={{ color: "#0f172a", fontSize: "0.9rem" }}>{emp.name}</strong>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "8px" }}>
                      ({emp.role}) · مقررہ تنخواہ: <strong className="font-mono">Rs. {base.toLocaleString()}</strong>
                    </span>
                    {adv > 0 && (
                      <div style={{ fontSize: "0.8rem", marginTop: "2px", color: "#d97706", fontWeight: 700 }}>
                        ⚠️ ایڈوانس بقایا: Rs. {adv.toLocaleString()} → کٹوتی کے بعد خالص: <span className="font-mono" style={{ color: "#2563eb" }}>Rs. {net.toLocaleString()}</span>
                        {adv > base && <span style={{ color: "#dc2626", marginLeft: "6px" }}>(Rs. {(adv - base).toLocaleString()} اگلے ماہ ٹرانسفر)</span>}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenPayrollModal(emp.id)}
                  >
                    <CreditCard size={14} />
                    {isUrdu ? "تنخواہ ادا کریں" : "Pay Salary"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 10% Annual Increment Due Notification Banner */}
      {dueAnniversaryEmployees.length > 0 && activeTab === "EMPLOYEES" && (
        <div
          className="card"
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "1px solid #f59e0b",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "#d97706", color: "#ffffff", padding: "6px", borderRadius: "8px", display: "flex" }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#92400e" }}>
                  {isUrdu ? "سالانہ 10% تنخواہ اضافہ واجب (Annual 10% Increment Due)" : "Annual 10% Salary Increment Due (1 Year Completed)"}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#78350f" }}>
                  {isUrdu
                    ? `${dueAnniversaryEmployees.length} ملازمین کا 1 سال مکمل ہو چکا ہے۔ 10% سالانہ اضافہ لاگو کرنے کے لیے بٹن دبائیں۔`
                    : `${dueAnniversaryEmployees.length} employee(s) completed 1 year of service. Apply 10% integer increment.`}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dueAnniversaryEmployees.map((emp) => {
              const info = getAnniversaryInfo(emp);
              return (
                <div
                  key={emp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.85)",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #fcd34d",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div>
                    <strong style={{ color: "#0f172a", fontSize: "0.9rem" }}>{emp.name}</strong>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "8px" }}>
                      ({emp.role}) · {isUrdu ? "شمولیت:" : "Joined:"} <span className="font-mono">{info.joinDateStr}</span> · {info.serviceLabel}
                    </span>
                    <div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
                      <span className="font-mono" style={{ color: "#64748b" }}>Rs. {info.currentSalary.toLocaleString()}</span>
                      {" → "}
                      <strong className="font-mono" style={{ color: "#059669", fontSize: "0.92rem" }}>
                        Rs. {info.newSalary.toLocaleString()} (+Rs. {info.incrementAmount.toLocaleString()})
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ background: "#059669", borderColor: "#059669", fontWeight: 700 }}
                    onClick={() => handleApplyIncrement(emp)}
                  >
                    <Award size={14} />
                    {isUrdu ? "10% اضافہ لگائیں" : "Apply 10% Increment"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPI Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid #2563eb" }}>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
            {isUrdu ? "ماہانہ تنخواہ ادائیگیاں" : "Total Payroll Paid"}
          </div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
            Rs. {totalMonthlyPayrollDisbursed.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid #d97706" }}>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
            {isUrdu ? "کل ایڈوانس بقایا (Active Advance)" : "Total Advance Outstanding"}
          </div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#d97706", marginTop: "4px" }}>
            Rs. {totalActiveAdvanceOutstanding.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: "14px 18px", borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
            {isUrdu ? "تنخواہ سے ریکور ایڈوانس" : "Recovered via Salary"}
          </div>
          <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
            Rs. {totalAdvanceDeductedAllTime.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES LIST WITH SALARY DUE BADGES & ADVANCE BALANCES */}
      {/* ========================================================================= */}
      {activeTab === "EMPLOYEES" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Users size={18} className="text-gold" /> {isUrdu ? `ملازمین ریکارڈ (${filteredEmployees.length})` : `Employee Records (${filteredEmployees.length})`}
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isUrdu ? "ملازم کا نام" : "Employee Name"}</th>
                  <th>{isUrdu ? "عہدہ" : "Designation / Role"}</th>
                  <th>{isUrdu ? "شمولیت و سروس" : "Joining & Service"}</th>
                  <th>{isUrdu ? "مقررہ تنخواہ" : "Base Salary"}</th>
                  <th>{isUrdu ? "ایڈوانس بقایا" : "Advance Balance"}</th>
                  <th>{isUrdu ? "ماہانہ تنخواہ کیفیت" : "Monthly Status"}</th>
                  <th>{isUrdu ? "10% سالانہ اضافہ" : "10% Annual Increment"}</th>
                  <th style={{ textAlign: "right" }}>{isUrdu ? "اختیارات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      {isUrdu ? "کوئی ملازم نہیں ملا۔ 'نیا ملازم شامل کریں' پر کلک کریں۔" : "No employee records found. Click 'Add Employee' to register."}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const annInfo = getAnniversaryInfo(emp);
                    const monthStatus = getMonthlySalaryStatus(emp, currentMonthKey);
                    const currentAdvBal = monthStatus.advanceBal;

                    return (
                      <tr key={emp.id}>
                        {/* Employee Name */}
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: "rgba(37, 99, 235, 0.1)",
                              color: "#2563eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.8rem"
                            }}>
                              {emp.name?.charAt(0)?.toUpperCase() || "E"}
                            </div>
                            <div>
                              <div>{emp.name}</div>
                              <div className="font-mono" style={{ fontSize: "0.72rem", color: "#64748b" }}>{emp.phone || "—"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>{emp.role}</td>

                        {/* Joining Date & Service Duration */}
                        <td>
                          <div>
                            <div className="font-mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              {annInfo.joinDateStr}
                            </div>
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: "2px",
                                fontSize: "0.72rem",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: annInfo.years >= 1 ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
                                color: annInfo.years >= 1 ? "#059669" : "#64748b",
                                fontWeight: 700
                              }}
                            >
                              {annInfo.serviceLabel}
                            </span>
                          </div>
                        </td>

                        {/* Base Salary */}
                        <td className="font-mono" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                          Rs. {Math.round(Number(emp.baseSalary || emp.basicSalary || 0)).toLocaleString()}
                          <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>{emp.salaryType || "Monthly"}</div>
                        </td>

                        {/* Advance Balance Badge */}
                        <td>
                          {currentAdvBal > 0 ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  background: "#fef3c7",
                                  color: "#d97706",
                                  border: "1px solid #fde68a"
                                }}
                              >
                                <Wallet size={12} />
                                Rs. {currentAdvBal.toLocaleString()}
                              </span>
                              <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
                                {isUrdu ? "خودکار کٹوتی ہوگا" : "Auto-deducts in salary"}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                              Rs. 0 {isUrdu ? "ایڈوانس" : "Adv"}
                            </span>
                          )}
                        </td>

                        {/* Monthly Salary Completion Status Badge */}
                        <td>
                          {monthStatus.isPaid ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.74rem",
                                fontWeight: 800,
                                background: "#dcfce7",
                                color: "#16a34a",
                                border: "1px solid #bbf7d0"
                              }}
                            >
                              <CheckCircle size={13} />
                              {isUrdu ? "ادا شدہ (Paid)" : "Paid"}
                            </span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  border: "1px solid #bfdbfe"
                                }}
                              >
                                <Calendar size={13} />
                                {isUrdu ? "ماہانہ تنخواہ واجب" : "Salary Due"}
                              </span>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ padding: "2px 7px", fontSize: "0.72rem" }}
                                onClick={() => handleOpenPayrollModal(emp.id)}
                              >
                                {isUrdu ? "تنخواہ دیں" : "Pay"}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 10% Annual Increment */}
                        <td>
                          {annInfo.isDue ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  background: "#fef3c7",
                                  color: "#d97706",
                                  border: "1px solid #fde68a"
                                }}
                              >
                                {isUrdu ? "+10% واجب" : "+10% Due"}
                              </span>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ padding: "2px 7px", fontSize: "0.72rem", background: "#059669", borderColor: "#059669" }}
                                onClick={() => handleApplyIncrement(emp)}
                              >
                                +Rs. {annInfo.incrementAmount.toLocaleString()}
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                              <span>{isUrdu ? "اگلا:" : "Next:"}</span>{" "}
                              <span className="font-mono" style={{ fontWeight: 600 }}>{annInfo.nextDueDateStr}</span>
                              <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>
                                (+Rs. {annInfo.incrementAmount.toLocaleString()})
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#d97706" }}
                            onClick={() => handleOpenAdvanceModal(emp.id)}
                            title={isUrdu ? "ایڈوانس جاری کریں" : "Issue Advance"}
                          >
                            <Wallet size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563eb" }}
                            onClick={() => handleApplyIncrement(emp)}
                            title={isUrdu ? "10% سالانہ اضافہ لگائیں" : "Apply 10% annual salary increase"}
                          >
                            <TrendingUp size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEditEmployee(emp)}
                            title={isUrdu ? "ترمیم کریں" : "Edit employee"}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444" }}
                            onClick={() => handleDeleteEmployee(emp)}
                            title={isUrdu ? "حذف کریں" : "Delete employee"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADVANCE LEDGER (UNLIMITED ADVANCE TRACKING) */}
      {/* ========================================================================= */}
      {activeTab === "ADVANCES" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h3 className="card-title">
              <Wallet size={18} className="text-gold" /> {isUrdu ? `ایڈوانس کھاتہ و کٹوتی (${filteredAdvances.length})` : `Advance Ledger & Deductions (${filteredAdvances.length})`}
            </h3>

            {/* Employee Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>
                {isUrdu ? "ملازم فلٹر:" : "Filter:"}
              </span>
              <select
                className="app-form-select"
                style={{ width: "200px", padding: "6px 12px", fontSize: "0.82rem" }}
                value={selectedAdvFilterEmp}
                onChange={(e) => setSelectedAdvFilterEmp(e.target.value)}
              >
                <option value="ALL">{isUrdu ? "تمام ملازمین (All)" : "All Employees"}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name} (بقایا: Rs. {Number(emp.advanceBalance || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isUrdu ? "تاریخ" : "Date"}</th>
                  <th>{isUrdu ? "ملازم کا نام" : "Employee Name"}</th>
                  <th>{isUrdu ? "نوعیت" : "Transaction Type"}</th>
                  <th>{isUrdu ? "ادائیگی موڈ" : "Payment Mode"}</th>
                  <th style={{ textAlign: "right" }}>{isUrdu ? "رقم (روپے)" : "Amount (Rs.)"}</th>
                  <th>{isUrdu ? "تفصیل / وجہ" : "Notes / Purpose"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      {isUrdu ? "کوئی ایڈوانس ریکارڈ موجود نہیں۔ '+ ایڈوانس دیں' پر کلک کریں۔" : "No advance records found. Click '+ Issue Advance' to record."}
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((adv) => {
                    const isGiven = adv.amount > 0;
                    return (
                      <tr key={adv.id}>
                        <td className="font-mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {adv.date || (adv.createdAt ? adv.createdAt.slice(0, 10) : "—")}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{adv.employeeName}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              background: isGiven ? "#fef3c7" : "#dcfce7",
                              color: isGiven ? "#d97706" : "#16a34a",
                              border: `1px solid ${isGiven ? "#fde68a" : "#bbf7d0"}`
                            }}
                          >
                            {isGiven ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {isGiven ? (isUrdu ? "ایڈوانس جاری کیا گیا" : "Advance Given") : (isUrdu ? "تنخواہ سے کٹوتی" : "Salary Deduction")}
                          </span>
                        </td>
                        <td>{adv.paymentMode || "Cash"}</td>
                        <td className="font-mono" style={{ textAlign: "right", fontWeight: 800, fontSize: "0.95rem", color: isGiven ? "#d97706" : "#059669" }}>
                          {isGiven ? `+ Rs. ${Number(adv.amount).toLocaleString()}` : `- Rs. ${Math.abs(Number(adv.amount)).toLocaleString()}`}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{adv.notes || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALARY HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "PAYROLL" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <DollarSign size={18} className="text-gold" /> {isUrdu ? `تنخواہ ادائیگی تاریخ (${filteredPayrolls.length})` : `Salary Payment History (${filteredPayrolls.length})`}
            </h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{isUrdu ? "تاریخ" : "Date"}</th>
                  <th>{isUrdu ? "ملازم کا نام" : "Employee Name"}</th>
                  <th>{isUrdu ? "مہینہ" : "Month"}</th>
                  <th>{isUrdu ? "مقررہ تنخواہ" : "Base Salary"}</th>
                  <th>{isUrdu ? "ایڈوانس کٹوتی" : "Advance Deducted"}</th>
                  <th>{isUrdu ? "خالص نقد ادائیگی" : "Net Cash Paid"}</th>
                  <th>{isUrdu ? "بقایا ایڈوانس" : "Remaining Adv."}</th>
                  <th>{isUrdu ? "موڈ" : "Mode"}</th>
                  <th>{isUrdu ? "تفصیل" : "Notes"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                      {isUrdu ? "ابھی تک کوئی تنخواہ ادا نہیں کی گئی۔" : "No salary payments recorded yet."}
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
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        Rs. {Math.round(Number(p.baseSalary || p.amount || 0)).toLocaleString()}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: "#d97706" }}>
                        {p.advanceDeducted ? `Rs. ${Math.round(Number(p.advanceDeducted)).toLocaleString()}` : "Rs. 0"}
                      </td>
                      <td className="font-mono text-accent" style={{ fontWeight: 800, fontSize: "0.95rem", color: "#2563eb" }}>
                        Rs. {Math.round(Number(p.amount || 0)).toLocaleString()}
                      </td>
                      <td className="font-mono" style={{ fontSize: "0.82rem", color: p.remainingAdvance > 0 ? "#dc2626" : "#64748b", fontWeight: 700 }}>
                        {p.remainingAdvance ? `Rs. ${Math.round(Number(p.remainingAdvance)).toLocaleString()}` : "Rs. 0"}
                      </td>
                      <td>{p.paymentMode || "Cash"}</td>
                      <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{p.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {/* ========================================================================= */}
      {isEmpModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsEmpModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge">
                  <Users size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {editingEmpId
                      ? (isUrdu ? "ملازم کی معلومات میں ترمیم" : "Edit Employee Record")
                      : (isUrdu ? "ملازم کا اندراج کریں" : "Register New Employee")}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "ملازم کی معلومات، شمولیت کی تاریخ اور تنخواہ کا اندراج کریں" : "Add employee profile, joining date and salary structure"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsEmpModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Employee Name */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "ملازم کا نام" : "Employee Name"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <User size={16} className="app-input-icon" />
                    <input
                      type="text"
                      required
                      className="app-form-input"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="e.g. Master Aslam"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Role & Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "عہدہ / کام" : "Designation / Role"}
                    </label>
                    <div className="app-input-wrapper">
                      <Briefcase size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input"
                        value={empRole}
                        onChange={(e) => setEmpRole(e.target.value)}
                        placeholder="e.g. Cutter Master / Helper"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "موبائل فون" : "Phone Number"}
                    </label>
                    <div className="app-input-wrapper">
                      <Phone size={16} className="app-input-icon" />
                      <input
                        type="text"
                        className="app-form-input font-mono"
                        value={empPhone}
                        onChange={(e) => setEmpPhone(e.target.value)}
                        placeholder="0300-1234567"
                      />
                    </div>
                  </div>
                </div>

                {/* Joining Date & Salary Terms */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "شمولیت کی تاریخ (Joining Date)" : "Joining Date"} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Calendar size={16} className="app-input-icon" />
                      <input
                        type="date"
                        required
                        className="app-form-input font-mono"
                        value={empJoiningDate}
                        onChange={(e) => setEmpJoiningDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "تنخواہ کی قسم" : "Salary Terms"}
                    </label>
                    <div className="app-input-wrapper">
                      <Calendar size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={salaryType}
                        onChange={(e) => setSalaryType(e.target.value)}
                      >
                        <option value="Monthly">{isUrdu ? "ماہانہ مقررہ (Monthly Fixed)" : "Monthly Fixed"}</option>
                        <option value="Daily">{isUrdu ? "روزانہ دیہاڑی (Daily Wage)" : "Daily Wage"}</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                </div>

                {/* Base Salary */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "بنیادی تنخواہ (روپے - Base Salary)" : "Base Salary (Rs.)"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <DollarSign size={16} className="app-input-icon" />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      className="app-form-input font-mono"
                      style={{ fontSize: "1.05rem", fontWeight: 700, color: "#2563eb" }}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="e.g. 35000"
                    />
                  </div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "4px" }}>
                    {isUrdu ? "💡 ہر 1 سال بعد ملازم کی تنخواہ میں خودکار 10% سالانہ اضافہ لاگو ہوگا اور ہر مہینے بعد تنخواہ واجب ہوگی۔" : "💡 10% annual salary increase and monthly salary tracking will apply."}
                  </span>
                </div>

                <div className="app-form-notice">
                  <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>{isUrdu ? "سرخ نشان والے تمام خانے لازمی ہیں" : "All fields marked with * are required."}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsEmpModalOpen(false)}
                >
                  <X size={16} />
                  {isUrdu ? "منسوخ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <Save size={16} />
                  {editingEmpId ? (isUrdu ? "تبدیلیاں محفوظ کریں" : "Update Employee") : (isUrdu ? "ملازم محفوظ کریں" : "Save Employee")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ISSUE ADVANCE PAYMENT (UNLIMITED ADVANCE) */}
      {/* ========================================================================= */}
      {isAdvModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsAdvModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge" style={{ background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }}>
                  <Wallet size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {isUrdu ? "ملازم کو ایڈوانس جاری کریں" : "Issue Employee Advance"}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "ملازم جتنا مرضی ایڈوانس لے سکتا ہے، تنخواہ پر خود بخود کٹ جائے گا" : "Record advance loans. Will auto-adjust in monthly salary payments."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsAdvModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Employee Select */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "ملازم منتخب کریں" : "Select Employee"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <User size={16} className="app-input-icon" />
                    <select
                      className="app-form-select"
                      value={advEmpId}
                      onChange={(e) => setAdvEmpId(e.target.value)}
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role}) — تنخواہ: Rs. {Number(emp.baseSalary || 0).toLocaleString()} (موجودہ ایڈوانس: Rs. {Number(emp.advanceBalance || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* Advance Amount */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "ایڈوانس رقم (روپے - Advance Amount)" : "Advance Amount (Rs.)"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <DollarSign size={16} className="app-input-icon" />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      autoFocus
                      className="app-form-input font-mono"
                      style={{ color: "#d97706", fontWeight: 800, fontSize: "1.15rem" }}
                      value={advAmount}
                      onChange={(e) => setAdvAmount(e.target.value)}
                      placeholder="e.g. 10000 or 40000"
                    />
                  </div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "4px" }}>
                    {isUrdu ? "💡 ایڈوانس کی کوئی حد نہیں ہے۔ تنخواہ سے زیادہ ایڈوانس بھی درج کر سکتے ہیں۔" : "💡 No limit on advance amount. Can exceed base monthly salary."}
                  </span>
                </div>

                {/* Date & Payment Mode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "تاریخ" : "Date"}
                    </label>
                    <div className="app-input-wrapper">
                      <Calendar size={16} className="app-input-icon" />
                      <input
                        type="date"
                        className="app-form-input font-mono"
                        value={advDate}
                        onChange={(e) => setAdvDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "ادائیگی موڈ" : "Payment Mode"}
                    </label>
                    <div className="app-input-wrapper">
                      <CreditCard size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={advPaymentMode}
                        onChange={(e) => setAdvPaymentMode(e.target.value)}
                      >
                        <option value="Cash">{isUrdu ? "نقدی (Cash in Drawer)" : "Cash"}</option>
                        <option value="Bank Transfer">{isUrdu ? "بینک ٹرانسفر (Bank Transfer)" : "Bank Transfer"}</option>
                        <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                </div>

                {/* Notes / Reason */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "وجہ / تفصیل (اختیاری)" : "Notes / Reason (Optional)"}
                  </label>
                  <div className="app-input-wrapper">
                    <FileText size={16} className="app-input-icon" />
                    <input
                      type="text"
                      className="app-form-input"
                      value={advNotes}
                      onChange={(e) => setAdvNotes(e.target.value)}
                      placeholder={isUrdu ? "مثلاً گھریلو ضرورت، علاج، ایمرجنسی وغیرہ" : "e.g. Medical emergency, home renovation..."}
                    />
                  </div>
                </div>

                <div className="app-form-notice" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
                  <Info size={16} color="#d97706" style={{ flexShrink: 0 }} />
                  <span>{isUrdu ? "یہ ایڈوانس ملازم کے کھاتے میں جمع ہوگا اور اگلی تنخواہ میں خود بخود ایڈجسٹ ہو جائے گا۔" : "This advance will automatically adjust during monthly payroll settlement."}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsAdvModalOpen(false)}
                >
                  <X size={16} />
                  {isUrdu ? "منسوخ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                  style={{ background: "#d97706", borderColor: "#d97706" }}
                >
                  <Wallet size={16} />
                  {isUrdu ? "ایڈوانس جاری کریں" : "Confirm Advance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAY SALARY (WITH AUTOMATIC ADVANCE SETTLEMENT) */}
      {/* ========================================================================= */}
      {isPayrollModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsPayrollModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: "580px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div className="app-modal-icon-badge">
                  <CreditCard size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {isUrdu ? "ماہانہ تنخواہ ادائیگی و ایڈوانس ایڈجسٹمنٹ" : "Monthly Salary Payment & Advance Settlement"}
                  </h3>
                  <p className="app-modal-subtitle">
                    {isUrdu ? "تنخواہ کی ادائیگی اور ایڈوانس کٹوتی کا خودکار حساب" : "Process salary disbursement with auto-adjusted advance deductions"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsPayrollModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePayroll} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="app-modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Employee Selection */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "ملازم منتخب کریں" : "Select Employee"} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <User size={16} className="app-input-icon" />
                    <select
                      className="app-form-select"
                      value={selectedEmpId}
                      onChange={(e) => handleSelectEmpInPayroll(e.target.value)}
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role}) — تنخواہ: Rs. {Number(emp.baseSalary || 0).toLocaleString()} (ایڈوانس: Rs. {Number(emp.advanceBalance || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* Salary Calculation Breakdown Box */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>{isUrdu ? "مقررہ ماہانہ تنخواہ:" : "Base Monthly Salary:"}</span>
                    <strong className="font-mono" style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                      Rs. {payBaseSalary.toLocaleString()}
                    </strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ color: "#d97706", fontWeight: 600 }}>{isUrdu ? "ملازم کا موجودہ ایڈوانس بقایا:" : "Current Advance Balance:"}</span>
                    <strong className="font-mono" style={{ color: "#d97706", fontSize: "0.95rem" }}>
                      Rs. {payCurrentAdvance.toLocaleString()}
                    </strong>
                  </div>

                  {/* Deduction Input */}
                  <div style={{
                    borderTop: "1px dashed #cbd5e1",
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>
                        {isUrdu ? "اس ماہ ایڈوانس کٹوتی (Deduction):" : "Advance Deduction This Month:"}
                      </span>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {isUrdu ? "خودکار حساب شدہ رقم (تبدیل بھی کر سکتے ہیں)" : "Auto-calculated (customizable)"}
                      </div>
                    </div>
                    <div style={{ width: "140px" }}>
                      <input
                        type="number"
                        min="0"
                        max={payCurrentAdvance}
                        className="app-form-input font-mono"
                        style={{ padding: "6px 10px", fontSize: "0.92rem", fontWeight: 700, color: "#dc2626", textAlign: "right" }}
                        value={payAdvanceDeduction}
                        onChange={(e) => handleDeductionChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Net Cash Payable & Remaining Carryover */}
                  <div style={{
                    borderTop: "1px solid #cbd5e1",
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        {isUrdu ? "خالص ادا طلب نقد رقم (Net Payable):" : "Net Cash Payable:"}
                      </div>
                      <div className="font-mono" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2563eb" }}>
                        Rs. {payNetCash.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        {isUrdu ? "اگلے ماہ بقایا ایڈوانس:" : "Carry-forward Advance:"}
                      </div>
                      <div className="font-mono" style={{ fontSize: "1rem", fontWeight: 800, color: payRemainingAdvance > 0 ? "#dc2626" : "#059669" }}>
                        Rs. {payRemainingAdvance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Month & Payment Mode */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "تنخواہ کا مہینہ" : "Salary Month"}
                    </label>
                    <div className="app-input-wrapper">
                      <Calendar size={16} className="app-input-icon" />
                      <input
                        type="month"
                        className="app-form-input font-mono"
                        value={payMonth}
                        onChange={(e) => setPayMonth(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {isUrdu ? "ادائیگی موڈ" : "Payment Method"}
                    </label>
                    <div className="app-input-wrapper">
                      <CreditCard size={16} className="app-input-icon" />
                      <select
                        className="app-form-select"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="Cash">{isUrdu ? "نقدی (Cash in Drawer)" : "Cash"}</option>
                        <option value="Bank Transfer">{isUrdu ? "بینک ٹرانسفر (Bank Transfer)" : "Bank Transfer"}</option>
                        <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {isUrdu ? "تفصیل / ریمارکس" : "Notes / Remarks"}
                  </label>
                  <div className="app-input-wrapper">
                    <FileText size={16} className="app-input-icon" />
                    <input
                      type="text"
                      className="app-form-input"
                      value={payrollNotes}
                      onChange={(e) => setPayrollNotes(e.target.value)}
                      placeholder="e.g. Monthly salary payout after advance deduction"
                    />
                  </div>
                </div>

                <div className="app-form-notice">
                  <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>{isUrdu ? "ادائیگی پر تنخواہ ریکارڈ محفوظ ہوگا اور ایڈوانس خودکار ایڈجسٹ ہو جائے گا۔" : "Salary payment will be saved and advance balance updated automatically."}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsPayrollModalOpen(false)}
                >
                  <X size={16} />
                  {isUrdu ? "منسوخ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="app-btn-submit"
                >
                  <CheckCircle size={16} />
                  {isUrdu ? "ادائیگی محفوظ کریں" : "Confirm Salary Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}