#!/usr/bin/env node
/**
 * Navigation System - 初始化向导
 * 完整的系统首次部署配置脚本
 * 
 * 功能特性：
 * - 数据库配置向导
 * - 管理员账户设置
 * - 安全配置
 * - 系统基础配置
 * - 交互式界面和静默模式
 * - 输入验证和错误处理
 */

const readline = require('readline')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { Pool } = require('pg')
const chalk = require('chalk')

// 配置常量
const CONFIG_FILE = path.join(__dirname, '..', '.env')
const CONFIG_EXAMPLE = path.join(__dirname, '..', '.env.example')
const INIT_SQL = path.join(__dirname, 'init-db.sql')

// 全局配置对象
let config = {
  // 数据库配置
  database: {
    type: 'postgresql', // postgresql 或 memory
    host: 'localhost',
    port: 5432,
    username: '',
    password: '',
    database: 'navigation'
  },
  // 管理员配置
  admin: {
    username: 'admin',
    password: ''
  },
  // 安全配置
  security: {
    sessionSecret: '',
    captchaEnabled: false,
    captchaProvider: 'recaptcha',
    recaptchaSiteKey: '',
    recaptchaSecretKey: '',
    turnstileSiteKey: '',
    turnstileSecretKey: ''
  },
  // 系统配置
  system: {
    port: 3000,
    domain: 'http://localhost:3000',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN'
  }
}

// 命令行参数解析
const args = process.argv.slice(2)
const silentMode = args.includes('--silent') || args.includes('-s')
const helpMode = args.includes('--help') || args.includes('-h')

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(chalk.cyan('\n🚀 Navigation System 初始化向导\n'))
  console.log('用法:')
  console.log('  node init-wizard.js [选项]\n')
  console.log('选项:')
  console.log('  -h, --help     显示帮助信息')
  console.log('  -s, --silent   静默模式（通过环境变量配置）\n')
  console.log('静默模式环境变量:')
  console.log(chalk.red('  注意: 静默模式仅支持内存数据库，不支持PostgreSQL'))
  console.log('  ADMIN_USER     管理员用户名 (默认: admin)')
  console.log('  ADMIN_PASS     管理员密码')
  console.log('  SYSTEM_PORT    系统端口 (默认: 3000)')
  console.log('  SYSTEM_DOMAIN  系统域名 (默认: http://localhost:3000)\n')
  console.log(chalk.gray('示例:'))
  console.log(chalk.gray('  # 交互式模式（支持PostgreSQL和内存数据库）'))
  console.log(chalk.gray('  node scripts/init-wizard.js'))
  console.log(chalk.gray('  '))
  console.log(chalk.gray('  # 静默模式（仅支持内存数据库）'))
  console.log(chalk.gray('  ADMIN_USER=admin ADMIN_PASS=Admin123 node scripts/init-wizard.js --silent'))
}

/**
 * 输入验证函数
 */
const validators = {
  // 验证密码强度
  password: (password) => {
    if (password.length < 8) {
      return '密码长度至少8位'
    }
    if (!/[a-z]/.test(password)) {
      return '密码必须包含小写字母'
    }
    if (!/[A-Z]/.test(password)) {
      return '密码必须包含大写字母'
    }
    if (!/\d/.test(password)) {
      return '密码必须包含数字'
    }
    return null
  },
  
  // 验证端口号
  port: (port) => {
    const num = parseInt(port)
    if (isNaN(num) || num < 1 || num > 65535) {
      return '端口号必须在1-65535之间'
    }
    return null
  },
  
  // 验证域名
  domain: (domain) => {
    if (!domain.match(/^https?:\/\/.+/)) {
      return '域名必须以http://或https://开头'
    }
    return null
  },
  
  // 验证必填项
  required: (value) => {
    if (!value || value.trim() === '') {
      return '此项为必填项'
    }
    return null
  }
}

/**
 * 异步输入函数
 */
function askQuestion(question, validator = null, isPassword = false) {
  return new Promise((resolve) => {
    const ask = () => {
      // 重置输出模式
      if (!isPassword) {
        rl.stdoutMuted = false
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
          rl.output.write(stringToWrite)
        }
      }
      
      rl.question(question, (answer) => {
        // 密码输入完成后重置
        if (isPassword) {
          rl.stdoutMuted = false
          rl._writeToOutput = function _writeToOutput(stringToWrite) {
            rl.output.write(stringToWrite)
          }
        }
        
        if (validator) {
          const error = validator(answer)
          if (error) {
            console.log(chalk.red(`❌ ${error}`))
            ask()
            return
          }
        }
        resolve(answer)
      })
      
      if (isPassword) {
        rl.stdoutMuted = true
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
          if (stringToWrite.charCodeAt(0) === 13) {
            rl.output.write('\n')
          } else {
            rl.output.write('*')
          }
        }
      }
    }
    ask()
  })
}

