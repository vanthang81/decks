'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SearchSelect from '@/components/SearchSelect';
import ClearFiltersButton from '@/components/ClearFiltersButton';
import PersistDetails from '@/components/PersistDetails';
import WeightEditor from '@/components/WeightEditor';
import { progressColor } from '@/lib/format';
import type { ReportGroup } from '@/lib/okr-report';

// Bộ lọc Khối/Phòng cho Báo cáo theo cấp (CFO 18/09) + hiện rõ MỖI PHÒNG thuộc KHỐI nào.
// Thay 2 mục "Theo Khối" + "Theo Phòng ban" (client) để lọc tại chỗ; giữ nguyên giao diện nhóm.

function Bar({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-block', width: 130, height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', verticalAlign: 'middle' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: progressColor(value) }} />
    </span>
  );
}

function GroupRow({ g, canEdit, sk, khoi }: { g: ReportGroup; canEdit: boolean; sk: string; khoi?: string | null }) {
  const wsum = g.items.reduce((a, it) => a + (Number(it.weight) || 0), 0);
  return (
    <PersistDetails
      sk={sk}
      style={{ borderTop: '1px solid var(--line)', padding: '9px 0' }}
      summary={
        <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {g.code && <span className="badge gray">{g.code}</span>}
          <b>{g.name}</b>
          {khoi && <span className="muted" style={{ fontSize: 12 }}>· Khối: {khoi}</span>}
          <span className="muted" style={{ fontSize: 12.5 }}>· {g.count} OKR</span>
          <span style={{ flex: 1, minWidth: 8 }} />
          <Bar value={g.weighted} />
          <span style={{ fontWeight: 700, fontSize: 13.5, width: 44, textAlign: 'right' }}>{g.weighted}%</span>
        </summary>
      }
    >
      <div style={{ marginTop: 8, paddingLeft: 4 }}>
        {g.items.map((it) => {
          const pct = wsum > 0 ? Math.round(((Number(it.weight) || 0) / wsum) * 100) : 0;
          return (
            <div key={it.id} className="rep-okr-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, flexWrap: 'wrap' }}>
              {it.code && <span className="okr-code" style={{ fontSize: 11 }}>{it.code}</span>}
              <Link href={`/objectives/${it.id}`} style={{ flex: 1, minWidth: 120 }}>{it.title}</Link>
              <span className="rep-wgt muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title={`Tỷ trọng ${pct}% trong nhóm (trọng số ${it.weight} / tổng ${Math.round(wsum * 100) / 100})`}>
                tỷ trọng <b style={{ color: 'var(--ink)' }}>{pct}%</b>
                {canEdit && <WeightEditor objectiveId={it.id} weight={it.weight} title={it.title} />}
              </span>
              <span style={{ width: 40, textAlign: 'right', fontWeight: 600 }}>{Math.round(it.progress)}%</span>
            </div>
          );
        })}
      </div>
    </PersistDetails>
  );
}

export default function ReportUnitFilter({
  divisions,
  departments,
  canEdit,
  ns,
}: {
  divisions: ReportGroup[];
  departments: ReportGroup[];
  canEdit: boolean;
  ns: string;
}) {
  const [fKhoi, setFKhoi] = useState('');
  const [fPhong, setFPhong] = useState('');

  // Danh sách Khối để lọc = hợp của Khối có OKR khối + Khối cha của các Phòng (phòng có thể thuộc khối
  // chưa đặt OKR cấp khối).
  const khoiOptions = useMemo(() => {
    const m = new Map<string, { name: string; code: string | null }>();
    for (const d of divisions) m.set(d.key, { name: d.name, code: d.code });
    for (const p of departments) if (p.parentKey && !m.has(p.parentKey)) m.set(p.parentKey, { name: p.parentName ?? '(khối)', code: p.parentCode ?? null });
    return [...m.entries()]
      .map(([value, v]) => ({ value, label: v.name, sub: v.code ?? undefined }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [divisions, departments]);

  const phongOptions = useMemo(
    () =>
      departments
        .filter((p) => !fKhoi || p.parentKey === fKhoi)
        .map((p) => ({ value: p.key, label: p.name, sub: [p.code, p.parentName].filter(Boolean).join(' · ') || undefined }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [departments, fKhoi],
  );

  const shownDivs = useMemo(() => (fKhoi ? divisions.filter((d) => d.key === fKhoi) : divisions), [divisions, fKhoi]);
  const shownDepts = useMemo(
    () => departments.filter((p) => (!fKhoi || p.parentKey === fKhoi) && (!fPhong || p.key === fPhong)),
    [departments, fKhoi, fPhong],
  );

  const active = !!(fKhoi || fPhong);
  const clear = () => { setFKhoi(''); setFPhong(''); };

  return (
    <>
      <div className="card" style={{ paddingBottom: 12 }}>
        <div className="filterbar">
          <div className="fb-sel fb-ss">
            <SearchSelect value={fKhoi} onChange={(v) => { setFKhoi(v); setFPhong(''); }}
              emptyLabel="Khối: tất cả" placeholder="Khối: tất cả" options={khoiOptions} />
          </div>
          <div className="fb-sel fb-ss">
            <SearchSelect value={fPhong} onChange={setFPhong}
              emptyLabel="Phòng: tất cả" placeholder="Phòng: tất cả" options={phongOptions} />
          </div>
          {active && <ClearFiltersButton onClear={clear} />}
        </div>
      </div>

      <div className="card">
        <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ margin: 0 }}>Theo Khối</h3>
          <span className="muted" style={{ fontSize: 12.5 }}>{shownDivs.length} nhóm · {shownDivs.reduce((a, g) => a + g.count, 0)} OKR</span>
        </div>
        <p className="subtitle" style={{ marginTop: 2 }}>Mỗi khối = bình quân có trọng số các OKR cấp khối gắn đúng đơn vị.</p>
        {shownDivs.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Không có khối nào khớp bộ lọc.</p>
        ) : (
          shownDivs.map((g) => <GroupRow key={g.key} g={g} canEdit={canEdit} sk={`${ns}:div:${g.key}`} />)
        )}
      </div>

      <div className="card">
        <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ margin: 0 }}>Theo Phòng ban</h3>
          <span className="muted" style={{ fontSize: 12.5 }}>{shownDepts.length} nhóm · {shownDepts.reduce((a, g) => a + g.count, 0)} OKR</span>
        </div>
        {shownDepts.length === 0 ? (
          <p className="muted" style={{ marginTop: 8 }}>Không có phòng nào khớp bộ lọc.</p>
        ) : (
          shownDepts.map((g) => <GroupRow key={g.key} g={g} canEdit={canEdit} sk={`${ns}:dept:${g.key}`} khoi={g.parentName} />)
        )}
      </div>
    </>
  );
}
