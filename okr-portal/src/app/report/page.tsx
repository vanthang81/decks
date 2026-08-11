import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import PeriodPicker from '@/components/PeriodPicker';
import { requireUser } from '@/lib/current-user';
import {
  getCurrentPeriod,
  getPeriod,
  listPeriods,
  orderPeriodsHierarchically,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import { okrLevelReport, type ReportGroup } from '@/lib/okr-report';
import { progressColor } from '@/lib/format';
import { isExec } from '@/lib/rbac';
import WeightEditor from '@/components/WeightEditor';
import NavIcon from '@/components/NavIcon';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Báo cáo theo cấp · BTMH OKR' };

function Bar({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-block', width: 130, height: 8, background: 'var(--line)', borderRadius: 999, overflow: 'hidden', verticalAlign: 'middle' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: progressColor(value) }} />
    </span>
  );
}

function GroupRow({ g, canEdit }: { g: ReportGroup; canEdit: boolean }) {
  return (
    <details style={{ borderTop: '1px solid var(--line)', padding: '9px 0' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {g.code && <span className="badge gray">{g.code}</span>}
        <b>{g.name}</b>
        <span className="muted" style={{ fontSize: 12.5 }}>· {g.count} OKR</span>
        <span style={{ flex: 1, minWidth: 8 }} />
        <Bar value={g.weighted} />
        <span style={{ fontWeight: 700, fontSize: 13.5, width: 44, textAlign: 'right' }}>{g.weighted}%</span>
      </summary>
      <div style={{ marginTop: 8, paddingLeft: 4 }}>
        {g.items.map((it) => (
          <div key={it.id} className="rep-okr-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, flexWrap: 'wrap' }}>
            {it.code && <span className="okr-code" style={{ fontSize: 11 }}>{it.code}</span>}
            <Link href={`/objectives/${it.id}`} style={{ flex: 1, minWidth: 120 }}>{it.title}</Link>
            <span className="rep-wgt muted" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              trọng số <b style={{ color: 'var(--ink)' }}>{it.weight}</b>
              {canEdit && <WeightEditor objectiveId={it.id} weight={it.weight} title={it.title} />}
            </span>
            <span style={{ width: 40, textAlign: 'right', fontWeight: 600 }}>{Math.round(it.progress)}%</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function Section({ title, help, groups, canEdit }: { title: string; help?: string; groups: ReportGroup[]; canEdit: boolean }) {
  const total = groups.reduce((a, g) => a + g.count, 0);
  return (
    <div className="card">
      <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="muted" style={{ fontSize: 12.5 }}>{groups.length} nhóm · {total} OKR</span>
      </div>
      {help && <p className="subtitle" style={{ marginTop: 2 }}>{help}</p>}
      {groups.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>Chưa có OKR ở cấp này trong kỳ.</p>
      ) : (
        groups.map((g) => <GroupRow key={g.key} g={g} canEdit={canEdit} />)
      )}
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: { period?: string } }) {
  const user = await requireUser();
  // Báo cáo điều hành tổng hợp toàn công ty → chỉ quản lý/điều hành xem (nhân viên chỉ xem phạm vi mình ở /objectives).
  if (user.role === 'staff') redirect('/');

  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;
  const rep = period ? await okrLevelReport(period.id) : null;
  // Chỉnh trọng số ngay tại báo cáo: dành cho điều hành (CEO/CFO) — ưu tiên tổng thể công ty.
  // Giám đốc khối / trưởng phòng vẫn đặt trọng số OKR của mình ở form Sửa OKR (trang chi tiết).
  const canEditWeight = isExec(user.role);

  return (
    <>
      <SiteHeader active="report" />
      <div className="wrap">
        <div className="flexbtw" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="pagetitle">Báo cáo theo cấp<HelpTip k="report-levels" /></div>
            <p className="subtitle">Kết quả OKR theo Công ty → Khối → Phòng → Cá nhân, tổng mỗi nhóm tính <b>có trọng số</b>.</p>
          </div>
          <PeriodPicker
            periods={orderPeriodsHierarchically(periods).map(({ period: p, depth }) => ({
              id: p.id,
              label: `${PERIOD_KIND_LABEL[p.kind]}: ${p.name}`,
              depth,
              isCurrent: p.is_current,
            }))}
            currentId={period?.id ?? null}
            basePath="/report"
          />
        </div>

        {!period && <div className="card"><p className="muted">Chưa có kỳ OKR.</p></div>}
        {period && rep && (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div className="muted" style={{ fontSize: 12.5 }}>Kết quả tổng công ty ({PERIOD_KIND_LABEL[period.kind]}: {period.name})</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: progressColor(rep.companyTotal), lineHeight: 1.1 }}>{rep.companyTotal}%</div>
                <div className="muted" style={{ fontSize: 12 }}>bình quân có trọng số {rep.company ? 'các OKR cấp Công ty' : 'các OKR cấp Khối'}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}><Bar value={rep.companyTotal} /></div>
            </div>

            {canEditWeight && (
              <p className="subtitle" style={{ marginTop: -4 }}>
                Mở một nhóm để xem từng OKR. Bấm nút <NavIcon name="pencil" className="wgt-hint-ic" /> cạnh “trọng số” để chỉnh mức quan trọng của OKR —
                kết quả tổng của nhóm cập nhật theo <b>bình quân có trọng số</b>.
              </p>
            )}
            {rep.company && <Section title="Cấp Công ty" groups={[rep.company]} canEdit={canEditWeight} />}
            <Section title="Theo Khối" help="Mỗi khối = bình quân có trọng số các OKR cấp khối gắn đúng đơn vị." groups={rep.divisions} canEdit={canEditWeight} />
            <Section title="Theo Phòng ban" groups={rep.departments} canEdit={canEditWeight} />
            <Section title="Theo Cá nhân" groups={rep.individuals} canEdit={canEditWeight} />
          </>
        )}
      </div>
    </>
  );
}
