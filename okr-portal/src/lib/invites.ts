import { query, queryOne } from './db';
import { getUser, upsertUser, listUsers, type OkrUser } from './users';
import { loadAccess, hasCap } from './access';
import type { Role } from './rbac';

// LỜI MỜI NGƯỜI DÙNG (invite-by-email) — bất kỳ ai cũng ĐỀ XUẤT thêm 1 email chưa có trong hệ
// thống; người có quyền 'user.approve' DUYỆT thì mới tạo user thật (active). Xem docs CFO 11/08.

export type InviteStatus = 'pending' | 'approved' | 'rejected';

export type Invite = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  unit_id: string | null;
  unit_name: string | null;
  note: string | null;
  invited_by: string;
  invited_by_name: string | null;
  status: InviteStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

const SELECT = `
  SELECT iv.id, iv.email, iv.display_name, iv.role, iv.unit_id, un.name AS unit_name,
         iv.note, iv.invited_by, ib.display_name AS invited_by_name,
         iv.status, iv.decided_by, iv.decided_at::text AS decided_at, iv.created_at::text AS created_at
    FROM okr_user_invites iv
    LEFT JOIN okr_units un ON un.id = iv.unit_id
    LEFT JOIN okr_users ib ON ib.email = iv.invited_by`;

export type CreateInviteResult = { status: 'created' | 'exists_user' | 'exists_pending'; id?: string };

/** Tạo lời mời PENDING. Nếu email đã là user → 'exists_user'; đã có lời mời chờ → 'exists_pending'. */
export async function createInvite(input: {
  email: string; display_name?: string | null; role?: string; unit_id?: string | null;
  note?: string | null; invitedBy: string;
}): Promise<CreateInviteResult> {
  const email = input.email.trim().toLowerCase();
  if ((await getUser(email))) return { status: 'exists_user' };
  const row = await queryOne<{ id: string }>(
    `INSERT INTO okr_user_invites (email, display_name, role, unit_id, note, invited_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (lower(email)) WHERE status='pending' DO NOTHING
     RETURNING id`,
    [email, input.display_name ?? null, input.role ?? 'staff', input.unit_id ?? null,
     input.note ?? null, input.invitedBy.toLowerCase()],
  );
  if (!row) return { status: 'exists_pending' };
  return { status: 'created', id: row.id };
}

export async function getInvite(id: string): Promise<Invite | null> {
  return queryOne<Invite>(`${SELECT} WHERE iv.id=$1`, [id]);
}

export async function listInvites(status: InviteStatus = 'pending'): Promise<Invite[]> {
  return query<Invite>(`${SELECT} WHERE iv.status=$1 ORDER BY iv.created_at DESC`, [status]);
}

export async function countPendingInvites(): Promise<number> {
  const r = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM okr_user_invites WHERE status='pending'",
  );
  return r?.n ?? 0;
}

/** DUYỆT / TỪ CHỐI lời mời. Duyệt → tạo user (active). Trả lại lời mời + đã tạo user hay chưa. */
export async function decideInvite(
  id: string, approve: boolean, deciderEmail: string,
): Promise<{ invite: Invite; createdUser: boolean } | null> {
  const iv = await getInvite(id);
  if (!iv || iv.status !== 'pending') return null;
  let createdUser = false;
  if (approve) {
    await upsertUser({
      email: iv.email,
      display_name: iv.display_name,
      title: null,
      role: (iv.role as Role) || 'staff',
      unit_id: iv.unit_id,
      perm_group: null,
    });
    createdUser = true;
  }
  await query(
    "UPDATE okr_user_invites SET status=$2, decided_by=$3, decided_at=now() WHERE id=$1",
    [id, approve ? 'approved' : 'rejected', deciderEmail.toLowerCase()],
  );
  return { invite: { ...iv, status: approve ? 'approved' : 'rejected' }, createdUser };
}

/** Email các user ĐANG hoạt động có quyền 'user.approve' (để gửi thông báo duyệt). */
export async function listApproverEmails(): Promise<string[]> {
  const [users, access] = await Promise.all([listUsers(), loadAccess()]);
  return users
    .filter((u) => u.is_active && hasCap(u as OkrUser, 'user.approve', access))
    .map((u) => u.email);
}
