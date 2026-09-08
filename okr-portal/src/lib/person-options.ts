import type { SSOption } from '@/components/SearchSelect';

type PersonLike = { email: string; name: string; title?: string | null };

// Dựng option cho droplist "Giao cho (cá nhân)".
// - Không truyền `priorityEmails` → danh sách phẳng (như cũ).
// - Có `priorityEmails` (vd thành viên dự án) → xếp những người đó LÊN TRƯỚC
//   (nhóm "Thành viên dự án"), phần còn lại nhóm "Thành viên khác".
// Giữ nguyên thứ tự caller đưa vào trong mỗi nhóm.
export function personSelectOptions(
  users: PersonLike[],
  priorityEmails?: Iterable<string> | null,
): SSOption[] {
  const flat = (u: PersonLike): SSOption => ({ value: u.email, label: u.name, sub: u.title ?? undefined });
  if (!priorityEmails) return users.map(flat);
  const set = new Set<string>();
  for (const e of priorityEmails) if (e) set.add(e.toLowerCase());
  if (set.size === 0) return users.map(flat);

  const members: SSOption[] = [];
  const others: SSOption[] = [];
  for (const u of users) {
    if (set.has(u.email.toLowerCase())) members.push({ ...flat(u), group: 'Thành viên dự án' });
    else others.push({ ...flat(u), group: 'Thành viên khác' });
  }
  // Không ai trong danh sách khớp thành viên → giữ phẳng, khỏi hiện tiêu đề nhóm trống.
  if (members.length === 0) return users.map(flat);
  return [...members, ...others];
}
