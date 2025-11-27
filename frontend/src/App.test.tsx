import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

test("renders order management system", () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  const headerElement = screen.getByText(/Advanced Order Management System/i);
  expect(headerElement).toBeInTheDocument();
});
