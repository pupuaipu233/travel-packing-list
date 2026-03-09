# 旅行极简打包清单工具

## 项目概述
一款轻量化出行辅助工具，仅需输入旅行天数和目的地天气，即可自动生成无冗余的极简打包清单，帮用户避免漏带必需品、减少无效行李，快速完成行李收拾。

## 目录结构
- `frontend/` - 前端界面
- `backend/` - 后端服务
- `database/` - 数据库初始化文件

## 快速开始

### 1. 初始化Supabase数据库
1. 登录Supabase控制台（https://app.supabase.com）
2. 打开项目 `ritmvwytkgbpkasqulgz`
3. 进入SQL编辑器
4. 执行 `database/supabase_init.sql` 文件中的SQL语句
5. 确保 `packing_lists` 表已创建并初始化测试数据

### 2. 安装后端依赖
1. 打开命令提示符（cmd）
2. 进入 `backend` 目录
3. 执行：`npm install`

### 3. 启动后端服务
1. 在 `backend` 目录中执行：`npm start`
2. 服务将运行在 http://localhost:3000

### 4. 打开前端界面
1. 直接在浏览器中打开 `frontend/index.html` 文件
2. 开始使用打包清单生成功能

## 核心功能
1. **基础信息输入**：选择旅行天数（1-7天）、目的地天气类型（晴/雨/冷）
2. **极简清单生成**：根据输入参数，自动生成「必带物品」「可选物品」分类的精简清单
3. **历史记录复用**：保存已生成的打包清单，方便后续同场景出行时快速查看或复用

## 技术栈
- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js, Express
- 数据库：Supabase (PostgreSQL)

## 部署方式

### 方式一：EdgeOne静态部署（推荐）
适用于公网访问，无需后端服务

1. **使用静态版本**：
   - 打开 `frontend/index-static.html` 文件
   - 该版本使用localStorage存储历史记录，无需后端服务

2. **部署到EdgeOne**：
   - 登录EdgeOne控制台
   - 选择创建项目 - 从GitHub导入
   - 选择GitHub仓库：`https://github.com/pupuaipu233/travel-packing-list`
   - 设置构建目录为 `frontend`
   - 设置入口文件为 `index-static.html`
   - 点击部署

3. **访问网站**：
   - 部署成功后，EdgeOne会分配一个公网URL
   - 其他用户可以通过该URL访问您的网站

### 方式二：本地完整版部署
适用于本地开发测试，包含后端服务

1. **初始化Supabase数据库**：
   - 登录Supabase控制台（https://app.supabase.com）
   - 打开项目 `ritmvwytkgbpkasqulgz`
   - 进入SQL编辑器
   - 执行 `database/supabase_init.sql` 文件中的SQL语句
   - 确保 `packing_lists` 表已创建并初始化测试数据

2. **安装后端依赖**：
   - 打开命令提示符（cmd）
   - 进入 `backend` 目录
   - 执行：`npm install`

3. **启动后端服务**：
   - 在 `backend` 目录中执行：`node server.js`
   - 服务将运行在 http://localhost:3000

4. **打开前端界面**：
   - 直接在浏览器中打开 `frontend/index.html` 文件
   - 开始使用打包清单生成功能

## 注意事项
- EdgeOne部署使用静态版本，数据存储在用户浏览器的localStorage中
- 本地完整版使用Supabase数据库，支持跨设备数据同步
- Supabase连接配置在 `backend/db.js` 文件中
- 后端服务默认端口为3000，如需修改请在 `backend/server.js` 中调整