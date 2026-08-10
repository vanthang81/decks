import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import NewObjectiveForm from '@/components/NewObjectiveForm';
import { requireUser } from '@/lib/current-user';
import { getCurrentPeriod, getPeriod, listPeriods } from '@/lib/periods';
import { buildObjectiveFormProps } from '@/lib/objective-form';
import { createObjectiveAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewObjectivePage({ searchParams }: { searchParams: { period?: string; parent?: string } }) {
  const user = await requireUser();
  if (user.role === 'staff') redirect('/objectives'); // Nhân viên = chỉ xem, không tạo OKR
  const periods = await listPeriods();
  const period = searchParams.period ? await getPeriod(searchParams.period) : (await getCurrentPeriod()) ?? periods[0] ?? null;
  const formProps = period ? await buildObjectiveFormProps(user, period.id) : null;

  return (
    <>
      <SiteHeader active="okr" />
      <div className="wrap">
        <div className="pagetitle">Tạo OKR mới</div>
        <p className="subtitle">{period ? `Kỳ: ${period.name}` : 'Chưa có kỳ OKR — vào Quản trị tạo kỳ trước.'}</p>

        {!formProps ? (
          <div className="card"><Link href="/admin/periods">Tạo kỳ OKR</Link></div>
        ) : (
          <div className="card" style={{ maxWidth: 680 }}>
            <NewObjectiveForm {...formProps} create={createObjectiveAction} />
          </div>
        )}
      </div>
    </>
  );
}
