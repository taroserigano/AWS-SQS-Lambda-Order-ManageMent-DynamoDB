// ========================================
// ORDER FORM COMPONENT
// ========================================

import React, { useState } from "react";
import "./OrderForm.css";

// ========================================
// RANDOM DATA GENERATION UTILITY
// ========================================

/**
 * Generates realistic test data for the order form
 * This function creates complete order data with randomized but realistic values
 *
 * @returns OrderFormData - Complete form data with all fields populated
 */
const generateRandomData = (): OrderFormData => {
  // Sample data arrays for realistic random generation
  const firstNames = [
    "John",
    "Jane",
    "Mike",
    "Sarah",
    "David",
    "Emily",
    "Chris",
    "Lisa",
    "Tom",
    "Anna",
  ];

  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
  ];

  // Product catalog for realistic item generation
  const products = [
    "Laptop Computer",
    "Wireless Headphones",
    "Coffee Maker",
    "Office Chair",
    "Smartphone",
    "Tablet",
    "Keyboard",
    "Monitor",
    "Desk Lamp",
    "Bluetooth Speaker",
    "Gaming Mouse",
    "Webcam",
    "External Hard Drive",
    "Power Bank",
    "Wireless Charger",
  ];

  // Priority levels available in the system
  const priorities: Array<"low" | "medium" | "high" | "urgent"> = [
    "low",
    "medium",
    "high",
    "urgent",
  ];

  // ========================================
  // GENERATE CUSTOMER DATA
  // ========================================

  // Create realistic customer name
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const customerName = `${firstName} ${lastName}`;

  // Generate email based on name (standardized format)
  const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

  // Random priority selection
  const priority = priorities[Math.floor(Math.random() * priorities.length)];

  // ========================================
  // GENERATE ORDER ITEMS
  // ========================================

  // Generate 1-4 items per order
  const numItems = Math.floor(Math.random() * 4) + 1;
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    items.push({
      name: product,
      quantity: Math.floor(Math.random() * 5) + 1, // 1-5 quantity
      price: Math.floor(Math.random() * 500 + 50), // $50-$550 price range
    });
  }

  // ========================================
  // CALCULATE TOTALS AND GENERATE IDs
  // ========================================

  // Calculate total order value from all items
  const orderValue = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Generate unique order ID with timestamp and random component
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return {
    orderId,
    priority,
    customerName,
    customerEmail,
    orderValue,
    items,
  };
};

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * OrderFormData: Complete order data interface
 * This interface defines the structure of order data collected from the form
 * and passed to the parent component for processing
 */
export interface OrderFormData {
  orderId: string; // Unique order identifier
  priority: "low" | "medium" | "high" | "urgent"; // Processing priority
  customerName: string; // Customer full name
  customerEmail: string; // Customer email address
  orderValue: number; // Total calculated order value
  items: Array<{
    // Array of ordered items
    name: string; // Item/product name
    quantity: number; // Quantity ordered
    price: number; // Price per unit
  }>;
}

/**
 * OrderFormProps: Component props interface
 * Defines the contract between OrderForm and its parent component
 */
interface OrderFormProps {
  onOrderSubmit: (orderData: OrderFormData) => void; // Callback for form submission
  isLoading: boolean; // Loading state from parent
}

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * OrderForm Component: Advanced order submission form
 *
 * Features:
 * - Multi-field order data collection
 * - Dynamic item management (add/remove items)
 * - Real-time total calculation
 * - Form validation
 * - Random data generation for testing
 * - Responsive design
 *
 * @param onOrderSubmit - Callback function to handle form submission
 * @param isLoading - Loading state to disable form during submission
 */
const OrderForm: React.FC<OrderFormProps> = ({ onOrderSubmit, isLoading }) => {
  // ========================================
  // COMPONENT STATE
  // ========================================

  // Main form state with default values
  const [formData, setFormData] = useState<OrderFormData>({
    orderId: "", // Empty by default
    priority: "medium", // Default to medium priority
    customerName: "", // Empty customer name
    customerEmail: "", // Empty customer email
    orderValue: 0, // Calculated value
    items: [{ name: "", quantity: 1, price: 0 }], // Start with one empty item
  });

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle form submission
   * Validates required fields and calls parent callback
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation - ensure required fields are filled
    if (formData.orderId.trim() && formData.customerName.trim()) {
      onOrderSubmit(formData);
      // Reset form to default state after successful submission
      setFormData({
        orderId: "",
        priority: "medium",
        customerName: "",
        customerEmail: "",
        orderValue: 0,
        items: [{ name: "", quantity: 1, price: 0 }],
      });
    }
  };

  /**
   * Generate random order ID for testing purposes
   * Creates unique ID with timestamp and random number
   */
  const generateRandomOrderId = () => {
    const randomId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setFormData({ ...formData, orderId: randomId });
  };

  // ========================================
  // ITEM MANAGEMENT FUNCTIONS
  // ========================================

  /**
   * Add new item to the order
   * Appends empty item with default values
   */
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: "", quantity: 1, price: 0 }],
    });
  };

  /**
   * Remove item from order by index
   * @param index - Index of item to remove
   */
  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  /**
   * Update specific field of an item
   * @param index - Item index to update
   * @param field - Field name to update
   * @param value - New value for the field
   */
  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = formData.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  const populateRandomData = () => {
    const randomData = generateRandomData();
    setFormData(randomData);
  };

  return (
    <div className="order-form">
      <h2>Submit New Order</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="orderId">Order ID:</label>
            <div className="input-group">
              <input
                type="text"
                id="orderId"
                value={formData.orderId}
                onChange={(e) =>
                  setFormData({ ...formData, orderId: e.target.value })
                }
                placeholder="Enter order ID (e.g., ORD-12345)"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={generateRandomOrderId}
                className="generate-btn"
                disabled={isLoading}
              >
                Generate
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority:</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as any })
              }
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="customerName">Customer Name:</label>
            <input
              type="text"
              id="customerName"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="Enter customer name"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerEmail">Customer Email:</label>
            <input
              type="email"
              id="customerEmail"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              placeholder="Enter customer email"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="items-section">
          <div className="items-header">
            <h3>Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="add-item-btn"
              disabled={isLoading}
            >
              + Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className="item-row">
              <input
                type="text"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
                disabled={isLoading}
              />
              <input
                type="number"
                placeholder="Qty"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  updateItem(index, "quantity", parseInt(e.target.value) || 1)
                }
                disabled={isLoading}
              />
              <input
                type="number"
                placeholder="Price"
                min="0"
                step="0.01"
                value={item.price}
                onChange={(e) =>
                  updateItem(index, "price", parseFloat(e.target.value) || 0)
                }
                disabled={isLoading}
              />
              <span className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="remove-item-btn"
                  disabled={isLoading}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <div className="order-total">
            <strong>Total: ${calculateTotal().toFixed(2)}</strong>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={populateRandomData}
            className="generate-btn"
            disabled={isLoading}
          >
            🎲 Generate Random Values
          </button>

          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.orderId.trim() ||
              !formData.customerName.trim()
            }
          >
            {isLoading ? "Submitting..." : "Submit Order"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
