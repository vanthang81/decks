'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mapSetParentAction } from '@/app/map/actions';

// ===== Sơ đồ liên kết OKR kiểu flow-chart (tidy-tree + lọc + gập/mở layer) =====
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
const LAYER_OPTS = [
  { idx: 0, label: 'Công ty' },
  { idx: 1, label: '+ Khối' },
  { idx: 2, label: '+ Phòng' },
  { idx: 3, label: 'Tất cả' },
];

const NODE_W = 244;
const NODE_H = 120;
const COL_GAP = 96;
const ROW_GAP = 26;

function progColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 50) return '#2563eb';
  if (p >= 10) return '#f59e0b';
  return '#cbd5e1';
}

type Pt = { x: number; y: number };

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

  // Con theo parent_id (toàn bộ) + hàm hậu duệ.
  const childrenAll = useMemo(() => {
    const m = new Map<string, Obj[]>();
    for (const o of objectives) if (o.parent_id) (m.get(o.parent_id) ?? m.set(o.parent_id, []).get(o.parent_id)!).push(o);
    for (const arr of m.values()) arr.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
    return m;
  }, [objectives]);
  function descendants(id: string): string[] {
    const out: string[] = [];
    const stack = [...(childrenAll.get(id) ?? [])];
    const seen = new Set<string>();
    while (stack.length) {
      const c = stack.pop()!;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c.id);
      for (const cc of childrenAll.get(c.id) ?? []) stack.push(cc);
    }
    return out;
  }
  const levelIdxOf = (o: Obj) => LEVEL_ORDER.indexOf(o.level);

  // ---------- Bộ lọc / gập ----------
  const [maxLevel, setMaxLevel] = useState(3);
  const [focusId, setFocusId] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Danh sách nhánh để "Xem nhánh" (Công ty + Khối).
  const branchOpts = useMemo(
    () =>
      objectives
        .filter((o) => o.level === 'company' || o.level === 'division')
        .sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')),
    [objectives],
  );

  // Tập hiển thị = focus → theo lớp → bỏ node có tổ tiên đang gập.
  const { visible, baseIds, hiddenCount } = useMemo(() => {
    let base = objectives;
    if (focusId && objById.has(focusId)) {
      const keep = new Set<string>([focusId, ...descendants(focusId)]);
      base = base.filter((o) => keep.has(o.id));
    }
    base = base.filter((o) => levelIdxOf(o) <= maxLevel);
    const bIds = new Set(base.map((o) => o.id));
    const hidden = (o: Obj) => {
      let cur = o.parent_id;
      while (cur && bIds.has(cur)) {
        if (collapsed.has(cur)) return true;
        cur = objById.get(cur)?.parent_id ?? null;
      }
      return false;
    };
    const vis = base.filter((o) => !hidden(o));
    // số node bị ẩn do gập, theo từng node cha đang gập
    const hc = new Map<string, number>();
    for (const o of base) if (collapsed.has(o.id)) hc.set(o.id, descendants(o.id).filter((d) => bIds.has(d)).length);
    return { visible: vis, baseIds: bIds, hiddenCount: hc };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectives, focusId, maxLevel, collapsed]);

  // ---------- Tidy-tree layout (cột theo ĐỘ SÂU hiển thị, cha canh giữa con) ----------
  const tidy = useMemo(() => {
    const visSet = new Set(visible.map((o) => o.id));
    const vChildren = new Map<string, Obj[]>();
    const isRoot = (o: Obj) => !(o.parent_id && visSet.has(o.parent_id));
    for (const o of visible)
      if (!isRoot(o)) (vChildren.get(o.parent_id!) ?? vChildren.set(o.parent_id!, []).get(o.parent_id!)!).push(o);
    for (const arr of vChildren.values()) arr.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
    // Cột = LỚN HƠN của (cấp tổ chức) và (cột cha + 1) → con LUÔN nằm phải cha (kể cả cùng cấp,
    // vd apex "Thương hiệu vàng Quốc dân" bao trùm các OKR Công ty), nhưng node rời vẫn giữ cột theo cấp.
    const minLevel = visible.length ? Math.min(...visible.map(levelIdxOf)) : 0;
    const pos = new Map<string, Pt>();
    let cursor = 0;
    const place = (o: Obj, parentCol: number) => {
      const col = Math.max(levelIdxOf(o) - minLevel, parentCol + 1);
      const kids = vChildren.get(o.id) ?? [];
      let y: number;
      if (kids.length === 0) {
        y = cursor;
        cursor += NODE_H + ROW_GAP;
      } else {
        for (const k of kids) place(k, col);
        y = (pos.get(kids[0].id)!.y + pos.get(kids[kids.length - 1].id)!.y) / 2;
      }
      pos.set(o.id, { x: col * (NODE_W + COL_GAP), y });
    };
    visible
      .filter(isRoot)
      .sort((a, b) => levelIdxOf(a) - levelIdxOf(b) || (a.code ?? '').localeCompare(b.code ?? ''))
      .forEach((r) => place(r, -1));
    return pos;
  }, [visible, objById]);

  // Vị trí người dùng tự kéo (đè lên tidy). Lưu localStorage.
  const [override, setOverride] = useState<Map<string, Pt>>(new Map());
  const LS_KEY = `okrFlowPos_${periodId}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Record<string, [number, number]>;
        const m = new Map<string, Pt>();
        for (const id in s) m.set(id, { x: s[id][0], y: s[id][1] });
        setOverride(m);
      }
    } catch {
      /* bỏ qua */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LS_KEY]);
  function saveOverride(m: Map<string, Pt>) {
    try {
      const o: Record<string, [number, number]> = {};
      m.forEach((p, id) => (o[id] = [Math.round(p.x), Math.round(p.y)]));
      localStorage.setItem(LS_KEY, JSON.stringify(o));
    } catch {
      /* bỏ qua */
    }
  }
  const posOf = (id: string): Pt => override.get(id) ?? tidy.get(id) ?? { x: 0, y: 0 };

  // ---------- View (pan/zoom) ----------
  const [view, setView] = useState({ tx: 40, ty: 24, k: 1 });
  const [busy, setBusy] = useState(false);
  const [connect, setConnect] = useState<{ fromId: string; x: number; y: number; overId: string | null } | null>(null);
  const vpRef = useRef<HTMLDivElement | null>(null);

  function toWorld(clientX: number, clientY: number): Pt {
    const r = vpRef.current?.getBoundingClientRect();
    return { x: (clientX - (r?.left ?? 0) - view.tx) / view.k, y: (clientY - (r?.top ?? 0) - view.ty) / view.k };
  }

  // PAN
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
    const t = e.target as HTMLElement;
    if (t.closest('.flow-node') || t.closest('.flow-handle') || t.closest('a,button')) return;
    panRef.current = { sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanEnd);
    document.body.classList.add('flow-panning');
  }

  // ZOOM
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const r = vpRef.current?.getBoundingClientRect();
    const cx = e.clientX - (r?.left ?? 0);
    const cy = e.clientY - (r?.top ?? 0);
    setView((v) => {
      const k2 = Math.min(2, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const wx = (cx - v.tx) / v.k;
      const wy = (cy - v.ty) / v.k;
      return { k: k2, tx: cx - wx * k2, ty: cy - wy * k2 };
    });
  }
  function zoomBy(f: number) {
    setView((v) => ({ ...v, k: Math.min(2, Math.max(0.3, v.k * f)) }));
  }
  function fit() {
    if (visible.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of visible) {
      const p = posOf(o.id);
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + NODE_W); maxY = Math.max(maxY, p.y + NODE_H);
    }
    const r = vpRef.current?.getBoundingClientRect();
    const W = r?.width ?? 900, H = r?.height ?? 560;
    const k = Math.min(1, Math.min((W - 60) / (maxX - minX || 1), (H - 60) / (maxY - minY || 1)));
    setView({ k, tx: (W - (maxX - minX) * k) / 2 - minX * k, ty: 26 - minY * k });
  }
  // Tự vừa khung mỗi khi tập hiển thị đổi (đổi lớp/nhánh/gập).
  useEffect(() => {
    const t = setTimeout(fit, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLevel, focusId, collapsed]);

  // Kéo NODE
  const ndRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const onNodeMove = (e: PointerEvent) => {
    const nd = ndRef.current;
    if (!nd) return;
    const w = toWorld(e.clientX, e.clientY);
    setOverride((prev) => {
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
    setOverride((m) => { saveOverride(m); return m; });
  };
  function beginNodeDrag(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    const w = toWorld(e.clientX, e.clientY);
    const p = posOf(id);
    ndRef.current = { id, ox: w.x - p.x, oy: w.y - p.y };
    window.addEventListener('pointermove', onNodeMove);
    window.addEventListener('pointerup', onNodeEnd);
    document.body.classList.add('flow-panning');
  }

  // Kéo NỐI
  function nodeAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return (el?.closest?.('.flow-node') as HTMLElement | null)?.getAttribute('data-nodeid') ?? null;
  }
  function isValidChild(fromId: string, childId: string): boolean {
    if (childId === fromId || !manageable.has(childId)) return false;
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

  // Gập/mở
  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const m = new Set(prev);
      if (m.has(id)) m.delete(id);
      else m.add(id);
      return m;
    });
  }
  function collapseAll() {
    setCollapsed(new Set(objectives.filter((o) => (childrenAll.get(o.id)?.length ?? 0) > 0).map((o) => o.id)));
  }
  function expandAll() {
    setCollapsed(new Set());
  }
  function autoArrange() {
    setOverride(new Map());
    try { localStorage.removeItem(LS_KEY); } catch { /* bỏ qua */ }
    setTimeout(fit, 30);
  }

  // SVG bao trọn
  const bbox = useMemo(() => {
    let maxX = 400, maxY = 300;
    for (const o of visible) {
      const p = posOf(o.id);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H);
    }
    return { w: maxX + 200, h: maxY + 200 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tidy, override]);

  const visSet = useMemo(() => new Set(visible.map((o) => o.id)), [visible]);
  const edges = useMemo(() => {
    const list: { id: string; d: string; color: string }[] = [];
    for (const o of visible) {
      if (!o.parent_id || !visSet.has(o.parent_id)) continue;
      const cp = posOf(o.parent_id);
      const kp = posOf(o.id);
      const x1 = cp.x + NODE_W, y1 = cp.y + NODE_H / 2, x2 = kp.x, y2 = kp.y + NODE_H / 2;
      const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
      list.push({ id: o.id, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, color: progColor(o.progress) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tidy, override]);

  const connFrom = connect ? posOf(connect.fromId) : null;
  const total = objectives.length;

  return (
    <>
      <div className="flow-filters">
        <div className="flow-fl-grp">
          <span className="flow-fl-lbl">Lớp:</span>
          <div className="flow-seg">
            {LAYER_OPTS.map((l) => (
              <button key={l.idx} type="button" className={maxLevel === l.idx ? 'on' : ''} onClick={() => setMaxLevel(l.idx)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flow-fl-grp">
          <span className="flow-fl-lbl">Xem nhánh:</span>
          <select value={focusId} onChange={(e) => setFocusId(e.target.value)}>
            <option value="">Tất cả ({total})</option>
            {branchOpts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ? o.code + ' · ' : ''}{o.title.length > 40 ? o.title.slice(0, 40) + '…' : o.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flow-fl-grp">
          <button type="button" className="btn ghost sm" onClick={expandAll}>⊕ Mở tất cả</button>
          <button type="button" className="btn ghost sm" onClick={collapseAll}>⊖ Thu gọn tất cả</button>
        </div>
      </div>

      <div className="flow-toolbar">
        <span className="muted flow-hint">
          Kéo <b>nền</b> để di chuyển · lăn chuột để zoom · kéo <b>⠿</b> để dời node · kéo chấm <b className="flow-dot-lbl">●</b> từ node cha thả vào node con để <b>nối cascade</b> · <b>±</b> gập/mở nhánh · bấm đường nối để gỡ.
        </span>
        <div className="flow-tools">
          <span className="muted" style={{ fontSize: 12 }}>Hiện {visible.length}/{total}</span>
          <button type="button" className="btn ghost sm" onClick={autoArrange} title="Tự sắp xếp lại">↺ Tự sắp xếp</button>
          <button type="button" className="btn ghost sm" onClick={() => zoomBy(1 / 1.15)} aria-label="Thu nhỏ">−</button>
          <span className="flow-zoom">{Math.round(view.k * 100)}%</span>
          <button type="button" className="btn ghost sm" onClick={() => zoomBy(1.15)} aria-label="Phóng to">＋</button>
          <button type="button" className="btn ghost sm" onClick={fit} title="Vừa màn hình">⤢ Vừa khung</button>
        </div>
      </div>

      <div ref={vpRef} className="flow-vp no-swipe" onPointerDown={beginPan} onWheel={onWheel}>
        <div className="flow-layer" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})` }}>
          <svg className="flow-svg" width={bbox.w} height={bbox.h} style={{ overflow: 'visible' }}>
            <defs>
              {/* userSpaceOnUse = cỡ mũi tên cố định (không phồng theo độ dày nét); fill theo màu nét (context-stroke) → khớp màu đường + tip đúng cạnh node */}
              <marker id="flow-arrow" markerWidth="11" markerHeight="11" refX="9.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M1,1 L9.5,5 L1,9 Z" fill="context-stroke" />
              </marker>
            </defs>
            {edges.map((e) => (
              <path key={e.id} className="flow-edge" d={e.d} stroke={e.color} markerEnd="url(#flow-arrow)" onClick={() => detach(e.id)} />
            ))}
            {connect && connFrom && (
              <path className="flow-edge tmp" d={`M ${connFrom.x + NODE_W} ${connFrom.y + NODE_H / 2} L ${connect.x} ${connect.y}`} />
            )}
          </svg>

          {visible.map((o) => {
            const p = posOf(o.id);
            const canEdit = manageable.has(o.id);
            const isTarget = connect?.overId === o.id;
            const hasKids = (childrenAll.get(o.id)?.length ?? 0) > 0;
            const isCollapsed = collapsed.has(o.id);
            const hid = hiddenCount.get(o.id) ?? 0;
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
                  {hasKids && (
                    <button
                      type="button"
                      className="flow-collapse"
                      title={isCollapsed ? 'Mở nhánh con' : 'Thu gọn nhánh con'}
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(o.id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {isCollapsed ? `+${hid || ''}` : '–'}
                    </button>
                  )}
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
        {visible.length === 0 && <div className="flow-empty-c">Không có OKR nào khớp bộ lọc.</div>}
        {busy && <div className="flow-busy">Đang lưu…</div>}
      </div>
    </>
  );
}
