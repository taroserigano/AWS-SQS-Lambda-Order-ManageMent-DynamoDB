const API_BASE_URL =
  "https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod";

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
    console.log("Submitting order:", orderData.orderId);
    console.log("API URL:", `${API_BASE_URL}/orders`);

    try {
      const requestBody = JSON.stringify(orderData);
      console.log("Request body:", requestBody);

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Success response:", data);
      return data;
    } catch (error) {
      console.error("Error submitting order:", error);
      throw new Error(
        error instanceof Error
          ? `Failed to submit order: ${error.message}`
          : "Failed to submit order: Unknown error"
      );
    }
  }

  static async getOrders(): Promise<any[]> {
    console.log("Fetching orders from API");
    console.log("API URL:", `${API_BASE_URL}/orders`);

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Success response:", data);
      return data.orders || [];
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error(
        error instanceof Error
          ? `Failed to fetch orders: ${error.message}`
          : "Failed to fetch orders: Unknown error"
      );
    }
  }
}
