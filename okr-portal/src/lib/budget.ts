import { query, queryOne } from './db';
import { listProjectsByPeriod } from './projects';
import type { ProjectStatus } from './projects';

// Tổng hợp NGÂN SÁCH theo kỳ — dùng cho trang Quản trị ngân sách.
// Quy ước: "Kế hoạch"/"Đã chi" ưu tiên SỔ CHI TIẾT (okr_budget_lines) khi dự án CÓ dòng
// chi tiết; nếu chưa khai dòng nào thì fallback: Kế hoạch = ngân sách dự án khai báo,
// Đã chi = tổng thực chi GOM TỪ CÔNG VIỆC (sum budget_actual của việc trong dự án).

export type BudgetLine = {
  id: string; project_id: string | null; category: string;
  planned: number; actual: number; note: string | null; source: string;
};
export type BudgetProject = {
  id: string; code: string | null; name: string; unit_name: string | null;
  status: ProjectStatus; planned: number; actual: number; taskPlanned: number; taskCount: number;
  lineCount: number; lines: BudgetLine[]; // sổ chi tiết (nếu có)
};
export type BudgetUnit = { unit: string; planned: number; actual: number; nProjects: number };
export type BudgetOverview = {
  totalPlanned: number; totalActual: number; projects: BudgetProject[]; units: BudgetUnit[];
};

/** Lấy toàn bộ dòng chi tiết ngân sách theo dự án (map projectId → lines[]). */
async function budgetLinesByProject(projectIds: string[]): Promise<Map<string, BudgetLine[]>> {
  const m = new Map<string, BudgetLine[]>();
  if (projectIds.length === 0) return m;
  const rows = await query<BudgetLine>(
    `SELECT id, project_id, category, planned::float8 AS planned, actual::float8 AS actual, note, source
       FROM okr_budget_lines WHERE project_id = ANY($1) ORDER BY category`,
    [projectIds],
  );
  for (const r of rows) {
    const arr = m.get(r.project_id!) ?? [];
    arr.push(r);
    m.set(r.project_id!, arr);
  }
  return m;
}

export async function budgetOverview(periodId: string, statusFilter?: ProjectStatus | 'all'): Promise<BudgetOverview> {
  const all = await listProjectsByPeriod(periodId);
  const rows = statusFilter && statusFilter !== 'all' ? all.filter((p) => p.status === statusFilter) : all;
  const linesMap = await budgetLinesByProject(rows.map((p) => p.id));
  const projects: BudgetProject[] = rows.map((p) => {
    const lines = linesMap.get(p.id) ?? [];
    const linePlanned = lines.reduce((a, l) => a + l.planned, 0);
    const lineActual = lines.reduce((a, l) => a + l.actual, 0);
    // Ưu tiên sổ chi tiết khi đã khai; chưa khai thì dùng ngân sách dự án + thực chi gom việc.
    const planned = lines.length ? linePlanned : p.budget_planned;
    const actual = lines.length ? lineActual : p.task_budget_actual;
    return {
      id: p.id, code: p.code, name: p.name, unit_name: p.unit_name, status: p.status,
      planned, actual, taskPlanned: p.task_budget_planned, taskCount: p.task_count,
      lineCount: lines.length, lines,
    };
  });
  const totalPlanned = projects.reduce((a, p) => a + p.planned, 0);
  const totalActual = projects.reduce((a, p) => a + p.actual, 0);
  const um = new Map<string, BudgetUnit>();
  for (const p of projects) {
    const key = p.unit_name ?? '— Chưa gắn đơn vị —';
    const cur = um.get(key) ?? { unit: key, planned: 0, actual: 0, nProjects: 0 };
    cur.planned += p.planned; cur.actual += p.actual; cur.nProjects += 1;
    um.set(key, cur);
  }
  const units = [...um.values()].sort((a, b) => b.planned - a.planned);
  return { totalPlanned, totalActual, projects, units };
}

// ── Sổ chi tiết (CRUD) ──
export async function listBudgetLines(projectId: string): Promise<BudgetLine[]> {
  return query<BudgetLine>(
    `SELECT id, project_id, category, planned::float8 AS planned, actual::float8 AS actual, note, source
       FROM okr_budget_lines WHERE project_id=$1 ORDER BY category`,
    [projectId],
  );
}

/** Upsert 1 dòng theo (project, category) — cộng dồn khi trùng hạng mục. */
export async function upsertBudgetLine(input: {
  project_id: string; category: string; planned: number; actual: number; note: string | null;
  source?: string; created_by: string;
}): Promise<void> {
  const cat = input.category.trim() || 'Khác';
  await query(
    `INSERT INTO okr_budget_lines (project_id, category, planned, actual, note, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (project_id, category) DO UPDATE
       SET planned=EXCLUDED.planned, actual=EXCLUDED.actual, note=EXCLUDED.note,
           source=EXCLUDED.source, updated_at=now()`,
    [input.project_id, cat, input.planned, input.actual, input.note, input.source ?? 'manual', input.created_by],
  );
}

