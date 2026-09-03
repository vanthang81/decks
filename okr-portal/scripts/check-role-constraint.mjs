// ============================================================================
// GÁC RÀNG BUỘC VAI TRÒ (tự động, chạy trong `npm run build` → cả QC lẫn deploy Docker).
// Bảo đảm MỌI vai trò gán được ở code (ROLES trong src/lib/rbac.ts) ĐỀU nằm trong
// CHECK constraint okr_users_role_check ở migration DB mới nhất.
// LÝ DO: 30/08 thêm vai trò 'function_lead' vào code nhưng QUÊN nới CHECK constraint DB
//   → lưu người dùng "Quản lý chức năng" ném lỗi ràng buộc (Server Components render error),
//   trong khi 'staff' vẫn lưu được. Guard này chặn tái diễn: thêm vai trò mới mà chưa có
//   migration nới constraint ⇒ build FAIL với hướng dẫn rõ.
// Thêm vai trò mới ⇒ (1) thêm vào ROLES ở rbac.ts, (2) thêm migration db/NNN_*.sql nới
//   okr_users_role_check gồm vai trò đó, (3) thêm file migration vào danh sách deploy.
// ============================================================================
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

// --- 1) Vai trò GÁN ĐƯỢC từ code: ROLES trong rbac.ts ---
const rbac = readFileSync(join(root, 'src/lib/rbac.ts'), 'utf8');
const rolesM = rbac.match(/export\s+const\s+ROLES\s*:[^=]*=\s*\[([^\]]*)\]/);
if (!rolesM) {
  console.error('✖ check-role-constraint: không tìm thấy khai báo ROLES trong src/lib/rbac.ts.');
  process.exit(1);
}
const codeRoles = [...rolesM[1].matchAll(/['"]([\w-]+)['"]/g)].map((m) => m[1]);
if (codeRoles.length === 0) {
  console.error('✖ check-role-constraint: ROLES rỗng — kiểm tra lại rbac.ts.');
  process.exit(1);
}

// --- 2) Tập vai trò DB cho phép: lấy CHECK (role IN (...)) ở migration MỚI NHẤT (số lớn nhất) ---
const dbDir = join(root, 'db');
const sqlFiles = readdirSync(dbDir)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => {
    const na = parseInt(a, 10) || 0;
    const nb = parseInt(b, 10) || 0;
    return na - nb || a.localeCompare(b);
  });

let allowed = null;
let allowedFile = null;
for (const f of sqlFiles) {
  const sql = readFileSync(join(dbDir, f), 'utf8');
  if (!/okr_users_role_check/.test(sql)) continue;
  // Bắt mệnh đề: CHECK (role IN ('a','b',...))  — sau ADD CONSTRAINT okr_users_role_check
  const m = sql.match(/okr_users_role_check[\s\S]*?CHECK\s*\(\s*role\s+IN\s*\(([^)]*)\)/i);
  if (!m) continue;
  const roles = [...m[1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1]);
  if (roles.length) {
    allowed = new Set(roles); // file số lớn hơn ghi đè → giữ constraint sau cùng (áp dụng thực tế)
    allowedFile = f;
  }
}

if (!allowed) {
  errors.push('Không tìm thấy migration nào định nghĩa CHECK okr_users_role_check trong db/ → không kiểm được ràng buộc vai trò.');
} else {
  const missing = codeRoles.filter((r) => !allowed.has(r));
  if (missing.length) {
    errors.push(
      `Vai trò [${missing.join(', ')}] gán được ở ROLES (rbac.ts) nhưng KHÔNG có trong CHECK okr_users_role_check ` +
      `(migration mới nhất: db/${allowedFile} cho phép: ${[...allowed].join(', ')}). ` +
      `Lưu người dùng các vai trò này sẽ ném lỗi ràng buộc DB. ` +
      `Thêm migration db/NNN_*.sql nới constraint gồm vai trò đó + thêm vào danh sách migrate của workflow deploy.`,
    );
  }
}

if (errors.length) {
  console.error('\n✖ Ràng buộc vai trò chưa đồng bộ code ↔ DB — sửa trước khi build:\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('');
  process.exit(1);
}
console.log(`✓ check-role-constraint: ${codeRoles.length} vai trò (${codeRoles.join(', ')}) đều nằm trong CHECK (db/${allowedFile}).`);
