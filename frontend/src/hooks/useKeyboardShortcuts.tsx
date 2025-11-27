/* ========================================
   KEYBOARD SHORTCUTS CUSTOM HOOK
   ======================================== */

import React, { useEffect, useCallback } from "react";
import "./useKeyboardShortcuts.css";

/**
 * Keyboard Shortcut Configuration
 * Defines the key combination and action for each shortcut
 */
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean; // Command key on Mac
  action: () => void;
  description: string;
}

/**
 * useKeyboardShortcuts Hook
 *
 * Purpose:
 * - Enable power-user keyboard shortcuts throughout the app
 * - Provide global hotkeys for common actions
 * - Improve productivity with quick access to features
 *
 * Features:
 * - Support for modifier keys (Ctrl, Shift, Alt, Meta)
 * - Cross-platform compatibility (Windows, Mac, Linux)
 * - Prevents default browser actions when needed
 * - Easy to configure and extend
 *
 * Common Shortcuts:
 * - Ctrl/Cmd + N: New order
 * - Ctrl/Cmd + S: Save/Submit
 * - Ctrl/Cmd + K: Toggle dark mode
 * - Ctrl/Cmd + /: Show help/shortcuts list
 * - Ctrl/Cmd + E: Export data
 * - Ctrl/Cmd + I: Import data
 * - Escape: Close modals
 * - F5: Refresh/Reload data
 *
 * Usage:
 * useKeyboardShortcuts(shortcuts, isEnabled);
 *
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param isEnabled - Whether shortcuts are currently active (default: true)
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  isEnabled: boolean = true
) => {
  /**
   * Handle keyboard events and match against configured shortcuts
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if shortcuts are disabled
      if (!isEnabled) return;

      // Skip if user is typing in an input field (unless explicitly handled)
      const target = event.target as HTMLElement;
      const isInputField = ["INPUT", "TEXTAREA", "SELECT"].includes(
        target.tagName
      );

      // Allow Escape key even in input fields (for closing modals)
      if (isInputField && event.key !== "Escape") {
        return;
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;

        // Check if all conditions match
        if (
          keyMatches &&
          ctrlMatches &&
          shiftMatches &&
          altMatches &&
          metaMatches
        ) {
          event.preventDefault(); // Prevent default browser action
          shortcut.action();
          break; // Stop after first match
        }
      }
    },
    [shortcuts, isEnabled]
  );

  /**
   * Set up and clean up keyboard event listener
   */
  useEffect(() => {
    if (isEnabled) {
      window.addEventListener("keydown", handleKeyDown);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, isEnabled]);
};

/**
 * Helper function to format shortcut for display
 * Converts shortcut config to human-readable string
 *
 * Example: { key: 'n', ctrlKey: true } → "Ctrl+N"
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];

  // Detect Mac vs Windows/Linux
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  if (shortcut.ctrlKey) parts.push(isMac ? "Cmd" : "Ctrl");
  if (shortcut.shiftKey) parts.push("Shift");
  if (shortcut.altKey) parts.push("Alt");
  if (shortcut.metaKey) parts.push("Meta");

  parts.push(shortcut.key.toUpperCase());

  return parts.join("+");
};

/**
 * Default Shortcuts Configuration
 * Common shortcuts used across the app
 */
export const getDefaultShortcuts = (actions: {
  newOrder?: () => void;
  toggleTheme?: () => void;
  showHelp?: () => void;
  exportData?: () => void;
  importData?: () => void;
  refresh?: () => void;
  closeModal?: () => void;
  search?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.newOrder) {
    shortcuts.push({
      key: "n",
      ctrlKey: true,
      action: actions.newOrder,
      description: "Create new order",
    });
  }

  if (actions.toggleTheme) {
    shortcuts.push({
      key: "k",
      ctrlKey: true,
      action: actions.toggleTheme,
      description: "Toggle dark mode",
    });
  }

  if (actions.showHelp) {
    shortcuts.push({
      key: "/",
      ctrlKey: true,
      action: actions.showHelp,
      description: "Show keyboard shortcuts",
    });
  }

  if (actions.exportData) {
    shortcuts.push({
      key: "e",
      ctrlKey: true,
      action: actions.exportData,
      description: "Export orders to CSV",
    });
  }

  if (actions.importData) {
    shortcuts.push({
      key: "i",
      ctrlKey: true,
      action: actions.importData,
      description: "Import orders from CSV",
    });
  }

  if (actions.refresh) {
    shortcuts.push({
      key: "F5",
      action: actions.refresh,
      description: "Refresh orders",
    });
  }

  if (actions.closeModal) {
    shortcuts.push({
      key: "Escape",
      action: actions.closeModal,
      description: "Close modal/dialog",
    });
  }

  if (actions.search) {
    shortcuts.push({
      key: "f",
      ctrlKey: true,
      action: actions.search,
      description: "Focus search",
    });
  }

  return shortcuts;
};

/**
 * Shortcuts Help Component
 * Display available keyboard shortcuts to users
 */
export const ShortcutsHelp: React.FC<{
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}> = ({ shortcuts, onClose }) => {
  return (
    <div className="shortcuts-help-overlay" onClick={onClose}>
      <div
        className="shortcuts-help-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        <div className="shortcuts-list">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <span className="shortcut-key">{formatShortcut(shortcut)}</span>
              <span className="shortcut-description">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
