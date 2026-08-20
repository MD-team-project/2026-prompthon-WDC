// One table, partition key `id` (server-generated via randomUUID - never a
// client-supplied identifier, per INFRA's runtime contract). `productId` is
// a plain attribute; listSkills scans and filters on it, which the runtime
// contract calls out as fine at demo volume. Table name comes from
// DDB_TABLE_NAME (config.ddbTableName) - INFRA provisions it from this file.
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import type { ProductId, SkillRecord } from "@prompthon/shared";
import { config } from "../config.js";
import { ddb } from "./ddbClient.js";

export async function putSkill(input: { productId: ProductId; title: string; content: string }): Promise<SkillRecord> {
  const record: SkillRecord = {
    id: randomUUID(),
    productId: input.productId,
    title: input.title,
    content: input.content,
    createdAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: config.ddbTableName, Item: record }));
  return record;
}

export async function getSkill(id: string): Promise<SkillRecord | null> {
  const { Item } = await ddb.send(new GetCommand({ TableName: config.ddbTableName, Key: { id } }));
  return (Item as SkillRecord | undefined) ?? null;
}

export async function listSkills(productId: ProductId): Promise<SkillRecord[]> {
  const { Items } = await ddb.send(
    new ScanCommand({
      TableName: config.ddbTableName,
      FilterExpression: "productId = :pid",
      ExpressionAttributeValues: { ":pid": productId },
    }),
  );
  return (Items as SkillRecord[] | undefined) ?? [];
}

export async function updateSkillContent(id: string, content: string): Promise<SkillRecord | null> {
  try {
    const { Attributes } = await ddb.send(
      new UpdateCommand({
        TableName: config.ddbTableName,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
        UpdateExpression: "SET content = :content",
        ExpressionAttributeValues: { ":content": content },
        ReturnValues: "ALL_NEW",
      }),
    );
    return (Attributes as SkillRecord | undefined) ?? null;
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") return null;
    throw err;
  }
}

/** Hard delete - the row is gone, not soft-deleted via a status flag. */
export async function deleteSkill(id: string): Promise<boolean> {
  try {
    await ddb.send(
      new DeleteCommand({ TableName: config.ddbTableName, Key: { id }, ConditionExpression: "attribute_exists(id)" }),
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}
