// AWS CDK (Cloud Development Kit) imports for Infrastructure as Code
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"; // For TypeScript Lambda functions
import * as lambdaBase from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway"; // For REST API creation
import * as path from "path";
import * as sqs from "aws-cdk-lib/aws-sqs"; // For Simple Queue Service
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"; // For DynamoDB tables
import * as sfn from "aws-cdk-lib/aws-stepfunctions"; // For Step Functions state machines
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks"; // For Step Functions tasks
import * as events from "aws-cdk-lib/aws-events"; // For EventBridge
import * as targets from "aws-cdk-lib/aws-events-targets"; // For EventBridge targets
import * as sns from "aws-cdk-lib/aws-sns"; // For SNS notifications
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions"; // For SNS subscriptions

/**
 * FirstSqsStack: AWS Infrastructure Stack for Order Processing System
 *
 * This stack creates a complete serverless order processing system with:
 * - SQS queue for reliable message delivery
 * - Lambda functions for processing orders
 * - API Gateway for HTTP endpoints
 * - Dead Letter Queue for error handling
 * - DynamoDB for persistent storage
 * - Step Functions for workflow orchestration
 * - EventBridge for event-driven notifications
 * - SNS for email/SMS notifications
 */
export class FirstSqsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DEAD LETTER QUEUE (DLQ) CONFIGURATION
    // ========================================
    // DLQ captures messages that fail processing after multiple attempts
    // This prevents message loss and allows for manual inspection/reprocessing
    const dlq = new sqs.Queue(this, "OrdersDLQ", {
      queueName: `${this.stackName}-orders-dlq`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete queue when stack is destroyed (dev only)
    });

    // ========================================
    // DYNAMODB TABLE CONFIGURATION
    // ========================================
    // DynamoDB table for persistent order storage
    const ordersTable = new dynamodb.Table(this, "OrdersTable", {
      tableName: `${this.stackName}-orders`,
      partitionKey: { name: "orderId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand pricing
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: false, // Enable in production
    });

    // ========================================
    // MAIN SQS QUEUE CONFIGURATION
    // ========================================
    // Primary queue for order processing with error handling
    const queue = new sqs.Queue(this, "OrdersQueue", {
      // visibilityTimeout: Time a message is hidden from other consumers after being read
      // Must be >= Lambda function timeout to prevent duplicate processing
      visibilityTimeout: cdk.Duration.seconds(30),
      queueName: `${this.stackName}-orders-queue`,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - use RETAIN in production
      // Configure dead letter queue for failed messages
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3, // Send to DLQ after 3 failed processing attempts
      },
    });

    // ========================================
    // PRODUCER LAMBDA FUNCTION
    // ========================================
    // This Lambda receives HTTP requests and sends messages to SQS
    // Acts as the entry point for new orders from the frontend
    const producerLambda = new NodejsFunction(this, "OrderProducer", {
      runtime: lambdaBase.Runtime.NODEJS_22_X, // Latest Node.js runtime
      entry: path.join(__dirname, "../src/lambda/handler.ts"), // Source file location
      handler: "producer", // Function name to invoke within the file
      functionName: `${this.stackName}-producer`, // AWS function name
      environment: {
        // Environment variable accessible within the Lambda function
        QUEUE_URL: queue.queueUrl, // SQS queue URL for sending messages
      },
    });

    // Grant the producer Lambda permission to send messages to the SQS queue
    // This creates the necessary IAM policies automatically
    queue.grantSendMessages(producerLambda);

    // ========================================
    // CONSUMER LAMBDA FUNCTION
    // ========================================
    // This Lambda processes messages from the SQS queue
    // Automatically triggered when messages are available
    const consumerLambda = new NodejsFunction(this, "OrderConsumer", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/handler.ts"),
      handler: "consumer", // Different handler function in the same file
      functionName: `${this.stackName}-consumer`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });

    // Grant the consumer Lambda permission to write to DynamoDB
    ordersTable.grantWriteData(consumerLambda);

    // Configure SQS as an event source for the consumer Lambda
    // This creates an event source mapping that automatically polls SQS
    consumerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(queue, {
        batchSize: 10, // Process up to 10 messages per Lambda invocation
        // Additional options available:
        // - maxBatchingWindow: Wait time to collect messages into batches
        // - parallelizationFactor: Number of concurrent batches per shard
      })
    );

    // ========================================
    // API GATEWAY CONFIGURATION
    // ========================================
    // REST API that provides HTTP endpoints for the frontend application
    const api = new apigateway.RestApi(this, "OrdersAPI", {
      // CORS (Cross-Origin Resource Sharing) configuration
      // Allows frontend apps from different domains to access this API
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Allow requests from any domain (dev only)
        allowMethods: apigateway.Cors.ALL_METHODS, // Allow all HTTP methods (GET, POST, etc.)
        allowHeaders: [
          "Content-Type", // For JSON payloads
          "X-Amz-Date", // AWS signature headers
          "Authorization", // For API authentication
          "X-Api-Key", // For API key authentication
        ],
      },
    });

    // Create a resource path: /orders
    // This becomes the endpoint where clients can send requests
    const orders = api.root.addResource("orders");

    // Add POST method to the /orders endpoint
    // Links the HTTP POST request to the producer Lambda function
    orders.addMethod("POST", new apigateway.LambdaIntegration(producerLambda));

    // ========================================
    // GET ORDERS LAMBDA FUNCTION
    // ========================================
    // Lambda function to retrieve orders from DynamoDB
    const getOrdersLambda = new NodejsFunction(this, "GetOrders", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/handler.ts"),
      handler: "getOrders",
      functionName: `${this.stackName}-get-orders`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });

    // Grant the GET orders Lambda permission to read from DynamoDB
    ordersTable.grantReadData(getOrdersLambda);

    // Add GET method to the /orders endpoint
    // Links the HTTP GET request to the getOrders Lambda function
    orders.addMethod("GET", new apigateway.LambdaIntegration(getOrdersLambda));

    // ========================================
    // SNS TOPIC FOR NOTIFICATIONS
    // ========================================
    // SNS topic for order notifications
    const orderNotificationsTopic = new sns.Topic(this, "OrderNotifications", {
      topicName: `${this.stackName}-order-notifications`,
      displayName: "Order Processing Notifications",
    });

    // ========================================
    // NOTIFICATION SUBSCRIPTION LAMBDAS
    // ========================================
    // Lambda function to subscribe emails to SNS topic
    const subscribeEmailLambda = new NodejsFunction(this, "SubscribeEmail", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/handler.ts"),
      handler: "subscribeEmail",
      functionName: `${this.stackName}-subscribe-email`,
      environment: {
        TOPIC_ARN: orderNotificationsTopic.topicArn,
      },
    });

    // Lambda function to unsubscribe emails from SNS topic
    const unsubscribeEmailLambda = new NodejsFunction(
      this,
      "UnsubscribeEmail",
      {
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/lambda/handler.ts"),
        handler: "unsubscribeEmail",
        functionName: `${this.stackName}-unsubscribe-email`,
        environment: {
          TOPIC_ARN: orderNotificationsTopic.topicArn,
        },
      }
    );

    // Grant permissions to manage SNS subscriptions
    orderNotificationsTopic.grantPublish(subscribeEmailLambda);
    orderNotificationsTopic.grantPublish(unsubscribeEmailLambda);

    // Grant additional SNS permissions needed for subscription management
    subscribeEmailLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["sns:Subscribe", "sns:ListSubscriptionsByTopic"],
        resources: [orderNotificationsTopic.topicArn],
      })
    );

    unsubscribeEmailLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["sns:Unsubscribe", "sns:ListSubscriptionsByTopic"],
        resources: [orderNotificationsTopic.topicArn],
      })
    );

    // Add /notifications resource to API
    const notifications = api.root.addResource("notifications");

    // POST /notifications/subscribe - Subscribe to notifications
    const subscribeResource = notifications.addResource("subscribe");
    subscribeResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(subscribeEmailLambda)
    );

    // POST /notifications/unsubscribe - Unsubscribe from notifications
    const unsubscribeResource = notifications.addResource("unsubscribe");
    unsubscribeResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(unsubscribeEmailLambda)
    );

    // Output SNS topic ARN for manual email subscription
    new cdk.CfnOutput(this, "NotificationsTopicArn", {
      value: orderNotificationsTopic.topicArn,
      description:
        "SNS Topic ARN for order notifications (subscribe via AWS Console)",
    });

    // ========================================
    // STEP FUNCTIONS WORKFLOW LAMBDAS
    // ========================================

    // Lambda: Validate Order
    const validateOrderLambda = new NodejsFunction(this, "ValidateOrder", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "validateOrder",
      functionName: `${this.stackName}-validate-order`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });
    ordersTable.grantReadWriteData(validateOrderLambda);

    // Lambda: Process Payment
    const processPaymentLambda = new NodejsFunction(this, "ProcessPayment", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "processPayment",
      functionName: `${this.stackName}-process-payment`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });
    ordersTable.grantReadWriteData(processPaymentLambda);

    // Lambda: Update Inventory
    const updateInventoryLambda = new NodejsFunction(this, "UpdateInventory", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "updateInventory",
      functionName: `${this.stackName}-update-inventory`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });
    ordersTable.grantReadWriteData(updateInventoryLambda);

    // Lambda: Send Notification
    const sendNotificationLambda = new NodejsFunction(
      this,
      "SendNotification",
      {
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/lambda/workflow.ts"),
        handler: "sendNotification",
        functionName: `${this.stackName}-send-notification`,
        environment: {
          TABLE_NAME: ordersTable.tableName,
          SNS_TOPIC_ARN: orderNotificationsTopic.topicArn,
        },
      }
    );
    ordersTable.grantReadWriteData(sendNotificationLambda);
    orderNotificationsTopic.grantPublish(sendNotificationLambda);

    // Lambda: Handle Order Failure
    const handleFailureLambda = new NodejsFunction(this, "HandleFailure", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "handleFailure",
      functionName: `${this.stackName}-handle-failure`,
      environment: {
        TABLE_NAME: ordersTable.tableName,
        SNS_TOPIC_ARN: orderNotificationsTopic.topicArn,
      },
    });
    ordersTable.grantReadWriteData(handleFailureLambda);
    orderNotificationsTopic.grantPublish(handleFailureLambda);

    // Lambda: Notify Order Created (for EventBridge)
    const notifyOrderCreatedLambda = new NodejsFunction(
      this,
      "NotifyOrderCreated",
      {
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/lambda/workflow.ts"),
        handler: "notifyOrderCreated",
        functionName: `${this.stackName}-notify-order-created`,
        environment: {
          SNS_TOPIC_ARN: orderNotificationsTopic.topicArn,
        },
      }
    );
    orderNotificationsTopic.grantPublish(notifyOrderCreatedLambda);

    // Lambda: Notify Urgent Order (for EventBridge)
    const notifyUrgentOrderLambda = new NodejsFunction(
      this,
      "NotifyUrgentOrder",
      {
        runtime: lambdaBase.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, "../src/lambda/workflow.ts"),
        handler: "notifyUrgentOrder",
        functionName: `${this.stackName}-notify-urgent-order`,
        environment: {
          SNS_TOPIC_ARN: orderNotificationsTopic.topicArn,
        },
      }
    );
    orderNotificationsTopic.grantPublish(notifyUrgentOrderLambda);

    // ========================================
    // STEP FUNCTIONS STATE MACHINE
    // ========================================

    // Define workflow tasks
    const validateTask = new tasks.LambdaInvoke(this, "Validate Order", {
      lambdaFunction: validateOrderLambda,
      outputPath: "$.Payload",
    });

    const processPaymentTask = new tasks.LambdaInvoke(this, "Process Payment", {
      lambdaFunction: processPaymentLambda,
      outputPath: "$.Payload",
    });

    const updateInventoryTask = new tasks.LambdaInvoke(
      this,
      "Update Inventory",
      {
        lambdaFunction: updateInventoryLambda,
        outputPath: "$.Payload",
      }
    );

    const sendNotificationTask = new tasks.LambdaInvoke(
      this,
      "Send Notification",
      {
        lambdaFunction: sendNotificationLambda,
        outputPath: "$.Payload",
      }
    );

    const successState = new sfn.Succeed(this, "Order Processing Complete");
    const failState = new sfn.Fail(this, "Order Processing Failed", {
      cause: "Order validation or processing failed",
      error: "OrderProcessingError",
    });

    // Create failure handling task
    const handleFailureTask = new tasks.LambdaInvoke(this, "Handle Failure", {
      lambdaFunction: handleFailureLambda,
      outputPath: "$.Payload",
    }).next(failState);

    // Define workflow with error handling
    const definition = validateTask
      .addCatch(handleFailureTask, {
        errors: ["States.ALL"],
        resultPath: "$.error",
      })
      .next(
        new sfn.Choice(this, "Validation Successful?")
          .when(
            sfn.Condition.booleanEquals("$.valid", true),
            processPaymentTask
              .addCatch(handleFailureTask, {
                errors: ["States.ALL"],
                resultPath: "$.error",
              })
              .next(
                new sfn.Choice(this, "Payment Successful?")
                  .when(
                    sfn.Condition.booleanEquals("$.paymentSuccess", true),
                    updateInventoryTask
                      .addCatch(handleFailureTask, {
                        errors: ["States.ALL"],
                        resultPath: "$.error",
                      })
                      .next(sendNotificationTask.next(successState))
                  )
                  .otherwise(handleFailureTask)
              )
          )
          .otherwise(handleFailureTask)
      );

    // Create state machine
    const orderWorkflow = new sfn.StateMachine(this, "OrderWorkflow", {
      stateMachineName: `${this.stackName}-order-workflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(5),
    });

    // ========================================
    // EVENTBRIDGE EVENT BUS & RULES
    // ========================================

    // Create custom event bus for order events
    const orderEventBus = new events.EventBus(this, "OrderEventBus", {
      eventBusName: `${this.stackName}-order-events`,
    });

    // Lambda: Trigger Step Functions workflow
    const triggerWorkflowLambda = new NodejsFunction(this, "TriggerWorkflow", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "triggerWorkflow",
      functionName: `${this.stackName}-trigger-workflow`,
      environment: {
        STATE_MACHINE_ARN: orderWorkflow.stateMachineArn,
      },
    });
    orderWorkflow.grantStartExecution(triggerWorkflowLambda);

    // Lambda: Send EventBridge events
    const publishEventLambda = new NodejsFunction(this, "PublishEvent", {
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, "../src/lambda/workflow.ts"),
      handler: "publishEvent",
      functionName: `${this.stackName}-publish-event`,
      environment: {
        EVENT_BUS_NAME: orderEventBus.eventBusName,
      },
    });
    orderEventBus.grantPutEventsTo(publishEventLambda);

    // Rule: High-value orders (> $500) trigger Step Functions workflow
    const highValueOrderRule = new events.Rule(this, "HighValueOrderRule", {
      eventBus: orderEventBus,
      ruleName: `${this.stackName}-high-value-orders`,
      description: "Trigger workflow for orders > $500",
      eventPattern: {
        source: ["order.system"],
        detailType: ["Order Created"],
        detail: {
          orderValue: [{ numeric: [">", 500] }],
        },
      },
    });
    highValueOrderRule.addTarget(
      new targets.LambdaFunction(triggerWorkflowLambda)
    );

    // Rule: All created orders send notification (for OrderCreated event type)
    const orderCreatedRule = new events.Rule(this, "OrderCreatedRule", {
      eventBus: orderEventBus,
      ruleName: `${this.stackName}-order-created`,
      description: "Send notification when order is created",
      eventPattern: {
        source: ["order.system"],
        detailType: ["Order Created"],
      },
    });
    orderCreatedRule.addTarget(
      new targets.LambdaFunction(notifyOrderCreatedLambda)
    );

    // Rule: Urgent priority orders trigger immediate notification
    const urgentOrderRule = new events.Rule(this, "UrgentOrderRule", {
      eventBus: orderEventBus,
      ruleName: `${this.stackName}-urgent-orders`,
      description: "Send notification for urgent orders",
      eventPattern: {
        source: ["order.system"],
        detailType: ["Order Created"],
        detail: {
          priority: ["urgent"],
        },
      },
    });
    urgentOrderRule.addTarget(
      new targets.LambdaFunction(notifyUrgentOrderLambda)
    );

    // Rule: Failed orders trigger SNS notification
    const failedOrderRule = new events.Rule(this, "FailedOrderRule", {
      eventBus: orderEventBus,
      ruleName: `${this.stackName}-failed-orders`,
      description: "Notify on failed orders",
      eventPattern: {
        source: ["order.system"],
        detailType: ["Order Failed"],
      },
    });
    failedOrderRule.addTarget(new targets.SnsTopic(orderNotificationsTopic));

    // Update consumer Lambda to publish events to EventBridge
    consumerLambda.addEnvironment("EVENT_BUS_NAME", orderEventBus.eventBusName);
    orderEventBus.grantPutEventsTo(consumerLambda);

    // ========================================
    // OUTPUT VALUES
    // ========================================
    // Export the API URL so it can be used by frontend applications
    // This value is displayed after deployment and can be accessed by other stacks
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url!, // The base URL of the deployed API Gateway
    });
  }
}
