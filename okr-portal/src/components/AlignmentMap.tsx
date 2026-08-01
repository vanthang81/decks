'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mapSetBscAction, mapSetParentAction, mapLinkKpiAction } from '@/app/map/actions';

// ===== Kiểu dữ liệu (khai lại phía client — KHÔNG import '@/lib/okr' để tránh kéo pg vào bundle) =====
type Bsc = 'financial' | 'customer' | 'process' | 'learning';
type Level = 'company' | 'division' | 'department' | 'individual';

type Obj = {
  id: string;
  code: string | null;
  title: string;
  level: Level;
  unit_name: string | null;
  unit_code: string | null;
  owner_name: string | null;
  progress: number;
  bsc_perspective: Bsc | null;
  parent_id: string | null;
  kr_count: number;
};
type Kr = {
  id: string;
  code: string | null;
  objective_id: string;
  title: string;
  progress: number;
  indicator: string;
  kpi_id: string | null;
  kpi_code: string | null;
  kpi_name: string | null;
};
type Kpi = { id: string; code: string | null; name: string; bsc_perspective: Bsc | null; unit_name: string | null };

const LANES: { key: Bsc | 'none'; label: string; icon: string }[] = [
  { key: 'financial', label: 'Tài chính', icon: '💰' },
  { key: 'customer', label: 'Khách hàng', icon: '🛍️' },
  { key: 'process', label: 'Quy trình nội bộ', icon: '⚙️' },
  { key: 'learning', label: 'Học hỏi & Phát triển', icon: '🎓' },
  { key: 'none', label: 'Chưa gắn viễn cảnh', icon: '❓' },
];
const LEVEL_LABEL: Record<Level, string> = { company: 'Công ty', division: 'Khối', department: 'Phòng ban', individual: 'Cá nhân' };
const LEVEL_CLS: Record<Level, string> = { company: 'lv-company', division: 'lv-division', department: 'lv-department', individual: 'lv-individual' };

function progColor(p: number): string {
  if (p >= 90) return '#16a34a';
  if (p >= 50) return '#2563eb';
  if (p >= 10) return '#f59e0b';
  return '#cbd5e1';
}

