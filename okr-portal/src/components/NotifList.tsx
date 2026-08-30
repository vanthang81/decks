'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import NotifItems, { type Notif } from '@/components/NotifItems';

export default function NotifList() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/notifications');
    if (r.ok) {
      const j = await r.json();
      setItems(j.items ?? []);
    }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const readAll = async () => {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'read_all' }),
    });
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
      {loaded && <NotifItems items={items} onReload={load} />}
    </div>
  );
}
