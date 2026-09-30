import React from "react";
import { Search, User, Phone, MapPin, Users, AlertCircle, CheckCircle2 } from "lucide-react";

export default function CustomerList({
  customers = [],
  selectedCustomerId,
  onSelectCustomer,
  searchTerm,
  onSearchChange,
  activeFilter = 'all',
  onFilterChange
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "transparent" }}>
      {/* Search Header */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-divider)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={16} style={{ color: "var(--accent-blue)" }} />
            <h2 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Registered Customers
            </h2>
          </div>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
            {customers.length}
          </span>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search name, phone, city..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              fontSize: "0.86rem",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.7)",
              color: "var(--text-primary)",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Quick Filter Pills */}
        {onFilterChange && (
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'dues', label: 'Overdue (ادھار)' },
              { key: 'Builder', label: 'Builders' },
              { key: 'Contractor', label: 'Contractors' },
              { key: 'Retail', label: 'Retail' }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                style={{
                  background: activeFilter === f.key ? "var(--accent-blue)" : "rgba(255,255,255,0.6)",
                  color: activeFilter === f.key ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customers List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {customers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <User size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <div>No matching customers found</div>
          </div>
        ) : (
          customers.map(c => {
            const isSelected = selectedCustomerId === c.id;
            const hasDue = Number(c.balanceDue || 0) > 0;

            return (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c.id)}
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: isSelected ? "rgba(255,255,255,0.7)" : "transparent",
                  borderLeft: isSelected ? "3px solid var(--accent-blue)" : "3px solid transparent",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {c.name}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                      <span className="font-mono" style={{ whiteSpace: "nowrap" }}>{c.phone || 'No phone'}</span>
                      {c.city && <span style={{ whiteSpace: "nowrap" }}>• {c.city}</span>}
                      {c.customerType && (
                        <span style={{ fontSize: "0.68rem", background: "var(--bg-primary)", padding: "1px 5px", borderRadius: "4px", border: "1px solid var(--border-color)", fontWeight: 600 }}>
                          {c.customerType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="font-mono" style={{
                      fontWeight: 800,
                      color: hasDue ? "#dc2626" : "#059669",
                      fontSize: "0.92rem"
                    }}>
                      Rs. {Number(c.balanceDue || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: hasDue ? "#dc2626" : "#059669", fontWeight: 700 }}>
                      {hasDue ? "Overdue" : "Cleared"}
                    </div>
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
