'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ClearFiltersButton from '@/components/ClearFiltersButton';
import { ProgressBar } from './ui';
import SearchSelect from '@/components/SearchSelect';
import UserLink from '@/components/UserLink';
import { unitIcon } from '@/lib/unit-icons';
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

export default function ObjectiveTree({ objectives, unitOptions }: { objectives: TreeObjective[]; unitOptions?: { value: string; label: string }[] }) {
  const roots = useMemo(() => buildTree(objectives), [objectives]);
  const parentIds = useMemo(() => collectParents(roots, new Set<string>()), [roots]);

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

  const filterActive = !!(q.trim() || fUnit || fLevel || fStatus || fType);
  const qlc = q.trim().toLowerCase();
  const matched = useMemo(() => {
    if (!filterActive) return [];
    return objectives.filter((o) => {
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
  }, [objectives, filterActive, fUnit, fLevel, fStatus, fType, qlc]);
  const clearFilter = () => {
    setQ('');
    setFUnit('');
    setFLevel('');
    setFStatus('');
    setFType('');
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
    return (
      <div key={n.id} className="ot-node">
        <div className="ot-row" data-level={n.level}>
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
              <Link href={`/objectives/${n.id}`}>{n.title}</Link>
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
          {parentIds.size > 0 && (
            <div className="ot-toolbar">
              <button type="button" className="ot-tbtn" onClick={expandAll} disabled={allExpanded}>
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Mở rộng tất cả
              </button>
              <button type="button" className="ot-tbtn" onClick={collapseAll} disabled={allCollapsed}>
                <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Thu gọn tất cả
              </button>
            </div>
          )}
          <div className="ot-body">{roots.map(renderNode)}</div>
        </>
      )}
    </div>
  );
}
