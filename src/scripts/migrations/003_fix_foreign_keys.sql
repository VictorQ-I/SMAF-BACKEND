-- Migración para corregir las claves foráneas duplicadas en transactions
-- Fecha: 2025-10-15

-- Eliminar las restricciones antiguas que apuntan a users_v1
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_reviewedBy_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_userId_fkey;

-- Las restricciones correctas (fk_transactions_reviewer y fk_transactions_user) ya existen
-- y apuntan correctamente a la tabla users

-- Verificar las restricciones restantes
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'transactions'
ORDER BY tc.constraint_name;
