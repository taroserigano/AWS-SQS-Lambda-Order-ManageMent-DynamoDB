import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CSVImport from "./CSVImport";
import React from "react";

describe("CSVImport", () => {
  const mockOnImport = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders CSV import modal", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    expect(screen.getByText(/Import Orders from CSV/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Drag & drop your CSV file here/i)
    ).toBeInTheDocument();
  });

  test("closes modal when close button is clicked", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const closeButton = screen.getByRole("button", { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("shows Browse Files button", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    expect(screen.getByText(/Browse Files/i)).toBeInTheDocument();
  });

  test("displays CSV format instructions", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    expect(screen.getByText(/CSV Format Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/orderId/i)).toBeInTheDocument();
    expect(screen.getByText(/customerName/i)).toBeInTheDocument();
    expect(screen.getByText(/customerEmail/i)).toBeInTheDocument();
  });

  test("shows dragging state on drag over", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const dropzone = screen
      .getByText(/Drag & drop your CSV file here/i)
      .closest("div");

    // Simulate drag over
    fireEvent.dragOver(dropzone!);

    expect(dropzone).toHaveClass("dragging");
  });

  test("removes dragging state on drag leave", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const dropzone = screen
      .getByText(/Drag & drop your CSV file here/i)
      .closest("div");

    // Simulate drag over then drag leave
    fireEvent.dragOver(dropzone!);
    fireEvent.dragLeave(dropzone!);

    expect(dropzone).not.toHaveClass("dragging");
  });

  test("rejects non-CSV files", async () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const dropzone = screen
      .getByText(/Drag & drop your CSV file here/i)
      .closest("div");

    // Simulate drop
    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Please upload a CSV file/i)).toBeInTheDocument();
    });
  });

  test("handles file input change", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    // Get the hidden file input
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
  });

  test("closes modal on close button click", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const closeButton = screen.getByText("✕");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("does not close modal on content click", () => {
    render(<CSVImport onImport={mockOnImport} onClose={mockOnClose} />);

    const modal = screen
      .getByText(/Import Orders from CSV/i)
      .closest(".csv-import-modal");
    fireEvent.click(modal!);

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
