'use client';

import { useMemo, useState } from 'react';
import SearchSelect from './SearchSelect';

type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };
type UserOpt = { email: string; name: string; role: string; unit_id: string | null };

// Module (KRA) + Đơn vị chủ + Business/Measurement owner cho form KPI.
// KHI chọn Đơn vị chủ → tự đặt Business owner = TRƯỞNG đơn vị đó (mặc định), nhưng vẫn sửa được.
// Ô người/đơn vị dùng SearchSelect (gõ để tìm).
export default function KpiOwnerFields({
  units, users, defModule = '', defUnit = '', defBusiness = '', defMeasure = '',
}: {
  units: UnitOpt[];
  users: UserOpt[];
  defModule?: string;
  defUnit?: string;
  defBusiness?: string;
  defMeasure?: string;
}) {
  const [unit, setUnit] = useState(defUnit);
  const [business, setBusiness] = useState(defBusiness);

  // unit_id → email Trưởng đơn vị (division_lead / dept_lead thuộc đơn vị đó).
  const leadByUnit = useMemo(() => {
    const m: Record<string, string> = {};
    for (const u of users) {
      if ((u.role === 'division_lead' || u.role === 'dept_lead') && u.unit_id && !m[u.unit_id]) m[u.unit_id] = u.email;
    }
    return m;
  }, [users]);

  const onUnit = (v: string) => {
    setUnit(v);
    const lead = leadByUnit[v];
    if (lead) setBusiness(lead); // đổi đơn vị → gợi ý luôn Trưởng đơn vị làm Business owner
  };

  const unitOptions = units.map((u) => ({ value: u.id, label: `${u.name} (${u.type === 'division' ? 'Khối' : 'Phòng'})` }));
  const userOptions = users.map((u) => ({ value: u.email, label: u.name }));
  const isLeadDefault = !!unit && business === leadByUnit[unit];

  return (
    <>
      <div className="row">
        <div>
          <label className="f">Module (KRA)</label>
          <input className="i" name="module" list="kpi-modules" defaultValue={defModule} placeholder="Chọn / gõ module" />
        </div>
        <div>
          <label className="f">Đơn vị chủ (Khối/Phòng)</label>
          <SearchSelect name="unit_id" value={unit} onChange={onUnit} emptyLabel="— Không gắn —" options={unitOptions} />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Business owner (tạo kết quả)</label>
          <SearchSelect name="business_owner" value={business} onChange={setBusiness} emptyLabel="— Chưa gán —" options={userOptions} />
          {isLeadDefault && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>Mặc định = Trưởng đơn vị đã chọn · có thể đổi người khác.</p>
          )}
        </div>
        <div>
          <label className="f">Measurement owner (đo)</label>
          <SearchSelect name="measurement_owner" defaultValue={defMeasure} emptyLabel="— Chưa gán —" options={userOptions} />
        </div>
      </div>
    </>
  );
}
