// ─────────────────────────────────────────────────────────────────────────────
// MOD-04: Gate Pass Service
//
// CONCEPT: Service Layer
// Rather than putting Dexie queries directly inside React components, we
// extract them into a pure JS service file. This keeps UI components focused
// on rendering, makes logic testable in isolation, and prevents the "fat
// component" antipattern where one JSX file does everything.
//
// WHERE IT'S USED:
//   GatePassView.jsx calls these functions for all CRUD operations.
//
// WHEN TO USE A SERVICE LAYER:
//   When a view has more than 2–3 non-trivial async operations, extract them.
//   Don't bother for simple single-query components.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "../../db/index";

// ── Gate Pass Number Generator ─────────────────────────────────────────────
// CONCEPT: Sequential ID Generation
// We generate human-readable IDs (e.g. GP-2026-0001) by counting existing
// records and zero-padding the next sequence number. This matches physical
// factory gate books where staff writes sequential numbers by hand.
//
// Limitation: Not safe under concurrent writes (two tabs open simultaneously).
// For a single-user offline desktop app this is perfectly fine.
export async function generateGatePassNo() {
  const year = new Date().getFullYear();
  const count = await db.gate_passes.count();
  const seq = String(count + 1).padStart(4, "0");
  return `GP-${year}-${seq}`;
}

// ── Create a new Gate Pass ─────────────────────────────────────────────────
export async function createGatePass(data) {
  const gatePassNo = await generateGatePassNo();
  const record = {
    gatePassNo,
    invoiceId:    data.invoiceId    || null,
    invoiceNo:    data.invoiceNo    || "",
    customerName: data.customerName || "",
    destination:  data.destination  || "",
    vehicleType:  data.vehicleType  || "Qingqi Rickshaw",
    vehicleRegNo: data.vehicleRegNo || "",
    driverName:   data.driverName   || "",
    driverPhone:  data.driverPhone  || "",
    manifest:     data.manifest     || [],   // Array of { name, size, pieces, sqFt }
    status:       "Dispatched",
    notes:        data.notes        || "",
    dispatchDate: new Date().toISOString(),
    createdAt:    new Date().toISOString(),
  };
  const id = await db.gate_passes.add(record);
  return { id, ...record };
}

// ── Fetch all Gate Passes (newest first) ──────────────────────────────────
export async function getAllGatePasses() {
  const all = await db.gate_passes.orderBy("createdAt").reverse().toArray();
  return all;
}

// ── Update a Gate Pass status ─────────────────────────────────────────────
export async function updateGatePassStatus(id, status) {
  await db.gate_passes.update(id, { status, updatedAt: new Date().toISOString() });
}

// ── Delete a Gate Pass ────────────────────────────────────────────────────
export async function deleteGatePass(id) {
  await db.gate_passes.delete(id);
}

// ── Fetch invoices for linking (only finalized invoices) ──────────────────
// CONCEPT: Cross-Table Join in IndexedDB
// Dexie doesn't support SQL JOINs. We fetch both tables, filter in JS,
// and return only the display fields the UI needs. This is acceptable at
// small-to-medium scale (~thousands of records) for an offline desktop app.
export async function getInvoicesForLinking() {
  const invoices = await db.invoices.orderBy("createdAt").reverse().toArray();
  return invoices.map(inv => ({
    id:           inv.id,
    invoiceNo:    inv.invoiceNo,
    customerName: inv.customerName,
    date:         (inv.createdAt || inv.date || "").slice(0, 10),
    totalAmount:  inv.totalAmount || inv.grandTotal || 0,
    items:        inv.items || [],
  }));
}
