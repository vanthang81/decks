'use client';

import { useState, useRef, type ReactNode } from 'react';

/**
 * Nút xoá/nguy hiểm có POPUP xác nhận (tránh xoá nhầm — CFO 01/08).
 * 2 chế độ:
 *  - Trong <form> server-action: KHÔNG truyền onConfirm → khi xác nhận sẽ
 *    requestSubmit() form cha (kích hoạt server action).
 *  - Client thuần: truyền onConfirm → gọi callback khi xác nhận.
 */
export default function ConfirmButton({
  label,
  message,
  title = 'Xác nhận',
  confirmLabel = 'Xoá hẳn',
  cancelLabel = 'Huỷ',
  className = 'linkbtn danger',
  onConfirm,
  disabled = false,
}: {
  label: ReactNode;
  message: ReactNode;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  onConfirm?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function doConfirm() {
    setOpen(false);
    if (onConfirm) onConfirm();
    else btnRef.current?.closest('form')?.requestSubmit();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </button>
      {open && (
        <div className="cf-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="cf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cf-title">{title}</div>
            <div className="cf-msg">{message}</div>
            <div className="cf-actions">
              <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
                {cancelLabel}
              </button>
              <button type="button" className="btn sm cf-danger" onClick={doConfirm} autoFocus>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
