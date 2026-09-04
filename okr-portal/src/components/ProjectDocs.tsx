import ToastForm from '@/components/ToastForm';
import ConfirmButton from '@/components/ConfirmButton';
import { fmtDate } from '@/lib/format';
import type { ProjectDoc } from '@/lib/project-docs';

// Thư viện tài liệu dự án — tạm thời LIST LINK (chưa upload file).
// Người quản dự án (canManage) được thêm/xoá; mọi người xem được dự án đều thấy danh sách.
export default function ProjectDocs({
  projectId,
  docs,
  canManage,
  add,
  del,
}: {
  projectId: string;
  docs: ProjectDoc[];
  canManage: boolean;
  add: (fd: FormData) => Promise<void>;
  del: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Thư viện tài liệu ({docs.length})</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Nơi lưu link tài liệu của dự án (kế hoạch, biên bản, sheet, thư mục Drive…). Hiện lưu dạng <b>đường link</b> — chưa hỗ trợ tải file lên.
      </p>

      {canManage && (
        <ToastForm action={add} done="Đã thêm tài liệu">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label className="f">Tên tài liệu</label>
              <input className="i" name="title" required placeholder="VD: Kế hoạch triển khai" />
            </div>
            <div>
              <label className="f">Đường link (URL)</label>
              <input className="i" name="url" type="url" required placeholder="https://…" />
            </div>
            <div>
              <label className="f">Ghi chú (tuỳ chọn)</label>
              <input className="i" name="note" placeholder="Mô tả ngắn" />
            </div>
            <div>
              <button className="btn" type="submit">Thêm link</button>
            </div>
          </div>
        </ToastForm>
      )}

      {docs.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0, marginTop: canManage ? 12 : 0 }}>
          Chưa có tài liệu nào.{canManage ? ' Thêm link tài liệu đầu tiên ở trên.' : ''}
        </p>
      ) : (
        <div className="table-scroll" style={{ marginTop: canManage ? 12 : 0 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Tài liệu</th>
                <th>Ghi chú</th>
                <th>Người thêm</th>
                <th>Ngày</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="tbl-link">
                      🔗 {d.title}
                    </a>
                    <div className="obj-meta" style={{ wordBreak: 'break-all', fontSize: 11.5 }}>{d.url}</div>
                  </td>
                  <td>{d.note || <span className="muted">—</span>}</td>
                  <td>{d.created_by || <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(d.created_at)}</td>
                  {canManage && (
                    <td>
                      <ToastForm action={del} done="Đã xoá tài liệu">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <ConfirmButton
                          className="btn ghost sm danger"
                          label="Xoá"
                          title="Xoá tài liệu"
                          message={`Xoá link "${d.title}" khỏi thư viện tài liệu dự án?`}
                          confirmLabel="Xoá"
                        />
                      </ToastForm>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
