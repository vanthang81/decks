'use client';

import { useState } from 'react';
import EditModal from '@/components/EditModal';
import NumberInput from '@/components/NumberInput';

// Popup "Tạo OKR cá nhân" ở trang Của tôi (/my): tạo xong tự đóng + refresh (ở lại /my).
// Level luôn = individual, owner = chính mình (xử lý ở server action createPersonalOkrAction).

type KrRow = {
  title: string; metric_type: string; direction: string;
  start_value: string; target_value: string; unit_label: string; indicator: string;
};
const emptyKr = (): KrRow => ({
  title: '', metric_type: 'number', direction: 'increase',
  start_value: '', target_value: '', unit_label: '', indicator: 'lagging',
});
const METRICS = [
  { v: 'number', l: 'Số' }, { v: 'percent', l: '%' },
  { v: 'currency', l: 'Tiền (VND)' }, { v: 'boolean', l: 'Có/Không' },
];

export default function NewPersonalOkrModal({
  periodId,
  action,
}: {
  periodId: string;
  action: (fd: FormData) => Promise<void>;
}) {
  const [krs, setKrs] = useState<KrRow[]>([emptyKr()]);
  const setKr = (i: number, patch: Partial<KrRow>) =>
    setKrs((cur) => cur.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const krsJson = JSON.stringify(krs.filter((k) => k.title.trim()));

  return (
    <EditModal
      title="Tạo OKR cá nhân"
      label="+ Tạo OKR cá nhân"
      submitLabel="Tạo OKR"
      action={action}
      triggerClass="btn"
      wide
    >
      <input type="hidden" name="period_id" value={periodId} />
      <input type="hidden" name="krs" value={krsJson} />

      <label className="f">Mục tiêu (Objective) *</label>
      <input className="i" name="title" required
        placeholder="VD: Nâng cao năng lực phân tích tài chính của bản thân" />

      <div className="nob-krs">
        <label className="f" style={{ margin: 0 }}>Key Results (thước đo) — tuỳ chọn</label>
        {krs.map((k, i) => (
          <div key={i} className="nob-kr">
            <input className="i" placeholder={`KR ${i + 1}: VD Hoàn thành 3 khoá đào tạo chuyên môn`}
              value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} />
            <div className="nob-kr-row">
              <select className="i" value={k.metric_type} onChange={(e) => setKr(i, { metric_type: e.target.value })} title="Loại đo">
                {METRICS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select className="i" value={k.direction} onChange={(e) => setKr(i, { direction: e.target.value })} title="Hướng">
                <option value="increase">Tăng ↑</option>
                <option value="decrease">Giảm ↓</option>
              </select>
              {k.metric_type !== 'boolean' && <NumberInput placeholder={`Đầu kỳ${k.metric_type === 'percent' ? ' (%)' : k.metric_type === 'currency' ? ' (đồng)' : ''}`} value={k.start_value} onValueChange={(f) => setKr(i, { start_value: f })} />}
              {k.metric_type !== 'boolean' && <NumberInput placeholder={`Mục tiêu${k.metric_type === 'percent' ? ' (%)' : k.metric_type === 'currency' ? ' (đồng)' : ''}`} value={k.target_value} onValueChange={(f) => setKr(i, { target_value: f })} />}
              {k.metric_type === 'number' && <input className="i" placeholder="Đơn vị (khoá, buổi…)" value={k.unit_label} onChange={(e) => setKr(i, { unit_label: e.target.value })} />}
              {krs.length > 1 && <button type="button" className="btn ghost sm danger" onClick={() => setKrs((c) => c.filter((_, j) => j !== i))} title="Bỏ KR">✕</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => setKrs((c) => [...c, emptyKr()])}>＋ Thêm Key Result</button>
      </div>

      <label className="f">Loại OKR</label>
      <select className="i" name="okr_type" defaultValue="committed">
        <option value="committed">Cam kết — kỳ vọng đạt 100%</option>
        <option value="aspirational">Khát vọng — đạt 60-70% đã là tốt</option>
      </select>

      <label className="f">Mô tả (tuỳ chọn)</label>
      <textarea className="i" name="description" rows={2} placeholder="Bối cảnh / lý do của mục tiêu này" />

      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        OKR cá nhân do chính bạn chủ trì. Có thể thêm/sửa Key Result sau ở trang chi tiết OKR.
      </p>
    </EditModal>
  );
}
