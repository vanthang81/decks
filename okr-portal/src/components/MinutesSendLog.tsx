'use client';

import { useState } from 'react';
import type { MinutesSend } from '@/lib/meeting-mail';

// Note nhỏ cạnh nút "Gửi biên bản": trạng thái đã gửi chưa / mấy lần / gần nhất khi nào, ai gửi,
// bao nhiêu người, thành công hay lỗi. Bấm "Lịch sử" để xem toàn bộ các lần gửi.
function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}
type Kind = 'ok' | 'partial' | 'fail';
function kindOf(s: MinutesSend): Kind {
  if (s.ok_count <= 0) return 'fail';
  if (s.fail_count > 0) return 'partial';
  return 'ok';
}
const DOT: Record<Kind, string> = { ok: '#15803d', partial: '#B45309', fail: '#B42318' };
const WORD: Record<Kind, string> = { ok: 'thành công', partial: 'một phần', fail: 'thất bại' };

export default function MinutesSendLog({ sends }: { sends: MinutesSend[] }) {
  const [open, setOpen] = useState(false);
  if (!sends.length) {
    return <div className="mm-sendlog mm-sendlog-empty">✉ Chưa gửi biên bản qua email lần nào.</div>;
  }
  const last = sends[0];
  const k = kindOf(last);
  const who = last.sent_by_name || last.sent_by || 'ai đó';
  return (
    <div className="mm-sendlog">
      <div className="mm-sendlog-main">
        <span className="mm-dot" style={{ background: DOT[k] }} aria-hidden />
        <span>
          <b>Đã gửi biên bản</b> · {sends.length} lần · gần nhất <b>{fmt(last.sent_at)}</b> bởi {who} ·{' '}
          <span style={{ color: DOT[k], fontWeight: 700 }}>{last.ok_count}/{last.recipients} người</span>
          {last.fail_count > 0 ? ` (${last.fail_count} lỗi)` : ''}
        </span>
        {sends.length > 1 && (
          <button type="button" className="mm-sendlog-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? 'Ẩn lịch sử ▴' : 'Lịch sử ▾'}
          </button>
        )}
      </div>
      {open && sends.length > 1 && (
        <ul className="mm-sendlog-list">
          {sends.map((s) => {
            const kk = kindOf(s);
            return (
              <li key={s.id}>
                <span className="mm-dot" style={{ background: DOT[kk] }} aria-hidden />
                <span className="mm-when">{fmt(s.sent_at)}</span>
                <span className="mm-by">{s.sent_by_name || s.sent_by || '—'}</span>
                <span className="mm-cnt" style={{ color: DOT[kk] }}>{s.ok_count}/{s.recipients} · {WORD[kk]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
