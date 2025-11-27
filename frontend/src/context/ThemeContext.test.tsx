import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import React from "react";

// Test component that uses the theme hook
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button onClick={toggleTheme} data-testid="toggle-button">
        Toggle Theme
      </button>
    </div>
  );
};

describe("ThemeContext", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test("provides default light theme", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });

  test("toggles between light and dark themes", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId("toggle-button");
    const themeDisplay = screen.getByTestId("current-theme");

    // Initial state
    expect(themeDisplay).toHaveTextContent("light");

    // Toggle to dark
    fireEvent.click(toggleButton);
    expect(themeDisplay).toHaveTextContent("dark");

    // Toggle back to light
    fireEvent.click(toggleButton);
    expect(themeDisplay).toHaveTextContent("light");
  });

  test("persists theme to localStorage", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId("toggle-button");

    // Toggle to dark
    fireEvent.click(toggleButton);

    // Check localStorage
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  test("loads theme from localStorage on mount", () => {
    // Set dark theme in localStorage
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  test("applies theme attribute to document element", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByTestId("toggle-button");

    // Toggle to dark
    fireEvent.click(toggleButton);

    // Check document attribute
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("throws error when useTheme is used outside ThemeProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTheme must be used within a ThemeProvider");

    consoleSpy.mockRestore();
  });
});
