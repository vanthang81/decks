import { notFound } from 'next/navigation';
import { getDeckById, hasDeckContent } from '@/lib/decks';
import { listGrantsForDeck } from '@/lib/grants';
import { listGroups, grantedGroupsForDeck } from '@/lib/groups';
import { listDeckLog } from '@/lib/log';
import { issueLinkAction, revokeLinkAction, updateContentAction, grantDeckToGroupAction, revokeGroupOnDeckAction, setDeckPasswordAction, generateDeckPasswordAction, clearDeckPasswordAction } from '../../actions';

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
  searchParams: { link?: string; pw?: string };
}) {
  const deck = await getDeckById(params.id);
  if (!deck) notFound();

  const grants = await listGrantsForDeck(deck.id).catch(() => []);
  const log = await listDeckLog(deck.id, 60).catch(() => []);
  const hasContent = await hasDeckContent(deck.id).catch(() => false);
  const groups = await listGroups().catch(() => []);
  const grantedGroups = await grantedGroupsForDeck(deck.id).catch(() => []);

  return (
    <div>
      <h2>{deck.title}</h2>
      <p className="muted">
        slug <code>{deck.slug}</code> ·{' '}
        {deck.visibility === 'public' ? 'Công khai' : 'Bảo mật'}
        {deck.require_otp ? ' · OTP' : ''}
        {deck.has_password ? ' · 🔒 Có mật khẩu' : ''} · {deck.is_published ? 'Đã xuất bản' : 'Nháp'}
      </p>

      {searchParams.link && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="tag">Link cá nhân vừa cấp</span>
          <p className="muted">Gửi link này cho người xem (mỗi người một link riêng, có thể thu hồi):</p>
          <input readOnly value={searchParams.link} onFocus={undefined} />
        </div>
      )}

      {searchParams.pw && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="tag">Mật khẩu deck vừa đặt</span>
          <p className="muted">Chỉ hiện <b>1 lần</b> (hệ chỉ lưu bản băm). Gửi kèm link deck cho người xem:</p>
          <input readOnly value={searchParams.pw} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 15 }} />
          <p className="muted" style={{ marginTop: 8 }}>Link xem: <code>{`/d/${deck.slug}`}</code> → nhập mật khẩu trên.</p>
        </div>
      )}

      <h2 style={{ marginTop: 8 }}>Mật khẩu deck</h2>
      <p className="muted">
        Khoá deck bằng <b>một mật khẩu chung</b>: ai có link <code>/d/{deck.slug}</code> + mật khẩu là xem được,
        không cần cấp link cá nhân. {deck.visibility === 'protected' && 'Deck bảo mật vẫn cần thêm link cá nhân sau khi qua mật khẩu.'} Trạng thái:{' '}
        {deck.has_password ? <span className="pill ok">Đang bật</span> : <span className="pill">Chưa đặt</span>}
      </p>
      <div className="row" style={{ maxWidth: 560, marginBottom: 32, alignItems: 'flex-end' }}>
        <form action={setDeckPasswordAction} className="row" style={{ flex: 1, alignItems: 'flex-end' }}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <div style={{ flex: 1 }}>
            <label htmlFor="password">Đặt mật khẩu (tối thiểu 4 ký tự)</label>
            <input id="password" name="password" type="text" placeholder="mật khẩu tự chọn" minLength={4} />
          </div>
          <button className="btn primary" type="submit">Đặt</button>
        </form>
        <form action={generateDeckPasswordAction}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <button className="btn" type="submit">Tạo tự động</button>
        </form>
        {deck.has_password && (
          <form action={clearDeckPasswordAction}>
            <input type="hidden" name="deck_id" value={deck.id} />
            <button className="btn" type="submit">Gỡ mật khẩu</button>
          </form>
        )}
      </div>

      <h2 style={{ marginTop: 8 }}>Nội dung deck</h2>
      <p className="muted">
        Nguồn hiện tại:{' '}
        {hasContent ? (
          <span className="pill ok">HTML trong DB (tải qua admin)</span>
        ) : (
          <span className="pill">file <code>content/decks/{deck.slug}.html</code> trong repo</span>
        )}
        {' · '}<a href={`/d/${deck.slug}`} target="_blank" rel="noreferrer">Xem deck →</a>
      </p>
      <form action={updateContentAction} style={{ maxWidth: 560, marginBottom: 32 }}>
        <input type="hidden" name="deck_id" value={deck.id} />
        <label htmlFor="htmlfile">Cập nhật nội dung — tải file .html</label>
        <input id="htmlfile" name="htmlfile" type="file" accept=".html,text/html" />
        <label htmlFor="content">…hoặc dán HTML</label>
        <textarea id="content" name="content" rows={4} placeholder="<!doctype html>…" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="submit">Lưu nội dung</button>
        </div>
      </form>

      <h2 style={{ marginTop: 8 }}>Cấp cho nhóm</h2>
      <p className="muted">Cấp deck này cho cả một nhóm — mỗi thành viên tự nhận link cá nhân + watermark riêng. Thành viên thêm vào nhóm sau cũng tự có quyền.</p>
      {grantedGroups.length > 0 && (
        <table style={{ marginBottom: 16 }}>
          <thead><tr><th>Nhóm đã cấp</th><th>Có link / thành viên</th><th></th></tr></thead>
          <tbody>
            {grantedGroups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.active}/{g.members} người</td>
                <td>
                  <form action={revokeGroupOnDeckAction}>
                    <input type="hidden" name="deck_id" value={deck.id} />
                    <input type="hidden" name="group_id" value={g.id} />
                    <button className="btn" type="submit">Thu hồi cả nhóm</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={grantDeckToGroupAction} className="row" style={{ maxWidth: 560, marginBottom: 32, alignItems: 'flex-end' }}>
        <input type="hidden" name="deck_id" value={deck.id} />
        <div style={{ flex: 1 }}>
          <label htmlFor="group_id">Chọn nhóm</label>
          <select id="group_id" name="group_id" required>
            <option value="">— chọn nhóm —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name} ({g.member_count ?? 0} người)</option>
            ))}
          </select>
        </div>
        <button className="btn primary" type="submit">Cấp cho nhóm</button>
      </form>

      <h2 style={{ marginTop: 8 }}>Cấp link cho từng người</h2>
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
