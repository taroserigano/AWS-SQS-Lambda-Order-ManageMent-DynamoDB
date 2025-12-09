// Base URL for the deployed API Gateway. Replace with your local/dev URL
// when testing against a local emulator or a different stage.
const API_BASE_URL = process.env.REACT_APP_API_URL || "YOUR_API_GATEWAY_URL_HERE";

// --- Types ---
// Define the shape of requests/responses so TypeScript helps prevent errors.
export interface SubmitOrderRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  priority: string;
  status: string;
  orderValue: number;
  timestamp: string;
  estimatedDelivery?: string;
  items: any[];
  message?: string;
  processingTime?: number;
}

export interface SubmitOrderResponse {
  message: string;
  orderId: string;
}

export class ApiService {
  static async submitOrder(
    orderData: SubmitOrderRequest
  ): Promise<SubmitOrderResponse> {
    // Submit an order to the backend. We log helpful details to make debugging
    // API errors easier when developing locally.
    console.log("Submitting order:", orderData.orderId);

    try {
      const requestBody = JSON.stringify(orderData);

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      // If response is not ok, capture the body for a clearer error message.
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Re-wrap errors with a helpful message for callers.
      throw new Error(
        error instanceof Error
          ? `Failed to submit order: ${error.message}`
          : "Failed to submit order: Unknown error"
      );
    }
  }

  static async getOrders(): Promise<any[]> {
    // Fetch orders list from backend. This is a simple wrapper that returns
    // the `orders` array or an empty list on success.
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Failed to fetch orders: ${error.message}`
          : "Failed to fetch orders: Unknown error"
      );
    }
  }

  static async subscribeEmail(
    email: string,
    preferences: {
      orderCreated: boolean;
      orderCompleted: boolean;
      orderFailed: boolean;
      orderUrgent: boolean;
    }
  ): Promise<{ message: string; subscriptionArn?: string }> {
    // Send subscription request to backend. The backend will call SNS which
    // sends a confirmation email that the user must accept.
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, preferences }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? `Failed to subscribe: ${error.message}` : "Failed to subscribe: Unknown error"
      );
    }
  }

  static async unsubscribeEmail(email: string): Promise<{ message: string }> {
    // Ask backend to find and remove the subscription for this email.
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? `Failed to unsubscribe: ${error.message}` : "Failed to unsubscribe: Unknown error"
      );
    }
  }
}
