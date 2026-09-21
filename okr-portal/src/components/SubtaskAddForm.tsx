'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import SearchSelect from '@/components/SearchSelect';
import NumberInput from '@/components/NumberInput';
import { unitTreeOptions } from '@/lib/unit-options';
import { personSelectOptions } from '@/lib/person-options';
import { useToast } from '@/components/ToastProvider';
import type { PersonOpt, UnitOpt } from '@/components/ExecutionTabs';

// Form THÊM VIỆC CON đầy đủ trường (như khi tạo Công việc) — CFO/Lieu 20/09:
// trước đây chỉ có Tên việc + Giao cho (không đặt được deadline/kết quả đầu ra…).
// Dùng CHUNG cho TaskEditModal (/tasks) và ExecutionTabs (chi tiết OKR) để không lệch nhau.
// Việc con KẾ THỪA OKR/dự án/cuộc họp từ việc cha (server createSubtaskAction), nên form này
// KHÔNG có ô chọn OKR/dự án — chỉ khai thông tin riêng của việc con.
export default function SubtaskAddForm({
  parentId,
  users,
  units,
  priorityEmails,
  defaultOwner,
  defaultUnitId,
  createSubtask,
  onDone,
  onCancel,
}: {
  parentId: string;
  users: PersonOpt[];
  units: UnitOpt[];
  priorityEmails?: string[];
  defaultOwner?: string | null;   // mặc định = người phụ trách việc cha
  defaultUnitId?: string | null;  // mặc định = đơn vị việc cha (server tự theo người giao nếu để trống)
  createSubtask: (fd: FormData) => Promise<void>;
  onDone: () => void;   // đóng khung thêm (giữ modal mở để thấy việc con vừa tạo)
  onCancel: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('parent_id', parentId);
    const title = String(fd.get('title') ?? '').trim();
    if (!title) { setErr('Nhập tên việc con.'); return; }
    fd.set('title', title);
    setErr('');
    start(async () => {
      try {
        await createSubtask(fd);
        toast('Đã thêm việc con', 'success');
        onDone();
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : 'Không thêm được việc con.');
      }
    });
  };

  return (
    <form className="te-sub-add te-sub-add-form" onSubmit={submit}>
      <label className="f">Tên việc con</label>
      <input className="i" name="title" placeholder="Tên việc con…" required autoFocus />

      <label className="f">Mô tả <span className="muted" style={{ fontWeight: 400 }}>(tuỳ chọn)</span></label>
      <textarea className="i" name="description" rows={2} />

      <label className="f">Kết quả đầu ra <span className="muted" style={{ fontWeight: 400 }}>— tiêu chí hoàn thành (tuỳ chọn)</span></label>
      <textarea className="i" name="expected_output" rows={2}
        placeholder="Xong là ra cái gì? VD: Bảng checklist hoàn chỉnh + dashboard phê duyệt đã bật" />

      <div className="row">
        <div>
          <label className="f">Giao cho</label>
          <SearchSelect name="owner_email" defaultValue={defaultOwner ?? ''} emptyLabel="— Chưa giao —"
            options={personSelectOptions(users, priorityEmails)} />
        </div>
        <div>
          <label className="f">Đơn vị phụ trách <span className="muted" style={{ fontWeight: 400 }}>— tự theo người giao</span></label>
          <SearchSelect name="unit_id" defaultValue={defaultUnitId ?? ''} emptyLabel="— Không gắn —"
            options={unitTreeOptions(units, { excludeCompany: true })} />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Ưu tiên</label>
          <select className="i" name="priority" defaultValue="medium">
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
        </div>
        <div>
          <label className="f">Bắt đầu</label>
          <input className="i" type="date" name="start_on" />
        </div>
        <div>
          <label className="f">Hạn</label>
          <input className="i" type="date" name="due_on" title="Hạn hoàn thành việc con" />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">NS kế hoạch (VND)</label>
          <NumberInput name="budget_planned" />
        </div>
        <div>
          <label className="f">Đã chi (VND)</label>
          <NumberInput name="budget_actual" />
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>Việc con kế thừa OKR / dự án / cuộc họp từ việc cha.</p>
      {err && <div className="te-err">{err}</div>}
      <div className="te-sub-add-act">
        <button type="button" className="btn ghost sm" onClick={onCancel}>Huỷ</button>
        <button type="submit" className="btn sm" disabled={pending}>{pending ? 'Đang thêm…' : 'Thêm việc con'}</button>
      </div>
    </form>
  );
}
