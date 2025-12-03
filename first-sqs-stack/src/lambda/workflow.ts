// ========================================
// STEP FUNCTIONS WORKFLOW HANDLERS
// ========================================
// The file contains Lambda handlers invoked by Step Functions and EventBridge.
// Each handler performs a small, focused responsibility and updates DynamoDB
// or publishes events/messages to SNS/EventBridge as appropriate.

// --- AWS SDK clients ---
// Import only required clients from AWS SDK v3. These are lightweight and
// modular so we only include what we need for each operation.
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

// Create singleton clients. The Lambda execution context may be reused across
// invocations, so creating clients outside the handler improves performance.
const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || "us-east-2",
});
const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || "us-east-2",
});
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-2",
});
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-2",
});
// DynamoDBDocumentClient provides a higher-level API that works with native
// JS objects instead of raw DynamoDB attribute maps.
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

// ========================================
// VALIDATE ORDER
// ========================================
// Validate order: small, deterministic checks to ensure the order payload is
// sane before the workflow continues. Returns the input plus a `valid` flag
// and a `validationResult` object describing which checks passed or failed.
export const validateOrder = async (event: any) => {
  // Log the incoming payload to help debugging in CloudWatch.
  console.log("Validating order:", JSON.stringify(event, null, 2));

  // Extract fields we need for validation.
  const { orderId, orderValue, items } = event;

  try {
    // Run simple business validations. Each property maps to a boolean.
    const validations = {
      // orderId must be present and truthy
      hasOrderId: !!orderId,
      // orderValue should be within an expected range
      hasValidValue: orderValue > 0 && orderValue < 10000,
      // there must be at least one item
      hasItems: items && items.length > 0,
      // each item must have a positive price
      itemsHavePrice: items.every((item: any) => item.price > 0),
    };

    // Combine individual validation booleans into a single overall flag.
    const isValid = Object.values(validations).every((v) => v === true);

    // Persist validation result back into DynamoDB; use the provided
    // timestamp as the sort key to avoid collisions.
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { orderId, timestamp: event.timestamp },
        UpdateExpression: "SET #status = :status, validationResult = :result",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          // Mark record validated or validation_failed so later steps can inspect
          ":status": isValid ? "validated" : "validation_failed",
          ":result": validations,
        },
      })
    );

    console.log(
      `Order ${orderId} validation: ${isValid ? "PASSED" : "FAILED"}`
    );

    // Return enriched event payload for the Step Functions state machine.
    return {
      ...event,
      valid: isValid,
      validationResult: validations,
      step: "validation",
    };
  } catch (error) {
    // Bubble errors up so the Step Function's catch paths execute.
    console.error("Validation error:", error);
    throw error;
  }
};

