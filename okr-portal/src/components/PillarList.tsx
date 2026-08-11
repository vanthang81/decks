'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export type PillarItem = {
  id: string; code: string | null; title: string;
  bscLabel: string | null; bscIcon: string | null;
  owner: string | null; childCount: number; progress: number; progColor: string;
};

// Danh sách trụ cột chiến lược. CEO/CFO sắp xếp lại được: KÉO–THẢ (máy tính, qua tay cầm ⠿) hoặc
// nút ↑/↓ (chạy tốt cả trên điện thoại). Thứ tự lưu vào cột sort qua reorder().
export default function PillarList({
  pillars, canEdit, reorder,
}: {
  pillars: PillarItem[];
  canEdit: boolean;
  reorder: (orderedIds: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(pillars);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Đồng bộ khi server trả thứ tự mới (sau khi lưu + refresh).
  const key = pillars.map((p) => p.id).join(',');
  useEffect(() => { setItems(pillars); /* eslint-disable-next-line */ }, [key]);

  const persist = (next: PillarItem[]) => {
    setItems(next);
    startTransition(async () => {
      try { await reorder(next.map((i) => i.id)); toast('Đã cập nhật thứ tự', 'success'); router.refresh(); } catch { /* giữ optimistic */ }
    });
  };

  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const from = items.findIndex((i) => i.id === fromId);
    const to = items.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    persist(next);
  };
  const nudge = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  return (
    <div className={`pil-list${pending ? ' pil-saving' : ''}`}>
      {items.map((p, i) => (
        <div
          key={p.id}
          className={`obj-row pil-item${canEdit ? ' pil-editable' : ''}${overId === p.id && dragId ? ' pil-over' : ''}${dragId === p.id ? ' pil-dragging' : ''}`}
          onDragOver={canEdit ? (e) => { e.preventDefault(); if (overId !== p.id) setOverId(p.id); } : undefined}
          onDrop={canEdit ? (e) => { e.preventDefault(); if (dragId) moveTo(dragId, p.id); setDragId(null); setOverId(null); } : undefined}
        >
          {canEdit && (
            <div className="pil-ctrls">
              <span
                className="pil-handle"
                draggable
                onDragStart={(e) => { setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                title="Kéo để sắp xếp"
                aria-hidden
              >⠿</span>
              <span className="pil-arrows">
                <button type="button" className="pil-mv" onClick={() => nudge(i, -1)} disabled={i === 0 || pending} aria-label="Lên">▲</button>
                <button type="button" className="pil-mv" onClick={() => nudge(i, 1)} disabled={i === items.length - 1 || pending} aria-label="Xuống">▼</button>
              </span>
            </div>
          )}
          <Link className="obj-main pil-main" href={`/objectives/${p.id}`}>
            <div className="ttl">
              {p.code && <span className="okr-code">{p.code}</span>}
              {p.bscLabel && <span className="badge bsc" title={p.bscLabel}>{p.bscIcon} {p.bscLabel}</span>}
              <span className="ttl-txt">{p.title}</span>
            </div>
            <div className="obj-meta">
              {p.owner ? `Chủ trì: ${p.owner} · ` : ''}{p.childCount} OKR năm liên kết lên
            </div>
          </Link>
          <div className="obj-prog">
            <span className="map-mini"><i style={{ width: `${Math.round(p.progress)}%`, background: p.progColor }} /></span>
            <div className="right muted mono" style={{ fontSize: 12 }}>{Math.round(p.progress)}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}
