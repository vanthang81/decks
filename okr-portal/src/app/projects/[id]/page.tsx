import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { ProgressBar } from '@/components/ui';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { listUsers } from '@/lib/users';
import {
  getProject,
  listProjectTasks,
  canManageProject,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_CLS,
} from '@/lib/projects';
import { INIT_STATUS_LABEL, type InitStatus } from '@/lib/initiatives';
import { fmtVnd, fmtDate } from '@/lib/format';
import { updateProjectAction, deleteProjectAction } from '../actions';

export const dynamic = 'force-dynamic';

const STATUS_CLS: Record<string, string> = {
  todo: 'gray',
  in_progress: 'blue',
  blocked: 'red',
  done: 'green',
  canceled: 'gray',
};

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const p = await getProject(params.id);
  if (!p) notFound();

  const [tasks, units, users] = await Promise.all([
    listProjectTasks(p.id),
    listUnits(),
    listUsers(),
  ]);
  const canManage = canManageProject(user, p, units);
  const divisionUnits = units.filter((u) => u.type === 'division');
  const deptUnits = units.filter((u) => u.type === 'department');

  // Gom việc theo OKR gốc (mỗi OKR 1 nhóm) để thấy dự án chạm những mục tiêu nào.
  type Group = {
    objId: string | null;
    title: string;
    code: string | null;
    unit: string | null;
    tasks: typeof tasks;
  };
  const gmap = new Map<string, Group>();
  for (const t of tasks) {
    const key = t.objective_id ?? '—';
    if (!gmap.has(key))
      gmap.set(key, {
        objId: t.objective_id,
        title: t.objective_title ?? 'Không gắn OKR',
        code: t.objective_code,
        unit: t.objective_unit,
        tasks: [],
      });
    gmap.get(key)!.tasks.push(t);
  }
  const groups = [...gmap.values()];

  return (
    <>
      <SiteHeader active="projects" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/projects">← Tất cả dự án</Link>
        </p>

        <div className="card">
          <div className="flexbtw">
            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 6 }}>
                {p.code && <span className="okr-code" style={{ marginRight: 8 }}>{p.code}</span>}
                <span className={`badge ${PROJECT_STATUS_CLS[p.status]}`}>
                  {PROJECT_STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="pagetitle" style={{ margin: 0 }}>{p.name}</div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                {p.unit_name ? `🏢 ${p.unit_name} · ` : ''}
                {p.owner_name ? `Chủ trì: ${p.owner_name} · ` : ''}
                {p.task_count} việc ({p.done_count} xong)
                {p.start_on || p.due_on
                  ? ` · ${p.start_on ? fmtDate(p.start_on) : ''}${p.due_on ? ' → ' + fmtDate(p.due_on) : ''}`
                  : ''}
              </div>
              {p.description && <p style={{ marginBottom: 0 }}>{p.description}</p>}
            </div>
            <div style={{ width: 200, textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--primary)' }}>
                {p.progress.toFixed(0)}%
              </div>
              <ProgressBar value={p.progress} lg />
              <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                NS kế hoạch {fmtVnd(p.budget_planned)}
                <br />
                Đã chi (gom việc) {fmtVnd(p.task_budget_actual)}
              </div>
            </div>
          </div>
        </div>

        {/* ---- Việc thuộc dự án (gom theo OKR) ---- */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Công việc thuộc dự án ({tasks.length})</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Gom theo OKR gốc — một dự án có thể chạm nhiều OKR/khối. Bấm tên OKR để mở &amp; sửa việc ở đó.
          </p>
          {tasks.length === 0 && (
            <p className="muted">
              Chưa có việc nào. Mở một OKR → mục “Dự án &amp; Kế hoạch hành động” → bấm việc → tick “Thuộc dự án” và chọn dự án này.
            </p>
          )}
          {groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, margin: '4px 0 6px' }}>
                {g.code && <span className="okr-code" style={{ marginRight: 6 }}>{g.code}</span>}
                {g.objId ? <Link href={`/objectives/${g.objId}`}>{g.title}</Link> : g.title}
                {g.unit ? <span className="muted" style={{ fontWeight: 400 }}> · {g.unit}</span> : null}
              </div>
              {g.tasks.map((t) => (
                <div key={t.id} className="flexbtw" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      {t.code && <span className="okr-code" style={{ marginRight: 6 }}>{t.code}</span>}
                      {t.title}{' '}
                      <span className={`badge ${STATUS_CLS[t.status] ?? 'gray'}`} style={{ fontSize: 10.5 }}>
                        {INIT_STATUS_LABEL[t.status as InitStatus] ?? t.status}
                      </span>
                    </div>
                    <div className="obj-meta">
                      {t.owner_name ? `👤 ${t.owner_name}` : 'Chưa giao'}
                      {t.due_on ? ` · Hạn ${fmtDate(t.due_on)}` : ''}
                    </div>
                  </div>
                  <div style={{ width: 130 }}>
                    <ProgressBar value={t.progress} />
                    <div className="right muted mono" style={{ fontSize: 12 }}>{t.progress.toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ---- Sửa / xoá dự án ---- */}
        {canManage && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Sửa dự án</h3>
            <form action={updateProjectAction}>
              <input type="hidden" name="id" value={p.id} />
              <label className="f">Tên dự án</label>
              <input className="i" name="name" defaultValue={p.name} required />
              <div className="row">
                <div>
                  <label className="f">Chủ trì (cá nhân)</label>
                  <select className="i" name="owner_email" defaultValue={p.owner_email ?? ''}>
                    <option value="">— Chưa gán —</option>
                    {users.map((u) => (
                      <option key={u.email} value={u.email}>{u.display_name || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị chủ trì (Khối / Phòng)</label>
                  <select className="i" name="unit_id" defaultValue={p.unit_id ?? ''}>
                    <option value="">— Không gắn —</option>
                    {divisionUnits.length > 0 && (
                      <optgroup label="Khối">
                        {divisionUnits.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </optgroup>
                    )}
                    {deptUnits.length > 0 && (
                      <optgroup label="Phòng ban">
                        {deptUnits.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={p.status}>
                    {(Object.keys(PROJECT_STATUS_LABEL) as (keyof typeof PROJECT_STATUS_LABEL)[]).map((s) => (
                      <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <input className="i" type="date" name="start_on" defaultValue={p.start_on ?? ''} />
                </div>
                <div>
                  <label className="f">Hạn</label>
                  <input className="i" type="date" name="due_on" defaultValue={p.due_on ?? ''} />
                </div>
                <div>
                  <label className="f">NS kế hoạch (VND)</label>
                  <input className="i" name="budget_planned" defaultValue={p.budget_planned} />
                </div>
                <div>
                  <label className="f">Đã chi (VND)</label>
                  <input className="i" name="budget_actual" defaultValue={p.budget_actual} />
                </div>
              </div>
              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={p.description ?? ''} />
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">Lưu dự án</button>
              </div>
            </form>

            <details className="inline" style={{ marginTop: 14 }}>
              <summary className="danger">Xoá dự án</summary>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Xoá dự án KHÔNG xoá công việc — các việc chỉ được gỡ liên kết khỏi dự án.
              </p>
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btn ghost sm danger" type="submit">Xoá dự án “{p.name}”</button>
              </form>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
