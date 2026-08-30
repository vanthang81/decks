'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export type Notif = {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  comment_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_avatar: string | null;
  preview: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  mention: 'đã nhắc bạn',
  reply: 'đã trả lời bạn',
  comment_mine: 'đã bình luận ở mục bạn phụ trách',
  assignment: 'đã giao việc cho bạn',
  task_due_soon: 'nhắc: công việc sắp đến hạn',
  task_overdue: 'nhắc: công việc quá hạn',
  user_invite_pending: '',
  user_invite_decided: '',
  meeting_access_request: '',
  meeting_access_decided: '',
};

// Thông báo cần DUYỆT/TỪ CHỐI (chỉ khi còn entity_id = còn xử lý được inline).
const APPROVE_TYPES = new Set(['meeting_access_request', 'user_invite_pending']);
// Thông báo gắn 1 mục có thể BÌNH LUẬN thẳng.
const COMMENT_ENTITIES = new Set(['objective', 'key_result', 'initiative']);

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

type UIState = {
  outcome?: 'approved' | 'denied' | 'commented';
  busy?: boolean;
  open?: 'note' | 'reply' | null;
  draft?: string;
};

export default function NotifItems({
  items,
  onReload,
  onNavigate,
}: {
  items: Notif[];
  onReload: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [ui, setUi] = useState<Record<string, UIState>>({});

  const setItem = (id: string, patch: UIState) =>
    setUi((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const post = (payload: Record<string, unknown>) =>
    fetch('/api/notifications', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    });

  const openItem = async (n: Notif) => {
    if (!n.is_read) await post({ action: 'read', id: n.id });
    if (n.link) {
      onNavigate?.();
      router.push(n.link);
    } else {
      onReload();
    }
  };

  const act = async (n: Notif, action: 'approve' | 'deny' | 'comment') => {
    const st = ui[n.id] ?? {};
    const text = (st.draft ?? '').trim();
    if (action === 'comment' && !text) {
      toast('Nhập nội dung bình luận', 'error');
      return;
    }
    setItem(n.id, { busy: true });
    try {
      const r = await fetch('/api/notifications/act', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: n.id, action, text }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(j?.error || 'Không thực hiện được', 'error');
        setItem(n.id, { busy: false });
        return;
      }
      const done = j.outcome as UIState['outcome'];
      setItem(n.id, { busy: false, outcome: done, open: null, draft: '' });
      toast(
        done === 'approved' ? 'Đã duyệt' : done === 'denied' ? 'Đã từ chối' : 'Đã gửi bình luận',
        'success',
      );
      onReload(); // làm mới danh sách + số chưa đọc
    } catch {
      toast('Lỗi kết nối', 'error');
      setItem(n.id, { busy: false });
    }
  };

  if (items.length === 0) return <p className="muted" style={{ padding: '8px 2px' }}>Chưa có thông báo nào.</p>;

  return (
    <div className="ntf-list">
      {items.map((n) => {
        const st = ui[n.id] ?? {};
        const canApprove = APPROVE_TYPES.has(n.type) && !!n.entity_id && !st.outcome;
        const canComment = !!n.entity_type && COMMENT_ENTITIES.has(n.entity_type) && !!n.entity_id && !st.outcome;
        return (
          <div key={n.id} className={`ntf-item ${n.is_read ? '' : 'unread'}`}>
            <div className="ntf-main" role="button" tabIndex={0}
              onClick={() => openItem(n)}
              onKeyDown={(e) => { if (e.key === 'Enter') openItem(n); }}>
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
            </div>

            {/* Kết quả đã xử lý */}
            {st.outcome && (
              <div className="ntf-actions">
                <span className={`badge ${st.outcome === 'denied' ? 'amber' : 'green'}`}>
                  {st.outcome === 'approved' ? '✓ Đã duyệt' : st.outcome === 'denied' ? '✕ Đã từ chối' : '✓ Đã gửi bình luận'}
                </span>
              </div>
            )}

            {/* Thao tác inline */}
            {(canApprove || canComment) && (
              <div className="ntf-actions">
                {canApprove && (
                  <>
                    <button type="button" className="btn sm" disabled={st.busy}
                      onClick={() => act(n, 'approve')}>Duyệt</button>
                    <button type="button" className="btn ghost sm" disabled={st.busy}
                      onClick={() => act(n, 'deny')}>Từ chối</button>
                    <button type="button" className="ntf-link" disabled={st.busy}
                      onClick={() => setItem(n.id, { open: st.open === 'note' ? null : 'note' })}>
                      {st.open === 'note' ? 'Ẩn ghi chú' : '＋ Ghi chú'}
                    </button>
                  </>
                )}
                {canComment && (
                  <button type="button" className="btn ghost sm" disabled={st.busy}
                    onClick={() => setItem(n.id, { open: st.open === 'reply' ? null : 'reply' })}>
                    {st.open === 'reply' ? 'Đóng' : '↩ Trả lời'}
                  </button>
                )}
                {n.link && (
                  <button type="button" className="ntf-link" onClick={() => openItem(n)}>Mở</button>
                )}
              </div>
            )}

            {/* Ô nhập ghi chú (kèm quyết định) hoặc bình luận */}
            {st.open && (
              <div className="ntf-compose">
                <textarea
                  className="ntf-ta"
                  rows={2}
                  placeholder={st.open === 'note' ? 'Ghi chú gửi kèm (tuỳ chọn)…' : 'Viết bình luận…'}
                  value={st.draft ?? ''}
                  onChange={(e) => setItem(n.id, { draft: e.target.value })}
                />
                <div className="ntf-compose-row">
                  {st.open === 'note' ? (
                    <>
                      <button type="button" className="btn sm" disabled={st.busy} onClick={() => act(n, 'approve')}>Duyệt kèm ghi chú</button>
                      <button type="button" className="btn ghost sm" disabled={st.busy} onClick={() => act(n, 'deny')}>Từ chối kèm ghi chú</button>
                    </>
                  ) : (
                    <button type="button" className="btn sm" disabled={st.busy} onClick={() => act(n, 'comment')}>Gửi bình luận</button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
