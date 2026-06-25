# chaebol-governance Access Patterns

- Table: `chaebol-governance`
- PK: `PK`
- SK: `SK`
- Billing: `PAY_PER_REQUEST`

## Keys

- Group partition: `PK=GROUP#{groupId}`
- Sort key prefixes:
- `NODE#{nodeId}`
- `EDGE#{edgeId}`
- `CYCLE#{cycleId}`
- `SNAPSHOT#{snapshotId}`
- `SCORE#{scoreId}`
- `METHOD#{methodologyVersion}`
- `DISC#{disclosureId}`

## GSIs

### snapshotId-index
- `GSI1PK=SNAPSHOT#{snapshotId}`
- `GSI1SK=ENTITY#{entityType}#{id}`

### groupId-index
- `GSI2PK=GROUP#{groupId}`
- `GSI2SK=TYPE#{itemType}#{sortKey}`

## Access Patterns

1. Group graph: `Query PK=GROUP#{groupId}`
2. Specific node: `GetItem PK=GROUP#{groupId}, SK=NODE#{nodeId}`
3. Group edges: `Query PK=GROUP#{groupId}, begins_with(SK, EDGE#)`
4. Cycles: `Query PK=GROUP#{groupId}, begins_with(SK, CYCLE#)`
5. Scores: `Query PK=GROUP#{groupId}, begins_with(SK, SCORE#)`
6. Snapshots: `Query PK=GROUP#{groupId}, begins_with(SK, SNAPSHOT#)`
7. Methodology: `Query PK=GROUP#GLOBAL, begins_with(SK, METHOD#)`
8. Snapshot entities: `Query GSI1PK=SNAPSHOT#{snapshotId}`

## Rule

- `Scan` 금지. `Query/GetItem/PutItem/UpdateItem` 중심.
