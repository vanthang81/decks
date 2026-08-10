'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NewObjectiveForm from '@/components/NewObjectiveForm';
import type { ObjectiveFormProps } from '@/lib/objective-form';

// Nút "+ Tạo OKR" ở trang /objectives → mở POPUP chứa NewObjectiveForm (inline),
// lưu xong tự đóng cửa sổ + refresh danh sách tại chỗ (không rời trang).
export default function NewObjectiveModal({
  formProps,
  create,
  label = '+ Tạo OKR',
  triggerClass = 'btn',
}: {
  formProps: ObjectiveFormProps;
  create: (fd: FormData) => Promise<void>;
  label?: string;
  triggerClass?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="okr-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="okr-modal okr-modal-wide" onMouseDown={(e) => e.stopPropagation()}>
            <div className="okr-modal-head">
              <b>Tạo OKR mới</b>
              <button type="button" className="okr-modal-x" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <NewObjectiveForm
              {...formProps}
              create={create}
              inline
              onSuccess={() => { setOpen(false); router.refresh(); }}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
