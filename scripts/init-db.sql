-- PostgreSQL 数据库初始化脚本
-- 请先创建数据库，然后执行此脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建导航项表
CREATE TABLE IF NOT EXISTS nav_items (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  order_index INT DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  last_status_code INT,
  is_up BOOLEAN,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_nav_items_order ON nav_items(order_index, id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 插入示例数据（可选）
INSERT INTO nav_items (label, url, order_index) VALUES 
  ('Google', 'https://www.google.com', 1),
  ('GitHub', 'https://github.com', 2),
  ('Stack Overflow', 'https://stackoverflow.com', 3)
ON CONFLICT DO NOTHING;

-- 显示表结构
\d users
\d nav_items

SELECT 'Database initialization completed!' as status;