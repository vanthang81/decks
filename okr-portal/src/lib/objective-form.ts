// Gom dữ liệu cho form Tạo OKR (NewObjectiveForm) — DÙNG CHUNG cho trang /objectives/new
// và popup "+ Tạo OKR" ở /objectives. Trả về đúng các prop mà NewObjectiveForm cần (trừ `create`).
import { listUnits, manageScope } from './org';
import { listUsers, personTitle, type OkrUser } from './users';
import { isExec } from './rbac';
import { loadAccess, hasCap, canCreateObjective } from './access';
import {
  listObjectivesByPeriod,
  LEVEL_LABEL,
  OKR_TYPE_LABEL,
  OKR_TYPE_EXPECT,
  BSC_PERSPECTIVES,
  BSC_PERSPECTIVE_LABEL,
  BSC_PERSPECTIVE_ICON,
  type Level,
} from './okr';
import { listStrategicPillars } from './strategy';

export async function buildObjectiveFormProps(user: OkrUser, periodId: string) {
  const [units, users, access] = await Promise.all([listUnits(), listUsers(), loadAccess()]);
  const [objectives, pillars] = await Promise.all([
    listObjectivesByPeriod(periodId),
    listStrategicPillars(),
  ]);

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

  return {
    periodId,
    currentEmail: user.email,
    allowedLevels,
    defaultLevel,
    levelLabels: LEVEL_LABEL,
    units: allowedUnits.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort })),
    users: users.map((u) => ({ email: u.email, name: u.display_name || u.email, role: u.role, unit_id: u.unit_id, unit_name: u.unit_name, title: personTitle(u) })),
    periodObjectives: objectives.map((o) => ({ id: o.id, code: o.code, title: o.title, level: o.level, bsc: o.bsc_perspective })),
    pillars: pillars.map((p) => ({ id: p.id, code: p.code, title: p.title, bsc: p.bsc_perspective })),
    bscOptions: BSC_PERSPECTIVES.map((b) => ({ value: b, label: BSC_PERSPECTIVE_LABEL[b], icon: BSC_PERSPECTIVE_ICON[b] })),
    okrTypeOptions: (['committed', 'aspirational', 'learning'] as const).map((t) => ({ value: t, label: OKR_TYPE_LABEL[t], expect: OKR_TYPE_EXPECT[t] })),
  };
}

export type ObjectiveFormProps = Awaited<ReturnType<typeof buildObjectiveFormProps>>;
