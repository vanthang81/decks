import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUser } from '@/lib/users';
import { isExec } from '@/lib/rbac';
import { query } from '@/lib/db';
import { nextInitCode } from '@/lib/codes';

export const dynamic = 'force-dynamic';

// Backfill MÃ cho công việc đang trống code (CFO 09/09): sinh theo nguyên tắc
// <parent>.H<kk> (OKR→Dự án→Cuộc họp) hoặc <PREFIX>-H<kk> (việc rời theo đơn vị).
// Idempotent — chỉ đụng dòng code IS NULL. Gác: header x-sync-key = SYNC_KEY HOẶC phiên exec/admin.
async function run(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  const viaKey = !!key && req.headers.get('x-sync-key') === key;
  if (!viaKey) {
    const s = await auth();
    const email = s?.user?.email;
    const u = email ? await getUser(email) : null;
    if (!u || !isExec(u.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rows = await query<{ id: string; objective_id: string | null; project_id: string | null; meeting_id: string | null; unit_id: string | null }>(
    `SELECT id, objective_id, project_id, meeting_id, unit_id
       FROM okr_initiatives WHERE code IS NULL
      ORDER BY created_at NULLS FIRST, id`,
  );
  let done = 0;
  for (const r of rows) {
    const code = await nextInitCode({ objectiveId: r.objective_id, projectId: r.project_id, meetingId: r.meeting_id, unitId: r.unit_id });
    await query('UPDATE okr_initiatives SET code=$2, updated_at=now() WHERE id=$1 AND code IS NULL', [r.id, code]);
    done++;
  }
  return NextResponse.json({ ok: true, total: rows.length, done });
}

export async function POST(req: NextRequest) { return run(req); }
export async function GET(req: NextRequest) { return run(req); }
