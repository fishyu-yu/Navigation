/**
 * Navigation System Server
 * A modern navigation website system with authentication and status monitoring
 */

// Dependencies
const path = require('path')
const express = require('express')
const session = require('express-session')
const bcrypt = require('bcrypt')
const rateLimit = require('express-rate-limit')
const axios = require('axios')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Database connection
const { db } = require('./src/db')

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3000

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex')

// Express configuration
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Trust proxy for correct IP detection
// Configure trust proxy more specifically to avoid rate limit warnings
app.set('trust proxy', 1) // Trust first proxy

// CAPTCHA configuration
const CAPTCHA_CONFIG = {
  enabled: process.env.CAPTCHA_ENABLED === 'true',
  provider: process.env.CAPTCHA_PROVIDER || 'recaptcha', // 'recaptcha' or 'turnstile'
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || ''
  },
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY || '',
    secretKey: process.env.TURNSTILE_SECRET_KEY || ''
  }
}

/**
 * CAPTCHA verification function
 * Verifies CAPTCHA token with the configured provider
 * @param {string} token - CAPTCHA response token
 * @param {string} userIP - User's IP address
 * @returns {Object} Verification result with success status and message
 */
async function verifyCaptcha(token, userIP) {
  if (!CAPTCHA_CONFIG.enabled) {
    return { success: true, message: 'Development environment - CAPTCHA bypassed' }
  }

  if (!token || token === 'dev-bypass') {
    return { success: !CAPTCHA_CONFIG.enabled, message: 'Missing CAPTCHA response' }
  }

  try {
    let verifyUrl, secretKey
    
    if (CAPTCHA_CONFIG.provider === 'recaptcha') {
      verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      secretKey = CAPTCHA_CONFIG.recaptcha.secretKey;
    } else if (CAPTCHA_CONFIG.provider === 'turnstile') {
      verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
      secretKey = CAPTCHA_CONFIG.turnstile.secretKey;
    } else {
      return { success: false, message: '不支持的验证码提供商' };
    }

    if (!secretKey) {
      console.error('[Captcha] 缺少密钥配置');
      return { success: false, message: '验证码配置错误' };
    }

    const response = await axios.post(verifyUrl, null, {
      params: {
        secret: secretKey,
        response: token,
        remoteip: userIP
      },
      timeout: 5000
    });

    const result = response.data;
    
    if (result.success) {
      return { success: true, message: '验证成功' };
    } else {
      console.log('[Captcha] 验证失败:', result['error-codes']);
      return { success: false, message: '验证码验证失败' };
    }
  } catch (error) {
    console.error('[Captcha] 验证请求失败:', error.message);
    return { success: false, message: '验证码服务不可用' };
  }
}

// Rate limiting configurations
// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
})

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 admin requests per windowMs
  message: {
    error: 'Too many admin operations, please try again later',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
})

const statusCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 status check requests per minute
  message: {
    error: 'Too many status check requests, please try again later',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Middleware configuration
app.use(generalLimiter)
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  })
)

// Expose authentication info to templates
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.userId
  res.locals.username = req.session.username || null
  next()
})

