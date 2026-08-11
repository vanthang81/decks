'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
const TYPE_LABEL: Record<string, string> = {
  mention: 'đã nhắc bạn',
  reply: 'đã trả lời bạn',
  comment_mine: 'đã bình luận ở mục bạn phụ trách',
  assignment: 'đã giao việc cho bạn',
};

export default function NotifList() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const r = await fetch('/api/notifications');
    if (r.ok) {
      const j = await r.json();
      setItems(j.items ?? []);
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

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div>
      <div className="flexbtw" style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Link href="/settings" className="muted" style={{ fontSize: 13 }}>⚙ Cài đặt thông báo</Link>
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
