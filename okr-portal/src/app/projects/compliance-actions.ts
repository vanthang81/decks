'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { loadAccess, hasCap } from '@/lib/access';
import { getProject, canManageProject } from '@/lib/projects';
import { queryOne } from '@/lib/db';
import {
  addProjectFunction, removeProjectFunction, hasProjectFunction,
  submitIssue, reviewIssue, getIssue, type ProjectFn,
} from '@/lib/compliance';

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}

async function requireManage(projectId: string) {
  const user = await requireUser();
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  if (!canManageProject(user, p, units, access)) throw new Error('Bạn không có quyền cấu hình dự án này.');
  return { user, p };
}

// ---- Vai trò chức năng theo dự án (Pháp chế / KSTT / KH&QLDA) ----
export async function addProjectFunctionAction(fd: FormData) {
  const projectId = str(fd, 'project_id');
  const { user } = await requireManage(projectId);
  const email = str(fd, 'email').toLowerCase();
  const fn = str(fd, 'fn') as ProjectFn;
  if (!email) throw new Error('Thiếu email người dùng.');
  if (!['phap_che', 'kstt', 'qlda'].includes(fn)) throw new Error('Vai trò không hợp lệ.');
  await addProjectFunction(projectId, email, fn, user.email);
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectFunctionAction(fd: FormData) {
  const projectId = str(fd, 'project_id');
  await requireManage(projectId);
  await removeProjectFunction(str(fd, 'id'));
  revalidatePath(`/projects/${projectId}`);
}

// ---- Workflow thẩm định ----
// PIC/đơn vị (người phụ trách 1 hành động khắc phục) HOẶC quản dự án / KH&QLDA gửi thẩm định.
export async function submitIssueAction(fd: FormData) {
  const user = await requireUser();
  const projectId = str(fd, 'project_id');
  const issueId = str(fd, 'issue_id');
  const issue = await getIssue(issueId);
  if (!issue || issue.project_id !== projectId) throw new Error('Không tìm thấy vấn đề.');
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const p = await getProject(projectId);
  const isOwnerOfTask = await queryOne<{ x: number }>(
    'SELECT 1 x FROM okr_initiatives WHERE issue_id=$1 AND lower(owner_email)=lower($2)',
    [issueId, user.email],
  );
  const allowed =
    !!isOwnerOfTask ||
    (p && canManageProject(user, p, units, access)) ||
    (await hasProjectFunction(projectId, user.email, 'qlda'));
  if (!allowed) throw new Error('Chỉ người phụ trách khắc phục (hoặc KH&QLDA/quản dự án) mới gửi thẩm định.');
  const r = await submitIssue(issueId, user.email);
  if (!r.ok) throw new Error(r.error || 'Không gửi được thẩm định.');
  revalidatePath(`/projects/${projectId}`);
}

// KSTT / Pháp chế thẩm định — CHỈ người giữ đúng vai trò chức năng (hoặc Quản trị hệ thống scope.all).
export async function reviewIssueAction(fd: FormData) {
  const user = await requireUser();
  const projectId = str(fd, 'project_id');
  const issueId = str(fd, 'issue_id');
  const step = str(fd, 'step') as 'kstt' | 'phap_che';
  const result = str(fd, 'result') as 'pass' | 'reject';
  const note = str(fd, 'note');
  if (!['kstt', 'phap_che'].includes(step)) throw new Error('Bước thẩm định không hợp lệ.');
  if (!['pass', 'reject'].includes(result)) throw new Error('Kết quả không hợp lệ.');
  const issue = await getIssue(issueId);
  if (!issue || issue.project_id !== projectId) throw new Error('Không tìm thấy vấn đề.');
  const access = await loadAccess();
  const isAdmin = hasCap(user, 'scope.all', access);
  const fn: ProjectFn = step === 'kstt' ? 'kstt' : 'phap_che';
  if (!isAdmin && !(await hasProjectFunction(projectId, user.email, fn))) {
    throw new Error(`Chỉ người giữ vai trò ${step === 'kstt' ? 'KSTT' : 'Pháp chế'} của dự án mới thẩm định bước này.`);
  }
  const r = await reviewIssue(issueId, user.email, step, result, note);
  if (!r.ok) throw new Error(r.error || 'Không thẩm định được.');
  revalidatePath(`/projects/${projectId}`);
}
