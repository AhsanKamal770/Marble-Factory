import React, { useState, useEffect } from "react";
import { Plus, CheckSquare, Search, FileText } from "lucide-react";
import CustomerList from "./CustomerList";
import CustomerTimelineView from "./CustomerTimelineView";
import CustomerProfileModal from "./CustomerProfileModal";
import PaymentRecoveryModal from "./PaymentRecoveryModal";
import {
  getAllCustomers,
  getCustomerTimeline,
  saveCustomer,
  recordPaymentRecovery,
} from "./customerLedgerService";

export default function CustomerLedgerView() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadTimeline(selectedCustomer.id);
    } else {
      setTimeline([]);
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      const data = await getAllCustomers();
      // sort alphabetically or by balance
      data.sort((a, b) => b.balanceDue - a.balanceDue);
      setCustomers(data);
      
      // Update selected customer if it exists to refresh balance
      if (selectedCustomer) {
        const updated = data.find(c => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    }
  };

  const loadTimeline = async (id) => {
    try {
      const data = await getCustomerTimeline(id);
      setTimeline(data);
    } catch (err) {
      console.error("Error loading timeline:", err);
    }
  };

  const handleSelectCustomer = (id) => {
    const customer = customers.find(c => c.id === id);
    setSelectedCustomer(customer);
  };

  const handleSaveCustomer = async (data) => {
    try {
      const id = await saveCustomer(data);
      await loadCustomers();
      setIsProfileModalOpen(false);
      setEditingCustomer(null);
      if (!selectedCustomer && id) {
        handleSelectCustomer(id);
      }
    } catch (err) {
      alert("Failed to save customer: " + err.message);
    }
  };

  const handlePaymentRecovery = async (data) => {
    if (!selectedCustomer) return;
    try {
      await recordPaymentRecovery(selectedCustomer.id, data.amount, data.paymentMethod, data.notes);
      await loadCustomers(); // will also update selectedCustomer balance
      setIsPaymentModalOpen(false);
      loadTimeline(selectedCustomer.id);
    } catch (err) {
      alert("Failed to record payment: " + err.message);
    }
  };

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setIsProfileModalOpen(true);
  };

  const openEditCustomer = () => {
    setEditingCustomer(selectedCustomer);
    setIsProfileModalOpen(true);
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchTerm.toLowerCase();
    return !q || 
      c.name?.toLowerCase().includes(q) || 
      c.phone?.toLowerCase().includes(q) || 
      c.city?.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
            Customer Ledgers (Udhar)
          </h1>
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "5px", fontWeight: 400, lineHeight: 1 }}>
            Manage customer profiles, outstanding balances, and payment recoveries.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {selectedCustomer && (
            <button className="btn btn-secondary" onClick={openEditCustomer}>
              Edit Profile
            </button>
          )}
          {selectedCustomer && selectedCustomer.balanceDue > 0 && (
            <button className="btn" style={{ background: "#10b981", color: "#fff", border: "none" }} onClick={() => setIsPaymentModalOpen(true)}>
              <CheckSquare size={14} style={{ marginRight: "6px" }} /> Receive Payment
            </button>
          )}
          <button className="btn btn-primary" onClick={openNewCustomer}>
            <Plus size={14} /> New Customer
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT (Split View) ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: "320px", flexShrink: 0 }}>
          <CustomerList 
            customers={filteredCustomers}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCustomerId={selectedCustomer?.id}
            onSelectCustomer={handleSelectCustomer}
          />
        </div>
        
        {/* Main Area */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CustomerTimelineView 
            customer={selectedCustomer}
            timeline={timeline}
          />
        </div>
      </div>

      {isProfileModalOpen && (
        <CustomerProfileModal 
          customer={editingCustomer}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveCustomer}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentRecoveryModal 
          customer={selectedCustomer}
          onClose={() => setIsPaymentModalOpen(false)}
          onSave={handlePaymentRecovery}
        />
      )}
    </div>
  );
}
