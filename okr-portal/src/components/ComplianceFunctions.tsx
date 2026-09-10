'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FN_LABEL, type ProjectFn } from '@/lib/compliance-shared';
import type { ProjectFunctionRow } from '@/lib/compliance';

const FNS: ProjectFn[] = ['phap_che', 'kstt', 'qlda'];

export default function ComplianceFunctions({
  projectId, rows, users, add, remove,
}: {
  projectId: string;
  rows: ProjectFunctionRow[];
  users: { email: string; name: string }[];
  add: (fd: FormData) => Promise<void>;
  remove: (fd: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fn, setFn] = useState<ProjectFn>('phap_che');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set('project_id', projectId); fd.set('email', email); fd.set('fn', fn);
      await add(fd);
      setEmail('');
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally { setBusy(false); }
  }
  async function del(id: string) {
    const fd = new FormData();
    fd.set('project_id', projectId); fd.set('id', id);
    await remove(fd);
    router.refresh();
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Vai trò thẩm định của dự án</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Gán người giữ vai trò <b>Pháp chế</b> (đánh giá pháp lý), <b>KSTT</b> (kiểm tra thực tế/bằng chứng),
        <b> KH&amp;QLDA</b> (theo dõi tiến độ, được gửi thẩm định). Chỉ đúng vai trò mới được duyệt bước tương ứng.
      </p>
      <div className="cmpl-fns">
        {FNS.map((f) => {
          const people = rows.filter((r) => r.fn === f);
          return (
            <div key={f} className="cmpl-fn-col">
              <div className="cmpl-fn-h">{FN_LABEL[f]}</div>
              {people.length === 0 ? (
                <div className="muted sm" style={{ fontSize: 12 }}>Chưa gán</div>
              ) : (
                people.map((p) => (
                  <div key={p.id} className="cmpl-fn-chip">
                    <span>{p.name || p.email}</span>
                    <button type="button" className="cmpl-fn-x" title="Bỏ" onClick={() => del(p.id)}>×</button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="cmpl-fn-add">
        <select className="i" value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">— Chọn người —</option>
          {users.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}
        </select>
        <select className="i" value={fn} onChange={(e) => setFn(e.target.value as ProjectFn)} style={{ maxWidth: 200 }}>
          {FNS.map((f) => <option key={f} value={f}>{FN_LABEL[f]}</option>)}
        </select>
        <button className="btn sm" type="submit" disabled={busy || !email}>{busy ? 'Đang gán…' : 'Gán vai trò'}</button>
        {err && <span className="badge red">{err}</span>}
      </form>
    </div>
  );
}
