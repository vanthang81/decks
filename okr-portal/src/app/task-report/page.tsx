import SiteHeader from '@/components/SiteHeader';
import HelpTip from '@/components/HelpTip';
import ToastForm from '@/components/ToastForm';
import ExecReportView from '@/components/ExecReportView';
import { requireUser } from '@/lib/current-user';
import { loadAccess, isSuperAdmin, userGroupKey } from '@/lib/access';
import { listUnits } from '@/lib/org';
import { buildExecReport, type ReportPeriod } from '@/lib/exec-report';
import { saveLateGraceAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Báo cáo thực hiện · BTMH OKR' };

export default async function TaskReportPage({
  searchParams,
}: {
  searchParams: { period?: string; d?: string };
}) {
  const user = await requireUser();
  const [access, units] = await Promise.all([loadAccess(), listUnits()]);
  const period: ReportPeriod = searchParams.period === 'month' ? 'month' : 'week';
  const report = await buildExecReport(user, units, access, { period, anchor: searchParams.d });
  const canEditGrace = isSuperAdmin(user) || ['system_admin', 'okr_admin'].includes(userGroupKey(user));

  return (
    <>
      <SiteHeader active="task-report" />
      <div className="wrap">
        <div className="pagetitle">Báo cáo thực hiện công việc<HelpTip k="task-report" /></div>
        <p className="subtitle">
          Theo dõi & review việc thực hiện công việc theo <b>tuần / tháng</b> — của từng <b>phòng ban</b> và
          <b> cá nhân</b>: hoàn thành đúng hạn, trễ hạn, quá hạn. Việc hoàn thành sau hạn (quá số ngày ân hạn)
          vẫn tính <b>chậm deadline</b>.
        </p>

        {/* Cấu hình ân hạn deadline (chỉ Super Admin / QT hệ thống / QT OKR) */}
        <div className="card er-grace">
          <div className="er-grace-info">
            <b>Ân hạn deadline: {report.graceDays} ngày</b>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {' '}— việc hoàn thành trong vòng {report.graceDays} ngày sau hạn vẫn tính đúng hạn; trễ hơn = chậm deadline.
            </span>
          </div>
          {canEditGrace && (
            <ToastForm action={saveLateGraceAction} done="Đã lưu số ngày ân hạn" className="er-grace-form">
              <label className="f" style={{ margin: 0 }}>Số ngày ân hạn</label>
              <input className="i" name="grace_days" type="number" min={0} max={60} defaultValue={report.graceDays}
                style={{ width: 90 }} inputMode="numeric" />
              <button className="btn sm" type="submit">Lưu</button>
            </ToastForm>
          )}
        </div>

        <ExecReportView report={report} navBase="/task-report" />
      </div>
    </>
  );
}