// ========================================
// PROCESS PAYMENT
// ========================================
export const processPayment = async (event: any) => {
  console.log("Processing payment:", JSON.stringify(event, null, 2));

  const { orderId, orderValue, customerEmail } = event;

  try {
    // Simulate payment processing (90% success rate)
    const paymentSuccess = Math.random() > 0.1;
    const transactionId = `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Update order in DynamoDB
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { orderId, timestamp: event.timestamp },
        UpdateExpression:
          "SET #status = :status, paymentStatus = :paymentStatus, transactionId = :txnId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": paymentSuccess ? "payment_processed" : "payment_failed",
          ":paymentStatus": paymentSuccess ? "completed" : "failed",
          ":txnId": transactionId,
        },
      })
    );

    console.log(
      `Payment for ${orderId}: ${
        paymentSuccess ? "SUCCESS" : "FAILED"
      } (${transactionId})`
    );

    return {
      ...event,
      paymentSuccess,
      transactionId,
      step: "payment",
    };
  } catch (error) {
    console.error("Payment processing error:", error);
    throw error;
  }
};

// ========================================
// UPDATE INVENTORY
// ========================================
export const updateInventory = async (event: any) => {
  console.log("Updating inventory:", JSON.stringify(event, null, 2));

  const { orderId, items } = event;

  try {
    // Simulate inventory update
    const inventoryUpdates = items.map((item: any) => ({
      itemId: item.id,
      itemName: item.name,
      quantityReduced: item.quantity,
      timestamp: new Date().toISOString(),
    }));

    // Update order in DynamoDB
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { orderId, timestamp: event.timestamp },
        UpdateExpression: "SET #status = :status, inventoryUpdates = :updates",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "inventory_updated",
          ":updates": inventoryUpdates,
        },
      })
    );

    console.log(
      `Inventory updated for order ${orderId}: ${items.length} items`
    );

    return {
      ...event,
      inventoryUpdated: true,
      inventoryUpdates,
      step: "inventory",
    };
  } catch (error) {
    console.error("Inventory update error:", error);
    throw error;
  }
};

// ========================================
// SEND NOTIFICATION
// ========================================
export const sendNotification = async (event: any) => {
  console.log("Sending notification:", JSON.stringify(event, null, 2));

  const { orderId, customerName, customerEmail, orderValue, transactionId } =
    event;

  try {
    const message = `
Order Processed Successfully! 🎉

Order ID: ${orderId}
Customer: ${customerName} (${customerEmail})
Amount: $${orderValue}
Transaction ID: ${transactionId}
Status: Completed

Your order has been validated, payment processed, and inventory updated.
Estimated delivery: 3-5 business days.

Thank you for your order!
    `.trim();

    // Send SNS notification with message attributes for filtering
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: `Order ${orderId} - Processing Complete`,
        Message: message,
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "OrderCompleted",
          },
        },
      })
    );

    // Update order in DynamoDB
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { orderId, timestamp: event.timestamp },
        UpdateExpression:
          "SET #status = :status, notificationSent = :sent, completedAt = :completedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "completed",
          ":sent": true,
          ":completedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`Notification sent for order ${orderId}`);

    return {
      ...event,
      notificationSent: true,
      completedAt: new Date().toISOString(),
      step: "notification",
    };
  } catch (error) {
    console.error("Notification error:", error);
    throw error;
  }
};

// ========================================
// HANDLE FAILURE
// ========================================
export const handleFailure = async (event: any) => {
  console.log("Handling order failure:", JSON.stringify(event, null, 2));

  const { orderId, customerName, customerEmail, error } = event;

  try {
    const message = `
Order Processing Failed ❌

Order ID: ${orderId}
Customer: ${customerName} (${customerEmail})
Error: ${error?.message || "Unknown error"}
Step Failed: ${event.step || "Unknown"}

The order has been marked as failed and requires manual review.
Customer service has been notified.
    `.trim();

    // Send failure notification with message attributes for filtering
    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: `Order ${orderId} - Processing Failed`,
        Message: message,
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "OrderFailed",
          },
        },
      })
    );

    // Update order in DynamoDB
    await dynamodb.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { orderId, timestamp: event.timestamp },
        UpdateExpression:
          "SET #status = :status, failureReason = :reason, failedAt = :failedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "failed",
          ":reason": error?.message || "Unknown error",
          ":failedAt": new Date().toISOString(),
        },
      })
    );

    console.log(`Failure handled for order ${orderId}`);

    return {
      ...event,
      failureHandled: true,
      failedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failure handling error:", error);
    throw error;
  }
};

// ========================================
// TRIGGER STEP FUNCTIONS WORKFLOW
// ========================================
export const triggerWorkflow = async (event: any) => {
  console.log(
    "Triggering Step Functions workflow:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Extract order details from EventBridge event
    const orderDetails = event.detail;

    const executionInput = {
      orderId: orderDetails.orderId,
      customerName: orderDetails.customerName,
      customerEmail: orderDetails.customerEmail,
      orderValue: orderDetails.orderValue,
      priority: orderDetails.priority,
      items: orderDetails.items,
      timestamp: orderDetails.timestamp,
    };

    // Start Step Functions execution
    const result = await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn: process.env.STATE_MACHINE_ARN!,
        input: JSON.stringify(executionInput),
        name: `execution-${orderDetails.orderId}-${Date.now()}`,
      })
    );

    console.log(
      `Workflow started for order ${orderDetails.orderId}:`,
      result.executionArn
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Workflow triggered successfully",
        executionArn: result.executionArn,
      }),
    };
  } catch (error) {
    console.error("Workflow trigger error:", error);
    throw error;
  }
};

// ========================================
// PUBLISH EVENTBRIDGE EVENT
// ========================================
export const publishEvent = async (event: any) => {
  console.log("Publishing EventBridge event:", JSON.stringify(event, null, 2));

  try {
    const { orderId, eventType, details } = event;

    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "order.system",
            DetailType: eventType,
            Detail: JSON.stringify(details),
            EventBusName: process.env.EVENT_BUS_NAME!,
          },
        ],
      })
    );

    console.log(`Event published: ${eventType} for order ${orderId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Event published successfully",
        eventType,
      }),
    };
  } catch (error) {
    console.error("Event publishing error:", error);
    throw error;
  }
};

// ========================================
// HANDLE EVENTBRIDGE ORDER CREATED NOTIFICATION
// ========================================
export const notifyOrderCreated = async (event: any) => {
  console.log(
    "Sending OrderCreated notification:",
    JSON.stringify(event, null, 2)
  );

  try {
    const detail = event.detail;
    const message = `
New Order Created 🎉

Order ID: ${detail.orderId}
Customer: ${detail.customerName} (${detail.customerEmail})
Order Value: $${detail.orderValue.toFixed(2)}
Priority: ${detail.priority}
Items: ${detail.items.length}

The order has been received and is being processed.
    `.trim();

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: `New Order ${detail.orderId}`,
        Message: message,
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "OrderCreated",
          },
        },
      })
    );

    console.log(`OrderCreated notification sent for ${detail.orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending OrderCreated notification:", error);
    throw error;
  }
};

// ========================================
// HANDLE EVENTBRIDGE URGENT ORDER NOTIFICATION
// ========================================
export const notifyUrgentOrder = async (event: any) => {
  console.log(
    "Sending UrgentOrder notification:",
    JSON.stringify(event, null, 2)
  );

  try {
    const detail = event.detail;
    const message = `
URGENT ORDER ALERT 🚨

Order ID: ${detail.orderId}
Customer: ${detail.customerName} (${detail.customerEmail})
Order Value: $${detail.orderValue.toFixed(2)}
Items: ${detail.items.length}

This order requires immediate attention!
Please prioritize processing.
    `.trim();

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: `URGENT: Order ${detail.orderId}`,
        Message: message,
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: "OrderUrgent",
          },
        },
      })
    );

    console.log(`Urgent notification sent for ${detail.orderId}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending urgent notification:", error);
    throw error;
  }
};
