import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import SearchSelect from '@/components/SearchSelect';
import { unitTreeOptions } from '@/lib/unit-options';
import { ROLES, ROLE_LABEL } from '@/lib/rbac';
import { inviteUserAction } from '@/app/invites/actions';

type UnitLite = { id: string; name: string; type: 'company' | 'division' | 'department'; parent_id?: string | null; sort?: number | null };

// Nút "Mời người dùng qua email" — ĐẶT ĐƯỢC Ở MỌI MÀN HÌNH (header). Bất kỳ ai đăng nhập cũng
// đề xuất được; cần người có quyền "Duyệt người dùng" duyệt thì mới thành người dùng thật.
export default function InviteUserButton({
  units, compact = false, triggerClass,
}: {
  units: UnitLite[];
  compact?: boolean;         // true = chỉ icon (đặt trên thanh header)
  triggerClass?: string;
}) {
  return (
    <EditModal
      title="Mời người dùng qua email"
      label={compact ? '' : 'Mời người dùng'}
      icon={<NavIcon name="user-plus" />}
      submitLabel="Gửi lời mời"
      action={inviteUserAction}
      toastMsg="Đã gửi lời mời — chờ duyệt"
      triggerClass={triggerClass ?? (compact ? 'icon-btn' : 'btn ghost sm')}
    >
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Nhập email người chưa có trong hệ thống. Lời mời sẽ được gửi tới người có quyền
        <b> Duyệt người dùng</b>; duyệt xong người đó mới đăng nhập được.
      </p>
      <label className="f">Email *</label>
      <input className="i" name="email" type="email" required placeholder="ten@baotinmanhhai.vn" />
      <label className="f">Tên hiển thị</label>
      <input className="i" name="display_name" placeholder="VD: Nguyễn Văn A" />
      <div className="row">
        <div>
          <label className="f">Vai trò đề xuất</label>
          <select className="i" name="role" defaultValue="staff">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Đơn vị (khối/phòng)</label>
          <SearchSelect name="unit_id" defaultValue="" emptyLabel="— Chưa gắn —"
            options={unitTreeOptions(units)} />
        </div>
      </div>
      <label className="f">Ghi chú cho người duyệt</label>
      <textarea className="i" name="note" rows={2} placeholder="VD: nhân sự mới phòng Kế hoạch, cần xem OKR khối…" />
    </EditModal>
  );
}
