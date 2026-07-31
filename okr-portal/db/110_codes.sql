-- ============================================================================
-- OKR Portal — Mã unique (import/export): <KHỐI>-O<n> / <obj>.KR<m> / <obj>.H<k>
-- Thêm cột code cho objectives/key_results/initiatives + backfill + unique index.
-- Prefix = mã đơn vị (BL/TC/…) hoặc 'CTY' (công ty/chiến lược). Idempotent. SUPERUSER postgres.
-- ============================================================================
BEGIN;

ALTER TABLE okr_objectives  ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE okr_key_results ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE okr_initiatives ADD COLUMN IF NOT EXISTS code text;

-- 1) Objectives: <PREFIX>-O<n> (PREFIX = unit.code hoặc CTY), đánh số theo kỳ + sort.
WITH r AS (
  SELECT o.id,
         COALESCE(u.code,'CTY') AS pref,
         row_number() OVER (
           PARTITION BY COALESCE(u.code,'CTY')
           ORDER BY p.starts_on, o.sort, o.created_at
         ) AS n
    FROM okr_objectives o
    LEFT JOIN okr_units u   ON u.id = o.unit_id
    JOIN okr_periods p      ON p.id = o.period_id
)
UPDATE okr_objectives o SET code = r.pref || '-O' || r.n
  FROM r WHERE r.id = o.id;

-- 2) Key Results: <obj.code>.KR<m>
WITH r AS (
  SELECT k.id, o.code AS oc,
         row_number() OVER (PARTITION BY k.objective_id ORDER BY k.sort, k.created_at) AS n
    FROM okr_key_results k JOIN okr_objectives o ON o.id = k.objective_id
)
UPDATE okr_key_results k SET code = r.oc || '.KR' || r.n
  FROM r WHERE r.id = k.id;

-- 3) Initiatives: <obj.code>.H<k> (2 chữ số), đánh số trong từng objective
WITH r AS (
  SELECT i.id, o.code AS oc,
         row_number() OVER (PARTITION BY i.objective_id ORDER BY i.sort, i.created_at) AS n
    FROM okr_initiatives i JOIN okr_objectives o ON o.id = i.objective_id
)
UPDATE okr_initiatives i SET code = r.oc || '.H' || lpad(r.n::text, 2, '0')
  FROM r WHERE r.id = i.id;

CREATE UNIQUE INDEX IF NOT EXISTS okr_obj_code_uidx  ON okr_objectives (code)  WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS okr_kr_code_uidx   ON okr_key_results (code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS okr_init_code_uidx ON okr_initiatives (code) WHERE code IS NOT NULL;

COMMIT;
