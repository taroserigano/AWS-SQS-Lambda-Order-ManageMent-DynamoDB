// ========================================
// MAIN APP COMPONENT - ORDER MANAGEMENT SYSTEM
// ========================================

// React imports for state management and lifecycle hooks
import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import "./styles/theme.css";

// Component imports with their associated types
import OrderForm, { OrderFormData } from "./components/OrderForm";
import OrderHistory, { Order } from "./components/OrderHistory";
import OrderFilter, { FilterOptions } from "./components/OrderFilter";
import OrderAnalytics from "./components/OrderAnalytics";
import AdvancedAnalytics from "./components/AdvancedAnalytics";
import CSVImport from "./components/CSVImport";
import CSVExport from "./components/CSVExport";
import NotificationSettings from "./components/NotificationSettings";

// Theme context for dark mode support
import { useTheme } from "./context/ThemeContext";

// Keyboard shortcuts hook for power users
import {
  useKeyboardShortcuts,
  getDefaultShortcuts,
  ShortcutsHelp,
} from "./hooks/useKeyboardShortcuts";

// Service for API communication with AWS backend
import { ApiService } from "./services/api";

/**
 * App Component: Main application component that manages the entire order system
 *
 * Features:
 * - Order submission and processing
 * - Real-time order tracking with status updates
 * - Advanced filtering and search functionality
 * - Analytics dashboard with business metrics
 * - Data persistence using localStorage
 * - Export functionality for order data
 * - Responsive design with view switching
 *
 * State Management:
 * - orders: Array of all orders with complete order lifecycle
 * - isLoading: Loading state for async operations
 * - currentView: Toggle between "orders" and "analytics" views
 * - filters: Complex filtering options for order display
 * - notification: User feedback system for success/error messages
 */
// VIEW INITIALIZATION FROM URL/LOCALSTORAGE
const resolveInitialView = (): "orders" | "analytics" | "advanced" => {
  if (typeof window === "undefined") return "analytics";
  const valid = (v: string | null): v is "orders" | "analytics" | "advanced" =>
    v === "orders" || v === "analytics" || v === "advanced";
  const paramsView = new URLSearchParams(window.location.search).get("view");
  const hashView = window.location.hash.replace("#", "") || null;
  const storedView = localStorage.getItem("currentView");
  if (valid(paramsView)) return paramsView;
  if (valid(hashView)) return hashView;
  if (valid(storedView)) return storedView;
  return "analytics"; // fallback is no longer "orders"
};

