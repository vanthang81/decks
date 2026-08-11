# Bật ghi thẳng Google Calendar (OKR Portal)

Tính năng "tự thêm cuộc họp/công việc vào Google Calendar của từng người" đã **code sẵn** nhưng
đang **NGỦ** (dormant) để không ảnh hưởng đăng nhập. Khi CFO muốn bật, làm theo các bước dưới đây.
Toàn bộ thay đổi phía app đã có; chỉ cần (1) cấu hình Google Cloud Console và (2) đặt 1 biến môi trường.

## Tính năng khi bật
- Tạo/sửa **cuộc họp** → tạo/cập nhật sự kiện trên **lịch của người chủ trì**, tự **mời người tham
  gia** (attendee) qua email. Huỷ họp/xoá họp → xoá sự kiện.
- Tạo/sửa **công việc có hạn** → sự kiện **cả ngày** trên lịch **người được giao**. Việc xong/huỷ/xoá
  → xoá sự kiện.
- Mỗi người tự cấp quyền lịch khi **đăng nhập lại** (màn hình đồng ý của Google). Ai chưa cấp thì bỏ
  qua (không lỗi).

## Bước 1 — Google Cloud Console (cho CẢ HAI OAuth client)
Portal chạy 2 domain với 2 OAuth client (consultx & vanthang). Làm cho **cả hai**:
1. Vào **APIs & Services → Library**, bật **Google Calendar API** cho project chứa client.
2. Vào **OAuth consent screen**: thêm scope
   `https://www.googleapis.com/auth/calendar.events` vào danh sách scope. Nếu consent screen đang ở
   chế độ *Testing* thì thêm người dùng test; nếu *In production* thì scope này là *sensitive* —
   Google có thể yêu cầu xác minh (verification). Với **Google Workspace nội bộ** (Internal) thì
   không cần verification.
3. Không cần đổi redirect URI (giữ nguyên `.../api/auth/callback/google`).

## Bước 2 — Bật biến môi trường trên VPS
Trong file `.env` của app (`/home/thang/okr-portal-src/okr-portal/.env`) thêm:

```
GOOGLE_CALENDAR_ENABLED=1
```

Rồi **redeploy** (chạy workflow n8n "OKR Deploy — manual") để recreate **cả 2 container**
(container `okr-portal-vt` truyền env qua `-e`, nên nếu muốn bật cho domain vanthang thì thêm
`-e GOOGLE_CALENDAR_ENABLED=1` vào lệnh `docker run` của nó trong workflow).

## Bước 3 — Người dùng đăng nhập lại
Sau khi bật, mỗi người **đăng xuất & đăng nhập lại** một lần để cấp quyền lịch. Từ đó, cuộc họp/công
việc mới (và cập nhật) sẽ tự lên lịch Google của họ.

## Kỹ thuật (tham khảo)
- Token lưu ở bảng `okr_google_tokens` (access/refresh/expiry, offline). Refresh tự động khi hết hạn.
- Map bản ghi → sự kiện: cột `okr_initiatives.gcal_event_id`, `okr_meetings.gcal_event_id`.
- Toàn bộ nằm ở `src/lib/gcal.ts` + móc vào server actions (best-effort, no-op khi
  `GOOGLE_CALENDAR_ENABLED` khác `1`). Scope chỉ được xin thêm khi cờ bật (xem `src/auth.config.ts`).
- Lưu ý: `refresh_token` phát theo từng OAuth client; người đăng nhập ở domain nào thì token refresh
  bằng client của domain đó (mỗi container đã có `GOOGLE_CLIENT_ID/SECRET` riêng).
