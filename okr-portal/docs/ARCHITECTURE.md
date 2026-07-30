# Kiến trúc & phân quyền — OKR Portal

## Mô hình dữ liệu (Postgres `btmh_data`, prefix `okr_`)

```
okr_units ──(parent_id)──┐        cây tổ chức: company → division → department
   ▲                     │
   │ unit_id             │
okr_users (email PK, role, unit_id)   allowlist Google + vai trò

okr_periods (kỳ quý/năm, is_current)
   │ period_id
   ▼
okr_objectives ──(parent_id, tự trỏ)── alignment/cascade
   │  level: company|division|department|individual
   │  unit_id (đơn vị sở hữu) | owner_email (người chủ trì)
   ├─< okr_key_results (KR: start→current→target, progress, kpi_source)
   │        ├─< okr_initiatives (kế hoạch hành động + ngân sách)
   │        └─< okr_checkins (cập nhật tiến độ + độ tự tin)
   └─< okr_initiatives (gắn thẳng cấp Objective)
```

- **Progress roll-up**: `progress` của KR tính từ `start→current→target` (`computeKrProgress`).
  Objective = bình quân theo trọng số các KR; nếu không có KR thì bình quân OKR con. Mỗi lần cập
  nhật KR → `recomputeUp()` lan tiến độ ngược lên cây cha (Cá nhân → Phòng → Khối → Công ty).
- **Ngân sách**: mỗi initiative có `budget_planned` / `budget_actual`; tổng hợp theo Objective
  (`budgetSummaryForObjective`). `budget_source` để nối `pe_cf_budget` (đọc thực chi tự động — phase sau).
- **KPI tự động**: KR gắn `kpi_source` (khóa registry `src/lib/kpi.ts`) → `syncKpiSources()` kéo
  actual từ Postgres (`pe_cf_*`…) và cập nhật `current_value` + progress. Nguồn BigQuery (doanh thu,
  lãi gộp) sẽ nối qua API price-engine ở phase sau.

## Phân quyền (RBAC) — `src/lib/rbac.ts` + `src/lib/org.ts`

| Vai trò (`role`) | Cấp | Phạm vi quản trị OKR |
|---|---|---|
| `exec` | CEO/CFO | Toàn bộ + quản trị hệ thống (người dùng, tổ chức, kỳ) |
| `division_lead` | GĐ khối | Đơn vị "nhà" + toàn bộ phòng/cá nhân thuộc khối (subtree) |
| `dept_lead` | Trưởng phòng | Phòng mình + cá nhân thuộc phòng |
| `staff` | Nhân viên | OKR cá nhân của mình |

- **Đọc**: minh bạch — mọi người đăng nhập đều XEM được toàn bộ OKR (chuẩn OKR transparency).
- **Sửa/tạo**: `canManageObjective()` = exec, hoặc owner/created_by, hoặc lead có `unit_id` của
  objective nằm trong `manageScope()` (subtree đơn vị mình). OKR cá nhân: ai cũng tạo cho chính mình.
- **Quản trị hệ thống**: chỉ `exec` (`canAdmin`). Guard: không khoá/xoá exec cuối cùng, không tự xoá mình.
- Đăng nhập: Auth.js v5 Google OAuth. `signIn` chặn email không có trong `okr_users` hoặc `is_active=false`.
  Middleware gác toàn app (trừ `/login`, `/api/auth`).

## Luồng thiết lập
1. **CEO/CFO** đăng nhập (seed trong `db/010_seed_example.sql`).
2. Quản trị → Cây tổ chức: tạo Khối, Phòng.
3. Quản trị → Người dùng: thêm GĐ khối / Trưởng phòng / NV, gán đơn vị.
4. Quản trị → Kỳ OKR: tạo kỳ, đặt "hiện tại".
5. OKR: tạo OKR công ty → khối liên kết lên công ty → phòng liên kết lên khối → cá nhân.
   Thêm KR, kế hoạch hành động + ngân sách; check-in hàng tuần.

## Roadmap (phase sau)
- Nối `kpi_source` với API price-engine (doanh thu/lãi gộp/tồn kho từ BigQuery).
- Đồng bộ `budget_actual` tự động từ `pe_cf_budget`.
- Email nhắc check-in (qua n8n "Deck Mail" pattern), báo cáo tuần, biểu đồ xu hướng.
- Xuất PDF/deck báo cáo OKR quý (tái dùng hạ tầng decks).
