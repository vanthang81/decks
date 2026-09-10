'use client';

import { useMemo } from 'react';
import type { ChecklistItem, ComplianceIssue, RemediationTask } from '@/lib/compliance';

// Số ngày coi là "sắp quá hạn" + "chờ thẩm định quá lâu".
const SOON_DAYS = 3;
const REVIEW_STUCK_DAYS = 3;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}

export default function ComplianceDashboard({
  items, issues, tasks, today,
}: {
  items: ChecklistItem[];
  issues: ComplianceIssue[];
  tasks: RemediationTask[];
  today: string; // YYYY-MM-DD giờ VN
}) {
  const d = useMemo(() => {
    const S = (v: string | null | undefined) => (v ?? '').trim();
    const soon = new Date(Date.parse(today) + SOON_DAYS * 86400000).toISOString().slice(0, 10);

    // ---- Chỉ số ----
    let chuaRaSoat = 0, choPhapChe = 0, choKstt = 0, tuanThu = 0, viPhamHoacChua = 0, khongApDung = 0;
    let raSoatOverdue = 0, raSoatSoon = 0;
    const overdueList: { key: string; label: string; sub: string }[] = [];
    const soonList: { key: string; label: string; sub: string }[] = [];

    for (const it of items) {
      switch (it.ket_luan) {
        case 'tuan_thu': tuanThu++; break;
        case 'khong_ap_dung': khongApDung++; break;
        case 'chua_tuan_thu': case 'vi_pham': viPhamHoacChua++; break;
        default: // chua_ra_soat: suy pha rà soát theo cột đã điền
          if (!S(it.ket_qua_don_vi)) chuaRaSoat++;
          else if (!S(it.tham_dinh_phap_che)) choPhapChe++;
          else if (!S(it.ket_qua_kstt)) choKstt++;
          else chuaRaSoat++;
      }
      // Hạn rà soát cho tiêu chí chưa kết luận
      const pending = it.ket_luan === 'chua_ra_soat';
      if (pending && it.han_ra_soat) {
        if (it.han_ra_soat < today) { raSoatOverdue++; overdueList.push({ key: 'c' + it.id, label: `Rà soát #${it.ma_tieu_chi}`, sub: `quá hạn ${daysBetween(today, it.han_ra_soat)} ngày` }); }
        else if (it.han_ra_soat <= soon) { raSoatSoon++; soonList.push({ key: 'c' + it.id, label: `Rà soát #${it.ma_tieu_chi}`, sub: `còn ${daysBetween(it.han_ra_soat, today)} ngày` }); }
      }
    }

    // ---- Vấn đề (khắc phục) ----
    let noPlan = 0, inRemediation = 0, pendingReview = 0, closed = 0;
    const noPlanList: { key: string; label: string; sub: string }[] = [];
    const reviewStuck: { key: string; label: string; sub: string }[] = [];
    for (const is of issues) {
      switch (is.status) {
        case 'no_plan': noPlan++; noPlanList.push({ key: is.id, label: `#${is.ma_tieu_chi} ${is.title}`, sub: is.severity === 'vi_pham' ? 'Vi phạm — chưa có KHKP' : 'Chưa tuân thủ — chưa có KHKP' }); break;
        case 'in_remediation': inRemediation++; break;
        case 'pending_review': case 'kstt_passed':
          pendingReview++;
          if (is.submitted_at && daysBetween(today, is.submitted_at.slice(0, 10)) > REVIEW_STUCK_DAYS) {
            reviewStuck.push({ key: is.id, label: `#${is.ma_tieu_chi} ${is.title}`, sub: `chờ thẩm định ${daysBetween(today, is.submitted_at.slice(0, 10))} ngày` });
          }
          break;
        case 'closed': closed++; break;
      }
    }

    // ---- Hành động khắc phục sắp/quá hạn ----
    let taskOverdue = 0, taskSoon = 0;
    for (const t of tasks) {
      if (t.status === 'done' || t.status === 'canceled' || !t.due_on) continue;
      if (t.due_on < today) { taskOverdue++; overdueList.push({ key: 't' + t.id, label: `Khắc phục: ${t.title}`, sub: `quá hạn ${daysBetween(today, t.due_on)} ngày` }); }
      else if (t.due_on <= soon) { taskSoon++; soonList.push({ key: 't' + t.id, label: `Khắc phục: ${t.title}`, sub: `còn ${daysBetween(t.due_on, today)} ngày` }); }
    }

    return {
      total: items.length, chuaRaSoat, choPhapChe, choKstt, tuanThu, viPhamHoacChua, khongApDung,
      noPlan, inRemediation, pendingReview, closed,
      overdue: raSoatOverdue + taskOverdue, soon: raSoatSoon + taskSoon,
      overdueList, soonList, noPlanList, reviewStuck,
    };
  }, [items, issues, tasks, today]);

  if (d.total === 0) return null;
  const actionTotal = d.noPlanList.length + d.overdueList.length + d.soonList.length + d.reviewStuck.length;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Bảng điều khiển tuân thủ</h3>

      <div className="cmpl-dash">
        <Cell n={d.total} label="Tổng tiêu chí" cls="slate" />
        <Cell n={d.chuaRaSoat} label="Chờ đơn vị rà soát" cls="slate" />
        <Cell n={d.choPhapChe} label="Chờ Pháp chế thẩm định" cls="blue" />
        <Cell n={d.choKstt} label="Chờ KSTT kiểm tra" cls="blue" />
        <Cell n={d.tuanThu} label="Tuân thủ" cls="green" />
        <Cell n={d.viPhamHoacChua} label="Chưa tuân thủ / Vi phạm" cls="red" />
        <Cell n={d.noPlan} label="Chưa có KH khắc phục" cls="red" />
        <Cell n={d.inRemediation} label="Đang khắc phục" cls="amber" />
        <Cell n={d.pendingReview} label="Chờ thẩm định hoàn thành" cls="blue" />
        <Cell n={d.soon} label="Sắp quá hạn" cls="amber" />
        <Cell n={d.overdue} label="Quá hạn" cls="red" />
        <Cell n={d.closed} label="Đã đóng" cls="green" />
      </div>

      {/* Cần hành động ngay */}
      <div className="cmpl-action">
        <div className="cmpl-action-h">
          ⚠ Vấn đề cần hành động ngay {actionTotal > 0 ? `(${actionTotal})` : ''}
        </div>
        {actionTotal === 0 ? (
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Không có mục nào cần xử lý gấp. 👍</p>
        ) : (
          <div className="cmpl-action-groups">
            <ActionGroup title="Vi phạm chưa có kế hoạch khắc phục" tone="red" items={d.noPlanList} />
            <ActionGroup title="Đã quá hạn" tone="red" items={d.overdueList} />
            <ActionGroup title="Chờ thẩm định quá lâu" tone="blue" items={d.reviewStuck} />
            <ActionGroup title="Sắp đến hạn" tone="amber" items={d.soonList} />
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className={`cmpl-dcell ${cls} ${n === 0 ? 'zero' : ''}`}>
      <div className="cmpl-dcell-n">{n}</div>
      <div className="cmpl-dcell-l">{label}</div>
    </div>
  );
}

function ActionGroup({ title, tone, items }: { title: string; tone: string; items: { key: string; label: string; sub: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="cmpl-ag">
      <div className={`cmpl-ag-h ${tone}`}>{title} ({items.length})</div>
      <ul className="cmpl-ag-list">
        {items.slice(0, 20).map((i) => (
          <li key={i.key}><span className="cmpl-ag-lbl">{i.label}</span> <span className="muted sm">— {i.sub}</span></li>
        ))}
        {items.length > 20 && <li className="muted sm">…và {items.length - 20} mục khác</li>}
      </ul>
    </div>
  );
}
