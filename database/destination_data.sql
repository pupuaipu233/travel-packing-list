-- 目的地天气识别与物品库数据初始化脚本
-- 执行时间: 2026-03-09

-- ============================================
-- 第一部分：创建天气缓存表
-- ============================================

CREATE TABLE IF NOT EXISTS weather_api_cache (
    id SERIAL PRIMARY KEY,
    destination VARCHAR(100) NOT NULL UNIQUE,
    weather_data JSONB NOT NULL,
    cached_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE weather_api_cache IS '天气API缓存表';
COMMENT ON COLUMN weather_api_cache.destination IS '目的地名称';
COMMENT ON COLUMN weather_api_cache.weather_data IS '天气数据JSON';
COMMENT ON COLUMN weather_api_cache.cached_at IS '缓存时间';
COMMENT ON COLUMN weather_api_cache.expires_at IS '过期时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_api_cache(expires_at);

-- ============================================
-- 第二部分：创建目的地天气映射表
-- ============================================

CREATE TABLE IF NOT EXISTS destination_weather (
    id SERIAL PRIMARY KEY,
    destination VARCHAR(100) NOT NULL UNIQUE,
    destination_type VARCHAR(50),
    default_weather VARCHAR(20),
    default_temp_range VARCHAR(20),
    season_rules JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE destination_weather IS '目的地天气映射表';
COMMENT ON COLUMN destination_weather.destination IS '目的地名称';
COMMENT ON COLUMN destination_weather.destination_type IS '目的地类型（海边/山区/高原/城市）';
COMMENT ON COLUMN destination_weather.default_weather IS '默认天气';
COMMENT ON COLUMN destination_weather.default_temp_range IS '默认温度范围';
COMMENT ON COLUMN destination_weather.season_rules IS '季节规则JSON';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dest_weather_type ON destination_weather(destination_type);

-- 插入目的地天气映射数据（使用UPSERT，存在则更新）
INSERT INTO destination_weather (destination, destination_type, default_weather, default_temp_range, season_rules) VALUES
-- 海边类
('三亚', '海边', '炎热', '25-35°C', '{"summer": "炎热", "winter": "温暖"}'),
('海口', '海边', '炎热', '25-35°C', '{"summer": "炎热", "winter": "温暖"}'),
('青岛', '海边', '温和', '15-25°C', '{"summer": "温和", "winter": "低温"}'),
('厦门', '海边', '温和', '18-28°C', '{"summer": "炎热", "winter": "温和"}'),
('大连', '海边', '温和', '10-25°C', '{"summer": "温和", "winter": "低温"}'),
('威海', '海边', '温和', '12-26°C', '{"summer": "温和", "winter": "低温"}'),

-- 干燥城市
('北京', '城市', '干燥', '0-30°C', '{"summer": "炎热", "winter": "低温"}'),
('西安', '城市', '干燥', '5-30°C', '{"summer": "炎热", "winter": "低温"}'),
('太原', '城市', '干燥', '0-28°C', '{"summer": "炎热", "winter": "低温"}'),
('兰州', '城市', '干燥', '5-28°C', '{"summer": "炎热", "winter": "低温"}'),
('乌鲁木齐', '城市', '干燥', '-10-30°C', '{"summer": "炎热", "winter": "低温"}'),

-- 湿润城市
('成都', '城市', '湿润', '10-25°C', '{"summer": "炎热", "winter": "低温"}'),
('重庆', '城市', '湿润', '12-30°C', '{"summer": "炎热", "winter": "低温"}'),
('杭州', '城市', '湿润', '8-28°C', '{"summer": "炎热", "winter": "低温"}'),
('武汉', '城市', '湿润', '8-30°C', '{"summer": "炎热", "winter": "低温"}'),
('长沙', '城市', '湿润', '10-30°C', '{"summer": "炎热", "winter": "低温"}'),
('南京', '城市', '湿润', '8-28°C', '{"summer": "炎热", "winter": "低温"}'),
('上海', '城市', '湿润', '8-28°C', '{"summer": "炎热", "winter": "低温"}'),
('广州', '城市', '湿润', '15-32°C', '{"summer": "炎热", "winter": "温和"}'),
('深圳', '城市', '湿润', '15-32°C', '{"summer": "炎热", "winter": "温和"}'),

-- 高原类
('拉萨', '高原', '低温', '5-20°C', '{"summer": "温和", "winter": "低温"}'),
('西宁', '高原', '低温', '0-20°C', '{"summer": "温和", "winter": "低温"}'),
('林芝', '高原', '温和', '8-22°C', '{"summer": "温和", "winter": "低温"}'),
('香格里拉', '高原', '低温', '5-18°C', '{"summer": "温和", "winter": "低温"}'),

-- 低温城市
('哈尔滨', '城市', '低温', '-20-0°C', '{"summer": "温和", "winter": "低温"}'),
('长春', '城市', '低温', '-15-5°C', '{"summer": "温和", "winter": "低温"}'),
('沈阳', '城市', '低温', '-10-10°C', '{"summer": "温和", "winter": "低温"}'),
('呼和浩特', '城市', '低温', '-10-25°C', '{"summer": "温和", "winter": "低温"}'),
('银川', '城市', '干燥', '-5-28°C', '{"summer": "炎热", "winter": "低温"}'),

-- 山区
('张家界', '山区', '湿润', '10-25°C', '{"summer": "炎热", "winter": "低温"}'),
('黄山', '山区', '湿润', '8-22°C', '{"summer": "温和", "winter": "低温"}'),
('桂林', '山区', '湿润', '12-28°C', '{"summer": "炎热", "winter": "低温"}'),
('丽江', '山区', '温和', '8-22°C', '{"summer": "温和", "winter": "低温"}'),
('大理', '山区', '温和', '10-25°C', '{"summer": "温和", "winter": "低温"}'),
('昆明', '城市', '温和', '15-25°C', '{"summer": "温和", "winter": "温和"}'),

-- 港澳台
('香港', '城市', '湿润', '18-32°C', '{"summer": "炎热", "winter": "温和"}'),
('澳门', '城市', '湿润', '18-32°C', '{"summer": "炎热", "winter": "温和"}'),
('台北', '城市', '湿润', '15-30°C', '{"summer": "炎热", "winter": "低温"}'),

-- 国外热门目的地
('东京', '城市', '温和', '5-28°C', '{"summer": "炎热", "winter": "低温"}'),
('大阪', '城市', '温和', '5-28°C', '{"summer": "炎热", "winter": "低温"}'),
('曼谷', '城市', '炎热', '25-35°C', '{"summer": "炎热", "winter": "炎热"}'),
('普吉岛', '海边', '炎热', '25-35°C', '{"summer": "炎热", "winter": "炎热"}'),
('新加坡', '城市', '炎热', '25-32°C', '{"summer": "炎热", "winter": "炎热"}'),
('首尔', '城市', '低温', '-10-28°C', '{"summer": "炎热", "winter": "低温"}'),
('伦敦', '城市', '湿润', '5-20°C', '{"summer": "温和", "winter": "低温"}'),
('巴黎', '城市', '温和', '5-25°C', '{"summer": "温和", "winter": "低温"}'),
('纽约', '城市', '温和', '-5-30°C', '{"summer": "炎热", "winter": "低温"}'),
('悉尼', '城市', '温和', '10-28°C', '{"summer": "炎热", "winter": "温和"}'),
('迪拜', '城市', '炎热', '20-45°C', '{"summer": "炎热", "winter": "炎热"}'),

-- 补充更多国内目的地
('苏州', '城市', '湿润', '10-28°C', '{"summer": "炎热", "winter": "低温"}'),
('洛阳', '城市', '干燥', '5-30°C', '{"summer": "炎热", "winter": "低温"}'),
('九寨沟', '景区', '温和', '5-25°C', '{"summer": "温和", "winter": "低温"}'),
('云南', '高原', '温和', '10-25°C', '{"summer": "温和", "winter": "低温"}'),

-- 补充更多出境目的地
('日本', '城市', '温和', '5-28°C', '{"summer": "炎热", "winter": "低温"}'),
('韩国', '城市', '湿润', '5-28°C', '{"summer": "炎热", "winter": "低温"}'),
('泰国', '城市', '炎热', '25-35°C', '{"summer": "炎热", "winter": "炎热"}'),
('巴厘岛', '海边', '炎热', '25-32°C', '{"summer": "炎热", "winter": "炎热"}'),
('马尔代夫', '海边', '炎热', '25-32°C', '{"summer": "炎热", "winter": "炎热"}'),
('夏威夷', '海边', '炎热', '22-32°C', '{"summer": "炎热", "winter": "温和"}')
ON CONFLICT (destination) DO UPDATE SET
    destination_type = EXCLUDED.destination_type,
    default_weather = EXCLUDED.default_weather,
    default_temp_range = EXCLUDED.default_temp_range,
    season_rules = EXCLUDED.season_rules;

-- ============================================
-- 第三部分：创建地点物品库表
-- ============================================

CREATE TABLE IF NOT EXISTS destination_items (
    id SERIAL PRIMARY KEY,
    destination VARCHAR(100) NOT NULL,
    item_category VARCHAR(50) NOT NULL, -- 必备/可选/特殊
    item_name VARCHAR(100) NOT NULL,
    item_description TEXT,
    weather_condition VARCHAR(50), -- 适用天气条件
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE destination_items IS '目的地特色物品库';
COMMENT ON COLUMN destination_items.destination IS '目的地名称';
COMMENT ON COLUMN destination_items.item_category IS '物品分类（必备/可选/特殊）';
COMMENT ON COLUMN destination_items.item_name IS '物品名称';
COMMENT ON COLUMN destination_items.item_description IS '物品说明';
COMMENT ON COLUMN destination_items.weather_condition IS '适用天气条件';
COMMENT ON COLUMN destination_items.priority IS '优先级（1-10）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dest_items_destination ON destination_items(destination);
CREATE INDEX IF NOT EXISTS idx_dest_items_category ON destination_items(item_category);
CREATE INDEX IF NOT EXISTS idx_dest_items_priority ON destination_items(priority);

-- ============================================
-- 第四部分：插入目的地特色物品数据
-- ============================================

-- 清空现有数据（避免重复插入错误）
TRUNCATE TABLE destination_items;

-- 海边类（三亚）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('三亚', '必备', '高倍数防晒霜', 'SPF50+，海边紫外线强烈', '炎热', 10),
('三亚', '必备', '墨镜', '保护眼睛，防止强光刺眼', '炎热', 9),
('三亚', '必备', '沙滩帽/遮阳帽', '遮阳防晒，宽檐更好', '炎热', 9),
('三亚', '必备', '泳衣/泳裤', '下海游泳必备', '炎热', 9),
('三亚', '可选', '沙滩拖鞋', '方便在沙滩行走', '炎热', 8),
('三亚', '可选', '防水手机袋', '保护手机不进水', '炎热', 7),
('三亚', '可选', '浮潜装备', '浮潜面罩和呼吸管', '炎热', 6),
('三亚', '特殊', '晒后修复芦荟胶', '缓解晒伤', '炎热', 8),
('三亚', '特殊', '防蚊液', '热带蚊虫多', '炎热', 7);

-- 海边类（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('青岛', '必备', '防晒霜', '海边紫外线强', '炎热', 9),
('青岛', '必备', '墨镜', '保护眼睛', '炎热', 8),
('青岛', '可选', '泳衣', '下海游泳', '炎热', 8),
('厦门', '必备', '防晒霜', '海边紫外线强', '炎热', 9),
('厦门', '可选', '雨伞', '应对突发雨天', '雨天', 7),
('大连', '必备', '防风外套', '海边风大', '低温', 8),
('威海', '必备', '防晒用品', '海边紫外线强', '炎热', 8);

-- 干燥城市（北京）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('北京', '必备', '润唇膏', '北方干燥，防止嘴唇干裂', '干燥', 9),
('北京', '必备', '保湿面霜', '皮肤保湿，防止干燥', '干燥', 9),
('北京', '必备', '保湿喷雾', '随时补水', '干燥', 8),
('北京', '可选', '口罩', '防风沙和雾霾', '干燥', 7),
('北京', '可选', '鼻腔喷雾', '缓解鼻腔干燥', '干燥', 7),
('北京', '可选', '护手霜', '手部保湿', '干燥', 7),
('北京', '特殊', '抗过敏药', '花粉季节备用', '干燥', 6);

-- 干燥城市（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('西安', '必备', '润唇膏', '北方干燥', '干燥', 9),
('西安', '必备', '保湿霜', '皮肤保湿', '干燥', 8),
('兰州', '必备', '润唇膏', '西北干燥', '干燥', 9),
('太原', '必备', '保湿用品', '北方干燥', '干燥', 8),
('乌鲁木齐', '必备', '润唇膏', '西北干燥', '干燥', 9),
('乌鲁木齐', '可选', '厚外套', '昼夜温差大', '低温', 8);

-- 湿润城市（成都）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('成都', '必备', '肠胃药', '吃辣必备，防止肠胃不适', '湿润', 9),
('成都', '必备', '湿巾', '擦汗清洁', '湿润', 8),
('成都', '必备', '舒适步行鞋', '城市步行多，需要舒适', '湿润', 8),
('成都', '可选', '驱蚊液', '夏季蚊虫多', '湿润', 7),
('成都', '可选', '雨伞', '多雨天气', '雨天', 7),
('成都', '特殊', '口罩', '火锅味大，可带口罩', '湿润', 5);

-- 湿润城市（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('重庆', '必备', '肠胃药', '吃辣备用', '湿润', 9),
('重庆', '必备', '舒适鞋子', '山城步行多', '湿润', 8),
('杭州', '必备', '雨伞', '多雨天气', '雨天', 8),
('杭州', '可选', '驱蚊液', '西湖边蚊虫多', '湿润', 7),
('武汉', '必备', '防暑药', '夏季炎热', '炎热', 8),
('武汉', '可选', '雨伞', '多雨', '雨天', 7),
('南京', '必备', '雨伞', '梅雨季节', '雨天', 8),
('上海', '必备', '雨伞', '多雨天气', '雨天', 8),
('广州', '必备', '雨伞', '多雨', '雨天', 8),
('广州', '可选', '薄外套', '空调房备用', '炎热', 6),
('深圳', '必备', '雨伞', '多雨', '雨天', 8);

-- 高原类（拉萨）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('拉萨', '必备', '红景天', '预防高原反应，提前服用', '低温', 10),
('拉萨', '必备', '氧气瓶/氧气袋', '应急使用', '低温', 9),
('拉萨', '必备', '厚外套/羽绒服', '高原温差大', '低温', 9),
('拉萨', '必备', '高倍数防晒霜', '高原紫外线强', '低温', 9),
('拉萨', '必备', '墨镜', '防强光', '低温', 9),
('拉萨', '必备', '帽子', '保暖+防晒', '低温', 8),
('拉萨', '可选', '保温杯', '喝热水', '低温', 7),
('拉萨', '可选', '润唇膏', '高原干燥', '低温', 8),
('拉萨', '特殊', '高原安', '缓解高原反应', '低温', 8);

-- 高原类（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('西宁', '必备', '红景天', '预防高反', '低温', 10),
('西宁', '必备', '厚外套', '高原温差大', '低温', 9),
('西宁', '必备', '防晒霜', '高原紫外线强', '低温', 9),
('香格里拉', '必备', '红景天', '预防高反', '低温', 10),
('香格里拉', '必备', '厚外套', '高原温差大', '低温', 9);

-- 低温城市（哈尔滨）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('哈尔滨', '必备', '羽绒服', '防寒保暖', '低温', 10),
('哈尔滨', '必备', '保暖内衣', '贴身保暖', '低温', 9),
('哈尔滨', '必备', '手套', '手部保暖', '低温', 9),
('哈尔滨', '必备', '围巾', '颈部保暖', '低温', 9),
('哈尔滨', '必备', '帽子', '头部保暖', '低温', 9),
('哈尔滨', '必备', '厚袜子', '脚部保暖', '低温', 8),
('哈尔滨', '可选', '暖宝宝', '额外保暖', '低温', 7),
('哈尔滨', '可选', '防滑鞋/雪地靴', '冰雪路面防滑', '低温', 8),
('哈尔滨', '特殊', '保温杯', '喝热水保暖', '低温', 7);

-- 低温城市（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('长春', '必备', '羽绒服', '防寒保暖', '低温', 10),
('长春', '必备', '保暖内衣', '贴身保暖', '低温', 9),
('长春', '必备', '手套围巾', '保暖', '低温', 9),
('沈阳', '必备', '厚外套', '东北寒冷', '低温', 9),
('呼和浩特', '必备', '羽绒服', '草原寒冷', '低温', 9),
('银川', '必备', '厚外套', '西北寒冷', '低温', 8);

-- 山区（通用）
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('张家界', '必备', '舒适登山鞋', '山路步行', '湿润', 9),
('张家界', '可选', '登山杖', '辅助登山', '湿润', 6),
('黄山', '必备', '登山鞋', '山路陡峭', '湿润', 9),
('黄山', '可选', '雨衣', '山顶多雨', '雨天', 7),
('桂林', '必备', '舒适鞋子', '步行游览', '湿润', 8),
('丽江', '必备', '防晒霜', '高原紫外线', '温和', 8),
('丽江', '可选', '厚外套', '早晚温差大', '低温', 7),
('大理', '必备', '防晒用品', '高原紫外线', '温和', 8),
('昆明', '必备', '薄外套', '春城温差', '温和', 7);

-- 国际目的地
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
('东京', '必备', '雨伞', '多雨天气', '雨天', 8),
('东京', '可选', '零钱包', '日本硬币多', '温和', 6),
('大阪', '必备', '舒适鞋子', '步行多', '温和', 8),
('曼谷', '必备', '防晒霜', '热带阳光', '炎热', 9),
('曼谷', '必备', '防蚊液', '蚊虫多', '炎热', 8),
('新加坡', '必备', '防晒霜', '热带阳光', '炎热', 9),
('新加坡', '可选', '雨伞', '多雨', '雨天', 7),
('首尔', '必备', '厚外套', '冬季寒冷', '低温', 9),
('首尔', '可选', '口罩', '防尘', '低温', 6),
('伦敦', '必备', '雨伞', '多雨', '雨天', 9),
('伦敦', '必备', '防风外套', '风大', '湿润', 8),
('巴黎', '必备', '舒适鞋子', '步行游览', '温和', 8),
('纽约', '必备', '厚外套', '冬季寒冷', '低温', 8),
('悉尼', '必备', '防晒霜', '紫外线强', '炎热', 9),
('迪拜', '必备', '防晒霜', '沙漠阳光', '炎热', 10),
('迪拜', '必备', '长袖薄衫', '防晒+室内空调', '炎热', 8);

-- 特殊场景物品
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
-- 滑雪场景
('滑雪', '必备', '滑雪服', '专业防水防风', '低温', 10),
('滑雪', '必备', '滑雪手套', '防水保暖', '低温', 9),
('滑雪', '必备', '滑雪护目镜', '防风防雪盲', '低温', 9),
('滑雪', '必备', '保暖内衣', '速干保暖', '低温', 9),
('滑雪', '可选', '防摔垫', '保护臀部', '低温', 7),
('滑雪', '可选', '滑雪袜', '专业保暖', '低温', 7),
('滑雪', '特殊', '防晒霜', '雪地反射紫外线', '低温', 8),

-- 潜水场景
('潜水', '必备', '潜水服', '防晒防寒', '炎热', 10),
('潜水', '必备', '潜水镜', '浮潜面罩', '炎热', 9),
('潜水', '必备', '呼吸管', '浮潜呼吸', '炎热', 9),
('潜水', '必备', '防晒霜', '海上紫外线强', '炎热', 10),
('潜水', '可选', '防水相机', '水下拍照', '炎热', 8),
('潜水', '可选', '防水手机袋', '保护手机', '炎热', 7),
('潜水', '特殊', '晕船药', '海上易晕船', '炎热', 8),

-- 登山场景
('登山', '必备', '登山鞋', '防滑耐磨', '湿润', 10),
('登山', '必备', '登山杖', '减轻膝盖压力', '湿润', 9),
('登山', '必备', '背包防雨罩', '保护背包', '湿润', 8),
('登山', '必备', '头灯', '山洞或晚归照明', '湿润', 8),
('登山', '可选', '多功能刀具', '开路切割', '湿润', 7),
('登山', '特殊', '急救包', '意外受伤处理', '湿润', 9),

-- 泡温泉场景
('泡温泉', '必备', '泳衣', '温泉需要', '温和', 10),
('泡温泉', '必备', '防水袋', '存放衣物', '温和', 8),
('泡温泉', '必备', '洗漱用品', '温泉后清洗', '温和', 7),
('泡温泉', '可选', '浴袍', '泡完保暖', '温和', 6),
('泡温泉', '特殊', '补水面膜', '温泉后护肤', '温和', 7);

-- 补充更多国内目的地
INSERT INTO destination_items (destination, item_category, item_name, item_description, weather_condition, priority) VALUES
-- 苏州（水乡园林）
('苏州', '必备', '舒适步行鞋', '园林游览步行多', '湿润', 9),
('苏州', '必备', '雨伞', '江南多雨', '雨天', 8),
('苏州', '可选', '相机', '拍摄园林美景', '湿润', 7),
('苏州', '可选', '折叠伞', '便携防雨', '雨天', 7),
('苏州', '特殊', '防蚊液', '夏季蚊虫', '湿润', 6),

-- 洛阳（历史文化）
('洛阳', '必备', '舒适鞋子', '古迹游览步行多', '干燥', 9),
('洛阳', '必备', '防晒用品', '户外阳光', '炎热', 8),
('洛阳', '可选', '相机', '拍摄龙门石窟', '干燥', 7),
('洛阳', '特殊', '口罩', '防尘土', '干燥', 6),

-- 九寨沟（自然风光）
('九寨沟', '必备', '防晒霜', '高原紫外线强', '温和', 9),
('九寨沟', '必备', '保暖外套', '早晚温差大', '低温', 9),
('九寨沟', '必备', '舒适登山鞋', '栈道步行', '湿润', 9),
('九寨沟', '可选', '雨衣', '山区多雨', '雨天', 8),
('九寨沟', '可选', '相机', '拍摄山水', '湿润', 8),

-- 港澳台
('香港', '必备', '充电宝', '购物导航需要', '湿润', 9),
('香港', '必备', '舒适鞋子', '购物日行万步', '湿润', 9),
('香港', '可选', '八达通卡', '交通便利', '湿润', 7),
('香港', '特殊', '薄外套', '室内空调冷', '湿润', 7),

('澳门', '必备', '充电宝', '游览需要', '湿润', 8),
('澳门', '可选', '舒适鞋子', '赌场游览步行多', '湿润', 8),

('台北', '必备', '雨伞', '多雨天气', '雨天', 9),
('台北', '必备', '舒适鞋子', '夜市游览', '湿润', 8),
('台北', '可选', '防晒用品', '户外景点', '炎热', 7),

-- 日本（细化）
('日本', '必备', '充电宝', '导航拍照需要', '温和', 9),
('日本', '必备', '现金', '很多地方只收现金', '温和', 9),
('日本', '必备', '零钱包', '硬币多', '温和', 8),
('日本', '可选', 'suica交通卡', '交通便利', '温和', 8),
('日本', '特殊', '感冒药', '应对温差', '温和', 7),

-- 韩国（细化）
('韩国', '必备', '充电宝', '购物拍照', '温和', 9),
('韩国', '必备', '现金', '传统市场需要', '温和', 8),
('韩国', '可选', '口罩', '防雾霾', '低温', 6),
('韩国', '特殊', '保湿护肤品', '韩国护肤品便宜', '温和', 8),

-- 泰国（细化）
('泰国', '必备', '防晒霜SPF50+', '热带阳光强烈', '炎热', 10),
('泰国', '必备', '防蚊液', '蚊虫多', '炎热', 9),
('泰国', '必备', '长袖衣裤', '寺庙要求+防晒', '炎热', 8),
('泰国', '可选', '人字拖', '热带舒适', '炎热', 7),
('泰国', '特殊', '肠胃药', '饮食差异', '炎热', 9),

-- 云南（丽江大理）
('云南', '必备', '防晒霜', '高原紫外线强', '温和', 10),
('云南', '必备', '保湿霜', '高原干燥', '干燥', 9),
('云南', '必备', '墨镜', '高原强光', '温和', 9),
('云南', '可选', '红景天', '预防高反', '低温', 7),
('云南', '特殊', '围巾', '防晒+保暖', '温和', 8);

-- ============================================
-- 第五部分：设置RLS策略
-- ============================================

-- 天气缓存表RLS
ALTER TABLE weather_api_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read weather cache" ON weather_api_cache;
DROP POLICY IF EXISTS "Allow anonymous insert weather cache" ON weather_api_cache;

CREATE POLICY "Allow anonymous read weather cache" ON weather_api_cache
FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert weather cache" ON weather_api_cache
FOR INSERT WITH CHECK (true);

-- 目的地天气映射表RLS
ALTER TABLE destination_weather ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read destination weather" ON destination_weather;

CREATE POLICY "Allow anonymous read destination weather" ON destination_weather
FOR SELECT USING (true);

-- 地点物品库表RLS
ALTER TABLE destination_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read destination items" ON destination_items;

CREATE POLICY "Allow anonymous read destination items" ON destination_items
FOR SELECT USING (true);

-- ============================================
-- 第六部分：验证数据
-- ============================================

-- 查看目的地天气映射统计
SELECT destination_type, COUNT(*) as count 
FROM destination_weather 
GROUP BY destination_type;

-- 查看物品库统计
SELECT destination, COUNT(*) as item_count 
FROM destination_items 
GROUP BY destination 
ORDER BY item_count DESC 
LIMIT 10;

-- 查看总数据量
SELECT 
    (SELECT COUNT(*) FROM destination_weather) as weather_mappings,
    (SELECT COUNT(*) FROM destination_items) as destination_items,
    (SELECT COUNT(*) FROM weather_api_cache) as weather_cache;
