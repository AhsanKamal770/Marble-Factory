import React, { useState, useEffect } from "react";
import {
  HandHeart,
  Plus,
  Search,
  DollarSign,
  Heart,
  Calendar,
  FileText,
  X,
  CheckCircle,
  Users
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { zakatWelfareService } from "./zakatWelfareService";


export default function ZakatWelfareModule() {
  const [zakatRecords, setZakatRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'Zakat' | 'Welfare'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [recipientName, setRecipientName] = useState("");
  const [category, setCategory] = useState("Zakat"); // 'Zakat' | 'Welfare'
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [reason, setReason] = useState("Monthly Ration Support");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allZakat = await zakatWelfareService.getAllRecords();
      setZakatRecords(
        allZakat.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      );
    } catch (err) {
      console.error("Error loading Zakat records:", err);
    }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!recipientName || !amount) {
      alert("Please enter recipient name and amount!");
      return;
    }

    try {
      await zakatWelfareService.addRecord({
        recipientName,
        category,
        amount: parseFloat(amount) || 0,
        paymentMode,
        reason,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setRecipientName("");
      setAmount("");
      setReason("Monthly Ration Support");
      loadData();
    } catch (err) {
      alert("Error saving record: " + err.message);
    }
  };

  const filteredRecords = zakatRecords.filter((r) => {
    const matchesSearch =
      r.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === "ALL") return true;
    return r.category === filterType;
  });

  const totals = zakatRecords.reduce(
    (acc, curr) => {
      if (curr.category === "Zakat") acc.zakat += Number(curr.amount) || 0;
      else acc.welfare += Number(curr.amount) || 0;
      acc.total += Number(curr.amount) || 0;
      return acc;
    },
    { zakat: 0, welfare: 0, total: 0 }
  );

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
            {["ALL", "Zakat", "Welfare"].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${filterType === type ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFilterType(type)}
              >
                {type === "ALL" ? "All Fund Distribution" : type}
              </button>
            ))}
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
                placeholder="Search recipient or cause..."
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={15} /> Record Distribution
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
          <HandHeart size={15} style={{ verticalAlign: "middle", marginRight: "6px", color: "#10b981" }} />
          Total Distributed Fund (Zakat & Welfare)
        </span>
        <span className="font-mono" style={{ fontWeight: 800 }}>
          Zakat: Rs. {totals.zakat.toLocaleString()} &nbsp;|&nbsp; Welfare: Rs. {totals.welfare.toLocaleString()} &nbsp;|&nbsp; Total: Rs. {totals.total.toLocaleString()}
        </span>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Heart size={18} className="text-gold" /> Zakat & Welfare Fund Disbursements ({filteredRecords.length})
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Recipient / Beneficiary</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Purpose / Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                    No distribution records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td className="font-mono" style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {new Date(rec.date || rec.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: rec.category === "Zakat" ? "rgba(16, 185, 129, 0.12)" : "rgba(59, 130, 246, 0.12)",
                          color: rec.category === "Zakat" ? "#10b981" : "#3b82f6",
                        }}
                      >
                        {rec.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{rec.recipientName}</td>
                    <td style={{ fontSize: "0.85rem" }}>{rec.paymentMode}</td>
                    <td className="font-mono text-accent" style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                      Rs. {Number(rec.amount || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{rec.reason || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record Zakat / Welfare Payment */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Record Zakat / Welfare Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecord}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Fund Category *</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Zakat">Zakat Fund</option>
                      <option value="Welfare">General Welfare / Sadqah</option>
                    </select>
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
                      <option value="Ration / Material">Ration / Material Direct</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Recipient Name / Organization *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Local Needy Family / Saylani Welfare"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    className="form-control font-mono"
                    style={{ color: "var(--accent-blue)", fontWeight: 700, fontSize: "1.1rem" }}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose / Details</label>
                  <input
                    type="text"
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Monthly Ration, Medical Help"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={16} /> Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}