'use client';

import { useToast } from './ToastProvider';

// Drop-in thay cho <form action={serverAction}> ở các FORM INLINE (ở lại trang, revalidate) — tự hiện
// toast "Đã lưu / …" khi xong, hoặc toast lỗi nếu action ném lỗi. Action ĐIỀU HƯỚNG (redirect) sẽ được
// FlashToaster báo qua query-param → ở đây ta ném lại NEXT_REDIRECT để Next chuyển trang bình thường.
export default function ToastForm({
  action,
  done = 'Đã lưu',
  className,
  style,
  id,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  done?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const run = async (fd: FormData) => {
    try {
      await action(fd);
      toast(done, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/NEXT_REDIRECT/.test(msg)) throw e; // để Next điều hướng; FlashToaster lo toast
      toast(msg || 'Có lỗi, thử lại', 'error');
    }
  };
  return (
    <form action={run} className={className} style={style} id={id}>
      {children}
    </form>
  );
}
