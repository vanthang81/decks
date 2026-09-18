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
  descendantPeriods,
  PERIOD_KIND_LABEL,
} from '@/lib/periods';
import { listObjectivesByPeriods } from '@/lib/okr';
import { okrLevelReport, type ReportGroup, type ReportItem } from '@/lib/okr-report';
import { naturalCodeCompare } from '@/lib/sortcode';
import { progressColor } from '@/lib/format';
import { isExec } from '@/lib/rbac';
import { listUnits, canViewObjectiveUnit } from '@/lib/org';
import { loadAccess, canViewReports, canManageStrategy, okrViewScope } from '@/lib/access';
import WeightEditor from '@/components/WeightEditor';
import PrintButton from '@/components/PrintButton';
import PersistDetails from '@/components/PersistDetails';
import ReportUnitFilter from '@/components/ReportUnitFilter';
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

function GroupRow({ g, canEdit, skNs }: { g: ReportGroup; canEdit: boolean; skNs: string }) {
  return (
    <PersistDetails
      sk={`${skNs}:${g.key}`}
      style={{ borderTop: '1px solid var(--line)', padding: '9px 0' }}
      summary={
        <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {g.code && <span className="badge gray">{g.code}</span>}
          <b>{g.name}</b>
          <span className="muted" style={{ fontSize: 12.5 }}>· {g.count} OKR</span>
          <span style={{ flex: 1, minWidth: 8 }} />
          <Bar value={g.weighted} />
          <span style={{ fontWeight: 700, fontSize: 13.5, width: 44, textAlign: 'right' }}>{g.weighted}%</span>
        </summary>
      }
    >
      <div style={{ marginTop: 8, paddingLeft: 4 }}>
        {(() => {
          // Hiển thị trọng số dạng % TỶ TRỌNG trong nhóm (thân thiện — CFO 14/09): weight ÷ Σweight nhóm.
          const wsum = g.items.reduce((a, it) => a + (Number(it.weight) || 0), 0);
          return g.items.map((it) => {
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
          });
        })()}
      </div>
    </PersistDetails>
  );
}

