import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import ToastForm from '@/components/ToastForm';
import HelpTip from '@/components/HelpTip';
import ConfirmButton from '@/components/ConfirmButton';
import { requireUser } from '@/lib/current-user';
import { loadAccess, canManageKpi } from '@/lib/access';
import { listUnits } from '@/lib/org';
import { listUsers, personTitle } from '@/lib/users';
import { getCurrentPeriod } from '@/lib/periods';
import { listKpiResults } from '@/lib/kpi-values';
import KpiResultCell from '@/components/KpiResultCell';
import KpiOwnerFields from '@/components/KpiOwnerFields';
import NumberInput from '@/components/NumberInput';
import EditModal from '@/components/EditModal';
import NavIcon from '@/components/NavIcon';
import { BSC_PERSPECTIVES, BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON } from '@/lib/okr';
import type { Unit } from '@/lib/org';
import type { OkrUser } from '@/lib/users';
import {
  listKpis,
  TIER_LABEL,
  TIER_HINT,
  TIERS,
  SOURCE_LABEL,
  DIRECTION_LABEL,
  AGG_LABEL,
  CADENCES,
  CADENCE_LABEL,
  KPI_MODULES,
  type Kpi,
} from '@/lib/kpis';
import { createKpiAction, updateKpiAction, deleteKpiAction, toggleKpiActiveAction } from './actions';

export const dynamic = 'force-dynamic';

const TIER_CLS: Record<string, string> = { result: 'blue', driver: 'amber', enabler: 'gray' };
const SRC_CLS: Record<string, string> = { manual: 'amber', bigquery: 'green', postgres: 'green' };

