'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ClearFiltersButton from '@/components/ClearFiltersButton';
import { ProgressBar } from './ui';
import SearchSelect from '@/components/SearchSelect';
import UserLink from '@/components/UserLink';
import { useToast } from '@/components/ToastProvider';
import { unitIcon } from '@/lib/unit-icons';
import { naturalCodeCompare } from '@/lib/sortcode';
import { OBJ_STATUS_LABEL, OBJ_STATUSES } from '@/lib/okr-status';

// Kiểu dữ liệu phẳng truyền từ server (chỉ field cần cho cây — đều serializable).
export type TreeObjective = {
  id: string;
  code: string | null;
  parent_id: string | null;
  level: string;
  title: string;
  unit_id: string | null;
  unit_name: string | null;
  unit_code: string | null;
  owner_name: string | null;
  owner_email: string | null;
  status: string;
  okr_type: string;
  kr_count: number;
  progress: number;
};

const LEVEL_LABEL: Record<string, string> = {
  company: 'Công ty',
  division: 'Khối',
  department: 'Phòng',
  individual: 'Cá nhân',
};
const STATUS_LABEL: Record<string, string> = OBJ_STATUS_LABEL;
const TYPE_LABEL: Record<string, string> = {
  committed: 'Cam kết',
  aspirational: 'Khát vọng',
  learning: 'Học hỏi',
};

type Node = TreeObjective & { depth: number; children: Node[] };

// Dựng cây từ danh sách phẳng theo parent_id (gốc = không có parent trong tập).
function buildTree(items: TreeObjective[]): Node[] {
  const byId = new Map(items.map((o) => [o.id, o]));
  const childrenOf = new Map<string, TreeObjective[]>();
  const roots: TreeObjective[] = [];
  for (const o of items) {
    if (o.parent_id && byId.has(o.parent_id)) {
      const arr = childrenOf.get(o.parent_id) ?? [];
      arr.push(o);
      childrenOf.set(o.parent_id, arr);
    } else {
      roots.push(o);
    }
  }
  const mk = (o: TreeObjective, depth: number): Node => ({
    ...o,
    depth,
    children: (childrenOf.get(o.id) ?? []).map((c) => mk(c, depth + 1)),
  });
  return roots.map((o) => mk(o, 0));
}

// Tập id các nút CÓ con (để thu gọn tất cả).
function collectParents(nodes: Node[], acc: Set<string>): Set<string> {
  for (const n of nodes) {
    if (n.children.length > 0) {
      acc.add(n.id);
      collectParents(n.children, acc);
    }
  }
  return acc;
}

