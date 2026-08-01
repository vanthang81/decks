'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Notif = {
  id: string;
  type: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_avatar: string | null;
  preview: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}
const TYPE_LABEL: Record<string, string> = { mention: 'đã nhắc bạn', reply: 'đã trả lời bạn' };

export default function NotifList() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const r = await fetch('/api/notifications');
    if (r.ok) {
      const j = await r.json();
      setItems(j.items ?? []);
      setNotifyEmail(!!j.notifyEmail);
    }
    setLoaded(true);
  };
  useEffect(() => {
    load();
  }, []);

  const post = async (payload: Record<string, unknown>) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  const openItem = async (n: Notif) => {
    if (!n.is_read) await post({ action: 'read', id: n.id });
    if (n.link) router.push(n.link);
    else load();
  };

  const readAll = async () => {
    await post({ action: 'read_all' });
    load();
  };

  const toggleEmail = async (v: boolean) => {
    setNotifyEmail(v);
    await post({ action: 'set_email', value: v });
  };

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div>
      <div className="flexbtw" style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
          <input type="checkbox" checked={notifyEmail} onChange={(e) => toggleEmail(e.target.checked)} />
          Nhận email khi có người nhắc/trả lời
        </label>
        <button className="btn ghost sm" type="button" onClick={readAll} disabled={unread === 0}>
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {!loaded && <p className="muted">Đang tải…</p>}
      {loaded && items.length === 0 && <p className="muted">Chưa có thông báo nào.</p>}

      <div className="ntf-list">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`ntf-item ${n.is_read ? '' : 'unread'}`}
            onClick={() => openItem(n)}
          >
            <span className="ntf-dot" aria-hidden />
            {n.actor_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ntf-av" src={n.actor_avatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="ntf-av" aria-hidden>
                {(n.actor_name ?? n.actor_email ?? '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="ntf-body">
              <span className="ntf-line">
                <b>{n.actor_name || n.actor_email}</b> {TYPE_LABEL[n.type] ?? 'có hoạt động'}
              </span>
              {n.preview && <span className="ntf-preview">“{n.preview}”</span>}
              <span className="ntf-time">{fmtTime(n.created_at)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
