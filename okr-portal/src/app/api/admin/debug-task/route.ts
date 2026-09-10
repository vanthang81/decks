import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createInitiative } from '@/lib/initiatives';

export const dynamic = 'force-dynamic';

// TẠM: tái hiện tạo việc thuộc dự án PRJ-14 để bắt lỗi thực. Gác x-sync-key. Tự xoá việc debug.
async function run(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  if (!key || req.headers.get('x-sync-key') !== key) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const proj = await queryOne<{ id: string }>(`SELECT id FROM okr_projects WHERE code='PRJ-14'`);
    const owner = await queryOne<{ email: string }>(`SELECT email FROM okr_users WHERE unit_id IS NOT NULL LIMIT 1`);
    if (!proj) return NextResponse.json({ ok: false, where: 'no-project' });
    const id = await createInitiative({
      objective_id: null, key_result_id: null, parent_id: null, kind: 'action',
      title: '__DEBUG_DELETE_ME__', description: null, owner_email: owner?.email ?? null, unit_id: null,
      project_id: proj.id, status: 'in_progress', priority: 'high', start_on: null, due_on: null,
      budget_planned: 0, budget_actual: 0, budget_source: null, expected_output: null,
      created_by: 'vanthang81@gmail.com',
    });
    await query('DELETE FROM okr_initiatives WHERE id=$1', [id]);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const err = e as { message?: string; stack?: string; code?: string; detail?: string };
    return NextResponse.json({ ok: false, message: String(err?.message ?? e), code: err?.code, detail: err?.detail, stack: String(err?.stack ?? '').slice(0, 1800) });
  }
}
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
