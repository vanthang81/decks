import { Fragment } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem, canAssignPerms, isSuperAdmin, userGroupKey } from '@/lib/access';
import { CAPABILITIES, CAP_CATEGORIES, DEFAULT_GROUPS, SYSADMIN_DENY_CAPS, type GroupKey } from '@/lib/capabilities';
import { ROLES, ROLE_LABEL } from '@/lib/rbac';
import { listPositions } from '@/lib/positions';
import PositionsManager from '@/components/PositionsManager';
import ApplySuggestions from '@/components/ApplySuggestions';
import { savePermissionsAction, savePositionAction, deletePositionAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminPermissions({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const me = await requireUser();
  const access = await loadAccess();
  if (!canManageSystem(me, access)) redirect('/');
  const editable = canAssignPerms(me, access);
  const sa = isSuperAdmin(me);
  const myGroup = userGroupKey(me);
  const DENY = new Set<string>(SYSADMIN_DENY_CAPS);

  const groups = DEFAULT_GROUPS; // thứ tự + nhãn cố định; caps lấy từ access
  const has = (g: string, cap: string) => access.groups[g]?.has(cap as never) ?? false;
  const positions = await listPositions();

  // GỢI Ý phân quyền: ô (năng lực × nhóm) được hệ thống gợi ý nhưng nhóm CHƯA có (do nhóm đã tuỳ biến
  // hoặc do năng lực mới thêm). Đếm để hiện nút "Áp dụng gợi ý".
  const isSuggested = (g: GroupKey, cap: (typeof CAPABILITIES)[number]) => cap.suggest.includes(g);
  let suggestCount = 0;
  if (editable) {
    for (const c of CAPABILITIES) {
      for (const g of groups) {
        if (g.key === 'super_admin' || g.key === 'system_admin') continue; // super=full; sysadmin invariants
        if (!sa && g.key === myGroup) continue; // không tự sửa nhóm của chính mình
        if (isSuggested(g.key as GroupKey, c) && !has(g.key, c.key)) suggestCount++;
      }
    }
  }

  return (
    <>
      <SiteHeader active="admin" />
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <div className="pagetitle">Phân quyền — Nhóm quyền × Năng lực<HelpTip k="okr-perms" /></div>
        <p className="subtitle">
          Mỗi <b>Nhóm quyền</b> gồm một bộ <b>Năng lực</b>. Gán nhóm cho từng người ở{' '}
          <Link href="/admin/users">Người dùng</Link>. <b>CEO/CFO luôn toàn quyền</b>. Năng lực OKR
          (Tạo/Sửa/Xoá) chỉ áp <b>trong phạm vi tổ chức</b> của người đó, trừ khi có năng lực{' '}
          <b>“Toàn phạm vi”</b>. Danh sách năng lực <b>tự mở rộng</b> khi hệ thống thêm tính năng mới —
          ô <span className="perm-sg-inline">gợi ý</span> là năng lực hệ thống <b>khuyến nghị</b> bật cho
          nhóm đó; bấm <b>“Áp dụng gợi ý”</b> để bật nhanh rồi Lưu.
        </p>

        {searchParams.saved && <p className="badge green">Đã lưu phân quyền.</p>}
        {!editable && (
          <p className="badge amber">Bạn xem được nhưng cần năng lực “Phân quyền người dùng” để chỉnh.</p>
        )}

        {/* Vị trí / Chức danh (preset điền nhanh khi thêm người dùng) */}
        <PositionsManager
          positions={positions}
          roles={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          groups={DEFAULT_GROUPS.map((g) => ({ key: g.key, icon: g.icon, label: g.label }))}
          editable={editable}
          saveAction={savePositionAction}
          deleteAction={deletePositionAction}
        />

        {/* Chú thích nhóm */}
        <div className="card" data-tour="perm-legend">
          <div className="grp-legend">
            {groups.map((g) => (
              <div key={g.key} className="grp-chip">
                <span className="grp-ic">{g.icon}</span>
                <div>
                  <b>{g.label}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action={savePermissionsAction}>
          <div className="card" data-tour="perm-matrix">
            <div className="table-scroll">
              <table className="perm-matrix">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: 220 }}>Năng lực</th>
                    {groups.map((g) => (
                      <th key={g.key} title={g.desc}>
                        <div className="grp-h">{g.icon}</div>
                        <div className="grp-h-l">{g.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAP_CATEGORIES.map((cat) => {
                    const caps = CAPABILITIES.filter((c) => c.cat === cat.key);
                    if (caps.length === 0) return null;
                    return (
                      <Fragment key={cat.key}>
                        <tr className="perm-cat">
                          <td colSpan={groups.length + 1}>{cat.label}</td>
                        </tr>
                        {caps.map((c) => (
                          <tr key={c.key}>
                            <td style={{ textAlign: 'left' }}>
                              <b>{c.label}</b>
                              <div className="muted" style={{ fontSize: 12 }}>{c.desc}</div>
                            </td>
                            {groups.map((g) => {
                              const isSuperCol = g.key === 'super_admin';
                              // Bất biến: super_admin luôn đủ; super.admin chỉ ở super_admin; system_admin bỏ cap riêng tư.
                              const invOn = isSuperCol;
                              const invOff = (c.key === 'super.admin' && !isSuperCol) || (g.key === 'system_admin' && DENY.has(c.key));
                              const locked =
                                !editable || invOn || invOff ||
                                (isSuperCol && !sa) ||           // chỉ Super Admin sửa nhóm Super Admin
                                (!sa && g.key === myGroup) ||    // không tự sửa quyền của chính mình
                                (c.key === 'super.admin' && !sa);
                              const on = invOn ? true : invOff ? false : has(g.key, c.key);
                              const showSg = !locked && isSuggested(g.key as GroupKey, c) && !on;
                              return (
                                <td key={g.key} style={{ textAlign: 'center' }} className={showSg ? 'perm-sg-cell' : undefined}>
                                  <input
                                    type="checkbox"
                                    name={`cap_${g.key}_${c.key}`}
                                    defaultChecked={on}
                                    disabled={locked}
                                    data-suggested={showSg ? '1' : undefined}
                                    style={{ width: 'auto' }}
                                  />
                                  {showSg && <div className="perm-sg" title="Gợi ý: nhóm này nên có năng lực này">gợi ý</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0, marginTop: 10 }}>
              <b>👑 Super Admin</b> là đỉnh quyền lực (toàn quyền cố định, chỉ 2 tài khoản tối cao) — chỉ Super Admin
              chỉnh được cột này &amp; gán quyền Super Admin. <b>🛡️ Quản trị hệ thống</b> KHÔNG có “Toàn phạm vi” &amp;
              “Hồ sơ 360°” (không xem việc/hồ sơ riêng tư của cá nhân). Trừ Super Admin, không ai tự chỉnh được
              quyền của <b>chính nhóm mình</b> (ô bị khoá).
            </p>
            {editable && (
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn" type="submit">Lưu phân quyền</button>
                <ApplySuggestions count={suggestCount} />
                {suggestCount > 0 && (
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Có {suggestCount} gợi ý phân quyền chưa áp dụng.
                  </span>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
