'use client';

import { useState } from 'react';
import EditModal from './EditModal';
import NavIcon from './NavIcon';
import { setObjectiveWeightAction } from '@/app/objectives/actions';

// Chỉnh TRỌNG SỐ 1 OKR ngay tại "Báo cáo theo cấp" → mở popup gọn (EditModal), lưu xong tự đóng + làm mới.
// Hiện trọng số hiện tại + nút bút chì; popup có ô số + các mức gợi ý nhanh. Chỉ render khi có quyền (gác ở nơi gọi).
const PRESETS = [0.5, 1, 1.5, 2, 3];

export default function WeightEditor({ objectiveId, weight, title }: { objectiveId: string; weight: number; title: string }) {
  const [w, setW] = useState<string>(String(weight ?? 1));
  return (
    <span className="wgt-edit">
      <EditModal
        title="Trọng số OKR"
        label=""
        icon={<NavIcon name="pencil" />}
        triggerClass="icon-btn wgt-btn"
        submitLabel="Lưu trọng số"
        action={setObjectiveWeightAction}
      >
        <input type="hidden" name="objective_id" value={objectiveId} />
        <p className="muted" style={{ marginTop: 0, fontSize: 13, lineHeight: 1.5 }}>
          Đặt mức quan trọng của OKR <b>“{title}”</b> khi tính <b>kết quả tổng</b> của nhóm (Công ty/Khối/Phòng/Cá nhân).
          Kết quả nhóm = bình quân <b>có trọng số</b> tiến độ các OKR. Mặc định <b>1</b> (mọi OKR cân nhau);
          để trọng số cao hơn cho OKR quan trọng hơn.
        </p>
        <label className="f" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Trọng số <span className="muted" style={{ fontWeight: 400 }}>· số &gt; 0, tối đa 2 số lẻ</span></label>
        <input
          className="i"
          name="weight"
          type="number"
          min="0.01"
          step="0.01"
          value={w}
          onChange={(e) => setW(e.target.value)}
          style={{ width: 140 }}
          autoFocus
        />
        <div className="wgt-presets" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn ghost sm${Number(w) === p ? ' active' : ''}`}
              onClick={() => setW(String(p))}
            >
              {p}
            </button>
          ))}
        </div>
      </EditModal>
    </span>
  );
}
