import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable GlobalPagination Component
 * Matches the user screenshot: rounded square buttons, royal blue active (#2563eb),
 * soft gray border (#CBD5E1), light chevrons.
 * Always renders [ < ] [ 1 ] [ > ] even when records = 0 or totalPages = 1.
 */
export default function GlobalPagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  showRecordCount = true,
  language = "en"
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeActivePage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  const startRecord = totalRecords === 0 ? 0 : (safeActivePage - 1) * pageSize + 1;
  const endRecord = Math.min(safeActivePage * pageSize, totalRecords);

  // Generate page numbers with smart ellipsis if many pages
  const getPageNumbers = () => {
    if (safeTotalPages <= 5) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (safeActivePage <= 3) {
      pages.push(1, 2, 3, 4, "...", safeTotalPages);
    } else if (safeActivePage >= safeTotalPages - 2) {
      pages.push(1, "...", safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
    } else {
      pages.push(1, "...", safeActivePage - 1, safeActivePage, safeActivePage + 1, "...", safeTotalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 18px",
        borderTop: "1px solid var(--border-color, #E2E8F0)",
        fontSize: "0.82rem",
        color: "#64748b",
        flexWrap: "wrap",
        gap: "10px",
        userSelect: "none"
      }}
    >
      {showRecordCount && (
        <div style={{ fontWeight: 500 }}>
          {language === "ur" ? (
            <span>
              <strong>{totalRecords}</strong> میں سے <strong>{startRecord}</strong> تا <strong>{endRecord}</strong> ریکارڈز
            </span>
          ) : (
            <span>
              Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of <strong>{totalRecords}</strong> records
            </span>
          )}
        </div>
      )}

      {/* Pagination button strip [ < ] [ 1 ] [ 2 ] [ > ] */}
      <div className="global-pagination" style={{ marginLeft: "auto" }}>
        {/* Previous Button */}
        <button
          type="button"
          disabled={safeActivePage <= 1}
          onClick={() => onPageChange && onPageChange(safeActivePage - 1)}
          className="pagination-btn"
          title={language === "ur" ? "پچھلا صفحہ" : "Previous Page"}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  width: "28px",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontWeight: 700,
                  fontSize: "0.9rem"
                }}
              >
                ...
              </span>
            );
          }
          const isActive = p === safeActivePage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange && onPageChange(Number(p))}
              className={`pagination-btn ${isActive ? "active" : ""}`}
            >
              {p}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          disabled={safeActivePage >= safeTotalPages}
          onClick={() => onPageChange && onPageChange(safeActivePage + 1)}
          className="pagination-btn"
          title={language === "ur" ? "اگلا صفحہ" : "Next Page"}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
