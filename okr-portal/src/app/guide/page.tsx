import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { query } from '@/lib/db';
import { ROLES, ROLE_LABEL } from '@/lib/rbac';
import { LEVEL_LABEL, type Level } from '@/lib/okr';
import { listKpiMetrics } from '@/lib/kpi';
import { getCurrentPeriod } from '@/lib/periods';
import {
  METHODOLOGY,
  FEATURES,
  ROADMAP,
  GLOSSARY,
  CHANGELOG,
  GUIDE_VERSION,
} from '@/lib/guide';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hướng dẫn sử dụng · BTMH OKR' };

// Tách "1. Tiêu đề" → { num: '1', text: 'Tiêu đề' } để hiện số thứ tự đẹp.
function splitNum(title: string): { num: string | null; text: string } {
  const m = title.match(/^(\d+)\.\s*(.*)$/);
  return m ? { num: m[1], text: m[2] } : { num: null, text: title };
}

export default async function GuidePage() {
  await requireUser();

  // Số liệu ĐỘNG → tài liệu tự phản ánh trạng thái hệ thống hiện tại.
  const period = await getCurrentPeriod();
  const metrics = listKpiMetrics();
  const counts = await query<{ divisions: number; departments: number; objectives: number }>(
    `SELECT
       (SELECT count(*) FROM okr_units WHERE type='division')::int AS divisions,
       (SELECT count(*) FROM okr_units WHERE type='department')::int AS departments,
       (SELECT count(*) FROM okr_objectives)::int AS objectives`,
  );
  const c = counts[0] ?? { divisions: 0, departments: 0, objectives: 0 };
  const levels: Level[] = ['company', 'division', 'department', 'individual'];

  return (
    <>
      <SiteHeader active="guide" />
      <div className="wrap guide">
        {/* Hero */}
        <div className="guide-hero">
          <h1>📖 Hướng dẫn sử dụng</h1>
          <p>
            Phương pháp luận OKR/KPI (best practice) và cách dùng từng tính năng của hệ thống điều hành
            OKR BTMH.
          </p>
          <span className="ver">Phiên bản tài liệu · {GUIDE_VERSION}</span>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn ghost sm" href="/?tour=1">🧭 Chạy lại hướng dẫn nhanh trên màn hình</a>
            <a className="btn sm" href="https://deck.consultx.vn/d/he-thong-quan-tri-hieu-suat-btmh" target="_blank" rel="noopener noreferrer">
              📖 Tài liệu giới thiệu hệ thống (slide)
            </a>
            <a className="btn sm" href="https://deck.consultx.vn/d/btmh-strategy-to-execution" target="_blank" rel="noopener noreferrer">
              🎯 Quản trị Chiến lược tới Thực thi (slide)
            </a>
          </div>
        </div>

        <div className="guide-layout">
          {/* ---------- Mục lục (sticky) ---------- */}
          <nav className="guide-nav">
            <div className="nav-inner">
              <div className="nav-group">Phương pháp luận</div>
              {METHODOLOGY.map((s) => {
                const { num, text } = splitNum(s.title);
                return (
                  <a key={s.id} href={`#${s.id}`}>
                    {num ? `${num}. ` : ''}
                    {text}
                  </a>
                );
              })}
              <div className="nav-group">Hệ thống</div>
              <a href="#snapshot">Ảnh chụp hiện tại</a>
              <a href="#tinh-nang">Tính năng</a>
              <div className="nav-group">Tham khảo</div>
              <a href="#lo-trinh">Lộ trình đề xuất</a>
              <a href="#thuat-ngu">Thuật ngữ</a>
              <a href="#nhat-ky">Nhật ký cập nhật</a>
            </div>
          </nav>

          {/* ---------- Nội dung ---------- */}
          <div>
            {/* Snapshot */}
            <div className="card anchor" id="snapshot">
              <h2>📊 Ảnh chụp hệ thống hiện tại</h2>
              <div className="snap-grid">
                <div className="snap-cell">
                  <div className="n">{period?.name ?? '—'}</div>
                  <div className="l">Kỳ hiện tại</div>
                </div>
                <div className="snap-cell">
                  <div className="n">{c.divisions}</div>
                  <div className="l">Khối</div>
                </div>
                <div className="snap-cell">
                  <div className="n">{c.departments}</div>
                  <div className="l">Phòng ban</div>
                </div>
                <div className="snap-cell">
                  <div className="n">{c.objectives}</div>
                  <div className="l">OKR đã tạo</div>
                </div>
              </div>
              <div className="snap-rows">
                <div className="r">
                  <b>Vai trò</b>
                  <span>{ROLES.map((r) => ROLE_LABEL[r]).join(' · ')}</span>
                </div>
                <div className="r">
                  <b>Cấp OKR</b>
                  <span>{levels.map((l) => LEVEL_LABEL[l]).join(' → ')}</span>
                </div>
                <div className="r">
                  <b>Nguồn KPI tự động</b>
                  <span>{metrics.map((m) => m.label).join(' · ') || 'chưa cấu hình'}</span>
                </div>
              </div>
            </div>

            {/* Phương pháp luận */}
            {METHODOLOGY.map((s) => {
              const { num, text } = splitNum(s.title);
              return (
                <div className="card anchor" id={s.id} key={s.id}>
                  <h2>
                    {num && <span className="sec-num">{num}</span>}
                    {text}
                  </h2>
                  {s.blocks.map((b, i) => (
                    <div key={i}>
                      {b.p && <p>{b.p}</p>}
                      {b.list && (
                        <ul>
                          {b.list.map((x, j) => (
                            <li key={j}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {b.note && <div className="gnote">💡 {b.note}</div>}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Tính năng */}
            <div className="card anchor" id="tinh-nang">
              <h2>🧩 Tính năng hệ thống</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Mỗi tính năng có chấm <b>ⓘ</b> trong ứng dụng dẫn thẳng tới đúng thẻ dưới đây.
              </p>
              <div className="feat-grid">
                {FEATURES.map((f) => (
                  <div className="feat anchor" id={`feat-${f.key}`} key={f.key}>
                    <div className="ftitle">{f.title}</div>
                    <div className="where">📍 {f.where}</div>
                    {Array.isArray(f.detail) ? (
                      <ul className="help-list" style={{ marginTop: 6 }}>
                        {f.detail.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{f.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lộ trình */}
            <div className="card anchor" id="lo-trinh">
              <h2>🚀 Lộ trình đề xuất (best practice)</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                Rút từ nghiên cứu best practice OKR/KPI và các phần mềm phổ biến (Perdoo, Weekdone,
                Quantive/WorkBoard, Profit.co, What Matters, OKR Institute). Chờ CEO/CFO duyệt ưu tiên.
              </p>
              <div className="table-scroll">
                <table className="t">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Đề xuất bổ sung</th>
                      <th style={{ textAlign: 'left' }}>Vì sao</th>
                      <th style={{ textAlign: 'left' }}>Tham khảo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROADMAP.map((r, i) => (
                      <tr key={i}>
                        <td><b>{r.title}</b></td>
                        <td>{r.why}</td>
                        <td className="muted">{r.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Thuật ngữ */}
            <div className="card anchor" id="thuat-ngu">
              <h2>📚 Thuật ngữ</h2>
              <div className="gloss-grid">
                {GLOSSARY.map((g) => (
                  <div className="gloss-item" key={g.term}>
                    <div className="term">{g.term}</div>
                    <div className="def">{g.def}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nhật ký */}
            <div className="card anchor" id="nhat-ky">
              <h2>🕓 Nhật ký cập nhật</h2>
              <div className="timeline">
                {CHANGELOG.map((c2) => (
                  <div className="tl-item" key={c2.date}>
                    <div className="tl-date">{c2.date}</div>
                    <ul>
                      {c2.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
