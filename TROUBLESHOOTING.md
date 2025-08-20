# 🔧 AugmentCode 脚本配置故障排除指南

## 问题: "API邮箱服务未启用"

### 🎯 问题原因
这个错误通常是由以下原因之一造成的：

1. **未勾选启用复选框** (最常见)
2. **配置未正确保存**
3. **URL格式不正确**

### ✅ 解决步骤

#### 步骤1: 检查复选框状态
1. 打开脚本UI
2. 展开"高级配置"区域
3. 找到"API邮箱服务"配置项
4. **确保"启用API邮箱模式"复选框被勾选** ☑️

#### 步骤2: 正确填写URL
```
☑️ 启用API邮箱模式 (必须勾选!)

📧 获取邮箱API地址:
http://localhost:3000/api/get-email

🔐 获取验证码API地址:
http://localhost:3000/api/get-code?email={email}
```

**重要**: 验证码URL必须包含 `?email={email}` 参数！

#### 步骤3: 保存配置
1. 点击"保存配置"按钮
2. 查看日志确认保存成功
3. 应该看到类似信息：
   ```
   ✅ API邮箱配置已保存
   📧 启用状态: 是
   🔗 获取邮箱API: http://localhost:3000/api/get-email
   🔗 获取验证码API: http://localhost:3000/api/get-code?email={email}
   ```

#### 步骤4: 测试连接
1. 点击"测试连接"按钮
2. 查看详细的调试信息
3. 确认服务器正在运行

### 🔍 调试信息解读

现在脚本会显示详细的调试信息，帮助您定位问题：

```
🔧 调试信息:
  - 复选框状态: true/false
  - 获取邮箱URL: [您的URL]
  - 获取验证码URL: [您的URL]

💾 保存后的状态:
  - apiEmailEnabled: true/false
  - apiEmailGetURL: [保存的URL]
  - apiEmailCodeURL: [保存的URL]
```

### 🚨 常见错误及解决方案

#### 错误1: "复选框状态: false"
**解决**: 勾选"启用API邮箱模式"复选框

#### 错误2: "获取邮箱URL: " (空白)
**解决**: 填写完整的获取邮箱API地址

#### 错误3: "获取验证码URL: http://localhost:3000/api/get-code"
**解决**: URL必须包含参数，改为：
`http://localhost:3000/api/get-code?email={email}`

#### 错误4: 保存后状态与输入不一致
**解决**: 
1. 刷新页面重新配置
2. 检查浏览器控制台是否有JavaScript错误
3. 确保脚本正确加载

### 🔄 完整的配置流程

1. **确认服务器运行**
   ```bash
   # 检查服务器状态
   curl http://localhost:3000/health
   ```

2. **打开脚本UI**
   - 在包含脚本的页面上找到脚本UI

3. **展开高级配置**
   - 点击"高级配置"展开配置区域

4. **配置API邮箱服务**
   ```
   ☑️ 启用API邮箱模式
   📧 获取邮箱API地址: http://localhost:3000/api/get-email
   🔐 获取验证码API地址: http://localhost:3000/api/get-code?email={email}
   ```

5. **保存并测试**
   - 点击"保存配置"
   - 点击"测试连接"
   - 查看日志确认成功

### 🧪 手动测试API

如果脚本测试失败，可以手动测试API：

```bash
# 测试获取邮箱
curl http://localhost:3000/api/get-email

# 测试获取验证码
curl "http://localhost:3000/api/get-code?email=test@example.com"

# 检查服务器状态
curl http://localhost:3000/health
```

### 📊 服务器日志检查

查看服务器终端，确认请求被正确接收：

```
[时间戳] GET /api/get-email
✅ 生成新邮箱: xxx@xxx.com

[时间戳] GET /api/get-code?email=test@example.com
✅ 为邮箱 test@example.com 生成验证码: 123456
```

### 🔧 高级故障排除

#### 问题: 配置保存但测试仍失败

1. **检查StateManager状态**
   - 在浏览器控制台执行：
   ```javascript
   console.log(StateManager.app.apiEmailEnabled);
   console.log(StateManager.app.apiEmailGetURL);
   console.log(StateManager.app.apiEmailCodeURL);
   ```

2. **检查GM存储**
   - 确认Tampermonkey/Greasemonkey正常工作
   - 检查脚本权限设置

3. **重置配置**
   - 清除所有配置重新设置
   - 刷新页面重新加载脚本

#### 问题: 网络连接失败

1. **检查端口占用**
   ```bash
   lsof -i :3000
   ```

2. **检查防火墙设置**
   - 确保localhost:3000可以访问

3. **检查CORS设置**
   - 服务器已配置CORS，应该没有跨域问题

### 📞 获取帮助

如果问题仍然存在：

1. **收集信息**
   - 脚本版本
   - 浏览器类型和版本
   - 脚本管理器类型和版本
   - 完整的错误日志

2. **检查日志**
   - 脚本日志
   - 服务器日志
   - 浏览器控制台日志

3. **提供配置信息**
   - 您的具体配置
   - 调试信息输出
   - 测试结果

---

💡 **提示**: 大多数问题都是由于未勾选"启用API邮箱模式"复选框造成的。请首先检查这一点！
