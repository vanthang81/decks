'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { TourStep } from '@/lib/page-tours';

// TOUR LÀM QUEN (product tour) GENERIC — tự chạy lần đầu vào trang, bật lại bất cứ lúc nào.
// Tự chứa (không thư viện ngoài): spotlight khoét sáng phần tử + bong bóng hướng dẫn.
// Nội dung các bước truyền qua prop `steps` (nguồn: src/lib/page-tours.ts). Mỗi trang 1 `tourKey`
// riêng để nhớ "đã xem" độc lập. Bước có `target` trỏ tới [data-tour="key"]; không thấy → thẻ giữa màn.

const seenKey = (tourKey: string) => `okrTourSeen:${tourKey}`;

export default function ProductTour({
  steps, tourKey, force,
}: { steps: TourStep[]; tourKey: string; force?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Khởi động: ép (từ ?tour=1 / nút) hoặc lần đầu chưa xem tour của trang này.
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    let seen = false;
    try { seen = !!localStorage.getItem(seenKey(tourKey)); } catch { /* ignore */ }
    if (force || !seen) {
      const t = setTimeout(() => { setI(0); setOpen(true); }, 500);
      return () => clearTimeout(t);
    }
  }, [tourKey, force, steps]);

  // Cho phép bật lại từ nơi khác (nút "Hướng dẫn" trên header) qua sự kiện.
  useEffect(() => {
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener('okr:start-tour', h);
    return () => window.removeEventListener('okr:start-tour', h);
  }, []);

  const measure = useCallback(() => {
    const step = steps[i];
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null); // không thấy (mobile ẩn) → thẻ giữa màn
    }
  }, [i, steps]);

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
    try { localStorage.setItem(seenKey(tourKey), '1'); } catch { /* ignore */ }
  }, [tourKey]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, finish, steps]);

  if (!open || !steps || steps.length === 0) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

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
        <div className="tour-step">Bước {i + 1}/{steps.length}</div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-body">{step.body}</div>
        {step.link && (
          <a className="tour-deck-link" href={step.link.href} target="_blank" rel="noopener noreferrer">{step.link.label}</a>
        )}
        <div className="tour-dots">
          {steps.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
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

/** Nút bật lại tour (dispatch sự kiện; tour của trang hiện tại sẽ mở). */
export function TourButton({ className = 'btn ghost sm' }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event('okr:start-tour'))}>
      🧭 Hướng dẫn nhanh
    </button>
  );
}