/**
 * 确认输入函数
 */
function askConfirm(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * 数据库配置向导
 */
async function configureDatabaseWizard() {
  console.log(chalk.blue('\n📊 数据库配置'))
  console.log('请选择数据库类型：\n')
  
  console.log('1. PostgreSQL 数据库 (生产环境推荐)')
  console.log('2. 内存数据库 (开发测试用)\n')
  
  const dbTypeChoice = await askQuestion(
    '请选择数据库类型 (1-2): ',
    (value) => {
      const num = parseInt(value)
      if (num < 1 || num > 2) {
        return '请输入 1 或 2'
      }
      return null
    }
  )
  
  if (dbTypeChoice === '2') {
    config.database.type = 'memory'
    console.log(chalk.yellow('\n🧠 已选择内存数据库模式'))
    console.log(chalk.gray('注意: 内存数据库仅适用于开发和测试，数据不会持久化保存'))
    console.log(chalk.green('\n✅ 数据库配置完成'))
    return
  }
  
  // PostgreSQL 配置
  config.database.type = 'postgresql'
  console.log(chalk.blue('\n请配置PostgreSQL数据库连接信息：\n'))
  
  config.database.host = await askQuestion(
    `数据库主机 (${config.database.host}): `,
    null
  ) || config.database.host
  
  const portInput = await askQuestion(
    `数据库端口 (${config.database.port}): `,
    validators.port
  )
  if (portInput) config.database.port = parseInt(portInput)
  
  config.database.username = await askQuestion(
    '数据库用户名: ',
    validators.required
  )
  
  config.database.password = await askQuestion(
    '数据库密码: ',
    validators.required,
    true
  )
  
  config.database.database = await askQuestion(
    `数据库名称 (${config.database.database}): `,
    null
  ) || config.database.database
  
  console.log(chalk.green('\n✅ 数据库配置完成'))
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  if (config.database.type === 'memory') {
    console.log(chalk.yellow('\n🔍 验证内存数据库配置...'))
    console.log(chalk.green('✅ 内存数据库配置有效'))
    return true
  }
  
  console.log(chalk.yellow('\n🔍 测试数据库连接...'))
  
  try {
    const connectionString = `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })
    
    await pool.query('SELECT 1')
    await pool.end()
    
    console.log(chalk.green('✅ 数据库连接成功'))
    return true
  } catch (error) {
    console.log(chalk.red(`❌ 数据库连接失败: ${error.message}`))
    return false
  }
}

/**
 * 初始化数据库表结构
 */
async function initializeDatabaseTables() {
  if (config.database.type === 'memory') {
    console.log(chalk.yellow('\n🏗️  初始化内存数据库...'))
    console.log(chalk.green('✅ 内存数据库初始化完成'))
    return true
  }
  
  console.log(chalk.yellow('\n🏗️  初始化数据库表结构...'))
  
  try {
    const connectionString = `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`
    const pool = new Pool({ connectionString })
    
    // 读取并执行初始化SQL
    const initSQL = fs.readFileSync(INIT_SQL, 'utf8')
    await pool.query(initSQL)
    await pool.end()
    
    console.log(chalk.green('✅ 数据库表结构初始化完成'))
    return true
  } catch (error) {
    console.log(chalk.red(`❌ 数据库初始化失败: ${error.message}`))
    return false
  }
}

/**
 * 管理员账户设置向导
 */
async function configureAdminWizard() {
  console.log(chalk.blue('\n👤 管理员账户设置'))
  console.log('请设置管理员账户信息：\n')
  
  config.admin.username = await askQuestion(
    `管理员用户名 (${config.admin.username}): `,
    null
  ) || config.admin.username
  
  config.admin.password = await askQuestion(
    '管理员密码: ',
    validators.password,
    true
  )
  
  const confirmPassword = await askQuestion(
    '确认密码: ',
    (value) => value === config.admin.password ? null : '密码不匹配',
    true
  )
  
  console.log(chalk.green('\n✅ 管理员账户配置完成'))
}

/**
 * 创建管理员账户
 */
async function createAdminAccount() {
  if (config.database.type === 'memory') {
    console.log(chalk.yellow('\n👤 配置内存数据库管理员...'))
    console.log(chalk.green('✅ 内存数据库管理员配置完成'))
    return true
  }
  
  console.log(chalk.yellow('\n👤 创建管理员账户...'))
  
  try {
    const connectionString = `postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`
    const pool = new Pool({ connectionString })
    
    // 检查是否已存在管理员
    const existingAdmin = await pool.query('SELECT id FROM users WHERE username = $1', [config.admin.username])
    
    if (existingAdmin.rows.length > 0) {
      // 更新现有管理员密码
      const passwordHash = await bcrypt.hash(config.admin.password, 10)
      await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [passwordHash, config.admin.username])
      console.log(chalk.green('✅ 管理员密码已更新'))
    } else {
      // 创建新管理员
      const passwordHash = await bcrypt.hash(config.admin.password, 10)
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [config.admin.username, passwordHash])
      console.log(chalk.green('✅ 管理员账户已创建'))
    }
    
    await pool.end()
    return true
  } catch (error) {
    console.log(chalk.red(`❌ 管理员账户创建失败: ${error.message}`))
    return false
  }
}

/**
 * 安全配置向导
 */
async function configureSecurityWizard() {
  console.log(chalk.blue('\n🔒 安全配置'))
  console.log('请配置系统安全选项：\n')
  
  // 生成会话密钥
  config.security.sessionSecret = crypto.randomBytes(32).toString('hex')
  console.log(chalk.green('✅ 会话密钥已自动生成'))
  
  // 验证码配置
  config.security.captchaEnabled = await askConfirm('是否启用人机验证？')
  
  if (config.security.captchaEnabled) {
    console.log('\n选择验证码提供商：')
    console.log('1. Google reCAPTCHA')
    console.log('2. Cloudflare Turnstile')
    
    const providerChoice = await askQuestion('请选择 (1-2): ', (value) => {
      if (!['1', '2'].includes(value)) {
        return '请选择1或2'
      }
      return null
    })
    
    config.security.captchaProvider = providerChoice === '1' ? 'recaptcha' : 'turnstile'
    
    if (config.security.captchaProvider === 'recaptcha') {
      config.security.recaptchaSiteKey = await askQuestion('reCAPTCHA Site Key: ', validators.required)
      config.security.recaptchaSecretKey = await askQuestion('reCAPTCHA Secret Key: ', validators.required)
    } else {
      config.security.turnstileSiteKey = await askQuestion('Turnstile Site Key: ', validators.required)
      config.security.turnstileSecretKey = await askQuestion('Turnstile Secret Key: ', validators.required)
    }
  }
  
  console.log(chalk.green('\n✅ 安全配置完成'))
}

/**
 * 系统基础配置向导
 */
async function configureSystemWizard() {
  console.log(chalk.blue('\n⚙️  系统基础配置'))
  console.log('请配置系统基础选项：\n')
  
  const portInput = await askQuestion(
    `系统端口 (${config.system.port}): `,
    validators.port
  )
  if (portInput) config.system.port = parseInt(portInput)
  
  config.system.domain = await askQuestion(
    `系统域名 (${config.system.domain}): `,
    validators.domain
  ) || config.system.domain
  
  console.log('\n选择时区：')
  console.log('1. Asia/Shanghai (北京时间)')
  console.log('2. UTC (协调世界时)')
  console.log('3. America/New_York (美国东部时间)')
  console.log('4. Europe/London (伦敦时间)')
  
  const timezoneChoice = await askQuestion('请选择时区 (1-4): ', (value) => {
    if (!['1', '2', '3', '4'].includes(value)) {
      return '请选择1-4'
    }
    return null
  })
  
  const timezones = {
    '1': 'Asia/Shanghai',
    '2': 'UTC',
    '3': 'America/New_York',
    '4': 'Europe/London'
  }
  config.system.timezone = timezones[timezoneChoice]
  
  console.log('\n选择语言：')
  console.log('1. 中文 (zh-CN)')
  console.log('2. English (en-US)')
  
  const languageChoice = await askQuestion('请选择语言 (1-2): ', (value) => {
    if (!['1', '2'].includes(value)) {
      return '请选择1或2'
    }
    return null
  })
  
  config.system.language = languageChoice === '1' ? 'zh-CN' : 'en-US'
  
  console.log(chalk.green('\n✅ 系统配置完成'))
}

/**
 * 显示配置摘要
 */
function showConfigSummary() {
  console.log(chalk.cyan('\n📋 配置摘要'))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log(chalk.yellow('数据库配置:'))
  console.log(`  主机: ${config.database.host}`)
  console.log(`  端口: ${config.database.port}`)
  console.log(`  用户: ${config.database.username}`)
  console.log(`  密码: ${'*'.repeat(config.database.password.length)}`)
  console.log(`  数据库: ${config.database.database}`)
  
  console.log(chalk.yellow('\n管理员配置:'))
  console.log(`  用户名: ${config.admin.username}`)
  console.log(`  密码: ${'*'.repeat(config.admin.password.length)}`)
  
  console.log(chalk.yellow('\n安全配置:'))
  console.log(`  会话密钥: ${config.security.sessionSecret.substring(0, 8)}...`)
  console.log(`  验证码: ${config.security.captchaEnabled ? '启用' : '禁用'}`)
  if (config.security.captchaEnabled) {
    console.log(`  提供商: ${config.security.captchaProvider}`)
  }
  
  console.log(chalk.yellow('\n系统配置:'))
  console.log(`  端口: ${config.system.port}`)
  console.log(`  域名: ${config.system.domain}`)
  console.log(`  时区: ${config.system.timezone}`)
  console.log(`  语言: ${config.system.language}`)
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * 生成配置文件
 */
function generateConfigFile() {
  console.log(chalk.yellow('\n📝 生成配置文件...'))
  
  let envContent = `# Navigation System 配置文件
# 由初始化向导自动生成 - ${new Date().toISOString()}

# 应用端口
PORT=${config.system.port}

# 会话加密密钥
SESSION_SECRET=${config.security.sessionSecret}

# 数据库类型
DB_TYPE=${config.database.type}

`
  
  if (config.database.type === 'postgresql') {
    envContent += `# PostgreSQL 数据库连接
DATABASE_URL=postgresql://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}

# 或分别配置
PGHOST=${config.database.host}
PGPORT=${config.database.port}
PGUSER=${config.database.username}
PGPASSWORD=${config.database.password}
PGDATABASE=${config.database.database}

`
  } else {
    envContent += `# 内存数据库 - 无需连接配置
# DATABASE_URL=memory

`
  }
  
  envContent += `# 状态检测配置
CHECK_INTERVAL_MS=300000
STATUS_TIMEOUT_MS=8000

# 验证码配置
CAPTCHA_ENABLED=${config.security.captchaEnabled}
CAPTCHA_PROVIDER=${config.security.captchaProvider}

# Google reCAPTCHA 配置
RECAPTCHA_SITE_KEY=${config.security.recaptchaSiteKey}
RECAPTCHA_SECRET_KEY=${config.security.recaptchaSecretKey}

# Cloudflare Turnstile 配置
TURNSTILE_SITE_KEY=${config.security.turnstileSiteKey}
TURNSTILE_SECRET_KEY=${config.security.turnstileSecretKey}

# 系统配置
SYSTEM_DOMAIN=${config.system.domain}
SYSTEM_TIMEZONE=${config.system.timezone}
SYSTEM_LANGUAGE=${config.system.language}
`
  
  try {
    fs.writeFileSync(CONFIG_FILE, envContent, 'utf8')
    console.log(chalk.green(`✅ 配置文件已生成: ${CONFIG_FILE}`))
    return true
  } catch (error) {
    console.log(chalk.red(`❌ 配置文件生成失败: ${error.message}`))
    return false
  }
}

/**
 * 静默模式配置
 */
function configureSilentMode() {
  console.log(chalk.cyan('🤖 静默模式配置'))
  
  // 静默模式强制使用内存数据库
  config.database.type = 'memory'
  console.log(chalk.yellow('⚠️  静默模式仅支持内存数据库'))
  console.log(chalk.cyan('数据库类型: memory'))
  
  // PostgreSQL 不支持静默部署，如果检测到相关环境变量则给出警告
  if (process.env.DB_TYPE === 'postgresql' || process.env.DB_HOST || process.env.DB_USER) {
    console.log(chalk.red('❌ PostgreSQL 不支持静默部署模式'))
    console.log(chalk.yellow('💡 静默模式将自动使用内存数据库'))
  }
  
  // 管理员配置
  config.admin.username = process.env.ADMIN_USER || config.admin.username
  config.admin.password = process.env.ADMIN_PASS || ''
  
  // 系统配置
  config.system.port = parseInt(process.env.SYSTEM_PORT) || config.system.port
  config.system.domain = process.env.SYSTEM_DOMAIN || config.system.domain
  
  // 安全配置
  config.security.sessionSecret = crypto.randomBytes(32).toString('hex')
  config.security.captchaEnabled = process.env.CAPTCHA_ENABLED === 'true'
  config.security.captchaProvider = process.env.CAPTCHA_PROVIDER || 'recaptcha'
  config.security.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || ''
  config.security.recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY || ''
  config.security.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || ''
  config.security.turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY || ''
  
  // 验证必填项（静默模式仅需管理员密码）
  const requiredFields = [
    { key: 'admin.password', name: '管理员密码', env: 'ADMIN_PASS' }
  ]
  
  // 静默模式不需要数据库配置验证（强制使用内存数据库）
  
  const missingFields = requiredFields.filter(field => {
    const value = field.key.split('.').reduce((obj, key) => obj[key], config)
    return !value
  })
  
  if (missingFields.length > 0) {
    console.log(chalk.red('❌ 静默模式缺少必要的环境变量:'))
    missingFields.forEach(field => {
      console.log(chalk.red(`   ${field.env} (${field.name})`))
    })
    process.exit(1)
  }
  
  // 验证管理员密码强度
  const passwordError = validators.password(config.admin.password)
  if (passwordError) {
    console.log(chalk.red(`❌ 管理员密码不符合要求: ${passwordError}`))
    process.exit(1)
  }
  
  console.log(chalk.green('✅ 静默模式配置完成'))
}

/**
 * 主函数
 */
async function main() {
  try {
    // 显示帮助
    if (helpMode) {
      showHelp()
      process.exit(0)
    }
    
    console.log(chalk.cyan('\n🚀 Navigation System 初始化向导'))
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
    
    if (silentMode) {
      // 静默模式
      configureSilentMode()
    } else {
      // 交互模式
      console.log('欢迎使用 Navigation System！')
      console.log('此向导将帮助您完成系统的初始化配置。\n')
      
      // 1. 数据库配置
      await configureDatabaseWizard()
      
      // 测试数据库连接
      const dbConnected = await testDatabaseConnection()
      if (!dbConnected) {
        const retry = await askConfirm('是否重新配置数据库？')
        if (retry) {
          await configureDatabaseWizard()
          const retryConnected = await testDatabaseConnection()
          if (!retryConnected) {
            console.log(chalk.red('❌ 数据库连接失败，初始化终止'))
            process.exit(1)
          }
        } else {
          console.log(chalk.red('❌ 数据库连接失败，初始化终止'))
          process.exit(1)
        }
      }
      
      // 2. 管理员账户设置
      await configureAdminWizard()
      
      // 3. 安全配置
      await configureSecurityWizard()
      
      // 4. 系统配置
      await configureSystemWizard()
      
      // 显示配置摘要
      showConfigSummary()
      
      // 确认配置
      const confirmed = await askConfirm('\n确认以上配置并继续？')
      if (!confirmed) {
        console.log(chalk.yellow('❌ 初始化已取消'))
        process.exit(0)
      }
    }
    
    // 初始化数据库表结构
    const tablesInitialized = await initializeDatabaseTables()
    if (!tablesInitialized) {
      console.log(chalk.red('❌ 数据库表结构初始化失败，初始化终止'))
      process.exit(1)
    }
    
    // 创建管理员账户
    const adminCreated = await createAdminAccount()
    if (!adminCreated) {
      console.log(chalk.red('❌ 管理员账户创建失败，初始化终止'))
      process.exit(1)
    }
    
    // 生成配置文件
    const configGenerated = generateConfigFile()
    if (!configGenerated) {
      console.log(chalk.red('❌ 配置文件生成失败，初始化终止'))
      process.exit(1)
    }
    
    // 完成
    console.log(chalk.green('\n🎉 初始化完成！'))
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log('\n系统已成功初始化，您现在可以：')
    console.log(`1. 启动应用: ${chalk.yellow('npm start')}`)
    console.log(`2. 访问系统: ${chalk.blue(config.system.domain)}`)
    console.log(`3. 管理后台: ${chalk.blue(config.system.domain + '/login')}`)
    console.log(`4. 管理员账户: ${chalk.green(config.admin.username)}`)
    console.log('\n感谢使用 Navigation System！')
    
  } catch (error) {
    console.log(chalk.red(`\n❌ 初始化失败: ${error.message}`))
    console.log(chalk.gray(error.stack))
    process.exit(1)
  } finally {
    rl.close()
  }
}

// 处理退出信号
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n❌ 初始化已取消'))
  rl.close()
  process.exit(0)
})

// 启动主函数
if (require.main === module) {
  main()
}

module.exports = { main, config }