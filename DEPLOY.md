# EdgeOne 部署指南

## 准备工作

### 1. 确认已有账号
- GitHub 账号：https://github.com
- EdgeOne 账号：https://console.edgeone.ai

### 2. 确认项目已上传到 GitHub
确保代码已在 GitHub 仓库：`https://github.com/pupuaipu233/travel-packing-list`

---

## 部署步骤

### 第一步：登录 EdgeOne 控制台

1. 打开浏览器，访问：https://console.edgeone.ai
2. 使用腾讯云账号登录（或注册新账号）
3. 进入控制台首页

### 第二步：创建 Pages 项目

1. 点击左侧菜单 **「边缘安全加速」** → **「Pages」**
2. 点击 **「创建项目」** 按钮
3. 选择 **「从 Git 导入」**
4. 授权 GitHub 访问，选择仓库 `travel-packing-list`
5. 点击 **「开始构建」**

### 第三步：配置构建设置

在构建配置页面，填写以下信息：

**基本信息：**
- 项目名称：`travel-packing-list`（或自定义）
- 生产分支：`master`

**构建配置：**
- 构建命令：（留空，不需要构建）
- 输出目录：`.`（根目录）

**Functions 配置：**
- Functions 目录：`functions`
- 点击 **「保存并部署」**

### 第四步：配置环境变量（重要！）

部署完成后，需要配置环境变量：

1. 进入项目详情页
2. 点击 **「设置」** 标签
3. 点击 **「环境变量」**
4. 点击 **「添加变量」**，逐个添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | `https://ritmvwytkgbpkasqulgz.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_3J06yRIpKdajhdMwLivAWw_6WJ4-5vv` |
| `GLM_API_KEY` | `你的_glm_api_key` |
| `GLM_MODEL` | `GLM-4-FlashX-250414` |
| `SENIVERSE_PUBLIC_KEY` | `PL1aBeQc_8_f6qxxj` |
| `SENIVERSE_PRIVATE_KEY` | `SaEVjjmjs5RvzMkuC` |

5. 点击 **「保存」**

### 第五步：重新部署

1. 返回项目详情页
2. 点击 **「重新部署」** 按钮
3. 等待部署完成（约 1-2 分钟）

### 第六步：访问网站

1. 部署完成后，会显示访问地址，如：
   `https://travel-packing-list-xxx.edgeone.app`

2. 点击地址访问，测试功能是否正常

---

## 验证部署

### 测试基础功能
1. 选择旅行天数：3天
2. 输入目的地：三亚
3. 点击 **「快速生成」**
4. 查看是否生成清单

### 测试 AI 功能
1. 选择旅行天数：5天
2. 输入目的地：北京
3. 选择出行目的：度假
4. 选择旅行者类型：情侣
5. 点击 **「AI 智能生成」**
6. 等待 3-5 秒，查看 AI 生成的清单

### 测试历史记录
1. 生成几个清单
2. 查看页面下方的历史记录
3. 点击历史记录查看详情

---

## 常见问题

### Q: 部署失败怎么办？
A: 检查：
1. GitHub 仓库是否公开
2. 代码是否已推送到 master 分支
3. Functions 目录是否正确设置为 `functions`

### Q: 页面显示 "Functions 错误"
A: 检查环境变量是否配置正确，特别是：
- SUPABASE_URL
- SUPABASE_KEY
- GLM_API_KEY

### Q: AI 生成功能无法使用
A: 检查：
1. GLM_API_KEY 是否正确
2. GLM_MODEL 是否设置为 `GLM-4-FlashX-250414`

### Q: 天气查询失败
A: 检查：
- OPENWEATHER_API_KEY 是否正确配置
- 目的地名称是否正确（支持中文城市名）

---

## 更新部署

如果修改了代码，需要重新部署：

1. 本地修改代码
2. 提交到 GitHub：
   ```bash
   git add .
   git commit -m "更新说明"
   git push origin master
   ```
3. EdgeOne 会自动重新部署（或手动点击「重新部署」）

---

## 自定义域名（可选）

1. 在 EdgeOne 控制台，进入项目设置
2. 点击 **「自定义域名」**
3. 添加你的域名
4. 按照提示配置 DNS
5. 等待域名生效（通常几分钟到几小时）

---

## 需要帮助？

如果遇到问题：
1. 查看 EdgeOne 控制台日志
2. 检查浏览器开发者工具（F12）的网络请求
3. 确认所有环境变量都已正确配置
