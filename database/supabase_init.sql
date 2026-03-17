-- 创建打包清单表
CREATE TABLE IF NOT EXISTS packing_lists (
    id SERIAL PRIMARY KEY,
    travel_days INTEGER NOT NULL CHECK (travel_days BETWEEN 1 AND 30),
    weather VARCHAR(50) NOT NULL,
    destination VARCHAR(100),
    trip_purpose VARCHAR(50),
    traveler_type VARCHAR(50),
    preferences JSONB DEFAULT '[]',
    list_content JSONB NOT NULL,
    ai_tips TEXT,
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_packing_lists_created_at ON packing_lists(created_at);
CREATE INDEX IF NOT EXISTS idx_packing_lists_travel_weather ON packing_lists(travel_days, weather);

-- 插入测试数据
INSERT INTO packing_lists (travel_days, weather, list_content) VALUES
(3, '晴天', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（3套）", "防晒霜", "充电宝"], "optional": ["帽子", "墨镜", "洗漱用品"]}'),
(5, '雨天', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（5套）", "雨具", "充电宝"], "optional": ["雨伞", "防水鞋套", "洗漱用品"]}'),
(2, '低温', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（2套）", "厚外套", "充电宝"], "optional": ["围巾", "手套", "帽子"]}');