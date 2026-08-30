import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import UserLink from '@/components/UserLink';
import ToastForm from '@/components/ToastForm';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem } from '@/lib/access';
import {
  listAudit, countAudit, auditStats, getAuditRetentionDays,
  AUDIT_GROUPS, AUDIT_RETENTION_OPTIONS, describeAudit, type AuditFilter,
} from '@/lib/audit';
import { listUsers } from '@/lib/users';
import { fmtDateTime, fmtDate } from '@/lib/format';
import { saveAuditRetentionAction, pruneAuditNowAction, clearAllAuditAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nhật ký hoạt động · BTMH OKR' };

const PAGE_SIZE = 50;

// Nhóm của 1 action (để tô badge màu) — khớp tiền tố.
function groupOf(action: string): string {
  for (const g of AUDIT_GROUPS) if (g.prefixes.some((p) => action.startsWith(p))) return g.key;
  return 'other';
}
const GROUP_BADGE: Record<string, string> = {
  auth: 'green', okr: 'blue', kr: 'blue', task: 'amber', project: 'slate',
  meeting: 'gold', user: 'red', system: 'gray', other: 'gray',
};

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}

export default async function AdminActivity({
  searchParams,
}: {
  searchParams: { actor?: string; group?: string; from?: string; to?: string; q?: string; page?: string; pruned?: string; cleared?: string; err?: string };
}) {
  const me = await requireUser();
  if (!canManageSystem(me, await loadAccess())) redirect('/');

  const filter: AuditFilter = {
    actor: searchParams.actor || undefined,
    group: searchParams.group || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    q: searchParams.q || undefined,
  };
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const [rows, total, stats, retention, users] = await Promise.all([
    listAudit(filter, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    countAudit(filter),
    auditStats(),
    getAuditRetentionDays(),
    listUsers(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseFilter = { actor: filter.actor, group: filter.group, from: filter.from, to: filter.to, q: filter.q };
  const filterActive = !!(filter.actor || filter.group || filter.from || filter.to || filter.q);
  const retLabel = (d: number) => (d <= 0 ? 'Không tự xoá' : `${d} ngày`);

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/admin">← Quản trị</Link></p>
        <div className="pagetitle">Nhật ký hoạt động<HelpTip k="admin-activity" /></div>
        <p className="subtitle">
          Ai <b>đăng nhập</b>, khi nào, và <b>làm gì</b> (tạo/sửa/xoá OKR · KR · công việc · dự án · cuộc họp ·
          người dùng · phân quyền). Không ghi lượt xem trang để nhẹ dữ liệu.
        </p>

        {searchParams.pruned !== undefined && <p className="badge green">Đã xoá {searchParams.pruned} dòng nhật ký cũ.</p>}
        {searchParams.cleared !== undefined && <p className="badge green">Đã xoá sạch nhật ký ({searchParams.cleared} dòng).</p>}
        {searchParams.err === 'confirm' && <p className="badge red">Chưa xoá: cần gõ đúng “XOA” để xác nhận.</p>}

        {/* Lưu trữ & dọn dẹp */}
        <div className="card" data-tour="activity-retention">
          <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Lưu trữ &amp; dọn dẹp</h3>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {stats.total.toLocaleString('vi-VN')} dòng
              {stats.oldest ? ` · từ ${fmtDate(stats.oldest)}` : ''}
              {stats.newest ? ` → ${fmtDate(stats.newest)}` : ''}
            </span>
          </div>
          <div className="grid two" style={{ marginTop: 12, alignItems: 'start' }}>
            {/* Tự động xoá */}
            <div>
              <ToastForm action={saveAuditRetentionAction} done="Đã lưu cấu hình lưu nhật ký">
                <label className="f" style={{ marginTop: 0 }}>Tự động xoá nhật ký cũ hơn</label>
                <div className="row" style={{ marginTop: 4 }}>
                  <select className="i" name="days" defaultValue={String(retention)} style={{ maxWidth: 200 }}>
                    {AUDIT_RETENTION_OPTIONS.map((d) => (
                      <option key={d} value={d}>{retLabel(d)}</option>
                    ))}
                  </select>
                  <button className="btn sm" type="submit">Lưu</button>
                </div>
              </ToastForm>
              <p className="muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                Cron chạy hằng ngày tự dọn theo mốc này (hiện tại: <b>{retLabel(retention)}</b>). Chọn “Không tự xoá” để giữ vô thời hạn.
              </p>
            </div>
            {/* Xoá thủ công */}
            <div>
              <form action={pruneAuditNowAction}>
                <label className="f" style={{ marginTop: 0 }}>Xoá ngay nhật ký cũ hơn</label>
                <div className="row" style={{ marginTop: 4 }}>
                  <select className="i" name="days" defaultValue="90" style={{ maxWidth: 160 }}>
                    {[7, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} ngày</option>)}
                  </select>
                  <button className="btn ghost sm" type="submit">Xoá log cũ</button>
                </div>
              </form>
              <form action={clearAllAuditAction} style={{ marginTop: 10 }}>
                <label className="f" style={{ marginTop: 0 }}>Xoá sạch toàn bộ (gõ “XOA” để xác nhận)</label>
                <div className="row" style={{ marginTop: 4 }}>
                  <input className="i" name="confirm" placeholder="XOA" autoComplete="off" style={{ maxWidth: 120 }} />
                  <button className="btn ghost sm danger" type="submit">Xoá sạch nhật ký</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="card" data-tour="activity-filter">
          <form className="filterbar" method="get" action="/admin/activity" style={{ marginBottom: 0 }}>
            <select className="i fb-sel" name="actor" defaultValue={filter.actor ?? ''}>
              <option value="">Người: tất cả</option>
              {users.map((u) => (
                <option key={u.email} value={u.email}>{u.display_name || u.email}</option>
              ))}
            </select>
            <select className="i fb-sel" name="group" defaultValue={filter.group ?? ''}>
              <option value="">Loại: tất cả</option>
              {AUDIT_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
            <input className="i fb-sel" type="date" name="from" defaultValue={filter.from ?? ''} title="Từ ngày" />
            <input className="i fb-sel" type="date" name="to" defaultValue={filter.to ?? ''} title="Đến ngày" />
            <input className="i fb-search" name="q" defaultValue={filter.q ?? ''} placeholder="🔍 Tìm trong hành động / đối tượng / người…" />
            <button className="btn sm" type="submit">Lọc</button>
            {filterActive && <Link href="/admin/activity" className="btn ghost sm fb-clear">✕ Xoá lọc</Link>}
          </form>
        </div>

        {/* Bảng nhật ký */}
        <div className="card" data-tour="activity-table">
          <div className="flexbtw" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Kết quả</h3>
            <span className="muted" style={{ fontSize: 12.5 }}>{total.toLocaleString('vi-VN')} dòng · trang {page}/{pages}</span>
          </div>
          {rows.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0, marginTop: 10 }}>Không có hoạt động khớp bộ lọc.</p>
          ) : (
            <div className="table-scroll" style={{ marginTop: 10 }}>
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Thời gian</th>
                    <th style={{ textAlign: 'left' }}>Người</th>
                    <th style={{ textAlign: 'left' }}>Hành động</th>
                    <th style={{ textAlign: 'left' }}>Đối tượng</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</td>
                      <td style={{ fontSize: 13 }}>
                        {e.actor
                          ? <UserLink email={e.actor} name={e.actor_name || e.actor} />
                          : <span className="muted">—</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <span className={`badge ${GROUP_BADGE[groupOf(e.action)] ?? 'gray'}`} style={{ marginRight: 6 }}>
                          {describeAudit(e)}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {e.entity ? `${e.entity}${e.entity_id ? ' · ' + e.entity_id : ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="pager" style={{ marginTop: 12 }}>
              {page > 1
                ? <Link className="btn ghost sm" href={`/admin/activity${qs({ ...baseFilter, page: page - 1 })}`}>← Trước</Link>
                : <span className="btn ghost sm" style={{ opacity: 0.4, pointerEvents: 'none' }}>← Trước</span>}
              <span className="pager-info">Trang {page}/{pages}</span>
              {page < pages
                ? <Link className="btn ghost sm" href={`/admin/activity${qs({ ...baseFilter, page: page + 1 })}`}>Sau →</Link>
                : <span className="btn ghost sm" style={{ opacity: 0.4, pointerEvents: 'none' }}>Sau →</span>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
