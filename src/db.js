const { Pool } = require('pg');
const { newDb } = require('pg-mem');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const crypto = require('crypto');

const db = {
  pool: null,
  inMemory: false,

  async init() {
    // Try connect to PostgreSQL
    try {
      const connectionString = process.env.DATABASE_URL || undefined;
      let poolConfig = {};
      if (connectionString) {
        poolConfig.connectionString = connectionString;
        console.log('[DB] 尝试连接 PostgreSQL (使用 DATABASE_URL)...');
      } else {
        poolConfig = {
          host: process.env.PGHOST || 'localhost',
          port: Number(process.env.PGPORT) || 5432,
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || '',
          database: process.env.PGDATABASE || 'navigation'
        };
        console.log(`[DB] 尝试连接 PostgreSQL (${poolConfig.host}:${poolConfig.port}/${poolConfig.database})...`);
      }
      
      // 设置连接超时
      poolConfig.connectionTimeoutMillis = 5000;
      poolConfig.idleTimeoutMillis = 30000;
      
      this.pool = new Pool(poolConfig);
      await this.pool.query('SELECT 1');
      this.inMemory = false;
      console.log('[DB] ✅ PostgreSQL 连接成功！');
      await this._migrate();
      return;
    } catch (err) {
      console.warn('[DB] ❌ PostgreSQL 连接失败:', err.message);
      console.warn('[DB] 🔄 自动回退到内存数据库 (pg-mem)，仅供开发预览使用');
      console.warn('[DB] 💡 如需使用 PostgreSQL，请检查 .env 配置或参考 README-PostgreSQL.md');
      
      const adb = newDb();
      const adapter = adb.adapters.createPg();
      const MemPool = adapter.Pool;
      this.pool = new MemPool();
      this.inMemory = true;
      await this._migrate();
    }
  },

  async _migrate() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(200) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS nav_items (
        id SERIAL PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        order_index INT DEFAULT 0,
        last_checked_at TIMESTAMPTZ,
        last_status_code INT,
        is_up BOOLEAN,
        response_time_ms INT
      );
    `);
    
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address INET NOT NULL,
        username VARCHAR(50),
        success BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT NOW(),
        user_agent TEXT
      )
    `);
    
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time 
      ON login_attempts(ip_address, attempted_at)
    `);
  },

  async ensureAdmin() {
    const { rows } = await this.pool.query('SELECT COUNT(*)::int AS c FROM users');
    if (rows[0].c === 0) {
      const username = 'admin';
      const initialPassword = crypto.randomBytes(6).toString('base64');
      const password_hash = await bcrypt.hash(initialPassword, 10);
      await this.pool.query('INSERT INTO users(username, password_hash) VALUES($1, $2)', [username, password_hash]);
      return { username, initialPassword };
    }
    return null;
  },

  async findUserByUsername(username) {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE username=$1', [username]);
    return rows[0] || null;
  },

  async getNavItems() {
    const { rows } = await this.pool.query('SELECT * FROM nav_items ORDER BY order_index ASC, id ASC');
    return rows;
  },

  async createNavItem({ label, url, order_index = 0 }) {
    if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
    await this.pool.query('INSERT INTO nav_items(label, url, order_index) VALUES($1, $2, $3)', [label, url, order_index]);
  },

  async deleteNavItem(id) {
    await this.pool.query('DELETE FROM nav_items WHERE id=$1', [id]);
  },

  async updateNavItem(id, { label, url, order_index }) {
    if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
    await this.pool.query(
      'UPDATE nav_items SET label=$1, url=$2, order_index=$3 WHERE id=$4',
      [label, url, order_index, id]
    );
  },

  async getNavItemById(id) {
    const { rows } = await this.pool.query('SELECT * FROM nav_items WHERE id=$1', [id]);
    return rows[0] || null;
  },

  async updateNavItemsOrder(items) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          'UPDATE nav_items SET order_index=$1 WHERE id=$2',
          [item.order_index, item.id]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async recordLoginAttempt(ipAddress, username, success, userAgent) {
    await this.pool.query(
      'INSERT INTO login_attempts(ip_address, username, success, user_agent) VALUES($1, $2, $3, $4)',
      [ipAddress, username, success, userAgent]
    );
  },

  async getFailedLoginAttempts(ipAddress, timeWindowMinutes = 15) {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE ip_address = $1 AND success = false 
       AND attempted_at > NOW() - INTERVAL '${timeWindowMinutes} minutes'`,
      [ipAddress]
    );
    return parseInt(rows[0].count);
  },

  async isIpBlocked(ipAddress, maxAttempts = 5, timeWindowMinutes = 15) {
    const failedAttempts = await this.getFailedLoginAttempts(ipAddress, timeWindowMinutes);
    return failedAttempts >= maxAttempts;
  },

  async getBlockTimeRemaining(ipAddress, timeWindowMinutes = 15) {
    const { rows } = await this.pool.query(
      `SELECT attempted_at FROM login_attempts 
       WHERE ip_address = $1 AND success = false 
       ORDER BY attempted_at DESC LIMIT 1`,
      [ipAddress]
    );
    
    if (rows.length === 0) return 0;
    
    const lastAttempt = new Date(rows[0].attempted_at);
    const blockUntil = new Date(lastAttempt.getTime() + timeWindowMinutes * 60 * 1000);
    const now = new Date();
    
    return Math.max(0, Math.ceil((blockUntil - now) / 1000 / 60)); // 返回剩余分钟数
  },

  async checkAllStatuses() {
    const { rows } = await this.pool.query('SELECT * FROM nav_items ORDER BY id');
    for (const item of rows) {
      await this._checkOne(item);
    }
  },

  async _checkOne(item) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.STATUS_TIMEOUT_MS) || 8000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    let statusCode = null;
    let isUp = false;
    try {
      const res = await fetch(item.url, { method: 'GET', redirect: 'follow', signal: controller.signal });
      statusCode = res.status;
      isUp = res.ok;
    } catch (e) {
      statusCode = null;
      isUp = false;
    } finally {
      clearTimeout(timeout);
    }
    const rt = Date.now() - start;
    await this.pool.query(
      'UPDATE nav_items SET last_checked_at=NOW(), last_status_code=$1, is_up=$2, response_time_ms=$3 WHERE id=$4',
      [statusCode, isUp, rt, item.id]
    );
  }
};

module.exports = { db };