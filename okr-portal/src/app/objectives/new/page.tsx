import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { requireUser } from '@/lib/current-user';
import { listUnits, manageScope } from '@/lib/org';
import { listUsers } from '@/lib/users';
import { getCurrentPeriod, getPeriod, listPeriods } from '@/lib/periods';
import { listObjectivesByPeriod, LEVEL_LABEL, OKR_TYPE_LABEL, OKR_TYPE_EXPECT } from '@/lib/okr';
import { createObjectiveAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewObjectivePage({
  searchParams,
}: {
  searchParams: { period?: string; parent?: string };
}) {
  const user = await requireUser();
  const periods = await listPeriods();
  const period = searchParams.period
    ? await getPeriod(searchParams.period)
    : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const units = await listUnits();
  const users = await listUsers();
  const scope = manageScope(user, units);
  const allowedUnits =
    scope === null ? units : units.filter((u) => scope.has(u.id));
  const objectives = period ? await listObjectivesByPeriod(period.id) : [];

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <div className="pagetitle">Tạo OKR mới</div>
        <p className="subtitle">
          {period ? `Kỳ: ${period.name}` : 'Chưa có kỳ OKR — vào Quản trị tạo kỳ trước.'}
        </p>

        {!period ? (
          <div className="card">
            <Link href="/admin/periods">Tạo kỳ OKR</Link>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 640 }}>
            <form action={createObjectiveAction}>
              <input type="hidden" name="period_id" value={period.id} />

              <label className="f">Cấp OKR</label>
              <select className="i" name="level" defaultValue="department" required>
                {(['company', 'division', 'department', 'individual'] as const).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>

              <label className="f">Đơn vị (Khối/Phòng — bỏ trống nếu OKR cá nhân)</label>
              <select className="i" name="unit_id" defaultValue="">
                <option value="">— Không gắn đơn vị —</option>
                {allowedUnits
                  .filter((u) => u.type !== 'company' || user.role === 'exec')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {'· '.repeat(u.type === 'department' ? 1 : 0)}
                      {u.name} ({u.type === 'division' ? 'Khối' : u.type === 'department' ? 'Phòng' : 'Công ty'})
                    </option>
                  ))}
              </select>

              <label className="f">Người chủ trì</label>
              <select className="i" name="owner_email" defaultValue={user.email}>
                <option value="">— Chưa gán —</option>
                {users.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.display_name || u.email}
                    {u.unit_name ? ` · ${u.unit_name}` : ''}
                  </option>
                ))}
              </select>

              <label className="f">Liên kết lên OKR cấp trên (alignment)</label>
              <select className="i" name="parent_id" defaultValue={searchParams.parent ?? ''}>
                <option value="">— Không liên kết —</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    [{LEVEL_LABEL[o.level]}] {o.title}
                  </option>
                ))}
              </select>

              <label className="f">Loại OKR</label>
              <select className="i" name="okr_type" defaultValue="committed">
                {(['committed', 'aspirational', 'learning'] as const).map((t) => (
                  <option key={t} value={t}>
                    {OKR_TYPE_LABEL[t]} — {OKR_TYPE_EXPECT[t]}
                  </option>
                ))}
              </select>

              <label className="f">Mục tiêu (Objective)</label>
              <input className="i" name="title" placeholder="VD: Tăng trưởng doanh thu bán lẻ vượt kế hoạch" required />

              <label className="f">Mô tả (tuỳ chọn)</label>
              <textarea className="i" name="description" />

              <label className="f">Trạng thái</label>
              <select className="i" name="status" defaultValue="active">
                <option value="draft">Nháp</option>
                <option value="active">Đang chạy</option>
              </select>

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn" type="submit">
                  Tạo OKR
                </button>
                <Link className="btn ghost" href="/objectives">
                  Huỷ
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
