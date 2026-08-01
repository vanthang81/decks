'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmButton from './ConfirmButton';

type EntityType = 'objective' | 'key_result' | 'initiative';
type UserOpt = { email: string; name: string; avatar?: string | null };
type Comment = {
  id: string;
  parent_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar: string | null;
  body: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

// Avatar Google nếu có, ngược lại chữ cái đầu.
function Avatar({ url, name, cls }: { url?: string | null; name: string; cls: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} src={url} alt="" referrerPolicy="no-referrer" />;
  }
  return <span className={cls} aria-hidden>{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

// Ô soạn: gõ "@" NGAY trong nội dung để gắn thẻ người (autocomplete inline).
function Composer({
  users,
  onSubmit,
  busy,
  autoFocus,
  placeholder,
  initialBody = '',
  initialMentions = [],
  submitLabel = 'Gửi',
  onCancel,
}: {
  users: UserOpt[];
  onSubmit: (body: string, mentions: string[]) => void | boolean | Promise<void | boolean>;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  initialBody?: string;
  initialMentions?: string[];
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [mentions, setMentions] = useState<string[]>(initialMentions);
  const [q, setQ] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const nameOf = (email: string) => users.find((u) => u.email === email)?.name ?? email;

  const matches = useMemo(() => {
    if (q === null) return [];
    const t = q.trim().toLowerCase();
    return users
      .filter((u) => !mentions.includes(u.email))
      .filter((u) => !t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t))
      .slice(0, 6);
  }, [q, users, mentions]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const pos = e.target.selectionStart ?? val.length;
    const m = val.slice(0, pos).match(/@([^\s@]{0,30})$/);
    setQ(m ? m[1] : null);
  };

  const pick = (u: UserOpt) => {
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? body.length;
    const before = body.slice(0, pos).replace(/@([^\s@]{0,30})$/, `@${u.name} `);
    const after = body.slice(pos);
    const next = before + after;
    setBody(next);
    setMentions((xs) => (xs.includes(u.email) ? xs : [...xs, u.email]));
    setQ(null);
    setTimeout(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(before.length, before.length);
      }
    }, 0);
  };

  const submit = async () => {
    const finalMentions = mentions.filter((e) => body.includes(`@${nameOf(e)}`));
    const ok = await onSubmit(body.trim(), finalMentions);
    // Gửi thành công → dọn sạch ô soạn (không giữ lại nội dung đã gửi).
    if (ok !== false) {
      setBody('');
      setMentions([]);
      setQ(null);
    }
  };

  return (
    <div className="cmt-composer">
      <div className="cmt-tawrap">
        <textarea
          ref={taRef}
          className="i"
          rows={2}
          placeholder={placeholder ?? 'Viết bình luận… gõ @ để gắn thẻ người'}
          value={body}
          autoFocus={autoFocus}
          onChange={onChange}
          onBlur={() => setTimeout(() => setQ(null), 150)}
        />
        {q !== null && matches.length > 0 && (
          <div className="cmt-mentionmenu">
            {matches.map((u) => (
              <button key={u.email} type="button" onMouseDown={(e) => { e.preventDefault(); pick(u); }}>
                <Avatar url={u.avatar} name={u.name} cls="cmt-mm-av" />
                {u.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {mentions.length > 0 && (
        <div className="cmt-taglist">
          Gắn thẻ:{' '}
          {mentions.map((m) => (
            <span key={m} className="cmt-chip">
              @{nameOf(m)}
              <button type="button" onClick={() => setMentions((xs) => xs.filter((x) => x !== m))} aria-label="Bỏ">✕</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button className="btn sm" type="button" disabled={busy || !body.trim()} onClick={submit}>
          {busy ? 'Đang gửi…' : submitLabel}
        </button>
        {onCancel && (
          <button className="btn ghost sm" type="button" onClick={onCancel} disabled={busy}>
            Huỷ
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommentThread({
  entityType,
  entityId,
  users,
  defaultOpen = false,
}: {
  entityType: EntityType;
  entityId: string;
  users: UserOpt[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = async () => {
    const r = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
    if (r.ok) {
      const j = await r.json();
      setComments(j.comments ?? []);
      setMe(j.me ?? '');
    }
    setLoaded(true);
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = comments.length;
  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  const post = async (parentId: string | null, body: string, mentions: string[]): Promise<boolean> => {
    setBusy(true);
    try {
      const r = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, parentId, body, mentions }),
      });
      if (r.ok) {
        setReplyTo(null);
        await load();
      }
      return r.ok;
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string, body: string, mentions: string[]): Promise<boolean> => {
    setBusy(true);
    try {
      const r = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, body, mentions }),
      });
      if (r.ok) {
        setEditId(null);
        await load();
      }
      return r.ok;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (r.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  const renderComment = (c: Comment, isReply: boolean) => {
    const mine = !!c.author_email && c.author_email.toLowerCase() === me.toLowerCase();
    return (
      <div key={c.id} className={`cmt ${isReply ? 'cmt-reply' : ''}`}>
        <Avatar url={c.author_avatar} name={c.author_name ?? c.author_email ?? '?'} cls="cmt-avatar" />
        <div className="cmt-main">
          <div className="cmt-head">
            <b>{c.author_name || c.author_email || '—'}</b>
            <span className="cmt-time">
              {fmtTime(c.created_at)}
              {c.updated_at !== c.created_at ? ' · đã sửa' : ''}
            </span>
          </div>
          {editId === c.id ? (
            <Composer
              users={users}
              busy={busy}
              autoFocus
              initialBody={c.body}
              initialMentions={c.mentions}
              submitLabel="Lưu"
              onSubmit={(b, m) => saveEdit(c.id, b, m)}
              onCancel={() => setEditId(null)}
            />
          ) : (
            <>
              <div className="cmt-body">{c.body}</div>
              <div className="cmt-actions">
                {!isReply && (
                  <button className="linkbtn" type="button" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                    Trả lời
                  </button>
                )}
                {mine && (
                  <>
                    <button className="linkbtn" type="button" onClick={() => setEditId(c.id)}>Sửa</button>
                    <ConfirmButton
                      className="linkbtn danger"
                      label="Xoá"
                      title="Xoá bình luận"
                      message="Xoá bình luận này? Mọi trả lời bên trong cũng bị xoá."
                      confirmLabel="Xoá hẳn"
                      onConfirm={() => remove(c.id)}
                    />

                  </>
                )}
              </div>
            </>
          )}

          {repliesOf(c.id).map((r) => renderComment(r, true))}

          {replyTo === c.id && (
            <div style={{ marginTop: 6 }}>
              <Composer
                users={users}
                busy={busy}
                autoFocus
                placeholder={`Trả lời ${c.author_name || ''}… gõ @ để gắn thẻ`}
                submitLabel="Trả lời"
                onSubmit={(b, m) => post(c.id, b, m)}
                onCancel={() => setReplyTo(null)}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="cmt-thread">
      <button type="button" className="cmt-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="kr-sub-ic">💬</span> Thảo luận{loaded ? ` (${count})` : ''}{' '}
        <span className="cmt-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="cmt-body-wrap">
          {!loaded && <p className="muted" style={{ fontSize: 13 }}>Đang tải…</p>}
          {loaded && roots.length === 0 && (
            <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>Chưa có bình luận. Hãy mở đầu cuộc thảo luận.</p>
          )}
          {roots.map((c) => renderComment(c, false))}
          <div className="cmt-newbox">
            <Composer users={users} busy={busy} onSubmit={(b, m) => post(null, b, m)} />
          </div>
        </div>
      )}
    </div>
  );
}
