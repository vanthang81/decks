import { query } from './db';
import { sendMail } from './mail';
import { currentReviewData, type ReviewData } from './review';
import { STATUS_LABEL } from './kpi-values';

// BẢN TIN ĐIỀU HÀNH TUẦN — email tóm tắt cho Ban lãnh đạo (role exec). Cron n8n gọi hằng tuần.

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

async function recipients(): Promise<{ email: string; name: string | null }[]> {
  const rows = await query<{ email: string; name: string | null }>(
    `SELECT email, display_name AS name FROM okr_users WHERE is_active AND role IN ('exec','ceo','cfo') ORDER BY email`,
  );
  if (rows.length) return rows;
  return [{ email: 'vanthang81@gmail.com', name: 'CFO' }];
}

export async function sendWeeklyDigest(): Promise<{ sent: number; recipients: string[]; skipped?: string }> {
  const d = await currentReviewData();
  if (!d) return { sent: 0, recipients: [], skipped: 'no-period' };
  const appUrl = process.env.APP_URL || 'https://okr.consultx.vn';
  const html = digestHtml(d, appUrl);
  const to = await recipients();
  let sent = 0;
  const done: string[] = [];
  for (const r of to) {
    const ok = await sendMail({ to: r.email, subject: `📊 Bản tin điều hành tuần — ${d.periodName}`, html, kind: 'link' });
    if (ok) { sent++; done.push(r.email); }
  }
  return { sent, recipients: done };
}
