/* ========================================
   THEME CONTEXT - DARK MODE SYSTEM
   ======================================== */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

/**
 * Theme type definition
 * - 'light': Standard light mode theme
 * - 'dark': Dark mode theme for low-light environments
 */
type Theme = "light" | "dark";

/**
 * Theme Context Interface
 * Provides theme state and toggle function to all child components
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Create the context with undefined default (will be provided by ThemeProvider)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider Component
 *
 * Purpose:
 * - Manages global theme state (light/dark mode)
 * - Persists theme preference to localStorage
 * - Applies theme class to document root for CSS styling
 * - Provides theme context to all child components
 *
 * Features:
 * - localStorage persistence (survives page refresh)
 * - System preference detection on first load
 * - Automatic CSS class application to <html> element
 * - Smooth theme transitions via CSS
 *
 * Usage:
 * Wrap your App component with ThemeProvider:
 * <ThemeProvider><App /></ThemeProvider>
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      return savedTheme;
    }

    // Fall back to system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    // Default to light theme
    return "light";
  });

  /**
   * Apply theme class to document root on theme change
   * This allows CSS to style elements based on [data-theme] attribute
   */
  useEffect(() => {
    // Set data-theme attribute on <html> element for global CSS access
    document.documentElement.setAttribute("data-theme", theme);

    // Persist to localStorage for future visits
    localStorage.setItem("theme", theme);
  }, [theme]);

  /**
   * Toggle between light and dark themes
   * Simple switch - no complex logic needed
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Provide theme state and toggle function to all children
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom Hook: useTheme
 *
 * Purpose:
 * - Provides easy access to theme context in any component
 * - Includes error checking to ensure it's used within ThemeProvider
 *
 * Usage in components:
 * const { theme, toggleTheme } = useTheme();
 *
 * Returns:
 * - theme: Current theme ('light' | 'dark')
 * - toggleTheme: Function to switch between themes
 *
 * Throws error if used outside ThemeProvider (helps catch bugs early)
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  // Ensure hook is used within ThemeProvider
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
