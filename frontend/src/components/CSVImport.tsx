/* ========================================
   CSV IMPORT COMPONENT
   ======================================== */

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import "./CSVImport.css";

// Order interface matching our main app structure
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

interface CSVImportProps {
  onImport: (orders: Order[]) => void;
  onClose: () => void;
}

/**
 * CSV Import Component
 *
 * Purpose:
 * - Import orders from CSV files into the application
 * - Validate CSV structure and data types
 * - Support drag-and-drop file upload
 * - Preview imported data before confirmation
 *
 * Features:
 * - Drag & drop file upload with visual feedback
 * - CSV parsing with papaparse library
 * - Data validation (required fields, formats, types)
 * - Preview table showing parsed data
 * - Error handling with detailed messages
 * - Support for multi-item orders (JSON array in CSV)
 *
 * CSV Format Expected:
 * customerName, customerEmail, items, priority, status, timestamp
 * John Doe, john@example.com, [{"productName":"Laptop","quantity":1,"price":999.99}], high, pending, 2024-01-15T10:30:00
 *
 * Usage:
 * <CSVImport onImport={handleImport} onClose={handleClose} />
 */
const CSVImport: React.FC<CSVImportProps> = ({ onImport, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<Order[]>([]);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle drag events for drag-and-drop functionality
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  /**
   * Handle file selection from input or drag-drop
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  /**
   * Validate individual order data
   * Ensures required fields are present and have correct types
   */
  const validateOrder = (row: any): Order | null => {
    try {
      // Required fields validation
      if (!row.customerName || !row.customerEmail || !row.items) {
        return null;
      }

      // Parse items (could be JSON string in CSV)
      let items;
      if (typeof row.items === "string") {
        items = JSON.parse(row.items);
      } else {
        items = row.items;
      }

      // Validate items structure
      if (!Array.isArray(items) || items.length === 0) {
        return null;
      }

      // Construct valid order object
      const order: Order = {
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderId: row.orderId || `ORD-${Date.now()}`,
        customerName: row.customerName.trim(),
        customerEmail: row.customerEmail.trim(),
        items: items.map((item: any) => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name || item.productName || "Unknown Product",
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        })),
        priority: ["low", "medium", "high", "urgent"].includes(row.priority)
          ? row.priority
          : "medium",
        status: ["submitted", "processing", "completed", "failed"].includes(
          row.status
        )
          ? row.status
          : "submitted",
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        orderValue: items.reduce(
          (sum: number, item: any) =>
            sum +
            (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
          0
        ),
      };

      return order;
    } catch (err) {
      console.error("Error validating order:", err);
      return null;
    }
  };

  /**
   * Parse CSV file using papaparse
   * Converts CSV data to Order objects with validation
   */
  const handleFile = (file: File) => {
    setError("");
    setFileName(file.name);

    // Check file type
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    // Parse CSV with papaparse
    Papa.parse(file, {
      header: true, // First row contains column names
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(
            `CSV parsing errors: ${results.errors
              .map((e) => e.message)
              .join(", ")}`
          );
          return;
        }

        // Validate and transform each row
        const validOrders: Order[] = [];
        const invalidRows: number[] = [];

        results.data.forEach((row: any, index: number) => {
          const order = validateOrder(row);
          if (order) {
            validOrders.push(order);
          } else {
            invalidRows.push(index + 2); // +2 because header is row 1, data starts at row 2
          }
        });

        if (validOrders.length === 0) {
          setError("No valid orders found in CSV file");
          return;
        }

        // Show warning if some rows were invalid
        if (invalidRows.length > 0) {
          setError(
            `Warning: ${
              invalidRows.length
            } invalid rows skipped (rows: ${invalidRows
              .slice(0, 5)
              .join(", ")}${invalidRows.length > 5 ? "..." : ""})`
          );
        }

        setPreview(validOrders);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  /**
   * Confirm import and send data to parent component
   */
  const handleConfirmImport = () => {
    if (preview.length > 0) {
      onImport(preview);
      onClose();
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="csv-import-overlay">
      <div className="csv-import-modal">
        <div className="csv-import-header">
          <h2>📥 Import Orders from CSV</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="csv-import-content">
          {/* Drag & Drop Upload Area */}
          {!preview.length && (
            <div
              className={`csv-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">📄</div>
              <p className="dropzone-text">Drag & drop your CSV file here</p>
              <p className="dropzone-or">or</p>
              <button onClick={handleBrowseClick} className="browse-button">
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              {fileName && <p className="file-name">Selected: {fileName}</p>}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div
              className={`csv-message ${
                error.startsWith("Warning") ? "warning" : "error"
              }`}
            >
              {error}
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="csv-preview">
              <h3>Preview ({preview.length} orders found)</h3>
              <div className="csv-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Items</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((order) => (
                      <tr key={order.id}>
                        <td>{order.customerName}</td>
                        <td>{order.customerEmail}</td>
                        <td>{order.items?.length || 0} item(s)</td>
                        <td>
                          <span
                            className={`priority-badge priority-${order.priority}`}
                          >
                            {order.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge status-${order.status}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>{new Date(order.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="preview-note">
                    Showing first 10 of {preview.length} orders
                  </p>
                )}
              </div>

              <div className="csv-actions">
                <button
                  onClick={() => setPreview([])}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="confirm-button"
                >
                  Import {preview.length} Orders
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!preview.length && (
            <div className="csv-instructions">
              <h4>📋 CSV Format Guide</h4>
              <p>Your CSV should include these columns:</p>
              <ul>
                <li>
                  <strong>orderId:</strong> Unique order identifier
                </li>
                <li>
                  <strong>customerName:</strong> Customer's full name
                </li>
                <li>
                  <strong>customerEmail:</strong> Valid email address
                </li>
                <li>
                  <strong>items:</strong> JSON array of products with name,
                  quantity, price
                </li>
                <li>
                  <strong>priority:</strong> low, medium, high, or urgent
                </li>
                <li>
                  <strong>status:</strong> submitted, processing, completed, or
                  failed
                </li>
                <li>
                  <strong>timestamp:</strong> ISO date string (optional)
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImport;
