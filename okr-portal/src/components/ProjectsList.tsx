'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProgressBar } from '@/components/ui';
import { fmtVnd } from '@/lib/format';
import type { ProjectRow, ProjectStatus } from '@/lib/projects';

// Hằng số nhãn/màu khai lại (KHÔNG import runtime từ lib/projects → tránh kéo pg vào client bundle).
const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Đang chạy',
  done: 'Hoàn thành',
  paused: 'Tạm dừng',
  archived: 'Lưu trữ',
};
const PROJECT_STATUS_CLS: Record<ProjectStatus, string> = {
  active: 'blue',
  done: 'green',
  paused: 'amber',
  archived: 'gray',
};
const STATUS_ORDER: ProjectStatus[] = ['active', 'done', 'paused', 'archived'];

export default function ProjectsList({ projects }: { projects: ProjectRow[] }) {
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fUnit, setFUnit] = useState('');

  const unitList = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) if (p.unit_id && p.unit_name) m.set(p.unit_id, p.unit_name);
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const qlc = q.trim().toLowerCase();
  const fActive = !!(qlc || fStatus || fUnit);
  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (fStatus && p.status !== fStatus) return false;
        if (fUnit && p.unit_id !== fUnit) return false;
        if (qlc) {
          const hay = `${p.name} ${p.code ?? ''} ${p.owner_name ?? ''} ${p.unit_name ?? ''}`.toLowerCase();
          if (!hay.includes(qlc)) return false;
        }
        return true;
      }),
    [projects, fStatus, fUnit, qlc],
  );
  const clearFilter = () => {
    setQ('');
    setFStatus('');
    setFUnit('');
  };

  return (
    <div>
      <div className="filterbar" style={{ marginTop: 2 }}>
        <input
          className="i fb-search"
          placeholder="🔍 Tìm dự án…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="i fb-sel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Trạng thái: tất cả</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fUnit} onChange={(e) => setFUnit(e.target.value)}>
          <option value="">Đơn vị: tất cả</option>
          {unitList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {fActive && (
          <button type="button" className="btn ghost sm" onClick={clearFilter}>
            ✕ Xoá lọc ({filtered.length})
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid two">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="flexbtw" style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ marginBottom: 4 }}>
                    {p.code && <span className="okr-code" style={{ marginRight: 6 }}>{p.code}</span>}
                    <span className={`badge ${PROJECT_STATUS_CLS[p.status]}`} style={{ fontSize: 11 }}>
                      {PROJECT_STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <h3 style={{ margin: '2px 0 4px' }}>{p.name}</h3>
                  <div className="obj-meta">
                    {p.unit_name ? `🏢 ${p.unit_name} · ` : ''}
                    {p.owner_name ? `Chủ trì: ${p.owner_name} · ` : ''}
                    {p.task_count} việc ({p.done_count} xong)
                  </div>
                </div>
                <div style={{ width: 150, flexShrink: 0 }}>
                  <ProgressBar value={p.progress} />
                  <div className="right muted mono" style={{ fontSize: 12 }}>
                    {p.progress.toFixed(0)}%
                  </div>
                </div>
              </div>
              {(p.budget_planned > 0 || p.task_budget_actual > 0) && (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  NS kế hoạch {fmtVnd(p.budget_planned)} · Đã chi (gom việc) {fmtVnd(p.task_budget_actual)}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Không có dự án nào khớp bộ lọc.</p>
        </div>
      )}
    </div>
  );
}
