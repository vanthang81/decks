'use client';

import { useState, useTransition, type FormEvent } from 'react';
import ConfirmButton from './ConfirmButton';

export type CheckinRowData = {
  id: string;
  value: number | null;
  valueLabel: string | null;
  confidence: string;
  confidenceLabel: string;
  confidenceColor: string;
  note: string | null;
  evidence_url: string | null;
  author: string;
  date: string;
};

/**
 * 1 dòng check-in dưới mỗi KR. Client-side để: sau khi "Lưu thay đổi" thì
 * HIỆN note "✓ Đã lưu" + ĐÓNG form sửa (CFO 01/08); xoá có popup xác nhận.
 */
export default function CheckinRow({
  ci,
  canEdit,
  canDelete,
  editAction,
  deleteAction,
}: {
  ci: CheckinRowData;
  canEdit: boolean;
  canDelete: boolean;
  editAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await editAction(fd);
      setOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    });
  }

  function onDelete() {
    const fd = new FormData();
    fd.set('id', ci.id);
    start(async () => {
      await deleteAction(fd);
    });
  }

  return (
    <div className="ci-row">
      <span className="ci-dot" style={{ background: ci.confidenceColor }} title={ci.confidenceLabel} />
      <div className="ci-body">
        <div className="ci-line">
          {ci.valueLabel && <b className="mono">{ci.valueLabel}</b>}
          <span style={{ color: ci.confidenceColor, fontWeight: 600, fontSize: 12.5 }}>
            ● {ci.confidenceLabel}
          </span>
          {ci.note && <span className="ci-note">— {ci.note}</span>}
          {ci.evidence_url && (
            <a className="ci-evi" href={ci.evidence_url} target="_blank" rel="noopener noreferrer" title={ci.evidence_url}>🔗 Minh chứng</a>
          )}
          {saved && <span className="ci-saved">✓ Đã lưu</span>}
        </div>
        <div className="ci-meta">
          <span>
            {ci.author} · {ci.date}
          </span>
          {canEdit && (
            <button type="button" className="linkbtn" onClick={() => setOpen((v) => !v)}>
              {open ? 'Đóng' : '✏️ Sửa'}
            </button>
          )}
          {canDelete && (
            <ConfirmButton
              className="linkbtn danger"
              label="Xoá"
              title="Xoá check-in"
              message="Xoá check-in này? Hành động không thể hoàn tác."
              confirmLabel="Xoá hẳn"
              onConfirm={onDelete}
              disabled={pending}
            />
          )}
        </div>
        {canEdit && open && (
          <form onSubmit={onSave} className="ci-editform">
            <div className="row">
              <div style={{ maxWidth: 150 }}>
                <label className="f">Giá trị</label>
                <input className="i" name="value" defaultValue={ci.value ?? ''} />
              </div>
              <div style={{ maxWidth: 170 }}>
                <label className="f">Độ tự tin</label>
                <select className="i" name="confidence" defaultValue={ci.confidence}>
                  <option value="on_track">Đúng tiến độ</option>
                  <option value="at_risk">Có rủi ro</option>
                  <option value="off_track">Chệch hướng</option>
                </select>
              </div>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label className="f">Ghi chú</label>
                <input className="i" name="note" defaultValue={ci.note ?? ''} />
              </div>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label className="f">Link minh chứng <span className="muted" style={{ fontWeight: 400 }}>(tùy chọn)</span></label>
                <input className="i" name="evidence_url" type="url" inputMode="url" defaultValue={ci.evidence_url ?? ''} placeholder="https://…" />
              </div>
            </div>
            <input type="hidden" name="id" value={ci.id} />
            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn sm" type="submit" disabled={pending}>
                {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
              <button className="btn ghost sm" type="button" onClick={() => setOpen(false)} disabled={pending}>
                Huỷ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
