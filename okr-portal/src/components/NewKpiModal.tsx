'use client';

import EditModal from '@/components/EditModal';

// Popup "+ Tạo KPI" trên Scorecard — tạo chỉ tiêu KPI (định nghĩa dùng chung), lưu xong đóng + refresh.
// Chỉ render khi user CÓ quyền quản lý Thư viện KPI (gác ở trang gọi + server action).
export default function NewKpiModal({
  bscOptions,
  action,
  defaultBsc = '',
}: {
  bscOptions: { value: string; label: string }[];
  action: (fd: FormData) => Promise<void>;
  defaultBsc?: string;
}) {
  return (
    <EditModal title="Tạo chỉ tiêu KPI" label="+ Tạo KPI" submitLabel="Tạo KPI" action={action} triggerClass="btn ghost" wide>
      <label className="f">Tên KPI *</label>
      <input className="i" name="name" required placeholder="VD: Biên lợi nhuận gộp thương mại" />

      <div className="row">
        <div>
          <label className="f">Viễn cảnh BSC</label>
          <select className="i" name="bsc_perspective" defaultValue={defaultBsc}>
            <option value="">— Chưa gắn —</option>
            {bscOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Tầng</label>
          <select className="i" name="tier" defaultValue="">
            <option value="">— Chưa xếp —</option>
            <option value="result">Kết quả</option>
            <option value="driver">Động cơ</option>
            <option value="enabler">Bộ máy</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Đơn vị đo</label>
          <input className="i" name="unit_label" placeholder="VD: %, đ/chỉ, ngày, lượt…" />
        </div>
        <div>
          <label className="f">Hướng tốt</label>
          <select className="i" name="direction" defaultValue="up">
            <option value="up">Cao tốt (↑)</option>
            <option value="down">Thấp tốt (↓)</option>
          </select>
        </div>
        <div>
          <label className="f">Trọng số</label>
          <input className="i" name="weight" defaultValue="0" inputMode="numeric" title="0 = chỉ theo dõi, không tính điểm scorecard" />
        </div>
      </div>

      <label className="f">Cụm / mô-đun <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
      <input className="i" name="module" placeholder="VD: Commercial / Retail / Store ops" />

      <div className="row">
        <div>
          <label className="f">Ngưỡng Watch</label>
          <input className="i" name="threshold_watch" inputMode="decimal" placeholder="cảnh báo nhẹ" />
        </div>
        <div>
          <label className="f">Ngưỡng Alert</label>
          <input className="i" name="threshold_alert" inputMode="decimal" placeholder="cảnh báo" />
        </div>
        <div>
          <label className="f">Ngưỡng Escalate</label>
          <input className="i" name="threshold_escalate" inputMode="decimal" placeholder="báo động" />
        </div>
      </div>

      <label className="f">Mô tả <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
      <textarea className="i" name="description" rows={2} placeholder="Định nghĩa / cách đo chỉ tiêu này" />

      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        KPI là định nghĩa dùng chung cho mọi đơn vị; nhập số Mục tiêu/Thực hiện theo từng kỳ × đơn vị trong bảng scorecard. Nguồn mặc định là nhập tay.
      </p>
    </EditModal>
  );
}
