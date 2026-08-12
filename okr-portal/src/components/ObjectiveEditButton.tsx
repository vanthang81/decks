'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmButton from './ConfirmButton';
import SearchSelect from '@/components/SearchSelect';
import { useToast } from '@/components/ToastProvider';
import { unitTreeOptions } from '@/lib/unit-options';

export type ObjData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  okr_type: string;
  owner_email: string | null;
  unit_id: string | null;
  level: string;
  weight: number;
  parent_id: string | null;
};
type PersonOpt = { email: string; name: string; title?: string | null };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };
type ParentCand = { id: string; code: string | null; title: string; level: string };
type PillarCand = { id: string; code: string | null; title: string };

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  active: 'Đang chạy',
  done: 'Hoàn thành',
  archived: 'Lưu trữ',
};
const TYPE_LABEL: Record<string, string> = {
  committed: 'Cam kết',
  aspirational: 'Khát vọng',
  learning: 'Học hỏi',
};

const LEVEL_LABEL: Record<string, string> = {
  company: 'Công ty', division: 'Khối', department: 'Phòng', individual: 'Cá nhân',
};
// Cấp cha hợp lệ theo cấp con (con phải thấp hơn cha).
const PARENT_LEVELS: Record<string, string[]> = {
  company: [], division: ['company'], department: ['division'], individual: ['department', 'division'],
};

