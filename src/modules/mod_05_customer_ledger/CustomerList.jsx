import React from "react";
import { Search, User, Phone, MapPin } from "lucide-react";

export default function CustomerList({ customers, selectedCustomerId, onSelectCustomer, searchTerm, onSearchChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-card)" }}>
      {/* Search Header */}
      <div style={{ padding: "20px 20px 16px 20px", borderBottom: "1px solid var(--border-divider)" }}>
        <h2 style={{ fontSize: "0.85rem", fontWeight: 800, margin: "0 0 12px 0", color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Customers</h2>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px 10px 36px", fontSize: "0.9rem",
              border: "1px solid var(--border-color)", borderRadius: "8px",
              background: "var(--bg-primary)", color: "var(--text-primary)", outline: "none"
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {customers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
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
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-divider)",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  background: isSelected ? "rgba(37,99,235,0.04)" : "transparent",
                  borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--bg-primary)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1 }}>
                    <div style={{ 
                      fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word"
                    }} title={c.name}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.phone}{c.phone && c.city ? " · " : ""}{c.city}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: c.balanceDue > 0 ? "#ef4444" : "var(--text-secondary)", fontSize: "0.95rem", flexShrink: 0 }}>
                    Rs. {Number(c.balanceDue).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
