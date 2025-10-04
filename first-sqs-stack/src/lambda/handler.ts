// ========================================
// AWS LAMBDA HANDLERS FOR ORDER PROCESSING
// ========================================

// Import AWS Lambda types for type safety
import {
  APIGatewayProxyEvent, // Type for HTTP events from API Gateway
  APIGatewayProxyResult, // Type for HTTP responses to API Gateway
  SQSEvent, // Type for SQS events received by Lambda
} from "aws-lambda";

// Import AWS SDK v3 for SQS operations (newer, more efficient than v2)
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// Initialize SQS client with region configuration
// Uses environment variable or defaults to us-east-2
const sqs = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });

// ========================================
// PRODUCER LAMBDA FUNCTION
// ========================================
/**
 * Producer Lambda: Receives HTTP requests and sends messages to SQS
 *
 * Flow:
 * 1. Frontend sends POST request to API Gateway
 * 2. API Gateway triggers this Lambda function
 * 3. Lambda validates the request and extracts order data
 * 4. Lambda sends message to SQS queue for asynchronous processing
 * 5. Returns success/error response to frontend
 *
 * @param event - API Gateway HTTP event containing request data
 * @returns Promise<APIGatewayProxyResult> - HTTP response for the frontend
 */
export const producer = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Log incoming event for debugging (includes headers, body, query params, etc.)
  console.log("Producer received event:", JSON.stringify(event, null, 2));

  try {
    // ========================================
    // REQUEST VALIDATION
    // ========================================

    // Check if request has a body (required for POST requests)
    if (!event.body) {
      throw new Error("Request body is required");
    }

    // Parse JSON body - this can throw if invalid JSON
    const body = JSON.parse(event.body);
    const { orderId } = body;

    // Validate required fields
    if (!orderId) {
      throw new Error("orderId is required");
    }

    console.log("Sending message to SQS for orderId:", orderId);

    // ========================================
    // SQS MESSAGE SENDING
    // ========================================

    // Send message to SQS queue using AWS SDK v3
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL!, // Queue URL provided by CDK as environment variable
        MessageBody: JSON.stringify({ orderId }), // Serialize order data as JSON string
        // Additional options available:
        // - DelaySeconds: Delay before message becomes visible
        // - MessageAttributes: Custom metadata
        // - MessageDeduplicationId: For FIFO queues
        // - MessageGroupId: For FIFO queues
      })
    );

    console.log("Message sent successfully to SQS");

    // ========================================
    // SUCCESS RESPONSE
    // ========================================

    // Return successful HTTP response to API Gateway
    return {
      statusCode: 200,
      // CORS headers to allow frontend access from different domains
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow any origin (dev only)
        "Access-Control-Allow-Headers": "Content-Type", // Allow JSON content
        "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow POST and preflight
      },
      // Response body as JSON string
      body: JSON.stringify({
        message: "Order placed in queue",
        orderId,
      }),
    };
  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================

    // Log detailed error information for debugging
    console.error("Error creating order:", error);
    console.error("Environment variables:", {
      QUEUE_URL: process.env.QUEUE_URL,
      AWS_REGION: process.env.AWS_REGION,
    });

    // Extract error message safely (handle different error types)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Return error response to frontend
    return {
      statusCode: 500, // Internal Server Error
      // Include CORS headers even in error responses
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        message: "Error creating order",
        error: errorMessage,
      }),
    };
  }
};

// ========================================
// CONSUMER LAMBDA FUNCTION
// ========================================
/**
 * Consumer Lambda: Processes messages from SQS queue
 *
 * Flow:
 * 1. SQS automatically triggers this Lambda when messages are available
 * 2. Lambda receives a batch of messages (up to 10 based on CDK configuration)
 * 3. Lambda processes each message in the batch
 * 4. If processing succeeds, message is automatically deleted from queue
 * 5. If processing fails, message is retried or sent to Dead Letter Queue
 *
 * @param event - SQS event containing batch of messages to process
 * @returns Promise<void> - No return value needed for SQS events
 */
export const consumer = async (event: SQSEvent): Promise<void> => {
  // Log incoming SQS event for debugging (includes all message details)
  console.log("Consumer received event:", JSON.stringify(event, null, 2));

  // Extract messages from the SQS event
  // event.Records contains an array of messages (batch processing)
  const messages = event.Records;

  // ========================================
  // BATCH MESSAGE PROCESSING
  // ========================================

  // Process each message in the batch sequentially
  // Note: Could be processed in parallel for better performance
  for (const message of messages) {
    try {
      // ========================================
      // MESSAGE PARSING AND VALIDATION
      // ========================================

      // Parse the JSON message body sent by the producer
      const { orderId } = JSON.parse(message.body);
      console.log("Processing order:", orderId);

      // ========================================
      // BUSINESS LOGIC PROCESSING
      // ========================================

      // Simulate actual order processing (replace with real business logic)
      // Examples: Database updates, external API calls, inventory checks, etc.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("Finished processing order:", orderId);

      // ========================================
      // SUCCESS HANDLING
      // ========================================
      // If we reach here without throwing, the message is considered successfully processed
      // SQS will automatically delete the message from the queue
    } catch (error) {
      // ========================================
      // ERROR HANDLING
      // ========================================

      // Log detailed error information for debugging
      console.error("Error processing message:", error);
      console.error("Message body:", message.body);

      // Re-throw the error to signal failure to SQS
      // This will cause SQS to:
      // 1. Keep the message in the queue
      // 2. Retry processing (based on maxReceiveCount configuration)
      // 3. Eventually send to Dead Letter Queue if retries exhausted
      throw error;
    }
  }
};
