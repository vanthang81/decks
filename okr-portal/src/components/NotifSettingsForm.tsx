'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type TypeMeta = { key: string; label: string; desc: string };

// Form tuỳ chọn thông báo — toggle từng loại + email tổng; lưu qua server action, có toast "Đã lưu".
export default function NotifSettingsForm({
  types,
  initial,
  initialEmail,
  action,
}: {
  types: TypeMeta[];
  initial: Record<string, boolean>;
  initialEmail: boolean;
  action: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initial);
  const [email, setEmail] = useState(initialEmail);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () => {
    const fd = new FormData();
    fd.set('notify_email', email ? '1' : '0');
    for (const t of types) fd.set(`pref_${t.key}`, prefs[t.key] ? '1' : '0');
    setSaved(false);
    start(async () => {
      await action(fd);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <div className="nset">
      <div className="nset-list">
        {types.map((t) => (
          <label key={t.key} className="nset-row">
            <span className="nset-txt">
              <b>{t.label}</b>
              <span className="muted">{t.desc}</span>
            </span>
            <span className={`switch ${prefs[t.key] ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={!!prefs[t.key]}
                onChange={(e) => setPrefs((p) => ({ ...p, [t.key]: e.target.checked }))}
              />
              <span className="switch-track"><span className="switch-thumb" /></span>
            </span>
          </label>
        ))}
        <label className="nset-row">
          <span className="nset-txt">
            <b>Gửi email</b>
            <span className="muted">Ngoài thông báo trong ứng dụng, gửi thêm email cho các loại đang bật ở trên.</span>
          </span>
          <span className={`switch ${email ? 'on' : ''}`}>
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
            <span className="switch-track"><span className="switch-thumb" /></span>
          </span>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button type="button" className="btn" onClick={save} disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu tuỳ chọn'}
        </button>
        {saved && <span className="badge green">✓ Đã lưu</span>}
      </div>
    </div>
  );
}
