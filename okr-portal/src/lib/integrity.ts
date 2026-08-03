import { query } from './db';

// Cảnh báo TOÀN VẸN ALIGNMENT — soi các "lỗ hổng" chuỗi chiến lược→thực thi trong 1 kỳ.
export type IntegrityIssue = { key: string; label: string; count: number; hint: string };

type Counts = {
  obj_no_owner: number;
  obj_no_child: number;
  kr_no_exec: number;
  kpi_no_owner: number;
  kpi_no_value: number;
  proj_no_task: number;
  task_project_period_mismatch: number;
};

const DEF: { key: keyof Counts; label: string; hint: string }[] = [
  { key: 'obj_no_owner', label: 'OKR chưa có người chủ trì', hint: 'Gán chủ trì để có người chịu trách nhiệm.' },
  { key: 'obj_no_child', label: 'OKR Công ty/Khối chưa được cascade xuống', hint: 'Chưa có OKR con nào align lên — mục tiêu chưa rải xuống cấp dưới.' },
  { key: 'kr_no_exec', label: 'Key Result chưa có việc thực thi', hint: 'KR chưa gắn dự án/công việc nào để đạt được.' },
  { key: 'kpi_no_owner', label: 'KPI thiếu chủ sở hữu / đơn vị', hint: 'Mỗi KPI cần business owner + đơn vị (KRA) chịu trách nhiệm.' },
  { key: 'kpi_no_value', label: 'KPI (có trọng số) chưa có số kỳ này', hint: 'Chưa nhập/đồng bộ mục tiêu·thực hiện trên Scorecard.' },
  { key: 'proj_no_task', label: 'Dự án chưa gắn công việc nào', hint: 'Dự án rỗng — chưa gom việc từ OKR vào.' },
  { key: 'task_project_period_mismatch', label: 'Việc gắn dự án khác kỳ với OKR gốc', hint: 'Công việc được gom vào một dự án (PRJ) thuộc kỳ KHÁC với kỳ của OKR gốc — có thể đã gắn nhầm dự án.' },
];

/** Đếm các vấn đề toàn vẹn trong 1 kỳ; chỉ trả về mục có count > 0. */
export async function integrityIssues(periodId: string): Promise<IntegrityIssue[]> {
  const r = await query<Counts>(
    `SELECT
       (SELECT count(*) FROM okr_objectives o WHERE o.period_id=$1 AND o.owner_email IS NULL)::int AS obj_no_owner,
       (SELECT count(*) FROM okr_objectives o WHERE o.period_id=$1 AND o.level IN ('company','division')
          AND NOT EXISTS (SELECT 1 FROM okr_objectives c WHERE c.parent_id=o.id))::int AS obj_no_child,
       (SELECT count(*) FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id
          WHERE o.period_id=$1
          AND NOT EXISTS (SELECT 1 FROM okr_initiatives i WHERE i.key_result_id=k.id OR i.objective_id=o.id))::int AS kr_no_exec,
       (SELECT count(*) FROM okr_kpis k WHERE k.is_active AND (k.business_owner IS NULL OR k.unit_id IS NULL))::int AS kpi_no_owner,
       (SELECT count(*) FROM okr_kpis k WHERE k.is_active AND k.weight>0
          AND NOT EXISTS (SELECT 1 FROM okr_kpi_values v WHERE v.kpi_id=k.id AND v.period_id=$1))::int AS kpi_no_value,
       (SELECT count(*) FROM okr_projects p WHERE p.period_id=$1
          AND NOT EXISTS (SELECT 1 FROM okr_initiatives i WHERE i.project_id=p.id))::int AS proj_no_task,
       (SELECT count(*) FROM okr_initiatives i
          JOIN okr_projects p ON p.id = i.project_id
          JOIN okr_objectives o ON o.id = COALESCE(i.objective_id,
               (SELECT objective_id FROM okr_key_results WHERE id = i.key_result_id))
         WHERE o.period_id=$1 AND p.period_id IS NOT NULL AND p.period_id <> $1)::int
         AS task_project_period_mismatch`,
    [periodId],
  );
  const c = r[0] ?? ({} as Counts);
  return DEF.map((d) => ({ key: d.key, label: d.label, hint: d.hint, count: c[d.key] ?? 0 })).filter(
    (x) => x.count > 0,
  );
}

// ── Trace-back: liệt kê ĐÍCH DANH các mục thuộc mỗi lỗ hổng + link tới trang chi tiết ──
export type IntegrityItem = { code: string | null; title: string; href: string; sub?: string };
export type IntegrityGroup = IntegrityIssue & { items: IntegrityItem[] };

const CAP = 500; // trần an toàn mỗi nhóm

