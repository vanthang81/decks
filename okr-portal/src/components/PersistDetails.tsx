'use client';

import { useEffect, useState, type ReactNode, type CSSProperties, type SyntheticEvent } from 'react';

/**
 * <details> GHI NHỚ trạng thái mở/thu gọn theo PHIÊN (sessionStorage) — giữ đúng vị trí khi người
 * dùng bấm vào một mục để xem chi tiết rồi BACK lại (component server remount KHÔNG mất trạng thái).
 * (CFO 17/09 — áp cho MỌI khối drill-in: Báo cáo theo cấp, OKR theo kỳ con… để nhất quán với #34.)
 *
 * - `sk` = khoá lưu (nên gồm ngữ cảnh kỳ + nhóm để không lẫn giữa các kỳ).
 * - `summary` = phần <summary> (bấm để mở/thu gọn); `children` = thân chi tiết.
 * - `defaultOpen` = trạng thái mặc định khi CHƯA có lưu (khớp SSR để không lệch hydrate).
 */
export default function PersistDetails({
  sk,
  summary,
  children,
  className,
  style,
  defaultOpen = false,
}: {
  sk: string;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Khôi phục trạng thái đã lưu sau khi mount (tránh lệch hydrate: render đầu = defaultOpen như SSR).
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(sk);
      if (v !== null) setOpen(v === '1');
    } catch {
      /* ignore (private mode…) */
    }
  }, [sk]);

  const onToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const o = e.currentTarget.open;
    setOpen(o);
    try {
      sessionStorage.setItem(sk, o ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  return (
    <details className={className} style={style} open={open} onToggle={onToggle}>
      {summary}
      {children}
    </details>
  );
}
