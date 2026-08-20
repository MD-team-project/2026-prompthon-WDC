import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { config } from "../config.js";

// No explicit credentials: on the deployed host this rides the instance
// role (INFRA's runtime contract - AWS_PROFILE is local-dev only), and
// locally it rides the default provider chain (AWS_PROFILE).
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));
