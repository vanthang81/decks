// Suy TRẠNG THÁI theo TIẾN ĐỘ (CFO/Liễu 19/09): "chỉ cần cập nhật Tiến độ thì Trạng thái tự động theo".
// Tránh cảnh nhập 100% mà quên đổi trạng thái nên vẫn "chưa hoàn thành".
// Quy tắc ưu tiên: 100% → Xong (tuyệt đối). <100% giữ trạng thái CHỦ Ý (Vướng/Huỷ); 0% → Chưa làm; 1..99% → Đang làm.
// Dùng CHUNG cho client (live-sync ô chọn khi gõ tiến độ) — client-safe, KHÔNG import gì.
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled';

export function statusFromProgress(progress: number, current: TaskStatus): TaskStatus {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  if (p >= 100) return 'done'; // 100% → Xong (ưu tiên tuyệt đối, kể cả đang Vướng thì hoàn thành là xong)
  if (current === 'canceled') return 'canceled'; // giữ Huỷ (chủ ý)
  if (current === 'blocked') return 'blocked'; // giữ Vướng (chủ ý)
  if (p <= 0) return 'todo'; // 0% → Chưa làm
  return 'in_progress'; // 1..99% → Đang làm
}
