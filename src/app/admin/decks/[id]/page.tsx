import { notFound } from 'next/navigation';
import { getDeckById } from '@/lib/decks';
import { listGrantsForDeck } from '@/lib/grants';
import { listDeckLog } from '@/lib/log';
import { issueLinkAction, revokeLinkAction } from '../../actions';

export const dynamic = 'force-dynamic';

function fmt(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { link?: string };
}) {
  const deck = await getDeckById(params.id);
  if (!deck) notFound();

  const grants = await listGrantsForDeck(deck.id).catch(() => []);
  const log = await listDeckLog(deck.id, 60).catch(() => []);

  return (
    <div>
      <h2>{deck.title}</h2>
      <p className="muted">
        slug <code>{deck.slug}</code> ·{' '}
        {deck.visibility === 'public' ? 'Công khai' : 'Bảo mật'}
        {deck.require_otp ? ' · OTP' : ''} · {deck.is_published ? 'Đã xuất bản' : 'Nháp'}
      </p>

      {searchParams.link && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="tag">Link cá nhân vừa cấp</span>
          <p className="muted">Gửi link này cho người xem (mỗi người một link riêng, có thể thu hồi):</p>
          <input readOnly value={searchParams.link} onFocus={undefined} />
        </div>
      )}

      <h2 style={{ marginTop: 8 }}>Cấp link cho người xem</h2>
      <form action={issueLinkAction} style={{ maxWidth: 560, marginBottom: 32 }}>
        <input type="hidden" name="deck_id" value={deck.id} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="email">Email người xem</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="name">Tên</label>
            <input id="name" name="name" />
          </div>
        </div>
        <label htmlFor="company">Công ty (tùy chọn)</label>
        <input id="company" name="company" />
        <div className="row" style={{ marginTop: 12 }}>
          <label style={{ margin: 0 }}>
            <input type="checkbox" name="send_email" style={{ width: 'auto' }} /> Gửi email link luôn
          </label>
          <button className="btn primary" type="submit">Cấp link</button>
        </div>
      </form>

      <h2>Người đã được cấp</h2>
      <table style={{ marginBottom: 32 }}>
        <thead><tr><th>Người xem</th><th>Trạng thái</th><th>Lượt xem</th><th>Xem gần nhất</th><th></th></tr></thead>
        <tbody>
          {grants.map((g) => (
            <tr key={g.id}>
              <td>{g.viewer_name ? `${g.viewer_name} · ` : ''}<span className="muted">{g.viewer_email}</span></td>
              <td>
                <span className={`pill ${g.status === 'active' ? 'ok' : 'bad'}`}>
                  {g.status === 'active' ? 'Hiệu lực' : 'Đã thu hồi'}
                </span>
              </td>
              <td>{g.views}</td>
              <td className="muted">{fmt(g.last_view)}</td>
              <td>
                {g.status === 'active' && (
                  <form action={revokeLinkAction}>
                    <input type="hidden" name="grant_id" value={g.id} />
                    <input type="hidden" name="deck_id" value={deck.id} />
                    <button className="btn" type="submit">Thu hồi</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {grants.length === 0 && <tr><td colSpan={5} className="muted">Chưa cấp cho ai.</td></tr>}
        </tbody>
      </table>

      <h2>Nhật ký truy cập</h2>
      <table>
        <thead><tr><th>Thời gian</th><th>Người xem</th><th>Sự kiện</th><th>IP</th></tr></thead>
        <tbody>
          {log.map((l, i) => (
            <tr key={i}>
              <td className="muted">{fmt(l.created_at)}</td>
              <td>{l.viewer_email ?? '—'}</td>
              <td>{l.event}{l.slide_no != null ? ` #${l.slide_no}` : ''}</td>
              <td className="muted">{l.ip ?? '—'}</td>
            </tr>
          ))}
          {log.length === 0 && <tr><td colSpan={4} className="muted">Chưa có lượt truy cập.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
