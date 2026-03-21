# EdgeOne Pages 环境变量配置指南

## 重要：环境变量配置位置

EdgeOne Pages 的 Functions 环境变量需要在 **控制台** 中配置，不是在代码里！

---

## 配置步骤

### 1. 进入 EdgeOne 控制台
- 访问：https://console.edgeone.ai
- 登录你的账号

### 2. 进入 Pages 项目
- 点击左侧菜单 **「边缘安全加速」** → **「Pages」**
- 找到你的项目 `travel-packing-list`
- 点击进入项目详情

### 3. 配置环境变量
- 点击顶部 **「设置」** 标签
- 在左侧菜单点击 **「环境变量」**
- 点击 **「添加变量」** 按钮

### 4. 逐个添加以下变量

| 变量名 | 值 |
|--------|-----|
| `SUPABASE_URL` | `https://ritmvwytkgbpkasqulgz.supabase.co` |
| `SUPABASE_KEY` | `你的_supabase_anon_key` |
| `GLM_API_KEY` | `你的_glm_api_key` |
| `GLM_MODEL` | `GLM-4-FlashX-250414` |
| `OPENWEATHER_API_KEY` | `你的_openweathermap_api_key` |

**注意：**
- 不要加引号
- 不要有多余空格
- 确保值完全正确

### 5. 保存并重新部署
- 点击 **「保存」**
- 返回项目首页
- 点击 **「重新部署」**
- 等待部署完成（约 1-2 分钟）

---

## 验证配置

部署完成后，测试 API：
```bash
curl -X POST https://你的域名.edgeone.cool/api/generate-smart \
  -H "Content-Type: application/json" \
  -d '{"travel_days":3,"destination":"北京"}'
```

---

## 常见问题

### Q: 环境变量已配置但还是 401 错误
A: 检查：
1. 是否点击了「重新部署」
2. 环境变量值是否有空格或引号
3. 是否配置在正确的项目

### Q: 如何查看环境变量是否正确加载
A: 在 Function 中添加调试代码：
```javascript
console.log('SUPABASE_URL:', env.SUPABASE_URL);
console.log('SUPABASE_KEY exists:', !!env.SUPABASE_KEY);
```
然后在 EdgeOne 控制台查看日志。

### Q: 环境变量修改后多久生效
A: 需要重新部署后才生效，约 1-2 分钟。
