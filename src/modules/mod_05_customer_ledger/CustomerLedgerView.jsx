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
import { useLanguage } from "../../context/LanguageContext";

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
      <div style={{ paddingBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
            Customer Ledgers
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px", fontWeight: 500, lineHeight: 1 }}>
            Manage customer accounts and outstanding balances.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-primary" onClick={openNewCustomer}>
            <Plus size={16} style={{ marginRight: "6px" }} /> New Customer
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT (Split View) ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden", minHeight: 0, boxShadow: "var(--shadow-sm)" }}>
        {/* Sidebar */}
        <div style={{ width: "34%", flexShrink: 0, borderRight: "1px solid var(--border-divider)", display: "flex", flexDirection: "column" }}>
          <CustomerList 
            customers={filteredCustomers}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCustomerId={selectedCustomer?.id}
            onSelectCustomer={handleSelectCustomer}
          />
        </div>
        
        {/* Main Area */}
        <div style={{ width: "66%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <CustomerTimelineView 
            customer={selectedCustomer}
            timeline={timeline}
            onOpenEditProfile={openEditCustomer}
            onOpenReceivePayment={() => setIsPaymentModalOpen(true)}
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