function Section({ title, help, groups, canEdit, skNs }: { title: string; help?: string; groups: ReportGroup[]; canEdit: boolean; skNs: string }) {
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
        groups.map((g) => <GroupRow key={g.key} g={g} canEdit={canEdit} skNs={skNs} />)
      )}
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: { period?: string } }) {
  const user = await requireUser();
  const access = await loadAccess();
  // Báo cáo điều hành tổng hợp toàn công ty → mặc định chỉ quản lý/điều hành xem; Nhân viên KHÔNG xem,
  // TRỪ KHI được cấp năng lực "Xem Báo cáo theo cấp" (report.view) ở trang Phân quyền.
  if (user.role === 'staff' && !canViewReports(user, access)) redirect('/');

  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;
  // Phạm vi xem theo vai trò (CFO 15/09): Giám đốc khối → toàn khối; Trưởng phòng/Nhân viên → phòng mình
  // (+ OKR cấp Công ty/khối align lên). Điều hành & nhóm có 'scope.all' xem toàn bộ.
  const units = await listUnits();
  const viewScope = okrViewScope(user, units, access);
  const canView = viewScope === null ? undefined : (o: { unit_id: string | null; owner_email: string | null; level: string }) => canViewObjectiveUnit(viewScope, o, user.email);
  const rep = period ? await okrLevelReport(period.id, canView) : null;

  // ── LĂNG KÍNH "Theo tháng" (kỳ con): khi xem Năm/Quý → tổng hợp OKR của từng THÁNG con ──
  // (đáp ứng nhu cầu OKR theo tháng của chị Hương: xem kết quả từng tháng như khối/phòng).
  const wavg = (items: ReportItem[]): number => {
    if (!items.length) return 0;
    let sw = 0, acc = 0;
    for (const it of items) { const w = it.weight > 0 ? it.weight : 0; sw += w; acc += it.progress * w; }
    const v = sw > 0 ? acc / sw : items.reduce((a, it) => a + it.progress, 0) / items.length;
    return Math.round(v * 10) / 10;
  };
  let monthGroups: ReportGroup[] = [];
  if (period && (period.kind === 'year' || period.kind === 'quarter')) {
    const childMonths = descendantPeriods(periods, period.id).filter((p) => p.kind === 'month');
    if (childMonths.length) {
      const raw = await listObjectivesByPeriods(childMonths.map((p) => p.id));
      const objs = canView ? raw.filter(canView) : raw;
      const byPeriod = new Map<string, ReportItem[]>();
      for (const o of objs) {
        const arr = byPeriod.get(o.period_id) ?? [];
        arr.push({ id: o.id, code: o.code, title: o.title, progress: o.progress, weight: o.weight ?? 1 });
        byPeriod.set(o.period_id, arr);
      }
      monthGroups = childMonths
        .map((p) => ({ p, items: byPeriod.get(p.id) ?? [] }))
        .filter((x) => x.items.length > 0)
        .map((x) => ({
          key: x.p.id,
          name: x.p.name,
          code: null,
          count: x.items.length,
          weighted: wavg(x.items),
          items: x.items.slice().sort((a, b) => naturalCodeCompare(a.code, b.code)),
        }));
    }
  }
  // Chỉnh trọng số ngay tại báo cáo: điều hành (CEO/CFO) hoặc người có năng lực "Quản lý Chiến lược".
  // Giám đốc khối / trưởng phòng vẫn đặt trọng số OKR của mình ở form Sửa OKR (trang chi tiết).
  const canEditWeight = isExec(user.role) || canManageStrategy(user, access);
  // Khoá lưu trạng thái mở/thu gọn nhóm (theo kỳ) — giữ đúng vị trí khi vào OKR rồi back (CFO 17/09).
  const repNs = `okr-rep:${period?.id ?? 'none'}`;

  return (
    <>
      <SiteHeader active="report" />
      <div className="wrap">
        <div className="flexbtw" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div className="pagetitle">Báo cáo theo cấp<HelpTip k="report-levels" /></div>
            <p className="subtitle">Kết quả OKR theo Công ty → Khối → Phòng → Cá nhân, tổng mỗi nhóm tính <b>có trọng số</b>.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {period && (
              <>
                <a className="btn ghost" href={`/api/report/export?period=${period.id}`}>⬇ Xuất Excel</a>
                <PrintButton />
              </>
            )}
          </div>
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
            {rep.company && <Section title="Cấp Công ty" groups={[rep.company]} canEdit={canEditWeight} skNs={`${repNs}:company`} />}
            {/* Theo Khối + Theo Phòng ban: gộp vào 1 khối có BỘ LỌC Khối/Phòng + nhãn "thuộc khối nào" (CFO 18/09) */}
            <ReportUnitFilter divisions={rep.divisions} departments={rep.departments} canEdit={canEditWeight} ns={repNs} />
            <Section title="Theo Cá nhân" groups={rep.individuals} canEdit={canEditWeight} skNs={`${repNs}:ind`} />
            {rep.projects.length > 0 && (
              <Section
                title="Theo Dự án"
                help="Gom mọi OKR gắn với từng Dự án (một OKR có thể thuộc nhiều dự án), tính XUYÊN KỲ — hiện đủ cả OKR ở kỳ khác kỳ đang xem, vì dự án chạy qua nhiều tháng/quý. Lăng kính riêng, không nằm trong roll-up Công ty→Khối→Phòng."
                groups={rep.projects}
                canEdit={canEditWeight}
                skNs={`${repNs}:proj`}
              />
            )}
            {monthGroups.length > 0 && (
              <Section
                title={`Theo tháng (kỳ con của ${PERIOD_KIND_LABEL[period.kind]} ${period.name})`}
                help="Kết quả OKR của từng tháng con. Mở một tháng để xem danh sách OKR; bấm mã/tên để mở chi tiết."
                groups={monthGroups}
                canEdit={false}
                skNs={`${repNs}:month`}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
