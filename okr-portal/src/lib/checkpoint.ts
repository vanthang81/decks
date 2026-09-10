// CHECKPOINT AUDIT định kỳ (CFO 10/09) — "tự phát hiện → tự sửa cái sửa được → tự QC lại →
// chỉ báo khi còn thứ cần người" (giống triết lý watchdog của price-engine).
//   • AUTO-FIX (idempotent, an toàn): điền Đơn vị việc theo phòng người phụ trách + sinh Mã việc còn trống.
//   • AUTO-QC (chỉ đọc): đếm các bất thường dữ liệu (mã trùng/trống, việc thiếu đơn vị, user thiếu phòng…).
//   • Hạ tầng (smoke domain / container / lệch deploy) do cron n8n đo rồi truyền vào (route gộp lại).
// Chỉ khi CÒN vấn đề sau khi tự sửa → gửi email CFO + ghi nhật ký. Tự khỏi thì im lặng.
import { query } from './db';
import { nextInitCode } from './codes';
import { getSetting } from './settings';
import { sendMail, mailBaseUrl } from './mail';
import { logAudit } from './audit';

export type CheckSeverity = 'warn' | 'high';
export type CheckIssue = { key: string; label: string; count: number; severity: CheckSeverity; hint?: string };

/** Kết quả hạ tầng do cron n8n đo (SSH) rồi truyền vào route. */
export type InfraInput = {
  smoke?: Record<string, number>; // domain → HTTP code (/login)
  containers?: { name: string; up: boolean }[];
  headLocal?: string;
  headRemote?: string;
};

export type CheckpointReport = {
  ranAt: string;
  dryRun: boolean;
  fixed: { taskUnit: number; taskCode: number };
  stats: Record<string, number>;
  issues: CheckIssue[];
  ok: boolean;
  notified?: { sent: number; recipients: string[] } | null;
};

const num = async (sql: string, params: unknown[] = []): Promise<number> =>
  Number((await query<{ n: string }>(sql, params))[0]?.n ?? 0);

/** Người nhận cảnh báo checkpoint = cấu hình `checkpoint_alert_emails` (danh sách phẩy), nếu trống thì
 * mặc định = mọi tài khoản ĐIỀU HÀNH đang hoạt động (exec/ceo/cfo). Cảnh báo hệ thống nên KHÔNG lệ
 * thuộc cờ notify_email cá nhân. */
async function alertRecipients(): Promise<{ email: string; name: string | null }[]> {
  const raw = (await getSetting<string>('checkpoint_alert_emails', '')).trim();
  if (raw) {
    const emails = raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (emails.length) {
      return query<{ email: string; name: string | null }>(
        `SELECT email, display_name AS name FROM okr_users WHERE lower(email) = ANY($1::text[]) ORDER BY email`,
        [emails],
      );
    }
  }
  return query<{ email: string; name: string | null }>(
    `SELECT email, display_name AS name FROM okr_users
      WHERE is_active = true AND role IN ('exec','ceo','cfo') ORDER BY email`,
  );
}

/**
 * Chạy 1 lượt checkpoint. `dryRun` = chỉ QC (không sửa, không gửi mail). `infra` = kết quả hạ tầng từ cron.
 * `notify` = cho phép gửi email khi có vấn đề (mặc định true; UI gọi tay có thể tắt).
 */
