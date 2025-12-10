import React, { useState, useCallback } from "react";
import "./OrderHistory.css";

export interface Order {
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
  processingTime?: number; // in seconds
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderHistoryProps {
  orders: Order[];
  onClearHistory: () => void;
}

const OrderHistory: React.FC<OrderHistoryProps> = React.memo(
  ({ orders, onClearHistory }) => {
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(
      new Set()
    );

    const toggleOrderDetails = useCallback((orderId: string) => {
      setExpandedOrders((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(orderId)) {
          newSet.delete(orderId);
        } else {
          newSet.add(orderId);
        }
        return newSet;
      });
    }, []);

    const getPriorityIcon = (priority: Order["priority"]) => {
      switch (priority) {
        case "urgent":
          return "🔴";
        case "high":
          return "🟠";
        case "medium":
          return "🟡";
        case "low":
          return "🟢";
        default:
          return "⚪";
      }
    };
    const getStatusIcon = (status: Order["status"]) => {
      switch (status) {
        case "submitted":
          return "📝";
        case "processing":
          return "⏳";
        case "completed":
          return "✅";
        case "failed":
          return "❌";
        default:
          return "❓";
      }
    };

    const getStatusClass = (status: Order["status"] | "unknown") => {
      return `status-${status}`;
    };

    return (
      <div className="order-history">
        <div className="history-header">
          <h2>Order History</h2>
          {orders.length > 0 && (
            <button onClick={onClearHistory} className="clear-btn">
              Clear History
            </button>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="empty-history">
            <p>No orders submitted yet</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const statusLabel = order.status || "unknown";
              const priorityLabel = order.priority || "unknown";
              return (
                <div
                  key={order.id}
                  className={`order-item ${getStatusClass(statusLabel)}`}
                >
                  <div
                    className="order-header"
                    onClick={() => toggleOrderDetails(order.id)}
                  >
                    <div className="order-info">
                      <div className="order-id">
                        <span className="status-icon">
                          {getStatusIcon(order.status)}
                        </span>
                        <strong>{order.orderId}</strong>
                        <strong>
                          {order.customerName && (
                            <span className="customer-name">
                              • {order.customerName}
                            </span>
                          )}
                        </strong>
                      </div>
                      <div className="order-meta">
                        <span className="timestamp">
                          {order.timestamp.toLocaleString()}
                        </span>
                        <span
                          className={`status ${getStatusClass(statusLabel)}`}
                        >
                          {statusLabel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button className="expand-toggle">
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="order-details">
                      <div className="details-grid">
                        {/* Customer Information */}
                        <div className="detail-section">
                          <h4>📧 Customer</h4>
                          <p>
                            <strong>Name:</strong> {order.customerName || "N/A"}
                          </p>
                          <p>
                            <strong>Email:</strong>{" "}
                            {order.customerEmail || "N/A"}
                          </p>
                        </div>

                        {/* Order Information */}
                        <div className="detail-section">
                          <h4>📦 Order Info</h4>
                          <p>
                            <strong>Priority:</strong>{" "}
                            <span className="priority-badge">
                              {getPriorityIcon(order.priority)}{" "}
                              {priorityLabel.toUpperCase()}
                            </span>
                          </p>
                          <p>
                            <strong>Value:</strong> $
                            {(order.orderValue || 0).toFixed(2)}
                          </p>
                          {order.estimatedDelivery && (
                            <p>
                              <strong>Est. Delivery:</strong>{" "}
                              {new Date(
                                order.estimatedDelivery
                              ).toLocaleDateString()}
                            </p>
                          )}
                          {order.processingTime && (
                            <p>
                              <strong>Processing Time:</strong>{" "}
                              {order.processingTime}s
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items List */}
                      {order.items && order.items.length > 0 && (
                        <div className="items-section">
                          <h4>🛒 Items ({order.items.length})</h4>
                          <div className="items-list">
                            {order.items.map((item) => (
                              <div key={item.id} className="item-row">
                                <span className="item-name">{item.name}</span>
                                <span className="item-quantity">
                                  Qty: {item.quantity}
                                </span>
                                <span className="item-price">
                                  ${item.price.toFixed(2)}
                                </span>
                                <span className="item-total">
                                  ${(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message */}
                      {order.message && (
                        <div className="message-section">
                          <h4>💬 Message</h4>
                          <div className="order-message">{order.message}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

export default OrderHistory;
