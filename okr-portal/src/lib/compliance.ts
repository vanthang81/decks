// PHÂN HỆ BẢNG KIỂM TUÂN THỦ (CFO 10/09 — Phòng Pháp chế). Mô hình 3 lớp:
//   TIÊU CHÍ rà soát (import Excel, nguồn gốc, KHÔNG phải Task)
//     → VẤN ĐỀ tuân thủ (tự sinh khi "chưa tuân thủ/vi phạm")
//       → HÀNH ĐỘNG khắc phục = Task (okr_initiatives.issue_id).
// Xem db/620_compliance.sql + CLAUDE.md.
import * as XLSX from 'xlsx';
import { query, queryOne } from './db';
import { createInitiative } from './initiatives';
import { logAudit } from './audit';
import type { Conclusion, IssueStatus, ProjectFn } from './compliance-shared';

export type { Conclusion, IssueStatus, ProjectFn } from './compliance-shared';
export { CONCLUSION_LABEL, ISSUE_STATUS_LABEL, FN_LABEL } from './compliance-shared';

export type ChecklistItem = {
  id: string;
  project_id: string;
  ma_tieu_chi: string;
  yeu_cau: string | null;
  co_so_phap_ly: string | null;
  don_vi_ra_soat: string | null;
  han_ra_soat: string | null;
  ket_qua_don_vi: string | null;
  bang_chung: string | null;
  tham_dinh_phap_che: string | null;
  ket_qua_kstt: string | null;
  ket_luan: Conclusion;
  khkp_noi_dung: string | null;
  khkp_don_vi: string | null;
  khkp_pic: string | null;
  khkp_han: string | null;
  khkp_ket_qua: string | null;
  extra: Record<string, string> | null;
  sort: number;
  // Kèm khi list:
  issue_id?: string | null;
  issue_status?: IssueStatus | null;
  task_total?: number;
  task_done?: number;
};

export type ComplianceIssue = {
  id: string;
  project_id: string;
  checklist_item_id: string;
  ma_tieu_chi?: string | null;
  title: string;
  severity: 'chua_tuan_thu' | 'vi_pham';
  status: IssueStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  kstt_by: string | null;
  kstt_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  task_total?: number;
  task_done?: number;
};

// ---------------- Helpers chuỗi ----------------
function s(v: unknown): string {
  return v == null ? '' : String(v).trim();
}
function orNull(v: string): string | null {
  return v === '' ? null : v;
}
// Chuẩn hoá để so khớp header: thường hoá, bỏ dấu, gộp khoảng trắng.
function norm(v: unknown): string {
  return s(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, ' ').trim();
}

// ---------------- Kết luận: map free-text → mã ----------------
const CONCLUSION_ALIASES: Record<string, Conclusion> = {};
(() => {
  const add = (c: Conclusion, ...als: string[]) => als.forEach((a) => (CONCLUSION_ALIASES[norm(a)] = c));
  add('tuan_thu', 'tuan thu', 'da tuan thu', 'dat', 'pass', 'ok', 'phu hop', 'co', 'yes');
  add('chua_tuan_thu', 'chua tuan thu', 'khong dat', 'chua dat', 'chua phu hop', 'khong phu hop');
  add('vi_pham', 'vi pham', 'sai pham', 'loi', 'khong tuan thu');
  add('khong_ap_dung', 'khong ap dung', 'n/a', 'na', 'khong lien quan', '-');
  add('chua_ra_soat', 'chua ra soat', 'chua danh gia', 'dang ra soat', 'chua kiem tra', '');
})();
export function parseConclusion(v: unknown): Conclusion {
  return CONCLUSION_ALIASES[norm(v)] ?? 'chua_ra_soat';
}

// ---------------- Cờ bật module + vai trò chức năng ----------------
export async function setComplianceEnabled(projectId: string, on: boolean): Promise<void> {
  await query('UPDATE okr_projects SET compliance_enabled=$2 WHERE id=$1', [projectId, on]);
}

