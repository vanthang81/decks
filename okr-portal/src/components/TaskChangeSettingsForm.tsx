'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import type { TaskChangeChannel, TaskChangePrefs } from '@/lib/task-changes';

const CHANNELS: { key: TaskChangeChannel; label: string; desc: string }[] = [
  { key: 'both', label: 'Cả hai', desc: 'Thông báo trong app + email' },
  { key: 'app', label: 'Chỉ trong app', desc: 'Chỉ hiện ở chuông 🔔' },
  { key: 'email', label: 'Chỉ email', desc: 'Chỉ gửi email' },
  { key: 'off', label: 'Tắt', desc: 'Không nhận' },
];

// Tuỳ chọn "Thông báo thay đổi công việc": chọn kênh + các mốc giờ gửi trong ngày (= số lần/ngày) + ngày trong tuần.
export default function TaskChangeSettingsForm({
  initial, timeChoices, dayLabel, action,
}: {
  initial: TaskChangePrefs;
  timeChoices: string[];
  dayLabel: Record<number, string>;
  action: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [channel, setChannel] = useState<TaskChangeChannel>(initial.channel);
  const [times, setTimes] = useState<string[]>(initial.times);
  const [days, setDays] = useState<number[]>(initial.days);
  const [pending, start] = useTransition();
  const off = channel === 'off';

  const toggleTime = (t: string) => setTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort()));
  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  const save = () => {
    if (!off && times.length === 0) { toast('Chọn ít nhất 1 mốc giờ gửi', 'error'); return; }
    if (!off && days.length === 0) { toast('Chọn ít nhất 1 ngày trong tuần', 'error'); return; }
    const fd = new FormData();
    fd.set('channel', channel);
    for (const t of times) fd.append('times', t);
    for (const d of days) fd.append('days', String(d));
    start(async () => {
      await action(fd);
      toast('Đã lưu tuỳ chọn thông báo thay đổi công việc', 'success');
      router.refresh();
    });
  };

  const DAYS = [1, 2, 3, 4, 5, 6, 0]; // T2..CN

  return (
    <div className="tcs">
      <div className="tcs-field">
        <div className="f">Kênh nhận</div>
        <div className="tcs-chips">
          {CHANNELS.map((c) => (
            <button type="button" key={c.key} title={c.desc}
              className={`tcs-chip${channel === c.key ? ' on' : ''}`} onClick={() => setChannel(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {!off && (
        <>
          <div className="tcs-field">
            <div className="f">Giờ gửi trong ngày <span className="muted" style={{ fontWeight: 400 }}>— chọn 1 hay nhiều mốc (số mốc = số lần gửi/ngày)</span></div>
            <div className="tcs-chips">
              {timeChoices.map((t) => (
                <button type="button" key={t}
                  className={`tcs-chip sm${times.includes(t) ? ' on' : ''}`} onClick={() => toggleTime(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="tcs-field">
            <div className="f">Ngày trong tuần</div>
            <div className="tcs-chips">
              {DAYS.map((d) => (
                <button type="button" key={d}
                  className={`tcs-chip${days.includes(d) ? ' on' : ''}`} onClick={() => toggleDay(d)}>
                  {dayLabel[d]}
                </button>
              ))}
            </div>
          </div>

          <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 0' }}>
            Hệ thống gom mọi thay đổi (trạng thái/nội dung) ở việc bạn <b>giao</b> hoặc <b>chủ trì OKR</b> kể từ lần gửi trước,
            rồi gửi vào đúng các mốc giờ trên. Mặc định: 08:00 Thứ 2–Thứ 7.
          </p>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn" onClick={save} disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu tuỳ chọn'}
        </button>
      </div>
    </div>
  );
}
