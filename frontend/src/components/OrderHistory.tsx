import React from "react";
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

const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  onClearHistory,
}) => {
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

  const getStatusClass = (status: Order["status"]) => {
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
          {orders.map((order) => (
            <div
              key={order.id}
              className={`order-item ${getStatusClass(order.status)}`}
            >
              <div className="order-info">
                <div className="order-id">
                  <span className="status-icon">
                    {getStatusIcon(order.status)}
                  </span>
                  <strong>{order.orderId}</strong>
                </div>
                <div className="order-meta">
                  <span className="timestamp">
                    {order.timestamp.toLocaleString()}
                  </span>
                  <span className={`status ${getStatusClass(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
              {order.message && (
                <div className="order-message">{order.message}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
