'use client';

import { useState } from 'react';
import EditModal from '@/components/EditModal';
import SearchSelect from '@/components/SearchSelect';
import NumberInput from '@/components/NumberInput';
import { unitTreeOptions } from '@/lib/unit-options';
import type { PersonOpt, UnitOpt } from '@/components/ExecutionTabs';

// Popup "+ Tạo OKR con" ở màn hình OKR cha (alignment xuống): tạo xong tự đóng + refresh tại chỗ.
// Kỳ + nhánh BSC kế thừa từ cha (xử lý ở server createChildObjectiveAction). Cấp con phải THẤP hơn cha.

type LevelOpt = { value: string; label: string };
type KrRow = {
  title: string; metric_type: string; direction: string;
  start_value: string; target_value: string; unit_label: string;
};
const emptyKr = (): KrRow => ({
  title: '', metric_type: 'number', direction: 'increase',
  start_value: '', target_value: '', unit_label: '',
});
const METRICS = [
  { v: 'number', l: 'Số' }, { v: 'percent', l: '%' },
  { v: 'currency', l: 'Tiền (VND)' }, { v: 'boolean', l: 'Có/Không' },
];

export default function NewChildOkrModal({
  parentId,
  parentTitle,
  levels,
  defaultLevel,
  units,
  users,
  action,
}: {
  parentId: string;
  parentTitle?: string;
  levels: LevelOpt[];
  defaultLevel: string;
  units: UnitOpt[]; // đơn vị con hợp lệ (có quyền), kèm type để lọc theo cấp
  users: PersonOpt[];
  action: (fd: FormData) => Promise<void>;
}) {
  const [level, setLevel] = useState(defaultLevel);
  const [krs, setKrs] = useState<KrRow[]>([emptyKr()]);
  const setKr = (i: number, patch: Partial<KrRow>) =>
    setKrs((cur) => cur.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const krsJson = JSON.stringify(krs.filter((k) => k.title.trim()));

  const needUnit = level === 'division' || level === 'department';
  const unitType = level === 'division' ? 'division' : 'department';
  const unitOpts = unitTreeOptions(units.filter((u) => u.type === unitType));

  return (
    <EditModal
      title="Tạo OKR con (alignment xuống)"
      label="+ Tạo OKR con"
      submitLabel="Tạo OKR con"
      action={action}
      triggerClass="btn ghost sm"
      wide
    >
      <input type="hidden" name="parent_id" value={parentId} />
      <input type="hidden" name="krs" value={krsJson} />

      {parentTitle && (
        <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
          Liên kết lên: <b>{parentTitle}</b> — OKR con kế thừa kỳ của OKR cha.
        </p>
      )}

      <label className="f">Mục tiêu (Objective) *</label>
      <input className="i" name="title" required
        placeholder="VD: Đảm bảo doanh thu Phòng bán buôn đạt 55 tỷ" />

      <div className="row">
        <div>
          <label className="f">Cấp</label>
          <select className="i" name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {levels.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        {needUnit && (
          <div>
            <label className="f">Đơn vị phụ trách *</label>
            <SearchSelect key={level} name="unit_id" emptyLabel="— Chọn đơn vị —" options={unitOpts} />
          </div>
        )}
      </div>

      {level === 'individual' ? (
        <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 0' }}>
          OKR cá nhân: mặc định do bạn chủ trì (có thể đổi người chủ trì bên dưới).
        </p>
      ) : null}

      <div className="row">
        <div>
          <label className="f">Chủ trì <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
          <SearchSelect name="owner_email" emptyLabel="— Chưa gán —"
            options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
        </div>
        <div>
          <label className="f">Loại OKR</label>
          <select className="i" name="okr_type" defaultValue="committed">
            <option value="committed">Cam kết — kỳ vọng đạt 100%</option>
            <option value="aspirational">Khát vọng — đạt 60-70% đã là tốt</option>
          </select>
        </div>
      </div>

      <div className="nob-krs">
        <label className="f" style={{ margin: 0 }}>Key Results (thước đo) — tuỳ chọn</label>
        {krs.map((k, i) => (
          <div key={i} className="nob-kr">
            <input className="i" placeholder={`KR ${i + 1}: VD Doanh thu đạt 55 tỷ`}
              value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} />
            <div className="nob-kr-row">
              <select className="i" value={k.metric_type} onChange={(e) => setKr(i, { metric_type: e.target.value })} title="Loại đo">
                {METRICS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select className="i" value={k.direction} onChange={(e) => setKr(i, { direction: e.target.value })} title="Hướng">
                <option value="increase">Tăng ↑</option>
                <option value="decrease">Giảm ↓</option>
              </select>
              {k.metric_type !== 'boolean' && <NumberInput placeholder="Đầu kỳ" value={k.start_value} onValueChange={(f) => setKr(i, { start_value: f })} />}
              {k.metric_type !== 'boolean' && <NumberInput placeholder="Mục tiêu" value={k.target_value} onValueChange={(f) => setKr(i, { target_value: f })} />}
              {k.metric_type === 'number' && <input className="i" placeholder="Đơn vị (tỷ, chỉ…)" value={k.unit_label} onChange={(e) => setKr(i, { unit_label: e.target.value })} />}
              {krs.length > 1 && <button type="button" className="btn ghost sm danger" onClick={() => setKrs((c) => c.filter((_, j) => j !== i))} title="Bỏ KR">✕</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => setKrs((c) => [...c, emptyKr()])}>＋ Thêm Key Result</button>
      </div>

      <label className="f">Mô tả (tuỳ chọn)</label>
      <textarea className="i" name="description" rows={2} placeholder="Bối cảnh / lý do của mục tiêu này" />
    </EditModal>
  );
}
