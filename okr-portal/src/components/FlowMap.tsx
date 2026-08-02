'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mapSetParentAction } from '@/app/map/actions';

// ===== Sơ đồ liên kết OKR kiểu flow-chart (kéo–thả node + nối nhánh cascade) =====
// Node = Objective, đường nối = quan hệ cha→con (alignment/cascade). Kéo nền để di chuyển,
// lăn chuột/nút để zoom, kéo tay nắm node để đổi vị trí (nhớ ở localStorage), kéo chấm ● bên
// phải node CHA thả vào node CON để nối (đặt cấp trên) — chỉ với OKR mình được sửa.
type Level = 'company' | 'division' | 'department' | 'individual';
type Obj = {
  id: string;
  code: string | null;
  title: string;
  level: Level;
  unit_name: string | null;
  owner_name: string | null;
  progress: number;
  parent_id: string | null;
  kr_count: number;
};

const LEVEL_ORDER: Level[] = ['company', 'division', 'department', 'individual'];
const LEVEL_LABEL: Record<Level, string> = { company: 'Công ty', division: 'Khối', department: 'Phòng ban', individual: 'Cá nhân' };
const LEVEL_CLS: Record<Level, string> = { company: 'lv-company', division: 'lv-division', department: 'lv-department', individual: 'lv-individual' };

const NODE_W = 244;
const NODE_H = 104;
const COL_GAP = 96;
const ROW_GAP = 26;

function progColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 50) return '#2563eb';
  if (p >= 10) return '#f59e0b';
  return '#cbd5e1';
}

type Pt = { x: number; y: number };

// Tự bố trí: cột theo cấp, trong cột xếp theo (thứ hạng cha, mã) để giảm chéo.
function autoLayout(objs: Obj[]): Map<string, Pt> {
  const levels = LEVEL_ORDER.filter((lv) => objs.some((o) => o.level === lv));
  const pos = new Map<string, Pt>();
  const rank = new Map<string, number>(); // thứ hạng hàng của mỗi node (để con bám theo cha)
  levels.forEach((lv, colIdx) => {
    const arr = objs.filter((o) => o.level === lv);
    arr.sort((a, b) => {
      const ra = a.parent_id != null ? rank.get(a.parent_id) ?? 9999 : 9999;
      const rb = b.parent_id != null ? rank.get(b.parent_id) ?? 9999 : 9999;
      return ra - rb || (a.code ?? '').localeCompare(b.code ?? '');
    });
    arr.forEach((o, rowIdx) => {
      rank.set(o.id, rowIdx);
      pos.set(o.id, { x: colIdx * (NODE_W + COL_GAP), y: rowIdx * (NODE_H + ROW_GAP) });
    });
  });
  return pos;
}

