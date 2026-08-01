import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageSystem, canAssignPerms } from '@/lib/access';
import { CAPABILITIES, CAP_CATEGORIES, DEFAULT_GROUPS } from '@/lib/capabilities';
import { savePermissionsAction } from '../actions';

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

  const groups = DEFAULT_GROUPS; // thứ tự + nhãn cố định; caps lấy từ access
  const has = (g: string, cap: string) => access.groups[g]?.has(cap as never) ?? false;

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
          <b>“Toàn phạm vi”</b>. Danh sách năng lực <b>tự mở rộng</b> khi hệ thống thêm tính năng mới.
        </p>

        {searchParams.saved && <p className="badge green">Đã lưu phân quyền.</p>}
        {!editable && (
          <p className="badge amber">Bạn xem được nhưng cần năng lực “Phân quyền người dùng” để chỉnh.</p>
        )}

        {/* Chú thích nhóm */}
        <div className="card">
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
          <div className="card">
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
                      <>
                        <tr key={`cat-${cat.key}`} className="perm-cat">
                          <td colSpan={groups.length + 1}>{cat.label}</td>
                        </tr>
                        {caps.map((c) => (
                          <tr key={c.key}>
                            <td style={{ textAlign: 'left' }}>
                              <b>{c.label}</b>
                              <div className="muted" style={{ fontSize: 12 }}>{c.desc}</div>
                            </td>
                            {groups.map((g) => {
                              const locked = g.key === 'system_admin' || !editable;
                              return (
                                <td key={g.key} style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    name={`cap_${g.key}_${c.key}`}
                                    defaultChecked={g.key === 'system_admin' ? true : has(g.key, c.key)}
                                    disabled={locked}
                                    style={{ width: 'auto' }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0, marginTop: 10 }}>
              Nhóm <b>🛡️ Quản trị hệ thống</b> cố định toàn quyền (không thể tự khoá để tránh mất quyền quản trị).
            </p>
            {editable && (
              <div style={{ marginTop: 12 }}>
                <button className="btn" type="submit">Lưu phân quyền</button>
              </div>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
