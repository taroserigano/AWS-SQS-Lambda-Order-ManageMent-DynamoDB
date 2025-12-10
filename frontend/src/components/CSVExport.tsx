/* ========================================
   CSV EXPORT COMPONENT
   ======================================== */

import React, { useState } from "react";
import Papa from "papaparse";
import { format } from "date-fns";
import "./CSVExport.css";

interface Order {
  id: string;
  orderId: string;
  status: "submitted" | "processing" | "completed" | "failed";
  timestamp: Date;
  message?: string;
  priority: "low" | "medium" | "high" | "urgent";
  customerName?: string;
  customerEmail?: string;
  orderValue?: number;
  estimatedDelivery?: Date;
  items?: OrderItem[];
  processingTime?: number;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CSVExportProps {
  orders: Order[];
  onClose: () => void;
}

/**
 * CSV Export Component
 *
 * Purpose:
 * - Export orders to CSV format for external analysis
 * - Support multiple export formats (standard CSV, Excel-friendly)
 * - Allow filtering of exported data
 * - Generate downloadable CSV files
 *
 * Features:
 * - Multiple export formats (CSV, Excel-optimized)
 * - Filter by status, priority, date range
 * - Flatten nested items into readable format
 * - Automatic filename generation with timestamp
 * - Preview of data to be exported
 * - One-click download
 *
 * Export Formats:
 * 1. Standard CSV: Simple comma-separated format
 * 2. Excel-friendly: BOM prefix for proper UTF-8 in Excel
 *
 * Usage:
 * <CSVExport orders={allOrders} onClose={handleClose} />
 */
const CSVExport: React.FC<CSVExportProps> = ({ orders, onClose }) => {
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [includeItems, setIncludeItems] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  /**
   * Calculate total revenue for an order
   */
  const calculateTotal = (order: Order): number => {
    if (!order.items) return order.orderValue || 0;
    return order.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  };

  /**
   * Filter orders based on selected criteria
   */
  const getFilteredOrders = (): Order[] => {
    return orders.filter((order) => {
      const statusMatch =
        filterStatus === "all" || order.status === filterStatus;
      const priorityMatch =
        filterPriority === "all" || order.priority === filterPriority;
      return statusMatch && priorityMatch;
    });
  };

  /**
   * Transform orders into CSV-friendly format
   * Flattens nested data structures for spreadsheet compatibility
   */
  const transformOrdersForExport = (ordersToExport: Order[]) => {
    return ordersToExport.map((order) => {
      // Base order data
      const baseData: any = {
        "Order ID": order.orderId,
        "Customer Name": order.customerName || "N/A",
        "Customer Email": order.customerEmail || "N/A",
        Priority: order.priority ? order.priority.toUpperCase() : "N/A",
        Status: order.status ? order.status.toUpperCase() : "N/A",
        "Order Date": format(new Date(order.timestamp), "yyyy-MM-dd HH:mm:ss"),
        "Total Amount": `$${calculateTotal(order).toFixed(2)}`,
        "Item Count": order.items?.length || 0,
      };

      // Include detailed items if selected
      if (includeItems && order.items) {
        baseData["Items"] = order.items
          .map(
            (item) =>
              `${item.name} (Qty: ${
                item.quantity
              }, Price: $${item.price.toFixed(2)})`
          )
          .join(" | ");
      }

      return baseData;
    });
  };

  /**
   * Generate and download CSV file
   * Uses papaparse to convert JSON to CSV format
   */
  const handleExport = () => {
    const filteredOrders = getFilteredOrders();

    console.log(
      "Export clicked. Filtered orders count:",
      filteredOrders.length
    );

    if (filteredOrders.length === 0) {
      alert("No orders match the selected filters");
      return;
    }

    try {
      // Transform data
      const exportData = transformOrdersForExport(filteredOrders);
      console.log("Export data prepared:", exportData.length, "rows");

      // Convert to CSV using papaparse
      const csv = Papa.unparse(exportData, {
        quotes: true, // Wrap fields in quotes
        delimiter: ",",
        header: true,
      });

      console.log("CSV generated, length:", csv.length);

      // Add BOM for Excel if selected (helps Excel recognize UTF-8)
      const csvContent = exportFormat === "excel" ? "\uFEFF" + csv : csv;

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Generate filename with timestamp
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      const filename = `orders_export_${timestamp}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Export successful:", filename);

      // Close modal after successful export
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        "Export failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // Get filtered count for preview
  const filteredOrders = getFilteredOrders();
  const exportPreview = transformOrdersForExport(filteredOrders.slice(0, 3));

  return (
    <div className="csv-export-overlay">
      <div className="csv-export-modal">
        <div className="csv-export-header">
          <h2>📤 Export Orders to CSV</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="csv-export-content">
          {/* Export Options */}
          <div className="export-options">
            <h3>Export Settings</h3>

            {/* Format Selection */}
            <div className="option-group">
              <label>Export Format:</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={(e) => setExportFormat(e.target.value as "csv")}
                  />
                  <span>Standard CSV</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    value="excel"
                    checked={exportFormat === "excel"}
                    onChange={(e) => setExportFormat(e.target.value as "excel")}
                  />
                  <span>Excel-Friendly CSV (with BOM)</span>
                </label>
              </div>
            </div>

            {/* Include Items Checkbox */}
            <div className="option-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={includeItems}
                  onChange={(e) => setIncludeItems(e.target.checked)}
                />
                <span>Include detailed item information</span>
              </label>
            </div>

            {/* Filter Options */}
            <div className="option-group">
              <label htmlFor="status-filter">Filter by Status:</label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="priority-filter">Filter by Priority:</label>
              <select
                id="priority-filter"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Export Summary */}
          <div className="export-summary">
            <h3>Export Summary</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total Orders:</span>
                <span className="stat-value">{filteredOrders.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Revenue:</span>
                <span className="stat-value">
                  $
                  {filteredOrders
                    .reduce((sum, order) => sum + calculateTotal(order), 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">File Format:</span>
                <span className="stat-value">{exportFormat.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {exportPreview.length > 0 && (
            <div className="export-preview">
              <h3>Preview (first 3 rows)</h3>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(exportPreview[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value: any, cellIdx) => (
                          <td key={cellIdx}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="export-actions">
            <button onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="export-button"
              disabled={filteredOrders.length === 0}
            >
              📥 Export {filteredOrders.length} Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVExport;