export type ProjectFunctionRow = { id: string; email: string; name: string | null; fn: ProjectFn };
export async function listProjectFunctions(projectId: string): Promise<ProjectFunctionRow[]> {
  return query<ProjectFunctionRow>(
    `SELECT f.id, f.email, u.display_name AS name, f.fn
       FROM okr_project_functions f
       LEFT JOIN okr_users u ON lower(u.email)=lower(f.email)
      WHERE f.project_id=$1 ORDER BY f.fn, u.display_name NULLS LAST, f.email`,
    [projectId],
  );
}
export async function addProjectFunction(projectId: string, email: string, fn: ProjectFn, by: string): Promise<void> {
  await query(
    `INSERT INTO okr_project_functions (project_id, email, fn, added_by) VALUES ($1, lower($2), $3, $4)
     ON CONFLICT (project_id, lower(email), fn) DO NOTHING`,
    [projectId, email, fn, by],
  );
}
export async function removeProjectFunction(id: string): Promise<void> {
  await query('DELETE FROM okr_project_functions WHERE id=$1', [id]);
}
/** Người dùng có vai trò chức năng `fn` trong dự án? (dùng gác workflow thẩm định). */
export async function hasProjectFunction(projectId: string, email: string, fn: ProjectFn): Promise<boolean> {
  const r = await queryOne<{ x: number }>(
    'SELECT 1 x FROM okr_project_functions WHERE project_id=$1 AND lower(email)=lower($2) AND fn=$3',
    [projectId, email, fn],
  );
  return !!r;
}
export async function projectFunctionsOf(projectId: string, email: string): Promise<Set<ProjectFn>> {
  const rows = await query<{ fn: ProjectFn }>(
    'SELECT fn FROM okr_project_functions WHERE project_id=$1 AND lower(email)=lower($2)',
    [projectId, email],
  );
  return new Set(rows.map((r) => r.fn));
}

// ---------------- Đọc dữ liệu ----------------
export async function listChecklistItems(projectId: string): Promise<ChecklistItem[]> {
  return query<ChecklistItem>(
    `SELECT c.id, c.project_id, c.ma_tieu_chi, c.yeu_cau, c.co_so_phap_ly, c.don_vi_ra_soat,
            c.han_ra_soat::text, c.ket_qua_don_vi, c.bang_chung, c.tham_dinh_phap_che, c.ket_qua_kstt,
            c.ket_luan, c.khkp_noi_dung, c.khkp_don_vi, c.khkp_pic, c.khkp_han::text, c.khkp_ket_qua,
            c.extra, c.sort,
            i.id AS issue_id, i.status AS issue_status,
            COALESCE((SELECT count(*) FROM okr_initiatives t WHERE t.issue_id=i.id),0)::int AS task_total,
            COALESCE((SELECT count(*) FROM okr_initiatives t WHERE t.issue_id=i.id AND t.status='done'),0)::int AS task_done
       FROM okr_checklist_items c
       LEFT JOIN okr_compliance_issues i ON i.checklist_item_id=c.id
      WHERE c.project_id=$1
      ORDER BY c.sort, c.ma_tieu_chi`,
    [projectId],
  );
}

export async function listIssues(projectId: string): Promise<ComplianceIssue[]> {
  return query<ComplianceIssue>(
    `SELECT i.*, c.ma_tieu_chi,
            COALESCE((SELECT count(*) FROM okr_initiatives t WHERE t.issue_id=i.id),0)::int AS task_total,
            COALESCE((SELECT count(*) FROM okr_initiatives t WHERE t.issue_id=i.id AND t.status='done'),0)::int AS task_done
       FROM okr_compliance_issues i
       JOIN okr_checklist_items c ON c.id=i.checklist_item_id
      WHERE i.project_id=$1
      ORDER BY c.sort, c.ma_tieu_chi`,
    [projectId],
  );
}

export async function getIssue(id: string): Promise<ComplianceIssue | null> {
  return queryOne<ComplianceIssue>(
    `SELECT i.*, c.ma_tieu_chi FROM okr_compliance_issues i
       JOIN okr_checklist_items c ON c.id=i.checklist_item_id WHERE i.id=$1`,
    [id],
  );
}

export type ReviewRow = { id: string; actor: string; actor_name: string | null; step: string; result: string; note: string | null; created_at: string };
export async function listReviews(issueId: string): Promise<ReviewRow[]> {
  return query<ReviewRow>(
    `SELECT r.id, r.actor, u.display_name AS actor_name, r.step, r.result, r.note, r.created_at::text
       FROM okr_compliance_reviews r LEFT JOIN okr_users u ON lower(u.email)=lower(r.actor)
      WHERE r.issue_id=$1 ORDER BY r.created_at`,
    [issueId],
  );
}

