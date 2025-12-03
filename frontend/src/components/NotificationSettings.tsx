import React, { useState } from "react";
import "./NotificationSettings.css";

interface NotificationPreferences {
  orderCreated: boolean;
  orderCompleted: boolean;
  orderFailed: boolean;
  orderUrgent: boolean;
}

interface NotificationSettingsProps {
  onSubscribe: (
    email: string,
    preferences: NotificationPreferences
  ) => Promise<void>;
  onUnsubscribe: (email: string) => Promise<void>;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onSubscribe,
  onUnsubscribe,
}) => {
  // Controlled input state for the email address the user enters.
  const [email, setEmail] = useState("");

  // User's notification preferences are kept in local component state.
  // Default to subscribing to all event types.
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orderCreated: true,
    orderCompleted: true,
    orderFailed: true,
    orderUrgent: true,
  });

  // Loading flag to disable controls while network requests are in-flight.
  const [loading, setLoading] = useState(false);

  // Message feedback shown to the user after actions succeed or fail.
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Toggle a specific preference key. This mutates only one property while
  // preserving the rest of the preferences object.
  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Called when the user clicks 'Subscribe'. Performs client-side validation
  // then calls the provided `onSubscribe` prop which sends the request to the
  // API. The SNS subscription requires the user to confirm via email.
  const handleSubscribe = async () => {
    if (!email) {
      setMessage({ text: "Please enter an email address", type: "error" });
      return;
    }

    // Basic email format validation before sending to the server.
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setMessage({ text: "Please enter a valid email address", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Delegate the actual network call to the parent / service layer.
      await onSubscribe(email, preferences);
      // Inform the user that AWS SNS will send a confirmation email.
      setMessage({
        text: "Subscription request sent! Please check your email to confirm.",
        type: "success",
      });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Failed to subscribe",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Called when the user clicks 'Unsubscribe'. Sends the email to the API
  // which will find and remove the SNS subscription for that address.
  const handleUnsubscribe = async () => {
    if (!email) {
      setMessage({ text: "Please enter an email address", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await onUnsubscribe(email);
      setMessage({ text: "Successfully unsubscribed", type: "success" });
      setEmail("");
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Failed to unsubscribe",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-settings">
      <h2>📧 Email Notifications</h2>
      <p className="notification-description">
        Subscribe to receive email notifications for order events
      </p>

      <div className="notification-form">
        <div className="email-input-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@example.com"
            disabled={loading}
          />
        </div>

        <div className="preferences-group">
          <h3>Notification Preferences</h3>
          <p className="preferences-description">
            Select which events you want to receive notifications for:
          </p>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.orderCreated}
                onChange={() => handlePreferenceChange("orderCreated")}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Order Created</strong> - When a new order is placed
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.orderCompleted}
                onChange={() => handlePreferenceChange("orderCompleted")}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Order Completed</strong> - When order processing
                finishes successfully
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.orderFailed}
                onChange={() => handlePreferenceChange("orderFailed")}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Order Failed</strong> - When an order fails processing
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.orderUrgent}
                onChange={() => handlePreferenceChange("orderUrgent")}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Urgent Orders</strong> - Immediate alerts for urgent
                priority orders
              </span>
            </label>
          </div>
        </div>

        {message && (
          <div className={`notification-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="button-group">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="subscribe-button"
          >
            {loading ? "Processing..." : "Subscribe"}
          </button>
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="unsubscribe-button"
          >
            {loading ? "Processing..." : "Unsubscribe"}
          </button>
        </div>

        <div className="notification-info">
          <p>
            <strong>Note:</strong> After subscribing, you'll receive a
            confirmation email from AWS SNS. You must click the confirmation
            link to start receiving notifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
