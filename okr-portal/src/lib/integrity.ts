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
};

const DEF: { key: keyof Counts; label: string; hint: string }[] = [
  { key: 'obj_no_owner', label: 'OKR chưa có người chủ trì', hint: 'Gán chủ trì để có người chịu trách nhiệm.' },
  { key: 'obj_no_child', label: 'OKR Công ty/Khối chưa được cascade xuống', hint: 'Chưa có OKR con nào align lên — mục tiêu chưa rải xuống cấp dưới.' },
  { key: 'kr_no_exec', label: 'Key Result chưa có việc thực thi', hint: 'KR chưa gắn dự án/công việc nào để đạt được.' },
  { key: 'kpi_no_owner', label: 'KPI thiếu chủ sở hữu / đơn vị', hint: 'Mỗi KPI cần business owner + đơn vị (KRA) chịu trách nhiệm.' },
  { key: 'kpi_no_value', label: 'KPI (có trọng số) chưa có số kỳ này', hint: 'Chưa nhập/đồng bộ mục tiêu·thực hiện trên Scorecard.' },
  { key: 'proj_no_task', label: 'Dự án chưa gắn công việc nào', hint: 'Dự án rỗng — chưa gom việc từ OKR vào.' },
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
          AND NOT EXISTS (SELECT 1 FROM okr_initiatives i WHERE i.project_id=p.id))::int AS proj_no_task`,
    [periodId],
  );
  const c = r[0] ?? ({} as Counts);
  return DEF.map((d) => ({ key: d.key, label: d.label, hint: d.hint, count: c[d.key] ?? 0 })).filter(
    (x) => x.count > 0,
  );
}
