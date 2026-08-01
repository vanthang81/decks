'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProgressBar } from './ui';
import { unitIcon } from '@/lib/unit-icons';

// Kiểu dữ liệu phẳng truyền từ server (chỉ field cần cho cây — đều serializable).
export type TreeObjective = {
  id: string;
  code: string | null;
  parent_id: string | null;
  level: string;
  title: string;
  unit_name: string | null;
  owner_name: string | null;
  kr_count: number;
  progress: number;
};

const LEVEL_LABEL: Record<string, string> = {
  company: 'Công ty',
  division: 'Khối',
  department: 'Phòng',
  individual: 'Cá nhân',
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

export default function ObjectiveTree({ objectives }: { objectives: TreeObjective[] }) {
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
              {n.owner_name ? `${n.unit_name ? ' · ' : ''}Chủ trì: ${n.owner_name}` : ''}
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
    </div>
  );
}
