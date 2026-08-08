import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import NewObjectiveForm from '@/components/NewObjectiveForm';
import { requireUser } from '@/lib/current-user';
import { listUnits, manageScope } from '@/lib/org';
import { listUsers } from '@/lib/users';
import { isExec } from '@/lib/rbac';
import { loadAccess, hasCap, canCreateObjective } from '@/lib/access';
import { getCurrentPeriod, getPeriod, listPeriods } from '@/lib/periods';
import {
  listObjectivesByPeriod, LEVEL_LABEL, OKR_TYPE_LABEL, OKR_TYPE_EXPECT,
  BSC_PERSPECTIVES, BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON, type Level,
} from '@/lib/okr';
import { listStrategicPillars } from '@/lib/strategy';
import { createObjectiveAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewObjectivePage({ searchParams }: { searchParams: { period?: string; parent?: string } }) {
  const user = await requireUser();
  if (user.role === 'staff') redirect('/objectives'); // Nhân viên = chỉ xem, không tạo OKR
  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;

  const [units, users, access] = await Promise.all([listUnits(), listUsers(), loadAccess()]);
  const [objectives, pillars] = period
    ? await Promise.all([listObjectivesByPeriod(period.id), listStrategicPillars()])
    : [[], []];

  // Đơn vị trong phạm vi tạo được (OKR admin/exec = tất cả; lead = subtree của mình).
  const canAllScope = hasCap(user, 'scope.all', access) || isExec(user.role);
  const scope = manageScope(user, units);
  const allowedUnits = canAllScope || scope === null ? units : units.filter((u) => scope.has(u.id));

  // Cấp OKR được phép tạo (ẩn cấp ngoài quyền).
  const canComp = canCreateObjective(user, 'company', null, units, access);
  const canDiv = allowedUnits.some((u) => u.type === 'division' && canCreateObjective(user, 'division', u.id, units, access));
  const canDept = allowedUnits.some((u) => u.type === 'department' && canCreateObjective(user, 'department', u.id, units, access));
  const allowedLevels = ([canComp && 'company', canDiv && 'division', canDept && 'department', 'individual'].filter(Boolean)) as Level[];
  const defaultLevel: Level = allowedLevels.includes('department') ? 'department' : allowedLevels[0];

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <div className="pagetitle">Tạo OKR mới</div>
        <p className="subtitle">{period ? `Kỳ: ${period.name}` : 'Chưa có kỳ OKR — vào Quản trị tạo kỳ trước.'}</p>

        {!period ? (
          <div className="card"><Link href="/admin/periods">Tạo kỳ OKR</Link></div>
        ) : (
          <div className="card" style={{ maxWidth: 680 }}>
            <NewObjectiveForm
              periodId={period.id}
              currentEmail={user.email}
              allowedLevels={allowedLevels}
              defaultLevel={defaultLevel}
              levelLabels={LEVEL_LABEL}
              units={allowedUnits.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }))}
              users={users.map((u) => ({ email: u.email, name: u.display_name || u.email, role: u.role, unit_id: u.unit_id, unit_name: u.unit_name }))}
              periodObjectives={objectives.map((o) => ({ id: o.id, code: o.code, title: o.title, level: o.level, bsc: o.bsc_perspective }))}
              pillars={pillars.map((p) => ({ id: p.id, code: p.code, title: p.title, bsc: p.bsc_perspective }))}
              bscOptions={BSC_PERSPECTIVES.map((b) => ({ value: b, label: BSC_PERSPECTIVE_LABEL[b], icon: BSC_PERSPECTIVE_ICON[b] }))}
              okrTypeOptions={(['committed', 'aspirational', 'learning'] as const).map((t) => ({ value: t, label: OKR_TYPE_LABEL[t], expect: OKR_TYPE_EXPECT[t] }))}
              create={createObjectiveAction}
            />
          </div>
        )}
      </div>
    </>
  );
}
