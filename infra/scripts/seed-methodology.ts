import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const tableName = process.env.TABLE_NAME ?? "chaebol-governance";
const region = process.env.AWS_REGION ?? "ap-northeast-2";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const item = {
  PK: "GROUP#GLOBAL",
  SK: "METHOD#governance-score-v1.0-draft",
  GSI1PK: "SNAPSHOT#GLOBAL",
  GSI1SK: "ENTITY#method#governance-score-v1.0-draft",
  GSI2PK: "GROUP#GLOBAL",
  GSI2SK: "TYPE#method#governance-score-v1.0-draft",
  itemType: "method",
  groupId: "GLOBAL",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  payload: {
    methodologyVersion: "governance-score-v1.0-draft",
    cfrMethod: "brioschi_integrated_ownership_matrix",
    vrMethod: "weakest_link_sum_with_legal_caps",
    scoreMethod: "deduction_rules_plus_zscore",
    draft: true,
    disclaimers: ["not investment advice", "not legal advice", "not regulatory rating"],
  },
};

async function run() {
  await doc.send(new PutCommand({ TableName: tableName, Item: item }));
  console.log("seeded methodology", { tableName, region });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
