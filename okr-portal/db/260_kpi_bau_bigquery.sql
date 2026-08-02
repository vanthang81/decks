-- 260_kpi_bau_bigquery.sql — NHÓM A: 6 KPI vận hành (BAU) auto-fill từ BigQuery
-- bằng công thức ĐÃ KIỂM CHỨNG trong từ điển dữ liệu (price-engine). weight=0 (KHÔNG
-- vào scorecard trọng số 100) → chỉ theo dõi số thực hiện, không xáo trộn 16 KPI đã seed.
-- Thực hiện auto-fill cấp Công ty, kỳ hiện tại (src/lib/kpi.ts KPI_ACTUAL_SQL). Idempotent.
-- Chạy bằng superuser postgres.

INSERT INTO okr_kpis
  (code, name, description, unit_label, bsc_perspective, module, tier, weight, direction, agg, source, unit_id, created_by)
VALUES
  ('OPS-01','Doanh thu (bán lẻ)','Doanh thu ghi nhận bán lẻ NY+SG = SUM(line_income_vnd), loại nội bộ & SX/BN/HD','đ','financial','Commercial / Retail / Store ops / B2B',NULL,0,'up','sum','bigquery',(SELECT id FROM okr_units WHERE code='BL' AND type='division' LIMIT 1),'seed_bau_bq'),
  ('OPS-02','Số hóa đơn','COUNT(DISTINCT bill_id) bán lẻ — số giao dịch phát sinh trong kỳ','hóa đơn','customer','Commercial / Retail / Store ops / B2B',NULL,0,'up','sum','bigquery',(SELECT id FROM okr_units WHERE code='BL' AND type='division' LIMIT 1),'seed_bau_bq'),
  ('OPS-03','Sản lượng mua vào (chỉ)','SUM(assessed_weight_chi) — khối lượng vàng mua lại từ khách (bán lẻ)','chỉ','process','Inventory & Working Capital',NULL,0,'up','sum','bigquery',(SELECT id FROM okr_units WHERE code='CU' AND type='division' LIMIT 1),'seed_bau_bq'),
  ('OPS-04','Giá trị mua vào','SUM(net_buyback_amount_vnd) — tiền chi mua lại vàng từ khách (bán lẻ)','đ','financial','Inventory & Working Capital',NULL,0,'up','sum','bigquery',(SELECT id FROM okr_units WHERE code='CU' AND type='division' LIMIT 1),'seed_bau_bq'),
  ('OPS-05','Tồn kho (giá trị)','SUM(ton_cuoi_ngay_gt) tại ngày mới nhất — vốn đang kẹt trong hàng (bán lẻ)','đ','process','Inventory & Working Capital',NULL,0,'down','last','bigquery',(SELECT id FROM okr_units WHERE code='TC' AND type='division' LIMIT 1),'seed_bau_bq'),
  ('OPS-06','Tồn kho (chỉ)','SUM(ton_cuoi_ngay_tl) tại ngày mới nhất — khối lượng tồn quy chỉ (bán lẻ)','chỉ','process','Inventory & Working Capital',NULL,0,'down','last','bigquery',(SELECT id FROM okr_units WHERE code='CU' AND type='division' LIMIT 1),'seed_bau_bq')
ON CONFLICT (code) DO NOTHING;
