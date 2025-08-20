#!/usr/bin/env node

/**
 * AugmentCode 脚本测试 API 服务器
 * 提供邮箱获取、验证码获取和数据上传接口
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码请求体

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`  Query: ${JSON.stringify(req.query)}`);
  }
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`  Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  next();
});

// 存储生成的邮箱和验证码的映射
const emailCodeMap = new Map();
const generatedEmails = [];

// 生成随机邮箱
function generateRandomEmail() {
  const domains = ['testmail.com', 'example.org', 'demo.net', 'temp.email'];
  const prefixes = ['test', 'demo', 'user', 'temp', 'api'];
  const numbers = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const timestamp = Date.now().toString(36);
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  return `${prefix}${numbers}${timestamp}@${domain}`;
}

// 生成随机验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== API 接口 ====================

/**
 * 接口1: 获取邮箱地址
 * GET /api/get-email
 */
app.get('/api/get-email', (req, res) => {
  try {
    const email = generateRandomEmail();
    generatedEmails.push({
      email,
      createdAt: new Date().toISOString()
    });
    
    console.log(`✅ 生成新邮箱: ${email}`);
    
    // 支持多种响应格式，测试脚本的解析能力
    const responseFormat = req.query.format || 'standard';
    
    switch (responseFormat) {
      case 'simple':
        res.json(email);
        break;
      case 'nested':
        res.json({
          success: true,
          data: {
            email: email,
            type: 'temporary'
          }
        });
        break;
      default:
        res.json({
          email: email,
          timestamp: new Date().toISOString(),
          expires_in: 3600
        });
    }
  } catch (error) {
    console.error('❌ 获取邮箱失败:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 接口2: 获取验证码
 * GET /api/get-code?email=xxx
 */
app.get('/api/get-code', (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Email parameter is required'
      });
    }
    
    // 生成验证码
    const code = generateVerificationCode();
    emailCodeMap.set(email, {
      code,
      createdAt: new Date().toISOString(),
      used: false
    });
    
    console.log(`✅ 为邮箱 ${email} 生成验证码: ${code}`);
    
    // 支持多种响应格式
    const responseFormat = req.query.format || 'standard';
    
    switch (responseFormat) {
      case 'simple':
        res.json(code);
        break;
      case 'nested':
        res.json({
          success: true,
          data: {
            verification_code: code,
            email: email
          }
        });
        break;
      default:
        res.json({
          code: code,
          email: email,
          timestamp: new Date().toISOString(),
          expires_in: 300
        });
    }
  } catch (error) {
    console.error('❌ 获取验证码失败:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 接口3: 数据上传接口
 * POST/PUT/PATCH /api/upload
 */
const uploadHandler = (req, res) => {
  try {
    const method = req.method;
    const { token, augment_token, url, timestamp } = req.body;
    
    console.log(`✅ 收到${method}上传请求:`);
    console.log(`  - Token: ${token ? token.substring(0, 10) + '...' : '未提供'}`);
    console.log(`  - Augment Token: ${augment_token ? augment_token.substring(0, 30) + '...' : '未提供'}`);
    console.log(`  - URL: ${url || '未提供'}`);
    console.log(`  - Timestamp: ${timestamp || '未提供'}`);
    
    // 模拟数据验证
    if (!token) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Token is required'
      });
    }
    
    if (!augment_token) {
      return res.status(400).json({
        error: 'Bad request', 
        message: 'Augment token is required'
      });
    }
    
    // 模拟成功响应
    res.json({
      success: true,
      message: 'Data uploaded successfully',
      received_at: new Date().toISOString(),
      method: method,
      data: {
        token_length: token.length,
        augment_token_length: augment_token.length,
        url: url,
        timestamp: timestamp
      }
    });
    
  } catch (error) {
    console.error('❌ 数据上传失败:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// 支持多种HTTP方法
app.post('/api/upload', uploadHandler);
app.put('/api/upload', uploadHandler);
app.patch('/api/upload', uploadHandler);

// ==================== 管理接口 ====================

/**
 * 查看生成的邮箱列表
 * GET /api/emails
 */
app.get('/api/emails', (req, res) => {
  res.json({
    total: generatedEmails.length,
    emails: generatedEmails.slice(-10) // 只显示最近10个
  });
});

/**
 * 查看验证码映射
 * GET /api/codes
 */
app.get('/api/codes', (req, res) => {
  const codes = Array.from(emailCodeMap.entries()).map(([email, data]) => ({
    email,
    ...data
  }));
  
  res.json({
    total: codes.length,
    codes: codes.slice(-10) // 只显示最近10个
  });
});

/**
 * 清除所有数据
 * DELETE /api/clear
 */
app.delete('/api/clear', (req, res) => {
  emailCodeMap.clear();
  generatedEmails.length = 0;
  
  console.log('🧹 已清除所有测试数据');
  res.json({
    success: true,
    message: 'All test data cleared'
  });
});

/**
 * 健康检查
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      get_email: '/api/get-email',
      get_code: '/api/get-code?email=xxx',
      upload: '/api/upload (POST/PUT/PATCH)'
    }
  });
});

// 根路径 - 显示API文档
app.get('/', (req, res) => {
  res.json({
    name: 'AugmentCode 脚本测试 API 服务器',
    version: '1.0.0',
    description: '为 AugmentCode 自动注册脚本提供测试接口',
    endpoints: {
      health: 'GET /health',
      get_email: 'GET /api/get-email',
      get_code: 'GET /api/get-code?email=xxx',
      upload: 'POST/PUT/PATCH /api/upload',
      view_emails: 'GET /api/emails',
      view_codes: 'GET /api/codes',
      clear_data: 'DELETE /api/clear'
    },
    usage: {
      script_config: {
        api_email_get_url: `http://localhost:${PORT}/api/get-email`,
        api_email_code_url: `http://localhost:${PORT}/api/get-code`,
        custom_upload_url: `http://localhost:${PORT}/api/upload`
      }
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.url} not found`
  });
});

// 启动服务器，监听所有接口
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 AugmentCode 测试 API 服务器已启动!');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📍 本机IP访问: http://127.0.0.1:${PORT}`);
  console.log('\n📋 可用接口:');
  console.log(`  - 获取邮箱: GET http://localhost:${PORT}/api/get-email`);
  console.log(`  - 获取验证码: GET http://localhost:${PORT}/api/get-code?email=xxx`);
  console.log(`  - 数据上传: POST http://localhost:${PORT}/api/upload`);
  console.log(`  - 健康检查: GET http://localhost:${PORT}/health`);
  console.log(`  - 查看数据: GET http://localhost:${PORT}/api/emails`);
  console.log('\n🔧 脚本配置建议:');
  console.log(`  - API邮箱获取URL: http://127.0.0.1:${PORT}/api/get-email`);
  console.log(`  - API验证码URL: http://127.0.0.1:${PORT}/api/get-code`);
  console.log(`  - 自定义上传URL: http://127.0.0.1:${PORT}/api/upload`);
  console.log('\n💡 使用 Ctrl+C 停止服务器');
  console.log('\n⚠️  如果脚本权限问题，请尝试使用 127.0.0.1 而不是 localhost');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  process.exit(0);
});
