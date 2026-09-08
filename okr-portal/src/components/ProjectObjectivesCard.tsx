'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

type Obj = { id: string; code: string | null; title: string; unit_name: string | null };

// OKR LIÊN QUAN của dự án (đặt ở cấp dự án — CFO 08/09). Hiện chip điều hướng tới OKR; người quản
// dự án bấm "Chọn OKR" để tick nhiều objective. Việc trong dự án KHÔNG bắt buộc gắn OKR nữa.
export default function ProjectObjectivesCard({
  projectId,
  linked,
  options,
  canManage,
  save,
}: {
  projectId: string;
  linked: Obj[];
  options: Obj[];
  canManage: boolean;
  save: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set(linked.map((o) => o.id)));
  const [pending, startTransition] = useTransition();

  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = useMemo(() => {
    const k = norm(q.trim());
    if (!k) return options;
    return options.filter((o) => norm(`${o.code ?? ''} ${o.title} ${o.unit_name ?? ''}`).includes(k));
  }, [q, options]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const onSave = () => {
    const fd = new FormData();
    fd.set('project_id', projectId);
    for (const id of sel) fd.append('objective_ids', id);
    startTransition(async () => {
      try { await save(fd); toast('Đã cập nhật OKR liên quan', 'success'); setEditing(false); router.refresh(); }
      catch (e) { toast(e instanceof Error ? e.message : String(e), 'error'); }
    });
  };

  return (
    <div className="card">
      <div className="flexbtw flexbtw-top">
        <h3 style={{ marginTop: 0 }}>🎯 OKR liên quan {linked.length ? `(${linked.length})` : ''}</h3>
        {canManage && !editing && (
          <button type="button" className="btn ghost sm" onClick={() => { setSel(new Set(linked.map((o) => o.id))); setEditing(true); }}>
            {linked.length ? 'Sửa' : 'Chọn OKR'}
          </button>
        )}
      </div>

      {!editing && (
        linked.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Chưa gắn OKR nào cho dự án. {canManage ? 'Bấm "Chọn OKR" để gắn các Objective mà dự án này đóng góp.' : ''}
            {' '}Việc trong dự án không cần gắn OKR riêng — OKR khai ở đây là đủ.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {linked.map((o) => (
              <Link key={o.id} href={`/objectives/${o.id}`} className="okr-chip-link">
                {o.code ? <span className="okr-code" style={{ marginRight: 6 }}>{o.code}</span> : null}
                {o.title}
                {o.unit_name ? <span className="muted" style={{ fontSize: 11.5 }}> · {o.unit_name}</span> : null}
              </Link>
            ))}
          </div>
        )
      )}

      {editing && (
        <div>
          <input className="i" placeholder="Tìm OKR theo mã / tên / đơn vị…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: 12, margin: 0, fontSize: 13 }}>Không có OKR khớp.</p>
            ) : filtered.map((o) => (
              <label key={o.id} className="okr-pick-row">
                <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} style={{ width: 'auto', marginTop: 2 }} />
                <span>
                  {o.code ? <span className="okr-code" style={{ marginRight: 6 }}>{o.code}</span> : null}
                  {o.title}
                  {o.unit_name ? <span className="muted" style={{ fontSize: 11.5 }}> · {o.unit_name}</span> : null}
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button type="button" className="btn" onClick={onSave} disabled={pending}>{pending ? 'Đang lưu…' : `Lưu (${sel.size})`}</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)} disabled={pending}>Huỷ</button>
          </div>
        </div>
      )}
    </div>
  );
}
