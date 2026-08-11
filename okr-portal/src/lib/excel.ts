import * as XLSX from 'xlsx';
import { query, queryOne } from './db';
import { computeKrProgress, recomputeUp, createObjective, createKeyResult, type MetricType, type Direction, type Indicator, type OkrType, type ObjStatus, type Level, type BscPerspective } from './okr';
import { recomputeInitiativeUp, initIdByCode, type Priority, type InitKind, type InitStatus } from './initiatives';
import { nextInitCode } from './codes';
import { parseNum } from './num';
import { kpiStatus, attainment, STATUS_LABEL } from './kpi-values';
import type { KpiDirection } from './kpis';

// ---- Tên 3 sheet dữ liệu (Tiếng Việt, đồng nhất với Portal). Import chấp nhận cả tên cũ tiếng Anh. ----
const SHEET_OBJ = 'Mục tiêu';
const SHEET_KR = 'Thước đo';
const SHEET_INIT = 'Công việc';
const SHEET_OBJ_ALIASES = [SHEET_OBJ, 'Objectives'];
const SHEET_KR_ALIASES = [SHEET_KR, 'KeyResults'];
const SHEET_INIT_ALIASES = [SHEET_INIT, 'Initiatives'];

// ---- Nhãn cột (tiếng Việt) cho 3 sheet ----
const OBJ_HEAD = ['Mã', 'Kỳ', 'Cấp', 'Khối/Phòng', 'Người chủ trì (email)', 'Tiêu đề', 'Mô tả', 'Loại OKR', 'Trạng thái', 'Tiến độ %', 'Mã OKR cha', 'Viễn cảnh'];
const KR_HEAD = ['Mã', 'Mã Mục tiêu', 'Tiêu đề', 'Loại đo', 'Hướng', 'Đơn vị', 'Bắt đầu', 'Hiện tại', 'Mục tiêu', 'Trọng số', 'Nguồn KPI', 'Chỉ số', 'Tiến độ %'];
const INIT_HEAD = ['Mã', 'Mã Mục tiêu', 'Mã cha', 'Loại', 'Tiêu đề', 'Mô tả', 'Người phụ trách (email)', 'Trạng thái', 'Ưu tiên', 'Tiến độ %', 'Bắt đầu', 'Kết thúc', 'NS kế hoạch', 'Thực chi'];

// ============ MAP 2 CHIỀU nhãn Tiếng Việt ↔ mã (enum) — nguồn duy nhất cho xuất & nhập ============
// Xuất Excel ghi NHÃN Tiếng Việt (đúng như hiển thị trên Portal). Nhập chấp nhận CẢ nhãn Tiếng Việt
// LẪN mã tiếng Anh cũ (không phân biệt hoa/thường/dấu) → export→import round-trip luôn khớp.
function s(v: unknown): string { return v == null ? '' : String(v).trim(); }
// Đọc ô theo NHIỀU tên cột chấp nhận được (nhãn mới Tiếng Việt HOẶC nhãn cũ) — lấy giá trị đầu tiên có.
function col(r: Record<string, unknown>, ...names: string[]): string {
  for (const nm of names) { const v = s(r[nm]); if (v) return v; }
  return '';
}
// Chuẩn hoá để so khớp: lowercase, bỏ dấu tiếng Việt, gộp khoảng trắng.
function norm(v: unknown): string {
  return s(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, ' ').trim();
}
type EnumCodec<T extends string> = { label: (code: string) => string; parse: (v: unknown) => T; parseOpt: (v: unknown) => T | null };
function makeEnum<T extends string>(labels: Record<T, string>, def: T, aliases: Record<string, T> = {}): EnumCodec<T> {
  const rev = new Map<string, T>();
  for (const code of Object.keys(labels) as T[]) {
    rev.set(norm(code), code);          // mã tiếng Anh
    rev.set(norm(labels[code]), code);  // nhãn Tiếng Việt
  }
  for (const [k, v] of Object.entries(aliases)) rev.set(norm(k), v as T);
  return {
    label: (code) => (labels as Record<string, string>)[code] ?? code,
    parse: (v) => rev.get(norm(v)) ?? def,
    parseOpt: (v) => (s(v) ? rev.get(norm(v)) ?? null : null),
  };
}

