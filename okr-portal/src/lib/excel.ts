import * as XLSX from 'xlsx';
import { query, queryOne } from './db';
import { computeKrProgress, recomputeUp, type MetricType, type Direction, type Indicator, type OkrType, type ObjStatus } from './okr';
import { recomputeInitiativeUp, initIdByCode } from './initiatives';
import { nextInitCode } from './codes';
import { parseNum } from './num';
import { kpiStatus, attainment, STATUS_LABEL } from './kpi-values';
import type { KpiDirection } from './kpis';

// ---- Nhãn cột (tiếng Việt) cho 3 sheet ----
const OBJ_HEAD = ['Mã', 'Kỳ', 'Cấp', 'Khối/Phòng', 'Người chủ trì (email)', 'Tiêu đề', 'Mô tả', 'Loại OKR', 'Trạng thái', 'Tiến độ %', 'Mã OKR cha'];
const KR_HEAD = ['Mã', 'Mã Objective', 'Tiêu đề', 'Loại đo', 'Hướng', 'Đơn vị', 'Bắt đầu', 'Hiện tại', 'Mục tiêu', 'Trọng số', 'Nguồn KPI', 'Chỉ số', 'Tiến độ %'];
const INIT_HEAD = ['Mã', 'Mã Objective', 'Mã cha', 'Loại', 'Tiêu đề', 'Mô tả', 'Người phụ trách (email)', 'Trạng thái', 'Ưu tiên', 'Tiến độ %', 'Bắt đầu', 'Kết thúc', 'NS kế hoạch', 'Thực chi'];

// ============ EXPORT ============
export async function buildOkrWorkbook(periodId: string | null, unitId: string | null): Promise<Buffer> {
  const objWhere: string[] = [];
  const p: unknown[] = [];
  if (periodId) { p.push(periodId); objWhere.push(`o.period_id=$${p.length}`); }
  if (unitId) { p.push(unitId); objWhere.push(`o.unit_id=$${p.length}`); }
  const wsql = objWhere.length ? 'WHERE ' + objWhere.join(' AND ') : '';

  const objs = await query<{ code: string; period: string; level: string; unit: string | null; owner: string | null; title: string; description: string | null; okr_type: string; status: string; progress: number; parent_code: string | null }>(
    `SELECT o.code, pe.name AS period, o.level, un.code AS unit, o.owner_email AS owner,
            o.title, o.description, o.okr_type, o.status, o.progress::float8 AS progress, po.code AS parent_code
       FROM okr_objectives o
       JOIN okr_periods pe ON pe.id=o.period_id
       LEFT JOIN okr_units un ON un.id=o.unit_id
       LEFT JOIN okr_objectives po ON po.id=o.parent_id
       ${wsql}
      ORDER BY o.code`, p);

  const krs = await query<{ code: string; obj: string; title: string; metric_type: string; direction: string; unit_label: string | null; start_value: number; current_value: number; target_value: number; weight: number; kpi_source: string | null; indicator: string; progress: number }>(
    `SELECT k.code, o.code AS obj, k.title, k.metric_type, k.direction, k.unit_label,
            k.start_value::float8 AS start_value, k.current_value::float8 AS current_value,
            k.target_value::float8 AS target_value, k.weight::float8 AS weight, k.kpi_source, k.indicator,
            k.progress::float8 AS progress
       FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id
       ${wsql ? wsql.replace(/o\./g, 'o.') : ''}
      ORDER BY k.code`, p);

  const inits = await query<{ code: string; obj: string | null; parent_code: string | null; kind: string; title: string; description: string | null; owner: string | null; status: string; priority: string; progress: number; start_on: string | null; due_on: string | null; bp: number; ba: number }>(
    `SELECT i.code, o.code AS obj, pi.code AS parent_code, i.kind, i.title, i.description,
            i.owner_email AS owner, i.status, i.priority, i.progress::float8 AS progress,
            i.start_on::text, i.due_on::text, i.budget_planned::float8 AS bp, i.budget_actual::float8 AS ba
       FROM okr_initiatives i JOIN okr_objectives o ON o.id=i.objective_id
       LEFT JOIN okr_initiatives pi ON pi.id=i.parent_id
       ${wsql}
      ORDER BY i.code`, p);

  const wb = XLSX.utils.book_new();
  const objAoa = [OBJ_HEAD, ...objs.map((o) => [o.code, o.period, o.level, o.unit ?? '', o.owner ?? '', o.title, o.description ?? '', o.okr_type, o.status, Math.round(o.progress), o.parent_code ?? ''])];
  const krAoa = [KR_HEAD, ...krs.map((k) => [k.code, k.obj, k.title, k.metric_type, k.direction, k.unit_label ?? '', k.start_value, k.current_value, k.target_value, k.weight, k.kpi_source ?? '', k.indicator, Math.round(k.progress)])];
  const initAoa = [INIT_HEAD, ...inits.map((i) => [i.code, i.obj ?? '', i.parent_code ?? '', i.kind, i.title, i.description ?? '', i.owner ?? '', i.status, i.priority, Math.round(i.progress), i.start_on ?? '', i.due_on ?? '', i.bp, i.ba])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(objAoa), 'Objectives');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(krAoa), 'KeyResults');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(initAoa), 'Initiatives');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ============ EXPORT SCORECARD KPI ============
