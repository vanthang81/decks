import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { isExec, ROLE_LABEL } from '@/lib/rbac';
import { getUserProfile, type ProfileListItem } from '@/lib/people';
import { fmtDateTime, fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function ListCard({ title, items, empty }: { title: string; items: ProfileListItem[]; empty: string }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>({items.length})</span></h3>
      {items.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>{empty}</p>
      ) : (
        <div className="prof-list">
          {items.map((it) => (
            <Link key={it.id} href={it.href} className="prof-row">
              <span className="prof-row-main">
                {it.code && <span className="okr-code" style={{ marginRight: 6 }}>{it.code}</span>}
                <span className="prof-row-ttl">{it.title}</span>
                {it.sub && <span className="muted prof-row-sub"> · {it.sub}</span>}
              </span>
              {it.badge && <span className={`badge ${it.badgeCls ?? 'gray'}`} style={{ flex: '0 0 auto' }}>{it.badge}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function UserProfilePage({ params }: { params: { email: string } }) {
  const viewer = await requireUser();
  const email = decodeURIComponent(params.email);
  const full = isExec(viewer.role);
  const p = await getUserProfile(email, full);
  if (!p) notFound();
  const { identity: id, counts } = p;

  const tiles: { n: number; l: string; color?: string; sub?: string }[] = [
    { n: counts.objectives, l: 'OKR chủ trì' },
    { n: counts.krs, l: 'Key Result' },
    { n: counts.projects, l: 'Dự án chủ trì' },
    { n: counts.tasks, l: 'Công việc được giao' },
    { n: counts.tasksOverdue, l: 'Việc quá hạn', color: counts.tasksOverdue > 0 ? '#dc2626' : undefined },
    { n: counts.meetings, l: 'Cuộc họp' },
  ];

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}><Link href="/admin/users">← Người dùng</Link></p>

        {/* Header hồ sơ */}
        <div className="card">
          <div className="prof-head">
            {id.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={id.avatar_url} alt="" referrerPolicy="no-referrer" className="prof-avatar" />
            ) : (
              <div className="prof-avatar prof-avatar-ph">{(id.display_name || id.email).slice(0, 1).toUpperCase()}</div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="pagetitle" style={{ margin: 0 }}>
                {id.display_name || id.email}
                {!id.is_active && <span className="badge gray" style={{ marginLeft: 8, fontSize: 12 }}>Đã khoá</span>}
                <HelpTip k="user-profile" />
              </div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                <span className="badge gold" style={{ marginRight: 6 }}>{ROLE_LABEL[id.role]}</span>
                {id.title ? `${id.title} · ` : ''}
                {id.unit_name ? `🏢 ${id.unit_name}` : <span className="muted">Chưa gắn đơn vị</span>}
              </div>
              <div className="obj-meta" style={{ marginTop: 4 }}>
                ✉️ <a href={`mailto:${id.email}`}>{id.email}</a>
                {full && id.created_at && <> · Tham gia {fmtDate(id.created_at)}</>}
                {full && <> · Đăng nhập {id.login_count} lần{id.last_login_at ? ` · gần nhất ${fmtDateTime(id.last_login_at)}` : ''}</>}
              </div>
            </div>
          </div>
        </div>

        {/* Số liệu tổng quan */}
        <div className="card">
          <div className="stat prof-tiles">
            {tiles.map((t) => (
              <div key={t.l}>
                <div className="n" style={t.color ? { color: t.color } : undefined}>{t.n}</div>
                <div className="l">{t.l}</div>
              </div>
            ))}
          </div>
          {full && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              Công việc: {counts.tasksOpen} đang mở · {counts.tasksDone} đã xong · {counts.tasksOverdue} quá hạn · {counts.checkins} lượt check-in.
            </div>
          )}
        </div>

        {!full ? (
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <p className="muted" style={{ margin: 0 }}>
              Bạn đang xem hồ sơ ở chế độ CƠ BẢN (định danh + số lượng). Chi tiết nhiệm vụ, check-in,
              lịch sử đăng nhập… chỉ hiển thị cho quản trị (CEO/CFO).
            </p>
          </div>
        ) : (
          <>
            <div className="grid two">
              <ListCard title="🎯 OKR chủ trì" items={p.objectives ?? []} empty="Không chủ trì OKR nào." />
              <ListCard title="🗂 Dự án chủ trì" items={p.projects ?? []} empty="Không chủ trì dự án nào." />
            </div>
            <ListCard title="✅ Công việc được giao" items={p.tasks ?? []} empty="Chưa được giao việc nào." />
            <div className="grid two">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>📌 Check-in gần đây <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>({(p.checkins ?? []).length})</span></h3>
                {(p.checkins ?? []).length === 0 ? <p className="muted" style={{ margin: 0 }}>Chưa có check-in.</p> : (
                  <div className="prof-list">
                    {(p.checkins ?? []).map((c, i) => (
                      <div key={i} className="prof-row" style={{ cursor: 'default' }}>
                        <span className="prof-row-main"><span className="prof-row-ttl">{c.title}</span>{c.sub && <span className="muted prof-row-sub"> · {c.sub}</span>}</span>
                        <span className="muted mono" style={{ fontSize: 11.5, flex: '0 0 auto' }}>{fmtDate(c.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ListCard title="🗓 Cuộc họp" items={p.meetings ?? []} empty="Không tham gia cuộc họp nào." />
            </div>
            {(p.activity ?? []).length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>🕘 Hoạt động gần đây</h3>
                <div className="prof-list">
                  {(p.activity ?? []).map((a, i) => (
                    <div key={i} className="prof-row" style={{ cursor: 'default' }}>
                      <span className="prof-row-main"><span className="prof-row-ttl">{a.action}</span>{a.entity && <span className="muted prof-row-sub"> · {a.entity}</span>}</span>
                      <span className="muted mono" style={{ fontSize: 11.5, flex: '0 0 auto' }}>{fmtDateTime(a.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