/**
 * Authentication middleware
 * Redirects to login page if user is not authenticated
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login')
  next()
}

app.get('/', async (req, res) => {
  try {
    const items = await db.getNavItems();
    res.render('index', { items });
  } catch (e) {
    res.status(500).send('Server error');
  }
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('login', { error: null });
});

// 验证码配置API
app.get('/api/captcha/config', (req, res) => {
  const config = {
    enabled: CAPTCHA_CONFIG.enabled,
    provider: CAPTCHA_CONFIG.provider,
    siteKey: CAPTCHA_CONFIG.provider === 'recaptcha' 
      ? CAPTCHA_CONFIG.recaptcha.siteKey 
      : CAPTCHA_CONFIG.turnstile.siteKey
  };
  res.json(config);
});

app.post('/login', loginLimiter, async (req, res) => {
  const { username, password, captcha_response } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';
  
  try {
    // 检查IP是否被封锁
    const isBlocked = await db.isIpBlocked(ipAddress);
    if (isBlocked) {
      const remainingTime = await db.getBlockTimeRemaining(ipAddress);
      return res.render('login', { 
        error: `登录失败次数过多，请在 ${remainingTime} 分钟后重试`,
        blocked: true,
        remainingTime
      });
    }
    
    // 验证码验证（如果启用）
    if (CAPTCHA_CONFIG.enabled) {
      const captchaResult = await verifyCaptcha(captcha_response, ipAddress);
      if (!captchaResult.success) {
        // 验证码失败也记录为登录尝试
        await db.recordLoginAttempt(ipAddress, username, false, userAgent);
        return res.render('login', { 
          error: `验证码验证失败：${captchaResult.message}` 
        });
      }
    }
    
    const user = await db.findUserByUsername(username);
    const isValidLogin = user && await bcrypt.compare(password, user.password_hash);
    
    // 记录登录尝试
    await db.recordLoginAttempt(ipAddress, username, isValidLogin, userAgent);
    
    if (isValidLogin) {
      req.session.userId = user.id;
      req.session.username = user.username;
      res.redirect('/admin');
    } else {
      const failedAttempts = await db.getFailedLoginAttempts(ipAddress);
      const maxAttempts = 5;
      const remainingAttempts = Math.max(0, maxAttempts - failedAttempts);
      
      let errorMessage = '用户名或密码错误';
      if (remainingAttempts <= 2 && remainingAttempts > 0) {
        errorMessage += `，还有 ${remainingAttempts} 次尝试机会`;
      } else if (remainingAttempts === 0) {
        errorMessage = '登录失败次数过多，账户已被临时锁定';
      }
      
      res.render('login', { 
        error: errorMessage,
        remainingAttempts
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: '登录过程中发生错误，请重试' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/admin', adminLimiter, requireAuth, async (req, res) => {
  try {
    const items = await db.getNavItems();
    res.render('admin', { items, error: null });
  } catch (e) {
    res.status(500).send('Server error');
  }
});

app.post('/admin/nav/new', adminLimiter, requireAuth, async (req, res) => {
  const { label, url, order_index } = req.body;
  try {
    await db.createNavItem({ label, url, order_index: Number(order_index) || 0 });
    res.redirect('/admin');
  } catch (e) {
    res.status(400).render('admin', { items: await db.getNavItems(), error: '创建失败，请检查输入' });
  }
});

app.get('/admin/nav/:id/edit', adminLimiter, requireAuth, async (req, res) => {
  try {
    const item = await db.getNavItemById(req.params.id);
    if (!item) {
      return res.status(404).render('admin', { items: await db.getNavItems(), error: '项目不存在' });
    }
    res.render('edit', { item, error: null, ...req.session });
  } catch (e) {
    res.status(500).render('admin', { items: await db.getNavItems(), error: '获取项目失败' });
  }
});

app.post('/admin/nav/:id/edit', adminLimiter, requireAuth, async (req, res) => {
  try {
    const { label, url, order_index } = req.body;
    await db.updateNavItem(req.params.id, { label, url, order_index: Number(order_index) || 0 });
    res.redirect('/admin');
  } catch (e) {
    const item = await db.getNavItemById(req.params.id);
    res.status(400).render('edit', { item, error: '更新失败: ' + e.message, ...req.session });
  }
});

app.post('/admin/nav/reorder', adminLimiter, requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: '无效的数据格式' });
    }
    await db.updateNavItemsOrder(items);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '排序更新失败' });
  }
});

app.post('/admin/nav/:id/delete', adminLimiter, requireAuth, async (req, res) => {
  try {
    await db.deleteNavItem(req.params.id);
    res.redirect('/admin');
  } catch (e) {
    res.status(400).render('admin', { items: await db.getNavItems(), error: '删除失败' });
  }
});

app.post('/status/check', statusCheckLimiter, requireAuth, async (req, res) => {
  try {
    await db.checkAllStatuses();
    res.redirect('back');
  } catch (e) {
    res.status(500).send('状态检测失败');
  }
});

(async () => {
  await db.init();
  const firstAdmin = await db.ensureAdmin();
  if (firstAdmin && firstAdmin.initialPassword) {
    console.log('========================================');
    console.log('已创建初始管理员账号');
    console.log(`用户名: ${firstAdmin.username}`);
    console.log(`一次性初始密码(请尽快登录后修改): ${firstAdmin.initialPassword}`);
    console.log('========================================');
  }

  const interval = Number(process.env.CHECK_INTERVAL_MS) || 5 * 60 * 1000;
  setInterval(() => {
    db.checkAllStatuses().catch(() => {});
  }, interval);

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
})();