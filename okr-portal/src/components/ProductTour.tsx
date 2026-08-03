'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// TOUR LÀM QUEN (product tour) — tự chạy lần đầu đăng nhập, bật lại bất cứ lúc nào.
// Tự chứa (không thư viện ngoài): spotlight khoét sáng phần tử + bong bóng hướng dẫn.
// Bước trỏ tới phần tử [data-tour="key"]; nếu không thấy (vd mobile ẩn nav) → thẻ giữa màn.

type Step = { target?: string; title: string; body: string };

const STEPS: Step[] = [
  {
    title: '👋 Chào mừng đến Hệ thống Điều hành OKR BTMH',
    body: 'Đi nhanh một vòng (khoảng 1 phút) để biết đặt gì ở đâu và bắt đầu dùng được ngay. Bạn có thể Bỏ qua bất cứ lúc nào và mở lại từ nút "Hướng dẫn nhanh".',
  },
  {
    target: 'nav-overview',
    title: 'Tổng quan & Họp điều hành',
    body: 'Bảng điều khiển cho bức tranh tiến độ toàn công ty; "Họp điều hành" (WBR/MBR) tổng hợp nhận định & khuyến nghị, KPI cảnh báo, việc quá hạn.',
  },
  {
    target: 'nav-strategy',
    title: 'Chiến lược → OKR → KPI',
    body: 'Chuỗi đo lường: khai báo Chiến lược (tầm nhìn/sứ mệnh) → rải xuống OKR (Mục tiêu · Kết quả then chốt) theo cây Công ty → Khối → Phòng → Cá nhân → đo bằng Thư viện KPI (thẻ điểm BSC).',
  },
  {
    target: 'nav-exec',
    title: 'Thực thi: Dự án & Công việc',
    body: 'Nơi biến mục tiêu thành hành động: quản lý Dự án (xuyên nhiều OKR) và Công việc — xem dạng Danh sách / Kanban kéo-thả / Dòng thời gian, gán người & theo hạn.',
  },
  {
    target: 'tour-all-okr',
    title: 'Xem toàn bộ cây OKR',
    body: 'Bấm đây để mở toàn bộ cây mục tiêu của kỳ, tạo OKR mới và liên kết (cascade) lên cấp trên.',
  },
  {
    target: 'tour-bell',
    title: 'Thông báo',
    body: 'Chuông báo khi bạn được @nhắc tên, có người trả lời bình luận, có bình luận ở mục bạn phụ trách, hoặc được giao việc. Bấm để xem danh sách và mở tới đúng chỗ.',
  },
  {
    target: 'tour-user',
    title: 'Cài đặt cá nhân',
    body: 'Bấm TÊN của bạn để xem hồ sơ và bật/tắt từng loại thông báo (và email). Mọi thao tác Sửa/Thêm nằm ở nút gọn góc phải-trên của mỗi khu vực.',
  },
  {
    title: '🎉 Sẵn sàng rồi!',
    body: 'Gợi ý thứ tự: Chiến lược → OKR → gắn KPI → tạo Dự án/Công việc → check-in định kỳ. Cần xem lại chi tiết, mở mục "Hướng dẫn" trên menu bất cứ lúc nào. Chúc bạn điều hành hiệu quả!',
  },
];

const seenKey = (userKey: string) => `okrTourSeen:${userKey}`;

export default function ProductTour({ userKey, force }: { userKey: string; force?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Khởi động: ép (từ ?tour=1 / nút) hoặc lần đầu chưa xem.
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(seenKey(userKey)); } catch { /* ignore */ }
    if (force || !seen) {
      const t = setTimeout(() => { setI(0); setOpen(true); }, 500);
      return () => clearTimeout(t);
    }
  }, [userKey, force]);

  // Cho phép bật lại từ nơi khác qua sự kiện.
  useEffect(() => {
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener('okr:start-tour', h);
    return () => window.removeEventListener('okr:start-tour', h);
  }, []);

  const measure = useCallback(() => {
    const step = STEPS[i];
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null); // không thấy (mobile ẩn) → thẻ giữa màn
    }
  }, [i]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const on = () => measure();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true); };
  }, [open, i, measure]);

  const finish = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(seenKey(userKey), '1'); } catch { /* ignore */ }
  }, [userKey]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, STEPS.length - 1));
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, finish]);

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // Vị trí bong bóng: dưới target nếu còn chỗ, không thì trên; không có target → giữa màn.
  const PAD = 8;
  let bubbleStyle: React.CSSProperties = {};
  if (rect) {
    const below = rect.bottom + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 220 ? below : Math.max(12, rect.top - 12 - 200);
    let left = rect.left + rect.width / 2 - 170;
    left = Math.max(12, Math.min(left, window.innerWidth - 352));
    bubbleStyle = { top, left };
  } else {
    bubbleStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  return (
    <div className="tour-root" role="dialog" aria-modal="true">
      {/* Lớp phủ + khoét sáng target */}
      {rect ? (
        <div
          className="tour-spot"
          style={{
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          }}
        />
      ) : (
        <div className="tour-dim" onClick={finish} />
      )}

      <div className="tour-bubble" style={bubbleStyle}>
        <div className="tour-step">Bước {i + 1}/{STEPS.length}</div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-body">{step.body}</div>
        <div className="tour-dots">
          {STEPS.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={finish}>Bỏ qua</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button type="button" className="btn ghost sm" onClick={() => setI(i - 1)}>Quay lại</button>}
            {!last
              ? <button type="button" className="btn sm" onClick={() => setI(i + 1)}>Tiếp →</button>
              : <button type="button" className="btn sm" onClick={finish}>Xong 🎉</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Nút bật lại tour (đặt ở Dashboard / Hướng dẫn). */
export function TourButton({ className = 'btn ghost sm' }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event('okr:start-tour'))}>
      🧭 Hướng dẫn nhanh
    </button>
  );
}
