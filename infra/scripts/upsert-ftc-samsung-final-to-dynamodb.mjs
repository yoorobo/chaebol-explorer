import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const tableName = process.env.TABLE_NAME ?? 'chaebol-governance';
const region = process.env.AWS_REGION ?? 'ap-northeast-2';

const here = path.dirname(fileURLToPath(import.meta.url));
const dryPath = path.resolve(here, '../generated/ftc-2025-samsung-final-dryrun.json');

if (!fs.existsSync(dryPath)) {
  console.error(`Missing dry-run file: ${dryPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(dryPath, 'utf8'));
const v = payload.validation ?? {};
if (!v.writeAllowed) {
  console.error('Validation not passed. Write blocked.');
  console.error(JSON.stringify(v, null, 2));
  process.exit(1);
}

const items = [payload.items.snapshot, ...payload.items.nodes, ...payload.items.edges];

if (!write) {
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        tableName,
        region,
        snapshotId: payload.snapshotId,
        itemCount: items.length,
        nodeCount: payload.items.nodes.length,
        edgeCount: payload.items.edges.length,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

for (let i = 0; i < items.length; i += 25) {
  const chunk = items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
  let req = { [tableName]: chunk };
  let retry = 0;
  while (Object.keys(req).length > 0) {
    const out = await doc.send(new BatchWriteCommand({ RequestItems: req }));
    const unprocessed = out.UnprocessedItems?.[tableName] ?? [];
    if (unprocessed.length === 0) break;
    retry += 1;
    if (retry > 6) throw new Error(`Unprocessed items remain: ${unprocessed.length}`);
    await new Promise((r) => setTimeout(r, 150 * retry));
    req = { [tableName]: unprocessed };
  }
}

console.log(
  JSON.stringify(
    {
      mode: 'write',
      tableName,
      region,
      snapshotId: payload.snapshotId,
      itemCount: items.length,
      nodeCount: payload.items.nodes.length,
      edgeCount: payload.items.edges.length,
      writeResult: 'OK',
    },
    null,
    2
  )
);
