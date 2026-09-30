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
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {customers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <User size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <div>No matching customers found</div>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: "16px" 
          }}>
            {customers.map(c => {
              const isSelected = selectedCustomerId === c.id;
              const hasDue = Number(c.balanceDue || 0) > 0;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c.id)}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
                  }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.7)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.04)"; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(255,255,255,0.4)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.02)"; } }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", justifyContent: "space-between" }}>
                    <div style={{
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontSize: "1.05rem",
                      lineHeight: 1.3
                    }}>
                      {c.name}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {c.customerType ? (
                        <span style={{ 
                          fontSize: "0.7rem", 
                          background: "rgba(37, 99, 235, 0.1)", 
                          color: "var(--accent-blue)", 
                          padding: "3px 8px", 
                          borderRadius: "6px", 
                          fontWeight: 800, 
                          textTransform: "uppercase" 
                        }}>
                          {c.customerType}
                        </span>
                      ) : (
                        <span />
                      )}

                      <div style={{ textAlign: "right" }}>
                        <span className="font-mono" style={{
                          fontWeight: 800,
                          color: hasDue ? "#dc2626" : "#059669",
                          fontSize: "1.1rem"
                        }}>
                          Rs. {Number(c.balanceDue || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
