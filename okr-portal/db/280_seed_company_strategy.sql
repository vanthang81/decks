-- 280_seed_company_strategy.sql — ĐIỀN SẴN Chiến lược công ty từ Knowledge Base BTMH.
-- Nguồn: "Chiến lược ESG 2030 — Quản trị là chuẩn vàng mới" + "01 Hồ sơ DN" + KB Index (Outline).
-- Tầm nhìn/Sứ mệnh/Khát vọng trích trực tiếp; Giá trị cốt lõi tổng hợp từ các trụ chiến lược
-- (tín nhiệm · quản trị định chế · nguồn cung có trách nhiệm · khách hàng · dẫn dắt chuẩn ngành).
-- Idempotent upsert vào okr_settings. CEO/CFO có thể sửa lại ở trang Chiến lược bất cứ lúc nào.

INSERT INTO okr_settings (key, value) VALUES ('company_strategy', $strat$
{
  "horizon": "2026–2030",
  "vision": "Trở thành nhà bán lẻ vàng đẳng cấp thế giới, đặt chuẩn đầu tiên tại Việt Nam — được quản trị theo chuẩn định chế, sở hữu nguồn vàng có trách nhiệm, và được các gia đình Việt Nam tin cậy qua nhiều thế hệ.",
  "mission": "Là nhà bán lẻ vàng chất lượng định chế với nguồn cung có trách nhiệm mà người Việt có thể tin cậy — giúp mỗi gia đình tích lũy và gìn giữ tài sản qua nhiều thế hệ. Kim chỉ nam: “Giữ tín nhiệm hơn giữ vàng.”",
  "ambition": "Dẫn dắt phân khúc vàng tích lũy 24K và trở thành “thương hiệu vàng quốc dân”: mở rộng mạng lưới lên ~261 cửa hàng toàn quốc vào 2030 (2026→2030: 80·159·208·241·261); nâng doanh thu thuần lên ~180 nghìn tỷ và lợi nhuận sau thuế ~5.000 tỷ vào 2030 (2025: ~27,9 nghìn tỷ / 774 tỷ). IPO trên HOSE Q4/2026 và đạt chuẩn quản trị định chế (hạng ESG A− vào 2030). [Số liệu theo Financial Model Project Imperial v52.1]",
  "values": [
    "Tín nhiệm trên hết — “Giữ tín nhiệm hơn giữ vàng”",
    "Quản trị chuẩn định chế — minh bạch, tuân thủ, công bố đầy đủ (sẵn sàng niêm yết)",
    "Nguồn cung có trách nhiệm — truy xuất nguồn gốc & liêm chính chuỗi cung",
    "Khách hàng là trọng tâm — cam kết mua lại, đồng hành qua nhiều thế hệ",
    "Dẫn dắt & đặt chuẩn cho ngành vàng Việt Nam",
    "Xuất sắc vận hành & đổi mới — dữ liệu, công nghệ, mạng lưới"
  ]
}
$strat$::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
