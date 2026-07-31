'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Result = {
  ok?: boolean;
  error?: string;
  objUpdated?: number;
  krUpdated?: number;
  initUpdated?: number;
  initCreated?: number;
  skipped?: number;
  errors?: string[];
};

export default function ImportOkr() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    setBusy(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('file', input.files[0]);
      const r = await fetch('/api/import', { method: 'POST', body: fd });
      const j = (await r.json()) as Result;
      setRes(j);
      if (j.ok) router.refresh();
    } catch (err) {
      setRes({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="i" type="file" name="file" accept=".xlsx" style={{ maxWidth: 320 }} />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Đang nhập…' : '⬆ Nhập Excel'}
        </button>
      </form>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
        Tải file đã <b>Xuất Excel</b> ở trang OKR, sửa trên Excel rồi nhập lại. Khớp theo cột <b>Mã</b>:
        có Mã → cập nhật; công việc để trống Mã (kèm Mã Objective) → tạo mới. Không xoá dòng nào.
      </p>
      {res && (
        <div
          className="gnote"
          style={
            res.error
              ? { background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }
              : { background: '#dcfce7', borderColor: '#16a34a', color: '#166534' }
          }
        >
          {res.error ? (
            <>❌ {res.error}</>
          ) : (
            <>
              ✅ Đã nhập: cập nhật {res.objUpdated ?? 0} OKR · {res.krUpdated ?? 0} KR ·{' '}
              {res.initUpdated ?? 0} công việc; tạo mới {res.initCreated ?? 0} công việc
              {res.skipped ? ` · bỏ qua ${res.skipped}` : ''}.
              {res.errors && res.errors.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {res.errors.slice(0, 10).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
