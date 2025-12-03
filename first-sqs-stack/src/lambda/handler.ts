// ========================================
// AWS LAMBDA HANDLERS FOR ORDER PROCESSING
// ========================================
// This module provides HTTP-facing handlers (producer, getOrders) and the
// SQS consumer used to persist incoming orders. It also exposes small
// management endpoints to subscribe/unsubscribe email addresses to the SNS
// notifications topic.

// Types from `aws-lambda` help with development by providing correct shapes
// for API Gateway and SQS events.
import {
  APIGatewayProxyEvent, // HTTP event structure from API Gateway
  APIGatewayProxyResult, // HTTP response structure expected by API Gateway
  SQSEvent, // SQS event containing message Records
} from "aws-lambda";

// AWS SDK v3 clients (modular) - only import what's needed for smaller bundles.
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import {
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
} from "@aws-sdk/client-sns";

// Create SDK clients outside handlers so they are reused across Lambda
// invocations when the execution environment is warm. This reduces overhead.
const sqs = new SQSClient({ region: process.env.AWS_REGION || "us-east-2" });
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
});
const dynamodb = DynamoDBDocumentClient.from(ddbClient);
const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || "us-east-2",
});
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-2",
});

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
    // Ensure the request has a JSON body and required fields. This is basic
    // validation — more complex validation should be done in the workflow.
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
    // Send the full order payload to SQS so asynchronous processing can
    // persist, publish events and trigger workflows from the consumer.
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.QUEUE_URL!, // Provided by CDK at deployment time
        MessageBody: JSON.stringify(body), // Send the entire order object
      })
    );

    console.log("Message sent successfully to SQS");

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    // Return the accepted response to the frontend. The order will be
    // processed asynchronously by the consumer Lambda.
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        message: "Order placed in queue",
        orderId,
      }),
    };
  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    // Log error and return 500 so clients can surface a useful message.
    console.error("Error creating order:", error);
    console.error("Environment variables:", {
      QUEUE_URL: process.env.QUEUE_URL,
      AWS_REGION: process.env.AWS_REGION,
    });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      statusCode: 500,
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

  // event.Records contains an array of messages (batch processing)
  const messages = event.Records;

  // Process each message in the batch sequentially. For higher throughput
  // you could process messages concurrently, but then you must handle
  // partial failures and visibility timeouts carefully.
  for (const message of messages) {
    try {
      // Parse the JSON message body sent by the producer
      const orderData = JSON.parse(message.body);
      console.log("Processing order:", orderData.orderId);

      // Persist the order record to DynamoDB with timestamps for auditing
      await dynamodb.send(
        new PutCommand({
          TableName: process.env.TABLE_NAME!,
          Item: {
            ...orderData,
            timestamp: orderData.timestamp || new Date().toISOString(),
            processedAt: new Date().toISOString(),
          },
        })
      );

      console.log("Order saved to DynamoDB:", orderData.orderId);

      // Publish an EventBridge event so other parts of the system can react
      if (process.env.EVENT_BUS_NAME) {
        try {
          await eventBridgeClient.send(
            new PutEventsCommand({
              Entries: [
                {
                  Source: "order.system",
                  DetailType: "Order Created",
                  Detail: JSON.stringify({
                    orderId: orderData.orderId,
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    orderValue: orderData.orderValue,
                    priority: orderData.priority,
                    status: orderData.status,
                    items: orderData.items,
                    timestamp: orderData.timestamp,
                  }),
                  EventBusName: process.env.EVENT_BUS_NAME,
                },
              ],
            })
          );
          console.log(`EventBridge event published for order ${orderData.orderId}`);
        } catch (eventError) {
          // Failures to publish events should not block the primary processing
          // of the order; log and continue.
          console.error("Failed to publish EventBridge event:", eventError);
        }
      }

      // Simulate additional processing work (e.g. calling other services).
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Finished processing order:", orderData.orderId);

      // If no exception is thrown, SQS will consider the message processed
      // and remove it from the queue automatically.
    } catch (error) {
      // On error re-throw so SQS can retry and eventually send the message
      // to the configured Dead Letter Queue after `maxReceiveCount`.
      console.error("Error processing message:", error);
      console.error("Message body:", message.body);
      throw error;
    }
  }
};

// ========================================
// GET ORDERS LAMBDA FUNCTION
// ========================================
/**
 * Get Orders Lambda: Retrieves all orders from DynamoDB
 *
 * Flow:
 * 1. Frontend sends GET request to API Gateway
 * 2. API Gateway triggers this Lambda function
 * 3. Lambda scans DynamoDB table to retrieve all orders
 * 4. Returns orders array to frontend
 *
 * @param event - API Gateway HTTP event
 * @returns Promise<APIGatewayProxyResult> - HTTP response with orders array
 */