const E_LEVEL = makeEnum<Level>({ company: 'Công ty', division: 'Khối', department: 'Phòng', individual: 'Cá nhân' }, 'department', { 'phòng ban': 'department' });
const E_OKR_TYPE = makeEnum<OkrType>({ committed: 'Cam kết', aspirational: 'Khát vọng', learning: 'Học hỏi' }, 'committed');
const E_OBJ_STATUS = makeEnum<ObjStatus>({ draft: 'Nháp', active: 'Đang chạy', done: 'Hoàn thành', archived: 'Lưu trữ' }, 'active');
const E_METRIC = makeEnum<MetricType>({ number: 'Số', percent: 'Phần trăm', currency: 'Tiền (VND)', boolean: 'Có/Không' }, 'number', { '%': 'percent', 'tiền': 'currency', 'tiền tệ': 'currency', vnd: 'currency' });
const E_DIR = makeEnum<Direction>({ increase: 'Tăng', decrease: 'Giảm' }, 'increase', { up: 'increase', down: 'decrease' });
const E_IND = makeEnum<Indicator>({ leading: 'Dẫn dắt', lagging: 'Kết quả' }, 'lagging');
const E_KIND = makeEnum<InitKind>({ project: 'Dự án', subproject: 'Tiểu dự án', action: 'Công việc' }, 'action');
const E_INIT_STATUS = makeEnum<InitStatus>({ todo: 'Chưa làm', in_progress: 'Đang làm', blocked: 'Vướng', done: 'Xong', canceled: 'Huỷ' }, 'todo');
const E_PRIORITY = makeEnum<Priority>({ low: 'Thấp', medium: 'Trung bình', high: 'Cao' }, 'medium');
const E_BSC = makeEnum<BscPerspective>({ financial: 'Tài chính', customer: 'Khách hàng', process: 'Quy trình nội bộ', learning: 'Học hỏi & Phát triển' }, 'financial', { 'học hỏi': 'learning', 'phát triển': 'learning' });

