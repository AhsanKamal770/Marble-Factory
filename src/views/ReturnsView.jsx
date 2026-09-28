import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Calendar,
  Layers,
  FileText,
  User,
  Truck,
  ArrowDownLeft,
  Hammer,
  X,
} from "lucide-react";
import { db, adjustItemStock } from "../db/index";
import Badge from "../components/Badge";

export default function ReturnsView() {
  const [returns, setReturns] = useState([]);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [returnTypeFilter, setReturnTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // New Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnType, setReturnType] = useState("Sales Return"); // 'Sales Return' | 'Purchase Return'
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [refDocNo, setRefDocNo] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [returnSqFt, setReturnSqFt] = useState("");
  const [returnRate, setReturnRate] = useState("");
  const [condition, setCondition] = useState("Good - Return to Yard Stock"); // 'Good - Return to Yard Stock' | 'Damaged - Scrap'
  const [refundMethod, setRefundMethod] = useState(
    "Deduct from Khata Due Balance",
  ); // 'Cash Refund' | 'Deduct from Khata Due Balance'
  const [reason, setReason] = useState(
    "Leftover marble after flooring completion",
  );
  const [wastageSource, setWastageSource] = useState(
    "Bridge-Cutter Cutting Loss",
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allReturns = await db.returns.toArray();
    const allItems = await db.items.toArray();
    const allCustomers = await db.customers.toArray();
    const allSuppliers = await db.suppliers.toArray();
    const allInvoices = await db.invoices.toArray();

    setReturns(
      allReturns.sort(
        (a, b) =>
          new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
      ),
    );
    setItems(allItems);
    setCustomers(allCustomers);
    setSuppliers(allSuppliers);
    setInvoices(allInvoices);
  };

  const handleOpenNewReturn = () => {
    setReturnType("Sales Return");
    setSelectedPartyId(customers[0]?.id ? customers[0].id.toString() : "");
    setRefDocNo("");
    if (items.length > 0) {
      setSelectedItemId(items[0].id.toString());
      setReturnRate(items[0].ratePerSqFt.toString());
    }
    setReturnSqFt("50");
    setCondition("Good - Return to Yard Stock");
    setRefundMethod("Deduct from Khata Due Balance");
    setReason("Leftover tiles/slabs after project completion");
    setWastageSource("Bridge-Cutter Cutting Loss");
    setIsModalOpen(true);
  };

  const calculatedTotalAmount =
    (parseFloat(returnSqFt) || 0) * (parseFloat(returnRate) || 0);

  const handleSaveReturn = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !returnSqFt) {
      alert("Please fill in return details.");
      return;
    }

    const item = items.find((i) => i.id === parseInt(selectedItemId, 10));
    if (!item) return;

    const sqftNum = parseFloat(returnSqFt);
    const rateNum = parseFloat(returnRate) || 0;
    const totalAmount = sqftNum * rateNum;
    const returnNo = `RET-${Date.now().toString().slice(-6)}`;

    try {
      await db.transaction(
        "rw",
        [db.returns, db.items, db.customers, db.suppliers, db.stock_movements],
        async () => {
          if (returnType === "Sales Return") {
            const cust = customers.find(
              (c) => c.id === parseInt(selectedPartyId, 10),
            );
            const partyName = cust ? cust.name : "Walk-in Customer";

            // Record return document
            await db.returns.add({
              returnNo,
              type: "Sales Return",
              refDocNo: refDocNo || "N/A",
              partyId: cust ? cust.id : null,
              partyName,
              date: new Date().toISOString(),
              items: [
                {
                  itemId: item.id,
                  name: item.name,
                  category: item.category,
                  sqft: sqftNum,
                  rate: rateNum,
                  amount: totalAmount,
                  condition,
                },
              ],
              totalAmount,
              refundAmount: totalAmount,
              refundMethod,
              reason,
              status: "Completed",
              createdAt: new Date().toISOString(),
            });

            // If condition is good, return back to available inventory
            if (condition.includes("Good")) {
              await adjustItemStock(
                item.id,
                sqftNum,
                0,
                0,
                "Sales Return",
                returnNo,
                `Returned from ${partyName} (${reason})`,
              );
            }

            // Adjust customer ledger if registered customer
            if (cust) {
              const newTotalBilled = Math.max(
                0,
                (Number(cust.totalBilled) || 0) - totalAmount,
              );
              let newBalanceDue = Number(cust.balanceDue || 0);

              if (refundMethod === "Deduct from Khata Due Balance") {
                newBalanceDue = Math.max(0, newBalanceDue - totalAmount);
              }

              await db.customers.update(cust.id, {
                totalBilled: newTotalBilled,
                balanceDue: newBalanceDue,
                updatedAt: new Date().toISOString(),
              });
            }
          } else if (returnType === 'Purchase Return') {
            // Purchase Return to Supplier
            const sup = suppliers.find(
              (s) => s.id === parseInt(selectedPartyId, 10),
            );
            const partyName = sup ? sup.name : "Supplier";

            await db.returns.add({
              returnNo,
              type: "Purchase Return",
              refDocNo: refDocNo || "N/A",
              partyId: sup ? sup.id : null,
              partyName,
              date: new Date().toISOString(),
              items: [
                {
                  itemId: item.id,
                  name: item.name,
                  category: item.category,
                  sqft: sqftNum,
                  rate: rateNum,
                  amount: totalAmount,
                  condition,
                },
              ],
              totalAmount,
              refundAmount: totalAmount,
              refundMethod,
              reason,
              status: "Completed",
              createdAt: new Date().toISOString(),
            });

            // Deduct from inventory (sending back to supplier)
            await adjustItemStock(
              item.id,
              -sqftNum,
              0,
              0,
              "Purchase Return",
              returnNo,
              `Returned to Supplier ${partyName} (${reason})`,
            );

            // Deduct from supplier payable balance
            if (sup) {
              const newPayable = Math.max(
                0,
                (Number(sup.balancePayable) || 0) - totalAmount,
              );
              const newPurchased = Math.max(
                0,
                (Number(sup.totalPurchased) || 0) - totalAmount,
              );

              await db.suppliers.update(sup.id, {
                balancePayable: newPayable,
                totalPurchased: newPurchased,
                updatedAt: new Date().toISOString(),
              });
            }
          } else {
            // Factory Wastage — sirf stock kam hoga, koi balance touch nahi hoga
            await db.returns.add({
              returnNo,
              type: 'Factory Wastage',
              refDocNo: 'N/A',
              partyId: null,
              partyName: 'Factory Internal Loss',
              date: new Date().toISOString(),
              items: [
                {
                  itemId: item.id,
                  name: item.name,
                  category: item.category,
                  sqft: sqftNum,
                  rate: rateNum,
                  amount: totalAmount,
                  condition: 'Damaged - Scrap'
                }
              ],
              totalAmount,
              refundAmount: 0,
              refundMethod: 'N/A - Factory Loss',
              reason: wastageSource,
              status: 'Completed',
              createdAt: new Date().toISOString()
            });

            await adjustItemStock(
              item.id,
              -sqftNum,
              0,
              0,
              'Factory Wastage',
              returnNo,
              wastageSource
            );
          }
        },
      );

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error recording stock return: " + err.message);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      r.returnNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.refDocNo?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (returnTypeFilter === "ALL") return true;
    return r.type === returnTypeFilter;
  });
  const wastageStats = returns
    .filter(r => r.type === 'Factory Wastage')
    .reduce((acc, r) => {
      acc.totalSqFt += r.items?.reduce((s, it) => s + (Number(it.sqft) || 0), 0) || 0;
      acc.totalValue += Number(r.totalAmount || 0);
      return acc;
    }, { totalSqFt: 0, totalValue: 0 });

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
            {["ALL", "Sales Return", "Factory Wastage"].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${returnTypeFilter === type ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setReturnTypeFilter(type)}
              >
                {type === "ALL" ? "All Returns" : type}
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
                placeholder="Search by Return #, Customer, Doc..."
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleOpenNewReturn}
            >
              <RotateCcw size={15} /> Process Stock Return
            </button>
          </div>
        </div>
      </div>
      {wastageStats.totalSqFt > 0 && (
        <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <Hammer size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#dc2626' }} />
            Total Factory Wastage Lost
          </span>
          <span className="font-mono" style={{ fontWeight: 800 }}>
            {wastageStats.totalSqFt.toFixed(2)} Sq.Ft &nbsp;|&nbsp; Rs. {wastageStats.totalValue.toLocaleString()}
          </span>
        </div>
      )}

      {/* Returns List Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <RotateCcw size={18} className="text-gold" /> Stock Returns & Credit
            Notes ({filteredReturns.length})
          </h3>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Return #</th>
                <th>Type</th>
                <th>Party Name (Customer / Supplier)</th>
                <th>Ref Invoice / Challan</th>
                <th>Item Details</th>
                <th>Returned Quantity</th>
                <th>Total Value</th>
                <th>Stock Disposition</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "36px",
                      color: "#94a3b8",
                    }}
                  >
                    No stock returns recorded yet.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id}>
                    <td
                      className="font-mono text-gold"
                      style={{ fontWeight: 700 }}
                    >
                      {ret.returnNo}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: ret.type === 'Sales Return' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                        color: ret.type === 'Sales Return' ? '#2563eb' : '#dc2626'
                      }}>
                        {ret.type}
                      </span>
                    </td>
                    <td
                      style={{ fontWeight: 700, color: "var(--text-primary)" }}
                    >
                      {ret.partyName}
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {ret.refDocNo || "-"}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {ret.items?.map((it, idx) => (
                        <div key={idx} style={{ fontWeight: 600 }}>
                          {it.name}
                        </div>
                      ))}
                    </td>
                    <td
                      className="font-mono text-accent"
                      style={{ fontSize: "0.95rem", fontWeight: 800 }}
                    >
                      {ret.items?.reduce(
                        (acc, it) => acc + (Number(it.sqft) || 0),
                        0,
                      )}{" "}
                      Sq.Ft
                    </td>
                    <td
                      className="font-mono"
                      style={{ fontWeight: 800, fontSize: "0.95rem" }}
                    >
                      Rs. {Number(ret.totalAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: "#34d399",
                          fontWeight: 600,
                        }}
                      >
                        {ret.items?.[0]?.condition || "Stock Restored"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {ret.reason || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Return Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "580px" }}>
            <div className="modal-header">
              <h3
                style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}
              >
                Process Stock Return ({returnType})
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReturn}>
              <div className="modal-body">
                {/* Type toggle */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <button
                    type="button"
                    className={`btn ${returnType === "Sales Return" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => {
                      setReturnType("Sales Return");
                      setSelectedPartyId(
                        customers[0]?.id ? customers[0].id.toString() : "",
                      );
                    }}
                  >
                    <User size={15} /> Customer Sales Return
                  </button>
                  <button
                    type="button"
                    className={`btn ${returnType === "Factory Wastage" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setReturnType("Factory Wastage")}
                  >
                    <Hammer size={15} /> Factory Wastage
                  </button>
                </div>

                {/* Party selection */}
                {returnType !== 'Factory Wastage' && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">
                        {returnType === "Sales Return"
                          ? "Customer Name"
                          : "Supplier / Quarry"}
                      </label>
                      <select
                        className="form-control"
                        value={selectedPartyId}
                        onChange={(e) => setSelectedPartyId(e.target.value)}
                      >
                        {returnType === "Sales Return" ? (
                          <>
                            <option value="">Walk-in Customer</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.phone})
                              </option>
                            ))}
                          </>
                        ) : (
                          suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.company})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Ref Invoice / Challan #
                      </label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        value={refDocNo}
                        onChange={(e) => setRefDocNo(e.target.value)}
                        placeholder="e.g. INV-2026-001"
                      />
                    </div>
                  </div>
                )}
                {returnType === 'Factory Wastage' && (
                  <div className="form-group">
                    <label className="form-label">Wastage Cause / Source *</label>
                    <select
                      className="form-control"
                      value={wastageSource}
                      onChange={(e) => setWastageSource(e.target.value)}
                    >
                      <option value="Bridge-Cutter Cutting Loss">Bridge-Cutter Cutting Loss</option>
                      <option value="Polishing Loss">Polishing / Grinding Loss</option>
                      <option value="Yard/Transit Handling Damage">Yard / Transit Handling Damage</option>
                    </select>
                  </div>
                )}

                {/* Item selection & return quantity */}
                <div className="form-group">
                  <label className="form-label">
                    Marble / Tile Item Being Returned *
                  </label>
                  <select
                    className="form-control"
                    value={selectedItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedItemId(id);
                      const found = items.find(
                        (i) => i.id === parseInt(id, 10),
                      );
                      if (found) setReturnRate(found.ratePerSqFt.toString());
                    }}
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} [{i.category}]
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">
                      Return Quantity (Sq.Ft) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      className="form-control font-mono"
                      style={{ color: "var(--accent-blue)", fontWeight: 700 }}
                      value={returnSqFt}
                      onChange={(e) => setReturnSqFt(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rate / Sq.Ft (Rs.) *</label>
                    <input
                      type="number"
                      required
                      className="form-control font-mono"
                      value={returnRate}
                      onChange={(e) => setReturnRate(e.target.value)}
                    />
                  </div>
                </div>
                {returnType !== 'Factory Wastage' && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">
                        Item Condition / Disposition
                      </label>
                      <select
                        className="form-control"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                      >
                        <option value="Good - Return to Yard Stock">
                          Good Condition (Add back to yard stock)
                        </option>
                        <option value="Damaged - Scrap">
                          Damaged / Broken (Do not add to stock)
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Refund / Credit Mode</label>
                      <select
                        className="form-control"
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value)}
                      >
                        <option value="Deduct from Khata Due Balance">
                          Deduct from Customer Udhaar Balance
                        </option>
                        <option value="Cash Refund">
                          Cash Refund to Customer
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Return Reason</label>
                  <input
                    type="text"
                    className="form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Extra leftover slabs from bungalow floor"
                  />
                </div>

                {/* Total Refund Banner */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {returnType === 'Factory Wastage' ? 'Total Loss Value:' : 'Total Refund / Credit Value:'}
                  </span>
                  <span
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: "var(--accent-blue)",
                    }}
                    className="font-mono"
                  >
                    Rs. {calculatedTotalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={16} /> Confirm Stock Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
