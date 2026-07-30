import { progressColor } from '@/lib/format';

export function ProgressBar({ value, lg }: { value: number; lg?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={lg ? 'pbar lg' : 'pbar'} title={`${v.toFixed(0)}%`}>
      <span style={{ width: `${v}%`, background: progressColor(v) }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    draft: { cls: 'gray', label: 'Nháp' },
    active: { cls: 'blue', label: 'Đang chạy' },
    done: { cls: 'green', label: 'Hoàn thành' },
    archived: { cls: 'gray', label: 'Lưu trữ' },
  };
  const s = map[status] ?? { cls: 'gray', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    company: 'Công ty',
    division: 'Khối',
    department: 'Phòng',
    individual: 'Cá nhân',
  };
  return <span className="badge">{map[level] ?? level}</span>;
}