// Bộ trường KPI dùng chung cho form Thêm & Sửa (server component).
function KpiFields({
  kpi,
  units,
  users,
}: {
  kpi?: Kpi;
  units: Unit[];
  users: (OkrUser & { display_name: string | null })[];
}) {
  const divisions = units.filter((u) => u.type !== 'company');
  return (
    <>
      <label className="f">Tên KPI *</label>
      <input className="i" name="name" defaultValue={kpi?.name ?? ''} required placeholder="VD: Biên thương mại / chỉ" />

      <div className="row">
        <div>
          <label className="f">Đơn vị đo</label>
          <input className="i" name="unit_label" defaultValue={kpi?.unit_label ?? ''} placeholder="đ / % / chỉ / lượt" />
        </div>
        <div>
          <label className="f">Viễn cảnh BSC</label>
          <select className="i" name="bsc_perspective" defaultValue={kpi?.bsc_perspective ?? ''}>
            <option value="">— Chưa gắn —</option>
            {BSC_PERSPECTIVES.map((b) => (
              <option key={b} value={b}>{BSC_PERSPECTIVE_ICON[b]} {BSC_PERSPECTIVE_LABEL[b]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="f">Tầng scorecard</label>
          <select className="i" name="tier" defaultValue={kpi?.tier ?? ''}>
            <option value="">— Không —</option>
            {TIERS.map((t) => <option key={t} value={t} title={TIER_HINT[t]}>{TIER_LABEL[t]}</option>)}
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Trọng số (điểm)</label>
          <input className="i" name="weight" type="number" min={0} defaultValue={kpi?.weight ?? 0} />
        </div>
        <div>
          <label className="f">Hướng tốt</label>
          <select className="i" name="direction" defaultValue={kpi?.direction ?? 'up'}>
            <option value="up">{DIRECTION_LABEL.up}</option>
            <option value="down">{DIRECTION_LABEL.down}</option>
          </select>
        </div>
        <div>
          <label className="f">Cách gộp lên cấp trên</label>
          <select className="i" name="agg" defaultValue={kpi?.agg ?? 'last'}>
            <option value="sum">{AGG_LABEL.sum}</option>
            <option value="avg">{AGG_LABEL.avg}</option>
            <option value="last">{AGG_LABEL.last}</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label className="f">Nguồn dữ liệu</label>
          <select className="i" name="source" defaultValue={kpi?.source ?? 'manual'}>
            <option value="manual">{SOURCE_LABEL.manual}</option>
            <option value="bigquery">{SOURCE_LABEL.bigquery}</option>
            <option value="postgres">{SOURCE_LABEL.postgres}</option>
          </select>
        </div>
        <div>
          <label className="f">Tham chiếu nguồn / công thức</label>
          <input className="i" name="source_ref" defaultValue={kpi?.source_ref ?? ''} placeholder="metric key / công thức" />
        </div>
        <div>
          <label className="f">Nhịp</label>
          <select className="i" name="cadence" defaultValue={kpi?.cadence ?? ''}>
            <option value="">— Không —</option>
            {CADENCES.map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}
          </select>
        </div>
      </div>

      <KpiOwnerFields
        units={divisions.map((u) => ({ id: u.id, name: u.name, type: u.type, parent_id: u.parent_id, sort: u.sort }))}
        users={users.map((u) => ({ email: u.email, name: u.display_name || u.email, role: u.role, unit_id: u.unit_id, title: personTitle(u) }))}
        defModule={kpi?.module ?? ''}
        defUnit={kpi?.unit_id ?? ''}
        defBusiness={kpi?.business_owner ?? ''}
        defMeasure={kpi?.measurement_owner ?? ''}
      />

      <label className="f">3 ngưỡng cảnh báo (Watch · Alert · Escalate) <span className="muted" style={{ fontWeight: 400 }}>· nhập theo Đơn vị đo của KPI</span></label>
      <div className="row">
        <div><NumberInput name="threshold_watch" defaultValue={kpi?.threshold_watch ?? ''} placeholder="Watch" /></div>
        <div><NumberInput name="threshold_alert" defaultValue={kpi?.threshold_alert ?? ''} placeholder="Alert" /></div>
        <div><NumberInput name="threshold_escalate" defaultValue={kpi?.threshold_escalate ?? ''} placeholder="Escalate" /></div>
      </div>

      <label className="f">Mô tả / cách đọc</label>
      <textarea className="i" name="description" defaultValue={kpi?.description ?? ''} rows={2} />
    </>
  );
}

export default async function KpiLibraryPage() {
  const me = await requireUser();
  if (!canManageKpi(me, await loadAccess())) redirect('/');
  const [units, users, kpis, period] = await Promise.all([
    listUnits(), listUsers(), listKpis(), getCurrentPeriod(),
  ]);

  const active = kpis.filter((k) => k.is_active);
  const totalWeight = active.reduce((a, k) => a + (k.weight || 0), 0);

  // Kết quả THỰC (cấp Công ty, kỳ hiện tại) + lịch sử để hiện ngay tại chỗ / popup xu hướng.
  const company = units.find((u) => u.type === 'company') ?? null;
  const results = period && company ? await listKpiResults(period.id, company.id) : [];
  const resultById = new Map(results.map((r) => [r.id, r]));

  return (
    <>
      <SiteHeader active="admin" />
      <datalist id="kpi-modules">
        {KPI_MODULES.map((m) => <option key={m} value={m} />)}
      </datalist>
      <div className="wrap">
        <p className="subtitle" style={{ marginBottom: 6 }}>
          <Link href="/admin">← Quản trị</Link>
        </p>
        <div className="flexbtw flexbtw-top">
          <div>
            <div className="pagetitle">Thư viện KPI<HelpTip k="kpi-library" /></div>
            <p className="subtitle">
              Khai báo chỉ số đo dùng lại cho toàn hệ thống: viễn cảnh BSC · module (KRA) · tầng &amp; trọng số ·
              nguồn (tự động/nhập tay) · ngưỡng Watch/Alert/Escalate · chủ sở hữu. {kpis.length} KPI ·
              tổng trọng số đang hoạt động: <b>{totalWeight}</b>.
            </p>
          </div>
          <EditModal title="Thêm KPI mới" label="Thêm KPI" icon={<NavIcon name="plus" />} submitLabel="Tạo KPI" action={createKpiAction} wide>
            <KpiFields units={units} users={users} />
          </EditModal>
        </div>

        <div className="card">
          <div className="table-scroll">
            <table className="t">
              <thead>
                <tr>
                  <th>Mã</th><th>KPI</th><th>Viễn cảnh</th><th>Tầng</th><th className="right">Trọng số</th>
                  <th>Nguồn</th><th>Đơn vị chủ</th>
                  <th>Kết quả<div className="th-sub">{period ? `Công ty · ${period.name}` : 'kỳ hiện tại'}</div></th>
                  <th>W / A / E</th><th></th>
                </tr>
              </thead>
              <tbody>
                {kpis.length === 0 && (
                  <tr><td colSpan={10} className="muted">Chưa có KPI. Thêm KPI đầu tiên bên dưới.</td></tr>
                )}
                {kpis.map((k) => (
                  <tr key={k.id} style={k.is_active ? undefined : { opacity: 0.55 }}>
                    <td>{k.code && <span className="okr-code">{k.code}</span>}</td>
                    <td>
                      <b>{k.name}</b>
                      {k.module && <div className="muted" style={{ fontSize: 11.5 }}>{k.module}</div>}
                    </td>
                    <td>
                      {k.bsc_perspective
                        ? <span className="badge bsc">{BSC_PERSPECTIVE_ICON[k.bsc_perspective]} {BSC_PERSPECTIVE_LABEL[k.bsc_perspective]}</span>
                        : <span className="muted">—</span>}
                    </td>
                    <td>{k.tier ? <span className={`badge ${TIER_CLS[k.tier]}`}>{TIER_LABEL[k.tier]}</span> : <span className="muted">—</span>}</td>
                    <td className="right mono">{k.weight || 0}</td>
                    <td><span className={`badge ${SRC_CLS[k.source]}`} style={{ fontSize: 10.5 }}>{SOURCE_LABEL[k.source]}</span></td>
                    <td style={{ fontSize: 12.5 }}>{k.unit_name || <span className="muted">—</span>}</td>
                    <td>
                      {resultById.has(k.id)
                        ? <KpiResultCell data={resultById.get(k.id)!} />
                        : <span className="muted">—</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {[k.threshold_watch, k.threshold_alert, k.threshold_escalate].every((x) => x == null)
                        ? <span className="muted">—</span>
                        : `${k.threshold_watch ?? '·'} / ${k.threshold_alert ?? '·'} / ${k.threshold_escalate ?? '·'}`}
                    </td>
                    <td>
                      <div className="row-actions">
                        <EditModal
                          title={`Sửa KPI · ${k.name}`}
                          label=""
                          icon={<NavIcon name="pencil" />}
                          submitLabel="Lưu KPI"
                          action={updateKpiAction}
                          triggerClass="icon-btn"
                          wide
                        >
                          <input type="hidden" name="id" value={k.id} />
                          <KpiFields kpi={k} units={units} users={users} />
                        </EditModal>
                        <ToastForm action={toggleKpiActiveAction} done="Đã cập nhật KPI">
                          <input type="hidden" name="id" value={k.id} />
                          <input type="hidden" name="active" value={k.is_active ? '0' : '1'} />
                          <button className="icon-btn" type="submit" title={k.is_active ? 'Đang hiển thị — bấm để ẩn' : 'Đang ẩn — bấm để bật lại'} aria-label={k.is_active ? 'Ẩn KPI' : 'Bật KPI'}>
                            <NavIcon name={k.is_active ? 'eye' : 'eyeOff'} />
                          </button>
                        </ToastForm>
                        <ToastForm action={deleteKpiAction} done="Đã xoá KPI">
                          <input type="hidden" name="id" value={k.id} />
                          <ConfirmButton
                            label={<NavIcon name="trash" />}
                            className="icon-btn danger"
                            title="Xoá KPI"
                            message={`Xoá KPI "${k.name}"? Không hoàn tác.`}
                          />
                        </ToastForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
