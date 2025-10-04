const API_BASE_URL =
  "https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod";

export interface SubmitOrderRequest {
  orderId: string;
}

export interface SubmitOrderResponse {
  message: string;
  orderId: string;
}

export class ApiService {
  static async submitOrder(orderId: string): Promise<SubmitOrderResponse> {
    console.log("Submitting order:", orderId);
    console.log("API URL:", `${API_BASE_URL}/orders`);

    try {
      const requestBody = JSON.stringify({ orderId });
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
}