export default function AlignmentMap({
  objectives,
  krs,
  kpis,
  manageableIds,
}: {
  objectives: Obj[];
  krs: Kr[];
  kpis: Kpi[];
  manageableIds: string[];
}) {
  const router = useRouter();
  const manageable = useMemo(() => new Set(manageableIds), [manageableIds]);
  const objById = useMemo(() => new Map(objectives.map((o) => [o.id, o])), [objectives]);
  const krsByObj = useMemo(() => {
    const m = new Map<string, Kr[]>();
    for (const k of krs) {
      const a = m.get(k.objective_id) ?? [];
      a.push(k);
      m.set(k.objective_id, a);
    }
    return m;
  }, [krs]);
  const childCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of objectives) if (o.parent_id) m.set(o.parent_id, (m.get(o.parent_id) ?? 0) + 1);
    return m;
  }, [objectives]);

  const byLane = useMemo(() => {
    const m = new Map<string, Obj[]>();
    for (const l of LANES) m.set(l.key, []);
    for (const o of objectives) m.get(o.bsc_perspective ?? 'none')!.push(o);
    // Trong làn: Công ty → Khối → Phòng → Cá nhân, rồi theo mã.
    const order: Record<Level, number> = { company: 0, division: 1, department: 2, individual: 3 };
    for (const arr of m.values())
      arr.sort((a, b) => order[a.level] - order[b.level] || (a.code ?? '').localeCompare(b.code ?? ''));
    return m;
  }, [objectives]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ---------- Kéo–thả (pointer: chạy cả chuột lẫn cảm ứng) ----------
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; label: string } | null>(null);
  const [hoverLane, setHoverLane] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; from: string } | null>(null);

  function beginDrag(e: React.PointerEvent, o: Obj) {
    if (!manageable.has(o.id) || busy) return;
    e.preventDefault();
    dragRef.current = { id: o.id, from: o.bsc_perspective ?? 'none' };
    setDrag({ id: o.id, x: e.clientX, y: e.clientY, label: `${o.code ? o.code + ' · ' : ''}${o.title}` });
    setHoverLane(null);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
    document.body.classList.add('map-dragging');
  }
  function laneAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const lane = el?.closest?.('[data-lane]') as HTMLElement | null;
    return lane?.getAttribute('data-lane') ?? null;
  }
  const onDragMove = (e: PointerEvent) => {
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    setHoverLane(laneAt(e.clientX, e.clientY));
  };
  const onDragEnd = (e: PointerEvent) => {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
    document.body.classList.remove('map-dragging');
    const info = dragRef.current;
    const lane = laneAt(e.clientX, e.clientY);
    setDrag(null);
    setHoverLane(null);
    dragRef.current = null;
    if (info && lane && lane !== info.from) void run(() => mapSetBscAction(info.id, lane === 'none' ? '' : lane));
  };

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      router.refresh(); // đồng bộ lại UI với DB dù thành công hay lỗi (reset select bị từ chối)
      setBusy(false);
    }
  }

  // Lựa chọn OKR cha hợp lệ cho 1 objective (loại chính nó + hậu duệ của nó).
  function parentOptions(o: Obj): Obj[] {
    const banned = new Set<string>([o.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of objectives) if (c.parent_id && banned.has(c.parent_id) && !banned.has(c.id)) {
        banned.add(c.id);
        added = true;
      }
    }
    return objectives.filter((c) => !banned.has(c.id)).sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''));
  }

  const totalTagged = objectives.filter((o) => o.bsc_perspective).length;

  return (
    <>
      <div className="map-legend">
        <span className="muted">Chú giải cấp:</span>
        <span className="lv-badge lv-company">Công ty</span>
        <span className="lv-badge lv-division">Khối</span>
        <span className="lv-badge lv-department">Phòng ban</span>
        <span className="lv-badge lv-individual">Cá nhân</span>
        <span className="map-legend-sep" />
        <span className="muted">
          Đã gắn BSC: <b>{totalTagged}/{objectives.length}</b> mục tiêu · {kpis.length} KPI thư viện
        </span>
      </div>

      <div className="map-lanes">
        {LANES.map((lane) => {
          const arr = byLane.get(lane.key) ?? [];
          const avg = arr.length ? Math.round(arr.reduce((a, o) => a + o.progress, 0) / arr.length) : 0;
          return (
            <section
              key={lane.key}
              data-lane={lane.key}
              className={`map-lane ${hoverLane === lane.key && drag ? 'drop-hot' : ''} ${lane.key === 'none' ? 'lane-none' : ''}`}
            >
              <header className="map-lane-hd">
                <span className="map-lane-ic" aria-hidden>{lane.icon}</span>
                <span className="map-lane-ttl">{lane.label}</span>
                <span className="map-lane-count">{arr.length}</span>
                {arr.length > 0 && (
                  <span className="map-lane-avg">
                    <span className="map-mini"><i style={{ width: `${avg}%`, background: progColor(avg) }} /></span>
                    {avg}%
                  </span>
                )}
              </header>
              <div className="map-lane-body">
                {arr.length === 0 && <div className="map-empty">Kéo mục tiêu vào đây để gắn viễn cảnh này.</div>}
                {arr.map((o) => {
                  const canEdit = manageable.has(o.id);
                  const krList = krsByObj.get(o.id) ?? [];
                  const linked = krList.filter((k) => k.kpi_id).length;
                  const parent = o.parent_id ? objById.get(o.parent_id) : null;
                  const kids = childCount.get(o.id) ?? 0;
                  const open = openId === o.id;
                  return (
                    <article key={o.id} className={`map-card no-swipe ${LEVEL_CLS[o.level]} ${drag?.id === o.id ? 'is-dragging' : ''}`}>
                      <div className="map-card-top">
                        {canEdit && (
                          <button
                            type="button"
                            className="map-grip"
                            title="Kéo để đổi viễn cảnh BSC"
                            aria-label="Kéo để đổi viễn cảnh"
                            onPointerDown={(e) => beginDrag(e, o)}
                          >
                            ⠿
                          </button>
                        )}
                        <span className={`lv-badge ${LEVEL_CLS[o.level]}`}>{LEVEL_LABEL[o.level]}</span>
                        {o.code && <span className="okr-code">{o.code}</span>}
                      </div>
                      <div className="map-card-ttl">
                        <Link href={`/objectives/${o.id}`}>{o.title}</Link>
                      </div>
                      <div className="map-card-meta">
                        {o.unit_name ? `${o.unit_name}` : 'Toàn công ty'}
                        {o.owner_name ? ` · ${o.owner_name}` : ''}
                      </div>
                      {parent && (
                        <div className="map-parent">
                          ↳ thuộc {parent.code && <span className="okr-code sm">{parent.code}</span>} {parent.title}
                        </div>
                      )}
                      <div className="map-prog">
                        <span className="map-mini"><i style={{ width: `${Math.round(o.progress)}%`, background: progColor(o.progress) }} /></span>
                        <span className="map-prog-n">{Math.round(o.progress)}%</span>
                      </div>

                      {/* Chuỗi KR → KPI */}
                      <div className="map-krs">
                        {krList.length === 0 && <div className="map-kr-empty">Chưa có KR</div>}
                        {krList.map((k) => (
                          <div key={k.id} className="map-kr">
                            <span className="map-kr-dot" aria-hidden />
                            <span className="map-kr-txt">
                              {k.code && <span className="okr-code sm">{k.code}</span>} {k.title}
                            </span>
                            {k.kpi_id ? (
                              <span className="map-kpi ok" title={k.kpi_name ?? undefined}>
                                🎯 {k.kpi_code ?? k.kpi_name}
                              </span>
                            ) : (
                              <span className="map-kpi none">chưa gắn KPI</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="map-card-foot">
                        <span className="map-tag">{o.kr_count} KR · {linked} gắn KPI{kids ? ` · ${kids} OKR con` : ''}</span>
                        {canEdit && (
                          <button type="button" className="map-cog" onClick={() => setOpenId(open ? null : o.id)}>
                            ⚙ {open ? 'Đóng' : 'Liên kết'}
                          </button>
                        )}
                      </div>

                      {open && canEdit && (
                        <div className="map-editor">
                          <label className="map-field">
                            <span>Viễn cảnh BSC</span>
                            <select
                              defaultValue={o.bsc_perspective ?? ''}
                              disabled={busy}
                              onChange={(e) => run(() => mapSetBscAction(o.id, e.target.value))}
                            >
                              <option value="">— Chưa gắn —</option>
                              {LANES.filter((l) => l.key !== 'none').map((l) => (
                                <option key={l.key} value={l.key}>{l.icon} {l.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="map-field">
                            <span>OKR cấp trên (cascade)</span>
                            <select
                              defaultValue={o.parent_id ?? ''}
                              disabled={busy}
                              onChange={(e) => run(() => mapSetParentAction(o.id, e.target.value))}
                            >
                              <option value="">— Không (mục tiêu gốc) —</option>
                              {parentOptions(o).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code ? p.code + ' · ' : ''}{p.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          {krList.length > 0 && (
                            <div className="map-field">
                              <span>Gắn KPI cho từng KR</span>
                              <div className="map-kr-links">
                                {krList.map((k) => (
                                  <div key={k.id} className="map-kr-link">
                                    <span className="map-kr-link-lbl">
                                      {k.code && <span className="okr-code sm">{k.code}</span>} {k.title}
                                    </span>
                                    <select
                                      defaultValue={k.kpi_id ?? ''}
                                      disabled={busy}
                                      onChange={(e) => run(() => mapLinkKpiAction(k.id, e.target.value))}
                                    >
                                      <option value="">— Không gắn —</option>
                                      {kpis.map((kp) => (
                                        <option key={kp.id} value={kp.id}>
                                          {kp.code ? kp.code + ' · ' : ''}{kp.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bóng kéo theo con trỏ */}
      {drag && (
        <div className="map-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.label}
        </div>
      )}
    </>
  );
}
