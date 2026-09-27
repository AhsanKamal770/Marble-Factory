import React from "react";
import { Search, User, Phone, MapPin } from "lucide-react";

export default function CustomerList({ customers, selectedCustomerId, onSelectCustomer, searchTerm, onSearchChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
      {/* Search Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 12px 0", color: "var(--text-primary)" }}>Customers</h2>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px 8px 30px", fontSize: "0.85rem",
              border: "1px solid var(--border-color)", borderRadius: "6px",
              background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none"
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {customers.length === 0 ? (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No customers found.
          </div>
        ) : (
          customers.map(c => {
            const isSelected = selectedCustomerId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c.id)}
                style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--border-divider)",
                  cursor: "pointer", transition: "background 0.2s",
                  background: isSelected ? "rgba(37,99,235,0.05)" : "transparent",
                  borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>{c.name}</div>
                  <div style={{ fontWeight: 700, color: c.balanceDue > 0 ? "#ef4444" : "#10b981", fontSize: "0.85rem" }}>
                    Rs. {Number(c.balanceDue).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {c.phone && <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Phone size={10} /> {c.phone}</div>}
                  {c.city && <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={10} /> {c.city}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
