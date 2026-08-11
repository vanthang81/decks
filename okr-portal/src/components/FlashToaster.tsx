'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast, type ToastVariant } from './ToastProvider';

// Đọc "flash" qua query-param cho các action ĐIỀU HƯỚNG (redirect) rồi hiện toast + XOÁ param khỏi URL.
// Phủ mọi action redirect sẵn có (?saved / ?deleted / ?kpi / ?digest / ?test / ?del) + 2 param chung ?ok / ?err.
const MAP: Record<string, (v: string) => [string, ToastVariant] | null> = {
  ok: (v) => [v ? decodeURIComponent(v) : 'Đã lưu', 'success'],
  err: (v) => [v ? decodeURIComponent(v) : 'Có lỗi, thử lại', 'error'],
  saved: () => ['Đã lưu thay đổi', 'success'],
  deleted: (v) => [v && v !== '1' ? `Đã xoá ${decodeURIComponent(v)}` : 'Đã xoá', 'success'],
  del: (v) => (v === 'mismatch' ? ['Chưa xoá — xác nhận không khớp', 'error'] : null),
  kpi: (v) => [`Đồng bộ KPI: ${decodeURIComponent(v)}`, v.startsWith('err') ? 'error' : 'info'],
  digest: (v) => [`Bản tin tuần: ${decodeURIComponent(v)}`, v.startsWith('err') ? 'error' : 'info'],
  test: (v) => [`Gửi thử: ${decodeURIComponent(v)}`, v.startsWith('err') ? 'error' : 'info'],
};
const KEYS = Object.keys(MAP);

export default function FlashToaster() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const lastRef = useRef('');

  useEffect(() => {
    const hit = KEYS.find((k) => sp.has(k));
    if (!hit) return;
    const raw = sp.get(hit) ?? '';
    const sig = `${pathname}?${hit}=${raw}`;
    if (lastRef.current === sig) return; // tránh lặp toast khi re-render
    lastRef.current = sig;
    const res = MAP[hit](raw);
    if (res) toast(res[0], res[1]);
    // Xoá param đã xử lý, giữ nguyên các param khác.
    const next = new URLSearchParams(Array.from(sp.entries()));
    next.delete(hit);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, pathname, router, toast]);

  return null;
}
