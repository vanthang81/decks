import { progressColor } from '@/lib/format';
import { OBJ_STATUS_LABEL, OBJ_STATUS_BADGE } from '@/lib/okr-status';

export function ProgressBar({ value, lg }: { value: number; lg?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={lg ? 'pbar lg' : 'pbar'} title={`${v.toFixed(0)}%`}>
      <span style={{ width: `${v}%`, background: progressColor(v) }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = (OBJ_STATUS_LABEL as Record<string, string>)[status] ?? status;
  const cls = (OBJ_STATUS_BADGE as Record<string, string>)[status] ?? 'gray';
  return <span className={`badge ${cls}`}>{label}</span>;
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
