import { listObjectivesByPeriod, type ObjectiveRow } from './okr';
import { listUnits, type Unit } from './org';

// ── Báo cáo OKR theo CẤP (Công ty / Khối / Phòng / Cá nhân) với KẾT QUẢ TỔNG THEO TRỌNG SỐ ──
// Mỗi nhóm: tổng = bình quân CÓ TRỌNG SỐ tiến độ các OKR trong nhóm = Σ(progress·weight) / Σ(weight).
// (weight mặc định 1 → giống bình quân thường). Kèm danh sách OKR để trace-back tới /objectives/[id].

export type ReportItem = { id: string; code: string | null; title: string; progress: number; weight: number };
export type ReportGroup = {
  key: string;
  name: string;
  code: string | null;
  count: number;
  weighted: number; // % tổng có trọng số
  items: ReportItem[];
};
export type OkrLevelReport = {
  companyTotal: number; // kết quả tổng công ty (bình quân có trọng số các OKR cấp Công ty; nếu chưa có thì theo Khối)
  company: ReportGroup | null;
  divisions: ReportGroup[];
  departments: ReportGroup[];
  individuals: ReportGroup[];
};

/** Bình quân CÓ TRỌNG SỐ (weight>0). Nếu tổng trọng số = 0 → bình quân thường. */
function weightedAvg(items: ReportItem[]): number {
  if (items.length === 0) return 0;
  let sw = 0;
  let acc = 0;
  for (const it of items) {
    const w = it.weight > 0 ? it.weight : 0;
    sw += w;
    acc += it.progress * w;
  }
  const v = sw > 0 ? acc / sw : items.reduce((a, it) => a + it.progress, 0) / items.length;
  return Math.round(v * 10) / 10;
}

function toItem(o: ObjectiveRow): ReportItem {
  return { id: o.id, code: o.code, title: o.title, progress: o.progress, weight: o.weight ?? 1 };
}

function groupByUnit(rows: ObjectiveRow[], units: Unit[]): ReportGroup[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const map = new Map<string, ObjectiveRow[]>();
  for (const o of rows) {
    if (!o.unit_id) continue; // OKR cấp khối/phòng thiếu đơn vị → không dựng nhóm ảo (cảnh báo ở /integrity)
    const arr = map.get(o.unit_id) ?? [];
    arr.push(o);
    map.set(o.unit_id, arr);
  }
  return [...map.entries()]
    .map(([unitId, list]) => {
      const u = byId.get(unitId);
      const items = list.map(toItem);
      return {
        key: unitId,
        name: u?.name ?? list[0].unit_name ?? '(đơn vị)',
        code: u?.code ?? list[0].unit_code ?? null,
        count: items.length,
        weighted: weightedAvg(items),
        items,
      };
    })
    .sort((a, b) => b.weighted - a.weighted || a.name.localeCompare(b.name));
}

export async function okrLevelReport(periodId: string): Promise<OkrLevelReport> {
  const [objs, units] = await Promise.all([listObjectivesByPeriod(periodId), listUnits()]);
  const company = objs.filter((o) => o.level === 'company');
  const divisions = objs.filter((o) => o.level === 'division');
  const departments = objs.filter((o) => o.level === 'department');
  const individuals = objs.filter((o) => o.level === 'individual');

  const companyItems = company.map(toItem);
  const companyGroup: ReportGroup | null = companyItems.length
    ? { key: 'company', name: 'Công ty', code: null, count: companyItems.length, weighted: weightedAvg(companyItems), items: companyItems }
    : null;

  // Tổng công ty: ưu tiên OKR cấp Công ty; nếu chưa đặt thì lấy bình quân có trọng số các OKR cấp Khối.
  const companyTotal = companyItems.length
    ? weightedAvg(companyItems)
    : weightedAvg(divisions.map(toItem));

  // Cá nhân gom theo owner_email.
  const indByOwner = new Map<string, ObjectiveRow[]>();
  for (const o of individuals) {
    const k = (o.owner_email ?? '(chưa gán)').toLowerCase();
    const arr = indByOwner.get(k) ?? [];
    arr.push(o);
    indByOwner.set(k, arr);
  }
  const individualGroups: ReportGroup[] = [...indByOwner.entries()]
    .map(([owner, list]) => {
      const items = list.map(toItem);
      return {
        key: owner,
        name: list[0].owner_name ?? list[0].owner_email ?? '(chưa gán)',
        code: null,
        count: items.length,
        weighted: weightedAvg(items),
        items,
      };
    })
    .sort((a, b) => b.weighted - a.weighted || a.name.localeCompare(b.name));

  return {
    companyTotal,
    company: companyGroup,
    divisions: groupByUnit(divisions, units),
    departments: groupByUnit(departments, units),
    individuals: individualGroups,
  };
}
