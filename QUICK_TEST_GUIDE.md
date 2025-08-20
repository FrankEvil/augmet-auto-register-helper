# 🚀 AugmentCode 脚本测试指南

## 测试服务器状态

✅ **测试API服务器已成功启动！**

- 🌐 服务地址: `http://localhost:3000`
- 📊 状态: 运行中
- 🔧 所有接口测试通过

## 📋 脚本配置步骤

### 1. 打开脚本UI
在浏览器中打开包含AugmentCode脚本的页面，点击脚本UI。

### 2. 配置API邮箱服务
1. 展开"高级配置"区域
2. 找到"API邮箱服务"配置项
3. 进行以下配置：

```
☑️ 启用API邮箱模式
📧 获取邮箱API地址: http://localhost:3000/api/get-email
🔐 获取验证码API地址: http://localhost:3000/api/get-code
```

4. 点击"保存配置"
5. 点击"测试连接"验证配置

### 3. 配置自定义上传
1. 在同一个"高级配置"区域
2. 找到"自定义上传"配置项
3. 进行以下配置：

```
☑️ 启用自定义上传
📤 上传地址: http://localhost:3000/api/upload
📝 请求方法: POST
```

4. 点击"保存配置"
5. 点击"测试连接"验证配置

## 🧪 测试流程

### 测试1: API邮箱获取
1. 在脚本UI中点击"测试API邮箱连接"
2. 查看日志输出，应该显示：
   - ✅ 成功获取邮箱: xxx@xxx.com
   - ✅ API邮箱连接测试成功

### 测试2: 验证码获取
1. 运行脚本的注册流程
2. 当到达验证码输入页面时，脚本会自动：
   - 使用API获取验证码
   - 在日志中显示获取过程

### 测试3: 数据上传
1. 完成一次完整的注册流程
2. 脚本会自动将数据上传到测试服务器
3. 查看服务器日志确认数据接收

## 📊 监控和调试

### 查看服务器日志
服务器终端会实时显示所有API请求：
```
[时间戳] GET /api/get-email
✅ 生成新邮箱: xxx@xxx.com

[时间戳] GET /api/get-code?email=xxx@xxx.com
✅ 为邮箱 xxx@xxx.com 生成验证码: 123456

[时间戳] POST /api/upload
✅ 收到POST上传请求: ...
```

### 查看生成的数据
访问以下URL查看测试数据：
- 📧 生成的邮箱: http://localhost:3000/api/emails
- 🔐 验证码映射: http://localhost:3000/api/codes
- 🏥 服务器状态: http://localhost:3000/health

### 清除测试数据
```bash
curl -X DELETE http://localhost:3000/api/clear
```

## 🔧 高级测试选项

### 测试不同响应格式
```bash
# 标准格式
curl http://localhost:3000/api/get-email

# 简单格式
curl http://localhost:3000/api/get-email?format=simple

# 嵌套格式
curl http://localhost:3000/api/get-email?format=nested
```

### 测试不同HTTP方法
```bash
# POST上传
curl -X POST http://localhost:3000/api/upload -H "Content-Type: application/json" -d '{"token":"test","augment_token":"test","url":"test"}'

# PUT上传
curl -X PUT http://localhost:3000/api/upload -H "Content-Type: application/json" -d '{"token":"test","augment_token":"test","url":"test"}'
```

## ⚠️ 注意事项

1. **服务器必须保持运行**: 测试期间不要关闭服务器终端
2. **端口占用**: 确保3000端口没有被其他程序占用
3. **网络访问**: 脚本需要能够访问localhost:3000
4. **CORS支持**: 服务器已配置CORS，支持跨域请求

## 🛑 停止服务器

测试完成后，在服务器终端按 `Ctrl+C` 停止服务器。

## 📝 测试结果记录

### 预期结果
- ✅ API邮箱获取: 返回随机邮箱地址
- ✅ 验证码获取: 返回6位数字验证码
- ✅ 数据上传: 成功接收并确认数据
- ✅ 错误处理: 正确处理各种错误情况
- ✅ 回退机制: API失败时自动回退到传统模式

### 测试检查清单
- [ ] 脚本UI配置保存成功
- [ ] API邮箱连接测试通过
- [ ] 自定义上传连接测试通过
- [ ] 完整注册流程测试
- [ ] 服务器日志显示正确的请求
- [ ] 错误处理和回退机制测试

---

🎉 **准备就绪！现在您可以开始测试脚本的新功能了。**

如有任何问题，请查看服务器日志或脚本日志获取详细信息。
