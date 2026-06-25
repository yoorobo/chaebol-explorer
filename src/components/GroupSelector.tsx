import type { ApiGroup } from "../api/groupsApi";

interface Props {
  groups: ApiGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

const GROUP_COLOR_MAP: Record<string, string> = {
  samsung:   "#1428a0",
  hyundai:   "#002c5f",
  lg:        "#a50034",
  sk:        "#e4003b",
  lotte:     "#e3002c",
  posco:     "#003087",
  hanwha:    "#e6541e",
  gs:        "#005bac",
  hhi:       "#003087",
  shinsegae: "#333333",
  cj:        "#d4001a",
  kakao:     "#fee500",
  naver:     "#03c75a",
  doosan:    "#004b87",
  kt:        "#e6002d",
};

function getGroupColor(id: string): string {
  return GROUP_COLOR_MAP[id] ?? "#4a5568";
}

function getInitials(name: string): string {
  // 영문이면 2글자, 한글이면 첫 글자
  if (/^[A-Za-z]/.test(name)) return name.slice(0, 2).toUpperCase();
  return name.replace(/그룹|홀딩스/g, "").slice(0, 1);
}

export default function GroupSelector({
  groups,
  selectedId,
  onSelect,
  loading,
}: Props) {
  const mockGroups = groups.filter((g) => g.data_source === "mock");
  const liveGroups = groups.filter((g) => g.data_source !== "mock");

  return (
    <div className="group-selector">
      <div className="group-selector-header">
        <div className="group-selector-label">기업집단 선택</div>
        <div className="group-count-badge">{groups.length}개</div>
      </div>

      {loading && (
        <div className="group-loading">
          <div className="ai-spinner" />
          <span>그룹 목록 로딩 중...</span>
        </div>
      )}

      {/* Mock 데이터 그룹 */}
      {mockGroups.length > 0 && (
        <div className="group-section">
          <div className="group-section-label">
            <span className="badge-dot mock" /> 모의 데이터
          </div>
          <div className="group-list scrollable">
            {mockGroups.map((g) => (
              <GroupButton
                key={g.id}
                group={g}
                selected={selectedId === g.id}
                onSelect={onSelect}
                color={getGroupColor(g.id)}
                initials={getInitials(g.name_ko)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 실데이터 그룹 (KFTC/DART 연동 후 표시) */}
      {liveGroups.length > 0 && (
        <div className="group-section">
          <div className="group-section-label">
            <span className="badge-dot live" /> DART/KFTC 실데이터
          </div>
          <div className="group-list scrollable">
            {liveGroups.map((g) => (
              <GroupButton
                key={g.id}
                group={g}
                selected={selectedId === g.id}
                onSelect={onSelect}
                color={getGroupColor(g.id)}
                initials={getInitials(g.name_ko)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="group-api-hint">
        <span>📡</span>
        <span>
          API 키 설정 후 <code>npm run sync:kftc</code> 실행 시<br />
          전체 대기업집단이 자동으로 표시됩니다
        </span>
      </div>
    </div>
  );
}

function GroupButton({
  group,
  selected,
  onSelect,
  color,
  initials,
}: {
  group: ApiGroup;
  selected: boolean;
  onSelect: (id: string) => void;
  color: string;
  initials: string;
}) {
  return (
    <button
      className={`group-btn ${selected ? "active" : ""}`}
      style={selected ? { borderColor: color } : {}}
      onClick={() => onSelect(group.id)}
      title={group.name_ko}
    >
      <span
        className="group-icon"
        style={{ background: color }}
      >
        {initials}
      </span>
      <span className="group-info">
        <span className="group-name">{group.name_ko}</span>
        {group.owner_name && (
          <span className="group-owner">{group.owner_name} · {group.data_year}</span>
        )}
      </span>
      {group.data_source !== "mock" && (
        <span className="live-dot" title="실데이터" />
      )}
    </button>
  );
}
