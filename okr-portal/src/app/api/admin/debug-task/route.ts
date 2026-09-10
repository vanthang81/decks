import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createInitiative } from '@/lib/initiatives';
import { getProject, canManageProject } from '@/lib/projects';
import { listUnits } from '@/lib/org';
import { loadAccess } from '@/lib/access';
import { getUser } from '@/lib/users';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// TẠM: tái hiện TỪNG BƯỚC của createTaskAction cho việc thuộc PRJ-14 để bắt lỗi thực. Gác x-sync-key.
async function run(req: NextRequest) {
  const key = process.env.SYNC_KEY;
  if (!key || req.headers.get('x-sync-key') !== key) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const steps: string[] = [];
  try {
    steps.push('getUser');
    const user = await getUser('vanthang81@gmail.com');
    if (!user) return NextResponse.json({ ok: false, steps, where: 'no-user' });
    steps.push('listUnits+loadAccess');
    const [units, access] = await Promise.all([listUnits(), loadAccess()]);
    steps.push('getProject');
    const projRow = await queryOne<{ id: string }>(`SELECT id FROM okr_projects WHERE code='PRJ-14'`);
    if (!projRow) return NextResponse.json({ ok: false, steps, where: 'no-project' });
    const pr = await getProject(projRow.id);
    steps.push('canManageProject');
    const canMng = pr ? canManageProject(user, pr, units, access) : false;
    steps.push(`canManageProject=${canMng}`);
    const owner = await queryOne<{ email: string }>(`SELECT owner_email AS email FROM okr_initiatives WHERE project_id=$1 AND owner_email IS NOT NULL LIMIT 1`, [projRow.id]);
    steps.push(`owner=${owner?.email ?? 'null'}`);
    steps.push('createInitiative');
    const id = await createInitiative({
      objective_id: null, key_result_id: null, parent_id: null, kind: 'action',
      title: '__DEBUG_DELETE_ME__', description: null, owner_email: owner?.email ?? null, unit_id: null,
      project_id: projRow.id, status: 'in_progress', priority: 'high', start_on: '2026-09-08', due_on: '2026-09-10',
      budget_planned: 0, budget_actual: 0, budget_source: null, expected_output: null, created_by: user.email,
    });
    steps.push('auditTask');
    await logAudit({ actor: user.email, action: 'initiative.create', entity: 'project', entityId: projRow.id, detail: { title: '__DEBUG__' } });
    steps.push('cleanup');
    await query('DELETE FROM okr_initiatives WHERE id=$1', [id]);
    return NextResponse.json({ ok: true, id, steps });
  } catch (e) {
    const err = e as { message?: string; stack?: string; code?: string; detail?: string };
    return NextResponse.json({ ok: false, steps, message: String(err?.message ?? e), code: err?.code, detail: err?.detail, stack: String(err?.stack ?? '').slice(0, 1800) });
  }
}
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