const SC_HEAD = ['Kỳ', 'Đơn vị', 'Mã KPI', 'KPI', 'Viễn cảnh', 'Tầng', 'Trọng số', 'Hướng', 'Mục tiêu', 'Thực hiện', '% Đạt', 'Trạng thái', 'Ghi chú'];
const BSC_VN: Record<string, string> = { financial: 'Tài chính', customer: 'Khách hàng', process: 'Quy trình nội bộ', learning: 'Học hỏi & Phát triển' };
const TIER_VN: Record<string, string> = { result: 'Kết quả', driver: 'Động cơ', enabler: 'Bộ máy' };

export async function buildScorecardWorkbook(periodId: string | null, unitId: string | null): Promise<Buffer> {
  const where: string[] = ['k.is_active'];
  const p: unknown[] = [];
  if (periodId) { p.push(periodId); where.push(`v.period_id=$${p.length}`); }
  if (unitId) { p.push(unitId); where.push(`v.unit_id=$${p.length}`); }

  const rows = await query<{
    period: string; unit: string | null; code: string | null; name: string;
    bsc: string | null; tier: string | null; weight: number; direction: KpiDirection;
    target: number | null; actual: number | null;
    tw: number | null; ta: number | null; te: number | null; note: string | null;
  }>(
    `SELECT pe.name AS period, u.name AS unit, k.code, k.name,
            k.bsc_perspective AS bsc, k.tier, k.weight::float8 AS weight, k.direction,
            v.target::float8 AS target, v.actual::float8 AS actual,
            k.threshold_watch::float8 AS tw, k.threshold_alert::float8 AS ta, k.threshold_escalate::float8 AS te,
            v.note
       FROM okr_kpi_values v
       JOIN okr_kpis k ON k.id=v.kpi_id
       JOIN okr_periods pe ON pe.id=v.period_id
       LEFT JOIN okr_units u ON u.id=v.unit_id
      WHERE ${where.join(' AND ')}
      ORDER BY pe.name, u.name NULLS FIRST,
               CASE k.tier WHEN 'result' THEN 0 WHEN 'driver' THEN 1 WHEN 'enabler' THEN 2 ELSE 3 END, k.weight DESC, k.name`,
    p,
  );

  const aoa: (string | number)[][] = [SC_HEAD];
  for (const r of rows) {
    const at = attainment(r.direction, r.target, r.actual);
    const st = kpiStatus({ direction: r.direction, threshold_watch: r.tw, threshold_alert: r.ta, threshold_escalate: r.te }, r.actual, r.target);
    aoa.push([
      r.period, r.unit ?? 'Công ty', r.code ?? '', r.name,
      r.bsc ? BSC_VN[r.bsc] ?? r.bsc : '', r.tier ? TIER_VN[r.tier] ?? r.tier : '',
      r.weight, r.direction === 'down' ? 'Thấp tốt' : 'Cao tốt',
      r.target ?? '', r.actual ?? '',
      at == null ? '' : Math.round(at * 100), st ? STATUS_LABEL[st] : '', r.note ?? '',
    ]);
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Scorecard');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ============ IMPORT ============
export type ImportResult = { objUpdated: number; krUpdated: number; initUpdated: number; initCreated: number; skipped: number; errors: string[] };

function s(v: unknown): string { return v == null ? '' : String(v).trim(); }
function n(v: unknown): number { return parseNum(v, 0); }
function normDate(v: unknown): string | null {
  const t = s(v);
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dm = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  const num = Number(t); // Excel serial date
  if (Number.isFinite(num) && num > 30000 && num < 60000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return null;
}
function rowsOf(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

export async function importOkrWorkbook(buf: Buffer): Promise<ImportResult> {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const res: ImportResult = { objUpdated: 0, krUpdated: 0, initUpdated: 0, initCreated: 0, skipped: 0, errors: [] };
  const touchedObjs = new Set<string>(); // objective ids cần recompute

  // 1) Objectives — cập nhật theo Mã (tiêu đề, mô tả, loại, trạng thái)
  for (const r of rowsOf(wb, 'Objectives')) {
    const code = s(r['Mã']);
    if (!code) { res.skipped++; continue; }
    const o = await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [code]);
    if (!o) { res.skipped++; continue; }
    await query(
      `UPDATE okr_objectives SET title=COALESCE(NULLIF($2,''),title), description=$3,
          okr_type=COALESCE(NULLIF($4,''),okr_type), status=COALESCE(NULLIF($5,''),status), updated_at=now()
        WHERE id=$1`,
      [o.id, s(r['Tiêu đề']), s(r['Mô tả']) || null, s(r['Loại OKR']) as OkrType, s(r['Trạng thái']) as ObjStatus],
    );
    res.objUpdated++;
  }

  // 2) KeyResults — cập nhật giá trị & tính lại progress
  for (const r of rowsOf(wb, 'KeyResults')) {
    const code = s(r['Mã']);
    if (!code) { res.skipped++; continue; }
    const k = await queryOne<{ id: string; objective_id: string; metric_type: MetricType; direction: Direction }>(
      'SELECT id, objective_id, metric_type, direction FROM okr_key_results WHERE code=$1', [code]);
    if (!k) { res.skipped++; continue; }
    const start = n(r['Bắt đầu']); const cur = n(r['Hiện tại']); const tgt = n(r['Mục tiêu']);
    const prog = computeKrProgress({ metric_type: k.metric_type, direction: k.direction, start_value: start, target_value: tgt, current_value: cur });
    await query(
      `UPDATE okr_key_results SET title=COALESCE(NULLIF($2,''),title), unit_label=$3,
          start_value=$4, current_value=$5, target_value=$6, weight=$7,
          indicator=COALESCE(NULLIF($8,''),indicator), progress=$9, updated_at=now() WHERE id=$1`,
      [k.id, s(r['Tiêu đề']), s(r['Đơn vị']) || null, start, cur, tgt, n(r['Trọng số']) || 1, s(r['Chỉ số']) as Indicator, prog],
    );
    res.krUpdated++;
    touchedObjs.add(k.objective_id);
  }

  // 3) Initiatives — cập nhật theo Mã; nếu Mã trống + có Mã Objective → tạo mới
  for (const r of rowsOf(wb, 'Initiatives')) {
    const code = s(r['Mã']);
    const status = (s(r['Trạng thái']) || 'todo');
    const prog = status === 'done' ? 100 : Math.max(0, Math.min(100, n(r['Tiến độ %'])));
    if (code) {
      const i = await queryOne<{ id: string }>('SELECT id FROM okr_initiatives WHERE code=$1', [code]);
      if (!i) { res.skipped++; continue; }
      await query(
        `UPDATE okr_initiatives SET title=COALESCE(NULLIF($2,''),title), description=$3, owner_email=NULLIF($4,''),
            status=COALESCE(NULLIF($5,''),status), priority=COALESCE(NULLIF($6,''),priority), progress=$7,
            start_on=$8, due_on=$9, budget_planned=$10, budget_actual=$11,
            done_on=CASE WHEN $5='done' AND done_on IS NULL THEN now()::date WHEN $5<>'done' THEN NULL ELSE done_on END,
            updated_at=now() WHERE id=$1`,
        [i.id, s(r['Tiêu đề']), s(r['Mô tả']) || null, s(r['Người phụ trách (email)']), status, s(r['Ưu tiên']) || 'medium',
         prog, normDate(r['Bắt đầu']), normDate(r['Kết thúc']), n(r['NS kế hoạch']), n(r['Thực chi'])],
      );
      res.initUpdated++;
      await recomputeInitiativeUp(i.id);
    } else {
      const objCode = s(r['Mã Objective']);
      const title = s(r['Tiêu đề']);
      if (!objCode || !title) { res.skipped++; continue; }
      const o = await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [objCode]);
      if (!o) { res.errors.push(`Không tìm thấy Objective "${objCode}" cho công việc mới "${title}"`); res.skipped++; continue; }
      const parent = await initIdByCode(o.id, s(r['Mã cha']));
      const newCode = await nextInitCode(o.id);
      await query(
        `INSERT INTO okr_initiatives(objective_id,parent_id,kind,title,description,owner_email,status,priority,progress,start_on,due_on,budget_planned,budget_actual,created_by,code)
         VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10,$11,$12,$13,'import',$14)`,
        [o.id, parent, s(r['Loại']) || 'action', title, s(r['Mô tả']) || null, s(r['Người phụ trách (email)']),
         status, s(r['Ưu tiên']) || 'medium', prog, normDate(r['Bắt đầu']), normDate(r['Kết thúc']), n(r['NS kế hoạch']), n(r['Thực chi']), newCode],
      );
      res.initCreated++;
      if (parent) await recomputeInitiativeUp(parent);
    }
  }

  for (const id of touchedObjs) await recomputeUp(id);
  return res;
}
