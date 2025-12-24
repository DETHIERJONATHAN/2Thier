SELECT 'Tables' as type, COUNT(*) as count FROM information_schema.tables WHERE table_schema='public'
UNION ALL
SELECT 'Lead', COUNT(*) FROM "Lead"
UNION ALL
SELECT 'User', COUNT(*) FROM "User"
UNION ALL
SELECT 'Organization', COUNT(*) FROM "Organization";