// ---------------- Giải email PIC (email hoặc tên → email trong hệ thống) ----------------
async function resolveEmail(cell: string): Promise<string | null> {
  const v = s(cell);
  if (!v) return null;
  if (v.includes('@')) {
    const r = await queryOne<{ email: string }>('SELECT email FROM okr_users WHERE lower(email)=lower($1)', [v]);
    return r?.email ?? v.toLowerCase(); // giữ nguyên email dù chưa có tài khoản (owner text tự do)
  }
  const r = await queryOne<{ email: string }>(
    'SELECT email FROM okr_users WHERE lower(display_name)=lower($1) AND is_active=true ORDER BY email LIMIT 1',
    [v],
  );
  return r?.email ?? null; // tên không khớp → để trống owner (không đoán bừa)
}

// ---------------- Đồng bộ Vấn đề + Task khắc phục cho 1 tiêu chí ----------------
// Idempotent: gọi lại nhiều lần an toàn (dùng khi import lại + khi đổi kết luận).
//  • kết luận vi phạm/chưa tuân thủ → đảm bảo có Vấn đề; nếu có KHKP trong bảng kiểm mà Vấn đề chưa có
//    hành động nào → tự tạo 1 Task kế thừa (KHÔNG đè khi đã có task để tránh mất chỉnh sửa của đơn vị).
//  • kết luận về tuân thủ/không áp dụng mà Vấn đề còn "no_plan" & chưa có task → xoá (báo động sai đã sửa).
export async function syncIssueForItem(itemId: string, actor: string): Promise<{ createdIssue: boolean; createdTask: boolean }> {
  const item = await queryOne<Pick<ChecklistItem,
    'id' | 'project_id' | 'ma_tieu_chi' | 'yeu_cau' | 'ket_luan' | 'khkp_noi_dung' | 'khkp_don_vi' | 'khkp_pic' | 'khkp_han' | 'khkp_ket_qua'>>(
    `SELECT id, project_id, ma_tieu_chi, yeu_cau, ket_luan,
            khkp_noi_dung, khkp_don_vi, khkp_pic, khkp_han::text AS khkp_han, khkp_ket_qua
       FROM okr_checklist_items WHERE id=$1`,
    [itemId],
  );
  if (!item) return { createdIssue: false, createdTask: false };
  const violation = item.ket_luan === 'chua_tuan_thu' || item.ket_luan === 'vi_pham';
  const existing = await queryOne<{ id: string; status: IssueStatus }>(
    'SELECT id, status FROM okr_compliance_issues WHERE checklist_item_id=$1',
    [itemId],
  );

  if (!violation) {
    // Kết luận không còn vi phạm: dọn Vấn đề "no_plan" chưa có task (báo động sai). Giữ nếu đã có tiến trình.
    if (existing) {
      const taskCount = await queryOne<{ n: string }>('SELECT count(*) n FROM okr_initiatives WHERE issue_id=$1', [existing.id]);
      if (existing.status === 'no_plan' && Number(taskCount?.n ?? 0) === 0) {
        await query('DELETE FROM okr_compliance_issues WHERE id=$1', [existing.id]);
      }
    }
    return { createdIssue: false, createdTask: false };
  }

  let issueId = existing?.id ?? null;
  let createdIssue = false;
  if (!issueId) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO okr_compliance_issues (project_id, checklist_item_id, title, severity, status)
       VALUES ($1,$2,$3,$4,'no_plan') RETURNING id`,
      [item.project_id, item.id, (item.yeu_cau || `Tiêu chí ${item.ma_tieu_chi}`).slice(0, 500), item.ket_luan],
    );
    issueId = row!.id;
    createdIssue = true;
  } else {
    // Cập nhật mức độ theo kết luận mới nhất.
    await query('UPDATE okr_compliance_issues SET severity=$2, updated_at=now() WHERE id=$1', [issueId, item.ket_luan]);
  }

  // Tự tạo Task khắc phục kế thừa KHKP — chỉ khi Vấn đề CHƯA có hành động nào (tránh trùng khi import lại).
  let createdTask = false;
  const hasKhkp = !!s(item.khkp_noi_dung || '');
  if (hasKhkp) {
    const cnt = await queryOne<{ n: string }>('SELECT count(*) n FROM okr_initiatives WHERE issue_id=$1', [issueId]);
    if (Number(cnt?.n ?? 0) === 0) {
      const owner = await resolveEmail(item.khkp_pic || '');
      const taskId = await createInitiative({
        objective_id: null, key_result_id: null, parent_id: null, kind: 'action',
        title: (item.khkp_noi_dung || `Khắc phục tiêu chí ${item.ma_tieu_chi}`).slice(0, 500),
        description: item.khkp_don_vi ? `Đơn vị khắc phục: ${item.khkp_don_vi}` : null,
        owner_email: owner, unit_id: null, project_id: item.project_id,
        status: 'todo', priority: item.ket_luan === 'vi_pham' ? 'high' : 'medium',
        start_on: null, due_on: item.khkp_han, budget_planned: 0, budget_actual: 0,
        budget_source: null, expected_output: orNull(s(item.khkp_ket_qua || '')), created_by: actor,
      });
      await query('UPDATE okr_initiatives SET issue_id=$2 WHERE id=$1', [taskId, issueId]);
      createdTask = true;
    }
  }
  // Trạng thái vấn đề: có task → đang khắc phục; chưa có → chưa có KHKP.
  const cnt2 = await queryOne<{ n: string }>('SELECT count(*) n FROM okr_initiatives WHERE issue_id=$1', [issueId]);
  const newStatus: IssueStatus = Number(cnt2?.n ?? 0) > 0 ? 'in_remediation' : 'no_plan';
  // Chỉ hạ về no_plan/in_remediation nếu vấn đề CHƯA vào luồng thẩm định (giữ trạng thái pending/closed).
  if (existing && (existing.status === 'pending_review' || existing.status === 'kstt_passed' || existing.status === 'closed')) {
    // giữ nguyên
  } else {
    await query('UPDATE okr_compliance_issues SET status=$2, updated_at=now() WHERE id=$1', [issueId, newStatus]);
  }
  return { createdIssue, createdTask };
}

// ---------------- Import Excel (upsert theo mã) ----------------
type FieldKey =
  | 'ma_tieu_chi' | 'yeu_cau' | 'co_so_phap_ly' | 'don_vi_ra_soat' | 'han_ra_soat'
  | 'ket_qua_don_vi' | 'bang_chung' | 'tham_dinh_phap_che' | 'ket_qua_kstt' | 'ket_luan'
  | 'khkp_noi_dung' | 'khkp_don_vi' | 'khkp_pic' | 'khkp_han' | 'khkp_ket_qua';

// Alias header (đã chuẩn hoá) → field. Khớp linh hoạt để nhận nhiều biến thể tên cột.
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  ma_tieu_chi: ['ma', 'stt', 'so tt', 'ma tieu chi', 'ma so', 'ma tc', 'id'],
  yeu_cau: ['yeu cau tuan thu', 'yeu cau', 'noi dung tuan thu', 'tieu chi', 'noi dung ra soat', 'noi dung tieu chi', 'noi dung', 'noi dung yeu cau'],
  co_so_phap_ly: ['co so phap ly', 'can cu phap ly', 'quy dinh', 'van ban phap ly', 'co so'],
  don_vi_ra_soat: ['don vi ra soat', 'don vi', 'bo phan ra soat', 'don vi thuc hien ra soat', 'phong ban'],
  han_ra_soat: ['han ra soat', 'thoi han ra soat', 'ngay ra soat', 'han hoan thanh ra soat'],
  ket_qua_don_vi: ['ket qua don vi', 'ket qua tu ra soat', 'ket qua & bang chung', 'ket qua don vi tu danh gia', 'ket qua thuc hien', 'ket qua tu danh gia', 'ket qua ra soat cua don vi'],
  bang_chung: ['bang chung', 'tai lieu bang chung', 'minh chung', 'ho so bang chung', 'file bang chung'],
  tham_dinh_phap_che: ['tham dinh phap che', 'y kien phap che', 'ket luan phap che', 'phap che', 'danh gia phap che', 'y kien cua phap che'],
  ket_qua_kstt: ['ket qua kstt', 'kiem tra kstt', 'kstt', 'ket qua kiem soat', 'ket qua kiem tra kstt', 'y kien kstt'],
  ket_luan: ['ket luan', 'ket luan tuan thu', 'danh gia', 'trang thai tuan thu', 'muc do tuan thu', 'ket qua danh gia', 'ket luan chung'],
  khkp_noi_dung: ['ke hoach khac phuc', 'noi dung khac phuc', 'hanh dong khac phuc', 'bien phap khac phuc', 'khkp', 'noi dung khkp', 'giai phap khac phuc'],
  khkp_don_vi: ['don vi khac phuc', 'don vi thuc hien khac phuc', 'don vi thuc hien', 'bo phan khac phuc'],
  khkp_pic: ['pic', 'nguoi phu trach khac phuc', 'nguoi thuc hien', 'nguoi phu trach', 'nguoi chiu trach nhiem', 'pic khac phuc'],
  khkp_han: ['han khac phuc', 'thoi han khac phuc', 'deadline khac phuc', 'han hoan thanh khac phuc', 'thoi han hoan thanh', 'ngay hoan thanh khac phuc'],
  khkp_ket_qua: ['ket qua dau ra', 'ket qua khac phuc', 'san pham khac phuc', 'ket qua mong doi', 'ket qua dau ra mong doi'],
};

function matchHeader(header: string): FieldKey | null {
  const h = norm(header);
  if (!h) return null;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => h === a)) return field;
  }
  // khớp "chứa" (nới lỏng) — ưu tiên alias dài để tránh nhầm.
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => a.length >= 5 && h.includes(a))) return field;
  }
  return null;
}

function parseDateCell(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const str = s(v);
  // dd/mm/yyyy hoặc dd-mm-yyyy
  const m = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    if (!isNaN(Date.parse(iso))) return iso;
  }
  const t = Date.parse(str);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

export type ImportResult = {
  ok: boolean;
  sheet?: string;
  headersMatched?: Record<string, string>;
  rows?: number;
  created?: number;
  updated?: number;
  issuesCreated?: number;
  tasksCreated?: number;
  skipped?: number;
  warnings?: string[];
  error?: string;
};

// Import 1 workbook Bảng kiểm cho 1 dự án. Lấy sheet ĐẦU TIÊN có cột "Mã/STT". Upsert theo mã.
export async function importChecklistWorkbook(projectId: string, buf: Buffer, actor: string): Promise<ImportResult> {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { cellDates: true });
  } catch (e) {
    return { ok: false, error: 'File không đọc được (.xlsx hợp lệ?). ' + String(e) };
  }
  // Chọn sheet: sheet đầu tiên bóc được cột mã tiêu chí.
  let chosen: { name: string; rows: Record<string, unknown>[]; map: Map<string, FieldKey> } | null = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]);
    const map = new Map<string, FieldKey>();
    for (const h of headers) {
      const f = matchHeader(h);
      if (f && ![...map.values()].includes(f)) map.set(h, f); // 1 field ↔ 1 cột (cột đầu thắng)
    }
    if ([...map.values()].includes('ma_tieu_chi')) {
      chosen = { name, rows, map };
      break;
    }
  }
  if (!chosen) {
    return { ok: false, error: 'Không tìm thấy sheet nào có cột "Mã/STT" tiêu chí. Kiểm tra lại tiêu đề cột.' };
  }

  const { name, rows, map } = chosen;
  const headersMatched: Record<string, string> = {};
  for (const [h, f] of map) headersMatched[h] = f;

  let created = 0, updated = 0, issuesCreated = 0, tasksCreated = 0, skipped = 0;
  const warnings: string[] = [];
  let sort = 0;

  for (const r of rows) {
    sort += 10;
    const get = (f: FieldKey): string => {
      for (const [h, ff] of map) if (ff === f) return s(r[h]);
      return '';
    };
    const ma = get('ma_tieu_chi');
    const yeu_cau = get('yeu_cau');
    if (!ma && !yeu_cau) { skipped++; continue; } // dòng trống
    if (!ma) { skipped++; warnings.push(`Bỏ 1 dòng thiếu Mã (yêu cầu: "${yeu_cau.slice(0, 40)}…")`); continue; }

    // Cột lạ (không map được) → extra jsonb (không mất dữ liệu).
    const extra: Record<string, string> = {};
    for (const h of Object.keys(r)) {
      if (!map.has(h)) { const v = s(r[h]); if (v) extra[h] = v; }
    }

    const fields = {
      yeu_cau: orNull(yeu_cau),
      co_so_phap_ly: orNull(get('co_so_phap_ly')),
      don_vi_ra_soat: orNull(get('don_vi_ra_soat')),
      han_ra_soat: parseDateCell(get('han_ra_soat')),
      ket_qua_don_vi: orNull(get('ket_qua_don_vi')),
      bang_chung: orNull(get('bang_chung')),
      tham_dinh_phap_che: orNull(get('tham_dinh_phap_che')),
      ket_qua_kstt: orNull(get('ket_qua_kstt')),
      ket_luan: parseConclusion(get('ket_luan')),
      khkp_noi_dung: orNull(get('khkp_noi_dung')),
      khkp_don_vi: orNull(get('khkp_don_vi')),
      khkp_pic: orNull(get('khkp_pic')),
      khkp_han: parseDateCell(get('khkp_han')),
      khkp_ket_qua: orNull(get('khkp_ket_qua')),
      extra: Object.keys(extra).length ? JSON.stringify(extra) : null,
    };

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM okr_checklist_items WHERE project_id=$1 AND lower(ma_tieu_chi)=lower($2)',
      [projectId, ma],
    );
    let itemId: string;
    if (existing) {
      await query(
        `UPDATE okr_checklist_items SET yeu_cau=$3, co_so_phap_ly=$4, don_vi_ra_soat=$5, han_ra_soat=$6,
                ket_qua_don_vi=$7, bang_chung=$8, tham_dinh_phap_che=$9, ket_qua_kstt=$10, ket_luan=$11,
                khkp_noi_dung=$12, khkp_don_vi=$13, khkp_pic=$14, khkp_han=$15, khkp_ket_qua=$16,
                extra=$17::jsonb, sort=$18, updated_at=now()
          WHERE id=$1 AND project_id=$2`,
        [existing.id, projectId, fields.yeu_cau, fields.co_so_phap_ly, fields.don_vi_ra_soat, fields.han_ra_soat,
         fields.ket_qua_don_vi, fields.bang_chung, fields.tham_dinh_phap_che, fields.ket_qua_kstt, fields.ket_luan,
         fields.khkp_noi_dung, fields.khkp_don_vi, fields.khkp_pic, fields.khkp_han, fields.khkp_ket_qua,
         fields.extra, sort],
      );
      itemId = existing.id;
      updated++;
    } else {
      const row = await queryOne<{ id: string }>(
        `INSERT INTO okr_checklist_items (project_id, ma_tieu_chi, yeu_cau, co_so_phap_ly, don_vi_ra_soat,
            han_ra_soat, ket_qua_don_vi, bang_chung, tham_dinh_phap_che, ket_qua_kstt, ket_luan,
            khkp_noi_dung, khkp_don_vi, khkp_pic, khkp_han, khkp_ket_qua, extra, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18) RETURNING id`,
        [projectId, ma, fields.yeu_cau, fields.co_so_phap_ly, fields.don_vi_ra_soat, fields.han_ra_soat,
         fields.ket_qua_don_vi, fields.bang_chung, fields.tham_dinh_phap_che, fields.ket_qua_kstt, fields.ket_luan,
         fields.khkp_noi_dung, fields.khkp_don_vi, fields.khkp_pic, fields.khkp_han, fields.khkp_ket_qua,
         fields.extra, sort],
      );
      itemId = row!.id;
      created++;
    }
    const sync = await syncIssueForItem(itemId, actor);
    if (sync.createdIssue) issuesCreated++;
    if (sync.createdTask) tasksCreated++;
  }

  await logAudit({
    actor, action: 'compliance.import', entity: 'project', entityId: projectId,
    detail: { sheet: name, rows: rows.length, created, updated, issuesCreated, tasksCreated, skipped },
  }).catch(() => {});

  return { ok: true, sheet: name, headersMatched, rows: rows.length, created, updated, issuesCreated, tasksCreated, skipped, warnings: warnings.slice(0, 20) };
}