export async function runCheckpoint(opts?: {
  dryRun?: boolean;
  infra?: InfraInput;
  notify?: boolean;
}): Promise<CheckpointReport> {
  const dry = !!opts?.dryRun;
  const notify = opts?.notify !== false;

  // ---------- AUTO-FIX (idempotent) ----------
  let fixedUnit = 0;
  let fixedCode = 0;
  if (!dry) {
    // 1) Đơn vị việc = phòng của người phụ trách (đồng bộ db/610 + resolveTaskUnit).
    const uu = await query<{ id: string }>(
      `UPDATE okr_initiatives i SET unit_id = us.unit_id, updated_at = now()
         FROM okr_users us
        WHERE lower(i.owner_email) = lower(us.email)
          AND i.unit_id IS NULL AND us.unit_id IS NOT NULL
        RETURNING i.id`,
    );
    fixedUnit = uu.length;
    // 2) Mã việc còn trống → sinh theo nguyên tắc (OKR→Dự án→Cuộc họp→đơn vị).
    const rows = await query<{
      id: string; objective_id: string | null; project_id: string | null;
      meeting_id: string | null; unit_id: string | null;
    }>(
      `SELECT id, objective_id, project_id, meeting_id, unit_id
         FROM okr_initiatives WHERE code IS NULL ORDER BY created_at NULLS FIRST, id`,
    );
    for (const r of rows) {
      const code = await nextInitCode({
        objectiveId: r.objective_id, projectId: r.project_id, meetingId: r.meeting_id, unitId: r.unit_id,
      });
      await query('UPDATE okr_initiatives SET code=$2, updated_at=now() WHERE id=$1 AND code IS NULL', [r.id, code]);
      fixedCode++;
    }
  }

  // ---------- AUTO-QC (chỉ đọc) ----------
  const nullTaskCode = await num(`SELECT count(*) n FROM okr_initiatives WHERE code IS NULL`);
  const nullUnitOwner = await num(
    `SELECT count(*) n FROM okr_initiatives i JOIN okr_users u ON lower(u.email)=lower(i.owner_email)
      WHERE i.unit_id IS NULL AND u.unit_id IS NOT NULL`,
  );
  const dupTaskCode = await num(
    `SELECT count(*) n FROM (SELECT code FROM okr_initiatives WHERE code IS NOT NULL GROUP BY code HAVING count(*)>1) t`,
  );
  const dupObjCode = await num(
    `SELECT count(*) n FROM (SELECT code FROM okr_objectives WHERE code IS NOT NULL GROUP BY code HAVING count(*)>1) t`,
  );
  const dupProjCode = await num(
    `SELECT count(*) n FROM (SELECT code FROM okr_projects WHERE code IS NOT NULL GROUP BY code HAVING count(*)>1) t`,
  );
  const objNullCode = await num(`SELECT count(*) n FROM okr_objectives WHERE code IS NULL`);
  const projNullCode = await num(`SELECT count(*) n FROM okr_projects WHERE code IS NULL`);
  const activeUserNoUnit = await num(`SELECT count(*) n FROM okr_users WHERE is_active=true AND unit_id IS NULL`);
  const activeExec = await num(`SELECT count(*) n FROM okr_users WHERE is_active=true AND role IN ('exec','ceo','cfo')`);
  const orphanProjTask = await num(
    `SELECT count(*) n FROM okr_initiatives i WHERE i.project_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM okr_projects p WHERE p.id = i.project_id)`,
  );
  const orphanMemberUser = await num(
    `SELECT count(*) n FROM okr_project_members m WHERE NOT EXISTS
       (SELECT 1 FROM okr_users u WHERE lower(u.email)=lower(m.email))`,
  );

  const totalTasks = await num(`SELECT count(*) n FROM okr_initiatives`);
  const totalProjects = await num(`SELECT count(*) n FROM okr_projects`);
  const totalActiveUsers = await num(`SELECT count(*) n FROM okr_users WHERE is_active=true`);

  const stats: Record<string, number> = {
    totalTasks, totalProjects, totalActiveUsers,
    nullTaskCode, nullUnitOwner, dupTaskCode, dupObjCode, dupProjCode,
    objNullCode, projNullCode, activeUserNoUnit, activeExec, orphanProjTask, orphanMemberUser,
  };

  // ---------- Tổng hợp vấn đề ----------
  const issues: CheckIssue[] = [];
  const add = (cond: boolean, key: string, label: string, count: number, severity: CheckSeverity, hint?: string) => {
    if (cond) issues.push({ key, label, count, severity, hint });
  };
  add(nullTaskCode > 0, 'null_task_code', 'Công việc còn thiếu Mã (auto-fix chưa sinh được)', nullTaskCode, 'warn',
    'Thường do việc thiếu điểm neo — kiểm tra thủ công.');
  add(nullUnitOwner > 0, 'null_unit_owner', 'Công việc thiếu Đơn vị dù người phụ trách có phòng', nullUnitOwner, 'warn');
  add(dupTaskCode > 0, 'dup_task_code', 'Mã công việc bị trùng', dupTaskCode, 'high');
  add(dupObjCode > 0, 'dup_obj_code', 'Mã OKR bị trùng', dupObjCode, 'high');
  add(dupProjCode > 0, 'dup_proj_code', 'Mã dự án bị trùng', dupProjCode, 'high');
  add(objNullCode > 0, 'obj_null_code', 'OKR còn thiếu Mã', objNullCode, 'warn');
  add(projNullCode > 0, 'proj_null_code', 'Dự án còn thiếu Mã', projNullCode, 'warn');
  add(activeUserNoUnit > 0, 'user_no_unit', 'Người dùng đang hoạt động chưa gán Đơn vị', activeUserNoUnit, 'warn');
  add(activeExec === 0, 'no_exec', 'Không còn tài khoản Điều hành nào hoạt động', 0, 'high');
  add(orphanProjTask > 0, 'orphan_proj_task', 'Công việc trỏ tới dự án không tồn tại', orphanProjTask, 'high');
  add(orphanMemberUser > 0, 'orphan_member', 'Thành viên dự án không khớp tài khoản nào', orphanMemberUser, 'warn');

  // ---------- Hạ tầng (từ cron) ----------
  const infra = opts?.infra;
  if (infra) {
    const badSmoke = Object.entries(infra.smoke ?? {}).filter(([, code]) => code !== 200);
    add(badSmoke.length > 0, 'smoke_fail', `Domain trả mã khác 200: ${badSmoke.map(([d, c]) => `${d}=${c}`).join(', ')}`,
      badSmoke.length, 'high');
    const down = (infra.containers ?? []).filter((c) => !c.up);
    add(down.length > 0, 'container_down', `Container không chạy: ${down.map((c) => c.name).join(', ')}`, down.length, 'high');
    add(!!infra.headLocal && !!infra.headRemote && infra.headLocal !== infra.headRemote,
      'deploy_drift', `Bản chạy (${infra.headLocal}) lệch so với nhánh mới nhất (${infra.headRemote}) — cần deploy lại`, 1, 'warn');
    if (infra.headLocal) stats.deploySynced = infra.headLocal === infra.headRemote ? 1 : 0;
  }

  const ranAt = new Date().toISOString();
  const ok = issues.length === 0;
  const hasHigh = issues.some((i) => i.severity === 'high');

  // Ghi nhật ký (mọi lần chạy — để CFO thấy lịch sử ở Hệ thống → Nhật ký).
  await logAudit({
    actor: 'he-thong@okr', action: 'system.checkpoint', entity: 'system',
    detail: { ok, fixedUnit, fixedCode, issues: issues.map((i) => ({ k: i.key, n: i.count })), dryRun: dry },
  }).catch(() => {});

  // Gửi email CFO CHỈ khi có vấn đề NGHIÊM TRỌNG (severity 'high') — tránh spam hằng ngày với các
  // việc vệ sinh dữ liệu 'warn' (đã tự sửa hoặc chỉ cần xem). Mọi lần chạy đều ghi nhật ký để tra sau.
  let notified: CheckpointReport['notified'] = null;
  if (!dry && notify && hasHigh) {
    notified = await sendAlert({ ranAt, issues, fixedUnit, fixedCode }).catch(() => ({ sent: 0, recipients: [] }));
  }

  return { ranAt, dryRun: dry, fixed: { taskUnit: fixedUnit, taskCode: fixedCode }, stats, issues, ok, notified };
}