// ============ EXPORT ============
export async function buildOkrWorkbook(
  periodIds: string[],
  unitIds: string[],
  // Phạm vi xem theo đơn vị (nhân viên): CHỈ xuất OKR cấp Công ty + trong phạm vi đơn vị mình +
  // OKR mình chủ trì — khớp đúng canViewObjectiveUnit ở giao diện. null = xuất tất cả (điều hành/quản lý).
  scope: { unitIds: string[]; email: string } | null = null,
): Promise<Buffer> {
  const objWhere: string[] = [];
  const p: unknown[] = [];
  // Lọc NHIỀU kỳ + NHIỀU đơn vị (rỗng = tất cả). Ép ::text để so mảng text đồng nhất.
  if (periodIds.length) { p.push(periodIds); objWhere.push(`o.period_id::text = ANY($${p.length}::text[])`); }
  if (unitIds.length) { p.push(unitIds); objWhere.push(`o.unit_id::text = ANY($${p.length}::text[])`); }
  if (scope) {
    p.push(scope.unitIds); const ui = p.length;
    p.push(scope.email); const em = p.length;
    objWhere.push(`(o.level='company' OR o.unit_id::text = ANY($${ui}::text[]) OR lower(o.owner_email)=lower($${em}))`);
  }
  const wsql = objWhere.length ? 'WHERE ' + objWhere.join(' AND ') : '';

  const objs = await query<{ code: string; period: string; level: string; unit: string | null; owner: string | null; title: string; description: string | null; okr_type: string; status: string; progress: number; parent_code: string | null; bsc: string | null }>(
    `SELECT o.code, pe.name AS period, o.level, un.code AS unit, o.owner_email AS owner,
            o.title, o.description, o.okr_type, o.status, o.progress::float8 AS progress, po.code AS parent_code,
            o.bsc_perspective AS bsc
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
       ${wsql}
      ORDER BY k.code`, p);

  const inits = await query<{ code: string; obj: string | null; parent_code: string | null; kind: string; title: string; description: string | null; owner: string | null; status: string; priority: string; progress: number; start_on: string | null; due_on: string | null; bp: number; ba: number }>(
    `SELECT i.code, o.code AS obj, pi.code AS parent_code, i.kind, i.title, i.description,
            i.owner_email AS owner, i.status, i.priority, i.progress::float8 AS progress,
            i.start_on::text, i.due_on::text, i.budget_planned::float8 AS bp, i.budget_actual::float8 AS ba
       FROM okr_initiatives i
       LEFT JOIN okr_key_results kr ON kr.id=i.key_result_id
       JOIN okr_objectives o ON o.id = COALESCE(i.objective_id, kr.objective_id)
       LEFT JOIN okr_initiatives pi ON pi.id=i.parent_id
       ${wsql}
      ORDER BY i.code`, p);

  const wb = XLSX.utils.book_new();
  const objAoa = [OBJ_HEAD, ...objs.map((o) => [o.code, o.period, E_LEVEL.label(o.level), o.unit ?? '', o.owner ?? '', o.title, o.description ?? '', E_OKR_TYPE.label(o.okr_type), E_OBJ_STATUS.label(o.status), Math.round(o.progress), o.parent_code ?? '', o.bsc ? E_BSC.label(o.bsc) : ''])];
  const krAoa = [KR_HEAD, ...krs.map((k) => [k.code, k.obj, k.title, E_METRIC.label(k.metric_type), E_DIR.label(k.direction), k.unit_label ?? '', k.start_value, k.current_value, k.target_value, k.weight, k.kpi_source ?? '', E_IND.label(k.indicator), Math.round(k.progress)])];
  const initAoa = [INIT_HEAD, ...inits.map((i) => [i.code, i.obj ?? '', i.parent_code ?? '', E_KIND.label(i.kind), i.title, i.description ?? '', i.owner ?? '', E_INIT_STATUS.label(i.status), E_PRIORITY.label(i.priority), Math.round(i.progress), i.start_on ?? '', i.due_on ?? '', i.bp, i.ba])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(objAoa), SHEET_OBJ);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(krAoa), SHEET_KR);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(initAoa), SHEET_INIT);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ============ FORM MẪU (TEMPLATE) để điền rồi import ============
