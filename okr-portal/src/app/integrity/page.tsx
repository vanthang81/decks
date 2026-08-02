import Link from 'next/link';
import HelpTip from '@/components/HelpTip';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, listPeriods } from '@/lib/periods';
import { integrityGroups } from '@/lib/integrity';

export const dynamic = 'force-dynamic';

// Trang trace-back "Toàn vẹn alignment": từ cảnh báo đếm số → liệt kê ĐÍCH DANH từng mục + link chi tiết.
export default async function IntegrityPage() {
  await requireUser();
  const period = (await getCurrentPeriod()) ?? (await listPeriods())[0] ?? null;
  const groups = period ? await integrityGroups(period.id) : [];
  const total = groups.reduce((s, g) => s + g.count, 0);

  return (
    <>
      <SiteHeader active="review" />
      <div className="wrap">
        <div className="flexbtw">
          <div>
            <div className="pagetitle">
              Toàn vẹn alignment — chi tiết<HelpTip k="integrity" />
            </div>
            <p className="subtitle">
              {period ? `Kỳ ${period.name}` : 'Chưa có kỳ'} · {total} mục cần bịt trong chuỗi chiến lược → thực thi
            </p>
          </div>
          <Link className="btn ghost" href="/">
            ← Bảng điều khiển
          </Link>
        </div>

        {groups.length === 0 && (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              🎉 Không phát hiện lỗ hổng nào trong kỳ này — chuỗi chiến lược → thực thi đang toàn vẹn.
            </p>
          </div>
        )}

        {/* Mục lục nhanh */}
        {groups.length > 1 && (
          <div className="card intg-toc">
            {groups.map((g) => (
              <a key={g.key} href={`#${g.key}`} className="intg-toc-item">
                <span className="intg-n">{g.count}</span>
                <span>{g.label}</span>
              </a>
            ))}
          </div>
        )}

        {groups.map((g) => (
          <div key={g.key} id={g.key} className="card intg-detail">
            <h3 style={{ marginTop: 0 }}>
              <span className="intg-n">{g.count}</span> {g.label}
            </h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
              {g.hint}
            </p>
            <div className="intg-items">
              {g.items.map((it, i) => (
                <Link key={i} href={it.href} className="intg-item">
                  {it.code && <span className="okr-code">{it.code}</span>}
                  <span className="intg-item-ttl">{it.title}</span>
                  {it.sub && <span className="intg-item-sub muted">{it.sub}</span>}
                  <span className="intg-item-go" aria-hidden>
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
