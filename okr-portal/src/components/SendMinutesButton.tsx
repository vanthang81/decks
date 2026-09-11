'use client';

import { useState } from 'react';
import type { SendMinutesResult } from '@/lib/meeting-mail';

export default function SendMinutesButton({
  meetingId, recipients, send,
}: {
  meetingId: string;
  recipients: { email: string; name: string | null }[];
  send: (fd: FormData) => Promise<SendMinutesResult>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<SendMinutesResult | null>(null);

  async function doSend() {
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set('id', meetingId);
      fd.set('note', note);
      const r = await send(fd);
      setResult(r);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false); setNote(''); setResult(null); setBusy(false);
  }

  return (
    <>
      <button className="btn ghost" type="button" onClick={() => setOpen(true)} title="Gửi biên bản qua email cho thành viên">
        ✉ Gửi biên bản
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={close}>
          <div className="okr-modal sm-mail" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flexbtw">
              <h3 style={{ margin: 0 }}>Gửi biên bản qua email</h3>
              <button type="button" className="okr-modal-x" onClick={close} aria-label="Đóng">×</button>
            </div>

            {result?.ok ? (
              <div style={{ marginTop: 12 }}>
                <div className="cmpl-note ok">
                  ✓ Đã gửi biên bản tới <b>{result.sent}/{result.total}</b> người.
                  {result.failed && result.failed.length > 0 && <> · {result.failed.length} địa chỉ gửi lỗi.</>}
                </div>
                {result.failed && result.failed.length > 0 && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Lỗi: {result.failed.join(', ')}</p>
                )}
                <div style={{ marginTop: 14, textAlign: 'right' }}>
                  <button className="btn" type="button" onClick={close}>Xong</button>
                </div>
              </div>
            ) : (
              <>
                <p className="muted" style={{ marginTop: 8, marginBottom: 8, fontSize: 13 }}>
                  Email gồm nội dung biên bản, quyết định &amp; danh sách hành động của cuộc họp, gửi tới
                  <b> {recipients.length} thành viên</b>:
                </p>
                <div className="sm-mail-recips">
                  {recipients.length === 0 ? (
                    <span className="muted" style={{ fontSize: 13 }}>Chưa có thành viên nào có email — hãy thêm người tham gia trước.</span>
                  ) : (
                    recipients.map((r) => (
                      <span key={r.email} className="sm-mail-chip" title={r.email}>{r.name || r.email}</span>
                    ))
                  )}
                </div>

                <label className="f" style={{ marginTop: 12 }}>Lời nhắn kèm theo (tuỳ chọn)</label>
                <textarea className="i" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Kính gửi anh/chị, đính kèm biên bản cuộc họp hôm nay…" />

                {result && !result.ok && <div className="cmpl-note err" style={{ marginTop: 10 }}>✗ {result.error}</div>}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="btn ghost" type="button" onClick={close} disabled={busy}>Huỷ</button>
                  <button className="btn" type="button" onClick={doSend} disabled={busy || recipients.length === 0}>
                    {busy ? 'Đang gửi…' : `Gửi tới ${recipients.length} người`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
