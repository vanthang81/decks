'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ClearFiltersButton from '@/components/ClearFiltersButton';
import NavIcon from '@/components/NavIcon';
import { ProgressBar } from '@/components/ui';
import { fmtVnd } from '@/lib/format';
import type { ProjectRow, ProjectStatus } from '@/lib/projects';

const FAV_KEY = 'okr_proj_favs'; // dự án yêu thích (theo trình duyệt) — ưu tiên xếp lên đầu

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

export default function ProjectsList({ projects, initialOwner, currentEmail }: { projects: ProjectRow[]; initialOwner?: string; currentEmail?: string }) {
  const meLc = (currentEmail ?? '').toLowerCase();
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fOwner, setFOwner] = useState(initialOwner ?? '');
  const fOwnerLc = fOwner.toLowerCase();

  // Dự án yêu thích (⭐) — nhớ theo trình duyệt; favourite được ưu tiên xếp lên đầu.
  const [favs, setFavs] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);
  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  const ownerName = useMemo(
    () => projects.find((p) => (p.owner_email ?? '').toLowerCase() === fOwnerLc)?.owner_name || fOwner,
    [projects, fOwnerLc, fOwner],
  );

  const unitList = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) if (p.unit_id && p.unit_name) m.set(p.unit_id, p.unit_name);
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const qlc = q.trim().toLowerCase();
  const fActive = !!(qlc || fStatus || fUnit || fOwner);
  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (fOwnerLc && (p.owner_email ?? '').toLowerCase() !== fOwnerLc) return false;
        if (fStatus && p.status !== fStatus) return false;
        if (fUnit && p.unit_id !== fUnit) return false;
        if (qlc) {
          const hay = `${p.name} ${p.code ?? ''} ${p.owner_name ?? ''} ${p.unit_name ?? ''}`.toLowerCase();
          if (!hay.includes(qlc)) return false;
        }
        return true;
      }),
    [projects, fOwnerLc, fStatus, fUnit, qlc],
  );
  // Thứ tự ưu tiên: (1) YÊU THÍCH lên đầu; (2) trong mỗi nhóm, dự án mình CHỦ TRÌ đứng trước.
  // Giữ nguyên thứ tự tương đối phần còn lại (Array.sort ổn định).
  const ordered = useMemo(() => {
    const rank = (p: ProjectRow) =>
      (favs.has(p.id) ? 2 : 0) + (meLc && (p.owner_email ?? '').toLowerCase() === meLc ? 1 : 0);
    const arr = [...filtered];
    arr.sort((a, b) => rank(b) - rank(a));
    return arr;
  }, [filtered, favs, meLc]);
  const clearFilter = () => {
    setQ('');
    setFStatus('');
    setFUnit('');
    setFOwner('');
  };

  return (
    <div>
      {fOwner && (
        <div className="person-filter">
          <span>👤 Đang lọc dự án của: <b>{ownerName}</b></span>
          <button type="button" className="ntf-link" onClick={() => setFOwner('')}>✕ Bỏ lọc người</button>
        </div>
      )}
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
        {fActive && <ClearFiltersButton onClear={clearFilter} count={filtered.length} />}
      </div>

      {ordered.length > 0 ? (
        <div className="grid two">
          {ordered.map((p) => {
            const isFav = favs.has(p.id);
            return (
            <div key={p.id} className="card pj-card">
              <button
                type="button"
                className={`pj-fav${isFav ? ' on' : ''}`}
                onClick={() => toggleFav(p.id)}
                aria-pressed={isFav}
                title={isFav ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích (ghim lên đầu)'}
                aria-label={isFav ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
              >
                <NavIcon name="star" />
              </button>
              <Link
                href={`/projects/${p.id}`}
                className="pj-card-link"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
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
                  <div style={{ width: 150, flexShrink: 0, paddingRight: 26 }}>
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
            </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Không có dự án nào khớp bộ lọc.</p>
        </div>
      )}
    </div>
  );
}
