# ⚠️ Vercel 配置修复

## 问题
之前的 `vercel.json` 配置错误，导致找不到 frontend 目录。

## ✅ 解决方案

### 方法一：在 Vercel Dashboard 设置（推荐）

1. **删除 vercel.json**（或忽略它）

2. **在 Vercel 项目设置中配置**：
   - 进入你的项目设置
   - 找到 "Build & Development Settings"
   - **Root Directory**: 设置为 `frontend` ⚠️ 这是关键！
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (自动)
   - **Output Directory**: `.next` (自动)
   - **Install Command**: `npm install` (自动)

3. **重新部署**

### 方法二：使用更新的 vercel.json

已经修复了 `vercel.json`，但你仍然需要在 Vercel Dashboard 设置 Root Directory。

## 🚀 正确的部署流程

### 1. 推送代码
```bash
git add .
git commit -m "Fix Vercel config"
git push origin main
```

### 2. 在 Vercel 配置

访问你的项目：https://vercel.com/your-username/your-project

点击 **Settings** → **General**

找到 **Root Directory** 部分：
- 点击 "Edit"
- 输入: `frontend`
- 点击 "Save"

### 3. 添加环境变量

在 **Settings** → **Environment Variables** 添加：

```
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=你的Package_ID
NEXT_PUBLIC_GAME_STATE_ID=你的GameState_ID
```

### 4. 重新部署

回到 **Deployments** 标签

点击最新的部署旁边的 **...** 菜单

选择 **Redeploy**

## 📸 截图指南

### Root Directory 设置位置：
```
Vercel Dashboard
  → Your Project
    → Settings
      → General
        → Root Directory
          → [Edit] → 输入 "frontend" → [Save]
```

### 环境变量设置位置：
```
Vercel Dashboard
  → Your Project
    → Settings
      → Environment Variables
        → [Add New] → 输入变量名和值 → [Save]
```

## ✅ 验证配置

部署成功后，检查：
- Build logs 显示从 `frontend` 目录构建
- 网站可以正常访问
- 钱包可以连接
- 所有功能正常

## 💡 提示

如果还是失败，尝试：
1. 删除项目重新导入
2. 确保 GitHub 仓库中有 `frontend` 目录
3. 检查 `frontend/package.json` 存在
4. 查看完整的构建日志

---

现在应该可以成功部署了！🎉
