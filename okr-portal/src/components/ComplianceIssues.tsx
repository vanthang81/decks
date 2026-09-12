'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import type { ComplianceIssue, ReviewRow } from '@/lib/compliance';
import { ISSUE_STATUS_LABEL, ISSUE_STATUS_CLS, type IssueStatus } from '@/lib/compliance-shared';

type Perms = { canSubmitIssueIds: string[]; isKstt: boolean; isPhapChe: boolean; isAdmin: boolean; canAdd: boolean };

export default function ComplianceIssues({
  projectId, issues, reviews, perms, users, submit, review, addAction,
}: {
  projectId: string;
  issues: ComplianceIssue[];
  reviews: ReviewRow[];
  perms: Perms;
  users: { email: string; name: string }[];
  submit: (fd: FormData) => Promise<void>;
  review: (fd: FormData) => Promise<void>;
  addAction: (fd: FormData) => Promise<void>;
}) {
  const reviewsByIssue = useMemo(() => {
    const m = new Map<string, ReviewRow[]>();
    for (const r of reviews) { const a = m.get(r.issue_id) ?? []; a.push(r); m.set(r.issue_id, a); }
    return m;
  }, [reviews]);

  const canSubmit = useMemo(() => new Set(perms.canSubmitIssueIds), [perms.canSubmitIssueIds]);

  const openCount = issues.filter((i) => i.status !== 'closed').length;

  if (issues.length === 0) return null;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Vấn đề tuân thủ ({issues.length}{openCount ? ` · ${openCount} chưa đóng` : ''})</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Sinh tự động từ tiêu chí “Chưa tuân thủ/Vi phạm”. Người phụ trách khắc phục xong bấm
        <b> Gửi thẩm định</b> → <b>KSTT</b> kiểm tra thực tế → <b>Pháp chế</b> đánh giá pháp lý &amp; đóng.
        PIC không tự đóng được.
      </p>
      <div className="cmpl-issues">
        {issues.map((it) => (
          <IssueRow
            key={it.id}
            projectId={projectId}
            issue={it}
            reviews={reviewsByIssue.get(it.id) ?? []}
            canSubmit={canSubmit.has(it.id)}
            perms={perms}
            users={users}
            submit={submit}
            review={review}
            addAction={addAction}
          />
        ))}
      </div>
    </div>
  );
}

