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
        <div className="pagetitle">Hướng dẫn sử dụng</div>
        <p className="subtitle">
          Phương pháp luận OKR/KPI và cách dùng từng tính năng. Phiên bản tài liệu: {GUIDE_VERSION}.
          Trang này tự cập nhật theo cấu trúc hệ thống.
        </p>

        {/* Mục lục */}
        <div className="card">
          <div className="toc">
            {METHODOLOGY.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
            <a href="#tinh-nang">Tính năng hệ thống</a>
            <a href="#lo-trinh">Lộ trình đề xuất</a>
            <a href="#thuat-ngu">Thuật ngữ</a>
            <a href="#nhat-ky">Nhật ký cập nhật</a>
          </div>
        </div>

        {/* Snapshot động */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ảnh chụp hệ thống hiện tại</h2>
          <div className="stat">
            <div>
              <div className="n">{period?.name ?? '—'}</div>
              <div className="l">Kỳ hiện tại</div>
            </div>
            <div>
              <div className="n">{c.divisions}</div>
              <div className="l">Khối</div>
            </div>
            <div>
              <div className="n">{c.departments}</div>
              <div className="l">Phòng</div>
            </div>
            <div>
              <div className="n">{c.objectives}</div>
              <div className="l">OKR đã tạo</div>
            </div>
          </div>
          <hr className="sep" />
          <p style={{ margin: '4px 0' }}>
            <b>Vai trò:</b>{' '}
            {ROLES.map((r) => ROLE_LABEL[r]).join(' · ')}
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>Cấp OKR:</b> {levels.map((l) => LEVEL_LABEL[l]).join(' → ')}
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>Nguồn KPI tự động:</b>{' '}
            {metrics.map((m) => m.label).join(' · ') || 'chưa cấu hình'}
          </p>
        </div>

        {/* Phương pháp luận */}
        {METHODOLOGY.map((s) => (
          <div className="card anchor" id={s.id} key={s.id}>
            <h2 style={{ marginTop: 0 }}>{s.title}</h2>
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
        ))}

        {/* Tính năng */}
        <div className="card anchor" id="tinh-nang">
          <h2 style={{ marginTop: 0 }}>Tính năng hệ thống</h2>
          <p className="muted">Mỗi tính năng có chấm ⓘ trong ứng dụng dẫn tới đúng mục dưới đây.</p>
          {FEATURES.map((f) => (
            <div className="feat anchor" id={`feat-${f.key}`} key={f.key}>
              <div style={{ fontWeight: 700 }}>{f.title}</div>
              <div className="where">{f.where}</div>
              <p style={{ margin: '6px 0 0' }}>{f.detail}</p>
            </div>
          ))}
        </div>

        {/* Lộ trình đề xuất */}
        <div className="card anchor" id="lo-trinh">
          <h2 style={{ marginTop: 0 }}>Lộ trình đề xuất (best practice)</h2>
          <p className="muted">
            Rút từ nghiên cứu best practice OKR/KPI và các phần mềm phổ biến (Perdoo, Weekdone,
            Quantive/WorkBoard, Profit.co, What Matters, OKR Institute). Chờ CEO/CFO duyệt ưu tiên.
          </p>
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>Đề xuất bổ sung</th>
                  <th>Vì sao</th>
                  <th>Tham khảo</th>
                </tr>
              </thead>
              <tbody>
                {ROADMAP.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <b>{r.title}</b>
                    </td>
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
          <h2 style={{ marginTop: 0 }}>Thuật ngữ</h2>
          {GLOSSARY.map((g) => (
            <p key={g.term} style={{ margin: '5px 0' }}>
              <b>{g.term}:</b> {g.def}
            </p>
          ))}
        </div>

        {/* Nhật ký */}
        <div className="card anchor" id="nhat-ky">
          <h2 style={{ marginTop: 0 }}>Nhật ký cập nhật</h2>
          {CHANGELOG.map((c2) => (
            <div key={c2.date} style={{ marginBottom: 10 }}>
              <b>{c2.date}</b>
              <ul>
                {c2.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
