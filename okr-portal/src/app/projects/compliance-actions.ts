'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/current-user';
import { listUnits } from '@/lib/org';
import { loadAccess, hasCap } from '@/lib/access';
import { getProject, canManageProject } from '@/lib/projects';
import { queryOne } from '@/lib/db';
import { isProjectMember } from '@/lib/project-members';
import {
  addProjectFunction, removeProjectFunction, hasProjectFunction,
  submitIssue, reviewIssue, getIssue, addRemediationTask, projectFunctionsOf,
  createChecklistItem, updateChecklistItem, deleteChecklistItem, parseConclusion,
  type ProjectFn, type ChecklistWrite,
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

// ---- Sửa / Xoá / Thêm tay tiêu chí (quản dự án / Pháp chế / KH&QLDA) ----
async function requireChecklistEdit(projectId: string) {
  const user = await requireUser();
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const p = await getProject(projectId);
  if (!p) throw new Error('Không tìm thấy dự án.');
  const fns = await projectFunctionsOf(projectId, user.email);
  const ok = canManageProject(user, p, units, access) || fns.has('phap_che') || fns.has('qlda');
  if (!ok) throw new Error('Chỉ quản dự án / Pháp chế / KH&QLDA mới sửa được Bảng kiểm.');
  return user;
}

function readWrite(fd: FormData): ChecklistWrite {
  const g = (k: string) => { const v = str(fd, k); return v === '' ? null : v; };
  return {
    ma_tieu_chi: str(fd, 'ma_tieu_chi'),
    yeu_cau: g('yeu_cau'), co_so_phap_ly: g('co_so_phap_ly'), don_vi_ra_soat: g('don_vi_ra_soat'), han_ra_soat: g('han_ra_soat'),
    ket_qua_don_vi: g('ket_qua_don_vi'), bang_chung: g('bang_chung'), tham_dinh_phap_che: g('tham_dinh_phap_che'), ket_qua_kstt: g('ket_qua_kstt'),
    ket_luan: parseConclusion(str(fd, 'ket_luan')),
    khkp_noi_dung: g('khkp_noi_dung'), khkp_don_vi: g('khkp_don_vi'), khkp_pic: g('khkp_pic'), khkp_han: g('khkp_han'), khkp_ket_qua: g('khkp_ket_qua'),
  };
}

export async function createChecklistItemAction(fd: FormData) {
  const projectId = str(fd, 'project_id');
  const user = await requireChecklistEdit(projectId);
  const w = readWrite(fd);
  if (!w.ma_tieu_chi) throw new Error('Thiếu Mã tiêu chí.');
  await createChecklistItem(projectId, w, user.email);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateChecklistItemAction(fd: FormData) {
  const projectId = str(fd, 'project_id');
  const user = await requireChecklistEdit(projectId);
  const id = str(fd, 'id');
  const w = readWrite(fd);
  if (!w.ma_tieu_chi) throw new Error('Thiếu Mã tiêu chí.');
  const r = await updateChecklistItem(id, w, user.email);
  if (!r.ok) throw new Error(r.error || 'Không sửa được tiêu chí.');
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteChecklistItemAction(fd: FormData) {
  const projectId = str(fd, 'project_id');
  const user = await requireChecklistEdit(projectId);
  await deleteChecklistItem(str(fd, 'id'), user.email);
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

// Thêm hành động khắc phục vào 1 vấn đề — quản dự án / thành viên dự án / người giữ vai trò chức năng.
export async function addRemediationTaskAction(fd: FormData) {
  const user = await requireUser();
  const projectId = str(fd, 'project_id');
  const issueId = str(fd, 'issue_id');
  const issue = await getIssue(issueId);
  if (!issue || issue.project_id !== projectId) throw new Error('Không tìm thấy vấn đề.');
  const [units, access] = await Promise.all([listUnits(), loadAccess()]);
  const p = await getProject(projectId);
  const fns = await projectFunctionsOf(projectId, user.email);
  const allowed =
    (p && canManageProject(user, p, units, access)) ||
    (await isProjectMember(projectId, user.email)) ||
    fns.size > 0;
  if (!allowed) throw new Error('Bạn không có quyền thêm hành động khắc phục cho dự án này.');
  const owner = str(fd, 'owner_email');
  const due = str(fd, 'due_on');
  const r = await addRemediationTask(issueId, user.email, {
    title: str(fd, 'title'),
    owner_email: owner || null,
    due_on: due || null,
    expected_output: str(fd, 'expected_output') || null,
  });
  if (!r.ok) throw new Error(r.error || 'Không thêm được hành động khắc phục.');
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
