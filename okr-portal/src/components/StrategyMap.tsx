import Link from 'next/link';
import { progressColor } from '@/lib/format';
import { BSC_PERSPECTIVE_LABEL, BSC_PERSPECTIVE_ICON, type BscPerspective } from '@/lib/okr';

// SƠ ĐỒ CHIẾN LƯỢC BSC (Strategy Map) — 4 tầng nhân-quả xếp DỌC theo quy ước BSC:
// Tài chính (đỉnh, kết quả) ⇐ Khách hàng ⇐ Quy trình nội bộ ⇐ Học hỏi & Phát triển (nền móng).
// Mũi tên hướng LÊN = nền móng thúc đẩy kết quả. Read-only, render server.

type Obj = {
  id: string; code: string | null; title: string; level: string;
  unit_name: string | null; progress: number; bsc_perspective: BscPerspective | null;
};

// Thứ tự tầng từ trên xuống (kết quả → nền móng)
const ORDER: BscPerspective[] = ['financial', 'customer', 'process', 'learning'];
const SUB: Record<BscPerspective, string> = {
  financial: 'Kết quả tài chính — đích đến của chiến lược',
  customer: 'Giá trị & trải nghiệm khách hàng',
  process: 'Quy trình nội bộ vận hành xuất sắc',
  learning: 'Nền móng: con người, tổ chức, công nghệ',
};
const LEVEL_ORDER: Record<string, number> = { company: 0, division: 1, department: 2, individual: 3 };

export default function StrategyMap({ objectives }: { objectives: Obj[] }) {
  const byBsc = new Map<BscPerspective, Obj[]>();
  for (const p of ORDER) byBsc.set(p, []);
  for (const o of objectives) if (o.bsc_perspective) byBsc.get(o.bsc_perspective)!.push(o);
  for (const arr of byBsc.values())
    arr.sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || (a.code ?? '').localeCompare(b.code ?? ''));

  const avg = (a: Obj[]) => (a.length ? Math.round(a.reduce((s, o) => s + o.progress, 0) / a.length) : 0);

  return (
    <div className="smap">
      <p className="smap-note muted">
        Đọc từ <b>dưới lên</b>: nền móng (Học hỏi) → Quy trình → Khách hàng → kết quả Tài chính. Mũi tên = quan hệ nhân-quả.
      </p>
      {ORDER.map((p, i) => {
        const arr = byBsc.get(p) ?? [];
        const a = avg(arr);
        return (
          <div key={p} className={`smap-band bsc-${p}`}>
            <div className="smap-side">
              <span className="smap-ic" aria-hidden>{BSC_PERSPECTIVE_ICON[p]}</span>
              <div>
                <div className="smap-ptitle">{BSC_PERSPECTIVE_LABEL[p]}</div>
                <div className="smap-psub">{SUB[p]}</div>
              </div>
              <div className="smap-avg">
                <span className="map-mini"><i style={{ width: `${a}%`, background: progressColor(a) }} /></span>
                <b>{a}%</b>
              </div>
            </div>
            <div className="smap-objs">
              {arr.length === 0 && <div className="smap-empty">Chưa có OKR ở tầng này</div>}
              {arr.map((o) => (
                <Link key={o.id} href={`/objectives/${o.id}`} className={`smap-obj lv-${o.level}`}>
                  <div className="smap-obj-top">
                    {o.code && <span className="okr-code sm">{o.code}</span>}
                    <span className="smap-obj-prog" style={{ color: progressColor(o.progress) }}>{Math.round(o.progress)}%</span>
                  </div>
                  <div className="smap-obj-ttl">{o.title}</div>
                  {o.unit_name && <div className="smap-obj-unit">{o.unit_name}</div>}
                  <span className="smap-obj-bar"><i style={{ width: `${Math.round(o.progress)}%`, background: progressColor(o.progress) }} /></span>
                </Link>
              ))}
            </div>
            {i < ORDER.length - 1 && <div className="smap-arrow" aria-hidden>▲</div>}
          </div>
        );
      })}
    </div>
  );
}
