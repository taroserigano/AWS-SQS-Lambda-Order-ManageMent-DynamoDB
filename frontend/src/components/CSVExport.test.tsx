import { render, screen, fireEvent } from "@testing-library/react";
import CSVExport from "./CSVExport";
import React from "react";

const mockOrders = [
  {
    id: "1",
    orderId: "ORD-001",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    status: "completed" as const,
    priority: "high" as const,
    timestamp: new Date("2024-01-15"),
    orderValue: 999.99,
    items: [{ id: "1", name: "Laptop", quantity: 1, price: 999.99 }],
  },
  {
    id: "2",
    orderId: "ORD-002",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    status: "processing" as const,
    priority: "medium" as const,
    timestamp: new Date("2024-01-16"),
    orderValue: 299.99,
    items: [{ id: "2", name: "Mouse", quantity: 2, price: 149.995 }],
  },
];

describe("CSVExport", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => "mock-url");
    global.URL.revokeObjectURL = jest.fn();
  });

  test("renders CSV export modal", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(screen.getByText(/Export Orders to CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Export Settings/i)).toBeInTheDocument();
  });

  test("closes modal when close button is clicked", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("displays export format options", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(screen.getByText(/Standard CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Excel-Friendly CSV/i)).toBeInTheDocument();
  });

  test("shows filter options for status and priority", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(screen.getByText(/Filter by Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Filter by Priority:/i)).toBeInTheDocument();
  });

  test("displays export summary with order count", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(screen.getByText(/Export Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Orders:/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("shows preview of data to be exported", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(screen.getByText(/Preview \(first 3 rows\)/i)).toBeInTheDocument();
    expect(screen.getByText("ORD-001")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  test("toggles include items checkbox", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const checkbox = screen.getByRole("checkbox", {
      name: /Include detailed item information/i,
    });

    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  test("filters orders by status", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const statusSelect = screen.getByLabelText(/Filter by Status:/i);

    // Filter to show only completed orders
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    // Should show 1 order now
    expect(screen.getByText(/Total Orders:/i).nextSibling).toHaveTextContent(
      "1"
    );
  });

  test("filters orders by priority", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const prioritySelect = screen.getByLabelText(/Filter by Priority:/i);

    // Filter to show only high priority
    fireEvent.change(prioritySelect, { target: { value: "high" } });

    // Should show 1 order now
    expect(screen.getByText(/Total Orders:/i).nextSibling).toHaveTextContent(
      "1"
    );
  });

  test("changes export format", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const excelRadio = screen.getByRole("radio", {
      name: /Excel-Friendly CSV/i,
    });

    fireEvent.click(excelRadio);
    expect(excelRadio).toBeChecked();
  });

  test("cancel button closes modal", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("export button is disabled when no orders match filters", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    const statusSelect = screen.getByLabelText(/Filter by Status:/i);

    // Filter to show failed orders (none exist)
    fireEvent.change(statusSelect, { target: { value: "failed" } });

    const exportButton = screen.getByRole("button", {
      name: /Export 0 Orders/i,
    });
    expect(exportButton).toBeDisabled();
  });

  test("export button shows correct count", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    expect(
      screen.getByRole("button", { name: /Export 2 Orders/i })
    ).toBeInTheDocument();
  });

  test("displays total revenue in summary", () => {
    render(<CSVExport orders={mockOrders} onClose={mockOnClose} />);

    // Total: 999.99 + 299.99 = 1299.98
    expect(screen.getByText(/\$1299\.98/)).toBeInTheDocument();
  });
});
