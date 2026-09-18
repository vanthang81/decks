import { listObjectivesByPeriod, type ObjectiveRow } from './okr';
import { listUnits, type Unit } from './org';
import { naturalCodeCompare } from './sortcode';
import { query } from './db';

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
  // Khối cha (chỉ set cho nhóm cấp PHÒNG) → hiện "thuộc khối nào" + lọc theo khối (CFO 18/09).
  parentKey?: string | null;
  parentName?: string | null;
  parentCode?: string | null;
};
export type OkrLevelReport = {
  companyTotal: number; // kết quả tổng công ty (bình quân có trọng số các OKR cấp Công ty; nếu chưa có thì theo Khối)
  company: ReportGroup | null;
  divisions: ReportGroup[];
  departments: ReportGroup[];
  individuals: ReportGroup[];
  projects: ReportGroup[]; // LĂNG KÍNH Dự án: gom OKR theo dự án gắn (okr_project_objectives) — 1 OKR có thể ở nhiều dự án
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
      // Khối cha = đơn vị cha nếu cha là 'division' (áp cho nhóm cấp Phòng); Khối thì cha là Công ty → bỏ.
      const parent = u?.parent_id ? byId.get(u.parent_id) : undefined;
      const khoi = parent && parent.type === 'division' ? parent : undefined;
      const items = list.map(toItem).sort((a, b) => naturalCodeCompare(a.code, b.code)); // OKR theo mã 1→n
      return {
        key: unitId,
        name: u?.name ?? list[0].unit_name ?? '(đơn vị)',
        code: u?.code ?? list[0].unit_code ?? null,
        count: items.length,
        weighted: weightedAvg(items),
        items,
        parentKey: khoi?.id ?? null,
        parentName: khoi?.name ?? null,
        parentCode: khoi?.code ?? null,
      };
    })
    .sort((a, b) => b.weighted - a.weighted || a.name.localeCompare(b.name));
}

// canView: bộ lọc phạm vi xem (CFO 15/09) — chỉ tính OKR người xem được phép thấy. Bỏ trống = toàn bộ.
export async function okrLevelReport(
  periodId: string,
  canView?: (o: Pick<ObjectiveRow, 'unit_id' | 'owner_email' | 'level'>) => boolean,
): Promise<OkrLevelReport> {
  const [allObjs, units] = await Promise.all([listObjectivesByPeriod(periodId), listUnits()]);
  const objs = canView ? allObjs.filter(canView) : allObjs;
  const company = objs.filter((o) => o.level === 'company');
  const divisions = objs.filter((o) => o.level === 'division');
  const departments = objs.filter((o) => o.level === 'department');
  const individuals = objs.filter((o) => o.level === 'individual');

  const companyItems = company.map(toItem).sort((a, b) => naturalCodeCompare(a.code, b.code));
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
      const items = list.map(toItem).sort((a, b) => naturalCodeCompare(a.code, b.code));
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

  // ── LĂNG KÍNH "Theo Dự án": gom MỌI OKR gắn dự án qua okr_project_objectives — XUYÊN KỲ ──
  // Dự án là thực thể XUYÊN nhiều kỳ (OKR gắn có thể ở tháng/quý/năm KHÁC kỳ đang xem). Nếu chỉ lấy OKR
  // đúng kỳ đang xem → dự án có OKR ở kỳ khác sẽ BIẾN MẤT (đúng ca CFO 18/09: dự án Trân Bảo, OKR ở T8
  // không hiện khi xem T9). → Lấy TẤT CẢ OKR gắn dự án (mọi kỳ), vẫn tôn trọng bộ lọc phạm vi xem.
  type PLink = {
    project_id: string; pcode: string | null; pname: string;
    id: string; code: string | null; title: string; progress: number; weight: number;
    level: string; unit_id: string | null; owner_email: string | null;
  };
  const links = await query<PLink>(
    `SELECT po.project_id, pr.code AS pcode, pr.name AS pname,
            o.id, o.code, o.title, o.progress::float8 AS progress, COALESCE(o.weight, 1)::float8 AS weight,
            o.level, o.unit_id, o.owner_email
       FROM okr_project_objectives po
       JOIN okr_projects pr ON pr.id = po.project_id
       JOIN okr_objectives o ON o.id = po.objective_id
      WHERE pr.status <> 'archived'`,
  ).catch(() => [] as PLink[]);
  const byProj = new Map<string, { code: string | null; name: string; items: ReportItem[] }>();
  for (const l of links) {
    if (canView && !canView({ unit_id: l.unit_id, owner_email: l.owner_email, level: l.level as ObjectiveRow['level'] })) continue;
    const g = byProj.get(l.project_id) ?? { code: l.pcode, name: l.pname, items: [] };
    g.items.push({ id: l.id, code: l.code, title: l.title, progress: l.progress, weight: l.weight ?? 1 });
    byProj.set(l.project_id, g);
  }
  const projectGroups: ReportGroup[] = [...byProj.entries()]
    .map(([pid, g]) => ({
      key: pid,
      name: g.name,
      code: g.code,
      count: g.items.length,
      weighted: weightedAvg(g.items.slice().sort((a, b) => naturalCodeCompare(a.code, b.code))),
      items: g.items.slice().sort((a, b) => naturalCodeCompare(a.code, b.code)),
    }))
    .sort((a, b) => b.weighted - a.weighted || a.name.localeCompare(b.name));

  return {
    companyTotal,
    company: companyGroup,
    divisions: groupByUnit(divisions, units),
    departments: groupByUnit(departments, units),
    individuals: individualGroups,
    projects: projectGroups,
  };
}
