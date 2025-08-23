-- 数据库隐私数据清理脚本
-- 警告：此脚本将删除所有用户数据和导航项数据
-- 执行前请确保已备份重要数据

-- 清空所有表数据并重置自增ID
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE nav_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE login_attempts RESTART IDENTITY CASCADE;

-- 验证清理结果
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'nav_items' as table_name, COUNT(*) as record_count FROM nav_items
UNION ALL
SELECT 'login_attempts' as table_name, COUNT(*) as record_count FROM login_attempts;

SELECT '数据库清理完成！所有隐私数据已被彻底删除。' as status;