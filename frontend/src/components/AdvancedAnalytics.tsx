// ========================================
// ADVANCED ANALYTICS WITH CHARTS
// ========================================

import React, { useMemo } from "react";
import { Order } from "./OrderHistory";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { format, subDays, startOfDay } from "date-fns";
import "./AdvancedAnalytics.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AdvancedAnalyticsProps {
  orders: Order[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ orders }) => {
  // ========================================
  // TIME SERIES DATA - Orders over last 7 days
  // ========================================
  const timeSeriesData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 6 - i));
      return {
        date,
        label: format(date, "MMM dd"),
        orders: 0,
        revenue: 0,
      };
    });

    orders.forEach((order) => {
      const orderDate = startOfDay(order.timestamp);
      const dayData = last7Days.find(
        (d) => d.date.getTime() === orderDate.getTime()
      );
      if (dayData) {
        dayData.orders++;
        dayData.revenue += order.orderValue || 0;
      }
    });

    return last7Days;
  }, [orders]);

  // ========================================
  // STATUS DISTRIBUTION DATA
  // ========================================
  const statusData = useMemo(() => {
    const statuses = {
      submitted: orders.filter((o) => o.status === "submitted").length,
      processing: orders.filter((o) => o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed").length,
      failed: orders.filter((o) => o.status === "failed").length,
    };

    return {
      labels: ["Submitted", "Processing", "Completed", "Failed"],
      datasets: [
        {
          data: [
            statuses.submitted,
            statuses.processing,
            statuses.completed,
            statuses.failed,
          ],
          backgroundColor: [
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 206, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
            "rgba(255, 99, 132, 0.8)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [orders]);

  // ========================================
  // REVENUE TREND DATA
  // ========================================
  const revenueTrendData = {
    labels: timeSeriesData.map((d) => d.label),
    datasets: [
      {
        label: "Daily Revenue ($)",
        data: timeSeriesData.map((d) => d.revenue),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // ========================================
  // ORDER VOLUME TREND DATA
  // ========================================
  const orderVolumeTrendData = {
    labels: timeSeriesData.map((d) => d.label),
    datasets: [
      {
        label: "Orders per Day",
        data: timeSeriesData.map((d) => d.orders),
        backgroundColor: "rgba(54, 162, 235, 0.8)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
      },
    ],
  };

  // ========================================
  // PRIORITY DISTRIBUTION DATA
  // ========================================
  const priorityData = useMemo(() => {
    const priorities = {
      urgent: orders.filter((o) => o.priority === "urgent").length,
      high: orders.filter((o) => o.priority === "high").length,
      medium: orders.filter((o) => o.priority === "medium").length,
      low: orders.filter((o) => o.priority === "low").length,
    };

    return {
      labels: ["Urgent", "High", "Medium", "Low"],
      datasets: [
        {
          label: "Orders by Priority",
          data: [
            priorities.urgent,
            priorities.high,
            priorities.medium,
            priorities.low,
          ],
          backgroundColor: [
            "rgba(255, 99, 132, 0.8)",
            "rgba(255, 159, 64, 0.8)",
            "rgba(255, 205, 86, 0.8)",
            "rgba(75, 192, 192, 0.8)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(255, 205, 86, 1)",
            "rgba(75, 192, 192, 1)",
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [orders]);

  // ========================================
  // HEAT MAP DATA - Orders by Day of Week and Hour
  // ========================================
  const heatMapData = useMemo(() => {
    // Initialize 7x24 grid (days x hours)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    // Count orders for each day/hour combination
    orders.forEach((order) => {
      const date = new Date(order.timestamp);
      const day = date.getDay(); // 0-6 (Sun-Sat)
      const hour = date.getHours(); // 0-23
      grid[day][hour]++;
    });

    // Find max value for scaling
    const maxOrders = Math.max(...grid.flat());

    return { grid, days, maxOrders };
  }, [orders]);

  // ========================================
  // TOP CUSTOMERS DATA
  // ========================================
  const topCustomersData = useMemo(() => {
    const customerStats: {
      [key: string]: { orders: number; revenue: number };
    } = {};

    orders.forEach((order) => {
      if (order.customerName) {
        if (!customerStats[order.customerName]) {
          customerStats[order.customerName] = { orders: 0, revenue: 0 };
        }
        customerStats[order.customerName].orders++;
        customerStats[order.customerName].revenue += order.orderValue || 0;
      }
    });

    const topCustomers = Object.entries(customerStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);

    return {
      labels: topCustomers.map(([name]) => name),
      datasets: [
        {
          label: "Total Revenue ($)",
          data: topCustomers.map(([, stats]) => stats.revenue),
          backgroundColor: "rgba(153, 102, 255, 0.8)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 2,
        },
      ],
    };
  }, [orders]);

  // ========================================
  // CHART OPTIONS
  // ========================================
  const legendLabelColor = "rgba(233, 238, 255, 0.92)";
  const gridColor = "rgba(255, 255, 255, 0.08)";
  const axisTickColor = "rgba(233, 238, 255, 0.85)";
  const tooltipBackground = "rgba(10, 13, 31, 0.95)";
  const tooltipTextColor = "#f8fbff";

  const cartesianOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: legendLabelColor,
          usePointStyle: true,
          padding: 16,
          font: {
            size: 13,
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: tooltipBackground,
        titleColor: tooltipTextColor,
        bodyColor: tooltipTextColor,
      },
    },
    scales: {
      x: {
        ticks: {
          color: axisTickColor,
          font: { weight: 600 },
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: axisTickColor,
          font: { weight: 600 },
        },
        grid: {
          color: gridColor,
        },
      },
    },
  } satisfies ChartOptions<"line"> & ChartOptions<"bar">;

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: legendLabelColor,
          usePointStyle: true,
          padding: 16,
          font: {
            size: 13,
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: tooltipBackground,
        titleColor: tooltipTextColor,
        bodyColor: tooltipTextColor,
      },
    },
  };

  return (
    <div className="advanced-analytics">
      <div className="analytics-header">
        <h2>📊 Advanced Analytics Dashboard</h2>
        <p>Comprehensive insights and trends for data-driven decisions</p>
      </div>

      {/* Time Series Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>📈 Revenue Trend (Last 7 Days)</h3>
          <div className="chart-container">
            <Line data={revenueTrendData} options={cartesianOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>📊 Order Volume Trend</h3>
          <div className="chart-container">
            <Bar data={orderVolumeTrendData} options={cartesianOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>🎯 Order Status Distribution</h3>
          <div className="chart-container">
            <Pie data={statusData} options={pieOptions} />
          </div>
        </div>

        <div className="chart-card chart-card-wide">
          <h3>🔥 Order Activity Heat Map</h3>
          <p className="chart-subtitle">Order volume by day of week and hour</p>
          <div className="heatmap-container">
            <div className="heatmap-grid">
              {/* Hour labels on the left */}
              <div className="heatmap-hours">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="hour-label">
                    {i.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Heat map cells */}
              <div className="heatmap-cells">
                {/* Day labels on top */}
                <div className="heatmap-days">
                  {heatMapData.days.map((day) => (
                    <div key={day} className="day-label">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid cells */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="heatmap-row">
                    {heatMapData.days.map((day, dayIndex) => {
                      const count = heatMapData.grid[dayIndex][hour];
                      const intensity =
                        heatMapData.maxOrders > 0
                          ? count / heatMapData.maxOrders
                          : 0;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="heatmap-cell"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.max(
                              0.05,
                              intensity
                            )})`,
                          }}
                          title={`${day} ${hour
                            .toString()
                            .padStart(2, "0")}:00 - ${count} orders`}
                        >
                          {count > 0 && (
                            <span className="cell-count">{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="heatmap-legend">
              <span className="legend-label">Less</span>
              <div className="legend-gradient"></div>
              <span className="legend-label">More</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>⚡ Priority Distribution</h3>
          <div className="chart-container">
            <Bar data={priorityData} options={cartesianOptions} />
          </div>
        </div>

        <div className="chart-card chart-card-wide">
          <h3>👥 Top 5 Customers by Revenue</h3>
          <div className="chart-container">
            <Bar data={topCustomersData} options={cartesianOptions} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Avg Daily Orders</div>
            <div className="stat-value">
              {(
                timeSeriesData.reduce((sum, d) => sum + d.orders, 0) / 7
              ).toFixed(1)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Avg Daily Revenue</div>
            <div className="stat-value">
              $
              {(
                timeSeriesData.reduce((sum, d) => sum + d.revenue, 0) / 7
              ).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">Success Rate</div>
            <div className="stat-value">
              {orders.length > 0
                ? (
                    (orders.filter((o) => o.status === "completed").length /
                      orders.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">High Priority Orders</div>
            <div className="stat-value">
              {
                orders.filter(
                  (o) => o.priority === "urgent" || o.priority === "high"
                ).length
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
