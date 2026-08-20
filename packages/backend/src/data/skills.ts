// One table, partition key `id` (server-generated via randomUUID - never a
// client-supplied identifier, per INFRA's runtime contract). `productId` is
// a plain attribute; listSkills scans and filters on it, which the runtime
// contract calls out as fine at demo volume. Table name comes from
// DDB_TABLE_NAME (config.ddbTableName) - INFRA provisions it from this file.
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import type { Bilingual, ProductId, SkillKind, SkillRecord } from "@prompthon/shared";
import { config } from "../config.js";
import { ddb } from "./ddbClient.js";

export async function putSkill(input: {
  productId: ProductId;
  title: Bilingual;
  kind: SkillKind;
  summary: Bilingual;
  content: string;
}): Promise<SkillRecord> {
  const record: SkillRecord = {
    id: randomUUID(),
    productId: input.productId,
    title: input.title,
    kind: input.kind,
    summary: input.summary,
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

// ponytail: only touches `content` - `title`/`summary` stay whatever discovery
// wrote, so FE's compendium can go stale after a chat-driven revision. Add a
// title/summary regen (same TITLE_KO/EN + SUMMARY_KO/EN shape as discovery)
// if that's ever visibly wrong in a demo.
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
