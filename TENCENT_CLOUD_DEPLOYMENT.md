# 🚀 腾讯云云开发部署指南

## 📋 问题诊断

### 常见问题 1: 访问 URL 带端口号打不开

**问题**: `https://multigpt-197343-5-1385410663.sh.run.tcloudbase.com:3000/` 无法访问
**原因**: 云平台使用标准端口(80/443)，不需要指定端口号
**解决方案**: 访问 `https://multigpt-197343-5-1385410663.sh.run.tcloudbase.com`

### 常见问题 2: 应用未部署或启动失败

**检查步骤**:

1. 登录腾讯云云开发控制台
2. 检查云函数或云托管状态
3. 查看应用日志
4. 确认环境变量是否正确设置

## 🔧 部署步骤

### 1. 环境变量配置

在腾讯云云开发控制台的环境变量设置中添加以下变量：

```bash
# 应用基础配置
APP_NAME=MultiGPT Platform
APP_URL=https://multigpt-197343-5-1385410663.sh.run.tcloudbase.com
NEXT_PUBLIC_APP_URL=https://multigpt-197343-5-1385410663.sh.run.tcloudbase.com
NODE_ENV=production

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://arpgaaseuxcvrwdxayzf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的Supabase服务角色密钥

# 微信云开发
NEXT_PUBLIC_WECHAT_CLOUDBASE_ID=你的微信云开发ID

# Stripe 支付
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=你的Stripe公钥
STRIPE_SECRET_KEY=你的Stripe私钥
STRIPE_WEBHOOK_SECRET=你的Stripe webhook密钥

# PayPal 支付
PAYPAL_CLIENT_ID=你的PayPal客户端ID
PAYPAL_CLIENT_SECRET=你的PayPal客户端密钥
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=你的PayPal webhook ID

# 支付宝支付
ALIPAY_APP_ID=你的支付宝应用ID
ALIPAY_GATEWAY_URL=https://openapi-sandbox.dl.alipaydev.com/gateway.do
ALIPAY_SANDBOX=true
ALIPAY_PRIVATE_KEY=你的支付宝私钥
ALIPAY_PUBLIC_KEY=你的支付宝公钥

# AI 服务
DEEPSEEK_API_KEY=你的DeepSeek API密钥
OPENAI_API_KEY=你的OpenAI API密钥
ANTHROPIC_API_KEY=你的Anthropic API密钥

# 地理位置服务
IP_API_URL=https://ipapi.co/json/
GEO_CACHE_TTL=3600000
```

### 2. 部署应用

#### 选项 1: 云函数部署

```bash
# 安装腾讯云CLI
npm install -g @cloudbase/cli

# 登录腾讯云
tcb login

# 部署到云函数
tcb fn deploy app --envId multigpt-197343-5-1385410663
```

#### 选项 2: 云托管部署

```bash
# 安装腾讯云CLI
npm install -g @cloudbase/cli

# 登录腾讯云
tcb login

# 部署到云托管
tcb hosting deploy . --envId multigpt-197343-5-1385410663
```

### 3. 验证部署

运行环境变量检查脚本：

```bash
node scripts/check-cloudbase-env.js
```

### 4. 访问应用

部署成功后，访问：

```
https://multigpt-197343-5-1385410663.sh.run.tcloudbase.com
```

## 🔍 故障排除

### 检查应用状态

1. 登录腾讯云云开发控制台
2. 查看云函数/云托管的状态
3. 检查日志输出

### 常见错误解决

#### 环境变量未设置

- 在云开发控制台的环境变量页面检查所有必需变量
- 重新部署应用

#### 依赖安装失败

- 检查 package.json 中的依赖版本
- 确认 Node.js 版本兼容性

#### 数据库连接失败

- 验证 Supabase URL 和密钥
- 检查网络连接

#### AI 服务不可用

- 确认 API 密钥有效性
- 检查 API 调用限额

## 📞 技术支持

如果问题持续存在，请：

1. 查看腾讯云云开发控制台的日志
2. 检查浏览器开发者工具的网络请求
3. 联系技术支持团队
