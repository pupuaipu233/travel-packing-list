-- 旅行极简打包清单工具 - 完整数据库设置脚本
-- 在Supabase SQL Editor中执行

-- ============================================
-- 第一部分：创建表（如果表不存在）
-- ============================================

CREATE TABLE IF NOT EXISTS packing_lists (
    id SERIAL PRIMARY KEY,
    travel_days INTEGER NOT NULL CHECK (travel_days BETWEEN 1 AND 30),
    weather VARCHAR(20),
    destination VARCHAR(100),
    trip_purpose VARCHAR(50),
    traveler_type VARCHAR(50),
    preferences JSONB DEFAULT '[]',
    list_content JSONB NOT NULL,
    ai_tips TEXT,
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 第二部分：创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_packing_lists_created_at ON packing_lists(created_at);
CREATE INDEX IF NOT EXISTS idx_packing_lists_travel_weather ON packing_lists(travel_days, weather);
CREATE INDEX IF NOT EXISTS idx_packing_lists_destination ON packing_lists(destination);
CREATE INDEX IF NOT EXISTS idx_packing_lists_ai_generated ON packing_lists(ai_generated);
CREATE INDEX IF NOT EXISTS idx_packing_lists_trip_purpose ON packing_lists(trip_purpose);

-- ============================================
-- 第三部分：插入测试数据
-- ============================================

INSERT INTO packing_lists (travel_days, weather, destination, trip_purpose, traveler_type, preferences, list_content, ai_generated, ai_tips) VALUES
(3, '晴天', '三亚', '度假', '情侣', '["摄影", "美食"]', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（3套）", "防晒霜", "充电宝"], "optional": ["帽子", "墨镜", "洗漱用品"]}', false, null),
(5, '雨天', '杭州', '文化', '朋友', '["文化", "美食"]', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（5套）", "雨具", "充电宝"], "optional": ["雨伞", "防水鞋套", "洗漱用品"]}', false, null),
(2, '低温', '哈尔滨', '户外', '亲子', '["自然", "运动"]', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（2套）", "厚外套", "充电宝"], "optional": ["围巾", "手套", "帽子"]}', false, null);

-- ============================================
-- 第四部分：设置RLS策略（行级安全）
-- ============================================

-- 启用RLS
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow anonymous read access" ON packing_lists;
DROP POLICY IF EXISTS "Allow anonymous insert access" ON packing_lists;
DROP POLICY IF EXISTS "Allow anonymous delete access" ON packing_lists;

-- 创建新策略
CREATE POLICY "Allow anonymous read access" ON packing_lists
FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access" ON packing_lists
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access" ON packing_lists
FOR DELETE USING (true);

-- ============================================
-- 第五部分：验证设置
-- ============================================

-- 查看表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'packing_lists'
ORDER BY 
    ordinal_position;

-- 查看测试数据
SELECT * FROM packing_lists LIMIT 5;
