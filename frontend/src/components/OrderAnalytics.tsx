// ========================================
// ORDER ANALYTICS COMPONENT
// ========================================

import React from "react";
import { Order } from "./OrderHistory";
import "./OrderAnalytics.css";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * OrderAnalyticsProps: Component props interface
 * Defines the data required for analytics calculations
 */
interface OrderAnalyticsProps {
  orders: Order[]; // Complete array of orders for analysis
}

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * OrderAnalytics Component: Business intelligence dashboard
 *
 * Features:
 * - Order status distribution and metrics
 * - Priority level analysis
 * - Processing time analytics
 * - Customer behavior insights
 * - Revenue and value calculations
 * - Visual data representation with progress bars
 * - Key performance indicators (KPIs)
 *
 * @param orders - Array of all orders for comprehensive analysis
 */
const OrderAnalytics: React.FC<OrderAnalyticsProps> = React.memo(({ orders }) => {
  // ========================================
  // BASIC ORDER STATISTICS
  // ========================================

  // Total counts by status
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const failedOrders = orders.filter((o) => o.status === "failed").length;
  const processingOrders = orders.filter(
    (o) => o.status === "processing"
  ).length;
  const submittedOrders = orders.filter((o) => o.status === "submitted").length;

  // ========================================
  // FINANCIAL METRICS
  // ========================================

  // Calculate total and average order values
  const totalValue = orders.reduce(
    (sum, order) => sum + (order.orderValue || 0),
    0
  );
  const averageValue = totalOrders > 0 ? totalValue / totalOrders : 0;

  // ========================================
  // PERFORMANCE METRICS
  // ========================================

  // Calculate success and failure rates
  const completionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const failureRate = totalOrders > 0 ? (failedOrders / totalOrders) * 100 : 0;

  // ========================================
  // PRIORITY DISTRIBUTION ANALYSIS
  // ========================================

  // Count orders by priority level for resource planning
  const priorityStats = {
    urgent: orders.filter((o) => o.priority === "urgent").length,
    high: orders.filter((o) => o.priority === "high").length,
    medium: orders.filter((o) => o.priority === "medium").length,
    low: orders.filter((o) => o.priority === "low").length,
  };

  // ========================================
  // PROCESSING TIME ANALYTICS
  // ========================================

  // Filter completed orders that have processing time data
  const completedOrdersWithTime = orders.filter(
    (o) => o.status === "completed" && o.processingTime
  );
  const averageProcessingTime =
    completedOrdersWithTime.length > 0
      ? completedOrdersWithTime.reduce(
          (sum, order) => sum + (order.processingTime || 0),
          0
        ) / completedOrdersWithTime.length
      : 0;

  // Recent activity (last 24 hours)
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter((o) => o.timestamp > last24Hours).length;

  // Top customers
  const customerStats = orders.reduce((acc, order) => {
    if (order.customerName) {
      acc[order.customerName] =
        (acc[order.customerName] || 0) + (order.orderValue || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = Object.entries(customerStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="order-analytics">
      <h2>📊 Order Analytics</h2>

      <div className="analytics-grid">
        {/* Key Metrics */}
        <div className="metric-card total-orders">
          <div className="metric-value">{totalOrders}</div>
          <div className="metric-label">Total Orders</div>
          <div className="metric-change">+{recentOrders} last 24h</div>
        </div>

        <div className="metric-card completion-rate">
          <div className="metric-value">{completionRate.toFixed(1)}%</div>
          <div className="metric-label">Completion Rate</div>
          <div className="metric-change">{completedOrders} completed</div>
        </div>

        <div className="metric-card total-value">
          <div className="metric-value">${totalValue.toFixed(2)}</div>
          <div className="metric-label">Total Value</div>
          <div className="metric-change">Avg: ${averageValue.toFixed(2)}</div>
        </div>

        <div className="metric-card processing-time">
          <div className="metric-value">
            {averageProcessingTime.toFixed(1)}s
          </div>
          <div className="metric-label">Avg Processing Time</div>
          <div className="metric-change">
            {completedOrdersWithTime.length} samples
          </div>
        </div>

        {/* Status Distribution */}
        <div className="chart-card status-distribution">
          <h3>Order Status Distribution</h3>
          <div className="status-chart">
            <div className="status-bar">
              <div
                className="status-segment completed"
                style={{ width: `${(completedOrders / totalOrders) * 100}%` }}
                title={`Completed: ${completedOrders}`}
              ></div>
              <div
                className="status-segment processing"
                style={{ width: `${(processingOrders / totalOrders) * 100}%` }}
                title={`Processing: ${processingOrders}`}
              ></div>
              <div
                className="status-segment submitted"
                style={{ width: `${(submittedOrders / totalOrders) * 100}%` }}
                title={`Submitted: ${submittedOrders}`}
              ></div>
              <div
                className="status-segment failed"
                style={{ width: `${(failedOrders / totalOrders) * 100}%` }}
                title={`Failed: ${failedOrders}`}
              ></div>
            </div>
            <div className="status-legend">
              <span className="legend-item">
                <span className="legend-color completed"></span>
                Completed ({completedOrders})
              </span>
              <span className="legend-item">
                <span className="legend-color processing"></span>
                Processing ({processingOrders})
              </span>
              <span className="legend-item">
                <span className="legend-color submitted"></span>
                Submitted ({submittedOrders})
              </span>
              <span className="legend-item">
                <span className="legend-color failed"></span>
                Failed ({failedOrders})
              </span>
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="chart-card priority-distribution">
          <h3>Priority Distribution</h3>
          <div className="priority-stats">
            <div className="priority-item urgent">
              <span className="priority-icon">🔴</span>
              <span className="priority-label">Urgent</span>
              <span className="priority-count">{priorityStats.urgent}</span>
            </div>
            <div className="priority-item high">
              <span className="priority-icon">🟠</span>
              <span className="priority-label">High</span>
              <span className="priority-count">{priorityStats.high}</span>
            </div>
            <div className="priority-item medium">
              <span className="priority-icon">🟡</span>
              <span className="priority-label">Medium</span>
              <span className="priority-count">{priorityStats.medium}</span>
            </div>
            <div className="priority-item low">
              <span className="priority-icon">🟢</span>
              <span className="priority-label">Low</span>
              <span className="priority-count">{priorityStats.low}</span>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        {topCustomers.length > 0 && (
          <div className="chart-card top-customers">
            <h3>Top Customers</h3>
            <div className="customer-list">
              {topCustomers.map(([customer, value], index) => (
                <div key={customer} className="customer-item">
                  <span className="customer-rank">#{index + 1}</span>
                  <span className="customer-name">{customer}</span>
                  <span className="customer-value">${value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Indicators */}
        <div className="chart-card performance">
          <h3>Performance Indicators</h3>
          <div className="performance-grid">
            <div className="performance-item">
              <div className="performance-value success-rate">
                {(100 - failureRate).toFixed(1)}%
              </div>
              <div className="performance-label">Success Rate</div>
            </div>
            <div className="performance-item">
              <div className="performance-value failure-rate">
                {failureRate.toFixed(1)}%
              </div>
              <div className="performance-label">Failure Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OrderAnalytics;
