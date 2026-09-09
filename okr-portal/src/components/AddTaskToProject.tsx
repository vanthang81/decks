'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SearchSelect from '@/components/SearchSelect';
import { personSelectOptions } from '@/lib/person-options';
import { useToast } from '@/components/ToastProvider';
import { unitTreeOptions } from '@/lib/unit-options';

type Kr = { id: string; code: string | null; title: string };
export type ObjOpt = { id: string; code: string | null; title: string; unit_name: string | null; krs: Kr[] };
type PersonOpt = { email: string; name: string; title?: string | null };
type UnitOpt = { id: string; name: string; type: 'company' | 'division' | 'department' };

type Prio = 'low' | 'medium' | 'high';
type BulkRow = { key: number; title: string; expected_output: string; owner_email: string; priority: Prio; due_on: string };
let ROW_SEQ = 1;
const emptyRow = (): BulkRow => ({ key: ROW_SEQ++, title: '', expected_output: '', owner_email: '', priority: 'medium', due_on: '' });

// Thêm việc VÀO DỰ ÁN: chọn Objective (+ KR) của bộ phận → việc hiện cả ở action plan
// của bộ phận đó (đúng O/KR đã chọn) VÀ trong dự án này.
// 2 chế độ: "Một việc" (form đầy đủ) · "Nhiều việc" (nhập loạt, OKR/KR dùng chung).
export default function AddTaskToProject({
  projectId,
  objectives,
  users,
  units,
  create,
  createMany,
  memberEmails,
}: {
  projectId: string;
  objectives: ObjOpt[];
  users: PersonOpt[];
  units: UnitOpt[];
  create: (fd: FormData) => Promise<void>;
  createMany?: (fd: FormData) => Promise<void>;  // tạo nhiều việc 1 lần
  memberEmails?: string[];  // thành viên dự án — xếp trước ở droplist "Giao cho"
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'one' | 'many'>('one');
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [objId, setObjId] = useState('');
  const [bulkKr, setBulkKr] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const ownerOptions = useMemo(() => personSelectOptions(users, memberEmails), [users, memberEmails]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const krs = useMemo(() => objectives.find((o) => o.id === objId)?.krs ?? [], [objId, objectives]);

  const reset = () => {
    setObjId(''); setBulkKr(''); setRows([emptyRow(), emptyRow(), emptyRow()]); setErr(null);
  };
  const close = () => { setOpen(false); reset(); setMode('one'); };

  // ----- Chế độ 1 việc -----
  const submitOne = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('project_id', projectId);
    fd.set('kind', 'action');
    setErr(null);
    startTransition(async () => {
      try {
        await create(fd);
        toast('Đã thêm công việc', 'success');
        setOpen(false);
        reset();
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  // ----- Chế độ nhiều việc -----
  const setRow = (key: number, patch: Partial<BulkRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, emptyRow()]);
  const removeRow = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  // Dán nhiều dòng vào ô tên → tách thành nhiều việc (mỗi dòng 1 việc).
  const onTitlePaste = (key: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return; // 1 dòng → dán bình thường
    e.preventDefault();
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.key === key);
      if (idx < 0) return rs;
      const first = { ...rs[idx], title: lines[0] };
      const extra = lines.slice(1).map((t) => ({ ...emptyRow(), title: t }));
      return [...rs.slice(0, idx), first, ...extra, ...rs.slice(idx + 1)];
    });
  };

  const filledCount = rows.filter((r) => r.title.trim()).length;

  const submitMany = () => {
    if (!createMany) return;
    const clean = rows
      .map((r) => ({ title: r.title.trim(), expected_output: r.expected_output.trim(), owner_email: r.owner_email, priority: r.priority, due_on: r.due_on }))
      .filter((r) => r.title);
    if (clean.length === 0) { setErr('Chưa nhập việc nào (cần ít nhất 1 tên việc).'); return; }
    const fd = new FormData();
    fd.set('project_id', projectId);
    fd.set('objective_id', objId);
    fd.set('key_result_id', objId ? bulkKr : '');
    fd.set('rows', JSON.stringify(clean));
    setErr(null);
    startTransition(async () => {
      try {
        await createMany(fd);
        toast(`Đã thêm ${clean.length} công việc`, 'success');
        setOpen(false);
        reset();
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : String(e2));
      }
    });
  };

  // Enter ở ô tên (chế độ nhiều việc) → thêm dòng mới nhanh.
  const onTitleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (i === rows.length - 1) addRow();
    }
  };

  // Khối chọn OKR + KR dùng chung (cả 2 chế độ share state objId).
  const sharedOkr = (
    <>
      <label className="f">Gắn vào OKR của bộ phận (tuỳ chọn)</label>
      <SearchSelect
        name={mode === 'one' ? 'objective_id' : undefined}
        value={objId}
        onChange={(v) => { setObjId(v); setBulkKr(''); }}
        emptyLabel="— Không gắn (chỉ thuộc dự án) —"
        placeholder="— Không gắn (chỉ thuộc dự án) —"
        options={objectives.map((o) => ({
          value: o.id,
          label: `${o.code ? o.code + ' · ' : ''}${o.unit_name ? `[${o.unit_name}] ` : ''}${o.title}`,
        }))}
      />
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        Không cần gắn OKR — việc thuộc dự án là đủ. OKR của dự án khai ở mục “OKR liên quan”.
        {mode === 'many' ? ' OKR/KR chọn ở đây áp cho TẤT CẢ việc trong danh sách.' : ' Nếu muốn việc hiện thêm ở “Dự án & Kế hoạch hành động” của một OKR bộ phận thì chọn OKR ở đây.'}
      </p>
      <label className="f">Gắn vào Key Result (tuỳ chọn)</label>
      <SearchSelect
        key={objId}
        name={mode === 'one' ? 'key_result_id' : undefined}
        value={mode === 'many' ? bulkKr : undefined}
        onChange={mode === 'many' ? setBulkKr : undefined}
        defaultValue=""
        emptyLabel="— Gắn ở cấp Objective —"
        disabled={!objId}
        options={krs.map((k) => ({ value: k.id, label: `${k.code ? k.code + ' · ' : ''}${k.title}` }))}
      />
    </>
  );

  return (
    <>
      <button type="button" className="btn sm" onClick={() => setOpen(true)}>
        ＋ Thêm việc vào dự án
      </button>

      {open && (
        <div className="okr-modal-backdrop" onMouseDown={close}>
          <div className={`okr-modal${mode === 'many' ? ' okr-modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Thêm việc vào dự án</b>
              <button type="button" className="okr-modal-x" onClick={close} aria-label="Đóng">✕</button>
            </div>

            {/* Công tắc chế độ */}
            {createMany && (
              <div className="seg" role="tablist" aria-label="Chế độ thêm việc">
                <button type="button" role="tab" aria-selected={mode === 'one'}
                  className={`seg-btn${mode === 'one' ? ' on' : ''}`} onClick={() => { setMode('one'); setErr(null); }}>
                  Một việc
                </button>
                <button type="button" role="tab" aria-selected={mode === 'many'}
                  className={`seg-btn${mode === 'many' ? ' on' : ''}`} onClick={() => { setMode('many'); setErr(null); }}>
                  Nhiều việc
                </button>
              </div>
            )}

            {mode === 'one' ? (
              <form onSubmit={submitOne}>
                {sharedOkr}

                <label className="f">Tên việc</label>
                <input className="i" name="title" required placeholder="VD: Tích hợp API thanh toán" />

                <label className="f">Kết quả đầu ra <span className="muted" style={{ fontWeight: 400 }}>— tiêu chí hoàn thành (tuỳ chọn)</span></label>
                <textarea className="i" name="expected_output" rows={2} placeholder="Xong là ra cái gì? VD: API thanh toán chạy thật, đối soát khớp" />

                <div className="row">
                  <div>
                    <label className="f">Giao cho (cá nhân)</label>
                    <SearchSelect name="owner_email" defaultValue="" emptyLabel="— Chưa giao —" options={ownerOptions} />
                  </div>
                  <div>
                    <label className="f">Đơn vị phụ trách (Khối / Phòng)</label>
                    <SearchSelect name="unit_id" defaultValue="" emptyLabel="— Không gắn —" options={unitTreeOptions(units, { excludeCompany: true })} />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label className="f">Ưu tiên</label>
                    <select className="i" name="priority" defaultValue="medium">
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="f">Hạn</label>
                    <input className="i" type="date" name="due_on" />
                  </div>
                </div>

                {err && <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' }}>❌ {err}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn" type="submit" disabled={pending}>{pending ? 'Đang thêm…' : 'Thêm việc'}</button>
                  <button className="btn ghost" type="button" onClick={close} disabled={pending}>Huỷ</button>
                </div>
              </form>
            ) : (
              <div>
                {sharedOkr}

                <label className="f" style={{ marginTop: 10 }}>Danh sách việc</label>
                <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
                  Mỗi dòng là một việc. Gõ <b>Enter</b> ở ô tên để thêm dòng, hoặc <b>dán nhiều dòng</b> vào ô tên để tách tự động.
                </p>

                <div className="bulk-rows">
                  {rows.map((r, i) => (
                    <div className="bulk-row" key={r.key}>
                      <div className="bulk-row-top">
                        <span className="bulk-idx">{i + 1}</span>
                        <input
                          className="i"
                          value={r.title}
                          placeholder="Tên việc…"
                          onChange={(e) => setRow(r.key, { title: e.target.value })}
                          onKeyDown={(e) => onTitleKey(i, e)}
                          onPaste={(e) => onTitlePaste(r.key, e)}
                        />
                        <button type="button" className="icon-btn bulk-del" title="Xoá dòng" aria-label="Xoá dòng"
                          onClick={() => removeRow(r.key)} disabled={rows.length <= 1}>✕</button>
                      </div>
                      <input
                        className="i bulk-eo"
                        value={r.expected_output}
                        placeholder="Kết quả đầu ra (tuỳ chọn) — xong là ra cái gì?"
                        onChange={(e) => setRow(r.key, { expected_output: e.target.value })}
                      />
                      <div className="bulk-row-sub">
                        <SearchSelect value={r.owner_email} onChange={(v) => setRow(r.key, { owner_email: v })}
                          emptyLabel="— Chưa giao —" placeholder="— Giao cho —" options={ownerOptions} />
                        <select className="i" value={r.priority} onChange={(e) => setRow(r.key, { priority: e.target.value as Prio })}>
                          <option value="low">Ưu tiên: Thấp</option>
                          <option value="medium">Ưu tiên: Trung bình</option>
                          <option value="high">Ưu tiên: Cao</option>
                        </select>
                        <input className="i" type="date" value={r.due_on} title="Hạn"
                          onChange={(e) => setRow(r.key, { due_on: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={addRow}>＋ Thêm dòng</button>

                {err && <div className="gnote" style={{ background: '#fee2e2', borderColor: '#dc2626', color: '#991b1b', marginTop: 10 }}>❌ {err}</div>}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                  <button className="btn" type="button" onClick={submitMany} disabled={pending || filledCount === 0}>
                    {pending ? 'Đang thêm…' : `Thêm ${filledCount || ''} việc`.trim()}
                  </button>
                  <button className="btn ghost" type="button" onClick={close} disabled={pending}>Huỷ</button>
                  <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{filledCount} việc sẽ được tạo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