function IssueRow({
  projectId, issue, reviews, canSubmit, perms, users, submit, review, addAction,
}: {
  projectId: string;
  issue: ComplianceIssue;
  reviews: ReviewRow[];
  canSubmit: boolean;
  perms: Perms;
  users: { email: string; name: string }[];
  submit: (fd: FormData) => Promise<void>;
  review: (fd: FormData) => Promise<void>;
  addAction: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<null | 'kstt' | 'phap_che'>(null);
  const [note, setNote] = useState('');
  const [showHist, setShowHist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [aTitle, setATitle] = useState('');
  const [aOwner, setAOwner] = useState('');
  const [aDue, setADue] = useState('');

  const st = issue.status as IssueStatus;
  const total = issue.task_total ?? 0, done = issue.task_done ?? 0;
  const allDone = total > 0 && done >= total;

  async function run(fn: () => Promise<void>, okMsg?: string) {
    setBusy(true); setErr(null);
    try { await fn(); if (okMsg) toast(okMsg, 'success'); router.refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  function doSubmit() {
    run(async () => { const fd = new FormData(); fd.set('project_id', projectId); fd.set('issue_id', issue.id); await submit(fd); }, 'Đã gửi thẩm định');
  }
  function doAdd() {
    if (!aTitle.trim()) { setErr('Nhập nội dung hành động khắc phục.'); return; }
    run(async () => {
      const fd = new FormData();
      fd.set('project_id', projectId); fd.set('issue_id', issue.id);
      fd.set('title', aTitle); fd.set('owner_email', aOwner); fd.set('due_on', aDue);
      await addAction(fd);
      setAdding(false); setATitle(''); setAOwner(''); setADue('');
    }, 'Đã thêm hành động khắc phục');
  }
  function doReview(step: 'kstt' | 'phap_che', result: 'pass' | 'reject') {
    if (result === 'reject' && !note.trim()) { setErr('Cần ghi lý do khi trả lại.'); return; }
    run(async () => {
      const fd = new FormData();
      fd.set('project_id', projectId); fd.set('issue_id', issue.id);
      fd.set('step', step); fd.set('result', result); fd.set('note', note);
      await review(fd);
      setRejecting(null); setNote('');
    }, result === 'pass' ? 'Đã duyệt bước thẩm định' : 'Đã trả lại để khắc phục');
  }

  return (
    <div className="cmpl-issue">
      <div className="cmpl-issue-top">
        <span className={`badge ${issue.severity === 'vi_pham' ? 'red' : 'amber'}`}>{issue.severity === 'vi_pham' ? 'Vi phạm' : 'Chưa tuân thủ'}</span>
        {issue.ma_tieu_chi && <span className="mono sm">#{issue.ma_tieu_chi}</span>}
        <span className="cmpl-issue-title">{issue.title}</span>
        <span className={`badge ${ISSUE_STATUS_CLS[st]}`}>{ISSUE_STATUS_LABEL[st]}</span>
        {total > 0 && <span className="muted sm">{done}/{total} việc</span>}
      </div>

      <div className="cmpl-issue-act">
        {/* Gửi thẩm định */}
        {(st === 'in_remediation' || st === 'no_plan') && canSubmit && (
          allDone
            ? <button className="btn sm" disabled={busy} onClick={doSubmit}>Gửi thẩm định hoàn thành</button>
            : <span className="muted sm">{total === 0 ? 'Chưa có hành động khắc phục — thêm việc ở mục dưới.' : `Còn ${total - done} việc chưa xong.`}</span>
        )}
        {/* KSTT */}
        {st === 'pending_review' && (perms.isKstt || perms.isAdmin) && rejecting !== 'kstt' && (
          <>
            <button className="btn sm" disabled={busy} onClick={() => doReview('kstt', 'pass')}>KSTT: Đạt</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => { setRejecting('kstt'); setErr(null); }}>Không đạt…</button>
          </>
        )}
        {st === 'pending_review' && !(perms.isKstt || perms.isAdmin) && <span className="muted sm">Chờ KSTT kiểm tra.</span>}
        {/* Pháp chế */}
        {st === 'kstt_passed' && (perms.isPhapChe || perms.isAdmin) && rejecting !== 'phap_che' && (
          <>
            <button className="btn sm" disabled={busy} onClick={() => doReview('phap_che', 'pass')}>Pháp chế: Đạt · Đóng</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => { setRejecting('phap_che'); setErr(null); }}>Không đạt…</button>
          </>
        )}
        {st === 'kstt_passed' && !(perms.isPhapChe || perms.isAdmin) && <span className="muted sm">Chờ Pháp chế đánh giá &amp; đóng.</span>}

        {perms.canAdd && st !== 'closed' && !adding && (
          <button className="btn ghost sm" type="button" onClick={() => { setAdding(true); setErr(null); }}>＋ Thêm hành động khắc phục</button>
        )}
        {reviews.length > 0 && (
          <button className="btn ghost sm" type="button" onClick={() => setShowHist((v) => !v)}>
            {showHist ? 'Ẩn lịch sử' : `Lịch sử (${reviews.length})`}
          </button>
        )}
      </div>

      {/* Thêm hành động khắc phục */}
      {adding && (
        <div className="cmpl-addact">
          <input className="i" placeholder="Nội dung hành động khắc phục *" value={aTitle} onChange={(e) => setATitle(e.target.value)} />
          <div className="cmpl-addact-row">
            <select className="i" value={aOwner} onChange={(e) => setAOwner(e.target.value)}>
              <option value="">— Giao cho (tuỳ chọn) —</option>
              {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
            </select>
            <input className="i" type="date" value={aDue} onChange={(e) => setADue(e.target.value)} title="Hạn khắc phục" />
            <button className="btn sm" disabled={busy} onClick={doAdd}>Thêm</button>
            <button className="btn ghost sm" type="button" onClick={() => { setAdding(false); setATitle(''); setAOwner(''); setADue(''); setErr(null); }}>Huỷ</button>
          </div>
        </div>
      )}

      {/* Ô lý do khi trả lại */}
      {rejecting && (
        <div className="cmpl-reject">
          <textarea className="i" rows={2} placeholder="Lý do trả lại / yêu cầu bổ sung (bắt buộc)…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn sm danger" disabled={busy} onClick={() => doReview(rejecting, 'reject')}>Trả lại “Đang khắc phục”</button>
            <button className="btn ghost sm" type="button" onClick={() => { setRejecting(null); setNote(''); setErr(null); }}>Huỷ</button>
          </div>
        </div>
      )}

      {err && <div className="cmpl-note err" style={{ marginTop: 6 }}>{err}</div>}

      {showHist && reviews.length > 0 && (
        <ul className="cmpl-hist">
          {reviews.map((r) => (
            <li key={r.id}>
              <span className={`badge ${r.result === 'pass' ? 'green' : 'red'}`}>{stepLabel(r.step)} · {r.result === 'pass' ? 'Đạt' : 'Trả lại'}</span>
              <span className="muted sm">{r.actor_name || r.actor} · {fmt(r.created_at)}</span>
              {r.note && <div className="cmpl-hist-note">{r.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stepLabel(s: string): string {
  return s === 'submit' ? 'Gửi thẩm định' : s === 'kstt' ? 'KSTT' : s === 'phap_che' ? 'Pháp chế' : s;
}
function fmt(iso: string): string {
  try { return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); } catch { return iso; }
}
