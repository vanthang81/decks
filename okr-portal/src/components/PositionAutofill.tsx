'use client';

// Ô "Vị trí (chức danh)" điền nhanh: chọn 1 Vị trí (preset) → tự set Vai trò (cấp quyền) + Nhóm quyền
// + gợi ý Chức danh trong CÙNG form (theo name field). Chỉ là tiện ích điền nhanh — admin vẫn chỉnh tay được.
export type PositionOpt = { key: string; label: string; base_role: string; perm_group: string };

export default function PositionAutofill({ positions, className = 'i' }: { positions: PositionOpt[]; className?: string }) {
  if (!positions.length) return null;
  const onPick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = positions.find((x) => x.key === e.target.value);
    const form = e.target.closest('form');
    if (!p || !form) return;
    const set = (name: string, val: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
      if (el && !el.disabled) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    set('role', p.base_role);
    set('perm_group', p.perm_group ?? '');
    // Gợi ý Chức danh = tên Vị trí nếu ô đang trống (không đè nếu người dùng đã nhập).
    const t = form.querySelector<HTMLInputElement>('[name="title"]');
    if (t && !t.value.trim()) { t.value = p.label; t.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  return (
    <select className={className} defaultValue="" onChange={onPick} aria-label="Chọn nhanh theo Vị trí">
      <option value="">— Chọn nhanh theo Vị trí (tuỳ chọn) —</option>
      {positions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
    </select>
  );
}