async function itemsFor(key: keyof Counts, periodId: string): Promise<IntegrityItem[]> {
  switch (key) {
    case 'obj_no_owner':
      return (
        await query<{ id: string; code: string | null; title: string }>(
          `SELECT id, code, title FROM okr_objectives
            WHERE period_id=$1 AND owner_email IS NULL ORDER BY code NULLS LAST, title LIMIT ${CAP}`,
          [periodId],
        )
      ).map((o) => ({ code: o.code, title: o.title, href: `/objectives/${o.id}` }));
    case 'obj_no_child':
      return (
        await query<{ id: string; code: string | null; title: string; level: string }>(
          `SELECT id, code, title, level FROM okr_objectives o
            WHERE period_id=$1 AND level IN ('company','division')
              AND NOT EXISTS (SELECT 1 FROM okr_objectives c WHERE c.parent_id=o.id)
            ORDER BY code NULLS LAST, title LIMIT ${CAP}`,
          [periodId],
        )
      ).map((o) => ({
        code: o.code,
        title: o.title,
        href: `/objectives/${o.id}`,
        sub: o.level === 'company' ? 'Cấp Công ty' : 'Cấp Khối',
      }));
    case 'kr_no_exec':
      return (
        await query<{ id: string; code: string | null; title: string; oid: string; ocode: string | null }>(
          `SELECT k.id, k.code, k.title, o.id AS oid, o.code AS ocode
             FROM okr_key_results k JOIN okr_objectives o ON o.id=k.objective_id
            WHERE o.period_id=$1
              AND NOT EXISTS (SELECT 1 FROM okr_initiatives i WHERE i.key_result_id=k.id OR i.objective_id=o.id)
            ORDER BY o.code NULLS LAST, k.code NULLS LAST LIMIT ${CAP}`,
          [periodId],
        )
      ).map((k) => ({
        code: k.code,
        title: k.title,
        href: `/objectives/${k.oid}`,
        sub: k.ocode ? `Thuộc ${k.ocode}` : undefined,
      }));
    case 'kpi_no_owner':
      return (
        await query<{ code: string | null; name: string; no_owner: boolean; no_unit: boolean }>(
          `SELECT code, name, (business_owner IS NULL) AS no_owner, (unit_id IS NULL) AS no_unit
             FROM okr_kpis WHERE is_active AND (business_owner IS NULL OR unit_id IS NULL)
            ORDER BY code NULLS LAST, name LIMIT ${CAP}`,
        )
      ).map((k) => ({
        code: k.code,
        title: k.name,
        href: '/kpi',
        sub: [k.no_owner ? 'thiếu chủ sở hữu' : null, k.no_unit ? 'thiếu đơn vị (KRA)' : null]
          .filter(Boolean)
          .join(' · '),
      }));
    case 'kpi_no_value':
      return (
        await query<{ code: string | null; name: string; weight: number }>(
          `SELECT k.code, k.name, k.weight FROM okr_kpis k
            WHERE k.is_active AND k.weight>0
              AND NOT EXISTS (SELECT 1 FROM okr_kpi_values v WHERE v.kpi_id=k.id AND v.period_id=$1)
            ORDER BY k.weight DESC, k.code NULLS LAST LIMIT ${CAP}`,
          [periodId],
        )
      ).map((k) => ({ code: k.code, title: k.name, href: '/kpi', sub: `trọng số ${k.weight}` }));
    case 'proj_no_task':
      return (
        await query<{ id: string; code: string | null; name: string }>(
          `SELECT id, code, name FROM okr_projects p
            WHERE period_id=$1 AND NOT EXISTS (SELECT 1 FROM okr_initiatives i WHERE i.project_id=p.id)
            ORDER BY code NULLS LAST, name LIMIT ${CAP}`,
          [periodId],
        )
      ).map((p) => ({ code: p.code, title: p.name, href: `/projects/${p.id}` }));
    case 'task_project_period_mismatch':
      return (
        await query<{ code: string | null; title: string; oid: string; pcode: string | null; pperiod: string | null }>(
          `SELECT i.code, i.title,
                  COALESCE(i.objective_id, (SELECT objective_id FROM okr_key_results WHERE id=i.key_result_id)) AS oid,
                  p.code AS pcode, po.name AS pperiod
             FROM okr_initiatives i
             JOIN okr_projects p ON p.id = i.project_id
             JOIN okr_objectives o ON o.id = COALESCE(i.objective_id,
                  (SELECT objective_id FROM okr_key_results WHERE id=i.key_result_id))
             LEFT JOIN okr_periods po ON po.id = p.period_id
            WHERE o.period_id=$1 AND p.period_id IS NOT NULL AND p.period_id <> $1
            ORDER BY i.code NULLS LAST, i.title LIMIT ${CAP}`,
          [periodId],
        )
      ).map((t) => ({
        code: t.code,
        title: t.title,
        href: `/objectives/${t.oid}`,
        sub: [t.pcode ? `Dự án ${t.pcode}` : null, t.pperiod ? `kỳ ${t.pperiod}` : null].filter(Boolean).join(' · '),
      }));
    default:
      return [];
  }
}

/** Chi tiết trace-back: mỗi lỗ hổng + danh sách mục đích danh (chỉ nhóm có count>0). */
export async function integrityGroups(periodId: string): Promise<IntegrityGroup[]> {
  const issues = await integrityIssues(periodId);
  const groups = await Promise.all(
    issues.map(async (iss) => ({ ...iss, items: await itemsFor(iss.key as keyof Counts, periodId) })),
  );
  return groups;
}
