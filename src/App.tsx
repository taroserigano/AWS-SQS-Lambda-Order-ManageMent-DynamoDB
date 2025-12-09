// ========================================
// MAIN APP COMPONENT - ORDER MANAGEMENT SYSTEM
// ========================================

// React imports for state management and lifecycle hooks
import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

// Component imports with their associated types
import OrderForm, { OrderFormData } from "./components/OrderForm";
import OrderHistory, { Order } from "./components/OrderHistory";
import OrderFilter, { FilterOptions } from "./components/OrderFilter";
import OrderAnalytics from "./components/OrderAnalytics";

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
// Helper: derive initial view from URL ?view=orders|analytics or localStorage
const resolveInitialView = (): "orders" | "analytics" => {
  if (typeof window === "undefined") return "orders";
  const valid = (v: string | null): v is "orders" | "analytics" =>
    v === "orders" || v === "analytics";
  const urlView = new URLSearchParams(window.location.search).get("view");
  const storedView = localStorage.getItem("currentView");
  if (valid(urlView)) return urlView;
  if (valid(storedView)) return storedView;
  return "orders";
};

function App() {
  // ========================================
  // STATE DECLARATIONS
  // ========================================

  // Main orders array - stores all order data with full lifecycle tracking
  const [orders, setOrders] = useState<Order[]>([]);

  // Loading state for form submission and API calls
  const [isLoading, setIsLoading] = useState(false);

  // View switching between order management and analytics dashboard
  const [currentView, setCurrentView] = useState<"orders" | "analytics">(
    resolveInitialView
  );

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

  // ========================================
  // EFFECTS FOR DATA PERSISTENCE
  // ========================================

  /**
   * Load orders from localStorage on component mount
   * Handles date deserialization since JSON.parse doesn't restore Date objects
   */
  useEffect(() => {
    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      const parsedOrders = JSON.parse(savedOrders).map((order: any) => ({
        ...order,
        // Convert timestamp string back to Date object
        timestamp: new Date(order.timestamp),
        // Handle optional estimated delivery date
        estimatedDelivery: order.estimatedDelivery
          ? new Date(order.estimatedDelivery)
          : undefined,
      }));
      setOrders(parsedOrders);
    }
  }, []); // Empty dependency array - runs only on mount

  /**
   * Save orders to localStorage whenever orders array changes
   * Provides data persistence across browser sessions
   */
  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]); // Runs whenever orders array changes

  // Persist view to URL/localStorage so root "/" doesn’t force Orders
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("currentView", currentView);
    const url = new URL(window.location.href);
    url.searchParams.set("view", currentView);
    window.history.replaceState(null, "", url.toString());
  }, [currentView]);

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

      // Send order to AWS SQS via API Gateway
      const response = await ApiService.submitOrder(orderData.orderId);

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
   * Clear all order history and remove from localStorage
   * Used by OrderHistory component's clear button
   */
  const handleClearHistory = () => {
    setOrders([]);
    localStorage.removeItem("orders");
  };

  /**
   * Export filtered orders as JSON file
   * Creates downloadable file with current filtered dataset
   */
  const handleExport = () => {
    // Convert filtered orders to JSON string with formatting
    const dataStr = JSON.stringify(filteredOrders, null, 2);

    // Create downloadable blob
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    // Create temporary download link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-export-${
      new Date().toISOString().split("T")[0] // Current date in YYYY-MM-DD format
    }.json`;
    link.click();

    // Clean up object URL to prevent memory leaks
    URL.revokeObjectURL(url);

    // Show success notification with export count
    showNotification(`Exported ${filteredOrders.length} orders`, "success");
  };

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
            onClick={() => setCurrentView("orders")}
          >
            📋 Orders
          </button>
          <button
            className={currentView === "analytics" ? "active" : ""}
            onClick={() => setCurrentView("analytics")}
          >
            📊 Analytics
          </button>
        </div>
      </header>

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
            {/* Order Submission Form */}
            <OrderForm
              onOrderSubmit={handleOrderSubmit}
              isLoading={isLoading}
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
        ) : (
          // ========================================
          // ANALYTICS VIEW - Business intelligence dashboard
          // ========================================
          <OrderAnalytics orders={orders} /> // Pass all orders for complete analytics
        )}
      </main>
    </div>
  );
}

export default App;
