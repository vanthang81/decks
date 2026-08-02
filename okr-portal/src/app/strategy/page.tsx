import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { getUser } from '@/lib/users';
import { loadAccess, canManageSystem } from '@/lib/access';
import { getCompanyStrategy, listStrategicPillars, strategicPeriod } from '@/lib/strategy';
import { BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON, BSC_PERSPECTIVES } from '@/lib/okr';
import { progressColor } from '@/lib/format';
import { saveStrategyAction } from './actions';

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
        <div className="flexbtw">
          <div>
            <div className="pagetitle">Chiến lược công ty<HelpTip k="company-strategy" /></div>
            <p className="subtitle">
              Điểm khởi đầu của chuỗi điều hành: khai báo <b>Tầm nhìn · Sứ mệnh · Giá trị · Khát vọng</b>
              {strat.horizon ? <> · chân trời <b>{strat.horizon}</b></> : null} — rồi rải xuống OKR.
            </p>
          </div>
        </div>

        {/* Chuỗi phương pháp luận */}
        <div className="card strat-chain">
          <span className="sc-step apex">🧭 Chiến lược</span><span className="sc-arr">→</span>
          <span className="sc-step">🎯 BSC (4 viễn cảnh)</span><span className="sc-arr">→</span>
          <span className="sc-step">📌 OKR (Công ty→Khối→Phòng)</span><span className="sc-arr">→</span>
          <span className="sc-step">📐 KRA / KR</span><span className="sc-arr">→</span>
          <span className="sc-step">📊 KPI · 🗂 Dự án · ✅ Công việc</span>
        </div>

        {!has && (
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <p style={{ margin: 0 }}>
              <b>Chưa khai báo chiến lược.</b> {isExec ? 'Mở "Khai báo/sửa chiến lược" bên dưới để nhập Tầm nhìn · Sứ mệnh · Giá trị cốt lõi.' : 'CEO/CFO sẽ khai báo Tầm nhìn · Sứ mệnh · Giá trị cốt lõi tại đây.'}
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

        {/* Trụ cột chiến lược = OKR multiyear công ty */}
        <div className="card">
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
          {pillars.map((p) => (
            <div key={p.id} className="obj-row obj-row-link">
              <Link className="stretch-link" href={`/objectives/${p.id}`} aria-label={p.title} />
              <div className="obj-main">
                <div className="ttl">
                  {p.code && <span className="okr-code">{p.code}</span>}
                  {p.bsc_perspective && <span className="badge bsc" title={BSC_PERSPECTIVE_LABEL[p.bsc_perspective]}>{BSC_PERSPECTIVE_ICON[p.bsc_perspective]} {BSC_PERSPECTIVE_LABEL[p.bsc_perspective]}</span>}
                  <span className="ttl-txt">{p.title}</span>
                </div>
                <div className="obj-meta">
                  {p.owner ? `Chủ trì: ${p.owner} · ` : ''}{p.child_count} OKR năm liên kết lên
                </div>
              </div>
              <div className="obj-prog">
                <span className="map-mini"><i style={{ width: `${Math.round(p.progress)}%`, background: progressColor(p.progress) }} /></span>
                <div className="right muted mono" style={{ fontSize: 12 }}>{Math.round(p.progress)}%</div>
              </div>
            </div>
          ))}
        </div>

        {/* 4 viễn cảnh BSC */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Bốn viễn cảnh Balanced Scorecard<HelpTip k="bsc" /></h3>
          <div className="strat-bsc">
            {BSC_PERSPECTIVES.map((b) => (
              <div key={b} className={`strat-bsc-cell bsc-${b}`}>
                <div className="strat-bsc-ic">{BSC_PERSPECTIVE_ICON[b]}</div>
                <div className="strat-bsc-lbl">{BSC_PERSPECTIVE_LABEL[b]}</div>
                <div className="strat-bsc-n">{pillars.filter((p) => p.bsc_perspective === b).length} trụ cột</div>
              </div>
            ))}
          </div>
        </div>

        {/* Khai báo / sửa (exec) */}
        {isExec && (
          <details className="card strat-edit">
            <summary><b>✏️ Khai báo / sửa chiến lược</b> <span className="muted">(chỉ CEO/CFO)</span></summary>
            <form action={saveStrategyAction} className="strat-form">
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
              <div style={{ marginTop: 10 }}><button className="btn" type="submit">Lưu chiến lược</button></div>
            </form>
          </details>
        )}
      </div>
    </>
  );
}
