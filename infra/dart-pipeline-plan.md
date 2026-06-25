# FTC Baseline Plan (Phase F)

## Phase F Goal Redefinition

Phase F goal is changed from real-time KFTC/DART pipeline to:

- Build and visualize an **official FTC 2025 disclosure snapshot baseline**.
- Do not force computed CFR graph generation from low-confidence heuristic edges.
- Keep strict validation gates (`COLUMN_SUM_EXCEEDS_ONE`) unchanged.

## Baseline Metadata

- `sourceAuthority`: `FTC/KFTC`
- `sourceTitle`: `2025년 공시대상기업집단 주식소유현황 분석·공개`
- `asOfDate`: `2025-05-01`
- `publishedAt`: `2025-09-10`
- `snapshotId`: `ftc-2025-samsung-stock-ownership`
- `sourceType`: `FTC_DISCLOSURE_FILE`

## Data Priority

1. FTC/KFTC 2025 disclosure files (baseline source of truth)
2. FTC-origin public APIs that reproduce the same disclosure set
3. DART/FSS APIs for later verification and updates only

## Phase F UI/Delivery Strategy

### Official FTC Map (primary in Phase F)

- Render extracted Samsung ownership map pages from FTC attachment 3:
  - `infra/generated/ftc-2025-samsung-ownership-map.pdf`
  - `infra/generated/ftc-2025-samsung-ownership-map-page3-03.png`
  - `infra/generated/ftc-2025-samsung-ownership-map-page4-04.png`
  - `infra/generated/ftc-2025-samsung-ownership-map-page38-38.png`
- UI labels:
  - `공정위 2025 발표자료 기준`
  - `기준일 2025-05-01`
  - `공개일 2025-09-10`
  - `계산용 구조화 데이터는 검증 중`

### Computed Graph (secondary in Phase F)

- G6 graph remains as computed mode.
- May be unavailable or fallback if structured EDGE validation fails.
- No bypass of CFR validation is allowed.

## Manual CSV Policy

File retained:

- `infra/source/ftc/2025-stock-ownership/manual/samsung-edges-review.csv`

Policy:

- Manual CSV is **not** the default path in Phase F.
- Primary path is official FTC map visualization.
- Structured EDGE generation should prefer FTC structured source/API acquisition.
- Manual mapping is last resort and requires explicit dual-review.

## DART Position

- Move DART to **Phase G/H**.
- DART usage:
  - corp_code mapping
  - rcept_no/source grounding
  - verification/correction/update workflows
- DART is not used for initial Phase F baseline construction.

## Phase F Artifacts

- `infra/generated/ftc-2025-attachment-inventory.json`
- `infra/generated/ftc-2025-appendix2-samsung-rows.json`
- `infra/generated/ftc-2025-appendix3-samsung-pdf-inspection.json`
- `infra/generated/ftc-2025-samsung-candidates.json`
- `infra/generated/ftc-2025-samsung-edges-dryrun.json`
- `infra/generated/ftc-2025-samsung-ownership-map-pages.json`

## Validation Enforcement

- If EDGE candidate quality is low or schema is ambiguous -> write blocked.
- If target column sum > 1.0 -> write blocked.
- Keep governance-engine CFR checks intact.