function App() {
  // ========================================
  // STATE DECLARATIONS
  // ========================================

  // Main orders array - stores all order data with full lifecycle tracking
  const [orders, setOrders] = useState<Order[]>([]);

  // Loading state for form submission and API calls
  const [isLoading, setIsLoading] = useState(false);

  // View switching between order management, analytics, and advanced analytics
  const [currentView, setCurrentView] = useState<
    "orders" | "analytics" | "advanced"
  >(resolveInitialView);

  // Complex filtering state for advanced order search and sorting
  const [filters, setFilters] = useState<FilterOptions>({
    search: "", // Text search across multiple fields
    status: "all", // Filter by order status
    priority: "all", // Filter by priority level
    sortBy: "timestamp", // Sort field selection
    sortOrder: "desc", // Sort direction (ascending/descending)
    dateRange: { start: "", end: "" }, // Date range filtering
  });

  // User notification system for feedback on actions
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // CSV Import/Export modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Keyboard shortcuts help modal
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Pending orders queue from CSV import
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [currentImportedOrder, setCurrentImportedOrder] =
    useState<Order | null>(null);

  // Theme management (dark mode)
  const { theme, toggleTheme } = useTheme();

  // ========================================
  // EFFECTS FOR DATA PERSISTENCE
  // ========================================

  /**
   * Load orders from DynamoDB via API on component mount
   * Handles date deserialization since JSON.parse doesn't restore Date objects
   */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const fetchedOrders = await ApiService.getOrders();
        console.log("Fetched orders from API:", fetchedOrders);

        // Convert timestamp strings back to Date objects
        const parsedOrders = fetchedOrders.map((order: any) => ({
          ...order,
          id: order.id || order.orderId, // Use orderId as fallback
          timestamp: order.timestamp ? new Date(order.timestamp) : new Date(),
          estimatedDelivery: order.estimatedDelivery
            ? new Date(order.estimatedDelivery)
            : undefined,
        }));

        setOrders(parsedOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
        showNotification("Failed to load orders from database", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []); // Empty dependency array - runs only on mount

  // Orders are now persisted in DynamoDB via API calls
  // No need for localStorage synchronization

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Display notification to user with auto-dismiss
   * @param message - Message to display
   * @param type - Notification type (success/error) for styling
   */
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    // Auto-dismiss notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  // ========================================
  // ORDER SUBMISSION HANDLER
  // ========================================

  /**
   * Handle order submission with full lifecycle management
   *
   * Process:
   * 1. Create order with 'submitted' status and add to local state
   * 2. Send to AWS SQS via API Gateway
   * 3. Update status to 'processing' on successful API response
   * 4. Simulate processing completion with status update to 'completed'
   * 5. Handle errors by updating status to 'failed'
   *
   * @param orderData - Form data from OrderForm component
   */
  const handleOrderSubmit = async (orderData: OrderFormData) => {
    setIsLoading(true);
    const startTime = Date.now(); // Track processing time for analytics

    // ========================================
    // CREATE LOCAL ORDER RECORD
    // ========================================

    // Create new order object with complete metadata
    const newOrder: Order = {
      id: `${Date.now()}-${Math.random()}`, // Unique local ID
      orderId: orderData.orderId, // User-provided order ID
      status: "submitted", // Initial status
      timestamp: new Date(), // Creation timestamp
      priority: orderData.priority, // Priority level
      customerName: orderData.customerName, // Customer information
      customerEmail: orderData.customerEmail,
      // Calculate total order value from items
      orderValue: orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
      // Add unique IDs to items for React key props
      items: orderData.items.map((item) => ({
        ...item,
        id: `${Date.now()}-${Math.random()}`,
      })),
      // Generate estimated delivery date (2-7 days from now)
      estimatedDelivery: new Date(
        Date.now() + (2 + Math.random() * 5) * 24 * 60 * 60 * 1000
      ),
    };

    // Add new order to the beginning of the orders array (newest first)
    setOrders((prev) => [newOrder, ...prev]);

    try {
      // ========================================
      // API CALL TO AWS BACKEND
      // ========================================

      // Send complete order data to AWS SQS via API Gateway
      const response = await ApiService.submitOrder({
        orderId: newOrder.orderId,
        customerName: newOrder.customerName || "",
        customerEmail: newOrder.customerEmail || "",
        priority: newOrder.priority,
        status: newOrder.status,
        orderValue: newOrder.orderValue || 0,
        timestamp: newOrder.timestamp.toISOString(),
        estimatedDelivery: newOrder.estimatedDelivery?.toISOString(),
        items: newOrder.items || [],
      });

      // ========================================
      // UPDATE ORDER STATUS ON SUCCESS
      // ========================================

      // Update order status to 'processing' after successful API response
      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderData.orderId
            ? {
                ...order,
                status: "processing" as const,
                message: response.message,
              }
            : order
        )
      );

      // Show success notification to user
      showNotification(
        `Order ${orderData.orderId} submitted successfully!`,
        "success"
      );

      // If this was an imported order, load the next one
      console.log("Checking if imported order:", {
        currentImportedOrder: currentImportedOrder?.orderId,
        submittedOrderId: orderData.orderId,
        match: currentImportedOrder?.orderId === orderData.orderId,
      });

      if (
        currentImportedOrder &&
        currentImportedOrder.orderId === orderData.orderId
      ) {
        console.log("Calling loadNextImportedOrder");
        loadNextImportedOrder();
      } else {
        console.log("NOT calling loadNextImportedOrder - no match");
      }

      // ========================================
      // SIMULATE ORDER PROCESSING COMPLETION
      // ========================================

      // Simulate backend processing time (3-8 seconds)
      const processingTime = 3000 + Math.random() * 5000;
      setTimeout(() => {
        const endTime = Date.now();
        const actualProcessingTime = (endTime - startTime) / 1000;

        // Update order to 'completed' status with processing time for analytics
        setOrders((prev) =>
          prev.map((order) =>
            order.orderId === orderData.orderId
              ? {
                  ...order,
                  status: "completed" as const,
                  message: "Order processing completed",
                  processingTime: actualProcessingTime, // For analytics dashboard
                }
              : order
          )
        );
      }, processingTime);
    } catch (error) {
      // ========================================
      // ERROR HANDLING
      // ========================================

      // Update order status to 'failed' with error message
      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderData.orderId
            ? {
                ...order,
                status: "failed" as const,
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
              }
            : order
        )
      );

      // Show error notification to user
      showNotification(
        error instanceof Error ? error.message : "Failed to submit order",
        "error"
      );
    } finally {
      // Always reset loading state regardless of success/failure
      setIsLoading(false);
    }
  };

  // ========================================
  // ADDITIONAL ACTION HANDLERS
  // ========================================

  /**
   * Clear all order history from local state
   * Note: This only clears the frontend state, not the database
   * Used by OrderHistory component's clear button
   */
  const handleClearHistory = () => {
    setOrders([]);
  };

  /**
   * Handle CSV Import - queue imported orders for manual submission
   */
  const handleImport = (importedOrders: Order[]) => {
    console.log("handleImport called with orders:", importedOrders.length);
    setPendingOrders(importedOrders);
    // Load the first order into the form
    if (importedOrders.length > 0) {
      console.log("Setting current imported order:", importedOrders[0].orderId);
      setCurrentImportedOrder(importedOrders[0]);
      setCurrentView("orders"); // Switch to orders view
      showNotification(
        `Imported ${importedOrders.length} orders. First order loaded into form.`,
        "success"
      );
    }
  };

  /**
   * Load next order from import queue into the form
   */
  const loadNextImportedOrder = () => {
    console.log(
      "loadNextImportedOrder called. Current queue length:",
      pendingOrders.length
    );
    // Remove the current order from the queue
    const remaining = pendingOrders.slice(1);
    console.log("Remaining orders after slice:", remaining.length);
    setPendingOrders(remaining);

    if (remaining.length > 0) {
      // Load the next order
      console.log("Loading next order:", remaining[0].orderId);
      setCurrentImportedOrder(remaining[0]);
      showNotification(
        `Loading next order. ${remaining.length} remaining.`,
        "success"
      );
    } else {
      // No more orders in queue
      console.log("No more orders in queue");
      setCurrentImportedOrder(null);
      showNotification("All imported orders have been processed.", "success");
    }
  };

  /**
   * Clear the import queue
   */
  const clearImportQueue = () => {
    setPendingOrders([]);
    setCurrentImportedOrder(null);
    showNotification("Import queue cleared.", "success");
  };

  /**
   * Export filtered orders as CSV file
   * Creates downloadable CSV file with current filtered dataset
   */
  const handleExport = () => {
    // Transform orders into CSV-friendly format
    const csvRows = filteredOrders.map((order) => {
      const orderDate = new Date(order.timestamp).toLocaleString();
      const estimatedDelivery = order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toLocaleDateString()
        : "N/A";
      const items =
        order.items
          ?.map(
            (item) =>
              `${item.name} (Qty: ${
                item.quantity
              }, Price: $${item.price.toFixed(2)})`
          )
          .join(" | ") || "N/A";

      return {
        "Order ID": order.orderId,
        "Customer Name": order.customerName || "N/A",
        "Customer Email": order.customerEmail || "N/A",
        Priority: (order.priority || "unknown").toUpperCase(),
        Status: (order.status || "unknown").toUpperCase(),
        "Order Date": orderDate,
        "Order Value": `$${(order.orderValue || 0).toFixed(2)}`,
        "Estimated Delivery": estimatedDelivery,
        Items: items,
        Message: order.message || "N/A",
        "Processing Time": order.processingTime
          ? `${order.processingTime}s`
          : "N/A",
      };
    });

    // Create CSV header
    const headers = Object.keys(csvRows[0] || {});
    const csvHeader = headers.map((h) => `"${h}"`).join(",");

    // Create CSV rows
    const csvData = csvRows
      .map((row) => {
        return headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] || "");
            // Escape quotes and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",");
      })
      .join("\n");

    // Combine header and data
    const csvContent = csvHeader + "\n" + csvData;

    // Create downloadable blob
    const dataBlob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(dataBlob);

    // Create temporary download link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-export-${
      new Date().toISOString().split("T")[0] // Current date in YYYY-MM-DD format
    }.csv`;
    link.click();

    // Clean up object URL to prevent memory leaks
    URL.revokeObjectURL(url);

    // Show success notification with export count
    showNotification(
      `Exported ${filteredOrders.length} orders as CSV`,
      "success"
    );
  };

  // ========================================
  // KEYBOARD SHORTCUTS CONFIGURATION
  // ========================================

  /**
   * Configure global keyboard shortcuts for power users
   */
  const keyboardShortcuts = getDefaultShortcuts({
    newOrder: () => {
      setCurrentView("orders");
      // Focus on order form (scroll to top)
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    toggleTheme: toggleTheme,
    showHelp: () => setShowShortcutsHelp(true),
    exportData: () => setShowExportModal(true),
    importData: () => setShowImportModal(true),
    refresh: async () => {
      // Reload orders from API
      try {
        setIsLoading(true);
        const fetchedOrders = await ApiService.getOrders();
        const parsedOrders = fetchedOrders.map((order: any) => ({
          ...order,
          id: order.id || order.orderId,
          timestamp: order.timestamp ? new Date(order.timestamp) : new Date(),
          estimatedDelivery: order.estimatedDelivery
            ? new Date(order.estimatedDelivery)
            : undefined,
        }));
        setOrders(parsedOrders);
        showNotification("Orders refreshed from database", "success");
      } catch (error) {
        console.error("Error refreshing orders:", error);
        showNotification("Failed to refresh orders", "error");
      } finally {
        setIsLoading(false);
      }
    },
    closeModal: () => {
      setShowImportModal(false);
      setShowExportModal(false);
      setShowShortcutsHelp(false);
    },
    search: () => {
      // Focus on search input
      const searchInput = document.querySelector(
        'input[placeholder*="Search"]'
      ) as HTMLInputElement;
      searchInput?.focus();
    },
  });

  // Activate keyboard shortcuts
  useKeyboardShortcuts(keyboardShortcuts);

  // ========================================
  // COMPUTED VALUES - FILTERING AND SORTING
  // ========================================

  /**
   * Filter and sort orders based on current filter state
   * Uses useMemo for performance optimization - only recalculates when orders or filters change
   *
   * Filtering capabilities:
   * - Text search across order ID, customer info, and item names
   * - Status filtering (submitted, processing, completed, failed)
   * - Priority filtering (low, medium, high, urgent)
   * - Date range filtering with start/end dates
   *
   * Sorting capabilities:
   * - Sort by timestamp, order ID, priority, order value, or customer name
   * - Ascending or descending order
   */
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // ========================================
    // TEXT SEARCH FILTERING
    // ========================================
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          // Search in order ID
          order.orderId.toLowerCase().includes(searchLower) ||
          // Search in customer name
          order.customerName?.toLowerCase().includes(searchLower) ||
          // Search in customer email
          order.customerEmail?.toLowerCase().includes(searchLower) ||
          // Search in item names
          order.items?.some((item) =>
            item.name.toLowerCase().includes(searchLower)
          )
      );
    }

    // ========================================
    // STATUS FILTERING
    // ========================================
    if (filters.status !== "all") {
      filtered = filtered.filter((order) => order.status === filters.status);
    }

    // ========================================
    // PRIORITY FILTERING
    // ========================================
    if (filters.priority !== "all") {
      filtered = filtered.filter(
        (order) => order.priority === filters.priority
      );
    }

    // ========================================
    // DATE RANGE FILTERING
    // ========================================
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter((order) => order.timestamp >= startDate);
    }
    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter((order) => order.timestamp <= endDate);
    }

    // ========================================
    // SORTING LOGIC
    // ========================================
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      // Determine values to compare based on sort field
      switch (filters.sortBy) {
        case "timestamp":
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case "orderId":
          aValue = a.orderId;
          bValue = b.orderId;
          break;
        case "priority":
          // Convert priority to numeric values for proper sorting
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case "orderValue":
          aValue = a.orderValue || 0;
          bValue = b.orderValue || 0;
          break;
        case "customerName":
          aValue = a.customerName || "";
          bValue = b.customerName || "";
          break;
        default:
          // Default to timestamp sorting
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      // Apply sort direction (ascending or descending)
      if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1;
      return 0; // Equal values
    });

    return filtered;
  }, [orders, filters]); // Recalculate when orders or filters change

  // ========================================
  // VIEW PERSISTENCE TO URL/LOCALSTORAGE
  // ========================================

  useEffect(() => {
    // Persist view selection for deep-linking Advanced Analytics
    if (typeof window === "undefined") return;
    localStorage.setItem("currentView", currentView);
    const url = new URL(window.location.href);
    url.searchParams.set("view", currentView);
    window.history.replaceState(null, "", url.toString());
  }, [currentView]);

  // ========================================
  // VIEW CHANGE HANDLER
  // ========================================

  /**
   * Centralized handler for view switching
   */
  const handleViewChange = (view: "orders" | "analytics" | "advanced") =>
    setCurrentView(view);

  // ========================================
  // COMPONENT RENDER
  // ========================================

  return (
    <div className="App">
      {/* ========================================
          HEADER SECTION
          ======================================== */}
      <header className="App-header">
        <h1>🛒 Advanced Order Management System</h1>
        <p>Complete order processing with analytics and real-time tracking</p>

        {/* View Toggle Buttons */}
        <div className="view-toggle">
          <button
            className={currentView === "orders" ? "active" : ""}
            onClick={() => handleViewChange("orders")}
          >
            📋 Orders
          </button>
          <button
            className={currentView === "analytics" ? "active" : ""}
            onClick={() => handleViewChange("analytics")}
          >
            📊 Analytics
          </button>
          <button
            className={currentView === "advanced" ? "active" : ""}
            onClick={() => handleViewChange("advanced")}
          >
            📈 Advanced Analytics
          </button>
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
          <button
            className="action-button import-button"
            onClick={() => setShowImportModal(true)}
            title="Import orders from CSV (Ctrl+I)"
          >
            📥 Import
          </button>
          <button
            className="action-button export-button"
            onClick={() => setShowExportModal(true)}
            title="Export orders to CSV (Ctrl+E)"
          >
            📤 Export
          </button>
        </div>
      </header>

      {/* ========================================
          THEME TOGGLE BUTTON
          ======================================== */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={`Switch to ${
          theme === "light" ? "dark" : "light"
        } mode (Ctrl+K)`}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      {/* ========================================
          SHORTCUTS HELP BUTTON
          ======================================== */}
      <button
        className="shortcuts-button"
        onClick={() => setShowShortcutsHelp(true)}
        title="Keyboard shortcuts (Ctrl+/)"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "var(--card-bg)",
          border: "2px solid var(--border-color)",
          cursor: "pointer",
          fontSize: "1.5rem",
          zIndex: 1000,
        }}
      >
        ⌨️
      </button>

      {/* ========================================
          MAIN CONTENT AREA
          ======================================== */}
      <main className="App-main">
        {/* User Notification Display */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Conditional View Rendering */}
        {currentView === "orders" ? (
          // ========================================
          // ORDERS VIEW - Main order management interface
          // ========================================
          <>
            {/* Email Notification Settings */}
            <NotificationSettings
              onSubscribe={async (email, preferences) => {
                await ApiService.subscribeEmail(email, preferences);
              }}
              onUnsubscribe={async (email) => {
                await ApiService.unsubscribeEmail(email);
              }}
            />

            {/* Order Submission Form */}
            <OrderForm
              onOrderSubmit={handleOrderSubmit}
              isLoading={isLoading}
              importedOrder={currentImportedOrder}
              importQueueCount={pendingOrders.length}
              onClearQueue={clearImportQueue}
            />

            {/* Advanced Filtering Controls */}
            <OrderFilter
              filters={filters}
              onFiltersChange={setFilters}
              onExport={handleExport}
              orderCount={filteredOrders.length}
            />

            {/* Order History Display */}
            <OrderHistory
              orders={filteredOrders} // Pass filtered orders
              onClearHistory={handleClearHistory}
            />
          </>
        ) : currentView === "analytics" ? (
          // ========================================
          // ANALYTICS VIEW - Business intelligence dashboard
          // ========================================
          <OrderAnalytics orders={orders} /> // Pass all orders for complete analytics
        ) : (
          // ========================================
          // ADVANCED ANALYTICS VIEW - Charts and visualizations
          // ========================================
          <AdvancedAnalytics orders={orders} />
        )}
      </main>

      {/* ========================================
          MODALS - CSV Import/Export and Shortcuts Help
          ======================================== */}
      {showImportModal && (
        <CSVImport
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showExportModal && (
        <CSVExport orders={orders} onClose={() => setShowExportModal(false)} />
      )}

      {showShortcutsHelp && (
        <ShortcutsHelp
          shortcuts={keyboardShortcuts}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
}

export default App;
