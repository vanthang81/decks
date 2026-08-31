import { query } from './db';
import { sendMail } from './mail';
import { currentReviewData, type ReviewData } from './review';
import { STATUS_LABEL } from './kpi-values';
import { getSetting, setSetting } from './settings';
import { loadAccess, hasCap } from './access';
import { notifEnabled } from './notifications';
import type { OkrUser } from './users';

// BẢN TIN ĐIỀU HÀNH TUẦN — email tóm tắt điều hành. Cron n8n gọi hằng tuần.
// Người nhận = user có NĂNG LỰC 'digest.weekly' (mặc định nhóm Quản trị hệ thống + Quản trị OKR, cấu hình
// ở Phân quyền), CÒN bật email + CHƯA tự tắt loại 'weekly_digest'. Bản tin có CÔNG TẮC TỔNG (mặc định TẮT).
const DIGEST_ENABLED_KEY = 'weekly_digest_enabled';
export async function getWeeklyDigestEnabled(): Promise<boolean> {
  return (await getSetting<boolean>(DIGEST_ENABLED_KEY, false)) === true;
}
export async function setWeeklyDigestEnabled(on: boolean): Promise<void> {
  await setSetting(DIGEST_ENABLED_KEY, !!on);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}
const TONE_ICON = { good: '✅', watch: '⚠️', risk: '🔴' } as const;

function fmt(v: number | null, unit: string | null): string {
  if (v == null) return '—';
  if (unit === 'đ' && Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  return `${Math.round(v).toLocaleString('vi-VN')}${unit && unit !== 'đ' ? ' ' + unit : ''}`;
}

export function digestHtml(d: ReviewData, appUrl: string): string {
  const insights = d.insights
    .slice(0, 4)
    .map((i) => `<li>${TONE_ICON[i.tone]} <b>${esc(i.observe)}</b><br><span style="color:#555">→ ${esc(i.recommend)}</span></li>`)
    .join('');
  const kpiRows = d.kpiAlerts
    .slice(0, 6)
    .map((a) => `<tr><td style="padding:3px 8px">${esc(a.code ?? a.name)}</td><td style="padding:3px 8px">${esc(a.unit ?? '—')}</td><td style="padding:3px 8px;text-align:right">${fmt(a.actual, a.unit_label)}</td><td style="padding:3px 8px">${STATUS_LABEL[a.status]}</td></tr>`)
    .join('');
  const slow = d.units.slice(0, 3).map((u) => `${esc(u.name)} (${u.progress}%)`).join(' · ');

  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:640px;color:#222">
    <h2 style="color:#7C0312;margin:0 0 4px">📊 Bản tin điều hành tuần — ${esc(d.periodName)}</h2>
    <p style="margin:0 0 14px;color:#666">Tiến độ công ty <b style="color:#7C0312">${d.companyProg}%</b> · nhịp thời gian ${d.elapsed}% · <b>${esc(d.paceVerdict.txt)}</b></p>

    <table style="border-collapse:collapse;margin-bottom:14px">
      <tr>
        <td style="padding:6px 14px;background:#FAF6F0;border-radius:8px;text-align:center"><b style="font-size:18px">${Math.round(d.checkinCoverage * 100)}%</b><br><span style="font-size:11px;color:#777">KR check-in</span></td>
        <td style="width:8px"></td>
        <td style="padding:6px 14px;background:#FAF6F0;border-radius:8px;text-align:center"><b style="font-size:18px;color:${d.kpiAlerts.length ? '#dc2626' : '#222'}">${d.kpiAlerts.length}</b><br><span style="font-size:11px;color:#777">KPI cảnh báo</span></td>
        <td style="width:8px"></td>
        <td style="padding:6px 14px;background:#FAF6F0;border-radius:8px;text-align:center"><b style="font-size:18px;color:${d.overdue.length ? '#dc2626' : '#222'}">${d.overdue.length}</b><br><span style="font-size:11px;color:#777">việc quá hạn</span></td>
        <td style="width:8px"></td>
        <td style="padding:6px 14px;background:#FAF6F0;border-radius:8px;text-align:center"><b style="font-size:18px">${d.health.avg}</b><br><span style="font-size:11px;color:#777">sức khỏe OKR</span></td>
      </tr>
    </table>

    <h3 style="margin:0 0 6px">Nhận định &amp; Khuyến nghị</h3>
    <ul style="margin:0 0 14px;padding-left:18px;line-height:1.5">${insights}</ul>

    ${d.kpiAlerts.length ? `<h3 style="margin:0 0 6px">KPI cần can thiệp</h3>
    <table style="border-collapse:collapse;font-size:13px;margin-bottom:14px"><tr style="background:#f3f3f3"><th style="padding:3px 8px;text-align:left">KPI</th><th style="padding:3px 8px;text-align:left">Đơn vị</th><th style="padding:3px 8px">Thực hiện</th><th style="padding:3px 8px">Mức</th></tr>${kpiRows}</table>` : ''}

    <p style="margin:0 0 14px"><b>Khối tiến độ thấp nhất:</b> ${slow || '—'}</p>

    <p style="margin:16px 0"><a href="${appUrl}/review" style="background:#7C0312;color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none">Mở trang Họp điều hành →</a></p>
    <p style="color:#999;font-size:12px">BTMH OKR Portal — bản tin tự động hằng tuần.</p>
  </div>`;
}

type DigestUser = {
  email: string; name: string | null; role: string; perm_group: string | null;
  notify_email: boolean; notif_prefs: Record<string, unknown> | null;
};

/** Người nhận bản tin = có năng lực 'digest.weekly' + bật email + chưa tự tắt loại 'weekly_digest'. */
export async function digestRecipients(): Promise<{ email: string; name: string | null }[]> {
  const access = await loadAccess();
  const rows = await query<DigestUser>(
    `SELECT email, display_name AS name, role, perm_group, notify_email, notif_prefs
       FROM okr_users WHERE is_active = true ORDER BY email`,
  );
  const out: { email: string; name: string | null }[] = [];
  for (const u of rows) {
    if (!u.notify_email) continue;
    if (!notifEnabled(u.notif_prefs, 'weekly_digest')) continue;
    const user = { email: u.email, role: u.role, perm_group: u.perm_group } as OkrUser;
    if (!hasCap(user, 'digest.weekly', access)) continue;
    out.push({ email: u.email, name: u.name });
  }
  return out;
}

export async function sendWeeklyDigest(opts?: { force?: boolean }): Promise<{ sent: number; recipients: string[]; skipped?: string }> {
  // CÔNG TẮC TỔNG (mặc định TẮT) — cron sẽ bỏ qua; nút "Gửi thử" ở Quản trị dùng force để test.
  if (!opts?.force && !(await getWeeklyDigestEnabled())) return { sent: 0, recipients: [], skipped: 'disabled' };
  const d = await currentReviewData();
  if (!d) return { sent: 0, recipients: [], skipped: 'no-period' };
  const appUrl = process.env.APP_URL || 'https://okr.consultx.vn';
  const html = digestHtml(d, appUrl);
  const to = await digestRecipients();
  let sent = 0;
  const done: string[] = [];
  for (const r of to) {
    const ok = await sendMail({ to: r.email, subject: `📊 Bản tin điều hành tuần — ${d.periodName}`, html, kind: 'link' });
    if (ok) { sent++; done.push(r.email); }
  }
  return { sent, recipients: done };
}