export async function deleteBudgetLine(id: string): Promise<void> {
  await query('DELETE FROM okr_budget_lines WHERE id=$1', [id]);
}

// ── Template CSV (export) ── — 1 dòng / hạng mục; dự án chưa khai chi tiết → 1 dòng "(tổng)".
const CSV_HEADER = ['Mã dự án', 'Tên dự án', 'Khối/Đơn vị', 'Hạng mục', 'Kế hoạch (VND)', 'Thực chi (VND)', 'Ghi chú'];

function csvCell(s: string | number | null): string {
  const v = s == null ? '' : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Xuất CSV ngân sách theo kỳ + bộ lọc trạng thái (dùng làm TEMPLATE để sửa & import lại). */
export async function budgetCsv(periodId: string, statusFilter?: ProjectStatus | 'all'): Promise<string> {
  const d = await budgetOverview(periodId, statusFilter);
  const lines: string[] = [CSV_HEADER.map(csvCell).join(',')];
  for (const p of d.projects) {
    if (p.lines.length) {
      for (const l of p.lines) {
        lines.push([p.code, p.name, p.unit_name, l.category, l.planned, l.actual, l.note].map(csvCell).join(','));
      }
    } else {
      lines.push([p.code, p.name, p.unit_name, '(tổng)', p.planned, p.actual, ''].map(csvCell).join(','));
    }
  }
  // BOM để Excel mở đúng UTF-8 tiếng Việt.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ── Import CSV ── — khớp theo MÃ DỰ ÁN + HẠNG MỤC → upsert dòng chi tiết.
function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (c === '\r') { /* bỏ */ }
    else field += c;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

const numVN = (s: string): number => {
  const n = Number((s || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export type ImportResult = { updated: number; skipped: number; errors: string[] };

/**
 * Import ngân sách từ CSV: cột [Mã dự án, (Tên), (Khối), Hạng mục, Kế hoạch, Thực chi, (Ghi chú)].
 * Khớp theo MÃ DỰ ÁN; ghi/ghi đè dòng theo hạng mục. Hạng mục "(tổng)" → ghi thẳng vào ngân sách dự án
 * (budget_planned) thay vì tạo dòng chi tiết, để tương thích dự án chưa tách hạng mục.
 */
export async function importBudgetCsv(text: string, createdBy: string): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (rows.length === 0) return { updated: 0, skipped: 0, errors: ['File rỗng.'] };
  // Bỏ dòng tiêu đề nếu ô đầu là "Mã dự án".
  const start = /mã\s*dự\s*án/i.test(rows[0][0] ?? '') ? 1 : 0;
  let updated = 0, skipped = 0;
  const errors: string[] = [];
  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    const code = (row[0] || '').trim();
    if (!code) { skipped++; continue; }
    const proj = await queryOne<{ id: string }>('SELECT id FROM okr_projects WHERE code=$1', [code]);
    if (!proj) { errors.push(`Dòng ${r + 1}: không tìm thấy dự án mã "${code}".`); skipped++; continue; }
    const category = (row[3] || 'Khác').trim() || 'Khác';
    const planned = numVN(row[4] ?? '');
    const actual = numVN(row[5] ?? '');
    const note = (row[6] || '').trim() || null;
    if (category === '(tổng)') {
      await query('UPDATE okr_projects SET budget_planned=$2, budget_actual=$3, updated_at=now() WHERE id=$1',
        [proj.id, planned, actual]);
    } else {
      await upsertBudgetLine({ project_id: proj.id, category, planned, actual, note, source: 'import', created_by: createdBy });
    }
    updated++;
  }
  return { updated, skipped, errors };
}

/**
 * Đồng bộ THỰC CHI từ BigQuery — plumbing sẵn, CHỜ BI chốt nguồn chi phí có gắn mã dự án.
 * (BigQuery hiện có bán hàng/mua vào/tồn kho + cashflow công ty, CHƯA có bảng chi phí theo DỰ ÁN.)
 * Khi BI cung cấp view chi phí theo project_code, hiện thực map ở đây (source='bigquery').
 */
export async function syncBudgetActualsFromBigQuery(_periodId: string): Promise<{ ok: boolean; message: string; updated: number }> {
  return {
    ok: false,
    updated: 0,
    message:
      'Chưa cấu hình nguồn chi phí theo dự án trên BigQuery. Hiện dùng import CSV để nạp thực chi. ' +
      'Khi BI cung cấp view chi phí gắn mã dự án, hệ thống sẽ tự đồng bộ.',
  };
}
