import samsungData from "./samsung.json";
import hyundaiData from "./hyundai.json";
import lgData from "./lg.json";
import skData from "./sk.json";
import lotteData from "./lotte.json";
import hanwhaData from "./hanwha.json";
import poscoData from "./posco.json";
import gsData from "./gs.json";
import hdHyundaiData from "./hd_hyundai.json";
import shinsegaeData from "./shinsegae.json";
import cjData from "./cj.json";
import hanjinData from "./hanjin.json";
import kakaoData from "./kakao.json";
import doosanData from "./doosan.json";
import lsData from "./ls.json";
import hyosungData from "./hyosung.json";
import kolonData from "./kolon.json";
import naverData from "./naver.json";
import ktData from "./kt.json";
import type { ShareNode, ShareEdge } from "../../utils/types";

export interface GroupMeta {
  id: string;
  name: string;
  owner: string;
  year: number;
  description: string;
}

export interface GroupData {
  group: GroupMeta;
  nodes: ShareNode[];
  edges: ShareEdge[];
}

export const GROUPS: Record<string, GroupData> = {
  samsung:    samsungData as GroupData,
  hyundai:    hyundaiData as GroupData,
  lg:         lgData as GroupData,
  sk:         skData as GroupData,
  lotte:      lotteData as GroupData,
  hanwha:     hanwhaData as GroupData,
  posco:      poscoData as GroupData,
  gs:         gsData as GroupData,
  hd_hyundai: hdHyundaiData as GroupData,
  shinsegae:  shinsegaeData as GroupData,
  cj:         cjData as GroupData,
  hanjin:     hanjinData as GroupData,
  kakao:      kakaoData as GroupData,
  doosan:     doosanData as GroupData,
  ls:         lsData as GroupData,
  hyosung:    hyosungData as GroupData,
  kolon:      kolonData as GroupData,
  naver:      naverData as GroupData,
  kt:         ktData as GroupData,
};

export const GROUP_LIST: GroupMeta[] = Object.values(GROUPS).map((g) => g.group);

export function getGroup(id: string): GroupData | null {
  return GROUPS[id] ?? null;
}
