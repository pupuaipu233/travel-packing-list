# 旅行极简打包清单工具

AI 智能生成个性化打包清单，让旅行准备更轻松。

## 功能特点

- **基础生成**：根据天数和天气快速生成清单
- **AI 智能生成**：根据目的地、出行目的、旅行者类型等生成个性化清单
- **历史记录**：保存和查看历史清单
- **天气查询**：自动获取目的地天气信息和未来3天预报
- **API 可靠性优化**：本地缓存、请求重试、超时控制、速率限制，确保系统稳定运行

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js (v14+)
- 现代浏览器（Chrome、Firefox、Edge 等）

### 2. 配置环境变量

复制环境变量模板：
```bash
cd backend
copy .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：
```env
# Supabase 配置
SUPABASE_URL=https://ritmvwytkgbpkasqulgz.supabase.co
SUPABASE_KEY=你的_supabase_anon_key

# GLM AI 配置（用于智能清单生成）
# 申请地址：https://open.bigmodel.cn/
GLM_API_KEY=你的_glm_api_key
GLM_MODEL=GLM-4-FlashX-250414

# OpenWeatherMap 配置（用于天气查询）
# 申请地址：https://openweathermap.org/
OPENWEATHER_API_KEY=你的_openweathermap_api_key

# 服务器端口
PORT=8888
```

### 3. 安装依赖

```bash
cd backend
npm install
```

### 4. 启动后端服务

```bash
node server.js
```

服务器将在 `http://localhost:8888` 启动

### 5. 打开前端页面

直接双击 `index.html` 文件即可使用

## 使用指南

### 基础生成

1. 选择旅行天数（1-10天）
2. 输入目的地（可选）
3. 点击"快速生成"按钮
4. 查看生成的打包清单

### AI 智能生成

1. 填写行程信息：
   - 旅行天数（必填）
   - 目的地（必填，如"三亚"、"北京"）
   - 出行目的（选填：度假/商务/探亲/户外/文化/购物）
   - 旅行者类型（选填：单人/情侣/亲子/朋友/老年）
   - 个人偏好（可多选：摄影/美食/购物/运动/文化/自然/夜生活/放松）

2. 点击"AI 智能生成"按钮
3. 等待 3-5 秒，查看 AI 生成的个性化清单
4. 清单包含：
   - 必带物品
   - 可选物品
   - AI 特别提醒（目的地特色建议）

### 查看历史记录

- 页面下方显示历史生成的清单
- 点击历史记录可查看详情
- 支持 AI 生成和基础生成两种类型的记录

## 项目结构

```
出门物品清单/
├── index.html                    # 前端页面（唯一入口）
├── README.md                     # 项目说明文档
├── conversation_log.txt          # 开发对话记录
├── .gitignore                    # Git忽略配置
├── backend/                      # 后端服务
│   ├── server.js                # API服务主文件
│   ├── ai-service.js            # AI生成服务（GLM）
│   ├── db.js                    # Supabase数据库连接
│   ├── destination-items-service.js  # 目的地物品服务
│   ├── seniverse-weather-service.js  # 心知天气服务
│   ├── weather-service.js       # 和风天气服务（备用）
│   ├── package.json             # 依赖配置
│   ├── package-lock.json        # 依赖锁定
│   ├── .env                     # 环境变量（真实配置，勿提交）
│   └── .env.example             # 环境变量模板
└── database/                    # 数据库脚本
    ├── supabase_complete_setup.sql   # 完整初始化（推荐）
    ├── supabase_init.sql            # 基础初始化
    ├── schema_update.sql            # 数据库升级脚本
    └── destination_data.sql         # 目的地天气和物品数据
```

## API 接口说明

### 基础清单生成
**POST** `/api/generate`

请求体：
```json
{
    "travel_days": 3,
    "weather": "晴天"
}
```

响应：
```json
{
    "id": 1,
    "travel_days": 3,
    "weather": "晴天",
    "list_content": {
        "must_have": ["身份证", "手机", "充电器", ...],
        "optional": ["洗漱用品", "帽子", "墨镜"]
    },
    "created_at": "2026-03-17T10:00:00.000Z"
}
```

### AI 智能生成
**POST** `/api/generate-smart`

请求体：
```json
{
    "travel_days": 5,
    "destination": "三亚",
    "weather": "晴天",
    "trip_purpose": "度假",
    "traveler_type": "情侣",
    "preferences": ["摄影", "美食"]
}
```

响应：
```json
{
    "success": true,
    "data": {
        "id": 2,
        "travel_days": 5,
        "destination": "三亚",
        "weather": "晴天",
        "list_content": {
            "must_have": ["身份证", "防晒霜", "泳衣", ...],
            "optional": ["相机", "墨镜", "沙滩拖鞋"],
            "tips": "三亚紫外线强，注意防晒"
        },
        "ai_tips": "三亚紫外线强，注意防晒",
        "ai_generated": true,
        "created_at": "2026-03-17T10:00:00.000Z"
    }
}
```

### 获取历史记录
**GET** `/api/history`

响应：历史记录数组

### 查询天气
**GET** `/api/weather?destination=三亚`

响应：目的地天气信息

## 数据库初始化

### 首次使用

在 Supabase SQL Editor 中执行：
```sql
-- 执行完整初始化脚本
\i database/supabase_complete_setup.sql

-- 或执行目的地数据初始化
\i database/destination_data.sql
```

### 已有数据升级

如果已有旧版本数据，执行升级脚本：
```sql
\i database/schema_update.sql
```

## 技术栈

- **前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **后端**：Node.js + Express.js + EdgeOne Functions
- **数据库**：Supabase (PostgreSQL)
- **AI 服务**：智谱 GLM-4-FlashX
- **天气服务**：OpenWeatherMap API
- **部署**：EdgeOne（推荐）、Vercel、Render 等平台

## 常见问题

### Q: 页面显示"加载历史记录失败"
A: 检查：
1. 后端服务器是否运行（`node server.js`）
2. 浏览器控制台是否有 CORS 错误
3. Supabase 配置是否正确

### Q: AI 生成失败
A: 检查：
1. GLM_API_KEY 是否正确配置
2. 网络是否能访问智谱 AI 服务器
3. API 额度是否用完

### Q: 天气查询失败
A: 检查：
1. OpenWeatherMap API Key 是否正确配置
2. 目的地名称是否正确（支持中文城市名）
3. 网络连接是否稳定

### Q: API 调用失败
A: 系统已实现多层防护：
1. 本地缓存（30分钟）
2. 请求重试机制（最多3次）
3. 超时控制（10秒）
4. 增强的模拟数据作为备用

如果问题持续，请检查网络连接或稍后再试。

### Q: 如何更换端口？
A: 修改 `backend/.env` 中的 `PORT`，同时修改 `index.html` 中的 API 地址

## 开发计划

- [x] 基础清单生成
- [x] AI 智能生成
- [x] 历史记录管理
- [x] 天气查询
- [x] API 可靠性优化
- [x] EdgeOne 部署
- [ ] 用户登录系统
- [ ] 清单分享功能
- [ ] 多语言支持
- [ ] 自然语言交互
- [ ] 图片识别（行李箱物品检查）
- [ ] 推荐系统（基于历史数据）

## 注意事项

1. **安全**：不要将 `.env` 文件提交到 Git 仓库
2. **成本**：GLM API 按 token 计费，注意监控使用量
3. **网络**：AI 功能需要稳定的网络连接
4. **浏览器**：建议使用 Chrome、Firefox、Edge 等现代浏览器

## 许可证

MIT License

## 联系方式

如有问题，请查看浏览器控制台错误信息或后端服务日志。
