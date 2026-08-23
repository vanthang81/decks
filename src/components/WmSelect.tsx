'use client';

// Chọn watermark tri-state (Kế thừa / Bật / Tắt) — tự submit khi đổi. Nhận server action + các field ẩn.
export default function WmSelect({
  action,
  hidden,
  value,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  value: 'on' | 'off' | 'inherit';
}) {
  return (
    <form action={action} style={{ margin: 0 }}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <select
        name="value"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
        aria-label="Watermark"
      >
        <option value="inherit">Kế thừa</option>
        <option value="on">Bật</option>
        <option value="off">Tắt</option>
      </select>
    </form>
  );
}
