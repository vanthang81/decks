'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Cử chỉ cảm ứng kiểu web iPhone (CHỈ mobile/tablet cảm ứng):
//  (1) Kéo XUỐNG từ đỉnh trang → làm mới (pull-to-refresh) với con quay iOS.
//  (2) Vuốt TRÁI/PHẢI → chuyển sang tab trước/kế trong thanh điều hướng.
// Desktop (không có touch) hoàn toàn không kích hoạt (ẩn qua CSS + guard pointer).

// Thứ tự tab điều hướng chính (khớp SiteHeader, bỏ /admin vì có điều kiện quyền).
const ROUTES = ['/', '/objectives', '/projects', '/tasks', '/kpi', '/my', '/guide'];
const ROUTE_LABEL: Record<string, string> = {
  '/': 'Bảng điều khiển',
  '/objectives': 'OKR',
  '/projects': 'Dự án',
  '/tasks': 'Công việc',
  '/kpi': 'KPI',
  '/my': 'Của tôi',
  '/guide': 'Hướng dẫn',
};

// Ngưỡng
const PULL_TRIGGER = 72; // kéo đủ để refresh (px sau kháng lực)
const PULL_MAX = 120; // trần dịch chuyển chỉ báo
const H_TRIGGER = 90; // vuốt ngang đủ để chuyển tab
const EDGE_GUARD = 28; // bỏ qua vuốt sát mép (nhường back-swipe iOS)

type Lock = null | 'pull' | 'h' | 'v';

export default function MobileGestures() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  // Trạng thái hiển thị (React) — chỉ để vẽ chỉ báo; cử chỉ tính bằng ref cho mượt.
  const [pull, setPull] = useState(0); // 0..PULL_MAX
  const [refreshing, setRefreshing] = useState(false);
  const [hint, setHint] = useState<{ dir: -1 | 1; label: string; ready: boolean } | null>(null);

  // refs để handler (đăng ký 1 lần) đọc giá trị mới nhất, tránh stale closure.
  const pullRef = useRef(0);
  pullRef.current = pull;
  const hintRef = useRef(hint);
  hintRef.current = hint;

  useEffect(() => {
    // Chỉ bật trên thiết bị cảm ứng (bỏ qua desktop có chuột).
    const isTouch =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!isTouch) return;

    let startX = 0;
    let startY = 0;
    let lock: Lock = null;
    let active = false;
    let busy = false; // đang refresh, khoá cử chỉ mới

    const inScrollable = (el: EventTarget | null): boolean => {
      let n = el as HTMLElement | null;
      while (n && n !== document.body) {
        if (n.matches?.('input,textarea,select,[contenteditable="true"]')) return true;
        if (
          n.classList?.contains('table-scroll') ||
          n.classList?.contains('wide-x') ||
          n.classList?.contains('kanban') ||
          n.classList?.contains('kb-cols') ||
          n.classList?.contains('gantt-scroll') ||
          n.classList?.contains('no-swipe')
        ) {
          // Vùng có cuộn ngang riêng → không cướp cử chỉ ngang.
          return true;
        }
        n = n.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      if (busy || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      lock = null;
      // Bỏ qua nếu bắt đầu trong vùng cuộn ngang / ô nhập.
      active = !inScrollable(e.target);
    };

    const onMove = (e: TouchEvent) => {
      if (!active || busy || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Xác định "khoá" hướng lần đầu vượt ngưỡng nhỏ.
      if (lock === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          // Dọc: chỉ nhận pull-to-refresh khi đang ở ĐỈNH trang & kéo xuống.
          if (dy > 0 && window.scrollY <= 2) lock = 'pull';
          else {
            lock = 'v';
            active = false; // nhường cuộn dọc bình thường
            return;
          }
        } else {
          // Ngang: bỏ qua nếu bắt đầu sát mép (back-swipe iOS).
          if (startX < EDGE_GUARD || startX > window.innerWidth - EDGE_GUARD) {
            lock = 'v';
            active = false;
            return;
          }
          lock = 'h';
        }
      }

      if (lock === 'pull') {
        e.preventDefault(); // chặn overscroll native
        const d = Math.min(PULL_MAX, dy * 0.5); // kháng lực
        setPull(d);
      } else if (lock === 'h') {
        e.preventDefault();
        const idx = ROUTES.indexOf(pathRef.current);
        if (idx === -1) return;
        const dir: -1 | 1 = dx > 0 ? -1 : 1; // vuốt phải→tab trước, trái→tab kế
        const target = idx + dir;
        if (target < 0 || target >= ROUTES.length) {
          setHint(null); // đã ở đầu/cuối, không có tab để qua
          return;
        }
        const dist = Math.abs(dx);
        setHint({ dir, label: ROUTE_LABEL[ROUTES[target]] ?? '', ready: dist >= H_TRIGGER });
      }
    };

    const finishPull = () => {
      if (pullRef.current >= PULL_TRIGGER) {
        setRefreshing(true);
        setPull(56);
        // cho con quay hiện 1 nhịp rồi refresh dữ liệu server component.
        window.setTimeout(() => {
          router.refresh();
          window.setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 650);
        }, 180);
      } else {
        setPull(0);
      }
    };

    const onEnd = () => {
      if (!active && lock !== 'pull' && lock !== 'h') {
        lock = null;
        return;
      }
      if (lock === 'pull') {
        finishPull();
      } else if (lock === 'h' && hintRef.current) {
        const idx = ROUTES.indexOf(pathRef.current);
        const target = idx + hintRef.current.dir;
        if (hintRef.current.ready && target >= 0 && target < ROUTES.length) {
          router.push(ROUTES[target]);
        }
        setHint(null);
      }
      lock = null;
      active = false;
    };

    // refs để đọc giá trị mới nhất trong handler (tránh stale closure).
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const spin = refreshing || pull >= PULL_TRIGGER;
  const rot = Math.min(360, (pull / PULL_TRIGGER) * 300);

  return (
    <>
      {/* Chỉ báo kéo–làm mới (đỉnh giữa) */}
      <div
        className={`ptr ${pull > 0 || refreshing ? 'on' : ''}`}
        style={{ transform: `translate(-50%, ${Math.max(0, pull) - 44}px)` }}
        aria-hidden
      >
        <span className={`ptr-spin ${spin ? 'go' : ''}`} style={{ transform: spin ? undefined : `rotate(${rot}deg)` }}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M12 5a7 7 0 1 1-6.9 8.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {!spin && <path d="M12 2.5 12 8 8.2 5.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </span>
      </div>

      {/* Chỉ báo vuốt ngang chuyển tab */}
      {hint && (
        <div className={`swipe-hint ${hint.dir === -1 ? 'left' : 'right'} ${hint.ready ? 'ready' : ''}`} aria-hidden>
          <span className="swipe-ico">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d={hint.dir === -1 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="swipe-lbl">{hint.label}</span>
        </div>
      )}
    </>
  );
}
