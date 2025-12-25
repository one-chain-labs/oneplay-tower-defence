# 🚀 Vercel 部署指南

## 方法一：通过 Vercel Dashboard（推荐）

### 1. 准备 GitHub 仓库
```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. 导入到 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Add New Project"
3. 选择你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3. 配置环境变量
在 Vercel 项目设置中添加：

```
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=your_package_id_here
NEXT_PUBLIC_GAME_STATE_ID=your_game_state_id_here
```

### 4. 部署
点击 "Deploy" 按钮，等待部署完成！

---

## 方法二：通过 Vercel CLI

### 1. 安装 Vercel CLI
```bash
npm install -g vercel
```

### 2. 登录
```bash
vercel login
```

### 3. 部署
```bash
# 在项目根目录运行
vercel

# 或者直接部署到生产环境
vercel --prod
```

### 4. 设置环境变量
```bash
vercel env add NEXT_PUBLIC_SUI_NETWORK
# 输入: testnet

vercel env add NEXT_PUBLIC_PACKAGE_ID
# 输入你的 Package ID

vercel env add NEXT_PUBLIC_GAME_STATE_ID
# 输入你的 GameState ID
```

---

## 重要配置说明

### vercel.json
项目根目录的 `vercel.json` 配置了：
- 构建命令指向 `frontend` 目录
- 使用 Next.js 框架
- 输出目录为 `.next`

### 环境变量
- `NEXT_PUBLIC_SUI_NETWORK`: Sui 网络（testnet 或 mainnet）
- `NEXT_PUBLIC_PACKAGE_ID`: 智能合约包 ID
- `NEXT_PUBLIC_GAME_STATE_ID`: 游戏状态对象 ID

⚠️ **注意**: 所有以 `NEXT_PUBLIC_` 开头的变量会暴露在客户端

---

## 部署后检查

### 1. 测试网站
访问 Vercel 提供的 URL（例如：`your-project.vercel.app`）

### 2. 检查功能
- ✅ 钱包连接
- ✅ 铸造塔 NFT
- ✅ 玩游戏
- ✅ 市场功能
- ✅ 挑战系统

### 3. 查看日志
在 Vercel Dashboard 的 "Deployments" 标签查看构建和运行日志

---

## 常见问题

### Q: 部署失败怎么办？
**A**: 检查：
1. `frontend/package.json` 中的依赖是否完整
2. 环境变量是否正确设置
3. 查看 Vercel 构建日志找出错误

### Q: 网站打开但功能不工作？
**A**: 检查：
1. 浏览器控制台是否有错误
2. 环境变量是否正确配置
3. Package ID 和 GameState ID 是否正确

### Q: 如何更新部署？
**A**: 
- 方法一：推送代码到 GitHub，Vercel 自动部署
- 方法二：运行 `vercel --prod`

### Q: 如何绑定自定义域名？
**A**: 
1. 在 Vercel Dashboard 进入项目设置
2. 点击 "Domains"
3. 添加你的域名并按提示配置 DNS

---

## 性能优化建议

### 1. 启用 Edge Functions
在 `next.config.js` 中：
```javascript
module.exports = {
  experimental: {
    runtime: 'edge',
  },
}
```

### 2. 图片优化
使用 Next.js Image 组件：
```jsx
import Image from 'next/image'
```

### 3. 启用缓存
Vercel 自动处理静态资源缓存

---

## 监控和分析

### Vercel Analytics
在项目设置中启用 Analytics 查看：
- 页面访问量
- 性能指标
- 用户地理分布

### 错误追踪
考虑集成：
- Sentry
- LogRocket
- Datadog

---

## 安全建议

1. ✅ 不要在代码中硬编码私钥
2. ✅ 使用环境变量存储敏感配置
3. ✅ 定期更新依赖包
4. ✅ 启用 Vercel 的安全功能（HTTPS、DDoS 保护等）

---

## 成本

- **Hobby Plan**: 免费
  - 无限部署
  - 100GB 带宽/月
  - 适合个人项目和演示

- **Pro Plan**: $20/月
  - 更多带宽
  - 更好的性能
  - 团队协作功能

---

## 有用的链接

- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Vercel CLI 文档](https://vercel.com/docs/cli)

---

祝部署顺利！🚀
