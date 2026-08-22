import { notFound } from 'next/navigation';
import { getDeckById, hasDeckContent, listCategories, listCompanies, getDeckPassword } from '@/lib/decks';
import { listGrantsForDeck } from '@/lib/grants';
import { listGroups, grantedGroupsForDeck } from '@/lib/groups';
import { listRequestsForDeck } from '@/lib/accessRequests';
import { parseUA } from '@/lib/ua';
import { listDeckLog } from '@/lib/log';
import { issueLinkAction, revokeLinkAction, updateContentAction, grantDeckToGroupAction, revokeGroupOnDeckAction, setDeckPasswordAction, generateDeckPasswordAction, clearDeckPasswordAction, updateDeckMetaAction, generateThumbnailAction, setDeckPublishedAction, setDeckVisibilityAction, setDeckSourceAction, deleteDeckAction, approveRequestAction, denyRequestAction } from '../../actions';
import CopyField from '@/components/CopyField';
import SubmitBar from '@/components/SubmitBar';

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
  searchParams: { link?: string; pw?: string; thumb?: string; del?: string; content?: string };
}) {
  const deck = await getDeckById(params.id);
  if (!deck) notFound();

  const appUrl = process.env.APP_URL ?? '';
  const viewUrl = `${appUrl}/d/${deck.slug}`;

  const grants = await listGrantsForDeck(deck.id).catch(() => []);
  const log = await listDeckLog(deck.id, 60).catch(() => []);
  const hasContent = await hasDeckContent(deck.id).catch(() => false);
  const groups = await listGroups().catch(() => []);
  const grantedGroups = await grantedGroupsForDeck(deck.id).catch(() => []);
  const requests = await listRequestsForDeck(deck.id).catch(() => []);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const categories = await listCategories().catch(() => []);
  const companies = await listCompanies().catch(() => []);
  const currentPw = deck.has_password ? await getDeckPassword(deck.id).catch(() => null) : null;

  return (
    <div>
      <h2>{deck.title}</h2>
      <p className="muted">
        slug <code>{deck.slug}</code> ·{' '}
        {deck.visibility === 'public' && !deck.has_password ? 'Công khai (mở tự do)' : 'Bảo mật'}
        {deck.require_otp ? ' · OTP' : ''}
        {deck.has_password ? ' · 🔒 Có mật khẩu' : ''} ·{' '}
        {deck.is_published ? 'Đã xuất bản' : <b style={{ color: 'var(--bad)' }}>Đã ẩn (lưu trữ)</b>}
      </p>

      {!deck.is_published && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Deck đang <b>ẩn</b>: link <code>{viewUrl}</code> trả 404, không ai xem được cho tới khi bạn khôi phục.
        </div>
      )}

      <div className="row" style={{ marginBottom: 12, gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <form action={setDeckPublishedAction}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <input type="hidden" name="published" value={deck.is_published ? 'false' : 'true'} />
          <button className={`btn ${deck.is_published ? '' : 'primary'}`} type="submit">
            {deck.is_published ? '📥 Ẩn / lưu trữ deck' : '↩︎ Khôi phục (xuất bản lại)'}
          </button>
        </form>
        <form action={setDeckVisibilityAction}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <input type="hidden" name="visibility" value={deck.visibility === 'public' ? 'protected' : 'public'} />
          <button className="btn" type="submit">
            {deck.visibility === 'public' ? '🔒 Chuyển sang Bảo mật' : '🌐 Chuyển sang Công khai'}
          </button>
        </form>
      </div>
      <p className="muted" style={{ marginBottom: 24, fontSize: 13, maxWidth: 660 }}>
        <b>Công khai</b> = ai có link là xem được (nếu có đặt mật khẩu thì vẫn phải nhập mật khẩu).{' '}
        <b>Bảo mật</b> = cần link cá nhân được cấp / đăng nhập Google / gửi yêu cầu duyệt (kiểm soát từng người).
      </p>

      <h2 style={{ marginTop: 8 }}>🔗 Nguồn / Chat gốc</h2>
      <p className="muted">Link tới cuộc chat Claude (hoặc nguồn khác) đã tạo deck — để mở lại và điều chỉnh/cập nhật khi cần. Tuỳ chọn.</p>
      {deck.source_url && (
        <div className="row" style={{ gap: 10, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <a className="btn primary" href={deck.source_url} target="_blank" rel="noreferrer">Mở nguồn ↗</a>
          <span className="muted" style={{ fontSize: 12, wordBreak: 'break-all', flex: 1, minWidth: 240 }}>{deck.source_url}</span>
        </div>
      )}
      <div className="row" style={{ maxWidth: 640, marginBottom: 32, alignItems: 'flex-end', gap: 10 }}>
        <form action={setDeckSourceAction} className="row" style={{ flex: 1, alignItems: 'flex-end' }}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <div style={{ flex: 1 }}>
            <label htmlFor="source_url">{deck.source_url ? 'Đổi link nguồn' : 'Dán link nguồn (chat Claude / Google Doc / Outline…)'}</label>
            <input id="source_url" name="source_url" type="url" placeholder="https://claude.ai/chat/…" defaultValue={deck.source_url ?? ''} />
          </div>
          <button className="btn" type="submit">Lưu</button>
        </form>
        {deck.source_url && (
          <form action={setDeckSourceAction}>
            <input type="hidden" name="deck_id" value={deck.id} />
            <input type="hidden" name="source_url" value="" />
            <button className="btn" type="submit" title="Gỡ link nguồn">Gỡ</button>
          </form>
        )}
      </div>

      {searchParams.link && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="tag">Link cá nhân vừa cấp</span>
          <p className="muted">Gửi link này cho người xem (mỗi người một link riêng, có thể thu hồi):</p>
          <CopyField value={searchParams.link} />
        </div>
      )}

      {searchParams.pw && (
        <div className="card" style={{ marginBottom: 20 }}>
          <span className="tag">Mật khẩu deck vừa đặt</span>
          <p className="muted">Chỉ hiện <b>1 lần</b> (hệ chỉ lưu bản băm). Gửi <b>link + mật khẩu</b> cho người xem:</p>
          <CopyField label="Mật khẩu" value={searchParams.pw} mono />
          <div style={{ marginTop: 10 }}>
            <CopyField label="Link xem (gửi kèm)" value={viewUrl} />
          </div>
        </div>
      )}

      {searchParams.thumb && (
        <p className="muted" style={{ color: searchParams.thumb === 'ok' ? 'var(--ok)' : 'var(--bad)' }}>
          {searchParams.thumb === 'ok'
            ? '✓ Đã tạo ảnh preview.'
            : '✗ Không tạo được ảnh preview (kiểm tra nội dung deck / browserless).'}
        </p>
      )}

      <h2 style={{ marginTop: 8 }}>Phân loại</h2>
      <form action={updateDeckMetaAction} style={{ maxWidth: 560, marginBottom: 24 }}>
        <input type="hidden" name="deck_id" value={deck.id} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="company">Công ty</label>
            <input id="company" name="company" list="companies" defaultValue={deck.company} />
            <datalist id="companies">{companies.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="category">Danh mục</label>
            <input id="category" name="category" list="categories" defaultValue={deck.category ?? ''} placeholder="vd: Nhà đầu tư" />
            <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        </div>
        <label htmlFor="tags">Thẻ (tags) — cách nhau bằng dấu phẩy</label>
        <input id="tags" name="tags" defaultValue={deck.tags.join(', ')} placeholder="vd: 2026, chiến lược, vàng" />
        <div style={{ marginTop: 12 }}><button className="btn primary" type="submit">Lưu phân loại</button></div>
      </form>

      <h2 style={{ marginTop: 8 }}>Ảnh preview</h2>
      <p className="muted">Ảnh chụp slide đầu, hiện ở trang chủ để dễ nhận. Tự tạo lại khi cập nhật nội dung; hoặc bấm nút bên dưới.</p>
      <div className="row" style={{ marginBottom: 32, alignItems: 'flex-start', gap: 16 }}>
        <div className="thumb" style={{ width: 240, flex: '0 0 240px', border: '1px solid var(--line)' }}>
          {deck.has_thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb-img" src={`/api/thumb/${deck.id}?t=${Date.now()}`} alt="preview" />
          ) : (
            <div className="thumb-ph" style={{ background: 'var(--paper)' }}><span style={{ color: 'var(--faint)' }}>—</span></div>
          )}
        </div>
        <form action={generateThumbnailAction}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <button className="btn" type="submit">{deck.has_thumbnail ? 'Tạo lại ảnh preview' : 'Tạo ảnh preview'}</button>
        </form>
      </div>

      <h2 style={{ marginTop: 8 }}>Mật khẩu deck</h2>
      <p className="muted">
        Khoá deck bằng <b>một mật khẩu chung</b>: ai có link <code>{viewUrl}</code> + mật khẩu là xem được ngay,
        KHÔNG cần cấp link cá nhân. {deck.visibility === 'protected' && '(Người đã có link cá nhân vẫn vào thẳng, không cần mật khẩu.)'} Trạng thái:{' '}
        {deck.has_password ? <span className="pill ok">Đang bật</span> : <span className="pill">Chưa đặt</span>}
      </p>
      <div style={{ maxWidth: 560, marginBottom: 14 }}>
        <CopyField label="Link xem (gửi cho người xem)" value={viewUrl} />
      </div>
      {deck.has_password && (
        currentPw ? (
          <details style={{ maxWidth: 560, marginBottom: 16, border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px' }}>
            <summary style={{ cursor: 'pointer', color: 'var(--brand)', fontWeight: 600 }}>🔑 Hiện mật khẩu hiện tại</summary>
            <div style={{ marginTop: 10 }}>
              <CopyField label="Mật khẩu hiện tại (gửi kèm link)" value={currentPw} mono />
            </div>
          </details>
        ) : (
          <p className="muted" style={{ maxWidth: 560, marginBottom: 16 }}>
            Mật khẩu hiện tại được đặt <b>trước khi có tính năng xem lại</b> nên chỉ lưu dạng băm — không hiển thị lại được.
            Bấm <b>Tạo tự động</b> hoặc đặt mật khẩu mới bên dưới; từ đó về sau sẽ xem/copy lại được ở đây.
          </p>
        )
      )}
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
      {searchParams.content === 'convertfail' && (
        <div className="notice" style={{ marginBottom: 12, color: 'var(--bad)' }}>
          ✗ Không chuyển được file PDF/PPTX (dịch vụ convert lỗi hoặc file không hợp lệ). Thử lại, hoặc kiểm tra dịch vụ deck-converter.
        </div>
      )}
      {searchParams.content === 'ok' && (
        <div className="notice" style={{ marginBottom: 12, color: 'var(--ok)' }}>✓ Đã cập nhật nội dung deck.</div>
      )}
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
        <label htmlFor="htmlfile">Cập nhật nội dung — tải file <b>.pdf / .pptx / .html</b></label>
        <input id="htmlfile" name="htmlfile" type="file" accept=".html,text/html,.pdf,application/pdf,.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint" />
        <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>PDF/PPTX → tự chuyển thành deck ảnh (giữ nguyên watermark/mật khẩu/cấp-thu link/log). File <b>.html</b> self-contained lưu thẳng làm nội dung deck. Tối đa 20MB/file.</p>
        <label htmlFor="content" style={{ marginTop: 10 }}>…hoặc dán HTML</label>
        <textarea id="content" name="content" rows={4} placeholder="<!doctype html>…" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
        <SubmitBar />
      </form>

      <h2 style={{ marginTop: 8 }}>
        Yêu cầu cấp quyền{pendingCount > 0 && <span className="pill bad" style={{ marginLeft: 8 }}>{pendingCount} chờ duyệt</span>}
      </h2>
      <p className="muted">Người xem gửi yêu cầu từ trang mở deck. <b>Đồng ý</b> = cấp link cá nhân + email cho họ (đổi quyết định được bất cứ lúc nào).</p>
      {requests.length === 0 ? (
        <p className="muted">Chưa có yêu cầu nào.</p>
      ) : (
        <table style={{ marginBottom: 32 }}>
          <thead><tr><th>Người yêu cầu</th><th>Lý do</th><th>Thiết bị / IP</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {requests.map((r) => {
              const uaInfo = parseUA(r.user_agent);
              return (
                <tr key={r.id}>
                  <td>{r.name ? `${r.name} · ` : ''}<span className="muted">{r.email}</span></td>
                  <td className="muted" style={{ maxWidth: 220 }}>{r.message || '—'}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{uaInfo.browser} · {uaInfo.os}<br />{r.ip ?? '—'}</td>
                  <td className="muted">{fmt(r.created_at)}</td>
                  <td>
                    <span className={`pill ${r.status === 'approved' ? 'ok' : r.status === 'denied' ? 'bad' : ''}`}>
                      {r.status === 'approved' ? 'Đã duyệt' : r.status === 'denied' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                    {r.decided_by && <div className="muted" style={{ fontSize: 11 }}>bởi {r.decided_by}</div>}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {r.status !== 'approved' && (
                        <form action={approveRequestAction}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="deck_id" value={deck.id} />
                          <button className="btn primary" type="submit">Đồng ý</button>
                        </form>
                      )}
                      {r.status !== 'denied' && (
                        <form action={denyRequestAction}>
                          <input type="hidden" name="request_id" value={r.id} />
                          <input type="hidden" name="deck_id" value={deck.id} />
                          <button className="btn" type="submit">Từ chối</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

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

      <h2 style={{ marginTop: 40, color: 'var(--bad)' }}>Vùng nguy hiểm — Xoá deck</h2>
      <p className="muted">
        Xoá <b>vĩnh viễn</b> deck này khỏi hệ thống: mất nội dung, ảnh preview, mọi link cá nhân đã cấp và quyền nhóm
        (nhật ký truy cập vẫn giữ, ẩn danh deck). <b>Không khôi phục được.</b> Nếu chỉ muốn tạm ẩn, hãy dùng
        “Ẩn / lưu trữ deck” ở trên.
      </p>
      {searchParams.del === 'mismatch' && (
        <p className="muted" style={{ color: 'var(--bad)' }}>✗ Bạn gõ chưa đúng slug — chưa xoá gì cả.</p>
      )}
      <details style={{ maxWidth: 560, border: '1px solid var(--bad)', borderRadius: 8, padding: 14 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--bad)', fontWeight: 600 }}>Tôi muốn xoá vĩnh viễn deck này</summary>
        <form action={deleteDeckAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="deck_id" value={deck.id} />
          <label htmlFor="confirm_slug">Gõ đúng slug <code>{deck.slug}</code> để xác nhận</label>
          <input id="confirm_slug" name="confirm_slug" autoComplete="off" placeholder={deck.slug} />
          <div style={{ marginTop: 12 }}>
            <button className="btn danger" type="submit">Xoá vĩnh viễn</button>
          </div>
        </form>
      </details>
    </div>
  );
}
