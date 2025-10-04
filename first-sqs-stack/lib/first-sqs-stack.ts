// AWS CDK (Cloud Development Kit) imports for Infrastructure as Code
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"; // For TypeScript Lambda functions
import * as lambdaBase from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway"; // For REST API creation
import * as path from "path";
import * as sqs from "aws-cdk-lib/aws-sqs"; // For Simple Queue Service
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

/**
 * FirstSqsStack: AWS Infrastructure Stack for Order Processing System
 *
 * This stack creates a complete serverless order processing system with:
 * - SQS queue for reliable message delivery
 * - Lambda functions for processing orders
 * - API Gateway for HTTP endpoints
 * - Dead Letter Queue for error handling
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
    });

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
    // OUTPUT VALUES
    // ========================================
    // Export the API URL so it can be used by frontend applications
    // This value is displayed after deployment and can be accessed by other stacks
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url!, // The base URL of the deployed API Gateway
    });
  }
}
