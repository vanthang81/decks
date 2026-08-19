'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import SearchSelect from '@/components/SearchSelect';
import NumberInput from '@/components/NumberInput';
import { useToast } from '@/components/ToastProvider';
import type { Level } from '@/lib/okr';
import { OBJ_STATUSES, OBJ_STATUS_LABEL } from '@/lib/okr-status';

type UserOpt = { email: string; name: string; role: string; unit_id: string | null; unit_name: string | null; title?: string | null };
type UnitOpt = { id: string; name: string; type: string };
type ParentOpt = { id: string; code: string | null; title: string; level: Level; bsc: string | null };
type PillarOpt = { id: string; code: string | null; title: string; bsc: string | null };
type BscOpt = { value: string; label: string; icon: string };

type KrRow = {
  title: string; metric_type: string; direction: string;
  start_value: string; target_value: string; unit_label: string; indicator: string;
};
const emptyKr = (): KrRow => ({ title: '', metric_type: 'number', direction: 'increase', start_value: '', target_value: '', unit_label: '', indicator: 'lagging' });

const METRICS = [{ v: 'number', l: 'Số' }, { v: 'percent', l: '%' }, { v: 'currency', l: 'Tiền (VND)' }, { v: 'boolean', l: 'Có/Không' }];

export default function NewObjectiveForm({
  periodId, currentEmail, allowedLevels, defaultLevel, levelLabels,
  units, users, periodObjectives, pillars, bscOptions, okrTypeOptions, create,
  inline = false, onSuccess, onCancel,
}: {
  periodId: string;
  currentEmail: string;
  allowedLevels: Level[];
  defaultLevel: Level;
  levelLabels: Record<Level, string>;
  units: UnitOpt[];
  users: UserOpt[];
  periodObjectives: ParentOpt[];
  pillars: PillarOpt[];
  bscOptions: BscOpt[];
  okrTypeOptions: { value: string; label: string; expect: string }[];
  create: (fd: FormData) => Promise<void>;
  // Khi nhúng trong POPUP: inline=true (server action revalidate thay vì redirect), onSuccess đóng+refresh, onCancel đóng.
  inline?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const [level, setLevel] = useState<Level>(defaultLevel);
  const [unitId, setUnitId] = useState('');
  const [bsc, setBsc] = useState('');
  const [showAllParents, setShowAllParents] = useState(false);
  const [parentId, setParentId] = useState('');
  const [title, setTitle] = useState('');
  const [okrType, setOkrType] = useState('committed');
  const [status, setStatus] = useState('active');
  const [weight, setWeight] = useState('1');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [krs, setKrs] = useState<KrRow[]>([emptyKr()]);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const needsUnit = level === 'division' || level === 'department';
  const unitChoices = useMemo(
    () => units.filter((u) => (level === 'division' ? u.type === 'division' : level === 'department' ? u.type === 'department' : false)),
    [units, level],
  );

  // Đổi cấp → reset đơn vị + cha; đặt lại chủ trì mặc định theo cấp/đơn vị.
  useEffect(() => { setUnitId(''); setParentId(''); }, [level]);
  useEffect(() => {
    let def = '';
    if (level === 'individual') def = currentEmail;
    else if (level === 'company') def = users.find((u) => u.role === 'ceo')?.email ?? '';
    else if (unitId) {
      const wantRole = level === 'division' ? 'division_lead' : 'dept_lead';
      def = users.find((u) => u.role === wantRole && u.unit_id === unitId)?.email ?? '';
    }
    setOwner(def);
  }, [level, unitId, users, currentEmail]);

  // OKR cha (alignment) — chỉ hiện cấp TRÊN hợp lệ; mặc định lọc theo thẻ BSC (có nút xem tất cả).
  const parentOpts = useMemo(() => {
    if (level === 'company') {
      return pillars.map((p) => ({ id: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.title}` }));
    }
    const wantLevels: Level[] = level === 'division' ? ['company'] : level === 'department' ? ['division'] : ['department', 'division'];
    let arr = periodObjectives.filter((o) => wantLevels.includes(o.level));
    if (bsc && !showAllParents) { const f = arr.filter((o) => o.bsc === bsc); if (f.length) arr = f; }
    return arr.map((o) => ({ id: o.id, label: `[${levelLabels[o.level]}] ${o.code ? o.code + ' · ' : ''}${o.title}` }));
  }, [level, bsc, showAllParents, pillars, periodObjectives, levelLabels]);
  useEffect(() => { if (parentId && !parentOpts.some((p) => p.id === parentId)) setParentId(''); }, [parentOpts, parentId]);

  const parentLabel = level === 'company'
    ? 'Liên kết lên Trụ cột chiến lược (5 năm)'
    : level === 'division' ? 'Liên kết lên OKR Công ty'
      : level === 'department' ? 'Liên kết lên OKR Khối' : 'Liên kết lên OKR Khối/Phòng';

  const setKr = (i: number, patch: Partial<KrRow>) => setKrs((cur) => cur.map((k, j) => (j === i ? { ...k, ...patch } : k)));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) { setErr('Nhập Mục tiêu (Objective).'); return; }
    if (needsUnit && !unitId) { setErr('Chọn Đơn vị (Khối/Phòng).'); return; }
    const fd = new FormData();
    fd.set('period_id', periodId);
    fd.set('level', level);
    fd.set('unit_id', needsUnit ? unitId : '');
    fd.set('owner_email', owner);
    fd.set('parent_id', parentId);
    fd.set('okr_type', okrType);
    fd.set('status', status);
    fd.set('weight', weight);
    fd.set('bsc_perspective', bsc);
    fd.set('title', title.trim());
    fd.set('description', description);
    if (inline) fd.set('inline', '1');
    fd.set('krs', JSON.stringify(krs.filter((k) => k.title.trim())));
    startTransition(async () => {
      try {
        await create(fd);
        toast('Đã tạo OKR', 'success');
        onSuccess?.(); // chỉ tới đây khi inline (không redirect) → đóng popup + refresh
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (msg.includes('NEXT_REDIRECT')) return;
        setErr(msg);
      }
    });
  };

  return (
    <form onSubmit={submit}>
      <label className="f">Cấp OKR</label>
      <select className="i" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
        {allowedLevels.map((l) => <option key={l} value={l}>{levelLabels[l]}</option>)}
      </select>

      {needsUnit && (
        <>
          <label className="f">Đơn vị ({level === 'division' ? 'Khối' : 'Phòng'})</label>
          <SearchSelect name="_unit_pick" value={unitId} onChange={setUnitId} emptyLabel={`— Chọn ${level === 'division' ? 'Khối' : 'Phòng'} —`}
            options={unitChoices.map((u) => ({ value: u.id, label: u.name }))} />
        </>
      )}

      <label className="f">Viễn cảnh BSC {level === 'individual' ? '(tuỳ chọn)' : '(khuyến nghị)'}</label>
      <select className="i" value={bsc} onChange={(e) => setBsc(e.target.value)}>
        <option value="">— Chưa gắn —</option>
        {bscOptions.map((b) => <option key={b.value} value={b.value}>{b.icon} {b.label}</option>)}
      </select>

      <label className="f">{parentLabel}</label>
      <select className="i" value={parentId} onChange={(e) => setParentId(e.target.value)}>
        <option value="">— Không liên kết —</option>
        {parentOpts.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {level !== 'company' && bsc && (
        <label className="pp-hint" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <input type="checkbox" checked={showAllParents} onChange={(e) => setShowAllParents(e.target.checked)} />
          Hiện OKR cha ở mọi viễn cảnh (mặc định chỉ cùng thẻ BSC)
        </label>
      )}

      <label className="f">Mục tiêu (Objective) *</label>
      <input className="i" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Tăng trưởng doanh thu bán lẻ vượt kế hoạch" required />

      {/* Key Results ngay tại form tạo */}
      <div className="nob-krs">
        <div className="flexbtw" style={{ alignItems: 'baseline' }}>
          <label className="f" style={{ margin: 0 }}>Key Results (thước đo)</label>
          {krs.length > 5 && <span className="pp-hint">Khuyến nghị ≤ 5 KR/OKR cho tập trung.</span>}
        </div>
        {krs.map((k, i) => (
          <div key={i} className="nob-kr">
            <input className="i" placeholder={`KR ${i + 1}: VD Doanh thu đạt 1.859 tỷ`} value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} />
            <div className="nob-kr-row">
              <select className="i" value={k.metric_type} onChange={(e) => setKr(i, { metric_type: e.target.value })} title="Loại đo">
                {METRICS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select className="i" value={k.direction} onChange={(e) => setKr(i, { direction: e.target.value })} title="Hướng">
                <option value="increase">Tăng ↑</option>
                <option value="decrease">Giảm ↓</option>
              </select>
              {k.metric_type !== 'boolean' && <NumberInput placeholder={`Đầu kỳ${k.metric_type === 'percent' ? ' (%)' : k.metric_type === 'currency' ? ' (đồng)' : ''}`} value={k.start_value} onValueChange={(f) => setKr(i, { start_value: f })} />}
              {k.metric_type !== 'boolean' && <NumberInput placeholder={`Mục tiêu${k.metric_type === 'percent' ? ' (%)' : k.metric_type === 'currency' ? ' (đồng)' : ''}`} value={k.target_value} onValueChange={(f) => setKr(i, { target_value: f })} />}
              {k.metric_type === 'number' && <input className="i" placeholder="Đơn vị (tỷ, chỉ…)" value={k.unit_label} onChange={(e) => setKr(i, { unit_label: e.target.value })} />}
              <select className="i" value={k.indicator} onChange={(e) => setKr(i, { indicator: e.target.value })} title="Loại chỉ số">
                <option value="lagging">Kết quả (lagging)</option>
                <option value="leading">Dẫn dắt (leading)</option>
              </select>
              {krs.length > 1 && <button type="button" className="btn ghost sm danger" onClick={() => setKrs((c) => c.filter((_, j) => j !== i))} title="Bỏ KR">✕</button>}
            </div>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => setKrs((c) => [...c, emptyKr()])}>＋ Thêm Key Result</button>
      </div>

      <div className="row">
        <div style={{ flex: 2 }}>
          <label className="f">Loại OKR</label>
          <select className="i" value={okrType} onChange={(e) => setOkrType(e.target.value)}>
            {okrTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.expect}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Trạng thái</label>
          <select className="i" value={status} onChange={(e) => setStatus(e.target.value)}>
            {OBJ_STATUSES.map((s) => <option key={s} value={s}>{OBJ_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="f">Trọng số <span className="muted" style={{ fontWeight: 400 }}>· số ≥ 0, nhiều số lẻ (mặc định 1)</span></label>
          <input className="i" type="number" min="0" step="any" value={weight} onChange={(e) => setWeight(e.target.value)}
            title="Trọng số của OKR khi tính kết quả tổng của nhóm (Công ty/Khối/Phòng/Cá nhân) ở Báo cáo theo cấp. Số ≥ 0, nhiều số lẻ (tối đa 4). Mặc định 1." />
        </div>
      </div>

      <label className="f">Mô tả (tuỳ chọn)</label>
      <textarea className="i" value={description} onChange={(e) => setDescription(e.target.value)} />

      <label className="f">Người chủ trì {level === 'company' ? '(mặc định CEO — có thể assign khác)' : level !== 'individual' ? '(mặc định người phụ trách đơn vị)' : ''}</label>
      <SearchSelect name="owner_pick" value={owner} onChange={setOwner} emptyLabel="— Chưa gán —"
        options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
      {/* owner_email được gửi qua fd.set('owner_email', owner) trong submit */}

      {err && <p className="form-err">{err}</p>}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: inline ? 'flex-end' : 'flex-start' }}>
        {onCancel
          ? <button type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Huỷ</button>
          : <Link className="btn ghost" href="/objectives">Huỷ</Link>}
        <button className="btn" type="submit" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo OKR'}</button>
      </div>
    </form>
  );
}
