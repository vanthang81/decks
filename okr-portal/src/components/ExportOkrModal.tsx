'use client';

import { useState } from 'react';
import MultiSelect, { type MSOption } from '@/components/MultiSelect';

// Nút "⬇ Xuất Excel" ở trang OKR → mở popup chọn NHIỀU kỳ + NHIỀU khối/phòng rồi tải file.
// Dùng form GET tới /api/export (MultiSelect gửi các value nối bằng dấu phẩy: ?periods=..&units=..).
export default function ExportOkrModal({
  periods,
  units,
  currentPeriodId,
}: {
  periods: MSOption[];
  units: MSOption[];
  currentPeriodId?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>⬇ Xuất Excel</button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Xuất Excel OKR</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <form method="get" action="/api/export" onSubmit={() => setTimeout(() => setOpen(false), 100)}>
              <label className="f">Kỳ (chọn nhiều) <span className="muted" style={{ fontWeight: 400 }}>— để trống = mọi kỳ</span></label>
              <MultiSelect name="periods" options={periods} initial={currentPeriodId ? [currentPeriodId] : []}
                placeholder="Gõ để tìm & chọn kỳ…" emptyText="Chưa chọn kỳ nào → xuất toàn bộ kỳ." />

              <label className="f" style={{ marginTop: 12 }}>Khối / Phòng (chọn nhiều) <span className="muted" style={{ fontWeight: 400 }}>— để trống = mọi đơn vị</span></label>
              <MultiSelect name="units" options={units}
                placeholder="Gõ để tìm & chọn khối/phòng…" emptyText="Chưa chọn đơn vị nào → xuất toàn bộ đơn vị." />

              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                File gồm 3 sheet: Mục tiêu · Key Result · Công việc — lọc theo kỳ &amp; đơn vị đã chọn (trong phạm vi bạn được xem).
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Huỷ</button>
                <button type="submit" className="btn">⬇ Tải Excel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
