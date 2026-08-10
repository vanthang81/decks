'use client';

import EditModal from '@/components/EditModal';

const TYPE_LABEL: Record<string, string> = { company: 'Công ty', division: 'Khối', department: 'Phòng ban' };

// Popup "Sửa" đơn vị trong Cây tổ chức: đổi tên/mã/thứ tự/trực thuộc + ẩn/hiện.
// Loại (company/division/department) giữ nguyên (đổi loại dễ vỡ cây → không cho ở đây).
export default function EditUnitButton({
  unit,
  units,
  action,
}: {
  unit: { id: string; name: string; code: string | null; type: string; parent_id: string | null; sort: number; is_active: boolean };
  units: { id: string; name: string; type: string }[];
  action: (fd: FormData) => Promise<void>;
}) {
  const parentChoices = units.filter((u) => u.id !== unit.id); // không cho tự làm cha của mình

  return (
    <EditModal title={`Sửa: ${unit.name}`} label="Sửa" submitLabel="Lưu thay đổi" action={action} triggerClass="btn ghost sm">
      <input type="hidden" name="id" value={unit.id} />

      <label className="f">Tên đơn vị *</label>
      <input className="i" name="name" defaultValue={unit.name} required />

      <div className="row">
        <div>
          <label className="f">Loại</label>
          <input className="i" value={TYPE_LABEL[unit.type] ?? unit.type} disabled title="Loại đơn vị giữ nguyên" />
        </div>
        <div>
          <label className="f">Mã</label>
          <input className="i" name="code" defaultValue={unit.code ?? ''} placeholder="KD, MKT…" />
        </div>
        <div>
          <label className="f">Thứ tự</label>
          <input className="i" name="sort" defaultValue={String(unit.sort)} inputMode="numeric" />
        </div>
      </div>

      <label className="f">Trực thuộc</label>
      <select className="i" name="parent_id" defaultValue={unit.parent_id ?? ''} disabled={unit.type === 'company'}>
        <option value="">— Gốc (Công ty) —</option>
        {parentChoices.map((u) => (
          <option key={u.id} value={u.id}>{u.name} ({TYPE_LABEL[u.type] ?? u.type})</option>
        ))}
      </select>

      <div className="row">
        <div>
          <label className="f">Trạng thái</label>
          <select className="i" name="is_active" defaultValue={unit.is_active ? '1' : '0'}>
            <option value="1">Hiển thị</option>
            <option value="0">Ẩn (lưu trữ)</option>
          </select>
        </div>
        <div>
          <label className="f">Áp dụng từ ngày</label>
          <input className="i" type="date" name="effective_from" />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Để trống = áp dụng ngay hôm nay. Chọn ngày tương lai để đặt lịch đổi cơ cấu (tự có hiệu lực đúng ngày). Mọi thay đổi đều được lưu vào lịch sử.
      </p>
    </EditModal>
  );
}