export const getOrders = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("GetOrders received event:", JSON.stringify(event, null, 2));

  try {
    // Scan the table to return all orders. Note: Scan is acceptable for
    // small datasets during development, but use queries with indexes in prod.
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME!,
      })
    );

    console.log(`Retrieved ${result.Items?.length || 0} orders from DynamoDB`);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        orders: result.Items || [],
      }),
    };
  } catch (error) {
    console.error("Error retrieving orders:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        message: "Error retrieving orders",
        error: errorMessage,
      }),
    };
  }
};

// ========================================
// SUBSCRIBE EMAIL LAMBDA FUNCTION
// ========================================
/**
 * Subscribes an email address to the SNS topic for order notifications
 * with optional event type filtering
 *
 * Request body: {
 *   email: string,
 *   preferences?: {
 *     orderCreated?: boolean,
 *     orderCompleted?: boolean,
 *     orderFailed?: boolean,
 *     orderUrgent?: boolean
 *   }
 * }
 * Response: { message: string, subscriptionArn: string }
 */
export const subscribeEmail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Subscribe email request received:", event);

  try {
    const topicArn = process.env.TOPIC_ARN;
    if (!topicArn) {
      throw new Error("TOPIC_ARN environment variable not set");
    }

    // Parse request body and extract email + preferences.
    const body = JSON.parse(event.body || "{}");
    const email = body.email;
    const preferences = body.preferences || {};

    // Validate email presence and basic format.
    if (!email || typeof email !== "string") {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: JSON.stringify({
          message: "Email address is required",
        }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: JSON.stringify({
          message: "Invalid email address format",
        }),
      };
    }

    // Build the list of event types to include in the filter policy. If the
    // caller explicitly disables a type by setting it to false, we omit it.
    const eventTypes: string[] = [];
    if (preferences.orderCreated !== false) eventTypes.push("OrderCreated");
    if (preferences.orderCompleted !== false) eventTypes.push("OrderCompleted");
    if (preferences.orderFailed !== false) eventTypes.push("OrderFailed");
    if (preferences.orderUrgent !== false) eventTypes.push("OrderUrgent");

    // If the caller provided an empty object or disabled everything, subscribe
    // to all event types by default to avoid creating an empty filter.
    if (eventTypes.length === 0) {
      eventTypes.push("OrderCreated", "OrderCompleted", "OrderFailed", "OrderUrgent");
    }

    const filterPolicy = { eventType: eventTypes };

    // Create the subscription. SNS will send a confirmation email to the
    // endpoint; the subscription must be confirmed by the user before
    // messages will be delivered.
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "email",
      Endpoint: email,
      Attributes: { FilterPolicy: JSON.stringify(filterPolicy) },
    });

    const response = await snsClient.send(command);

    console.log("Email subscribed successfully with preferences:", {
      email,
      eventTypes,
      subscriptionArn: response.SubscriptionArn,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        message: "Subscription request sent. Please check your email to confirm.",
        subscriptionArn: response.SubscriptionArn,
        preferences: {
          orderCreated: eventTypes.includes("OrderCreated"),
          orderCompleted: eventTypes.includes("OrderCompleted"),
          orderFailed: eventTypes.includes("OrderFailed"),
          orderUrgent: eventTypes.includes("OrderUrgent"),
        },
      }),
    };
  } catch (error) {
    console.error("Error subscribing email:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({ message: "Error subscribing email", error: errorMessage }),
    };
  }
};

// ========================================
// UNSUBSCRIBE EMAIL LAMBDA FUNCTION
// ========================================
/**
 * Unsubscribes an email address from the SNS topic
 *
 * Request body: { email: string }
 * Response: { message: string }
 */
export const unsubscribeEmail = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Unsubscribe email request received:", event);

  try {
    const topicArn = process.env.TOPIC_ARN;
    if (!topicArn) {
      throw new Error("TOPIC_ARN environment variable not set");
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const email = body.email;

    // Validate email
    if (!email || typeof email !== "string") {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
        },
        body: JSON.stringify({ message: "Email address is required" }),
      };
    }

    // List all subscriptions for the topic and find the one that matches the
    // email address so we can call Unsubscribe on it.
    const listCommand = new ListSubscriptionsByTopicCommand({ TopicArn: topicArn });
    const listResponse = await snsClient.send(listCommand);
    const subscriptions = listResponse.Subscriptions || [];

    const subscription = subscriptions.find(
      (sub) => sub.Endpoint === email && sub.Protocol === "email"
    );

    if (!subscription || !subscription.SubscriptionArn) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
        },
        body: JSON.stringify({ message: "Subscription not found for this email address" }),
      };
    }

    // Perform unsubscribe call using the subscription ARN returned by SNS
    const unsubscribeCommand = new UnsubscribeCommand({
      SubscriptionArn: subscription.SubscriptionArn,
    });

    await snsClient.send(unsubscribeCommand);

    console.log("Email unsubscribed successfully:", email);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      },
      body: JSON.stringify({ message: "Email unsubscribed successfully" }),
    };
  } catch (error) {
    console.error("Error unsubscribing email:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      },
      body: JSON.stringify({ message: "Error unsubscribing email", error: errorMessage }),
    };
  }
};
