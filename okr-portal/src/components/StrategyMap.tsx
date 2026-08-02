'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mapSetBscAction } from '@/app/map/actions';

// SƠ ĐỒ CHIẾN LƯỢC BSC — 4 tầng nhân-quả. KÉO–THẢ card giữa các tầng để đổi viễn cảnh (mapSetBscAction),
// chỉ với OKR mình được sửa. Card vẫn bấm mở chi tiết; kéo bằng tay nắm ⠿.
// (KHÔNG import '@/lib/okr'/'@/lib/format' — sẽ kéo pg vào client bundle; khai lại hằng số tại chỗ.)
type BscPerspective = 'financial' | 'customer' | 'process' | 'learning';
const BSC_PERSPECTIVE_LABEL: Record<BscPerspective, string> = {
  financial: 'Tài chính', customer: 'Khách hàng', process: 'Quy trình nội bộ', learning: 'Học hỏi & Phát triển',
};
const BSC_PERSPECTIVE_ICON: Record<BscPerspective, string> = {
  financial: '💰', customer: '🛍️', process: '⚙️', learning: '🎓',
};
function progressColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 50) return '#2563eb';
  if (p >= 10) return '#f59e0b';
  return '#cbd5e1';
}
type Obj = {
  id: string; code: string | null; title: string; level: string;
  unit_name: string | null; progress: number; bsc_perspective: BscPerspective | null;
};

const ORDER: BscPerspective[] = ['financial', 'customer', 'process', 'learning'];
const SUB: Record<BscPerspective, string> = {
  financial: 'Kết quả tài chính — đích đến của chiến lược',
  customer: 'Giá trị & trải nghiệm khách hàng',
  process: 'Quy trình nội bộ vận hành xuất sắc',
  learning: 'Nền móng: con người, tổ chức, công nghệ',
};
const LEVEL_ORDER: Record<string, number> = { company: 0, division: 1, department: 2, individual: 3 };

export default function StrategyMap({ objectives, manageableIds = [] }: { objectives: Obj[]; manageableIds?: string[] }) {
  const router = useRouter();
  const manageable = new Set(manageableIds);
  const byBsc = new Map<BscPerspective, Obj[]>();
  for (const p of ORDER) byBsc.set(p, []);
  for (const o of objectives) if (o.bsc_perspective) byBsc.get(o.bsc_perspective)!.push(o);
  for (const arr of byBsc.values())
    arr.sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || (a.code ?? '').localeCompare(b.code ?? ''));
  const avg = (a: Obj[]) => (a.length ? Math.round(a.reduce((s, o) => s + o.progress, 0) / a.length) : 0);

  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; label: string } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; from: string } | null>(null);

  function bandAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return (el?.closest?.('[data-band]') as HTMLElement | null)?.getAttribute('data-band') ?? null;
  }
  const onMove = (e: PointerEvent) => {
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const b = bandAt(e.clientX, e.clientY);
    setHot(b);
    // tự cuộn khi kéo sát mép trên/dưới
    const H = window.innerHeight;
    if (e.clientY < 80) window.scrollBy(0, -14);
    else if (e.clientY > H - 80) window.scrollBy(0, 14);
  };
  const onUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.classList.remove('map-dragging');
    const info = dragRef.current;
    const band = bandAt(e.clientX, e.clientY);
    setDrag(null); setHot(null); dragRef.current = null;
    if (info && band && band !== info.from) void run(() => mapSetBscAction(info.id, band));
  };
  function begin(e: React.PointerEvent, o: Obj) {
    if (!manageable.has(o.id) || busy) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { id: o.id, from: o.bsc_perspective ?? '' };
    setDrag({ id: o.id, x: e.clientX, y: e.clientY, label: `${o.code ? o.code + ' · ' : ''}${o.title}` });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.classList.add('map-dragging');
  }
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); } catch (err) { alert(err instanceof Error ? err.message : 'Có lỗi xảy ra.'); }
    finally { router.refresh(); setBusy(false); }
  }
  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.classList.remove('map-dragging');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="smap">
      <p className="smap-note muted">
        Đọc từ <b>dưới lên</b>: nền móng (Học hỏi) → Quy trình → Khách hàng → kết quả Tài chính. Mũi tên = quan hệ nhân-quả.
        Kéo tay nắm <b>⠿</b> để chuyển OKR sang tầng viễn cảnh khác.
      </p>
      {ORDER.map((p, i) => {
        const arr = byBsc.get(p) ?? [];
        const a = avg(arr);
        return (
          <div key={p} data-band={p} className={`smap-band bsc-${p} ${hot === p && drag ? 'drop-hot' : ''}`}>
            <div className="smap-side">
              <span className="smap-ic" aria-hidden>{BSC_PERSPECTIVE_ICON[p]}</span>
              <div>
                <div className="smap-ptitle">{BSC_PERSPECTIVE_LABEL[p]}</div>
                <div className="smap-psub">{SUB[p]}</div>
              </div>
              <div className="smap-avg">
                <span className="map-mini"><i style={{ width: `${a}%`, background: progressColor(a) }} /></span>
                <b>{a}%</b>
              </div>
            </div>
            <div className="smap-objs">
              {arr.length === 0 && <div className="smap-empty">Kéo OKR vào đây để gắn tầng này</div>}
              {arr.map((o) => {
                const canEdit = manageable.has(o.id);
                return (
                  <div key={o.id} className={`smap-obj lv-${o.level} no-swipe ${drag?.id === o.id ? 'is-dragging' : ''}`}>
                    <div className="smap-obj-top">
                      {canEdit && (
                        <button type="button" className="smap-grip" title="Kéo để đổi viễn cảnh" aria-label="Kéo để đổi viễn cảnh"
                          onPointerDown={(e) => begin(e, o)}>⠿</button>
                      )}
                      {o.code && <span className="okr-code sm">{o.code}</span>}
                      <span className="smap-obj-prog" style={{ color: progressColor(o.progress) }}>{Math.round(o.progress)}%</span>
                    </div>
                    <Link href={`/objectives/${o.id}`} className="smap-obj-ttl">{o.title}</Link>
                    {o.unit_name && <div className="smap-obj-unit">{o.unit_name}</div>}
                    <span className="smap-obj-bar"><i style={{ width: `${Math.round(o.progress)}%`, background: progressColor(o.progress) }} /></span>
                  </div>
                );
              })}
            </div>
            {i < ORDER.length - 1 && <div className="smap-arrow" aria-hidden>▲</div>}
          </div>
        );
      })}
      {drag && <div className="map-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>{drag.label}</div>}
    </div>
  );
}