export default function ObjectiveEditButton({
  objective,
  users,
  units,
  allowedLevels,
  periodObjectives,
  pillars,
  canDelete,
  canReparent = true,
  save,
  del,
}: {
  objective: ObjData;
  users: PersonOpt[];
  units: UnitOpt[];
  allowedLevels: string[];       // cấp user được phép đặt (luôn gộp thêm cấp hiện tại)
  periodObjectives: ParentCand[]; // OKR cùng kỳ (ứng viên cha cho division/department/individual)
  pillars: PillarCand[];          // trụ cột chiến lược (ứng viên cha cho company)
  canDelete: boolean;
  canReparent?: boolean;          // false = nhân viên sửa OKR cá nhân: chỉ nội dung, KHOÁ cấp/đơn vị/chủ trì/cha
  save: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(objective.level);
  const [parentId, setParentId] = useState(objective.parent_id ?? '');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Mở lại popup → đồng bộ state theo giá trị hiện tại của OKR.
  useEffect(() => { if (open) { setLevel(objective.level); setParentId(objective.parent_id ?? ''); } }, [open, objective.level, objective.parent_id]);

  const levelOpts = useMemo(() => Array.from(new Set([objective.level, ...allowedLevels])), [objective.level, allowedLevels]);
  const needsUnit = level === 'division' || level === 'department';
  const unitChoices = useMemo(
    () => units.filter((u) => (level === 'division' ? u.type === 'division' : level === 'department' ? u.type === 'department' : false)),
    [units, level],
  );
  // Ứng viên OKR cha theo cấp đang chọn (loại chính nó để tránh tự liên kết).
  const parentOpts = useMemo(() => {
    if (level === 'company') return pillars.map((p) => ({ id: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.title}` }));
    const want = PARENT_LEVELS[level] ?? [];
    return periodObjectives
      .filter((o) => o.id !== objective.id && want.includes(o.level))
      .map((o) => ({ id: o.id, label: `[${LEVEL_LABEL[o.level] ?? o.level}] ${o.code ? o.code + ' · ' : ''}${o.title}` }));
  }, [level, pillars, periodObjectives, objective.id]);
  // Đổi cấp → nếu OKR cha đang chọn không còn hợp lệ thì bỏ chọn.
  useEffect(() => { if (parentId && !parentOpts.some((p) => p.id === parentId)) setParentId(''); }, [parentOpts, parentId]);

  const parentLabel = level === 'company' ? 'Liên kết lên Trụ cột chiến lược'
    : level === 'division' ? 'Liên kết lên OKR Công ty'
    : level === 'department' ? 'Liên kết lên OKR Khối' : 'Liên kết lên OKR Khối/Phòng';

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('id', objective.id);
    if (canReparent) {
      fd.set('level', level);
      fd.set('parent_id', parentId); // luôn gửi (rỗng = gỡ liên kết)
    }
    setErr(null);
    startTransition(async () => {
      try {
        await save(fd);
        toast('Đã lưu OKR', 'success');
        router.refresh();
        setOpen(false);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  const doDelete = () => {
    const fd = new FormData();
    fd.set('id', objective.id);
    setErr(null);
    startTransition(async () => {
      try {
        await del(fd);
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        if (!/NEXT_REDIRECT/.test(msg)) setErr(msg);
      }
    });
  };

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>
        ✏️ Sửa OKR
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Sửa OKR</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <form onSubmit={submit}>
              <label className="f">Tiêu đề Objective</label>
              <input className="i" name="title" defaultValue={objective.title} required />
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
                Không cần ghi tên Khối/Phòng — đã lấy từ ô “Đơn vị phụ trách” bên dưới.
              </p>

              <div className="row">
                <div>
                  <label className="f">Loại OKR</label>
                  <select className="i" name="okr_type" defaultValue={objective.okr_type}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="f">Trọng số <span className="muted" style={{ fontWeight: 400 }}>· số ≥ 0, tối đa 2 số lẻ (mặc định 1)</span></label>
                  <input className="i" name="weight" type="number" min="0" step="0.01"
                    defaultValue={String(objective.weight ?? 1)}
                    title="Trọng số của OKR khi tính kết quả tổng của nhóm (Công ty/Khối/Phòng/Cá nhân) ở Báo cáo theo cấp. Số ≥ 0, tối đa 2 chữ số thập phân. Mặc định 1." />
                </div>
                <div>
                  <label className="f">Trạng thái</label>
                  <select className="i" name="status" defaultValue={objective.status}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {canReparent && (
                  <div>
                    <label className="f">Chủ trì (cá nhân)</label>
                    <SearchSelect name="owner_email" defaultValue={objective.owner_email ?? ''} emptyLabel="— Chưa gán —"
                      options={users.map((u) => ({ value: u.email, label: u.name, sub: u.title ?? undefined }))} />
                  </div>
                )}
              </div>

              {canReparent && (
                <>
                  <div className="row">
                    <div>
                      <label className="f">Cấp OKR</label>
                      <select className="i" value={level} onChange={(e) => setLevel(e.target.value)}>
                        {levelOpts.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l] ?? l}</option>)}
                      </select>
                    </div>
                    {needsUnit && (
                      <div>
                        <label className="f">Đơn vị phụ trách ({level === 'division' ? 'Khối' : 'Phòng'})</label>
                        <SearchSelect key={level} name="unit_id" defaultValue={objective.unit_id ?? ''} emptyLabel="— Chọn đơn vị —"
                          options={unitChoices.map((u) => ({ value: u.id, label: u.name }))} />
                      </div>
                    )}
                  </div>

                  <label className="f">{parentLabel} <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
                  <SearchSelect name="_parent_pick" value={parentId} onChange={setParentId} emptyLabel="— Không liên kết —"
                    options={parentOpts.map((p) => ({ value: p.id, label: p.label }))} />
                </>
              )}

              <label className="f">Mô tả</label>
              <textarea className="i" name="description" defaultValue={objective.description ?? ''} rows={2} />

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

            {canDelete && (
              <div className="okr-modal-manage">
                <ConfirmButton
                  className="btn ghost sm danger"
                  label="🗑 Xoá OKR"
                  title="Xoá OKR"
                  message="Xoá OKR này cùng toàn bộ KR, check-in, việc thực thi và bình luận bên trong? Hành động không thể hoàn tác."
                  confirmLabel="Xoá hẳn"
                  onConfirm={doDelete}
                  disabled={pending}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
