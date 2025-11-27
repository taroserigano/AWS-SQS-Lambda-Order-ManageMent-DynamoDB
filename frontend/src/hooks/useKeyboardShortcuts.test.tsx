import { renderHook } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  formatShortcut,
  getDefaultShortcuts,
} from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockAction: jest.Mock;

  beforeEach(() => {
    mockAction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("executes shortcut action when correct key combination is pressed", () => {
    const shortcuts = [
      {
        key: "k",
        ctrlKey: true,
        action: mockAction,
        description: "Test shortcut",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test("does not execute action when wrong key is pressed", () => {
    const shortcuts = [
      {
        key: "k",
        ctrlKey: true,
        action: mockAction,
        description: "Test shortcut",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+L (wrong key)
    const event = new KeyboardEvent("keydown", {
      key: "l",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockAction).not.toHaveBeenCalled();
  });

  test("respects isEnabled flag", () => {
    const shortcuts = [
      {
        key: "k",
        ctrlKey: true,
        action: mockAction,
        description: "Test shortcut",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    // Simulate Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(mockAction).not.toHaveBeenCalled();
  });

  test("allows Escape key in input fields", () => {
    const shortcuts = [
      {
        key: "Escape",
        action: mockAction,
        description: "Close modal",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Create an input element and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Simulate Escape in input field
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(mockAction).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  test("blocks non-Escape shortcuts in input fields", () => {
    const shortcuts = [
      {
        key: "k",
        ctrlKey: true,
        action: mockAction,
        description: "Test shortcut",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Create an input element and focus it
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    // Simulate Ctrl+K in input field
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(mockAction).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  test("handles multiple shortcuts", () => {
    const action1 = jest.fn();
    const action2 = jest.fn();

    const shortcuts = [
      {
        key: "k",
        ctrlKey: true,
        action: action1,
        description: "Shortcut 1",
      },
      {
        key: "e",
        ctrlKey: true,
        action: action2,
        description: "Shortcut 2",
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Test first shortcut
    const event1 = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event1);
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();

    // Test second shortcut
    const event2 = new KeyboardEvent("keydown", {
      key: "e",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event2);
    expect(action2).toHaveBeenCalledTimes(1);
    expect(action1).toHaveBeenCalledTimes(1);
  });
});

describe("formatShortcut", () => {
  // Mock navigator.platform
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  test("formats shortcut with Ctrl on Windows", () => {
    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      writable: true,
    });

    const shortcut = {
      key: "k",
      ctrlKey: true,
      action: jest.fn(),
      description: "Test",
    };

    expect(formatShortcut(shortcut)).toBe("Ctrl+K");
  });

  test("formats shortcut with Cmd on Mac", () => {
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      writable: true,
    });

    const shortcut = {
      key: "k",
      ctrlKey: true,
      action: jest.fn(),
      description: "Test",
    };

    expect(formatShortcut(shortcut)).toBe("Cmd+K");
  });

  test("formats shortcut with multiple modifiers", () => {
    const shortcut = {
      key: "s",
      ctrlKey: true,
      shiftKey: true,
      action: jest.fn(),
      description: "Test",
    };

    const result = formatShortcut(shortcut);
    expect(result).toContain("Shift");
    expect(result).toContain("S");
  });
});

describe("getDefaultShortcuts", () => {
  test("creates shortcuts for provided actions", () => {
    const actions = {
      newOrder: jest.fn(),
      toggleTheme: jest.fn(),
      showHelp: jest.fn(),
    };

    const shortcuts = getDefaultShortcuts(actions);

    expect(shortcuts.length).toBe(3);
    expect(shortcuts[0].key).toBe("n");
    expect(shortcuts[1].key).toBe("k");
    expect(shortcuts[2].key).toBe("/");
  });

  test("omits shortcuts for undefined actions", () => {
    const actions = {
      newOrder: jest.fn(),
      // toggleTheme is undefined
    };

    const shortcuts = getDefaultShortcuts(actions);

    expect(shortcuts.length).toBe(1);
    expect(shortcuts[0].description).toBe("Create new order");
  });

  test("all shortcuts have required properties", () => {
    const actions = {
      newOrder: jest.fn(),
      toggleTheme: jest.fn(),
    };

    const shortcuts = getDefaultShortcuts(actions);

    shortcuts.forEach((shortcut) => {
      expect(shortcut).toHaveProperty("key");
      expect(shortcut).toHaveProperty("action");
      expect(shortcut).toHaveProperty("description");
      expect(typeof shortcut.action).toBe("function");
    });
  });
});