export function buildOkrTemplateWorkbook(): Buffer {
  const guide = [
    ['HƯỚNG DẪN NHẬP OKR THEO MẪU'],
    [''],
    ['1) Điền vào 3 sheet: "Mục tiêu" · "Thước đo" · "Công việc".'],
    ['2) Cột "Mã": ĐỂ TRỐNG để TẠO MỚI. Muốn nối Thước đo/Công việc vào một Mục tiêu mới, đặt "MÃ TẠM" (vd T1, T2)'],
    ['   ở cột Mã của sheet "Mục tiêu", rồi ghi lại mã tạm đó ở cột "Mã Mục tiêu" của sheet "Thước đo"/"Công việc".'],
    ['   (Nếu điền MÃ THẬT đã có — lấy từ nút "Xuất Excel" — hệ thống sẽ CẬP NHẬT mục đó thay vì tạo mới.)'],
    ['3) Xoá các dòng ví dụ "(VD)" trước khi nhập. Cột "Tiến độ %" để trống khi tạo mới.'],
    ['4) Điền theo đúng các NHÃN Tiếng Việt ở bảng bên dưới (không phân biệt hoa/thường/dấu).'],
    [''],
    ['GIÁ TRỊ HỢP LỆ (điền đúng một trong các nhãn, cách nhau bởi dấu ·)'],
    ['Cấp (Mục tiêu)', 'Công ty · Khối · Phòng · Cá nhân'],
    ['Khối/Phòng', 'Mã đơn vị (vd KD, TC) — chỉ cần khi Cấp = Khối hoặc Phòng. Xem ở Quản trị → Cây tổ chức.'],
    ['Kỳ', 'Tên kỳ (vd "Năm 2026"). Để trống = kỳ hiện tại.'],
    ['Mã OKR cha', 'Mã (thật hoặc mã tạm) của Mục tiêu cấp trên để liên kết. Công ty → trụ cột chiến lược.'],
    ['Người chủ trì (email)', 'Email người chủ trì Mục tiêu (vd ten@baotinmanhhai.vn). Để trống = tự gán theo cấp.'],
    ['Loại OKR', 'Cam kết · Khát vọng · Học hỏi'],
    ['Trạng thái (Mục tiêu)', 'Đang chạy · Nháp · Hoàn thành · Lưu trữ'],
    ['Viễn cảnh (BSC)', 'Tài chính · Khách hàng · Quy trình nội bộ · Học hỏi & Phát triển'],
    ['Loại đo (Thước đo)', 'Số · Phần trăm · Tiền (VND) · Có/Không'],
    ['Hướng (Thước đo)', 'Tăng · Giảm'],
    ['Chỉ số (Thước đo)', 'Dẫn dắt · Kết quả'],
    ['Loại (Công việc)', 'Dự án · Tiểu dự án · Công việc'],
    ['Trạng thái (Công việc)', 'Chưa làm · Đang làm · Vướng · Xong · Huỷ'],
    ['Ưu tiên (Công việc)', 'Cao · Trung bình · Thấp'],
  ];
  const objAoa = [
    OBJ_HEAD,
    ['T1', '', 'Công ty', '', '', '(VD) Tăng trưởng doanh thu bán lẻ vượt kế hoạch', '', 'Cam kết', 'Đang chạy', '', '', 'Tài chính'],
    ['T2', '', 'Khối', 'KD', '', '(VD) Dẫn đầu bán lẻ & mở rộng mạng lưới có kỷ luật', '', 'Cam kết', 'Đang chạy', '', 'T1', 'Khách hàng'],
  ];
  const krAoa = [
    KR_HEAD,
    ['', 'T1', '(VD) Doanh thu bán lẻ đạt 1.859 tỷ', 'Số', 'Tăng', 'tỷ', 0, 0, 1859, 1, '', 'Kết quả', ''],
    ['', 'T1', '(VD) Số hoá đơn tăng 20%', 'Phần trăm', 'Tăng', '%', 0, 0, 20, 1, '', 'Dẫn dắt', ''],
    ['', 'T2', '(VD) Mở 80 điểm bán mới', 'Số', 'Tăng', 'điểm', 0, 0, 80, 1, '', 'Kết quả', ''],
  ];
  const initAoa = [
    INIT_HEAD,
    ['', 'T1', '', 'Công việc', '(VD) Triển khai chương trình khuyến mãi Q1', '', '', 'Chưa làm', 'Trung bình', 0, '', '', '', ''],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), 'Hướng dẫn');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(objAoa), SHEET_OBJ);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(krAoa), SHEET_KR);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(initAoa), SHEET_INIT);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ============ EXPORT SCORECARD KPI ============
const SC_HEAD = ['Kỳ', 'Đơn vị', 'Mã KPI', 'KPI', 'Viễn cảnh', 'Tầng', 'Trọng số', 'Hướng', 'Mục tiêu', 'Thực hiện', '% Đạt', 'Trạng thái', 'Ghi chú'];
const BSC_VN: Record<string, string> = { financial: 'Tài chính', customer: 'Khách hàng', process: 'Quy trình nội bộ', learning: 'Học hỏi & Phát triển' };
const TIER_VN: Record<string, string> = { result: 'Kết quả', driver: 'Động cơ', enabler: 'Bộ máy' };

