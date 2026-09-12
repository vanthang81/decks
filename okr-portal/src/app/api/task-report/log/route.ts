import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { loadAccess, hasCap } from '@/lib/access';
import { listUnits, manageScope } from '@/lib/org';
import { query, queryOne } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Nhật ký thay đổi 1 công việc (evidence) cho popup Báo cáo thực hiện. Gác: đăng nhập + quyền xem
// (scope.all, hoặc chủ việc/đơn vị trong phạm vi quản lý). Trả các dòng okr_task_events + audit status.
export async function GET(req: NextRequest) {
  const s = await auth();
  const me = s?.user?.email ? await getUser(s.user.email) : null;
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const taskId = req.nextUrl.searchParams.get('taskId') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 });

  const t = await queryOne<{ owner_email: string | null; owner_unit: string | null; title: string; code: string | null }>(
    `SELECT lower(i.owner_email) AS owner_email, u.unit_id AS owner_unit, i.title, i.code
       FROM okr_initiatives i LEFT JOIN okr_users u ON u.email = i.owner_email WHERE i.id=$1`,
    [taskId],
  );
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const access = await loadAccess();
  let ok = hasCap(me, 'scope.all', access);
  if (!ok && t.owner_email === me.email.toLowerCase()) ok = true;
  if (!ok) {
    const scope = manageScope(me, await listUnits());
    if (scope === null) ok = true; // exec
    else if (t.owner_unit && scope.has(t.owner_unit)) ok = true;
  }
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const events = await query<{ actor_name: string | null; actor_email: string | null; kind: string; summary: string; created_at: string }>(
    `SELECT actor_name, actor_email, kind, summary, created_at::text
       FROM okr_task_events WHERE task_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [taskId],
  );
  return NextResponse.json({ ok: true, title: t.title, code: t.code, events });
}
