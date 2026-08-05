'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmButton from './ConfirmButton';
import NumberInput from '@/components/NumberInput';

export type KrData = {
  id: string;
  title: string;
  metric_type: string;
  direction: string;
  unit_label: string | null;
  start_value: number;
  target_value: number;
  weight: number;
  indicator: string;
  kpi_source: string | null;
};
type KpiOpt = { key: string; label: string };

export default function KeyResultEditButton({
  kr,
  kpiSources,
  save,
  del,
}: {
  kr: KrData;
  kpiSources: KpiOpt[];
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [kpi, setKpi] = useState<string>(kr.kpi_source ?? '');
  const isAuto = kpi !== '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('key_result_id', kr.id);
    setErr(null);
    startTransition(async () => {
      try {
        await save(fd);
        router.refresh();
        setOpen(false);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  const doDelete = () => {
    const fd = new FormData();
    fd.set('key_result_id', kr.id);
    setErr(null);
    startTransition(async () => {
      try {
        await del(fd);
        router.refresh();
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (!/NEXT_REDIRECT/.test(msg)) setErr(msg);
      }
    });
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        ✏️ Sửa KR
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Sửa kết quả then chốt (KR)</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Tiêu đề KR</label>
              <input className="i" name="title" defaultValue={kr.title} required />

              <div className="row">
                <div>
                  <label className="f">Loại đo</label>
                  <select className="i" name="metric_type" defaultValue={kr.metric_type} disabled={isAuto}>
                    <option value="number">Số</option>
                    <option value="percent">Phần trăm</option>
                    <option value="currency">Tiền (VND)</option>
                    <option value="boolean">Có/Không</option>
                  </select>
                </div>
                <div>
                  <label className="f">Hướng</label>
                  <select className="i" name="direction" defaultValue={kr.direction}>
                    <option value="increase">Càng cao càng tốt</option>
                    <option value="decrease">Càng thấp càng tốt</option>
                  </select>
                </div>
                <div>
                  <label className="f">Loại chỉ số</label>
                  <select className="i" name="indicator" defaultValue={kr.indicator} disabled={isAuto}>
                    <option value="lagging">Kết quả (lagging)</option>
                    <option value="leading">Dẫn dắt (leading)</option>
                  </select>
                </div>
                <div>
                  <label className="f">Đơn vị</label>
                  <input className="i" name="unit_label" defaultValue={kr.unit_label ?? ''} placeholder="tỷ, chỉ, HĐ…" disabled={isAuto} />
                </div>
              </div>

              <div className="row">
                <div>
                  <label className="f">Bắt đầu</label>
                  <NumberInput name="start_value" defaultValue={kr.start_value} disabled={isAuto} />
                </div>
                <div>
                  <label className="f">Mục tiêu</label>
                  <NumberInput name="target_value" defaultValue={kr.target_value} disabled={isAuto} />
                </div>
                <div>
                  <label className="f">Trọng số</label>
                  <NumberInput name="weight" defaultValue={kr.weight} />
                </div>
              </div>

              <label className="f">Nguồn KPI tự động (tuỳ chọn)</label>
              <select className="i" name="kpi_source" value={kpi} onChange={(e) => setKpi(e.target.value)}>
                <option value="">— Nhập tay —</option>
                {kpiSources.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              {isAuto && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  KR gắn KPI tự động: loại đo/đơn vị/mốc/giá trị do hệ thống đồng bộ từ BigQuery (ép VND, đơn vị "tỷ").
                </p>
              )}

              {err && (
                <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>
                  ❌ {err}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
                <button className="btn ghost" type="button" onClick={() => setOpen(false)} disabled={pending}>
                  Huỷ
                </button>
              </div>
            </form>

            <div className="okr-modal-manage">
              <ConfirmButton
                className="btn ghost sm danger"
                label="🗑 Xoá KR"
                title="Xoá kết quả then chốt"
                message="Xoá KR này cùng toàn bộ check-in đã ghi? Hành động không thể hoàn tác."
                confirmLabel="Xoá hẳn"
                onConfirm={doDelete}
                disabled={pending}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
