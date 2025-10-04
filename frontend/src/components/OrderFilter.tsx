// ========================================
// ORDER FILTER COMPONENT
// ========================================

import React, { useState } from "react";
import "./OrderFilter.css";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * FilterOptions: Complete filtering configuration interface
 * Defines all available filtering and sorting options for orders
 */
export interface FilterOptions {
  search: string; // Text search query
  status: "all" | "submitted" | "processing" | "completed" | "failed"; // Order status filter
  priority: "all" | "low" | "medium" | "high" | "urgent"; // Priority level filter
  sortBy: "timestamp" | "orderId" | "priority" | "orderValue" | "customerName"; // Sort field
  sortOrder: "asc" | "desc"; // Sort direction
  dateRange: {
    // Date range filtering
    start: string; // Start date (ISO string)
    end: string; // End date (ISO string)
  };
}

/**
 * OrderFilterProps: Component props interface
 * Defines the contract between OrderFilter and its parent component
 */
interface OrderFilterProps {
  filters: FilterOptions; // Current filter state
  onFiltersChange: (filters: FilterOptions) => void; // Callback for filter changes
  onExport: () => void; // Callback for export action
  orderCount: number; // Number of filtered orders
}

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * OrderFilter Component: Advanced filtering and search interface
 *
 * Features:
 * - Real-time text search across multiple fields
 * - Status and priority filtering
 * - Date range selection
 * - Multiple sorting options
 * - Export functionality
 * - Collapsible advanced filters
 * - Order count display
 *
 * @param filters - Current filter configuration
 * @param onFiltersChange - Callback to update filters
 * @param onExport - Callback to trigger data export
 * @param orderCount - Number of orders matching current filters
 */
const OrderFilter: React.FC<OrderFilterProps> = ({
  filters,
  onFiltersChange,
  onExport,
  orderCount,
}) => {
  // ========================================
  // COMPONENT STATE
  // ========================================

  // Controls visibility of advanced filter options
  const [isExpanded, setIsExpanded] = useState(false);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle changes to filter options
   * @param key - Filter option key to update
   * @param value - New value for the filter option
   */
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  /**
   * Handle date range filter changes
   * @param key - Date range key (start or end)
   * @param value - New date value
   */
  const handleDateRangeChange = (key: "start" | "end", value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, [key]: value },
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      priority: "all",
      sortBy: "timestamp",
      sortOrder: "desc",
      dateRange: { start: "", end: "" },
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.dateRange.start ||
    filters.dateRange.end;

  return (
    <div className="order-filter">
      <div className="filter-header">
        <div className="filter-main">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search orders, customers, or items..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="search-input"
            />
            <button
              type="button"
              className="filter-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              🔍 Filters{" "}
              {hasActiveFilters && <span className="filter-badge">•</span>}
            </button>
          </div>

          <div className="filter-actions">
            <span className="order-count">{orderCount} orders</span>
            <button type="button" onClick={onExport} className="export-btn">
              📊 Export
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="filter-expanded">
            <div className="filter-row">
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Priority:</label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">🔴 Urgent</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Sort by:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                >
                  <option value="timestamp">Date</option>
                  <option value="orderId">Order ID</option>
                  <option value="priority">Priority</option>
                  <option value="orderValue">Value</option>
                  <option value="customerName">Customer</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Order:</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    handleFilterChange(
                      "sortOrder",
                      e.target.value as "asc" | "desc"
                    )
                  }
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>From Date:</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) =>
                    handleDateRangeChange("start", e.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label>To Date:</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateRangeChange("end", e.target.value)}
                />
              </div>

              <div className="filter-group">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="clear-filters-btn"
                  disabled={!hasActiveFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderFilter;
