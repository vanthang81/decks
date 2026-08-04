import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { getCompanyStrategy, listStrategicPillars, strategicPeriod } from '@/lib/strategy';
import { BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON, BSC_PERSPECTIVES } from '@/lib/okr';
import { progressColor } from '@/lib/format';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import PillarList from '@/components/PillarList';
import { saveStrategyAction, reorderPillarsAction } from './actions';

// Ô nhập form chiến lược — dùng lại trong popup Sửa (góc phải-trên).
function StrategyFields({ strat }: { strat: Awaited<ReturnType<typeof getCompanyStrategy>> }) {
  return (
    <>
      <label className="f">Chân trời chiến lược (vd 2026–2030)</label>
      <input className="i" name="horizon" defaultValue={strat.horizon} placeholder="2026–2030" />
      <label className="f">Tầm nhìn (Vision)</label>
      <textarea className="i" name="vision" rows={2} defaultValue={strat.vision} placeholder="Trở thành…" />
      <label className="f">Sứ mệnh (Mission)</label>
      <textarea className="i" name="mission" rows={2} defaultValue={strat.mission} placeholder="Chúng tôi tồn tại để…" />
      <label className="f">Khát vọng / Định vị chiến lược</label>
      <textarea className="i" name="ambition" rows={2} defaultValue={strat.ambition} placeholder="Dẫn đầu bán lẻ VBĐQ…" />
      <label className="f">Giá trị cốt lõi (mỗi dòng một giá trị)</label>
      <textarea className="i" name="values" rows={4} defaultValue={strat.values.join('\n')} placeholder={'Chính trực\nKhách hàng là trọng tâm\nXuất sắc vận hành'} />
    </>
  );
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chiến lược công ty · BTMH OKR' };

export default async function StrategyPage() {
  const user = await requireUser();
  const me = await getUser(user.email).catch(() => null);
  const isExec = me ? canManageSystem(me, await loadAccess()) : false;

  const [strat, pillars, speriod] = await Promise.all([
    getCompanyStrategy(),
    listStrategicPillars(),
    strategicPeriod(),
  ]);
  const has = !!(strat.vision || strat.mission || strat.ambition || strat.values.length);

  return (
    <>
      <SiteHeader active="strategy" />
      <div className="wrap">
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle">Chiến lược công ty<HelpTip k="company-strategy" /></div>
            <p className="subtitle">
              Điểm khởi đầu của chuỗi điều hành: khai báo <b>Tầm nhìn · Sứ mệnh · Giá trị · Khát vọng</b>
              {strat.horizon ? <> · chân trời <b>{strat.horizon}</b></> : null} — rồi rải xuống OKR.
            </p>
          </div>
          {isExec && (
            <EditModal title="Khai báo / sửa chiến lược công ty" label={has ? 'Sửa chiến lược' : 'Khai báo chiến lược'} icon={<NavIcon name="pencil" />} submitLabel="Lưu chiến lược" action={saveStrategyAction}>
              <StrategyFields strat={strat} />
            </EditModal>
          )}
        </div>

        {/* Chuỗi phương pháp luận */}
        <div className="card strat-chain">
          <Link className="sc-step apex" href="#pillars">🧭 Chiến lược</Link><span className="sc-arr">→</span>
          <Link className="sc-step" href="/map?v=strategy">🎯 BSC (4 viễn cảnh)</Link><span className="sc-arr">→</span>
          <Link className="sc-step" href="/map?v=flow">📌 OKR (Công ty→Khối→Phòng)</Link><span className="sc-arr">→</span>
          <Link className="sc-step" href="/objectives">📐 KRA / KR</Link><span className="sc-arr">→</span>
          <span className="sc-step sc-multi">
            <Link href="/kpi">📊 KPI</Link> · <Link href="/projects">🗂 Dự án</Link> · <Link href="/tasks">✅ Công việc</Link> · <Link href="/meetings">🗓 Cuộc họp</Link>
          </span>
        </div>

        {!has && (
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <p style={{ margin: 0 }}>
              <b>Chưa khai báo chiến lược.</b> {isExec ? 'Bấm "Khai báo chiến lược" ở góc phải-trên để nhập Tầm nhìn · Sứ mệnh · Giá trị cốt lõi.' : 'CEO/CFO sẽ khai báo Tầm nhìn · Sứ mệnh · Giá trị cốt lõi tại đây.'}
            </p>
          </div>
        )}

        {has && (
          <div className="grid two">
            <div className="card strat-card">
              <div className="strat-k">Tầm nhìn</div>
              <div className="strat-v">{strat.vision || <span className="muted">—</span>}</div>
              <div className="strat-k">Sứ mệnh</div>
              <div className="strat-v">{strat.mission || <span className="muted">—</span>}</div>
              {strat.ambition && (<><div className="strat-k">Khát vọng / Định vị</div><div className="strat-v">{strat.ambition}</div></>)}
            </div>
            <div className="card strat-card">
              <div className="strat-k">Giá trị cốt lõi</div>
              {strat.values.length ? (
                <ul className="strat-values">{strat.values.map((v, i) => <li key={i}>{v}</li>)}</ul>
              ) : <div className="muted">—</div>}
            </div>
          </div>
        )}

        {/* Lộ trình chiến lược theo năm (2026–2030) */}
        {(strat.roadmap ?? []).length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Lộ trình chiến lược {strat.horizon || '2026–2030'}</h3>
            <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
              Cột mốc theo năm về vị thế thương hiệu · khách hàng · vốn hoá · mạng lưới (số cửa hàng theo Financial Model).
            </p>
            <div className="road">
              {(strat.roadmap ?? []).map((r) => (
                <div key={r.year} className="road-step">
                  <div className="road-year">{r.year}</div>
                  <div className="road-body">
                    <div className="road-market">{r.market}</div>
                    <div className="road-metrics">
                      <span className="road-m">👥 {r.customers}</span>
                      <span className="road-m">💰 Vốn hoá {r.capitalization}</span>
                      <span className="road-m">🏬 {r.stores}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trụ cột chiến lược = OKR multiyear công ty */}
        <div className="card" id="pillars" style={{ scrollMarginTop: 84 }}>
          <div className="flexbtw">
            <h3 style={{ margin: 0 }}>Trụ cột chiến lược {speriod ? <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>· {speriod.name}</span> : null}</h3>
            {isExec && speriod && (
              <Link className="btn ghost sm" href={`/objectives/new?period=${speriod.id}`}>+ Thêm trụ cột</Link>
            )}
          </div>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Là các Mục tiêu cấp Công ty thuộc kỳ chiến lược nhiều năm — mỗi OKR Công ty hằng năm sẽ "Liên kết lên" một trụ cột.
          </p>
          <hr className="sep" />
          {pillars.length === 0 && <p className="muted">Chưa có trụ cột chiến lược nào. {isExec ? 'Tạo kỳ "Chiến lược nhiều năm" ở Quản trị → Kỳ, rồi thêm OKR cấp Công ty.' : ''}</p>}
          {pillars.length > 0 && (
            <>
              {isExec && <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>Kéo tay cầm ⠿ (máy tính) hoặc bấm ▲/▼ để sắp xếp lại trụ cột theo logic — thứ tự được lưu tự động.</p>}
              <PillarList
                canEdit={isExec}
                reorder={reorderPillarsAction}
                pillars={pillars.map((p) => ({
                  id: p.id, code: p.code, title: p.title,
                  bscLabel: p.bsc_perspective ? BSC_PERSPECTIVE_LABEL[p.bsc_perspective] : null,
                  bscIcon: p.bsc_perspective ? BSC_PERSPECTIVE_ICON[p.bsc_perspective] : null,
                  owner: p.owner, childCount: p.child_count, progress: p.progress, progColor: progressColor(p.progress),
                }))}
              />
            </>
          )}
        </div>

        {/* 4 viễn cảnh BSC */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Bốn viễn cảnh Balanced Scorecard<HelpTip k="bsc" /></h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>Bấm một viễn cảnh để xem sơ đồ chiến lược BSC tầng tương ứng.</p>
          <div className="strat-bsc">
            {BSC_PERSPECTIVES.map((b) => (
              <Link key={b} href={`/map?v=strategy#smap-${b}`} className={`strat-bsc-cell bsc-${b}`}>
                <div className="strat-bsc-ic">{BSC_PERSPECTIVE_ICON[b]}</div>
                <div className="strat-bsc-lbl">{BSC_PERSPECTIVE_LABEL[b]}</div>
                <div className="strat-bsc-n">{pillars.filter((p) => p.bsc_perspective === b).length} trụ cột</div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
