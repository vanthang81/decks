'use client';

import { useState } from 'react';

// Ô nhập "Giá trị mới" cho check-in KR + cảnh báo MỀM khi giá trị lệch bậc lớn so mục tiêu
// (thường do nhập sai ĐƠN VỊ — vd gõ 438.422.338.284 đồng trong khi mục tiêu để theo "tỷ") — CFO 14/09.
// Không chặn lưu (chỉ nhắc); người dùng vẫn có thể nhập số lớn thật nếu cố ý.
function parseLoose(s: string): number {
  // Bỏ khoảng trắng; bỏ dấu chấm ngăn nghìn (chấm theo sau đúng 3 số rồi tới non-digit/hết); phẩy = thập phân.
  const t = s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export default function KrValueInput({
  name, defaultValue, target, unitLabel,
}: {
  name: string;
  defaultValue: number | string;
  target: number | null;
  unitLabel: string | null;
}) {
  const [v, setV] = useState(String(defaultValue ?? ''));
  const num = parseLoose(v);
  const t = typeof target === 'number' ? target : NaN;
  const warn = Number.isFinite(num) && Number.isFinite(t) && t > 0 && Math.abs(num) > t * 50;
  return (
    <>
      <input className="i" name={name} value={v} onChange={(e) => setV(e.target.value)} />
      {warn && (
        <div className="kr-unit-warn">
          ⚠ Giá trị đang lớn hơn mục tiêu rất nhiều lần — kiểm tra <b>đơn vị</b>
          {unitLabel ? <> (nhập theo <b>{unitLabel}</b>)</> : null}. Vd nhập <b>438,4</b> thay vì 438.422.338.284.
        </div>
      )}
    </>
  );
}