export async function buildScorecardWorkbook(periodId: string | null, unitId: string | null, bsc?: string | null): Promise<Buffer> {
  // Xuất MỌI KPI đang hoạt động trong phạm vi lọc (kỳ×đơn vị[×viễn cảnh]) — KHÔNG chỉ KPI đã có số.
  // Bắt đầu từ okr_kpis + LEFT JOIN giá trị (giống listScorecard trên màn hình) để không rớt KPI trống.
  const where: string[] = ['k.is_active'];
  const p: unknown[] = [periodId, unitId]; // $1=period, $2=unit (dùng trong điều kiện LEFT JOIN)
  if (bsc) { p.push(bsc); where.push(`k.bsc_perspective=$${p.length}`); }

  const rows = await query<{
    period: string | null; unit: string | null; code: string | null; name: string;
    bsc: string | null; tier: string | null; weight: number; direction: KpiDirection;
    target: number | null; actual: number | null;
    tw: number | null; ta: number | null; te: number | null; note: string | null;
  }>(
    `SELECT pe.name AS period, u.name AS unit, k.code, k.name,
            k.bsc_perspective AS bsc, k.tier, k.weight::float8 AS weight, k.direction,
            v.target::float8 AS target, v.actual::float8 AS actual,
            k.threshold_watch::float8 AS tw, k.threshold_alert::float8 AS ta, k.threshold_escalate::float8 AS te,
            v.note
       FROM okr_kpis k
       LEFT JOIN okr_kpi_values v ON v.kpi_id=k.id AND v.period_id=$1 AND v.unit_id=$2
       LEFT JOIN okr_periods pe ON pe.id=$1
       LEFT JOIN okr_units u ON u.id=$2
      WHERE ${where.join(' AND ')}
      ORDER BY CASE k.tier WHEN 'result' THEN 0 WHEN 'driver' THEN 1 WHEN 'enabler' THEN 2 ELSE 3 END,
               k.weight DESC, k.name`,
    p,
  );

  const aoa: (string | number)[][] = [SC_HEAD];
  for (const r of rows) {
    const at = attainment(r.direction, r.target, r.actual);
    const st = kpiStatus({ direction: r.direction, threshold_watch: r.tw, threshold_alert: r.ta, threshold_escalate: r.te }, r.actual, r.target);
    aoa.push([
      r.period ?? '', r.unit ?? 'Công ty', r.code ?? '', r.name,
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
export type ImportResult = { objUpdated: number; objCreated: number; krUpdated: number; krCreated: number; initUpdated: number; initCreated: number; skipped: number; errors: string[] };

// Enum nhập từ Excel dùng chung bộ codec ở đầu file (E_LEVEL/E_OKR_TYPE/… — chấp nhận cả nhãn
// Tiếng Việt lẫn mã tiếng Anh cũ, không phân biệt hoa/thường/dấu).

// Dòng ví dụ trong form mẫu bắt đầu bằng "(VD)" — bỏ qua khi tạo mới để lỡ quên xoá cũng không sinh rác.
function isExample(title: string): boolean { return /^\(VD\)/i.test(title.trim()); }
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
// Đọc sheet theo DANH SÁCH tên chấp nhận được (tên Tiếng Việt mới HOẶC tên tiếng Anh cũ) — lấy sheet đầu tiên tồn tại.
function rowsOfAny(wb: XLSX.WorkBook, names: string[]): Record<string, unknown>[] {
  for (const name of names) {
    const ws = wb.Sheets[name];
    if (ws) return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  return [];
}

export async function importOkrWorkbook(buf: Buffer): Promise<ImportResult> {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const res: ImportResult = { objUpdated: 0, objCreated: 0, krUpdated: 0, krCreated: 0, initUpdated: 0, initCreated: 0, skipped: 0, errors: [] };
  const touchedObjs = new Set<string>(); // objective ids cần recompute
  // alias: 'Mã' (mã thật HOẶC mã tạm do người dùng đặt, vd T1) → objective id — để KR/việc trỏ tới OKR mới tạo.
  const alias = new Map<string, string>();
  const curPeriod = await queryOne<{ id: string }>(`SELECT id FROM okr_periods WHERE is_current=true LIMIT 1`);
  const periodIdByName = async (name: string): Promise<string | null> => {
    if (!name) return curPeriod?.id ?? null;
    const r = await queryOne<{ id: string }>(`SELECT id FROM okr_periods WHERE name=$1 LIMIT 1`, [name]);
    return r?.id ?? curPeriod?.id ?? null;
  };
  const unitIdByCode = async (code: string): Promise<string | null> => {
    if (!code) return null;
    const r = await queryOne<{ id: string }>(`SELECT id FROM okr_units WHERE code=$1 LIMIT 1`, [code]);
    return r?.id ?? null;
  };

  // 1) Objectives — Mã khớp OKR có sẵn → CẬP NHẬT; Mã trống/không khớp + có Cấp & Tiêu đề → TẠO MỚI.
  for (const r of rowsOfAny(wb, SHEET_OBJ_ALIASES)) {
    const code = s(r['Mã']);
    const title = s(r['Tiêu đề']);
    const o = code ? await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [code]) : null;
    if (o) {
      // Nhãn Tiếng Việt/mã cũ → mã enum; ô trống → giữ nguyên (COALESCE NULLIF).
      const okrType = col(r, 'Loại OKR') ? E_OKR_TYPE.parse(r['Loại OKR']) : '';
      const objStatus = col(r, 'Trạng thái') ? E_OBJ_STATUS.parse(r['Trạng thái']) : '';
      await query(
        `UPDATE okr_objectives SET title=COALESCE(NULLIF($2,''),title), description=$3,
            okr_type=COALESCE(NULLIF($4,''),okr_type), status=COALESCE(NULLIF($5,''),status), updated_at=now()
          WHERE id=$1`,
        [o.id, title, s(r['Mô tả']) || null, okrType, objStatus],
      );
      res.objUpdated++;
      if (code) alias.set(code, o.id);
      continue;
    }
    // TẠO MỚI (cần Tiêu đề). Cấp mặc định 'department' nếu để trống. Bỏ qua dòng ví dụ "(VD)".
    if (!title || isExample(title)) { res.skipped++; continue; }
    try {
      const level = E_LEVEL.parse(r['Cấp']);
      const periodId = await periodIdByName(s(r['Kỳ']));
      if (!periodId) { res.errors.push(`Không xác định được Kỳ cho OKR mới "${title}"`); res.skipped++; continue; }
      const unitId = level === 'company' || level === 'individual' ? null : await unitIdByCode(s(r['Khối/Phòng']));
      const parentRaw = s(r['Mã OKR cha']);
      let parentId: string | null = parentRaw ? (alias.get(parentRaw) ?? null) : null;
      if (parentRaw && !parentId) {
        const pr = await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [parentRaw]);
        parentId = pr?.id ?? null;
      }
      const newId = await createObjective({
        period_id: periodId, level, unit_id: unitId, owner_email: s(r['Người chủ trì (email)']) || null,
        parent_id: parentId, title, description: s(r['Mô tả']) || null,
        status: col(r, 'Trạng thái') ? E_OBJ_STATUS.parse(r['Trạng thái']) : 'active',
        okr_type: col(r, 'Loại OKR') ? E_OKR_TYPE.parse(r['Loại OKR']) : 'committed',
        bsc_perspective: E_BSC.parseOpt(r['Viễn cảnh']), created_by: 'import',
      });
      res.objCreated++;
      alias.set(code || `#row${res.objCreated}`, newId);
      if (code) alias.set(code, newId);
    } catch (e) {
      res.errors.push(`Lỗi tạo OKR "${title}": ${e instanceof Error ? e.message : String(e)}`);
      res.skipped++;
    }
  }

  // 2) KeyResults — Mã khớp KR có sẵn → CẬP NHẬT; ngược lại + có 'Mã Mục tiêu' (khớp alias/mã) → TẠO MỚI.
  for (const r of rowsOfAny(wb, SHEET_KR_ALIASES)) {
    const code = s(r['Mã']);
    const k = code ? await queryOne<{ id: string; objective_id: string; metric_type: MetricType; direction: Direction }>(
      'SELECT id, objective_id, metric_type, direction FROM okr_key_results WHERE code=$1', [code]) : null;
    if (k) {
      const start = n(r['Bắt đầu']); const cur = n(r['Hiện tại']); const tgt = n(r['Mục tiêu']);
      const prog = computeKrProgress({ metric_type: k.metric_type, direction: k.direction, start_value: start, target_value: tgt, current_value: cur });
      const ind = col(r, 'Chỉ số') ? E_IND.parse(r['Chỉ số']) : '';
      await query(
        `UPDATE okr_key_results SET title=COALESCE(NULLIF($2,''),title), unit_label=$3,
            start_value=$4, current_value=$5, target_value=$6, weight=$7,
            indicator=COALESCE(NULLIF($8,''),indicator), progress=$9, updated_at=now() WHERE id=$1`,
        [k.id, s(r['Tiêu đề']), s(r['Đơn vị']) || null, start, cur, tgt, n(r['Trọng số']) || 1, ind, prog],
      );
      res.krUpdated++;
      touchedObjs.add(k.objective_id);
      continue;
    }
    // TẠO MỚI
    const objRef = col(r, 'Mã Mục tiêu', 'Mã Objective');
    const title = s(r['Tiêu đề']);
    if (!objRef || !title || isExample(title)) { res.skipped++; continue; }
    let objId = alias.get(objRef) ?? null;
    if (!objId) { const or = await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [objRef]); objId = or?.id ?? null; }
    if (!objId) { res.errors.push(`Không tìm thấy Mục tiêu "${objRef}" cho Thước đo mới "${title}"`); res.skipped++; continue; }
    try {
      const metric = E_METRIC.parse(r['Loại đo']);
      const start = n(r['Bắt đầu']);
      await createKeyResult({
        objective_id: objId, title, metric_type: metric, direction: E_DIR.parse(r['Hướng']),
        unit_label: s(r['Đơn vị']) || null, start_value: start, current_value: n(r['Hiện tại']) || start,
        target_value: n(r['Mục tiêu']) || (metric === 'boolean' ? 1 : 100), weight: n(r['Trọng số']) || 1,
        kpi_source: s(r['Nguồn KPI']) || null, indicator: E_IND.parse(r['Chỉ số']),
      });
      res.krCreated++;
      touchedObjs.add(objId);
    } catch (e) {
      res.errors.push(`Lỗi tạo KR "${title}": ${e instanceof Error ? e.message : String(e)}`);
      res.skipped++;
    }
  }

  // 3) Initiatives — cập nhật theo Mã; nếu Mã trống + có Mã Mục tiêu → tạo mới
  for (const r of rowsOfAny(wb, SHEET_INIT_ALIASES)) {
    const code = s(r['Mã']);
    // Nhãn Tiếng Việt/mã cũ → mã enum (ô trống → mặc định như cũ). Giữ nguyên hành vi COALESCE khi cập nhật.
    const status = col(r, 'Trạng thái') ? E_INIT_STATUS.parse(r['Trạng thái']) : 'todo';
    const priority = col(r, 'Ưu tiên') ? E_PRIORITY.parse(r['Ưu tiên']) : 'medium';
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
        [i.id, s(r['Tiêu đề']), s(r['Mô tả']) || null, s(r['Người phụ trách (email)']), status, priority,
         prog, normDate(r['Bắt đầu']), normDate(r['Kết thúc']), n(r['NS kế hoạch']), n(r['Thực chi'])],
      );
      res.initUpdated++;
      await recomputeInitiativeUp(i.id);
    } else {
      const objCode = col(r, 'Mã Mục tiêu', 'Mã Objective');
      const title = s(r['Tiêu đề']);
      if (!objCode || !title || isExample(title)) { res.skipped++; continue; }
      const aliasId = alias.get(objCode);
      const o = aliasId ? { id: aliasId } : await queryOne<{ id: string }>('SELECT id FROM okr_objectives WHERE code=$1', [objCode]);
      if (!o) { res.errors.push(`Không tìm thấy Mục tiêu "${objCode}" cho công việc mới "${title}"`); res.skipped++; continue; }
      const parent = await initIdByCode(o.id, s(r['Mã cha']));
      const newCode = await nextInitCode(o.id);
      await query(
        `INSERT INTO okr_initiatives(objective_id,parent_id,kind,title,description,owner_email,status,priority,progress,start_on,due_on,budget_planned,budget_actual,created_by,code)
         VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10,$11,$12,$13,'import',$14)`,
        [o.id, parent, E_KIND.parse(r['Loại']), title, s(r['Mô tả']) || null, s(r['Người phụ trách (email)']),
         status, priority, prog, normDate(r['Bắt đầu']), normDate(r['Kết thúc']), n(r['NS kế hoạch']), n(r['Thực chi']), newCode],
      );
      res.initCreated++;
      if (parent) await recomputeInitiativeUp(parent);
    }
  }

  for (const id of touchedObjs) await recomputeUp(id);
  return res;
}
