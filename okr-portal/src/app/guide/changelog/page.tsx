import SiteHeader from '@/components/SiteHeader';
import { CHANGELOG, GUIDE_VERSION } from '@/lib/guide';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nhật ký cập nhật · BTMH OKR' };

// Nhật ký cập nhật TÁCH RIÊNG khỏi trang Hướng dẫn (CFO 30/08) để trang Hướng dẫn gọn, dễ theo dõi.
export default function ChangelogPage() {
  return (
    <>
      <SiteHeader active="guide" />
      <div className="wrap guide">
        <p className="subtitle" style={{ marginBottom: 6 }}><a href="/guide">← Hướng dẫn</a></p>
        <div className="guide-hero">
          <h1>🕓 Nhật ký cập nhật</h1>
          <p>Các thay đổi &amp; tính năng mới của hệ thống theo thời gian (mới nhất ở trên).</p>
          <span className="ver">Phiên bản tài liệu · {GUIDE_VERSION}</span>
        </div>

        <div className="card">
          <div className="timeline">
            {CHANGELOG.map((c) => (
              <div className="tl-item" key={c.date}>
                <div className="tl-date">{c.date}</div>
                <ul>
                  {c.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
