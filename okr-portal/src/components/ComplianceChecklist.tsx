'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ChecklistItem } from '@/lib/compliance';
import {
  CONCLUSION_LABEL, CONCLUSION_CLS, ISSUE_STATUS_LABEL, ISSUE_STATUS_CLS,
  type Conclusion, type IssueStatus,
} from '@/lib/compliance-shared';

type ImportResult = {
  ok?: boolean; error?: string; sheet?: string; rows?: number;
  created?: number; updated?: number; issuesCreated?: number; tasksCreated?: number;
  skipped?: number; warnings?: string[]; headersMatched?: Record<string, string>;
};

export default function ComplianceChecklist({
  projectId, items, canImport,
}: {
  projectId: string;
  items: ChecklistItem[];
  canImport: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ImportResult | null>(null);
  const [q, setQ] = useState('');
  const [fConc, setFConc] = useState<Conclusion | ''>('');

  const counts = useMemo(() => {
    const c = { total: items.length, tuan_thu: 0, chua_tuan_thu: 0, vi_pham: 0, chua_ra_soat: 0, khong_ap_dung: 0, no_plan: 0, in_remediation: 0, pending: 0, closed: 0 };
    for (const it of items) {
      c[it.ket_luan] = (c[it.ket_luan] ?? 0) + 1;
      const st = it.issue_status as IssueStatus | null | undefined;
      if (st === 'no_plan') c.no_plan++;
      else if (st === 'in_remediation') c.in_remediation++;
      else if (st === 'pending_review' || st === 'kstt_passed') c.pending++;
      else if (st === 'closed') c.closed++;
    }
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter((it) => {
      if (fConc && it.ket_luan !== fConc) return false;
      if (!kw) return true;
      return (
        (it.ma_tieu_chi || '').toLowerCase().includes(kw) ||
        (it.yeu_cau || '').toLowerCase().includes(kw) ||
        (it.don_vi_ra_soat || '').toLowerCase().includes(kw) ||
        (it.co_so_phap_ly || '').toLowerCase().includes(kw)
      );
    });
  }, [items, q, fConc]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    setBusy(true);
    setRes(null);
    try {
      const fd = new FormData();
      fd.append('project_id', projectId);
      fd.append('file', input.files[0]);
      const r = await fetch('/api/compliance/import', { method: 'POST', body: fd });
      const j = (await r.json()) as ImportResult;
      setRes(j);
      if (j.ok) { form.reset(); router.refresh(); }
    } catch (err) {
      setRes({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flexbtw" style={{ alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ marginTop: 0 }}>Bảng kiểm tuân thủ ({counts.total})</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Nguồn dữ liệu gốc: mỗi dòng là <b>một tiêu chí rà soát</b> (không phải công việc). Khi kết luận
        <b> Chưa tuân thủ/Vi phạm</b>, hệ thống tự tạo <b>Vấn đề tuân thủ</b> và kế thừa kế hoạch khắc phục
        (nếu có) thành công việc ở mục “Công việc thuộc dự án”. Import lại theo cùng <b>Mã</b> sẽ cập nhật, không tạo trùng.
      </p>

      {/* Thống kê nhanh theo trạng thái tuân thủ */}
      {counts.total > 0 && (
        <div className="cmpl-stats">
          <Stat label="Tổng tiêu chí" n={counts.total} cls="slate" />
          <Stat label="Tuân thủ" n={counts.tuan_thu} cls="green" />
          <Stat label="Chưa tuân thủ" n={counts.chua_tuan_thu} cls="amber" />
          <Stat label="Vi phạm" n={counts.vi_pham} cls="red" />
          <Stat label="Chưa rà soát" n={counts.chua_ra_soat} cls="slate" />
          <Stat label="Chưa có KHKP" n={counts.no_plan} cls="red" />
          <Stat label="Đang khắc phục" n={counts.in_remediation} cls="amber" />
          <Stat label="Chờ/đang thẩm định" n={counts.pending} cls="blue" />
          <Stat label="Đã đóng" n={counts.closed} cls="green" />
        </div>
      )}

      {/* Import */}
      {canImport && (
        <form onSubmit={submit} className="cmpl-import">
          <input className="i" type="file" name="file" accept=".xlsx" style={{ maxWidth: 320 }} />
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Đang nhập…' : '⬆ Import Bảng kiểm (.xlsx)'}</button>
          <span className="muted" style={{ fontSize: 12 }}>Nhận diện cột linh hoạt theo tiêu đề; cột lạ được giữ nguyên.</span>
        </form>
      )}
      {res && (
        <div className={`cmpl-note ${res.ok ? 'ok' : 'err'}`} style={{ marginTop: 8 }}>
          {res.ok ? (
            <>
              ✓ Nhập từ sheet <b>{res.sheet}</b>: {res.created} tạo mới · {res.updated} cập nhật
              {res.issuesCreated ? ` · ${res.issuesCreated} vấn đề tuân thủ mới` : ''}
              {res.tasksCreated ? ` · ${res.tasksCreated} công việc khắc phục tự tạo` : ''}
              {res.skipped ? ` · ${res.skipped} dòng bỏ qua` : ''}.
              {res.warnings && res.warnings.length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {res.warnings.map((w, i) => <li key={i} className="muted" style={{ fontSize: 12 }}>{w}</li>)}
                </ul>
              )}
            </>
          ) : (
            <>✗ {res.error}</>
          )}
        </div>
      )}

      {/* Bộ lọc */}
      {counts.total > 0 && (
        <div className="cmpl-filter">
          <input className="i" placeholder="Tìm mã / yêu cầu / đơn vị / cơ sở pháp lý…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 340 }} />
          <select className="i" value={fConc} onChange={(e) => setFConc(e.target.value as Conclusion | '')} style={{ maxWidth: 200 }}>
            <option value="">Tất cả kết luận</option>
            {(Object.keys(CONCLUSION_LABEL) as Conclusion[]).map((k) => (
              <option key={k} value={k}>{CONCLUSION_LABEL[k]}</option>
            ))}
          </select>
          {(q || fConc) && <button className="btn ghost sm" type="button" onClick={() => { setQ(''); setFConc(''); }}>Xoá lọc</button>}
        </div>
      )}

      {/* Bảng tiêu chí */}
      {counts.total === 0 ? (
        <p className="muted">Chưa có tiêu chí nào. {canImport ? 'Dùng nút “Import Bảng kiểm” để đưa toàn bộ bảng kiểm từ Excel lên.' : 'Bảng kiểm sẽ hiển thị tại đây khi được import.'}</p>
      ) : (
        <div className="table-scroll wide-x">
          <table className="t cmpl-tbl">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Yêu cầu tuân thủ</th>
                <th>Cơ sở pháp lý</th>
                <th>Đơn vị rà soát</th>
                <th>Hạn rà soát</th>
                <th>Kết luận</th>
                <th>Kế hoạch khắc phục</th>
                <th>Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((it) => {
                const st = it.issue_status as IssueStatus | null | undefined;
                return (
                  <tr key={it.id}>
                    <td className="mono">{it.ma_tieu_chi}</td>
                    <td className="cmpl-req">{it.yeu_cau || <span className="muted">—</span>}</td>
                    <td className="muted sm">{it.co_so_phap_ly || '—'}</td>
                    <td>{it.don_vi_ra_soat || <span className="muted">—</span>}</td>
                    <td className="nowrap">{it.han_ra_soat || <span className="muted">—</span>}</td>
                    <td><span className={`badge ${CONCLUSION_CLS[it.ket_luan]}`}>{CONCLUSION_LABEL[it.ket_luan]}</span></td>
                    <td className="sm">{it.khkp_noi_dung ? <span title={it.khkp_noi_dung}>{trunc(it.khkp_noi_dung, 60)}</span> : <span className="muted">—</span>}</td>
                    <td className="nowrap">
                      {st ? (
                        <>
                          <span className={`badge ${ISSUE_STATUS_CLS[st]}`}>{ISSUE_STATUS_LABEL[st]}</span>
                          {(it.task_total ?? 0) > 0 && (
                            <span className="muted sm" style={{ marginLeft: 6 }}>{it.task_done}/{it.task_total} việc</span>
                          )}
                        </>
                      ) : (
                        <span className="muted sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {counts.total > 0 && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Đang hiển thị {shown.length}/{counts.total} tiêu chí. Công việc khắc phục theo dõi &amp; cập nhật ở mục
          {' '}<Link href={`/projects/${projectId}`}>“Công việc thuộc dự án”</Link> bên dưới.
        </p>
      )}
    </div>
  );
}

function Stat({ label, n, cls }: { label: string; n: number; cls: string }) {
  return (
    <div className={`cmpl-stat ${cls}`}>
      <div className="cmpl-stat-n">{n}</div>
      <div className="cmpl-stat-l">{label}</div>
    </div>
  );
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