export default function ObjectiveTree({
  objectives, unitOptions, initialOwner, canReorder = false, reorder,
}: {
  objectives: TreeObjective[];
  unitOptions?: { value: string; label: string }[];
  initialOwner?: string;
  canReorder?: boolean;                                  // được phép kéo-thả sắp xếp OKR
  reorder?: (ids: string[]) => Promise<void>;            // lưu thứ tự nhóm anh em
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startReorder] = useTransition();
  // Bản sao cục bộ để kéo-thả tối ưu (optimistic); đồng bộ khi server trả dữ liệu mới.
  const [items, setItems] = useState<TreeObjective[]>(objectives);
  useEffect(() => { setItems(objectives); }, [objectives]);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Kiểu sắp xếp hiển thị: 'code' = theo MÃ (1→n, mặc định) · 'manual' = thứ tự thủ công đã kéo-thả.
  // Kéo-thả chỉ có nghĩa ở chế độ 'manual' → sắp theo mã KHÔNG ảnh hưởng thứ tự/định danh mã đã lưu.
  const [sortMode, setSortMode] = useState<'code' | 'manual'>('code');
  useEffect(() => {
    try {
      const v = localStorage.getItem('okrSortMode');
      if (v === 'manual' || v === 'code') setSortMode(v);
    } catch { /* ignore */ }
  }, []);
  const changeSort = (m: 'code' | 'manual') => {
    setSortMode(m);
    try { localStorage.setItem('okrSortMode', m); } catch { /* ignore */ }
    if (m === 'code' && reorderMode) setReorderMode(false); // sắp theo mã thì tắt chế độ kéo-thả
  };

  // Danh sách hiển thị: sắp theo mã (natural) khi 'code'; giữ thứ tự server (manual) khi 'manual'.
  const displayItems = useMemo(
    () => (sortMode === 'code' ? [...items].sort((a, b) => naturalCodeCompare(a.code, b.code)) : items),
    [items, sortMode],
  );
  const roots = useMemo(() => buildTree(displayItems), [displayItems]);
  const parentIds = useMemo(() => collectParents(roots, new Set<string>()), [roots]);

  // "Cha hiệu lực" để nhóm anh em: cha nằm trong tập → id cha; ngược lại (gốc) → '__root'.
  const byIdAll = useMemo(() => new Map(items.map((o) => [o.id, o])), [items]);
  const effParent = (o: TreeObjective): string => (o.parent_id && byIdAll.has(o.parent_id) ? o.parent_id : '__root');

  const persistOrder = (arr: TreeObjective[], ep: string) => {
    if (!reorder) return;
    const sibIds = arr.filter((o) => effParent(o) === ep).map((o) => o.id);
    startReorder(async () => {
      try { await reorder(sibIds); toast('Đã lưu thứ tự OKR', 'success'); router.refresh(); }
      catch (e) { setItems(objectives); toast(e instanceof Error ? e.message : 'Không lưu được thứ tự', 'error'); }
    });
  };

  // Đổi chỗ liền kề (nút ↑/↓ — thân thiện điện thoại) trong cùng nhóm anh em.
  const moveAdj = (id: string, dir: -1 | 1) => {
    const o = items.find((x) => x.id === id);
    if (!o) return;
    const ep = effParent(o);
    const sibs = items.filter((x) => effParent(x) === ep);
    const si = sibs.findIndex((x) => x.id === id);
    const ti = si + dir;
    if (ti < 0 || ti >= sibs.length) return;
    const arr = [...items];
    const ai = arr.findIndex((x) => x.id === id);
    const aj = arr.findIndex((x) => x.id === sibs[ti].id);
    [arr[ai], arr[aj]] = [arr[aj], arr[ai]];
    setItems(arr);
    persistOrder(arr, ep);
  };

  // Thả (kéo-thả desktop): đưa OKR đang kéo tới vị trí OKR đích, chỉ trong cùng nhóm anh em.
  const drop = (targetId: string) => {
    const dId = dragId; setDragId(null); setOverId(null);
    if (!dId || dId === targetId) return;
    const src = items.find((x) => x.id === dId);
    const tgt = items.find((x) => x.id === targetId);
    if (!src || !tgt) return;
    const ep = effParent(src);
    if (effParent(tgt) !== ep) { toast('Chỉ kéo trong cùng một nhóm (cùng cấp cha).', 'error'); return; }
    const origSrc = items.findIndex((x) => x.id === dId);
    const origTgt = items.findIndex((x) => x.id === targetId);
    const arr = items.filter((x) => x.id !== dId);
    const ti = arr.findIndex((x) => x.id === targetId);
    arr.splice(origSrc < origTgt ? ti + 1 : ti, 0, src);
    setItems(arr);
    persistOrder(arr, ep);
  };

  // Mặc định: mở Công ty + Khối, thu gọn từ Phòng trở xuống (depth >= 2) cho dễ nhìn tổng thể.
  const defaultCollapsed = useMemo(() => {
    const s = new Set<string>();
    const walk = (nodes: Node[]) => {
      for (const n of nodes) {
        if (n.depth >= 2 && n.children.length > 0) s.add(n.id);
        walk(n.children);
      }
    };
    walk(roots);
    return s;
  }, [roots]);

  const [collapsed, setCollapsed] = useState<Set<string>>(defaultCollapsed);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(parentIds));

  const allExpanded = collapsed.size === 0;
  const allCollapsed = collapsed.size >= parentIds.size && parentIds.size > 0;

  // ----- Bộ lọc (Khối/Phòng · Cấp · Trạng thái · Loại · tìm) -----
  const [q, setQ] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fLevel, setFLevel] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fType, setFType] = useState('');
  // Lọc theo NGƯỜI chủ trì (tới từ hồ sơ 360°: "Xem OKR của người này" → ?owner=email).
  const [fOwner, setFOwner] = useState(initialOwner ?? '');
  const ownerName = useMemo(
    () => objectives.find((o) => (o.owner_email ?? '').toLowerCase() === fOwner.toLowerCase())?.owner_name || fOwner,
    [objectives, fOwner],
  );

  // Chỉ hiện đơn vị CÓ OKR; nếu có unitOptions (cây tổ chức từ server) → giữ THỨ TỰ + thụt cấp,
  // nếu không → suy từ objectives (phẳng, sắp theo tên) để tương thích ngược.
  const unitChoices = useMemo(() => {
    const present = new Map<string, string>();
    for (const o of objectives) if (o.unit_id && o.unit_name) present.set(o.unit_id, o.unit_name);
    if (unitOptions && unitOptions.length) return unitOptions.filter((o) => present.has(o.value));
    return [...present.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [objectives, unitOptions]);
  const levels = useMemo(() => [...new Set(objectives.map((o) => o.level))], [objectives]);
  // Luôn liệt kê ĐỦ 5 trạng thái vòng đời (kể cả khi chưa có OKR nào ở trạng thái đó) + trạng thái
  // legacy còn sót trong dữ liệu (vd 'archived') → CFO lọc được "Hoàn thành"/"Hủy/Dừng" bất cứ lúc nào.
  const statuses = useMemo(() => {
    const present = new Set(objectives.map((o) => o.status));
    const extra = [...present].filter((s) => !(OBJ_STATUSES as string[]).includes(s));
    return [...OBJ_STATUSES, ...extra];
  }, [objectives]);
  const types = useMemo(() => [...new Set(objectives.map((o) => o.okr_type))], [objectives]);

  const filterActive = !!(q.trim() || fUnit || fLevel || fStatus || fType || fOwner);
  const qlc = q.trim().toLowerCase();
  const fOwnerLc = fOwner.toLowerCase();
  const matched = useMemo(() => {
    if (!filterActive) return [];
    const rows = objectives.filter((o) => {
      if (fOwnerLc && (o.owner_email ?? '').toLowerCase() !== fOwnerLc) return false;
      if (fUnit && o.unit_id !== fUnit) return false;
      if (fLevel && o.level !== fLevel) return false;
      if (fStatus && o.status !== fStatus) return false;
      if (fType && o.okr_type !== fType) return false;
      if (qlc) {
        const hay = `${o.title} ${o.code ?? ''} ${o.owner_name ?? ''} ${o.unit_name ?? ''}`.toLowerCase();
        if (!hay.includes(qlc)) return false;
      }
      return true;
    });
    return sortMode === 'code' ? rows.sort((a, b) => naturalCodeCompare(a.code, b.code)) : rows;
  }, [objectives, filterActive, fOwnerLc, fUnit, fLevel, fStatus, fType, qlc, sortMode]);
  const clearFilter = () => {
    setQ('');
    setFUnit('');
    setFLevel('');
    setFStatus('');
    setFType('');
    setFOwner('');
  };

  // Dòng phẳng (dùng khi đang lọc — bỏ cây thụt cấp, hiện đủ ngữ cảnh).
  const renderFlat = (o: TreeObjective): React.ReactNode => (
    <div key={o.id} className="ot-node">
      <div className="ot-row" data-level={o.level}>
        <span className="ot-dot" aria-hidden />
        <div className="ot-main">
          <div className="ot-ttl">
            {(o.level === 'division' || o.level === 'department') && o.unit_name && (
              <span className="unit-ic-sm" title={o.unit_name} aria-hidden>
                {unitIcon({ code: o.unit_code, name: o.unit_name, type: o.level })}
              </span>
            )}
            <span className={`ot-lvl lvl-${o.level}`}>{LEVEL_LABEL[o.level] ?? o.level}</span>
            {o.code && <span className="okr-code">{o.code}</span>}
            <Link href={`/objectives/${o.id}`}>{o.title}</Link>
          </div>
          <div className="ot-meta">
            {o.unit_name ? `${o.unit_name}` : ''}
            {o.owner_name && <>{o.unit_name ? ' · ' : ''}Chủ trì: <UserLink email={o.owner_email} name={o.owner_name} /></>}
            {` · ${o.kr_count} KR · ${STATUS_LABEL[o.status] ?? o.status}`}
          </div>
        </div>
        <div className="ot-prog">
          <ProgressBar value={o.progress} />
          <span className="ot-pct mono">{o.progress.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  const renderNode = (n: Node): React.ReactNode => {
    const hasKids = n.children.length > 0;
    const isCollapsed = collapsed.has(n.id);
    // Vị trí trong nhóm anh em (để bật/tắt nút ↑/↓ ở đầu/cuối).
    const ep = effParent(n);
    const sibs = items.filter((x) => effParent(x) === ep);
    const sidx = sibs.findIndex((x) => x.id === n.id);
    const canUp = sidx > 0, canDown = sidx >= 0 && sidx < sibs.length - 1;
    return (
      <div key={n.id} className="ot-node">
        <div
          className={`ot-row${reorderMode ? ' ot-reorder' : ''}${dragId === n.id ? ' ot-dragging' : ''}${overId === n.id ? ' ot-over' : ''}`}
          data-level={n.level}
          draggable={reorderMode || undefined}
          onDragStart={reorderMode ? (e) => { setDragId(n.id); e.dataTransfer.effectAllowed = 'move'; } : undefined}
          onDragEnd={reorderMode ? () => { setDragId(null); setOverId(null); } : undefined}
          onDragOver={reorderMode ? (e) => { e.preventDefault(); if (overId !== n.id) setOverId(n.id); } : undefined}
          onDrop={reorderMode ? (e) => { e.preventDefault(); drop(n.id); } : undefined}
        >
          {reorderMode && (
            <span className="ot-reorder-ctl" onClick={(e) => e.stopPropagation()}>
              <span className="ot-drag" title="Kéo để sắp xếp" aria-hidden>⠿</span>
              <button type="button" className="ot-move" disabled={!canUp} title="Lên" aria-label="Lên" onClick={() => moveAdj(n.id, -1)}>▲</button>
              <button type="button" className="ot-move" disabled={!canDown} title="Xuống" aria-label="Xuống" onClick={() => moveAdj(n.id, 1)}>▼</button>
            </span>
          )}
          {hasKids ? (
            <button
              type="button"
              className={`ot-caret ${isCollapsed ? '' : 'open'}`}
              onClick={() => toggle(n.id)}
              aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
              title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className="ot-dot" aria-hidden />
          )}
          <div className="ot-main">
            <div className="ot-ttl">
              {(n.level === 'division' || n.level === 'department') && n.unit_name && (
                <span className="unit-ic-sm" title={n.unit_name} aria-hidden>
                  {unitIcon({ name: n.unit_name, type: n.level })}
                </span>
              )}
              <span className={`ot-lvl lvl-${n.level}`}>{LEVEL_LABEL[n.level] ?? n.level}</span>
              {n.code && <span className="okr-code">{n.code}</span>}
              {reorderMode
                ? <span className="ot-ttl-static">{n.title}</span>
                : <Link href={`/objectives/${n.id}`}>{n.title}</Link>}
              {hasKids && <span className="ot-kids">{n.children.length}</span>}
            </div>
            <div className="ot-meta">
              {n.unit_name ? `${n.unit_name}` : ''}
              {n.owner_name && <>{n.unit_name ? ' · ' : ''}Chủ trì: <UserLink email={n.owner_email} name={n.owner_name} /></>}
              {` · ${n.kr_count} KR`}
            </div>
          </div>
          <div className="ot-prog">
            <ProgressBar value={n.progress} />
            <span className="ot-pct mono">{n.progress.toFixed(0)}%</span>
          </div>
        </div>
        {hasKids && !isCollapsed && (
          <div className="ot-children">{n.children.map(renderNode)}</div>
        )}
      </div>
    );
  };

  if (objectives.length === 0) return null;

  return (
    <div className="ot">
      {fOwner && (
        <div className="person-filter">
          <span>👤 Đang lọc OKR của: <b>{ownerName}</b></span>
          <button type="button" className="ntf-link" onClick={() => setFOwner('')}>✕ Bỏ lọc người</button>
        </div>
      )}
      <div className="filterbar">
        <input
          className="i fb-search"
          placeholder="🔍 Tìm theo tên, mã, người chủ trì…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="fb-sel fb-ss">
          <SearchSelect name="_fUnit" value={fUnit} onChange={setFUnit} emptyLabel="Khối / Phòng: tất cả" placeholder="Khối / Phòng: tất cả" options={unitChoices} />
        </div>
        <select className="i fb-sel" value={fLevel} onChange={(e) => setFLevel(e.target.value)}>
          <option value="">Cấp: tất cả</option>
          {levels.map((l) => (
            <option key={l} value={l}>{LEVEL_LABEL[l] ?? l}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Trạng thái: tất cả</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>
        <select className="i fb-sel" value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">Loại: tất cả</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
          ))}
        </select>
        {filterActive && <ClearFiltersButton onClear={clearFilter} />}
      </div>

      {filterActive ? (
        <>
          <p className="muted" style={{ fontSize: 13, margin: '2px 0 8px' }}>
            {matched.length} kết quả khớp bộ lọc.
          </p>
          {matched.length === 0 ? (
            <p className="muted">Không có OKR nào khớp bộ lọc.</p>
          ) : (
            <div className="ot-body">{matched.map(renderFlat)}</div>
          )}
        </>
      ) : (
        <>
          <div className="ot-toolbar" data-tour="ot-reorder">
            {/* Kiểu sắp xếp: Theo mã (1→n, mặc định) ⇄ Thủ công (thứ tự đã kéo-thả) */}
            <span className="ot-sort" role="group" aria-label="Kiểu sắp xếp OKR">
              <span className="ot-sort-l">Sắp xếp:</span>
              <button type="button" className={`ot-tbtn${sortMode === 'code' ? ' on' : ''}`} onClick={() => changeSort('code')}
                title="Sắp theo MÃ mục tiêu (số tự nhiên 1→n) — không đổi định danh mã">
                Theo mã
              </button>
              <button type="button" className={`ot-tbtn${sortMode === 'manual' ? ' on' : ''}`} onClick={() => changeSort('manual')}
                title="Giữ thứ tự thủ công đã kéo-thả (vd đưa OKR ưu tiên/liên quan lên trước)">
                Thủ công
              </button>
            </span>
            {parentIds.size > 0 && (
              <>
                <button type="button" className="ot-tbtn" onClick={expandAll} disabled={allExpanded || reorderMode}>
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Mở rộng tất cả
                </button>
                <button type="button" className="ot-tbtn" onClick={collapseAll} disabled={allCollapsed || reorderMode}>
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Thu gọn tất cả
                </button>
              </>
            )}
            {canReorder && (
              <button type="button" className={`ot-tbtn${reorderMode ? ' on' : ''}`}
                onClick={() => { if (sortMode === 'code') changeSort('manual'); setReorderMode((v) => !v); }}
                title="Kéo-thả (hoặc nút ▲▼) để sắp xếp thứ tự OKR trong cùng nhóm — vd đưa OKR ưu tiên/liên quan lên trước (tự chuyển sang 'Thủ công')">
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M8 2v12M8 2L5 5M8 2l3 3M8 14l-3-3M8 14l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                {reorderMode ? 'Xong sắp xếp' : 'Sắp xếp thứ tự'}
              </button>
            )}
          </div>
          {reorderMode && (
            <p className="muted ot-reorder-hint">Kéo biểu tượng ⠿ (hoặc bấm ▲/▼) để đổi thứ tự các OKR trong cùng một nhóm. Thứ tự lưu tự động; bấm “Xong sắp xếp” để mở lại liên kết.</p>
          )}
          <div className="ot-body">{roots.map(renderNode)}</div>
        </>
      )}
    </div>
  );
}