async function sendAlert(r: { ranAt: string; issues: CheckIssue[]; fixedUnit: number; fixedCode: number }): Promise<{ sent: number; recipients: string[] }> {
  const recips = await alertRecipients();
  if (!recips.length) return { sent: 0, recipients: [] };
  const high = r.issues.filter((i) => i.severity === 'high').length;
  const base = mailBaseUrl();
  const rows = r.issues
    .map((i) => `<tr><td style="padding:4px 10px;border-bottom:1px solid #eee">${i.severity === 'high' ? '🔴' : '🟡'}</td>
      <td style="padding:4px 10px;border-bottom:1px solid #eee">${escapeHtml(i.label)}</td>
      <td style="padding:4px 10px;border-bottom:1px solid #eee;text-align:right">${i.count || ''}</td></tr>`)
    .join('');
  const fixLine = (r.fixedUnit || r.fixedCode)
    ? `<p style="color:#166534;margin:8px 0">✅ Đã tự sửa: ${r.fixedUnit} việc điền đơn vị · ${r.fixedCode} việc sinh mã.</p>`
    : '';
  const html = `<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:640px">
    <h2 style="margin:0 0 4px">⚠ Checkpoint hệ thống OKR — ${r.issues.length} vấn đề cần xem${high ? ` (${high} nghiêm trọng)` : ''}</h2>
    <p style="color:#555;margin:0 0 10px">Kiểm tra tự động lúc ${new Date(r.ranAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ VN).</p>
    ${fixLine}
    <table style="border-collapse:collapse;width:100%;font-size:14px"><tbody>${rows}</tbody></table>
    <p style="margin:14px 0"><a href="${base}/admin" style="background:#3595D5;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">Mở Quản trị hệ thống</a></p>
    <p style="color:#888;font-size:12px">Email tự động từ OKR Checkpoint Audit. Không có vấn đề thì hệ thống KHÔNG gửi email.</p>
  </div>`;
  let sent = 0;
  const done: string[] = [];
  for (const rc of recips) {
    const ok = await sendMail({ to: rc.email, subject: `⚠ OKR Checkpoint — ${r.issues.length} vấn đề${high ? ` · ${high} nghiêm trọng` : ''}`, html });
    if (ok) { sent++; done.push(rc.email); }
  }
  return { sent, recipients: done };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
