'use client';

import EditModal from '@/components/EditModal';
import SearchSelect from '@/components/SearchSelect';
import NumberInput from '@/components/NumberInput';
import { unitTreeOptions } from '@/lib/unit-options';
import type { PersonOpt, UnitOpt, ProjectOpt } from '@/components/ExecutionTabs';

export type ObjOptLite = { id: string; label: string };

// Nút "+ Tạo công việc" ở trang Công việc (/tasks) — mở popup form tạo 1 việc lẻ.
// Chỉ render khi người dùng có quyền (gác ở trang gọi: quản lý, không phải nhân viên).
export default function NewTaskModal({
  users,
  units,
  projects,
  objectives,
  action,
}: {
  users: PersonOpt[];
  units: UnitOpt[];
  projects: ProjectOpt[];
  objectives: ObjOptLite[];
  action: (fd: FormData) => Promise<void>;
}) {
  return (
    <EditModal
      title="Tạo công việc mới"
      label="+ Tạo công việc"
      submitLabel="Tạo công việc"
      action={action}
      triggerClass="btn"
      wide
    >
      <label className="f">Tên công việc</label>
      <input className="i" name="title" required placeholder="Ví dụ: Chuẩn hoá quy trình mở cửa hàng mới" />

      <label className="f">Mô tả</label>
      <textarea className="i" name="description" rows={2} placeholder="Nội dung cần làm (tuỳ chọn)" />

      <div className="row">
        <div>
          <label className="f">Giao cho</label>
          <SearchSelect name="owner_email" emptyLabel="— Chưa giao —"
            options={users.map((u) => ({ value: u.email, label: u.name }))} />
        </div>
        <div>
          <label className="f">Đơn vị phụ trách</label>
          <SearchSelect name="unit_id" emptyLabel="— Không gắn —"
            options={unitTreeOptions(units, { excludeCompany: true })} />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Trạng thái</label>
          <select className="i" name="status" defaultValue="todo">
            <option value="todo">Chưa làm</option>
            <option value="in_progress">Đang làm</option>
            <option value="blocked">Vướng</option>
            <option value="done">Xong</option>
          </select>
        </div>
        <div>
          <label className="f">Ưu tiên</label>
          <select className="i" name="priority" defaultValue="medium">
            <option value="high">Cao</option>
            <option value="medium">Trung bình</option>
            <option value="low">Thấp</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Bắt đầu</label>
          <input className="i" type="date" name="start_on" />
        </div>
        <div>
          <label className="f">Hạn</label>
          <input className="i" type="date" name="due_on" />
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Thuộc OKR <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
          <SearchSelect name="objective_id" emptyLabel="— Không gắn OKR —"
            options={objectives.map((o) => ({ value: o.id, label: o.label }))} />
        </div>
        <div>
          <label className="f">Thuộc dự án <span className="muted" style={{ fontWeight: 400 }}>— tuỳ chọn</span></label>
          <SearchSelect name="project_id" emptyLabel="— Không gắn dự án —"
            options={projects.map((p) => ({ value: p.id, label: `${p.code ? p.code + ' · ' : ''}${p.name}` }))} />
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

      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        Việc có thể đứng độc lập, hoặc gắn vào một OKR / dự án bạn quản để tiến độ tự cuộn lên.
      </p>
    </EditModal>
  );
}
