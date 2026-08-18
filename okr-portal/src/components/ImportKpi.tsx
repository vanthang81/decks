'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Result = { ok?: boolean; error?: string; created?: number; updated?: number; skipped?: number; errors?: string[] };

// Bộ công cụ nhập/xuất Thư viện KPI hàng loạt: tải MẪU · xuất dữ liệu · nhập Excel.
// `trailing` = phần tử đặt CUỐI hàng nút (vd nút "Thêm KPI") để cả cụm nằm gọn 1 hàng.
export default function ImportKpi({ trailing }: { trailing?: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/kpi-lib/import', { method: 'POST', body: fd });
      const j = (await r.json()) as Result;
      setRes(j);
      if (j.ok) router.refresh();
    } catch (err) {
      setRes({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
        <a className="btn ghost sm" href="/api/kpi-lib/export?template=1">⬇ Tải mẫu Excel</a>
        <a className="btn ghost sm" href="/api/kpi-lib/export">⬇ Xuất Excel</a>
        <button className="btn sm" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Đang nhập…' : '⬆ Nhập Excel'}
        </button>
        <input ref={inputRef} type="file" accept=".xlsx" hidden onChange={onFile} />
        {trailing}
      </div>
      {res && (
        <div
          className="gnote"
          style={
            res.error
              ? { background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b', marginTop: 10 }
              : { background: '#dcfce7', borderColor: '#16a34a', color: '#166534', marginTop: 10 }
          }
        >
          {res.error ? (
            <>❌ {res.error}</>
          ) : (
            <>
              ✅ Đã nhập — <b>tạo mới</b>: {res.created ?? 0} KPI · <b>cập nhật</b>: {res.updated ?? 0} KPI
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