export default function FlowMap({
  objectives,
  manageableIds,
  periodId,
}: {
  objectives: Obj[];
  manageableIds: string[];
  periodId: string;
}) {
  const router = useRouter();
  const manageable = useMemo(() => new Set(manageableIds), [manageableIds]);
  const objById = useMemo(() => new Map(objectives.map((o) => [o.id, o])), [objectives]);
  const auto = useMemo(() => autoLayout(objectives), [objectives]);

  const [pos, setPos] = useState<Map<string, Pt>>(() => new Map(auto));
  const [view, setView] = useState({ tx: 40, ty: 24, k: 1 });
  const [busy, setBusy] = useState(false);
  const [connect, setConnect] = useState<{ fromId: string; x: number; y: number; overId: string | null } | null>(null);
  const vpRef = useRef<HTMLDivElement | null>(null);
  const LS_KEY = `okrFlowPos_${periodId}`;

  // Nạp vị trí đã lưu (localStorage) chồng lên auto-layout.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, [number, number]>;
        setPos((prev) => {
          const m = new Map(prev);
          for (const o of objectives) if (saved[o.id]) m.set(o.id, { x: saved[o.id][0], y: saved[o.id][1] });
          return m;
        });
      }
    } catch {
      /* bỏ qua localStorage lỗi */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LS_KEY]);

  function savePos(m: Map<string, Pt>) {
    try {
      const obj: Record<string, [number, number]> = {};
      m.forEach((p, id) => (obj[id] = [Math.round(p.x), Math.round(p.y)]));
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {
      /* bỏ qua */
    }
  }

  // Chuyển toạ độ màn hình → toạ độ "thế giới" (trước transform).
  function toWorld(clientX: number, clientY: number): Pt {
    const r = vpRef.current?.getBoundingClientRect();
    const left = r?.left ?? 0;
    const top = r?.top ?? 0;
    return { x: (clientX - left - view.tx) / view.k, y: (clientY - top - view.ty) / view.k };
  }

  // ---------- PAN nền ----------
  const panRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const onPanMove = (e: PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    setView((v) => ({ ...v, tx: p.tx + (e.clientX - p.sx), ty: p.ty + (e.clientY - p.sy) }));
  };
  const onPanEnd = () => {
    panRef.current = null;
    window.removeEventListener('pointermove', onPanMove);
    window.removeEventListener('pointerup', onPanEnd);
    document.body.classList.remove('flow-panning');
  };
  function beginPan(e: React.PointerEvent) {
    // chỉ pan khi bấm nền (không phải node/handle/link)
    const t = e.target as HTMLElement;
    if (t.closest('.flow-node') || t.closest('.flow-handle') || t.closest('a,button')) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanEnd);
    document.body.classList.add('flow-panning');
  }

  // ---------- ZOOM (lăn chuột quanh con trỏ) ----------
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const r = vpRef.current?.getBoundingClientRect();
    const cx = e.clientX - (r?.left ?? 0);
    const cy = e.clientY - (r?.top ?? 0);
    setView((v) => {
      const k2 = Math.min(2, Math.max(0.35, v.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      // giữ điểm dưới con trỏ cố định
      const wx = (cx - v.tx) / v.k;
      const wy = (cy - v.ty) / v.k;
      return { k: k2, tx: cx - wx * k2, ty: cy - wy * k2 };
    });
  }
  function zoomBy(f: number) {
    setView((v) => ({ ...v, k: Math.min(2, Math.max(0.35, v.k * f)) }));
  }
  function fit() {
    if (pos.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pos.forEach((p) => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W); maxY = Math.max(maxY, p.y + NODE_H);
    });
    const r = vpRef.current?.getBoundingClientRect();
    const W = r?.width ?? 900, H = r?.height ?? 560;
    const k = Math.min(1, Math.min((W - 60) / (maxX - minX || 1), (H - 60) / (maxY - minY || 1)));
    setView({ k, tx: (W - (maxX - minX) * k) / 2 - minX * k, ty: 24 - minY * k });
  }
  useEffect(() => {
    const t = setTimeout(fit, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetLayout() {
    const m = new Map(auto);
    setPos(m);
    try { localStorage.removeItem(LS_KEY); } catch { /* bỏ qua */ }
    setTimeout(fit, 20);
  }

  // ---------- Kéo NODE đổi vị trí ----------
  const ndRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const onNodeMove = (e: PointerEvent) => {
    const nd = ndRef.current;
    if (!nd) return;
    const w = toWorld(e.clientX, e.clientY);
    setPos((prev) => {
      const m = new Map(prev);
      m.set(nd.id, { x: w.x - nd.ox, y: w.y - nd.oy });
      return m;
    });
  };
  const onNodeEnd = () => {
    ndRef.current = null;
    window.removeEventListener('pointermove', onNodeMove);
    window.removeEventListener('pointerup', onNodeEnd);
    document.body.classList.remove('flow-panning');
    setPos((m) => { savePos(m); return m; });
  };
  function beginNodeDrag(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    const w = toWorld(e.clientX, e.clientY);
    const p = pos.get(id) ?? { x: 0, y: 0 };
    ndRef.current = { id, ox: w.x - p.x, oy: w.y - p.y };
    window.addEventListener('pointermove', onNodeMove);
    window.addEventListener('pointerup', onNodeEnd);
    document.body.classList.add('flow-panning');
  }

  // ---------- Kéo NỐI (drag ● từ node cha thả vào node con) ----------
  function nodeAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return (el?.closest?.('.flow-node') as HTMLElement | null)?.getAttribute('data-nodeid') ?? null;
  }
  // Node hợp lệ để làm CON của fromId: khác chính nó + không phải tổ tiên của fromId (tránh vòng).
  function isValidChild(fromId: string, childId: string): boolean {
    if (childId === fromId) return false;
    if (!manageable.has(childId)) return false;
    // tổ tiên của fromId
    let cur: string | null = fromId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === childId) return false;
      if (seen.has(cur)) break;
      seen.add(cur);
      cur = objById.get(cur)?.parent_id ?? null;
    }
    return true;
  }
  const connectRef = useRef<typeof connect>(null);
  connectRef.current = connect;
  const onConnMove = (e: PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY);
    const over = nodeAt(e.clientX, e.clientY);
    setConnect((c) => (c ? { ...c, x: w.x, y: w.y, overId: over && isValidChild(c.fromId, over) ? over : null } : c));
  };
  const onConnEnd = (e: PointerEvent) => {
    window.removeEventListener('pointermove', onConnMove);
    window.removeEventListener('pointerup', onConnEnd);
    document.body.classList.remove('flow-panning');
    const c = connectRef.current;
    const over = nodeAt(e.clientX, e.clientY);
    setConnect(null);
    if (c && over && isValidChild(c.fromId, over)) void run(() => mapSetParentAction(over, c.fromId));
  };
  function beginConnect(e: React.PointerEvent, fromId: string) {
    e.stopPropagation();
    e.preventDefault();
    const w = toWorld(e.clientX, e.clientY);
    setConnect({ fromId, x: w.x, y: w.y, overId: null });
    window.addEventListener('pointermove', onConnMove);
    window.addEventListener('pointerup', onConnEnd);
    document.body.classList.add('flow-panning');
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  // Gỡ liên kết (bấm vào đường nối) → đặt con về gốc.
  function detach(childId: string) {
    if (!manageable.has(childId)) {
      alert('Bạn không có quyền sửa liên kết của OKR này.');
      return;
    }
    if (confirm('Gỡ liên kết cấp trên của OKR này?')) void run(() => mapSetParentAction(childId, ''));
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onPanMove);
      window.removeEventListener('pointerup', onPanEnd);
      window.removeEventListener('pointermove', onNodeMove);
      window.removeEventListener('pointerup', onNodeEnd);
      window.removeEventListener('pointermove', onConnMove);
      window.removeEventListener('pointerup', onConnEnd);
      document.body.classList.remove('flow-panning');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kích thước SVG = bao trọn nội dung.
  const bbox = useMemo(() => {
    let maxX = 600, maxY = 400;
    pos.forEach((p) => { maxX = Math.max(maxX, p.x + NODE_W); maxY = Math.max(maxY, p.y + NODE_H); });
    return { w: maxX + 200, h: maxY + 200 };
  }, [pos]);

  // Đường nối cha→con (bezier ngang).
  const edges = useMemo(() => {
    const list: { id: string; d: string; color: string; childId: string; mid: Pt }[] = [];
    for (const o of objectives) {
      if (!o.parent_id) continue;
      const cp = pos.get(o.parent_id);
      const kp = pos.get(o.id);
      if (!cp || !kp) continue;
      const x1 = cp.x + NODE_W, y1 = cp.y + NODE_H / 2;
      const x2 = kp.x, y2 = kp.y + NODE_H / 2;
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
      list.push({
        id: o.id,
        childId: o.id,
        d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        color: progColor(o.progress),
        mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      });
    }
    return list;
  }, [objectives, pos]);

  const connFrom = connect ? pos.get(connect.fromId) : null;

  return (
    <>
      <div className="flow-toolbar">
        <span className="muted flow-hint">
          Kéo <b>nền</b> để di chuyển · lăn chuột để zoom · kéo <b>⠿</b> để dời node · kéo chấm <b className="flow-dot-lbl">●</b> từ node cha thả vào node con để <b>nối cascade</b> · bấm đường nối để gỡ.
        </span>
        <div className="flow-tools">
          <button type="button" className="btn ghost sm" onClick={resetLayout} title="Tự sắp xếp lại">↺ Tự sắp xếp</button>
          <button type="button" className="btn ghost sm" onClick={() => zoomBy(1 / 1.15)} aria-label="Thu nhỏ">−</button>
          <span className="flow-zoom">{Math.round(view.k * 100)}%</span>
          <button type="button" className="btn ghost sm" onClick={() => zoomBy(1.15)} aria-label="Phóng to">＋</button>
          <button type="button" className="btn ghost sm" onClick={fit} title="Vừa màn hình">⤢ Vừa khung</button>
        </div>
      </div>

      <div
        ref={vpRef}
        className="flow-vp no-swipe"
        onPointerDown={beginPan}
        onWheel={onWheel}
      >
        <div className="flow-layer" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})` }}>
          <svg className="flow-svg" width={bbox.w} height={bbox.h} style={{ overflow: 'visible' }}>
            <defs>
              <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((e) => (
              <path
                key={e.id}
                className="flow-edge"
                d={e.d}
                stroke={e.color}
                markerEnd="url(#flow-arrow)"
                onClick={() => detach(e.childId)}
              />
            ))}
            {connect && connFrom && (
              <path
                className="flow-edge tmp"
                d={`M ${connFrom.x + NODE_W} ${connFrom.y + NODE_H / 2} L ${connect.x} ${connect.y}`}
              />
            )}
          </svg>

          {objectives.map((o) => {
            const p = pos.get(o.id);
            if (!p) return null;
            const canEdit = manageable.has(o.id);
            const isTarget = connect?.overId === o.id;
            return (
              <div
                key={o.id}
                data-nodeid={o.id}
                className={`flow-node ${LEVEL_CLS[o.level]} ${isTarget ? 'is-target' : ''}`}
                style={{ left: p.x, top: p.y, width: NODE_W }}
              >
                <div className="flow-node-top" onPointerDown={(e) => beginNodeDrag(e, o.id)}>
                  <span className="flow-grip" title="Kéo để dời node">⠿</span>
                  <span className={`lv-badge ${LEVEL_CLS[o.level]}`}>{LEVEL_LABEL[o.level]}</span>
                  {o.code && <span className="okr-code">{o.code}</span>}
                </div>
                <div className="flow-node-ttl">
                  <Link href={`/objectives/${o.id}`}>{o.title}</Link>
                </div>
                <div className="flow-node-meta">
                  {o.unit_name ? o.unit_name : 'Toàn công ty'}
                  {o.owner_name ? ` · ${o.owner_name}` : ''} · {o.kr_count} KR
                </div>
                <div className="flow-node-prog">
                  <span className="map-mini"><i style={{ width: `${Math.round(o.progress)}%`, background: progColor(o.progress) }} /></span>
                  <span className="flow-prog-n">{Math.round(o.progress)}%</span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="flow-handle"
                    title="Kéo thả vào OKR con để nối cấp dưới"
                    aria-label="Nối cascade"
                    onPointerDown={(e) => beginConnect(e, o.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
        {busy && <div className="flow-busy">Đang lưu…</div>}
      </div>
    </>
  );
}
